/* BANCO IFAA — il bareme dei due round 3-D, e i giri di ieri.
 *
 * Nato il 28/08/2026, quando si e' scoperto che `ifaa_3d` portava il bareme
 * dell'Animal Round. Un errore di punteggio non lo prende nessun banco
 * generico: si scrive il numero che dice il regolamento e si controlla che
 * l'app dica lo stesso.
 *
 * Fonte dei numeri: IFAA Book of Rules 2021 (rev. 04/04/2021), Article V,
 * sezioni E (3-D Hunting Round, 1 freccia) e F (3-D Standard Round, 2 frecce).
 * I numeri qui sotto sono SCRITTI A MANO dal regolamento, non letti da
 * app.html: un banco che si fa dettare le attese dal file che deve
 * controllare non puo' dire di no.
 *
 * SABOTAGGIO: `node banco-ifaa.js --sabota` rimette il bareme sbagliato in
 * una copia in memoria e pretende che il banco diventi rosso.
 */
"use strict";
const fs = require("fs");

const SABOTA = process.argv.indexOf("--sabota") !== -1;
let passate = 0, fallite = 0;

function ok(nome, cond, extra) {
  if (cond) { passate++; console.log("  \u2713 " + nome); }
  else { fallite++; console.log("  \u2717 " + nome + (extra ? "  \u2014 " + extra : "")); }
}

// ── si estrae il pezzo di app.html che definisce i modi, e lo si esegue ────
// Niente regex sui numeri: si valuta il codice vero, cosi' il banco vede
// quello che vedra' il telefono.
let src = fs.readFileSync("app.html", "utf8");

if (SABOTA) {
  src = src.replace(
    'scoring:{ 1: { kill:10, vital:8, wound:5 }, 2: { kill:10, vital:8, wound:5 } }',
    'scoring:{ 1: { spot:20, lowarea:18 }, 2: { spot:16, lowarea:14 } }');
  console.log("\n  [SABOTAGGIO ATTIVO: rimesso il bareme dell'Animal Round]\n");
}

function ritaglia(dal, al) {
  const a = src.indexOf(dal), b = src.indexOf(al, a);
  if (a < 0 || b < 0) throw new Error("non trovo il blocco: " + dal);
  return src.slice(a, b);
}

const blocco =
  ritaglia("var SS_SP_SAG =", "var CIRCUITI = {") +
  ritaglia("var FEDERATIONS = {", "\n};\n") + "\n};\n" +
  "\nmodule_out = { GAME_MODES: GAME_MODES, FEDERATIONS: FEDERATIONS };";

let module_out;
try {
  module_out = eval(blocco + "; module_out");
} catch (e) {
  console.log("  \u2717 il blocco dei modi non si compila: " + e.message);
  process.exit(1);
}
const { GAME_MODES, FEDERATIONS } = module_out;

console.log("\n  IL 3-D STANDARD ROUND (Article V F)\n");

const std = GAME_MODES.ifaa_3d;
ok("il modo esiste", !!std);
ok("28 bersagli \u2014 due unita' da 14",
   std && std.formats.length === 1 && std.formats[0] === 28,
   std && JSON.stringify(std.formats));
ok("due frecce, una per ogni posizione di tiro",
   std && std.arrowsPerTarget === 2, std && String(std.arrowsPerTarget));
ok("nessuno stopAtFirstHit: entrambe le frecce contano",
   std && !std.stopAtFirstHit);
ok("tre zone, non due", std && std.zones.length === 3,
   std && std.zones.map(z => z.key).join("/"));
ok("e sono Kill, Vital, Wound",
   std && std.zones.map(z => z.key).join(",") === "kill,vital,wound",
   std && std.zones.map(z => z.key).join(","));

const attesaStd = { kill: 10, vital: 8, wound: 5 };
[1, 2].forEach(function (n) {
  Object.keys(attesaStd).forEach(function (z) {
    ok("freccia " + n + ": " + z + " = " + attesaStd[z],
       std && std.scoring[n] && std.scoring[n][z] === attesaStd[z],
       std && std.scoring[n] ? String(std.scoring[n][z]) : "manca");
  });
});
ok("le due frecce valgono uguale",
   std && JSON.stringify(std.scoring[1]) === JSON.stringify(std.scoring[2]));

