#!/usr/bin/env node
/* banco-ruoli-compagnia.js — chi vede cosa nello spazio compagnia.
 *
 *   node banco-ruoli-compagnia.js
 *
 * PERCHE ESISTE. (25/08/2026.) L area compagnia ha quattro pubblici — chi
 * passa di li senza account, l arciere collegato, il socio, il referente — e
 * fino a oggi nessun banco guardava la differenza. La separazione fra dato
 * pubblico e amministrazione privata era scritta in una `if` sola, e una `if`
 * sola e esattamente il tipo di cosa che qualcuno sposta senza accorgersene.
 *
 * COSA PROVA: che referente, email, telefono e note del campo NON arrivino a
 * chi non e referente, che il modulo non compaia, e che il referente veda e
 * possa modificare i suoi. E che a chi non ha fatto l accesso non si offra un
 * tasto che non puo funzionare.
 *
 * COSA NON PROVA: le regole Firestore. Questo guarda la schermata; se le
 * regole aprissero il documento a chiunque, questo banco resterebbe verde.
 * Le due domande sono diverse e servono tutte e due.
 *
 * I VALORI STANNO NELLE CASELLE, non nel testo: un <input> porta il valore
 * nell attributo. Chi legge solo `innerText` conclude che il referente non
 * vede i propri dati, e sbaglia. */

/* Chi vede cosa nello SPAZIO COMPAGNIA: quattro ruoli, la stessa schermata.
   Riusa il gancio di banco-compagnia.js, che e' gia' provato. */
var fs=require("fs"),path=require("path"),os=require("os"),url=require("url");
var {chromium}=require("playwright");
var D=path.join(os.tmpdir(),"arctrail-ruoli2"); if(!fs.existsSync(D))fs.mkdirSync(D,{recursive:true});
var NL=String.fromCharCode(10);
var GANCIO = NL + "window.__prova = {" +
  " entra:function(u){ currentUser = { uid:u, email:'io@esempio.it' }; }," +
  " club:function(c){ state.profile = state.profile || {}; state.profile.compagnia = c; }," +
  " referente:function(cod,uid){ compagniaAdminUna[cod] = { adminUid:uid, referente:'Mario Rossi', emailComp:'privata@club.it', tel:'333 1234567', note:'Cancello aperto, chiave sotto il sasso' }; }," +
  " nessunReferente:function(cod){ compagniaAdminUna[cod] = {}; }," +
  " spazio:function(cod){ state.clubSpaceCode = cod; state.screen = 'club-space'; render(); }" +
  "};" + NL;
var src=fs.readFileSync(process.argv[2]||"app.html","utf8");
if(src.indexOf(NL+"initAuthFlow();")<0) throw new Error("aggancio non trovato");
fs.writeFileSync(path.join(D,"app.html"),
  src.replace("var DEV_MODE = false;","var DEV_MODE = true;").replace(NL+"initAuthFlow();", GANCIO+NL+"initAuthFlow();"));
["compagnie-data.js","logo.webp","logo.jpg"].forEach(x=>{var p=path.join(path.dirname(process.argv[2]||"app.html"),x); if(fs.existsSync(p))fs.copyFileSync(p,path.join(D,x));});
var stato={screen:"menu",tab:"home",roundActive:false,pendingArchers:[],lang:"it",country:"it",federation:"fiarc",theme:"light",
 profile:{nomeCognome:"A Z",username:"alez",classe:"SM",arco:"longbow"},profileSkipped:false};
