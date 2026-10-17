// ArcTrail: vista semplice del motore MAPPE COMUNI 0.1.1, senza strumenti di tiro.
import { MotoreMappa } from './vendor/mappe-comuni-0.1.1/src/motore/MotoreMappa.js';
import { MAPPE_BASE, MAPPA_OFFLINE } from './vendor/mappe-comuni-0.1.1/src/origine/fornitori.js';
import { GestorePacchetti } from './vendor/offline/pacchettiOffline.js';
import { archivioIndexedDB } from './vendor/offline/archivioMappe.js';
import { impostaGestore, apriArchivio, chiudi } from './vendor/offline/mappaOffline.js';

const archivio = archivioIndexedDB();
const gestore = new GestorePacchetti({archivio, urlManifest:new URL('./mappe-offline/manifest.json',import.meta.url).href, memoria:localStorage});
impostaGestore(gestore);
const scripts = new Map();
function script(url) {
  if (!scripts.has(url)) scripts.set(url,new Promise((ok,ko)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>{scripts.delete(url);s.remove();ko(new Error('Libreria mappa non disponibile. Riprova quando sei online.'));};document.head.appendChild(s);}));
  return scripts.get(url);
}
function css(url){if(document.querySelector('link[data-carta-css]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=url;l.dataset.cartaCss='1';document.head.appendChild(l);}
function nodo(tag,testo,classe){const n=document.createElement(tag);if(testo)n.textContent=testo;if(classe)n.className=classe;return n;}
function button(t,fn){const b=nodo('button',t,'btn btn-ghost campo-mini');b.type='button';b.addEventListener('click',fn);return b;}
function dentro(p,b){return p&&p.lon>=b[0]&&p.lon<=b[2]&&p.lat>=b[1]&&p.lat<=b[3];}
let memoriaVista=null,ultimoUtente=null;
export async function creaCarta(box,opzioni={}){
  if(ultimoUtente!==opzioni.uid){memoriaVista=null;ultimoUtente=opzioni.uid;}
  css('vendor/leaflet/leaflet.css');
  await script('vendor/leaflet/leaflet.js');
  if(!box.isConnected)return null;
  const it=opzioni.lang!=='en',L=globalThis.L;
  let viva=true,dati={},centrata=false,segui=true,base=localStorage.getItem('arctrail3d_carta_base')||'aerea',presenti=[],cambio=0;
  box.textContent='';box.classList.add('campo-carta');
  const toolbar=nodo('div',null,'campo-carta-comandi'),view=nodo('div',null,'campo-carta-vista'),stato=nodo('p',null,'nota campo-carta-stato');stato.setAttribute('role','status');
  const off=nodo('details',null,'campo-carta-offline'),summary=nodo('summary',it?'Scarica mappa offline':'Download offline map');off.append(summary);
  const descr=nodo('p',it?'Mappe disponibili: Verbania-Cusio, Ossola Nord e Sud. Scaricale prima di partire. La foto aerea richiede Internet.':'Available offline areas: Verbania-Cusio, North and South Ossola. Download before leaving. Aerial imagery needs Internet.','nota');off.append(descr);
  const packs=nodo('div');off.append(packs);box.append(toolbar,view,stato,off);
  const LStatico=Object.assign({},L,{map:(el,opts)=>L.map(el,{...opts,zoomAnimation:false,fadeAnimation:false})});
  const motore=new MotoreMappa(view,{L:LStatico,radice:box,vista:memoriaVista||{lat:45.93,lon:8.53,zoom:12}}),map=motore.map;
  if(opzioni.senzaDistanze){map.eachLayer(()=>{});map._controlCorners.bottomleft.querySelector('.leaflet-control-scale')?.remove();}
  L.control.zoom({position:'topright'}).addTo(map);
  const gruppo=L.layerGroup().addTo(map),posizione=L.layerGroup().addTo(map);
  const aerea=button(it?'Aerea':'Aerial',()=>scegli('aerea')),offline=button('Offline',()=>scegli('offline'));
  const centra=button(it?'Centra GPS':'Locate me',()=>{segui=true;if(dati.pos)map.setView([dati.pos.lat,dati.pos.lon],18);else opzioni.chiediGps?.();});
  toolbar.append(aerea,offline,centra);motore.suGestoUtente(()=>{segui=false;});
  function statoCopertura(){if(base!=='offline')return;const p=dati.pos||{lat:map.getCenter().lat,lon:map.getCenter().lng};const cop=presenti.some(m=>dentro(p,m.bbox));stato.textContent=cop?(it?'Mappa offline disponibile.':'Offline map available.'):(it?'Questa posizione non è coperta dalle mappe scaricate. GPS e traccia continuano.':'This position is outside downloaded maps. GPS and recording continue.');}
  async function scegli(id){
    const turno=++cambio;try{
      if(id==='offline'){
        presenti=await archivio.elenca();if(!viva||turno!==cambio)return;
        if(!presenti.length){off.open=true;stato.textContent=it?'Scarica prima una mappa dall’elenco qui sotto.':'Download a map below first.';return;}
        await Promise.all([script('vendor/pmtiles/pmtiles.js'),script('vendor/protomaps-leaflet/protomaps-leaflet.js')]);
        const p=dati.pos||{lat:map.getCenter().lat,lon:map.getCenter().lng},idPrimo=presenti.find(m=>dentro(p,m.bbox))?.id;
        const source=await apriArchivio(idPrimo);if(!viva||turno!==cambio)return;motore.impostaBase(MAPPA_OFFLINE,{sorgentePmtiles:source});
      }else{motore.impostaBase(MAPPE_BASE.find(m=>m.id==='aerea'));stato.textContent=it?'Foto aerea del Piemonte · richiede Internet.':'Piedmont aerial imagery · requires Internet.';}
      base=id;localStorage.setItem('arctrail3d_carta_base',id);aerea.setAttribute('aria-pressed',String(id==='aerea'));offline.setAttribute('aria-pressed',String(id==='offline'));statoCopertura();
    }catch(e){if(viva){stato.textContent=e.message;off.open=true;}}
  }
  motore.suStatoBase=(s,id)=>{if(!viva)return;if(s==='non-disponibile'&&id==='aerea'){stato.textContent=it?'Foto aerea non disponibile. Usa Offline se hai scaricato la zona. GPS e traccia continuano.':'Aerial imagery unavailable. Use Offline if downloaded. Recording continues.';}};
  async function elenco(rete=true){
    try{const v=await gestore.stato({rete});if(!viva)return;packs.textContent='';presenti=await archivio.elenca();
      for(const p of v){const r=nodo('div',null,'campo-carta-pacchetto');r.append(nodo('b',p.nome));const testo=nodo('p',(p.stato==='SCARICATA'?(it?'Scaricata':'Downloaded'):(it?'Da scaricare':'Not downloaded'))+' · '+((p.bytes||0)/1048576).toFixed(1)+' MB','nota');r.append(testo);
        const b=button(p.stato==='SCARICATA'?(it?'Usa mappa':'Use map'):(it?'Scarica':'Download'),async()=>{
          if(p.stato==='SCARICATA'){await scegli('offline');return;}
          b.disabled=true;try{await gestore.scarica(p.id,{suAvanzamento:(f,t)=>{testo.textContent=(it?'Scaricamento ':'Downloading ')+Math.floor(f/t*100)+'%';}});chiudi(p.id);await elenco(false);await scegli('offline');}
          catch(e){if(viva)testo.textContent=e.message;}finally{b.disabled=false;}
        });r.append(b);if(p.locale){r.append(button(it?'Rimuovi mappa':'Remove map',async()=>{if(!confirm(it?'Rimuovere la mappa scaricata? I percorsi restano salvati.':'Remove downloaded map? Recorded routes are kept.'))return;try{await archivio.elimina(p.id);chiudi(p.id);await elenco(false);if(viva&&base==='offline')await scegli(presenti.length?'offline':'aerea');}catch(e){testo.textContent=e.message;}}));}packs.append(r);
      }
      if(gestore.erroreManifest&&!v.some(p=>p.voce))packs.append(nodo('p',it?'Elenco non disponibile: collegati a Internet e riprova.':'Map list unavailable. Connect and retry.','nota'));
    }catch(e){if(viva)stato.textContent=e.message;}
  }
  function aggiorna(d){
    if(!viva)return;const nuova=d.key!==dati.key;dati=d;gruppo.clearLayers();posizione.clearLayers();
    const traccia=(d.punti||[]).concat(d.traccia||[]);if(traccia.length>1)L.polyline(traccia.map(p=>[p.lat,p.lon]),{color:'#fff',weight:8}).addTo(gruppo);
    if(traccia.length>1)L.polyline(traccia.map(p=>[p.lat,p.lon]),{color:'#ee6b13',weight:4}).addTo(gruppo);
    for(const p of d.piazzole||[])L.marker([p.lat,p.lon],{icon:L.divIcon({className:'campo-carta-piazzola',html:String(Number(p.n)),iconSize:[30,30]})}).addTo(gruppo);
    for(const s of d.segn||[]){if(s.status==='resolved')continue;L.circleMarker([s.lat,s.lon],{radius:8,color:'#aa251e',fillOpacity:0.9}).addTo(gruppo).on('click',()=>opzioni.suSegnalazione?.(s.id));}
    if(d.pos){const p=d.pos;L.circle([p.lat,p.lon],{radius:Math.min(500,Math.max(0,p.acc||0)),weight:1,color:'#24689d',fillOpacity:0.12}).addTo(posizione);L.circleMarker([p.lat,p.lon],{radius:7,color:'#fff',weight:3,fillColor:'#24689d',fillOpacity:1}).addTo(posizione);if(segui&&!d.salvata){map.setView([p.lat,p.lon],centrata?map.getZoom():18);centrata=true;}}
    if(nuova&&d.salvata&&traccia.length){map.fitBounds(L.latLngBounds(traccia.map(p=>[p.lat,p.lon])),{padding:[25,25],maxZoom:18});segui=false;}
    statoCopertura();map.invalidateSize(false);
  }
  function distruggi(){if(!viva)return;viva=false;cambio++;const c=map.getCenter();memoriaVista={lat:c.lat,lon:c.lng,zoom:map.getZoom()};motore.distruggi();}
  if(opzioni.pannello){
    view.style.height=Math.max(128,Math.min(240,innerHeight-view.getBoundingClientRect().top-200))+'px';
    const pannello=opzioni.pannello,segna=pannello.querySelector('.campo-segna-riga'),azioni=pannello.querySelector('.campo-controlli-traccia'),fase=pannello.querySelector('.campo-reg-stato');
    if(fase)box.insertBefore(fase,stato);if(segna)box.insertBefore(segna,stato);if(azioni)box.insertBefore(azioni,stato);
    const dettagli=nodo('details',null,'campo-carta-dettagli'),titolo=nodo('summary',it?'Dettagli registrazione':'Recording details');dettagli.append(titolo);pannello.parentNode.insertBefore(dettagli,pannello);dettagli.append(pannello);
  }
  const api={aggiorna,distruggi,mappa:map,gestore};box._carta=api;
  await elenco(navigator.onLine!==false);if(!viva)return null;
  await scegli(navigator.onLine===false&&presenti.length?'offline':base);if(!viva)return null;requestAnimationFrame(()=>{if(viva)map.invalidateSize();});
  map.on('moveend',statoCopertura);return api;
}

// Esportazione senza immagini aeree: schema leggibile, nessuna ridistribuzione AGEA.
export async function immaginePercorso(meta,punti){
  const ps=punti.concat(meta.piazzole||[]);if(!ps.length)throw new Error('Percorso senza posizioni.');
  const cv=document.createElement('canvas');cv.width=1000;cv.height=1200;const c=cv.getContext('2d');c.fillStyle='#f5f5ed';c.fillRect(0,0,1000,1200);
  c.fillStyle='#214432';c.font='bold 42px Arial';c.fillText(String(meta.name||'Percorso').slice(0,36),50,75);c.font='24px Arial';c.fillText(String(meta.companyCode||'')+' · '+(Number(meta.lengthM||0)/1000).toFixed(2)+' km · '+(meta.piazzole||[]).length+' piazzole',50,120);
  const lat=ps.reduce((s,p)=>s+p.lat,0)/ps.length,k=Math.cos(lat*Math.PI/180),xs=ps.map(p=>p.lon*k),ys=ps.map(p=>p.lat),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),sc=Math.min(850/Math.max(xmax-xmin,0.0001),780/Math.max(ymax-ymin,0.0001));
  const xy=p=>[500+(p.lon*k-(xmin+xmax)/2)*sc,600-(p.lat-(ymin+ymax)/2)*sc];
  c.strokeStyle='#ee6b13';c.lineWidth=7;c.beginPath();punti.forEach((p,i)=>{const q=xy(p);i?c.lineTo(...q):c.moveTo(...q);});c.stroke();
  for(const p of meta.piazzole||[]){const q=xy(p);c.fillStyle='#214432';c.beginPath();c.arc(...q,21,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font='bold 20px Arial';c.textAlign='center';c.fillText(String(p.n),q[0],q[1]+7);}c.textAlign='left';
  if(punti.length){const q=xy(punti[0]);c.fillStyle='#214432';c.font='22px Arial';c.fillText('Partenza',q[0]+25,q[1]-20);}
  c.fillStyle='#214432';c.font='bold 28px Arial';c.fillText('Registrato con ArcTrail 3D',50,1090);c.font='24px Arial';c.fillText('arctrail3d.com',50,1130);c.font='18px Arial';c.fillText('Schema del percorso · non è una carta di navigazione',50,1170);
  const blob=await new Promise(ok=>cv.toBlob(ok,'image/png'));if(!blob)throw new Error('Immagine non disponibile.');
  const f=new File([blob],'ArcTrail3D-'+meta.id+'.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:meta.name});return;}
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
