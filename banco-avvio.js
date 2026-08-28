#!/usr/bin/env node
/* banco-avvio.js — i primi due secondi, prima che Firebase risponda.
 *
 *   node banco-avvio.js
 *
 * PERCHE' ESISTE. Il 20/08/2026 «sembra che il sito si carichi due volte» si
 * e' rivelato due cose diverse: il tema applicato DOPO la prima pennellata, e
 * #app vuoto finche' la rete non rispondeva. Le due cure sono piccole —
 * un copione di dieci righe in cima al <body> e un render() prima di
 * initAuthFlow() — e sono **esattamente il genere di riga che sparisce senza
 * rompere niente**: l'app continua a funzionare, torna solo a lampeggiare, e
 * nessuno se ne accorge per settimane.
 *
 * Un banco serve dove il difetto non grida. Qui non grida.
 */
var fs = require("fs");
var { JSDOM } = require("jsdom");

var src = fs.readFileSync("app.html", "utf8");
var ok = 0, ko = 0;
function prova(nome, cond){ if(cond){ ok++; console.log("  \u2713 " + nome); } else { ko++; console.log("  \u2717 " + nome); } }

/* ── Il copione del tema: c'e', e sta nel posto giusto ─────────────────── */
console.log("\n  IL TEMA ARRIVA PRIMA DELLA PRIMA PENNELLATA");

var iniBody = src.indexOf("<body>");
var iniApp  = src.indexOf('<div id="app"></div>');
var m = src.slice(iniBody, iniApp).match(/<script>\s*([\s\S]*?)<\/script>/);
prova("il copione del tema c'e', fra <body> e #app", !!m);
if(!m){ console.log("\n  0 passate, 1 fallita.\n"); process.exit(1); }
var copione = m[1];

/* Sta prima del copione grosso? Quello parte a DOMContentLoaded: se il nostro
   finisse dopo, girerebbe alla stessa ora e non servirebbe a niente. */
prova("sta prima del copione che parte a DOMContentLoaded",
      src.indexOf(copione) < src.indexOf('document.addEventListener("DOMContentLoaded"'));

