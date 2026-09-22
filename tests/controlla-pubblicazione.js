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

/* ══ L'USCITA DI JEKYLL, SIMULATA SUI FILE VERI ════════════════════════════
   (21/09/2026.) Le prove sopra guardano un elenco scritto a mano: dicono che
   `docs/` e' escluso, non che NIENTE di interno esce. Il 20/09 il revert ha
   tolto `_config.yml` e il sito ha ricominciato a servire diari, banchi,
   regole e Functions — e un file nuovo in radice (un .md di istruzioni, un
   .json di configurazione) uscirebbe anche con `_config.yml` al suo posto,
   perche' l'elenco e' di cosa TOGLIERE, non di cosa METTERE.
   Qui si parte dai file che git traccia, si applicano le regole di Jekyll
   (fuori tutto cio' che comincia per «_», «.», «#», «~», piu' `exclude`) e si
   guarda cosa resta: deve essere tutto roba da sito. Un file che non lo e',
   o un tipo nuovo, fa dire no — e si decide, invece di scoprirlo online. */
console.log("\n  L'USCITA DI JEKYLL, FILE PER FILE\n");
var tracciati = [];
try { tracciati = require("child_process").execSync("git ls-files", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean); } catch (e) {}
prova("git elenca i file tracciati", tracciati.length > 20, tracciati.length + " file");
function jekyllLoTiene(f) {
  if (f.split("/").some(function (p) { return /^[_.#~]/.test(p); })) return false;
  if (/^(node_modules|vendor)\//.test(f) || /^Gemfile/.test(f)) return false;
  return !escluso(f) && !esclusi.some(function (e) { return e.slice(-1) === "/" && f.indexOf(e) === 0; });
}
var pubblicati = tracciati.filter(jekyllLoTiene);
/* Cosa puo' stare sul sito. Pagine, script del sito, immagini, i file che
   il browser o i motori cercano per nome. Il .json ammesso e' uno solo. */
var DA_SITO = /\.(html|js|png|webp|jpg|jpeg|svg|ico|xml|txt|woff2?)$/i;
var PER_NOME = { "CNAME": 1, "manifest.json": 1 };
var estranei = pubblicati.filter(function (f) { return !DA_SITO.test(f) && !PER_NOME[f]; });
prova("sul sito escono solo file da sito (" + pubblicati.length + " pubblicati)", estranei.length === 0, estranei.join(", "));
var INTERNI = /^(docs|tests|tools|archive|functions)\//;
var dentro = pubblicati.filter(function (f) { return INTERNI.test(f); });
prova("nessun file di docs/, tests/, tools/, archive/, functions/", dentro.length === 0, dentro.slice(0, 5).join(", "));
var js = pubblicati.filter(function (f) { return /\.js$/.test(f) && f.indexOf("/") < 0; });
var JS_DEL_SITO = { "sw.js": 1, "firebase-messaging-sw.js": 1, "compagnie-data.js": 1 };
var jsEstranei = js.filter(function (f) { return !JS_DEL_SITO[f]; });
prova("i .js in radice sono solo quelli del sito", jsEstranei.length === 0, jsEstranei.join(", "));
if (process.env.ELENCO) pubblicati.forEach(function (f) { console.log("    " + f); });

/* ══ LE CARTE DI LAVORO LOCALI NON ENTRANO NEL REPOSITORY ══════════════════
   (22/09/2026.) La cartella per Alessandro e ChatGPT, le carte di sessione e
   le istruzioni ricevute stanno nella radice, cioe' nella cartella del sito.
   Fuori da git restano fuori da GitHub e quindi dal sito: e' il .gitignore a
   dirlo, e qui si controlla che lo dica, e che nessuno di quei file sia gia'
   tracciato (un `git add -A` di troppo). */
var gi = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
[["/00-ALESSANDRO-CHATGPT/", "la cartella per Alessandro e ChatGPT"], ["/_SESSIONI-CLAUDE/", "le carte di sessione"],
 ["/ARCTRAIL3D_*.md", "le istruzioni di sessione"], ["/docs/APERTI-*.md", "l'elenco dei punti deboli aperti"],
 ["/docs/AUDIT-*.md", "l'audit tecnico"]].forEach(function (x) {
  prova(".gitignore tiene fuori " + x[1] + " (" + x[0] + ")", gi.split(/\r?\n/).indexOf(x[0]) >= 0);
});
var locali = tracciati.filter(function (f) { return /^(00-ALESSANDRO-CHATGPT|_SESSIONI-CLAUDE)\//.test(f) || /^ARCTRAIL3D_.*\.md$/.test(f) || /^docs\/(APERTI|AUDIT)-/.test(f); });
prova("nessuna carta di lavoro locale e' tracciata", locali.length === 0, locali.join(", "));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
