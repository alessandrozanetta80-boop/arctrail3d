#!/usr/bin/env node
/* misura-colori-porte.js — che colore hanno DAVVERO le tre porte, tema per tema.
 *
 *   node misura-colori-porte.js fileA.html fileB.html
 *
 * Non legge il foglio di stile: apre la schermata Tira come una persona, in
 * tutti e tre i temi, e chiede al browser il colore risolto di ogni pezzo.
 * Serve a rispondere a una domanda sola: fra due versioni, cosa e' cambiato di
 * colore e di quanto.
 */
var fs = require("fs"), path = require("path"), os = require("os"), url = require("url");
var { chromium } = require("playwright");

var FILES = process.argv.slice(2);
if (FILES.length !== 2) { console.log("  serve: node misura-colori-porte.js A.html B.html"); process.exit(2); }

function prepara(file, tag) {
  var D = path.join(os.tmpdir(), "arctrail-colori-" + tag);
  fs.rmSync(D, { recursive: true, force: true });
  fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, "index.html"),
    require("./copia-dev.js").accendiDev(fs.readFileSync(file, "utf8")));
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
    if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
  });
  return D;
}

function stato(tema) {
  return { screen: "menu", tab: "tira", roundActive: false, pendingArchers: [],
    lang: "it", country: "it", federation: "fiarc", theme: tema,
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
               compagniaNome: "A.S.D. Arcieri del VCO & Valgrande", classe: "SM", arco: "longbow" },
    profileSkipped: false };
}

function leggi() {
  function c(el, prop) { return el ? getComputedStyle(el)[prop] : "—"; }
  var out = {};
  var porte = ["training", "gara", "prepara"];
  porte.forEach(function (k) {
    var b = document.querySelector("#app .menu-btn." + k);
    if (!b) { out[k] = null; return; }
    var ico = b.querySelector(".menu-icon");
    var txt = b.querySelector(".menu-txt");
    var sub = b.querySelector(".menu-sub");
    out[k] = {
      fondo:   c(b, "backgroundColor"),
      filetto: c(b, "borderLeftColor"),
      ombra:   c(b, "boxShadow"),
      raggio:  c(b, "borderTopLeftRadius"),
      alta:    Math.round(b.getBoundingClientRect().height),
      placca:  c(ico, "backgroundColor"),
      segno:   c(ico, "color"),
      titolo:  c(txt, "color"),
      sotto:   c(sub, "color"),
      sottoOp: c(sub, "opacity"),
      sottoPx: c(sub, "fontSize")
    };
  });
  return out;
}

async function apri(browser, D, tema) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1200 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(tema))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(900);
  await page.evaluate(function () {
    var bar = document.querySelector(".tabbar-bottom") || document.querySelector("header.top");
    if (!bar) return;
    var v = Array.prototype.filter.call(bar.querySelectorAll("button"),
      function (x) { return x.textContent.trim() === "Tira"; })[0];
    if (v) v.click();
  });
  await page.waitForTimeout(700);
  var dati = await page.evaluate(leggi);
  await ctx.close();
  return dati;
}

// ── contrasto, per dire di quanto e non solo che ──────────────────────────
// ATTENZIONE. Chrome NON restituisce sempre `rgb(0..255)`: il risultato di un
// `color-mix()` esce come `color(srgb 0.91 0.92 0.86)`, cioe' su scala 0–1.
// Leggendo i primi tre numeri come se fossero 0–255 la placca color avorio
// risultava #010101, quasi nera — e il banco avrebbe gridato a un guasto che
// non c'era. Le due scale vanno distinte, non indovinate.
function rgb(s) {
  s = s || "";
  var m = s.match(/[\d.]+/g);
  if (!m) return null;
  var v = m.slice(0, 3).map(Number);
  if (/^color\(/.test(s.trim())) return v.map(function (x) { return x * 255; });
  return v;
}
function lum(v) { var s = v.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; }
function cr(a, b) { a = rgb(a); b = rgb(b); if (!a || !b) return null;
  var L1 = lum(a), L2 = lum(b); return ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)); }
function hex(s) { var v = rgb(s); return v ? "#" + v.map(function (x) { return Math.round(x).toString(16).padStart(2, "0"); }).join("").toUpperCase() : s; }

(async function () {
  var browser = await chromium.launch();
  var A = prepara(FILES[0], "a"), B = prepara(FILES[1], "b");
  var TEMI = ["light", "dark", "sole"];
  var NOMI = { light: "chiaro", dark: "scuro", sole: "Sole" };
  var VOCI = ["fondo", "filetto", "placca", "segno", "titolo", "sotto"];

  for (var i = 0; i < TEMI.length; i++) {
    var t = TEMI[i];
    var a = await apri(browser, A, t), b = await apri(browser, B, t);
    console.log("\n  ══ TEMA " + NOMI[t].toUpperCase() + " ══════════════════════════════════════");
    ["training", "gara", "prepara"].forEach(function (k) {
      if (!a[k] || !b[k]) { console.log("  " + k + ": porta non trovata"); return; }
      var righe = [];
      VOCI.forEach(function (v) {
        if (hex(a[k][v]) !== hex(b[k][v])) righe.push("    " + v.padEnd(8) + hex(a[k][v]) + "  →  " + hex(b[k][v]));
      });
      if (a[k].ombra !== b[k].ombra) righe.push("    ombra   " + (a[k].ombra === "none" ? "nessuna" : a[k].ombra) + "  →  " + (b[k].ombra === "none" ? "nessuna" : b[k].ombra));
      if (a[k].alta !== b[k].alta) righe.push("    altezza " + a[k].alta + "px  →  " + b[k].alta + "px");
      if (a[k].sottoOp !== b[k].sottoOp) righe.push("    opacita sottotitolo " + a[k].sottoOp + "  →  " + b[k].sottoOp);
      console.log("\n  " + k.toUpperCase());
      console.log(righe.length ? righe.join("\n") : "    (niente e' cambiato)");
      var pa = cr(a[k].sotto, a[k].fondo), pb = cr(b[k].sotto, b[k].fondo);
      if (pa && pb) console.log("    sottotitolo sul fondo: " + pa.toFixed(2) + "  →  " + pb.toFixed(2) +
        (pb < 4.5 ? "   ← SOTTO SOGLIA (4,5)" : ""));
      var qa = cr(a[k].placca, a[k].fondo), qb = cr(b[k].placca, b[k].fondo);
      if (qa && qb) console.log("    placca sul fondo:      " + qa.toFixed(2) + "  →  " + qb.toFixed(2));
    });
  }
  await browser.close();
  console.log("");
})();
