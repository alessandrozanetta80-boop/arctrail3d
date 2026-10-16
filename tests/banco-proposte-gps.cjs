const fs=require('fs'),path=require('path'),assert=require('assert'),{chromium}=require('playwright'),F=require('./firebase-finto');
const root=path.resolve(__dirname,'..'),code='01VERB';
const users={arciere:{uid:'arciere',email:'arciere@example.test'},referente:{uid:'referente',email:'referente@example.test'}};
const html=F.copiaProduzione(fs.readFileSync(root+'/app.html','utf8'),{gancio:'window.__proposte={apri:function(){state.campoSegnala={codice:"01VERB",torna:"campi"};campoApriVista="mappa";state.screen="campo-mappa";save();render();}};'});
let n=0;function ok(s,v){assert(v,s);n++;console.log('  ✓ '+s);}
async function apri(browser,width,user,dati){const ctx=await browser.newContext({viewport:{width,height:860},isMobile:true,hasTouch:true,locale:'it-IT'});
await ctx.addInitScript(F.scriptIniziale({utente:user,dati}));await ctx.addInitScript(u=>{localStorage.setItem('arctrail3d_state_v3',JSON.stringify({screen:'menu',tab:'home',lang:'it',country:'it',federation:'fiarc',theme:'light',profile:{nomeCognome:'Arciere',username:'arciere',email:u.email,federazioni:[{code:'fiarc',tessera:'FI111'}]},profileSkipped:false,pendingArchers:[]}));localStorage.setItem('arctrail3d_welcome_v2','1');localStorage.setItem('arctrail3d_proprietario_v1',u.uid);},user);
await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='proposte.test')return route.abort();if(u.pathname==='/app.html')return route.fulfill({contentType:'text/html',body:html});const p=path.resolve(root,'.'+u.pathname);if(!p.startsWith(root+path.sep)||!fs.existsSync(p))return route.abort();return route.fulfill({path:p});});
const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://proposte.test/app.html');await page.waitForFunction(()=>window.__proposte);await page.waitForTimeout(500);await page.evaluate(()=>__proposte.apri());await page.waitForFunction(()=>window.CampoMappaUI&&CampoMappaUI._stato.caricatoCode==='01VERB'&&document.querySelector('[data-campo-nome-nuovo]'));await page.waitForTimeout(400);return{ctx,page,errors};}
const datiBase=()=>({users:Object.fromEntries(Object.values(users).map(u=>[u.uid,{...u,approved:true,nomeCognome:u.uid,username:u.uid,federazioni:[{code:'fiarc',tessera:'FI111'}],privacy:true,terms:true}])),compagnie_admin:{[code]:{adminUid:'referente'}},compagnie_contatto:{},field_routes:{r1:{id:'r1',companyCode:code,name:'Verde',createdBy:'arciere',status:'draft',pointCount:2,lengthM:20,piazzole:[{n:1,lat:45,lon:8}]},privata:{id:'privata',companyCode:code,name:'Bozza altrui',createdBy:'altro',status:'draft'}}});
(async()=>{const b=await chromium.launch();try{for(const width of[320,384]){const a=await apri(b,width,users.arciere,datiBase());const p=a.page;
ok('Arciere può avviare registrazione '+width,await p.getByRole('button',{name:'Registra percorso',exact:true}).count()===1);
ok('Vede propria bozza, non quella altrui '+width,(await p.locator('#app').innerText()).includes('Verde')&&!(await p.locator('#app').innerText()).includes('Bozza altrui'));
ok('Arciere non ha Pubblica '+width,await p.getByRole('button',{name:'Pubblica',exact:true}).count()===0);
await p.getByRole('button',{name:'Invia al responsabile',exact:true}).click();await p.waitForFunction(()=>__DATI.field_routes.r1.status==='pending');await p.waitForTimeout(350);
ok('Proposta salvata in attesa di approvazione '+width,(await p.locator('#app').innerText()).includes('In approvazione'));
ok('Invio non pubblica il percorso '+width,await p.evaluate(()=>__DATI.field_routes.r1.status!=='published'));
ok('Schermo mobile senza overflow '+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
fs.mkdirSync(root+'/UI_REVIEW/PROPOSTE_GPS',{recursive:true});await p.screenshot({path:root+'/UI_REVIEW/PROPOSTE_GPS/arciere-'+width+'.png',fullPage:true});
const dati=await p.evaluate(()=>__DATI);ok('Arciere senza errori JS '+width,!a.errors.length);await a.ctx.close();
const c=await apri(b,width,users.referente,dati);ok('Responsabile non vede bozze altrui non inviate '+width,!(await c.page.locator('#app').innerText()).includes('Bozza altrui'));
ok('Responsabile vede Approva e pubblica '+width,await c.page.getByRole('button',{name:'Approva e pubblica',exact:true}).count()===1);
await c.page.screenshot({path:root+'/UI_REVIEW/PROPOSTE_GPS/referente-'+width+'.png',fullPage:true});await c.page.getByRole('button',{name:'Approva e pubblica',exact:true}).click();await c.page.waitForFunction(()=>__DATI.field_routes.r1.status==='published');
ok('Solo dopo approvazione entra tra i pubblicati '+width,await c.page.evaluate(()=>__DATI.field_routes.r1.status==='published'&&__DATI.field_routes.r1.publishedBy==='referente'));ok('Responsabile senza errori JS '+width,!c.errors.length);await c.ctx.close();}
console.log(n+' passate, 0 fallite.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
