/* BANCO ASA — il bareme del Pro/Am, e le cose che NON devono somigliare ad altro.
 *
 * Nato il 17/09/2026, PRIMA del modo `asa_proam`, come vuole la regola: un
 * banco scritto dopo il codice non controlla il regolamento, controlla il
 * codice che si e' appena scritto.
 *
 * FONTE, UNA SOLA E UFFICIALE:
 *   ASA Pro/Am Rules — 2026
 *   https://asaarchery.com/rules/asa-pro-am-rules/   (letta il 17/09/2026)
 * I numeri qui sotto sono SCRITTI A MANO da quella pagina, sezione per
 * sezione, e non letti da app.html. Le sezioni sono nominate accanto a ogni
 * gruppo di prove: se un giorno la pagina cambia, si sa cosa rileggere.
 *
 * COSA DICE LA FONTE, IN CINQUE RIGHE:
 *   TOURNAMENT FORMAT — «Each ASA Pro/Am tournament will consist of two (2)
 *     rounds of twenty (20) individual 3-D targets».
 *   SHOOTING RULES — «Only one arrow, per shooter, per target will be shot
 *     from their designated stake».
 *   SCORING — «Arrows in the corresponding area of the target will be scored
 *     with point values of 5, 8, 10, or 12».
 *   SCORING — «An arrow that glances off and goes past the target will be
 *     scored as a "0"».
 *   SCORING — «The arrow shaft must be touching a portion of the next highest
 *     scoring line to be scored for the higher value».
 *
 * IL 14 NON C'E'. Nella pagina ufficiale 2026 la stringa «14» non compare mai
 * come anello: i valori sono 5, 8, 10, 12. Fonti di terze parti raccontano di
 * un 14-ring negli spareggi; *finche' non sta nel regolamento non entra qui*,
 * e il banco lo pretende esplicitamente (vedi «IL 14 NON ESISTE»).
 *
 * SABOTAGGIO: `node tests/banco-asa.js --sabota` mette il bareme IBO al posto
 * di quello ASA e pretende che il banco diventi rosso.
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
    "scoring:{ 1: { dodici:12, dieci:10, otto:8, cinque:5 } }",
    "scoring:{ 1: { undici:11, dieci:10, otto:8, cinque:5 } }");
  console.log("\n  [SABOTAGGIO ATTIVO: bareme IBO al posto di quello ASA]\n");
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
console.log("\n  IL PRO/AM (TOURNAMENT FORMAT, SHOOTING RULES, SCORING)\n");

const asa = GAME_MODES.asa_proam;
ok("il modo esiste", !!asa);
ok("venti bersagli: e' UN round, non il torneo intero",
   asa && asa.formats.length === 1 && asa.formats[0] === 20,
   asa && JSON.stringify(asa.formats));
ok("una freccia sola per bersaglio",
   asa && asa.arrowsPerTarget === 1, asa && String(asa.arrowsPerTarget));
ok("nessuno stopAtFirstHit: con una freccia sola non vorrebbe dire niente",
   asa && !asa.stopAtFirstHit);
ok("formato fisso, non libero: il round ASA e' di venti e basta",
   asa && !asa.freeFormat);

ok("quattro zone", asa && asa.zones.length === 4,
   asa && asa.zones.map(z => z.key).join("/"));
ok("e sono 12, 10, 8, 5 dall'interno in fuori",
   asa && asa.zones.map(z => z.key).join(",") === "dodici,dieci,otto,cinque",
   asa && asa.zones.map(z => z.key).join(","));

const attesa = { dodici: 12, dieci: 10, otto: 8, cinque: 5 };
Object.keys(attesa).forEach(function (z) {
  ok("zona " + z + " = " + attesa[z] + " punti",
     asa && asa.scoring[1] && asa.scoring[1][z] === attesa[z],
     asa && asa.scoring[1] ? String(asa.scoring[1][z]) : "manca");
});
ok("la freccia e' una, quindi la tabella della seconda non esiste",
   asa && asa.scoring[2] === undefined);

// 20 x 1 x 12 = 240 per round. Prende in un colpo solo piazzole, frecce e
// valore della zona alta: se uno dei tre scivola, questo numero lo dice.
const max = asa ? asa.formats[0] * asa.arrowsPerTarget * asa.scoring[1].dodici : 0;
ok("massimo teorico di un round: 240", max === 240, String(max));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IL 14 NON ESISTE (non nel regolamento 2026)\n");

ok("nessuna zona ASA vale 14",
   asa && Object.keys(asa.scoring[1]).every(z => asa.scoring[1][z] !== 14),
   asa && JSON.stringify(asa.scoring[1]));
ok("nessuna zona si chiama «quattordici»",
   asa && asa.zones.every(z => !/quattordici|14/.test(z.key)));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  L'ALLENAMENTO ASA\n");

const tr = GAME_MODES.asa_training;
ok("il modo esiste", !!tr);
ok("una freccia sola", tr && tr.arrowsPerTarget === 1);
ok("formato libero, come tutti gli allenamenti", tr && tr.freeFormat === true);
ok("le stesse quattro zone della gara",
   tr && asa && tr.zones.map(z => z.key).join(",") === asa.zones.map(z => z.key).join(","));
ok("e lo stesso bareme della gara",
   tr && asa && JSON.stringify(tr.scoring[1]) === JSON.stringify(asa.scoring[1]));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  ASA NON E' NESSUN ALTRO\n");

const std = GAME_MODES.ifaa_3d;
const wa = GAME_MODES.wa_3d;
const ibo = GAME_MODES.ibo_3d;
ok("IFAA 3-D Standard esiste ancora", !!std);
ok("IBO esiste come modo separato", !!ibo);
ok("chiavi di zona diverse da IBO",
   asa && ibo && asa.zones.map(z => z.key).join(",") !== ibo.zones.map(z => z.key).join(","));
ok("la zona alta ASA vale 12, e in IBO quel nome non esiste proprio",
   asa && ibo && asa.scoring[1].dodici === 12 && ibo.scoring[1].dodici === undefined);
ok("il regolamento ASA non e' quello IBO",
   asa && ibo && asa.regolamento !== ibo.regolamento);
ok("il bareme ASA non e' lo stesso oggetto di quello IBO",
   asa && ibo && asa.scoring[1] !== ibo.scoring[1]);
ok("chiavi di zona diverse da IFAA",
   asa && std && asa.zones.map(z => z.key).join(",") !== std.zones.map(z => z.key).join(","));
ok("chiavi di zona diverse da World Archery (perfect/superspot/spot/sagoma)",
   asa && wa && asa.zones.map(z => z.key).join(",") !== wa.zones.map(z => z.key).join(","));
ok("nessuna zona ASA si chiama kill/vital/wound (quelle sono IFAA e NFAS)",
   asa && asa.zones.every(z => ["kill", "vital", "wound", "innerkill"].indexOf(z.key) === -1));
ok("ASA sta su un circuito suo",
   asa && asa.circuito === "asa" && !!CIRCUITI.asa, asa && asa.circuito);
ok("e su un regolamento suo",
   asa && asa.regolamento === "asa_proam" && !!REGOLAMENTI.asa_proam, asa && asa.regolamento);
ok("il circuito ASA non e' quello IFAA", asa && std && asa.circuito !== std.circuito);
ok("il bareme ASA non e' lo stesso oggetto di quello World Archery",
   asa && wa && asa.scoring[1] !== wa.scoring[1]);

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  LA FONTE E' SCRITTA NEL FILE, NON NELLA MEMORIA DI QUALCUNO\n");

const reg = REGOLAMENTI.asa_proam;
ok("il regolamento e' dichiarato", !!reg);
ok("porta l'anno 2026", reg && /2026/.test(String(reg.versione)), reg && reg.versione);
ok("porta l'indirizzo ufficiale",
   reg && /asaarchery\.com/.test(String(reg.url)), reg && reg.url);
ok("si dichiara verificato: la pagina e' stata letta",
   reg && reg.verifica === "verificato", reg && reg.verifica);
ok("sta sul circuito ASA", reg && reg.circuito === "asa", reg && reg.circuito);

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  CHI CI ARRIVA\n");

const fed = FEDERATIONS.asa;
ok("la federazione ASA esiste", !!fed);
ok("ha il Pro/Am fra le gare",
   fed && (fed.garaModes || []).indexOf("asa_proam") !== -1,
   fed && JSON.stringify(fed.garaModes));
ok("e il suo allenamento", fed && fed.trainingMode === "asa_training", fed && fed.trainingMode);
ok("NON offre gare di altri circuiti", fed && (fed.garaModes || []).every(k => /^asa_/.test(k)));
ok("NON offre gare IFAA",
   fed && (fed.garaModes || []).every(k => !/^ifaa/.test(k)));

const altreConAsa = Object.keys(FEDERATIONS).filter(function (f) {
  return f !== "asa" && (FEDERATIONS[f].garaModes || []).indexOf("asa_proam") !== -1;
});
ok("nessun'altra federazione offre il Pro/Am ASA",
   altreConAsa.length === 0, altreConAsa.join(", "));

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  LE PAROLE, IN TUTTE E NOVE LE LINGUE\n");

const LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
const CHIAVI = [
  "mode_asa_proam_label", "mode_asa_proam_tag", "mode_asa_proam_unit", "mode_asa_proam_desc",
  "mode_asa_training_label", "mode_asa_training_tag", "mode_asa_training_unit", "mode_asa_training_desc",
  "zone_asa_dodici", "zone_asa_dieci", "zone_asa_otto", "zone_asa_cinque",
  "country_usa"
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

  // LE ZONE RESTANO NUMERI, IN OGNI LINGUA. «12» e' il nome che il
  // regolamento da' all'anello, non una parola da tradurre.
  const ZKEY = ["zone_asa_dodici", "zone_asa_dieci", "zone_asa_otto", "zone_asa_cinque"];
  const ZNUM = ["12", "10", "8", "5"];
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    ok(lg + ": gli anelli si chiamano ancora 12/10/8/5",
       ZNUM.every((n, i) => String(d[ZKEY[i]] || "").indexOf(n) !== -1),
       ZKEY.map(k => d[k]).join("/"));
  });

  // NESSUNA CONTAMINAZIONE: le parole ASA non devono nominare IBO ne' IFAA.
  LINGUE.forEach(function (lg) {
    const d = STRINGS[lg] || {};
    const testo = [d.mode_asa_proam_label, d.mode_asa_proam_tag, d.mode_asa_proam_desc,
                   d.mode_asa_training_label, d.mode_asa_training_desc].join(" ");
    ok(lg + ": le parole ASA non nominano IBO ne' IFAA",
       !/\bIBO\b/.test(testo) && !/\bIFAA\b/.test(testo), testo.slice(0, 80));
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log("\n  IL MARCHIO DEL BAREME\n");

// `scoringVersion` non serve a oggi: serve al giorno in cui ASA cambiera' un
// numero. Senza marchio, un giro di oggi e uno di domani sarebbero
// indistinguibili nello storico — ed e' esattamente l'incidente IFAA del
// 28/08/2026, che e' costato una migrazione.
let schema = null;
try {
  schema = eval(ritaglia("var IFAA_SCHEMA =", "\n/* La chiave con cui un giro entra") +
    "\n; ({ IFAA_SCHEMA:IFAA_SCHEMA," +
    " ASA_SCHEMA:(typeof ASA_SCHEMA!=='undefined'?ASA_SCHEMA:null)," +
    " IBO_SCHEMA:(typeof IBO_SCHEMA!=='undefined'?IBO_SCHEMA:null)," +
    " schemaPunteggio:schemaPunteggio })");
} catch (e) { console.log("    (" + e.message + ")"); }

ok("il blocco degli schemi si legge", !!schema);
if (schema) {
  ok("ASA ha un marchio suo", typeof schema.ASA_SCHEMA === "string" && !!schema.ASA_SCHEMA,
     String(schema.ASA_SCHEMA));
  ok("il marchio ASA nomina l'anno del regolamento",
     /2026/.test(String(schema.ASA_SCHEMA)), String(schema.ASA_SCHEMA));
  ok("il marchio ASA non e' quello IFAA", schema.ASA_SCHEMA !== schema.IFAA_SCHEMA);
  ok("il marchio ASA non e' quello IBO", schema.ASA_SCHEMA !== schema.IBO_SCHEMA);
  ok("un giro asa_proam nasce marchiato",
     schema.schemaPunteggio("asa_proam") === schema.ASA_SCHEMA,
     String(schema.schemaPunteggio("asa_proam")));
  ok("e un giro IFAA continua a nascere col suo",
     schema.schemaPunteggio("ifaa_3d") === schema.IFAA_SCHEMA);
}

console.log("\n  " + passate + " passate, " + fallite + " fallite.\n");
process.exit(fallite ? 1 : 0);
