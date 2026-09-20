#!/usr/bin/env node
/* regole-e-finestra.js — i due banchi che vogliono l'emulatore, in fila, dentro
 * la stessa accensione.
 *
 * Lo chiama `lancia-regole.sh` da dentro `firebase emulators:exec`.
 *
 * PERCHE' ESISTE. (20/09/2026.) L'emulatore Firestore ha una porta sola (8080,
 * da `firebase.json`). `banco-regole` e `banco-finestra` lo vogliono tutti e
 * due: lanciati come due banchi separati, nel giro a sei alla volta partivano
 * insieme e il secondo trovava la porta occupata. Il giro diceva NO, ma non
 * per colpa delle regole — per colpa di due processi che si erano pestati i
 * piedi. Un rosso che non parla della cosa che il banco protegge e' peggio di
 * nessun rosso: insegna a rilanciare invece di leggere.
 *
 * `emulators:exec` NON passa il comando a una shell: gli si da' un eseguibile
 * e i suoi argomenti, quindi `a; b; [ $a -eq 0 ]` finiva tutto nel nome del
 * file. Da qui questo file invece di una riga di shell.
 *
 * I DUE BANCHI GIRANO SEMPRE TUTTI E DUE, anche se il primo dice no: se il
 * secondo non partisse, un guasto nelle regole nasconderebbe la finestra di
 * deploy, che e' una domanda diversa e si paga in un giorno diverso.
 */
"use strict";
var path = require("path");
var { spawnSync } = require("child_process");

process.chdir(path.join(__dirname, ".."));

var banchi = ["tests/banco-regole.js", "tests/banco-finestra.js"];
var caduti = [];

banchi.forEach(function (b) {
  var r = spawnSync(process.execPath, [b], { stdio: "inherit" });
  if (r.status !== 0) caduti.push(b);
});

if (caduti.length) {
  console.log("\n  Hanno detto no: " + caduti.join(", ") + "\n");
  process.exit(1);
}
process.exit(0);