/* ── La chiave e' scritta due volte: che combacino non e' memoria ─────── */
console.log("\n  LE DUE CHIAVI COMBACIANO");
var kCopione = (copione.match(/localStorage\.getItem\("([^"]+)"\)/) || [])[1];
var kGrosso  = (src.match(/var STORAGE_KEY\s*=\s*"([^"]+)"/) || [])[1];
prova("il copione legge una chiave", !!kCopione);
prova("il copione grosso dichiara STORAGE_KEY", !!kGrosso);
prova("sono la stessa chiave (" + kCopione + ")", !!kCopione && kCopione === kGrosso);

/* ── E la stessa migrazione dei temi morti ─────────────────────────────── */
console.log("\n  LA MIGRAZIONE E' LA STESSA DI normalizeTheme()");
var norm = (src.match(/function normalizeTheme\(th\)\{\n([\s\S]*?)\n\}/) || [])[1] || "";
var mortiNorm = (norm.match(/"[a-z]+"/g) || []).filter(function(x){
  return ["\"light\"","\"dark\"","\"sole\""].indexOf(x) < 0;
});
var mortiCop = (copione.match(/th === "([a-z]+)"/g) || []).map(function(x){ return x.replace(/th === /, ""); })
  .filter(function(x){ return ["\"light\"","\"dark\"","\"sole\""].indexOf(x) < 0; });
prova("normalizeTheme conosce dei temi morti (" + mortiNorm.join(", ") + ")", mortiNorm.length > 0);
mortiNorm.forEach(function(t){
  prova("anche il copione conosce " + t, mortiCop.indexOf(t) >= 0);
});

/* ── E adesso lo si fa girare davvero ─────────────────────────────────── */
console.log("\n  GIRA, E METTE LA CLASSE GIUSTA");
function conTema(salvato){
  var dom = new JSDOM("<!doctype html><body></body>", { url: "https://arctrail3d.com/" });
  if(salvato !== null) dom.window.localStorage.setItem(kCopione, JSON.stringify(salvato));
  var f = new dom.window.Function("localStorage", "document", copione);
  f(dom.window.localStorage, dom.window.document);
  return dom.window.document.body.className.trim();
}
prova("scuro salvato \u2192 theme-dark",        conTema({ theme:"dark" })  === "theme-dark");
prova("sole salvato \u2192 theme-sole",         conTema({ theme:"sole" })  === "theme-sole");
prova("chiaro salvato \u2192 theme-light",      conTema({ theme:"light" }) === "theme-light");
prova("tema morto \u00abelegante\u00bb \u2192 theme-dark", conTema({ theme:"elegante" }) === "theme-dark");
prova("prima visita, niente salvato \u2192 theme-light", conTema(null) === "theme-light");
prova("nessun tema nello stato \u2192 theme-light", conTema({ screen:"menu" }) === "theme-light");

/* Il caso che conta piu' di tutti: il salvataggio rotto. Un JSON illeggibile
   non deve lasciare la pagina senza tema — sarebbe il lampo di prima, ma solo
   per chi ha gia' un guaio. */
console.log("\n  UN SALVATAGGIO ROTTO NON LASCIA LA PAGINA SENZA TEMA");
var dom = new JSDOM("<!doctype html><body></body>", { url: "https://arctrail3d.com/" });
dom.window.localStorage.setItem(kCopione, "{questo non e' JSON");
new dom.window.Function("localStorage", "document", copione)(dom.window.localStorage, dom.window.document);
prova("JSON illeggibile \u2192 theme-light lo stesso", dom.window.document.body.className.trim() === "theme-light");

/* ── Si disegna prima di chiedere a Firebase chi sei ───────────────────── */
console.log("\n  SI DISEGNA SUBITO, POI SI CHIEDE CHI SEI");
var iRender = src.lastIndexOf("\nrender();\ninitAuthFlow();");
prova("render() sta subito prima di initAuthFlow()", iRender > 0);
prova("initAuthFlow() e' chiamato una volta sola",
      (src.match(/^initAuthFlow\(\);$/gm) || []).length === 1);
prova("authState parte da \"loading\", cioe' c'e' qualcosa da disegnare",
      /var authState = DEV_MODE \? "ready" : \(firebaseReady \? "loading"/.test(src));
prova("paintScreen disegna loadingScreen quando authState e' loading",
      /if\(authState === "loading"\)\{ app\.appendChild\(loadingScreen\(\)\); return; \}/.test(src));
/* Chi apre l'app la prima volta non deve passare dall'attesa: senza lingua si
   va dritti al primo passo, e quel controllo deve stare PRIMA. */
prova("chi non ha ancora la lingua salta l'attesa e va al primo passo",
      src.indexOf('if(!state.lang){ app.appendChild(setupScreen()); return; }')
      < src.indexOf('if(authState === "loading"){ app.appendChild(loadingScreen()); return; }'));

/* LA RICARICA CHE NON DEVE PARTIRE. (22/08/2026.)
   Queste tre prove guardano una cosa che, se sparisce, non rompe niente:
   l'app continua a funzionare e si limita a caricarsi due volte all'avvio.
   E' esattamente il tipo di difetto che torna, perche' chi legge il codice
   vede un `reload()` dentro un ascoltatore e gli sembra giusto. */
console.log("\n  ALL'AVVIO NON SI RICARICA PER NIENTE");
prova("si guarda se un controllore c'era GIA'",
      /var avevaControllore = !!navigator\.serviceWorker\.controller;/.test(src));
/* Va letto fuori dall'ascoltatore: dentro, `controller` e' gia' quello nuovo
   e la risposta sarebbe sempre si'. La riga giusta e' quella sbagliata di
   pochi caratteri. */
prova("e lo si legge PRIMA dell'ascoltatore, non dentro",
      src.indexOf("var avevaControllore") > 0 &&
      src.indexOf("var avevaControllore") < src.indexOf("addEventListener('controllerchange'"));
prova("senza controllore di prima non si ricarica",
      /addEventListener\('controllerchange', function\(\)\{\nif\(!avevaControllore\) return;/.test(src));

/* IL SECONDO RICARICATORE, QUELLO CHE PER DUE VOLTE NON HA GUARDATO NESSUNO.
   (23/08/2026.)
   Il 22/08 e' stato sistemato il service worker, e la cura era giusta. Il
   refresh all'apertura si vedeva lo stesso, perche' veniva da un'altra riga:
   il rientro dopo venti minuti di pausa. Su un telefono una PWA non si chiude,
   si sospende — quindi «riaprire l'app» faceva scattare quella riga quasi
   sempre.
   Le tre prove qui sotto guardano un'ASSENZA, ed e' il genere di cosa che
   torna: chi legge quel blocco vede «rientro dopo una lunga pausa» e un
   `reload()` gli sembra la cosa naturale da scrivere. */
console.log("\n  RIENTRANDO DOPO UNA PAUSA NON SI RICARICA LA PAGINA");
var rientro = src.slice(src.indexOf('document.addEventListener("visibilitychange"'));
/* Il taglio NON puo' fermarsi al primo `});`: dentro il blocco c'e' un
   `.catch(function(){});` che arriva prima della fine. Ci si ferma alla prima
   riga che e' `});` da sola — quella e' la chiusura vera. Alla prima passata
   il banco ha detto no per questo, e l'app non c'entrava niente. */
rientro = rientro.slice(0, rientro.indexOf("\n});") + 4);
prova("il blocco del rientro esiste ancora",
      rientro.length > 0 && rientro.indexOf("appHiddenAt") > 0);
prova("e NON contiene un reload della pagina",
      rientro.indexOf("location.reload") === -1);
/* Il motivo buono resta: ridisegnare coi dati freschi. Se sparisse anche
   questo, il rientro non farebbe piu' niente e la riga varrebbe zero. */
prova("ridisegna, cosi' i dati sono freschi lo stesso",
      /render\(\);/.test(rientro));
/* E la richiesta di aggiornamento va tenuta: e' quella che, SE c'e' una
   versione nuova, fa scattare `controllerchange` — cioe' l'unica ricarica
   che ha un motivo. Toglierla lascerebbe l'app ferma alla versione vecchia
   finche' qualcuno non la chiude davvero. */
prova("ma l'aggiornamento lo chiede ancora",
      /reg\.update\(\)/.test(rientro));

/* IL TASTO DI RITORNO DICE DOVE PORTA. (23/08/2026.)
   Portava al menu della scheda corrente mostrando una casetta — quindi dal
   profilo diceva «Home» e apriva il profilo. Adesso l'icona e la parola
   seguono la scheda, tramite la mappa `CASA_DI`.
   Le prove guardano che la mappa COPRA TUTTE le schede: se una manca, non si
   rompe niente — si torna a vedere la casetta, cioe' esattamente il difetto
   di prima, di nuovo in silenzio. */
console.log("\n  IL TASTO DI RITORNO SEGUE LA SCHEDA");
var mappa = src.slice(src.indexOf("var CASA_DI = {"));
mappa = mappa.slice(0, mappa.indexOf("};") + 2);
prova("la mappa delle schede c'e'", mappa.length > 20);
["home","campi","tira","market","profilo","compagnie","attivita"].forEach(function(k){
  prova("la scheda \"" + k + "\" ha la sua icona e la sua parola",
        new RegExp("\\b" + k + "\\s*:\\s*\\[").test(mappa));
});
/* Il segno pieno, non il glifo di linea: e' quello che la barra in fondo usa
   per la stessa porta, e due segni per la stessa porta insegnano che il segno
   non conta. */
prova("usa il segno pieno della barra, non un glifo di ripiego",
      /id:"menu", pieno:doveTorna\[0\]/.test(src));
/* La parola viene dal dizionario: scritta a mano resterebbe italiana per
   otto lingue su nove. */
prova("la parola viene dal dizionario, non e' scritta a mano",
      /t\(doveTorna\[1\]\)/.test(src));

/* ── LA CONFERMA DELL'EMAIL VALE PER TUTTI ─────────────────────────────────
   (28/08/2026.) Nessun banco vedeva questa funzione: `banco-lingue.js`
   controlla che sia AGGANCIATA al flusso e che le parole della schermata
   esistano in nove lingue, ma non cosa RISPONDE. Il 28/08 le e' stata tolta
   l'eccezione per chi si era iscritto prima del 14/08, e la modifica sarebbe
   passata sotto a tutti e ventisei i banchi.

   Non e' una riga qualsiasi: da quando le regole di Firestore chiedono
   `email_verified`, se questa funzione tornasse di nuovo `false` per qualcuno
   che non ha confermato, quella persona **non vedrebbe la schermata** e
   troverebbe `permission-denied` senza sapere perche'. Il telefono e il
   database risponderebbero due cose diverse alla stessa domanda, ed e'
   esattamente il difetto che la modifica del 28/08 e' andata a togliere.

   La funzione si esegue davvero, non si legge con una regex: una regex
   direbbe di si' anche a un `return created >= EMAIL_VERIFY_SINCE` rimesso
   sotto un altro nome. */
console.log("\n  LA CONFERMA DELL'EMAIL NON HA PIU' ECCEZIONI");

var fn = src.slice(src.indexOf("function needsEmailVerification(user){"));
fn = fn.slice(0, fn.indexOf("\n}\n") + 3);
prova("la funzione c'e' e finisce dove ci si aspetta", /^function needsEmailVerification/.test(fn) && fn.length < 800);

var chiede;
try { chiede = new Function(fn + "\nreturn needsEmailVerification;")(); }
catch(e){ chiede = null; }
prova("si riesce a eseguirla da sola", typeof chiede === "function");

function tale(verificata, provider, nato){
  return { emailVerified: verificata,
           providerData: [{ providerId: provider }],
           metadata: { creationTime: nato } };
}
var VECCHIO = "Mon, 01 Aug 2026 10:00:00 GMT";   // prima del 14/08
var NUOVO   = "Thu, 20 Aug 2026 10:00:00 GMT";   // dopo

if(typeof chiede === "function"){
  prova("chi non ha confermato e si e' iscritto DOPO il 14/08 la vede",
        chiede(tale(false, "password", NUOVO)) === true);
  /* Questa e' la riga del 28/08, ed e' l'unica che era falsa prima. */
  prova("chi non ha confermato e si e' iscritto PRIMA del 14/08 la vede lo stesso",
        chiede(tale(false, "password", VECCHIO)) === true);
  prova("chi non ha confermato e non ha data di nascita la vede",
        chiede(tale(false, "password", undefined)) === true);
  prova("chi HA confermato non la vede",
        chiede(tale(true, "password", VECCHIO)) === false);
  /* Google e Apple hanno gia' verificato l'indirizzo: chiedere una seconda
     conferma sarebbe una porta chiusa senza chiave, perche' Firebase non
     manda l'email di verifica a chi non ha una password. */
  prova("chi entra con Google non la vede",
        chiede(tale(false, "google.com", VECCHIO)) === false);
  prova("chi entra con Apple non la vede",
        chiede(tale(false, "apple.com", NUOVO)) === false);
  prova("senza utente non la vede", chiede(null) === false);
  /* La costante ritirata non deve tornare a decidere: se qualcuno rimette il
     confronto sulla data, questa prova cade prima delle altre. */
  prova("non guarda piu' la data di iscrizione", fn.indexOf("EMAIL_VERIFY_SINCE") < 0);
}

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
