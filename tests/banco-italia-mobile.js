#!/usr/bin/env node
/* banco-italia-mobile.js — le schermate italiane stanno nel telefono, e parlano italiano.
 *
 *   node tests/banco-italia-mobile.js            # 2 telefoni × 2 scale (suite)
 *   node tests/banco-italia-mobile.js --tutto    # 5 telefoni × 3 scale (audit)
 *   node tests/banco-italia-mobile.js --sabota   # un tasto spinto fuori schermo: deve diventare rosso
 *
 * Nato il 18/09/2026 («Arc Trail Italia ready», fasi 9-11). Un arciere
 * iscritto FIARC e FITARCO, in italiano, percorre le strade vere:
 *   HOME → TIRA → FIARC → SEGNA → HOME
 *   HOME → TIRA → FITARCO → SEGNA → HOME
 *   PROFILO → DIARIO → DETTAGLIO → PROFILO
 *   PROFILO → ATTREZZATURA → PROFILO
 *   PROFILO → IMPOSTAZIONI → PROFILO
 *   CAMPI → CALENDARIO
 * e su ogni schermata controlla quello che si vede, non come e' scritto:
 * niente scorrimento di lato, nessun tasto fuori schermo o schiacciato a zero,
 * testata in cima, barra in fondo dentro lo schermo, nessun errore, e nessuna
 * parola inglese dove l'arciere legge.
 *
 * LA SCALA DEI CARATTERI e' quella vera del browser (`Page.setFontSizes`,
 * vedi banco-font-scale): l'app e' in rem, quindi cresce davvero.
 * Nessun trucco per un telefono in particolare: sono misure CSS.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), url = require("url");
var { chromium } = require("playwright");

var TUTTO = process.argv.indexOf("--tutto") !== -1;
var SABOTA = process.argv.indexOf("--sabota") !== -1;
var D = path.join(os.tmpdir(), "arctrail-banco-italia-mobile");
fs.mkdirSync(D, { recursive: true });
var html = require("./copia-dev.js").accendiDev(fs.readFileSync("app.html", "utf8"));
if (SABOTA) {
  html = html.replace("</head>", "<style>.tabn:last-child{position:relative;left:260px}</style></head>");
  console.log("\n  (SABOTAGGIO: l'ultima voce della barra spinta fuori dallo schermo)");
}
fs.writeFileSync(path.join(D, "index.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var PAGINA = url.pathToFileURL(path.join(D, "index.html")).href;

var TELEFONI = TUTTO ? [[360, 800], [384, 832], [390, 844], [412, 915], [430, 932]] : [[360, 800], [412, 915]];
var SCALE = TUTTO ? [1, 1.2, 1.5] : [1, 1.5];

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; if (TUTTO) console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

/* Parole inglesi che in un'interfaccia italiana sarebbero un residuo. Non ci
   sono i termini che l'italiano dell'arco usa davvero (Round 3D, Spine, Rest,
   Peep, D-loop, Clicker, Home, Password, Email, Marketplace, Username). */
var INGLESE = /\b(Save|Cancel|Delete|Loading|Error|Settings|Profile|Share|Back|Next|Done|Close|Edit|Search|Sign in|Sign up|Log ?in|Log ?out|Welcome|Coming soon|Arrow|Arrows|Target|Targets|Score|Scores|Round history|Your|Please|Shoot|Training|Diary|Equipment|Calendar|Fields|Undefined|NaN|null)\b/;

function giro(n, tot, modo, label, frecce) {
  return { date: new Date(Date.now() - n * 86400000).toISOString(), format: 24, modeKey: modo, modeLabel: label,
    campo: "Cerrione (BI)", durata: 95,
    results: [{ name: "mariorossi", total: tot, isSelf: true, perTarget: Array(24).fill(tot / 24), arrows: Array(24).fill(frecce) }] };
}
function stato(fed) {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: fed, theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi",
      federazioni: [{ code: "fiarc", tessera: "FI111" }, { code: "fitarco", tessera: "FT222" }] },
    profileSkipped: false, pendingArchers: [] };
}
var STORICO = [giro(2, 552, "round3d", "Round 3D", [16, 7]), giro(9, 504, "fitarco3d", "3D", [11, 10])];

async function misura(page) {
  return page.evaluate(function (reIng) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var app = document.querySelector("#app");
    /* I nomi delle gare nel calendario sono dati, non interfaccia: «Big Game
       Shoot» e' il nome di una gara inglese, e resta in inglese. */
    var copia = app ? app.cloneNode(true) : null;
    if (copia) Array.prototype.forEach.call(copia.querySelectorAll(".al-blocco"), function (x) { x.remove(); });
    var testo = (copia ? (function () { document.body.appendChild(copia); copia.style.cssText = "position:absolute;left:-9999px;top:0;width:" + vw + "px";
      var t = copia.innerText; copia.remove(); return t; })() : "") + " " + ((document.querySelector(".tabbar") || {}).innerText || "");
    var fuori = [];
    Array.prototype.forEach.call(document.querySelectorAll("#app button, #app a, #app input, #app select, .tabbar button"), function (b) {
      if (!b.offsetParent) return;
      var r = b.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      /* Dentro una fila che scorre di lato apposta (overflow-x auto), un tasto
         oltre il bordo si raggiunge scorrendo: non e' fuori schermo. */
      for (var a = b.parentElement; a && a !== document.body; a = a.parentElement) {
        var ox = getComputedStyle(a).overflowX;
        if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth + 1) return;
      }
      if (r.right > vw + 1 || r.left < -1) fuori.push((b.textContent || b.placeholder || b.className).replace(/\s+/g, " ").trim().slice(0, 30) + " [" + Math.round(r.left) + "→" + Math.round(r.right) + "]");
    });
    var tab = document.querySelector(".tabbar");
    var tr = tab ? tab.getBoundingClientRect() : null;
    var testata = document.querySelector(".topbar, header, .brandblock");
    var ing = new RegExp(reIng).exec(testo);
    return { sporge: document.documentElement.scrollWidth - document.documentElement.clientWidth, fuori: fuori,
      barra: tr ? { ok: tr.bottom <= vh + 1 && tr.top < vh && tr.left >= -1 && tr.right <= vw + 1, desc: Math.round(tr.top) + "-" + Math.round(tr.bottom) + "/" + vh } : null,
      testata: testata ? Math.round(testata.getBoundingClientRect().top) : null,
      inglese: ing ? ing[0] + " … " + testo.slice(Math.max(0, ing.index - 30), ing.index + 30).replace(/\s+/g, " ") : null,
      screen: (JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}")).screen };
  }, INGLESE.source);
}
async function tocca(page, t) {
  var fatto = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, #app a, .tabbar button"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, t);
  await page.waitForTimeout(450);
  return fatto;
}
async function premi(page, css) {
  var fatto = await page.evaluate(function (c) { var x = document.querySelector(c); if (x) { x.click(); return true; } return false; }, css);
  await page.waitForTimeout(350);
  return fatto;
}

