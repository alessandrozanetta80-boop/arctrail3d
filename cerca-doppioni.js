#!/usr/bin/env node
/* cerca-doppioni.js — «Dahu» compare due volte? Si prova premendo, non
 * leggendo il codice. Cerca la stessa parola in tutti i posti dove l'app
 * lascia cercare una societa', con FIARC e con FITARCO. */
var fs = require("fs"), path = require("path"), os = require("os"), url = require("url");
var { chromium } = require("playwright");
var FILE = process.argv[2] || "app.html";
var PAROLA = process.argv[3] || "dahu";

var D = path.join(os.tmpdir(), "arctrail-doppioni");
fs.rmSync(D, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

function stato(fed, tab) {
  return { screen: "menu", tab: tab, roundActive: false, pendingArchers: [],
    lang: "it", country: "it", federation: fed, theme: "light",
    profile: { nomeCognome: "A Z", username: "alez", compagnia: "01VERB",
               compagniaNome: "X", classe: "SM", arco: "longbow" }, profileSkipped: false };
}

async function prova(browser, fed, tab, etichetta) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(fed, tab))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);

  // La scheda si preme, non si dichiara: mettere `tab` nello stato non basta
  // se la barra in fondo non e' mai stata toccata.
  await page.evaluate(function (nome) {
    var bar = document.querySelector(".tabbar-bottom") || document.querySelector("header.top");
    if (!bar) return;
    var b = Array.prototype.filter.call(bar.querySelectorAll("button"), function (x) {
      return x.textContent.trim().toLowerCase().indexOf(nome) >= 0;
    })[0];
    if (b) b.click();
  }, tab === "campi" ? "campi" : "home");
  if (tab !== "campi") {
    await page.evaluate(function (dove) {
      try { state.screen = dove; save(); render(); } catch (e) {}
    }, tab);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(900);

  var quante = await page.$$eval('input', function (l) {
    return l.filter(function (i) { return i.offsetParent !== null; }).length;
  });
  console.log("    (caselle visibili: " + quante + ")");

  // ogni casella di testo visibile: ci si scrive dentro e si guarda cosa esce
  var caselle = await page.$$('input[type="text"], input:not([type]), input[type="search"]');
  var esiti = [];
  for (var i = 0; i < caselle.length; i++) {
    var c = caselle[i];
    if (!(await c.isVisible())) continue;
    try { await c.fill(PAROLA); } catch (e) { continue; }
    await page.waitForTimeout(500);
    var righe = await page.evaluate(function (p) {
      var out = [];
      document.querySelectorAll("body *").forEach(function (n) {
        if (n.children.length) return;
        var tx = (n.textContent || "").trim();
        if (tx && tx.toLowerCase().indexOf(p) >= 0 && tx.length < 160) out.push(tx);
      });
      return out;
    }, PAROLA.toLowerCase());
    if (righe.length) esiti.push({ casella: i, righe: righe });
    try { await c.fill(""); } catch (e) {}
    await page.waitForTimeout(200);
  }
  await ctx.close();
  console.log("\n  " + etichetta + "  (federazione " + fed + ", scheda " + tab + ")");
  if (!esiti.length) { console.log("    nessun risultato con «" + PAROLA + "»"); return 0; }
  var max = 0;
  esiti.forEach(function (e) {
    console.log("    casella " + e.casella + ": " + e.righe.length + " riga/e");
    e.righe.forEach(function (r) { console.log("      · " + r); });
    max = Math.max(max, e.righe.length);
  });
  return max;
}

(async function () {
  var browser = await chromium.launch();
  var guai = 0;
  for (var fed of ["fiarc", "fitarco"]) {
    for (var tab of ["campi", "profilo", "compagnia"]) {
      var n = await prova(browser, fed, tab, "cerca «" + PAROLA + "»");
      if (n > 1) guai++;
    }
  }
  await browser.close();
  console.log("\n  " + (guai ? guai + " posto/i mostra piu' di una riga: guardare sopra." :
    "in nessun posto la stessa societa' esce due volte.") + "\n");
})();
