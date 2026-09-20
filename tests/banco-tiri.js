#!/usr/bin/env node
/* banco-tiri.js — il tocco sul tasto del punteggio: rimbalzi, tocchi voluti, annulla.
 *
 *   node tests/banco-tiri.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-tiri.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (20/09/2026, fase 8 del risanamento notturno.) Il tasto del
 * punteggio e' il cuore dell'app: 288 tocchi in un percorso da 24 piazzole in
 * quattro. Due difetti possibili, opposti:
 *   - il RIMBALZO (guanto, dito freddo) che segna due frecce con un gesto solo:
 *     in gruppo la seconda finisce all'arciere dopo;
 *   - una finestra anti-rimbalzo troppo larga che MANGIA un tocco voluto.
 * E l'annulla, che deve riportare indietro tutto insieme: frecce in sospeso,
 * piazzole, totali, di chi e' il turno.
 *
 * COSA CHIEDE.
 *   - 1, 2 e 4 arcieri; due tocchi sullo STESSO tasto a 20, 50, 80 ms = UN tiro;
 *   - due tocchi voluti, a 250 ms (stesso tasto) e a 0 ms (tasti diversi),
 *     sono DUE tiri;
 *   - annulla: tiro → annulla → tiro diverso → cambio arciere → cambio
 *     piazzola → annulla oltre la piazzola; a ogni passo lo stato e' coerente.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-tiri-"));
var GANCIO = "\nwindow.__prova = { stato: function(){ return JSON.parse(JSON.stringify(state)); } };\n";
var html = accendiDev(fs.readFileSync(SORGENTE, "utf8"));
if (html.indexOf("\ninitAuthFlow();") < 0) throw new Error("punto di aggancio non trovato");
html = html.replace("\ninitAuthFlow();", GANCIO + "initAuthFlow();");
fs.writeFileSync(path.join(D, "app.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function giro(n) {
  var nomi = ["alez", "Bea", "Carlo", "Dora"];
  var archers = nomi.slice(0, n).map(function (nm, i) { return { id: "a" + i, name: nm, isSelf: i === 0 }; });
  var scores = {}; archers.forEach(function (a) { scores[a.id] = []; });
  return { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "A Z", username: "alez" }, profileSkipped: false,
    roundActive: true, mode: "round3d", format: 24, archers: archers, archersBase: archers, scores: scores,
    target: 1, archerIndex: 0, arrowIndex: 0, pendingArrows: [], liveBattutaTypes: {}, startedAt: Date.now() };
}
/* Frecce registrate in tutto: quelle chiuse nelle piazzole piu' quelle in sospeso. */
function frecce(st) {
  var n = (st.pendingArrows || []).length;
  Object.keys(st.scores || {}).forEach(function (k) { (st.scores[k] || []).forEach(function (e) { n += (e.arrows || []).length; }); });
  return n;
}
/* Lo stato e' coerente? Totali = somma delle frecce; turno dentro l'elenco;
   il nome sullo schermo e' quello di turno (in gruppo). */
/* LE ZONE NON DEVONO SCIVOLARE. (20/09/2026, fase 7.) Dal 20/09 la zona del
   tiro (kill, innerkill, il 12 alto ASA, il nulla voluto) viaggia accanto al
   punto, in un elenco PARALLELO — e due elenchi paralleli hanno un difetto
   tipico: si toglie una freccia da uno e non dall'altro, e da quel momento ogni
   zona parla della freccia sbagliata. Non si vedrebbe a schermo: i punti
   restano giusti. Quindi la lunghezza si controlla DOPO OGNI GESTO, dentro
   questa funzione, invece di una prova sola in fondo. */
function coerente(st, schermo) {
  var guai = [];
  Object.keys(st.scores || {}).forEach(function (k) {
    (st.scores[k] || []).forEach(function (e, i) {
      var s = (e.arrows || []).reduce(function (a, b) { return a + b; }, 0);
      if (s !== e.total) guai.push(k + " piazzola " + (i + 1) + ": totale " + e.total + " ma frecce " + s);
      if (!Array.isArray(e.zones)) guai.push(k + " piazzola " + (i + 1) + ": nessuna zona salvata");
      else if (e.zones.length !== (e.arrows || []).length)
        guai.push(k + " piazzola " + (i + 1) + ": " + (e.arrows || []).length + " frecce ma " + e.zones.length + " zone");
      else if (e.zones.some(function (z) { return !z; }))
        guai.push(k + " piazzola " + (i + 1) + ": una zona vuota (" + JSON.stringify(e.zones) + ")");
    });
  });
  var nf = (st.pendingArrows || []).length, nz = (st.pendingZones || []).length;
  if (nf !== nz) guai.push("in sospeso: " + nf + " frecce ma " + nz + " zone");
  if (!(st.archerIndex >= 0 && st.archerIndex < st.archers.length)) guai.push("archerIndex fuori: " + st.archerIndex);
  var chi = st.archers[st.archerIndex];
  if (st.archers.length > 1 && schermo && chi && schermo.indexOf(chi.name) < 0) guai.push("sullo schermo non c'e' " + chi.name);
  return guai;
}

