#!/usr/bin/env node
/* banco-pista-schermi.js — i tasti del punteggio stanno SEMPRE nello schermo.
 *
 *   node tests/banco-pista-schermi.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-pista-schermi.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit M1/M2, blocco 7.) La pista non scorre
 * (`height:100dvh; overflow:hidden`, una decisione del progetto). Quindi un
 * tasto che esce dallo schermo NON SI RAGGIUNGE: non c'e' modo di segnare
 * quel punteggio finche' non si gira il telefono. Misurato dall'audit:
 *   - in orizzontale (568x320, 640x360, 844x390) la riga SAGOMA / NULLA
 *     finiva sotto il bordo;
 *   - con lo zoom / la «dimensione schermo» al 125% (288x448) la striscia
 *     «Annulla», comparsa dopo il primo tocco, spingeva fuori i tasti.
 * Gli altri banchi misurano altezze da 800 px in su: questo e' il posto
 * degli schermi bassi. Ci sono anche il telefono molto grande (Samsung S26
 * Ultra, 412x915 a 3,5x, verticale e orizzontale) e un tablet.
 *
 * COSA CHIEDE, per ogni schermo, con 1 e 4 arcieri, in italiano e tedesco,
 * PRIMA e DOPO il primo tocco:
 *   - ogni tasto del punteggio e' interamente dentro lo schermo;
 *   - ogni tasto e' almeno 44x44 (il bersaglio minimo per un dito);
 *   - niente scorrimento orizzontale;
 *   - il nome di chi tira si vede.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var { accendiDev } = require("./copia-dev.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-schermi-"));
fs.writeFileSync(path.join(D, "app.html"), accendiDev(fs.readFileSync(SORGENTE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg", "icon-192.png"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function giro(n, lang) {
  var nomi = ["alez", "Mariagrazia Bellavista-Longhi", "Sara", "Giovanni Battista"];
  var archers = nomi.slice(0, n).map(function (nm, i) { return { id: "a" + i, name: nm, isSelf: i === 0 }; });
  var scores = {}; archers.forEach(function (a) { scores[a.id] = []; });
  return { screen: "menu", tab: "home", pendingArchers: [], lang: lang, country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez" }, profileSkipped: false,
    roundActive: true, mode: "round3d", format: 24, archers: archers, archersBase: archers, scores: scores,
    target: 1, archerIndex: 0, arrowIndex: 0, pendingArrows: [], liveBattutaTypes: {}, startedAt: Date.now() };
}

var SCHERMI = [
  { nome: "orizzontale 568x320", w: 568, h: 320, mobile: true },
  { nome: "orizzontale 640x360", w: 640, h: 360, mobile: true },
  { nome: "orizzontale 844x390", w: 844, h: 390, mobile: true },
  { nome: "zoom 125% (360x560) = 288x448", w: 288, h: 448, mobile: true },
  { nome: "zoom 150% (360x640) = 240x427", w: 240, h: 427, mobile: true },
  { nome: "piccolo 320x568", w: 320, h: 568, mobile: true },
  { nome: "Samsung S26 Ultra verticale 412x915", w: 412, h: 915, mobile: true, dpr: 3.5 },
  { nome: "Samsung S26 Ultra orizzontale 915x412", w: 915, h: 412, mobile: true, dpr: 3.5 },
  { nome: "Samsung S26 Ultra con barra del browser 412x780", w: 412, h: 780, mobile: true, dpr: 3.5 },
  { nome: "tablet orizzontale 1024x768", w: 1024, h: 768, mobile: false },
  { nome: "desktop 1440x900", w: 1440, h: 900, mobile: false }
];

async function misura(page) {
  return page.evaluate(function () {
    var W = innerWidth, H = innerHeight;
    var tasti = Array.prototype.map.call(document.querySelectorAll(".tastiera .quick-btn"), function (b) {
      var r = b.getBoundingClientRect();
      return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height };
    });
    // Il nome di chi tira: intero, dentro la scena che lo contiene (la scena
    // puo' comprimersi e tagliarlo) e dentro lo schermo.
    // Da solo il protagonista e' la piazzola, in gruppo e' il nome: si guarda quello che c'e'.
    var nome = document.querySelector(".pista-arciere") || document.querySelector(".pista-piazzola");
    var scena = nome && nome.closest(".pista-scena");
    var nr = nome ? nome.getBoundingClientRect() : null, sr = scena ? scena.getBoundingClientRect() : null;
    var nomeIntero = !!(nr && nr.height > 0 && nr.bottom <= H + 0.5 &&
                        (!sr || (nr.top >= sr.top - 0.5 && nr.bottom <= sr.bottom + 0.5)));
    return { W: W, H: H, scrollW: document.documentElement.scrollWidth, tasti: tasti, nomeIntero: nomeIntero,
             nome: nr ? Math.round(nr.top) + "-" + Math.round(nr.bottom) + " in " + (sr ? Math.round(sr.top) + "-" + Math.round(sr.bottom) : "?") : "nessuno" };
  });
}

(async function () {
  var browser = await chromium.launch();
  for (var s = 0; s < SCHERMI.length; s++) {
    var S = SCHERMI[s];
    console.log("\n  " + S.nome.toUpperCase() + "\n");
    var tuttiDentro = true, tuttiGrandi = true, niente = true, nomeVisto = true, dettagli = [];
    for (var n of [1, 4]) {
      for (var lang of ["it", "de"]) {
        var ctx = await browser.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr || 1,
                                             isMobile: S.mobile, hasTouch: S.mobile });
        await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
        await ctx.addInitScript(function (st) {
          try { localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); localStorage.setItem("arctrail3d_welcome_v2", "1"); } catch (e) {}
        }, giro(n, lang));
        var page = await ctx.newPage();
        await page.goto(URL); await page.waitForTimeout(900);
        await page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
        await page.waitForTimeout(600);
        for (var fase of ["prima", "dopo il primo tocco"]) {
          if (fase !== "prima") {
            await page.evaluate(function () { var x = document.querySelector(".quick-btn.superspot"); if (x) x.click(); });
            await page.waitForTimeout(500);
          }
          var m = await misura(page);
          if (!m.tasti.length) { niente = false; dettagli.push(n + " arcieri " + lang + " " + fase + ": nessun tasto"); continue; }
          var fuori = m.tasti.filter(function (k) { return k.b > m.H + 0.5 || k.t < -0.5 || k.r > m.W + 0.5 || k.l < -0.5; });
          var piccoli = m.tasti.filter(function (k) { return k.w < 44 || k.h < 44; });
          if (fuori.length) { tuttiDentro = false; dettagli.push(n + " arcieri " + lang + " " + fase + ": fondo " + Math.round(Math.max.apply(null, m.tasti.map(function (k) { return k.b; }))) + " > " + m.H); }
          if (piccoli.length) { tuttiGrandi = false; dettagli.push(n + " arcieri " + lang + " " + fase + ": tasto " + Math.round(piccoli[0].w) + "x" + Math.round(piccoli[0].h)); }
          if (!m.nomeIntero) { nomeVisto = false; dettagli.push("nome " + n + " arcieri " + lang + " " + fase + ": " + m.nome); }
          if (m.scrollW > m.W + 1) { niente = false; dettagli.push("scorrimento orizzontale " + m.scrollW + " > " + m.W); }
        }
        await ctx.close();
      }
    }
    prova("tutti i tasti del punteggio dentro lo schermo (1 e 4 arcieri, it e de, prima e dopo il tocco)", tuttiDentro,
          dettagli.filter(function (x) { return /fondo|nessun/.test(x); }).slice(0, 3).join(" | "));
    prova("tasti di almeno 44x44", tuttiGrandi, dettagli.filter(function (x) { return /tasto/.test(x); }).slice(0, 2).join(" | "));
    prova("il protagonista della scena (nome in gruppo, piazzola da solo) si legge intero", nomeVisto, dettagli.filter(function (x) { return /^nome/.test(x); }).slice(0, 2).join(" | "));
    prova("niente scorrimento orizzontale", niente, dettagli.filter(function (x) { return /scorrimento/.test(x); }).slice(0, 1).join(""));
  }
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
