/* prova-schermo.js — la schermata iscritti costruita davvero, in un DOM finto.
 * Non prova la resa (per quella serve un telefono), ma prova che i nodi
 * escano: quanti campi, quali etichette, e che la pastiglia dica la cosa
 * giusta prima e dopo aver scelto una sigla.
 *   node prova-schermo.js [index.html]
 */
var fs = require("fs");
var { JSDOM } = require("jsdom");
var FILE = process.argv[2] || "app.html";
var sorgente = fs.readFileSync(FILE, "utf8");

function estrai(nome){
  var i = sorgente.indexOf("function " + nome + "(");
  if(i < 0) throw new Error("manca " + nome);
  var liv = 0, dentro = false;
  for(var j = i; j < sorgente.length; j++){
    if(sorgente[j] === "{"){ liv++; dentro = true; }
    else if(sorgente[j] === "}"){ liv--; if(dentro && liv === 0) return sorgente.slice(i, j+1); }
  }
  throw new Error("non chiusa: " + nome);
}
function estraiVar(nome, apre){
  var i = sorgente.indexOf("var " + nome + " = " + apre);
  if(i < 0) throw new Error("manca " + nome);
  var chiude = apre === "{" ? "}" : "]", liv = 0, dentro = false;
  for(var j = i; j < sorgente.length; j++){
    if(sorgente[j] === apre){ liv++; dentro = true; }
    else if(sorgente[j] === chiude){ liv--; if(dentro && liv === 0) return sorgente.slice(i, j+1) + ";"; }
  }
  throw new Error("non chiuso: " + nome);
}

var dom = new JSDOM("<body></body>");
global.document = dom.window.document;
var salvataggi = 0, ridisegni = 0;
function save(){ salvataggi++; }
function render(){ ridisegni++; }
var DEV_MODE = true, db = null;

// il dizionario vero, tutte e nove le lingue
eval(estraiVar("STRINGS", "{"));
var state = { lang:"it", federation:"fiarc" };
eval(estrai("t"));
eval(estrai("el"));
eval(estrai("escapeHtml"));
eval(estraiVar("PG_MODES", "{"));
eval(estraiVar("DIVISIONI", "{"));
eval(estrai("divisioniPer"));
eval(estrai("pgFederazione"));
eval(estrai("divisioneDi"));
eval(estrai("sigleDi"));
eval(estrai("sigleDentro"));
eval(estrai("compagniaNome"));
eval(estrai("haElencoCompagnie"));
eval(estrai("menuSigle"));
eval(estrai("iscrittoRow"));
eval(estrai("pgLeggiRiga"));
eval(estrai("pgIntestazioneSquadra"));
eval(estrai("pgImporta"));
eval(estrai("pgEsitoImport"));
var RE_TESSERA = /^[0-9]{4,}$/;
var RE_CODICE_COMPAGNIA = /^[0-9]{2}[A-Za-z]{4}$/;
// l'elenco vero delle compagnie: due voci bastano
var COMPAGNIE = { "01VERB": { nome:"A.S.D. Arcieri del Verbano" } };

var errori = [];
var tab = divisioniPer(pgFederazione("percorso"));
state.pgDraft = { gara:"percorso", iscritti:[], squadre:[] };

/* ── 1. una riga vuota: quattro campi, e dice Ospite ────────────────────── */
var p = { cognome:"Natale", nome:"Luca" };
var row = iscrittoRow(p, 0, tab);
var campi = row.querySelectorAll("select, input");
var past = row.querySelector(".divisione-sigla");
console.log("\n  UNA RIGA VUOTA");
console.log("  campi                     " + campi.length + "  (2 menu + tessera + codice)");
console.log("  pastiglia                 \u00ab" + past.textContent + "\u00bb  (" + past.className + ")");
if(campi.length !== 4) errori.push("attesi 4 campi, trovati " + campi.length);
if(past.textContent !== "Ospite") errori.push("senza coppia la pastiglia deve dire Ospite");
if(past.className.indexOf("ospite") === -1) errori.push("la pastiglia Ospite non porta la sua classe");

/* ── 2. ogni campo si presenta, e a chi non vede dice di chi e' ─────────── */
var etichette = [], arie = [];
[].forEach.call(campi, function(c){
  etichette.push(c.tagName === "SELECT" ? c.options[0].textContent : c.getAttribute("placeholder"));
  arie.push(c.getAttribute("aria-label"));
});
console.log("  si presentano              " + etichette.join(" \u00b7 "));
console.log("  e a chi non vede           " + arie.join(" \u00b7 "));
etichette.forEach(function(e){ if(!e) errori.push("un campo non dice cosa vuole"); });
arie.forEach(function(a){ if(!a || a.indexOf("Natale Luca") === -1) errori.push("un campo non dice di chi e': " + a); });

/* ── 3. scegliere le due sigle: la pastiglia cambia SENZA ridisegnare ───── */
var prima = ridisegni;
var menuClasse = campi[0], menuCat = campi[1];
menuClasse.value = "SEM"; menuClasse.dispatchEvent(new dom.window.Event("change"));
menuCat.value = "LB";     menuCat.dispatchEvent(new dom.window.Event("change"));
console.log("  dopo due scelte            \u00ab" + past.textContent + "\u00bb, ridisegni interi: " + (ridisegni - prima));
if(past.textContent !== "SEM \u00b7 LB") errori.push("la pastiglia non segue i menu: " + past.textContent);
if(past.className.indexOf("ospite") !== -1) errori.push("con la coppia intera non si e' piu' Ospite");
if(ridisegni !== prima) errori.push("un menu ha rifatto la pagina: si perde il posto nell'elenco");
if(p.classe !== "SEM" || p.categoria !== "LB") errori.push("la scelta non e' finita nella persona");

