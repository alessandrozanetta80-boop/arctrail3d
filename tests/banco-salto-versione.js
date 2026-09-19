#!/usr/bin/env node
/* banco-salto-versione.js — il telefono fermo da settimane si aggiorna, e non
 * perde niente per strada.
 *
 *   node tests/banco-salto-versione.js
 *   VECCHIO=<commit> node tests/banco-salto-versione.js   # un'altra base
 *   NUOVO=<commit>   node tests/banco-salto-versione.js   # sabotaggio: «oggi» e' un commit
 *
 * PERCHE' ESISTE. (20/09/2026, risanamento notturno.) Tutti i banchi del
 * service worker provano il salto di UNA versione: da quella di ieri a quella
 * di oggi. Nessuno provava il salto vero, quello che succede in gara:
 *
 *   «l'utente non apre ArcTrail da due mesi. Apre l'app. Dentro c'e' la
 *    versione di allora, con i suoi dati di allora.»
 *
 * Fra le due versioni sono cambiati il nome della cassa, i file della shell,
 * lo schema dei punteggi IFAA, i nomi dei temi, ed e' nato il `roundId`. Ogni
 * pezzo e' stato provato da solo; il salto intero, da una parte all'altra, no.
 *
 * COSA PROVA, in ordine:
 *   1. si installa la versione VECCHIA vera (presa dalla storia del progetto,
 *      non una finta), e si controlla che sia davvero installata;
 *   2. si mettono in casa DATI DI ALLORA: uno storico con `modeKey:"ifaa_3d"`
 *      (lo schema di prima del 28/08), un riepilogo permanente con le stesse
 *      chiavi, un tema che si chiamava "elegante", un giro aperto SENZA
 *      `roundId` (non esisteva);
 *   3. si pubblica la versione di OGGI e si chiede l'aggiornamento;
 *   4. la versione nuova prende il comando, la cassa nuova e' completa e
 *      quella vecchia se n'e' andata;
 *   5. senza rete l'app si apre lo stesso, ed e' quella NUOVA;
 *   6. i dati di allora ci sono ancora: i giri nello storico sono gli stessi,
 *      lo schema IFAA e' stato migrato, il tema ha un nome che esiste, il
 *      giro aperto si riprende e adesso ha un `roundId`.
 *
 * Il punto 6 e' il motivo del banco: un aggiornamento che «funziona» ma
 * lascia indietro lo storico di due mesi e' un danno peggiore di uno che non
 * parte, perche' nessuno se ne accorge finche' non va a cercare un giro.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), http = require("http");
var { execFileSync } = require("child_process");
var { chromium } = require("playwright");

var VECCHIO = process.env.VECCHIO || "e8841b2";          // 29/08/2026, cassa v156
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-salto-"));
var accendiDev = require("./copia-dev.js").accendiDev;

function daGit(commit, file) {
  return execFileSync("git", ["show", commit + ":" + file], { maxBuffer: 1 << 28 }).toString("utf8");
}
var STUB = "self.firebase = { initializeApp: function(){}, messaging: function(){ return { onBackgroundMessage: function(){} }; } };";
function preparaSw(testo) {
  testo = testo.replace(/importScripts\("https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+"\);\r?\n/g, "");
  return STUB + "\n" + testo;
}
/* Il service worker si registra solo fuori da DEV_MODE: qui DEV_MODE serve
   (niente Firebase vero), quindi si toglie la guardia. Vale per tutte e due
   le versioni, e se il gancio non c'e' il banco lo dice invece di passare. */
function preparaApp(testo) {
  var app = accendiDev(testo);
  var GUARDIA = "if(!DEV_MODE && 'serviceWorker' in navigator){";
  if (app.indexOf(GUARDIA) < 0) throw new Error("registrazione del service worker non trovata");
  return app.replace(GUARDIA, "if('serviceWorker' in navigator){");
}

var appVecchia = preparaApp(daGit(VECCHIO, "app.html"));
/* NUOVO=<commit> per il sabotaggio: si fa arrivare una versione «di oggi»
   presa dalla storia, e si guarda se il banco se ne accorge. */
var NUOVO = process.env.NUOVO || "";
function oggi(file) { return NUOVO ? daGit(NUOVO, file) : fs.readFileSync(file, "utf8"); }
var appNuova = preparaApp(oggi("app.html"));
var swVecchio = preparaSw(daGit(VECCHIO, "sw.js"));
var swNuovo = preparaSw(oggi("sw.js"));
var cassaVecchia = (daGit(VECCHIO, "sw.js").match(/var CACHE_NAME = "([^"]+)"/) || [])[1];
var cassaNuova = (oggi("sw.js").match(/var CACHE_NAME = "([^"]+)"/) || [])[1];
var timbroNuovo = (oggi("app.html").match(/var BUILD_STAMP = "([^"]+)"/) || [])[1];

