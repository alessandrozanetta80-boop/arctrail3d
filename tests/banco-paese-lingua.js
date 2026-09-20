#!/usr/bin/env node
/* banco-paese-lingua.js — una lingua non e' un paese.
 *
 *   node tests/banco-paese-lingua.js
 *   APP=percorso node tests/banco-paese-lingua.js   # sabotaggio
 *
 * PERCHE' ESISTE. (20/09/2026, audit: «l'inglese preseleziona il Regno
 * Unito».) Nell'app c'era `LANG_TO_COUNTRY = { ..., en:"uk" }`: chi aveva il
 * telefono in inglese trovava Archery GB ed EFAA proposte per prime, e un
 * americano partiva da due federazioni che non sono le sue — ASA e IBO sono
 * altrove nella tendina.
 *
 * MA NON ERA SOLO L'INGLESE, e questo e' il punto che si vede solo mettendo
 * in fila i casi: `linguaProbabile()` fa `.slice(0,2)` sul locale del
 * telefono, cioe' BUTTA la regione. Quindi `de-AT` e `de-CH` finivano in
 * Germania — tre federazioni sbagliate su tre, perche' in Austria c'e' OBSV e
 * in Svizzera SwissArchery e FAAS — e `fr-CH` in Francia.
 * `it-IT` e `de-DE` davano per caso la risposta giusta: la regione diceva la
 * stessa cosa della lingua. Sono i casi che nascondono il difetto.
 *
 * COSA CHIEDE. La matrice intera, un locale per riga, compresi i paesi che
 * l'app NON copre (`en-CA`, `en-AU`): li' la risposta giusta e' «non lo so»,
 * non «Regno Unito». *Una scelta sbagliata gia' fatta non si rilegge: meglio
 * una tendina da aprire.*
 *
 * Gira senza browser: si ritaglia il pezzo di `app.html` e si esegue.
 */
"use strict";
var fs = require("fs");

var SORGENTE = process.env.APP || "app.html";
var src = fs.readFileSync(SORGENTE, "utf8");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function ritaglia(dal, al) {
  var a = src.indexOf(dal), b = src.indexOf(al, a);
  if (a < 0 || b < 0) return null;
  return src.slice(a, b);
}

/* Il pezzo vero: da `LANG_TO_COUNTRY` fino alla fine di `paeseProbabile`.
   `COUNTRY_LIST` viene subito dopo nel file, quindi si prende anche lei: e'
   l'elenco dei paesi che l'app copre, ed e' la meta' della risposta. */
var blocco = ritaglia("var LANG_TO_COUNTRY =", "// ---------- SELEZIONE FEDERAZIONE ----------");
if (!blocco) {
  console.log("\n  ✗ non trovo il blocco delle lingue/paesi in " + SORGENTE + "\n");
  process.exit(1);
}
var F = null;
try {
  /* eslint-disable no-eval */
  F = eval("var navigator = { language: '' }, state = {};\n" + blocco
    + "\n({ paeseDaLocale: paeseDaLocale, paeseProbabile: paeseProbabile,"
    + "   LANG_TO_COUNTRY: LANG_TO_COUNTRY, COUNTRY_LIST: COUNTRY_LIST,"
    + "   setNav: function(l){ navigator.language = l; },"
    + "   setState: function(s){ state = s; } })");
} catch (e) {
  console.log("\n  ✗ il blocco non si compila: " + e.message + "\n");
  process.exit(1);
}

console.log("\n  IL PAESE SI RICAVA DAL LOCALE, NON DALLA LINGUA\n");

/* La matrice. `null` vuol dire «non lo so, che lo scelga lei». */
var CASI = [
  // locale del telefono   paese atteso   perche'
  ["it-IT", "it", "l'italiano d'Italia: FIARC e FITARCO"],
  ["de-DE", "de", "il tedesco di Germania: DSB e DFBV"],
  ["de-AT", "at", "il tedesco d'Austria NON e' la Germania: OBSV"],
  ["de-CH", "ch", "il tedesco di Svizzera: SwissArchery e FAAS"],
  ["fr-CH", "ch", "anche il francese di Svizzera e' Svizzera"],
  ["fr-FR", "fr", "il francese di Francia: FFTA e FFTL"],
  ["en-GB", "uk", "l'inglese britannico: Archery GB, NFAS, EFAA"],
  ["en-US", "us", "l'inglese americano: ASA e IBO"],
  ["en-CA", null, "il Canada non e' coperto: non si indovina UK"],
  ["en-AU", null, "l'Australia non e' coperta: non si indovina UK"],
  ["en", null, "l'inglese senza regione non dice dove sei"],
  ["EN", null, "ne' in maiuscolo"],
  ["en-gb", "uk", "e la regione minuscola vale come quella maiuscola"],
  ["en_US", "us", "anche col trattino basso, che qualche browser usa"],
  ["sv-SE", "se", "lo svedese: SBF e SFSF"],
  ["nl-NL", "nl", "l'olandese: KHSN"],
  ["tr-TR", "tr", "il turco: TOF"],
  ["es-ES", "es", "lo spagnolo: RFETA"],
  ["it", "it", "la lingua sola risponde quando e' parlata in un paese solo"],
  ["pt-BR", null, "una lingua che non parliamo, in un paese che non copriamo"],
  ["zh-Hans-CN", null, "con la scrittura in mezzo la regione e' il terzo pezzo"],
  ["", null, "nessun locale: nessuna risposta"],
  [null, null, "locale assente: nessuna risposta"]
];

CASI.forEach(function (c) {
  var atteso = c[1];
  var avuto = F.paeseDaLocale(c[0]);
  prova(JSON.stringify(c[0]) + " → " + JSON.stringify(atteso) + "   (" + c[2] + ")",
        avuto === atteso, "ha detto " + JSON.stringify(avuto));
});

console.log("\n  LA MAPPA DELLE LINGUE NON PARLA PIU' DELL'INGLESE\n");
prova("`en` non e' nella mappa lingua→paese",
      !Object.prototype.hasOwnProperty.call(F.LANG_TO_COUNTRY, "en"),
      JSON.stringify(F.LANG_TO_COUNTRY));
prova("gli Stati Uniti sono fra i paesi coperti",
      F.COUNTRY_LIST.some(function (x) { return x.code === "us"; }));
prova("e il Regno Unito anche",
      F.COUNTRY_LIST.some(function (x) { return x.code === "uk"; }));

console.log("\n  IL TELEFONO VIENE PRIMA DELLA LINGUA SCELTA\n");
F.setNav("en-US"); F.setState({ lang: "it" });
prova("telefono en-US e app in italiano: vince il telefono (us)",
      F.paeseProbabile() === "us", String(F.paeseProbabile()));
F.setNav("en-CA"); F.setState({ lang: "it" });
prova("telefono en-CA (non coperto) e app in italiano: si ripiega sull'italiano",
      F.paeseProbabile() === "it", String(F.paeseProbabile()));
F.setNav("en-CA"); F.setState({ lang: "en" });
prova("telefono en-CA e app in inglese: nessun paese, la tendina resta da aprire",
      F.paeseProbabile() === null, String(F.paeseProbabile()));
F.setNav(""); F.setState({});
prova("niente locale e niente lingua: nessun paese",
      F.paeseProbabile() === null, String(F.paeseProbabile()));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
