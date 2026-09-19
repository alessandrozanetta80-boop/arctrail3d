#!/usr/bin/env node
/* banco-push-app.js — le push viste dall'app: token, primo piano, tocco.
 *
 *   node tests/banco-push-app.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-push-app.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit N1, N3, N4, N5.) `banco-push` prova il
 * server e il service worker. Questo prova la meta' che sta nell'app:
 *   1. il token si scrive PER DISPOSITIVO (`fcmTokens.<chiave>`), non al posto
 *      di quello degli altri dispositivi;
 *   2. uscendo si toglie solo la voce di questo dispositivo;
 *   3. con l'app aperta (`onMessage`) la push diventa comunque una notifica;
 *   4. il tocco su una push (`?n=<id>` o messaggio del service worker) apre
 *      QUELLA notifica e la segna letta.
 *
 * COME FA. App in produzione su `firebase-finto.js`, con un service worker
 * finto (registrazione, showNotification, messaggi) e il permesso delle
 * notifiche gia' concesso.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-push-app-"));
fs.writeFileSync(path.join(DOVE, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { stato: function(){ return JSON.parse(JSON.stringify(state)); }," +
          " esci: function(){ window.__esciSenzaRicarica = true; if(typeof esciDallAccount === 'function') esciDallAccount(null); } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var U = { uid: "uidMario", email: "mario@esempio.it" };

/* Service worker e notifiche finte: quanto basta all'app. */
function ambiente() {
  window.__disegnate = [];
  var ascolt = {};
  var reg = {
    showNotification: function (t, o) { window.__disegnate.push({ titolo: t, opz: o }); return Promise.resolve(); },
    getNotifications: function () { return Promise.resolve([]); },
    active: { state: "activated" }, update: function () { return Promise.resolve(); }
  };
  var contenitore = {
    controller: null,
    ready: Promise.resolve(reg),
    register: function () { return Promise.resolve(reg); },
    getRegistration: function () { return Promise.resolve(reg); },
    addEventListener: function (t, f) { (ascolt[t] = ascolt[t] || []).push(f); },
    removeEventListener: function () {}
  };
  try { Object.defineProperty(navigator, "serviceWorker", { value: contenitore, configurable: true }); } catch (e) {}
  window.__swMessaggio = function (data) { (ascolt.message || []).forEach(function (f) { f({ data: data }); }); };
  var N = function () {};
  N.permission = "granted";
  N.requestPermission = function () { return Promise.resolve("granted"); };
  window.Notification = N;
}

function cloud() {
  var d = { users: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true,
                     // un altro dispositivo e' gia' registrato: non deve sparire
                     fcmTokens: { dAltro: { token: "token-dell-altro-telefono" } }, fcmToken: "token-dell-altro-telefono" };
  d["notifications/" + U.uid + "/items"] = {
    "avviso-9": { title: "Nuovo messaggio", body: "Anna ti ha scritto", read: false, fromUid: "uidAnna",
                  dest: { k: "dm", uid: "uidAnna" }, createdAt: { __ts: Date.now() } }
  };
  d.public_profiles = { uidAnna: { username: "anna", nomeCognome: "Anna Rossi" } };
  return d;
}
var STATO = { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email, federazioni: [{ code: "fiarc", tessera: "FI111" }] },
  profileSkipped: false, pendingArchers: [] };

var browser;
async function apri(query) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT" });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript("(" + ambiente.toString() + ")();");
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud() }));
  await ctx.addInitScript("window.__tokenFinto = 'token-di-questo-telefono';");
  var seme = { "arctrail3d_state_v3": JSON.stringify(STATO), "arctrail3d_proprietario_v1": U.uid, "arctrail3d_welcome_v2": "1" };
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    Object.keys(seme).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(seme[k]) + ");"; }).join("") + " } }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto("file://" + path.join(DOVE, "app.html").replace(/\\/g, "/") + (query || ""));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1800);
  return { ctx: ctx, page: page, err: err };
}
function utenteCloud(page) { return page.evaluate(function (uid) { return JSON.parse(JSON.stringify(window.__DATI.users[uid] || {})); }, U.uid); }

