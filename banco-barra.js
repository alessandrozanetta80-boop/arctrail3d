#!/usr/bin/env node
/* banco-barra.js — la barra in fondo sta dentro lo schermo, in nove lingue.
 *
 *   node banco-barra.js
 *
 * IL NUMERO E CAMBIATO. (22/08/2026.) Dal ridisegno «toni» le voci sono
 * QUATTRO: Compagnie e uscita dalla barra ed e rientrata nel profilo. Il banco
 * diceva cinque e da quel giorno era rosso — e un banco rosso per un motivo
 * giusto smette di essere letto entro due giorni. Il numero e scritto qui
 * apposta: se domani ne compare una quinta, questo banco deve dire di no
 * finche qualcuno non decide che ci sta.
 *
 * PERCHE ESISTE. (20/08/2026.) La barra a cinque voci e nata il 20/08 e fino
 * a oggi non era mai comparsa in una foto: si disegna solo con un utente
 * collegato, e con DEV_MODE non ce n era nessuno. Guardata finalmente al suo
 * posto, e misurata, diceva una cosa che a occhio non si vedeva: a 320px —
 * iPhone SE, e i telefoni piccoli che restano in giro — la riga delle cinque
 * voci SFORA la barra. In italiano di tre pixel, in russo di diciotto, in
 * nederlandese di venti: «Verenigingen» usciva dallo schermo a destra.
 *
 * LA CAUSA NON ERA LA PAROLA, ERA LA CELLA. Le celle hanno flex:1 ma non
 * possono restringersi sotto il proprio contenuto: a cedere non e la cella,
 * e la riga. Curato togliendo quattro pixel d aria per cella sotto i 360.
 *
 * QUESTO BANCO ESISTE PERCHE LA PROSSIMA PAROLA NON LA SCEGLIE NESSUNO QUI.
 * Il giorno che una traduzione diventa piu lunga — o che si aggiunge una
 * sesta voce — il difetto torna, non rompe niente, e non se ne accorge
 * nessuno: si limita a mangiare l ultima lettera sui telefoni piccoli, che
 * sono quelli che nessuno di noi ha in mano.
 *
 * NON SOSTITUISCE IL TELEFONO VERO: misura che ci stia, non che si legga.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
/* 412 e' il telefono di Alessandro, e non c'era. Il 25/08 la barra e' stata
   guardata li' sopra e la quarta cella era piu' larga delle altre: il banco
   girava su 320, 360, 390 e 430 e non aveva niente da dire. Una larghezza
   che non si prova e' una larghezza dove il difetto vive. */
var LARGHEZZE = [320, 360, 390, 412, 430];

var D = path.join(os.tmpdir(), "arctrail-banco-barra");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

function stato(lang, tab) {
  return { screen: "menu", tab: tab || "home", pendingArchers: [], lang: lang, country: "it",
           federation: "fiarc", theme: "light",
           profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
                      compagniaNome: "A.S.D. Arcieri del Verbano", classe: "SM", arco: "longbow" },
           profileSkipped: false };
}

