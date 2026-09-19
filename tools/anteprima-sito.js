#!/usr/bin/env node
/* anteprima-sito.js — il sito com'e' davvero, prima di pubblicarlo.
 *
 *   node tools/anteprima-sito.js            # apre su http://127.0.0.1:8787
 *   node tools/anteprima-sito.js 9000       # su un'altra porta
 *
 * PERCHE' ESISTE. (20/09/2026, risanamento notturno.) Qui il deposito E' il
 * sito: GitHub Pages pubblica la radice del ramo, e quello che si vede
 * aprendo `app.html` col doppio clic NON e' quello che vedra' la gente —
 * `file://` non ha origine, quindi niente service worker, niente `fetch` e
 * niente cassa. Cioe' proprio i pezzi che in bosco tengono in piedi l'app.
 *
 * NON c'e' una cartella `public/`, ed e' una scelta: spostare il sito dentro
 * una cartella vorrebbe dire cambiare il ramo pubblicato, rifare tutti i
 * percorsi (`/app.html` e' scritto nel manifest, nelle notifiche e nei link
 * che la gente ha gia' salvato in Home) e rinunciare alla regola piu' utile
 * che il progetto abbia — «si pubblica quello che si e' provato, file per
 * file». Il rischio che una cartella unica eviterebbe — mandare in rete
 * diari, banchi o l'archivio — qui e' chiuso da `_config.yml`, che dice a
 * Jekyll cosa NON servire, e da `tests/controlla-pubblicazione.js`, che
 * verifica quell'elenco a ogni giro.
 *
 * Questo strumento serve la radice ESATTAMENTE come Pages: le stesse regole
 * di esclusione di `_config.yml`, `/` che diventa `index.html`, i tipi giusti
 * e un 404 dove Pages darebbe 404. Se una cosa funziona qui e non online, la
 * differenza non e' l'anteprima.
 */
"use strict";
var fs = require("fs"), path = require("path"), http = require("http");

var RADICE = process.cwd();
var PORTA = parseInt(process.argv[2], 10) || 8787;

/* Le esclusioni si LEGGONO da _config.yml: due elenchi che si allontanano
   sono peggio di nessun elenco. */
function esclusi() {
  var fuori = [];
  if (!fs.existsSync("_config.yml")) return fuori;
  var dentro = false;
  fs.readFileSync("_config.yml", "utf8").split(/\r?\n/).forEach(function (riga) {
    if (/^exclude:/.test(riga)) { dentro = true; return; }
    if (dentro) {
      var m = /^\s+-\s+(.+?)\s*$/.exec(riga);
      if (m) fuori.push(m[1].replace(/^["']|["']$/g, ""));
      else if (/^\S/.test(riga)) dentro = false;
    }
  });
  return fuori;
}
var FUORI = esclusi();
function escluso(rel) {
  rel = rel.replace(/^\/+/, "");
  return FUORI.some(function (x) {
    if (x.slice(-1) === "/") return rel === x.slice(0, -1) || rel.indexOf(x) === 0;
    return rel === x || rel.indexOf(x + "/") === 0;
  });
}

var TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

var server = http.createServer(function (req, res) {
  var rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  var f = path.join(RADICE, rel);
  var dentro = f.startsWith(RADICE + path.sep) || f === RADICE;
  if (!dentro || escluso(rel) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(escluso(rel) ? "404 — questo file non finisce sul sito (_config.yml)\n" : "404\n");
    console.log("  404  " + rel + (escluso(rel) ? "   (escluso da _config.yml)" : ""));
    return;
  }
  var corpo = fs.readFileSync(f);
  res.writeHead(200, { "Content-Type": TIPI[path.extname(f).toLowerCase()] || "application/octet-stream",
                       "Cache-Control": "no-cache",
                       /* Pages li manda su tutto: senza, il service worker si
                          comporta diversamente da come si comportera' online. */
                       "X-Content-Type-Options": "nosniff" });
  res.end(corpo);
  console.log("  200  " + rel + "   " + Math.round(corpo.length / 102.4) / 10 + " KB");
});

server.listen(PORTA, "127.0.0.1", function () {
  console.log("\n  IL SITO, COME LO VEDRA' LA GENTE");
  console.log("  http://127.0.0.1:" + PORTA + "/           la vetrina");
  console.log("  http://127.0.0.1:" + PORTA + "/app.html   l'app (service worker acceso)");
  console.log("\n  " + FUORI.length + " voci escluse da _config.yml: chiedendole si ottiene 404.");
  console.log("  Ctrl-C per chiudere.\n");
});
