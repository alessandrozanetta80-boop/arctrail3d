#!/usr/bin/env node
/* e2e-emulatore.js — l'app VERA, con le librerie Firebase VERE (10.12.2, le
 * stesse di produzione), contro gli emulatori Auth e Firestore con le regole
 * VERE. Nessun Firebase finto, nessuna scrittura ricopiata a mano.
 *
 *   sh tests/lancia-e2e.sh            # accende gli emulatori e lancia questo
 *
 * PERCHE' ESISTE. (21/09/2026, regressione del 20/09.) Tutti i banchi con
 * browser usano `firebase-finto.js`, e `banco-finestra`/`banco-regole`
 * provano le regole con scritture RICOPIATE dall'app. Nessuno dei due vede
 * cio' che succede quando l'app vera, con l'SDK vero, parla con le regole
 * vere — ed e' li' che si e' rotta la release.
 *
 * Per ognuna delle due regole (quelle del ramo e quelle del 18/09 in
 * produzione, da `git show 7b0ffe9:firestore.rules`):
 *   1. si entra con un account verificato e approvato;
 *   2. si tira un giro dall'interfaccia e si chiude  → deve arrivare in
 *      `users/{uid}/storico` SUL SERVER (letto dall'emulatore, non dall'app);
 *   3. si pubblica un allenamento aperto «solo club» dal modulo vero → deve
 *      esistere sul server;
 *   4. l'elenco allenamenti si apre senza «permesso negato» e contiene quello
 *      appena pubblicato (per il proprietario);
 *   5. un socio della stessa compagnia CON il claim lo vede, uno di un'altra
 *      compagnia no (solo con le regole nuove: quelle del 18/09 filtrano nel
 *      client, ed e' il motivo della release).
 *
 * RETE: la prima volta scarica le librerie da gstatic e le tiene in una
 * cartella temporanea; poi va senza rete. Nessun contatto con la produzione:
 * tutto il resto e' bloccato, e l'SDK parla solo con 127.0.0.1.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), https = require("https"), http = require("http");
var { execSync } = require("child_process");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var PROGETTO = "arctrail3d";
var FS_HOST = "127.0.0.1:8080", AUTH_HOST = "127.0.0.1:9099";
var SDK = ["app", "auth", "firestore", "messaging", "functions"];
var SDK_DIR = path.join(os.tmpdir(), "arctrail-sdk-10.12.2");
var SORGENTE = process.env.APP || "app.html";

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

function scarica(url, dest) {
  return new Promise(function (res, rej) {
    https.get(url, function (r) {
      if (r.statusCode !== 200) return rej(new Error(url + " → " + r.statusCode));
      var b = []; r.on("data", function (d) { b.push(d); }); r.on("end", function () { fs.writeFileSync(dest, Buffer.concat(b)); res(); });
    }).on("error", rej);
  });
}
async function librerie() {
  fs.mkdirSync(SDK_DIR, { recursive: true });
  for (var i = 0; i < SDK.length; i++) {
    var f = path.join(SDK_DIR, "firebase-" + SDK[i] + "-compat.js");
    if (!fs.existsSync(f)) await scarica("https://www.gstatic.com/firebasejs/10.12.2/firebase-" + SDK[i] + "-compat.js", f);
  }
}
/* Dopo l'ultima libreria: la prima istanza di auth e firestore va sugli
   emulatori. L'app non lo sa e non deve saperlo. */
var PONTE = "\n;(function(){\n" +
  "function avvolgi(nome, collega){ var o = firebase[nome]; var n = function(){ var x = o.apply(this, arguments);" +
  " if(!x.__emu){ x.__emu = 1; try{ collega(x); }catch(e){ console.error('ponte ' + nome, e); } } return x; };" +
  " Object.getOwnPropertyNames(o).forEach(function(k){ try{ if(!(k in n) || k === 'prototype') n[k] = o[k]; }catch(e){} });" +
  " firebase[nome] = n; }\n" +
  "avvolgi('firestore', function(x){ x.useEmulator('127.0.0.1', 8080); });\n" +
  "avvolgi('auth', function(x){ x.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); });\n" +
  "})();\n";

