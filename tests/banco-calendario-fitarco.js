#!/usr/bin/env node
/* banco-calendario-fitarco.js — le gare FITARCO 3D 2026 sono quelle dell'invito ufficiale.
 *
 *   node tests/banco-calendario-fitarco.js [app.html]
 *
 * (29/09/2026.) Fonte: https://www.fitarco-italia.org/gare/inviti.php, gare con
 * tipologia 3D future dal 29/09/2026. S2611006 (Citta' della Pieve, «12 piazzole
 * HF+12 piazzole 3D») e' sperimentale/mista: NON deve esserci.
 * Le gare verificate stanno scritte QUI, a mano, non lette dall'app.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var vm = require("vm");

var FILE = process.argv[2] || "app.html";
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function titolo(x) { console.log("\n  " + x); }

var INVITI = "https://www.fitarco-italia.org/gare/inviti.php";
var VERIFICATE = [
  { raceCode: "R2621020", date: "2026-10-03", location: "Bressanone/Brixen (BZ)", clubCode: "FT21013", title: "campionato provinciale 3° Trofeo del Castagno" },
  { raceCode: "R2621021", date: "2026-10-04", location: "Bressanone/Brixen (BZ)", clubCode: "FT21013", title: "Gara dell’amicizia 3D" },
  { raceCode: "R2612053", date: "2026-10-04", location: "Colleferro (RM)", clubCode: "FT12162", title: "Campionato regionale 3D" }
];

var SRC = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
var da = SRC.indexOf("function calFraGiorni(n){");
var a = SRC.indexOf("/* CHE COSA PUO' DIVENTARE UN LINK.");
if (da < 0 || a < da) { console.log("  ✗ il blocco del calendario non e' piu' dove pensavo"); process.exit(1); }
var ctx = { Date: Date, URL: URL, String: String, Object: Object, Array: Array };
vm.createContext(ctx);
vm.runInContext(SRC.slice(da, a) + "\n;this.__ = { CAL_GARE: CAL_GARE, CAL_FONTI: CAL_FONTI, CAL_AGGIORNATO: CAL_AGGIORNATO, calGaraValida: calGaraValida };", ctx);
var C = ctx.__;
var FIT = C.CAL_GARE.filter(function (e) { return e.federation === "fitarco"; });
var FIARC = C.CAL_GARE.filter(function (e) { return e.federation === "fiarc"; });
var COMP = (function () {
  var c = { window: {} };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("compagnie-data.js", "utf8") + "\n;this.__C = (typeof COMPAGNIE !== 'undefined') ? COMPAGNIE : window.COMPAGNIE;", c);
  return c.__C;
})();

(async function () {
  titolo("LE 3 GARE FITARCO 3D DELL'INVITO UFFICIALE");
  VERIFICATE.forEach(function (v) {
    var t = FIT.filter(function (e) { return e.raceCode === v.raceCode; });
    var e = t[0] || {};
    prova(v.raceCode + " " + v.date + " " + v.location,
      t.length === 1 && e.date === v.date && e.location === v.location && e.clubCode === v.clubCode && e.title === v.title &&
      e.roundType === "3D" && e.country === "it" && e.source === "FITARCO" && e.officialUrl === INVITI &&
      e.id === "fitarco-" + v.date + "-" + v.raceCode && e.registrationUrl === null,
      JSON.stringify(t));
  });
  prova("e nient'altro: 3 gare FITARCO", FIT.length === 3, FIT.length);
  prova("S2611006 (mista HF+3D) non c'e'", !/S2611006/.test(JSON.stringify(C.CAL_GARE)));
  prova("le 17 FIARC restano", FIARC.length === 17, FIARC.length);
  prova("societa' e regione da compagnie-data.js", FIT.every(function (e) {
    var c = COMP[e.clubCode]; return !!c && e.club === c.nome && e.region === c.regione;
  }));
  var f = C.CAL_FONTI["fitarco-2026-inviti"];
  prova("fonte FITARCO 2026 in CAL_FONTI, verificata il 29/09/2026",
    !!f && f.federation === "fitarco" && f.anno === 2026 && f.url === INVITI && f.verificata === "2026-09-29" && C.CAL_AGGIORNATO === "2026-09-29");
  prova("ogni gara FITARCO passa calGaraValida", FIT.every(C.calGaraValida));
  prova("«Codice gara FITARCO» in nove lingue", (SRC.match(/cal_det_codice_gara: "[^"]*FITARCO[^"]*"/g) || []).length === 9);

  titolo("NELL'APP");
  var chromium;
  try { chromium = require("playwright").chromium; } catch (e) { chromium = null; }
  prova("playwright c'e'", !!chromium);
  if (chromium) {
    var D = path.join(os.tmpdir(), "arctrail-banco-calendario-fitarco");
    if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
    fs.writeFileSync(path.join(D, "index.html"), require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
    ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
    var browser = await chromium.launch();
    var bctx = await browser.newContext({ viewport: { width: 390, height: 1600 } });
    await bctx.clock.setFixedTime(new Date("2026-09-29T10:00:00"));
    var st = { screen: "menu", tab: "campi", pendingArchers: [], lang: "it", country: "it", federation: "fitarco", theme: "light",
      profile: { nomeCognome: "Prova Banco", username: "banco", compagnia: "", compagniaNome: "", classe: "SM", arco: "longbow" }, profileSkipped: false };
    await bctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " + JSON.stringify(JSON.stringify(st)) +
      "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
    var page = await bctx.newPage();
    var err = [];
    page.on("pageerror", function (e) { err.push(String(e.message)); });
    await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
    await page.waitForTimeout(1200);
    await page.evaluate(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
        return x.querySelector(".tab-lbl") && /Campi|Fields/.test(x.querySelector(".tab-lbl").textContent);
      })[0];
      if (b) b.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(function () { var p = document.querySelector(".cal-porta"); if (p) p.click(); });
    await page.waitForTimeout(600);
    async function chip(nome) {
      await page.evaluate(function (n) {
        var b = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (c) { return c.textContent.trim() === n; })[0];
        if (b) b.click();
      }, nome);
      await page.waitForTimeout(300);
      return page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll(".al-blocco"), function (r) { return r.textContent; });
      });
    }
    var tutte = await page.evaluate(function () { return document.querySelectorAll(".al-blocco").length; });
    prova("il calendario si apre con 20 gare (17 FIARC + 3 FITARCO)", tutte === 20 && err.length === 0, tutte + " " + err.join(" | "));
    var rf = await chip("FITARCO");
    prova("filtro FITARCO: le 3 gare", rf.length === 3 && VERIFICATE.every(function (v) { return rf.some(function (t) { return t.indexOf(v.title) >= 0; }); }),
      JSON.stringify(rf));
    var det = await page.evaluate(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) { return /Colleferro/.test(x.textContent); })[0];
      if (!b) return { t: "", h: [] };
      b.querySelector(".al-tocca").click();
      var ap = document.querySelector(".al-blocco.aperta");
      return { t: ap ? ap.innerText : "", h: ap ? Array.prototype.map.call(ap.querySelectorAll("a[href]"), function (x) { return x.getAttribute("href"); }) : [] };
    });
    prova("scheda: codice gara, societa', luogo, fonte ufficiale",
      /Codice gara FITARCO\s*R2612053/.test(det.t) && /Arcieri della Volpe Bianca \(FT12162\)/.test(det.t) && /Colleferro \(RM\)/.test(det.t) &&
      det.h.indexOf(INVITI) >= 0, JSON.stringify(det));
    await chip("FITARCO");
    var rF = await chip("FIARC");
    prova("filtro FIARC: le 17 FIARC, nessuna FITARCO", rF.length === 17 && rF.every(function (t) { return !/FITARCO/.test(t); }), rF.length);
    await bctx.close();
    await browser.close();
  }
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.log("  ✗ il banco si e' fermato: " + (e && e.stack || e)); process.exit(1); });
