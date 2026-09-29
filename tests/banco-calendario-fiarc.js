#!/usr/bin/env node
/* banco-calendario-fiarc.js — il calendario FIARC dice cose vere, e solo quelle.
 *
 *   node tests/banco-calendario-fiarc.js [app.html]
 *   OGGI=2026-10-12T10:00:00 node tests/banco-calendario-fiarc.js   # altro giorno
 *
 * PERCHE' ESISTE. (28/09/2026.) Il calendario non e' piu' di prova: dentro
 * `CAL_GARE` ci sono gare FIARC 2026 vere, ricopiate a mano dalle immagini
 * delle pagine ufficiali. Un dato ricopiato a mano si rompe in silenzio, e
 * si rompe in quattro modi che questo banco guarda uno per uno:
 *
 *   1. una gara verificata sparisce o cambia data, codice o tipo;
 *   2. torna una gara inventata (i vecchi `mock-*`) o una federazione che
 *      una fonte vera non ce l'ha;
 *   3. una riga del 2025 si presenta come 2026 — tre pagine FIARC hanno
 *      ancora «2025» nell'indirizzo, ed e' facilissimo sbagliare pagina;
 *   4. il luogo del CAMPO della compagnia diventa il luogo della GARA. Le
 *      immagini FIARC dicono data, codice e tipo: il posto no.
 *
 * `banco-calendario.js` guarda la schermata; questo guarda il DATO, poi apre
 * l'app per vedere che il dato arrivi intero fino al dito.
 *
 * LE GARE VERIFICATE stanno scritte QUI, a mano, e non lette dall'app: se
 * stessero solo nell'app, un errore nell'app sarebbe anche nel banco.
 */
"use strict";
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var vm = require("vm");

var FILE = process.argv[2] || "app.html";
var OGGI = process.env.OGGI || "2026-09-28T10:00:00";

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function titolo(x) { console.log("\n  " + x); }

// ── LE GARE, SCRITTE A MANO DALLE IMMAGINI UFFICIALI ──────────────────────
// Le undici del compito (verificate da ChatGPT il 28/09 e ricontrollate da
// Claude lo stesso giorno sulle immagini).
var VERIFICATE = [
  ["2026-10-04", "01DAHU", "Percorso", "fiarc-2026-piemonte-liguria"],
  ["2026-10-04", "09HILL", "Percorso", "fiarc-2026-toscana"],
  ["2026-10-11", "04GAOP", "Tracciato", "fiarc-2026-lombardia"],
  ["2026-10-18", "04POTA", "Round 3D", "fiarc-2026-lombardia"],
  ["2026-10-18", "09COVO", "Battuta", "fiarc-2026-toscana"],
  ["2026-10-25", "03FINA", "Battuta", "fiarc-2026-piemonte-liguria"],
  ["2026-10-25", "12RING", "Battuta", "fiarc-2026-lazio"],
  ["2026-11-08", "09ROSE", "Percorso", "fiarc-2026-toscana"],
  ["2026-11-15", "17LAGO", "Tracciato", "fiarc-2026-campania-puglia-calabria-basilicata"],
  ["2026-11-22", "09TEAM", "Tracciato", "fiarc-2026-toscana"],
  ["2026-11-22", "14ELFI", "Round 3D", "fiarc-2026-campania-puglia-calabria-basilicata"]
];
// Le sei in piu': Emilia Romagna e RSM, Triveneto. Il compito le teneva fuori
// perche' le pagine mostravano ancora il 2025; il 28/09 le stesse pagine
// mostrano solo immagini «CALENDARIO GARE 2026» caricate il 30/01/2026
// (prova nel report docs/FIARC-CHIUSURA-2026-09-28.md).
var AGGIUNTE = [
  ["2026-10-10", "06MARE", "Tracciato", "fiarc-2026-triveneto"],
  ["2026-10-11", "06MARE", "Percorso", "fiarc-2026-triveneto"],
  ["2026-10-18", "08RAMI", "Tracciato", "fiarc-2026-emilia-romagna-rsm"],
  ["2026-10-25", "07HAWK", "Round 3D", "fiarc-2026-triveneto"],
  ["2026-10-25", "08CALE", "Battuta", "fiarc-2026-emilia-romagna-rsm"],
  ["2026-11-08", "08LAUR", "Percorso", "fiarc-2026-emilia-romagna-rsm"]
];
var TIPI = ["Round 3D", "Percorso", "Tracciato", "Battuta"];
function slug(t) { return t.toLowerCase().replace(/\s+/g, "-"); }
function idDi(r) { return "fiarc-" + r[0] + "-" + r[1] + "-" + slug(r[2]); }

