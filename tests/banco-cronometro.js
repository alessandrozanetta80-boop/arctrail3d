#!/usr/bin/env node
/* banco-cronometro.js — lo schermo spento non ferma il cronometro.
 *
 *   node tests/banco-cronometro.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-cronometro.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (20/09/2026.) Il cronometro della piazzola toglieva un secondo
 * a ogni battito di `setInterval`. Con lo schermo spento o la pagina in secondo
 * piano il telefono rallenta o sospende quei battiti: il conto si fermava.
 * Adesso si calcola dall'ora di fine.
 *
 * COME FA. L'orologio finto di Playwright: si avvia un conto da 2:00, poi si
 * sposta l'ora di sistema di 90 secondi SENZA far scattare nessun battito (e'
 * cio' che fa uno schermo spento), e si lascia passare un solo battito. Il
 * numero deve dire ~0:29, non 1:59.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-crono-"));
fs.writeFileSync(path.join(D, "app.html"), accendiDev(fs.readFileSync(SORGENTE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "A Z", username: "alez" }, profileSkipped: false,
  roundActive: true, mode: "round3d", format: 24, archers: [{ id: "a0", name: "alez", isSelf: true }],
  archersBase: [{ id: "a0", name: "alez", isSelf: true }], scores: { a0: [] },
  target: 1, archerIndex: 0, arrowIndex: 0, pendingArrows: [], liveBattutaTypes: {}, startedAt: Date.now() };
function secondi(txt) { var m = String(txt || "").match(/(\d+):(\d\d)/); return m ? (+m[1]) * 60 + (+m[2]) : null; }

(async function () {
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(function (st) {
    try { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); } catch (e) {}
  }, STATO);
  var page = await ctx.newPage();
  await page.clock.install();
  await page.goto(URL);
  /* ══ SI ASPETTA UNA CONDIZIONE, NON UN NUMERO DI MILLISECONDI ════════════
     (20/09/2026.) Qui c'erano tre `clock.runFor()` con dei numeri: 1500 per
     l'avvio, 600 per il ridisegno, 300 per il pannello. Con l'orologio finto
     quei numeri fanno avanzare il tempo VIRTUALE, ma l'avvio dell'app costa
     tempo VERO — leggere un megabyte e mezzo di sorgente, costruire la
     schermata — e su una macchina occupata non basta. Il banco diceva no con
     «letto null», cioe' «la schermata non c'era ancora», che non ha niente a
     che vedere col cronometro.
     E' la C24 dei diari: 164 attese a tempo fisso e nessuna su una
     condizione. Qui si aspetta l'elemento, con un tetto vero. */
  await page.waitForFunction(function () { return !!document.querySelector(".home-riprendi, .chip-timer"); },
                             null, { timeout: 20000 });
  await page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
  await page.waitForSelector(".chip-timer", { timeout: 20000 });
  // Si apre il cronometro e si avvia (2:00 di partenza).
  await page.evaluate(function () { var c = document.querySelector(".chip-timer"); if (c) c.click(); });
  await page.waitForFunction(function () {
    return Array.prototype.some.call(document.querySelectorAll("button"), function (x) { return /Via|Avvia|Start|Parti/i.test(x.textContent); });
  }, null, { timeout: 20000 });
  var avviato = await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("button"), function (x) { return /Via|Avvia|Start|Parti/i.test(x.textContent); })[0];
    if (b) { b.click(); return true; } return false;
  });
  await page.clock.runFor(2100);
  function letto() { return page.evaluate(function () { var n = document.querySelector(".chip-timer .chip-num"); return n ? n.textContent : ""; }); }
  var t0 = secondi(await letto());
  prova("il cronometro parte", avviato && t0 !== null && t0 <= 119 && t0 >= 116, "letto " + t0);
  // Schermo spento: 90 secondi passano, nessun battito scatta.
  var ora = await page.evaluate(function () { return Date.now(); });
  await page.clock.setSystemTime(ora + 90000);
  await page.clock.runFor(1000);                      // un battito solo, al risveglio
  var t1 = secondi(await letto());
  prova("dopo 90 s a schermo spento il conto dice ~0:27 (non ~1:57)", t1 !== null && t1 >= 24 && t1 <= 30, "letto " + t1);
  // E finisce quando deve.
  await page.clock.runFor(32000);
  var t2 = await letto();
  prova("finito il tempo, il conto e' a 0:00", secondi(t2) === 0 || /0:00/.test(t2), "letto " + t2);
  await ctx.close();
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
