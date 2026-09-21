#!/usr/bin/env node
/* banco-font-scale.js — l'app regge i caratteri piu' grandi del telefono?

     node tests/banco-font-scale.js [app.html]

   PERCHE' ESISTE. (18/09/2026.) Su un Samsung S26 Ultra l'app sembrava «piu'
   grossa» che sul telefono di riferimento. La tacca era gia' stata curata
   (banco-safe-area); restava l'ipotesi dei caratteri: dimensione del testo di
   Android, zoom dello schermo, zoom della pagina di Chrome. Il banco la mette
   alla prova invece di darla per buona.

   TRE MODI IN CUI IL TESTO CRESCE, E NESSUNO E' `deviceScaleFactor`.
   Il fattore di densita' cambia quanti pixel veri fa un pixel CSS, non quanto
   e' grande il testo: usarlo qui dimostrerebbe una cosa diversa.
   - T  TESTO: ogni carattere moltiplicato, viewport e misure del layout
        fermi. E' cio' che fa la scala dei caratteri di Android in Chrome
        (text autosizing). Chromium da computer non la applica — provato:
        `--blink-settings=accessibilityFontScaleFactor` non cambia un pixel,
        nemmeno su una pagina senza `text-size-adjust` — quindi la si simula,
        dichiarandolo: si legge la dimensione calcolata di ogni elemento e la
        si riscrive moltiplicata, di nuovo a ogni ridisegno.
   - R  RADICE: la dimensione di carattere predefinita del browser, impostata
        per davvero (`Page.setFontSizes` del protocollo di Chrome). Tutta la
        tipografia dell'app e' in rem, quindi cresce con lei.
   - Z  ZOOM: lo zoom della pagina di Chrome e lo «zoom schermo» di Samsung
        non ingrandiscono il testo, restringono il viewport in pixel CSS: a
        150% un 390 diventa un 260. Si prova cosi'.

   COSA DEVE PASSARE, per ogni combinazione: niente scorrimento orizzontale,
   nessun comando fuori dallo schermo, nessuna parola della barra fuori dalla
   sua cella, i pezzi della testata e le celle della barra non si
   sovrappongono, la barra in fondo sta in fondo e dentro lo schermo, la
   testata non cambia altezza scorrendo e attaccata sta a 0, e si va e torna
   Home -> Profilo -> Home e Profilo -> Attrezzatura -> Profilo.

   NON e' un banco Samsung: niente user agent, niente modelli, niente DPR.
   NON tocca l'app: lavora su una copia in una cartella temporanea.

   LA CAUSA TROVATA IL 18/09. Nella barra in fondo le celle sono uguali per
   scelta (`.tabn{flex:1 1 0; min-width:0}`), e l'etichetta «MARKETPLACE» e'
   una parola sola: col testo al 120% e oltre era piu' larga della sua cella
   e sconfinava nella voce accanto. Le misure che la facevano stare — la
   spaziatura, le soglie a 400/374/340px — guardano la larghezza dello
   schermo, e chi ingrandisce i caratteri non la cambia. Cura: l'etichetta
   non e' mai piu' larga della cella e ci va a capo dentro.

   --sabota rimette la causa (etichetta senza limite e senza a capo, barra
   senza `flex-wrap`) e pretende il rosso. */

var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var SABOTA = process.argv.indexOf("--sabota") >= 0;
var FILE = process.argv.slice(2).filter(function(a){ return a.indexOf("--") !== 0; })[0] || "app.html";
var src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");

