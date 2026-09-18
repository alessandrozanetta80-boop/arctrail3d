#!/usr/bin/env node
/* banco-italia.js — ArcTrail per un arciere italiano, provato come lo userebbe.
 *
 *   node tests/banco-italia.js            # tutto
 *   node tests/banco-italia.js --sabota   # rimette FIDASC fra le scelte: deve diventare rosso
 *
 * Nato il 18/09/2026 («Arc Trail Italia ready»). Guarda il COMPORTAMENTO,
 * sull'app vera in Chromium, e i barème scritti A MANO dalle fonti — non letti
 * da app.html, se no il banco controllerebbe il codice con se stesso.
 *
 * FONTI
 *   FIARC  — Regolamento Sportivo, delibera N. 033/2023/D del 02/12/2023
 *            https://www.fiarc.it/wp-content/uploads/2023/12/Regolamento-Sportivo_02122023.pdf
 *            (indicato come vigente in https://www.fiarc.it/download-regolamenti/, letto il 18/09/2026)
 *            Battuta art. 4, Percorso art. 5, Tracciato art. 6, Round 3D art. 7.
 *   FITARCO — Regolamento Tecnico di Tiro, Libro 2 e Libro 4, in vigore dal
 *            01/01/2026 (letto il 28/08/2026, vedi world-archery-3d.html#fitarco):
 *            24 sagome, due frecce per sagoma (Libro 4 art. 23.3.1), zone 11/10/8/5.
 *
 * COSA PROVA
 *   1. i barème FIARC e FITARCO, numero per numero;
 *   2. la fonte FIARC dichiarata e' il documento dei punteggi (il Sportivo);
 *   3. l'italiano delle descrizioni non contraddice il regolamento;
 *   4. FIDASC: NON proposta a chi arriva adesso, e INTATTA per chi l'ha gia';
 *   5. onboarding: un italiano trova FIARC e FITARCO per prime;
 *   6. E2E FIARC Round 3D: Tira → giro → chiudi a meta' → riapri → riprendi →
 *      fine → storico, senza rete;
 *   7. doppia federazione: FIARC e FITARCO nello stesso profilo, si cambia la
 *      federazione attiva e le tessere restano tutte e due;
 *   8. E2E FITARCO 3D, poi Diario e record: ogni giro nel suo regolamento.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), url = require("url");
var { chromium } = require("playwright");

var SABOTA = process.argv.indexOf("--sabota") !== -1;
var FILE = "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-italia");
fs.mkdirSync(D, { recursive: true });
var html = require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8"));
if (SABOTA) {
  html = html.replace("senzaRegolamento:true, fuoriElenco:true }", "senzaRegolamento:true }");
  console.log("\n  (SABOTAGGIO: FIDASC di nuovo fra le scelte)");
}
fs.writeFileSync(path.join(D, "index.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var PAGINA = url.pathToFileURL(path.join(D, "index.html")).href;


/* I BLOCCHI DELL'APP, LETTI DAL SORGENTE. Il codice gira in un contenitore
   chiuso: da fuori non si vede niente. Si ritagliano le tabelle e si valutano
   qui — lo stesso metodo di banco-asa e banco-ibo. */
