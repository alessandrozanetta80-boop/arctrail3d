/* BANCO IBO — il bareme, e il confine con IFAA e ASA.
 *
 * Nato il 17/09/2026, PRIMA del modo `ibo_3d`. Stessa regola del banco ASA:
 * il banco si scrive sul regolamento, non sul codice.
 *
 * FONTE, UNA SOLA E UFFICIALE:
 *   IBO Rules and Class Definitions — edizione 2026
 *   https://iboarchery.com/rules-and-regulations   (pagina)
 *   https://iboarchery.com/wp-content/uploads/IBO-Rules.pdf   (il documento)
 *   Scaricato e letto il 17/09/2026.
 *
 * COSA DICE LA FONTE, ARTICOLO PER ARTICOLO:
 *   II.B.1 — «An "11" ring consisting of a circle centered within the 10 ring.
 *     The circle size should be approximately twenty five percent (25%) of the
 *     size of the 10 ring».
 *   II.B.2 — «A 10 ring consisting of a circle inside the vital area».
 *   II.B.3 — «A vital area (8 ring) that roughly approximates the heart, lung,
 *     and liver area of the appropriate animal».
 *   II.B.4 — «The remainder of the animal shall be considered a "body"».
 *   II.B.5 — «An arrow embedded in the horn of an animal, not touching body
 *     color, is considered a miss and is scored as a zero».
 *   IV.B.2.a — 11 punti: 11 ring o «X» ring; 10 punti: 10 ring o heart;
 *     8 punti: Vital; 5 punti: Body; 0 punti: «Miss or arrow not touching
 *     body color».
 *   IV.B.2.c — «An arrow shaft touching the line of a greater scoring area
 *     shall be given the higher score».
 *   IV.F.1 — «11s will be used to break ties for all places except...».
 *   II.A.3 — «Targets shall be set at unmarked distances»: IBO e' distanza
 *     NON nota, per tutte le classi, e i paletti hanno un massimo per colore.
 *
 * QUELLO CHE LA FONTE NON DICE, E QUI NON SI INVENTA:
 *   il REGOLAMENTO NON FISSA IL NUMERO DI BERSAGLI. Non c'e' nessun articolo
 *   che dica «quaranta». Il 40 che ArcTrail usa come preset e' la dimensione
 *   di fatto delle gare IBO (e 40 x 11 = 440, il massimo che le fonti di
 *   terze parti pubblicano), ma *non e' una regola*, e questo banco pretende
 *   che il file lo dichiari invece di far finta: `bersagliNonImposti:true`.
 *   E' la stessa onesta' che l'app usa gia' per l'NFAS.
 *
 * SABOTAGGIO: `node tests/banco-ibo.js --sabota` mette l'11 di World Archery
 * al posto del bareme IBO e pretende che il banco diventi rosso.
 */
"use strict";
const fs = require("fs");

const SABOTA = process.argv.indexOf("--sabota") !== -1;
let passate = 0, fallite = 0;

