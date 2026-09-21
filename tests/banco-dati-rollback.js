#!/usr/bin/env node
/* banco-dati-rollback.js — lo stesso telefono attraverso le versioni, in
 * quest'ordine: 18/09 → release del 20/09 → di nuovo 18/09 (il rollback) →
 * questo ramo. Stessa origine, stesso localStorage, stesso cloud (finto, ma
 * che sopravvive al cambio di versione).
 *
 *   node tests/banco-dati-rollback.js
 *
 * PERCHE' ESISTE. (21/09/2026.) Il 20/09, fra le 16:33 e le 17:04, chi ha
 * aperto l'app ha preso la release; poi il rollback gli ha rimesso l'app del
 * 18/09; domani prendera' questa. La release aggiunge quattro chiavi locali
 * (proprietario, orfani, lifetime_visti, dispositivo) e una migrazione — «di
 * chi sono i dati di questo telefono» — che l'app del 18/09 non conosce.
 * Domande: si e' perso qualcosa? si perdera' qualcosa domani?
 *
 * Le librerie Firebase arrivano come in produzione, `defer`, servite
 * all'indirizzo di gstatic (vedi banco-librerie-defer.js): quindi la release
 * si comporta come il 20/09 — Firebase mai inizializzato, modalita' locale.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { execSync } = require("child_process");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-rollback-"));
var GANCIO = "window.__prova = { vai: function(s, tab){ state.screen = s; if(tab) state.journalTab = tab; save(); render(); } };";
function scrivi(nome, html) { fs.writeFileSync(path.join(D, nome), F.copiaProduzione(html, { gancio: GANCIO })); }
scrivi("app-1809.html", execSync("git show 7b0ffe9:app.html", { encoding: "utf8", maxBuffer: 1 << 26 }));
scrivi("app-release.html", execSync("git show bae26e8:app.html", { encoding: "utf8", maxBuffer: 1 << 26 }));
scrivi("app-ramo.html", fs.readFileSync(process.env.APP || "app.html", "utf8"));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
function url(n) { return "file://" + path.join(D, n).replace(/\\/g, "/"); }

var U = { uid: "uidMario", email: "mario@esempio.it" };
function giro(i, tot) {
  return { date: new Date(Date.UTC(2026, 8, 1 + i, 9)).toISOString(), modeKey: "round3d", modeLabel: "Round 3D", format: 24, sessionType: "3d",
    results: [{ name: "mariorossi", total: tot, isSelf: true, ownerUid: U.uid, perTarget: [] }] };
}
function idDi(iso) { return String(iso).replace(/[^0-9]/g, "").slice(0, 17); }
/* Il telefono di Mario com'era il 20/09 alle 16:30: tre giri saliti sul cloud,
   uno tirato senza rete e mai salito, l'attrezzatura, il riepilogo. */
