#!/usr/bin/env node
/* banco-traguardi.js — i traguardi contano cose vere.
 *
 *   node banco-traguardi.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 23.) Un traguardo e una frase che l app dice
 * su di te — «100 piazzole», «10 campi diversi» — e nessuno la verifica
 * riaprendo lo storico. Se il conto sbaglia non si rompe niente: si legge un
 * numero, e si crede. Sono gli stessi panni del cruscotto della Home e del
 * finale del giro, e per gli stessi motivi hanno un banco.
 *
 * Le tre cose che guarda:
 *   1. che si contino le PIAZZOLE e non i giri, e i campi DIVERSI e non le
 *      volte che ci sei andato;
 *   2. che «primo record personale» significhi aver battuto un giro dello
 *      stesso tipo, non semplicemente avere un giro;
 *   3. che senza storico non compaia nessun traguardo raggiunto — un elenco
 *      di spunte al primo avvio e una bugia gentile.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-traguardi");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

function giro(giorniFa, tot, piazzole, campo, modo) {
  return { date: new Date(Date.now() - giorniFa * 86400000).toISOString(),
    format: piazzole, modeKey: modo || "training", modeLabel: modo || "Allenamento",
    campo: campo || null,
    results: [{ name: "Alessandro", total: tot, isSelf: true, ownerUid: null,
      perTarget: new Array(piazzole).fill(10), arrows: [] }] };
}

var STATO = { screen: "menu", tab: "attivita", journalTab: "record", roundActive: false,
  pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
  profileSkipped: false };

async function apri(browser, storico) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(STATO)) + ");" +
    " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(storico)) + ");" +
    " localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  // all'apertura si riparte dalla home: ad Attivita' si va cliccando
  // AD ATTIVITA NON SI ARRIVA PIU DALLA BARRA. (21/08/2026: la barra e il
  // giro sportivo, i numeri si vanno a cercare.) La porta e «Il mio diario»,
  // dentro il profilo — e il banco ci passa come una persona.
  // L'AGGANCIO E MINUSCOLO APPOSTA. (22/08/2026, versione «toni».) In testata
  // c'era un tasto «Profilo»; adesso c'e' «Il mio profilo · alez» e basta.
  // Con /Profilo/ maiuscolo il banco non trovava piu' niente, non cliccava,
  // e falliva a vuoto sulle prove DOPO — dicendo che i traguardi erano
  // sbagliati quando non era mai arrivato a vederli.
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /profilo/i.test(x.textContent) ||
             /profilo/i.test(x.getAttribute("aria-label") || ""); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /diario/i.test(x.textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".home-tempo button"), function (x) {
      return /Record/i.test(x.textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  return { ctx: ctx, page: page, err: err };
}

function leggi() {
  var righe = Array.prototype.map.call(document.querySelectorAll(".trag-riga"), function (r) {
    return { nome: (r.querySelector(".trag-nome") || {}).textContent || "",
             conto: (r.querySelector(".trag-conto") || {}).textContent || "",
             fatto: r.className.indexOf("fatto") >= 0 };
  });
  return { righe: righe, quante: righe.length,
           fatti: righe.filter(function (r) { return r.fatto; }).map(function (r) { return r.nome; }) };
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  SENZA STORICO NON C'E' NESSUNA SPUNTA");
  var a = await apri(browser, []);
  var va = await a.page.evaluate(leggi);
  prova("nessun traguardo raggiunto", va.fatti.length === 0, va.fatti.join(" | "));
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  console.log("\n  SI CONTANO LE PIAZZOLE, NON I GIRI");
  // otto giri da 12 = 96 piazzole: 100 non e' raggiunto per un soffio
  var otto = [];
  for (var i = 0; i < 8; i++) otto.push(giro(i + 1, 120, 12, "Campo A"));
  var b = await apri(browser, otto);
  var vb = await b.page.evaluate(leggi);
  var cento = vb.righe.filter(function (r) { return /100/.test(r.nome); })[0];
  prova("il primo giro e' raggiunto", vb.fatti.some(function (x) { return /Primo giro/.test(x); }), vb.fatti.join(" | "));
  prova("96 piazzole non fanno 100", !!cento && !cento.fatto, cento ? cento.conto : "manca");
  prova("e il conto dice a che punto sei", !!cento && cento.conto === "96/100", cento ? cento.conto : "-");
  await b.ctx.close();

  console.log("\n  I CAMPI SONO QUELLI DIVERSI, NON LE VOLTE");
  var stessoCampo = [];
  for (var j = 0; j < 12; j++) stessoCampo.push(giro(j + 1, 120, 12, "Sempre lo stesso (VB)"));
  var c = await apri(browser, stessoCampo);
  var vc = await c.page.evaluate(leggi);
  var campi = vc.righe.filter(function (r) { return /campi|Campi/.test(r.nome); })[0];
  prova("dodici giri sullo stesso campo fanno UN campo",
        !!campi && campi.conto === "1/10", campi ? campi.conto : "manca");
  await c.ctx.close();

  console.log("\n  IL RECORD E' AVER BATTUTO SE STESSI, NON AVER TIRATO");
  var unoSolo = [giro(3, 200, 24, "Campo A", "percorso")];
  var d = await apri(browser, unoSolo);
  var vd = await d.page.evaluate(leggi);
  prova("con un giro solo non c'e' nessun record",
        !vd.righe.filter(function (r) { return /record/i.test(r.nome); })[0].fatto);
  await d.ctx.close();

  var duePeggio = [giro(1, 150, 24, "Campo A", "percorso"), giro(9, 200, 24, "Campo A", "percorso")];
  var e = await apri(browser, duePeggio);
  var ve = await e.page.evaluate(leggi);
  prova("e nemmeno se il secondo giro e' andato peggio",
        !ve.righe.filter(function (r) { return /record/i.test(r.nome); })[0].fatto);
  await e.ctx.close();

  var dueMeglio = [giro(1, 230, 24, "Campo A", "percorso"), giro(9, 200, 24, "Campo A", "percorso")];
  var f = await apri(browser, dueMeglio);
  var vf = await f.page.evaluate(leggi);
  prova("ma se lo hai battuto, si'",
        vf.righe.filter(function (r) { return /record/i.test(r.nome); })[0].fatto);
  prova("e la gara conta come gara",
        vf.fatti.some(function (x) { return /gara/i.test(x); }), vf.fatti.join(" | "));
  await f.ctx.close();

  console.log("\n  E SONO RIGHE, NON MEDAGLIE");
  var g = await apri(browser, dueMeglio);
  var vg = await g.page.evaluate(function () {
    var r = document.querySelector(".trag-riga");
    return { sette: document.querySelectorAll(".trag-riga").length,
             immagini: document.querySelectorAll(".trag-riga img, .trag-riga svg").length };
  });
  prova("sette voci", vg.sette === 7, vg.sette + "");
  prova("nessuna coccarda: niente immagini nelle righe", vg.immagini === 0, vg.immagini + "");
  await g.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