(async function () {
  browser = await chromium.launch();

  console.log("\n  UN TOKEN PER DISPOSITIVO\n");
  var a = await apri("");
  var u1 = await utenteCloud(a.page);
  var voci = Object.keys(u1.fcmTokens || {}).map(function (k) { return u1.fcmTokens[k].token; });
  prova("questo telefono ha la SUA voce in fcmTokens", voci.indexOf("token-di-questo-telefono") >= 0, JSON.stringify(u1.fcmTokens));
  prova("la voce dell'altro dispositivo e' ancora li'", voci.indexOf("token-dell-altro-telefono") >= 0, JSON.stringify(u1.fcmTokens));

  console.log("\n  CON L'APP APERTA LA PUSH SI VEDE\n");
  var disegnata = await a.page.evaluate(function () {
    if (typeof window.__onMessage !== "function") return "nessuno ascolta onMessage";
    window.__onMessage({ data: { tag: "avviso-10", title: "Invito", body: "Allenamento domenica", link: "/app.html?n=avviso-10" } });
    return new Promise(function (r) { setTimeout(function () { r(window.__disegnate); }, 300); });
  });
  prova("una push in primo piano diventa una notifica", Array.isArray(disegnata) && disegnata.length === 1 &&
        disegnata[0].titolo === "Invito", JSON.stringify(disegnata));
  prova("con la stessa etichetta del server", Array.isArray(disegnata) && disegnata[0] && disegnata[0].opz.tag === "avviso-10");

  console.log("\n  IL TOCCO SU UNA PUSH, CON L'APP GIA' APERTA\n");
  await a.page.evaluate(function () { window.__marca = 7; window.__swMessaggio({ tipo: "apri-notifica", n: "avviso-9" }); });
  await a.page.waitForTimeout(900);
  var st = await a.page.evaluate(function () { return window.__prova.stato(); });
  var letta = await a.page.evaluate(function (uid) { var n = window.__DATI["notifications/" + uid + "/items"]["avviso-9"]; return n && n.read; }, U.uid);
  prova("la notifica toccata si apre (non si resta sulla Home)", st.screen !== "menu", "screen=" + st.screen);
  prova("e viene segnata letta", letta === true);
  prova("senza ricaricare la pagina", (await a.page.evaluate(function () { return window.__marca; })) === 7);

  console.log("\n  USCENDO SI TOGLIE SOLO QUESTO DISPOSITIVO\n");
  await a.page.evaluate(function () { window.__prova.esci(); });
  await a.page.waitForTimeout(3800);
  var u2 = await utenteCloud(a.page);
  var voci2 = Object.keys(u2.fcmTokens || {}).map(function (k) { return u2.fcmTokens[k].token; });
  prova("la voce di questo telefono non c'e' piu'", voci2.indexOf("token-di-questo-telefono") < 0, JSON.stringify(u2.fcmTokens));
  prova("quella dell'altro dispositivo resta", voci2.indexOf("token-dell-altro-telefono") >= 0, JSON.stringify(u2.fcmTokens));
  prova("nessun errore JavaScript", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  console.log("\n  IL TOCCO SU UNA PUSH AD APP CHIUSA (?n=)\n");
  var b = await apri("?n=avviso-9");
  var stb = await b.page.evaluate(function () { return window.__prova.stato(); });
  var lettab = await b.page.evaluate(function (uid) { var n = window.__DATI["notifications/" + uid + "/items"]["avviso-9"]; return n && n.read; }, U.uid);
  prova("aprendo dal tocco la notifica si apre", stb.screen !== "menu", "screen=" + stb.screen);
  prova("e viene segnata letta", lettab === true);
  prova("l'indirizzo si pulisce (niente ?n= a ogni ricarica)", !/\?n=/.test(await b.page.evaluate(function () { return location.search; })));
  prova("nessun errore JavaScript", b.err.length === 0, b.err[0]);
  await b.ctx.close();

  await browser.close();
  try { fs.rmSync(DOVE, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
