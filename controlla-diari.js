/* ══════════════════════════════════════════════════════════════════════════
   controlla-diari.js — IL BANCO CHE GUARDA I FILE DI TESTO
   ══════════════════════════════════════════════════════════════════════════

   Nasce il 23/08/2026, da un conto fatto per la prima volta.

   I diari pesavano 463 KB. NOTE-DESIGN.md da solo, 7.246 righe. Nessuna chat
   li leggeva: leggeva l'inizio, si faceva un'idea, e lavorava. E l'inizio
   diceva una regola RITIRATA da sei giorni.

   Peggio: le cose aperte stavano in 38 posti diversi — 37 sezioni «Cosa resta
   aperto qui accanto» piu' una lista in fondo. Sei di quelle voci erano gia'
   chiuse da giorni e nessuno se n'era accorto, perche' per accorgersene
   bisognava leggere il codice invece del diario.

   *Un file che nessuno legge per intero e' un file inutile — e uno che si
   legge a meta' e' peggio, perche' la meta' letta si crede.*

   Le quattro domande qui sotto non guardano il contenuto: guardano se i file
   sono ancora in una forma che si puo' leggere. Il contenuto lo guarda una
   persona.

   IL TETTO NON SALE MAI. Come `tetto-token.json`: se STATO.md sfora, si
   accorcia STATO.md — non si alza il numero. Il giorno che si alza il numero
   questo banco ha smesso di servire, ed e' meglio cancellarlo che tenerlo
   acceso e disubbidirgli.
   ══════════════════════════════════════════════════════════════════════════ */

var fs = require("fs");

var TETTO_STATO   = 250;   // righe. STATO.md si legge per intero: deve starci.
var TETTO_REGOLE  = 450;   // righe. Le regole si leggono per intero anche loro.

var fallito = 0;
function no(msg){ console.log("  \u2717 " + msg); fallito = 1; }
function si(msg){ console.log("  \u2713 " + msg); }

function leggi(p){
  try { return fs.readFileSync(p, "utf8"); }
  catch(e){ return null; }
}

console.log("\n  I DIARI SONO ANCORA LEGGIBILI?\n");

/* ── 1. I QUATTRO FILE ESISTONO ────────────────────────────────────────────
   Se STATO.md sparisce, il progetto torna a essere quattrocento kilobyte di
   racconto senza un sommario — cioe' esattamente il guasto del 23/08. */
var attesi = ["STATO.md", "REGOLE-LAVORO.md", "NOTE-DESIGN.md", "NOTE-MERCATINO.md"];
var testi = {};
attesi.forEach(function(f){
  testi[f] = leggi(f);
  if(testi[f] === null) no(f + " non c'e'");
});
if(fallito){
  console.log("\n  Manca un file di testo: gli altri controlli non hanno senso.\n");
  process.exit(1);
}
si("i quattro file di testo ci sono");

/* ── 2. IL TETTO ───────────────────────────────────────────────────────────
   Un file che si legge per intero ha una lunghezza massima, altrimenti la
   promessa «questo si legge tutto» e' finta. */
function righe(t){ return t.split("\n").length; }

var rStato = righe(testi["STATO.md"]);
if(rStato > TETTO_STATO) no("STATO.md: " + rStato + " righe, il tetto e' " + TETTO_STATO +
                           " — si accorcia il file, NON si alza il tetto");
else si("STATO.md sta nel tetto (" + rStato + "/" + TETTO_STATO + ")");

var rReg = righe(testi["REGOLE-LAVORO.md"]);
if(rReg > TETTO_REGOLE) no("REGOLE-LAVORO.md: " + rReg + " righe, il tetto e' " + TETTO_REGOLE);
else si("REGOLE-LAVORO.md sta nel tetto (" + rReg + "/" + TETTO_REGOLE + ")");

