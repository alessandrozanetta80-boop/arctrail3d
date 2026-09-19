#!/usr/bin/env node
/* banco-fumo.js — una sessione sola, dall'inizio alla fine, come la farebbe
 * una persona.
 *
 *   node tests/banco-fumo.js
 *   APP=percorso node tests/banco-fumo.js   # sabotaggio
 *
 * PERCHE' ESISTE. (20/09/2026, fase 67.) Gli altri banchi provano una cosa
 * per volta, e la provano bene: il giro, la chat, le notifiche, la tastiera.
 * Nessuno pero' fa quello che fa una persona la domenica mattina — apre
 * l'app, guarda dove si tira, tira, chiude, va a vedere quanto ha fatto,
 * sistema il profilo, e poi il telefono resta senza campo. Un difetto che
 * nasce fra due schermate — uno stato che non si salva passando di li', un
 * ridisegno che perde il punteggio — non lo vede nessun banco specializzato.
 *
 * NON e' una copia degli altri banchi: qui non si controlla il dettaglio, si
 * controlla che il CAMMINO non si interrompa. Se una prova di questo banco
 * cade, e' quasi sempre il segno che ne va scritto uno vero da un'altra parte.
 *
 * L'app gira sul suo percorso di produzione (firebase-finto.js), senza rete.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var D = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-fumo-"));
fs.writeFileSync(path.join(D, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = { stato: function(){ return JSON.parse(JSON.stringify(state)); }," +
          " storico: function(){ try{ return JSON.parse(localStorage.getItem('arctrail3d_storico_v1')||'[]'); }catch(e){ return []; } } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) { if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x)); });

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
var U = { uid: "uidMario", email: "mario@esempio.it" };
function cloud() {
  var d = { users: {}, public_profiles: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  d.public_profiles["uidBea"] = { uid: "uidBea", username: "bea", nomeCognome: "Bea Neri" };
  return d;
}
function stato() {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email,
               federazioni: [{ code: "fiarc", tessera: "FI111" }] },
    profileSkipped: false, pendingArchers: [] };
}

async function tocca(page, testo) {
  var fatto = await page.evaluate(function (t) {
    var x = Array.prototype.filter.call(document.querySelectorAll("#app button, .tabbar button, #app a"), function (b) {
      return b.offsetParent && b.textContent.replace(/\s+/g, " ").indexOf(t) >= 0; })[0];
    if (x) { x.click(); return true; } return false;
  }, testo);
  await page.waitForTimeout(500);
  return fatto;
}
async function premi(page, css) {
  var c = await page.evaluate(function (s) { var x = document.querySelector(s); if (x) { x.click(); return true; } return false; }, css);
  await page.waitForTimeout(160);
  return c;
}
function testo(page) { return page.evaluate(function () { var a = document.querySelector("#app"); return a ? a.innerText.replace(/\s+/g, " ") : ""; }); }

(async function () {
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "it-IT", isMobile: true, hasTouch: true });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud() }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    "localStorage.setItem('arctrail3d_state_v3'," + JSON.stringify(JSON.stringify(stato())) + ");" +
    "localStorage.setItem('arctrail3d_proprietario_v1','" + U.uid + "');" +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  page.on("console", function (m) { if (m.type() === "error") errori.push("console: " + m.text()); });

  console.log("\n  LA DOMENICA MATTINA, DALL'INIZIO ALLA FINE\n");
  await page.goto("file://" + path.join(D, "app.html").replace(/\\/g, "/"));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  var home = await testo(page);
  prova("1. l'app si apre sulla Home", home.length > 40 && !/undefined|\[object/.test(home), home.slice(0, 90));

  prova("2. la sezione «Campi» si apre", await tocca(page, "Campi"));
  var cal = await testo(page);
  prova("3. e mostra qualcosa, non una schermata vuota", cal.length > 40, cal.slice(0, 90));

  await tocca(page, "Home");
  prova("4. si torna alla Home", /\w/.test(await testo(page)));

  // ── SI TIRA ────────────────────────────────────────────────────────────
  await tocca(page, "Tira");
  await tocca(page, "Gara libera");
  await tocca(page, "Continua");
  await tocca(page, "Round 3D");
  var partito = await tocca(page, "Inizia gara");
  prova("5. il giro parte", partito && /PIAZZOLA 1/i.test(await testo(page)), (await testo(page)).slice(0, 90));

  /* Tre piazzole, due frecce l'una: 3x(11+10) = 63. */
  for (var i = 0; i < 3; i++) { await premi(page, ".quick-btn.superspot"); await premi(page, ".quick-btn.spot"); }
  await page.waitForTimeout(400);
  var s = await page.evaluate(function () { return window.__prova.stato(); });
  /* L'id dell'arciere non si indovina: nasce quando il giro parte. */
  var io0 = (s.archers && s.archers[0] && s.archers[0].id) || "a0";
  /* Ogni piazzola e' una voce {arrows:[...], total:n}: il totale del giro e'
     la somma dei totali, non delle voci. */
  function somma(st) { return ((st.scores || {})[io0] || []).reduce(function (a, v) { return a + ((v && v.total) || 0); }, 0); }
  var punti = somma(s);
  prova("6. i punti battuti finiscono nel giro", punti > 0, "trovati " + punti + " · " + JSON.stringify((s.scores || {})[io0]));
  prova("7. il giro ha un nome suo (roundId)", typeof s.roundId === "string" && s.roundId.length > 8, String(s.roundId));
  prova("8. si e' arrivati alla piazzola 4", s.target === 4, "piazzola " + s.target);

  // Una freccia si annulla, e il conto torna indietro di quella e basta.
  await premi(page, ".quick-btn.superspot");
  var annullato = await tocca(page, "Annulla");
  var s2 = await page.evaluate(function () { return window.__prova.stato(); });
  var punti2 = somma(s2);
  prova("9. annullare toglie l'ultima freccia e nient'altro", annullato && punti2 === punti,
        "prima " + punti + ", dopo " + punti2 + (annullato ? "" : " · il tasto Annulla non c'era"));

  // ── SI CHIUDE ──────────────────────────────────────────────────────────
  /* Il tasto che chiude sta dentro il pannello della classifica, non sulla
     pista: prima si apre il pannello. */
  await tocca(page, "Classifica");
  await tocca(page, "Termina percorso");
  await tocca(page, "Tocca di nuovo per confermare");   // il secondo tocco
  await page.waitForTimeout(900);
  var dopo = await testo(page);
  var st3 = await page.evaluate(function () { return window.__prova.stato(); });
  prova("10. il giro si chiude", st3.roundActive !== true, "roundActive " + st3.roundActive + " · " + dopo.slice(0, 70));
  var storico = await page.evaluate(function () { return window.__prova.storico(); });
  prova("11. e finisce nello storico", storico.length >= 1, storico.length + " giri");
  /* Nello storico gli arcieri stanno in `results`, ordinati per punteggio. */
  var mio = (storico[0] && storico[0].results || []).filter(function (r) { return r.isSelf; })[0];
  prova("12. nello storico c'e' il punteggio, non uno zero", !!mio && mio.total === punti,
        "atteso " + punti + " · " + JSON.stringify(storico[0] && storico[0].results));
  prova("12b. e il giro porta con se' il suo roundId", !!(storico[0] && storico[0].roundId === s.roundId),
        String(storico[0] && storico[0].roundId));

  // ── IL PROFILO ─────────────────────────────────────────────────────────
  /* Dal riepilogo si torna al menu, e solo da li' c'e' il profilo. */
  await tocca(page, "Torna al menu");
  await tocca(page, "Home");
  /* Il profilo si apre dalla pastiglia in testata: non e' nella barra in
     basso (dal 20/08 la barra e' il giro sportivo). Il titolo del pulsante
     dice «Profilo» anche quando sullo schermo c'e' solo l'iniziale. */
  var apertoProfilo = await page.evaluate(function () {
    var x = Array.prototype.filter.call(document.querySelectorAll("header button, .top button, #app button"), function (b) {
      return b.offsetParent && /Profilo/.test((b.getAttribute("title") || "") + " " + (b.getAttribute("aria-label") || "") + " " + b.textContent); })[0];
    if (x) { x.click(); return true; } return false;
  });
  await page.waitForTimeout(700);
  var pagProfilo = await testo(page);
  prova("13. il profilo si apre", apertoProfilo && /Mario Rossi|mariorossi/i.test(pagProfilo), pagProfilo.slice(0, 90));

  // ── SENZA RETE, COME IN BOSCO ──────────────────────────────────────────
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 }).catch(function () {});
  await page.waitForTimeout(1500);
  var offline = await testo(page);
  prova("14. senza rete l'app si riapre", offline.length > 40, offline.slice(0, 90));
  var storico2 = await page.evaluate(function () { return window.__prova.storico(); }).catch(function () { return []; });
  prova("15. e il giro di stamattina e' ancora li'", storico2.length >= 1, storico2.length + " giri");

  /* Gli errori in pagina si guardano ALLA FINE: uno solo, in qualunque punto
     del cammino, vale quanto una prova caduta. */
  var veri = errori.filter(function (e) { return !/net::ERR|Failed to fetch|ERR_INTERNET/.test(e); });
  prova("16. nessun errore in pagina lungo tutto il cammino", veri.length === 0, veri.slice(0, 2).join(" | "));

  await ctx.close();
  await browser.close();
  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