function statico(src) {
  src = src.replace(/\r\n/g, "\n");
  function ritaglia(dal, al) {
    var a = src.indexOf(dal), b = src.indexOf(al, a);
    if (a < 0 || b < 0) throw new Error("non trovo il blocco: " + dal);
    return src.slice(a, b);
  }
  var FINE_OGG = "\n};\n", FINE_LISTA = "\n];\n";
  var blocco =
    ritaglia("var STRINGS = {", FINE_OGG) + FINE_OGG +
    ritaglia("var SS_SP_SAG =", "var CIRCUITI = {") +
    ritaglia("var REGOLAMENTI = {", FINE_OGG) + FINE_OGG +
    ritaglia("var FEDERATIONS = {", FINE_OGG) + FINE_OGG +
    ritaglia("var COUNTRY_FEDERATIONS = {", FINE_OGG) + FINE_OGG +
    ritaglia("var PROFILE_FEDERATIONS = [", FINE_LISTA) + FINE_LISTA +
    ritaglia("function fedProponibile(", "\n}\n") + "\n}\n" +
    "({ STRINGS: STRINGS, GAME_MODES: GAME_MODES, REGOLAMENTI: REGOLAMENTI, FEDERATIONS: FEDERATIONS," +
    "  COUNTRY_FEDERATIONS: COUNTRY_FEDERATIONS, PROFILE_FEDERATIONS: PROFILE_FEDERATIONS, fedProponibile: fedProponibile })";
  var A = eval(blocco);
  function m(k) {
    var x = A.GAME_MODES[k];
    return x ? { formats: x.formats, apt: x.arrowsPerTarget, scoring: x.scoring, stop: !!x.stopAtFirstHit,
      ta: x.targetArrows || null, reg: x.regolamento, zone: (x.zones || []).map(function (z) { return z.key; }) } : null;
  }
  var it = A.STRINGS.it;
  return { round3d: m("round3d"), percorso: m("percorso"), tracciato: m("tracciato"), battuta: m("battuta"),
    training: m("training"), fitarco3d: m("fitarco3d"), fitarco_training: m("fitarco_training"),
    reg: A.REGOLAMENTI.fiarc_rt, it: it,
    piquet: Object.keys(it).filter(function (k) { return typeof it[k] === "string" && /piquet/i.test(it[k]); }),
    fidasc: A.FEDERATIONS.fidasc, fiarc: A.FEDERATIONS.fiarc, fitarco: A.FEDERATIONS.fitarco,
    itFeds: (A.COUNTRY_FEDERATIONS.it || []).map(function (f) { return f.code; }),
    profilo: A.PROFILE_FEDERATIONS.map(function (f) { return f.code; }),
    propNuova: A.fedProponibile("fidasc", false), propMia: A.fedProponibile("fidasc", true),
    propFiarc: A.fedProponibile("fiarc", false), propFitarco: A.fedProponibile("fitarco", false) };
}

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function titolo(t) { console.log("\n  " + t + "\n"); }

function utente(fed, tessere, extra) {
  var s = { screen: "menu", tab: "home", lang: "it", country: "it", federation: fed, theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: tessere },
    profileSkipped: false, pendingArchers: [] };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}
async function apri(browser, stato, opz) {
  opz = opz || {};
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  if (stato) {
    await ctx.addInitScript("try{ if(!localStorage.getItem('banco-seme')){ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(stato)) + "); localStorage.setItem('arctrail3d_welcome_v2','1');" +
      (opz.storico ? " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(opz.storico)) + ");" : "") +
      " localStorage.setItem('banco-seme','1'); } }catch(e){}");
  }
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(PAGINA);
  await page.waitForTimeout(1300);
  return { ctx: ctx, page: page, err: err };
}
async function tocca(page, testo) {
  var fatto = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, #app a, .tabbar button"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, testo);
  await page.waitForTimeout(450);
  return fatto;
}
async function premi(page, css) {
  var fatto = await page.evaluate(function (c) { var x = document.querySelector(c); if (x) { x.click(); return true; } return false; }, css);
  await page.waitForTimeout(120);
  return fatto;
}
function leggi(page, chiave) {
  return page.evaluate(function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, chiave);
}
function testo(page) { return page.evaluate(function () { return document.querySelector("#app").innerText.replace(/\s+/g, " "); }); }
function sporge(page) { return page.evaluate(function () { return document.documentElement.scrollWidth - document.documentElement.clientWidth; }); }

