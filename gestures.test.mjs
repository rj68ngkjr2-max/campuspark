import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installTabScrub} from './gestures.js';
class Classes{set=new Set();add(c){this.set.add(c)}remove(c){this.set.delete(c)}contains(c){return this.set.has(c)}toggle(c,on){if(on===undefined)on=!this.contains(c);on?this.add(c):this.remove(c);return on}}
function fixture(){
 const nav=new EventTarget();nav.classList=new Classes();nav.dataset={};nav.clientLeft=1;const values=new Map();nav.style={setProperty:(k,v)=>values.set(k,v)};nav.getBoundingClientRect=()=>({left:10,top:700,width:380,right:390,bottom:768});
 const buttons=Array.from({length:5},(_,i)=>({dataset:{route:'tab'+i},classList:new Classes(),closest(){return this},getBoundingClientRect:()=>({left:16+i*74,top:706,width:72,right:88+i*74,bottom:762})}));buttons[0].classList.add('active');nav.querySelectorAll=()=>buttons;
 const captured=new Set();nav.setPointerCapture=id=>captured.add(id);nav.hasPointerCapture=id=>captured.has(id);nav.releasePointerCapture=id=>{captured.delete(id);send('lostpointercapture',{pointerId:id})};
 const send=(type,props={})=>{const e=new Event(type,{cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(e,key,{value});nav.dispatchEvent(e);return e};
 const down=(index,x=52+index*74,id=1)=>send('pointerdown',{target:buttons[index],clientX:x,clientY:734,pointerId:id,button:0,isPrimary:true});
 const move=(x,id=1)=>send('pointermove',{clientX:x,clientY:734,pointerId:id});const up=(x,id=1)=>send('pointerup',{clientX:x,clientY:734,pointerId:id});
 const selected=[];const dispose=installTabScrub(nav,r=>selected.push(r));return{nav,buttons,values,selected,send,down,move,up,dispose,captured};
}
test('drag follows finger continuously, not in tab-sized jumps',()=>{const f=fixture();f.down(0);assert.equal(f.values.get('--scrub-x'),'5px');f.move(69);assert.equal(f.values.get('--scrub-x'),'22px');f.move(81);assert.equal(f.values.get('--scrub-x'),'34px');f.up(348);assert.deepEqual(f.selected,['tab4']);assert(f.buttons[4].classList.contains('active'));assert(!f.buttons[0].classList.contains('active'));f.dispose()});
test('a new drag starts at the touched tab, not the previous drag endpoint',()=>{const f=fixture();f.down(4);f.move(52);f.up(52);f.down(3);assert.equal(f.values.get('--scrub-x'),'227px');f.move(266);assert.equal(f.values.get('--scrub-x'),'219px');f.dispose()});
test('pointer identity, cancellation and re-entry do not select a stray tab',()=>{const f=fixture();f.down(2,200,3);f.move(340,4);assert.equal(f.values.get('--scrub-x'),'153px');f.send('pointercancel',{pointerId:3});assert.deepEqual(f.selected,[]);assert(!f.nav.classList.contains('is-scrubbing'));f.down(1);f.up(126);assert.deepEqual(f.selected,['tab1']);f.dispose()});
test('bubble stays inside the capsule and gaps select the closest tab',()=>{const f=fixture();f.down(0);f.move(-300);assert.equal(f.values.get('--scrub-x'),'5px');f.move(900);assert.equal(f.values.get('--scrub-x'),'301px');f.up(89);assert.equal(f.selected.length,1);f.dispose()});
test('compatibility click after touch is suppressed; keyboard clicks are retained',()=>{const f=fixture();f.down(1);f.up(126);assert(f.send('click',{detail:1}).defaultPrevented);assert(!f.send('click',{detail:0}).defaultPrevented);f.dispose()});
test('disposing an active gesture releases capture without reentrant cancellation',()=>{const f=fixture();f.down(2);f.dispose();assert.equal(f.captured.size,0);assert(!f.nav.classList.contains('is-scrubbing'));f.move(300);f.up(300);assert.deepEqual(f.selected,[])});