(async function () {
  var browser = await chromium.launch();
  var errori = [];
  for (var ti = 0; ti < TELEFONI.length; ti++) {
    for (var si = 0; si < SCALE.length; si++) {
      var W = TELEFONI[ti][0], H = TELEFONI[ti][1], S = SCALE[si];
      var dove = W + "×" + H + " @" + Math.round(S * 100) + "%";
      console.log("\n  " + dove);
      for (var fed of ["fiarc", "fitarco"]) {
        var ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: "it-IT", deviceScaleFactor: 1 });
        await ctx.addInitScript("try{ if(!localStorage.getItem('banco-seme')){ localStorage.setItem('arctrail3d_state_v3', " +
          JSON.stringify(JSON.stringify(stato(fed))) + "); localStorage.setItem('arctrail3d_storico_v1', " +
          JSON.stringify(JSON.stringify(STORICO)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); localStorage.setItem('banco-seme','1'); } }catch(e){}");
        var page = await ctx.newPage();
        page.on("pageerror", function (e) { errori.push(dove + " " + fed + ": " + e.message); });
        var cdp = await ctx.newCDPSession(page);
        await cdp.send("Page.setFontSizes", { fontSizes: { standard: Math.round(16 * S), fixed: Math.round(13 * S) } });
        await page.goto(PAGINA); await page.waitForTimeout(1300);

        async function guarda(nome) {
          var m = await misura(page);
          var q = "[" + dove + " " + fed.toUpperCase() + "] " + nome;
          prova(q + ": niente scorrimento di lato", m.sporge <= 0, m.sporge + "px");
          prova(q + ": nessun tasto fuori schermo", m.fuori.length === 0, m.fuori.slice(0, 3).join(" | "));
          if (m.barra) prova(q + ": la barra in fondo sta nello schermo", m.barra.ok, m.barra.desc);
          if (m.testata !== null) prova(q + ": la testata e' in cima", m.testata <= 2, m.testata);
          prova(q + ": nessuna parola inglese", !m.inglese, m.inglese);
          return m;
        }
        await guarda("Home");
        // TIRA → formato → segna due frecce → torna alla Home
        await tocca(page, "Tira"); await guarda("Tira");
        await tocca(page, "Gara libera"); await tocca(page, "Continua"); await guarda("Scelta del formato");
        if (fed === "fiarc") await tocca(page, "Round 3D");
        await tocca(page, "Inizia gara"); await guarda("Segna il giro");
        await premi(page, ".quick-btn.superspot"); await premi(page, ".quick-btn.spot");
        var mg = await guarda("Segna il giro, piazzola 2");
        prova("[" + dove + " " + fed.toUpperCase() + "] il giro e' in corso", mg.screen === "round", mg.screen);
        await premi(page, ".bar-btn:nth-of-type(1)"); await page.waitForTimeout(300);
        await tocca(page, "Home"); await guarda("Home con giro in corso");
        // PROFILO → DIARIO → DETTAGLIO
        await premi(page, ".bar-btn:nth-of-type(3)"); await guarda("Profilo");
        await premi(page, ".riga-diario"); await guarda("Diario");
        await tocca(page, "Giri"); await guarda("Diario, giri");
        var aperto = await page.evaluate(function () {
          var x = Array.prototype.filter.call(document.querySelectorAll("#app button, #app [role=button], #app .giro-riga, #app .storico-riga, #app li"), function (b) {
            return b.offsetParent && /552|504/.test(b.textContent); })[0];
          if (x) { x.click(); return true; } return false;
        });
        await page.waitForTimeout(500);
        if (aperto) await guarda("Dettaglio del giro");
        // PROFILO → ATTREZZATURA / IMPOSTAZIONI
        await premi(page, ".bar-btn:nth-of-type(3)");
        await tocca(page, "Attrezzatura"); await guarda("Attrezzatura");
        await premi(page, ".bar-btn:nth-of-type(3)");
        await tocca(page, "Impostazioni"); await guarda("Impostazioni");
        // CAMPI → CALENDARIO
        await tocca(page, "Campi"); await guarda("Campi");
        await premi(page, ".cal-porta"); await guarda("Calendario");
        await ctx.close();
      }
    }
  }
  await browser.close();
  prova("nessun errore in pagina", errori.length === 0, errori.slice(0, 3).join(" | "));
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
