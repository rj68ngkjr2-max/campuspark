-- Every registration gets a visible, pending access row before its first login.
-- Existing flags are preserved; this migration never approves an account.
begin;
create or replace function campus.initialize_account_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into campus.account_access(user_id,is_approved,is_admin,is_blocked)
 values(new.id,false,false,false) on conflict(user_id) do nothing;
 return new;
end;
$$;
revoke all on function campus.initialize_account_access() from public,anon,authenticated,supabase_auth_admin;
create or replace trigger campus_initialize_account_access
 after insert on auth.users for each row execute function campus.initialize_account_access();
insert into campus.account_access(user_id,is_approved,is_admin,is_blocked)
 select id,false,false,false from auth.users on conflict(user_id) do nothing;
commit;
