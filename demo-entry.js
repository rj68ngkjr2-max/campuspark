import {demo} from './demo-backend.js';
import {personas} from './demo-store.js';
import './source-app.js';
const phone=document.querySelector('#phone'),bar=document.createElement('div');
bar.className='demo-bar';
bar.innerHTML='<span>Testversion · alle Daten erfunden</span><button type="button" aria-expanded="false" aria-controls="demo-controls">Demo steuern</button>';
const panel=document.createElement('div');panel.id='demo-controls';panel.className='demo-controls';panel.hidden=true;
const label=document.createElement('label');label.textContent='Ansicht als';label.htmlFor='demo-persona';
const select=document.createElement('select');select.id='demo-persona';select.className='field';
for(const persona of personas){const option=document.createElement('option');option.value=persona.id;option.textContent=persona.label;select.append(option);}select.value=demo.currentUser().id;
select.addEventListener('change',()=>{demo.select(select.value);location.reload()});
const reset=document.createElement('button');reset.type='button';reset.className='secondary';reset.textContent='Demo zurücksetzen';reset.addEventListener('click',()=>{demo.reset();try{localStorage.removeItem('campuspark.demo.theme')}catch{}location.reload()});
const exit=document.createElement('a');exit.href='./index.html';exit.className='textbtn';exit.textContent='Zur Live-Anmeldung';
const help=document.createElement('p');help.className='caption';help.textContent='Änderungen gelten nur in diesem Demo-Tab. Für die Gegenseite einer Mitfahrt zwischen Lea und Tom wechseln. Zurücksetzen startet wieder mit Lea.';
panel.append(label,select,reset,exit,help);bar.after(panel);phone.prepend(bar,panel);
bar.querySelector('button').addEventListener('click',()=>{panel.hidden=!panel.hidden;bar.querySelector('button').setAttribute('aria-expanded',String(!panel.hidden))});
// Match the shared modal's inert state without changing the live renderer.
new MutationObserver(()=>{const open=!!document.querySelector('#sheet-root .sheet');bar.inert=open;panel.inert=open}).observe(document.querySelector('#sheet-root'),{childList:true});
