#!/usr/bin/env node
/* banco-italia-offline.js — l'app installata si apre e segna senza rete.
 *
 *   node tests/banco-italia-offline.js            # prova
 *   node tests/banco-italia-offline.js --sabota   # sw.js senza app.html fra i file dell'app: deve diventare rosso
 *
 * Nato il 18/09/2026 («Arc Trail Italia ready», fase 12). Le altre prove
 * aprono l'app da file://, dove il service worker non esiste: dicono che la
 * logica regge senza rete, non che l'APP SI APRE senza rete. Qui si fa come
 * un telefono: l'app si serve da http, il service worker si installa e mette
 * in cassa i suoi file, poi si stacca la rete e si ricarica.
 *
 * Tre strade, tutte senza rete:
 *   1. riaprire l'app: la Home c'e';
 *   2. FIARC Round 3D: Tira → formato → tre piazzole → chiudere l'app →
 *      riaprirla → «Riprendi percorso» → si riparte dalla quarta;
 *   3. FITARCO 3D: una piazzola segnata col barème FITARCO.
 * Poi si riattacca la rete: il giro in corso e' ancora li', uguale.
 *
 * LA COPIA NON E' L'APP. Il service worker si registra solo fuori da DEV_MODE
 * (in DEV_MODE l'app non parla con Firebase, ed e' l'unico modo di provarla
 * senza account). Nella copia la guardia si toglie: e' l'unica differenza, e
 * sta scritta qui. La sincronizzazione con Firebase vero non si prova da qui:
 * la coda verso il cloud la prova banco-giro-sicuro con una nube finta.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), http = require("http");
var { chromium } = require("playwright");

var SABOTA = process.argv.indexOf("--sabota") !== -1;
var D = path.join(os.tmpdir(), "arctrail-banco-italia-offline");
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(D, { recursive: true });
var app = require("./copia-dev.js").accendiDev(fs.readFileSync("app.html", "utf8"));
var GUARDIA = "if(!DEV_MODE && 'serviceWorker' in navigator){";
if (app.indexOf(GUARDIA) < 0) { console.log("  ✗ non trovo la registrazione del service worker"); process.exit(1); }
app = app.replace(GUARDIA, "if('serviceWorker' in navigator){");
fs.writeFileSync(path.join(D, "app.html"), app);
var sw = fs.readFileSync("sw.js", "utf8");
if (SABOTA) { sw = sw.replace('  "app.html",\n', "").replace('  "app.html",\r\n', ""); console.log("\n  (SABOTAGGIO: app.html tolta dai file dell'app in sw.js)"); }
fs.writeFileSync(path.join(D, "sw.js"), sw);
["index.html", "manifest.json", "compagnie-data.js", "logo.webp", "logo.jpg", "icon-192.png", "icon-512.png",
 "icon-512-maskable.png", "icon-192-maskable.png", "apple-touch-icon.png", "favicon.ico"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon" };
var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  var f = path.join(D, p);
  if (!f.startsWith(D) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TIPI[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function stato(fed) {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: fed, theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi",
      federazioni: [{ code: "fiarc", tessera: "FI111" }, { code: "fitarco", tessera: "FT222" }] },
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
async function premi(page, css) { await page.evaluate(function (c) { var x = document.querySelector(c); if (x) x.click(); }, css); await page.waitForTimeout(150); }
function testo(page) { return page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText.replace(/\s+/g, " ") : ""; }); }

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch();

  async function installa(fed) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
    await ctx.addInitScript("try{ if(!localStorage.getItem('banco-seme')){ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(stato(fed))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); localStorage.setItem('banco-seme','1'); } }catch(e){}");
    var page = await ctx.newPage();
    var err = [];
    page.on("pageerror", function (e) { err.push(String(e.message)); });
    await page.goto(BASE + "/app.html");
    await page.waitForTimeout(1200);
    var pronto = await page.evaluate(function () {
      return Promise.race([
        navigator.serviceWorker.ready.then(function () { return caches.keys(); }).then(function (k) { return k.length ? caches.open(k[0]).then(function (c) { return c.keys(); }).then(function (r) { return r.map(function (x) { return new URL(x.url).pathname; }); }) : []; }),
        new Promise(function (r) { setTimeout(function () { r(null); }, 8000); })
      ]);
    });
    return { ctx: ctx, page: page, err: err, cassa: pronto };
  }

  // ── 1-2. FIARC ─────────────────────────────────────────────────────────
  console.log("\n  L'APP INSTALLATA, SENZA RETE — FIARC\n");
  var a = await installa("fiarc");
  prova("il service worker si installa e mette in cassa l'app", Array.isArray(a.cassa) && a.cassa.indexOf("/app.html") >= 0,
        a.cassa ? a.cassa.join(",") : "nessuna risposta");
  await a.ctx.setOffline(true);
  await a.page.reload(); await a.page.waitForTimeout(1300);
  var home = await testo(a.page);
  prova("senza rete, l'app ricaricata si apre sulla Home", /PRONTO A TIRARE|Inizia un giro/i.test(home), home.slice(0, 120));
  await tocca(a.page, "Tira"); await tocca(a.page, "Gara libera"); await tocca(a.page, "Continua");
  await tocca(a.page, "Round 3D"); await tocca(a.page, "Inizia gara");
  for (var i = 0; i < 3; i++) { await premi(a.page, ".quick-btn.superspot"); await premi(a.page, ".quick-btn.spot"); }
  await a.page.waitForTimeout(400);
  prova("senza rete si segna: piazzola 4 di 24", /PIAZZOLA 4 \/ 24/i.test(await testo(a.page)));
  // chiudere l'app e riaprirla, sempre senza rete
  var p2 = await a.ctx.newPage(); p2.on("pageerror", function (e) { a.err.push(String(e.message)); });
  await a.page.close(); a.page = p2;
  await a.page.goto(BASE + "/app.html"); await a.page.waitForTimeout(1300);
  prova("riaperta senza rete: «Riprendi percorso»", /Riprendi percorso/.test(await testo(a.page)));
  await premi(a.page, ".home-riprendi"); await a.page.waitForTimeout(500);
  prova("ripresa alla piazzola 4, con 3 × 23 gia' segnati",
        /PIAZZOLA 4 \/ 24/i.test(await testo(a.page)) &&
        await a.page.evaluate(function () { var s = JSON.parse(localStorage.getItem("arctrail3d_state_v3")); var k = Object.keys(s.scores)[0];
          return s.scores[k].reduce(function (t, x) { return t + x.total; }, 0) === 69; }));
  // torna la rete
  await a.ctx.setOffline(false);
  await a.page.reload(); await a.page.waitForTimeout(1300);
  var dopo = await a.page.evaluate(function () { return JSON.parse(localStorage.getItem("arctrail3d_state_v3")); });
  prova("tornata la rete, il giro e' ancora li', uguale", dopo.roundActive === true && dopo.mode === "round3d" && dopo.target === 4);
  prova("nessun errore in pagina (FIARC)", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  // ── 3. FITARCO ─────────────────────────────────────────────────────────
  console.log("\n  L'APP INSTALLATA, SENZA RETE — FITARCO\n");
  var b = await installa("fitarco");
  await b.ctx.setOffline(true);
  await b.page.reload(); await b.page.waitForTimeout(1300);
  await tocca(b.page, "Tira"); await tocca(b.page, "Gara libera"); await tocca(b.page, "Continua"); await tocca(b.page, "Inizia gara");
  await premi(b.page, ".quick-btn.perfect"); await premi(b.page, ".quick-btn.superspot");
  await b.page.waitForTimeout(400);
  var sb = await b.page.evaluate(function () { return JSON.parse(localStorage.getItem("arctrail3d_state_v3")); });
  var kb = sb.scores ? Object.keys(sb.scores)[0] : null;
  prova("senza rete FITARCO segna 11 + 10 = 21 sulla prima piazzola",
        sb.mode === "fitarco3d" && kb && sb.scores[kb][0] && sb.scores[kb][0].total === 21, JSON.stringify(sb.scores));
  prova("nessun errore in pagina (FITARCO)", b.err.length === 0, b.err[0]);
  await b.ctx.close();

  await browser.close();
  server.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); server.close(); process.exit(1); });
