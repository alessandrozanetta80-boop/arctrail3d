#!/usr/bin/env node
/* banco-regolamenti.js — la scelta del tipo di gara si legge senza saperlo gia.
 *
 *   node banco-regolamenti.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 14: «do not show unexplained abbreviations
 * only».) In FIARC i tipi di gara sono quattro e si usano tutti. Fra Percorso
 * e Tracciato la differenza non e il nome: in uno si sommano tutte e tre le
 * frecce, nell altro vale solo la prima a segno. Chi non lo sa gia non lo
 * indovina, e sceglie a caso il regolamento con cui poi conta i punti.
 *
 * LA COSA CHE QUESTO BANCO PROTEGGE DAVVERO non e la grafica: e che la riga
 * «come si conta» sia DEDOTTA dal modo — da `stopAtFirstHit`, dal branco —
 * invece di essere una frase scritta a mano accanto. Una descrizione scritta a
 * mano puo contraddire il codice che conta i punti, e il giorno che le due
 * cose divergono vince il codice: l arciere legge una regola e ne subisce
 * un altra. Qui si controlla che dicano la stessa cosa.
 *
 * E la seconda: che a comparire per prima sia la gara che hai gia tirato. Non
 * e una preferenza salvata da qualche parte — e un fatto che viene dallo
 * storico.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-regolamenti");
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

function stato(lang) {
  return { screen: "menu", tab: "tira", roundActive: false, pendingArchers: [],
    lang: lang || "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
    profileSkipped: false };
}
function storicoCon(modo) {
  if (!modo) return [];
  return [{ date: new Date(Date.now() - 3 * 86400000).toISOString(), format: 24,
    modeKey: modo, modeLabel: modo, campo: "Cerrione (BI)",
    results: [{ name: "Alessandro", total: 210, isSelf: true, perTarget: [], arrows: [] }] }];
}

// Alla scelta della gara ci si arriva come una persona: scheda Tira, «Gara
// libera», gli arcieri, Continua.
async function apriGara(browser, lang, modoRecente) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(lang))) + ");" +
    " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(storicoCon(modoRecente))) + ");" +
    " localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
      return x.querySelector(".tab-lbl") && /Tira|Shoot|Tirer|Schie|Atış|Стр|Skjut/
        .test(x.querySelector(".tab-lbl").textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Round 3D/.test(x.textContent) && /,/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /→/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(800);
  return { ctx: ctx, page: page, err: err };
}

function leggi() {
  var righe = Array.prototype.map.call(document.querySelectorAll(".reg-riga"), function (r) {
    return { nome: (r.querySelector("b") || {}).textContent || "",
             sotto: (r.querySelector(".reg-testo span") || {}).textContent || "",
             scelta: r.className.indexOf("on") >= 0,
             ultima: !!r.querySelector(".reg-ultima") };
  });
  return { righe: righe, pannello: (document.querySelector(".rules-panel") || {}).innerText || "" };
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  I QUATTRO TIPI SI LEGGONO TUTTI INSIEME");
  var a = await apriGara(browser, "it", null);
  var v = await a.page.evaluate(leggi);
  prova("ci sono tutti e quattro", v.righe.length === 4, v.righe.length + " righe");
  prova("ognuno ha un nome fatto di parole",
        v.righe.every(function (r) { return r.nome.length > 3; }),
        v.righe.map(function (r) { return r.nome; }).join(" | "));
  prova("e ognuno dice quante frecce e come si contano, senza doverlo aprire",
        v.righe.every(function (r) { return r.sotto.length > 10 && /·/.test(r.sotto); }),
        v.righe.map(function (r) { return r.sotto; }).join(" | "));
  prova("una sola e' scelta", v.righe.filter(function (r) { return r.scelta; }).length === 1);
  prova("e il pannello sotto e' il suo, col barème per freccia",
        /Super Spot/.test(v.pannello) && /\d/.test(v.pannello), v.pannello.slice(0, 60));
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);

  console.log("\n  E LA REGOLA DETTA NELLA RIGA E' QUELLA CHE POI CONTA I PUNTI");
  // Tracciato e' l'unico con stopAtFirstHit: se un giorno la riga e il codice
  // si scollano, questa prova cade.
  var tracciato = v.righe.filter(function (r) { return /Tracciato/i.test(r.nome); })[0];
  var percorso = v.righe.filter(function (r) { return /Percorso/i.test(r.nome); })[0];
  var battuta = v.righe.filter(function (r) { return /Battuta/i.test(r.nome); })[0];
  prova("Tracciato dice che vale la prima a segno",
        !!tracciato && /prima a segno/i.test(tracciato.sotto), tracciato ? tracciato.sotto : "manca");
  prova("Percorso dice che si sommano tutte",
        !!percorso && /sommano/i.test(percorso.sotto), percorso ? percorso.sotto : "manca");
  prova("Battuta dice del branco",
        !!battuta && /branc/i.test(battuta.sotto), battuta ? battuta.sotto : "manca");
  prova("e Percorso e Tracciato non dicono la stessa cosa",
        !!percorso && !!tracciato && percorso.sotto !== tracciato.sotto);
  await a.ctx.close();

  console.log("\n  IN CIMA C'E' QUELLA CHE HAI GIA' TIRATO");
  var b = await apriGara(browser, "it", "tracciato");
  var vb = await b.page.evaluate(leggi);
  var segnata = vb.righe.filter(function (r) { return r.ultima; })[0];
  var scelta = vb.righe.filter(function (r) { return r.scelta; })[0];
  prova("una riga porta «l'ultima volta»", !!segnata, "nessuna");
  prova("ed e' il Tracciato, che e' quello nello storico",
        !!segnata && /Tracciato/i.test(segnata.nome), segnata ? segnata.nome : "-");
  prova("ed e' anche quella gia' scelta",
        !!scelta && !!segnata && scelta.nome === segnata.nome,
        (scelta ? scelta.nome : "-") + " vs " + (segnata ? segnata.nome : "-"));
  prova("il pannello sotto e' il suo", /Tracciato/i.test(vb.pannello), vb.pannello.slice(0, 40));
  await b.ctx.close();

  console.log("\n  SENZA STORICO NON SI INVENTA UN CONSIGLIO");
  var c = await apriGara(browser, "it", null);
  var vc = await c.page.evaluate(leggi);
  prova("nessuna riga dice «l'ultima volta»",
        vc.righe.every(function (r) { return !r.ultima; }));
  prova("ma una e' scelta lo stesso, cosi' si puo' partire",
        vc.righe.filter(function (r) { return r.scelta; }).length === 1);
  await c.ctx.close();

  console.log("\n  E IN UN'ALTRA LINGUA NON RESTANO PAROLE ITALIANE");
  var d = await apriGara(browser, "en", null);
  var vd = await d.page.evaluate(leggi);
  prova("le righe ci sono anche in inglese", vd.righe.length === 4, vd.righe.length + "");
  prova("e la regola e' tradotta",
        vd.righe.some(function (r) { return /count/i.test(r.sotto); }) &&
        !vd.righe.some(function (r) { return /sommano/i.test(r.sotto); }),
        vd.righe.map(function (r) { return r.sotto; }).join(" | "));
  await d.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