/* I file di contorno: si prendono da oggi. Sono icone e foto — la versione
   vecchia non li legge diversamente, e servono solo a non far fallire la
   precarica per un 404. */
["index.html", "manifest.json", "compagnie-data.js", "logo.webp", "logo.jpg", "icon-192.png",
 "icon-512.png", "icon-512-maskable.png", "icon-192-maskable.png", "apple-touch-icon.png",
 "favicon.ico"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });

function pubblica(quale) {
  fs.writeFileSync(path.join(D, "app.html"), quale === "vecchia" ? appVecchia : appNuova);
  fs.writeFileSync(path.join(D, "sw.js"), quale === "vecchia" ? swVecchio : swNuovo);
}

var TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  var f = path.join(D, p);
  if (!f.startsWith(D) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  var corpo = fs.readFileSync(f);
  res.writeHead(200, { "Content-Type": TIPI[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(corpo);
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

/* ── I DATI DI ALLORA ──────────────────────────────────────────────────────
   Non inventati: ogni pezzo e' una forma che l'app ha davvero scritto sul
   telefono di qualcuno, e che il codice di oggi dichiara di saper leggere. */
var ORA = Date.now();
function giroVecchio(giorniFa, modeKey) {
  return { id: "g" + giorniFa, date: new Date(ORA - giorniFa * 86400000).toISOString(),
           modeKey: modeKey, modeLabel: "IFAA 3D", format: 28, total: 300 + giorniFa,
           archers: [{ id: "a0", name: "mariorossi", isSelf: true, total: 300 + giorniFa }] };
}
var STORICO_ALLORA = [giroVecchio(3, "ifaa_3d"), giroVecchio(10, "ifaa_3d"), giroVecchio(40, "round3d")];
var LIFETIME_ALLORA = {};
LIFETIME_ALLORA["it|fiarc|ifaa_3d"] = { rounds: 12, arrows: 672, sum: 3400, best: 320 };
LIFETIME_ALLORA["it|fiarc|round3d"] = { rounds: 5, arrows: 240, sum: 1500, best: 340 };
/* Un giro APERTO, com'era prima che nascesse il `roundId`. */
var STATO_ALLORA = {
  screen: "round", tab: "home", lang: "it", country: "it", federation: "fiarc",
  theme: "elegante",                       // nome di tema di allora
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: [{ code: "fiarc", tessera: "FI111" }] },
  profileSkipped: false, pendingArchers: [],
  roundActive: true, mode: "round3d", modeKey: "round3d", format: 24,
  archers: [{ id: "a0", name: "mariorossi", isSelf: true }],
  archersBase: [{ id: "a0", name: "mariorossi", isSelf: true }],
  scores: { a0: [11, 10, 11, 5] }, target: 3, archerIndex: 0, arrowIndex: 0,
  pendingArrows: [], liveBattutaTypes: {}, startedAt: ORA - 3600000
};

function seme() {
  var s = {};
  s["arctrail3d_state_v3"] = JSON.stringify(STATO_ALLORA);
  s["arctrail3d_storico_v1"] = JSON.stringify(STORICO_ALLORA);
  s["arctrail3d_lifetime_v1"] = JSON.stringify(LIFETIME_ALLORA);
  s["arctrail3d_welcome_v2"] = "1";
  return "try{ if(!localStorage.getItem('banco-seme')){ localStorage.setItem('banco-seme','1');" +
    Object.keys(s).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(s[k]) + ");"; }).join("") +
    " } }catch(e){}";
}

function testo(page) { return page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText.replace(/\s+/g, " ") : ""; }); }
function casse(page) {
  return page.evaluate(function () {
    return caches.keys().then(function (k) {
      return Promise.all(k.map(function (n) {
        return caches.open(n).then(function (c) { return c.match("app.html"); }).then(function (r) {
          return r ? r.text().then(function (t) { return { nome: n, app: t.length }; }) : { nome: n, app: 0 };
        });
      }));
    });
  });
}
function inCasa(page) {
  return page.evaluate(function () {
    function leggi(k, d) { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return null; } }
    return { stato: leggi("arctrail3d_state_v3", "{}"), storico: leggi("arctrail3d_storico_v1", "[]"),
             lifetime: leggi("arctrail3d_lifetime_v1", "{}") };
  });
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch();
  var misuraNuova = appNuova.length;

  console.log("\n  IL TELEFONO FERMO DA SETTIMANE (" + cassaVecchia + " → " + cassaNuova + ")\n");
  pubblica("vecchia");
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.addInitScript(seme());
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(BASE + "/app.html");
  await page.evaluate(function () { return navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForTimeout(1500);

  var c0 = await casse(page);
  prova("la versione vecchia e' installata davvero", c0.some(function (x) { return x.nome === cassaVecchia && x.app > 1000; }), JSON.stringify(c0));
  var t0 = await testo(page);
  prova("e mostra il giro di allora", /piazzola/i.test(t0), t0.slice(0, 120));

  // ── ARRIVA LA VERSIONE DI OGGI ─────────────────────────────────────────
  console.log("\n  ARRIVA LA VERSIONE DI OGGI\n");
  pubblica("nuova");
  await page.evaluate(function () {
    return navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update().catch(function () {}); });
  });
  await page.waitForTimeout(4000);
  var c1 = await casse(page);
  prova("la cassa nuova c'e' ed e' completa",
        c1.some(function (x) { return x.nome === cassaNuova && x.app >= misuraNuova * 0.99; }), JSON.stringify(c1));

  /* Il giro e' aperto: l'aggiornamento NON deve entrare adesso. Si esce dal
     giro — si chiude dal menu — e solo allora la pagina si ricarica. */
  await page.evaluate(function () { window.__marca = 42; });
  prova("a giro aperto la pagina non si e' ricaricata sotto il dito",
        (await page.evaluate(function () { return window.__marca; })) === 42);

  await page.reload(); await page.waitForTimeout(2500);
  var timbro = await page.evaluate(function () { return typeof BUILD_STAMP === "string" ? BUILD_STAMP : (window.BUILD_STAMP || "?"); }).catch(function () { return "?"; });
  var html = await page.content();
  prova("dopo la ricarica in pagina c'e' la versione di oggi",
        html.indexOf(timbroNuovo) > 0, "cerco " + timbroNuovo + " · trovato " + timbro);
  var c2 = await casse(page);
  prova("la cassa vecchia se n'e' andata", !c2.some(function (x) { return x.nome === cassaVecchia; }), JSON.stringify(c2));

  // ── SENZA RETE ─────────────────────────────────────────────────────────
  console.log("\n  E SENZA RETE, COME IN BOSCO\n");
  await ctx.setOffline(true);
  await page.reload().catch(function () {});
  await page.waitForTimeout(2000);
  var t1 = await testo(page);
  prova("senza rete l'app si apre lo stesso", t1.length > 40, t1.slice(0, 120));
  var html2 = await page.content();
  prova("ed e' la versione di oggi, non quella di allora", html2.indexOf(timbroNuovo) > 0);

  // ── I DATI DI ALLORA ───────────────────────────────────────────────────
  console.log("\n  I DATI DI ALLORA SONO ANCORA QUI\n");
  await ctx.setOffline(false);
  var casa = await inCasa(page);
  prova("lo storico ha ancora tutti i giri", (casa.storico || []).length === STORICO_ALLORA.length,
        JSON.stringify((casa.storico || []).map(function (h) { return h.modeKey; })));
  prova("lo schema IFAA di allora e' stato migrato, non buttato",
        (casa.storico || []).filter(function (h) { return h.modeKey === "ifaa_3d_v1"; }).length === 2,
        JSON.stringify((casa.storico || []).map(function (h) { return h.modeKey; })));
  prova("il riepilogo permanente ha seguito lo stesso spostamento",
        !!casa.lifetime && !!casa.lifetime["it|fiarc|ifaa_3d_v1"] && !casa.lifetime["it|fiarc|ifaa_3d"],
        JSON.stringify(Object.keys(casa.lifetime || {})));
  prova("i giri contati nel riepilogo non sono spariti",
        !!casa.lifetime && casa.lifetime["it|fiarc|ifaa_3d_v1"] && casa.lifetime["it|fiarc|ifaa_3d_v1"].rounds === 12,
        JSON.stringify(casa.lifetime && casa.lifetime["it|fiarc|ifaa_3d_v1"]));
  var tema = await page.evaluate(function () { return document.documentElement.getAttribute("data-theme") || document.body.className; });
  prova("il tema di allora ha un nome che esiste ancora oggi", !/elegante/.test(String(tema)) && String(tema).length > 0, String(tema));
  prova("il giro aperto si riprende", casa.stato && casa.stato.roundActive === true, JSON.stringify(casa.stato && casa.stato.screen));
  prova("e adesso ha un roundId, che allora non esisteva",
        !!(casa.stato && typeof casa.stato.roundId === "string" && casa.stato.roundId.length > 8),
        JSON.stringify(casa.stato && casa.stato.roundId));
  prova("nessun errore in pagina durante tutto il salto", err.length === 0, err[0]);

  await ctx.close();
  await browser.close();
  server.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", e && e.stack || e); process.exit(1); });
