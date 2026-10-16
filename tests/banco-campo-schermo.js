#!/usr/bin/env node
/* banco-campo-schermo.js — la Mappa campo nel browser vero. (02/10/2026.)
 *
 *   node tests/banco-campo-schermo.js
 *
 * La logica (coda, segmenti, permessi) e' provata in banco-campo-geo.js e le
 * regole sugli emulatori in banco-campo-regole.js. Qui si guarda la schermata:
 *   - a 360, 384 (S26 Ultra) e desktop: niente scorrimento orizzontale, i
 *     tasti stanno nello schermo e sono alti almeno 44 px;
 *   - con la rete spenta: si registra un percorso (GPS finto), si segnala un
 *     problema, tutto resta in coda nel telefono e sopravvive a una ricarica,
 *     una volta sola (nessun doppione);
 *   - il nome della compagnia accanto al codice.
 * Firebase non c'e' (DEV_MODE, nessun db): la coda non puo' partire, ed e'
 * proprio la situazione «senza rete» vista dalla schermata.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-campo-"));
fs.writeFileSync(path.join(D, "app.html"), accendiDev(fs.readFileSync("app.html", "utf8")));
["compagnie-data.js", "campo-geo.js", "campo-mappa.js", "logo.webp", "logo.jpg", "icon-192.png"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");
var CODICE = "01VERB";
// Copia con un gancio per cambiare utente, uscire senza ricaricare («GPS e account») e aprire/chiudere il giro (distanze).
var GANCIO = 'window.__campoProva = { utente: function(u){ currentUser = u; render(); }, vai: function(s){ state.screen = s; render(); }, ' +
  'segnala: function(){ apriSegnalaCampo({ torna: "campi" }); }, svuota: function(){ svuotaDatiUtenteLocali(); }, ' +
  'giro: function(v){ state.roundActive = v; render(); } };\n';
fs.writeFileSync(path.join(D, "app-gancio.html"), fs.readFileSync(path.join(D, "app.html"), "utf8").replace("var BUILD_STAMP = ", GANCIO + "var BUILD_STAMP = "));
var URL_GANCIO = "file://" + path.join(D, "app-gancio.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc",
  theme: "light", profile: { nomeCognome: "Alessandro Zanetta", username: "alez" }, profileSkipped: false };

var SCHERMI = [
  { nome: "320x740", w:320, h:740, mobile:true, dpr:2 },
  { nome: "360x740", w: 360, h: 740, mobile: true, dpr: 3 },
  { nome: "S26 Ultra 384x832", w: 384, h: 832, mobile: true, dpr: 3.75 },
  { nome: "desktop 1280x800", w: 1280, h: 800, mobile: false }
];

async function apri(browser, S) {
  var ctx = await browser.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr || 1,
    isMobile: !!S.mobile, hasTouch: !!S.mobile, geolocation: { latitude: 45.9210, longitude: 8.5510, accuracy: 6 },
    permissions: ["geolocation"] });
  await ctx.addInitScript(function (a) {
    try {
      localStorage.setItem("arctrail3d_state_v3", JSON.stringify(a.st));
      localStorage.setItem("arctrail3d_welcome_v2", "1");
      if (!localStorage.getItem("arctrail3d_campo_codice")) localStorage.setItem("arctrail3d_campo_codice", a.code);
    } catch (e) {}
  }, { st: STATO, code: CODICE });
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e)); });
  await page.goto(URL_GANCIO);
  // L'app parte dalla Home: ci si arriva come una persona, Campi → Mappa campo.
  await vai(page);
  return { ctx: ctx, page: page, errori: errori };
}

async function vai(page) {
  await page.waitForTimeout(500);
  if (!(await page.$("[data-campo-mappa]"))) await page.click("nav.tabbar >> text=Campi");
  await page.click("[data-campo-mappa]");
  await page.waitForSelector(".campo-mappa", { timeout: 8000 });
}

async function misura(page) {
  return page.evaluate(function () {
    var W = document.documentElement.clientWidth;
    var fuori = [], bassi = [];
    Array.prototype.forEach.call(document.querySelectorAll(".campo-mappa button, .campo-mappa a.btn, .campo-mappa input"), function (b) {
      var r = b.getBoundingClientRect();
      if (!r.width) return;
      var nome = (b.textContent || b.placeholder || b.type || "").trim().slice(0, 30);
      if (r.left < -0.5 || r.right > W + 0.5) fuori.push(nome + " " + Math.round(r.left) + "→" + Math.round(r.right));
      if (b.tagName !== "INPUT" && r.height < 43.5 && !b.classList.contains("campo-voce")) bassi.push(nome + " " + Math.round(r.height));
    });
    return { scroll: document.documentElement.scrollWidth - W, fuori: fuori, bassi: bassi };
  });
}

/* DURANTE IL GIRO. (02/10/2026, giro _09.) Alla piazzola 6, «Segnala» della barra
   apre la segnalazione GPS (non il vecchio field-report) col campo del giro e la
   piazzola 6; inviata o chiusa, si torna al giro con i punteggi intatti. Il campo
   del giro prevale sulla compagnia del profilo; se non e' certo, si sceglie. */
