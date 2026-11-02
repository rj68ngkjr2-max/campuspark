const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function swipeDecision(dx,dy,width,velocity=0){
 if(Math.abs(dx)<Math.abs(dy)*1.25)return null;
 if(Math.abs(dx)<Math.min(110,width*.28)&&!(Math.abs(dx)>=48&&Math.abs(velocity)>.65))return null;
 return dx>0?'LIKE':'PASS';
}
export function tabAtPoint(tabs,x,y){return tabs.find(tab=>{const r=tab.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top-12&&y<=r.bottom+12;})||null;}
export function installCardSwipe(card,{onDecision,disabled=()=>false}){
 let gesture=null,suppressUntil=0;
 const reset=()=>{card.classList.remove('is-dragging','is-leaving');card.style.removeProperty('--drag-x');card.style.removeProperty('--drag-y');card.style.removeProperty('--drag-angle');card.style.removeProperty('--like-opacity');card.style.removeProperty('--pass-opacity');};
 const release=id=>{if(card.hasPointerCapture(id))card.releasePointerCapture(id);};
 card.addEventListener('dragstart',e=>e.preventDefault());
 card.addEventListener('click',e=>{if(e.detail!==0&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 card.addEventListener('pointerdown',e=>{
  if(disabled()||e.isPrimary===false||e.button!==0||e.target.closest('button,a,input,select,textarea'))return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,time:e.timeStamp,velocity:0,locked:false};
  // Touch implicitly captures the photo child. Own the pointer from the start
  // so transferring that capture later cannot cancel an in-progress swipe.
  card.setPointerCapture(e.pointerId);
 });
 card.addEventListener('pointermove',e=>{
  const g=gesture;if(!g||g.id!==e.pointerId)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.locked){
   if(Math.abs(dy)>=22&&Math.abs(dy)>Math.abs(dx)*1.35){gesture=null;release(e.pointerId);return;}
   if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.15)return;
   g.locked=true;card.classList.add('is-dragging');
  }
  e.preventDefault();const dt=e.timeStamp-g.time;if(dt>0)g.velocity=(e.clientX-g.lastX)/dt;g.lastX=e.clientX;g.time=e.timeStamp;
  const strength=Math.min(1,Math.abs(dx)/(card.clientWidth*.28));
  card.style.setProperty('--drag-x',dx+'px');card.style.setProperty('--drag-y',dy*.18+'px');card.style.setProperty('--drag-angle',Math.max(-14,Math.min(14,dx/card.clientWidth*16))+'deg');
  card.style.setProperty('--like-opacity',dx>0?strength:0);card.style.setProperty('--pass-opacity',dx<0?strength:0);
 },{passive:false});
 card.addEventListener('pointerup',e=>{
  const g=gesture;if(!g||g.id!==e.pointerId)return;gesture=null;release(e.pointerId);
  if(!g.locked)return;e.preventDefault();suppressUntil=Date.now()+500;
  const velocity=e.timeStamp-g.time<100?g.velocity:0;
  const decision=swipeDecision(e.clientX-g.x,e.clientY-g.y,card.clientWidth,velocity);
  card.classList.remove('is-dragging');if(decision&&!disabled())onDecision(decision);else reset();
 });
 const cancel=e=>{if(gesture?.id!==e.pointerId)return;gesture=null;release(e.pointerId);reset();};
 card.addEventListener('pointercancel',cancel);
 // A descendant losing its implicit touch capture bubbles here too. Only
 // losing our own capture means that this card gesture was interrupted.
 card.addEventListener('lostpointercapture',e=>{if(e.target===card)cancel(e);});
 return {reset,async exit(decision){
  card.classList.remove('is-dragging');card.classList.add('is-leaving');
  card.style.setProperty(decision==='LIKE'?'--like-opacity':'--pass-opacity',1);
  if(reducedMotion())return;
  const direction=decision==='LIKE'?1:-1;
  const animation=card.animate([{transform:getComputedStyle(card).transform,opacity:1},{transform:`translate3d(${direction*(window.innerWidth+card.clientWidth)}px,30px,0) rotate(${direction*22}deg)`,opacity:0}],{duration:280,easing:'cubic-bezier(.3,.05,.7,.7)',fill:'forwards'});
  // Keep it out of the way while saving, but make failures reversible.
  card.exitAnimation=animation;try{await animation.finished;}catch{}
 },restore(){card.exitAnimation?.cancel();reset();}};
}
export function installTabScrub(nav,onSelect){
 const controller=new AbortController(),options={signal:controller.signal};let gesture=null,settleTimer;
 const buttons=()=>[...nav.querySelectorAll('button[data-route]')];
 const targetAt=x=>{const tabs=buttons(),rects=tabs.map(b=>b.getBoundingClientRect());if(!rects.length)return null;return tabs[rects.reduce((best,r,i)=>Math.abs(x-(r.left+r.width/2))<Math.abs(x-(rects[best].left+rects[best].width/2))?i:best,0)];};
 const clear=()=>{clearTimeout(settleTimer);gesture=null;nav.classList.remove('is-scrubbing','is-settling');buttons().forEach(b=>b.classList.remove('scrub-target'));};
 const visualLeft=()=>new DOMMatrixReadOnly(getComputedStyle(nav,'::before').transform).m41;
 const mark=target=>buttons().forEach(b=>b.classList.toggle('scrub-target',b===target));
 // A captured drag keeps following horizontal movement at any vertical position.
 const position=x=>{const g=gesture;if(!g)return;nav.style.setProperty('--scrub-x',Math.max(g.min,Math.min(g.max,g.left+x-g.x))+'px');};
 const release=id=>{if(nav.hasPointerCapture(id))nav.releasePointerCapture(id)};
 nav.addEventListener('click',e=>{if(e.detail!==0&&Date.now()<Number(nav.dataset.suppressClickUntil||0)){e.preventDefault();e.stopImmediatePropagation();}}, {...options,capture:true});
 nav.addEventListener('pointerdown',e=>{const target=e.target.closest('button[data-route]');if(!target||e.button!==0||e.isPrimary===false||gesture)return;const tabs=buttons(),n=nav.getBoundingClientRect(),r=target.getBoundingClientRect(),first=tabs[0].getBoundingClientRect(),last=tabs.at(-1).getBoundingClientRect(),origin=n.left+nav.clientLeft;
  const interrupted=nav.classList.contains('is-settling')?visualLeft():null;clear();
  gesture={id:e.pointerId,x:e.clientX,left:interrupted??r.left-origin,width:r.width,min:first.left-origin,max:last.right-origin-r.width};
  nav.style.setProperty('--scrub-width',r.width+'px');position(e.clientX);mark(target);nav.classList.add('is-scrubbing');nav.setPointerCapture(e.pointerId);
 },options);
 nav.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();position(e.clientX);mark(targetAt(e.clientX));},{...options,passive:false});
 nav.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const target=targetAt(e.clientX);position(e.clientX);gesture=null;release(e.pointerId);e.preventDefault();nav.dataset.suppressClickUntil=String(Date.now()+500);
  const destination=target||buttons().find(b=>b.classList.contains('active'));
  if(destination&&!reducedMotion()){
   // Commit the last finger position before starting the release-only transition.
   visualLeft();nav.classList.add('is-settling');mark(destination);
   const n=nav.getBoundingClientRect(),r=destination.getBoundingClientRect();
   nav.style.setProperty('--scrub-x',(r.left-n.left-nav.clientLeft)+'px');nav.style.setProperty('--scrub-width',r.width+'px');
   // Also covers zero-distance releases or a hidden/removed navigation bar.
   settleTimer=setTimeout(clear,300);
  }else clear();
  if(target){buttons().forEach(b=>b.classList.toggle('active',b===target));onSelect(target.dataset.route);}
 },options);
 nav.addEventListener('transitionend',e=>{if(e.target===nav&&e.pseudoElement==='::before'&&e.propertyName==='transform'&&nav.classList.contains('is-settling'))clear();},options);
 const cancel=e=>{if(gesture?.id!==e.pointerId)return;nav.dataset.suppressClickUntil=String(Date.now()+500);clear();release(e.pointerId);};
 nav.addEventListener('pointercancel',cancel,options);nav.addEventListener('lostpointercapture',e=>{if(e.target===nav)cancel(e);},options);
 return ()=>{const id=gesture?.id;clear();if(id!==undefined)release(id);controller.abort();};
}
