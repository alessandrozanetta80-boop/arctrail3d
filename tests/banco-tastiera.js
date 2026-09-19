#!/usr/bin/env node
/* banco-tastiera.js — con la tastiera aperta si arriva ancora a scrivere e a
 * mandare?
 *
 *   node tests/banco-tastiera.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-tastiera.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (20/09/2026, risanamento notturno.) La tastiera del telefono
 * si prende meta' schermo, e meta' schermo e' esattamente dove stanno il campo
 * che si sta compilando e il pulsante che lo manda. Nessun banco la apriva:
 * tutti misuravano l'app a schermo intero, cioe' nella condizione in cui
 * nessuno scrive.
 *
 * LA TASTIERA SI APRE IN DUE MODI DIVERSI, e vanno provati tutti e due perche'
 * rompono cose diverse:
 *   - CONTENUTO (`interactive-widget=resizes-content`, e Android prima di
 *     Chrome 108): la finestra di IMPAGINAZIONE si accorcia. Tutto si
 *     ridisegna in meno spazio; una barra fissa in basso si appoggia sopra la
 *     tastiera e puo' coprire il pulsante.
 *   - VISTA (`resizes-visual`, l'impostazione predefinita di oggi): la finestra
 *     di impaginazione resta alta com'era e la tastiera si appoggia SOPRA.
 *     Niente si ridisegna: se la pagina non ha abbastanza corsa per scorrere,
 *     il campo resta sotto la tastiera e non c'e' modo di vederlo.
 *   Il secondo e' il caso cattivo, ed e' quello che nessuno prova: il browser
 *   porta il campo in vista da solo SOLO SE la pagina puo' scorrere fin li'.
 *
 * COME SI SIMULA. La tastiera vera non si apre in un browser senza schermo.
 *   - modo CONTENUTO: si accorcia il viewport (e' letteralmente cio' che fa).
 *   - modo VISTA: il viewport resta alto, si dichiara un'area coperta in
 *     basso, si porta il campo in vista come farebbe il browser e si scorre
 *     la pagina fino in fondo. Se dopo tutto questo il campo o il pulsante
 *     restano sotto la riga della tastiera, un dito vero non li raggiunge.
 *
 * ALTEZZE. 340px e' una tastiera Android media su uno schermo da 844; 400 e'
 * una con la riga dei suggerimenti e i tasti grandi. Si provano tutte e due.
 */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-tastiera-"));
fs.writeFileSync(path.join(DOVE, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), {
  gancio: "window.__prova = {" +
          " profilo: function(){ state.screen = 'profile-edit'; save(); render(); }," +
          " chat: function(uid, nome){ openDirectChat(uid, nome); } };" }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

var U = { uid: "uidMario", email: "mario@esempio.it" };
var ALTRO = "uidBea";
function cloud() {
  var d = { users: {}, direct_chats: {}, public_profiles: {} };
  d.users[U.uid] = { email: U.email, approved: true, nomeCognome: "Mario Rossi", username: "mariorossi",
                     federazioni: [{ code: "fiarc", tessera: "FI111" }], privacy: true, terms: true };
  d.users[ALTRO] = { email: "bea@esempio.it", approved: true, nomeCognome: "Bea Neri", username: "bea" };
  d.public_profiles[ALTRO] = { uid: ALTRO, username: "bea", nomeCognome: "Bea Neri" };
  var chatId = [U.uid, ALTRO].sort().join("_");
  d.direct_chats[chatId] = { members: [U.uid, ALTRO].sort(), names: {}, updatedAt: Date.now() };
  d.direct_chats[chatId].names[U.uid] = "mariorossi";
  d.direct_chats[chatId].names[ALTRO] = "bea";
  /* Una conversazione CORTA apposta: e' il caso peggiore per la tastiera che
     si appoggia sopra, perche' la pagina non ha corsa da scorrere. */
  d["direct_chats/" + chatId + "/messages"] = {
    m1: { uid: ALTRO, text: "Ci vediamo alla gara?", createdAt: Date.now() - 60000 }
  };
  return d;
}
function stato() {
  return { screen: "menu", tab: "home", lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Mario Rossi", username: "mariorossi", email: U.email,
               federazioni: [{ code: "fiarc", tessera: "FI111" }] },
    profileSkipped: false, pendingArchers: [] };
}

