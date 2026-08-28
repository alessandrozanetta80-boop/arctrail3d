#!/usr/bin/env node
/* banco-finale.js — la fine del giro dice cos'hai fatto, e non mente.
 *
 *   node banco-finale.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 17.) Il finale nuovo fa tre affermazioni su
 * una persona: quanto ha fatto, se e andato meglio di prima, e se e il suo
 * record. Sono tre frasi che si CREDONO senza controllare — nessuno riapre lo
 * storico per verificare un «+30» — e quindi sono tre bugie potenziali che
 * non darebbero nessun errore.
 *
 * Le tre trappole, e sono quelle che il banco guarda:
 *
 *   1. IL CONFRONTO SBAGLIATO. Dodici piazzole contro ventiquattro non e un
 *      confronto; e nemmeno due campi diversi. Il «qui» va detto solo quando
 *      il campo e davvero lo stesso.
 *   2. IL RECORD AL PRIMO GIRO. Una pastiglia «record personale» quando non
 *      c e niente prima e un complimento che non vuol dire niente, e insegna
 *      a non fidarsi della pastiglia.
 *   3. IL NUMERO INVENTATO. La durata esiste solo per i giri che sapevano a
 *      che ora erano cominciati: per gli altri non deve comparire uno zero,
 *      che sembrerebbe un dato.
 *
 * E la quarta prova non riguarda il finale: **la scheda di gara sotto deve
 * restare intera**. Il finale e stato aggiunto sopra; se un giorno si mangia
 * la classifica o il punteggio piazzola per piazzola, quella non e una
 * schermata piu bella, e una scheda che non si puo firmare.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-finale");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

var CAMPO = "Fornasona, Cerrione (BI)";

/* Un giro pronto all'ultima piazzola: le prime undici gia' segnate, la
   dodicesima la tira il banco. Cosi' si passa davvero dalla strada vera —
   tastiera, sosta finale, salvataggio nello storico — invece di seminare una
   schermata di riepilogo che nessun utente vedrebbe mai. */
function giroAllUltima(opz) {
  opz = opz || {};
  var scores = { a1: [] };
  for (var i = 0; i < 11; i++) scores.a1.push({ arrows: [opz.punti || 15], total: opz.punti || 15 });
  var st = {
    screen: "round", tab: "tira", roundActive: true, mode: opz.mode || "training", format: 12,
    archers: [{ id: "a1", name: "Alessandro", isSelf: true }],
    archersBase: [{ id: "a1", name: "Alessandro", isSelf: true }],
    rotBaseTarget: 1, scores: scores, target: 12, archerIndex: 0, arrowIndex: 0,
    pendingArrows: [], liveBattutaTypes: {}, awaitingStep: null, savedToHistory: false,
    roundEntryDate: null, firme: {}, consegna: null, sessionId: null,
    campo: (opz.campo === null ? null : (opz.campo || CAMPO)),
    lang: "it", country: "it", federation: "fiarc", theme: "light", pendingArchers: [],
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
    profileSkipped: false
  };
  if (opz.startedAt !== null) st.startedAt = Date.now() - (opz.minuti || 97) * 60000;
  return st;
}

function giroVecchio(giorniFa, tot, campo, formato) {
  var n = formato || 12, per = [], resto = tot;
  for (var i = 0; i < n; i++) { var v = Math.round(resto / (n - i)); per.push(v); resto -= v; }
  return { date: new Date(Date.now() - giorniFa * 86400000).toISOString(), format: n,
    modeKey: "training", modeLabel: "Allenamento", campo: campo || null, durata: 105,
    results: [{ name: "Alessandro", total: tot, isSelf: true, ownerUid: null,
      perTarget: per, arrows: per.map(function (x) { return [x]; }) }] };
}

