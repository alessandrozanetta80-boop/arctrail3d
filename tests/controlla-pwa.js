#!/usr/bin/env node
/* controlla-pwa.js — le intestazioni che fanno dell'app una app sul telefono.
 *
 *   node tests/controlla-pwa.js
 *   APP=… INDEX=… MANIFEST=… node tests/controlla-pwa.js   # sabotaggio
 *
 * PERCHE' ESISTE. (19/09/2026, audit M3/M4/M9/S5, blocco 7.) Sono righe di
 * configurazione, e una configurazione sbagliata non da' errori: si vede solo
 * sul telefono. Quindi qui un controllo sul testo e' il controllo giusto.
 *   - lo zoom con due dita non e' bloccato (niente maximum-scale=1);
 *   - il doppio tocco sui tasti del punteggio non zooma (touch-action);
 *   - il tema chiaro e il «sole» chiedono `only light` (niente scuro forzato
 *     di Chrome / Samsung sui cinque tasti);
 *   - l'icona per iOS e' quella da 180x180, e il file e' davvero 180x180;
 *   - manifest e meta dicono lo stesso colore (niente lampo scuro all'avvio),
 *     il manifest ha la lingua, e le icone che nomina esistono;
 *   - nella vetrina le foto sotto la piega si caricano quando servono.
 */
