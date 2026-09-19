#!/usr/bin/env node
/* banco-xss.js — quello che scrive un altro non diventa codice sul mio telefono.
 *
 *   node tests/banco-xss.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-xss.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit P0-1.) Cinque campi scritti dal telefono
 * di un altro utente finivano nell'HTML di chi guarda senza passare da
 * escapeHtml, e le regole non chiedevano che fossero numeri:
 *   - `open_trainings.spots`            → «taken/total» nell'elenco allenamenti
 *   - `percorsi_campo.piazzole`         → pannello admin, spazio compagnia, Campi
 *   - `field_reports.piazzola` / `type` → segnalazioni del referente
 *   - `public_profiles.numeri.*`        → il profilo pubblico
 *   - `cognome`/`nome`/`piazzolaPartenza` → le squadre di «Prepara gara»
 * Un <img src=x onerror=...> in uno di quei campi era JavaScript eseguito
 * sull'origine arctrail3d.com da chiunque aprisse la lista — admin compreso.
 *
 * COME FA. Apre l'app VERA (copia DEV_MODE, come gli altri banchi) con un
 * database finto (`window.__fakeDb`) pieno di documenti avvelenati, e disegna
 * le schermate con i gesti dell'app. Il carico, se eseguito, incrementa
 * `window.__xss`. Il banco chiede due cose per ogni schermata: che il carico
 * NON sia stato eseguito, e che la schermata si sia disegnata davvero (una
 * schermata vuota non esegue niente e passerebbe per il motivo sbagliato).
 *
 * SABOTAGGIO: `APP=<copia di app.html prima del 19/09> node tests/banco-xss.js`
 * deve dire no.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-xss-"));

var ok = 0, ko = 0;
function prova(nome, cond, extra) {
  if (cond) { ok++; console.log("  ✓ " + nome); }
  else { ko++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}

/* Il carico. `x` non esiste, quindi l'immagine fallisce e onerror parte. */
var CARICO = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';

/* Il gancio sta SOLO nella copia del banco: espone quello che una schermata
   non raggiunge da sola (la riga di un allenamento, la bandiera collaudatore). */
var GANCIO = "\nwindow.__prova = {\n" +
  "  otRow: function(o){ return otRowEl(o); },\n" +
  "  setBeta: function(v){ IS_BETA_TESTER = v; },\n" +
  "  render: function(){ render(); },\n" +
  "  vai: function(scr, extra){ Object.keys(extra||{}).forEach(function(k){ state[k] = extra[k]; }); state.screen = scr; render(); }\n" +
  "};\n";

function preparaCopia(admin) {
  var src = fs.readFileSync(SORGENTE, "utf8");
  var html = accendiDev(src);
  if (admin) {
    if (html.indexOf('email:"arciere@example.com"') < 0) throw new Error("utente finto non trovato");
    html = html.replace('email:"arciere@example.com"', 'email:"alessandro.zanetta80@gmail.com"');
  }
  var DB = 'var auth, db, messaging, fns, messagingInitError = "";';
  if (html.indexOf(DB) < 0) throw new Error("dichiarazione di db non trovata");
  html = html.replace(DB, DB + "\nif(window.__fakeDb){ db = window.__fakeDb; }");
  if (html.indexOf("\ninitAuthFlow();") < 0) throw new Error("punto di aggancio non trovato");
  html = html.replace("\ninitAuthFlow();", GANCIO + "initAuthFlow();");
  var nome = admin ? "admin.html" : "utente.html";
  fs.writeFileSync(path.join(DOVE, nome), html);
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
    if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
  });
  return nome;
}

/* IL DATABASE FINTO. Risponde alle forme di interrogazione che l'app usa
   (collection/doc/where/orderBy/limit/get/onSnapshot) con i documenti di
   `window.__DATI`, indicizzati per percorso di raccolta. Le scritture vanno
   a buon fine e non fanno niente: qui si guarda cosa si DISEGNA. */
