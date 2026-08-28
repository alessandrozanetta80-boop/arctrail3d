#!/usr/bin/env node
/* trova-doppie.js — le societa' italiane che stanno in TUTTI E DUE i registri.
 *
 *   node trova-doppie.js            legge compagnie-data.js e stampa l'elenco
 *   node trova-doppie.js --scrivi   riscrive DOPPIE-TESSERE-ITALIA.md
 *
 * PERCHE' ESISTE. Il 27/08/2026 Alessandro ha visto «un doppione, Dahu
 * Biella». Nel dato il doppione c'e' davvero: `01DAHU` e `FT01100` sono due
 * tessere della stessa gente, con due codici veri. Non e' un errore di
 * caricamento — e' come sono fatti i due registri.
 *
 * A SCHERMO NON SI VEDE, perche' `compagniaVisibile()` mostra solo il lato
 * della federazione scelta. Ma sono quaranta volte in cui la stessa societa'
 * ha due identita', e il giorno che si vorra' «la mia compagnia» slegata dalla
 * tessera, quella lista serve gia' fatta.
 *
 * NON E' UN BANCO E NON DEVE DIVENTARLO. Non sa dire di no: due societa'
 * diverse possono avere lo stesso nome (ci sono due «Arcieri del Lago», a
 * Ranzanico e a Mormanno, e sono due societa' vere). Questo attrezzo PROPONE
 * accostamenti, non li certifica. La colonna «per cosa» dice su quale prova si
 * regge ognuno: `email`, `telefono` e `sito` sono forti, `nome` e' un indizio.
 *
 * SI RILANCIA. L'elenco non si aggiorna a mano: quando il registro cambia si
 * rifa' questo, cosi' non puo' invecchiare in silenzio.
 */
var fs = require("fs");

var sorgente = fs.readFileSync("compagnie-data.js", "utf8");
eval(sorgente + ";global.C = COMPAGNIE;");

var italiane = Object.keys(C).filter(function (k) { return !C[k].paese || C[k].paese === "it"; });
var fitarco = italiane.filter(function (k) { return k.indexOf("FT") === 0; });
var fiarc = italiane.filter(function (k) { return k.indexOf("FT") !== 0; });

function pulisci(s) { return String(s || "").toLowerCase().replace(/[\s\/\-.]/g, ""); }

// Il nome ridotto all'osso: via le sigle giuridiche e le parole che ci sono in
// meta' delle societa' d'Italia. Quello che resta e' il nome vero.
function nudo(s) {
  return String(s || "").toLowerCase()
    .replace(/\b(a\.?s\.?d\.?|a\.?p\.?d\.?|a\.?s\.?|compagnia|comp|arcieri|arco|club|societa'?|società|gruppo|sportiva|dilettantistica|polisportiva)\b/g, " ")
    .replace(/[^a-z0-9àèéìòù]+/g, " ").trim().replace(/\s+/g, " ");
}

var indice = {};
fitarco.forEach(function (k) {
  ["email", "telefono", "sito"].forEach(function (campo) {
    var v = pulisci(C[k][campo]);
    if (v) { indice[campo] = indice[campo] || {}; indice[campo][v] = k; }
  });
  indice.nome = indice.nome || {};
  indice.nome[nudo(C[k].nome)] = k;
});

var coppie = [];
fiarc.forEach(function (k) {
  var trovato = null;
  ["email", "telefono", "sito"].forEach(function (campo) {
    if (trovato) return;
    var v = pulisci(C[k][campo]);
    if (v && indice[campo] && indice[campo][v]) trovato = { ft: indice[campo][v], prova: campo };
  });
  if (!trovato) {
    var n = nudo(C[k].nome);
    if (n && indice.nome[n]) trovato = { ft: indice.nome[n], prova: "nome" };
  }
  if (trovato) coppie.push({ fiarc: k, fitarco: trovato.ft, prova: trovato.prova });
});

coppie.sort(function (a, b) { return C[a.fiarc].nome.localeCompare(C[b.fiarc].nome, "it"); });

var forti = coppie.filter(function (c) { return c.prova !== "nome"; }).length;

var righe = [];
righe.push("# Societa' italiane con due tessere");
righe.push("");
righe.push("*Rigenerato da `node trova-doppie.js --scrivi`. Non si corregge a mano:");
righe.push("si rilancia, cosi' non puo' invecchiare in silenzio.*");
righe.push("");
righe.push("**" + coppie.length + " societa'** su " + fiarc.length + " FIARC risultano anche nel registro FITARCO.");
righe.push("Di queste, **" + forti + "** si reggono su un recapito condiviso (email, telefono o sito):");
righe.push("quelle sono sicure. Le altre " + (coppie.length - forti) + " si reggono solo sul nome, e il nome");
righe.push("da solo non basta — in Italia esistono due «Arcieri del Lago» che sono due");
righe.push("societa' diverse. **Le righe `nome` vanno guardate una per una prima di");
righe.push("farne qualcosa.**");
righe.push("");
righe.push("A schermo non si vedono doppie: `compagniaVisibile()` mostra solo il lato");
righe.push("della federazione scelta. Questa lista serve per il giorno in cui «la mia");
righe.push("compagnia» smettera' di dipendere dalla tessera.");
righe.push("");
righe.push("| FIARC | FITARCO | per cosa | nome FIARC | nome FITARCO |");
righe.push("|---|---|---|---|---|");
coppie.forEach(function (c) {
  righe.push("| `" + c.fiarc + "` | `" + c.fitarco + "` | " + c.prova + " | " +
    C[c.fiarc].nome + " | " + C[c.fitarco].nome + " |");
});
righe.push("");

var testo = righe.join("\n");

if (process.argv.indexOf("--scrivi") >= 0) {
  fs.writeFileSync("DOPPIE-TESSERE-ITALIA.md", testo, "utf8");
  var riletto = fs.readFileSync("DOPPIE-TESSERE-ITALIA.md", "utf8");
  console.log(riletto === testo
    ? "  scritto DOPPIE-TESSERE-ITALIA.md — " + coppie.length + " societa' (" + forti + " sicure)"
    : "  ATTENZIONE: il file su disco non e' quello che ho scritto.");
} else {
  console.log(testo);
}
