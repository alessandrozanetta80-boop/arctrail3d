#!/usr/bin/env node
/* controlla-contrasto.js — il testo si legge sopra il suo fondo, nei tre temi.
 *
 *   node controlla-contrasto.js [index.html]
 *
 * PERCHE ESISTE. (22/08/2026, il giorno in cui il verde e cambiato.) Cambiare
 * un colore primitivo e la modifica piu innocua che esista da guardare e la
 * piu pericolosa da fare: non rompe niente, non da nessun errore, e la pagina
 * dopo e bella uguale. Quello che cambia e QUANTO SI LEGGE, e quello si vede
 * solo al sole, in piedi, quando ormai si e in mezzo a un percorso.
 *
 * Il verde salvia provato quel giorno (#86976B) sarebbe passato da qualunque
 * banco: colore valido, regole valide, app funzionante. Col bianco sopra
 * faceva 3,16 — cioe una scritta che a mezzogiorno non si legge.
 *
 * COSA MISURA. Le coppie fondo/inchiostro che nell'app portano DAVVERO del
 * testo, in tutti e tre i temi. La soglia e 4,5 (AA per testo normale): sotto,
 * non passa. Non e una regola di stile: e la differenza fra leggere un numero
 * e indovinarlo.
 *
 * NON MISURA la bellezza, e nemmeno il testo grande — per cui basterebbe 3.
 * Se un giorno servira distinguere, la soglia diventera due.
 */
