#!/usr/bin/env node
/* misura-s26.js — testata, card di «Tira» e barra in fondo sul viewport di un
 * Samsung S26 Ultra (384×832 px CSS), col testo di Android e lo zoom schermo.
 *
 *   node tools/misura-s26.js [app.html]
 *
 * (22/09/2026.) Stampa, per ogni combinazione, quello che si vedeva sulle due
 * foto: righe e altezza della testata, altezza delle tre card di Tira, se la
 * barra in fondo sta in una riga, se la pagina scorre di lato. La simulazione
 * del testo e' quella di tests/banco-font-scale.js (letta da li', non copiata).
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var src = require("../tests/copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8"));
var banco = fs.readFileSync(path.join(__dirname, "..", "tests", "banco-font-scale.js"), "utf8");
var scalaTesto = eval("(" + banco.match(/function scalaTesto\(s\)\{[\s\S]*?\r?\n\}\r?\n/)[0] + ")");
var D = fs.mkdtempSync(path.join(os.tmpdir(), "misura-s26-"));
fs.writeFileSync(path.join(D, "app.html"), src);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file:///" + path.join(D, "app.html").split(path.sep).join("/");

function stato(tab) {
  return { screen: "menu", tab: tab, lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi" }, profileSkipped: false, pendingArchers: [] };
}
async function misura(browser, testo, zoom, tab) {
  var vw = Math.round(384 / zoom), vh = Math.round(832 / zoom);
  var ctx = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  await p.addInitScript(function (st) { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); }, stato(tab));
  if (testo !== 1) await p.addInitScript(scalaTesto, testo);
  await p.goto(URL);
  await p.waitForTimeout(1200);
  if (tab === "tira") {   // all'avvio l'app riparte dalla Home: a Tira ci si va dalla barra, come un dito
    await p.evaluate(function () { var x = Array.prototype.filter.call(document.querySelectorAll(".tabbar-bottom > *"), function (e) { return /^Tira$/.test(e.textContent.trim()); })[0]; if (x) x.click(); });
    await p.waitForTimeout(800);
  }
  var r = await p.evaluate(function () {
    var h = document.querySelector("header.top"), b = h && h.querySelector(".brandblock"), a = h && h.querySelector(".head-actions");
    var righe = (b && a) ? (a.getBoundingClientRect().top > b.getBoundingClientRect().bottom - 4 ? 2 : 1) : 0;
    var tasti = h ? Array.prototype.map.call(h.querySelectorAll(".bar-btn"), function (x) { var q = x.getBoundingClientRect(); return Math.round(Math.min(q.width, q.height)); }) : [];
    var carte = Array.prototype.map.call(document.querySelectorAll(".menu-btn.training, .menu-btn.gara, .menu-btn.prepara"), function (x) { return Math.round(x.getBoundingClientRect().height); });
    var tb = document.querySelector(".tabbar-bottom"), celle = tb ? Array.prototype.slice.call(tb.children) : [];
    var fuori = celle.some(function (c) { var rc = c.getBoundingClientRect(); return Array.prototype.some.call(c.querySelectorAll("*"), function (k) { var rk = k.getBoundingClientRect(); return rk.width && (rk.left < rc.left - 1 || rk.right > rc.right + 1); }); });
    var tbRighe = celle.length ? new Set(celle.map(function (c) { return Math.round(c.getBoundingClientRect().top); })).size : 0;
    return { testata: h ? Math.round(h.getBoundingClientRect().height) : 0, righe: righe, stretta: !!(h && h.classList.contains("stretta")),
             tastoMin: tasti.length ? Math.min.apply(null, tasti) : 0, carte: carte,
             barra: celle.length + " voci, " + tbRighe + " riga" + (tbRighe > 1 ? "e" : "") + (fuori ? ", ETICHETTA FUORI" : ""),
             laterale: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  await ctx.close();
  return { vw: vw, vh: vh, r: r };
}

(async function () {
  var browser = await chromium.launch();
  var casi = [[1, 1], [1.2, 1], [1.3, 1], [1.5, 1], [1.75, 1], [2, 1], [1, 1.15], [1, 1.3], [1.3, 1.15], [1.5, 1.15]];
  console.log("\n  S26 Ultra, 384×832 px CSS" + (FILE !== "app.html" ? " — " + FILE : "") + "\n");
  console.log("  testo  zoom   css        testata          stretta  tasto  card Tira (px)     barra in fondo");
  for (var c of casi) {
    var home = await misura(browser, c[0], c[1], "home");
    var tira = await misura(browser, c[0], c[1], "tira");
    var x = home.r;
    console.log("  " + (Math.round(c[0] * 100) + "%").padEnd(6) + " " + (Math.round(c[1] * 100) + "%").padEnd(6) + " " + (home.vw + "×" + home.vh).padEnd(10) + " " +
      (x.testata + "px, " + x.righe + " rig" + (x.righe > 1 ? "he" : "a")).padEnd(16) + " " + (x.stretta ? "si" : "no").padEnd(8) + " " + String(x.tastoMin).padEnd(6) + " " +
      tira.r.carte.join(" / ").padEnd(18) + " " + x.barra + (x.laterale || tira.r.laterale ? "  SCORRE DI LATO" : ""));
  }
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
})().catch(function (e) { console.error("misura rotta:", e && e.stack || e); process.exit(1); });
