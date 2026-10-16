const fs=require('fs'),path=require('path'),assert=require('assert');const repo=path.resolve(__dirname,'..'),{chromium}=require(repo+'/node_modules/playwright'),F=require(repo+'/tests/firebase-finto.js');
const U={uid:'uidMario',email:'mario@esempio.it'},stamp='2026-10-16T14:00:00.000Z';
const round=(date,total)=>({date,modeKey:'training',modeLabel:'Allenamento',format:4,sessionType:'3d',results:[{name:'Mario',total,isSelf:true,ownerUid:U.uid,perTarget:[15,15,15,15]}]});
const id=d=>d.replace(/[^0-9]/g,'').slice(0,17),g=round(stamp,60),g2=round('2026-10-16T13:00:00.000Z',30);
const hook=`window.__fixTest={vai:function(s){state.screen=s;state.journalTab='rounds';save();render();},render:render,
add:function(g){var h=loadHistory();h.unshift(g);saveHistoryList(h);render();},
offline:function(v){if(v){this.primaDb=db;db=null;}else db=this.primaDb;},
restore:function(){return new Promise(r=>restoreHistoryFromCloud(()=>r()));},push:function(){return new Promise(r=>pushLocalHistoryToCloud(()=>r()));}};`;
const html=F.copiaProduzione(fs.readFileSync(process.env.APP||repo+'/app.html','utf8'),{gancio:hook});let n=0;const check=(label,c)=>{assert(c,label);n++;console.log('  ✓ '+label);};
(async()=>{const browser=await chromium.launch();try{for(const width of[320,384]){
const ctx=await browser.newContext({viewport:{width,height:832},isMobile:true,hasTouch:true,locale:'it-IT'});
const dati={users:{[U.uid]:{...U,approved:true,nomeCognome:'Mario Rossi',username:'mariorossi',federazioni:[{code:'fiarc',tessera:'FI111'}],privacy:true,terms:true}},public_profiles:{},['users/'+U.uid+'/storico']:{[id(stamp)]:g,[id(g2.date)]:g2}};
await ctx.addInitScript(F.scriptIniziale({utente:U,dati}));await ctx.addInitScript(({U,g,g2})=>{if(sessionStorage.seed)return;sessionStorage.seed='1';localStorage.setItem('arctrail3d_state_v3',JSON.stringify({screen:'diario',journalTab:'rounds',tab:'home',lang:'it',country:'it',federation:'fiarc',theme:'light',profile:{nomeCognome:'Mario Rossi',username:'mariorossi',email:U.email,federazioni:[{code:'fiarc',tessera:'FI111'}]},profileSkipped:false,pendingArchers:[]}));localStorage.setItem('arctrail3d_storico_v1',JSON.stringify([g,g2]));localStorage.setItem('arctrail3d_proprietario_v1',U.uid);localStorage.setItem('arctrail3d_welcome_v2','1');},{U,g,g2});
await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='fix.test')return r.abort();if(u.pathname==='/app.html')return r.fulfill({contentType:'text/html',body:html});let p=path.join(repo,decodeURIComponent(u.pathname));return p.startsWith(path.resolve(repo)+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile()?r.fulfill({path:p}):r.abort();});
const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://fix.test/app.html');await page.waitForFunction(()=>window.__fixTest&&document.querySelector('#app button'));await page.waitForTimeout(700);
await page.evaluate(()=>__fixTest.vai('open-training-create'));
for(const q of['01VERB','01 Verb','01-verb','Vignone','Arcieri del VCO']){const input=page.locator('input.cerca').first();await input.fill(q);check('Campo trovato per '+q+' a '+width,(await page.locator('#app').innerText()).includes('A.S.D. Arcieri del VCO & Valgrande'));}
await page.locator('input.cerca').first().fill('01 Verb');await page.locator('#app').getByText('A.S.D. Arcieri del VCO & Valgrande — Via A. Alberti, Vignone (VB)',{exact:true}).click();check('Selezione conserva il codice corretto '+width,await page.evaluate(()=>document.querySelector('[data-cod]')?.getAttribute('data-cod')==='01VERB'));
await page.evaluate(()=>__fixTest.vai('diario'));const target=page.locator('[data-history-delete="'+stamp+'"]');await target.click();check('Conferma leggibile senza spunta ambigua '+width,(await target.innerText())==='Conferma');await page.evaluate(()=>__fixTest.render());check('Conferma sopravvive al ridisegno '+width,(await page.locator('[data-history-delete="'+stamp+'"]').innerText())==='Conferma');
await page.evaluate(()=>__fixTest.add({date:'2026-10-16T15:00:00.000Z',modeKey:'training',format:4,results:[{name:'Altro giro',total:45,perTarget:[]}]}));
await page.locator('[data-history-delete="'+stamp+'"]').click();check('Elimina il giro scelto anche se cambia posizione '+width,await page.evaluate(stamp=>{let h=JSON.parse(localStorage.getItem('arctrail3d_storico_v1'));return !h.some(g=>g.date===stamp)&&h.some(g=>g.results[0].name==='Altro giro');},stamp));
await page.evaluate(()=>__fixTest.restore());check('Il giro non ritorna dalla sincronizzazione '+width,await page.locator('[data-history-delete="'+stamp+'"]').count()===0);
await page.screenshot({path:__dirname+'/storico-corretto-'+width+'.png',fullPage:true});
// Last local round removed offline, while its old cloud copy is still present.
await page.evaluate(({g,id,U})=>{localStorage.setItem('arctrail3d_storico_v1',JSON.stringify([g]));localStorage.setItem('arctrail3d_storico_cancellati_v1','{}');window.__DATI['users/'+U.uid+'/storico'][id]=g;__fixTest.offline(true);__fixTest.render();},{g,id:id(stamp),U});
await page.locator('[data-history-delete="'+stamp+'"]').click();await page.locator('[data-history-delete="'+stamp+'"]').click();
await page.evaluate(()=>{__fixTest.offline(false);return __fixTest.push();});check('Ultimo allenamento eliminato offline viene cancellato anche dal cloud '+width,await page.evaluate(({U,id})=>window.__DATI['users/'+U.uid+'/storico'][id].deleted===true,{U,id:id(stamp)}));
check('Nessun errore JavaScript '+width,errors.length===0);await ctx.close();}
console.log(n+' passate, 0 fallite.');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
