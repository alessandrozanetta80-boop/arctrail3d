#!/usr/bin/env node
/* banco-annuncia.js — «Annuncia allenamento» dice «Pubblicato» solo quando il
 * server ha detto si'.
 *
 *   node tests/banco-annuncia.js
 *   APP=percorso node tests/banco-annuncia.js   # sabotaggio
 *
 * PERCHE' ESISTE. (22/09/2026, ALLENAMENTI-2026-09-21.md.) Il modulo scriveva
 * senza aspettare: «Pubblicato!», inviti e ritorno al menu arrivavano subito;
 * se il database rifiutava, l'errore restava in console e l'annuncio sembrava
 * online. Qui il server finto dice si', dice no, o non risponde (rete), e si
 * guarda cosa dice l'app, cosa resta nel modulo, e quanti annunci nascono.
 *
 * L'app gira sul suo percorso di produzione (firebase-finto.js), senza rete.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-annuncia-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { schermo: function(){ return state.screen; }," +
          " nuovoAllenamento: function(campo, cod){ state.otPrecompile = { field: campo, cod: cod }; state.screen = 'open-training-create'; render(); }," +
          " ridisegna: function(){ render(); } };" }));
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
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true, compagnia: "01VERB" };
  return d;
}
var STATO = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email, compagnia: "01VERB",
             federazioni: [{ code: "fiarc", tessera: "FI111" }] }, profileSkipped: false, pendingArchers: [] };
var DOMANI = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
var NOTA = "Portiamo le sagome FIARC";

async function apri(browser) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud() }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(STATO)) + ");" +
    "localStorage.setItem('arctrail3d_proprietario_v1','" + U.uid + "');" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  // Il modulo, riempito come lo riempirebbe una persona.
  await page.evaluate(function () { window.__prova.nuovoAllenamento("Campo di prova", "01VERB"); });
  await page.waitForTimeout(400);
  await page.evaluate(function (a) {
    var d = document.querySelector("input.data[type=date]"); d.value = a.data;
    d.dispatchEvent(new Event("input", { bubbles: true })); d.dispatchEvent(new Event("change", { bubbles: true }));
    var n = document.querySelector("#app textarea"); n.value = a.nota; n.dispatchEvent(new Event("input", { bubbles: true }));
  }, { data: DOMANI, nota: NOTA });
  return { ctx: ctx, page: page, errori: errori };
}
function pubblica(page, volte) {
  return page.evaluate(function (v) {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) { return x.textContent.trim() === "Pubblica"; })[0];
    if (!b) return false;
    for (var i = 0; i < v; i++) b.click();   // stesso istante: il doppio tocco
    return true;
  }, volte || 1);
}
function leggi(page) {
  return page.evaluate(function () {
    var ot = (window.__DATI || {})["open_trainings"] || {};
    var nota = document.querySelector("#app textarea"), data = document.querySelector("input.data[type=date]");
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) { return x.textContent.trim() === "Pubblica"; })[0];
    var tent = 0; Object.keys(window.__tentativi || {}).forEach(function (k) { if (/^open_trainings\/[^/]+$/.test(k)) tent += window.__tentativi[k]; });
    return { schermo: window.__prova.schermo(), annunci: Object.keys(ot).length, tentativi: tent,
             testo: (document.querySelector("#app") || {}).innerText || "",
             nota: nota ? nota.value : null, data: data ? data.value : null, tastoAttivo: !!(b && !b.disabled) };
  });
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  1. IL SERVER DICE SI'\n");
  var a = await apri(browser);
  await pubblica(a.page); await a.page.waitForTimeout(700);
  var r1 = await leggi(a.page);
  prova("scrittura riuscita → un annuncio sul server", r1.annunci === 1, JSON.stringify(r1.annunci));
  prova("...e l'app torna al menu (ha detto «Pubblicato»)", r1.schermo === "menu", r1.schermo);
  await a.ctx.close();

  console.log("\n  2. IL DATABASE RIFIUTA\n");
  var b = await apri(browser);
  await b.page.evaluate(function () { window.__esitoScrittura = function (p) { return /^open_trainings\/[^/]+$/.test(p) ? { rifiuta: "permission-denied" } : null; }; });
  await pubblica(b.page); await b.page.waitForTimeout(700);
  var r2 = await leggi(b.page);
  prova("rifiuto → niente «Pubblicato!»", !/Pubblicato!/.test(r2.testo), r2.testo.slice(0, 120));
  prova("...si resta sul modulo, con un messaggio che lo dice", r2.schermo === "open-training-create" && /rifiutato/i.test(r2.testo), r2.schermo);
  prova("...nessun annuncio sul server", r2.annunci === 0);
  prova("...i dati inseriti ci sono ancora (data e note)", r2.data === DOMANI && r2.nota === NOTA, JSON.stringify({ data: r2.data, nota: r2.nota }));
  prova("...e il tasto torna attivo per riprovare", r2.tastoAttivo);
  // Il database cambia idea (regole corrette): si riprova, un annuncio solo.
  await b.page.evaluate(function () { window.__esitoScrittura = null; });
  await pubblica(b.page); await b.page.waitForTimeout(700);
  var r2b = await leggi(b.page);
  prova("nuovo tentativo dopo il rifiuto → un annuncio solo", r2b.annunci === 1 && r2b.schermo === "menu", JSON.stringify({ annunci: r2b.annunci, schermo: r2b.schermo }));
  await b.ctx.close();

  console.log("\n  3. LA RETE NON C'E'\n");
  var c = await apri(browser);
  await c.page.evaluate(function () { window.__esitoScrittura = function (p) { return /^open_trainings\/[^/]+$/.test(p) ? { trattieni: true } : null; }; });
  await c.ctx.setOffline(true);
  await pubblica(c.page); await c.page.waitForTimeout(700);
  var r3 = await leggi(c.page);
  prova("senza rete → niente «Pubblicato!», e lo dice", !/Pubblicato!/.test(r3.testo) && /NON è ancora online/.test(r3.testo), r3.testo.slice(0, 160));
  prova("...i dati inseriti non si perdono", r3.data === DOMANI && r3.nota === NOTA && r3.schermo === "open-training-create", JSON.stringify({ data: r3.data, nota: r3.nota, schermo: r3.schermo }));
  // Un ridisegno qualunque (un avviso che arriva, l'elenco che si aggiorna) non
  // deve svuotare il modulo mentre si aspetta.
  await c.page.evaluate(function () { window.__prova.ridisegna(); });
  await c.page.waitForTimeout(300);
  var r3r = await leggi(c.page);
  prova("...nemmeno dopo un ridisegno della pagina", r3r.data === DOMANI && r3r.nota === NOTA, JSON.stringify({ data: r3r.data, nota: r3r.nota }));
  await pubblica(c.page); await c.page.waitForTimeout(400);       // si riprova, ancora senza rete
  await c.ctx.setOffline(false);
  var rilasciate = await c.page.evaluate(function () { window.__esitoScrittura = null; return window.__rilascia(); });
  await c.page.waitForTimeout(800);
  var r3b = await leggi(c.page);
  prova("tornata la rete, i due tentativi arrivano → UN annuncio (stesso documento)", r3b.annunci === 1 && rilasciate >= 2, JSON.stringify({ annunci: r3b.annunci, rilasciate: rilasciate }));
  prova("...e solo allora «Pubblicato»: si torna al menu", r3b.schermo === "menu", r3b.schermo);
  await c.ctx.close();

  console.log("\n  4. IL DOPPIO TOCCO\n");
  var d = await apri(browser);
  await d.page.evaluate(function () { window.__esitoScrittura = function (p) { return /^open_trainings\/[^/]+$/.test(p) ? { trattieni: true } : null; }; });
  await pubblica(d.page, 2); await d.page.waitForTimeout(300);
  await pubblica(d.page, 1); await d.page.waitForTimeout(300);     // e un terzo, mentre aspetta
  var r4 = await leggi(d.page);
  prova("due tocchi nello stesso istante, e un terzo mentre aspetta → UN tentativo", r4.tentativi === 1, "tentativi " + r4.tentativi);
  await d.page.evaluate(function () { window.__esitoScrittura = null; return window.__rilascia(); });
  await d.page.waitForTimeout(800);
  var r4b = await leggi(d.page);
  prova("...e un annuncio solo", r4b.annunci === 1, "annunci " + r4b.annunci);
  var err = a.errori.concat(b.errori, c.errori, d.errori);
  prova("nessun errore in pagina", err.length === 0, err.slice(0, 2).join(" | "));
  await d.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
