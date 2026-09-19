#!/usr/bin/env node
/* banco-esterni.js — se Google Fonts o gstatic non rispondono, l'app parte lo stesso.
 *
 *   node tests/banco-esterni.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-esterni.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (20/09/2026, fase 15.) Nel bosco la rete peggiore non e'
 * quella assente — lì il browser dice subito «niente» e l'app va avanti — ma
 * quella che «c'e' e non risponde»: una richiesta resta appesa per minuti.
 * Due richieste esterne stanno sulla strada dell'avvio:
 *   - il foglio di Google Fonts, che era bloccante e stava PRIMA dello script
 *     dell'app: finche' non arriva, lo script non parte;
 *   - le cinque librerie Firebase da gstatic, `defer`: l'app partiva a
 *     `DOMContentLoaded`, che le aspetta tutte.
 * Con una delle due appesa, schermo bianco — e il giro aperto irraggiungibile.
 *
 * COME FA. L'app in produzione (niente DEV_MODE, niente Firebase finto), con
 * fonts.googleapis.com, fonts.gstatic.com e www.gstatic.com che NON rispondono
 * mai (la richiesta resta appesa). Il telefono e' gia' configurato e ha un giro
 * aperto: entro pochi secondi l'app deve mostrarlo (modalita' locale).
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-esterni-"));
fs.writeFileSync(path.join(D, "app.html"), fs.readFileSync(SORGENTE, "utf8"));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi" }, profileSkipped: false,
  roundActive: true, mode: "round3d", format: 24, archers: [{ id: "a0", name: "mariorossi", isSelf: true }],
  archersBase: [{ id: "a0", name: "mariorossi", isSelf: true }], scores: { a0: [{ arrows: [16, 7], total: 23 }] },
  target: 2, archerIndex: 0, arrowIndex: 0, pendingArrows: [], liveBattutaTypes: {}, startedAt: Date.now() };

(async function () {
  var browser = await chromium.launch();
  async function prova1(nome, appesi, attesa) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    var tenuti = [];
    await ctx.route(/^https?:\/\//, function (r) {
      var u = r.request().url();
      if (appesi.some(function (h) { return u.indexOf(h) >= 0; })) { tenuti.push(r); return; }   // appesa: mai una risposta
      return r.abort();
    });
    await ctx.addInitScript(function (st) {
      try { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); } catch (e) {}
    }, STATO);
    var page = await ctx.newPage();
    page.goto(URL).catch(function () {});
    var visto = false, t0 = Date.now();
    while (Date.now() - t0 < attesa) {
      await page.waitForTimeout(250);
      var tx = await page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText : ""; }).catch(function () { return ""; });
      if (/Riprendi/.test(tx)) { visto = true; break; }
    }
    var ms = Date.now() - t0;
    prova(nome + ": il giro aperto si vede (" + (visto ? ms + " ms" : "mai in " + attesa + " ms") + ")", visto);
    await ctx.close();
  }
  console.log("\n  LA RETE CHE C'E' E NON RISPONDE\n");
  await prova1("Google Fonts appeso", ["fonts.googleapis.com", "fonts.gstatic.com"], 9000);
  await prova1("librerie Firebase (gstatic) appese", ["www.gstatic.com"], 9000);
  await prova1("tutti e due appesi", ["fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"], 9000);
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
