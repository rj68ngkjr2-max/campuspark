import {demo} from './demo-backend.js';
import {personas,DEMO_PASSWORD} from './demo-store.js';
import './source-app.js';
const phone=document.querySelector('#phone'),bar=document.createElement('div');
bar.className='demo-bar';
bar.innerHTML='<span>Testversion · isolierte Testdaten</span><button type="button" aria-expanded="false" aria-controls="demo-controls">Demo steuern</button>';
const panel=document.createElement('div');panel.id='demo-controls';panel.className='demo-controls';panel.hidden=true;
const reset=document.createElement('button');reset.type='button';reset.className='secondary';reset.textContent='Demo zurücksetzen';reset.addEventListener('click',()=>{demo.reset();try{localStorage.removeItem('campuspark.demo.theme')}catch{}location.assign('./demo.html')});
const login=document.createElement('a');login.href='./demo.html?login=1';login.className='textbtn';login.textContent='Zur Demo-Anmeldung';
const exit=document.createElement('a');exit.href='./index.html';exit.className='textbtn';exit.textContent='Zur Live-Anmeldung';
const help=document.createElement('p');help.className='caption';help.textContent='Die Kernaufgaben laufen im selben Nutzerkonto. Für den optionalen Admin-Test über die Demo-Anmeldung anmelden. Änderungen bleiben in diesem Demo-Tab; Zurücksetzen stellt den Testbeginn wieder her.';
const version=document.createElement('p');version.className='caption';version.textContent='Demo-Stand: '+(new URL(document.querySelector('script[type="module"]').src).searchParams.get('v')||'lokal');
panel.append(reset,login,exit,help,version);phone.prepend(bar,panel);
bar.querySelector('button').addEventListener('click',()=>{panel.hidden=!panel.hidden;bar.querySelector('button').setAttribute('aria-expanded',String(!panel.hidden))});
// Only the demo login offers the two roles. Core tasks never require changing accounts.
let email='lea@campuspark.example.invalid',password=DEMO_PASSWORD;
function prepareLogin(){
 const form=document.querySelector('#auth-form');if(!form||form.dataset.demoPrepared)return;
 form.dataset.demoPrepared='true';
 const choices=document.createElement('div');choices.className='demo-login-roles';choices.setAttribute('role','group');choices.setAttribute('aria-label','Demo-Testzugang vorausfüllen');
 const note=document.createElement('p');note.className='caption';note.textContent='Testzugang vorausfüllen · anschließend anmelden';choices.append(note);
 const fill=()=>{form.elements.email.value=email;form.elements.password.value=password};
 for(const p of personas){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=p.label;button.addEventListener('click',()=>{email=p.id+'@campuspark.example.invalid';password=DEMO_PASSWORD;fill()});choices.append(button);}
 form.before(choices);fill();
 form.addEventListener('input',()=>{email=form.elements.email.value;password=form.elements.password.value});
 const detail=document.createElement('p');detail.className='caption';detail.textContent='Nur erfundene Testkonten. Das Demo-Passwort lautet '+DEMO_PASSWORD+'. Für die Freigabeprüfung die vorbereitete Testkonto-E-Mail eingeben.';form.after(detail);
}
new MutationObserver(prepareLogin).observe(document.querySelector('#app-root'),{childList:true});prepareLogin();
new MutationObserver(()=>{const open=!!document.querySelector('#sheet-root .sheet');bar.inert=open;panel.inert=open}).observe(document.querySelector('#sheet-root'),{childList:true});
