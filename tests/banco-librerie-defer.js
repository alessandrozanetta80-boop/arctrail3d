#!/usr/bin/env node
/* banco-librerie-defer.js — le librerie Firebase arrivano come in produzione:
 * dai `<script defer>` di gstatic, DOPO il copione dell'app.
 *
 *   node tests/banco-librerie-defer.js
 *   APP=percorso node tests/banco-librerie-defer.js   # sabotaggio
 *
 * PERCHE' ESISTE. (21/09/2026, regressione della release del 20/09.)
 * Con l'app del 20/09 sul telefono non si riusciva a registrare un
 * allenamento e compariva «Stai lavorando solo su questo telefono». La fase
 * 23 faceva partire l'app SUBITO, prima degli script `defer`: `firebase` non
 * c'era mai al momento di `initializeApp`, e l'app restava in modalita'
 * locale per sempre — i giri si segnavano e non salivano sul cloud.
 *
 * NESSUN BANCO LO VEDEVA, e per una ragione sola: `firebase-finto.js` si
 * installa con `addInitScript`, cioe' PRIMA che la pagina parta. Nei banchi
 * `firebase` c'era sempre gia'; l'ordine vero — prima l'app, poi le
 * librerie — non l'aveva provato nessuno. `banco-esterni.js` provava solo
 * gstatic appeso, mai gstatic che risponde.
 *
 * COME FA. Il Firebase finto non si mette piu' prima: si SERVE al posto di
 * `firebase-app-compat.js`, dall'indirizzo vero di gstatic, e arriva quindi
 * con il `defer` e nell'ordine della produzione. Le altre quattro librerie
 * rispondono con un file vuoto (il finto le contiene gia'). Niente rete vera.
 *
 * Quattro strade:
 *   A. le librerie arrivano subito     → accesso, giro, il giro SALE sul cloud
 *   B. arrivano dopo 7 s (3G lento)    → intanto si segna in locale, poi la
 *                                        nuvola torna SENZA ricaricare
 *   C. non arrivano (download fallito) → telefono usato: modalita' locale;
 *                                        telefono nuovo: «Connessione non riuscita»
 *   D. telefono nuovo, librerie ok     → mai «Connessione non riuscita» per
 *                                        strada, si arriva all'accesso
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-defer-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { stato: function(){ return JSON.parse(JSON.stringify(state)); }," +
          " storico: function(){ try{ return JSON.parse(localStorage.getItem('arctrail3d_storico_v1')||'[]'); }catch(e){ return []; } } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var U = { uid: "uidMario", email: "mario@esempio.it" };
function cloud() {
  var d = { users: {}, public_profiles: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  return d;
}
var STATO_USATO = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email, federazioni: [{ code: "fiarc", tessera: "FI111" }] },
  profileSkipped: false, pendingArchers: [] };

/* Il corpo servito al posto di firebase-app-compat.js: il finto, piu' un
   contatore delle inizializzazioni vere. */
function corpoApp(utente) {
  return F.scriptIniziale({ utente: utente, dati: cloud() }) +
    "\n;(function(){ var i = window.firebase.initializeApp; window.firebase.initializeApp = function(){" +
    " window.__inizializzata = (window.__inizializzata || 0) + 1; return i.apply(this, arguments); }; })();";
}