function giroSeminato(piazzola, campo) {
  var scores = { a1: [] };
  for (var i = 0; i < piazzola - 1; i++) scores.a1.push({ arrows: [8], total: 8 });
  return {
    screen: "round", tab: "tira", roundActive: true, mode: "training", format: 12,
    archers: [{ id: "a1", name: "Alessandro", isSelf: true }], archersBase: [{ id: "a1", name: "Alessandro", isSelf: true }],
    rotBaseTarget: 1, scores: scores, target: piazzola, archerIndex: 0, arrowIndex: 0,
    pendingArrows: [], liveBattutaTypes: {}, awaitingStep: null, savedToHistory: false,
    roundEntryDate: null, firme: {}, consegna: null, sessionId: null, campo: campo,
    lang: "it", country: "it", federation: "fiarc", theme: "light", pendingArchers: [],
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" }, profileSkipped: false
  };
}
/* Conta le chiamate al GPS e i watch ancora accesi. (08/10/2026.) */
function ganciGeo() {
  var g = navigator.geolocation; if (!g) return;
  var w = g.watchPosition.bind(g), c = g.clearWatch.bind(g), u = g.getCurrentPosition.bind(g);
  window.__geo = { chiamate: 0, attivi: {} };
  g.watchPosition = function (a, b, o) { window.__geo.chiamate++; var id = w(a, b, o); window.__geo.attivi[id] = 1; return id; };
  g.clearWatch = function (id) { delete window.__geo.attivi[id]; return c(id); };
  g.getCurrentPosition = function (a, b, o) { window.__geo.chiamate++; return u(a, b, o); };
}
function geo(page) { return page.evaluate(function () { return { chiamate: window.__geo.chiamate, attivi: Object.keys(window.__geo.attivi).length }; }); }
async function apriGiro(browser, stato, larghezza) {
  var ctx = await browser.newContext({ viewport: { width: larghezza || 384, height: 832 }, geolocation: { latitude: 45.9210, longitude: 8.5510, accuracy: 6 }, permissions: ["geolocation"] });
  await ctx.addInitScript(ganciGeo);
  await ctx.addInitScript(function (st) {
    try {
      if (!sessionStorage.getItem("seme")) { localStorage.clear(); localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); sessionStorage.setItem("seme", "1"); }
    } catch (e) {}
  }, stato);
  var page = await ctx.newPage(), errori = [];
  page.on("pageerror", function (e) { errori.push(String(e)); });
  await page.goto(URL);
  await page.waitForTimeout(600);
  // Con un giro aperto l'app parte dalla Home: si riprende come una persona.
  await page.evaluate(function () { var b = document.querySelector(".home-riprendi") || document.getElementById("resumeBtn"); if (b) b.click(); });
  await page.waitForTimeout(500);
  return { ctx: ctx, page: page, errori: errori };
}
async function premiSegnala(page) {
  var b = await page.$("button.pericolo:has-text('Segnala')");
  if (b) { await b.click(); } else { await page.click(".bar-more > button"); await page.click(".bar-menu-item >> text=Segnala"); }
  await page.waitForSelector(".campo-mappa", { timeout: 8000 });
}
function giroDi(page) {
  return page.evaluate(function () { var s = JSON.parse(localStorage.getItem("arctrail3d_state_v3")); return { screen: s.screen, target: s.target, roundActive: s.roundActive, scores: JSON.stringify(s.scores), archer: s.archers[0].name }; });
}
/* GPS E ACCOUNT. (08/10/2026.) Uscendo dalla mappa il GPS si spegne e la
   registrazione va in pausa; la coda e il tracciato di un account non si vedono
   da un altro, non si cancellano, e il tracciato di prima (chiave senza uid)
   passa solo al proprietario dei dati del telefono. Uscire toglie la cache. */