function databaseFinto(dati) {
  window.__DATI = dati;
  function lista(nome) {
    var x = window.__DATI[nome] || {};
    return Object.keys(x).map(function (id) { return { id: id, d: x[id] }; });
  }
  function istantanea(arr) {
    var docs = arr.map(function (e) {
      return { id: e.id, exists: true, data: function () { return JSON.parse(JSON.stringify(e.d)); },
               get: function (k) { return e.d[k]; }, ref: riferimento("?", e.id) };
    });
    return { empty: !docs.length, size: docs.length, docs: docs,
             forEach: function (fn) { docs.forEach(fn); },
             docChanges: function () { return []; } };
  }
  function riferimento(nome, id) {
    return {
      id: id,
      get: function () {
        var d = (window.__DATI[nome] || {})[id];
        return Promise.resolve({ id: id, exists: !!d, data: function () { return d ? JSON.parse(JSON.stringify(d)) : undefined; },
                                 get: function (k) { return d ? d[k] : undefined; } });
      },
      set: function () { return Promise.resolve(); },
      update: function () { return Promise.resolve(); },
      delete: function () { return Promise.resolve(); },
      onSnapshot: function (cb) {
        var me = this;
        setTimeout(function () { me.get().then(cb); }, 0);
        return function () {};
      },
      collection: function (n) { return interrogazione(nome + "/" + id + "/" + n); }
    };
  }
  function interrogazione(nome) {
    var q = {
      where: function () { return q; }, orderBy: function () { return q; },
      limit: function () { return q; }, limitToLast: function () { return q; },
      startAfter: function () { return q; },
      get: function () { return Promise.resolve(istantanea(lista(nome))); },
      onSnapshot: function (cb) { setTimeout(function () { cb(istantanea(lista(nome))); }, 0); return function () {}; },
      doc: function (id) { return riferimento(nome, id || ("auto" + Math.random())); },
      add: function () { return Promise.resolve({ id: "auto" }); }
    };
    return q;
  }
  window.__fakeDb = {
    collection: interrogazione,
    batch: function () { return { set: function () {}, update: function () {}, delete: function () {}, commit: function () { return Promise.resolve(); } }; },
    runTransaction: function () { return Promise.resolve(); },
    enablePersistence: function () { return Promise.resolve(); }
  };
  var FV = { serverTimestamp: function () { return null; }, delete: function () { return null; },
             arrayUnion: function () { return []; }, arrayRemove: function () { return []; },
             increment: function (n) { return n; } };
  window.firebase = { firestore: Object.assign(function () { return window.__fakeDb; }, { FieldValue: FV }) };
}

var ORA = Date.now();
var DATI = {
  "compagnie_admin": { "01VERB": { adminUid: "dev-locale" } },
  "open_trainings": {},
  "percorsi_campo": {
    "pX": { clubCode: "01VERB", nome: "Percorso alto", piazzole: CARICO, stato: "proposto",
            createdBy: "altro", createdByName: "Mallory", createdAt: ORA }
  },
  "field_reports": {
    "rX": { clubCode: "01VERB", type: CARICO, piazzola: CARICO, description: "ramo caduto",
            reporterUid: "altro", reporterName: "Mallory", status: "open" }
  },
  "public_profiles": {
    "uX": { username: "mallory", nomeCognome: "Mallory", numeri: { giri: CARICO, piazzole: CARICO, campi: CARICO } }
  },
  "percorsi": {
    "gX": { createdBy: "dev-locale", nome: "Gara", gara: "round3d",
            squadre: [{ piazzolaPartenza: CARICO, membri: [{ cognome: CARICO, nome: CARICO }] }] }
  }
};

function statoIniziale(extra) {
  var s = { screen: "menu", tab: "tira", pendingArchers: [], lang: "it", country: "it", federation: "fiarc",
            theme: "light", profile: { nomeCognome: "A Z", username: "alez", compagnia: "01VERB" }, profileSkipped: false };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}

