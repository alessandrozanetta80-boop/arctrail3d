#!/usr/bin/env node
/* banco-riepilogo.js — il riepilogo permanente si aggiunge, non si rifa'.
 *
 *   node tests/banco-riepilogo.js
 *   APP=percorso node tests/banco-riepilogo.js   # sabotaggio
 *
 * PERCHE' ESISTE. (20/09/2026, audit P1.) Il riepilogo permanente
 * (`arctrail3d_lifetime_v1`) esiste per una ragione sola: lo storico si taglia
 * a 150 giri e i record devono sopravvivere al taglio. Il commento accanto
 * alla chiave dice «non viene mai cancellato dal taglio dello storico».
 *
 * In due punti il codice lo cancellava eccome — `removeItem(LIFETIME_KEY)` e
 * poi `backfillLifetimeOnce()`, che ricostruisce **dai giri rimasti**, cioe'
 * dai 150. Chi ne ha di piu', la prima volta che qualche giro scende dal
 * cloud, perdeva record e totali di tutto quello che stava oltre. Succede a
 * chi apre l'app su un secondo dispositivo: il caso normale, non quello raro.
 *
 * COSA PROVA. Un telefono con 150 giri in casa e un riepilogo che ne ha
 * contati 300 (i 150 tagliati piu' i 150 che ci sono). Scendono dal cloud 5
 * giri che il telefono non aveva.
 *   - prima: il riepilogo diceva 155 — i 300 erano spariti;
 *   - adesso: dice 305.
 * E riaprendo l'app dice ancora 305: contare due volte sarebbe l'altro modo
 * di sbagliare, ed e' la ragione per cui prima si rifaceva tutto da capo.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-riepilogo-"));
fs.writeFileSync(path.join(DOVE, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { stato: function(){ return JSON.parse(JSON.stringify(state)); } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

var U = { uid: "uidMario", email: "mario@esempio.it" };
var NOME = "mariorossi", MODO = "round3d";

/* Un giro come lo scrive l'app: `date` in ISO, `results` con il totale. */
function giro(i, tot) {
  var d = new Date(Date.UTC(2026, 0, 1 + i, 9, 0, 0)).toISOString();
  return { date: d, sessionType: "3d", format: 24, modeKey: MODO, modeLabel: "Round 3D",
           scoringVersion: null, campo: "Cerrione", durata: 180, deleted: false,
           results: [{ name: NOME, total: tot, isSelf: true, ownerUid: U.uid,
                       perTarget: [], arrows: [] }] };
}
// `roundDocId` in app.html: le cifre della data, prime 17.
function idDoc(dateISO) { return String(dateISO).replace(/[^0-9]/g, "").slice(0, 17); }

function cloudBase(storico) {
  var d = { users: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: NOME,
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  if (storico) d["users/" + U.uid + "/storico"] = storico;
  return d;
}
function statoBase() {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
           profile: { nomeCognome: "Mario Rossi", username: NOME, email: U.email,
                      federazioni: [{ code: "fiarc", tessera: "FI111" }] },
           profileSkipped: false, pendingArchers: [] };
}

var browser;
async function apri(seme, cloud) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    Object.keys(seme).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(seme[k]) + ");"; }).join("") + " } }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto("file://" + path.join(DOVE, "app.html").replace(/\\/g, "/"));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(2200);   // l'allineamento dello storico parte dopo l'accesso
  return { ctx: ctx, page: page, err: err };
}
function riepilogo(page) {
  return page.evaluate(function () {
    return { lt: JSON.parse(localStorage.getItem("arctrail3d_lifetime_v1") || "{}"),
             visti: JSON.parse(localStorage.getItem("arctrail3d_lifetime_visti_v1") || "null"),
             storico: JSON.parse(localStorage.getItem("arctrail3d_storico_v1") || "[]").length };
  });
}
function conta(r) {
  var k = Object.keys(r.lt).filter(function (x) { return x.indexOf(NOME + "|") === 0; })[0];
  return k ? r.lt[k] : null;
}

