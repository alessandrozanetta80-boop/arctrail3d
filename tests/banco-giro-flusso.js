#!/usr/bin/env node
/* banco-giro-flusso.js — il giro si apre, si chiude e non si sdoppia.
 *
 *   node tests/banco-giro-flusso.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-giro-flusso.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit P1 della sincronia.) Cinque difetti del
 * flusso del giro, nessuno visto da un banco:
 *   1. «Interrompi» portava al riepilogo lasciando il giro ATTIVO: «Riprendi»
 *      lo riapriva, e le piazzole dopo non entravano mai nello storico;
 *   2. un giro nuovo con uno aperto lo sovrascriveva, telefono e cloud;
 *   3. un doppio tocco segnava due frecce (in gruppo: l'arciere dopo);
 *   4. un avviso qualunque (un allenamento aperto nel mondo) ridisegnava la
 *      pista e ricostruiva il tasto sotto il dito;
 *   5. due telefoni: il giro chiuso sul tablet rinasceva sul telefono.
 *
 * COME FA. L'app gira in produzione su `firebase-finto.js`: la copia di
 * sicurezza, lo storico sul cloud e gli ascoltatori sono quelli veri.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-flusso-"));
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
function cloudBase(extra) {
  var d = { users: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  Object.keys(extra || {}).forEach(function (k) { d[k] = extra[k]; });
  return d;
}
function statoBase(extra) {
  var s = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email, federazioni: [{ code: "fiarc", tessera: "FI111" }] },
    profileSkipped: false, pendingArchers: [] };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}

var browser;
async function apri(stato, cloud, storico) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud }));
  var seme = { "arctrail3d_state_v3": JSON.stringify(stato), "arctrail3d_proprietario_v1": U.uid, "arctrail3d_welcome_v2": "1" };
  if (storico) seme["arctrail3d_storico_v1"] = JSON.stringify(storico);
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    Object.keys(seme).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(seme[k]) + ");"; }).join("") + " } }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto("file://" + path.join(DOVE, "app.html").replace(/\\/g, "/"));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return { ctx: ctx, page: page, err: err };
}
async function tocca(page, t) {
  var fatto = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, t);
  await page.waitForTimeout(450);
  return fatto;
}
async function premi(page, css) { await page.evaluate(function (c) { var x = document.querySelector(c); if (x) x.click(); }, css); await page.waitForTimeout(380); }
function testo(page) { return page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText.replace(/\s+/g, " ") : ""; }); }
function locale(page) {
  return page.evaluate(function () {
    return { stato: JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}"),
             storico: JSON.parse(localStorage.getItem("arctrail3d_storico_v1") || "[]") };
  });
}
function scritture(page) { return page.evaluate(function () { return window.__scritture || []; }); }
async function iniziaRound3D(page) {
  await tocca(page, "Tira"); await tocca(page, "Gara libera"); await tocca(page, "Continua");
  await tocca(page, "Round 3D"); await tocca(page, "Inizia gara");
}

(async function () {
  browser = await chromium.launch();

  // ── 1. Interrompi ─────────────────────────────────────────────────────────
  console.log("\n  «INTERROMPI» CHIUDE IL GIRO\n");
  var a = await apri(statoBase(), cloudBase());
  await iniziaRound3D(a.page);
  for (var i = 0; i < 2; i++) { await premi(a.page, ".quick-btn.superspot"); await premi(a.page, ".quick-btn.spot"); }
  prova("giro aperto alla piazzola 3", /PIAZZOLA 3 \/ 24/i.test(await testo(a.page)));
  await tocca(a.page, "Classifica");
  await tocca(a.page, "Termina percorso"); await tocca(a.page, "Tocca di nuovo");
  await a.page.waitForTimeout(600);
  var la = await locale(a.page);
  prova("dopo «Interrompi» il giro NON e' piu' attivo", la.stato.roundActive !== true, "roundActive=" + la.stato.roundActive);
  prova("il giro interrotto e' nello storico, con le 2 piazzole tirate",
        la.storico.length === 1 && la.storico[0].results[0].perTarget.length === 2, JSON.stringify(la.storico.map(function (h) { return h.results[0].perTarget; })));
  var wa = await scritture(a.page);
  prova("la copia di sicurezza sul cloud e' stata tolta",
        wa.some(function (w) { return w.op === "delete" && /giro_aperto\/corrente$/.test(w.path); }));
  await tocca(a.page, "Torna al menu");
  prova("la Home non offre di riprendere un giro gia' chiuso", !/Riprendi/.test(await testo(a.page)));
  await a.ctx.close();

  // ── 2. un giro nuovo con uno aperto ───────────────────────────────────────
  console.log("\n  UN GIRO NUOVO NON CANCELLA QUELLO APERTO\n");
  var b = await apri(statoBase(), cloudBase());
  await iniziaRound3D(b.page);
  for (var j = 0; j < 3; j++) { await premi(b.page, ".quick-btn.superspot"); await premi(b.page, ".quick-btn.spot"); }
  // La strada vera: «←» dalla pista porta al menu Tira, col cartello «Riprendi»
  // e i tasti di avvio ancora li'. E' li' che un tocco partiva sopra il giro.
  await tocca(b.page, "←");
  var avviato = await tocca(b.page, "Gara libera");
  await tocca(b.page, "Continua"); await tocca(b.page, "Round 3D"); await tocca(b.page, "Inizia gara");
  prova("con un giro aperto si puo' avviarne un altro (il caso da proteggere)", avviato);
  var lb = await locale(b.page);
  prova("il giro nuovo parte dalla piazzola 1", lb.stato.roundActive === true && lb.stato.target === 1, "target=" + lb.stato.target);
  prova("il giro di prima (3 piazzole) e' nello storico, non sparito",
        lb.storico.some(function (h) { return h.results[0].perTarget.length === 3; }), JSON.stringify(lb.storico.map(function (h) { return h.results[0].perTarget.length; })));

  // ── 3. doppio tocco ──────────────────────────────────────────────────────
  console.log("\n  UN DOPPIO TOCCO E' UN TOCCO\n");
  var frecce = await b.page.evaluate(function () {
    var x = document.querySelector(".quick-btn.superspot"); x.click(); x.click();
    var s = JSON.parse(localStorage.getItem("arctrail3d_state_v3"));
    return (s.pendingArrows || []).length + "|" + s.target;
  });
  prova("due click a zero millisecondi = una freccia sola", frecce === "1|1", frecce);
  await b.page.waitForTimeout(450);
  await premi(b.page, ".quick-btn.spot");
  var dopo = await b.page.evaluate(function () { var s = JSON.parse(localStorage.getItem("arctrail3d_state_v3")); return s.target; });
  prova("la freccia successiva, un attimo dopo, passa", dopo === 2, "target=" + dopo);

  // ── 4. un avviso del mondo non ricostruisce la pista ─────────────────────
  console.log("\n  UN AVVISO NON RICOSTRUISCE LA PISTA\n");
  var stessoNodo = await b.page.evaluate(function () {
    var prima = document.querySelector(".quick-btn.superspot");
    prima.__marcato = true;
    return window.__fakeDb.collection("open_trainings").doc("otNuovo").set({
      ownerUid: "altro", ownerName: "Tizio", field: "Altrove", status: "active", visibility: "all",
      datetime: Date.now() + 3600000, spots: 3, participantUids: [], participants: [] })
      .then(function () { return new Promise(function (r) { setTimeout(r, 400); }); })
      .then(function () { var dopo = document.querySelector(".quick-btn.superspot"); return !!(dopo && dopo.__marcato); });
  });
  prova("con la pista aperta il tasto sotto il dito resta lo stesso", stessoNodo === true);
  prova("nessun errore JavaScript", a.err.length === 0 && b.err.length === 0, a.err.concat(b.err)[0]);
  await b.ctx.close();

  // ── 5. due telefoni ─────────────────────────────────────────────────────
  console.log("\n  DUE TELEFONI, UN GIRO\n");
  // Il telefono si era spento alla piazzola 5; il tablet ha finito lo stesso giro.
  var c = await apri(statoBase(), cloudBase(), null);
  await iniziaRound3D(c.page);
  for (var k = 0; k < 4; k++) { await premi(c.page, ".quick-btn.superspot"); await premi(c.page, ".quick-btn.spot"); }
  var giroTelefono = (await locale(c.page)).stato;
  await c.ctx.close();
  if (!giroTelefono.roundId) {
    prova("il giro ha un'identita' (roundId)", false, "manca roundId");
  } else {
    var storicoCloud = {};
    storicoCloud["users/" + U.uid + "/storico"] = { "20260919120000000": {
      date: new Date().toISOString(), roundId: giroTelefono.roundId, modeKey: "round3d", format: 24,
      results: [{ name: "mariorossi", total: 500, isSelf: true, perTarget: new Array(24).fill(20), arrows: [] }] } };
    var d = await apri(Object.assign({}, giroTelefono, { screen: "menu", tab: "home" }), cloudBase(storicoCloud));
    await d.page.waitForTimeout(800);
    var ld = await locale(d.page);
    prova("il giro chiuso sul tablet NON resta aperto sul telefono", ld.stato.roundActive !== true, "roundActive=" + ld.stato.roundActive);
    var wd = await scritture(d.page);
    prova("e il telefono NON lo rimanda sul cloud come giro aperto",
          !wd.some(function (w) { return w.op === "set" && /giro_aperto\/corrente$/.test(w.path); }));
    prova("la Home non offre «Riprendi»", !/Riprendi/.test(await testo(d.page)));
    await d.ctx.close();

    // Stesso giro, ma sul cloud e' piu' avanti (piazzola 9): si prosegue da li'.
    var avanti = JSON.parse(JSON.stringify(giroTelefono));
    avanti.target = 9;
    var aperto = {};
    aperto["users/" + U.uid + "/giro_aperto"] = { corrente: { giro: JSON.stringify(avanti), piazzola: 9, piazzole: 24 } };
    var e = await apri(Object.assign({}, giroTelefono, { screen: "menu", tab: "home" }), cloudBase(aperto));
    await e.page.waitForTimeout(800);
    var le = await locale(e.page);
    prova("stesso giro piu' avanti sul cloud: si prosegue dalla piazzola 9", le.stato.target === 9 && le.stato.roundActive === true,
          "target=" + le.stato.target);
    await e.ctx.close();
  }

  await browser.close();
  try { fs.rmSync(DOVE, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
