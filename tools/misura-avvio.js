#!/usr/bin/env node
/* misura-avvio.js — quanto ci mette l'app ad aprirsi, e con quanto lavoro.
 *
 *   node tools/misura-avvio.js                 # misura e stampa la tabella
 *   node tools/misura-avvio.js --json fuori.json
 *   APP=percorso node tools/misura-avvio.js    # un'altra copia (confronto prima/dopo)
 *
 * NON E' UN BANCO: non dice sì o no, misura. I banchi dicono se una cosa è
 * rotta; questo dice quanto costa. (20/09/2026, fase 22 del risanamento.)
 *
 * COSA MISURA, per ogni combinazione di CPU e rete:
 *   - DOMContentLoaded;
 *   - PRIMA INTERFACCIA UTILE: quando dentro #app compare qualcosa di leggibile
 *     (è il numero che conta per chi apre l'app in piazzola);
 *   - il compito più lungo (long task): sopra i 50 ms il dito non risponde;
 *   - quanti byte di JavaScript sono arrivati, e quanta memoria occupa l'app.
 * La rete è quella vera del service worker: si serve da un server locale.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), http = require("http"), zlib = require("zlib");
var { chromium } = require("playwright");
var { accendiDev } = require(path.join(__dirname, "..", "tests", "copia-dev.js"));

var RADICE = path.join(__dirname, "..");
var SORGENTE = process.env.APP || path.join(RADICE, "app.html");
var FUORI = (function () { var i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-misura-"));
fs.writeFileSync(path.join(D, "app.html"), accendiDev(fs.readFileSync(SORGENTE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg", "icon-192.png", "manifest.json", "sw.js", "index.html"].forEach(function (x) {
  var f = path.join(RADICE, x); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(D, x));
});
var TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg" };
var server = http.createServer(function (req, res) {
  var p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  var f = path.join(D, p);
  if (!f.startsWith(D) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  // Come GitHub Pages: testo compresso. Senza, la misura della rete e' falsa
  // (app.html pesa 1,8 MB in chiaro e 540 KB compresso).
  var testa = { "Content-Type": TIPI[path.extname(f)] || "application/octet-stream" };
  var corpo = fs.readFileSync(f);
  if (/\.(html|js|json|css|svg)$/.test(f) && /gzip/.test(req.headers["accept-encoding"] || "")) {
    corpo = zlib.gzipSync(corpo); testa["Content-Encoding"] = "gzip";
  }
  testa["Content-Length"] = corpo.length;
  res.writeHead(200, testa);
  res.end(corpo);
});

var RETI = {
  "veloce":   { latency: 10, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8 },
  "4G lento": { latency: 150, downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 },
  "3G":       { latency: 300, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 200 * 1024 / 8 }
};
var CPU = [1, 6, 12, 20];
var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi" }, profileSkipped: false };

/* Dentro la pagina: si segna quando #app diventa utile e si contano i compiti lunghi. */
function sonde() {
  window.__lunghi = [];
  window.__utile = null;
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) { window.__lunghi.push(Math.round(e.duration)); });
    }).observe({ entryTypes: ["longtask"] });
  } catch (e) {}
  window.__fcp = null;
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) { if (e.name === "first-contentful-paint" && window.__fcp === null) window.__fcp = Math.round(e.startTime); });
    }).observe({ type: "paint", buffered: true });
  } catch (e) {}
  var guarda = function () {
    // «Utile» e' la schermata VERA, non lo scheletro d'avvio.
    var a = document.querySelector("#app > :not(#avvioScheletro)");
    if (a && (a.innerText || "").trim().length > 10) { window.__utile = performance.now(); return; }
    requestAnimationFrame(guarda);
  };
  document.addEventListener("readystatechange", guarda);
  requestAnimationFrame(guarda);
}

(async function () {
  await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
  var BASE = "http://127.0.0.1:" + server.address().port;
  var browser = await chromium.launch();
  var righe = [];
  for (var rete of Object.keys(RETI)) {
    for (var cpu of CPU) {
      var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await ctx.route(/^https:\/\//, function (r) { return r.abort(); });   // niente gstatic: si misura l'app
      await ctx.addInitScript("(" + sonde.toString() + ")();");
      await ctx.addInitScript(function (st) {
        try { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); } catch (e) {}
      }, STATO);
      var page = await ctx.newPage();
      var byte = 0;
      page.on("response", function (r) {
        var h = r.headers()["content-length"];
        if (h && /\.(js|html)(\?|$)/.test(r.url())) byte += parseInt(h, 10) || 0;
      });
      var cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", Object.assign({ offline: false }, RETI[rete]));
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
      var t0 = Date.now();
      await page.goto(BASE + "/app.html", { waitUntil: "load", timeout: 120000 }).catch(function () {});
      await page.waitForFunction(function () { return window.__utile !== null; }, null, { timeout: 120000 }).catch(function () {});
      var m = await page.evaluate(function () {
        var nav = performance.getEntriesByType("navigation")[0] || {};
        return {
          dcl: Math.round(nav.domContentLoadedEventEnd || 0),
          utile: window.__utile === null ? null : Math.round(window.__utile),
          fcp: window.__fcp,
          lunghi: window.__lunghi.slice(0, 20),
          heap: (performance.memory && performance.memory.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null
        };
      }).catch(function () { return {}; });
      righe.push({ rete: rete, cpu: cpu + "x", dcl: m.dcl, utile: m.utile, fcp: m.fcp,
                   lungoMax: (m.lunghi && m.lunghi.length) ? Math.max.apply(null, m.lunghi) : 0,
                   lunghi: (m.lunghi || []).length, heapMB: m.heap, jsKB: Math.round(byte / 1024), muro: Date.now() - t0 });
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}

  console.log("\n  AVVIO DELL'APP — " + path.basename(SORGENTE) + "\n");
  console.log("  rete        CPU    1o DISEGNO  HOME    DCL      long max  #long  heap    JS      muro");
  righe.forEach(function (r) {
    console.log("  " + r.rete.padEnd(11) + r.cpu.padEnd(6) +
      String((r.fcp === null ? "?" : r.fcp + " ms")).padEnd(12) +
      String((r.utile === null ? "mai" : r.utile + " ms")).padEnd(8) + String(r.dcl + " ms").padEnd(9) +
      String(r.lungoMax + " ms").padEnd(10) + String(r.lunghi).padEnd(7) +
      String((r.heapMB === null ? "?" : r.heapMB + " MB")).padEnd(8) + String(r.jsKB + " KB").padEnd(8) + r.muro + " ms");
  });
  console.log("");
  if (FUORI) { fs.writeFileSync(FUORI, JSON.stringify({ app: SORGENTE, quando: new Date().toISOString(), righe: righe }, null, 1)); console.log("  scritto " + FUORI + "\n"); }
})();