async function finisci(browser, stato, storico) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  var semi = "try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato)) + ");" +
    (storico ? " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(storico)) + ");" : "") +
    " localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}";
  await ctx.addInitScript(semi);
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1300);
  await page.evaluate(function () { var x = document.querySelector(".home-riprendi"); if (x) x.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(function () { var x = document.querySelector(".quick-btn"); if (x) x.click(); });
  await page.waitForTimeout(600);
  await page.evaluate(function () {
    var x = document.querySelector(".target-stage") ? document.querySelector("#app .btn-primary") : null;
    if (x) x.click();
  });
  await page.waitForTimeout(1300);
  return { ctx: ctx, page: page, err: err };
}

function leggiFinale() {
  var h = document.querySelector(".fin-hero");
  var zone = Array.prototype.map.call(document.querySelectorAll(".fin-zona"), function (z) {
    return { testo: z.textContent.trim(), n: parseInt(z.querySelector("b").textContent, 10) };
  });
  var numeri = Array.prototype.map.call(document.querySelectorAll(".fin-n"), function (n) {
    return (n.querySelector(".fin-n-lbl") || {}).textContent + "=" + (n.querySelector(".fin-n-val") || {}).textContent;
  });
  return {
    c: !!h,
    grande: (document.querySelector(".fin-num") || {}).textContent || "",
    vs: (document.querySelector(".fin-vs") || {}).textContent || "",
    record: !!document.querySelector(".fin-record"),
    numeri: numeri, zone: zone,
    nonSiStampa: !!(h && h.className.indexOf("no-print") >= 0),
    // la scheda di gara, che sta sotto e non deve essersi persa
    classifica: !!document.querySelector(".score-table"),
    piazzolaPerPiazzola: document.querySelectorAll(".piazz-card").length,
    // il rito della consegna: c'e' o non c'e'
    schedaDaFirmare: !!document.querySelector(".scheda-nota") || !!document.querySelector(".firma-riga"),
    uscitaPrincipale: (function () {
      var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
        return /Torna al menu/i.test(x.textContent);
      })[0];
      return b ? (b.className.indexOf("btn-primary") >= 0 ? "primario" : "secondario") : "assente";
    })()
  };
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  IL NUMERO GRANDE, E IL CONFRONTO COL GIRO PRECEDENTE QUI");
  var a = await finisci(browser, giroAllUltima(), [giroVecchio(6, 150, CAMPO)]);
  var v = await a.page.evaluate(leggiFinale);
  prova("il finale c'e'", v.c);
  prova("il punteggio grande e' il totale (180)", /180/.test(v.grande), v.grande);
  prova("dice +30 rispetto al giro precedente", /\+30/.test(v.vs), v.vs);
  prova("e dice che era lo stesso campo", /qui/i.test(v.vs), v.vs);
  prova("e' un record, perche' 180 batte 150", v.record);
  prova("i numeri ci sono", v.numeri.length >= 4, v.numeri.join(" · "));
  prova("la durata c'e', perche' il giro sapeva quando era cominciato",
        v.numeri.some(function (x) { return /Durata=/.test(x); }), v.numeri.join(" · "));
  prova("le frecce contate nelle zone sono dodici come le piazzole",
        v.zone.reduce(function (s, z) { return s + z.n; }, 0) === 12,
        v.zone.map(function (z) { return z.testo; }).join(" | "));
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);

  console.log("\n  E LA SCHEDA DI GARA E' ANCORA TUTTA LI'");
  prova("la classifica c'e'", v.classifica);
  prova("e il punteggio piazzola per piazzola (dodici)", v.piazzolaPerPiazzola === 12,
        v.piazzolaPerPiazzola + " piazzole");
  prova("il finale non finisce sulla carta", v.nonSiStampa);
  await a.ctx.close();

  console.log("\n  UN CAMPO DIVERSO NON E' «QUI»");
  var b = await finisci(browser, giroAllUltima(), [giroVecchio(6, 150, "Altro bosco (VB)")]);
  var vb = await b.page.evaluate(leggiFinale);
  prova("il confronto si fa lo stesso", /\+30/.test(vb.vs), vb.vs);
  prova("ma non dice «qui»", !/\bqui\b/i.test(vb.vs), vb.vs);
  prova("e lo dichiara: altro campo", /campo/i.test(vb.vs), vb.vs);
  await b.ctx.close();

  console.log("\n  DODICI PIAZZOLE NON SI CONFRONTANO CON VENTIQUATTRO");
  var c = await finisci(browser, giroAllUltima(), [giroVecchio(6, 300, CAMPO, 24)]);
  var vc = await c.page.evaluate(leggiFinale);
  prova("il giro da 24 non viene usato per il confronto",
        !/\+|−/.test(vc.vs) && vc.vs.length > 5, vc.vs);
  prova("e nemmeno per il record", !vc.record, "record: " + vc.record);
  await c.ctx.close();

  console.log("\n  IL PRIMO GIRO NON E' UN RECORD");
  var d = await finisci(browser, giroAllUltima(), []);
  var vd = await d.page.evaluate(leggiFinale);
  prova("niente pastiglia del record", !vd.record);
  prova("e lo dice, invece di lasciare la riga vuota", vd.vs.length > 10, vd.vs);
  await d.ctx.close();

  console.log("\n  UN GIRO PEGGIORE NON DIVENTA UN RECORD");
  var e = await finisci(browser, giroAllUltima({ punti: 10 }), [giroVecchio(6, 150, CAMPO)]);
  var ve = await e.page.evaluate(leggiFinale);
  // undici piazzole da 10 piu l ultima segnata dal banco col tasto piu alto (15)
  prova("il totale e' 125", /125/.test(ve.grande), ve.grande);
  prova("il confronto e' in negativo", /[−25]25/.test(ve.vs) || /−25/.test(ve.vs), ve.vs);
  prova("e non c'e' nessun record", !ve.record);
  await e.ctx.close();

  /* GARA LIBERA: NESSUNA SCHEDA DA FIRMARE. (25/08/2026.)
     Fino a oggi bastava il MODO da gara — Percorso, Round 3D, Tracciato,
     Battuta — perche' il finale chiedesse le firme e dicesse «Consegna la
     scheda». Ma quei modi sono proprio quelli che si usano in Gara libera,
     dove la scheda non va da nessuna parte: da soli chiedeva «la firma di un
     altro arciere» che non c'era, e teneva l'uscita in secondo piano.

     SI PROVA SU «TRACCIATO», E NON SUGLI ALTRI TRE, per un motivo del banco e
     non dell'app: questo apparecchio finisce il giro tirando UNA freccia per
     piazzola, e Percorso, Round 3D e Battuta ne vogliono due o tre. Con quelli
     il giro non arriva in fondo, il finale non compare — e una prova che passa
     perche' la schermata non c'e' e' peggio di nessuna prova. Percio' la
     prima cosa che si chiede e' che il finale ci sia davvero.

     La prova e' in negativo, quindi va tenuta: il giorno che qualcuno
     riaccende la scheda sul modo invece che sulla gara, questa dice di no. */
  console.log("\n  IN GARA LIBERA NON SI FIRMA NIENTE");
  var g = await finisci(browser, giroAllUltima({ mode: "tracciato" }), []);
  var vg = await g.page.evaluate(leggiFinale);
  prova("il finale c'e' davvero (se no la prova sotto non vale niente)", vg.c);
  prova("nessuna scheda da firmare", !vg.schedaDaFirmare);
  prova("l'uscita e' il tasto principale", vg.uscitaPrincipale === "primario", vg.uscitaPrincipale);
  prova("e la classifica sotto e' rimasta", vg.classifica);
  await g.ctx.close();

  console.log("\n  QUELLO CHE NON SI SA NON SI SCRIVE");
  var f = await finisci(browser, giroAllUltima({ startedAt: null }), [giroVecchio(6, 150, CAMPO)]);
  var vf = await f.page.evaluate(leggiFinale);
  prova("senza ora d'inizio la durata non compare affatto",
        !vf.numeri.some(function (x) { return /Durata=/.test(x); }), vf.numeri.join(" · "));
  prova("e non compare nemmeno uno zero al suo posto",
        !vf.numeri.some(function (x) { return /Durata=0/.test(x); }), vf.numeri.join(" · "));
  await f.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
