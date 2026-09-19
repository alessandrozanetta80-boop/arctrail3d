#!/usr/bin/env node
/* banco-chiavi-compagnie.js — la chiave di una societa' non deve cambiare mai.
 *
 *   node tests/banco-chiavi-compagnie.js
 *   node tests/banco-chiavi-compagnie.js --scrivi   # aggiorna l'istantanea
 *   DATI=altro.js node tests/banco-chiavi-compagnie.js   # sabotaggio
 *
 * PERCHE' ESISTE. (20/09/2026, risanamento notturno; l'audit lo elenca al
 * punto D3.) La chiave di una societa' non e' un dettaglio dell'elenco: e' il
 * filo a cui sono appesi `users/{uid}.compagnia`, `compagnie_admin/{id}` e il
 * `clubCode` di chi si e' iscritto. L'elenco straniero pero' non ha codici
 * ufficiali come la FIARC: le chiavi sono state CALCOLATE DAL NOME —
 *
 *     Svezia e Regno Unito   SE/UK + sha1(nome in minuscolo), 8 cifre
 *     Turchia                TR   + md5(nome), 8 cifre
 *
 * — e questo vuol dire che **correggere un nome cambia la chiave**. Basta
 * togliere un doppio spazio a «Acorn  Archers» e tutti quelli che ci sono
 * dentro si ritrovano in una societa' che non esiste piu'. Nessuno se ne
 * accorge il giorno stesso: se ne accorge il presidente, tre settimane dopo,
 * quando la sua compagnia ha zero iscritti.
 *
 * Germania, Paesi Bassi e Spagna hanno chiavi della stessa forma ma NON
 * ricalcolabili dai campi del file (vengono dalla fonte originale): per loro
 * il banco non puo' verificare la regola, e allora verifica la cosa che conta
 * di piu' — che non spariscano.
 *
 * COSA CONTROLLA.
 *   1. nessuna chiave ripetuta nel file (una ripetuta si mangia l'altra in
 *      silenzio: in JavaScript vince l'ultima, e una societa' sparisce);
 *   2. la forma delle chiavi, paese per paese;
 *   3. SE, UK e TR: la chiave e' davvero quella che il nome produce;
 *   4. nei paesi a chiave derivata, due societa' non hanno lo stesso nome
 *      (avrebbero la stessa chiave, e una si mangerebbe l'altra);
 *   5. ogni societa' ha nome, paese e i campi che l'app legge, coi tipi
 *      giusti;
 *   6. L'ISTANTANEA: nessuna chiave di ieri e' sparita oggi. E' l'unico modo
 *      di accorgersi di una rigenerazione dell'elenco che rinumera tutti.
 *      Le aggiunte sono libere; le sparizioni no, e vanno viste a mano prima
 *      di aggiornare l'istantanea con `--scrivi`.
 */
"use strict";
var fs = require("fs"), crypto = require("crypto");

var SCRIVI = process.argv.indexOf("--scrivi") >= 0;
var FOTO = "tests/chiavi-compagnie.json";
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

// DATI=percorso per il sabotaggio: lo stesso banco su un elenco manomesso.
var src = fs.readFileSync(process.env.DATI || "compagnie-data.js", "utf8");
var COMPAGNIE;
eval(src.replace(/^\s*var COMPAGNIE/, "COMPAGNIE"));
var chiavi = Object.keys(COMPAGNIE);

function taglio(algoritmo, testo) {
  return crypto.createHash(algoritmo).update(testo, "utf8").digest("hex").toUpperCase().slice(0, 8);
}
/* La regola, scritta una volta sola: la usa il banco e la puo' usare chi
   aggiunge una societa' a mano. */
function chiaveAttesa(paese, nome) {
  if (paese === "se" || paese === "uk") return paese.toUpperCase() + taglio("sha1", nome.toLowerCase());
  if (paese === "tr") return "TR" + taglio("md5", nome);
  return null;                      // it (codice FIARC), de/nl/es (dalla fonte)
}
/* Due federazioni per paese, due famiglie di chiavi: in Italia il codice
   FIARC (01ARTU) e quello FITARCO (FT01001), in Francia il numero FFTA
   (1016003) e il codice FFTL (FL0001). Sono codici veri, non calcolati: per
   questo un nome corretto non li tocca. */
var FORMA = {
  it: /^(\d{2}[A-Z0-9]{4,5}|FT\d{5})$/,
  fr: /^(\d{6,7}|FL\d{4})$/,
  de: /^DE[0-9A-F]{8}$/, nl: /^NL[0-9A-F]{8}$/, es: /^ES[0-9A-F]{8}$/,
  se: /^SE[0-9A-F]{8}$/, uk: /^UK[0-9A-F]{8}$/, tr: /^TR[0-9A-F]{8}$/
};
var DERIVATE = { se: 1, uk: 1, tr: 1 };

console.log("\n  L'ELENCO E' FATTO BENE\n");
/* Le chiavi ripetute non si vedono dall'oggetto: JavaScript ne tiene una. Si
   contano nel TESTO del file. */