// ── IL DATO, LETTO DAL FILE CONSEGNATO ────────────────────────────────────
var SRC = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
var da = SRC.indexOf("function calFraGiorni(n){");
var a = SRC.indexOf("/* CHE COSA PUO' DIVENTARE UN LINK.");
var daUrl = SRC.indexOf("function calUrlSicuro(u){");
var aUrl = SRC.indexOf("/* La sigla della federazione sta gia' scritta in un posto solo. */");
if (da < 0 || a < 0 || a < da || daUrl < 0 || aUrl < daUrl) {
  console.log("  ✗ il blocco del calendario non e' piu' dove pensavo"); process.exit(1);
}
var BLOCCO = SRC.slice(da, a) + "\n" + SRC.slice(daUrl, aUrl);

// Un orologio fermo, per chiedere a `calEventi()` cosa mostrerebbe un giorno.
function carica(quando) {
  var fermo = new Date(quando).getTime();
  var D = function (x) {
    if (!(this instanceof D)) return new Date(fermo).toString();
    return arguments.length ? new (Function.prototype.bind.apply(Date, [null].concat([].slice.call(arguments))))() : new Date(fermo);
  };
  D.now = function () { return fermo; };
  D.prototype = Date.prototype;
  var ctx = { Date: D, URL: URL, String: String, Object: Object, Array: Array };
  vm.createContext(ctx);
  vm.runInContext(BLOCCO + "\n;this.__ = { CAL_GARE: CAL_GARE, CAL_FONTI: CAL_FONTI, CAL_AGGIORNATO: CAL_AGGIORNATO," +
    " calEventi: calEventi, calGaraValida: calGaraValida, calUrlSicuro: calUrlSicuro, calFraGiorni: calFraGiorni };", ctx);
  return ctx.__;
}
var C = carica(OGGI);
var GARE = C.CAL_GARE, FONTI = C.CAL_FONTI;

var COMP = (function () {
  var s = fs.readFileSync("compagnie-data.js", "utf8");
  var c = { window: {} };
  vm.createContext(c);
  vm.runInContext(s + "\n;this.__C = (typeof COMPAGNIE !== 'undefined') ? COMPAGNIE : window.COMPAGNIE;", c);
  return c.__C;
})();

// Il codice com'e' STAMPATO sul calendario: e' quello che le liste qui sopra
// ricopiano. Di solito coincide con `clubCode`; per 08LAUR no (vedi sotto).
function codiceFonte(e) { return e.sourceClubCode || e.clubCode; }

function trova(r) {
  return GARE.filter(function (e) {
    return e.date === r[0] && codiceFonte(e) === r[1] && e.roundType === r[2];
  });
}