(async function () {
  var browser = await chromium.launch();
  // `ritocca` cambia lo stato di partenza: `addInitScript` gira a OGNI
  // caricamento, quindi modificarlo dopo con un reload non serve a niente —
  // il seme lo riscrive e la modifica sparisce. (Provato il 20/09.)
  async function apri(n, ritocca) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
    var seme = giro(n);
    if (ritocca) ritocca(seme);
    await ctx.addInitScript(function (st) {
      try { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); } catch (e) {}
    }, seme);
    var page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
    await page.waitForTimeout(700);
    await page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
    await page.waitForTimeout(500);
    return { ctx: ctx, page: page };
  }
  /* Due click, il secondo dopo `ms` millisecondi, dentro la pagina (l'orologio
     della pagina, non quello del banco). */
  function doppio(page, sel1, sel2, ms) {
    return page.evaluate(function (a) {
      return new Promise(function (r) {
        var b1 = document.querySelector(a[0]); if (b1) b1.click();
        setTimeout(function () { var b2 = document.querySelector(a[1]); if (b2) b2.click(); setTimeout(r, 60); }, a[2]);
      });
    }, [sel1, sel2, ms]);
  }
  function stato(page) { return page.evaluate(function () { return window.__prova.stato(); }); }
  function schermo(page) { return page.evaluate(function () { return (document.querySelector("#app") || {}).innerText || ""; }); }

  console.log("\n  IL RIMBALZO: UN GESTO, UN TIRO\n");
  for (var n of [1, 2, 4]) {
    for (var ms of [20, 50, 80]) {
      var a = await apri(n);
      await doppio(a.page, ".quick-btn.superspot", ".quick-btn.superspot", ms);
      var st = await stato(a.page);
      prova(n + " arcier" + (n === 1 ? "e" : "i") + ", stesso tasto a " + ms + " ms = un tiro solo", frecce(st) === 1, "frecce=" + frecce(st));
      await a.ctx.close();
    }
  }

  console.log("\n  I TOCCHI VOLUTI PASSANO\n");
  for (var n2 of [1, 2, 4]) {
    var b = await apri(n2);
    await doppio(b.page, ".quick-btn.superspot", ".quick-btn.superspot", 250);
    var sb = await stato(b.page);
    prova(n2 + " arcier" + (n2 === 1 ? "e" : "i") + ", stesso tasto a 250 ms = due tiri", frecce(sb) === 2, "frecce=" + frecce(sb));
    await b.ctx.close();
    var c = await apri(n2);
    await doppio(c.page, ".quick-btn.superspot", ".quick-btn.spot", 0);
    var sc = await stato(c.page);
    prova(n2 + " arcier" + (n2 === 1 ? "e" : "i") + ", due tasti diversi subito = due tiri", frecce(sc) === 2, "frecce=" + frecce(sc));
    await c.ctx.close();
  }

  console.log("\n  L'ANNULLA RIPORTA INDIETRO TUTTO INSIEME (2 arcieri)\n");
  var u = await apri(2);
  async function tocco(sel) { await u.page.evaluate(function (s) { document.querySelector(s).click(); }, sel); await u.page.waitForTimeout(350); }
  async function annulla() {
    await u.page.evaluate(function () {
      var b = document.querySelector(".striscia-annulla button");
      if (b) { b.click(); return; }
      var x = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (y) { return /Annulla/.test(y.textContent); })[0];
      if (x) x.click();
    });
    await u.page.waitForTimeout(400);
  }
  async function controlla(nome, atteso) {
    var s = await stato(u.page), sc2 = await schermo(u.page);
    var guai = coerente(s, sc2);
    var fatto = { frecce: frecce(s), target: s.target, turno: s.archerIndex, sospese: (s.pendingArrows || []).length };
    var giusto = Object.keys(atteso).every(function (k) { return fatto[k] === atteso[k]; });
    prova(nome, giusto && guai.length === 0, JSON.stringify(fatto) + (guai.length ? " | " + guai.join("; ") : ""));
  }
  await tocco(".quick-btn.superspot");
  await controlla("tiro: 1 freccia in sospeso, turno di alez", { frecce: 1, sospese: 1, turno: 0, target: 1 });
  await annulla();
  await controlla("annulla: niente frecce, ancora alez", { frecce: 0, sospese: 0, turno: 0, target: 1 });
  await tocco(".quick-btn.spot");
  await controlla("tiro diverso: 1 freccia (spot)", { frecce: 1, sospese: 1, turno: 0, target: 1 });
  await tocco(".quick-btn.sagoma");
  await controlla("seconda freccia: la piazzola di alez si chiude, tocca a Bea", { frecce: 2, sospese: 0, turno: 1, target: 1 });
  await annulla();
  await controlla("annulla al cambio arciere: torna alez con una freccia in sospeso", { frecce: 1, sospese: 1, turno: 0, target: 1 });
  await tocco(".quick-btn.sagoma");
  await tocco(".quick-btn.superspot"); await tocco(".quick-btn.spot");
  await controlla("Bea chiude: si passa alla piazzola 2, tocca al primo", { frecce: 4, sospese: 0, target: 2 });
  await annulla();
  await controlla("annulla oltre la piazzola: torna la piazzola 1, Bea con una freccia", { frecce: 3, sospese: 1, target: 1, turno: 1 });
  await tocco(".quick-btn.zero");
  await controlla("ritirare dopo l'annulla: piazzola 2 di nuovo", { frecce: 4, sospese: 0, target: 2 });
  /* E LE ZONE DICONO DOVE, non solo quanto. Il nulla e' `zero` e non una casella
     vuota: un nulla VOLUTO deve distinguersi da una zona non registrata, che e'
     quello che si trova nei giri di prima del 20/09. */
  var sz = await stato(u.page);
  var tutteLeZone = [];
  Object.keys(sz.scores || {}).forEach(function (k) {
    (sz.scores[k] || []).forEach(function (e) { tutteLeZone = tutteLeZone.concat(e.zones || []); });
  });
  prova("ogni freccia salvata porta la sua zona",
        tutteLeZone.length === 4 && tutteLeZone.every(function (z) { return !!z; }),
        JSON.stringify(tutteLeZone) + " (attese 4)");
  prova("il nulla si chiama «zero», non una casella vuota", tutteLeZone.indexOf("zero") >= 0, JSON.stringify(tutteLeZone));
  prova("e le zone non sono tutte uguali (superspot, spot, sagoma, zero)",
        tutteLeZone.filter(function (z, i) { return tutteLeZone.indexOf(z) === i; }).length >= 3, JSON.stringify(tutteLeZone));
  await u.ctx.close();

  /* ── UN GIRO APERTO CON L'APP DI IERI ─────────────────────────────────────
     Ha `pendingArrows` e non ha `pendingZones`: ripreso oggi, i due elenchi
     devono pareggiarsi con dei buchi DICHIARATI, non scivolare di una
     posizione. E' il caso della finestra di aggiornamento. */
  console.log("\n  UN GIRO DI IERI, RIPRESO OGGI\n");
  var v = await apri(1, function (st) {
    st.pendingArrows = [20];      // una freccia gia' segnata ieri
    st.arrowIndex = 1;
    delete st.pendingZones;       // ieri le zone non esistevano
  });
  await v.page.evaluate(function () { var x = document.querySelector(".quick-btn.spot"); if (x) x.click(); });
  await v.page.waitForTimeout(500);
  var sv = await stato(v.page);
  var chiuse = (sv.scores[Object.keys(sv.scores)[0]] || [])[0];
  prova("la piazzola si chiude con due frecce", !!chiuse && chiuse.arrows.length === 2,
        JSON.stringify(chiuse && chiuse.arrows));
  // Difensiva di proposito: puntata su un'app senza zone questa prova deve
  // dire NO, non schiantarsi su `undefined.length`. Un banco che crasha non
  // dice quale invariante e' caduta.
  var zIeri = (chiuse && Array.isArray(chiuse.zones)) ? chiuse.zones : null;
  prova("la freccia di ieri ha una zona vuota, quella di oggi no",
        !!zIeri && zIeri.length === 2 && zIeri[0] === null && !!zIeri[1],
        JSON.stringify(chiuse && chiuse.zones));
  await v.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