var browser;
async function apri(altezza) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: altezza }, locale: "it-IT",
                                       isMobile: true, hasTouch: true });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: U, dati: cloud() }));
  var seme = { "arctrail3d_state_v3": JSON.stringify(stato()), "arctrail3d_proprietario_v1": U.uid,
               "arctrail3d_welcome_v2": "1" };
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seme')){ sessionStorage.setItem('seme','1');" +
    Object.keys(seme).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(seme[k]) + ");"; }).join("") + " } }catch(e){}");
  var page = await ctx.newPage();
  await page.goto("file://" + path.join(DOVE, "app.html").replace(/\\/g, "/"));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  return { ctx: ctx, page: page };
}

/* Porta il campo in vista come farebbe il browser aprendo la tastiera, poi
   scorre la pagina fino in fondo: e' tutto cio' che l'utente puo' fare.
   Restituisce dove finiscono campo e pulsante, e cosa c'e' sopra di loro. */
async function dopoLaTastiera(page, selCampo, selBottone, coperto) {
  return page.evaluate(function (a) {
    /* SOLO QUELLO CHE SI VEDE. Il primo `input` del profilo e' nascosto (la
       posta, che non si cambia da qui): `focus()` su un elemento invisibile
       non fa niente e il banco misurava una cosa che nessuno tocca. */
    function visibili(sel) {
      return Array.prototype.filter.call(document.querySelectorAll(sel), function (e) {
        return e.offsetParent !== null && !e.disabled && !e.readOnly; });
    }
    var campi = visibili(a.campo), bottoni = visibili(a.bottone);
    /* L'ULTIMO campo del modulo e il suo pulsante: e' il fondo pagina, cioe'
       il punto in cui la tastiera fa danno. */
    var campo = campi[campi.length - 1];
    var bott = bottoni[bottoni.length - 1];
    if (!campo || !bott) return { manca: (campo ? "" : a.campo) + " " + (bott ? "" : a.bottone) };
    function r(e) { var b = e.getBoundingClientRect(); return { top: Math.round(b.top), bot: Math.round(b.bottom), h: Math.round(b.height) }; }
    var sc = document.scrollingElement || document.documentElement;
    var utile = window.innerHeight - a.coperto;
    /* COSI' FA IL BROWSER quando si apre la tastiera: non «centra nella
       pagina» — porta l'elemento dentro la parte che si VEDE. `scrollIntoView`
       non sa niente della tastiera e centrerebbe rispetto alla finestra
       intera, cioe' proprio dietro i tasti. Qui si scorre a mano, e se la
       pagina non ha corsa a sufficienza si vede dal risultato. */
    function portaInVista(e) {
      var b = e.getBoundingClientRect();
      var voluto = sc.scrollTop + b.top - Math.round(utile * 0.3);
      sc.scrollTop = Math.max(0, Math.min(voluto, sc.scrollHeight - window.innerHeight));
    }
    /* PRIMO GESTO: scrivo. */
    campo.focus();
    portaInVista(campo);
    var misuraCampo = r(campo);
    /* SECONDO GESTO: mando. */
    portaInVista(bott);
    var misuraBott = r(bott);
    var diag = { alto: sc.scrollHeight, spazio: !!document.getElementById("spazioTastiera"), scorso: sc.scrollTop };
    /* E li', nel punto in cui si preme, chi c'e' davanti? */
    var bb = bott.getBoundingClientRect();
    var sopra = document.elementFromPoint(Math.round(bb.left + bb.width / 2), Math.round(bb.top + bb.height / 2));
    var coprente = "";
    while (sopra && sopra !== document.body) {
      if (sopra === bott || bott.contains(sopra)) { coprente = ""; break; }
      if (sopra.classList && sopra.classList.contains("tabbar")) { coprente = "tabbar"; break; }
      coprente = sopra.className || sopra.tagName;
      sopra = sopra.parentElement;
    }
    return { campo: misuraCampo, bottone: misuraBott, coprente: coprente, altezza: window.innerHeight, diag: diag };
  }, { campo: selCampo, bottone: selBottone, coperto: coperto });
}