(async function () {
  // ── 1. LE UNDICI VERIFICATE ─────────────────────────────────────────────
  titolo("LE 11 GARE VERIFICATE CI SONO, CON DATA, CODICE E TIPO ESATTI");
  VERIFICATE.forEach(function (r) {
    var t = trova(r);
    prova(r[0] + " " + r[1] + " " + r[2],
      t.length === 1 && t[0].id === idDi(r) && t[0].sourceRef === r[3],
      JSON.stringify(t.map(function (e) { return [e.id, e.sourceRef]; })));
  });
  titolo("LE 6 DI EMILIA ROMAGNA E TRIVENETO, VERIFICATE IL 28/09 SULLE IMMAGINI 2026");
  AGGIUNTE.forEach(function (r) {
    var t = trova(r);
    prova(r[0] + " " + r[1] + " " + r[2],
      t.length === 1 && t[0].id === idDi(r) && t[0].sourceRef === r[3],
      JSON.stringify(t.map(function (e) { return [e.id, e.sourceRef]; })));
  });
  prova("e non c'e' nient'altro: " + (VERIFICATE.length + AGGIUNTE.length) + " gare in tutto",
    GARE.length === VERIFICATE.length + AGGIUNTE.length, GARE.length + " in CAL_GARE");

  // ── 2. NIENTE DI INVENTATO ──────────────────────────────────────────────
  titolo("NESSUNA GARA INVENTATA E NESSUNA FEDERAZIONE SENZA FONTE");
  prova("i vecchi dati di prova non ci sono piu' (niente `var CAL_MOCK`, niente id `mock-`)",
    !/var CAL_MOCK\b/.test(SRC) && !/id:"mock-/.test(SRC));
  prova("nessuna data calcolata da oggi dentro i dati (`calFraGiorni(` fra le gare)",
    !/calFraGiorni\(/.test(SRC.slice(SRC.indexOf("var CAL_GARE = ["), SRC.indexOf("function calGaraValida("))));
  prova("gli id sono unici", new Set(GARE.map(function (e) { return e.id; })).size === GARE.length);
  prova("ogni id e' stabile: fiarc-AAAA-MM-GG-CODICE-tipo",
    GARE.every(function (e) { return e.id === idDi([e.date, codiceFonte(e), e.roundType]); }),
    GARE.filter(function (e) { return e.id !== idDi([e.date, codiceFonte(e), e.roundType]); }).map(function (e) { return e.id; }).join(", "));
  prova("tutte FIARC: federation \"fiarc\", source \"FIARC\", country \"it\", kind \"gara\"",
    GARE.every(function (e) { return e.federation === "fiarc" && e.source === "FIARC" && e.country === "it" && e.kind === "gara"; }));
  prova("il tipo e' uno dei quattro formati FIARC, scritto esatto",
    GARE.every(function (e) { return TIPI.indexOf(e.roundType) >= 0; }),
    GARE.map(function (e) { return e.roundType; }).filter(function (x) { return TIPI.indexOf(x) < 0; }).join(", "));
  prova("nessun link alle iscrizioni inventato (registrationUrl null)",
    GARE.every(function (e) { return e.registrationUrl === null; }));

  // ── 3. IL 2025 NON SI TRAVESTE DA 2026 ──────────────────────────────────
  titolo("NESSUNA GARA DEL 2025 SPACCIATA PER 2026");
  prova("ogni gara e' del 2026", GARE.every(function (e) { return /^2026-/.test(e.date); }));
  prova("ogni gara punta a una pagina ufficiale del 2026",
    GARE.every(function (e) { var f = FONTI[e.sourceRef]; return f && f.anno === 2026 && f.federation === "fiarc"; }));
  prova("ogni pagina ha immagini caricate nel 2026 (/uploads/2026/), non del 2025",
    Object.keys(FONTI).every(function (k) {
      var f = FONTI[k];
      return f.immagini.length > 0 && f.immagini.every(function (u) { return /\/wp-content\/uploads\/2026\//.test(u); });
    }));
  prova("nessuna zona senza pagina 2026 affidabile: la Sardegna non c'e'",
    !Object.keys(FONTI).some(function (k) { return /sardegna/i.test(k + FONTI[k].area); }) &&
    !GARE.some(function (e) { return /sardegna/i.test(String(e.area) + String(e.region)); }));
  var finta2025 = { id: "x", date: "2025-10-19", federation: "fiarc", sourceRef: "fiarc-2026-toscana" };
  var finta2027 = { id: "y", date: "2027-01-10", federation: "fiarc", sourceRef: "fiarc-2026-toscana" };
  var senzaFonte = { id: "z", date: "2026-12-06", federation: "fiarc" };
  var altraFed = { id: "w", date: "2026-12-06", federation: "fitarco", sourceRef: "fiarc-2026-toscana" };
  prova("una riga 2025 su una pagina 2026 viene scartata", C.calGaraValida(finta2025) === false);
  prova("anche una 2027 sulla pagina 2026", C.calGaraValida(finta2027) === false);
  prova("e una riga senza pagina ufficiale", C.calGaraValida(senzaFonte) === false);
  prova("e una federazione diversa da quella della pagina", C.calGaraValida(altraFed) === false);
  prova("mentre ogni gara vera passa", GARE.every(C.calGaraValida));

  // ── 4. IL LUOGO NON SI FABBRICA ─────────────────────────────────────────
  titolo("NESSUN LUOGO GARA FABBRICATO DAL LUOGO DELLA COMPAGNIA");
  prova("location, latitude e longitude sono null in ogni gara",
    GARE.every(function (e) { return e.location === null && e.latitude === null && e.longitude === null; }));
  prova("nessun campo della gara contiene il luogo del campo della compagnia",
    GARE.every(function (e) {
      var c = COMP[e.clubCode]; if (!c || !c.luogo) return true;
      return Object.keys(e).every(function (k) { return typeof e[k] !== "string" || e[k].indexOf(c.luogo) < 0; });
    }));
  prova("chi organizza e la sua regione vengono da compagnie-data.js, col codice",
    GARE.every(function (e) {
      var c = COMP[e.clubCode];
      if (!c) return e.club === null && e.region === null;
      return e.club === c.nome && e.region === c.regione;
    }),
    GARE.filter(function (e) { var c = COMP[e.clubCode]; return c && (e.club !== c.nome || e.region !== c.regione); })
      .map(function (e) { return e.clubCode; }).join(", "));

  // ── 4-bis. 08LAUR SUL CALENDARIO, 08LUAR NELL'ELENCO ────────────────────
  // (29/09/2026.) Due fonti FIARC ufficiali non coincidono:
  //   - calendario Emilia-Romagna/RSM (Emilia_cale_2.jpg): «08/11/2026 08LAUR Percorso»;
  //   - elenco compagnie Emilia-Romagna/RSM al 22/07/2026: nessun 08LAUR, e
  //     «08LUAR — I LUNGHI ARCHI — Loc. Campo: SASSO MARCONI BO».
  // Scelta: il codice della fonte resta (`sourceClubCode`, e l'id), la
  // compagnia e' quella canonica dell'elenco (`clubCode`), e la scheda mostra
  // tutti e due. Qui si prova che l'incongruenza c'e' e che e' gestita cosi'.
  titolo("08LAUR (CALENDARIO) / 08LUAR (ELENCO COMPAGNIE): FEDELE ALLA FONTE, UTILE ALL'ARCIERE");
  var laur = GARE.filter(function (e) { return e.date === "2026-11-08" && codiceFonte(e) === "08LAUR"; });
  prova("l'incongruenza e' reale: 08LAUR non e' nell'elenco, 08LUAR si'",
    !COMP["08LAUR"] && !!COMP["08LUAR"] && COMP["08LUAR"].nome === "I Lunghi Archi" &&
    COMP["08LUAR"].regione === "Emilia-Romagna" && COMP["08LUAR"].luogo === "Sasso Marconi (BO)");
  prova("una sola gara, e conserva il codice stampato dal calendario (sourceClubCode e id)",
    laur.length === 1 && laur[0].sourceClubCode === "08LAUR" && laur[0].id === "fiarc-2026-11-08-08LAUR-percorso",
    JSON.stringify(laur));
  prova("la compagnia canonica e' 08LUAR, con nome e regione dall'elenco",
    laur.length === 1 && laur[0].clubCode === "08LUAR" && laur[0].club === "I Lunghi Archi" &&
    laur[0].title === "I Lunghi Archi" && laur[0].region === "Emilia-Romagna");
  prova("stessa zona e stesse lettere: e' l'unico candidato con prefisso 08",
    Object.keys(COMP).filter(function (k) {
      return /^08/.test(k) && k.split("").sort().join("") === "08LAUR".split("").sort().join("");
    }).join(",") === "08LUAR");
  prova("il luogo della gara non si prende dal campo della compagnia (Sasso Marconi)",
    laur.length === 1 && laur[0].location === null);
  prova("sourceClubCode c'e' solo dove le due fonti non coincidono",
    GARE.filter(function (e) { return "sourceClubCode" in e; }).map(function (e) { return e.id; }).join(",") === "fiarc-2026-11-08-08LAUR-percorso" &&
    GARE.every(function (e) { return !e.sourceClubCode || e.sourceClubCode !== e.clubCode; }));
  prova("ogni codice compagnia del calendario risolve una compagnia dell'elenco",
    GARE.every(function (e) { return !!COMP[e.clubCode]; }),
    GARE.filter(function (e) { return !COMP[e.clubCode]; }).map(function (e) { return e.clubCode; }).join(", "));

  // ── 4-ter. COMPAGNIE CON IL CAMPO VUOTO NELL'ELENCO FIARC ───────────────
  // (29/09/2026.) Elenchi FIARC Piemonte 10/07, Liguria 13/07, Lombardia 10/07,
  // Toscana 10/07/2026: per queste compagnie «Loc. Campo: -». Provincia e luogo
  // restano «—»: non si deducono da fonti non ufficiali. 04GROA aveva «MB»
  // (dal primo caricamento del file, 01/08), che l'elenco non dice: tolto.
  titolo("COMPAGNIE SENZA CAMPO NELL'ELENCO FIARC: PROVINCIA E LUOGO «—», NIENTE DEDOTTO");
  [["01LUPI", "Piemonte"], ["03LUNA", "Liguria"], ["04CORM", "Lombardia"], ["04GROA", "Lombardia"], ["09ATON", "Toscana"]].forEach(function (x) {
    var c = COMP[x[0]];
    prova(x[0] + " " + (c ? c.nome : "?") + ": " + x[1] + ", provincia e luogo «—»",
      !!c && c.regione === x[1] && c.provincia === "—" && c.luogo === "—", JSON.stringify(c));
  });
  prova("08LUAR invece il campo ce l'ha: Sasso Marconi (BO)",
    !!COMP["08LUAR"] && COMP["08LUAR"].provincia === "BO" && COMP["08LUAR"].luogo === "Sasso Marconi (BO)");

  // ── 5. LA FONTE, E I SUOI LINK ──────────────────────────────────────────
  titolo("OGNI GARA PORTA LA SUA PAGINA UFFICIALE, E PASSA DAL VAGLIO DEI LINK");
  prova("officialUrl e' la pagina della sua zona in CAL_FONTI",
    GARE.every(function (e) { return e.officialUrl === FONTI[e.sourceRef].url; }));
  prova("tutte le pagine sono https://www.fiarc.it/le-nostre-gare/...",
    Object.keys(FONTI).every(function (k) { return /^https:\/\/www\.fiarc\.it\/le-nostre-gare\/[a-z0-9-]+\/$/.test(FONTI[k].url); }));
  prova("e calUrlSicuro le lascia passare identiche",
    GARE.every(function (e) { return C.calUrlSicuro(e.officialUrl) === e.officialUrl; }));
  prova("mentre javascript:, data: e un indirizzo relativo non passano",
    C.calUrlSicuro("javascript:alert(1)") === null && C.calUrlSicuro("data:text/html,x") === null &&
    C.calUrlSicuro("/le-nostre-gare/") === null);
  prova("ogni pagina ha la data di verifica, uguale all'aggiornamento dichiarato",
    Object.keys(FONTI).every(function (k) { return FONTI[k].verificata === C.CAL_AGGIORNATO; }) && C.CAL_AGGIORNATO === "2026-09-28");

  // ── 6. L'ORDINE E IL PASSATO ────────────────────────────────────────────
  titolo("ORDINE CRONOLOGICO, E IL PASSATO SE NE VA DA SOLO");
  var ev = C.calEventi();
  var ordinate = ev.every(function (e, i) { return i === 0 || ev[i - 1].date <= e.date; });
  prova("il " + OGGI.slice(0, 10) + " calEventi() le da' in ordine di data", ordinate && ev.length > 0,
    ev.map(function (e) { return e.date; }).join(" "));
  var ev2 = carica("2026-09-28T10:00:00").calEventi();
  prova("il 28/09/2026 si vedono tutte le " + GARE.length, ev2.length === GARE.length, ev2.length);
  var ev3 = carica("2026-10-12T10:00:00").calEventi();
  prova("il 12/10/2026 le gare del 4, 10 e 11 ottobre non ci sono piu'",
    ev3.every(function (e) { return e.date >= "2026-10-12"; }) && ev3.length === GARE.filter(function (e) { return e.date >= "2026-10-12"; }).length,
    ev3.map(function (e) { return e.date; }).join(" "));
  var ev4 = carica("2026-11-22T23:00:00").calEventi();
  prova("il giorno della gara la gara c'e' ancora (22/11 sera)", ev4.length === 2, ev4.length);
  var ev5 = carica("2026-11-23T08:00:00").calEventi();
  prova("dal 23/11/2026 il calendario e' vuoto, non pieno di gare passate", ev5.length === 0, ev5.length);
  var ev6 = carica("2026-09-28T10:00:00").calEventi();
  prova("a parita' di giorno l'ordine e' sempre lo stesso",
    JSON.stringify(ev6.map(function (e) { return e.id; })) === JSON.stringify(carica("2026-09-28T10:00:00").calEventi().map(function (e) { return e.id; })) &&
    ev6.every(function (e, i) { return i === 0 || ev6[i - 1].date < e.date || ev6[i - 1].id < e.id; }));

  // ── 7. LE LINGUE: NIENTE PIU' «DATI DI ESEMPIO» ─────────────────────────
  titolo("IL CARTELLO «DATI DI ESEMPIO» NON C'E' PIU', IN NESSUNA LINGUA");
  prova("la chiave `cal_prova` non esiste piu'", !/\bcal_prova\b/.test(SRC));
  var agg = SRC.match(/cal_aggiornato: "[^"]*"/g) || [];
  var nd = SRC.match(/cal_luogo_nd: "[^"]*"/g) || [];
  prova("la nota della fonte c'e' in nove lingue, con la data e il nome FIARC",
    agg.length === 9 && agg.every(function (x) { return /\{d\}/.test(x) && /FIARC/.test(x); }), agg.length);
  prova("«Luogo da confermare» c'e' in nove lingue", nd.length === 9, nd.length);
  var cf = SRC.match(/cal_det_codice_fonte: "[^"]*"/g) || [];
  prova("«Codice sul calendario FIARC» c'e' in nove lingue, col nome FIARC",
    cf.length === 9 && cf.every(function (x) { return /FIARC/.test(x); }), cf.length);
  prova("le frasi di esempio di prima sono sparite",
    !/Dati di esempio|Sample data|Données d’exemple|Beispieldaten|Örnek veriler|Пример данных|Datos de ejemplo|Exempeldata|Voorbeeldgegevens/.test(SRC));

  // ── 8. NELL'APP VERA ────────────────────────────────────────────────────
  titolo("NELL'APP: IL DATO ARRIVA INTERO FINO ALLA SCHERMATA");
  var chromium;
  try { chromium = require("playwright").chromium; } catch (e) { chromium = null; }
  prova("playwright c'e'", !!chromium);
  if (chromium) {
    var D = path.join(os.tmpdir(), "arctrail-banco-calendario-fiarc");
    if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
    fs.writeFileSync(path.join(D, "index.html"), require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
    ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
      if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
    });
    var browser = await chromium.launch();
    async function apri(quando, lang) {
      var ctx = await browser.newContext({ viewport: { width: 390, height: 1600 } });
      await ctx.clock.setFixedTime(new Date(quando));
      var st = { screen: "menu", tab: "campi", pendingArchers: [], lang: lang || "it", country: "it", federation: "fiarc", theme: "light",
        profile: { nomeCognome: "Prova Banco", username: "banco", compagnia: "01VERB", compagniaNome: "A.S.D. Arcieri del VCO & Valgrande", classe: "SM", arco: "longbow" },
        profileSkipped: false };
      await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " + JSON.stringify(JSON.stringify(st)) +
        "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
      var page = await ctx.newPage();
      var err = [];
      page.on("pageerror", function (e) { err.push(String(e.message)); });
      await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
      await page.waitForTimeout(1200);
      await page.evaluate(function () {
        var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
          return x.querySelector(".tab-lbl") && /Campi|Fields/.test(x.querySelector(".tab-lbl").textContent);
        })[0];
        if (b) b.click();
      });
      await page.waitForTimeout(500);
      await page.evaluate(function () { var p = document.querySelector(".cal-porta"); if (p) p.click(); });
      await page.waitForTimeout(600);
      return { ctx: ctx, page: page, err: err };
    }
    function leggi() {
      var card = document.querySelector("#app .card");
      return {
        testo: card ? card.innerText : "",
        righe: Array.prototype.map.call(document.querySelectorAll(".al-blocco"), function (r) {
          return {
            giorno: (r.querySelector(".cal-quando b") || {}).textContent || "",
            titolo: (r.querySelector(".al-dove b") || {}).textContent || "",
            sotto: (r.querySelector(".al-dove span") || {}).textContent || "",
            luogo: (r.querySelector(".cal-luogo") || {}).textContent || ""
          };
        }),
        chip: Array.prototype.map.call(document.querySelectorAll(".chip-filtro"), function (c) { return c.textContent.trim(); })
      };
    }
    // Il conteggio qui sotto e' quello del 28/09: l'app si apre quel giorno.
    var p = await apri("2026-09-28T10:00:00");
    var d = await p.page.evaluate(leggi);
    prova("il calendario si apre senza errori", d.righe.length > 0 && p.err.length === 0, p.err.join(" | "));
    prova("ci sono tutte le " + GARE.length + " gare", d.righe.length === GARE.length, d.righe.length);
    prova("ogni riga porta il codice della compagnia che la FIARC pubblica",
      d.righe.every(function (r) { return /\b\d{2}[A-Z]{4}\b/.test(r.sotto); }),
      JSON.stringify(d.righe.map(function (r) { return r.sotto; }).slice(0, 3)));
    var rLuar = d.righe.filter(function (r) { return r.giorno.trim() === "8" && /08LUAR/.test(r.sotto); });
    prova("la gara 08LAUR non si presenta come compagnia sconosciuta: I Lunghi Archi, 08LUAR, Emilia-Romagna",
      rLuar.length === 1 && rLuar[0].titolo === "I Lunghi Archi" && /Emilia-Romagna$/.test(rLuar[0].luogo) &&
      !d.righe.some(function (r) { return /Compagnia 08LAUR/.test(r.titolo); }),
      JSON.stringify(rLuar));
    var det = await p.page.evaluate(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) {
        return /08LUAR/.test(x.textContent);
      })[0];
      if (!b) return "";
      b.querySelector(".al-tocca").click();
      var aperto = Array.prototype.filter.call(document.querySelectorAll(".al-blocco.aperta"), function (x) {
        return /08LUAR/.test(x.textContent);
      })[0];
      return aperto ? aperto.innerText : "";
    });
    prova("aperta, la scheda dice tutte e due le fonti: «I Lunghi Archi (08LUAR)» e «Codice sul calendario FIARC 08LAUR»",
      /I Lunghi Archi \(08LUAR\)/.test(det) && /Codice sul calendario FIARC\s*08LAUR/.test(det), JSON.stringify(det));
    var detAltro = await p.page.evaluate(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll(".al-blocco"), function (x) { return /01DAHU/.test(x.textContent); })[0];
      b.querySelector(".al-tocca").click();
      var aperto = document.querySelector(".al-blocco.aperta");
      return aperto ? aperto.innerText : "";
    });
    prova("e le altre gare non hanno la riga del codice di calendario",
      /01DAHU/.test(detAltro) && !/Codice sul calendario/.test(detAltro), JSON.stringify(detAltro));
    await p.page.evaluate(function () { var a = document.querySelector(".al-blocco.aperta .al-tocca"); if (a) a.click(); });
    await p.page.waitForTimeout(200);
    prova("il cartello «dati di esempio» non compare", !/esempio/i.test(d.testo));
    await p.page.evaluate(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll(".chip-filtro"), function (c) { return c.textContent.trim() === "FIARC"; })[0];
      if (b) b.click();
    });
    await p.page.waitForTimeout(300);
    var dF = await p.page.evaluate(leggi);
    prova("il filtro FIARC tiene tutte le gare, e tutte dicono FIARC",
      dF.righe.length === GARE.length && dF.righe.every(function (r) { return /^FIARC · /.test(r.sotto); }),
      dF.righe.length);
    var link = await p.page.evaluate(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".al-tocca"), function (b) { b.click(); });
      return Array.prototype.map.call(document.querySelectorAll(".al-blocco a[href]"), function (x) {
        return { href: x.getAttribute("href"), rel: x.getAttribute("rel"), target: x.getAttribute("target"), testo: x.textContent };
      });
    });
    prova("i link della pagina portano solo alle pagine ufficiali fiarc.it",
      link.length > 0 && link.every(function (l) { return /^https:\/\/www\.fiarc\.it\/le-nostre-gare\//.test(l.href); }),
      JSON.stringify(link.slice(0, 2)));
    prova("e si aprono fuori, con rel=noopener", link.every(function (l) { return l.target === "_blank" && /noopener/.test(l.rel); }));
    prova("il tasto dice «Pagina ufficiale», non «Sito della gara»",
      link.every(function (l) { return l.testo === "Pagina ufficiale"; }), JSON.stringify(link.slice(0, 1)));
    prova("nessun tasto Iscrizioni: nessun link alle iscrizioni e' stato inventato",
      !/Iscrizioni/.test(await p.page.evaluate(function () { return document.querySelector("#app .card").innerText; })));
    await p.ctx.close();

    var q = await apri("2026-10-12T10:00:00");
    var d2 = await q.page.evaluate(leggi);
    prova("aperto il 12/10/2026, la prima gara e' del 18 ottobre (il passato non si vede)",
      d2.righe.length === GARE.filter(function (e) { return e.date >= "2026-10-12"; }).length && d2.righe[0] && d2.righe[0].giorno.trim() === "18",
      d2.righe.length + " righe, prima: " + (d2.righe[0] && d2.righe[0].giorno));
    await q.ctx.close();

    var r = await apri("2026-09-28T10:00:00", "en");
    var d3 = await r.page.evaluate(leggi);
    prova("[en] «Venue to be confirmed» e la nota della fonte in inglese",
      d3.righe.every(function (x) { return /^Venue to be confirmed · /.test(x.luogo); }) && /official FIARC calendars/.test(d3.testo),
      JSON.stringify(d3.righe.slice(0, 1)));
    await r.ctx.close();
    await browser.close();
  }

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.log("  ✗ il banco si e' fermato: " + (e && e.stack || e)); process.exit(1); });
