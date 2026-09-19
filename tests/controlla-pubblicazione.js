#!/usr/bin/env node
/* controlla-pubblicazione.js — cosa va sul sito, e cosa no.
 *
 *   node tests/controlla-pubblicazione.js
 *
 * PERCHE' ESISTE. (19/09/2026, audit H5/H6.) GitHub Pages pubblicava tutto il
 * repository: diari interni, banchi, regole, e un'app vecchia in `archive/`
 * collegata al Firebase di produzione. `_config.yml` adesso dice a Jekyll cosa
 * lasciare fuori. Questo controllo tiene fermi i due versi:
 *   - le cartelle e i file interni sono esclusi;
 *   - NESSUN file che il sito usa e' escluso (sitemap, shell del service
 *     worker, manifest, pagine, icone): un'esclusione sbagliata spegnerebbe
 *     un pezzo del sito senza nessun errore;
 *   - non c'e' `.nojekyll`, che spegnerebbe `_config.yml` e renderebbe di nuovo
 *     pubblico tutto.
 */
"use strict";
var fs = require("fs"), path = require("path");
process.chdir(path.join(__dirname, ".."));
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
console.log("\n  COSA VA SUL SITO\n");
var cfg = fs.existsSync("_config.yml") ? fs.readFileSync("_config.yml", "utf8") : "";
prova("_config.yml esiste", !!cfg);
var esclusi = [];
var dentro = false;
cfg.split(/\r?\n/).forEach(function (r) {
  if (/^exclude:\s*$/.test(r)) { dentro = true; return; }
  if (dentro) {
    var m = r.match(/^\s+-\s+(.+?)\s*$/);
    if (m) esclusi.push(m[1].replace(/^["']|["']$/g, ""));
    else if (/^\S/.test(r)) dentro = false;
  }
});
function escluso(f) {
  return esclusi.some(function (e) { return e.slice(-1) === "/" ? f.indexOf(e) === 0 : f === e; });
}
prova("non c'e' .nojekyll (spegnerebbe _config.yml)", !fs.existsSync(".nojekyll"));
["docs/", "tests/", "tools/", "archive/", "functions/", "firestore.rules", "storage.rules", "pubblica.sh", "package.json"].forEach(function (x) {
  prova("interno, fuori dal sito: " + x, escluso(x.slice(-1) === "/" ? x + "qualcosa" : x));
});

// Tutto quello che il sito usa davvero.
var usati = {};
var sitemap = fs.readFileSync("sitemap.xml", "utf8");
(sitemap.match(/<loc>[^<]+<\/loc>/g) || []).forEach(function (l) {
  var p = l.replace(/<\/?loc>/g, "").replace(/^https?:\/\/[^/]+\/?/, "");
  usati[p === "" ? "index.html" : p] = "sitemap";
});
var sw = fs.readFileSync("sw.js", "utf8");
var shell = (sw.match(/var APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || "";
(shell.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").match(/"([^"]+)"/g) || []).forEach(function (x) {
  var f = x.slice(1, -1); usati[f === "./" ? "index.html" : f] = "sw.js";
});
JSON.parse(fs.readFileSync("manifest.json", "utf8")).icons.forEach(function (i) { usati[i.src] = "manifest"; });
["sw.js", "firebase-messaging-sw.js", "manifest.json", "CNAME", "robots.txt", "sitemap.xml", "favicon.ico",
 "marketplace.html", "privacy.html", "termini.html", "elimina-account.html"].forEach(function (f) { usati[f] = "sito"; });
var tolti = Object.keys(usati).filter(escluso);
prova("nessun file del sito e' escluso (" + Object.keys(usati).length + " controllati)", tolti.length === 0, tolti.join(", "));
var mancanti = Object.keys(usati).filter(function (f) { return !fs.existsSync(f); });
prova("e tutti esistono", mancanti.length === 0, mancanti.join(", "));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