var ok=0,ko=0;
function prova(n,c,extra){ if(c){ok++;console.log("  ✓ "+n);} else {ko++;console.log("  ✗ "+n+(extra?"  — "+extra:""));} }
(async()=>{var b=await chromium.launch();
async function apri(prep){
 var ctx=await b.newContext({viewport:{width:390,height:1200}});
 await ctx.addInitScript("try{localStorage.setItem('arctrail3d_state_v3',"+JSON.stringify(JSON.stringify(stato))+");localStorage.setItem('arctrail3d_welcome_v2','1');}catch(e){}");
 var p=await ctx.newPage();
 await p.goto(url.pathToFileURL(path.join(D,"app.html")).href);
 await p.waitForTimeout(1000);
 await p.evaluate(prep);
 await p.waitForTimeout(800);
 var r=await p.evaluate(()=>{
  var txt=document.getElementById("app").innerText;
  /* I valori dei campi non stanno in `innerText`: un <input> porta il valore
     nell'attributo, non nel testo. Chi si fida di innerText conclude che il
     referente non vede i propri dati — e sarebbe falso. Si guarda tutto: il
     testo a schermo PIU' quello che c'e' dentro le caselle. */
  var dentro=[].slice.call(document.querySelectorAll("#app input, #app textarea"))
    .map(function(e){ return e.value||""; }).join(" | ");
  txt = txt + " | " + dentro;
  return { referente:/Mario Rossi/.test(txt), emailPrivata:/privata@club\.it/.test(txt),
   telefono:/333 1234567/.test(txt), note:/chiave sotto il sasso/.test(txt),
   modificabili:document.querySelectorAll("#app input:not([disabled]), #app textarea").length,
   salva:/Salva/i.test(txt), chiedi:/Chiedi di gestire/i.test(txt),
   inAttesa:/in attesa|da confermare/i.test(txt), testo:txt.replace(/\n+/g," | ").slice(0,110) };});
 await ctx.close(); return r;
}
console.log("\n  VISITATORE (non collegato)");
var v=await apri(()=>{ window.__prova.nessunReferente("01VERB"); window.__prova.spazio("01VERB"); });
prova("non vede il nome del referente", !v.referente);
prova("non vede l'email della compagnia", !v.emailPrivata);
prova("non vede il telefono", !v.telefono);
prova("non vede le note del campo", !v.note);
prova("non ha campi da compilare", v.modificabili === 0, v.modificabili+" campi");
prova("non gli si offre di gestire la compagnia", !v.chiedi);

console.log("\n  ARCIERE SENZA COMPAGNIA");
var a=await apri(()=>{ window.__prova.entra("u1"); window.__prova.nessunReferente("01VERB"); window.__prova.spazio("01VERB"); });
prova("non vede il referente", !a.referente);
prova("non vede l'email ne' il telefono", !a.emailPrivata && !a.telefono);
prova("non vede le note", !a.note);
prova("nessun modulo di amministrazione", a.modificabili === 0, a.modificabili+" campi");
prova("puo' chiedere di diventare referente", a.chiedi);

console.log("\n  SOCIO (compagnia nel profilo, non referente)");
var s2=await apri(()=>{ window.__prova.entra("u1"); window.__prova.club("01VERB"); window.__prova.referente("01VERB","altro-uid"); window.__prova.spazio("01VERB"); });
prova("essere socio non apre l'amministrazione", s2.modificabili === 0, s2.modificabili+" campi");
prova("non vede il referente", !s2.referente);
prova("non vede l'email privata", !s2.emailPrivata);
prova("non vede le note", !s2.note);
prova("nessun tasto Salva", !s2.salva);

console.log("\n  REFERENTE");
var r2=await apri(()=>{ window.__prova.entra("u1"); window.__prova.club("01VERB"); window.__prova.referente("01VERB","u1"); window.__prova.spazio("01VERB"); });
prova("vede e puo' modificare i dati", r2.modificabili > 0, r2.modificabili+" campi");
prova("vede il nome del referente", r2.referente);
prova("vede l'email della compagnia", r2.emailPrivata);
prova("vede le note del campo", r2.note);
prova("ha il tasto per salvare", r2.salva);
prova("non gli si chiede di diventare referente", !r2.chiedi);
console.log("\n  "+ok+" passate, "+ko+" fallite.\n");
await b.close(); process.exit(ko?1:0);})();