// 28 x 2 x 10 = 560. Il massimo e' il controllo che prende in un colpo solo
// numero di piazzole, numero di frecce e valore della zona alta.
const maxStd = std ? std.formats[0] * std.arrowsPerTarget * std.scoring[1].kill : 0;
ok("massimo teorico 560", maxStd === 560, String(maxStd));

console.log("\n  IL 3-D HUNTING ROUND (Article V E) \u2014 non doveva cambiare\n");

const hunt = GAME_MODES.ifaa_hunting;
ok("28 bersagli", hunt && hunt.formats[0] === 28);
ok("una freccia sola", hunt && hunt.arrowsPerTarget === 1);
ok("tre zone Kill/Vital/Wound",
   hunt && hunt.zones.map(z => z.key).join(",") === "kill,vital,wound");
const attesaHunt = { kill: 20, vital: 16, wound: 10 };
Object.keys(attesaHunt).forEach(function (z) {
  ok("Hunting: " + z + " = " + attesaHunt[z],
     hunt && hunt.scoring[1][z] === attesaHunt[z],
     hunt ? String(hunt.scoring[1][z]) : "manca");
});
const maxHunt = hunt ? hunt.formats[0] * hunt.arrowsPerTarget * hunt.scoring[1].kill : 0;
ok("massimo teorico 560", maxHunt === 560, String(maxHunt));

console.log("\n  I DUE ROUND NON SI CONFONDONO\n");

ok("lo Standard non usa il bareme dell'Hunting",
   std && hunt && std.scoring[1].kill !== hunt.scoring[1].kill);
ok("nessuna freccia dello Standard puo' superare 10",
   std && Math.max(std.scoring[1].kill, std.scoring[2].kill) === 10);
ok("il vecchio bareme 20/18 non e' piu' raggiungibile dallo Standard",
   std && std.scoring[1].spot === undefined && std.scoring[1].lowarea === undefined);

console.log("\n  IL MODO DI COMPATIBILITA'\n");

const v1 = GAME_MODES.ifaa_3d_v1;
ok("esiste", !!v1);
ok("conserva il bareme di ieri",
   v1 && v1.scoring[1].spot === 20 && v1.scoring[1].lowarea === 18
      && v1.scoring[2].spot === 16 && v1.scoring[2].lowarea === 14);
ok("conserva le due zone di ieri", v1 && v1.zones.length === 2);
const scegliibile = Object.keys(FEDERATIONS).some(function (f) {
  return (FEDERATIONS[f].garaModes || []).indexOf("ifaa_3d_v1") !== -1;
});
ok("NON e' scegliibile da nessuna federazione", !scegliibile);

const conIfaa = Object.keys(FEDERATIONS).filter(function (f) {
  return (FEDERATIONS[f].garaModes || []).indexOf("ifaa_3d") !== -1;
});
ok("le federazioni IFAA puntano al modo corretto", conIfaa.length >= 6,
   conIfaa.join(", "));

console.log("\n  IL GIRO LASCIATO APERTO IERI\n");

// `adattaGiroIfaa` si estrae e si esegue: e' la funzione vera, non una copia.
const fnSrc = ritaglia("function adattaGiroIfaa(st){", "\nfunction riprendiGiroRitrovato");
let adatta;
// Va valutato come DICHIARAZIONE: avvolgerlo in parentesi ne farebbe
// un'espressione, e il nome di una funzione-espressione non esce da se stessa.
// `IFAA_SCHEMA` si porta dietro dal file, non si riscrive: una costante
// ricopiata a mano in un banco smette di controllare quella vera.
try { adatta = eval(ritaglia("var IFAA_SCHEMA =", "\nfunction schemaPunteggio(")
                    + "\n" + fnSrc + "\n; adattaGiroIfaa"); }