function richiesta(metodo, host, percorso, corpo, extraHead) {
  return new Promise(function (res, rej) {
    var dati = corpo === undefined ? null : Buffer.from(typeof corpo === "string" ? corpo : JSON.stringify(corpo));
    var h = Object.assign({ "Content-Type": "application/json", "Authorization": "Bearer owner" }, extraHead || {});
    if (dati) h["Content-Length"] = dati.length;
    var r = http.request({ method: metodo, host: host.split(":")[0], port: +host.split(":")[1], path: percorso, headers: h }, function (x) {
      var b = []; x.on("data", function (d) { b.push(d); });
      x.on("end", function () { var s = Buffer.concat(b).toString(); var j = null; try { j = JSON.parse(s); } catch (e) {} res({ stato: x.statusCode, j: j, s: s }); });
    });
    r.on("error", rej); if (dati) r.write(dati); r.end();
  });
}
var DOCS = "/v1/projects/" + PROGETTO + "/databases/(default)/documents";
function valore(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valore) } };
  var m = {}; Object.keys(v).forEach(function (k) { m[k] = valore(v[k]); }); return { mapValue: { fields: m } };
}
function seme(percorso, dati) { return richiesta("PATCH", FS_HOST, DOCS + "/" + percorso, { fields: valore(dati).mapValue.fields }); }
async function elenco(percorso) { var r = await richiesta("GET", FS_HOST, DOCS + "/" + percorso + "?pageSize=300"); return (r.j && r.j.documents) || []; }

async function regole(testo) {
  var r = await richiesta("PUT", FS_HOST, "/emulator/v1/projects/" + PROGETTO + ":securityRules", { rules: { files: [{ name: "firestore.rules", content: testo }] } });
  if (r.stato !== 200) throw new Error("regole non caricate: " + r.s.slice(0, 300));
}
async function azzera() {
  await richiesta("DELETE", FS_HOST, "/emulator/v1/projects/" + PROGETTO + "/databases/(default)/documents");
  await richiesta("DELETE", AUTH_HOST, "/emulator/v1/projects/" + PROGETTO + "/accounts");
}
async function account(email, compagnia, conClaim) {
  var r = await richiesta("POST", AUTH_HOST, "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=finta", { email: email, password: "segreta123", returnSecureToken: true }, { Authorization: "" });
  var uid = r.j && r.j.localId;
  if (!uid) throw new Error("account non creato: " + r.s);
  var agg = { localId: uid, emailVerified: true };
  if (conClaim && compagnia) agg.customAttributes = JSON.stringify({ compagnia: compagnia });
  await richiesta("POST", AUTH_HOST, "/identitytoolkit.googleapis.com/v1/projects/" + PROGETTO + "/accounts:update", agg);
  var nome = email.split("@")[0];
  await seme("users/" + uid, { email: email, approved: true, nomeCognome: nome + " Prova", username: nome, compagnia: compagnia || null,
    federazioni: [{ code: "fiarc", tessera: "FI" + nome }], privacy: true, terms: true });
  return { uid: uid, email: email, compagnia: compagnia, nome: nome };
}