/* ── 3. LE COSE APERTE STANNO IN UN POSTO SOLO ─────────────────────────────
   La domanda che il 23/08 nessuno sapeva rispondere: QUANTE cose sono aperte?
   Finche' la risposta e' sparsa in 38 sezioni, non la sa nessuno.

   Negli archivi «Cosa resta aperto» va bene: li' e' il racconto di cosa era
   aperto QUEL GIORNO, ed e' storia. Quello che non deve succedere e' che
   qualcuno ci vada a leggere lo stato di oggi — per questo l'archivio lo dice
   in cima, ed e' quello che si controlla qui. */
["NOTE-DESIGN.md","NOTE-MERCATINO.md"].forEach(function(f){
  var t = testi[f].slice(0, 1200);
  if(!/ARCHIVIO/.test(t)) no(f + ": non dichiara in cima di essere un archivio");
  else if(!/STATO\.md/.test(t)) no(f + ": non manda a STATO.md per lo stato di oggi");
  else si(f + " si dichiara archivio e manda a STATO.md");
});

/* ── 4. L'INDICE NON PUO' DIVERGERE DAL FILE ───────────────────────────────
   L'indice e' generato dalle intestazioni. Se qualcuno aggiunge una sezione
   e non rigenera, l'indice mente — e un indice che mente e' peggio di nessun
   indice, perche' chi lo legge smette di cercare.

   Si contano le sezioni vere e si confronta col numero scritto nell'indice.
   Non i titoli: il NUMERO. Basta a beccare l'aggiunta dimenticata, e non si
   rompe per un accento. */
["NOTE-DESIGN.md","NOTE-MERCATINO.md"].forEach(function(f){
  var t = testi[f];
  var dich = t.match(/## Indice — (\d+) sezioni/);
  if(!dich){ no(f + ": non ha un indice"); return; }
  /* Non si taglia al primo `---`: l'intestazione conservata di
     NOTE-MERCATINO.md ne contiene uno, e il conto veniva sbagliato di una.
     Si contano tutte le sezioni e si toglie quella dell'indice, che e' l'unica
     che non racconta niente. Trovato dal banco stesso alla prima passata. */
  var vere = (t.match(/^## .+$/gm) || [])
             .filter(function(r){ return !/^## Indice/.test(r); }).length;
  if(vere !== Number(dich[1]))
    no(f + ": l'indice dice " + dich[1] + " sezioni, nel file ce ne sono " + vere +
       " — va rigenerato");
  else si(f + ": l'indice combacia col file (" + vere + " sezioni)");
});

/* ── 5. NIENTE REGOLE MORTE FRA LE VIVE ────────────────────────────────────
   Il guasto vero del 23/08: la regola 1 diceva «scrivi nel progetto» e la 12
   diceva «quella regola e' superata». Chi leggeva in ordine agiva sulla prima.

   Una regola ritirata non si cancella — tornerebbe da sola — ma sta IN FONDO,
   sotto il suo titolo. Se una frase come «superata da questa» compare nel
   corpo delle regole vive, sono di nuovo mescolate. */
var reg = testi["REGOLE-LAVORO.md"];
var tagliaFondo = reg.split(/^# Regole ritirate/m);
if(tagliaFondo.length < 2){
  no("REGOLE-LAVORO.md: non ha la sezione delle regole ritirate in fondo");
} else {
  var vive = tagliaFondo[0];
  var brutte = vive.match(/(superata da questa|quella regola e'? superata|regola precedente dice)/gi);
  if(brutte) no("REGOLE-LAVORO.md: una regola viva ne contraddice un'altra (\"" +
                brutte[0] + "\") — le ritirate vanno in fondo");
  else si("nessuna regola morta in mezzo a quelle vive");
}

console.log("");
if(fallito) console.log("  I DIARI HANNO UN PROBLEMA DI FORMA — leggere sopra.\n");
else        console.log("  I diari si possono ancora leggere.\n");
process.exit(fallito);
