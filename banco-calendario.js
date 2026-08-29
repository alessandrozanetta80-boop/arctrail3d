#!/usr/bin/env node
/* banco-calendario.js — il calendario risponde a «dove posso andare a tirare?»
 *
 *   node banco-calendario.js [app.html]
 *
 * PERCHE ESISTE. (28/08/2026.) Questa schermata aggrega dati di QUALCUN
 * ALTRO, e le cose che possono rompersi in silenzio non sono di disegno:
 *
 * LA PRIMA e la fonte. Se «Fonte: FIARC» sparisce da una riga, ArcTrail si
 * sta intestando la gara di una federazione. Non da nessun errore, non si
 * vede finche qualcuno non arriva su un campo sbagliato e chiede a noi.
 *
 * LA SECONDA sono i chilometri. La decisione presa e' che una distanza in km
 * qui sarebbe un numero inventato, perche' nessuna compagnia ha le
 * coordinate. Il giorno che qualcuno «migliora» la riga aggiungendo un «32
 * km» calcolato a occhio, questo banco deve dire di no.
 *
 * LA TERZA e' che la schermata non sia legata a due federazioni. Un elenco
 * che funziona solo con FIARC e FITARCO si scopre il giorno che arriva il
 * primo feed tedesco, cioe' troppo tardi.
 *
 * LA QUARTA e' il cartello dei dati finti. Finche' il calendario e' di
 * prova, chi lo guarda deve saperlo: un calendario che sembra vero e non lo
 * e' manda qualcuno in macchina.
 *
 * NON SOSTITUISCE IL TELEFONO VERO: prova che ci sia, non che si legga.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-calendario");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  \u2713 " + n); }
  else { ko++; console.log("  \u2717 " + n + (extra ? "  \u2014 " + extra : "")); }
}
function titolo(x) { console.log("\n  " + x); }

// Prova a premere la pastiglia spenta e riferisce se e' cambiato qualcosa.
// Un tasto che non si puo' usare deve non fare niente, non fare poco.
async function a2Premi(page) {
  return await page.evaluate(function () {
    var c = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (x) {
      return /La mia regione/.test(x.textContent);
    })[0];
    if (!c) return "pastiglia non trovata";
    var prima = document.querySelectorAll(".al-blocco").length;
    c.click();
    return document.querySelectorAll(".al-blocco").length !== prima;
  });
}

function stato(lang, compagnia) {
  return { screen: "menu", tab: "campi", pendingArchers: [], lang: lang || "it", country: "it",
           federation: "fiarc", theme: "light",
           profile: { nomeCognome: "Alessandro Zanetta", username: "alez",
                      compagnia: (compagnia === undefined ? "01VERB" : compagnia),
                      compagniaNome: "A.S.D. Arcieri del Verbano", classe: "SM", arco: "longbow" },
           profileSkipped: false };
}

// Ci si arriva come una persona: si apre la scheda, si preme la porta.
// Seminare `state.screen` proverebbe che la funzione esiste, non che sia
// raggiungibile — ed e' esattamente il difetto che rende una schermata morta.
async function apriCalendario(browser, lang, compagnia) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato(lang, compagnia))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  // L'app riparte SEMPRE dalla Home: seminare `state.tab` non basta. Si preme
  // il tasto della barra, poi la porta — cioe' si fa il giro che fa una persona.
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
      return x.querySelector(".tab-lbl") && /Campi|Fields|Terrains|Parcours|Alanlar|\u041f\u043e\u043b\u044f|Campos|Banor|Velden/
        .test(x.querySelector(".tab-lbl").textContent);
    })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  var arrivato = await page.evaluate(function () {
    var b = document.querySelector(".cal-porta");
    if (!b) return false;
    b.click(); return true;
  });
  await page.waitForTimeout(600);
  return { ctx: ctx, page: page, err: err, arrivato: arrivato };
}

/* Prepara una COPIA dell'app con tre gare in piu' — indirizzi velenosi,
   https buono, http buono — e la apre davvero. Il file consegnato non cambia. */