/* modo: "subito" | "ritardo" | "fallisce". */
async function apri(browser, modo, opz) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT", isMobile: true, hasTouch: true });
  await ctx.route(/^https?:\/\//, async function (r) {
    var u = r.request().url();
    if (u.indexOf("https://www.gstatic.com/firebasejs/") !== 0) return r.abort();
    if (modo === "fallisce") return r.abort();
    if (modo === "ritardo") await new Promise(function (res) { setTimeout(res, 7000); });
    var corpo = /firebase-app-compat\.js$/.test(u) ? corpoApp(opz.utente) : "/* il finto e' gia' in firebase-app */";
    try { await r.fulfill({ status: 200, contentType: "text/javascript", body: corpo }); } catch (e) {}
  });
  if (opz.usato) {
    await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
      "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(STATO_USATO)) + ");" +
      "localStorage.setItem('arctrail3d_proprietario_v1','" + U.uid + "');" +
      "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  } else {
    await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
      "localStorage.setItem('arctrail3d_state_v3', JSON.stringify({lang:'it',country:'it',federation:'fiarc',screen:'menu',pendingArchers:[]})); } }catch(e){}");
  }
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  page.goto(URL).catch(function () {});
  return { ctx: ctx, page: page, errori: errori };
}
function leggi(page) {
  return page.evaluate(function () {
    var a = document.querySelector("#app");
    return { fascia: !!document.getElementById("fasciaLocale"), init: window.__inizializzata || 0,
             testo: a ? a.innerText.replace(/\s+/g, " ") : "",
             storicoCloud: (window.__scritture || []).filter(function (s) { return /\/storico\//.test(s.path) && s.data && s.data.results; }).length };
  }).catch(function () { return { fascia: false, init: 0, testo: "", storicoCloud: 0 }; });
}
async function tocca(page, testo) {
  var fatto = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button, #app a"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, testo);
  await page.waitForTimeout(450);
  return fatto;
}
async function premi(page, css) {
  var c = await page.evaluate(function (s) { var x = document.querySelector(s); if (x) { x.click(); return true; } return false; }, css);
  await page.waitForTimeout(150);
  return c;
}
/* Il giro minimo, come in banco-fumo: tre piazzole, due frecce, chiuso. */
async function unGiro(page) {
  await tocca(page, "Tira");
  await tocca(page, "Gara libera");
  await tocca(page, "Continua");
  await tocca(page, "Round 3D");
  var partito = await tocca(page, "Inizia gara");
  for (var i = 0; i < 3; i++) { await premi(page, ".quick-btn.superspot"); await premi(page, ".quick-btn.spot"); }
  await tocca(page, "Classifica");
  await tocca(page, "Termina percorso");
  await tocca(page, "Tocca di nuovo per confermare");
  await page.waitForTimeout(1200);
  var st = await page.evaluate(function () { return window.__prova ? window.__prova.storico() : []; }).catch(function () { return []; });
  return { partito: partito, giriLocali: st.length };
}
async function aspetta(page, cond, ms) {
  var t0 = Date.now(), r;
  while (Date.now() - t0 < ms) { r = await leggi(page); if (cond(r)) return r; await page.waitForTimeout(200); }
  return await leggi(page);
}
function erroriVeri(e) { return e.filter(function (x) { return !/net::ERR|Failed to fetch|ERR_INTERNET|ERR_FAILED/.test(x); }); }

(async function () {
  var browser = await chromium.launch();

  console.log("\n  A. LE LIBRERIE ARRIVANO SUBITO, COME DI SOLITO\n");
  var a = await apri(browser, "subito", { usato: true, utente: U });
  await a.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 }).catch(function () {});
  var ra = await aspetta(a.page, function (r) { return r.init > 0 && /MARIO/i.test(r.testo); }, 8000);
  prova("A1. Firebase si inizializza (initializeApp chiamata una volta)", ra.init === 1, "chiamate: " + ra.init);
  prova("A2. niente fascia «solo su questo telefono»", !ra.fascia, ra.testo.slice(0, 90));
  var ga = await unGiro(a.page);
  prova("A3. il giro si segna e si chiude", ga.partito && ga.giriLocali >= 1, JSON.stringify(ga));
  ra = await aspetta(a.page, function (r) { return r.storicoCloud > 0; }, 5000);
  prova("A4. il giro chiuso SALE sul cloud (users/{uid}/storico)", ra.storicoCloud >= 1, "scritture storico: " + ra.storicoCloud);
  prova("A5. nessun errore in pagina", erroriVeri(a.errori).length === 0, erroriVeri(a.errori).slice(0, 2).join(" | "));
  await a.ctx.close();

  console.log("\n  B. LE LIBRERIE ARRIVANO DOPO 7 SECONDI (3G LENTO)\n");
  var b = await apri(browser, "ritardo", { usato: true, utente: U });
  await b.page.waitForTimeout(5000);
  var rb1 = await leggi(b.page);
  prova("B1. dopo 4 s si segna lo stesso, in locale (la fascia lo dice)", rb1.fascia && rb1.init === 0, JSON.stringify({ fascia: rb1.fascia, init: rb1.init }));
  var rb2 = await aspetta(b.page, function (r) { return r.init > 0 && !r.fascia; }, 9000);
  prova("B2. quando arrivano, Firebase si inizializza SENZA ricaricare", rb2.init === 1, "chiamate: " + rb2.init);
  prova("B3. e la fascia se ne va", !rb2.fascia);
  await b.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 5000 }).catch(function () {});
  var gb = await unGiro(b.page);
  rb2 = await aspetta(b.page, function (r) { return r.storicoCloud > 0; }, 5000);
  prova("B4. il giro tirato dopo sale sul cloud", gb.giriLocali >= 1 && rb2.storicoCloud >= 1, JSON.stringify({ giro: gb, cloud: rb2.storicoCloud }));
  prova("B5. nessun errore in pagina", erroriVeri(b.errori).length === 0, erroriVeri(b.errori).slice(0, 2).join(" | "));
  await b.ctx.close();

  console.log("\n  C. LE LIBRERIE NON ARRIVANO\n");
  var c = await apri(browser, "fallisce", { usato: true, utente: U });
  var rc = await aspetta(c.page, function (r) { return r.fascia; }, 8000);
  prova("C1. telefono gia' usato: modalita' locale dichiarata", rc.fascia && rc.init === 0, rc.testo.slice(0, 90));
  await c.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 8000 }).catch(function () {});
  var gc = await unGiro(c.page);
  prova("C2. e si segna comunque: il giro resta nel telefono", gc.giriLocali >= 1, JSON.stringify(gc));
  await c.ctx.close();
  var c2 = await apri(browser, "fallisce", { usato: false, utente: null });
  var rc2 = await aspetta(c2.page, function (r) { return /Connessione non riuscita/i.test(r.testo); }, 8000);
  prova("C3. telefono nuovo: «Connessione non riuscita», che e' la verita'", /Connessione non riuscita/i.test(rc2.testo), rc2.testo.slice(0, 90));
  await c2.ctx.close();

  console.log("\n  D. TELEFONO NUOVO, LIBRERIE REGOLARI\n");
  var d = await apri(browser, "subito", { usato: false, utente: null });
  var vistoErrore = false, t0 = Date.now(), rd;
  while (Date.now() - t0 < 4000) {
    rd = await leggi(d.page);
    if (/Connessione non riuscita/i.test(rd.testo)) vistoErrore = true;
    await d.page.waitForTimeout(100);
  }
  prova("D1. mai «Connessione non riuscita» mentre le librerie arrivano", !vistoErrore);
  prova("D2. si arriva all'accesso", /Accedi/i.test(rd.testo) && rd.init === 1, rd.testo.slice(0, 90));
  await d.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
