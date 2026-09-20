#!/usr/bin/env node
/* banco-functions-layout.js — il backend sta dove Firebase lo cerca.
 *
 *   node tests/banco-functions-layout.js
 *
 * PERCHE' ESISTE. (17/09/2026.) Fino a oggi il backend stava in radice e
 * `firebase.json` non dichiarava nessuna `functions`: la CLI non sapeva dove
 * guardare, quindi `firebase deploy --only functions:pushNotifica` non poteva
 * funzionare e l'unica strada era uno script che si costruiva una cartella al
 * volo, scaricando un file solo e scrivendo il `package.json` a mano. Due
 * logiche di pubblicazione, e quella vera non era nel repository.
 *
 * Adesso la sorgente canonica e' `functions/index.js`. Questo banco esiste
 * perche' quella struttura non torni indietro per distrazione: sono sette
 * pezzi che devono stare insieme, e se ne manca uno il deploy fallisce — o,
 * peggio, riesce pubblicando il file sbagliato.
 *
 * NON prova che le funzioni FACCIANO la cosa giusta: quello lo fanno
 * banco-push e banco-avvisi. Qui si guarda solo dove stanno le cose.
 */
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var RADICE = path.resolve(__dirname, "..");
var ok = 0, ko = 0;
function prova(n, c, extra){
  if(c){ ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}
function leggi(p){ try{ return fs.readFileSync(path.join(RADICE, p), "utf8"); }catch(e){ return null; } }

/* LE SETTE FUNZIONI, SCRITTE A MANO QUI. Un banco che si fa dettare l'elenco
   dal file che deve controllare non puo' dire di no: se domani una sparisce,
   l'elenco sparirebbe con lei e il banco direbbe di si'. Queste sono quelle
   che `pubblica.sh` pretende da sempre, nello stesso ordine. */
/* L'OTTAVA, dal 20/09/2026: `claimCompagnia`. Mette la compagnia nel token
   come custom claim, perche' una regola di Firestore che chiama `get()` NON
   restringe le query — protegge il `get` e lascia passare l'elenco (misurato
   sull'emulatore). Sull'elenco l'unica cosa che una regola puo' guardare
   senza leggere niente e' il token.
   Il conto resta scritto a mano apposta: un export in piu' e' una funzione
   che viene PUBBLICATA, e deve passare da qui e non da una distrazione. */
var ATTESE = ["sendNotification", "pushNotifica", "avvisaRicerche",
              "avvisaSegnalazione", "avvisaRichiestaClub", "avvisaIscrizione",
              "avvisaPercorso", "claimCompagnia"];

console.log("\n  DOVE FIREBASE VA A CERCARE IL BACKEND");

var fbJson = leggi("firebase.json");
prova("firebase.json c'e' e si legge come JSON", !!fbJson && (function(){
  try{ JSON.parse(fbJson); return true; }catch(e){ return false; }
})());

var fb = null;
try{ fb = JSON.parse(fbJson); }catch(e){}
prova("firebase.json dichiara la sorgente delle functions",
      !!(fb && fb.functions && fb.functions.source),
      fb && fb.functions ? JSON.stringify(fb.functions) : "nessuna sezione functions");
prova("e quella sorgente e' `functions`",
      !!(fb && fb.functions && fb.functions.source === "functions"),
      fb && fb.functions ? String(fb.functions.source) : "");

/* Quello che c'era prima non deve sparire: le regole Firestore e gli
   emulatori stavano gia' qui, e un `firebase.json` riscritto invece che
   allargato e' il modo piu' rapido per perdere una configurazione senza
   accorgersene. */
prova("le regole Firestore sono ancora dichiarate",
      !!(fb && fb.firestore && fb.firestore.rules === "firestore.rules"));
prova("gli emulatori sono ancora dichiarati", !!(fb && fb.emulators));

console.log("\n  LA SORGENTE C'E', ED E' UNA SOLA");

prova("functions/index.js esiste", !!leggi("functions/index.js"));
prova("functions/package.json esiste", !!leggi("functions/package.json"));
/* UNA COPIA SOLA. Due backend che si somigliano divergono in silenzio, e il
   giorno che divergono nessuno sa quale sia stato pubblicato. */
prova("NON esiste un secondo backend in radice",
      !fs.existsSync(path.join(RADICE, "index.js")),
      fs.existsSync(path.join(RADICE, "index.js")) ? "c'e' ancora index.js in radice" : "");

console.log("\n  LE SETTE FUNZIONI, NE' UNA IN PIU' NE' UNA IN MENO");

var src = leggi("functions/index.js") || "";
var trovate = (src.match(/^exports\.[A-Za-z0-9_]+/gm) || [])
  .map(function(x){ return x.replace("exports.", ""); });
prova("gli export sono otto", trovate.length === ATTESE.length, trovate.length + ": " + trovate.join(", "));
ATTESE.forEach(function(nome){
  prova("c'e' " + nome, trovate.indexOf(nome) >= 0);
});
var inPiu = trovate.filter(function(x){ return ATTESE.indexOf(x) < 0; });
prova("nessuna funzione in piu'", inPiu.length === 0, inPiu.join(", "));
/* Nominata a parte perche' e' quella che si pubblica da sola: se un giorno
   cambia nome, il comando scritto nei diari smette di funzionare. */
prova("pushNotifica c'e', ed e' il nome esatto da pubblicare",
      trovate.indexOf("pushNotifica") >= 0);

console.log("\n  IL PACCHETTO DICE COSA SERVE PER PARTIRE");

var pkg = null;
try{ pkg = JSON.parse(leggi("functions/package.json")); }catch(e){}
prova("package.json delle functions si legge", !!pkg);
prova("l'entrypoint punta a index.js", !!(pkg && pkg.main === "index.js"),
      pkg ? String(pkg.main) : "");
prova("il runtime Node e' dichiarato", !!(pkg && pkg.engines && pkg.engines.node),
      pkg && pkg.engines ? JSON.stringify(pkg.engines) : "nessun engines");
/* NODE 22, E NON SI TORNA INDIETRO. (18/09/2026.) Node 20 su Cloud Functions
   e' deprecato dal 30/04/2026 e dal 30/10/2026 non si pubblica piu'. Il
   runtime lo decide `engines.node`: basta che torni «20» per distrazione — un
   package.json copiato da un backup, un merge vecchio — e il deploy dopo
   quella data si ferma. Il lockfile porta lo stesso campo, e i due devono
   dire la stessa cosa. */
var lock = null;
try{ lock = JSON.parse(leggi("functions/package-lock.json")); }catch(e){}
prova("il runtime e' Node 22", !!(pkg && pkg.engines && pkg.engines.node === "22"),
      pkg && pkg.engines ? "engines.node = " + JSON.stringify(pkg.engines.node) : "");
prova("il lockfile dice lo stesso runtime",
      !!(lock && lock.packages && lock.packages[""] && lock.packages[""].engines &&
         lock.packages[""].engines.node === "22"),
      lock && lock.packages && lock.packages[""] ? JSON.stringify(lock.packages[""].engines) : "");
prova("firebase-functions e' dichiarato",
      !!(pkg && pkg.dependencies && pkg.dependencies["firebase-functions"]),
      pkg && pkg.dependencies ? String(pkg.dependencies["firebase-functions"]) : "");
prova("firebase-admin e' dichiarato",
      !!(pkg && pkg.dependencies && pkg.dependencies["firebase-admin"]),
      pkg && pkg.dependencies ? String(pkg.dependencies["firebase-admin"]) : "");
/* Il pacchetto dei banchi ha jsdom e playwright: se finissero qui dentro
   vorrebbe dire che si e' riusato il file sbagliato, e il deploy si
   porterebbe dietro mezzo browser. */
prova("non e' il package.json dei banchi",
      !!(pkg && pkg.dependencies && !pkg.dependencies.jsdom && !pkg.dependencies.playwright));
prova("c'e' il lockfile delle functions", !!leggi("functions/package-lock.json"));

console.log("\n  IL BACKEND SI COMPILA");

var compila = true, errore = "";
try{ execFileSync(process.execPath, ["--check", path.join(RADICE, "functions", "index.js")], { stdio:"pipe" }); }
catch(e){ compila = false; errore = String(e.message || "").split("\n")[0]; }
prova("node --check su functions/index.js", compila, errore);

/* Il progetto a cui si pubblica non si tiene a mente: sta scritto. */
var rc = null;
try{ rc = JSON.parse(leggi(".firebaserc")); }catch(e){}
prova(".firebaserc dichiara il progetto predefinito",
      !!(rc && rc.projects && rc.projects.default),
      rc && rc.projects ? String(rc.projects.default) : "assente");

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