async function provaAccountGps(browser) {
  console.log("\nGPS e account");
  var ctx = await browser.newContext({ viewport: { width: 384, height: 832 }, geolocation: { latitude: 45.9210, longitude: 8.5510, accuracy: 6 }, permissions: ["geolocation"] });
  await ctx.addInitScript(ganciGeo);
  await ctx.addInitScript(function (a) {
    try {
      if (sessionStorage.getItem("seme")) return;
      localStorage.clear(); sessionStorage.setItem("seme", "1");
      localStorage.setItem("arctrail3d_state_v3", JSON.stringify(a.st));
      localStorage.setItem("arctrail3d_welcome_v2", "1");
      localStorage.setItem("arctrail3d_campo_codice", a.code);
      localStorage.setItem("arctrail3d_proprietario_v1", "dev-locale");
      localStorage.setItem("arctrail3d_campo_traccia_v1", JSON.stringify({ id: "rVECCHIA", companyCode: a.code, name: "", fase: "registra", punti: [], scartati: 0, ultimoMotivo: null, avviatoIl: 1 }));
      localStorage.setItem("arctrail3d_campo_coda_v1", JSON.stringify([{ id: "issue-iTERZO", tipo: "issue", dati: { seg: { id: "iTERZO", reporterUid: "terzo", status: "open", category: "altro", createdAt: 1, lat: 45.92, lon: 8.55 }, foto: [] }, tentativi: 0, errore: null }]));
    } catch (e) {}
  }, { st: STATO, code: CODICE });
  var page = await ctx.newPage(), errori = [];
  page.on("pageerror", function (e) { errori.push(String(e)); });
  await page.goto(URL_GANCIO);
  var ls = function (k) { return page.evaluate(function (k) { return localStorage.getItem(k); }, k); };
  prova("tracciato di prima: passa al proprietario dei dati del telefono",
    !(await ls("arctrail3d_campo_traccia_v1")) && /rVECCHIA/.test(await ls("arctrail3d_campo_traccia_v1:dev-locale") || ""));
  await vai(page);
  await page.waitForFunction(function () { return Object.keys(window.__geo.attivi).length === 1; }, null, { timeout: 5000 });
  prova("mappa con registrazione aperta: GPS acceso", (await geo(page)).attivi === 1);
  prova("coda di un altro utente (chiave vecchia) non mostrata", (await page.evaluate(function () { return window.CampoMappaUI._coda.quante(); })) === 0);
  await page.click("nav.tabbar >> text=Home");
  await page.waitForTimeout(200);
  var g = await geo(page), st = await page.evaluate(function () { return window.CampoMappaUI._reg.stato(); });
  prova("uscita dalla mappa con la barra: GPS spento, registrazione in pausa", g.attivi === 0 && st === "pausa", JSON.stringify(g) + " " + st);
  // «Segnala problema» poi tasto indietro dell'app
  await page.evaluate(function () { window.__campoProva.segnala(); });
  await page.waitForFunction(function () { return Object.keys(window.__geo.attivi).length === 1; }, null, { timeout: 5000 });
  await page.click("button:has-text('← Campi')");
  await page.waitForTimeout(200);
  prova("segnala → indietro: GPS spento", (await geo(page)).attivi === 0);
  // In coda una segnalazione di dev-locale, poi entra un altro account.
  await page.evaluate(function () {
    window.CampoMappaUI._coda.aggiungi({ id: "issue-iMIA", tipo: "issue", dati: { seg: { id: "iMIA", reporterUid: "dev-locale", status: "open", category: "altro", createdAt: 2, lat: 45.92, lon: 8.55 }, foto: [] } });
    localStorage.setItem("arctrail3d_campo_cache_01VERB", JSON.stringify({ rotte: [], segn: [] }));
    window.__campoProva.vai("campo-mappa");
    window.__campoProva.utente({ uid: "altro", email: "altro@example.com", emailVerified: true });
  });
  await page.waitForSelector(".campo-mappa", { timeout: 8000 });
  var B = await page.evaluate(function () { var U = window.CampoMappaUI; return { coda: U._coda.quante(), reg: !!U._reg.dati(), testo: document.body.innerText }; });
  prova("altro account: non vede coda né tracciato del precedente", B.coda === 0 && !B.reg && !/in coda/.test(B.testo), JSON.stringify({ coda: B.coda, reg: B.reg }));
  prova("i dati non inviati del precedente restano sul telefono (non cancellati)",
    /iMIA/.test(await ls("arctrail3d_campo_coda_v1:dev-locale") || "") && /rVECCHIA/.test(await ls("arctrail3d_campo_traccia_v1:dev-locale") || "") && /iTERZO/.test(await ls("arctrail3d_campo_coda_v1") || ""));
  await page.evaluate(function () { window.__campoProva.utente({ uid: "dev-locale", email: "arciere@example.com", emailVerified: true }); });
  await page.waitForTimeout(200);
  prova("rientra il proprietario: ritrova la sua coda e il tracciato",
    (await page.evaluate(function () { var U = window.CampoMappaUI; return U._coda.quante() === 1 && !!U._reg.dati(); })));
  await page.click("nav.tabbar >> text=Home");
  await page.evaluate(function () { window.__campoProva.svuota(); });
  prova("uscita dall'account: tolte cache e codice del campo, coda non inviata intatta",
    !(await ls("arctrail3d_campo_cache_01VERB")) && !(await ls("arctrail3d_campo_codice")) && /iMIA/.test(await ls("arctrail3d_campo_coda_v1:dev-locale") || ""));
  prova("GPS: nessun watch rimasto acceso", (await geo(page)).attivi === 0);
  prova("nessun errore JS", !errori.length, errori.join(" | "));
  await ctx.close();
}
async function provaGiro(browser) {
  console.log("\ndurante il giro");
  for (var w of [320,384]) {
    var R=await apriGiro(browser,giroSeminato(6,"Madonna del Sasso (VB)"),w);
    var btn=R.page.locator(".pista-segnala");
    prova("Segnala problema ha testo visibile "+w+"px",(await btn.innerText()).includes("Segnala problema")&&await btn.isVisible());
    prova("Segnala problema toccabile e dentro lo schermo "+w+"px",await btn.evaluate(function(b){var r=b.getBoundingClientRect();return r.height>=48&&r.left>=0&&r.right<=innerWidth;}));
    await R.page.screenshot({path:path.resolve("UI_REVIEW/PERCORSI_GPS/segnala-giro-"+w+".png")});
    await R.ctx.close();
  }
  // Giro sul campo di 01BICO (luogo identico), profilo 01VERB.
  var A = await apriGiro(browser, giroSeminato(6, "Madonna del Sasso (VB)")), page = A.page;
  var prima = await giroDi(page);
  prova("giro: si parte dal punteggio, piazzola 6", prima.screen === "round" && prima.target === 6, JSON.stringify(prima));
  var g0 = await geo(page);
  prova("giro normale: nessuna chiamata al GPS", g0.chiamate === 0 && g0.attivi === 0, JSON.stringify(g0));
  await premiSegnala(page);
  var dentro = await page.evaluate(function () {
    var s = JSON.parse(localStorage.getItem("arctrail3d_state_v3")), sel = document.querySelector("[data-campo-piazzola]");
    return { screen: s.screen, code: window.CampoMappaUI._stato.code, pz: sel && sel.value, modulo: !!document.querySelector(".campo-mappa .fr-tipi") };
  });
  prova("giro: «Segnala» apre la segnalazione GPS, non il vecchio field-report", dentro.screen === "campo-mappa" && dentro.modulo, JSON.stringify(dentro));
  prova("giro: compagnia del giro (01BICO), non quella del profilo (01VERB)", dentro.code === "01BICO", dentro.code);
  prova("giro: piazzola 6 precompilata", dentro.pz === "6", dentro.pz);
  await page.waitForFunction(function () { return !!window.CampoMappaUI._stato.pos; }, null, { timeout: 5000 });
  await page.fill(".campo-mappa textarea", "Pianta caduta sulle sagome");
  await page.click("text=Salva segnalazione");
  await page.waitForTimeout(400);
  var dopo = await giroDi(page);
  prova("giro: inviata, si torna allo stesso giro e alla stessa piazzola",
    dopo.screen === "round" && dopo.target === 6 && dopo.roundActive === true && !(await page.$(".campo-mappa")), JSON.stringify(dopo));
  prova("giro: punteggi e arciere invariati", dopo.scores === prima.scores && dopo.archer === prima.archer);
  var seg = await page.evaluate(function () { var o = window.CampoMappaUI._coda.elenco().filter(function (x) { return x.tipo === "issue"; }); return o.length === 1 ? o[0].dati.seg : null; });
  prova("giro: una sola segnalazione field_issues in coda, con compagnia, piazzola, GPS e reporter",
    !!seg && seg.companyCode === "01BICO" && seg.piazzola === 6 && typeof seg.lat === "number" && seg.acc != null && seg.status === "open" && !!seg.reporterUid && seg.category === "pianta",
    JSON.stringify(seg));
  // Chiudi senza inviare: si torna al giro.
  await premiSegnala(page);
  await page.click(".campo-mappa >> text=Chiudi");
  await page.waitForTimeout(300);
  var chiuso = await giroDi(page);
  prova("giro: «Chiudi» riporta al giro, punteggi intatti", chiuso.screen === "round" && chiuso.target === 6 && chiuso.scores === prima.scores, JSON.stringify(chiuso));
  prova("giro: nessun errore JS", !A.errori.length, A.errori.join(" | "));
  await A.ctx.close();

  // Campo non noto: si sceglie, nessuna compagnia messa a caso.
  A = await apriGiro(browser, giroSeminato(3, "Bosco di prova senza compagnia")); page = A.page;
  await premiSegnala(page);
  var ignoto = await page.evaluate(function () {
    var i = document.querySelector(".campo-mappa input.input-field");
    return { code: window.CampoMappaUI._stato.code, input: i ? i.value : "?", scegli: /Scegli la compagnia del campo/.test(document.body.innerText), modulo: !!document.querySelector(".campo-mappa .fr-tipi") };
  });
  prova("campo non noto: nessun default, si chiede di scegliere", ignoto.code === null && ignoto.input === "" && ignoto.scegli && !ignoto.modulo, JSON.stringify(ignoto));
  await page.fill(".campo-mappa input.input-field", "01BICO");
  await page.click(".campo-mappa >> text=OK");
  await page.waitForSelector(".campo-mappa .fr-tipi", { timeout: 5000 });
  var pz3 = await page.$eval("[data-campo-piazzola]", function (s) { return s.value; });
  prova("campo non noto: scelto a mano, modulo con piazzola 3", pz3 === "3", pz3);
  await page.click("text=← Torna al giro");
  await page.waitForTimeout(300);
  var g3 = await giroDi(page);
  prova("campo non noto: «Torna al giro» riporta al giro", g3.screen === "round" && g3.target === 3, JSON.stringify(g3));
  prova("campo non noto: nessun errore JS", !A.errori.length, A.errori.join(" | "));
  await A.ctx.close();
}