var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-e2e-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { storico: function(){ try{ return JSON.parse(localStorage.getItem('arctrail3d_storico_v1')||'[]'); }catch(e){ return []; } }," +
          " nuovoAllenamento: function(campo, cod){ state.otPrecompile = { field: campo, cod: cod }; state.screen = 'open-training-create'; render(); }," +
          " allenamenti: function(){ return (openTrainings || []).map(function(x){ return x.id; }); }," +
          " ricaricaAllenamenti: function(){ stopOpenTrainings(); loadOpenTrainings(); } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });
var URL = "file://" + path.join(D, "app.html").replace(/\\/g, "/");

async function apri(browser, chi) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) {
    var u = r.request().url();
    var m = u.match(/^https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-(\w+)-compat\.js$/);
    if (m && SDK.indexOf(m[1]) >= 0) {
      var corpo = fs.readFileSync(path.join(SDK_DIR, "firebase-" + m[1] + "-compat.js"), "utf8");
      if (m[1] === "functions") corpo += PONTE;   // l'ultima delle cinque
      return r.fulfill({ status: 200, contentType: "text/javascript", body: corpo });
    }
    if (/^http:\/\/127\.0\.0\.1:(8080|9099)\//.test(u)) return r.continue();
    return r.abort();
  });
  var stato = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: chi.nome + " Prova", username: chi.nome, email: chi.email, compagnia: chi.compagnia || null,
               federazioni: [{ code: "fiarc", tessera: "FI" + chi.nome }] }, profileSkipped: false, pendingArchers: [] };
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(stato)) + ");" +
    "localStorage.setItem('arctrail3d_proprietario_v1','" + chi.uid + "');" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var negati = [];
  page.on("console", function (m) { var t = m.text(); if (/permission|PERMISSION_DENIED|insufficient/i.test(t)) negati.push(t.slice(0, 200)); });
  await page.goto(URL);
  // Si entra con l'SDK vero, poi si ricarica: come chi ha gia' fatto l'accesso.
  var partita = await page.waitForFunction(function () { return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0; }, null, { timeout: 20000 })
    .then(function () { return true; }, function () { return false; });
  if (!partita) {
    // E' la regressione del 20/09: le librerie ci sono, l'app non le ha mai inizializzate.
    prova("0. l'app inizializza Firebase (" + chi.email + ")", false, "firebase.apps vuoto dopo 20 s: l'app e' rimasta in modalita' locale");
    throw new Error("Firebase mai inizializzato: inutile proseguire");
  }
  await page.evaluate(function (c) { return firebase.auth().signInWithEmailAndPassword(c.email, "segreta123").then(function () { return true; }); }, chi);
  await page.reload();
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  return { ctx: ctx, page: page, negati: negati };
}
async function tocca(page, testo) {
  var f = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button, #app a"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, testo);
  await page.waitForTimeout(450);
  return f;
}
async function premi(page, css) { await page.evaluate(function (s) { var x = document.querySelector(s); if (x) x.click(); }, css); await page.waitForTimeout(150); }