"use strict";
var fs = require("fs"), path = require("path");
process.chdir(path.join(__dirname, ".."));
var APP = fs.readFileSync(process.env.APP || "app.html", "utf8");
var INDEX = fs.readFileSync(process.env.INDEX || "index.html", "utf8");
var MAN = JSON.parse(fs.readFileSync(process.env.MANIFEST || "manifest.json", "utf8"));
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function pngMisure(f) {
  var b = fs.readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

console.log("\n  L'APP SUL TELEFONO\n");
var vp = (APP.match(/<meta name="viewport" content="([^"]+)"/) || [])[1] || "";
prova("lo zoom con due dita non e' bloccato", vp && !/maximum-scale\s*=\s*1(\.0)?\b/.test(vp) && !/user-scalable\s*=\s*(no|0)/.test(vp), vp);
prova("il doppio tocco sui tasti del punteggio non zooma",
      /\.tastiera \.quick-btn\{[^}]*touch-action:\s*manipulation/.test(APP));
prova("tema chiaro: niente scuro forzato (color-scheme: only light)",
      /:root, body\.theme-light\{[\s\S]{0,400}?color-scheme:\s*only light/.test(APP));
prova("tema «sole»: niente scuro forzato", /body\.theme-sole\{\s*color-scheme:\s*only light/.test(APP));

var ati = APP.match(/<link rel="apple-touch-icon" href="([^"]+)"( sizes="(\d+)x(\d+)")?/);
prova("icona per iOS dichiarata da 180x180", !!(ati && ati[3] === "180"), ati ? ati[0] : "manca");
if (ati && fs.existsSync(ati[1])) {
  var m = pngMisure(ati[1]);
  prova("e il file e' davvero 180x180", m.w === 180 && m.h === 180, m.w + "x" + m.h);
} else prova("e il file esiste", false, ati && ati[1]);

/* ══ LE FOTO DEL MERCATINO SI CANCELLANO DAVVERO ══════════════════════════
   (20/09/2026, audit SEC-10 / H1.) `wipeAccountData` aveva un ramo
   `if(firebase.storage)` che non e' mai stato vero: `storage-compat` non e' fra
   gli SDK in cima al file. Un `if` che protegge da una libreria mancante,
   quando la libreria manca sempre, e' codice spento — e intanto
   `elimina-account.html` promette per iscritto anche le foto.
   Qui si chiedono tutte e due le cose insieme, perche' sono in tensione: la
   libreria DEVE arrivare quando si cancella un account, e NON deve arrivare
   all'avvio (sarebbe un sesto download a ogni apertura per una cosa che si fa
   una volta nella vita). */
console.log("\n  LE FOTO DEL MERCATINO, ALL'ELIMINAZIONE ACCOUNT\n");
var sdkInTesta = (APP.match(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+"/g) || []);
prova("storage-compat NON e' fra gli SDK caricati all'avvio",
      !sdkInTesta.some(function (x) { return /storage-compat/.test(x); }),
      sdkInTesta.length + " SDK in testa");
prova("ma si carica quando serve (caricaStorageSDK)",
      /function caricaStorageSDK\(\)/.test(APP) && /firebasejs\/[0-9.]+\/firebase-storage-compat\.js/.test(APP));
prova("e la stessa versione degli altri SDK",
      (function () {
        var v = (APP.match(/firebasejs\/([0-9.]+)\/firebase-app-compat/) || [])[1];
        var vs = (APP.match(/firebasejs\/([0-9.]+)\/firebase-storage-compat/) || [])[1];
        return !!v && v === vs;
      })(),
      (APP.match(/firebasejs\/([0-9.]+)\/firebase-storage-compat/) || [])[1] || "assente");
prova("le foto si cancellano dentro wipeAccountData",
      /caricaStorageSDK\(\)[\s\S]{0,400}?storage\(\)\.ref\("market\/"\s*\+\s*uid\)[\s\S]{0,200}?listAll\(\)/.test(APP));
prova("se la libreria non arriva NON si tace: va nel registro degli errori",
      /caricaStorageSDK\(\)[\s\S]{0,300}?logError\("wipe\/foto-mercatino"/.test(APP));
prova("il ramo morto `if(firebase.storage)` non c'e' piu'",
      !/if\(firebase\.storage\)\s*\{?\s*jobs\.push/.test(APP));

/* ══ APP CHECK: PRONTO, NON ACCESO ════════════════════════════════════════
   (20/09/2026, audit SEC-14.) Due cose che vanno chieste INSIEME, perche' una
   senza l'altra e' un guaio: il codice deve esserci (se no non si potra' mai
   accendere), e l'obbligo NON deve essere acceso (accenderlo prima che i
   telefoni mandino il timbro vuol dire spegnere l'app a tutti).
   Con la chiave ancora da incollare, l'app non deve scaricare niente in piu'
   e non deve cambiare di un millisecondo l'avvio. */
console.log("\n  APP CHECK\n");
prova("il codice per App Check c'e' (attivaAppCheck)",
      /function attivaAppCheck\(\)/.test(APP) && /firebase-app-check-compat\.js/.test(APP));
prova("si chiama subito dopo initializeApp, non dopo",
      /firebase\.initializeApp\(firebaseConfig\);\s*\n\s*attivaAppCheck\(\);/.test(APP));
var chiave = (APP.match(/var APP_CHECK_SITE_KEY = "([^"]*)"/) || [])[1];
prova("la site key e' ancora da incollare (l'obbligo non e' attivo)",
      chiave !== undefined && /^INCOLLA/.test(chiave), String(chiave).slice(0, 24));
prova("e finche' e' cosi' l'SDK NON si scarica",
      /if\(!appCheckConfigurato\(\)\) return;/.test(APP));
prova("l'SDK di App Check non e' fra quelli caricati all'avvio",
      !/<script src="[^"]*app-check-compat[^"]*"/.test(APP));
var FN = fs.readFileSync("functions/index.js", "utf8");
prova("le Functions hanno l'interruttore, e sta su «spento»",
      /const APP_CHECK_OBBLIGATORIO = false;/.test(FN));
prova("ed e' collegato a sendNotification",
      /enforceAppCheck:\s*APP_CHECK_OBBLIGATORIO/.test(FN));

console.log("\n  IL MANIFEST\n");
var meta = (APP.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
prova("theme_color del manifest uguale a quello della pagina", (MAN.theme_color || "").toLowerCase() === (meta || "").toLowerCase(),
      MAN.theme_color + " / " + meta);
prova("background_color uguale (niente lampo di un altro colore all'avvio)",
      (MAN.background_color || "").toLowerCase() === (MAN.theme_color || "").toLowerCase(), MAN.background_color);
prova("il manifest dice la lingua", !!MAN.lang, MAN.lang);
var icone = (MAN.icons || []).filter(function (i) { return !fs.existsSync(i.src); });
prova("le icone del manifest esistono", (MAN.icons || []).length >= 2 && icone.length === 0, icone.map(function (i) { return i.src; }).join(","));
prova("start_url punta all'app", /app\.html/.test(MAN.start_url || ""), MAN.start_url);

console.log("\n  LA VETRINA\n");
var img = INDEX.match(/<img [^>]*>/g) || [];
var sotto = img.slice(1);
var pigre = sotto.filter(function (x) { return /loading="lazy"/.test(x); });
prova("la foto in cima si carica subito", img.length > 0 && !/loading="lazy"/.test(img[0]));
prova("le foto sotto la piega si caricano quando servono (" + pigre.length + "/" + sotto.length + ")",
      sotto.length > 0 && pigre.length === sotto.length);

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
