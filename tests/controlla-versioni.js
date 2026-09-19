#!/usr/bin/env node
/* controlla-versioni.js — i timbri dicono la verita', e si muovono insieme.
 *
 *   node tests/controlla-versioni.js
 *
 * PERCHE' ESISTE. (20/09/2026, fase 55.) Le versioni del progetto sono SEI, in
 * cinque file e in tre formati diversi:
 *
 *   app.html          var BUILD_STAMP  / var BUILD_PARENT     2026-09-20-nome
 *   index.html        data-build       / data-parent          2026-09-20-nome
 *   marketplace.html  data-build       / data-parent          2026-09-20-nome
 *   sw.js             var CACHE_NAME   / var CACHE_PARENT     arctrail3d-v167
 *   firestore.rules   // Versione     / // Nata da:           2026-09-20-nome
 *   functions/index.js // Versione    / // Nata da:           2026-09-20-nome
 *
 * `controlla-base.js` li confronta con quello che e' online: dice se siamo
 * avanti o indietro rispetto al sito. Nessuno pero' controllava la cosa piu'
 * facile da sbagliare, e la piu' silenziosa: **un file cambiato e il suo
 * timbro no**. Succede sempre allo stesso modo — si tocca `firestore.rules` a
 * fine giornata, si pubblica, e nel diario resta scritto il nome di ieri.
 * Poi, il giorno in cui qualcosa non torna, la domanda «quale versione delle
 * regole c'e' online?» non ha piu' una risposta.
 *
 * COSA CONTROLLA.
 *   1. ogni file dichiara timbro E genitore;
 *   2. i timbri a data sono scritti come si deve, e non sono nel futuro;
 *   3. nessun file e' nato da se stesso (timbro diverso dal genitore);
 *   4. IL TIMBRO NON E' PIU' VECCHIO DEL FILE: se l'ultima modifica e' di
 *      oggi e il timbro dice ieri, il timbro mente. Si guarda la data
 *      dell'ultimo commit che ha toccato il file — e se il file e' sporco in
 *      questo momento, si guarda oggi;
 *   5. la cassa del service worker cresce: v167 dopo v166, mai indietro;
 *   6. l'app e la sua cassa si muovono INSIEME. Se `app.html` ha un timbro
 *      nuovo e `sw.js` no, il telefono di chi ha gia' l'app in casa continua
 *      a servire quella vecchia: il lavoro esiste sul sito e non arriva a
 *      nessuno. E' il difetto piu' costoso dei sei, perche' sembra fatto.
 *
 * NON controlla cosa c'e' online: quello e' il mestiere di controlla-base.js,
 * che ha bisogno della rete. Questo gira anche in aereo.
 */
"use strict";
var fs = require("fs");
var { execFileSync } = require("child_process");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