var ok = 0, ko = 0;
function prova(n, c, extra){
  if(c){ ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

/* Il sabotaggio lavora sulla copia, mai sul file: rimette l'etichetta che
   non puo' andare a capo nella sua cella e la riga che non puo' andare a capo. */
if (SABOTA) {
  src = src + "\n<style>.tabn .tab-lbl{ max-width:none !important; overflow-wrap:normal !important; hyphens:manual !important; }" +
              " .tabbar-bottom{ flex-wrap:nowrap !important; }</style>\n";
  console.log("\n  --sabota: l'etichetta della barra torna senza limite e senza a capo. Deve venire rosso.");
}

var D = path.join(os.tmpdir(), "arctrail-banco-font-scale");
if(!fs.existsSync(D)) fs.mkdirSync(D, { recursive:true });
fs.writeFileSync(path.join(D, "index.html"), require("./copia-dev.js").accendiDev(src));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function(x){
  if(fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var URL = "file:///" + path.join(D, "index.html").split(path.sep).join("/");

function stato(lang){
  return { screen:"menu", tab:"home", pendingArchers:[], lang:lang, country:"it",
           federation:"fiarc", theme:"light", profileSkipped:false,
           profile:{ nomeCognome:"Alessandro Zanetta", username:"alez", arco:"longbow",
                     compagnia:"01VERB", compagniaNome:"Arcieri del Verbano" } };
}

/* La scala controllata del testo (modo T). Si tolgono prima le misure messe
   al giro precedente, poi si leggono tutte, poi si riscrivono tutte: se si
   leggesse e scrivesse insieme, un figlio in `em` si prenderebbe la scala
   due volte. */
function scalaTesto(s){
  var fatti = [];
  function scala(){
    fatti.forEach(function(e){ e.style.removeProperty("font-size"); }); fatti = [];
    var tutti = document.querySelectorAll("body, body *"), orig = [];
    for (var i = 0; i < tutti.length; i++) orig.push(parseFloat(getComputedStyle(tutti[i]).fontSize));
    for (var j = 0; j < tutti.length; j++){ tutti[j].style.setProperty("font-size", (orig[j] * s) + "px", "important"); fatti.push(tutti[j]); }
    window.__scalaFatta = (window.__scalaFatta || 0) + 1;
  }
  var inCorso = false;
  new MutationObserver(function(){
    if (inCorso) return; inCorso = true;
    requestAnimationFrame(function(){ scala(); inCorso = false; });
  }).observe(document, { childList:true, subtree:true });
  document.addEventListener("DOMContentLoaded", scala);
}

function guasti(){
  var W = window.innerWidth, H = window.innerHeight, out = [];
  var de = document.documentElement;
  if (de.scrollWidth > W + 1) out.push("la pagina scorre di lato di " + (de.scrollWidth - W) + "px");
  function vis(e){ var s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") return false;
    var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function inScroller(e){ for (var a = e.parentElement; a; a = a.parentElement){
    var o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll") return true; } return false; }
  function nome(e){ return e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).join(".") : ""); }
  Array.prototype.forEach.call(document.querySelectorAll("button, a, input, select, [role=button], header.top *"), function(e){
    if (!vis(e) || inScroller(e)) return;
    var r = e.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1)
      out.push("fuori dallo schermo: " + nome(e) + " «" + (e.textContent || "").trim().slice(0, 18) + "» [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
  });
  function sovr(lista, dove){
    for (var i = 0; i < lista.length; i++) for (var j = i + 1; j < lista.length; j++){
      var a = lista[i].getBoundingClientRect(), b = lista[j].getBoundingClientRect();
      var ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1 && oy > 1) out.push("sovrapposti nella " + dove + ": " + nome(lista[i]) + " / " + nome(lista[j]));
    } }
  var h = document.querySelector("header.top");
  if (!h) out.push("la testata non c'e'");
  else {
    sovr(Array.prototype.filter.call(h.children, vis), "testata");
    var ha = h.querySelector(".head-actions");
    if (ha) sovr(Array.prototype.filter.call(ha.children, vis), "testata (comandi)");
  }
  var tb = document.querySelector(".tabbar-bottom");
  if (tb) {
    var celle = Array.prototype.filter.call(tb.querySelectorAll(".tabn"), vis);
    sovr(celle, "barra in fondo");
    celle.forEach(function(c){
      var rc = c.getBoundingClientRect();
      Array.prototype.forEach.call(c.children, function(k){
        var rk = k.getBoundingClientRect();
        if (rk.left < rc.left - 1 || rk.right > rc.right + 1)
          out.push("«" + k.textContent.trim() + "» esce dalla sua cella: " + Math.round(rk.width) + "px in " + Math.round(rc.width));
      });
    });
    var r = tb.getBoundingClientRect();
    if (r.bottom > H + 1) out.push("la barra in fondo esce dallo schermo di " + Math.round(r.bottom - H) + "px");
    if (r.bottom < H - 1) out.push("la barra in fondo non sta in fondo (" + Math.round(H - r.bottom) + "px sopra)");
  }
  return out;
}

async function combinazione(browser, modo, s, w, h, lang, completa){
  var vw = w, vh = h;
  if (modo === "Z") { vw = Math.round(w / s); vh = Math.round(h / s); }
  var telefono = w < 900;
  var ctx = await browser.newContext({ viewport:{ width:vw, height:vh }, isMobile:telefono, hasTouch:telefono });
  var p = await ctx.newPage();
  var errori = [];
  p.on("pageerror", function(e){ errori.push(String(e.message)); });
  if (modo === "R") {
    var cdp = await ctx.newCDPSession(p);
    await cdp.send("Page.setFontSizes", { fontSizes:{ standard: Math.round(16 * s), fixed: Math.round(13 * s) } });
  }
  await p.addInitScript(function(st){
    localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st));
    localStorage.setItem("arctrail3d_welcome_v2", "1");
  }, stato(lang));
  if (modo === "T" && s !== 1) await p.addInitScript(scalaTesto, s);
  await p.goto(URL);
  await p.waitForTimeout(900);

  var etichetta = modo + " " + Math.round(s * 100) + "% " + w + "x" + h + (modo === "Z" ? " (css " + vw + "x" + vh + ")" : "") + " " + lang;
  var tutti = [];
  function annota(dove, lista){ lista.forEach(function(x){ tutti.push(dove + ": " + x); }); }

  /* Il testo e' cresciuto davvero? Senza questa riga un modo che non fa
     niente passerebbe tutte le prove per il motivo sbagliato. */
  if (s > 1 && modo !== "Z") {
    var corpo = await p.evaluate(function(){ return parseFloat(getComputedStyle(document.body).fontSize); });
    if (corpo < 15.5 * s) tutti.push("il testo non e' cresciuto: corpo a " + corpo + "px");
  }

  annota("Home", await p.evaluate(guasti));

  /* QUANTO SCHERMO SI PRENDE LA TESTATA. (21/09/2026, S26 Ultra: «la barra in
     alto e' troppo grande».) Le prove qui sopra dicono se qualcosa si
     sovrappone o esce; non dicono quanto e' alta. Con `MISURA=1` si stampa,
     e una testata che supera un quinto dello schermo (in pixel CSS) e' un
     guasto, a qualunque dimensione del testo. */
  var testata = await p.evaluate(function(){ var h = document.querySelector("header.top"); return h ? Math.round(h.getBoundingClientRect().height) : 0; });
  if (process.env.MISURA) {
    console.log("    testata " + testata + "px su " + vh + " (" + Math.round(testata / vh * 100) + "%)  " + modo + " " + Math.round(s * 100) + "% " + vw + "x" + vh);
    if (process.env.MISURA === "2") console.log((await p.evaluate(function(){
      var h = document.querySelector("header.top"), out = [];
      Array.prototype.forEach.call(h.children, function(e){ var q = e.getBoundingClientRect();
        out.push("      " + (e.className || e.tagName) + " top=" + Math.round(q.top) + " h=" + Math.round(q.height) + " x=" + Math.round(q.left) + " w=" + Math.round(q.width)); });
      return out.join("\n");
    })));
  }
  if (testata > vh / 5) tutti.push("la testata prende " + Math.round(testata / vh * 100) + "% dello schermo (" + testata + "px su " + vh + ")");

  if (completa) {
    // La testata: stessa altezza in cima, a meta' e di nuovo in cima; attaccata sta a 0.
    var alt = [];
    for (var y of [0, 400, 0]) {
      await p.evaluate(function(y){ window.scrollTo(0, y); }, y);
      await p.waitForTimeout(150);
      alt.push(await p.evaluate(function(){ var r = document.querySelector("header.top").getBoundingClientRect();
        return { alta: Math.round(r.height), cima: Math.round(r.top), sy: Math.round(window.scrollY) }; }));
    }
    if (alt[0].alta !== alt[1].alta || alt[0].alta !== alt[2].alta)
      tutti.push("la testata cambia altezza scorrendo: " + alt.map(function(a){ return a.alta; }).join(" / "));
    if (alt[1].sy > 0 && telefono && alt[1].cima !== 0)
      tutti.push("attaccata la testata sta a " + alt[1].cima + "px invece che a 0");

    // Home -> Profilo (la pastiglia) -> Home (la voce della barra)
    var a = await p.evaluate(function(){
      var b = [].slice.call(document.querySelectorAll("header .bar-btn")).filter(function(x){ return x.textContent.trim() === "A"; })[0];
      if (!b) return false; b.click(); return true; });
    await p.waitForTimeout(600);
    var dove = await p.evaluate(function(){ return !!document.querySelector(".mp-testa"); });
    if (!a || !dove) tutti.push("dalla Home la pastiglia non apre il Profilo");
    else annota("Profilo", await p.evaluate(guasti));

    var att = await p.evaluate(function(){
      var b = [].slice.call(document.querySelectorAll(".porte-profilo .menu-btn")).filter(function(x){ return /^Attrezzatura|^Equipment|^Ausr/.test(x.textContent.trim()); })[0];
      if (!b) return false; b.click(); return true; });
    await p.waitForTimeout(600);
    var scr = await p.evaluate(function(){ return (JSON.parse(localStorage.getItem("arctrail3d_state_v3")) || {}).screen; });
    if (!att || scr !== "attrezzatura") tutti.push("dal Profilo non si entra in Attrezzatura (" + scr + ")");
    else {
      annota("Attrezzatura", await p.evaluate(guasti));
      await p.evaluate(function(){
        var b = [].slice.call(document.querySelectorAll("header .bar-btn")).filter(function(x){ return x.textContent.trim() === "A"; })[0];
        b && b.click(); });
      await p.waitForTimeout(600);
      if (!(await p.evaluate(function(){ return !!document.querySelector(".mp-testa"); })))
        tutti.push("da Attrezzatura la pastiglia non riporta al Profilo");
    }

    var casa = await p.evaluate(function(){
      var b = document.querySelector(".tabbar-bottom .tabn, .tabbar-wide > button");
      if (!b) return false; b.click(); return true; });
    await p.waitForTimeout(600);
    var st = await p.evaluate(function(){ return JSON.parse(localStorage.getItem("arctrail3d_state_v3")) || {}; });
    if (!casa || st.screen !== "menu" || st.tab !== "home") tutti.push("dal Profilo la barra non riporta alla Home");
  }
  if (errori.length) tutti.push("errori in pagina: " + errori.slice(0, 2).join(" | "));
  await ctx.close();
  return { etichetta: etichetta, guai: Array.from(new Set(tutti)) };
}

(async function(){
  var browser = await chromium.launch();
  var VIEWPORT = [[360,800],[384,832],[390,844],[412,915],[430,932]];
  /* 175% e 200% sono le tacche piu' alte di Android e di iOS: chi le usa non
     lo fa per gusto. Si provano sui tre schermi piu' stretti — oltre, la
     combinazione esplode e il banco diventa lento senza dire di piu'. */
  var SCALE = (process.env.SCALE ? process.env.SCALE.split(",").map(Number) : [1, 1.1, 1.2, 1.3, 1.5]);
  var giri = [];
  VIEWPORT.forEach(function(v){ SCALE.forEach(function(s){ giri.push(["T", s, v[0], v[1], "it", true]); }); });
  VIEWPORT.forEach(function(v){ [1.3, 1.5].forEach(function(s){ giri.push(["R", s, v[0], v[1], "it", false]); giri.push(["Z", s, v[0], v[1], "it", false]); }); });
  /* Le lingue con le parole piu' lunghe nella barra, dove il margine e' minimo. */
  [["de",360,800],["de",390,844],["nl",360,800],["en",360,800],["it",320,568],["de",320,568]].forEach(function(x){
    [1.3, 1.5].forEach(function(s){ giri.push(["T", s, x[1], x[2], x[0], false]); }); });
  [[360,800],[384,832],[390,844]].forEach(function(v){ [1.75, 2].forEach(function(s){ giri.push(["T", s, v[0], v[1], "it", false]); }); });
  /* E il computer non deve essersene accorto. */
  [[1280,720],[1440,900]].forEach(function(v){ [1, 1.5].forEach(function(s){ giri.push(["T", s, v[0], v[1], "it", true]); }); });

  console.log("\n  L'APP REGGE I CARATTERI PIU' GRANDI? (" + giri.length + " combinazioni)");
  for (var g of giri) {
    var r = await combinazione(browser, g[0], g[1], g[2], g[3], g[4], g[5]);
    prova(r.etichetta, r.guai.length === 0, r.guai.slice(0, 3).join(" · ") + (r.guai.length > 3 ? " · (+" + (r.guai.length - 3) + ")" : ""));
  }
  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e && e.message); process.exit(1); });
