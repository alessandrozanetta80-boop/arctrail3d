#!/usr/bin/env node
/* banco-storico-150.js — lo storico oltre i 150 giri: si vede tutto, non si
 * perde niente, e aprire l'app non scarica tutto il database.
 *
 *   node tests/banco-storico-150.js
 *   APP=percorso node tests/banco-storico-150.js   # sabotaggio
 *
 * PERCHE' ESISTE. (21/09/2026.) Il telefono tiene i 150 giri piu' recenti
 * (HISTORY_MAX); il cloud li tiene tutti. Fino a oggi:
 *   - la scheda «Giri» ne mostrava VENTI (`hist.slice(0,20)`);
 *   - quelli oltre i 150 non si vedevano da nessuna parte;
 *   - `pushLocalHistoryToCloud` leggeva TUTTA la raccolta `storico` a ogni
 *     apertura (con 2.000 giri, 2.000 letture ogni volta).
 * Nessuna di queste cose e' la «regressione della registrazione» del 20/09:
 * e' un altro problema, e ha il suo banco.
 *
 * I giri sono riconoscibili dal totale: il giro i ha totale i e data
 * crescente con i, quindi l'elenco giusto e' N-1, N-2, ..., 0.
 *
 * L'app gira sul suo percorso di produzione (firebase-finto.js), senza rete.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-150-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { storico: function(){ try{ return JSON.parse(localStorage.getItem('arctrail3d_storico_v1')||'[]'); }catch(e){ return []; } }," +
          " vai: function(s, tab){ state.screen = s; if(tab) state.journalTab = tab; save(); render(); } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var U = { uid: "uidMario", email: "mario@esempio.it" };
var BASE = Date.UTC(2024, 0, 1, 8, 0, 0);
function data(i) { return new Date(BASE + i * 3600 * 1000).toISOString(); }
function idDi(iso) { return String(iso).replace(/[^0-9]/g, "").slice(0, 17); }
function giro(i) {
  return { date: data(i), modeKey: "round3d", modeLabel: "Round 3D", format: 24, sessionType: "3d", deleted: false,
    results: [{ name: "mariorossi", total: i, isSelf: true, ownerUid: U.uid, perTarget: [] }] };
}
/* N giri sul cloud; nel telefono i `locali` piu' recenti (come li lascerebbe l'app). */
function scena(N, locali, extra) {
  var dati = { users: {}, public_profiles: {} };
  dati.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                        federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  var st = {};
  for (var i = 0; i < N; i++) st[idDi(data(i))] = giro(i);
  (extra && extra.lapidi || []).forEach(function (i) { st[idDi(data(i))] = { date: data(i), deleted: true }; });
  dati["users/" + U.uid + "/storico"] = st;
  var loc = [];
  for (var j = N - 1; j >= Math.max(0, N - locali); j--) if (!(extra && extra.lapidi || []).includes(j)) loc.push(giro(j));
  return { dati: dati, locali: loc };
}
var STATO = { screen: "diario", journalTab: "rounds", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email, federazioni: [{ code: "fiarc", tessera: "FI111" }] },
  profileSkipped: false, pendingArchers: [] };

async function apri(browser, sc, opz) {
  opz = opz || {};
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  if (opz.senzaFirebase !== true) await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: sc.dati }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(STATO)) + ");" +
    "localStorage.setItem('arctrail3d_storico_v1'," + JSON.stringify(JSON.stringify(sc.locali)) + ");" +
    "localStorage.setItem('arctrail3d_proprietario_v1','" + U.uid + "');" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  await page.goto(URL);
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  // L'app all'avvio torna alla Home: al Diario, scheda «Giri», ci si va come farebbe una persona.
  await page.evaluate(function () { window.__prova.vai("diario", "rounds"); });
  await page.waitForTimeout(300);
  if (process.env.DEBUG) console.log("    [schermo] " + (await page.evaluate(function () { return document.querySelector("#app").innerText.replace(/\s+/g, " ").slice(0, 300); })));
  return { ctx: ctx, page: page, errori: errori };
}
function righe(page) {
  return page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll("#app .timeline-row .timeline-result"), function (x) {
      var m = x.textContent.match(/(\d+)pt/); return m ? +m[1] : null; });
  });
}
/* L'identita' di una riga per contare i doppioni: data, ora e punteggio. */
function chiavi(page) {
  return page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll("#app .timeline-row"), function (x) { return x.innerText.replace(/\s+/g, " "); });
  });
}
async function clic(page, css) {
  var c = await page.evaluate(function (s) { var x = document.querySelector(s); if (x && !x.disabled) { x.click(); return true; } return false; }, css);
  await page.waitForTimeout(250);
  return c;
}
/* Si scorre tutto: «Mostra altri» finche' c'e', poi «Carica i giri piu' vecchi» finche' c'e'. */
async function tutto(page, maxClic) {
  var altri = 0, vecchi = 0;
  for (var k = 0; k < (maxClic || 400); k++) {
    if (await clic(page, "#app .giri-altri")) { altri++; continue; }
    if (await clic(page, "#app .giri-vecchi")) { vecchi++; continue; }
    break;
  }
  return { altri: altri, vecchi: vecchi };
}
function attesi(N, lapidi) { var a = []; for (var i = N - 1; i >= 0; i--) if (!(lapidi || []).includes(i)) a.push(i); return a; }
function uguali(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }
function doppioni(a) { var v = {}, d = 0; a.forEach(function (x) { if (v[x]) d++; v[x] = 1; }); return d; }