/* ── 4. il codice risponde col nome, e se non esiste lo dice ────────────── */
var club = row.querySelector(".iscritto-club");
var cod = campi[3];
cod.value = "01verb"; cod.dispatchEvent(new dom.window.Event("input"));
console.log("  codice 01verb              \u00ab" + cod.value + "\u00bb \u2192 " + club.textContent);
if(cod.value !== "01VERB") errori.push("il codice non viene messo in maiuscolo mentre si scrive");
if(club.textContent.indexOf("Verbano") === -1) errori.push("il codice buono non risponde col nome");
cod.value = "99ZZZZ"; cod.dispatchEvent(new dom.window.Event("input"));
console.log("  codice 99ZZZZ              " + club.textContent + "  (" + club.className + ")");
if(club.className.indexOf("ignoto") === -1) errori.push("un codice che non esiste deve dirlo, in rosso");

/* ── 5. la tessera accetta solo cifre ───────────────────────────────────── */
var tess = campi[2];
tess.value = "12a34-5"; tess.dispatchEvent(new dom.window.Event("input"));
console.log("  tessera \u00ab12a34-5\u00bb          \u2192 \u00ab" + tess.value + "\u00bb");
if(tess.value !== "12345") errori.push("la tessera ha accettato qualcosa che non e' una cifra");

/* ── 6. una federazione senza tabella: i menu non compaiono ─────────────── */
state.federation = "sweden";
var rowSv = iscrittoRow({ cognome:"Karlsson", nome:"Erik" }, 0, divisioniPer(pgFederazione("sweden_3d")));
var campiSv = rowSv.querySelectorAll("select, input");
console.log("\n  SVEDESE (nessuna tabella)  campi: " + campiSv.length + ", pastiglia: "
  + (rowSv.querySelector(".divisione-sigla") ? "c'e' (sbagliato)" : "nessuna"));
if(campiSv.length !== 2) errori.push("senza tabella devono restare i due campi soli, non " + campiSv.length);
if(rowSv.querySelector(".divisione-sigla")) errori.push("senza tabella non si dichiara nessuna divisione");
state.federation = "fiarc";

/* ── 6b. il codice di un club francese non viene accusato ────────────────────
   L'app possiede l'elenco delle Compagnie FIARC e basta. Prima diceva
   "Codice sconosciuto", in rosso, a un numero di struttura francese
   perfettamente valido: un'accusa falsa, che porta o a cancellare un dato
   giusto o a smettere di fidarsi del rosso. Dove non c'e' elenco, si tace. */
state.pgDraft = { gara:"ffta_tir3d", iscritti:[], squadre:[] };
state.federation = "ffta";
var pFr = { cognome:"MARTIN", nome:"Luc", compagnia:"329029" };
var rowFr = iscrittoRow(pFr, 0, null);
var clubFr = rowFr.querySelector(".iscritto-club");
var accusato = clubFr && clubFr.className.indexOf("ignoto") !== -1;
console.log("  CLUB FRANCESE              codice 329029 \u2192 "
  + (accusato ? "accusato (sbagliato)" : "nessun giudizio"));
if(accusato) errori.push("un codice francese valido viene dato per sconosciuto");
if(clubFr && clubFr.textContent) errori.push("dove non c'e' elenco non si scrive niente, e invece c'e' scritto qualcosa");
// e dove l'elenco c'e', il controllo deve tornare a parlare
state.pgDraft = { gara:"percorso", iscritti:[], squadre:[] };
state.federation = "fiarc";
var rowIt = iscrittoRow({ cognome:"Rossi", nome:"Ada", compagnia:"99ZZZZ" }, 0, tab);
if(rowIt.querySelector(".iscritto-club").className.indexOf("ignoto") === -1){
  errori.push("dove l'elenco c'e', un codice inventato deve restare in rosso");
}

/* ── 7. il resoconto dell'importazione esce come foglio, non come avviso ── */
var esito = pgImporta("Squadra 1\nVallo, Marco, 12345, SEM, LB, 01VERB\nNatale Luca 12345 SEM LB\n", tab);
var box = pgEsitoImport(esito.conti);
console.log("  RESOCONTO                  " + box.querySelector(".pg-esito-conti").textContent);
console.log("                             " + box.querySelector(".pg-esito-dubbie").textContent
  + " \u00ab" + box.querySelector(".pg-esito-riga").textContent + "\u00bb");
if(box.querySelectorAll(".pg-esito-riga").length !== 1) errori.push("la riga non capita non e' stata mostrata");

/* ── il verdetto ────────────────────────────────────────────────────────── */
if(errori.length){
  console.log("\n  " + errori.length + " problemi:");
  errori.forEach(function(e){ console.log("    " + e); });
  console.log("");
  process.exit(1);
}
console.log("\n  La riga dell'iscritto si costruisce, si compila e non rifa' la pagina.\n");
process.exit(0);
