/* Real browser, isolated DEV_MODE fixtures: no production writes. */
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arctrail-ux-'));
const out=path.resolve('UI_REVIEW/RIPRISTINO_20261030');
fs.mkdirSync(out,{recursive:true});
let src=require('./copia-dev').accendiDev(process.env.UX_BASELINE ? require('child_process').execFileSync('git',['show','HEAD:app.html'],{encoding:'utf8',maxBuffer:10*1024*1024}) : fs.readFileSync('app.html','utf8'));
src=src.replace('var BUILD_STAMP = ', 'window.__ux={ctx:contestoDi,set:function(v){Object.assign(state,v);homeOverride=false;render();}};\nvar BUILD_STAMP = ');
fs.writeFileSync(path.join(dir,'app.html'),src);
for(const f of ['compagnie-data.js','logo.webp','logo.jpg','icon-192.png','sentiero.svg'])if(fs.existsSync(f))fs.copyFileSync(f,path.join(dir,f));
const archers=[{id:'a1',name:'Ale_01Verb',isSelf:true},{id:'a2',name:'TEST UX Ospite'}];
const seed={screen:'round',tab:'tira',roundActive:true,mode:'training',format:14,archers,archersBase:archers,
 rotBaseTarget:1,scores:{a1:[],a2:[]},target:1,archerIndex:0,arrowIndex:0,pendingArrows:[],liveBattutaTypes:{},
 awaitingStep:null,savedToHistory:false,roundEntryDate:null,firme:{},consegna:null,sessionId:null,campo:'01VERB — Campo di prova',
 lang:'it',country:'it',federation:'fiarc',theme:'light',pendingArchers:archers,arrowsPerTargetOverride:3,
 profile:{nomeCognome:'Alessandro',username:'Ale_01Verb',compagnia:'01VERB'},profileSkipped:false};
(async()=>{const browser=await chromium.launch();try{
for(const width of [320,384,1280]){
 const ctx=await browser.newContext({viewport:{width,height:832}});
 await ctx.addInitScript(s=>{if(!localStorage.getItem('arctrail3d_state_v3'))localStorage.setItem('arctrail3d_state_v3',JSON.stringify(s));localStorage.setItem('arctrail3d_welcome_v2','1');},seed);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(dir,'app.html')).href);
 await page.waitForTimeout(600);
 await page.evaluate(s=>window.__ux.set(s),seed);
 await page.waitForTimeout(600);
 await page.locator('.quick-btn').first().waitFor();
 const before=await page.locator('.quick-btn').first().boundingBox();
 await page.screenshot({path:path.join(out,`${process.env.UX_BASELINE?'prima':'dopo'}-giro-${width}.png`),fullPage:true});
 await page.locator('.quick-btn').first().click();
 await page.waitForTimeout(600);
 const after=await page.locator('.quick-btn').first().boundingBox();
 if(!process.env.UX_BASELINE)assert(Math.abs(before.y-after.y)<2,`keypad must not move after first arrow: ${before.y} -> ${after.y}`);
 await page.screenshot({path:path.join(out,`${process.env.UX_BASELINE?'prima':'dopo'}-freccia-${width}.png`),fullPage:true});
 await page.locator('.striscia-annulla button').click();
 assert((await page.locator('.pista-freccia').innerText()).includes('1'),'undo restores first arrow');
 await page.waitForTimeout(200);
 await page.locator('.quick-btn').first().click();
 await page.reload();await page.waitForTimeout(700);
 if(await page.locator('.home-riprendi').count())await page.locator('.home-riprendi').click();
 await page.waitForTimeout(600);
 assert((await page.locator('.pista-freccia').innerText()).includes('2 di 3'),'saved arrow survives reload and resume');
 await page.locator('.btn-standings').click();assert(await page.locator('.pannello').count());
 await page.waitForTimeout(600);
 await page.screenshot({path:path.join(out,`${process.env.UX_BASELINE?'prima-':''}classifica-${width}.png`),fullPage:true});
 await page.evaluate(s=>window.__ux.set({...s,screen:'training-setup',roundActive:false}),seed);
 await page.waitForTimeout(600);
 await page.screenshot({path:path.join(out,`${process.env.UX_BASELINE?'prima-':''}configurazione-${width}.png`),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 await page.evaluate(s=>window.__ux.set({...s,panel:null}),seed);
 await page.waitForTimeout(600);
 await page.evaluate(()=>document.documentElement.style.fontSize='150%');
 await page.screenshot({path:path.join(out,`${process.env.UX_BASELINE?'prima-':''}testo150-${width}.png`),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'150% no horizontal overflow');
 assert.deepEqual(errors,[]);console.log(`PASS ${width}: real render, scoring/undo, classifica, setup, text150`);
 await ctx.close();
}
}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
