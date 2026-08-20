/* controlla-sintassi.js — 20/08/2026
 *
 *   node controlla-sintassi.js [index.html]
 *
 * PERCHE' ESISTE. Oggi ho lasciato nel file una parentesi non chiusa:
 * `piu.appendChild(el('...')` senza la seconda tonda. L'app non partiva —
 * niente Home, niente barra, niente allenamenti — e:
 *
 *   - `controlla-base.js` ha detto «la base e' quella giusta»;
 *   - il guardiano dei token ha detto «niente e' peggiorato»;
 *   - i tre banchi jsdom hanno detto tutto a posto.
 *
 * Il primo a dirlo e' stato il nono banco, che apre un browser vero, e l'ha
 * detto in una forma che non sembrava una sintassi rotta: «il gancio del banco
 * non c'e'». *Un errore di grammatica non fa fatica a nascondersi: fa fatica a
 * NON nascondersi, perche' spegne tutto e ogni prova legge lo spegnimento come
 * un difetto suo.*
 *
 * Questo banco costa venti millisecondi e non apre niente: legge i copioni
 * dentro <script> e chiede a Node se sono grammatica. E' il posto giusto per
 * questa domanda perche' e' la prima domanda: se la risposta e' no, tutte le
 * altre nove risposte sono rumore.
 *
 * Uscita 0 = tutto a posto. Uscita 1 = almeno un copione non si compila.
 */
var fs = require("fs");
var vm = require("vm");

var FILE = process.argv[2] || "index.html";
var s = fs.readFileSync(FILE, "utf8");
var re = /<script>([\s\S]*?)<\/script>/g;
var m, quanti = 0, guai = 0;

console.log("\n  " + FILE);

while ((m = re.exec(s))) {
  var corpo = m[1];
  if (corpo.trim().length < 40) continue;   // i copioncini di servizio
  quanti++;
  var riga = s.slice(0, m.index).split("\n").length;
  try {
    new vm.Script(corpo, { filename: "copione@" + riga });
    console.log("  ✓ copione a riga " + riga + " (" + corpo.split("\n").length + " righe)");
  } catch (e) {
    guai++;
    console.log("  ✗ copione a riga " + riga + ": " + e.message);
    var dentro = (String(e.stack).match(/copione@\d+:(\d+)/) || [])[1];
    if (dentro) console.log("      → riga " + (riga + Number(dentro) - 1) + " del file");
  }
}

if (!quanti) {
  console.log("  ✗ nessun copione trovato: il file non e' quello che credo.");
  guai++;
}
console.log(guai ? "\n  " + guai + " copione/i non si compila/no.\n"
                 : "\n  I " + quanti + " copioni sono grammatica.\n");
process.exitCode = guai ? 1 : 0;