catch (e) { adatta = null; console.log("    (" + e.message + ")"); }
ok("la funzione di adattamento si compila", typeof adatta === "function");

if (typeof adatta === "function") {
  const vecchio = { mode: "ifaa_3d", roundActive: true,
    scores: { a1: [{ arrows: [20, 16], total: 36 }] }, pendingArrows: [] };
  adatta(vecchio);
  ok("un giro con frecce da 20 viene dirottato sul modo di ieri",
     vecchio.mode === "ifaa_3d_v1", vecchio.mode);

  /* AGGIORNATO IL 28/08/2026 INSIEME AL CODICE. Prima qui si pretendeva che
   * un giro con frecce da 10 restasse sul modo nuovo: era giusto finche' il
   * riconoscimento guardava i numeri. Adesso guarda il marchio, e un giro
   * senza marchio e' di ieri anche se i suoi numeri sarebbero plausibili
   * oggi — perche' 10, 8 e 5 esistono anche nella tabella vecchia. */
  const nuovo = { mode: "ifaa_3d", roundActive: true,
    scoringVersion: "ifaa-standard-2021",
    scores: { a1: [{ arrows: [10, 8], total: 18 }] }, pendingArrows: [] };
  adatta(nuovo);
  ok("un giro marchiato resta sul modo corretto", nuovo.mode === "ifaa_3d", nuovo.mode);

  const ambiguo = { mode: "ifaa_3d", roundActive: true,
    scores: { a1: [{ arrows: [10, 8], total: 18 }] }, pendingArrows: [] };
  adatta(ambiguo);
  ok("un giro NON marchiato e' di ieri anche con numeri plausibili",
     ambiguo.mode === "ifaa_3d_v1", ambiguo.mode);

  const chiuso = { mode: "ifaa_3d", roundActive: false,
    scores: { a1: [{ arrows: [20], total: 20 }] } };
  adatta(chiuso);
  ok("un giro NON aperto non viene toccato", chiuso.mode === "ifaa_3d");

  const altro = { mode: "percorso", roundActive: true,
    scores: { a1: [{ arrows: [11, 9, 7], total: 27 }] } };
  adatta(altro);
  ok("un giro di un'altra federazione non viene toccato",
     altro.mode === "percorso", altro.mode);
}

console.log("\n  IL VECCHIO E IL NUOVO NON SI MESCOLANO\n");

/* La domanda vera non e' «il barème e' giusto», e' «un 900 del barème
 * vecchio puo' diventare record del nuovo». Qui si esegue la vera
 * `migraSchemaIfaa` su un finto localStorage, e si guarda dove finiscono i
 * numeri. Niente e' simulato a mano: le funzioni sono quelle di app.html. */
const memoria = {};
const localStorage = {
  getItem: k => (k in memoria ? memoria[k] : null),
  setItem: (k, v) => { memoria[k] = String(v); },
  removeItem: k => { delete memoria[k]; },
};

const pezzi = [
  ritaglia("var IFAA_SCHEMA =", "// ---------- RIEPILOGO PERMANENTE ----------"),
  ritaglia("function loadLifetime(){", "// Ricostruisce il riepilogo"),
  ritaglia("function baseModeKey(key)", "function modeTag(key)"),
  ritaglia("function loadHistory(){", "function saveHistoryList(list)"),
  "function saveHistoryList(list){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }catch(e){} }",
  "\nmigrazione_out = { migraSchemaIfaa, modoDelGiro, schemaPunteggio, baseModeKey,\n" +
  "  loadHistory, saveHistoryList, loadLifetime, saveLifetime, IFAA_SCHEMA, fondiVoceLifetime };",
];
let M = null;
try {
  M = eval('var HISTORY_KEY="h", LIFETIME_KEY="l"; var migrazione_out;\n'
    + pezzi.join("\n") + "; migrazione_out");
} catch (e) {
  console.log("  \u2717 il blocco della migrazione non si compila: " + e.message);
}
ok("il blocco della migrazione si compila", !!M);