(async function () {
  browser = await chromium.launch();

  /* ── La scena: 150 giri in casa, 300 gia' contati, 5 che scendono ────── */
  var locali = [], cloudStorico = {};
  for (var i = 0; i < 150; i++) locali.push(giro(i, 300 + (i % 7)));
  // Sul cloud ci sono gli stessi 150 piu' 5 che questo telefono non ha mai visto.
  locali.forEach(function (h) { cloudStorico[idDoc(h.date)] = h; });
  var nuovi = [];
  for (var j = 200; j < 205; j++) { var g = giro(j, 500); nuovi.push(g); cloudStorico[idDoc(g.date)] = g; }

  // Il riepilogo di chi tira da prima: 300 giri, record 540. I 150 tagliati
  // non stanno piu' da nessuna parte se non qui — e' il suo mestiere.
  var lifetime = {};
  lifetime[NOME + "|" + MODO] = { name: NOME, modeKey: MODO, modeLabel: "Round 3D",
    rounds: 300, sum: 300 * 310, best: 540, bestDate: locali[10].date, bestFormat: 24,
    firstDate: locali[149].date, lastDate: locali[0].date, ownerUid: U.uid, isSelf: true };

  var seme = {
    "arctrail3d_state_v3": JSON.stringify(statoBase()),
    "arctrail3d_storico_v1": JSON.stringify(locali),
    "arctrail3d_lifetime_v1": JSON.stringify(lifetime),
    "arctrail3d_proprietario_v1": U.uid,
    "arctrail3d_welcome_v2": "1"
  };

  console.log("\n  150 GIRI IN CASA, 300 NEL RIEPILOGO, 5 CHE SCENDONO DAL CLOUD\n");
  var a = await apri(seme, cloudBase(cloudStorico));
  var ra = await riepilogo(a.page);
  var ea = conta(ra);
  prova("il riepilogo c'e' ancora", !!ea, JSON.stringify(Object.keys(ra.lt)));
  prova("i 300 giri di prima non sono spariti", !!ea && ea.rounds >= 300, ea ? "rounds=" + ea.rounds : "-");
  prova("e i 5 scesi dal cloud sono stati aggiunti (305)", !!ea && ea.rounds === 305, ea ? "rounds=" + ea.rounds : "-");
  prova("il record di prima regge (540, non il migliore dei 150 rimasti)",
        !!ea && ea.best === 540, ea ? "best=" + ea.best : "-");
  prova("lo storico in casa resta tagliato a 150", ra.storico === 150, "storico=" + ra.storico);
  prova("l'elenco dei giri contati e' stato scritto", !!ra.visti && Object.keys(ra.visti).length >= 155,
        ra.visti ? Object.keys(ra.visti).length + " identita'" : "nessun elenco");
  prova("nessun errore in pagina", a.err.length === 0, a.err.join(" | "));
  var semeDopo = await a.page.evaluate(function () {
    var o = {};
    ["arctrail3d_state_v3","arctrail3d_storico_v1","arctrail3d_lifetime_v1",
     "arctrail3d_lifetime_visti_v1","arctrail3d_proprietario_v1","arctrail3d_welcome_v2"]
      .forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) o[k] = v; });
    return o;
  });
  await a.ctx.close();

  /* ── Riaprire non deve contare due volte ─────────────────────────────── */
  console.log("\n  E RIAPRENDO NON SI CONTA DUE VOLTE\n");
  var b = await apri(semeDopo, cloudBase(cloudStorico));
  var rb = await riepilogo(b.page);
  var eb = conta(rb);
  prova("il riepilogo dice ancora 305", !!eb && eb.rounds === 305, eb ? "rounds=" + eb.rounds : "-");
  prova("nessun errore in pagina", b.err.length === 0, b.err.join(" | "));
  await b.ctx.close();

  /* ── Un giro interrotto non conta come giro intero ────────────────────── */
  console.log("\n  UN GIRO INTERROTTO NON CONTA COME GIRO INTERO\n");
  var conInterrotto = {};
  Object.keys(cloudStorico).forEach(function (k) { conInterrotto[k] = cloudStorico[k]; });
  var mezzo = giro(300, 120); mezzo.interrotto = true;
  conInterrotto[idDoc(mezzo.date)] = mezzo;
  var c = await apri(semeDopo, cloudBase(conInterrotto));
  var rc = await riepilogo(c.page);
  var ec = conta(rc);
  prova("scende un giro interrotto e il conto resta 305", !!ec && ec.rounds === 305, ec ? "rounds=" + ec.rounds : "-");
  prova("ma il giro interrotto e' comunque nel diario",
        await c.page.evaluate(function (d) {
          return JSON.parse(localStorage.getItem("arctrail3d_storico_v1") || "[]").some(function (h) { return h.date === d; });
        }, mezzo.date));
  prova("nessun errore in pagina", c.err.length === 0, c.err.join(" | "));
  await c.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