function giudica(nome, m, dentro) {
  if (m.manca) { prova(nome, false, "non trovo: " + m.manca); return; }
  var campoOk = m.campo.top >= 0 && m.campo.bot <= dentro;
  var bottOk = m.bottone.top >= 0 && m.bottone.bot <= dentro;
  var scopertoOk = !m.coprente;
  prova(nome, campoOk && bottOk && scopertoOk,
        "campo " + JSON.stringify(m.campo) + " · pulsante " + JSON.stringify(m.bottone) + " · " + JSON.stringify(m.diag) +
        " · spazio utile 0–" + dentro + (m.coprente ? " · coperto da " + m.coprente : ""));
}

(async function () {
  browser = await chromium.launch();

  /* ── IL PROFILO ─────────────────────────────────────────────────────────
     E' la schermata che il capitolato nomina: un modulo lungo, con il tasto
     che salva in fondo. */
  console.log("\n  IL PROFILO, CON LA TASTIERA APERTA\n");
  for (var tast of [340, 400]) {
    // Modo CONTENUTO: la finestra si accorcia davvero.
    var a = await apri(844 - tast);
    await a.page.evaluate(function () { window.__prova.profilo(); });
    await a.page.waitForTimeout(700);
    var m = await dopoLaTastiera(a.page, "#app input[type=text], #app input:not([type]), #app input[type=email]",
                                 "#app .btn-primary", 0);
    giudica("profilo · tastiera da " + tast + " che accorcia la pagina", m, m.altezza);
    await a.ctx.close();

    // Modo VISTA: la pagina resta alta, la tastiera copre gli ultimi `tast`.
    var b = await apri(844);
    await b.page.evaluate(function () { window.__prova.profilo(); });
    await b.page.waitForTimeout(700);
    var m2 = await dopoLaTastiera(b.page, "#app input[type=text], #app input:not([type]), #app input[type=email]",
                                  "#app .btn-primary", tast);
    giudica("profilo · tastiera da " + tast + " appoggiata sopra", m2, 844 - tast);
    await b.ctx.close();
  }

  /* ── LA CHAT ────────────────────────────────────────────────────────────
     Conversazione corta: la pagina e' piu' corta dello schermo e non c'e'
     niente da scorrere. Se il pulsante «Invia» finisce sotto la tastiera,
     il messaggio non parte e non si capisce perche'. */
  console.log("\n  LA CHAT, CON LA TASTIERA APERTA\n");
  for (var tk of [340, 400]) {
    var c = await apri(844 - tk);
    await c.page.evaluate(function (u) { window.__prova.chat(u, "bea"); }, ALTRO);
    await c.page.waitForTimeout(900);
    var mc = await dopoLaTastiera(c.page, ".chat-scrivi textarea", ".chat-scrivi .btn", 0);
    giudica("chat · tastiera da " + tk + " che accorcia la pagina", mc, mc.altezza);
    await c.ctx.close();

    var d = await apri(844);
    await d.page.evaluate(function (u) { window.__prova.chat(u, "bea"); }, ALTRO);
    await d.page.waitForTimeout(900);
    var md = await dopoLaTastiera(d.page, ".chat-scrivi textarea", ".chat-scrivi .btn", tk);
    giudica("chat · tastiera da " + tk + " appoggiata sopra", md, 844 - tk);
    await d.ctx.close();
  }

  await browser.close();
  try { fs.rmSync(DOVE, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", e && e.message); process.exit(1); });
