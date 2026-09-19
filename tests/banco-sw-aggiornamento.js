#!/usr/bin/env node
/* banco-sw-aggiornamento.js — una versione nuova non toglie l'app di mano.
 *
 *   node tests/banco-sw-aggiornamento.js
 *   APP=vecchia/app.html SW=vecchio/sw.js node tests/banco-sw-aggiornamento.js   # sabotaggio
 *
 * PERCHE' ESISTE. (19/09/2026, audit P0-3.) Tre pezzi, ognuno innocuo da solo:
 *   - `install` metteva in cassa ogni file con `.catch()` muto, anche app.html;
 *   - `activate` buttava subito tutte le cache con un altro nome;
 *   - la pagina ricaricava a `controllerchange`, anche a meta' giro.
 * Insieme: una versione pubblicata il giorno della gara, un 4G che cede a
 * meta' del download di app.html, e il telefono restava senza app offline —
 * con la pagina che si ricaricava da sola sotto il dito.
 *
 * COME FA. Come `banco-italia-offline`: l'app si serve da http e il service
 * worker vero si installa. Poi il server pubblica un sw.js NUOVO (solo
 * CACHE_NAME diverso) e:
 *   1. app.html arriva TRONCATO: l'aggiornamento non deve prendere il posto
 *      della versione buona, la pagina non si deve ricaricare, e senza rete
 *      l'app si deve aprire lo stesso;
 *   2. app.html arriva intero ma il giro e' aperto: niente ricarica fino alla
 *      fine del giro; poi si', e la cache nuova e' completa;
 *   3. senza rete, dopo l'aggiornamento, l'app si apre dalla cache nuova.
 *
 * Le librerie Firebase del service worker sono sostituite da uno stub: qui si
 * prova la cassa, non le notifiche (quelle le prova banco-push).
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), http = require("http");
var { chromium } = require("playwright");

var SRC_APP = process.env.APP || "app.html";
var SRC_SW = process.env.SW || "sw.js";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-sw-"));
var app = require("./copia-dev.js").accendiDev(fs.readFileSync(SRC_APP, "utf8"));
var GUARDIA = "if(!DEV_MODE && 'serviceWorker' in navigator){";
if (app.indexOf(GUARDIA) < 0) { console.log("  ✗ non trovo la registrazione del service worker"); process.exit(1); }
app = app.replace(GUARDIA, "if('serviceWorker' in navigator){");
fs.writeFileSync(path.join(D, "app.html"), app);
["index.html", "manifest.json", "compagnie-data.js", "logo.webp", "logo.jpg", "icon-192.png", "icon-512.png",
 "icon-512-maskable.png", "icon-192-maskable.png", "apple-touch-icon.png", "favicon.ico"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var STUB = "self.firebase = { initializeApp: function(){}, messaging: function(){ return { onBackgroundMessage: function(){} }; } };";
function scriviSw(versione) {
  var sw = fs.readFileSync(SRC_SW, "utf8");
  sw = sw.replace(/importScripts\("https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+"\);\r?\n/g, "");
  sw = STUB + "\n" + sw;
  var prima = sw;
  sw = sw.replace(/var CACHE_NAME = "[^"]+";/, 'var CACHE_NAME = "arctrail3d-prova-' + versione + '";');
  if (sw === prima) throw new Error("CACHE_NAME non trovato in " + SRC_SW);
  fs.writeFileSync(path.join(D, "sw.js"), sw);
}

var rotture = {};   // percorso → "tronca"
var TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  var f = path.join(D, p);
  if (!f.startsWith(D) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  var corpo = fs.readFileSync(f);
  var testata = { "Content-Type": TIPI[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" };
  if (rotture[p] === "tronca") {
    // Il 4G che cede a meta': la lunghezza dichiarata e' quella intera, ne arriva meta'.
    testata["Content-Length"] = corpo.length;
    res.writeHead(200, testata);
    res.write(corpo.slice(0, Math.floor(corpo.length / 2)));
    setTimeout(function () { req.socket.destroy(); }, 50);
    return;
  }
  res.writeHead(200, testata);
  res.end(corpo);
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function stato() {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: [{ code: "fiarc", tessera: "FI111" }] },
    profileSkipped: false, pendingArchers: [] };
}
async function tocca(page, t) {
  await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) x.click();
  }, t);
  await page.waitForTimeout(450);
}
async function premi(page, css) { await page.evaluate(function (c) { var x = document.querySelector(c); if (x) x.click(); }, css); await page.waitForTimeout(120); }
function testo(page) { return page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText.replace(/\s+/g, " ") : ""; }); }
function cassa(page) {
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
async function aggiorna(page) {
  await page.evaluate(function () {
    return navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update().catch(function () {}); });
  });
  await page.waitForTimeout(3000);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch();
  var misuraApp = fs.readFileSync(path.join(D, "app.html"), "utf8").length;   // in caratteri, come text()

  async function installaEComincia() {
    scriviSw(1);
    rotture = {};
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
    await ctx.addInitScript("try{ if(!localStorage.getItem('banco-seme')){ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(stato())) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); localStorage.setItem('banco-seme','1'); } }catch(e){}");
    var page = await ctx.newPage();
    var err = [];
    page.on("pageerror", function (e) { err.push(String(e.message)); });
    await page.goto(BASE + "/app.html");
    await page.evaluate(function () { return navigator.serviceWorker.ready; });
    await page.reload(); await page.waitForTimeout(1200);   // ora la pagina e' controllata
    await tocca(page, "Tira"); await tocca(page, "Gara libera"); await tocca(page, "Continua");
    await tocca(page, "Round 3D"); await tocca(page, "Inizia gara");
    for (var i = 0; i < 2; i++) { await premi(page, ".quick-btn.superspot"); await premi(page, ".quick-btn.spot"); }
    await page.waitForTimeout(400);
    await page.evaluate(function () { window.__marca = 42; });
    return { ctx: ctx, page: page, err: err };
  }

  // ── 1. aggiornamento con app.html troncato, a meta' giro ────────────────
  console.log("\n  UNA VERSIONE NUOVA CHE ARRIVA A META' (4G CHE CEDE), A GIRO APERTO\n");
  var a = await installaEComincia();
  prova("il giro e' aperto alla piazzola 3", /PIAZZOLA 3 \/ 24/i.test(await testo(a.page)));
  scriviSw(2);
  rotture["/app.html"] = "tronca";
  await aggiorna(a.page);
  var marcaA = await a.page.evaluate(function () { return window.__marca; });
  prova("la pagina NON si e' ricaricata sotto il dito", marcaA === 42);
  prova("il giro e' ancora sullo schermo", /PIAZZOLA 3 \/ 24/i.test(await testo(a.page)));
  var cA = await cassa(a.page);
  var vecchia = cA.filter(function (x) { return x.nome === "arctrail3d-prova-1"; })[0];
  prova("la cassa buona (versione 1) e' ancora li', con app.html intero",
        !!vecchia && vecchia.app >= misuraApp * 0.99, JSON.stringify(cA));
  prova("nessuna cassa nuova a meta' e' rimasta in giro",
        !cA.some(function (x) { return x.nome === "arctrail3d-prova-2" && x.app < misuraApp * 0.99; }), JSON.stringify(cA));
  await a.ctx.setOffline(true);
  var p2 = await a.ctx.newPage(); p2.on("pageerror", function (e) { a.err.push(String(e.message)); });
  await a.page.close(); a.page = p2;
  await a.page.goto(BASE + "/app.html").catch(function () {});
  await a.page.waitForTimeout(1500);
  prova("senza rete l'app si riapre, e il giro si riprende", /Riprendi percorso/.test(await testo(a.page)),
        (await testo(a.page)).slice(0, 100));
  await a.ctx.close();

  // ── 2. aggiornamento buono a giro aperto ────────────────────────────────
  console.log("\n  UNA VERSIONE NUOVA INTERA, A GIRO APERTO\n");
  var b = await installaEComincia();
  scriviSw(3);
  rotture = {};
  await aggiorna(b.page);
  prova("a giro aperto la pagina NON si ricarica", (await b.page.evaluate(function () { return window.__marca; })) === 42);
  prova("il giro e' ancora sullo schermo", /PIAZZOLA 3 \/ 24/i.test(await testo(b.page)));
  var cB = await cassa(b.page);
  var nuova = cB.filter(function (x) { return x.nome === "arctrail3d-prova-3"; })[0];
  prova("la cassa nuova e' completa", !!nuova && nuova.app >= misuraApp * 0.99, JSON.stringify(cB));
  prova("la cassa vecchia e' stata tolta", !cB.some(function (x) { return x.nome === "arctrail3d-prova-1"; }), JSON.stringify(cB));
  // Si finisce il giro: 22 piazzole restanti, due frecce ciascuna.
  for (var i = 0; i < 22; i++) { await premi(b.page, ".quick-btn.superspot"); await premi(b.page, ".quick-btn.spot"); }
  await b.page.waitForTimeout(800);
  prova("a fine giro (riepilogo) ancora nessuna ricarica", (await b.page.evaluate(function () { return window.__marca; })) === 42);
  await tocca(b.page, "Vedi classifica finale");
  await b.page.waitForTimeout(800);
  await tocca(b.page, "Torna al menu");
  await b.page.waitForTimeout(1500);
  var marcaB = await b.page.evaluate(function () { return window.__marca; }).catch(function () { return "ricaricata"; });
  prova("uscito dal giro, l'aggiornamento si applica (la pagina si ricarica)", marcaB !== 42, String(marcaB));

  // ── 3. dopo l'aggiornamento, senza rete ─────────────────────────────────
  console.log("\n  DOPO L'AGGIORNAMENTO, SENZA RETE\n");
  await b.ctx.setOffline(true);
  await b.page.reload().catch(function () {});
  await b.page.waitForTimeout(1500);
  prova("senza rete l'app si apre dalla cassa nuova", /PRONTO A TIRARE|Inizia un giro|Home/i.test(await testo(b.page)),
        (await testo(b.page)).slice(0, 100));
  prova("nessun errore in pagina", a.err.length === 0 && b.err.length === 0, (a.err.concat(b.err))[0]);
  await b.ctx.close();

  await browser.close();
  server.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); server.close(); process.exit(1); });
