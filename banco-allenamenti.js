#!/usr/bin/env node
/* banco-allenamenti.js — le due tendine degli allenamenti aperti, provate.
 *
 *   node banco-allenamenti.js
 *
 * PERCHE' ESISTE. Il 20/08/2026, in un giorno solo, sono usciti due difetti
 * che il codice non mostrava a chi lo leggeva: delle regole scritte dentro
 * `@media (min-width:900px)` — giuste nel file, mute sul telefono — e un giro
 * di foto che scattava nove volte la stessa schermata. Tutti e due si sono
 * visti solo facendo GIRARE l'app.
 *
 * Le tendine hanno la stessa forma di rischio: compaiono a una certa
 * condizione, filtrano, e quello che tolgono non si vede per definizione.
 * Un filtro sbagliato non da' nessun errore: mostra di meno, e chi guarda
 * pensa che di meno ci sia.
 *
 * COME FA. Prepara una copia di index.html con DEV_MODE acceso e una riga in
 * piu' che espone `otSectionCard` alla pagina — la riga sta SOLO nella copia
 * del banco, mai nel file vero. Poi monta la scheda con degli allenamenti
 * finti e guarda cosa esce.
 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright");

var DOVE = path.join(require("os").tmpdir(), "arctrail-banco-allenamenti");
if (!fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });

var src = fs.readFileSync("app.html", "utf8");
if (src.indexOf("var DEV_MODE = false;") < 0) throw new Error("DEV_MODE non trovato");
var GANCIO = "\nwindow.__prova = {\n" +
  "  card: function(){ return otSectionCard(false); },\n" +
  "  setOT: function(x){ openTrainings = x; },\n" +
  "  setFiltro: function(r,p){ otReg = r; otProv = p; },\n" +
  "  setNascosti: function(o){ otNascosti = o; },\n" +
  "  setProfili: function(x){ publicProfilesCache = x; }\n" +
  "};\n";
if (src.indexOf("\ninitAuthFlow();") < 0) throw new Error("punto di aggancio non trovato");
var copia = src.replace("var DEV_MODE = false;", "var DEV_MODE = true;")
               .replace("\ninitAuthFlow();", GANCIO + "initAuthFlow();");
fs.writeFileSync(path.join(DOVE, "index.html"), copia);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

/* Due compagnie in due regioni diverse, prese dai dati veri. */
var COMPAGNIE = {};
(function () {
  var s = fs.readFileSync("compagnie-data.js", "utf8");
  var f = new Function(s + "\nreturn (typeof COMPAGNIE !== 'undefined') ? COMPAGNIE : {};");
  COMPAGNIE = f();
})();
var codici = Object.keys(COMPAGNIE);
var A = codici.filter(function (k) { return COMPAGNIE[k].regione && COMPAGNIE[k].provincia; })[0];
var regA = COMPAGNIE[A].regione;
var B = codici.filter(function (k) { return COMPAGNIE[k].regione && COMPAGNIE[k].regione !== regA; })[0];
var A2 = codici.filter(function (k) {
  return COMPAGNIE[k].regione === regA && COMPAGNIE[k].provincia !== COMPAGNIE[A].provincia;
})[0];