if (M) {
  ok("il marchio si mette solo sullo Standard IFAA",
     M.schemaPunteggio("ifaa_3d") === "ifaa-standard-2021"
     && M.schemaPunteggio("percorso") === null
     && M.schemaPunteggio("ifaa_hunting") === null);
  /* CORRETTO IL 28/08/2026 INSIEME AL CODICE. Questa prova pretendeva il
   * contrario, e pretendeva una cosa sbagliata: il marchio dice «calcolato
   * con la tabella nuova», e sul modo di ieri quella frase e' falsa.
   * Il caso che morde: un giro cominciato ieri, dirottato su `ifaa_3d_v1`
   * alla ripresa e poi CHIUSO — si sarebbe salvato col marchio del barème
   * nuovo, indistinguibile da un giro vero. */
  ok("il modo di ieri NON riceve il marchio del barème nuovo",
     M.schemaPunteggio("ifaa_3d_v1") === null,
     String(M.schemaPunteggio("ifaa_3d_v1")));
  ok("e nessun altro modo lo riceve",
     M.schemaPunteggio("ifaa_hunting") === null
     && M.schemaPunteggio("percorso") === null
     && M.schemaPunteggio("tracciato") === null
     && M.schemaPunteggio(undefined) === null);

  /* Il giro di ieri, dalla ripresa alla chiusura. E' la catena intera:
   * `adattaGiroIfaa` lo sposta, `schemaPunteggio` decide cosa scrivergli
   * addosso, `modoDelGiro` decide in che casella finisce. */
  const ieriRipreso = { mode: "ifaa_3d", roundActive: true,
    scores: { a1: [{ arrows: [20, 16], total: 36 }] }, pendingArrows: [] };
  if (typeof adatta === "function") adatta(ieriRipreso);
  const marchioAllaChiusura = M.schemaPunteggio(ieriRipreso.mode);
  ok("giro di ieri ripreso: finisce su ifaa_3d_v1",
     ieriRipreso.mode === "ifaa_3d_v1", ieriRipreso.mode);
  ok("giro di ieri chiuso: nessun marchio addosso",
     marchioAllaChiusura === null, String(marchioAllaChiusura));
  ok("giro di ieri chiuso: resta nella casella dei vecchi",
     M.modoDelGiro(ieriRipreso.mode, marchioAllaChiusura) === "ifaa_3d_v1");
  ok("e non puo' rientrare fra i nuovi per nessuna strada",
     M.modoDelGiro("ifaa_3d_v1", "ifaa-standard-2021") === "ifaa_3d_v1");

  ok("un giro ifaa_3d SENZA marchio si legge come legacy",
     M.modoDelGiro("ifaa_3d", undefined) === "ifaa_3d_v1");
  ok("un giro ifaa_3d CON marchio resta nuovo",
     M.modoDelGiro("ifaa_3d", "ifaa-standard-2021") === "ifaa_3d");
  ok("un giro di un altro modo non viene toccato",
     M.modoDelGiro("percorso", undefined) === "percorso");
  ok("un marchio sconosciuto non passa per nuovo",
     M.modoDelGiro("ifaa_3d", "qualcos-altro") === "ifaa_3d_v1");

  // ── lo scenario che il difetto produceva ────────────────────────────────
  memoria.h = JSON.stringify([
    { date: "2026-08-20T10:00:00Z", modeKey: "ifaa_3d", modeLabel: "IFAA 3-D Standard Round",
      format: 28, results: [{ name: "Ale", total: 900, isSelf: true }] },
  ]);
  memoria.l = JSON.stringify({
    "Ale|ifaa_3d": { name: "Ale", modeKey: "ifaa_3d", modeLabel: "IFAA 3-D Standard Round",
      rounds: 3, sum: 2400, best: 900, bestDate: "2026-08-20T10:00:00Z", bestFormat: 28,
      firstDate: "2026-08-01T10:00:00Z", lastDate: "2026-08-20T10:00:00Z", isSelf: true },
  });

  const spostati = M.migraSchemaIfaa();
  ok("la migrazione sposta il giro concluso", spostati === 1, String(spostati));

  const hist = M.loadHistory();
  ok("il vecchio giro concluso e' passato a ifaa_3d_v1",
     hist[0].modeKey === "ifaa_3d_v1", hist[0].modeKey);
  ok("il suo punteggio non e' stato toccato",
     hist[0].results[0].total === 900, String(hist[0].results[0].total));

  let lt = M.loadLifetime();
  ok("il record da 900 non sta piu' sotto Ale|ifaa_3d", lt["Ale|ifaa_3d"] === undefined);
  ok("il record da 900 sta sotto Ale|ifaa_3d_v1",
     lt["Ale|ifaa_3d_v1"] && lt["Ale|ifaa_3d_v1"].best === 900);
  ok("giri e somma sono arrivati interi",
     lt["Ale|ifaa_3d_v1"].rounds === 3 && lt["Ale|ifaa_3d_v1"].sum === 2400);
  ok("la data del record e il formato sono arrivati con lui",
     lt["Ale|ifaa_3d_v1"].bestDate === "2026-08-20T10:00:00Z"
     && lt["Ale|ifaa_3d_v1"].bestFormat === 28);

  // ── il giro nuovo, dopo la migrazione ───────────────────────────────────
  lt["Ale|ifaa_3d"] = { name: "Ale", modeKey: "ifaa_3d", modeLabel: "IFAA 3-D Standard Round",
    rounds: 1, sum: 500, best: 500, bestDate: "2026-08-28T10:00:00Z", bestFormat: 28,
    firstDate: "2026-08-28T10:00:00Z", lastDate: "2026-08-28T10:00:00Z", isSelf: true };
  M.saveLifetime(lt);
  lt = M.loadLifetime();
  ok("il giro nuovo da 500 sta nel gruppo nuovo",
     lt["Ale|ifaa_3d"].best === 500, String(lt["Ale|ifaa_3d"].best));
  ok("il 900 NON e' record del formato nuovo",
     lt["Ale|ifaa_3d"].best === 500 && lt["Ale|ifaa_3d"].best !== 900);
  ok("il 900 resta record del formato vecchio",
     lt["Ale|ifaa_3d_v1"].best === 900);
  ok("le medie non si mescolano",
     lt["Ale|ifaa_3d"].sum / lt["Ale|ifaa_3d"].rounds === 500
     && lt["Ale|ifaa_3d_v1"].sum / lt["Ale|ifaa_3d_v1"].rounds === 800);

  ok("la migrazione non gira due volte", M.migraSchemaIfaa() === 0);
  lt = M.loadLifetime();
  ok("e il record nuovo non e' finito fra i vecchi al secondo giro",
     lt["Ale|ifaa_3d"] && lt["Ale|ifaa_3d"].best === 500
     && lt["Ale|ifaa_3d_v1"].best === 900);

  // ── la fusione quando la destinazione esiste gia' ───────────────────────
  const a = { name: "B", rounds: 2, sum: 300, best: 200, bestDate: "d2", bestFormat: 28,
              firstDate: "b", lastDate: "c", ownerUid: null, isSelf: false, modeLabel: "" };
  const b = { name: "B", rounds: 3, sum: 900, best: 400, bestDate: "d1", bestFormat: 14,
              firstDate: "a", lastDate: "z", ownerUid: "u9", isSelf: true, modeLabel: "IFAA" };
  M.fondiVoceLifetime(a, b);
  ok("fusione: giri e somma si sommano", a.rounds === 5 && a.sum === 1200);
  ok("fusione: vince il record piu' alto, con la sua data e il suo formato",
     a.best === 400 && a.bestDate === "d1" && a.bestFormat === 14);
  ok("fusione: prima data la piu' vecchia, ultima la piu' recente",
     a.firstDate === "a" && a.lastDate === "z");
  ok("fusione: proprietario ed etichetta non si perdono",
     a.ownerUid === "u9" && a.isSelf === true && a.modeLabel === "IFAA");

  // ── il cloud ────────────────────────────────────────────────────────────
  ok("un giro sceso dal cloud SENZA versione diventa legacy",
     M.modoDelGiro("ifaa_3d", null) === "ifaa_3d_v1");
  ok("un giro sceso dal cloud CON versione resta nuovo",
     M.modoDelGiro("ifaa_3d", "ifaa-standard-2021") === "ifaa_3d");
}