async function giro(nomeRegole, testoRegole, browser, nuove) {
  console.log("\n  REGOLE: " + nomeRegole + "\n");
  await azzera();
  await regole(testoRegole);
  var CLUB = "01VERB";
  var mario = await account("mario@prova.it", CLUB, true);
  var bea = await account("bea@prova.it", CLUB, true);
  var ugo = await account("ugo@prova.it", "02ALTR", true);

  var m = await apri(browser, mario);
  var testo = await m.page.evaluate(function () { return document.querySelector("#app").innerText.replace(/\s+/g, " "); });
  prova("1. si entra: niente fascia «solo su questo telefono»", !(await m.page.$("#fasciaLocale")) && testo.length > 40, testo.slice(0, 80));

  // ── il giro ─────────────────────────────────────────────
  await tocca(m.page, "Tira"); await tocca(m.page, "Gara libera"); await tocca(m.page, "Continua"); await tocca(m.page, "Round 3D");
  var partito = await tocca(m.page, "Inizia gara");
  for (var i = 0; i < 3; i++) { await premi(m.page, ".quick-btn.superspot"); await premi(m.page, ".quick-btn.spot"); }
  await tocca(m.page, "Classifica"); await tocca(m.page, "Termina percorso"); await tocca(m.page, "Tocca di nuovo per confermare");
  var locali = (await m.page.evaluate(function () { return window.__prova.storico(); })).length;
  prova("2. il giro si tira e si chiude sul telefono", partito && locali >= 1, "giri locali " + locali);
  var sulServer = [], t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    sulServer = (await elenco("users/" + mario.uid + "/storico")).filter(function (d) { return d.fields && d.fields.results; });
    if (sulServer.length) break;
    await m.page.waitForTimeout(400);
  }
  prova("3. il giro e' SUL SERVER in users/{uid}/storico", sulServer.length >= 1, "documenti: " + sulServer.length);

  // ── l'allenamento aperto, dal modulo vero ──────────────
  await tocca(m.page, "Home");
  await m.page.evaluate(function (c) { window.__prova.nuovoAllenamento("Campo di prova", c); }, CLUB);
  await m.page.waitForTimeout(500);
  var domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await m.page.evaluate(function (d) { var x = document.querySelector("input.data[type=date]"); x.value = d; x.dispatchEvent(new Event("input", { bubbles: true })); x.dispatchEvent(new Event("change", { bubbles: true })); }, domani);
  var pubblicato = await tocca(m.page, "Pubblica");
  var ot = [], t1 = Date.now();
  while (Date.now() - t1 < 10000) { ot = await elenco("open_trainings"); if (ot.length) break; await m.page.waitForTimeout(400); }
  var vis = ot[0] && ot[0].fields && ot[0].fields.visibility && ot[0].fields.visibility.stringValue;
  prova("4. l'allenamento pubblicato e' SUL SERVER", pubblicato && ot.length === 1, "documenti: " + ot.length);
  prova("5. ed e' «solo club» della compagnia", vis === "club", "visibility " + vis);
  var idOt = ot[0] && ot[0].name.split("/").pop();

  // ── l'elenco ───────────────────────────────────────────
  await m.page.evaluate(function () { window.__prova.ricaricaAllenamenti(); });
  await m.page.waitForTimeout(2500);
  var visti = await m.page.evaluate(function () { return window.__prova.allenamenti(); });
  prova("6. il proprietario lo vede nell'elenco", visti.indexOf(idOt) >= 0, JSON.stringify(visti));
  prova("7. nessun «permesso negato» per il proprietario", m.negati.length === 0, m.negati.slice(0, 2).join(" | "));
  await m.ctx.close();

  var b = await apri(browser, bea);
  await b.page.evaluate(function () { window.__prova.ricaricaAllenamenti(); });
  await b.page.waitForTimeout(2500);
  var vistiB = await b.page.evaluate(function () { return window.__prova.allenamenti(); });
  prova("8. un socio della stessa compagnia (claim presente) lo vede", vistiB.indexOf(idOt) >= 0, JSON.stringify(vistiB));
  await b.ctx.close();

  if (nuove) {
    var u = await apri(browser, ugo);
    await u.page.evaluate(function () { window.__prova.ricaricaAllenamenti(); });
    await u.page.waitForTimeout(2500);
    var vistiU = await u.page.evaluate(function () { return window.__prova.allenamenti(); });
    prova("9. uno di un'altra compagnia NON lo vede", vistiU.indexOf(idOt) < 0, JSON.stringify(vistiU));
    // E non lo legge nemmeno chiedendolo per nome: e' il punto della release.
    var letto = await u.page.evaluate(function (id) {
      return firebase.firestore().collection("open_trainings").doc(id).get().then(function () { return "letto"; }, function (e) { return e.code || String(e); });
    }, idOt);
    prova("10. ...e non lo legge nemmeno per nome (il database dice no)", /permission/.test(letto), letto);
    await u.ctx.close();
  }
}

(async function () {
  await librerie();
  var browser = await chromium.launch();
  var nuoveRegole = fs.readFileSync("firestore.rules", "utf8");
  var vecchie = execSync("git show 7b0ffe9:firestore.rules", { encoding: "utf8", maxBuffer: 1 << 24 });
  await giro("del ramo (" + ((nuoveRegole.match(/Versione ([\w-]+)/) || [])[1] || "?") + ")", nuoveRegole, browser, true);
  await giro("del 18/09, in produzione (" + ((vecchie.match(/Versione ([\w-]+)/) || [])[1] || "?") + ")", vecchie, browser, false);
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