var ok = 0, ko = 0;
function prova(nome, cond, extra) {
  if (cond) { ok++; console.log("  ✓ " + nome); }
  else { ko++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}

function ot(id, clubCode) {
  return { id: id, clubCode: clubCode, ownerUid: "x" + id, ownerName: "Tizio " + id,
           field: "Campo " + id, date: "2026-08-25", time: "10:00",
           datetime: Date.now() + 86400000, spots: 3, visibility: "all",
           invitedUids: [], participantUids: [], participants: [], status: "active" };
}

(async function () {
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', JSON.stringify({" +
    "screen:'menu',tab:'tira',pendingArchers:[],lang:'it',country:'it',federation:'fiarc'," +
    "theme:'light',profile:{nomeCognome:'A Z',username:'alez'},profileSkipped:false" +
    "})); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(String(e.message)); });
  await page.goto("file:///" + path.join(DOVE, "index.html").replace(/\\/g, "/"));
  await page.waitForTimeout(1300);

  var agganciato = await page.evaluate(function () { return !!window.__prova; });
  prova("il gancio del banco c'e'", agganciato);
  if (!agganciato) { console.log("\n  0 passate, 1 fallita.\n"); await browser.close(); process.exit(1); }

  async function monta(lista, reg, prov, nascosti) {
    return await page.evaluate(function (arg) {
      window.__prova.setOT(arg.lista);
      window.__prova.setFiltro(arg.reg || "", arg.prov || "");
      window.__prova.setNascosti(arg.nascosti || { far: 0, club: 0, blk: 0 });
      var c = window.__prova.card();
      var sel = c.querySelectorAll(".ot-filtri select");
      var nascostiEl = c.querySelector(".ot-nascosti");
      return {
        tendine: sel.length,
        opzioniReg: sel[0] ? Array.prototype.map.call(sel[0].options, function (o) { return o.textContent; }) : [],
        opzioniProv: sel[1] ? Array.prototype.map.call(sel[1].options, function (o) { return o.textContent; }) : [],
        righe: c.querySelectorAll("[data-ot-row], .ot-filtri").length,
        testo: c.innerText.replace(/\s+/g, " "),
        nascosti: nascostiEl ? nascostiEl.textContent : null
      };
    }, { lista: lista, reg: reg, prov: prov, nascosti: nascosti });
  }

  console.log("\n  LE TENDINE COMPAIONO DA DUE ALLENAMENTI IN SU");
  /* La regola era «da due REGIONI in su», e il ragionamento reggeva: un
     comando con una risposta sola non e' un comando. Ma due allenamenti
     vicini stanno quasi sempre nella STESSA regione — cioe' la regola
     nascondeva la tendina proprio nel caso in cui si va a cercarla.
     Chi non la trova conclude che non c'e'. */
  var r0 = await monta([ot("1", A)]);
  prova("un allenamento solo → nessuna tendina", r0.tendine === 0, "trovate " + r0.tendine);
  var r1 = await monta([ot("1", A), ot("2", A)]);
  prova("due nella STESSA regione → la tendina c'e' lo stesso", r1.tendine === 1, "trovate " + r1.tendine);
  prova("e dice dove sono, col conto",
        r1.opzioniReg.join("|").indexOf(regA + " (2)") >= 0, r1.opzioniReg.join(" | "));
  var r2 = await monta([ot("1", A), ot("2", B)]);
  prova("due regioni → la tendina della regione c'e'", r2.tendine >= 1, "trovate " + r2.tendine);
  prova("la tendina si apre su «tutte»", /Tutte/.test(r2.opzioniReg[0] || ""), r2.opzioniReg[0]);
  prova("le regioni sono quelle vere, col conto",
        r2.opzioniReg.join("|").indexOf(regA + " (1)") >= 0, r2.opzioniReg.join(" | "));

  console.log("\n  CHI HA SCRITTO IL CAMPO A MANO NON SPARISCE");
  var r3 = await monta([ot("1", A), ot("2", null)]);
  prova("senza compagnia compare una voce sua",
        r3.opzioniReg.join("|").indexOf("Fuori compagnia") >= 0, r3.opzioniReg.join(" | "));
  prova("e l'allenamento resta in elenco", /Campo 2/.test(r3.testo));

  console.log("\n  LA PROVINCIA DIPENDE DALLA REGIONE");
  var r4 = await monta([ot("1", A), ot("2", A2), ot("3", B)], regA, "");
  prova("scelta la regione, compare la provincia", r4.tendine === 2, "tendine " + r4.tendine);
  prova("ci sono le due province di quella regione", r4.opzioniProv.length === 3, r4.opzioniProv.join(" | "));
  var r5 = await monta([ot("1", A), ot("2", B)], regA, "");
  prova("con una provincia sola non si offre la tendina", r5.tendine === 1, "tendine " + r5.tendine);

  console.log("\n  QUELLO CHE IL FILTRO TOGLIE VIENE DETTO");
  prova("filtrando si dice quanti sono nascosti",
        r5.nascosti && /1 nascosti dal filtro/.test(r5.nascosti), r5.nascosti);
  prova("e l'altro non e' in elenco", !/Campo 2/.test(r5.testo));

  console.log("\n  E ANCHE QUELLO CHE TOLGONO I FILTRI VOLUTI");
  var r6 = await monta([ot("1", A)], "", "", { far: 2, club: 1, blk: 0 });
  prova("dice i sette giorni", r6.nascosti && /2 oltre i 7 giorni/.test(r6.nascosti), r6.nascosti);
  prova("dice l'altra compagnia", r6.nascosti && /1 altra compagnia/.test(r6.nascosti), r6.nascosti);
  var r7 = await monta([ot("1", A)], "", "", { far: 0, club: 0, blk: 0 });
  prova("e quando non manca niente non dice niente", r7.nascosti === null, r7.nascosti);

  /* CHI CAMBIA USERNAME NON RESTA CHIAMATO COL NOME VECCHIO.
     (20/08/2026, dal campo.) Il nome e' copiato dentro l'allenamento e dentro
     ogni messaggio quando vengono scritti. La copia resta — rifarle tutte
     sarebbe riscrivere mezzo database — ma non e' piu' lei a comandare:
     `public_profiles` ha il nome vero, e la copia diventa il ripiego. */
  console.log("\n  CHI CAMBIA NOME LO CAMBIA DAPPERTUTTO");
  async function conNome(profili, ot1) {
    return await page.evaluate(function (arg) {
      window.__prova.setProfili(arg.profili);
      window.__prova.setOT([arg.ot1]);
      window.__prova.setFiltro("", "");
      window.__prova.setNascosti({ far: 0, club: 0, blk: 0 });
      return window.__prova.card().innerText.replace(/\s+/g, " ");
    }, { profili: profili, ot1: ot1 });
  }
  var vecchio = ot("1", A);
  vecchio.ownerUid = "u-cambia";
  vecchio.ownerName = "nomevecchio";
  vecchio.participants = [{ uid: "u-amico", name: "amicovecchio" }];

  var t1 = await conNome([{ uid: "u-cambia", username: "nomenuovo" },
                          { uid: "u-amico", username: "amiconuovo" }], vecchio);
  prova("l'organizzatore ha il nome nuovo", /nomenuovo/.test(t1), t1.slice(0, 120));
  prova("e non piu' quello vecchio", !/nomevecchio/.test(t1));
  prova("anche chi partecipa", /amiconuovo/.test(t1) && !/amicovecchio/.test(t1));

  var t2 = await conNome([], vecchio);
  prova("senza profilo pubblico resta il nome salvato", /nomevecchio/.test(t2), t2.slice(0, 120));

  var t3 = await conNome([{ uid: "u-altro", username: "estraneo" }], vecchio);
  prova("il nome di un altro non finisce addosso a nessuno",
        /nomevecchio/.test(t3) && !/estraneo/.test(t3));

  prova("nessun errore in pagina", errori.length === 0, errori[0]);

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