function ok(nome, cond, extra) {
  if (cond) { passate++; console.log("  ✓ " + nome); }
  else { fallite++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}

let src = fs.readFileSync("app.html", "utf8").replace(/\r\n/g, "\n");

if (SABOTA) {
  src = src.replace(
    "scoring:{ 1: { undici:11, dieci:10, otto:8, cinque:5 } }",
    "scoring:{ 1: { perfect:11, superspot:10, spot:8, sagoma:5 } }");
  console.log("\n  [SABOTAGGIO ATTIVO: zone World Archery al posto di quelle IBO]\n");
}

function ritaglia(dal, al) {
  const a = src.indexOf(dal), b = src.indexOf(al, a);
  if (a < 0 || b < 0) throw new Error("non trovo il blocco: " + dal);
  return src.slice(a, b);
}

const blocco =
  ritaglia("var SS_SP_SAG =", "var CIRCUITI = {") +
  ritaglia("var CIRCUITI = {", "\n};\n") + "\n};\n" +
  ritaglia("var REGOLAMENTI = {", "\n};\n") + "\n};\n" +
  ritaglia("var FEDERATIONS = {", "\n};\n") + "\n};\n" +
  "\nmodule_out = { GAME_MODES:GAME_MODES, FEDERATIONS:FEDERATIONS," +
  " CIRCUITI:CIRCUITI, REGOLAMENTI:REGOLAMENTI };";

let module_out;
try { module_out = eval(blocco + "; module_out"); }
catch (e) {
  console.log("  ✗ il blocco dei modi non si compila: " + e.message);
  process.exit(1);
}
const { GAME_MODES, FEDERATIONS, CIRCUITI, REGOLAMENTI } = module_out;

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IL BAREME (II.B, IV.B.2.a)\n");

const ibo = GAME_MODES.ibo_3d;
ok("il modo esiste", !!ibo);
ok("una freccia sola per bersaglio",
   ibo && ibo.arrowsPerTarget === 1, ibo && String(ibo.arrowsPerTarget));
ok("nessuno stopAtFirstHit", ibo && !ibo.stopAtFirstHit);

ok("quattro zone", ibo && ibo.zones.length === 4,
   ibo && ibo.zones.map(z => z.key).join("/"));
ok("e sono 11, 10, 8, 5 dall'interno in fuori",
   ibo && ibo.zones.map(z => z.key).join(",") === "undici,dieci,otto,cinque",
   ibo && ibo.zones.map(z => z.key).join(","));

const attesa = { undici: 11, dieci: 10, otto: 8, cinque: 5 };
Object.keys(attesa).forEach(function (z) {
  ok("zona " + z + " = " + attesa[z] + " punti",
     ibo && ibo.scoring[1] && ibo.scoring[1][z] === attesa[z],
     ibo && ibo.scoring[1] ? String(ibo.scoring[1][z]) : "manca");
});
ok("la freccia e' una, quindi la tabella della seconda non esiste",
   ibo && ibo.scoring[2] === undefined);
ok("nessuna zona vale 12: il 12 e' ASA",
   ibo && Object.keys(ibo.scoring[1]).every(z => ibo.scoring[1][z] !== 12),
   ibo && JSON.stringify(ibo.scoring[1]));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IL NUMERO DI BERSAGLI NON E' UNA REGOLA, E IL FILE LO DICE\n");

// Il regolamento IBO non fissa un numero di piazzole. ArcTrail deve pur
// metterne uno per far partire un giro: allora lo dichiara preset, e non
// regola. *Un preset spacciato per regola e' un numero inventato.*
ok("il preset e' dichiarato come tale, non come regola",
   ibo && ibo.bersagliNonImposti === true,
   ibo ? String(ibo.bersagliNonImposti) : "manca");
ok("il preset e' un numero solo", ibo && ibo.formats.length === 1,
   ibo && JSON.stringify(ibo.formats));
ok("e il preset e' 40, quello delle gare IBO",
   ibo && ibo.formats[0] === 40, ibo && String(ibo.formats[0]));

// 40 x 1 x 11 = 440. Non e' un articolo del regolamento: e' la conseguenza
// aritmetica del preset e del bareme, e coincide col massimo che le fonti
// pubblicano. Se un giorno il preset cambia, questa riga lo dice subito.
const max = ibo ? ibo.formats[0] * ibo.arrowsPerTarget * ibo.scoring[1].undici : 0;
ok("massimo del preset: 440", max === 440, String(max));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  L'ALLENAMENTO IBO\n");

const tr = GAME_MODES.ibo_training;
ok("il modo esiste", !!tr);
ok("una freccia sola", tr && tr.arrowsPerTarget === 1);
ok("formato libero", tr && tr.freeFormat === true);
ok("le stesse quattro zone della gara",
   tr && ibo && tr.zones.map(z => z.key).join(",") === ibo.zones.map(z => z.key).join(","));
ok("e lo stesso bareme della gara",
   tr && ibo && JSON.stringify(tr.scoring[1]) === JSON.stringify(ibo.scoring[1]));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IBO NON E' IFAA, E NON E' ASA, E NON E' WORLD ARCHERY\n");

const asa = GAME_MODES.asa_proam;
const std = GAME_MODES.ifaa_3d;
const wa = GAME_MODES.wa_3d;

ok("ASA esiste come modo separato", !!asa);
ok("IFAA 3-D Standard esiste ancora", !!std);
ok("chiavi di zona diverse da ASA",
   ibo && asa && ibo.zones.map(z => z.key).join(",") !== asa.zones.map(z => z.key).join(","));
ok("chiavi di zona diverse da IFAA",
   ibo && std && ibo.zones.map(z => z.key).join(",") !== std.zones.map(z => z.key).join(","));
ok("chiavi di zona diverse da World Archery (perfect/superspot/spot/sagoma)",
   ibo && wa && ibo.zones.map(z => z.key).join(",") !== wa.zones.map(z => z.key).join(","));
ok("nessuna zona IBO si chiama kill/vital/wound",
   ibo && ibo.zones.every(z => ["kill", "vital", "wound", "innerkill"].indexOf(z.key) === -1));
ok("IBO sta su un circuito suo",
   ibo && ibo.circuito === "ibo" && !!CIRCUITI.ibo, ibo && ibo.circuito);
ok("e su un regolamento suo",
   ibo && ibo.regolamento === "ibo_rules" && !!REGOLAMENTI.ibo_rules, ibo && ibo.regolamento);
ok("il circuito IBO non e' quello IFAA", ibo && std && ibo.circuito !== std.circuito);

// IL 11 DI IBO E IL 11 DI WORLD ARCHERY SONO OMONIMI, NON PARENTI.
// Valgono lo stesso numero e stanno su due regolamenti diversi: se un giorno
// uno dei due cambia, l'altro non deve muoversi. Il banco pretende che siano
// due tabelle separate, non la stessa riferita due volte.
ok("il bareme IBO non e' lo stesso oggetto di quello World Archery",
   ibo && wa && ibo.scoring[1] !== wa.scoring[1]);
ok("e nemmeno le stesse zone", ibo && wa && ibo.zones !== wa.zones);

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  LA FONTE E' SCRITTA NEL FILE\n");

const reg = REGOLAMENTI.ibo_rules;
ok("il regolamento e' dichiarato", !!reg);
ok("porta l'anno 2026", reg && /2026/.test(String(reg.versione)), reg && reg.versione);
ok("porta l'indirizzo ufficiale",
   reg && /iboarchery\.com/.test(String(reg.url)), reg && reg.url);
ok("si dichiara verificato: il documento e' stato letto",
   reg && reg.verifica === "verificato", reg && reg.verifica);
ok("sta sul circuito IBO", reg && reg.circuito === "ibo", reg && reg.circuito);

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  CHI CI ARRIVA\n");

const fed = FEDERATIONS.ibo;
ok("la federazione IBO esiste", !!fed);
ok("ha il 3-D fra le gare",
   fed && (fed.garaModes || []).indexOf("ibo_3d") !== -1,
   fed && JSON.stringify(fed.garaModes));
ok("e il suo allenamento", fed && fed.trainingMode === "ibo_training", fed && fed.trainingMode);
ok("NON offre gare ASA", fed && (fed.garaModes || []).indexOf("asa_proam") === -1);
ok("NON offre gare IFAA",
   fed && (fed.garaModes || []).every(k => !/^ifaa/.test(k)));

const altreConIbo = Object.keys(FEDERATIONS).filter(function (f) {
  return f !== "ibo" && (FEDERATIONS[f].garaModes || []).indexOf("ibo_3d") !== -1;
});
ok("nessun'altra federazione offre il 3-D IBO",
   altreConIbo.length === 0, altreConIbo.join(", "));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  LE PAROLE, IN TUTTE E NOVE LE LINGUE\n");

const LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
const CHIAVI = [
  "mode_ibo_3d_label", "mode_ibo_3d_tag", "mode_ibo_3d_unit", "mode_ibo_3d_desc",
  "mode_ibo_training_label", "mode_ibo_training_tag", "mode_ibo_training_unit", "mode_ibo_training_desc",
  "zone_ibo_undici", "zone_ibo_dieci", "zone_ibo_otto", "zone_ibo_cinque"
];

let STRINGS = null;
try { STRINGS = eval(ritaglia("var STRINGS = {", "\nfunction linguaProbabile") + "\n STRINGS"); }
catch (e) { console.log("    (dizionario non leggibile: " + e.message + ")"); }
ok("il dizionario si legge", !!STRINGS);

if (STRINGS) {
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    const mancanti = CHIAVI.filter(k => typeof d[k] !== "string" || !d[k].trim());
    ok(lg + ": tutte e " + CHIAVI.length + " le chiavi ci sono",
       mancanti.length === 0, mancanti.join(", "));
  });

  const ZKEY = ["zone_ibo_undici", "zone_ibo_dieci", "zone_ibo_otto", "zone_ibo_cinque"];
  const ZNUM = ["11", "10", "8", "5"];
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    ok(lg + ": gli anelli si chiamano ancora 11/10/8/5",
       ZNUM.every((n, i) => String(d[ZKEY[i]] || "").indexOf(n) !== -1),
       ZKEY.map(k => d[k]).join("/"));
  });

  // NESSUNA CONTAMINAZIONE: le parole IBO non devono nominare ASA ne' IFAA.
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    const testo = [d.mode_ibo_3d_label, d.mode_ibo_3d_tag, d.mode_ibo_3d_desc,
                   d.mode_ibo_training_label, d.mode_ibo_training_desc].join(" ");
    ok(lg + ": le parole IBO non nominano ASA ne' IFAA",
       !/\bASA\b/.test(testo) && !/\bIFAA\b/.test(testo), testo.slice(0, 80));
  });

  // E LA DESCRIZIONE DEVE DIRE CHE IL NUMERO DI BERSAGLI E' UN PRESET.
  // Se sparisce quella frase, il numero torna a sembrare una regola.
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    ok(lg + ": la descrizione nomina il preset di 40",
       /40/.test(String(d.mode_ibo_3d_desc || "")),
       String(d.mode_ibo_3d_desc || "").slice(0, 80));
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IL MARCHIO DEL BAREME\n");

