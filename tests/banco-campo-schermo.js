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

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc",
  theme: "light", profile: { nomeCognome: "Alessandro Zanetta", username: "alez" }, profileSkipped: false };

var SCHERMI = [
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
  await page.goto(URL);
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
      for (var k = 1; k <= 3; k++) {
        await A.ctx.setGeolocation({ latitude: 45.9210 + k * 0.00014, longitude: 8.5510, accuracy: 6 });
        await page.waitForTimeout(400);
      }
      m = await misura(page);
      prova("registrazione: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("registrazione: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      var punti = await page.evaluate(function () { var d = window.CampoMappaUI._reg.dati(); return d ? d.punti.length : -1; });
      prova("registrazione: i fix diventano punti", punti >= 2, punti);
      await page.click("text=Termina e salva");
      await page.waitForTimeout(300);

      // Segnala un problema, sempre senza rete.
      await page.click("text=Segnala problema");
      await page.waitForSelector(".fr-tipi");
      m = await misura(page);
      prova("segnalazione: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("segnalazione: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      await page.waitForFunction(function () { return !!window.CampoMappaUI._stato.pos; }, null, { timeout: 5000 });
      await page.fill(".campo-mappa textarea", "Albero caduto sulla piazzola 4");
      await page.click("text=Salva segnalazione");
      await page.waitForTimeout(300);

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
      m = await misura(page);
      prova("dettaglio: niente scorrimento orizzontale", m.scroll <= 0, m.scroll + " px");
      prova("dettaglio: tasti dentro lo schermo", !m.fuori.length, m.fuori.join("; "));
      prova("nessun errore JS", !A.errori.length, A.errori.join(" | "));
      await A.ctx.close();
    }
  } finally { await browser.close(); }
  console.log("\n" + ok + " ok, " + ko + " ko");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