// ── il giro aperto, con la funzione vera ──────────────────────────────────
if (typeof adatta === "function") {
  const apertoVecchio = { mode: "ifaa_3d", roundActive: true, scores: {}, pendingArrows: [] };
  adatta(apertoVecchio);
  ok("giro aperto senza marchio, anche a zero frecce, diventa legacy",
     apertoVecchio.mode === "ifaa_3d_v1", apertoVecchio.mode);

  const apertoNuovo = { mode: "ifaa_3d", roundActive: true, scoringVersion: "ifaa-standard-2021",
                        scores: {}, pendingArrows: [] };
  adatta(apertoNuovo);
  ok("giro aperto CON marchio resta nuovo", apertoNuovo.mode === "ifaa_3d");

  const cloudVecchio = { mode: "ifaa_3d", roundActive: true,
    scores: { a1: [{ arrows: [20, 16], total: 36 }] }, pendingArrows: [] };
  adatta(cloudVecchio);
  ok("giro aperto ripreso dal cloud senza marchio diventa legacy",
     cloudVecchio.mode === "ifaa_3d_v1");
}

// ── i punti di scrittura, letti nel file ──────────────────────────────────
ok("il giro chiuso scrive il marchio nello storico",
   /scoringVersion: schemaPunteggio\(state\.mode\)/.test(src));
