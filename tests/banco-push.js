#!/usr/bin/env node
/* banco-push.js — la push ad app chiusa: cosa parte dal server, e cosa
 * riesce a disegnare il service worker.
 *
 *   node tests/banco-push.js
 *
 * PERCHE' ESISTE. Ad app aperta gli avvisi si vedono, ma NON arrivano da FCM:
 * li disegna l'app leggendo Firestore. Quindi «con l'app aperta funziona» non
 * dice niente sul percorso vero — server → FCM → service worker → notifica →
 * clic — che e' l'unico che conta quando il telefono e' in tasca. Quel
 * percorso non lo guardava nessuno, ed e' esattamente dove il difetto vive.
 *
 * COME. Niente rete e niente Firebase: `index.js` viene caricato coi suoi
 * moduli sostituiti (come fa banco-avvisi.js) e `messaging().send` TIENE
 * l'argomento invece di buttarlo; `sw.js` gira dentro una stanza finta di
 * `vm`, con `self`, `caches`, `clients` e `firebase` costruiti qui. Si prova
 * il FILE VERO: ricopiarne le righe proverebbe la copia.
 *
 * LA DESTINAZIONE NON E' UN `link`, ED E' UNA COSA DA SAPERE PRIMA DI
 * PROVARLA. Questo progetto non manda indirizzi dentro la push: il documento
 * porta `dest` / `apri` / `adId` / `clubCode`, e a tradurli in un posto dove
 * andare e' `destinazioneNotifica()` dentro l'app (app.html). Due di quelle
 * destinazioni dipendono da CHI e' collegato — il pannello vuole l'indirizzo
 * dell'admin, lo spazio compagnia vuole un utente — quindi un indirizzo
 * deciso dal server sarebbe una seconda verita' da tenere allineata, e una
 * porta aperta prima di sapere chi bussa. Il banco percio' NON chiede un
 * `data.link`: chiede che le PAROLE arrivino intere e che i campi di
 * instradamento gia' presenti sul documento non vengano persi per strada.
 *
 * NON tocca l'app, non manda niente a nessuno, non scrive fuori da qui.
 */