(async function () {
  var copiaUtente = preparaCopia(false);
  var copiaAdmin = preparaCopia(true);
  var browser = await chromium.launch();

  async function apri(copia, stato) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    // Niente rete esterna: le librerie Firebase vere non devono arrivare,
    // il database e' quello finto.
    await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
    await ctx.addInitScript("(" + databaseFinto.toString() + ")(" + JSON.stringify(DATI) + ");");
    await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " + JSON.stringify(JSON.stringify(stato)) + ");" +
      "localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
    var page = await ctx.newPage();
    var errori = [];
    page.on("pageerror", function (e) { errori.push(e.message); });
    await page.goto("file://" + path.join(DOVE, copia).replace(/\\/g, "/"));
    await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    return { ctx: ctx, page: page, errori: errori };
  }
  // L'app riparte sempre dalla Home: alla schermata si va dopo, come col dito.
  async function vai(page, scr, extra) {
    await page.evaluate(function (a) { window.__prova.vai(a[0], a[1]); }, [scr, extra || {}]);
    await page.waitForTimeout(600);
  }
  async function eseguito(page) { return page.evaluate(function () { return window.__xss || 0; }); }
  async function testo(page) { return page.evaluate(function () { return document.body.innerText; }); }

  console.log("\n  QUELLO CHE SCRIVE UN ALTRO NON DIVENTA CODICE (P0-1)\n");

  /* 1. Allenamenti aperti: la riga chiusa e aperta. */
  var a = await apri(copiaUtente, statoIniziale());
  var righe = await a.page.evaluate(function (carico) {
    var ot = { id: "o1", ownerUid: "altro", ownerName: "Mallory", field: "Vignone", time: "10:00",
               datetime: Date.now() + 3600000, spots: carico, visibility: "all",
               participantUids: [], participants: [], status: "active", clubCode: "01VERB" };
    var r = window.__prova.otRow(ot);
    document.body.appendChild(r);
    var b = r.querySelector("button"); if (b) b.click();
    return r.innerText;
  }, CARICO);
  await a.page.waitForTimeout(300);
  prova("allenamento: la riga si disegna", /Vignone/.test(righe), righe.slice(0, 80));
  prova("allenamento: i posti avvelenati NON eseguono codice", (await eseguito(a.page)) === 0);
  await a.ctx.close();

  /* 2. Profilo pubblico con numeri avvelenati. */
  var b = await apri(copiaUtente, statoIniziale());
  await vai(b.page, "profilo-pubblico", { profiloUid: "uX" });
  prova("profilo pubblico: la carta si disegna", /mallory/i.test(await testo(b.page)));
  prova("profilo pubblico: i numeri avvelenati NON eseguono codice", (await eseguito(b.page)) === 0);
  await b.ctx.close();

  /* 3. Spazio compagnia del referente: percorsi in attesa e segnalazioni. */
  var c = await apri(copiaUtente, statoIniziale());
  await vai(c.page, "club-space", { clubSpaceCode: "01VERB" });
  // Le schede dello spazio compagnia: si toccano tutte, cosi' ogni lista si disegna.
  var schede = await c.page.$$("[role=tab], .tab-btn, .seg-btn, .cs-tab");
  for (var i = 0; i < schede.length; i++) { try { await schede[i].click(); await c.page.waitForTimeout(250); } catch (e) {} }
  var tc = await testo(c.page);
  prova("spazio compagnia: la segnalazione o il percorso si disegna", /ramo caduto|Percorso alto/.test(tc), tc.slice(0, 120).replace(/\n/g, " "));
  prova("spazio compagnia: piazzola/tipo/piazzole avvelenati NON eseguono codice", (await eseguito(c.page)) === 0);
  await c.ctx.close();

  /* 4. Pannello admin: «Percorsi da confermare». */
  var d = await apri(copiaAdmin, statoIniziale());
  await vai(d.page, "admin");
  var tabAdm = await d.page.$$("button");
  for (var j = 0; j < tabAdm.length; j++) {
    var tx = (await tabAdm[j].innerText().catch(function () { return ""; })) || "";
    if (/percorsi/i.test(tx)) { try { await tabAdm[j].click(); await d.page.waitForTimeout(300); } catch (e) {} }
  }
  prova("pannello admin: il percorso proposto si disegna", /Percorso alto/.test(await testo(d.page)));
  prova("pannello admin: le piazzole avvelenate NON eseguono codice", (await eseguito(d.page)) === 0);
  await d.ctx.close();

  /* 5. Prepara gara: i percorsi salvati con squadre avvelenate. */
  var e = await apri(copiaUtente, statoIniziale());
  await e.page.evaluate(function () { window.__prova.setBeta(true); });
  await vai(e.page, "prepara-gara", { pgScreen: "elenco", pgElenco: null });
  prova("prepara gara: l'elenco dei percorsi salvati si disegna", /Gara/.test(await testo(e.page)));
  prova("prepara gara: squadre e piazzola avvelenate NON eseguono codice", (await eseguito(e.page)) === 0);
  await e.ctx.close();

  /* 6. Prepara gara: la schermata iscritti con squadre gia' fatte. */
  var f = await apri(copiaUtente, statoIniziale());
  await f.page.evaluate(function () { window.__prova.setBeta(true); });
  await vai(f.page, "prepara-gara", { pgScreen: "iscritti",
    pgDraft: { gara: "round3d", nome: "Gara", numPiazzole: 2, piazzole: [null, null], iscritti: [], gruppiSize: 6,
               squadre: [{ piazzolaPartenza: CARICO, membri: [{ cognome: CARICO, nome: CARICO }] }] } });
  var tf = await testo(f.page);
  prova("prepara gara: le squadre si disegnano", /img src=x|Squadra|squadra/.test(tf), tf.slice(0, 120).replace(/\n/g, " "));
  prova("prepara gara: i nomi avvelenati NON eseguono codice", (await eseguito(f.page)) === 0);
  await f.ctx.close();

  await browser.close();
  try { fs.rmSync(DOVE, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