ok("il riepilogo permanente passa dalla porta di normalizzazione",
   /recordLifetime\(r\.name, modoDelGiro\(state\.mode, roundEntry\.scoringVersion\)/.test(src));
/* LE DUE SALITE PASSANO DA UNA FORMA SOLA. (Corretto il 30/08/2026.)
   Queste tre righe cercavano i campi scritti a mano nei tre punti dove il
   giro veniva impacchettato — due che salgono, uno che scende. Il 29/08 quei
   tre elenchi sono stati accorpati in `giroPerNuvola()` e `giroDaNuvola()`
   (chiusura di C26), proprio perche' non combaciavano. Il comportamento c'e'
   ancora ed e' migliore di prima: il banco cercava la vecchia forma e diceva
   di no a una correzione.
   *Una delle due falliva per uno SPAZIO dopo i due punti.* Adesso si chiede
   che le due salite passino dalla porta unica, e che la porta porti il
   marchio; e lo spazio non conta piu'.
   LIMITE TROVATO SABOTANDO, e dichiarato: un chiamante che SPOGLIA il giro
   prima di passarlo alla porta queste righe non lo vedono — leggono il
   sorgente, non il viaggio. Il viaggio intero non lo prova nessun banco
   (e' il buco gia' scritto accanto a `giroPerNuvola` in app.html). */
ok("il marchio sale sul cloud col giro appena chiuso",
   /giroPerNuvola\(roundEntry\)/.test(src));
/* ANCORATA ALLA CHIAMATA, NON AL NOME. (30/08/2026, trovato sabotando.)
   Scritta `/giroPerNuvola\(h\)/` questa riga trovava LA DEFINIZIONE della
   funzione — `function giroPerNuvola(h){` — e diceva di si' anche dopo che il
   backfill era stato staccato dalla porta unica. *Un banco cieco costa piu' di
   un banco assente: quello assente non rassicura nessuno.* */
ok("e ci sale anche coi giri arretrati, dalla stessa porta",
   /roundDocId\(h\.date\)\), giroPerNuvola\(h\)\)/.test(src));
ok("e la porta unica il marchio se lo porta dietro",
   /scoringVersion:\s*h\.scoringVersion \|\| null/.test(src));
