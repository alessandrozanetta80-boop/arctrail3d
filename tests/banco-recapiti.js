#!/usr/bin/env node
/* banco-recapiti.js — i recapiti delle compagnie diventano link solo se lo sono.
 *
 *   node tests/banco-recapiti.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-recapiti.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit IT-05 / OC-03.) Il link si costruiva
 * incollando il campo: `tel:3473761506(PisiRomano)`, `mailto:a@x.it;b@y.it`,
 * `https://Facebook/Arcieri/Stadium/Besozzo`, `https://no`. Link rotti, e in un
 * caso il nome di una persona scritto sotto il numero.
 *
 * COME FA. Estrae dall'app le funzioni vere (telLink, mailLink, sitoLink e
 * i loro …Testo) e le fa girare su TUTTE le societa' di compagnie-data.js,
 * piu' i casi citati dall'audit. Ogni link prodotto deve essere un link vero.
 */
"use strict";
var fs = require("fs");
var sorgente = fs.readFileSync(process.env.APP || "app.html", "utf8");
var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function estrai(nome) {
  var i = sorgente.indexOf("function " + nome + "(");
  if (i < 0) return null;
  var liv = 0, dentro = false;
  for (var j = i; j < sorgente.length; j++) {
    var c = sorgente[j];
    if (c === "{") { liv++; dentro = true; }
    else if (c === "}") { liv--; if (dentro && liv === 0) return sorgente.slice(i, j + 1); }
  }
  return null;
}
var nomi = ["telTesto", "telLink", "mailTesto", "mailLink", "sitoTesto", "sitoLink"];
var codice = nomi.map(estrai);
console.log("\n  I RECAPITI DELLE COMPAGNIE\n");
if (codice.some(function (x) { return !x; })) {
  prova("l'app ha le funzioni che ripuliscono i recapiti", false, nomi.filter(function (n, i) { return !codice[i]; }).join(", "));
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(1);
}
var F = new Function(codice.join("\n") + "\nreturn {" + nomi.map(function (n) { return n + ":" + n; }).join(",") + "};")();

// I casi citati dall'audit, con la risposta giusta.
prova("«3473761506 (Pisi Romano)» → tel:3473761506, senza il nome",
      F.telLink("3473761506 (Pisi Romano)") === "tel:3473761506" && F.telTesto("3473761506 (Pisi Romano)") === "3473761506");
prova("«— (contattare via mail)» → nessun link", F.telLink("— (contattare via mail)") === "");
prova("«347 9533670» → tel:3479533670", F.telLink("347 9533670") === "tel:3479533670");
prova("«+41 79 123 45 67» → tel:+41791234567", F.telLink("+41 79 123 45 67") === "tel:+41791234567");
prova("due email con «;» → la prima", F.mailLink("a.b@libero.it; c.d@gmail.com") === "mailto:a.b@libero.it");
prova("«Facebook/Arcieri/Stadium/Besozzo» → nessun link", F.sitoLink("Facebook/Arcieri/Stadium/Besozzo") === "");
prova("«Instagram @a.s.d._archery_globe» → nessun link", F.sitoLink("Instagram @a.s.d._archery_globe") === "");
prova("«no» → nessun link", F.sitoLink("no") === "");
prova("«über die Stadt Tharandt» → nessun link", F.sitoLink("über die Stadt Tharandt") === "");
prova("«www. diana-allershausen.de» → https://www.diana-allershausen.de", F.sitoLink("www. diana-allershausen.de") === "https://www.diana-allershausen.de");
prova("un'email nel campo sito → nessun link", F.sitoLink("info@arcieri.fr") === "");
prova("«http://arcieri.it» resta http", F.sitoLink("http://arcieri.it") === "http://arcieri.it");
prova("«www.arcieri.it/chi-siamo» → https://…", F.sitoLink("www.arcieri.it/chi-siamo") === "https://www.arcieri.it/chi-siamo");

// Tutte le societa' vere.
var COMP = new Function(fs.readFileSync("compagnie-data.js", "utf8") + "\nreturn COMPAGNIE;")();
var codici = Object.keys(COMP);
var cattiviTel = [], cattiviMail = [], cattiviSito = [], link = 0;
codici.forEach(function (k) {
  var c = COMP[k];
  var t = F.telLink(c.telefono), m = F.mailLink(c.email), s = F.sitoLink(c.sito);
  if (t) { link++; if (!/^tel:\+?\d{6,}$/.test(t)) cattiviTel.push(k + " " + t); }
  if (m) { link++; if (!/^mailto:[^@\s;,]+@[^@\s;,]+\.[A-Za-z]{2,}$/.test(m)) cattiviMail.push(k + " " + m); }
  if (s) { link++; if (!/^https?:\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/\S*)?$/.test(s)) cattiviSito.push(k + " " + s); }
});
prova("su " + codici.length + " societa', ogni link tel: e' un numero", cattiviTel.length === 0, cattiviTel.slice(0, 3).join(" | "));
prova("ogni link mailto: e' un indirizzo solo", cattiviMail.length === 0, cattiviMail.slice(0, 3).join(" | "));
prova("ogni link al sito e' un indirizzo web", cattiviSito.length === 0, cattiviSito.slice(0, 3).join(" | "));
prova("e i link buoni restano (" + link + ")", link > 3000, String(link));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