var fs = require("fs");
var SRC_GREZZO = fs.readFileSync(process.argv[2] || "app.html", "utf8");
// I COMMENTI VIA. (22/08/2026.) Questo banco cerca dichiarazioni nel foglio,
// e un esempio scritto dentro un commento gli sembrava una dichiarazione
// vera: e' costato un rosso falso. La direzione opposta e' peggio — una
// riga sbagliata che si nasconde dietro della prosa e passa.
var SRC = SRC_GREZZO.replace(/\/\*[\s\S]*?\*\//g, " ");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

// I primitivi, letti dal file: se qualcuno cambia un esadecimale, questo banco
// misura quello nuovo. E' l'unico posto in cui adattarsi al file e giusto —
// qui il file E' la domanda.
var PRIM = {};
// Il nome puo' avere piu' di due pezzi (`--punto-ss-scuro`): la regex di
// prima si fermava a due e quei cinque risultavano «spariti».
(SRC.match(/--[a-z0-9-]+:\s*#[0-9A-Fa-f]{6}/g) || []).forEach(function (r) {
  var p = r.split(":"); PRIM[p[0].trim()] = p[1].trim();
});

function tinta(v) {
  var giri = 0;
  while (/^var\(/.test(v) && giri++ < 8) v = PRIM[v.replace(/^var\(|\)$/g, "")] || "";
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : null;
}
function lum(h) {
  var c = [1, 3, 5].map(function (i) {
    var x = parseInt(h.substr(i, 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function rapporto(a, b) {
  var x = lum(a), y = lum(b);
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
}

// I tre temi, presi dalle tre righe che dichiarano --brand. L'ordine e quello
// del file: chiaro, scuro, Sole.
var righe = SRC.match(/--brand:var\(--[a-z0-9-]+\); --brand-soft:var\(--[a-z0-9-]+\); --brand-ink:var\(--[a-z0-9-]+\);/g) || [];
var NOMI = ["chiaro", "scuro", "Sole"];

console.log("\n  IL TESTO SI LEGGE SOPRA IL VERDE DEL MARCHIO");
prova("i tre temi dichiarano tutti il loro marchio", righe.length === 3, righe.length + "");

righe.forEach(function (r, i) {
  var brand = tinta("var(" + r.match(/--brand:var\((--[a-z0-9-]+)\)/)[1] + ")");
  var ink = tinta("var(" + r.match(/--brand-ink:var\((--[a-z0-9-]+)\)/)[1] + ")");
  if (!brand || !ink) { prova("tema " + NOMI[i] + ": i colori si risolvono", false, brand + " / " + ink); return; }
  var c = rapporto(brand, ink);
  prova("tema " + NOMI[i] + ": " + brand + " con " + ink + " sopra → " + c,
    c >= 4.5, "sotto 4,5: al sole non si legge");
});

/* E L'ARGILLA, che il 22/08 e' diventata un arancione a saturazione piena.
   E' la tinta piu' facile da sbagliare dell'app: un arancione acceso sembra
   sempre leggibile perche' e' LUMINOSO, e la luminosita' e' esattamente il
   motivo per cui il bianco sopra sparisce. */
console.log("\n  E IL TESTO SI LEGGE SOPRA L'ARGILLA");
var argille = SRC.match(/--clay:var\(--[a-z0-9-]+\); --clay-ink:var\(--[a-z0-9-]+\);/g) || [];
prova("i tre temi dichiarano tutti la loro argilla", argille.length === 3, argille.length + "");
argille.forEach(function (r, i) {
  var c1 = tinta("var(" + r.match(/--clay:var\((--[a-z0-9-]+)\)/)[1] + ")");
  var c2 = tinta("var(" + r.match(/--clay-ink:var\((--[a-z0-9-]+)\)/)[1] + ")");
  if (!c1 || !c2) { prova("tema " + NOMI[i] + ": i colori si risolvono", false, c1 + " / " + c2); return; }
  var c = rapporto(c1, c2);
  prova("tema " + NOMI[i] + ": " + c1 + " con " + c2 + " sopra → " + c,
    c >= 4.5, "sotto 4,5: al sole non si legge");
});

/* IL TESTO SUL FOGLIO. Tre gradini di grigio su tre superfici: e' la coppia
   piu' numerosa dell'app e la meno guardata, perche' funziona da sempre.
   Il giorno in cui la scala dei neutri viene ruotata — ed e' successo il
   22/08 — cambia la luminanza di ogni gradino insieme alla tinta, e non lo
   dice nessuno. */
console.log("\n  E SUL FOGLIO");
var temi = SRC.match(/--text-1:var\(--[a-z0-9-]+\); --text-2:var\(--[a-z0-9-]+\); --text-3:var\(--[a-z0-9-]+\);/g) || [];
var superfici = SRC.match(/--surface:var\(--[a-z0-9-]+\); --surface-1:var\(--[a-z0-9-]+\); --surface-2:var\(--[a-z0-9-]+\);/g) || [];
prova("i tre temi dichiarano testo e superfici", temi.length === 3 && superfici.length === 3,
      temi.length + " / " + superfici.length);
temi.forEach(function (t, i) {
  if (!superfici[i]) return;
  // Il foglio e' `--surface-1`: e' quello su cui sta il testo, non `--surface`,
  // che e' la fascia sotto la colonna.
  var foglio = tinta("var(" + superfici[i].match(/--surface-1:var\((--[a-z0-9-]+)\)/)[1] + ")");
  [1, 2, 3].forEach(function (n) {
    var col = tinta("var(" + t.match(new RegExp("--text-" + n + ":var\\((--[a-z0-9-]+)\\)"))[1] + ")");
    if (!foglio || !col) return;
    var c = rapporto(foglio, col);
    // Il terzo grigio e' per le righe di servizio, non per il testo da
    // leggere: 4,5 vale per tutti e tre lo stesso, perche' «di servizio» e'
    // una decisione nostra e la vista di chi legge non la conosce.
    prova("tema " + NOMI[i] + ": testo " + n + " sul foglio → " + c, c >= 4.5,
      col + " su " + foglio);
  });
});

/* I CINQUE TASTI NON SI MUOVONO. (22/08/2026, dopo un errore vero: l'argilla
   e' diventata #FF4D00 per una scelta estetica e il tasto del superspot e'
   cambiato con lei, perche' ci pescava dentro. Nessun banco lo disse.)
   Qui i numeri sono scritti a mano e non si leggono dal file: e' l'unica
   prova della sequenza che DEVE essere sorda a quello che il foglio dice
   oggi. Se un giorno cambiano davvero, si cambiano qui — a mano, sapendo che
   si sta toccando un comando che la gente preme senza guardare. */
console.log("\n  I CINQUE TASTI DEL PUNTEGGIO SONO FERMI");
/* DUE NUMERI SONO CAMBIATI DAVVERO. (25/08/2026.) Il 24/08 sagoma e
   perfetto sono stati schiariti nel foglio — 3,98 e 4,75 con l'inchiostro
   scuro sopra, cioe' sotto soglia il primo e al limite il secondo — e questo
   banco e' rimasto rosso da allora. *Un banco rosso per un motivo giusto
   smette di essere letto entro due giorni:* i numeri si aggiornano qui, a
   mano, come dice la nota sopra, e non si alza mai il foglio per far tacere
   il banco. Vecchi: #5C7794 e #D8574E. */
var FERMI = { "punto-ss": "#E8722F", "punto-spot": "#6FBF3F", "punto-sag": "#6F89A5",
              "punto-perfetto": "#DA5F56", "punto-zero": "#D3D7CB",
              "punto-ss-scuro": "#C1571F", "punto-spot-scuro": "#3C6D42",
              "punto-sag-scuro": "#334657", "punto-perfetto-scuro": "#A81319",
              "punto-zero-scuro": "#3A403A" };
Object.keys(FERMI).forEach(function (k) {
  var v = PRIM["--" + k];
  prova(k + " e' ancora " + FERMI[k], (v || "").toUpperCase() === FERMI[k], v || "sparito");
});
// E devono restare SLEGATI dalle famiglie, o il difetto torna identico: non
// basta che oggi il colore sia giusto, deve essere impossibile che una
// modifica alla tavolozza lo trascini.
var righeTasti = SRC.match(/--score-ss:var\(--[a-z0-9-]+\)/g) || [];
var agganciati = righeTasti.filter(function (r) { return r.indexOf("--punto-") < 0; });
prova("nessuno dei tre temi aggancia i tasti a una famiglia",
  agganciati.length === 0, agganciati.join(" · "));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
