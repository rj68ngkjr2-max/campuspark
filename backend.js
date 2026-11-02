import {createClient} from '@supabase/supabase-js';
import {createAuthStorage} from './auth-storage.js';
import {config} from './config.js';
export const storage=createAuthStorage();
export const db=config.url&&config.publishableKey?createClient(config.url,config.publishableKey,{auth:{storage,storageKey:'campuspark.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
const errors={INVALID_DURATION:'Bitte wähle eine Parkdauer zwischen 1 Minute und 12 Stunden.',INVALID_PLATES:'Bitte hinterlege höchstens zwei Kennzeichen mit je 4 bis 16 Zeichen.',DUPLICATE_PLATES:'Die beiden Kennzeichen müssen unterschiedlich sein.',INVALID_PLATE:'Bitte wähle ein Kennzeichen aus deinem Profil.',APPROVAL_REQUIRED:'Dein Konto wartet noch auf die Freigabe durch die Administration.',ACCOUNT_BLOCKED:'Dieses Konto wurde gesperrt.',ADMIN_REQUIRED:'Für diese Aktion ist die Admin-Rolle erforderlich.',INVALID_LOT:'Bitte prüfe Kürzel, Name, Kapazität und Koordinaten.',LOT_EXISTS:'Dieses Parkflächen-Kürzel ist bereits vergeben.',CAPACITY_OCCUPIED:'Die Kapazität darf nicht kleiner als die aktuelle Belegung sein.',INVALID_PROFILE:'Bitte prüfe Name und Kennzeichen.',PROFILE_NOT_READY:'Dieses Konto hat noch kein Profil eingerichtet.',ADMIN_ACCOUNT_PROTECTED:'Admin-Konten können hier nicht gesperrt werden.',INVALID_STATUS:'Ungültiger Nutzerstatus.',BLOCK_REASON_REQUIRED:'Bitte gib einen Sperrgrund mit mindestens drei Zeichen an.',AUTH_REQUIRED:'Bitte melde dich erneut an.',PROFILE_REQUIRED:'Bitte vervollständige zuerst dein Profil.',PLATE_REQUIRED:'Bitte hinterlege zuerst dein Kennzeichen im Profil.',LOT_FULL:'Dieser Parkplatz ist inzwischen voll.',ALREADY_PARKED:'Du bist bereits eingecheckt.',PARKING_ENDED:'Dieser Parkvorgang ist bereits beendet.',DURATION_LIMIT:'Ein Parkvorgang kann höchstens zwölf Stunden dauern.',RIDE_FULL:'Alle Plätze sind inzwischen vergeben.',RIDE_UNAVAILABLE:'Diese Fahrt ist nicht mehr verfügbar.',OWN_RIDE:'Du kannst deine eigene Fahrt nicht anfragen.',NOT_FOUND:'Dieser Eintrag ist nicht verfügbar.',FORBIDDEN:'Diese Aktion ist für dein Konto nicht erlaubt.',CHAT_CLOSED:'Dieser Chat ist geschlossen.',REQUEST_CLOSED:'Die Anfrage wurde zurückgezogen.',INVALID_DEPARTURE:'Wähle einen zukünftigen Zeitpunkt innerhalb der nächsten 90 Tage.',RATE_LIMIT:'Zu viele Aktionen. Bitte versuche es später noch einmal.',INVALID_MESSAGE:'Bitte schreibe eine Nachricht mit höchstens 2.000 Zeichen.',invalid_credentials:'E-Mail oder Passwort stimmen nicht.',email_not_confirmed:'Bitte bestätige zuerst deine E-Mail-Adresse.',over_email_send_rate_limit:'Zu viele E-Mails angefordert. Bitte warte einige Minuten.',user_already_exists:'Für diese E-Mail gibt es bereits ein Konto.'};
export function friendly(e){return errors[e?.message]||errors[e?.code]||(['23514','23502','22P02'].includes(e?.code)?'Bitte prüfe deine Eingaben.':e instanceof TypeError?'Keine Verbindung. Prüfe dein Internet und versuche es erneut.':'Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.');}
export async function api(action,payload={}){if(!db)throw new Error('CONFIG_REQUIRED');const {data,error}=await db.rpc('campus_rpc',{action,payload});if(error)throw error;return data;}
export async function authAction(type,fields){
 if(!db)throw new Error('CONFIG_REQUIRED');
 storage.setRemember(fields.remember===true);
 let result;
 if(type==='login')result=await db.auth.signInWithPassword({email:fields.email,password:fields.password});
 else if(type==='register')result=await db.auth.signUp({email:fields.email,password:fields.password,options:{emailRedirectTo:new URL('./',location.href).href}});
 else if(type==='reset')result=await db.auth.resetPasswordForEmail(fields.email,{redirectTo:new URL('./?recovery=1',location.href).href});
 if(result.error){
  if(result.error.message?.includes('APPROVAL_REQUIRED')){if(type==='register')return{approvalPending:true};throw new Error('APPROVAL_REQUIRED');}
  if(result.error.message?.includes('ACCOUNT_BLOCKED'))throw new Error('ACCOUNT_BLOCKED');
  throw result.error;
 }
 if(type==='register'){if(result.data.session)await db.auth.signOut({scope:'local'});return{approvalPending:true};}
 return result.data;
}
