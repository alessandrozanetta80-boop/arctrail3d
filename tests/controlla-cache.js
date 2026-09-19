#!/usr/bin/env node
/* controlla-cache.js — se cambia un file della shell, CACHE_NAME sale.
 *
 *   node tests/controlla-cache.js            # controlla
 *   node tests/controlla-cache.js --scrivi   # dopo aver alzato CACHE_NAME, aggiorna l'impronta
 *   node tests/controlla-cache.js --scrivi --versione-non-pubblicata
 *        # stesso CACHE_NAME, ma quel nome non e' mai andato online (lavoro in piu' passi)
 *
 * PERCHE' ESISTE. (19/09/2026, audit S4.) La regola 8 dice: ogni volta che
 * cambia un file dentro APP_SHELL, CACHE_NAME sale — altrimenti il telefono
 * continua a servire la copia vecchia e la correzione non arriva. Era scritta
 * e basta: il commit 3fe51c5 ha cambiato `compagnie-data.js` (che sta nella
 * shell) senza alzarla, e nessun banco l'ha visto.
 *
 * COME FA. `sw.js` porta una riga
 *     var SHELL_IMPRONTA = "<CACHE_NAME>:<sha256 dei file della shell>";
 * Il banco ricalcola l'impronta dai file veri (fine riga normalizzati: git li
 * normalizza, e un CRLF non e' un cambiamento) e dice NO se:
 *   - i file sono cambiati e l'impronta no  → «alza CACHE_NAME, poi --scrivi»;
 *   - l'impronta e' stata scritta per un CACHE_NAME che non e' quello di oggi.
 * `--scrivi` RIFIUTA di aggiornare l'impronta se i file sono cambiati ma
 * CACHE_NAME e' ancora quello scritto nell'impronta: cosi' non si puo' far
 * tacere il banco senza fare la cosa che chiede.
 */
"use strict";
var fs = require("fs");
var crypto = require("crypto");
var path = require("path");
process.chdir(path.join(__dirname, ".."));

var SCRIVI = process.argv.indexOf("--scrivi") >= 0;
var sw = fs.readFileSync("sw.js", "utf8");
var nome = (sw.match(/var CACHE_NAME = "([^"]+)";/) || [])[1];
if (!nome) { console.log("  ✗ CACHE_NAME non trovato in sw.js"); process.exit(1); }
var blocco = (sw.match(/var APP_SHELL = \[([\s\S]*?)\];/) || [])[1];
if (!blocco) { console.log("  ✗ APP_SHELL non trovato in sw.js"); process.exit(1); }
// Solo le stringhe fuori dai commenti.
var senzaCommenti = blocco.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
var files = (senzaCommenti.match(/"([^"]+)"/g) || []).map(function (x) { return x.slice(1, -1); });
if (!files.length) { console.log("  ✗ APP_SHELL vuota?"); process.exit(1); }

var h = crypto.createHash("sha256");
var mancanti = [];
files.forEach(function (f) {
  var vero = (f === "./") ? "index.html" : f;
  if (!fs.existsSync(vero)) { mancanti.push(f); return; }
  var b = fs.readFileSync(vero);
  if (/\.(html|js|json|css|txt|xml)$/.test(vero)) b = Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  h.update(f + "\0"); h.update(b); h.update("\0");
});
if (mancanti.length) { console.log("  ✗ file della shell che non esistono: " + mancanti.join(", ")); process.exit(1); }
var impronta = h.digest("hex").slice(0, 16);
var scritta = (sw.match(/var SHELL_IMPRONTA = "([^"]*)";/) || [])[1];

console.log("\n  sw.js  CACHE_NAME " + nome + "  ·  " + files.length + " file nella shell");
if (SCRIVI) {
  if (scritta === undefined) { console.log("  ✗ manca la riga `var SHELL_IMPRONTA = \"...\";` in sw.js"); process.exit(1); }
  var parti = scritta.split(":");
  // Stesso nome e file diversi: si puo' solo se QUESTO CACHE_NAME non e' mai
  // andato online (lavoro in piu' passi prima di una pubblicazione). Lo si
  // dichiara a mano, perche' da qui non si vede cosa c'e' online.
  var nonPubblicata = process.argv.indexOf("--versione-non-pubblicata") >= 0;
  if (parti[1] && parti[1] !== impronta && parti[0] === nome && !nonPubblicata) {
    console.log("  ✗ i file della shell sono cambiati ma CACHE_NAME e' ancora " + nome + ".");
    console.log("    Prima si alza CACHE_NAME (e CACHE_PARENT), poi si riscrive l'impronta.");
    console.log("    Se " + nome + " non e' MAI stato pubblicato: --scrivi --versione-non-pubblicata");
    process.exit(1);
  }
  var nuovo = sw.replace(/var SHELL_IMPRONTA = "[^"]*";/, 'var SHELL_IMPRONTA = "' + nome + ":" + impronta + '";');
  fs.writeFileSync("sw.js", nuovo);
  console.log("  impronta scritta: " + nome + ":" + impronta + "\n");
  process.exit(0);
}
if (scritta === undefined) { console.log("  ✗ manca la riga `var SHELL_IMPRONTA` in sw.js"); process.exit(1); }
var p = scritta.split(":");
var errori = 0;
if (p[1] !== impronta) {
  console.log("  ✗ i file della shell sono cambiati dall'ultima impronta (" + p[1] + " → " + impronta + ").");
  console.log("    Senza un CACHE_NAME nuovo i telefoni continuano a servire la copia vecchia.");
  console.log("    Alza CACHE_NAME e CACHE_PARENT in sw.js, poi: node tests/controlla-cache.js --scrivi");
  errori++;
} else if (p[0] !== nome) {
  console.log("  ✗ l'impronta e' stata scritta per " + p[0] + ", ma CACHE_NAME e' " + nome + ".");
  console.log("    node tests/controlla-cache.js --scrivi");
  errori++;
} else {
  console.log("  ✓ i file della shell sono quelli dell'impronta di " + nome);
}
console.log("");
process.exit(errori ? 1 : 0);
