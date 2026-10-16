const fs=require('fs'),path=require('path'),assert=require('assert');
const repo=path.resolve(__dirname,'..');const{chromium}=require('playwright');
const styles=fs.readFileSync(repo+'/app.html','utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
const fixture=`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head><body><main id="fixture"></main>
<script>
var records={},requests=[],route=null,nativePhase='assente',nativePoints=[],nativeError=false;
window.ArcTrailGpsNativo={disponibile:function(){return true;},avvia:function(d,uid){requests.push(['start',uid,d.id]);route=JSON.parse(JSON.stringify(d));nativePhase='registra';},
comando:async function(cmd,uid,id,after){requests.push([cmd,uid,id,after]);if(nativeError&&cmd==='read')throw Error('Errore Android simulato');if(cmd==='recover')return uid==='user_a' ? window.recovery||{} : {};
if(cmd==='pause'){if(window.pauseGate)await window.pauseGate;nativePhase='pausa';return {ok:true};}if(cmd==='clear'){nativePhase='assente';route=null;nativePoints=[];return {ok:true};}
if(!route||uid!=='user_a'||id!==route.id)return {fase:'assente'};
var ps=nativePoints.filter(p=>p.seq>after).slice(0,2);return {id:route.id,companyCode:route.companyCode,fase:nativePhase,punti:ps,altro:nativePoints.some(p=>p.seq>(ps.length?ps[ps.length-1].seq:after))};}};
var ctx={lang:'it',user:{uid:'user_a',emailVerified:true},isAdmin:false,clubCode:'01VERB',
el:function(h){var x=document.createElement('div');x.innerHTML=h;return x.firstElementChild;},escapeHtml:function(s){return String(s).replace(/[&<>"']/g,'');},render:function(){document.getElementById('fixture').replaceChildren(CampoMappaUI.schermo(ctx));}};
</script><script src="/campo-geo.js"></script><script src="/campo-mappa.js"></script><script>ctx.render();CampoMappaUI._stato.perm={registra:true,gestisce:true,pubblica:false,autorizzaManutentori:false};ctx.render();</script></body></html>`;
let count=0;const check=(n,c)=>{assert(c,n);count++;console.log('  ✓ '+n);};
(async()=>{const browser=await chromium.launch({headless:true});try{
for(const width of [320,384]){const context=await browser.newContext({viewport:{width,height:832},isMobile:true,hasTouch:true});await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='gps.test')return r.abort();if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:fixture});if(['/campo-geo.js','/campo-mappa.js'].includes(u.pathname))return r.fulfill({path:repo+u.pathname});return r.abort();});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('JS',e.message);});await page.goto('https://gps.test/');await page.locator('[data-campo-nome-nuovo]').fill('Verde');await page.getByRole('button',{name:'Registra percorso',exact:true}).click();
await page.waitForFunction(()=>CampoMappaUI._reg.stato()==='registra');check('Avvio servizio richiesto dal gesto '+width,await page.evaluate(()=>requests.some(r=>r[0]==='start')&&CampoMappaUI._reg.dati().nativo));
await page.evaluate(()=>{let t=Date.now();nativePoints=[{seq:1,lat:45.92,lon:8.55,acc:5,t:t-8000},{seq:2,lat:45.9201,lon:8.5501,acc:5,t:t-4000},{seq:3,lat:45.9202,lon:8.5502,acc:5,t:t}];});
await page.waitForFunction(()=>CampoMappaUI._reg.dati().nativeCursor===3);check('Recupera tutte le pagine di punti accumulati '+width,await page.evaluate(()=>CampoMappaUI._reg.dati().punti.length===3));
check('Segna piazzola abilitato con GPS nativo '+width,await page.locator('[data-campo-segna-piazzola]').isEnabled());await page.locator('[data-campo-segna-piazzola]').click();check('Piazzola salvata insieme al tracciato '+width,await page.evaluate(()=>CampoMappaUI._reg.dati().piazzole.length===1));
await page.evaluate(()=>CampoMappaUI.lascia());check('Lasciare la mappa non spegne la registrazione Android '+width,await page.evaluate(()=>CampoMappaUI._reg.stato()==='registra'&&!requests.some(r=>r[0]==='pause')));
await page.evaluate(()=>ctx.render());await page.getByRole('button',{name:'Pausa',exact:true}).click();await page.waitForFunction(()=>CampoMappaUI._reg.stato()==='pausa');check('Pausa ferma Android e conserva i punti '+width,await page.evaluate(()=>requests.some(r=>r[0]==='pause')&&CampoMappaUI._reg.dati().punti.length===3));
await page.getByRole('button',{name:'Riprendi',exact:true}).click();await page.waitForFunction(()=>CampoMappaUI._reg.stato()==='registra');
await page.screenshot({path:path.join(__dirname,'gps-reale-'+width+'.png'),fullPage:true});check('Schermata senza overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>{nativeError=true;});await page.getByRole('button',{name:'Termina e salva',exact:true}).click();await page.waitForTimeout(300);check('Errore recupero impedisce salvataggio incompleto e cancellazione nativa '+width,await page.evaluate(()=>!!CampoMappaUI._reg.dati()&&CampoMappaUI._coda.quante()===0&&!requests.some(r=>r[0]==='clear')));
await page.evaluate(()=>{nativeError=false;});await page.getByRole('button',{name:'Termina e salva',exact:true}).click();await page.waitForFunction(()=>!CampoMappaUI._reg.dati());check('Termina salva tutto una sola volta e libera journal '+width,await page.evaluate(()=>CampoMappaUI._coda.quante()===1&&CampoMappaUI._coda.elenco()[0].dati.meta.piazzole.length===1&&requests.some(r=>r[0]==='clear')));

await page.evaluate(()=>{window.recovery={id:'recover_route',companyCode:'01VERB',name:'Rosso recuperato',avviatoIl:Date.now()};route={...recovery};nativePhase='registra';let t=Date.now();nativePoints=[{seq:1,lat:45.93,lon:8.56,acc:5,t:t-4000},{seq:2,lat:45.9301,lon:8.5601,acc:5,t:t}];ctx.render();});
await page.waitForFunction(()=>CampoMappaUI._reg.dati()&&CampoMappaUI._reg.dati().nativeCursor===2);
check('Recupera dal journal anche una bozza web mancante '+width,await page.evaluate(()=>CampoMappaUI._reg.dati().name==='Rosso recuperato'&&CampoMappaUI._reg.dati().punti.length===2));
await page.evaluate(()=>{window.pauseGate=new Promise(r=>window.releasePause=r);});
await page.getByRole('button',{name:'Termina e salva',exact:true}).click();
await page.evaluate(()=>{ctx.user={uid:'user_b',emailVerified:true};ctx.render();releasePause();window.pauseGate=null;});await page.waitForTimeout(250);
check('Cambio account durante Termina non sposta tracce o coda '+width,await page.evaluate(()=>!CampoMappaUI._reg.dati()&&CampoMappaUI._coda.quante()===0&&JSON.parse(localStorage.getItem('arctrail3d_campo_coda_v1:user_a')).length===1&&JSON.parse(localStorage.getItem('arctrail3d_campo_traccia_v1:user_a')).id==='recover_route'));
await page.evaluate(()=>{window.recovery=null;ArcTrailGpsNativo.disponibile=()=>false;ArcTrailGpsNativo.richiedeNativo=true;CampoMappaUI._stato.perm={registra:true};ctx.render();});
await page.locator('[data-campo-nome-nuovo]').fill('Non avviare');await page.getByRole('button',{name:'Registra percorso',exact:true}).click();
check('App Android senza bridge non ripiega sul GPS foreground '+width,await page.evaluate(()=>!CampoMappaUI._reg.dati()&&document.body.textContent.includes('GPS Android non collegato')));
check('Nessun errore JavaScript '+width,errors.length===0);await context.close();}
// Exercise the actual production MessagePort adapter, including origin rejection.
const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({content:fs.readFileSync(repo+'/app.html','utf8').split('<script>')[1].split('</script>')[0]});
check('Senza port nativo nessuna promessa di background',await page.evaluate(()=>!ArcTrailGpsNativo.disponibile()));
await page.evaluate(()=>{window.mc=new MessageChannel();window.good={tipo:'arctrail-gps-ready',token:'12345678-1234-1234-1234-123456789abc',package:'com.arctrail3d.myapp'};dispatchEvent(new MessageEvent('message',{origin:'https://evil.test',data:JSON.stringify(good),ports:[mc.port1]}));});check('Rifiuta origini diverse da ArcTrail',await page.evaluate(()=>!ArcTrailGpsNativo.disponibile()));
await page.evaluate(()=>{dispatchEvent(new MessageEvent('message',{origin:'https://arctrail3d.com',data:JSON.stringify(good),ports:[mc.port1]}));mc.port2.onmessage=e=>{let d=JSON.parse(e.data);mc.port2.postMessage(JSON.stringify({richiesta:d.richiesta,result:{ok:true}}));};});
check('Accetta port verificato e correla la risposta',await page.evaluate(async()=>(await ArcTrailGpsNativo.comando('read','u','r')).ok));await page.close();
console.log(count+' passate, 0 fallite.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
