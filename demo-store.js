// A separate, fictional world. No network, credentials or live storage access.
export const DEMO_KEY='campuspark.demo.v2';
export const personas=[{id:'lea',label:'Nutzer'},{id:'alex',label:'Admin'}];
export const DEMO_PASSWORD='CampusDemo2026!';
const loginAccounts=['lea','alex','campus-test-neu'];
const copy=value=>JSON.parse(JSON.stringify(value));
const iso=ms=>new Date(ms).toISOString();
export function seedDemo(now=Date.now()){
 const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(8,0,0,0);
 const departure=(minutes=0)=>iso(+tomorrow+minutes*60000);
 const users=[['lea','Lea Winter','LÖ DEMO 1','FR DEMO 2'],['tom','Tom Berger','LÖ DEMO 3'],['alex','Alex Campus','LÖ DEMO 4'],['nora','Nora Fink','WT DEMO 5'],['sami','Sami Roth','LÖ DEMO 6'],['campus-test-neu','campus-test-neu','']].map(([id,name,...plates])=>({id,name,email:id+'@campuspark.example.invalid',plates:plates.filter(Boolean),plate:plates[0],is_admin:id==='alex',is_blocked:false,is_approved:id!=='campus-test-neu',created_at:iso(now-86400000*3),last_sign_in_at:id==='campus-test-neu'?null:iso(now-3600000)}));
 const lots=[['p1','P1 · Parkplatz Nord',60,38,47.61859,7.67750],['p2','P2 · Campusmitte',30,27,47.61728,7.67686],['p3','P3 · Nordost',50,50,47.61867,7.67894],['p4','P4 · Bibliothek',20,8,47.61717,7.67768]].map(([id,name,capacity,base,lat,lng])=>({id,name,capacity,base,lat,lng,active:true,description:'Modellparkfläche · Campus Hangstraße'}));
 const rides=[['r-alex','alex','Schopfheim',0,3],['r-tom','tom','Weil am Rhein',15,2],['r-sami','sami','Rheinfelden (Baden)',30,3],['r-nora','nora','Basel',45,2]].map(([id,owner_id,origin,minutes,seats])=>({id,owner_id,origin,destination:'DHBW Lörrach',departure:departure(minutes),seats,cancelled:false}));
 return {version:2,selected:'lea',next:100,users,lots,rides,wanted:[{id:'w1',owner_id:'nora',origin:'Basel',destination:'DHBW Lörrach',departure:departure(20),closed:false},{id:'w2',owner_id:'sami',origin:'Steinen',destination:'DHBW Lörrach',departure:departure(40),closed:false}],parking:[{id:'park-tom',user_id:'tom',lot_id:'p1',plate:'LÖ DEMO 3',started_at:iso(now-1800000),ends_at:iso(now+7200000)}],lastPlates:{},conversations:[{id:'c-nora',ride_id:'r-nora',passenger_id:'lea',status:'accepted',seen:{lea:2,nora:2}}],messages:[{id:1,conversation_id:'c-nora',sender_id:'lea',kind:'message',body:'Hallo Nora, wo treffen wir uns für die Fahrt?',created_at:iso(now-600000)},{id:2,conversation_id:'c-nora',sender_id:'nora',kind:'message',body:'Direkt am Bahnhof. Bis morgen!',created_at:iso(now-300000)}],audit:[]};
}
export function createDemoStore({storage=null,now=()=>Date.now()}={}){
 let data;try{const saved=JSON.parse(storage?.getItem(DEMO_KEY)||'null');if(saved?.version===2&&loginAccounts.includes(saved.selected)&&Array.isArray(saved.users))data=saved;}catch{}
 if(!data)data=seedDemo(now());
 const persist=()=>{try{storage?.setItem(DEMO_KEY,JSON.stringify(data))}catch{/* In-memory operation also works in restricted private browsers. */}};
 const fail=code=>{throw new Error(code)};
 const user=()=>data.users.find(u=>u.id===data.selected);
 const id=prefix=>prefix+'-'+(++data.next);
 const get=(items,key)=>items.find(x=>x.id===key)||fail('NOT_FOUND');
 const activeParking=()=>data.parking.filter(p=>!p.ended_at&&Date.parse(p.ends_at)>now());
 const lots=()=>data.lots.map(l=>({...l,occupied:l.base+activeParking().filter(p=>p.lot_id===l.id).length}));
 const seats=r=>r.seats-data.conversations.filter(c=>c.ride_id===r.id&&c.status==='accepted').length;
 const account=u=>({is_admin:u.is_admin,is_approved:u.is_approved,is_blocked:u.is_blocked});
 const conversation=key=>{const c=get(data.conversations,key),r=get(data.rides,c.ride_id);if(c.passenger_id!==user().id&&r.owner_id!==user().id)fail('FORBIDDEN');return {c,r,driver:r.owner_id===user().id}};
 const unread=c=>data.messages.filter(m=>m.conversation_id===c.id&&m.sender_id!==user().id&&m.id>(c.seen[user().id]||0)).length;
 const conversations=()=>data.conversations.filter(c=>c.passenger_id===user().id||get(data.rides,c.ride_id).owner_id===user().id);
 const message=(c,body,kind='message',client_id)=>{if(client_id&&data.messages.some(m=>m.client_id===client_id&&m.sender_id===user().id))return;data.messages.push({id:++data.next,conversation_id:c.id,sender_id:user().id,body,kind,client_id,created_at:iso(now())});};
 const profile=(u,p)=>{if(!p.name?.trim()||p.name.trim().length<2)fail('INVALID_PROFILE');const plates=(p.plates||[]).map(x=>x.trim().toUpperCase()).filter(Boolean);if(plates.length>2||plates.some(x=>x.length<4||x.length>16)||new Set(plates).size!==plates.length)fail('INVALID_PLATES');Object.assign(u,{name:p.name.trim(),plates,plate:plates[0]||''});};
 const future=p=>{const d=Date.parse(p.departure);if(!Number.isFinite(d)||d<=now()||d>now()+90*86400000)fail('INVALID_DEPARTURE');};
 function execute(action,p){
  const u=user();if(action.startsWith('admin')&&!u.is_admin)fail('ADMIN_REQUIRED');
  if(u.is_blocked)fail('ACCOUNT_BLOCKED');if(!u.is_approved)fail('APPROVAL_REQUIRED');
  switch(action){
   case 'bootstrap':return {profile:u,lots:lots(),parking:activeParking().find(p=>p.user_id===u.id)||null,last_plate:data.lastPlates[u.id]||u.plate,unread:conversations().reduce((n,c)=>n+unread(c),0),account:account(u)};
   case 'saveProfile':profile(u,p);return u;
   case 'checkin':{
    if(activeParking().some(x=>x.user_id===u.id))fail('ALREADY_PARKED');const l=get(lots(),p.lot_id);if(!l.active||l.occupied>=l.capacity)fail('LOT_FULL');
    if(!Number.isInteger(p.minutes)||p.minutes<1||p.minutes>720)fail('INVALID_DURATION');if(!u.plates.includes(p.plate))fail('INVALID_PLATE');
    const parking={id:id('park'),user_id:u.id,lot_id:l.id,plate:p.plate,started_at:iso(now()),ends_at:iso(now()+p.minutes*60000)};data.parking.push(parking);data.lastPlates[u.id]=p.plate;return parking;
   }
   case 'checkout':case 'extend':{
    const s=get(activeParking(),p.id);if(s.user_id!==u.id)fail('FORBIDDEN');
    if(action==='checkout')s.ended_at=iso(now());else{if(![30,60].includes(p.minutes)||Date.parse(s.ends_at)+p.minutes*60000-Date.parse(s.started_at)>43200000)fail('DURATION_LIMIT');s.ends_at=iso(Date.parse(s.ends_at)+p.minutes*60000);}return true;
   }
   case 'rides':return {offers:data.rides.filter(r=>!get(data.users,r.owner_id).is_blocked).map(r=>({...r,mine:r.owner_id===u.id,owner_name:get(data.users,r.owner_id).name,available:seats(r)})),wanted:data.wanted.filter(w=>!w.closed&&Date.parse(w.departure)>now()).map(w=>({...w,mine:w.owner_id===u.id,owner_name:get(data.users,w.owner_id).name}))};
   case 'createRide':case 'createWanted':{
    future(p);if(!p.origin?.trim()||!p.destination?.trim()||p.origin===p.destination)fail('INVALID_PROFILE');
    const item={id:id(action==='createRide'?'ride':'wanted'),owner_id:u.id,origin:p.origin,destination:p.destination,departure:p.departure};
    if(action==='createRide'){if(!Number.isInteger(p.seats)||p.seats<1||p.seats>8)fail('INVALID_PROFILE');data.rides.push({...item,seats:p.seats,cancelled:false});}else data.wanted.push({...item,closed:false});return item.id;
   }
   case 'cancelRide':{const r=get(data.rides,p.id);if(r.owner_id!==u.id)fail('FORBIDDEN');r.cancelled=true;data.conversations.filter(c=>c.ride_id===r.id).forEach(c=>message(c,'Die Fahrt wurde abgesagt.','status'));return true;}
   case 'closeWanted':{const w=get(data.wanted,p.id);if(w.owner_id!==u.id)fail('FORBIDDEN');w.closed=true;return true;}
   case 'inquire':{
    const r=get(data.rides,p.ride_id);if(r.owner_id===u.id)fail('OWN_RIDE');if(r.cancelled||Date.parse(r.departure)<=now())fail('RIDE_UNAVAILABLE');
    if(!p.body?.trim()||p.body.length>2000)fail('INVALID_MESSAGE');
    let c=data.conversations.find(c=>c.ride_id===r.id&&c.passenger_id===u.id);if(!c){if(seats(r)<=0)fail('RIDE_FULL');c={id:id('chat'),ride_id:r.id,passenger_id:u.id,status:'pending',seen:{}};data.conversations.push(c);}if(['declined','withdrawn'].includes(c.status))fail('REQUEST_CLOSED');message(c,p.body.trim(),'message',p.client_id);return c.id;
   }
   case 'conversations':return conversations().map(c=>{const r=get(data.rides,c.ride_id),driver=r.owner_id===u.id;return {id:c.id,name:get(data.users,driver?c.passenger_id:r.owner_id).name,origin:r.origin,destination:r.destination,driver,unread:unread(c),preview:data.messages.filter(m=>m.conversation_id===c.id).at(-1)?.body||'Anfrage offen'};});
   case 'messages':{const {c,r,driver}=conversation(p.id);return {status:c.status,cancelled:r.cancelled,departure:r.departure,driver,messages:data.messages.filter(m=>m.conversation_id===c.id&&(!p.before||m.id<Number(p.before))).slice(-50).map(m=>({...m,mine:m.sender_id===u.id}))};}
   case 'readMessages':{const {c}=conversation(p.id);c.seen[u.id]=Math.max(c.seen[u.id]||0,Number(p.seen)||0);return true;}
   case 'sendMessage':{const {c,r}=conversation(p.id);if(r.cancelled||['declined','withdrawn'].includes(c.status)||Date.parse(r.departure)+86400000<now())fail('CHAT_CLOSED');if(!p.body?.trim()||p.body.length>2000)fail('INVALID_MESSAGE');message(c,p.body.trim(),'message',p.client_id);return true;}
   case 'bookingStatus':{
    const {c,r,driver}=conversation(p.id);if(r.cancelled||Date.parse(r.departure)<=now())fail('RIDE_UNAVAILABLE');if(driver?!['accepted','declined'].includes(p.status):p.status!=='withdrawn')fail('FORBIDDEN');if(c.status==='withdrawn')fail('REQUEST_CLOSED');if(p.status==='accepted'&&c.status!=='accepted'&&seats(r)<=0)fail('RIDE_FULL');c.status=p.status;message(c,({accepted:'Die Mitfahrt wurde bestätigt.',declined:'Die Anfrage wurde abgelehnt.',withdrawn:'Die Anfrage wurde zurückgezogen.'})[p.status],'status');return true;
   }
   case 'adminOverview':return {users:data.users.length,blocked:data.users.filter(x=>x.is_blocked).length,pending:data.users.filter(x=>!x.is_approved&&!x.is_blocked).length,lots:data.lots.length};
   case 'adminLots':return lots();
   case 'adminUsers':{const rows=data.users.filter(x=>(!p.pending_only||!x.is_approved&&!x.is_blocked)&&(!p.query||(x.name+' '+x.email).toLowerCase().includes(p.query.toLowerCase())));return {total:rows.length,users:rows.slice((p.page||0)*20,(p.page||0)*20+20)};}
   case 'adminParking':{const rows=activeParking().map(s=>({...s,name:get(data.users,s.user_id).name,lot_name:get(data.lots,s.lot_id).name}));return {total:rows.length,sessions:rows.slice((p.page||0)*20,(p.page||0)*20+20)};}
   case 'adminAudit':return data.audit.slice(-50).reverse();
   case 'adminSaveLot':{
    if(!/^[a-z0-9_-]{1,24}$/.test(p.id)||!p.name?.trim()||!Number.isInteger(p.capacity)||p.capacity<1||p.capacity>10000||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180)fail('INVALID_LOT');
    let l=data.lots.find(x=>x.id===p.id);if(p.create&&l)fail('LOT_EXISTS');if(!p.create&&!l)fail('NOT_FOUND');if(l&&p.capacity<get(lots(),p.id).occupied)fail('CAPACITY_OCCUPIED');if(!l){l={id:p.id,base:0};data.lots.push(l);}Object.assign(l,{name:p.name,description:p.description||'',capacity:p.capacity,lat:p.lat,lng:p.lng,active:!!p.active});return true;
   }
   case 'adminSaveUser':profile(get(data.users,p.id),p);return true;
   case 'adminApproveUser':get(data.users,p.id).is_approved=true;return true;
   case 'adminBlockUser':{const target=get(data.users,p.id);if(target.is_admin)fail('ADMIN_ACCOUNT_PROTECTED');if(p.blocked&&p.reason?.trim().length<3)fail('BLOCK_REASON_REQUIRED');target.is_blocked=!!p.blocked;target.block_reason=p.reason||'';if(p.blocked){data.rides.filter(r=>r.owner_id===p.id&&Date.parse(r.departure)>now()).forEach(r=>r.cancelled=true);data.wanted.filter(w=>w.owner_id===p.id).forEach(w=>w.closed=true);data.conversations.filter(c=>c.passenger_id===p.id).forEach(c=>c.status='withdrawn');}return true;}
   case 'adminCheckout':get(activeParking(),p.id).ended_at=iso(now());return true;
   default:fail('DEMO_ACTION_UNKNOWN');
  }
 }
 persist();
 return {
  currentUser:()=>copy(user()),
  login(email,password){
   const target=data.users.find(u=>loginAccounts.includes(u.id)&&u.email.toLowerCase()===String(email).trim().toLowerCase());
   if(!target||password!==DEMO_PASSWORD)fail('invalid_credentials');
   if(target.is_blocked)fail('ACCOUNT_BLOCKED');if(!target.is_approved)fail('APPROVAL_REQUIRED');
   data.selected=target.id;target.last_sign_in_at=iso(now());persist();return copy(target);
  },
  reset(){data=seedDemo(now());persist();},
  async api(action,p={}){const before=copy(data);try{const result=execute(action,p);if(/^admin(Save|Block|Approve|Checkout)/.test(action))data.audit.push({id:id('audit'),action,actor_name:user().name,target_id:p.id,created_at:iso(now()),details:p});persist();return copy(result);}catch(e){data=before;throw e;}}
 };
}