var D2 = path.join(os.tmpdir(), "arctrail-banco-calendario-storta");
async function apriStorta(browser) {
  if (!fs.existsSync(D2)) fs.mkdirSync(D2, { recursive: true });
  var src = fs.readFileSync(FILE, "utf8");
  var ancora = "var CAL_MOCK = [\n";
  if (src.split(ancora).length - 1 !== 1) throw new Error("banco-calendario: CAL_MOCK non e' piu' dove pensavo");
  var extra =
    '{ id:"prova-veleno", kind:"gara", title:"Gara con indirizzi storti", date:calFraGiorni(1), endDate:null,\n' +
    '  federation:"fiarc", roundType:"Battuta", club:"Prova", clubCode:null, country:"it",\n' +
    '  region:"Piemonte", location:"Prova (XX)", latitude:null, longitude:null,\n' +
    '  officialUrl:"javascript:alert(1)", registrationUrl:"data:text/html,<h1>x", source:"PROVA" },\n' +
    '{ id:"prova-buono", kind:"gara", title:"Gara con indirizzo buono", date:calFraGiorni(2), endDate:null,\n' +
    '  federation:"fiarc", roundType:"Battuta", club:"Prova", clubCode:null, country:"it",\n' +
    '  region:"Piemonte", location:"Prova (XX)", latitude:null, longitude:null,\n' +
    '  officialUrl:"https://www.fiarc.it/", registrationUrl:null, source:"PROVA" },\n' +
    '{ id:"prova-http", kind:"gara", title:"Gara con indirizzo http", date:calFraGiorni(2), endDate:null,\n' +
    '  federation:"fiarc", roundType:"Battuta", club:"Prova", clubCode:null, country:"it",\n' +
    '  region:"Piemonte", location:"Prova (XX)", latitude:null, longitude:null,\n' +
    '  officialUrl:"http://example.org/bando", registrationUrl:null, source:"PROVA" },\n';
  fs.writeFileSync(path.join(D2, "index.html"),
    require("./copia-dev.js").accendiDev(src.replace(ancora, ancora + extra)));
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
    if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D2, x));
  });
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato("it", "01VERB"))) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  await page.goto(url.pathToFileURL(path.join(D2, "index.html")).href);
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
      var e = x.querySelector(".tab-lbl");
      return e && /Campi/.test(e.textContent);
    })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(function () {
    var p = document.querySelector(".cal-porta"); if (p) p.click();
  });
  await page.waitForTimeout(500);
  var out = await page.evaluate(function () {
    function apri(nome) {
      var r = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) {
        var t = x.querySelector(".al-dove b");
        return t && t.textContent.indexOf(nome) >= 0;
      })[0];
      if (!r) return null;
      r.querySelector(".al-tocca").click();
      var r2 = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) {
        var t = x.querySelector(".al-dove b");
        return t && t.textContent.indexOf(nome) >= 0;
      })[0];
      return Array.prototype.map.call(r2.querySelectorAll("a"), function (x) { return x.getAttribute("href"); });
    }
    var velenosi = apri("indirizzi storti");
    var buoni = apri("indirizzo buono");
    var http = apri("indirizzo http");
    var doc = document.documentElement.innerHTML;
    return {
      trovata: velenosi !== null,
      href: velenosi || [],
      hrefBuono: (buoni || [])[0] || null,
      hrefHttp: (http || [])[0] || null,
      velenoNelDoc: /href="(javascript|data):/i.test(doc)
    };
  });
  out.ctx = ctx;
  return out;
}

function leggi() {
  var righe = Array.prototype.map.call(document.querySelectorAll(".al-blocco"), function (r) {
    return {
      titolo: (r.querySelector(".al-dove b") || {}).textContent || "",
      sotto: (r.querySelector(".al-dove span") || {}).textContent || "",
      luogo: (r.querySelector(".cal-luogo") || {}).textContent || "",
      giorno: (r.querySelector(".cal-quando b") || {}).textContent || "",
      mese: (r.querySelector(".cal-quando i") || {}).textContent || "",
      fonte: (r.querySelector(".cal-fonte") || {}).textContent || "",
      quadratoNeutro: !!r.querySelector(".al-quando.cal-quando")
    };
  });
  var chip = Array.prototype.map.call(document.querySelectorAll(".chip-filtro"), function (c) {
    return { testo: c.textContent.trim(), acceso: c.classList.contains("on"),
             spenta: c.disabled === true,
             ariaSpenta: c.getAttribute("aria-disabled") === "true",
             fuoco: (function(){ c.focus(); return document.activeElement === c; })(),
             alto: Math.round(c.getBoundingClientRect().height) };
  });
  var card = document.querySelector("#app .card");
  return {
    titolo: (document.querySelector(".section-title") || {}).textContent || "",
    avviso: (document.querySelector(".cal-avviso") || {}).textContent || "",
    mesi: Array.prototype.map.call(document.querySelectorAll(".cal-mese"), function (m) { return m.textContent; }),
    righe: righe,
    chip: chip,
    azzera: !!document.querySelector(".cal-azzera"),
    testoTutto: card ? card.innerText : "",
    vuoto: !!document.querySelector(".riga-chiusa")
  };
}