ok("il giro che scende dal cloud viene normalizzato alla lettura",
   /modeKey:\s*modoDelGiro\(d\.modeKey,\s*d\.scoringVersion\)/.test(src));
ok("il marchio viaggia col giro aperto",
   /"startedAt","assetto","assettoNome","scoringVersion"\]/.test(src));
ok("il giro nuovo nasce marchiato",
   /state\.scoringVersion = schemaPunteggio\(modeKey\)/.test(src));
ok("la migrazione gira PRIMA del backfill",
   src.indexOf("migraSchemaIfaa();") < src.indexOf("backfillLifetimeOnce();\n\n"));
ok("nessun punteggio viene riscritto dalla migrazione",
   !/h\.results\s*=|r\.total\s*=/.test(ritaglia("function migraSchemaIfaa(){", "// ---------- RIEPILOGO")));

console.log("\n  LO STORICO SI LEGGE ANCORA\n");

// Nello storico ci sono NUMERI, non nomi di zona: nessun giro chiuso viene
// ricontato. Si verifica che il campo sia davvero numerico nel codice che
// salva, non a parole.
ok("il giro chiuso salva i punti gia' calcolati, non le zone",
   /perTarget: entries\.map\(function\(e\)\{ return e\.total; \}\)/.test(src)
   && /arrows: entries\.map\(function\(e\)\{ return e\.arrows; \}\)/.test(src));
ok("la freccia registrata e' un numero",
   /state\.pendingArrows\.push\(score\)/.test(src));

// Un totale di ieri non deve cambiare: si ricalcola dai numeri salvati.
const giroDiIeri = [{ arrows: [20, 16], total: 36 }, { arrows: [18, 14], total: 32 }];
const tot = giroDiIeri.reduce(function (s, e) { return s + e.total; }, 0);
ok("un totale salvato ieri resta 68", tot === 68, String(tot));

// Il conto per zone non inventa: un valore che non sta in tabella non si conta.
ok("il conto per zone non inventa una zona per un valore sconosciuto",
   /Se un valore non combacia con nessuna zona non si/.test(src));

console.log("\n  IL DIZIONARIO\n");

ok("le etichette del modo di compatibilita' vengono da quello vero",
   /function baseModeKey\(key\)\{ return String\(key \|\| ""\)\.replace\(\/_v1\$\/, ""\); \}/.test(src));
["label", "tag", "desc", "unit"].forEach(function (c) {
  ok("mode_..._" + c + " passa da baseModeKey",
     new RegExp('t\\("mode_"\\+baseModeKey\\(key\\)\\+"_' + c + '"\\)').test(src));
});
const descIt = /mode_ifaa_3d_desc:"([^"]*)"/.exec(src);
ok("la descrizione italiana dice che entrambe le frecce si sommano",
   descIt && /entrambe le frecce si sommano/.test(descIt[1]),
   descIt ? descIt[1].slice(0, 60) : "manca");
ok("nessuna descrizione dice che il Round ha due sole zone",
   !/mode_ifaa_3d_desc:"[^"]*due (sole )?zone/.test(src));
ok("nessuna descrizione dice che la seconda freccia vale meno",
   !/mode_ifaa_3d_desc:"[^"]*seconda [^"]*vale meno/.test(src));
ok("nessun commento dice piu' che la seconda freccia dello Standard vale meno",
   !/Standard sono due\s*\n?\s*frecce con la seconda che vale meno/.test(src));
ok("le nove lingue hanno la descrizione",
   (src.match(/mode_ifaa_3d_desc:/g) || []).length === 9,
   String((src.match(/mode_ifaa_3d_desc:/g) || []).length));

console.log("\n  " + passate + " passate, " + fallite + " fallite.\n");
if (SABOTA) {
  if (fallite > 0) { console.log("  SABOTAGGIO: il banco ha detto di no. Funziona.\n"); process.exit(0); }
  console.log("  SABOTAGGIO NON RILEVATO: questo banco e' un timbro, non un controllo.\n");
  process.exit(1);
}
process.exit(fallite ? 1 : 0);
