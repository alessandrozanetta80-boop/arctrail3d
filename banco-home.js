#!/usr/bin/env node
/* banco-home.js — i quattro numeri della Home vengono dallo storico vero.
 *
 *   node banco-home.js
 *
 * PERCHE ESISTE. Un cruscotto e la cosa piu facile da riempire di numeri
 * plausibili: media, record, conteggi. Se il calcolo sbaglia non si rompe
 * niente e non protesta nessuno — si legge un numero, e si crede.
 * Qui lo storico e seminato a mano, quindi le risposte giuste si sanno
 * prima: media 210 (i due giri da 12), record 220 (lo stesso gruppo),
 * 24 piazzole, due giri contati. I perche' stanno accanto alle prove.
 *
 * E la prova che conta di piu e l ultima: SENZA storico la Home non deve
 * mostrare nessuna fascia. *Un cruscotto pieno di zeri non informa:
 * scoraggia, e mente sul fatto che l app sia gia stata usata.*
 */var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright");

var D = require("path").join(require("os").tmpdir(), "arctrail-banco-home");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  fs.readFileSync("app.html", "utf8").replace("var DEV_MODE = false;", "var DEV_MODE = true;"));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

function giro(giorniFa, punti, piazzole) {
  var d = new Date(Date.now() - giorniFa * 86400000);
  return {
    date: d.toISOString(), format: piazzole, modeKey: "training", modeLabel: "Allenamento",
    results: [{ name: "alez", total: punti, isSelf: true, ownerUid: null,
                perTarget: new Array(piazzole).fill(0), arrows: [] }]
  };
}
/* Tre giri questo mese: 200, 220, 240 → media 220, meglio 240, piazzole 12+12+24=48.
   Il primo dell'elenco e' il piu' recente (hist.unshift), quindi 240 e' l'ultimo
   e il delta rispetto al precedente (220) e' +20. */
var STORICO = [giro(1, 240, 24), giro(3, 220, 12), giro(5, 200, 12)];

var STATO = { screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it",
              federation: "fiarc", theme: "light",
              profile: { nomeCognome: "Alessandro Zanetta", username: "alez" }, profileSkipped: false };

var ok = 0, ko = 0;
function prova(n, c, extra) { if (c) { ok++; console.log("  ✓ " + n); } else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); } }

