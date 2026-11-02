begin;
-- Preserve the existing primary plate while adding a second selectable vehicle.
alter table campus.profiles add column if not exists plates text[] not null default '{}';
update campus.profiles set plates=array[plate] where cardinality(plates)=0 and plate<>'';
alter table campus.parking add column if not exists plate text;
update campus.parking s set plate=p.plate from campus.profiles p where s.user_id=p.id and s.plate is null;
alter table campus.parking alter column plate set default '';
alter table campus.parking alter column plate set not null;
create or replace function campus.profile_plates(payload jsonb,previous text[]) returns text[]
language plpgsql set search_path='' as $$
declare values_to_save text[]; item jsonb;
begin
 if payload ? 'plates' then
  if jsonb_typeof(payload->'plates') is distinct from 'array' or jsonb_array_length(payload->'plates')>2 then raise exception 'INVALID_PLATES'; end if;
  values_to_save:='{}';
  for item in select value from jsonb_array_elements(payload->'plates') loop
   if jsonb_typeof(item)<>'string' then raise exception 'INVALID_PLATES'; end if;
   if trim(item#>>'{}')<>'' then values_to_save:=array_append(values_to_save,upper(trim(item#>>'{}'))); end if;
  end loop;
 elsif payload ? 'plate' then
  -- Older installed clients update the primary plate without losing the second.
  values_to_save:=array_remove(array[nullif(upper(trim(payload->>'plate')),''),previous[2]],null);
 else values_to_save:=coalesce(previous,'{}');
 end if;
 if exists(select 1 from unnest(values_to_save) p where length(p) not between 4 and 16 or p~'[[:cntrl:]]') then raise exception 'INVALID_PLATES'; end if;
 if (select count(distinct regexp_replace(p,'[[:space:]-]','','g')) from unnest(values_to_save) p)<>cardinality(values_to_save) then raise exception 'DUPLICATE_PLATES'; end if;
 return values_to_save;
end;
$$;
revoke all on function campus.profile_plates(jsonb,text[]) from public,anon,authenticated;
create or replace function campus.user_rpc(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); p campus.profiles; r campus.rides; c campus.conversations; pk campus.parking;
 target uuid; n int; available int; result jsonb; message_text text; message_id uuid; seen bigint; plates text[]; chosen_plate text;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into p from campus.profiles where id=uid;
 if action='saveProfile' then
  plates:=campus.profile_plates(payload,p.plates);
  insert into campus.profiles(id,name,plate,plates) values(uid,trim(payload->>'name'),coalesce(plates[1],''),plates)
  on conflict(id) do update set name=excluded.name,plate=excluded.plate,plates=excluded.plates returning * into p;
  return to_jsonb(p);
 end if;
 if action='bootstrap' then
  return jsonb_build_object('profile',case when p.id is null then null else to_jsonb(p) end,'lots',(
   select jsonb_agg(to_jsonb(l)||jsonb_build_object('occupied',(select count(*) from campus.parking s where s.lot_id=l.id and s.checked_out_at is null and s.ends_at>now())) order by l.id) from campus.lots l where l.active or exists(select 1 from campus.parking s where s.lot_id=l.id and s.user_id=uid and s.checked_out_at is null and s.ends_at>now())),
   'parking',(select to_jsonb(s) from campus.parking s where s.user_id=uid and s.checked_out_at is null and s.ends_at>now()),
   'last_plate',(select s.plate from campus.parking s where s.user_id=uid order by s.started_at desc limit 1),
   'unread',(select count(*) from campus.messages m join campus.conversations cv on cv.id=m.conversation_id join campus.rides ri on ri.id=cv.ride_id where (cv.passenger_id=uid or ri.owner_id=uid) and m.sender_id<>uid and m.id>case when cv.passenger_id=uid then cv.passenger_seen else cv.driver_seen end));
 end if;
 if p.id is null then raise exception 'PROFILE_REQUIRED'; end if;
 -- Serialize mutations by account; protects per-account limits and idempotency.
 if action not in ('rides','conversations','messages') then perform pg_advisory_xact_lock(hashtextextended(uid::text,0)); end if;
 if action='checkin' then
  n:=(payload->>'minutes')::int;
  if n is null or n not in (30,60,120,240) then raise exception 'INVALID_DURATION'; end if;
  chosen_plate:=upper(trim(coalesce(payload->>'plate',p.plate)));
  if length(chosen_plate)<4 then raise exception 'PLATE_REQUIRED'; end if;
  if not chosen_plate=any(p.plates) then raise exception 'INVALID_PLATE'; end if;
  perform 1 from campus.lots where id=payload->>'lot_id' and active for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update campus.parking set checked_out_at=ends_at where user_id=uid and checked_out_at is null and ends_at<=now();
  if exists(select 1 from campus.parking where user_id=uid and checked_out_at is null) then raise exception 'ALREADY_PARKED'; end if;
  select l.capacity-count(s.id) into available from campus.lots l left join campus.parking s on s.lot_id=l.id and s.checked_out_at is null and s.ends_at>now() where l.id=payload->>'lot_id' group by l.capacity;
  if available<=0 then raise exception 'LOT_FULL'; end if;
  insert into campus.parking(user_id,plate,lot_id,ends_at) values(uid,chosen_plate,payload->>'lot_id',now()+make_interval(mins=>n)) returning * into pk;
  return to_jsonb(pk);
 elsif action='checkout' then
  update campus.parking set checked_out_at=now() where user_id=uid and id=(payload->>'id')::uuid and checked_out_at is null;
  return 'true';
 elsif action='extend' then
  n:=(payload->>'minutes')::int;
  if n is null or n not in(30,60) then raise exception 'INVALID_DURATION'; end if;
  select * into pk from campus.parking where id=(payload->>'id')::uuid and user_id=uid for update;
  if pk.id is null or pk.checked_out_at is not null or pk.ends_at<=now() then raise exception 'PARKING_ENDED'; end if;
  if pk.ends_at+make_interval(mins=>n)>pk.started_at+interval '12 hours' then raise exception 'DURATION_LIMIT'; end if;
  update campus.parking set ends_at=ends_at+make_interval(mins=>n) where id=pk.id returning * into pk;
  return to_jsonb(pk);
 elsif action='rides' then
  return jsonb_build_object('offers',(select coalesce(jsonb_agg(x order by x.departure),'[]') from (
   select ri.*,pr.name as owner_name,ri.owner_id=uid as mine,
   ri.seats-(select count(*) from campus.conversations cv where cv.ride_id=ri.id and cv.status='accepted') as available
   from campus.rides ri join campus.profiles pr on pr.id=ri.owner_id where (ri.departure>now() and not ri.cancelled) or ri.owner_id=uid order by ri.departure desc limit 200) x),
   'wanted',(select coalesce(jsonb_agg(x order by x.departure),'[]') from (select w.*,pr.name as owner_name,w.owner_id=uid as mine from campus.wanted w join campus.profiles pr on pr.id=w.owner_id where not w.closed and w.departure>now() order by w.departure limit 200) x));
 elsif action in ('createRide','createWanted') then
  if (payload->>'departure')::timestamptz<=now() or (payload->>'departure')::timestamptz>now()+interval '90 days' then raise exception 'INVALID_DEPARTURE'; end if;
  if (select count(*) from campus.rides where owner_id=uid and created_at>now()-interval '1 day')+(select count(*) from campus.wanted where owner_id=uid and created_at>now()-interval '1 day')>=20 then raise exception 'RATE_LIMIT'; end if;
  if action='createRide' then
   insert into campus.rides(origin,destination,departure,seats,owner_id) values(trim(payload->>'origin'),trim(payload->>'destination'),(payload->>'departure')::timestamptz,(payload->>'seats')::int,uid) returning id into target;
  else
   insert into campus.wanted(origin,destination,departure,owner_id) values(trim(payload->>'origin'),trim(payload->>'destination'),(payload->>'departure')::timestamptz,uid) returning id into target;
  end if;
  return to_jsonb(target);
 elsif action='closeWanted' then
  update campus.wanted set closed=true where id=(payload->>'id')::uuid and owner_id=uid;
  if not found then raise exception 'NOT_FOUND'; end if;return 'true';
 elsif action='cancelRide' then
  select * into r from campus.rides where id=(payload->>'id')::uuid and owner_id=uid for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if not r.cancelled then
   update campus.rides set cancelled=true where id=r.id;
   insert into campus.messages(conversation_id,sender_id,body,kind,client_id) select id,uid,'Die Fahrt wurde abgesagt.','status',gen_random_uuid() from campus.conversations where ride_id=r.id;
  end if;return 'true';
 elsif action='inquire' then
  select * into r from campus.rides where id=(payload->>'ride_id')::uuid for update;
  if r.id is null or r.cancelled or r.departure<=now() then raise exception 'RIDE_UNAVAILABLE'; end if;
  if r.owner_id=uid then raise exception 'OWN_RIDE'; end if;
  if exists(select 1 from campus.account_access where user_id=r.owner_id and is_blocked) then raise exception 'RIDE_UNAVAILABLE'; end if;
  if r.seats<=(select count(*) from campus.conversations where ride_id=r.id and status='accepted') then raise exception 'RIDE_FULL'; end if;
  if (select count(*) from campus.conversations where passenger_id=uid and created_at>now()-interval '1 day')>=30 then raise exception 'RATE_LIMIT'; end if;
  insert into campus.conversations(ride_id,passenger_id) values(r.id,uid) on conflict(ride_id,passenger_id) do nothing;
  select * into c from campus.conversations where ride_id=r.id and passenger_id=uid;
  if c.status in ('declined','withdrawn') then raise exception 'CHAT_CLOSED'; end if;
  if exists(select 1 from campus.messages where conversation_id=c.id) then return to_jsonb(c.id); end if;
  if (select count(*) from campus.messages where sender_id=uid and created_at>now()-interval '1 minute')>=30 then raise exception 'RATE_LIMIT'; end if;
  message_text:=trim(payload->>'body');
  if message_text is null or length(message_text) not between 1 and 2000 then raise exception 'INVALID_MESSAGE'; end if;
  insert into campus.messages(conversation_id,sender_id,body,client_id) values(c.id,uid,message_text,(payload->>'client_id')::uuid) on conflict(sender_id,client_id) do nothing;
  return to_jsonb(c.id);
 elsif action='conversations' then
  return (select coalesce(jsonb_agg(x order by x.latest_at desc),'[]') from (
   select cv.id,cv.status,cv.ride_id,ri.origin,ri.destination,ri.departure,ri.cancelled,ri.owner_id=uid as driver,
   case when ri.owner_id=uid then pa.name else dr.name end as name,
   (select body from campus.messages where conversation_id=cv.id order by id desc limit 1) as preview,
   coalesce((select created_at from campus.messages where conversation_id=cv.id order by id desc limit 1),cv.created_at) as latest_at,
   (select count(*) from campus.messages m where m.conversation_id=cv.id and m.sender_id<>uid and m.id>case when ri.owner_id=uid then cv.driver_seen else cv.passenger_seen end) as unread
   from campus.conversations cv join campus.rides ri on ri.id=cv.ride_id join campus.profiles pa on pa.id=cv.passenger_id join campus.profiles dr on dr.id=ri.owner_id
   where cv.passenger_id=uid or ri.owner_id=uid) x);
 elsif action in ('messages','sendMessage','readMessages','bookingStatus') then
  select * into c from campus.conversations where id=(payload->>'id')::uuid;
  select * into r from campus.rides where id=c.ride_id;
  if c.id is null or (c.passenger_id<>uid and r.owner_id<>uid) then raise exception 'NOT_FOUND'; end if;
  if action='messages' then
   return jsonb_build_object('status',c.status,'cancelled',r.cancelled,'driver',r.owner_id=uid,'departure',r.departure,'messages',(
    select coalesce(jsonb_agg(x order by x.id),'[]') from (select m.id,m.body,m.created_at,m.kind,m.sender_id=uid as mine from campus.messages m where m.conversation_id=c.id and ((payload->>'before') is null or m.id<(payload->>'before')::bigint) order by m.id desc limit 50) x));
  elsif action='readMessages' then
   select max(id) into seen from campus.messages where conversation_id=c.id and id<=(payload->>'seen')::bigint;
   if seen is not null then
    if r.owner_id=uid then update campus.conversations set driver_seen=greatest(driver_seen,seen) where id=c.id;
    else update campus.conversations set passenger_seen=greatest(passenger_seen,seen) where id=c.id;end if;
   end if;return 'true';
  elsif action='bookingStatus' then
   -- Lock ride before conversation so two acceptances cannot overbook the last seat.
   select * into r from campus.rides where id=c.ride_id for update;
   select * into c from campus.conversations where id=c.id for update;
   if r.cancelled or r.departure<=now() then raise exception 'RIDE_UNAVAILABLE'; end if;
   if payload->>'status' is null then raise exception 'FORBIDDEN'; end if;
   if payload->>'status'='withdrawn' then
    if c.passenger_id<>uid then raise exception 'FORBIDDEN'; end if;
   elsif payload->>'status' in ('accepted','declined') then
    if r.owner_id<>uid then raise exception 'FORBIDDEN'; end if;
    if c.status='withdrawn' then raise exception 'REQUEST_CLOSED'; end if;
   else raise exception 'FORBIDDEN';end if;
   if payload->>'status'='accepted' and c.status<>'accepted' and r.seats<=(select count(*) from campus.conversations where ride_id=r.id and status='accepted') then raise exception 'RIDE_FULL'; end if;
   if c.status<>payload->>'status' then
    update campus.conversations set status=payload->>'status' where id=c.id;
    insert into campus.messages(conversation_id,sender_id,body,kind,client_id) values(c.id,uid,case payload->>'status' when 'accepted' then 'Die Mitfahrt ist bestätigt.' when 'declined' then 'Die Mitfahranfrage wurde abgelehnt.' else 'Die Mitfahranfrage wurde zurückgezogen.' end,'status',gen_random_uuid());
   end if;return 'true';
  else
   if r.cancelled or r.departure+interval '1 day'<=now() or c.status in ('declined','withdrawn') then raise exception 'CHAT_CLOSED'; end if;
   message_id:=(payload->>'client_id')::uuid;
   if exists(select 1 from campus.messages where sender_id=uid and client_id=message_id and conversation_id=c.id) then return 'true'; end if;
   if (select count(*) from campus.messages where sender_id=uid and created_at>now()-interval '1 minute')>=30 then raise exception 'RATE_LIMIT'; end if;
   message_text:=trim(payload->>'body');
   if message_text is null or length(message_text) not between 1 and 2000 then raise exception 'INVALID_MESSAGE'; end if;
   insert into campus.messages(conversation_id,sender_id,body,client_id) values(c.id,uid,message_text,message_id);return 'true';
  end if;
 else raise exception 'UNKNOWN_ACTION';end if;
end $$;
create or replace function campus.admin_rpc(action text,payload jsonb,uid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; target uuid; lot campus.lots; occupied int; q text:=left(trim(coalesce(payload->>'query','')),100);
 new_plates text[];
 page_number int:=greatest(0,least(coalesce((payload->>'page')::int,0),100000));
begin
 -- Defense in depth: never trust a caller-supplied actor or browser role.
 if uid is distinct from auth.uid() or not exists(select 1 from campus.account_access where user_id=uid and is_admin and is_approved and not is_blocked) then raise exception 'ADMIN_REQUIRED'; end if;
 if action='adminOverview' then
  return jsonb_build_object('users',(select count(*) from auth.users),'pending',(select count(*) from auth.users u left join campus.account_access a on a.user_id=u.id where not coalesce(a.is_approved,false)), 'blocked',(select count(*) from campus.account_access where is_blocked),'lots',(select count(*) from campus.lots where active),'parking',(select count(*) from campus.parking where checked_out_at is null and ends_at>now()));
 elsif action='adminLots' then
  return (select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('occupied',(select count(*) from campus.parking where lot_id=l.id and checked_out_at is null and ends_at>now())) order by l.active desc,l.id),'[]') from campus.lots l);
 elsif action='adminSaveLot' then
  if coalesce(payload->>'id','')!~'^[a-z0-9_-]{1,24}$' or length(trim(coalesce(payload->>'name',''))) not between 2 and 80 or length(coalesce(payload->>'description',''))>240
   or (payload->>'capacity') is null or (payload->>'capacity')::int not between 1 and 10000
   or (payload->>'lat') is null or (payload->>'lat')::float8 not between -90 and 90
   or (payload->>'lng') is null or (payload->>'lng')::float8 not between -180 and 180
   or jsonb_typeof(payload->'active') is distinct from 'boolean' then raise exception 'INVALID_LOT'; end if;
  select * into lot from campus.lots where id=payload->>'id' for update;
  if coalesce((payload->>'create')::boolean,false) and lot.id is not null then raise exception 'LOT_EXISTS'; end if;
  if not coalesce((payload->>'create')::boolean,false) and lot.id is null then raise exception 'NOT_FOUND'; end if;
  select count(*) into occupied from campus.parking where lot_id=payload->>'id' and checked_out_at is null and ends_at>now();
  if (payload->>'capacity')::int<occupied then raise exception 'CAPACITY_OCCUPIED'; end if;
  insert into campus.lots(id,name,description,capacity,lat,lng,active) values(payload->>'id',trim(payload->>'name'),trim(coalesce(payload->>'description','')),(payload->>'capacity')::int,(payload->>'lat')::float8,(payload->>'lng')::float8,(payload->>'active')::boolean)
  on conflict(id) do update set name=excluded.name,description=excluded.description,capacity=excluded.capacity,lat=excluded.lat,lng=excluded.lng,active=excluded.active returning to_jsonb(campus.lots.*) into result;
  insert into campus.admin_audit(actor_id,action,target_id,details) values(uid,action,payload->>'id',jsonb_build_object('before',to_jsonb(lot),'after',result));
  return result;
 elsif action='adminApproveUser' then
  target:=(payload->>'id')::uuid;
  if not exists(select 1 from auth.users where id=target) then raise exception 'NOT_FOUND'; end if;
  if exists(select 1 from campus.account_access where user_id=target and is_blocked) then raise exception 'ACCOUNT_BLOCKED'; end if;
  insert into campus.account_access(user_id,is_approved) values(target,true) on conflict(user_id) do update set is_approved=true,updated_at=now();
  insert into campus.admin_audit(actor_id,action,target_id) values(uid,action,target::text);return 'true';
 elsif action='adminUsers' then
  return jsonb_build_object('page',page_number,'total',(select count(*) from auth.users u left join campus.profiles p on p.id=u.id where (q='' or u.email ilike '%'||q||'%' or p.name ilike '%'||q||'%') and (not coalesce((payload->>'pending_only')::boolean,false) or not exists(select 1 from campus.account_access ap where ap.user_id=u.id and ap.is_approved))),
   'users',(select coalesce(jsonb_agg(x order by x.created_at desc,x.id),'[]') from (
    select u.id,u.email,u.created_at,u.last_sign_in_at,p.name,p.plate,p.plates,coalesce(a.is_approved,false) as is_approved,coalesce(a.is_admin,false) as is_admin,coalesce(a.is_blocked,false) as is_blocked,coalesce(a.block_reason,'') as block_reason
    from auth.users u left join campus.profiles p on p.id=u.id left join campus.account_access a on a.user_id=u.id
    where (q='' or u.email ilike '%'||q||'%' or p.name ilike '%'||q||'%') and (not coalesce((payload->>'pending_only')::boolean,false) or not exists(select 1 from campus.account_access ap where ap.user_id=u.id and ap.is_approved)) order by u.created_at desc,u.id limit 20 offset page_number*20) x));
 elsif action in ('adminSaveUser','adminBlockUser') then
  target:=(payload->>'id')::uuid;
  if not exists(select 1 from auth.users where id=target) then raise exception 'NOT_FOUND'; end if;
  insert into campus.account_access(user_id) values(target) on conflict do nothing;
  perform 1 from campus.account_access where user_id=target for update;
  if action='adminSaveUser' then
   if length(trim(coalesce(payload->>'name',''))) not between 2 and 60 or length(coalesce(payload->>'plate',''))>16 then raise exception 'INVALID_PROFILE'; end if;
   if not exists(select 1 from campus.profiles where id=target) then raise exception 'PROFILE_NOT_READY'; end if;
   select campus.profile_plates(payload,p.plates) into new_plates from campus.profiles p where p.id=target;
   update campus.profiles set name=trim(payload->>'name'),plate=coalesce(new_plates[1],''),plates=new_plates where id=target;
   insert into campus.admin_audit(actor_id,action,target_id) values(uid,action,target::text);
  else
   if target=uid or exists(select 1 from campus.account_access where user_id=target and is_admin) then raise exception 'ADMIN_ACCOUNT_PROTECTED'; end if;
   if jsonb_typeof(payload->'blocked') is distinct from 'boolean' then raise exception 'INVALID_STATUS'; end if;
   if (payload->>'blocked')::boolean and length(trim(coalesce(payload->>'reason',''))) not between 3 and 500 then raise exception 'BLOCK_REASON_REQUIRED'; end if;
   update campus.account_access set is_blocked=(payload->>'blocked')::boolean,block_reason=case when (payload->>'blocked')::boolean then trim(payload->>'reason') else '' end,updated_at=now() where user_id=target;
   if (payload->>'blocked')::boolean then
    -- Retain parking occupancy: suspension does not move a car. Admin can end it separately.
    update campus.rides set cancelled=true where owner_id=target and departure>now();
    update campus.wanted set closed=true where owner_id=target and departure>now();
    update campus.conversations set status='withdrawn' where passenger_id=target and status in ('pending','accepted') and ride_id in(select id from campus.rides where departure>now());
   end if;
   insert into campus.admin_audit(actor_id,action,target_id,details) values(uid,action,target::text,jsonb_build_object('blocked',(payload->>'blocked')::boolean,'reason',coalesce(payload->>'reason','')));
  end if;
  return 'true';
 elsif action='adminParking' then
  return jsonb_build_object('page',page_number,'total',(select count(*) from campus.parking where checked_out_at is null and ends_at>now()),'sessions',(
   select coalesce(jsonb_agg(x order by x.started_at,x.id),'[]') from(select s.id,s.started_at,s.ends_at,s.lot_id,l.name as lot_name,p.name,s.plate
   from campus.parking s join campus.lots l on l.id=s.lot_id join campus.profiles p on p.id=s.user_id where s.checked_out_at is null and s.ends_at>now() order by s.started_at,s.id limit 20 offset page_number*20) x));
 elsif action='adminCheckout' then
  target:=(payload->>'id')::uuid;
  update campus.parking set checked_out_at=now() where id=target and checked_out_at is null and ends_at>now();
  if not found then raise exception 'PARKING_ENDED'; end if;
  insert into campus.admin_audit(actor_id,action,target_id) values(uid,action,target::text);return 'true';
 elsif action='adminAudit' then
  return (select coalesce(jsonb_agg(x order by x.id desc),'[]') from (select a.*,coalesce(p.name,u.email,'Admin') as actor_name from campus.admin_audit a join auth.users u on u.id=a.actor_id left join campus.profiles p on p.id=a.actor_id order by a.id desc limit 50) x);
 else raise exception 'UNKNOWN_ACTION'; end if;
end $$;
revoke all on function campus.user_rpc(text,jsonb),campus.admin_rpc(text,jsonb,uuid) from public,anon,authenticated;
commit;