(async function () {
  var browser = await chromium.launch();

  // ── 1-3. I barème, la fonte, le parole ────────────────────────────────
  var M = statico(html);

  function sss(v1, v2, v3) { return { superspot: v1, spot: v2, sagoma: v3 }; }
  function uguale(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
  titolo("1. FIARC — i barème del Regolamento Sportivo 2023, a mano");
  prova("Round 3D (art. 7): 24 piazzole, 2 frecce", M.round3d && uguale(M.round3d.formats, [24]) && M.round3d.apt === 2);
  prova("Round 3D (art. 7.2): 1ª 16/14/10, 2ª 9/7/5", M.round3d && uguale(M.round3d.scoring, { 1: sss(16, 14, 10), 2: sss(9, 7, 5) }), JSON.stringify(M.round3d && M.round3d.scoring));
  prova("Percorso (art. 5): 24 piazzole, 3 frecce sommate", M.percorso && uguale(M.percorso.formats, [24]) && M.percorso.apt === 3 && !M.percorso.stop);
  prova("Percorso (art. 5.2): 11/9/6, 9/7/4, 7/5/2", M.percorso && uguale(M.percorso.scoring, { 1: sss(11, 9, 6), 2: sss(9, 7, 4), 3: sss(7, 5, 2) }));
  prova("Tracciato (art. 6): 24 piazzole, fino a 3, vale la prima a punto", M.tracciato && uguale(M.tracciato.formats, [24]) && M.tracciato.apt === 3 && M.tracciato.stop);
  prova("Tracciato (art. 6.2): 22/20/16, 16/14/10, 10/8/4", M.tracciato && uguale(M.tracciato.scoring, { 1: sss(22, 20, 16), 2: sss(16, 14, 10), 3: sss(10, 8, 4) }));
  var ta = (M.battuta && M.battuta.ta) || [];
  prova("Battuta (art. 4.1): 28 piazzole, 48 frecce", M.battuta && uguale(M.battuta.formats, [28]) && ta.length === 28 &&
        ta.reduce(function (s, x) { return s + x; }, 0) === 48, ta.length + " piazzole, " + ta.reduce(function (s, x) { return s + x; }, 0) + " frecce");
  prova("Battuta (art. 4.1): 10 piazzole da 3 sagome (6 branchi + 4 a tempo), 18 da una",
        ta.filter(function (x) { return x === 3; }).length === 10 && ta.filter(function (x) { return x === 1; }).length === 18);
  prova("Battuta (art. 4.2): ogni sagoma 13/11/7", M.battuta && [1, 2, 3].every(function (i) { return uguale(M.battuta.scoring[i], sss(13, 11, 7)); }));
  prova("tutti i formati FIARC hanno solo Super Spot, Spot e Sagoma",
        ["round3d", "percorso", "tracciato", "battuta"].every(function (k) { return M[k] && uguale(M[k].zone, ["superspot", "spot", "sagoma"]); }));
  prova("la FIARC offre esattamente Round 3D, Percorso, Tracciato e Battuta",
        uguale(M.fiarc.garaModes, ["round3d", "percorso", "tracciato", "battuta"]));

  titolo("2. FIARC — la fonte dei punteggi e' il Regolamento Sportivo");
  prova("REGOLAMENTI.fiarc_rt si chiama Regolamento Sportivo", /Sportivo/.test(M.reg.nome), M.reg.nome);
  prova("...con la delibera 033/2023/D del 02/12/2023", /033\/2023/.test(M.reg.versione || "") && M.reg.dal === "2023-12-02");
  prova("...e l'indirizzo del PDF ufficiale", M.reg.url === "https://www.fiarc.it/wp-content/uploads/2023/12/Regolamento-Sportivo_02122023.pdf", M.reg.url);
  prova("...letto articolo per articolo: verificato", M.reg.verifica === "verificato", M.reg.verifica);

  titolo("3. L'italiano non contraddice il regolamento");
  prova("Round 3D: due distanze diverse, non «dallo stesso picchetto» (art. 7.1b)",
        !/stesso/i.test(M.it.mode_round3d_desc) && /distanze diverse/i.test(M.it.mode_round3d_desc), M.it.mode_round3d_desc);
  prova("Round 3D: il ginocchio non si impone, non e' «mai ammesso» (art. 7.1f)",
        !/mai ammesso/i.test(M.it.mode_round3d_desc), M.it.mode_round3d_desc);
  prova("in italiano si dice picchetto: nessuna frase con «piquet»", M.piquet.length === 0, M.piquet.join(", "));

  titolo("4. FIDASC — nascosta a chi arriva, intatta per chi c'e'");
  prova("FIDASC esiste ancora nel motore, senza regolamento", !!M.fidasc && M.fidasc.senzaRegolamento === true);
  prova("resta fra le federazioni italiane (etichetta, bandiera, Impostazioni)", M.itFeds.indexOf("fidasc") >= 0, M.itFeds.join(","));
  prova("resta fra le tessere possibili (chi ce l'ha la rivede)", M.profilo.indexOf("fidasc") >= 0);
  prova("non si propone a chi arriva adesso", M.propNuova === false);
  prova("si propone a chi ce l'ha gia'", M.propMia === true);
  prova("FIARC e FITARCO si propongono", M.propFiarc === true && M.propFitarco === true);

  // setup di un italiano nuovo
  var b = await apri(browser, { screen: "setup", lang: "it", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: [] }, profileSkipped: false });
  var nuovo = await b.page.evaluate(function () {
    return { scelte: Array.prototype.map.call(document.querySelectorAll(".fed-scelta"), function (x) { return x.textContent.trim(); }),
      paese: (document.querySelectorAll("#app select")[1] || {}).value, testo: document.querySelector("#app").innerText };
  });
  prova("primo avvio in italiano: la nazione e' gia' Italia", nuovo.paese === "it", nuovo.paese);
  prova("primo avvio: si sceglie fra FIARC e FITARCO, e basta", uguale(nuovo.scelte, ["FIARC", "FITARCO"]), nuovo.scelte.join(", "));
  prova("primo avvio: nessuna parola inglese nei passi", !/\b(Language|Country|Federation|Choose|Confirm)\b/.test(nuovo.testo));
  await b.ctx.close();

  // registrazione
  var r = await apri(browser, null);
  await r.page.locator("#app select").first().selectOption("it");
  await r.page.waitForTimeout(500);
  await tocca(r.page, "Registrati");
  var reg = await r.page.evaluate(function () {
    var s = document.querySelector("select.fed-aggiungi");
    return s ? Array.prototype.map.call(s.options, function (o) { return o.value; }).filter(Boolean) : [];
  });
  prova("registrazione: la tendina parte da FIARC e FITARCO", reg[0] === "fiarc" && reg[1] === "fitarco", reg.slice(0, 4).join(","));
  prova("registrazione: FIDASC non e' fra le federazioni da aggiungere", reg.indexOf("fidasc") < 0);
  prova("registrazione: ASA e IBO ci sono, ma non davanti", reg.indexOf("asa") > 1 && reg.indexOf("ibo") > 1);
  await r.ctx.close();

  // utente storico FIDASC
  var v = await apri(browser, utente("fidasc", [{ code: "fidasc", tessera: "FD123" }]));
  var pastiglia = await premi(v.page, ".bar-btn:nth-of-type(3)");
  await v.page.waitForTimeout(500);
  var profiloFidasc = await testo(v.page);
  prova("storico FIDASC: il profilo dice ancora FIDASC · Italia", pastiglia && /FIDASC · Italia/.test(profiloFidasc));
  await tocca(v.page, "FIDASC · Italia");
  var imp = await v.page.evaluate(function () {
    var s = document.getElementById("setupSelFed");
    return { opzioni: s ? Array.prototype.map.call(s.options, function (o) { return o.value; }) : [], valore: s ? s.value : null,
      conferma: Array.prototype.some.call(document.querySelectorAll("#app button"), function (x) { return /Conferma/.test(x.textContent); }) };
  });
  prova("storico FIDASC: nelle Impostazioni FIDASC e' ancora la sua, selezionata", imp.valore === "fidasc", imp.opzioni.join(",") + " = " + imp.valore);
  prova("storico FIDASC: «Conferma» c'e' (non resta bloccato)", imp.conferma);
  var stV = await leggi(v.page, "arctrail3d_state_v3");
  prova("storico FIDASC: tessera e federazione non cambiate", stV.federation === "fidasc" && stV.profile.federazioni[0].tessera === "FD123");
  await v.ctx.close();

  var v2 = await apri(browser, utente("fidasc", [{ code: "fidasc", tessera: "FD123" }]));
  await tocca(v2.page, "Tira");
  prova("storico FIDASC: Tira dice onestamente che il regolamento non c'e'", /non ha ancora il regolamento/.test(await testo(v2.page)));
  prova("nessun errore in pagina (FIDASC)", v.err.length === 0 && v2.err.length === 0, v.err.concat(v2.err)[0]);
  await v2.ctx.close();

  // ── 6. E2E FIARC ───────────────────────────────────────────────────────
  titolo("6. FIARC Round 3D dall'inizio alla fine, senza rete");
  var dueTessere = [{ code: "fiarc", tessera: "FI111" }, { code: "fitarco", tessera: "FT222" }];
  var f = await apri(browser, utente("fiarc", dueTessere));
  await f.ctx.setOffline(true);
  await tocca(f.page, "Tira");
  await tocca(f.page, "Gara libera");
  await tocca(f.page, "Continua");
  var righe = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".reg-riga b"), function (x) { return x.textContent.trim(); });
  });
  prova("Tira FIARC offre Round 3D, Percorso, Tracciato, Battuta — e nient'altro", uguale(righe, ["Round 3D", "Percorso", "Tracciato", "Battuta"]), righe.join(", "));
  await tocca(f.page, "Round 3D");
  await tocca(f.page, "Inizia gara");
  var zoneGiro = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".quick-btn"), function (x) { return x.textContent.replace(/\s+/g, " ").trim(); });
  });
  prova("i tasti della 1ª freccia sono Super Spot 16, Spot 14, Sagoma 10, Nulla 0",
        uguale(zoneGiro, ["Super Spot16", "Spot14", "Sagoma10", "Nulla0"]), zoneGiro.join(" | "));
  // dieci piazzole: Super Spot poi Spot = 16 + 7 = 23
  for (var i = 0; i < 10; i++) { await premi(f.page, ".quick-btn.superspot"); await premi(f.page, ".quick-btn.spot"); }
  await f.page.waitForTimeout(400);
  var aMeta = await leggi(f.page, "arctrail3d_state_v3");
  prova("dopo 10 piazzole il giro e' salvato sul telefono: 10 × 23",
        aMeta.roundActive && aMeta.mode === "round3d" && aMeta.scores && aMeta.target === 11 &&
        aMeta.scores[Object.keys(aMeta.scores)[0]].reduce(function (s, x) { return s + x.total; }, 0) === 230,
        aMeta.target + " / " + JSON.stringify(aMeta.scores).slice(0, 80));
  // chiudi l'app a meta' giro e riaprila
  var pagina2 = await f.ctx.newPage();
  await f.page.close();
  f.page = pagina2; f.page.on("pageerror", function (e) { f.err.push(String(e.message)); });
  await f.page.goto(PAGINA); await f.page.waitForTimeout(1300);
  prova("riaperta senza rete: la Home offre «Riprendi percorso»", /Riprendi percorso/.test(await testo(f.page)));
  await premi(f.page, ".home-riprendi"); await f.page.waitForTimeout(500);
  prova("ripreso alla piazzola 11 di 24", /PIAZZOLA 11 \/ 24/i.test(await testo(f.page)));
  for (var j = 10; j < 24; j++) { await premi(f.page, ".quick-btn.superspot"); await premi(f.page, ".quick-btn.spot"); }
  await f.page.waitForTimeout(500);
  prova("fine giro: 24 × 23 = 552", /552/.test(await testo(f.page)));
  await tocca(f.page, "Vedi classifica finale");
  await tocca(f.page, "Torna al menu");
  var storico = await leggi(f.page, "arctrail3d_storico_v1") || [];
  var g = storico[0] || {};
  prova("nello storico: Round 3D, 24 piazzole, 552", g.modeKey === "round3d" && g.format === 24 &&
        g.results && g.results[0].total === 552, JSON.stringify({ m: g.modeKey, f: g.format, t: g.results && g.results[0].total }));
  prova("frecce registrate: 24 piazzole da [16, 7]", g.results && g.results[0].arrows && g.results[0].arrows.length === 24 &&
        g.results[0].arrows.every(function (x) { return uguale(x, [16, 7]); }));
  prova("il giro chiuso non e' piu' «in corso»", !(await leggi(f.page, "arctrail3d_state_v3")).roundActive);
  prova("nessun errore in pagina (FIARC, senza rete)", f.err.length === 0, f.err[0]);
  prova("nessuno scorrimento di lato", (await sporge(f.page)) <= 0);

  // ── 7. Doppia federazione ─────────────────────────────────────────────
  titolo("7. FIARC e FITARCO nello stesso profilo");
  await f.ctx.setOffline(false);
  await premi(f.page, ".bar-btn:nth-of-type(3)"); await f.page.waitForTimeout(500);
  prova("il profilo mostra la federazione attiva: FIARC · Italia", /FIARC · Italia/.test(await testo(f.page)));
  await tocca(f.page, "FIARC · Italia");
  await f.page.selectOption("#setupSelFed", "fitarco"); await f.page.waitForTimeout(500);
  await tocca(f.page, "Conferma"); await f.page.waitForTimeout(400);
  var dopo = await leggi(f.page, "arctrail3d_state_v3");
  prova("la federazione attiva ora e' FITARCO", dopo.federation === "fitarco", dopo.federation);
  prova("le due tessere sono ancora li', ognuna col suo numero",
        uguale(dopo.profile.federazioni, dueTessere), JSON.stringify(dopo.profile.federazioni));
  await premi(f.page, ".bar-btn:nth-of-type(3)"); await f.page.waitForTimeout(400);
  await tocca(f.page, "Impostazioni"); await f.page.waitForTimeout(400);
  var righeProfilo = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll("input[data-tessera-fed]"), function (x) {
      return x.getAttribute("data-tessera-fed") + "=" + x.value; });
  });
  prova("in «Modifica profilo» due righe: FIARC FI111 e FITARCO FT222",
        uguale(righeProfilo, ["fiarc=FI111", "fitarco=FT222"]), righeProfilo.join(", "));
  // cambio una tessera sola
  await f.page.fill('input[data-tessera-fed="fitarco"]', "FT999");
  await tocca(f.page, "Salva modifiche"); await f.page.waitForTimeout(500);
  var salvato = await leggi(f.page, "arctrail3d_state_v3");
  var pf = (salvato.profile && salvato.profile.federazioni) || [];
  prova("modificata FITARCO, FIARC resta com'era",
        uguale(pf, [{ code: "fiarc", tessera: "FI111" }, { code: "fitarco", tessera: "FT999" }]), JSON.stringify(pf));

  // ── 8. E2E FITARCO ─────────────────────────────────────────────────────
  titolo("8. FITARCO 3D, poi Diario e record");
  await tocca(f.page, "Tira");
  await tocca(f.page, "Gara libera");
  await tocca(f.page, "Continua");
  var righeFt = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".reg-riga b"), function (x) { return x.textContent.trim(); });
  });
  prova("Tira FITARCO non offre nessun formato FIARC",
        righeFt.length >= 1 && !righeFt.some(function (x) { return /Round 3D|Percorso|Tracciato|Battuta/.test(x); }), righeFt.join(", "));
  await tocca(f.page, "Inizia gara");
  var zoneFt = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".quick-btn"), function (x) { return x.className.replace(/btn|quick-btn/g, "").trim() + "=" + x.textContent.replace(/\D+/g, ""); });
  });
  prova("FITARCO: zone 11 / 10 / 8 / 5 / 0", uguale(zoneFt, ["perfect=11", "superspot=10", "spot=8", "sagoma=5", "zero=0"]), zoneFt.join(" | "));
  // Libro 2, art. 9.2.2: piccolo cerchio 11, grande cerchio 10, zona vitale 8,
  // resto del corpo 5. «Super Spot» e «Perfect» sono parole FIARC/IFAA.
  var nomiFt = await f.page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".quick-btn"), function (x) { return x.textContent.replace(/\d+/g, "").replace(/\s+/g, " ").trim(); });
  });
  prova("FITARCO parla FITARCO: Cerchio piccolo, Cerchio grande, Zona vitale, Corpo",
        uguale(nomiFt.slice(0, 4), ["Cerchio piccolo", "Cerchio grande", "Zona vitale", "Corpo"]), nomiFt.join(" | "));
  prova("...nessuna parola FIARC sui tasti FITARCO", !nomiFt.some(function (x) { return /Super Spot|Perfect/.test(x); }));
  prova("...niente esce dallo schermo a 390px", (await sporge(f.page)) <= 0);
  for (var k = 0; k < 24; k++) { await premi(f.page, ".quick-btn.perfect"); await premi(f.page, ".quick-btn.superspot"); }
  await f.page.waitForTimeout(500);
  prova("fine giro FITARCO: 24 × 21 = 504", /504/.test(await testo(f.page)));
  await tocca(f.page, "Vedi classifica finale");
  await tocca(f.page, "Torna al menu");
  var storico2 = await leggi(f.page, "arctrail3d_storico_v1") || [];
  var ft = storico2.filter(function (x) { return x.modeKey === "fitarco3d"; })[0] || {};
  prova("nello storico: FITARCO 3D, 24 piazzole, 504", ft.format === 24 && ft.results && ft.results[0].total === 504);
  prova("seconda freccia FITARCO: stesso valore della prima (11+10, non un barème FIARC)",
        ft.results && ft.results[0].arrows.every(function (x) { return uguale(x, [11, 10]); }));
  var vita = await leggi(f.page, "arctrail3d_lifetime_v1") || {};
  var chiavi = Object.keys(vita);
  var rFiarc = chiavi.filter(function (x) { return /\|round3d$/.test(x); }).map(function (x) { return vita[x]; })[0];
  var rFt = chiavi.filter(function (x) { return /\|fitarco3d$/.test(x); }).map(function (x) { return vita[x]; })[0];
  prova("record separati: Round 3D FIARC 552", rFiarc && rFiarc.best === 552 && rFiarc.rounds === 1, JSON.stringify(rFiarc));
  prova("record separati: 3D FITARCO 504", rFt && rFt.best === 504 && rFt.rounds === 1, JSON.stringify(rFt));

  // chiudi e riapri: il Diario li ha tutti e due, ognuno col suo nome
  var pagina3 = await f.ctx.newPage();
  await f.page.close(); f.page = pagina3;
  f.page.on("pageerror", function (e) { f.err.push(String(e.message)); });
  await f.page.goto(PAGINA); await f.page.waitForTimeout(1300);
  await premi(f.page, ".bar-btn:nth-of-type(3)"); await f.page.waitForTimeout(400);
  await premi(f.page, ".riga-diario"); await f.page.waitForTimeout(700);
  var diario = await testo(f.page);
  prova("Diario «Insieme»: media e record del regolamento attivo, 504 · 3D",
        /504 Media · 3D/.test(diario) && /504 Record · 3D/.test(diario), diario.slice(0, 300));
  prova("...e non una media mescolata FIARC+FITARCO (528)", !/528/.test(diario));
  await tocca(f.page, "Giri"); await f.page.waitForTimeout(500);
  var giri = await testo(f.page);
  prova("riaperta l'app, «Giri» ha il giro FIARC: Round 3D 552", /Round 3D/.test(giri) && /552/.test(giri), giri.slice(0, 400));
  prova("...e il giro FITARCO: 504", /504/.test(giri));
  prova("nessun errore in pagina (doppia federazione e FITARCO)", f.err.length === 0, f.err[0]);
  prova("nessuno scorrimento di lato nel Diario", (await sporge(f.page)) <= 0);
  await f.ctx.close();

  // ── 9. La porta dell'accesso ──────────────────────────────────────────
  /* Trovato sul sito vero il 18/09/2026: a ogni schermata «Accedi»
     «passInput is not defined», e Invio nel campo password non faceva
     niente. Si prova da una copia SENZA l'utente finto, cioe' da fuori. */
  titolo("9. Accedi: nessun errore, e Invio nella password invia");
  var fuori = path.join(os.tmpdir(), "arctrail-banco-italia-porta");
  fs.mkdirSync(fuori, { recursive: true });
  // In DEV_MODE «Accedi» entra e basta: nella copia si parte da «needLogin»,
  // lo stato in cui il sito vero disegna la schermata di accesso.
  var PARTENZA = 'var authState = DEV_MODE ? "ready"';
  var copiaPorta = require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8"), { utente: false });
  prova("la riga dello stato di accesso si trova", copiaPorta.indexOf(PARTENZA) >= 0);
  fs.writeFileSync(path.join(fuori, "index.html"), copiaPorta.replace(PARTENZA, 'var authState = DEV_MODE ? "needLogin"'));
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(fuori, x)); });
  var cp = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await cp.addInitScript(function () { localStorage.setItem("arctrail3d_state_v3", JSON.stringify({ screen: "menu", lang: "it", country: "it", federation: "fiarc", profile: { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: [{ code: "fiarc", tessera: "FI111" }] }, profileSkipped: false })); localStorage.setItem("arctrail3d_welcome_v2", "1"); });
  var pp = await cp.newPage();
  var errP = [];
  pp.on("pageerror", function (e) { errP.push(String(e.message)); });
  await pp.goto(url.pathToFileURL(path.join(fuori, "index.html")).href); await pp.waitForTimeout(1200);
  var campi = await pp.evaluate(function () { return !!document.getElementById("loginEmailInput") && !!document.getElementById("loginPasswordInput"); });
  prova("la schermata Accedi si apre, con email e password", campi);
  await pp.fill("#loginEmailInput", "non-una-email");
  await pp.fill("#loginPasswordInput", "segreta1");
  await pp.press("#loginPasswordInput", "Enter"); await pp.waitForTimeout(400);
  prova("Invio nella password invia: risponde «email non valida»", /email valida/i.test(await testo(pp)));
  prova("nessun errore in pagina sulla porta", errP.length === 0, errP[0]);
  await cp.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
