const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const {chromium}=require('playwright');
const {pathToFileURL}=require('url');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arc-home-ux-'));
const out=path.resolve('UI_REVIEW/HOME_20261030');fs.mkdirSync(out,{recursive:true});
const baseline=process.env.UX_BASELINE==='1';
let src=baseline?require('child_process').execFileSync('git',['show','HEAD:app.html'],{encoding:'utf8',maxBuffer:10*1024*1024}):fs.readFileSync('app.html','utf8');
src=require('./copia-dev').accendiDev(src);
fs.writeFileSync(path.join(dir,'app.html'),src);
for(const f of ['compagnie-data.js','logo.webp','logo.jpg','icon-192.png','sentiero.svg'])if(fs.existsSync(f))fs.copyFileSync(f,path.join(dir,f));
const history=[24,12,12].map((n,i)=>({date:new Date(Date.now()-(i+1)*86400000).toISOString(),format:n,modeKey:'training',modeLabel:'Allenamento',campo:'Campo di prova',arrowsPerTarget:1,results:[{name:'Arciere demo',isSelf:true,total:[240,220,200][i],perTarget:Array(n).fill(10),arrows:[]}]}));
const seed={screen:'menu',tab:'home',lang:'it',country:'it',federation:'fiarc',theme:'light',profile:{nomeCognome:'Arciere demo',username:'Arciere demo'},profileSkipped:false,pendingArchers:[]};
(async()=>{const browser=await chromium.launch();try{
for(const width of [320,384,1280]){
const ctx=await browser.newContext({viewport:{width,height:900}});
await ctx.addInitScript(({seed,history})=>{localStorage.setItem('arctrail3d_state_v3',JSON.stringify(seed));localStorage.setItem('arctrail3d_storico_v1',JSON.stringify(history));localStorage.setItem('arctrail3d_welcome_v2','1');},{seed,history});
const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.join(dir,'app.html')).href);await page.waitForTimeout(900);
await page.screenshot({path:path.join(out,`${baseline?'prima':'dopo'}-${width}.png`),fullPage:true});
if(!baseline){
assert.deepEqual(await page.locator('.home-training-counts b').allTextContents(),['3','48']);
assert.equal(await page.locator('.home-mese-barra').count(),0,'scores collapsed by default');
assert((await page.locator('.home-training-last').innerText()).includes('240'));
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.home-mese-apri').click();
assert.deepEqual(await page.locator('.home-mese-barra .hm-voce b').allTextContents(),['210','2','220','24']);
await page.screenshot({path:path.join(out,`dettagli-${width}.png`),fullPage:true});
await page.locator('.home-training-history').click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arctrail3d_state_v3')).journalTab),'rounds');
assert.equal(await page.evaluate(()=>localStorage.getItem('arctrail3d_storico_v1')),JSON.stringify(history));
assert.deepEqual(errors,[]);
}
await ctx.close();console.log('OK Home '+width);
}
}finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
