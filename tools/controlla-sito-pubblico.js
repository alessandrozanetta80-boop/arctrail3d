#!/usr/bin/env node
/* controlla-sito-pubblico.js — il sito VERO: i file interni rispondono 404,
 * quelli del sito 200. Solo richieste GET, nessuna scrittura.
 *
 *   node tools/controlla-sito-pubblico.js                 # arctrail3d.com
 *   node tools/controlla-sito-pubblico.js https://altro   # un altro indirizzo
 *
 * QUANDO. Dopo ogni pubblicazione del sito (GATE 1 del runbook), e quando si
 * vuole sapere com'e' messo oggi. `tests/controlla-pubblicazione.js` dice cosa
 * DOVREBBE uscire, leggendo `_config.yml`; questo guarda cosa esce DAVVERO.
 * Il 20/09 il revert ha tolto `_config.yml` e i diari sono tornati online
 * senza che nessun banco se ne accorgesse: e' la parte che mancava. (21/09/2026)
 *
 * GitHub Pages tiene la cache 10 minuti: subito dopo un push puo' dire ancora
 * il vecchio. Si riprova.
 */
"use strict";
var https = require("https");
var BASE = (process.argv[2] || "https://arctrail3d.com").replace(/\/$/, "");
var INTERNI = ["docs/STATO.md", "docs/REGOLE-LAVORO.md", "tests/controlla-tutto.sh", "tools/anteprima-sito.js",
  "functions/index.js", "functions/package.json", "archive/README.md", "firestore.rules", "storage.rules",
  "pubblica.sh", "package.json", "package-lock.json", "firebase.json", "README.md", ".firebaserc", "_config.yml", ".gitignore"];
var DEL_SITO = ["", "app.html", "sw.js", "firebase-messaging-sw.js", "manifest.json", "compagnie-data.js", "robots.txt",
  "sitemap.xml", "privacy.html", "termini.html", "icon-192.png", "favicon.ico"];
function stato(p) {
  return new Promise(function (res) {
    var r = https.get(BASE + "/" + p, { headers: { "Cache-Control": "no-cache" } }, function (x) { x.resume(); res(x.statusCode); });
    r.on("error", function () { res(0); });
    r.setTimeout(15000, function () { r.destroy(); res(0); });
  });
}
(async function () {
  var ko = 0;
  console.log("\n  " + BASE + "\n\n  INTERNI (devono dire 404)");
  for (var i = 0; i < INTERNI.length; i++) {
    var s = await stato(INTERNI[i]);
    var buono = s === 404;
    if (!buono) ko++;
    console.log("  " + (buono ? "✓" : "✗") + " " + s + "  /" + INTERNI[i]);
  }
  console.log("\n  DEL SITO (devono dire 200)");
  for (var j = 0; j < DEL_SITO.length; j++) {
    var t = await stato(DEL_SITO[j]);
    if (t !== 200) ko++;
    console.log("  " + (t === 200 ? "✓" : "✗") + " " + t + "  /" + DEL_SITO[j]);
  }
  console.log("\n  " + (ko ? ko + " NON VANNO — vedi sopra." : "Tutto come deve essere.") + "\n");
  process.exit(ko ? 1 : 0);
})();
