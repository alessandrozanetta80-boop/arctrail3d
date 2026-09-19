#!/usr/bin/env node
/* banco-accessibile.js — l'accessibilità minima, quella che si rompe in silenzio.
 *
 *   node tests/banco-accessibile.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-accessibile.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (20/09/2026, fase 21.) Non è un progetto WCAG intero: sono i
 * difetti evidenti che l'audit ha trovato e che nessun banco vedeva.
 *   - le finestre che coprono lo schermo erano `div` e basta: col TAB si usciva
 *     e si premevano cose dietro, e chi usa un lettore di schermo non sapeva
 *     nemmeno che ci fossero;
 *   - la X che chiude Classifica e Sagoma era 36x36, il cronometro alto 32;
 *   - lo zoom con due dita era bloccato (lo prova controlla-pwa.js);
 *   - i campi di testo senza etichetta.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-a11y-"));
fs.writeFileSync(path.join(D, "app.html"), accendiDev(fs.readFileSync(SORGENTE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function stato(extra) {
  var s = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "A Z", username: "alez" }, profileSkipped: false };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}
function giro() {
  return stato({ roundActive: true, mode: "round3d", format: 24,
    archers: [{ id: "a0", name: "alez", isSelf: true }, { id: "a1", name: "Bea", isSelf: false }],
    archersBase: [{ id: "a0", name: "alez", isSelf: true }, { id: "a1", name: "Bea", isSelf: false }],
    scores: { a0: [], a1: [] }, target: 1, archerIndex: 0, arrowIndex: 0, pendingArrows: [], liveBattutaTypes: {}, startedAt: Date.now() });
}

(async function () {
  var browser = await chromium.launch();
  async function apri(st, senzaBenvenuto) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
    await ctx.addInitScript(function (a) {
      try {
        localStorage.setItem("arctrail3d_state_v3", JSON.stringify(a[0]));
        if (a[1]) localStorage.setItem("arctrail3d_welcome_v2", "1");
      } catch (e) {}
    }, [st, !!senzaBenvenuto]);
    var page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(900);
    return { ctx: ctx, page: page };
  }

  console.log("\n  LA FINESTRA CHE COPRE LO SCHERMO\n");
  var a = await apri(stato(), false);
  var f = await a.page.evaluate(function () {
    var ov = document.getElementById("welcomeNote");
    if (!ov) return { manca: true };
    var tit = ov.getAttribute("aria-labelledby");
    return { ruolo: ov.getAttribute("role"), modale: ov.getAttribute("aria-modal"),
             titolo: !!(tit && document.getElementById(tit)),
             dentro: ov.contains(document.activeElement) };
  });
  prova("e' una finestra di dialogo dichiarata", !f.manca && f.ruolo === "dialog" && f.modale === "true", JSON.stringify(f));
  prova("ha un titolo che la nomina", !!f.titolo);
  prova("il fuoco entra dentro", f.dentro === true);
  // TAB in fondo torna all'inizio: non si esce dalla finestra.
  var giri = await a.page.evaluate(function () {
    var ov = document.getElementById("welcomeNote");
    for (var i = 0; i < 12; i++) {
      var ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      (document.activeElement || ov).dispatchEvent(ev);
    }
    return ov.contains(document.activeElement);
  });
  prova("col TAB non si esce dalla finestra", giri === true);
  var esc = await a.page.evaluate(function () {
    var ov = document.getElementById("welcomeNote");
    ov.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return { aperta: !!document.getElementById("welcomeNote"), fuoco: document.activeElement ? document.activeElement.tagName : "?" };
  });
  prova("ESC la chiude", esc.aperta === false);
  await a.ctx.close();

  console.log("\n  I BERSAGLI CHE SI PREMONO CAMMINANDO\n");
  var b = await apri(giro(), true);
  await b.page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
  await b.page.waitForTimeout(600);
  // Prima la pista com'e', poi si apre il pannello (che copre la scena).
  var vivo = await b.page.evaluate(function () {
    var s = document.querySelector(".pista-scena"), st = document.querySelector(".pista-stato");
    return { scena: s ? s.getAttribute("aria-live") : null, stato: st ? st.getAttribute("role") : null };
  });
  prova("la scena si annuncia da sola (aria-live)", vivo.scena === "polite", JSON.stringify(vivo));
  prova("lo stato del salvataggio si annuncia (role=status)", vivo.stato === "status", JSON.stringify(vivo));
  var mis = await b.page.evaluate(function () {
    function m(sel) { var e = document.querySelector(sel); if (!e) return null; var r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }
    var cla = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) { return /Classifica/.test(x.textContent); })[0];
    if (cla) cla.click();
    return new Promise(function (r) { setTimeout(function () { r({ chiudi: m(".pannello-chiudi"), timer: m(".chip-timer") }); }, 400); });
  });
  prova("la X che chiude il pannello e' almeno 44x44", !!mis.chiudi && mis.chiudi.w >= 44 && mis.chiudi.h >= 44, JSON.stringify(mis.chiudi));
  prova("il cronometro e' alto almeno 44", !!mis.timer && mis.timer.h >= 44, JSON.stringify(mis.timer));
  await b.ctx.close();

  console.log("\n  I CAMPI HANNO UN'ETICHETTA\n");
  var c = await apri(stato({ screen: "profile-edit" }), true);
  await c.page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
  await c.page.waitForTimeout(700);
  var senza = await c.page.evaluate(function () {
    return Array.prototype.filter.call(document.querySelectorAll("#app input, #app textarea, #app select"), function (e) {
      if (e.type === "hidden" || e.type === "checkbox" || e.type === "radio") return false;
      if (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || e.getAttribute("placeholder") || e.getAttribute("title")) return false;
      if (e.id && document.querySelector('label[for="' + e.id + '"]')) return false;
      return !e.closest("label");
    }).map(function (e) { return (e.id || e.className || e.tagName); });
  });
  prova("nessun campo del profilo senza etichetta o segnaposto", senza.length === 0, senza.join(", "));
  await c.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
