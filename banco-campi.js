#!/usr/bin/env node
/* banco-campi.js — la sezione Campi trova i campi DENTRO l'app.
 *
 *   node banco-campi.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD Fase 3.) Fino a ieri «Campi» era un tasto
 * che apriva Google Maps: non c era niente da provare, e infatti non c era
 * nessun banco. Adesso c e una ricerca su seicentosessantatre campi, e le
 * cose che possono rompersi in silenzio sono tre.
 *
 * LA PRIMA e il conto. Un elenco che mostra le prime sessanta righe e si
 * ferma li senza dirlo si legge come «non ce n e altri»: e una bugia che si
 * racconta da sola, e non da nessun errore.
 *
 * LA SECONDA e la lingua. «1 campi» compare solo quando ne resta uno, cioe
 * proprio quando la ricerca ha funzionato — il momento peggiore per sembrare
 * scritti male.
 *
 * LA TERZA e l ordine. Maps deve stare DOPO l elenco: e un ripiego per chi e
 * fuori dall elenco, e un ripiego messo per primo e una scorciatoia. Il
 * criterio del PRD dice esattamente questo: *discovery inside ArcTrail,
 * external maps for navigation*. Se un giorno qualcuno rimette il tasto in
 * cima, il file continua a funzionare e il prodotto torna quello di ieri.
 *
 * NON SOSTITUISCE IL TELEFONO VERO: prova che si trovi, non che si legga.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-campi");
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

function stato(lang) {
  return { screen: "menu", tab: "campi", pendingArchers: [], lang: lang || "it", country: "it",
           federation: "fiarc", theme: "light",
           profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
                      compagniaNome: "A.S.D. Arcieri del Verbano", classe: "SM", arco: "longbow" },
           profileSkipped: false };
}

// L'app riparte SEMPRE dalla home: a Campi ci si arriva cliccando, come una
// persona. Seminare state.tab non basta, ed e' l'errore che il primo
// fotografo aveva fatto — nove scatti della stessa schermata.
async function apriCampi(browser, lang) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(lang))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
      return x.querySelector(".tab-lbl") && /Campi|Fields|Terrains|Parcours|Alanlar|Поля|Campos|Banor|Velden/
        .test(x.querySelector(".tab-lbl").textContent);
    })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  return { ctx: ctx, page: page, err: err };
}

/* DAL 26/08 LA REGIONE LA SCEGLIE CHI GUARDA, NON L'APP. (Alessandro: «mi si
   apre direttamente in Piemonte, che e' una merda».) Il banco quindi fa il
   gesto che fa una persona: apre la tendina e sceglie. Le prove sulla
   APERTURA controllano il contrario di prima — nessun elenco, l'invito
   scritto — perche' il difetto di ieri era proprio l'elenco gia' pieno. */
async function scegliRegione(page, regione) {
  await page.selectOption("#campiSelRegione", regione);
  await page.waitForTimeout(500);
}