var nelTesto = src.match(/^\s*"[^"]+":\s*\{/gm) || [];
var viste = {}, ripetute = [];
nelTesto.forEach(function (riga) {
  var k = riga.trim().replace(/^"/, "").replace(/":\s*\{$/, "");
  if (viste[k]) ripetute.push(k);
  viste[k] = 1;
});
prova("nessuna chiave ripetuta nel file", ripetute.length === 0, ripetute.slice(0, 5).join(", "));
prova("il file e l'oggetto hanno lo stesso numero di societa'",
      nelTesto.length === chiavi.length, nelTesto.length + " nel testo · " + chiavi.length + " nell'oggetto");

var perPaese = {};
chiavi.forEach(function (k) {
  var p = COMPAGNIE[k].paese || "it";
  (perPaese[p] = perPaese[p] || []).push(k);
});
console.log("  " + Object.keys(perPaese).sort().map(function (p) { return p + " " + perPaese[p].length; }).join(" · "));

console.log("\n  LA FORMA DELLE CHIAVI\n");
Object.keys(perPaese).sort().forEach(function (p) {
  var re = FORMA[p];
  if (!re) { prova("paese conosciuto: " + p, false, "nessuna forma dichiarata per «" + p + "»"); return; }
  var male = perPaese[p].filter(function (k) { return !re.test(k); });
  prova(p + " · " + perPaese[p].length + " chiavi nella forma " + re.source, male.length === 0, male.slice(0, 4).join(", "));
});

console.log("\n  LE CHIAVI CALCOLATE DAL NOME SONO QUELLE GIUSTE\n");
Object.keys(DERIVATE).forEach(function (p) {
  if (!perPaese[p]) { prova(p + " · c'e' qualche societa'", false, "nessuna"); return; }
  var male = perPaese[p].filter(function (k) { return k !== chiaveAttesa(p, COMPAGNIE[k].nome); });
  prova(p + " · tutte e " + perPaese[p].length + " le chiavi vengono dal nome", male.length === 0,
        male.slice(0, 3).map(function (k) { return k + " → atteso " + chiaveAttesa(p, COMPAGNIE[k].nome) + " (" + COMPAGNIE[k].nome + ")"; }).join(" · "));
  /* Due nomi uguali = una chiave sola = una societa' che si mangia l'altra. */
  var nomi = {}, doppi = [];
  perPaese[p].forEach(function (k) {
    var n = COMPAGNIE[k].nome.toLowerCase();
    if (nomi[n]) doppi.push(COMPAGNIE[k].nome);
    nomi[n] = 1;
  });
  prova(p + " · nessun nome ripetuto (sarebbe la stessa chiave)", doppi.length === 0, doppi.slice(0, 3).join(" | "));
});

console.log("\n  OGNI SOCIETA' HA QUELLO CHE L'APP LEGGE\n");
var senzaNome = [], tipiMale = [], paeseIgnoto = [];
var PAESI = Object.keys(FORMA);
chiavi.forEach(function (k) {
  var c = COMPAGNIE[k];
  if (!c.nome || typeof c.nome !== "string" || !c.nome.trim()) senzaNome.push(k);
  if (PAESI.indexOf(c.paese || "it") < 0) paeseIgnoto.push(k + ":" + c.paese);
  ["nome", "regione", "provincia", "luogo", "telefono", "email", "sito"].forEach(function (campo) {
    if (c[campo] !== undefined && typeof c[campo] !== "string") tipiMale.push(k + "." + campo);
  });
  if (c.completa !== undefined && typeof c.completa !== "boolean") tipiMale.push(k + ".completa");
});
prova("tutte hanno un nome", senzaNome.length === 0, senzaNome.slice(0, 5).join(", "));
prova("tutti i paesi sono fra quelli conosciuti", paeseIgnoto.length === 0, paeseIgnoto.slice(0, 5).join(", "));
prova("i campi hanno il tipo giusto", tipiMale.length === 0, tipiMale.slice(0, 5).join(", "));

console.log("\n  NESSUNA CHIAVE E' SPARITA DA IERI\n");
var oggi = {};
chiavi.sort().forEach(function (k) { oggi[k] = COMPAGNIE[k].nome; });
if (SCRIVI) {
  fs.writeFileSync(FOTO, JSON.stringify(oggi, null, 0) + "\n");
  console.log("  istantanea riscritta: " + chiavi.length + " chiavi in " + FOTO);
  prova("istantanea scritta", true);
} else if (!fs.existsSync(FOTO)) {
  prova("l'istantanea esiste", false, "manca " + FOTO + " — si crea con --scrivi");
} else {
  var ieri = JSON.parse(fs.readFileSync(FOTO, "utf8"));
  var sparite = Object.keys(ieri).filter(function (k) { return !(k in oggi); });
  var rinominate = Object.keys(ieri).filter(function (k) { return (k in oggi) && oggi[k] !== ieri[k]; });
  var nuove = Object.keys(oggi).filter(function (k) { return !(k in ieri); });
  prova("nessuna chiave sparita (" + Object.keys(ieri).length + " ieri, " + chiavi.length + " oggi)",
        sparite.length === 0,
        sparite.length + " sparite: " + sparite.slice(0, 5).map(function (k) { return k + " (" + ieri[k] + ")"; }).join(" · "));
  /* Un nome cambiato SOTTO la stessa chiave va benissimo in Italia e Francia
     (la chiave e' un codice), ma nei paesi a chiave derivata vuol dire che
     qualcuno ha corretto il nome senza ricalcolare — o peggio, che ha
     ricalcolato e l'altra chiave e' sparita (lo dice la prova qui sopra). */
  var rinDerivate = rinominate.filter(function (k) { return DERIVATE[(COMPAGNIE[k].paese || "it")]; });
  prova("nessun nome cambiato sotto una chiave derivata", rinDerivate.length === 0,
        rinDerivate.slice(0, 3).map(function (k) { return k + ": «" + ieri[k] + "» → «" + oggi[k] + "»"; }).join(" · "));
  if (nuove.length) console.log("  (" + nuove.length + " societa' nuove: si aggiornera' l'istantanea con --scrivi)");
}

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