function telefono(conEmail) {
  var giri = [giro(4, 240), giro(3, 230), giro(2, 220), giro(1, 210)];   // il primo (i=4) non e' sul cloud
  var profilo = { nomeCognome: "Mario Rossi", username: "mariorossi", federazioni: [{ code: "fiarc", tessera: "FI111" }] };
  if (conEmail) profilo.email = U.email;
  return {
    "arctrail3d_state_v3": JSON.stringify({ screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
      profile: profilo, profileSkipped: false, pendingArchers: [] }),
    "arctrail3d_storico_v1": JSON.stringify(giri),
    "arctrail3d_lifetime_v1": JSON.stringify({ "mariorossi|round3d": { name: "mariorossi", modeKey: "round3d", modeLabel: "Round 3D", rounds: 180, sum: 40000, best: 260, isSelf: true, ownerUid: U.uid } }),
    "arctrail3d_attrezzi_v1": JSON.stringify([{ id: "a1", nome: "Ricurvo di Mario" }]),
    "arctrail3d_welcome_v2": "1"
  };
}
function cloud() {
  var d = { users: {}, public_profiles: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  var st = {};
  [giro(3, 230), giro(2, 220), giro(1, 210)].forEach(function (g) { st[idDi(g.date)] = g; });
  d["users/" + U.uid + "/storico"] = st;
  return d;
}

/* Un telefono = un contesto. Il cloud finto vive in sessionStorage fra una
   versione e l'altra; le librerie arrivano col `defer` dall'indirizzo vero. */
async function nuovoTelefono(browser, locale, dati, utente) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  var corpo = "(function(){ var s = null; try{ s = JSON.parse(sessionStorage.getItem('cloudFinto') || 'null'); }catch(e){}\n" +
    "(" + F.installa.toString() + ")({ utente: " + JSON.stringify(utente || U) + ", dati: s || " + JSON.stringify(dati) + " }); })();";
  await ctx.route(/^https?:\/\//, function (r) {
    var u = r.request().url();
    if (u.indexOf("https://www.gstatic.com/firebasejs/") !== 0) return r.abort();
    return r.fulfill({ status: 200, contentType: "text/javascript", body: /firebase-app-compat\.js$/.test(u) ? corpo : "" });
  });
  await ctx.addInitScript("try{ if(!localStorage.getItem('__seminato')){ localStorage.setItem('__seminato','1');" +
    Object.keys(locale).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(locale[k]) + ");"; }).join("") + " } }catch(e){}");
  return ctx;
}
async function apri(ctx, nome) {
  var page = ctx.pages()[0] || await ctx.newPage();
  if (page.url().indexOf("file://") === 0) {
    await page.evaluate(function () { try { sessionStorage.setItem("cloudFinto", JSON.stringify(window.__DATI || null)); } catch (e) {} }).catch(function () {});
  }
  await page.goto(url(nome));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  return page;
}
function leggi(page) {
  return page.evaluate(function () {
    function j(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
    var st = j("arctrail3d_storico_v1") || [], or = j("arctrail3d_orfani_v1") || [];
    var cl = (window.__DATI || {})["users/uidMario/storico"] || {};
    return {
      giri: st.length, date: st.map(function (g) { return g.date; }),
      riepilogo: (j("arctrail3d_lifetime_v1") || {})["mariorossi|round3d"] ? j("arctrail3d_lifetime_v1")["mariorossi|round3d"].rounds : null,
      attrezzi: (j("arctrail3d_attrezzi_v1") || []).length, profilo: !!(j("arctrail3d_state_v3") || {}).profile,
      orfani: or.length, giriDaParte: or.reduce(function (n, x) { try { return n + JSON.parse((x.dati || {})["arctrail3d_storico_v1"] || "[]").length; } catch (e) { return n; } }, 0),
      proprietario: localStorage.getItem("arctrail3d_proprietario_v1"),
      cloud: Object.keys(cl).filter(function (k) { return cl[k] && !cl[k].deleted; }).length,
      fascia: !!document.getElementById("fasciaLocale"),
      aggiungili: /Aggiungili|aggiungili/.test(document.body.innerText)
    };
  });
}
async function tiraUnGiro(page) {
  async function tocca(t) { await page.evaluate(function (tt) { var b = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button, #app a"), function (b) { return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(tt) >= 0; })[0]; if (b) b.click(); }, t); await page.waitForTimeout(450); }
  async function premi(c) { await page.evaluate(function (s) { var x = document.querySelector(s); if (x) x.click(); }, c); await page.waitForTimeout(150); }
  await page.evaluate(function () { window.__prova.vai("menu"); });
  await tocca("Tira"); await tocca("Gara libera"); await tocca("Continua"); await tocca("Round 3D"); await tocca("Inizia gara");
  for (var i = 0; i < 2; i++) { await premi(".quick-btn.superspot"); await premi(".quick-btn.spot"); }
  await tocca("Classifica"); await tocca("Termina percorso"); await tocca("Tocca di nuovo per confermare");
  await page.waitForTimeout(1200);
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  IL 20/09, COM'E' ANDATA: 18/09 → release → 18/09 (rollback)\n");
  var ctx = await nuovoTelefono(browser, telefono(true), cloud());
  var p = await apri(ctx, "app-1809.html");
  var s0 = await leggi(p);
  prova("18/09: 4 giri nel telefono, 3 sul cloud, riepilogo, attrezzatura", s0.giri === 4 && s0.riepilogo === 180 && s0.attrezzi === 1, JSON.stringify(s0));
  var s0b = await leggi(p);
  prova("18/09: il giro mai salito sale (4 sul cloud)", s0b.cloud === 4, "cloud " + s0b.cloud);
  p = await apri(ctx, "app-release.html");
  var s1 = await leggi(p);
  prova("release: Firebase non parte, modalita' locale (come il 20/09)", s1.fascia, JSON.stringify(s1));
  prova("release: NIENTE messo da parte — la migrazione vive in onAuthReady, che non e' mai partito", s1.orfani === 0 && !s1.proprietario, JSON.stringify(s1));
  await tiraUnGiro(p);
  var s1b = await leggi(p);
  prova("release: un giro tirato nella finestra resta nel telefono (5)", s1b.giri === 5, "giri " + s1b.giri);
  prova("...e non sale (Firebase spento)", s1b.cloud === 4, "cloud " + s1b.cloud);
  p = await apri(ctx, "app-1809.html");
  await p.waitForTimeout(1500);
  var s2 = await leggi(p);
  prova("rollback: l'app del 18/09 vede tutti e 5 i giri", s2.giri === 5, "giri " + s2.giri);
  prova("rollback: il giro della finestra SALE sul cloud (5)", s2.cloud === 5, "cloud " + s2.cloud);
  prova("rollback: profilo, riepilogo e attrezzatura intatti", s2.profilo && s2.riepilogo >= 180 && s2.attrezzi === 1, JSON.stringify(s2));

  console.log("\n  DOMANI: 18/09 → questo ramo\n");
  p = await apri(ctx, "app-ramo.html");
  await p.waitForTimeout(1500);
  var s3 = await leggi(p);
  prova("ramo: si entra, niente fascia", !s3.fascia);
  prova("ramo: il profilo porta l'email → i dati sono di Mario, restano dove sono", s3.orfani === 0 && s3.proprietario === U.uid, JSON.stringify(s3));
  prova("ramo: 5 giri, riepilogo, attrezzatura intatti", s3.giri === 5 && s3.riepilogo >= 180 && s3.attrezzi === 1, JSON.stringify(s3));
  prova("ramo: nessun doppione sul cloud (5)", s3.cloud === 5, "cloud " + s3.cloud);
  p = await apri(ctx, "app-1809.html");
  var s4 = await leggi(p);
  prova("e se si tornasse indietro ancora: l'app del 18/09 vede tutto", s4.giri === 5 && s4.riepilogo >= 180 && s4.attrezzi === 1, JSON.stringify(s4));
  await ctx.close();

  console.log("\n  DOMANI, PROFILO DEI PRIMI GIORNI (SENZA EMAIL)\n");
  var c2 = await nuovoTelefono(browser, telefono(false), cloud());
  p = await apri(c2, "app-1809.html");
  var t0 = await leggi(p);
  prova("18/09: 4 giri, il quarto sale (4 sul cloud)", t0.giri === 4 && t0.cloud === 4, JSON.stringify(t0));
  p = await apri(c2, "app-ramo.html");
  await p.waitForTimeout(1500);
  var t1 = await leggi(p);
  console.log("    ramo, profilo senza email: " + JSON.stringify(t1));
  prova("ramo: nessun dato CANCELLATO (nel telefono o da parte ci sono tutti i 4 giri)", t1.giri + t1.giriDaParte >= 4, JSON.stringify(t1));
  prova("ramo: i dati restano di Mario (nessun «da parte»)", t1.orfani === 0 && t1.giri >= 4 && t1.riepilogo >= 180 && t1.attrezzi === 1, JSON.stringify(t1));
  p = await apri(c2, "app-1809.html");
  var t2 = await leggi(p);
  prova("e un ritorno all'app del 18/09 vede ancora i giri e l'attrezzatura", t2.giri >= 4 && t2.attrezzi === 1, JSON.stringify(t2));
  await c2.close();

  console.log("\n  TELEFONO CONDIVISO: ENTRA UN ALTRO ACCOUNT (P0-2 resta com'era)\n");
  var BEA = { uid: "uidBea", email: "bea@esempio.it" };
  var cb = cloud();
  cb.users[BEA.uid] = { email: BEA.email, approved: true, nomeCognome: "Bea Neri", username: "beaneri", federazioni: [], privacy: true, terms: true };
  var c3 = await nuovoTelefono(browser, telefono(false), cb, BEA);
  p = await apri(c3, "app-ramo.html");
  await p.waitForTimeout(1500);
  var b1 = await leggi(p);
  prova("i dati di Mario NON diventano di Bea: restano da parte, interi", b1.orfani === 1 && b1.giriDaParte === 4 && b1.giri === 0, JSON.stringify(b1));
  prova("...e nel cloud di Bea non sale niente di Mario",
        await p.evaluate(function () { var c = (window.__DATI || {})["users/uidBea/storico"] || {}; return Object.keys(c).length === 0; }));

  console.log("\n  «AGGIUNGILI AL MIO ACCOUNT»: TORNA TUTTO\n");
  // Il nome utente e' cambiato nel frattempo: niente riconoscimento automatico,
  // resta il tocco esplicito. Deve riportare anche riepilogo e attrezzatura.
  var cm = cloud();
  cm.users[U.uid].username = "mario.rossi";
  var c4 = await nuovoTelefono(browser, telefono(false), cm);
  p = await apri(c4, "app-ramo.html");
  await p.waitForTimeout(1500);
  var a1 = await leggi(p);
  prova("nome utente cambiato: i dati restano da parte, e l'app lo propone", a1.orfani === 1 && a1.aggiungili, JSON.stringify(a1));
  await p.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) { return /Aggiungili/i.test(x.textContent) && x.offsetParent; })[0];
    if (b) b.click();
  });
  await p.waitForTimeout(1500);
  var a2 = await leggi(p);
  prova("dopo il tocco: 4 giri, riepilogo da 180, attrezzatura, niente piu' da parte",
        a2.giri === 4 && a2.riepilogo === 180 && a2.attrezzi === 1 && a2.orfani === 0, JSON.stringify(a2));
  prova("...e nessun giro in doppio, nel telefono o sul cloud", new Set(a2.date).size === a2.giri && a2.cloud === 4, JSON.stringify(a2));
  await c4.close();

  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