var Module = require("module");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var RADICE = path.resolve(__dirname, "..");
var ok = 0, ko = 0;
function prova(n, c, extra){
  if(c){ ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

/* ══ A. COSA MANDA IL SERVER ═══════════════════════════════════════════════ */
var trigger = {};
var inviati = [];
var UTENTE = { fcmToken: "token-finto-123" };

var finto = {
  "firebase-functions/v2/firestore": {
    onDocumentCreated: function(percorso, fn){ trigger[percorso] = fn; return fn; }
  },
  "firebase-functions/v2/https": {
    onCall: function(_o, fn){ return fn; },
    HttpsError: class extends Error { constructor(c, m){ super(m); this.code = c; } }
  },
  "firebase-functions/v2": { setGlobalOptions: function(){} },
  "firebase-admin": {
    initializeApp: function(){},
    messaging: function(){
      return { send: function(msg){ inviati.push(msg); return Promise.resolve("id-finto"); } };
    },
    auth: function(){
      return { getUserByEmail: function(m){ return Promise.resolve({ uid:"admin-uid", email:m }); } };
    },
    firestore: Object.assign(function(){
      return {
        collection: function(){
          return {
            doc: function(){
              return {
                get: function(){
                  return Promise.resolve({
                    exists: !!UTENTE,
                    data: function(){ return UTENTE || {}; },
                    get: function(k){ return UTENTE ? UTENTE[k] : undefined; }
                  });
                },
                update: function(){ return Promise.resolve(); },
                set: function(){ return Promise.resolve(); },
                collection: function(){
                  return { add: function(){ return Promise.resolve(); },
                           doc: function(){ return { set: function(){ return Promise.resolve(); } }; } };
                }
              };
            }
          };
        },
        runTransaction: function(){ return Promise.resolve(); }
      };
    }, { FieldValue: { serverTimestamp: function(){ return "@ora"; },
                       delete: function(){ return "@cancella"; },
                       increment: function(n){ return "@piu" + n; } } })
  }
};

var caricaVero = Module._load;
Module._load = function(richiesto){
  if(Object.prototype.hasOwnProperty.call(finto, richiesto)) return finto[richiesto];
  return caricaVero.apply(this, arguments);
};
require(path.join(RADICE, "functions", "index.js"));
Module._load = caricaVero;

var mandaPush = trigger["notifications/{uid}/items/{itemId}"];

/* ══ B/C. IL SERVICE WORKER IN PROVETTA ════════════════════════════════════ */
function stanzaSW(){
  var testo = fs.readFileSync(path.join(RADICE, "sw.js"), "utf8");
  var disegnate = [], gia = [], aperte = [], ascolt = {}, sfondo = null;

  var stanza = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    importScripts: function(){},
    firebase: {
      initializeApp: function(){},
      messaging: function(){ return { onBackgroundMessage: function(fn){ sfondo = fn; } }; }
    },
    caches: {
      open: function(){ return Promise.resolve({ add: function(){ return Promise.resolve(); },
                                                 put: function(){ return Promise.resolve(); },
                                                 match: function(){ return Promise.resolve(null); } }); },
      keys: function(){ return Promise.resolve([]); },
      delete: function(){ return Promise.resolve(true); },
      match: function(){ return Promise.resolve(null); }
    },
    fetch: function(){ return Promise.resolve({ status:200, clone: function(){ return this; } }); },
    Request: function(u, o){ this.url = u; this.opzioni = o; },
    /* `clients` serve a due padroni: `activate` chiama `self.clients.claim()`,
       e `notificationclick` chiama `clients.matchAll()` senza `self`. E' lo
       stesso oggetto, quindi porta tutte e tre le cose: separarli vuol dire
       che uno dei due arriva a mani vuote. */
    clients: {
      matchAll: function(){ return Promise.resolve([]); },
      openWindow: function(u){ aperte.push(u); return Promise.resolve({}); },
      claim: function(){ return Promise.resolve(); }
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, URL: URL
  };
  stanza.self = stanza;
  stanza.self.addEventListener = function(nome, fn){ ascolt[nome] = fn; };
  stanza.self.skipWaiting = function(){ return Promise.resolve(); };
  stanza.self.registration = {
    showNotification: function(titolo, opzioni){
      disegnate.push({ titolo:titolo, opzioni:opzioni || {} });
      gia.push({ tag:(opzioni||{}).tag, title:titolo, body:(opzioni||{}).body });
      return Promise.resolve();
    },
    getNotifications: function(){ return Promise.resolve(gia.slice()); }
  };

  vm.createContext(stanza);
  vm.runInContext(testo, stanza, { filename:"sw.js" });

  return {
    sfondo: function(){ return sfondo; },
    click: function(){ return ascolt["notificationclick"]; },
    disegnate: function(){ return disegnate; },
    aperte: function(){ return aperte; },
    azzera: function(){ disegnate = []; gia = []; aperte = []; }
  };
}

/* Un avviso come quelli veri: le funzioni scrivono `apri` per dire dove porta
   il tocco (vedi `avvisaSegnalazione`, che scrive `apri:"marketplace"`). */
var AVVISO = {
  title: "Annuncio segnalato",
  body: "«Ricurvo Hoyt Satori» — foto non corrispondenti",
  apri: "marketplace",
  adId: "ad-42",
  read: false
};

(async function(){
  console.log("\n  A. COSA MANDA IL SERVER");
  prova("pushNotifica e' agganciata a notifications/{uid}/items/{itemId}", !!mandaPush);
  var m = {};
  if(mandaPush){
    inviati = [];
    await mandaPush({ data:{ data:function(){ return AVVISO; } },
                      params:{ uid:"u-destinatario", itemId:"avviso-7" } });
    m = inviati[0] || {};
    prova("parte una push sola", inviati.length === 1, inviati.length + " inviate");
    prova("va al token del destinatario", m.token === "token-finto-123");
    prova("il blocco notification porta titolo e corpo",
          !!(m.notification && m.notification.title === AVVISO.title && m.notification.body === AVVISO.body));
    prova("data porta l'etichetta dell'avviso", !!(m.data && m.data.tag === "avviso-7"));
    /* IL DIFETTO PRINCIPALE. `sw.js` legge `d.title || n.title` e
       `d.body || n.body`, col commento «i dati arrivano interi, notification
       arriva scremato». Ma in `data` il server mette SOLO il tag: dove l'SDK
       non disegna da se', il telefono riceve un avviso senza parole. */
    prova("data porta ANCHE il titolo (sw.js legge d.title)", !!(m.data && m.data.title),
          JSON.stringify(m.data));
    prova("data porta ANCHE il corpo (sw.js legge d.body)", !!(m.data && m.data.body),
          JSON.stringify(m.data));
    /* L'INSTRADAMENTO CHE IL DOCUMENTO HA GIA'. Non un indirizzo nuovo: i
       campi che `destinazioneNotifica()` sa gia' leggere. Senza, il tocco
       arriva all'app e l'app non sa piu' di cosa si parlava. */
    prova("data non perde l'instradamento gia' scritto sull'avviso (apri)",
          !!(m.data && m.data.apri === "marketplace"), JSON.stringify(m.data));
  }

  console.log("\n  B. COSA RIESCE A DISEGNARE IL SERVICE WORKER");
  var sw = stanzaSW();
  prova("sw.js registra onBackgroundMessage", !!sw.sfondo());
  prova("sw.js ascolta il clic sulla notifica", !!sw.click());

  if(sw.sfondo()){
    // B1 — solo notification (come arriva quando l'SDK non screma niente)
    sw.azzera();
    await sw.sfondo()({ notification:{ title:AVVISO.title, body:AVVISO.body }, data:{ tag:"a1" } });
    var d1 = sw.disegnate()[0] || {};
    prova("solo notification: disegna il titolo vero", d1.titolo === AVVISO.title,
          "titolo: " + d1.titolo);
    prova("solo notification: il corpo non e' vuoto", !!(d1.opzioni && d1.opzioni.body));

    // B2 — solo data (il caso in cui `notification` arriva scremato o assente)
    sw.azzera();
    await sw.sfondo()({ data:{ tag:"a2", title:AVVISO.title, body:AVVISO.body } });
    var d2 = sw.disegnate()[0] || {};
    prova("solo data: disegna il titolo vero", d2.titolo === AVVISO.title, "titolo: " + d2.titolo);
    prova("solo data: il corpo non e' vuoto", !!(d2.opzioni && d2.opzioni.body));

    // B3 — il payload VERO del server, quello misurato in A
    sw.azzera();
    await sw.sfondo()({ data: m.data || {} });
    var d3 = sw.disegnate()[0] || {};
    prova("col payload vero del server disegna una notifica sola", sw.disegnate().length === 1,
          sw.disegnate().length + " disegnate");
    prova("col payload vero il titolo non e' il ripiego «ArcTrail 3D»",
          d3.titolo === AVVISO.title, "titolo: " + d3.titolo);
    prova("col payload vero il corpo non e' vuoto",
          !!(d3.opzioni && d3.opzioni.body), "corpo: «" + ((d3.opzioni||{}).body || "") + "»");
    prova("col payload vero l'etichetta resta quella dell'avviso",
          !!(d3.opzioni && d3.opzioni.tag === "avviso-7"), "tag: " + ((d3.opzioni||{}).tag || ""));

    // B4 — il clic: quando la notifica porta una destinazione, ci si va
    if(sw.click()){
      sw.azzera();
      var chiuso = false, atteso = [];
      sw.click()({
        notification: { data:{ link:"/app.html" }, close:function(){ chiuso = true; } },
        waitUntil: function(p){ atteso.push(p); }
      });
      await Promise.all(atteso);
      prova("il clic chiude l'avviso", chiuso === true);
      prova("il clic apre la destinazione della notifica",
            sw.aperte().indexOf("/app.html") >= 0, JSON.stringify(sw.aperte()));
    }

    console.log("\n  C. LA DEDUPLICA");
    // C1 — lo stesso avviso due volte: una sola notifica. Deve restare cosi'.
    sw.azzera();
    await sw.sfondo()({ data:{ tag:"stesso", title:"Uguale", body:"Uguale" } });
    await sw.sfondo()({ data:{ tag:"stesso", title:"Uguale", body:"Uguale" } });
    prova("lo stesso avviso due volte resta una notifica sola", sw.disegnate().length === 1,
          sw.disegnate().length + " disegnate");

    // C2 — due avvisi DIVERSI che per caso si somigliano: devono restare due.
    //      Il tag e' l'id del documento: e' quello che distingue due eventi.
    sw.azzera();
    await sw.sfondo()({ data:{ tag:"avviso-10", title:"Nuovo messaggio", body:"Hai un messaggio" } });
    await sw.sfondo()({ data:{ tag:"avviso-11", title:"Nuovo messaggio", body:"Hai un messaggio" } });
    prova("due avvisi diversi con lo stesso testo restano due",
          sw.disegnate().length === 2, sw.disegnate().length + " disegnate");
  }

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e && e.message); process.exit(1); });
