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

var FILE = process.argv[2] || "app.html";
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

/* ══════════════════════════════════════════════════════════════════════════
   ANCHE IL FOGLIO DI STILE E' GRAMMATICA. (23/08/2026.)

   Il 23/08 una variabile e' finita FUORI da ogni blocco:

       --porta-h:calc(var(--s-7) + var(--s-6));
       .menu-btn{ padding:...; margin-bottom:...; text-align:left; }

   Sembra innocuo. Non lo e'. Al primo livello il browser legge tutto fino
   alla prima graffa come UN SELETTORE — quindi il selettore diventa
   `--porta-h:calc(...); .menu-btn`, che non e' valido, e la regola viene
   buttata via INTERA. Non la dichiarazione di troppo: la regola dopo.

   Sono sparite in un colpo l'imbottitura, il margine fra le porte e
   l'allineamento a sinistra dei tre tasti. Alessandro se n'e' accorto
   guardando l'app; qui dentro tutti e ventitre i banchi avevano detto di si',
   perche' nessuno guardava il foglio come si guarda un copione.

   *Un CSS rotto non da' errore da nessuna parte: si limita a non esserci.*

   LA DOMANDA E' SEMPLICE: al primo livello, il testo fra la fine di un blocco
   e la graffa successiva e' un selettore, e un selettore non contiene MAI un
   punto e virgola. Se ce n'e' uno, li' c'e' una dichiarazione orfana.
   ══════════════════════════════════════════════════════════════════════════ */
/* TUTTI i fogli, non il primo. (27/08/2026, C13.) Qui c'era un `match`
   singolo su `<style>` nudo: si fermava al primo blocco e non riconosceva
   nemmeno quelli con un attributo, tipo `<style id="home-compatta-v2">`. In
   `app.html` restavano fuori tre blocchi e 246 righe. *Una dichiarazione
   orfana non da' errore da nessuna parte: si limita a far sparire la regola
   dopo di lei. Un controllo che non la guarda non e' meno silenzioso di lei.*
   Adesso stampa anche la RIGA, che prima non diceva. */
var fogli = [], reStile = /<style\b[^>]*>([\s\S]*?)<\/style>/g, mS;
while ((mS = reStile.exec(s)) !== null) fogli.push({ testo: mS[1], index: mS.index });

if (fogli.length) {
  var orfane = [];
  fogli.forEach(function (foglio) {
    var css = foglio.testo.replace(/\/\*[\s\S]*?\*\//g, " ");   // via i commenti
    var riga0 = s.slice(0, foglio.index).split("\n").length;
    var liv = 0, da = 0;
    for (var i = 0; i < css.length; i++) {
      var ch = css[i];
      if (ch === "{") {
        if (liv === 0) {
          var prelude = css.slice(da, i);
          if (prelude.indexOf(";") !== -1)
            orfane.push({ riga: riga0 + css.slice(0, da).split("\n").length - 1,
                          testo: prelude.replace(/\s+/g, " ").trim().slice(0, 90) });
        }
        liv++;
      } else if (ch === "}") {
        liv--;
        if (liv === 0) da = i + 1;
        if (liv < 0) liv = 0;
      }
    }
  });
  if (orfane.length) {
    guai++;
    console.log("\n  \u2717 " + orfane.length + " dichiarazione/i FUORI da un blocco, in " +
                fogli.length + " foglio/i:");
    orfane.forEach(function (o) {
      console.log("      riga " + o.riga + ": \"" + o.testo + "\"");
      console.log("      \u2192 il browser butta via la regola che segue, tutta.");
    });
  } else {
    console.log("  \u2713 i " + fogli.length + " fogli di stile: nessuna dichiarazione fuori da un blocco");
  }
}

console.log(guai ? "\n  " + guai + " copione/i non si compila/no.\n"
                 : "\n  I " + quanti + " copioni sono grammatica.\n");
process.exitCode = guai ? 1 : 0;