function leggi() {
  var righe = Array.prototype.map.call(document.querySelectorAll(".comp-riga"), function (r) {
    return { luogo: (r.querySelector(".al-dove b") || {}).textContent || "",
             chi: (r.querySelector(".al-dove span") || {}).textContent || "" };
  });
  var scheda = document.querySelector(".campo-scheda");
  var maps = null;
  var elenco = document.querySelector(".campi-testa");
  var bottoni = Array.prototype.map.call(document.querySelectorAll("button"), function (b) { return b.textContent; });
  var note = Array.prototype.map.call(document.querySelectorAll(".nota"), function (n) { return n.textContent; });
  var rigaUno = document.querySelector(".comp-riga.on");
  return {
    testa: elenco ? elenco.textContent : "",
    righe: righe,
    quante: righe.length,
    scheda: scheda ? scheda.innerText.replace(/\s+/g, " ") : null,
    // la scheda si apre SOTTO la riga toccata: il nodo che segue la riga accesa
    schedaSottoRiga: !!(rigaUno && rigaUno.nextElementSibling &&
                        rigaUno.nextElementSibling.className === "campo-scheda"),
    note: note,
    bottoni: bottoni,
    cerca: !!document.getElementById("campiQ"),
    tendine: { stato: !!document.getElementById("campiSelStato"),
               regione: !!document.getElementById("campiSelRegione"),
               provincia: !!document.getElementById("campiSelProvincia"),
               statoScelto: (document.getElementById("campiSelStato")||{}).value || "",
               regioneScelta: (document.getElementById("campiSelRegione")||{}).value || "" }
  };
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  SI APRE SULLE TENDINE, E NESSUNO HA GIA' SCELTO PER TE");
  var a = await apriCampi(browser, "it");
  var v = await a.page.evaluate(leggi);
  prova("c'e' un campo di ricerca", v.cerca);
  prova("e le tre tendine: nazione, regione, provincia dopo la regione",
        v.tendine.stato && v.tendine.regione && !v.tendine.provincia);
  prova("la nazione parte dalla propria", v.tendine.statoScelto === "it", v.tendine.statoScelto);
  prova("la regione NON e' scelta dall'app", v.tendine.regioneScelta === "", v.tendine.regioneScelta);
  prova("niente elenco prima della scelta", v.quante === 0, v.quante + " righe");
  prova("e l'invito e' scritto, non sottinteso",
        v.note.some(function (n) { return n.length > 10 && n.indexOf("campi_") < 0; }), v.note.join(" | "));

  await scegliRegione(a.page, "Piemonte");
  var v2 = await a.page.evaluate(leggi);
  prova("scelto il Piemonte, l'elenco si riempie", v2.quante > 0, v2.quante + " righe");
  prova("la provincia adesso si puo' scegliere", v2.tendine.provincia);
  prova("la testa dice dove sei", /Piemonte/.test(v2.testa), v2.testa);
  prova("ogni riga dice prima DOVE si tira", v2.righe.every(function (r) { return r.luogo.length > 1; }));
  prova("e sotto CHI lo tiene", v2.righe.every(function (r) { return r.chi.length > 1; }));

  await a.page.selectOption("#campiSelProvincia", "BI");
  await a.page.waitForTimeout(500);
  var v3 = await a.page.evaluate(leggi);
  prova("scelta la provincia, l'elenco si restringe", v3.quante > 0 && v3.quante < v2.quante,
        v2.quante + " -> " + v3.quante);

  console.log("\n  LA RICERCA TROVA, E CONTA GIUSTO");
  await a.page.fill("#campiQ", "cerrione");
  await a.page.waitForTimeout(300);
  var c1 = await a.page.evaluate(leggi);
  prova("«cerrione» trova il suo campo", c1.quante === 1 && /Cerrione/.test(c1.righe[0].luogo),
        c1.quante + " righe");
  prova("e dice «1 campo», non «1 campi»", /1 campo\b/.test(c1.testa) && !/1 campi/.test(c1.testa), c1.testa);

  await a.page.fill("#campiQ", "BI");
  await a.page.waitForTimeout(300);
  var c2 = await a.page.evaluate(leggi);
  prova("si cerca anche per provincia", c2.quante > 0, c2.quante + " righe");

  await a.page.fill("#campiQ", "qwertyuiop");
  await a.page.waitForTimeout(300);
  var c3 = await a.page.evaluate(leggi);
  prova("cercando una cosa che non c'e': zero righe", c3.quante === 0);
  prova("e lo dice ripetendo cosa si cercava",
        c3.note.some(function (n) { return n.indexOf("qwertyuiop") >= 0; }), c3.note.join(" | "));

  console.log("\n  IL TETTO SI DICHIARA");
  await a.page.fill("#campiQ", "a");
  await a.page.waitForTimeout(400);
  var c4 = await a.page.evaluate(leggi);
  prova("un elenco lungo si ferma a sessanta", c4.quante === 60, c4.quante + " righe");
  prova("e dice quanti non ha mostrato",
        c4.note.some(function (n) { return /\d+/.test(n) && n.length > 5; }), c4.note.join(" | "));
  await a.ctx.close();

  console.log("\n  LA SCHEDA SI APRE SOTTO LA RIGA TOCCATA");
  var b = await apriCampi(browser, "it");
  await b.page.fill("#campiQ", "cerrione");
  await b.page.waitForTimeout(300);
  await b.page.click(".comp-riga");
  await b.page.waitForTimeout(300);
  var s = await b.page.evaluate(leggi);
  prova("la scheda c'e'", !!s.scheda);
  prova("ed e' attaccata alla riga, non in fondo alla pagina", s.schedaSottoRiga);
  prova("porta i contatti veri della compagnia", /347 9533670/.test(s.scheda || ""), (s.scheda || "").slice(0, 80));
  prova("offre di portarti li'", (s.bottoni || []).some(function (x) { return /Portami/.test(x); }));
  prova("e la scheda della compagnia", (s.bottoni || []).some(function (x) { return /Scheda della compagnia/.test(x); }));
  await b.page.click(".comp-riga.on");
  await b.page.waitForTimeout(300);
  var s2 = await b.page.evaluate(leggi);
  prova("toccandola di nuovo si richiude", !s2.scheda);
  await b.ctx.close();

  console.log("\n  MAPS VIENE DOPO, PERCHE' E' UN RIPIEGO");
  var m = await apriCampi(browser, "it");
  var ordine = await m.page.evaluate(function () {
    var elenco = document.querySelector(".campi-testa");
    var maps = Array.prototype.filter.call(document.querySelectorAll("button"), function (b) {
      return /Maps|Cerca campi|Search fields/.test(b.textContent) ||
             (b.previousElementSibling && b.previousElementSibling.className === "campi-nota");
    })[0];
    if (!elenco || !maps) return { c: false };
    return { c: true, elencoY: elenco.getBoundingClientRect().top, mapsY: maps.getBoundingClientRect().top };
  });
  prova("il tasto di Maps c'e' ancora", ordine.c);
  prova("ma sta sotto l'elenco, non sopra", ordine.c && ordine.mapsY > ordine.elencoY,
        ordine.c ? "elenco " + Math.round(ordine.elencoY) + " · maps " + Math.round(ordine.mapsY) : "");
  prova("nessun errore in pagina", m.err.length === 0, m.err[0]);
  await m.ctx.close();

  console.log("\n  E IN UN'ALTRA LINGUA NON COMPAIONO I NOMI DELLE CHIAVI");
  var n = await apriCampi(browser, "nl");
  await scegliRegione(n.page, "Piemonte");
  var vn = await n.page.evaluate(leggi);
  prova("l'elenco c'e' anche in nederlandese", vn.quante > 0, vn.quante + " righe");
  prova("e la testa e' tradotta, non «campi_qui»",
        vn.testa.indexOf("campi_") < 0 && vn.testa.length > 3, vn.testa);
  await n.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