var FILE = [
  { nome: "app.html", timbro: /var BUILD_STAMP\s*=\s*"([^"]+)"/, padre: /var BUILD_PARENT\s*=\s*"([^"]+)"/, forma: "data" },
  { nome: "index.html", timbro: /<body[^>]*data-build="([^"]+)"/, padre: /<body[^>]*data-parent="([^"]+)"/, forma: "data" },
  { nome: "marketplace.html", timbro: /<body[^>]*data-build="([^"]+)"/, padre: /<body[^>]*data-parent="([^"]+)"/, forma: "data" },
  { nome: "sw.js", timbro: /var CACHE_NAME\s*=\s*"([^"]+)"/, padre: /var CACHE_PARENT\s*=\s*"([^"]+)"/, forma: "cassa" },
  { nome: "firestore.rules", timbro: /^\/\/ Versione ([^\r\n]+)$/m, padre: /^\/\/ Nata da: ([^\r\n(]+)/m, forma: "data" },
  { nome: "functions/index.js", timbro: /^\/\/ Versione ([^\r\n]+)$/m, padre: /^\/\/ Nata da: ([^\r\n(]+)/m, forma: "data" }
];

function git(args) {
  try { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
  catch (e) { return ""; }
}
/* La data di QUI, non quella di Greenwich: alle due di notte in Italia
   `toISOString()` dice ancora ieri, e il banco bocciava un timbro giusto. */
function giorno(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
var OGGI = giorno(new Date());
/* La data che conta per il file: se ha modifiche non ancora messe in un
   commit, e' oggi; se no, e' il giorno dell'ultimo commit che l'ha toccato. */
function quandoCambiato(nome) {
  var sporco = git(["status", "--porcelain", "--", nome]);
  if (sporco) return OGGI;
  return git(["log", "-1", "--format=%cs", "--", nome]) || OGGI;
}
function leggi(testo, re) { var m = testo.match(re); return m ? m[1].trim() : null; }

console.log("\n  I TIMBRI DI VERSIONE\n");
var letti = {};
FILE.forEach(function (f) {
  if (!fs.existsSync(f.nome)) { prova(f.nome + " esiste", false, "non c'e'"); return; }
  var testo = fs.readFileSync(f.nome, "utf8");
  var t = leggi(testo, f.timbro), p = leggi(testo, f.padre);
  letti[f.nome] = { timbro: t, padre: p, cambiato: quandoCambiato(f.nome), forma: f.forma };
  prova(f.nome + " dichiara timbro e genitore", !!t && !!p, "timbro " + t + " · genitore " + p);
});

console.log("\n  SONO SCRITTI COME SI DEVE\n");
Object.keys(letti).forEach(function (n) {
  var v = letti[n];
  if (!v.timbro) return;
  if (v.forma === "data") {
    var m = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9-]+$/.exec(v.timbro);
    prova(n + " · il timbro ha la forma AAAA-MM-GG-nome", !!m, v.timbro);
    if (m) prova(n + " · il timbro non e' nel futuro", v.timbro.slice(0, 10) <= OGGI, v.timbro + " · oggi " + OGGI);
  } else {
    prova(n + " · la cassa si chiama arctrail3d-vNNN", /^arctrail3d-v\d+$/.test(v.timbro), v.timbro);
  }
  prova(n + " · non e' nato da se stesso", v.timbro !== v.padre, v.timbro);
});

console.log("\n  IL TIMBRO NON E' PIU' VECCHIO DEL FILE\n");
Object.keys(letti).forEach(function (n) {
  var v = letti[n];
  if (!v.timbro || v.forma !== "data") return;
  prova(n + " · timbro " + v.timbro.slice(0, 10) + " ≥ ultima modifica " + v.cambiato,
        v.timbro.slice(0, 10) >= v.cambiato,
        "il file e' stato toccato dopo l'ultima volta che il timbro e' cambiato");
});

console.log("\n  LA CASSA CRESCE, E SEGUE L'APP\n");
var sw = letti["sw.js"] || {};
if (sw.timbro && sw.padre) {
  var nuovo = parseInt(String(sw.timbro).replace(/\D+/g, ""), 10);
  var vecchio = parseInt(String(sw.padre).replace(/\D+/g, ""), 10);
  prova("la cassa va avanti, non indietro (" + sw.padre + " → " + sw.timbro + ")", nuovo > vecchio);
}
var app = letti["app.html"] || {};
if (app.timbro && app.padre && sw.timbro && sw.padre) {
  /* Se l'app e' cambiata rispetto a cio' che c'e' in giro, la cassa deve
     essere cambiata anche lei: se no chi ha l'app installata continua a
     ricevere quella vecchia, e il lavoro non arriva a nessuno. */
  var appMossa = app.timbro !== app.padre;
  var cassaMossa = sw.timbro !== sw.padre;
  prova("app e cassa si muovono insieme", appMossa === cassaMossa,
        "app " + app.padre + " → " + app.timbro + " · cassa " + sw.padre + " → " + sw.timbro);
}

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
