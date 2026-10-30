#!/usr/bin/env node
/* banco-home-periodi.js — il periodo della Home: questo mese, 3 mesi,
 * stagione, 1 anno. Stessa definizione del Diario, scelta ricordata, giri
 * intatti, nessuna lettura dal cloud per cambiare periodo.
 *
 *   node tests/banco-home-periodi.js
 *   APP=percorso node tests/banco-home-periodi.js   # sabotaggio
 *
 * (22/09/2026, chiesto da Alessandro.) L'app gira sul suo percorso di
 * produzione (firebase-finto.js), senza rete.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-periodi-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { serie: function(p){ var v = homeFinestra; homeFinestra = p; var n = homeSerie().length; homeFinestra = v; return n; } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var U = { uid: "uidMario", email: "mario@esempio.it" };
var ORA = Date.now(), GIORNO = 86400000;
function giro(giorniFa, tot) {
  return { date: new Date(ORA - giorniFa * GIORNO).toISOString(), modeKey: "round3d", modeLabel: "Round 3D", format: 24, sessionType: "3d",
    results: [{ name: "mariorossi", total: tot, isSelf: true, ownerUid: U.uid, perTarget: new Array(24).fill(10) }] };
}
/* Le finestre, calcolate qui come le definisce il Diario: 31, 92 giorni, dal
   1° gennaio, 365. Se l'app cambia definizione, il banco lo vede. */
function inizio(p) {
  if (p === "3") return ORA - 92 * GIORNO;
  if (p === "a") return ORA - 365 * GIORNO;
  if (p === "y") { var g = new Date(ORA); g.setMonth(0, 1); g.setHours(0, 0, 0, 0); return g.getTime(); }
  return ORA - 31 * GIORNO;
}
function attesi(storico, p) {
  var dentro = storico.filter(function (g) { return new Date(g.date).getTime() >= inizio(p); });
  var tot = dentro.map(function (g) { return g.results[0].total; });
  return { giri: dentro.length, media: tot.length ? Math.round(tot.reduce(function (a, b) { return a + b; }, 0) / tot.length) : null,
           record: tot.length ? Math.max.apply(null, tot) : null, piazzole: dentro.length * 24 };
}
var ETICHETTA = { m: "Questo mese", "3": "3 mesi", y: "Stagione", a: "1 anno" };
var STATO = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email }, profileSkipped: false, pendingArchers: [] };