async function apri(browser, lang, largh) {
  var ctx = await browser.newContext({ viewport: { width: largh, height: 900 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(lang))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  await page.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await page.waitForTimeout(900);
  return { ctx: ctx, page: page };
}

function misura() {
  var bar = document.querySelector(".tabbar-bottom");
  if (!bar) return { manca: true };
  var bb = bar.getBoundingClientRect();
  var voci = Array.prototype.map.call(bar.querySelectorAll("button"), function (b) {
    var l = b.querySelector(".tab-lbl"); var lr = l.getBoundingClientRect(); var br = b.getBoundingClientRect();
    var schermo = document.documentElement.clientWidth;
    return { testo: l.textContent.trim(),
             fuoriSinistra: Math.round((bb.left - lr.left) * 10) / 10,
             fuoriDestra: Math.round((lr.right - bb.right) * 10) / 10,
             /* Quanto la parola sta lontana dal BORDO DELLO SCHERMO, che e'
                una domanda diversa da quanto sta lontana dalla sua cella: il
                25/08 le celle erano uguali e in bilancia, e l'ultima parola
                finiva lo stesso a due pixel dal vetro, perche' la barra
                andava da bordo a bordo. */
             vetro: Math.round(Math.min(lr.left, schermo - lr.right)),
             cella: Math.round(br.width),
             aria: Math.round((br.width - lr.width) / 2),
             alto: Math.round(br.height) };
  });
  return { manca: false, larghezza: Math.round(bb.width), contenuto: Math.round(bar.scrollWidth), voci: voci };
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  LA RIGA STA DENTRO LA BARRA, IN NOVE LINGUE");
  for (var i = 0; i < LARGHEZZE.length; i++) {
    var largh = LARGHEZZE[i];
    var peggiore = null;
    for (var j = 0; j < LINGUE.length; j++) {
      var a = await apri(browser, LINGUE[j], largh);
      var m = await a.page.evaluate(misura);
      await a.ctx.close();
      if (m.manca) { prova(largh + "px · " + LINGUE[j] + ": la barra c'e'", false, "non disegnata"); continue; }
      var sbordo = m.contenuto - m.larghezza;
      var fuori = m.voci.filter(function (v) { return v.fuoriDestra > 0.5 || v.fuoriSinistra > 0.5; });
      if (!peggiore || sbordo > peggiore.sbordo) peggiore = { lingua: LINGUE[j], sbordo: sbordo, fuori: fuori, m: m };
    }
    prova(largh + "px · nessuna lingua sfora la barra",
          peggiore && peggiore.sbordo <= 0,
          peggiore ? peggiore.lingua + ": " + peggiore.m.contenuto + " in " + peggiore.m.larghezza : "");
    prova(largh + "px · nessuna parola esce dai bordi",
          peggiore && peggiore.fuori.length === 0,
          peggiore && peggiore.fuori[0] ? "«" + peggiore.fuori[0].testo + "» esce di " +
            Math.max(peggiore.fuori[0].fuoriDestra, peggiore.fuori[0].fuoriSinistra) + "px in " + peggiore.lingua : "");
  }

  /* LE QUATTRO CELLE SONO LARGHE UGUALI. (25/08/2026, chiesto da Alessandro:
     «bilanciamo i tasti, marketplace e' tutto a destra».)
     Non era un'impressione: una cella `flex:1` NON si stringe sotto il proprio
     contenuto, quindi la quarta — «MARKETPLACE», undici lettere contro le
     quattro di «HOME» — si prendeva quello che le serviva e le altre tre
     restavano indietro. A 390px erano 93,93,93,95, e la parola aveva due
     pixel d'aria dove «HOME» ne aveva ventotto: *tre celle uguali e una no.*
     LE CURE SONO DUE, E QUELLA CHE REGGE NON E' QUELLA CHE SEMBRAVA.
     `min-width:0` toglie il divieto di stringersi; ma la cura che porta i
     numeri e' la SPAZIATURA STRETTA sotto i 400px, che era gia' scritta dal
     20/08 e **non era mai entrata in vigore**: stava prima della regola base
     del testo, che ha la stessa forza, e a parita' vince l'ultima scritta.
     Provate col sabotaggio tutte e due: togliendo la spaziatura stretta il
     banco dice di no, togliendo `min-width:0` no — perche' con la parola
     stretta la cella naturale ci sta lo stesso. `min-width:0` resta come
     rete per il giorno che una parola si allunga, e questo va scritto invece
     di far credere che sia lei a tenere in piedi la cosa.
     Sotto i 341px si rinuncia apposta: li' la parola non ci sta nemmeno
     stretta, e una parola che esce dallo schermo e' peggio di quattro celle
     diverse.
     Questa prova guarda una cosa che NON si rompe tornando indietro: la barra
     funziona uguale, e' solo storta. */
  console.log("\n  LE QUATTRO CELLE SONO LARGHE UGUALI");
  for (var k = 0; k < LARGHEZZE.length; k++) {
    if (LARGHEZZE[k] <= 340) continue;   // sotto i 341 la bilancia perde apposta
    var peggio = null;
    for (var q = 0; q < LINGUE.length; q++) {
      var aa = await apri(browser, LINGUE[q], LARGHEZZE[k]);
      var mm = await aa.page.evaluate(misura);
      await aa.ctx.close();
      if (mm.manca) continue;
      var celle = mm.voci.map(function (v) { return v.cella; });
      var scarto = Math.max.apply(null, celle) - Math.min.apply(null, celle);
      var strette = mm.voci.filter(function (v) { return v.aria < 2; });
      var alVetro = mm.voci.filter(function (v) { return v.vetro < 6; });
      if (!peggio || scarto > peggio.scarto || alVetro.length)
        peggio = { l: LINGUE[q], scarto: scarto, celle: celle, strette: strette, alVetro: alVetro };
    }
    prova(LARGHEZZE[k] + "px · le quattro celle sono uguali",
          peggio && peggio.scarto <= 1,
          peggio ? peggio.l + ": " + peggio.celle.join(",") : "");
    prova(LARGHEZZE[k] + "px \u00b7 nessuna parola arriva a meno di 6px dal vetro",
          peggio && peggio.alVetro.length === 0,
          peggio && peggio.alVetro[0] ? "\u00ab" + peggio.alVetro[0].testo + "\u00bb sta a " +
            peggio.alVetro[0].vetro + "px dal bordo dello schermo in " + peggio.l : "");
    prova(LARGHEZZE[k] + "px · nessuna parola tocca il bordo della sua cella",
          peggio && peggio.strette.length === 0,
          peggio && peggio.strette[0] ? "«" + peggio.strette[0].testo + "» ha " +
            peggio.strette[0].aria + "px d'aria in " + peggio.l : "");
  }

  console.log("\n  E RESTA UN BERSAGLIO DA POLLICE");
  var b390 = await apri(browser, "it", 390);
  var m390 = await b390.page.evaluate(misura);
  prova("quattro voci", !m390.manca && m390.voci.length === 4, m390.voci ? m390.voci.length + "" : "nessuna");
  prova("ogni voce e' alta almeno 44px",
        !m390.manca && m390.voci.every(function (v) { return v.alto >= 44; }),
        m390.voci ? m390.voci.map(function (v) { return v.testo + ":" + v.alto; }).join(" ") : "");
  await b390.ctx.close();

  console.log("\n  DA COMPUTER LA BARRA E' NELLA TESTATA, NON IN FONDO");
  var largo = await apri(browser, "it", 1280);
  var d = await largo.page.evaluate(function () {
    return { bassa: !!document.querySelector(".tabbar-bottom"),
             larga: !!document.querySelector("header.top .tabbar-wide"),
             voci: document.querySelectorAll(".tabbar-wide button").length };
  });
  await largo.ctx.close();
  prova("in fondo non c'e'", !d.bassa);
  prova("ed e' dentro l'insegna", d.larga);
  prova("con le sue quattro voci", d.voci === 4, d.voci + "");

  /* IL MARCHIO E' UN TASTO, E RIPORTA ALLA HOME. (25/08/2026.)
     E' la convenzione che tutti hanno gia' imparato altrove, e finora l'app
     era l'unico posto dove non funzionava: si guardava, si toccava, e non
     succedeva niente. La prova sta qui e non altrove perche' il marchio e la
     barra fanno lo stesso mestiere — portare da un'altra parte — e adesso
     passano per la stessa riga di codice.
     Si prova su tutte e due le larghezze: sul telefono l'insegna e' una riga
     sola, da computer si porta dentro anche la barra, e sono due
     impaginazioni diverse dello stesso elemento. */
  console.log("\n  IL MARCHIO IN CIMA PORTA ALLA VETRINA");
  /* FINO AL 26/08 QUESTA PROVA CHIEDEVA LA HOME, e diceva di si' a un tasto
     che sullo schermo non faceva niente: il 25/08 il marchio era stato
     agganciato alla scheda Home, ma chi lo premeva STAVA quasi sempre sulla
     Home — quindi nessun segnale, per un giorno intero. La decisione e'
     cambiata da Alessandro stesso: il marchio porta alla porta di casa del
     SITO, cioe' la vetrina, come ovunque sul web; per la scheda Home c'e'
     la casetta nella barra. E adesso e' un <a> col suo href scritto: si
     prova l'INDIRIZZO, che e' quello che naviga anche se un copione muore. */
  for (var g = 0; g < 2; g++) {
    var lar = g === 0 ? 390 : 1280;
    var ctx = await browser.newContext({ viewport: { width: lar, height: 900 } });
    var st = stato("it", "campi");
    await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(st)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
    var pg = await ctx.newPage();
    await pg.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
    await pg.waitForTimeout(900);
    var com = await pg.evaluate(function () {
      var e = document.querySelector("header.top .brandblock");
      if (!e) return null;
      var st = getComputedStyle(e);
      return { tag: e.tagName, href: e.getAttribute("href") || "", fondo: st.backgroundColor,
               bordo: st.borderTopWidth, riga: st.textDecorationLine, dito: st.cursor };
    });
    prova(lar + "px \u00b7 il marchio e' un collegamento vero", com && com.tag === "A", com ? com.tag : "manca");
    prova(lar + "px \u00b7 e porta alla vetrina, con da=app e la lingua",
          com && /^index\.html\?da=app(&|$)/.test(com.href) && /lang=it/.test(com.href), com ? com.href : "");
    prova(lar + "px \u00b7 senza il vestito del bottone ne' la sottolineatura",
          com && com.fondo === "rgba(0, 0, 0, 0)" && com.bordo === "0px" && com.riga !== "underline",
          com ? com.fondo + " / " + com.bordo + " / " + com.riga : "");
    await ctx.close();
  }

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