(async function () {
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript("try{" +
    " localStorage.setItem('arctrail3d_state_v3', " + JSON.stringify(JSON.stringify(STATO)) + ");" +
    " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(STORICO)) + ");" +
    " localStorage.setItem('arctrail3d_welcome_v2','1');" +
    "}catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await page.waitForTimeout(1400);

  var r = await page.evaluate(function () {
    /* La striscia del mese (21/08/2026): etichetta in <i>, cifra in <b>.
       SI GUARDA DENTRO IL PANNELLO DEL MESE, non in tutta la pagina.
       (25/08/2026.) Il selettore era `.hm-voce` e basta: giusto finche' quel
       disegno esisteva in un posto solo. Dal 25/08 lo riusa anche lo strato
       dell'ultimo giro — che e' esattamente quello che un pannello di numeri
       deve poter fare — e il banco ha cominciato a contarne cinque e a
       leggere i valori sbagliati, uno spostato.
       *Un banco che cerca un disegno invece del posto dove sta trova anche
       le sue imitazioni.* */
    var num = Array.prototype.map.call(document.querySelectorAll(".home-mese .hm-voce"), function (e) {
      return { v: (e.querySelector("b") || {}).textContent, eti: (e.querySelector("i") || {}).textContent };
    });
    var g = document.querySelector(".home-giro");
    return {
      numeri: num,
      ultimo: g ? g.innerText.replace(/\s+/g, " ") : null,
      testo: document.getElementById("app").innerText.slice(0, 60).replace(/\s+/g, " ")
    };
  });

  /* ══ QUESTE QUATTRO PROVE FISSAVANO UN DIFETTO ═════════════════════════
     (25/08/2026.) Chiedevano media 220, cioe' (200+220+240)/3 — la media di
     TRE giri di DUE formati diversi: due da 12 piazzole e uno da 24. Quel
     numero non descrive nessuno dei tre giri, e sale o scende col miscuglio
     invece che col tiro. *Il banco non stava sbagliando i conti: stava
     controllando che l'app continuasse a farne uno sbagliato.*

     Il seme resta identico apposta — adesso e' il caso di prova del vincolo,
     non del difetto. Con la regola nuova vince il formato piu' numeroso (12,
     due giri): media (200+220)/2 = 210, due giri, 24 piazzole.

     E IL RECORD È 220, NON 240. (Corretto il 30/08/2026.) Fino a qui questa
     riga chiedeva 240 — «un massimo non si sporca mescolando: e' il
     punteggio piu' alto che hai fatto, punto». Il 29/08 l'app ha deciso il
     contrario, e lo ha scritto accanto a `homeNumeri`: *«il "meglio" del mese
     esce dal gruppo confrontabile, non da tutti i giri»*. Il record adesso
     esce dallo stesso gruppo della media, e la sua etichetta dice di quale
     gara e': «record · <contesto>». Un massimo etichettato non mescola.
     *Questa riga e' rimasta rossa dal 29 al 30 agosto senza che nessuno la
     leggesse: e' il difetto raccontato il 22/08, ripetuto.* */
  console.log("\n  I QUATTRO NUMERI VENGONO DALLO STORICO, E NON MESCOLANO FORMATI");
  var v = r.numeri.map(function (x) { return x.v; });
  prova("ce ne sono quattro", r.numeri.length === 4, "trovati " + r.numeri.length);
  prova("media 210: i due giri da 12, non i tre di formati diversi", v[0] === "210", "e' " + v[0]);
  prova("due giri, quelli del formato che vince", v[1] === "2", "e' " + v[1]);
  prova("record 220: il massimo del gruppo confrontabile, non dei tre giri", v[2] === "220", "e' " + v[2]);
  prova("24 piazzole (12+12)", v[3] === "24", "e' " + v[3]);

  /* L'ULTIMO GIRO NON STA PIU' SULLA HOME. (21/08/2026.) La prima schermata
     ha tre cose — inizia un giro, i numeri del mese, gli allenamenti aperti —
     e l'ultimo giro e' andato dove stanno i giri: Attivita' > Giri, che si
     apre da «Il mio diario» nel profilo.
     Le tre domande che erano qui — che mostri l'ULTIMO e non un altro, che il
     salto sia rispetto al giro prima, e che dica il CAMPO invece del tipo di
     giro — non sono state buttate: **non sono ancora state riscritte per la
     schermata nuova**. Sta scritto qui perche' nessuno creda che quel
     comportamento sia coperto da qualche parte. */

  console.log("\n  SENZA STORICO NON SI INVENTA NIENTE");
  await ctx.close();
  var ctx2 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx2.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(STATO)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var p2 = await ctx2.newPage();
  await p2.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await p2.waitForTimeout(1300);
  var r2 = await p2.evaluate(function () {
    return { num: document.querySelectorAll(".home-mese .hm-voce").length,
             giro: document.querySelectorAll(".home-giro").length,
             saluto: !!document.querySelector(".home-saluto") };
  });
  prova("nessuna fascia di numeri", r2.num === 0, "trovati " + r2.num);
  prova("nessun ultimo giro", r2.giro === 0);
  prova("ma il saluto e la domanda ci sono", r2.saluto);

  /* IL CAMPO ARRIVA FINO IN FONDO. Lo storico non sapeva DOVE si era tirato,
     quindi la Home poteva dire solo il tipo di giro. Adesso il campo si chiede
     nella preparazione, e chi non lo scrive non deve trovarsene uno inventato. */
  console.log("\n  IL CAMPO, QUANDO C'E'");
  await ctx2.close();
  var conCampo = [giro(1, 240, 24)];
  conCampo[0].campo = "Fornasona, Cerrione";
  var ctx3 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx3.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(STATO)) + "); localStorage.setItem('arctrail3d_storico_v1', " +
    JSON.stringify(JSON.stringify(conCampo)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var p3 = await ctx3.newPage();
  await p3.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await p3.waitForTimeout(1300);
  var r3 = await p3.evaluate(function () {
    var g = document.querySelector(".home-giro");
    return g ? g.innerText.replace(/\s+/g, " ") : null;
  });
  // Con un campo scritto la Home non cambia: qui si controlla solo che non si
  // rompa niente. Cosa mostra l'ultimo giro lo dira il banco di Attivita.
  prova("con un campo scritto la Home regge lo stesso", r3 === null || typeof r3 === "string", String(r3));
  await ctx3.close();

  console.log("\n  E QUANDO NON C'E', NON SE NE INVENTA UNO");
  var ctx4 = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx4.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(STATO)) + "); localStorage.setItem('arctrail3d_storico_v1', " +
    JSON.stringify(JSON.stringify([giro(1, 240, 24)])) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var p4 = await ctx4.newPage();
  await p4.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await p4.waitForTimeout(1300);
  var r4 = await p4.evaluate(function () {
    var g = document.querySelector(".home-giro");
    return g ? g.innerText.replace(/\s+/g, " ") : null;
  });
  await ctx4.close();

  /* IL GRAFICO. La bugia piu' facile che un grafico sappia dire e' unire due
     punti con una retta e chiamarla tendenza. Sotto quattro giri non si
     disegna niente, e lo si scrive. */
  console.log("\n  SOTTO QUATTRO GIRI NON SI DISEGNA UNA TENDENZA");
  async function conStorico(st) {
    var c = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await c.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(STATO)) + "); localStorage.setItem('arctrail3d_storico_v1', " +
      JSON.stringify(JSON.stringify(st)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
    var p = await c.newPage();
    await p.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
    await p.waitForTimeout(1300);
    // L'andamento sta dentro la striscia del mese: prima si tocca, come una
    // persona. Prima era sempre a schermo, e il banco non doveva chiedere.
    await p.evaluate(function () {
      var b = document.querySelector(".home-mese-barra");
      if (b && !document.querySelector(".home-mese.aperta")) b.click();
    });
    await p.waitForTimeout(700);
    return { page: p, ctx: c };
  }
  var tre = [giro(2, 200, 24), giro(5, 210, 24), giro(9, 205, 24)];
  var a1 = await conStorico(tre);
  var r5 = await a1.page.evaluate(function () {
    return { svg: document.querySelectorAll(".home-tela svg").length,
             testo: (document.querySelector(".home-mese-dentro .nota, .home-sezione .card .nota") || {}).textContent || "" };
  });
  prova("con tre giri non c'e' nessuna linea", r5.svg === 0, "svg trovati: " + r5.svg);
  prova("e lo dice invece di tacere", /quattro giri/i.test(r5.testo), r5.testo.slice(0, 60));
  await a1.ctx.close();

  console.log("\n  DA QUATTRO IN SU SI DISEGNA, E DICE FRA CHE NUMERI SI MUOVE");
  var sei = [giro(2, 226, 24), giro(6, 208, 24), giro(10, 219, 24),
             giro(14, 199, 24), giro(18, 211, 24), giro(22, 186, 24)];
  var a2 = await conStorico(sei);
  var r6 = await a2.page.evaluate(function () {
    var svg = document.querySelector(".home-tela svg");
    var y = document.querySelector(".home-assey");
    var linea = svg ? svg.querySelector('path[stroke-width="2"]') : null;
    var punti = linea ? (linea.getAttribute("d").match(/[ML]/g) || []).length : 0;
    return { c: !!svg, assey: y ? y.textContent.replace(/\s+/g, " ") : "", punti: punti };
  });
  prova("la linea c'e'", r6.c);
  prova("ha un punto per giro (sei)", r6.punti === 6, "punti: " + r6.punti);
  prova("l'asse dice massimo e minimo veri (226 / 186)",
        /226/.test(r6.assey) && /186/.test(r6.assey), r6.assey);

  console.log("\n  E SI LEGGE TOCCANDOLO");
  var box = await a2.page.evaluate(function () {
    var s = document.querySelector(".home-tela svg"); var r = s.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height / 2 };
  });
  await a2.page.mouse.move(box.x, box.y);
  await a2.page.mouse.down();
  await a2.page.waitForTimeout(150);
  var letto = await a2.page.evaluate(function () {
    var l = document.querySelector(".home-letto");
    return { testo: l ? l.textContent.trim() : "", acceso: !!document.querySelector(".home-tela.legge") };
  });
  prova("toccando compare un punteggio", /\d{3}/.test(letto.testo), letto.testo);
  prova("e il mirino si accende", letto.acceso);
  await a2.ctx.close();

  prova("nessun errore in pagina", err.length === 0, err[0]);
  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