(async function () {
  var browser = await chromium.launch();
  try {
    for (var i = 0; i < SCHERMI.length; i++) {
      var S = SCHERMI[i];
      console.log("\n" + S.nome);
      var A = await apri(browser, S), page = A.page;
      prova("nome della compagnia accanto al codice", await page.evaluate(function () {
        return Array.prototype.some.call(document.querySelectorAll(".campo-mappa .nota"), function (n) { return /Arcieri del VCO/.test(n.textContent); });
      }));
      var m = await misura(page);
      prova("schermata: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("schermata: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      prova("schermata: tasti alti almeno 44 px", !m.bassi.length, m.bassi.join("; "));

      // Registra un percorso: tre fix GPS distanti ~15 m, rete spenta.
      await A.ctx.setOffline(true);
      prova("utente semplice: niente «Registra percorso»", !(await page.$("text=Registra percorso")));
      // Senza Firebase i permessi non si leggono: qui si fa il manutentore autorizzato.
      await page.evaluate(function () {
        var S = window.CampoMappaUI._stato;
        S.perm = window.CampoGeo.permessi({ signedIn: true, verified: true, isMaintainer: true });
        S.ultimoCtx.render();
      });
      await page.click("text=Registra percorso");
      prova("nome percorso richiesto prima di partire", !(await page.evaluate(function(){return !!window.CampoMappaUI._reg.dati();})));
      await page.fill("[data-campo-nome-nuovo]", "Verde");
      await page.click("text=Registra percorso");
      for (var k = 1; k <= 3; k++) {
        await A.ctx.setGeolocation({ latitude: 45.9210 + k * 0.00014, longitude: 8.5510, accuracy: 6 });
        await page.waitForTimeout(400);
      }
      m = await misura(page);
      prova("registrazione: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("registrazione: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      var punti = await page.evaluate(function () { var d = window.CampoMappaUI._reg.dati(); return d ? d.punti.length : -1; });
      prova("registrazione: i fix diventano punti", punti >= 2, punti);
      prova("Segna piazzola subito visibile senza scorrere", await page.locator("[data-campo-segna-piazzola]").evaluate(function(b){var r=b.getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight-65;}));
      await page.click("[data-campo-segna-piazzola]");
      await A.ctx.setGeolocation({ latitude:45.9217, longitude:8.551, accuracy:6 });
      await page.waitForTimeout(400);
      await page.click("[data-campo-segna-piazzola]");
      prova("Segna piazzola1 e2: numero progressivo e GPS conservati", await page.evaluate(function(){var d=window.CampoMappaUI._reg.dati();return d.name==="Verde"&&d.piazzole.length===2&&d.piazzole[0].n===1&&d.piazzole[1].n===2;}));
      fs.mkdirSync(path.resolve("UI_REVIEW/PERCORSI_GPS"),{recursive:true});
      await page.screenshot({path:path.resolve("UI_REVIEW/PERCORSI_GPS/registrazione-"+S.w+".png"),fullPage:true});
      await page.click("text=Termina e salva");
      prova("percorso offline: traccia e piazzole nella stessa operazione", await page.evaluate(function(){var op=window.CampoMappaUI._coda.elenco().filter(function(o){return o.tipo==="route";})[0];return op&&op.dati.meta.name==="Verde"&&op.dati.meta.piazzole.length===2&&op.dati.segmenti.length>0;}));
      await page.waitForTimeout(300);

      // Dentro la Mappa campo non c'e' piu' la porta per una nuova segnalazione.
      prova("Mappa campo: nessun tasto per una nuova segnalazione", !(await page.$(".campo-mappa >> text=Segnala problema")));
      // Segnala un problema dalla porta di Campi, sempre senza rete.
      await page.click("text=← Campi");
      await page.click("[data-campo-segnala]");
      await page.waitForSelector(".fr-tipi");
      m = await misura(page);
      prova("segnalazione: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("segnalazione: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      await page.waitForFunction(function () { return !!window.CampoMappaUI._stato.pos; }, null, { timeout: 5000 });
      await page.fill(".campo-mappa textarea", "Albero caduto sulla piazzola 4");
      await page.click("text=Salva segnalazione");
      await page.waitForTimeout(300);
      prova("segnalazione da Campi: inviata, si torna a Campi", !!(await page.$("[data-campo-segnala]")) && !(await page.$(".campo-mappa")));
      await page.click("[data-campo-mappa]");
      await page.waitForSelector(".campo-mappa", { timeout: 8000 });

      var coda = await page.evaluate(function () { return window.CampoMappaUI._coda.elenco().map(function (o) { return o.tipo; }).sort().join(","); });
      prova("offline: percorso e segnalazione in coda", coda === "issue,route", coda);
      prova("offline: la schermata lo dice", /in attesa di rete/.test(await page.textContent(".campo-sync")));

      // Ricarica: la coda resta, una volta sola.
      await page.reload();
      await vai(page);
      await page.waitForTimeout(300);
      coda = await page.evaluate(function () { return window.CampoMappaUI._coda.elenco().map(function (o) { return o.tipo; }).sort().join(","); });
      prova("ricarica: la coda e' ancora li', senza doppioni", coda === "issue,route", coda);
      var voci = await page.$$eval(".campo-voce-btn", function (v) { return v.length; });
      prova("ricarica: una sola segnalazione in elenco", voci === 1, voci);
      await page.click(".campo-voce-btn");
      await page.waitForSelector(".campo-dettaglio");
      await page.click("text=Raggiungi");
      await page.waitForTimeout(500);
      var dist = await page.textContent(".campo-dist");
      prova("Raggiungi: distanza e direzione", /Distanza .*Direzione \d+°/.test(dist), dist);
      // Giro aperto: nel tiro 3D la distanza non si misura. (08/10/2026.)
      await page.evaluate(function () { window.__campoProva.giro(true); });
      await page.waitForSelector(".campo-dettaglio");
      var nd = await page.evaluate(function () {
        var t = document.querySelector(".campo-mappa").textContent;
        return { dist: !!document.querySelector(".campo-dist"), ragg: /Raggiungi|Ferma|navigatore/.test(t), avviso: !!document.querySelector(".campo-no-distanze"), metri: /\d+(\.\d+)? k?m/.test(t.replace(/±\d+ m/g, "")) };
      });
      prova("giro aperto: nessuna distanza, direzione, Raggiungi o navigatore", !nd.dist && !nd.ragg && nd.avviso && !nd.metri, JSON.stringify(nd));
      await page.click(".campo-dettaglio >> text=Chiudi");
      await page.waitForTimeout(200);
      var ndm = await page.evaluate(function () {
        return { scala: !!document.querySelector(".campo-scala"), metri: /\d+(\.\d+)? k?m/.test(Array.prototype.map.call(document.querySelectorAll(".campo-voce-btn"), function (v) { return v.textContent; }).join(" ")) };
      });
      prova("giro aperto: mappa senza scala ed elenco senza metri", !ndm.scala && !ndm.metri, JSON.stringify(ndm));
      await page.evaluate(function () { window.__campoProva.giro(false); });
      await page.click(".campo-voce-btn");
      await page.waitForSelector(".campo-dettaglio");
      m = await misura(page);
      prova("dettaglio: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("dettaglio: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));

      // Campi: due porte separate in cima, niente vecchia scheda in fondo.
      await page.click("text=← Campi");
      await page.waitForSelector("[data-campo-segnala]");
      var porte = await page.evaluate(function () {
        var W = document.documentElement.clientWidth, H = window.innerHeight;
        function r(s) { var e = document.querySelector(s); if (!e) return null; var b = e.getBoundingClientRect(); return { t: e.textContent.trim(), l: b.left, r: b.right, top: b.top, h: b.height }; }
        return { m: r("[data-campo-mappa]"), s: r("[data-campo-segnala]"), W: W, H: H, scroll: document.documentElement.scrollWidth - W,
          vecchia: /Segnala un problema su un percorso/.test(document.body.innerText) };
      });
      prova("Campi: tasto «Mappa campo» da solo", porte.m && porte.m.t === "Mappa campo", porte.m && porte.m.t);
      prova("Campi: tasto «Segnala problema sul campo» separato", porte.s && porte.s.t === "Segnala problema sul campo", porte.s && porte.s.t);
      prova("Campi: i due tasti visibili in cima, dentro lo schermo, alti ≥ 44 px",
        porte.m && porte.s && [porte.m, porte.s].every(function (b) { return b.l >= -0.5 && b.r <= porte.W + 0.5 && b.top < porte.H / 2 && b.h >= 43.5; }),
        JSON.stringify(porte));
      prova("Campi: niente scorrimento orizzontale", porte.scroll <= 0, porte.scroll + " px");
      prova("Campi: la vecchia scheda «Segnala un problema su un percorso» non c'e' piu'", !porte.vecchia);
      await page.click("[data-campo-segnala]");
      await page.waitForSelector(".campo-mappa", { timeout: 8000 });
      prova("«Segnala problema sul campo» apre subito il modulo della segnalazione", !!(await page.$(".campo-mappa .fr-tipi")) && !!(await page.$("text=Salva segnalazione")));
      await page.click("text=← Campi");
      // Scheda di un campo: la segnalazione nasce su QUEL campo; chiusa, si torna alla scheda.
      await page.fill("input[placeholder^='Cerca un campo']", "Madonna del Sasso");
      await page.click(".comp-riga");
      await page.click("[data-campo-scheda-segnala='01BICO']");
      await page.waitForSelector(".campo-mappa .fr-tipi", { timeout: 8000 });
      prova("scheda campo: segnalazione precompilata con quella compagnia",
        (await page.evaluate(function () { return window.CampoMappaUI._stato.code; })) === "01BICO");
      await page.click(".campo-mappa >> text=Chiudi");
      await page.waitForTimeout(200);
      prova("scheda campo: chiusa la segnalazione si torna alla stessa scheda", !!(await page.$("[data-campo-scheda-segnala='01BICO']")));
      await page.click("[data-campo-mappa]");
      await page.waitForSelector(".campo-mappa", { timeout: 8000 });
      prova("«Mappa campo» apre mappa e percorsi, non il modulo",
        !(await page.$(".campo-mappa .fr-tipi")) && !!(await page.$(".campo-mappa .campo-azioni")) && !!(await page.$(".campo-mappa-box, .campo-mappa-vuota")));
      prova("nessun errore JS", !A.errori.length, A.errori.join(" | "));
      await A.ctx.close();
    }
    await provaGiro(browser);
    await provaAccountGps(browser);
  } finally { await browser.close(); }
  console.log("\n" + ok + " ok, " + ko + " ko");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