let schema = null;
try {
  schema = eval(ritaglia("var IFAA_SCHEMA =", "\n/* ══ LA MIGRAZIONE") +
    "\n; ({ IFAA_SCHEMA:IFAA_SCHEMA," +
    " ASA_SCHEMA:(typeof ASA_SCHEMA!=='undefined'?ASA_SCHEMA:null)," +
    " IBO_SCHEMA:(typeof IBO_SCHEMA!=='undefined'?IBO_SCHEMA:null)," +
    " schemaPunteggio:schemaPunteggio, modoDelGiro:modoDelGiro })");
} catch (e) { console.log("    (" + e.message + ")"); }

ok("il blocco degli schemi si legge", !!schema);
if (schema) {
  ok("IBO ha un marchio suo", typeof schema.IBO_SCHEMA === "string" && !!schema.IBO_SCHEMA,
     String(schema.IBO_SCHEMA));
  ok("il marchio IBO nomina l'anno del regolamento",
     /2026/.test(String(schema.IBO_SCHEMA)), String(schema.IBO_SCHEMA));
  ok("il marchio IBO non e' quello IFAA", schema.IBO_SCHEMA !== schema.IFAA_SCHEMA);
  ok("il marchio IBO non e' quello ASA", schema.IBO_SCHEMA !== schema.ASA_SCHEMA);
  ok("un giro ibo_3d nasce marchiato",
     schema.schemaPunteggio("ibo_3d") === schema.IBO_SCHEMA,
     String(schema.schemaPunteggio("ibo_3d")));

  // IL DIROTTAMENTO IFAA NON DEVE TOCCARE I MODI NUOVI. `modoDelGiro` manda
  // su `ifaa_3d_v1` i giri IFAA senza marchio: un giro IBO o ASA non deve
  // nemmeno sfiorare quella strada, con o senza marchio.
  ok("un giro IBO senza marchio resta IBO",
     schema.modoDelGiro("ibo_3d", null) === "ibo_3d",
     String(schema.modoDelGiro("ibo_3d", null)));
  ok("un giro ASA senza marchio resta ASA",
     schema.modoDelGiro("asa_proam", null) === "asa_proam",
     String(schema.modoDelGiro("asa_proam", null)));
  ok("e il dirottamento IFAA funziona ancora",
     schema.modoDelGiro("ifaa_3d", null) === "ifaa_3d_v1");

  /* ══ RECORD E STORICO NON SI MESCOLANO ═══════════════════════════════
     La casella in cui un giro finisce — media, record, riepilogo permanente
     — e' `nome | modoDelGiro(modeKey, scoringVersion)`: sta scritta cosi' in
     `backfillLifetimeOnce()`, ed e' l'unica porta. Qui si costruisce quella
     chiave con la funzione VERA, per cinque giri dello stesso arciere, e si
     pretende che le caselle siano cinque.
     *Se un giorno qualcuno appoggiasse IBO su `wa_3d` per non ripetere il
     bareme, questa riga diventerebbe rossa prima che un record sbagliato
     arrivi nel diario di qualcuno.* */
  const casella = (modeKey, sv) => "Prova|" + schema.modoDelGiro(modeKey, sv);
  const caselle = [
    casella("asa_proam", schema.ASA_SCHEMA),
    casella("ibo_3d", schema.IBO_SCHEMA),
    casella("ifaa_3d", schema.IFAA_SCHEMA),
    casella("ifaa_3d", null),
    casella("wa_3d", null)
  ];
  ok("cinque giri, cinque caselle diverse",
     new Set(caselle).size === 5, caselle.join("  /  "));
  ok("ASA e IBO non finiscono nella stessa casella",
     caselle[0] !== caselle[1], caselle[0] + " vs " + caselle[1]);
  ok("IBO non finisce nella casella World Archery",
     caselle[1] !== caselle[4], caselle[1] + " vs " + caselle[4]);
  ok("e i due IFAA restano separati fra loro, come il 28/08",
     caselle[2] !== caselle[3], caselle[2] + " vs " + caselle[3]);
}

console.log("\n  " + passate + " passate, " + fallite + " fallite.\n");
process.exit(fallite ? 1 : 0);