async function apri(browser, storico, opz) {
  opz = opz || {};
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  var cloud = { users: {}, public_profiles: {} };
  cloud.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi", privacy: true, terms: true };
  cloud["users/" + U.uid + "/storico"] = {};
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(STATO)) + ");" +
    "localStorage.setItem('arctrail3d_storico_v1'," + JSON.stringify(JSON.stringify(storico)) + ");" +
    "localStorage.setItem('arctrail3d_proprietario_v1','" + U.uid + "');" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return { ctx: ctx, page: page, errori: errori };
}
function leggi(page) {
  return page.evaluate(function () {
    var sez = document.querySelector(".home-mese");
    if (!sez) return null;
    var eti = (sez.querySelector(".home-periodo-scelta .home-mese-eti") || {}).textContent || "";
    var voci = Array.prototype.map.call(sez.querySelectorAll(".home-mese-barra .hm-voce"), function (e) {
      return { v: (e.querySelector("b") || {}).textContent, i: (e.querySelector("i") || {}).textContent || "" };
    });
    function cerca(re) { var x = voci.filter(function (v) { return re.test(v.i); })[0]; return x ? +x.v : null; }
    return { eti: eti, media: cerca(/media/i), giri: cerca(/^giri$/i), record: cerca(/record/i), piazzole: cerca(/piazzole/i),
             vuoto: /Nessun giro in questo periodo/.test(sez.innerText), menu: !!sez.querySelector(".home-periodi"),
             storico: localStorage.getItem("arctrail3d_storico_v1"),
             letture: ((window.__letture || {})["users/uidMario/storico"] || 0) };
  });
}
async function scegli(page, p) {
  await page.evaluate(function () { var b = document.querySelector(".home-periodo-scelta"); if (b) b.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(function (pp) { var v = document.querySelector('.home-periodo-voce[data-periodo="' + pp + '"]'); if (v) v.click(); }, p);
  await page.waitForTimeout(250);
}

(async function () {
  var browser = await chromium.launch();
  var STORICO = [giro(2, 250), giro(10, 240), giro(40, 230), giro(80, 220), giro(150, 210), giro(300, 200), giro(420, 190)];

  console.log("\n  I QUATTRO PERIODI\n");
  var a = await apri(browser, STORICO);
  var r0 = await leggi(a.page);
  var e0 = attesi(STORICO, "m");
  prova("default: «Questo mese»", r0 && r0.eti === ETICHETTA.m, r0 && r0.eti);
  prova("default: numeri degli ultimi 31 giorni", r0 && r0.giri === e0.giri && r0.media === e0.media && r0.record === e0.record && r0.piazzole === e0.piazzole,
        JSON.stringify({ app: r0, attesi: e0 }));
  prova("il menu non e' aperto finche' non lo si tocca", r0 && !r0.menu);
  var storicoPrima = r0.storico, lettureDopoApertura = r0.letture;
  for (var p of ["3", "y", "a", "m"]) {
    await scegli(a.page, p);
    var r = await leggi(a.page), e = attesi(STORICO, p);
    prova(ETICHETTA[p] + ": etichetta e numeri (" + e.giri + " giri, media " + e.media + ")",
          r.eti === ETICHETTA[p] && r.giri === e.giri && r.media === e.media && r.record === e.record && r.piazzole === e.piazzole && !r.menu,
          JSON.stringify({ app: { eti: r.eti, giri: r.giri, media: r.media, record: r.record, piazzole: r.piazzole, menu: r.menu }, attesi: e }));
    if (p !== "a") {
      var nd = await a.page.evaluate(function (pp) { return window.__prova.serie(pp); }, p);
      prova(ETICHETTA[p] + ": stessi giri dell'andamento del Diario (" + nd + ")", nd === e.giri, "diario " + nd + ", home " + r.giri);
    }
  }
  var rf = await leggi(a.page);
  prova("cambiare periodo non tocca i giri (storico identico)", rf.storico === storicoPrima);
  prova("cambiare periodo non legge niente dal cloud", rf.letture === lettureDopoApertura, "letture " + lettureDopoApertura + " → " + rf.letture);
  prova("nessun errore in pagina", a.errori.length === 0, a.errori.slice(0, 2).join(" | "));

  console.log("\n  LA SCELTA SI RICORDA, ANCHE SENZA RETE\n");
  await scegli(a.page, "3");
  await a.page.reload();
  await a.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await a.page.waitForTimeout(1200);
  var rr = await leggi(a.page);
  prova("riaprendo resta «3 mesi»", rr.eti === ETICHETTA["3"], rr.eti);
  await a.ctx.setOffline(true);
  await a.page.reload();
  await a.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await a.page.waitForTimeout(1200);
  await scegli(a.page, "y");
  var ro = await leggi(a.page), eo = attesi(STORICO, "y");
  prova("senza rete si cambia periodo lo stesso", ro.eti === ETICHETTA.y && ro.giri === eo.giri, JSON.stringify({ eti: ro.eti, giri: ro.giri }));
  await a.ctx.close();

  console.log("\n  PERIODO VUOTO, TANTI GIRI\n");
  var b = await apri(browser, [giro(100, 200), giro(200, 210)]);
  var rb = await leggi(b.page);
  prova("nessun giro negli ultimi 31 giorni: lo dice, niente fila di zeri", rb.vuoto && rb.giri === null && rb.media === null, JSON.stringify(rb && { vuoto: rb.vuoto, giri: rb.giri }));
  await scegli(b.page, "a");
  var rb2 = await leggi(b.page);
  prova("...e scegliendo 1 anno i due giri tornano", !rb2.vuoto && rb2.giri === 2, JSON.stringify({ vuoto: rb2.vuoto, giri: rb2.giri }));
  await b.ctx.close();
  var tanti = []; for (var i = 0; i < 150; i++) tanti.push(giro(i * 2 + 1.5, 200 + (i % 50)));   // mezza giornata: mai sul bordo della finestra
  var c = await apri(browser, tanti);
  for (var q of ["m", "3", "y", "a"]) {
    await scegli(c.page, q);
    var rc = await leggi(c.page), ec = attesi(tanti, q);
    prova("150 giri, " + ETICHETTA[q] + ": " + ec.giri + " giri, media " + ec.media, rc.giri === ec.giri && rc.media === ec.media && rc.record === ec.record,
          JSON.stringify({ app: { giri: rc.giri, media: rc.media, record: rc.record }, attesi: ec }));
  }
  await c.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e2) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
