#!/usr/bin/env node
/* e2e-storico-scomparso.js — «dopo il gate 1 vedo solo l'ultimo giro».
 *
 *   node_modules/.bin/firebase emulators:exec --only auth,firestore --project demo-arctrail3d \
 *     --config tests/e2e-firebase.json "node tests/e2e-storico-scomparso.js"
 *
 * (22/09/2026, segnalato da Alessandro dopo il gate 1.) Nel cloud i giri ci
 * sono tutti (verificato in sola lettura). Qui si rifa' il telefono com'era:
 * lo storico lasciato dall'app del 18/09, SENZA la chiave del proprietario
 * (l'app del 18/09 non la scriveva), e il profilo locale in tre forme; poi si
 * apre l'app del ramo con l'SDK vero sugli emulatori e si guarda cosa resta.
 */
"use strict";
var fs = require("fs"), path = require("path");
var { chromium } = require("playwright");
var C = require("./e2e-comune.js");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
/* La FORMA dei documenti veri (ricavata in sola lettura, senza valori): frecce
   codificate `arrows:[{v:[..]}]` (anche vuote), `deleted:false`, `consegna`
   con le firme, un secondo arciere con `ownerUid:null`, i campi del 20/09. */
function giro(uid, i, tot) {
  var g = { date: new Date(Date.UTC(2026, 7, 20 + i, 9)).toISOString(), deleted: false, modeKey: "round3d", modeLabel: "Round 3D", format: 3,
    consegna: null, results: [{ name: "alessandro", total: tot, isSelf: true, ownerUid: uid, perTarget: [11, 10, 8],
      arrows: [{ v: [11] }, { v: [10] }, (i === 3 ? { v: [] } : { v: [8] })] }] };
  if (i >= 4) { g.assetto = "a1"; g.assettoNome = "Ricurvo"; g.nota = null; }
  if (i === 6) {
    g.consegna = { at: g.date, firme: ["bea"], piazzole: 3 };
    g.results.unshift({ name: "bea", total: tot + 5, isSelf: false, ownerUid: null, perTarget: [11, 11, 11], arrows: [{ v: [11] }, { v: [11] }, { v: [11] }] });
  }
  if (i === 9) { g.durata = 3600; g.scoringVersion = "fiarc-2026"; g.sessionType = "3d"; g.campo = null; }
  return g;
}
function lapide(i) { return { date: new Date(Date.UTC(2026, 7, 10 + i, 9)).toISOString(), deleted: true }; }
function idDi(iso) { return String(iso).replace(/[^0-9]/g, "").slice(0, 17); }

async function scenario(browser, url, nome, profiloLocale) {
  console.log("\n  " + nome + "\n");
  await C.azzera();
  await C.regole(C.git("7b0ffe9:firestore.rules"));          // le regole di produzione
  var io = await C.account("ale@prova.it", "01VERB", true);
  await C.seme("users/" + io.uid, { email: io.email, approved: true, nomeCognome: "Alessandro Prova", username: "alessandro",
    compagnia: "01VERB", federazioni: [{ code: "fiarc", tessera: "FI1" }], privacy: true, terms: true });
  var giri = [];
  for (var i = 0; i < 10; i++) { var g = giro(io.uid, i, 100 + i); giri.unshift(g); await C.seme("users/" + io.uid + "/storico/" + idDi(g.date), g); }
  for (var k = 0; k < 7; k++) { var l = lapide(k); await C.seme("users/" + io.uid + "/storico/" + idDi(l.date), l); }

  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  var sdk = path.join(require("os").tmpdir(), "arctrail-sdk-10.12.2");
  await ctx.route(/^https?:\/\//, function (r) {
    var u = r.request().url();
    var m = u.match(/^https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-(\w+)-compat\.js$/);
    if (m) {
      var corpo = fs.readFileSync(path.join(sdk, "firebase-" + m[1] + "-compat.js"), "utf8");
      if (m[1] === "functions") corpo += C.PONTE;
      return r.fulfill({ status: 200, contentType: "text/javascript", body: corpo });
    }
    if (/^http:\/\/127\.0\.0\.1:(8080|9099)\//.test(u)) return r.continue();
    return r.abort();
  });
  // Il telefono dell'app del 18/09: storico, profilo, NESSUNA chiave del proprietario.
  var stato = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: profiloLocale, profileSkipped: false, pendingArchers: [] };
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(stato)) + ");" +
    "localStorage.setItem('arctrail3d_storico_v1'," + JSON.stringify(JSON.stringify(giri)) + ");" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = []; page.on("pageerror", function (e) { errori.push(String(e.message)); });
  await page.goto(url);
  await page.waitForFunction(function () { return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0; }, null, { timeout: 20000 });
  // Il primo accesso, come chi apre l'app gia' collegato.
  await page.evaluate(function () { return firebase.auth().signInWithEmailAndPassword("ale@prova.it", "segreta123"); });
  await page.reload();
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 });
  await page.waitForTimeout(4000);
  async function leggi() {
    await page.evaluate(function () { window.__prova.vai("diario", "rounds"); });
    await page.waitForTimeout(1200);
    return page.evaluate(function () {
      function j(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
      var righe = document.querySelectorAll("#app .timeline-row").length;
      window.__testo = (document.querySelector("#app") || {}).innerText || "";
      return { locali: (j("arctrail3d_storico_v1") || []).length, orfani: (j("arctrail3d_orfani_v1") || []).length,
               proprietario: localStorage.getItem("arctrail3d_proprietario_v1") ? "si" : "no", righeDiario: righe,
               aggiungili: /Aggiungili/.test(document.body.innerText), testo: window.__testo.replace(/\s+/g, " ").slice(0, 260) };
    });
  }
  var r1 = await leggi();
  console.log("    dopo l'apertura: " + JSON.stringify(r1));
  prova(nome + ": all'apertura il Diario mostra i 10 giri", r1.righeDiario >= 10, JSON.stringify(r1));
  await C.unGiro(page);
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 });
  await page.waitForTimeout(4000);
  var r2 = await leggi();
  console.log("    dopo un giro nuovo e la riapertura: " + JSON.stringify(r2));
  prova(nome + ": dopo un giro nuovo e la riapertura, 11 giri nel Diario", r2.righeDiario >= 11, JSON.stringify(r2));
  prova(nome + ": nessun errore in pagina", errori.length === 0, errori.slice(0, 2).join(" | "));
  await ctx.close();
}

(async function () {
  await C.librerie();
  var browser = await chromium.launch();
  var url = C.preparaApp("ramo", fs.readFileSync(process.env.APP || "app.html", "utf8"));
  await scenario(browser, url, "profilo CON email", { nomeCognome: "Alessandro Prova", username: "alessandro", email: "ale@prova.it", federazioni: [] });
  await scenario(browser, url, "profilo SENZA email", { nomeCognome: "Alessandro Prova", username: "alessandro", federazioni: [] });
  await scenario(browser, url, "profilo SENZA email ne' nome utente", { nomeCognome: "Alessandro Prova", federazioni: [] });
  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
