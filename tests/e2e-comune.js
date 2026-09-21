/* e2e-comune.js — gli attrezzi delle prove end-to-end sugli emulatori:
 * librerie Firebase vere (10.12.2), ponte verso 127.0.0.1, account e dati
 * seminati dall'amministratore dell'emulatore, l'app aperta come la aprirebbe
 * una persona. Usato da e2e-emulatore.js (la matrice) ed e2e-claim.js. (21/09/2026)
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), https = require("https"), http = require("http");
var { execSync } = require("child_process");
var F = require("./firebase-finto.js");

/* IL PROGETTO E' UN PROGETTO DEMO. (21/09/2026.) Con un id `demo-*` gli
   emulatori NON POSSONO raggiungere la produzione: una Function che chiama un
   servizio non emulato (FCM, Storage) riceve un errore invece di toccare i
   dati veri. L'app dice `arctrail3d` nella sua configurazione: il ponte qui
   sotto glielo cambia al volo, dentro `initializeApp`. */
var PROGETTO = "demo-arctrail3d";
/* E prima di scrivere qualunque cosa si controlla che gli emulatori ci siano
   davvero: `emulators:exec` mette queste variabili solo quando li ha accesi. */
function controllaEmulatori() {
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== PROGETTO) throw new Error("progetto " + process.env.GCLOUD_PROJECT + ": si lavora solo su " + PROGETTO);
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("emulatori Firestore/Auth non accesi: si parte solo da tests/lancia-e2e*.sh");
}
controllaEmulatori();
var FS_HOST = "127.0.0.1:8080", AUTH_HOST = "127.0.0.1:9099";
var SDK = ["app", "auth", "firestore", "messaging", "functions"];
var SDK_DIR = path.join(os.tmpdir(), "arctrail-sdk-10.12.2");
var CLUB = "01VERB";

function git(x) { return execSync("git show " + x, { encoding: "utf8", maxBuffer: 1 << 26 }); }

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
  "var ia = firebase.initializeApp; firebase.initializeApp = function(c){ var x = Object.assign({}, c, { projectId: '" + PROGETTO + "' });" +
  " return ia.apply(this, [x].concat([].slice.call(arguments, 1))); };\n" +
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
/* Senza `fondi` sostituisce il documento intero (PATCH senza maschera); con
   `fondi` tocca solo i campi dati, come un `set(..., {merge:true})`: serve a
   non cancellare quello che l'app ha scritto nel frattempo. */
function seme(percorso, dati, fondi) {
  var q = fondi ? "?" + Object.keys(dati).map(function (k) { return "updateMask.fieldPaths=" + encodeURIComponent(k); }).join("&") : "";
  return richiesta("PATCH", FS_HOST, DOCS + "/" + percorso + q, { fields: valore(dati).mapValue.fields });
}
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
var GANCIO = "window.__prova = { storico: function(){ try{ return JSON.parse(localStorage.getItem('arctrail3d_storico_v1')||'[]'); }catch(e){ return []; } }," +
  " vai: function(s){ state.screen = s; save(); render(); }," +
  " nuovoAllenamento: function(campo, cod){ state.otPrecompile = { field: campo, cod: cod }; state.screen = 'open-training-create'; render(); }," +
  " allenamenti: function(){ return (openTrainings || []).map(function(x){ return x.id; }); }," +
  " ricaricaAllenamenti: function(){ stopOpenTrainings(); loadOpenTrainings(); } };";
function preparaApp(nome, html) {
  var dir = path.join(D, nome); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "app.html"), F.copiaProduzione(html, { gancio: GANCIO }));
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(dir, x)); });
  return "file://" + path.join(dir, "app.html").replace(/\\/g, "/");
}

async function apri(browser, url, chi) {
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
  page.on("console", function (m) { var t = m.text(); if (/permission|PERMISSION_DENIED|insufficient/i.test(t)) negati.push(t.slice(0, 160)); });
  await page.goto(url);
  var partita = await page.waitForFunction(function () { return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0; }, null, { timeout: 15000 })
    .then(function () { return true; }, function () { return false; });
  if (!partita) {
    var fascia = await page.evaluate(function () { return !!document.getElementById("fasciaLocale"); }).catch(function () { return false; });
    return { ctx: ctx, page: page, negati: negati, init: false, fascia: fascia };
  }
  // Si entra con l'SDK vero, poi si ricarica: come chi ha gia' fatto l'accesso.
  await page.evaluate(function (c) { return firebase.auth().signInWithEmailAndPassword(c.email, "segreta123").then(function () { return true; }); }, chi);
  await page.reload();
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  return { ctx: ctx, page: page, negati: negati, init: true, fascia: !!(await page.$("#fasciaLocale")) };
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
async function unGiro(page) {
  await page.evaluate(function () { window.__prova.vai("menu"); }); await page.waitForTimeout(300);
  await tocca(page, "Tira"); await tocca(page, "Gara libera"); await tocca(page, "Continua"); await tocca(page, "Round 3D");
  var partito = await tocca(page, "Inizia gara");
  for (var i = 0; i < 3; i++) { await premi(page, ".quick-btn.superspot"); await premi(page, ".quick-btn.spot"); }
  await tocca(page, "Classifica"); await tocca(page, "Termina percorso"); await tocca(page, "Tocca di nuovo per confermare");
  await page.waitForTimeout(800);
  return partito;
}
async function giriSulServer(uid) { return (await elenco("users/" + uid + "/storico")).filter(function (d) { return d.fields && d.fields.results; }); }
async function aspettaServer(fn, ms) { var t0 = Date.now(), r; while (Date.now() - t0 < ms) { r = await fn(); if (r) return r; await new Promise(function (x) { setTimeout(x, 400); }); } return await fn(); }


module.exports = { PROGETTO: PROGETTO, CLUB: CLUB, SDK: SDK, D: D, git: git, librerie: librerie, richiesta: richiesta, seme: seme, elenco: elenco,
  regole: regole, azzera: azzera, account: account, preparaApp: preparaApp, apri: apri, tocca: tocca, premi: premi, unGiro: unGiro,
  giriSulServer: giriSulServer, aspettaServer: aspettaServer, FS_HOST: FS_HOST, AUTH_HOST: AUTH_HOST };
