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
 * DAL 19/09/2026 (audit N1-N8) IL CONTRATTO E' CAMBIATO, e il banco con lui:
 *   - un token PER DISPOSITIVO (`fcmTokens`), piu' il vecchio `fcmToken`;
 *   - messaggio SOLO `data` (niente blocco notification: disegna sempre sw.js);
 *   - `data.link` = /app.html?n=<id>: il tocco apre QUELLA notifica nell'app,
 *     che poi la instrada con `destinazioneNotifica()` come prima;
 *   - Urgency high; token morti tolti uno per uno, solo se ancora quelli;
 *   - `sendNotification` salva di nuovo `dest` (perso il 18/08);
 *   - il clic con l'app aperta NON ricarica: postMessage alla finestra.
 * Il paragrafo qui sotto e' la storia di prima, e resta per capire perche'
 * `destinazioneNotifica()` decide ancora lei la destinazione finale.
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
// Sabotaggio: FUNZIONI=<index.js di un'altra versione> SW=<sw.js di un'altra versione>
var FILE_FUNZIONI = process.env.FUNZIONI ? path.resolve(process.env.FUNZIONI) : path.join(RADICE, "functions", "index.js");
var FILE_SW = process.env.SW ? path.resolve(process.env.SW) : path.join(RADICE, "sw.js");
var ok = 0, ko = 0;
function prova(n, c, extra){
  if(c){ ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

/* ══ A. COSA MANDA IL SERVER ═══════════════════════════════════════════════ */
var trigger = {};
var scritti = {};
var inviati = [];
var fallisce = {};          // token → codice d'errore FCM
var aggiornamenti = [];     // update fatti in transazione: { path, cambi }
var notificheScritte = [];  // documenti scritti da sendNotification
/* L'ARCHIVIO FINTO, PER PERCORSI. (20/09/2026) Da quando i dispositivi sono
   documenti (users/{uid}/devices/{id}) il server legge una sottoraccolta con
   `where`, e spegne il dispositivo morto in transazione sul SUO documento.
   Un archivio che rispondeva sempre lo stesso utente non poteva vederlo. */
var ARCHIVIO = {};
function azzeraArchivio(){
  ARCHIVIO = {
    "users/u-destinatario": { fcmToken: "token-telefono" },       // quello delle app di prima
    "users/u-destinatario/devices/dTel": { token: "token-telefono", enabled: true },
    "users/u-destinatario/devices/dPc": { token: "token-computer", enabled: true },
    "users/u-destinatario/devices/dVecchio": { token: "token-spento", enabled: false },
    "users/mittente-vero": { approved: true }
  };
}
azzeraArchivio();
function istantanea(p){
  var d = ARCHIVIO[p];
  return { exists: !!d, id: p.split("/").pop(), data: function(){ return d || {}; },
           get: function(k){ return d ? d[k] : undefined; } };
}
function rifDoc(p){
  return {
    path: p,
    get: function(){ return Promise.resolve(istantanea(p)); },
    update: function(c){ aggiornamenti.push({ path: p, cambi: c }); return Promise.resolve(); },
    set: function(){ return Promise.resolve(); },
    collection: function(n){ return rifRaccolta(p + "/" + n); }
  };
}
function rifRaccolta(p, filtri){
  filtri = filtri || [];
  return {
    doc: function(id){ return rifDoc(p + "/" + id); },
    add: function(doc){ notificheScritte.push(doc); return Promise.resolve(); },
    where: function(k, op, v){ return rifRaccolta(p, filtri.concat([[k, v]])); },
    get: function(){
      var docs = Object.keys(ARCHIVIO).filter(function(k){
        return k.indexOf(p + "/") === 0 && k.slice(p.length + 1).indexOf("/") < 0;
      }).filter(function(k){
        return filtri.every(function(f){ return ARCHIVIO[k][f[0]] === f[1]; });
      }).map(istantanea);
      return Promise.resolve({ forEach: function(fn){ docs.forEach(fn); }, docs: docs, size: docs.length });
    }
  };
}

var finto = {
  "firebase-functions/v2/firestore": {
    onDocumentCreated: function(percorso, fn){ trigger[percorso] = fn; return fn; },
    // TIPI DIVERSI, REGISTRI DIVERSI. (20/09/2026.) `claimCompagnia` ascolta
    // `users/{uid}` con `onDocumentWritten`, ed e' lo STESSO percorso di
    // `avvisaIscrizione`, che lo ascolta con `onDocumentCreated`. Con un
    // registro solo, chiave il percorso, la seconda registrazione cancellava la
    // prima: il banco chiamava la funzione sbagliata e diceva no su prove che
    // non c'entravano niente. Qui restano separati, come in Firebase.
    onDocumentWritten: function(percorso, fn){ scritti[percorso] = fn; return fn; }
  },
  "firebase-functions/v2/https": {
    onCall: function(_o, fn){ return fn; },
    HttpsError: class extends Error { constructor(c, m){ super(m); this.code = c; } }
  },
  "firebase-functions/v2": { setGlobalOptions: function(){} },
  "firebase-admin": {
    initializeApp: function(){},
    messaging: function(){
      return {
        send: function(msg){ inviati.push(msg); return Promise.resolve("id-finto"); },
        sendEachForMulticast: function(msg){
          inviati.push(msg);
          return Promise.resolve({ responses: msg.tokens.map(function(t){
            return fallisce[t] ? { success:false, error:{ code: fallisce[t] } } : { success:true };
          }) });
        }
      };
    },
    auth: function(){
      return { getUserByEmail: function(m){ return Promise.resolve({ uid:"admin-uid", email:m }); } };
    },
    firestore: Object.assign(function(){
      return {
        collection: function(n){ return rifRaccolta(n); },
        runTransaction: function(fn){
          var tx = {
            get: function(r){ return r.get(); },
            set: function(){}, update: function(r, cambi){ aggiornamenti.push({ path: r.path, cambi: cambi }); }
          };
          return Promise.resolve().then(function(){ return fn(tx); });
        }
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
var funzioni = require(FILE_FUNZIONI);
Module._load = caricaVero;

var mandaPush = trigger["notifications/{uid}/items/{itemId}"];

/* ══ B/C. IL SERVICE WORKER IN PROVETTA ════════════════════════════════════ */
function stanzaSW(){
  var testo = fs.readFileSync(FILE_SW, "utf8");
  var disegnate = [], gia = [], aperte = [], ascolt = {}, sfondo = null, finestre = [], messaggi = [], navigate = [];

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
      matchAll: function(){ return Promise.resolve(finestre.slice()); },
      openWindow: function(u){ aperte.push(u); return Promise.resolve({}); },
      claim: function(){ return Promise.resolve(); }
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, URL: URL
  };
  /* LA CASSA DEI SEGNI, per davvero. (20/09/2026.) `pushsubscriptionchange`
     lascia un biglietto in una cassa e la pagina lo legge alla prossima
     apertura: con un `caches` che dice sempre «niente» non si potrebbe provare
     ne' che il biglietto viene scritto, ne' che viene letto una volta sola. */
  var casse = {};
  stanza.caches.open = function(nome){
    if(!casse[nome]) casse[nome] = {};
    var c = casse[nome];
    return Promise.resolve({
      put: function(req, res){ c[String(req && req.url || req)] = res; return Promise.resolve(); },
      match: function(req){ return Promise.resolve(c[String(req && req.url || req)] || null); },
      delete: function(req){ var k = String(req && req.url || req); var c_era = (k in c); delete c[k]; return Promise.resolve(c_era); },
      add: function(){ return Promise.resolve(); },
      addAll: function(){ return Promise.resolve(); },
      keys: function(){ return Promise.resolve(Object.keys(c)); }
    });
  };
  stanza.Response = function(corpo, o){ this.corpo = corpo; this.opzioni = o; };
  var sottoscrizioni = [];
  stanza.self = stanza;
  stanza.self.addEventListener = function(nome, fn){ ascolt[nome] = fn; };
  stanza.self.skipWaiting = function(){ return Promise.resolve(); };
  stanza.self.registration = {
    showNotification: function(titolo, opzioni){
      disegnate.push({ titolo:titolo, opzioni:opzioni || {} });
      gia.push({ tag:(opzioni||{}).tag, title:titolo, body:(opzioni||{}).body });
      return Promise.resolve();
    },
    getNotifications: function(){ return Promise.resolve(gia.slice()); },
    pushManager: {
      subscribe: function(o){ sottoscrizioni.push(o); return Promise.resolve({ endpoint:"nuovo" }); }
    }
  };

  vm.createContext(stanza);
  vm.runInContext(testo, stanza, { filename:"sw.js" });

  return {
    sfondo: function(){ return sfondo; },
    click: function(){ return ascolt["notificationclick"]; },
    ascoltatore: function(nome){ return ascolt[nome]; },
    sottoscrizioni: function(){ return sottoscrizioni; },
    casse: function(){ return casse; },
    disegnate: function(){ return disegnate; },
    aperte: function(){ return aperte; },
    messaggi: function(){ return messaggi; },
    navigate: function(){ return navigate; },
    conFinestra: function(url){
      var w = { url: url,
        focus: function(){ return Promise.resolve(w); },
        navigate: function(u){ navigate.push(u); return Promise.resolve(w); },
        postMessage: function(m){ messaggi.push(m); } };
      finestre.push(w);
    },
    azzera: function(){ disegnate = []; gia = []; aperte = []; finestre = []; messaggi = []; navigate = []; }
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
    prova("parte un invio solo, per tutti i dispositivi", inviati.length === 1, inviati.length + " invii");
    var tk = (m.tokens || []).slice().sort();
    prova("va a TUTTI i dispositivi dell'utente, senza doppioni del vecchio fcmToken",
          tk.length === 2 && tk[0] === "token-computer" && tk[1] === "token-telefono", JSON.stringify(m.tokens));
    prova("niente blocco notification: la disegna sempre sw.js", !m.notification, JSON.stringify(m.notification));
    prova("data porta l'etichetta dell'avviso", !!(m.data && m.data.tag === "avviso-7"));
    prova("data porta il titolo (sw.js legge d.title)", !!(m.data && m.data.title === AVVISO.title), JSON.stringify(m.data));
    prova("data porta il corpo (sw.js legge d.body)", !!(m.data && m.data.body === AVVISO.body), JSON.stringify(m.data));
    prova("data non perde l'instradamento gia' scritto sull'avviso (apri)",
          !!(m.data && m.data.apri === "marketplace"), JSON.stringify(m.data));
    prova("data.link porta all'app, su QUESTA notifica", !!(m.data && m.data.link === "/app.html?n=avviso-7"),
          m.data && m.data.link);
    prova("urgenza alta: in Doze non aspetta lo sblocco",
          !!(m.webpush && m.webpush.headers && m.webpush.headers.Urgency === "high"), JSON.stringify(m.webpush));

    prova("un dispositivo spento (enabled:false) non riceve", tk.indexOf("token-spento") < 0, JSON.stringify(m.tokens));

    // A2 — un dispositivo morto: si spegne SOLO lui, e solo se e' ancora lui
    inviati = []; aggiornamenti = []; fallisce = { "token-computer": "messaging/registration-token-not-registered" };
    await mandaPush({ data:{ data:function(){ return AVVISO; } }, params:{ uid:"u-destinatario", itemId:"avviso-8" } });
    var suPc = aggiornamenti.filter(function(a){ return /devices\/dPc$/.test(a.path); })[0];
    prova("token morto: il documento del computer si spegne", !!(suPc && suPc.cambi.enabled === false), JSON.stringify(aggiornamenti));
    prova("token morto: il telefono e il vecchio fcmToken restano",
          !aggiornamenti.some(function(a){ return /dTel$/.test(a.path) || a.path === "users/u-destinatario"; }), JSON.stringify(aggiornamenti));
    fallisce = {};
  }

  console.log("\n  A3. DOVE PORTA L'AVVISO (sendNotification salva dest)");
  var chiama = funzioni.sendNotification;
  async function manda(dest){
    notificheScritte = [];
    await chiama({ auth:{ uid:"mittente-vero", token:{ email_verified:true } },
                   data:{ toUid:"mittente-vero", title:"Ciao", body:"x", dest: dest } });
    ultimaNotifica = notificheScritte[0] || {};
    return ultimaNotifica.dest;
  }
  var ultimaNotifica = {};
  var dm = await manda({ k:"dm", uid:"qualcun-altro" });
  prova("dm: la destinazione e' la chat col MITTENTE VERO, non quello dichiarato",
        !!(dm && dm.k === "dm" && dm.uid === "mittente-vero"), JSON.stringify(dm));
  var ot = await manda({ k:"ot", id:"allenamento-1" });
  prova("ot: l'allenamento resta", !!(ot && ot.k === "ot" && ot.id === "allenamento-1"), JSON.stringify(ot));
  prova("ot: il tipo e' «allenamento», deciso dal server", ultimaNotifica.type === "allenamento", ultimaNotifica.type);
  prova("ot: entityId e' l'allenamento", ultimaNotifica.entityId === "allenamento-1", ultimaNotifica.entityId);
  prova("senderUid e' il mittente vero", ultimaNotifica.senderUid === "mittente-vero", ultimaNotifica.senderUid);
  var strano = await manda({ k:"<script>", id:"x" });
  prova("una destinazione sconosciuta non si salva", strano === undefined, JSON.stringify(strano));
  prova("e il tipo resta «avviso»", ultimaNotifica.type === "avviso", ultimaNotifica.type);

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

    // B4 — il clic. Ad app chiusa si apre l'app su quella notifica.
    if(sw.click()){
      async function clicca(dati){
        var chiuso = false, atteso = [];
        sw.click()({ notification: { data: dati, close:function(){ chiuso = true; } },
                     waitUntil: function(p){ atteso.push(p); } });
        await Promise.all(atteso);
        return chiuso;
      }
      sw.azzera();
      var chiuso = await clicca(d3.opzioni && d3.opzioni.data || {});
      prova("il clic chiude l'avviso", chiuso === true);
      prova("ad app chiusa il clic apre l'app su quella notifica",
            sw.aperte().indexOf("/app.html?n=avviso-7") >= 0, JSON.stringify(sw.aperte()));
      // Con l'app gia' aperta (magari a meta' giro): niente ricarica.
      sw.azzera();
      sw.conFinestra("https://arctrail3d.com/app.html");
      await clicca({ link:"/app.html?n=avviso-7", n:"avviso-7" });
      prova("ad app aperta il clic NON ricarica la pagina", sw.navigate().length === 0, JSON.stringify(sw.navigate()));
      prova("ad app aperta il clic dice all'app quale notifica aprire",
            sw.messaggi().some(function(x){ return x && x.tipo === "apri-notifica" && x.n === "avviso-7"; }),
            JSON.stringify(sw.messaggi()));
      // Una finestra che non e' l'app (la vetrina): si porta sull'app.
      sw.azzera();
      sw.conFinestra("https://arctrail3d.com/");
      await clicca({ link:"/app.html?n=avviso-7", n:"avviso-7" });
      prova("dalla vetrina il clic porta all'app", sw.navigate().indexOf("/app.html?n=avviso-7") >= 0,
            JSON.stringify(sw.navigate()));
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

    /* ── D. QUANDO IL BROWSER RIFA' LA SOTTOSCRIZIONE ────────────────────────
       (20/09/2026, audit N7 / C2.) `pushsubscriptionchange` non era gestito:
       il browser revocava la sottoscrizione, il token su Firestore restava
       quello morto e le push smettevano. Il guasto si avvita — la persona non
       riapre l'app proprio perche' non le arriva piu' niente — quindi il
       service worker deve fare tre cose: risottoscriversi, avvisare le
       finestre aperte, e lasciare un segno per quando non ce n'e' nessuna.
       Quest'ultima e' la sola che conta davvero: al momento dell'evento, di
       finestre aperte non ce n'e' quasi mai. */
    console.log("\n  D. LA SOTTOSCRIZIONE CHE CAMBIA");
    var cambio = sw.ascoltatore("pushsubscriptionchange");
    prova("il service worker ascolta pushsubscriptionchange", typeof cambio === "function");
    if (typeof cambio === "function") {
      sw.azzera();
      sw.conFinestra("https://arctrail3d.com/app.html");
      var atteso = null;
      await cambio({ waitUntil: function(p){ atteso = p; return p; },
                     oldSubscription: { options: { userVisibleOnly:true, applicationServerKey:"CHIAVE-VAPID" } } });
      if (atteso) await atteso;
      prova("si risottoscrive con la stessa chiave VAPID",
            sw.sottoscrizioni().length === 1 && sw.sottoscrizioni()[0].applicationServerKey === "CHIAVE-VAPID",
            JSON.stringify(sw.sottoscrizioni()));
      prova("avvisa la finestra aperta, che puo' rifare il token subito",
            sw.messaggi().some(function(m){ return m && m.tipo === "push-da-rinnovare"; }),
            JSON.stringify(sw.messaggi()));
      var cassaSegni = sw.casse()["arctrail3d-segni"] || {};
      prova("e lascia un segno per quando nessuna finestra e' aperta",
            Object.keys(cassaSegni).length === 1, JSON.stringify(Object.keys(cassaSegni)));

      // La pagina chiede il segno: lo riceve UNA volta, poi non c'e' piu'.
      var posta = sw.ascoltatore("message");
      prova("il service worker risponde alla domanda «c'e' un segno?»", typeof posta === "function");
      if (typeof posta === "function") {
        var risposte = [];
        var finta = { postMessage: function(m){ risposte.push(m); } };
        var p1 = null;
        await posta({ data:{ tipo:"segno-push?" }, source: finta, waitUntil: function(p){ p1 = p; return p; } });
        if (p1) await p1;
        prova("la prima volta dice che c'era", risposte.length === 1 && risposte[0].cera === true,
              JSON.stringify(risposte));
        var p2 = null;
        await posta({ data:{ tipo:"segno-push?" }, source: finta, waitUntil: function(p){ p2 = p; return p; } });
        if (p2) await p2;
        prova("la seconda no: il segno si consuma, il token non si rifa' due volte",
              risposte.length === 2 && risposte[1].cera === false, JSON.stringify(risposte));
      }
    }
  }

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e && e.message); process.exit(1); });
