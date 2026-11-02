import {map,tileLayer,marker,divIcon,latLngBounds} from './leaflet.js';
// Approximate study-model positions from the supplied CampusPark prototype.
const positions={p1:[47.61859,7.67750],p2:[47.61728,7.67686],p3:[47.61867,7.67894],p4:[47.61717,7.67768]};
let current=null,observer=null,timer=null,touchGuard=null;
export function unmountCampusMap(){touchGuard?.abort();touchGuard=null;observer?.disconnect();observer=null;clearTimeout(timer);current?.remove();current=null;}
export function mountCampusMap(lots,onSelect){
 const element=document.getElementById('campus-realmap');if(!element)return;
 unmountCampusMap();
 // Map gestures must not start native page scrolling or Safari page zoom.
 // Do not stop propagation: Leaflet still needs the touch/pointer stream.
 touchGuard=new AbortController();
 const preventNative=e=>{if(e.cancelable)e.preventDefault()};
 for(const event of ['touchmove','gesturestart','gesturechange'])element.addEventListener(event,preventNative,{passive:false,signal:touchGuard.signal});
 const status=document.getElementById('map-status');
 const report=(text,error=false)=>{if(!status?.isConnected)return;status.textContent=text;status.hidden=!text;status.classList.toggle('map-error',error)};
 const instance=map(element,{scrollWheelZoom:false,zoomControl:true,minZoom:3,maxZoom:19});current=instance;
 instance.fitBounds(latLngBounds(Object.values(positions)),{padding:[40,35],maxZoom:17});
 let loaded=0,failed=0;
 const tiles=tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
 tiles.on('loading',()=>{loaded=0;failed=0;report('Karte wird geladen …')});
 tiles.on('tileload',()=>{loaded++;report('')});
 tiles.on('tileerror',()=>{failed++;if(!loaded)report('Karte konnte nicht geladen werden. Verbindung prüfen oder OpenStreetMap unten öffnen.',true)});
 tiles.on('load',()=>{clearTimeout(timer);if(failed)report(loaded?'Einige Kartenteile fehlen. Campus zentrieren lädt die Karte erneut.':'Karte nicht erreichbar. Verbindung prüfen oder OpenStreetMap unten öffnen.',true);else report('')});
 tiles.addTo(instance);
 timer=setTimeout(()=>{if(!loaded)report('Die Karte lädt ungewöhnlich lange. Verbindung prüfen oder OpenStreetMap unten öffnen.',true)},12000);
 for(const lot of lots){const point=positions[lot.id];if(!point)continue;const free=Math.max(0,lot.capacity-Number(lot.occupied)),tone=free===0?'red':free/lot.capacity<.2?'orange':'green';
  const label=`${lot.name}: ${free} von ${lot.capacity} Modellplätzen frei. Details öffnen`;
  const pin=marker(point,{keyboard:true,title:label,icon:divIcon({className:'campus-lot-marker',html:`<span class="map-lot-label"><i class="pin-dot ${tone}"></i>${lot.id.toUpperCase()} · ${free}</span>`,iconSize:[78,36],iconAnchor:[39,18]})}).addTo(instance);
  pin.getElement().setAttribute('aria-label',label);pin.on('click',()=>onSelect(lot.id));
 }
 element.querySelector('.leaflet-control-zoom-in')?.setAttribute('aria-label','Karte vergrößern');
 element.querySelector('.leaflet-control-zoom-out')?.setAttribute('aria-label','Karte verkleinern');
 observer=new ResizeObserver(()=>{if(current===instance)instance.invalidateSize({pan:false})});observer.observe(element);
}