(async function () {
  var browser = await chromium.launch();

  // ── 1. C'E', E CI SI ARRIVA ──────────────────────────────────────────────
  titolo("LA PORTA E' NELLA SCHEDA CHE FA LA STESSA DOMANDA");
  var a = await apriCalendario(browser, "it");
  prova("la porta esiste dentro «Dove si tira», e si preme", a.arrivato);
  var d = await a.page.evaluate(leggi);
  prova("il calendario si apre", /Calendario/.test(d.titolo), d.titolo);
  prova("nessun errore in pagina", a.err.length === 0, a.err.join(" | "));

  // ── 2. LE RIGHE ─────────────────────────────────────────────────────────
  titolo("LA RIGA DICE QUANDO, COSA, DI CHI");
  prova("ci sono delle gare in elenco", d.righe.length >= 5, d.righe.length + " righe");
  prova("ogni riga ha il giorno nel quadrato",
    d.righe.length > 0 && d.righe.every(function (r) { return /^\d+$/.test(r.giorno.trim()); }),
    JSON.stringify(d.righe.map(function (r) { return r.giorno; })));
  prova("ogni riga ha il mese nel quadrato",
    d.righe.length > 0 && d.righe.every(function (r) { return r.mese.trim().length > 0; }));
  prova("il nome della gara e' la riga grossa",
    d.righe.length > 0 && d.righe.every(function (r) { return r.titolo.trim().length > 2; }));
  prova("federazione e tipo stanno nella riga secondaria",
    d.righe.length > 0 && d.righe.every(function (r) { return r.sotto.indexOf("\u00b7") > 0; }),
    JSON.stringify(d.righe.map(function (r) { return r.sotto; }).slice(0, 3)));
  prova("il quadrato della data e' quello neutro, non l'arancio degli allenamenti",
    d.righe.length > 0 && d.righe.every(function (r) { return r.quadratoNeutro; }));
  prova("le gare sono raggruppate per mese", d.mesi.length >= 1, JSON.stringify(d.mesi));

  // ── 3. LA FONTE ─────────────────────────────────────────────────────────
  // E' l'invariante di questa schermata: ArcTrail aggrega, non organizza.
  titolo("LA FONTE STA ATTACCATA A OGNI GARA, NON IN FONDO ALLA PAGINA");
  var fonti = await a.page.evaluate(function () {
    Array.prototype.forEach.call(document.querySelectorAll(".al-tocca"), function (b) { b.click(); });
    return Array.prototype.map.call(document.querySelectorAll(".al-blocco"), function (r) {
      var f = r.querySelector(".cal-fonte");
      return f ? f.textContent : null;
    });
  });
  prova("ogni gara aperta dichiara da chi viene il dato",
    fonti.length > 0 && fonti.every(function (f) { return f && /Fonte:/.test(f); }),
    JSON.stringify(fonti.slice(0, 3)));
  prova("le fonti non sono tutte la stessa: e' un aggregatore, non un canale",
    new Set(fonti).size >= 3, JSON.stringify(Array.from(new Set(fonti))));
  var d2 = await a.page.evaluate(leggi);
  prova("la pagina dice che ArcTrail non organizza le gare",
    /non organizza le gare/.test(d2.testoTutto));

  // ── 4. IL DETTAGLIO, E NIENTE CHILOMETRI INVENTATI ──────────────────────
  // Si apre UNA riga sola. Cliccarle tutte in fila lascia aperta l'ultima —
  // `calAperto` tiene un id solo — e la prima volta questo banco ha cercato il
  // luogo della prima riga dentro il dettaglio dell'ultima. La prova era
  // sbagliata, non il codice: sta scritto qui perche' non venga rifatta.
  titolo("IL DETTAGLIO DICE DOVE, E NON DICE QUANTI CHILOMETRI");
  var det = await a.page.evaluate(function () {
    var r = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) {
      var b = x.querySelector(".al-dove b");
      return b && /Campionato Regionale 3D/.test(b.textContent);
    })[0];
    if (!r) return null;
    r.querySelector(".al-tocca").click();
    return null;
  });
  await a.page.waitForTimeout(300);
  var d2b = await a.page.evaluate(function () {
    var ap = document.querySelector(".al-blocco.aperta");
    return {
      visibile: ap ? ap.innerText : "",
      etichette: ap ? Array.prototype.map.call(ap.querySelectorAll(".cal-det dt"), function (x) { return x.textContent; }) : []
    };
  });
  prova("il dettaglio si apre sulla riga toccata", d2b.visibile.length > 0);
  prova("dice quando, dove, chi organizza e che tipo di gara e'",
    ["Quando", "Dove", "Organizza", "Tipo"].every(function (x) { return d2b.etichette.indexOf(x) >= 0; }),
    JSON.stringify(d2b.etichette));
  prova("al posto della distanza c'e' il luogo vero", /Vignone/.test(d2b.visibile), d2b.visibile);
  prova("e la regione, che e' quello che l'app sa davvero", /Piemonte/.test(d2b.visibile));
  prova("nessuna riga dichiara una distanza in km",
    !/\b\d+[\s\u00a0]?km\b/i.test(d2.testoTutto),
    (d2.testoTutto.match(/\b\d+[\s\u00a0]?km\b/i) || [""])[0]);

  // ── 4-bis. CHE COSA PUO' DIVENTARE UN LINK ──────────────────────────────
  // Oggi gli indirizzi vengono dal file; domani da un feed federale, cioe' da
  // fuori. Un `href` costruito con una stringa che arriva da fuori e' il posto
  // classico da cui entra un `javascript:`.
  //
  // LA GARA STORTA SI METTE NEL FILE, NON NELLA PAGINA. Tutta l'app vive
  // dentro `DOMContentLoaded`: `CAL_MOCK` e `calUrlSicuro` non sono
  // raggiungibili da fuori, ed e' giusto cosi'. Quindi si prepara una COPIA
  // dell'app con una gara in piu' e la si apre davvero: si prova la strada
  // vera, dal dato al DOM, invece di chiamare la funzione a mano. I dati
  // consegnati non vengono toccati.
  titolo("SOLO HTTP E HTTPS DIVENTANO UN LINK");
  var storta = await apriStorta(browser);
  prova("la gara con gli indirizzi storti compare in elenco", storta.trovata);
  prova("javascript: e data: non diventano tasti: la riga non ne ha nessuno",
    storta.href.length === 0, JSON.stringify(storta.href));
  prova("e in tutta la pagina non c'e' un href che comincia con javascript: o data:",
    !storta.velenoNelDoc);
  prova("un https: valido resta un tasto, e porta dove diceva",
    /^https:\/\/www\.fiarc\.it\//.test(storta.hrefBuono || ""), String(storta.hrefBuono));
  prova("e un http: valido passa lo stesso",
    /^http:\/\//.test(storta.hrefHttp || ""), String(storta.hrefHttp));
  await storta.ctx.close();

  // ── 5. IL CARTELLO DEI DATI FINTI ───────────────────────────────────────
  titolo("FINCHE' I DATI SONO DI PROVA, LA PAGINA LO DICE");
  prova("il cartello c'e'", d.avviso.trim().length > 10, d.avviso);
  prova("e dice che il vero arrivera' dalle federazioni", /federazioni/i.test(d.avviso));

  // ── 6. I FILTRI ─────────────────────────────────────────────────────────
  titolo("LE PASTIGLIE NASCONO DAI DATI, NON DA UN ELENCO SCRITTO A MANO");
  prova("ci sono le pastiglie", d.chip.length >= 6, d.chip.length + " pastiglie");
  prova("nessuna pastiglia e' accesa all'apertura",
    d.chip.length > 0 && d.chip.every(function (c) { return !c.acceso; }));
  prova("«Azzera» non c'e' finche' non si filtra niente", !d.azzera);
  prova("si prendono col pollice: alte almeno 44px",
    d.chip.length > 0 && d.chip.every(function (c) { return c.alto >= 44; }),
    JSON.stringify(d.chip.map(function (c) { return c.alto; })));
  var sigle = d.chip.map(function (c) { return c.testo; });
  // IL NOME NON DEVE PIU' PROMETTERE UNA DISTANZA. Il filtro prende la regione
  // della compagnia: finche' si chiamava «Vicino a me» prometteva un calcolo
  // che non c'e', ed e' la stessa specie di difetto dei chilometri inventati.
  prova("il filtro non promette piu' una vicinanza che non calcola",
    !/Vicino a me|Near me|Pr\u00e8s de moi|In meiner N\u00e4he|Yak\u0131n\u0131mda|\u0420\u044f\u0434\u043e\u043c \u0441\u043e \u043c\u043d\u043e\u0439|Cerca de m\u00ed|N\u00e4ra mig|Bij mij in de buurt/.test(d.testoTutto),
    (d.testoTutto.match(/Vicino a me|Near me/) || [""])[0]);
  prova("e si chiama con quello che fa davvero",
    d.chip.some(function (c) { return /La mia regione/.test(c.testo); }),
    JSON.stringify(d.chip.map(function (c) { return c.testo; }).slice(0, 4)));

  // ── LA TERZA RIGA: DOVE, SENZA APRIRE ───────────────────────────────────
  // Un elenco si legge per confrontare, e per confrontare bisogna vedere:
  // aprire dieci righe per sapere quale gara e' a mezz'ora non e' confrontare.
  titolo("LA RIGA CHIUSA DICE ANCHE DOVE");
  prova("ogni gara mostra la localita' senza che si apra niente",
    d.righe.length > 0 && d.righe.every(function (r) { return r.luogo.trim().length > 2; }),
    JSON.stringify(d.righe.map(function (r) { return r.luogo; })));
  prova("la localita' porta la provincia quando c'e'",
    d.righe.some(function (r) { return /\(\w{2}\)/.test(r.luogo); }),
    JSON.stringify(d.righe.map(function (r) { return r.luogo; }).slice(0, 3)));
  prova("e la regione quando la provincia non c'e'",
    d.righe.some(function (r) { return /\u00b7/.test(r.luogo); }),
    JSON.stringify(d.righe.map(function (r) { return r.luogo; })));
  var gerarchia = await a.page.evaluate(function () {
    var r = document.querySelector(".al-blocco");
    var nome = r.querySelector(".al-dove b");
    var luo = r.querySelector(".cal-luogo");
    var sec = r.querySelector(".al-dove span:not(.cal-luogo)");
    var g = function (x) { return parseFloat(getComputedStyle(x).fontSize); };
    return { nome: g(nome), sec: g(sec), luogo: g(luo),
             colore: getComputedStyle(luo).color,
             coloreSec: getComputedStyle(sec).color };
  });
  prova("la localita' non compete col nome della gara: e' piu' piccola",
    gerarchia.luogo < gerarchia.sec && gerarchia.sec < gerarchia.nome,
    JSON.stringify(gerarchia));
  prova("ed e' terziaria per misura, non con un colore inventato",
    gerarchia.colore === gerarchia.coloreSec, gerarchia.colore + " vs " + gerarchia.coloreSec);

  prova("c'e' una pastiglia per ogni federazione presente nei dati",
    ["FIARC", "FITARCO", "DSB", "SFSF", "NFAS", "FAAS"].every(function (x) { return sigle.indexOf(x) >= 0; }),
    JSON.stringify(sigle));
  prova("l'elenco NON e' legato a FIARC e FITARCO: ci sono federazioni estere",
    sigle.indexOf("DSB") >= 0 && sigle.indexOf("SFSF") >= 0);

  titolo("UN FILTRO RESTRINGE, E SI PUO' TOGLIERE");
  var dopo = await a.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (c) {
      return c.textContent.trim() === "DSB";
    })[0];
    if (b) b.click();
    return null;
  });
  await a.page.waitForTimeout(300);
  var d3 = await a.page.evaluate(leggi);
  prova("premendo DSB restano solo le gare DSB",
    d3.righe.length > 0 && d3.righe.every(function (r) { return /DSB/.test(r.sotto); }),
    JSON.stringify(d3.righe.map(function (r) { return r.sotto; })));
  prova("la pastiglia premuta si vede accesa",
    d3.chip.some(function (c) { return c.testo === "DSB" && c.acceso; }));
  prova("adesso «Azzera» c'e'", d3.azzera);
  await a.page.evaluate(function () {
    var z = document.querySelector(".cal-azzera"); if (z) z.click();
  });
  await a.page.waitForTimeout(300);
  var d4 = await a.page.evaluate(leggi);
  prova("«Azzera» rimette tutte le gare", d4.righe.length === d.righe.length,
    d4.righe.length + " vs " + d.righe.length);

  titolo("UN FILTRO CHE NON TROVA NIENTE LO DICE, INVECE DI RESTARE VUOTO");
  await a.page.evaluate(function () {
    Array.prototype.forEach.call(document.querySelectorAll(".chip-filtro"), function (c) {
      if (c.textContent.trim() === "DSB" || c.textContent.trim() === "Battuta") c.click();
    });
  });
  await a.page.waitForTimeout(300);
  var d5 = await a.page.evaluate(leggi);
  prova("nessuna gara: compare lo stato vuoto", d5.righe.length === 0 && d5.vuoto);
  prova("e ha un titolo, non solo una riga grigia",
    /Nessuna gara con questi filtri/.test(d5.testoTutto));
  await a.ctx.close();

  // ── 7. «VICINO A ME» SENZA REGIONE SI SPIEGA ────────────────────────────
  titolo("UNA PASTIGLIA SPENTA DICE PERCHE'");
  var b = await apriCalendario(browser, "it", null);
  var e1 = await b.page.evaluate(leggi);
  prova("senza compagnia, «La mia regione» e' spenta col vero `disabled`",
    e1.chip.some(function (c) { return /La mia regione/.test(c.testo) && c.spenta; }),
    JSON.stringify(e1.chip.map(function (c) { return [c.testo, c.spenta]; })));
  // `aria-disabled` DICE che il tasto non si usa e non lo impedisce: col Tab
  // il fuoco ci entrava lo stesso. Due comportamenti diversi per due modi di
  // usare la stessa pastiglia.
  prova("non e' piu' il solo `aria-disabled`, che dice e non impedisce",
    e1.chip.every(function (c) { return !c.ariaSpenta; }));
  var fuoco = await b.page.evaluate(function () {
    var c = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (x) {
      return /La mia regione/.test(x.textContent);
    })[0];
    if (!c) return "pastiglia non trovata";
    c.focus();
    return document.activeElement === c;
  });
  prova("col Tab il fuoco non ci entra", fuoco === false, String(fuoco));
  var premuta = await a2Premi(b.page);
  prova("e premendola non succede niente", premuta === false, String(premuta));
  prova("e la pagina spiega cosa manca", /regione della tua compagnia/.test(e1.testoTutto));
  await b.ctx.close();

  titolo("CON UNA COMPAGNIA, «LA MIA REGIONE» FILTRA PER REGIONE");
  var c = await apriCalendario(browser, "it", "01VERB");
  var e2 = await c.page.evaluate(leggi);
  prova("la pastiglia e' viva",
    e2.chip.some(function (x) { return /La mia regione/.test(x.testo) && !x.spenta; }));
  await c.page.evaluate(function () {
    var v = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (x) {
      return /La mia regione/.test(x.textContent);
    })[0];
    if (v) v.click();
  });
  await c.page.waitForTimeout(300);
  var e3 = await c.page.evaluate(leggi);
  prova("restano solo le gare della propria regione, e ce n'e' almeno una",
    e3.righe.length > 0 && e3.righe.length < e2.righe.length,
    e3.righe.length + " su " + e2.righe.length);
  prova("nessuna gara estera e' rimasta dentro", !/Freiburg|Uppsala|Otley/.test(e3.testoTutto));
  await c.ctx.close();

  // ── 8. LE NOVE LINGUE ───────────────────────────────────────────────────
  titolo("NOVE LINGUE, E NESSUNA CHIAVE NUDA A SCHERMO");
  var LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
  for (var i = 0; i < LINGUE.length; i++) {
    var g = await apriCalendario(browser, LINGUE[i]);
    var t = await g.page.evaluate(leggi);
    var nuda = /\bcal_[a-z_]+\b/.test(t.testoTutto);
    prova("[" + LINGUE[i] + "] la schermata e' tradotta e non mostra chiavi",
      g.arrivato && t.righe.length > 0 && !nuda,
      nuda ? (t.testoTutto.match(/\bcal_[a-z_]+\b/) || [""])[0] : "non si apre");
    await g.ctx.close();
  }

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