(async function () {
  var browser = await chromium.launch();

  for (var N of [149, 150, 151]) {
    console.log("\n  " + N + " GIRI\n");
    var x = await apri(browser, scena(N, 150));
    var r0 = await righe(x.page);
    prova(N + ": all'apertura se ne vedono 20, i piu' recenti", uguali(r0, attesi(N).slice(0, 20)), JSON.stringify(r0.slice(0, 5)));
    var passi = await tutto(x.page);
    var r = await righe(x.page);
    prova(N + ": scorrendo si vedono TUTTI (" + N + ")", r.length === N, "visti " + r.length + " · " + JSON.stringify(passi));
    prova(N + ": in ordine cronologico, dal piu' recente", uguali(r, attesi(N)), "primi " + JSON.stringify(r.slice(0, 3)) + " ultimi " + JSON.stringify(r.slice(-3)));
    prova(N + ": nessun doppione", doppioni(r) === 0, doppioni(r) + " doppioni");
    var loc = (await x.page.evaluate(function () { return window.__prova.storico(); })).length;
    prova(N + ": il telefono ne tiene al massimo 150 (i vecchi restano in memoria)", loc === Math.min(N, 150), "nel telefono " + loc);
    var fine = await x.page.evaluate(function () { return !!document.querySelector("#app .giri-vecchi-finiti") || !document.querySelector("#app .giri-vecchi"); });
    prova(N + ": alla fine lo dice e non offre altro", fine);
    prova(N + ": nessun errore in pagina", x.errori.length === 0, x.errori.slice(0, 2).join(" | "));
    await x.ctx.close();
  }

  console.log("\n  IL 151° GIRO TIRATO DAVVERO: IL PRIMO NON SI PERDE\n");
  var y = await apri(browser, scena(150, 150));
  await y.page.evaluate(function () { window.__prova.vai("menu"); });
  var tocca = async function (t) { await y.page.evaluate(function (tt) { var b = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button, #app a"), function (b) { return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(tt) >= 0; })[0]; if (b) b.click(); }, t); await y.page.waitForTimeout(450); };
  await tocca("Tira"); await tocca("Gara libera"); await tocca("Continua"); await tocca("Round 3D"); await tocca("Inizia gara");
  for (var i = 0; i < 2; i++) { await clic(y.page, ".quick-btn.superspot"); await clic(y.page, ".quick-btn.spot"); }
  await tocca("Classifica"); await tocca("Termina percorso"); await tocca("Tocca di nuovo per confermare");
  await y.page.waitForTimeout(1200);
  var st = await y.page.evaluate(function () {
    var c = window.__DATI["users/uidMario/storico"] || {};
    return { locali: window.__prova.storico().length, cloud: Object.keys(c).filter(function (k) { return c[k] && !c[k].deleted; }).length,
             primoSulCloud: !!c[Object.keys(c).sort()[0]] && c[Object.keys(c).sort()[0]].deleted !== true };
  });
  prova("151°: nel telefono restano 150", st.locali === 150, JSON.stringify(st));
  prova("151°: sul cloud ci sono tutti e 151", st.cloud === 151, JSON.stringify(st));
  prova("151°: il giro piu' vecchio NON e' stato cancellato dal cloud", st.primoSulCloud);
  await y.page.evaluate(function () { window.__prova.vai("diario", "rounds"); });
  await y.page.waitForTimeout(400);
  await tutto(y.page);
  var ry = await righe(y.page);
  prova("151°: nel Diario si arriva fino al primo giro (totale 0)", ry.length === 151 && ry[ry.length - 1] === 0, "visti " + ry.length + ", ultimo " + ry[ry.length - 1]);
  var ky = await chiavi(y.page);
  prova("151°: nessun doppione", doppioni(ky) === 0, doppioni(ky) + " doppioni");
  await y.ctx.close();

  console.log("\n  2.000 GIRI: APRIRE NON COSTA 2.000 LETTURE\n");
  var z = await apri(browser, scena(2000, 150));
  await z.page.waitForTimeout(1500);
  var l0 = await z.page.evaluate(function () { return (window.__letture || {})["users/uidMario/storico"] || 0; });
  prova("aprire l'app legge al massimo 300 + 150 documenti dello storico (prima: 2.300)", l0 > 0 && l0 <= 450, "letture " + l0);
  await clic(z.page, "#app .giri-altri");
  var r1 = await righe(z.page);
  prova("«Mostra altri» usa i giri del telefono: nessuna lettura in piu'", (await z.page.evaluate(function () { return window.__letture["users/uidMario/storico"]; })) === l0 && r1.length === 40);
  for (var k = 0; k < 7; k++) await clic(z.page, "#app .giri-altri");
  var l1 = await z.page.evaluate(function () { return window.__letture["users/uidMario/storico"]; });
  await clic(z.page, "#app .giri-vecchi");
  var l2 = await z.page.evaluate(function () { return window.__letture["users/uidMario/storico"]; });
  var r2 = await righe(z.page);
  prova("«Carica i giri piu' vecchi» legge UN blocco (30), non il resto", l2 - l1 === 30, "letture del tocco: " + (l2 - l1));
  prova("...e ne mostra 30 in piu', continuando la sequenza", r2.length === 180 && uguali(r2, attesi(2000).slice(0, 180)), "visti " + r2.length + " · " + JSON.stringify(r2.slice(148, 152)));
  for (k = 0; k < 3; k++) await clic(z.page, "#app .giri-vecchi");
  var r3 = await righe(z.page);
  prova("tre blocchi dopo: 270 in fila, nessun doppione, nessun buco", uguali(r3, attesi(2000).slice(0, 270)) && doppioni(r3) === 0, "visti " + r3.length);
  var mem = await z.page.evaluate(function () { return localStorage.getItem("arctrail3d_storico_v1").length; });
  prova("lo spazio nel telefono non cresce: sempre 150 giri", (await z.page.evaluate(function () { return window.__prova.storico().length; })) === 150, "byte " + mem);
  // Il dettaglio di un giro vecchio si apre.
  await z.page.evaluate(function () { var rr = document.querySelectorAll("#app .timeline-row"); rr[rr.length - 1].click(); });
  await z.page.waitForTimeout(400);
  var det = await z.page.evaluate(function () { return document.querySelector("#app").innerText.replace(/\s+/g, " "); });
  prova("il dettaglio di un giro vecchio si apre", /1730/.test(det), det.slice(0, 120));
  await z.ctx.close();

  console.log("\n  LAPIDI, CANCELLAZIONE, RETE CHE MANCA\n");
  var w = await apri(browser, scena(200, 150, { lapidi: [10, 11, 12] }));
  await tutto(w.page);
  var rw = await righe(w.page);
  prova("un giro cancellato (lapide sul cloud) non ricompare fra i vecchi", uguali(rw, attesi(200, [10, 11, 12])), "visti " + rw.length);
  // Si cancella un giro vecchio dal suo dettaglio.
  await w.page.evaluate(function () { var rr = document.querySelectorAll("#app .timeline-row"); rr[rr.length - 1].click(); });
  await w.page.waitForTimeout(400);
  await w.page.evaluate(function () { var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (b) { return /Elimina|Cancella/.test(b.textContent) && b.offsetParent; }).pop(); if (b) { b.click(); b.click(); } });
  await w.page.waitForTimeout(600);
  var lap = await w.page.evaluate(function () { var c = window.__DATI["users/uidMario/storico"]; var d = c["20240101080000000"]; return d && d.deleted === true; });
  prova("cancellare un giro vecchio lascia la lapide sul cloud", lap);
  await w.ctx.close();

  var e = await apri(browser, scena(200, 150));
  await e.page.evaluate(function () { window.__rompi = function (racc, filtri) { return /storico$/.test(racc) && filtri.some(function (f) { return f.t === "dopo"; }); }; });
  for (var q = 0; q < 7; q++) await clic(e.page, "#app .giri-altri");
  await clic(e.page, "#app .giri-vecchi");
  var re = await righe(e.page);
  var msg = await e.page.evaluate(function () { return !!document.querySelector("#app .giri-vecchi-errore") && !!document.querySelector("#app .giri-vecchi"); });
  prova("senza rete: lo dice, il tasto resta, i 150 del telefono restano", msg && re.length === 150, "visti " + re.length);
  await e.page.evaluate(function () { window.__rompi = null; });
  await clic(e.page, "#app .giri-vecchi");
  re = await righe(e.page);
  prova("tornata la rete, il tocco successivo li porta", re.length === 180 && uguali(re, attesi(200).slice(0, 180)), "visti " + re.length);
  await e.ctx.close();

  var o = await apri(browser, scena(200, 150), { senzaFirebase: true });
  await tutto(o.page);
  var ro = await righe(o.page);
  var nessunTasto = await o.page.evaluate(function () { return !document.querySelector("#app .giri-vecchi"); });
  prova("modalita' locale: i 150 del telefono si vedono tutti, nessun tasto che non puo' funzionare", ro.length === 150 && nessunTasto, "visti " + ro.length);
  await o.ctx.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e2) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
