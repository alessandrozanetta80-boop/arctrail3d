/* banco-compagnia.js — 20/08/2026
 *
 *   node banco-compagnia.js
 *
 * PERCHE' ESISTE. Il 20/08 l'area compagnia e' stata rifatta a schede e
 * l'allenamento e' diventato una riga che si apre. Sono due COMPORTAMENTI, e
 * gli altri undici banchi guardano altro: il guardiano guarda lo stile, i
 * banchi jsdom montano schermate che non sono queste, `banco-allenamenti`
 * guarda le tendine e non la riga.
 *
 * Le domande che conta fare sono cinque, e sono tutte «resta com'era dopo che
 * succede qualcosa»:
 *
 *   1. Le tre schede ci sono, e la porta d'ingresso dipende dal profilo:
 *      chi ha una compagnia entra da «La mia», chi non ce l'ha da «Scopri» —
 *      perche' «La mia» non avrebbe niente da dirgli.
 *   2. La scheda scelta sopravvive a render(). Iscriversi a un allenamento
 *      ridisegna la schermata: ritrovarsi sulla prima scheda dopo ogni gesto
 *      sarebbe peggio di non avere le schede.
 *   3. L'allenamento chiuso sta in una riga e dice quattro cose (quando,
 *      dove, quanti, ci vado), e aperto ne dice di piu'. E anche l'apertura
 *      sopravvive al ridisegno.
 *   4. La data e' una data e non un dato: «21 AGO», non «2026-08-21».
 *   5. I numeri della compagnia sono veri: se non c'e' niente da contare non
 *      compare nessuna fascia di zeri.
 *
 * Uscita 0 = tutto a posto. Uscita 1 = almeno una prova ha detto no.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var DOVE = path.join(os.tmpdir(), "arctrail-banco-compagnia");
if (!fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });

var NL = String.fromCharCode(10);
var GANCIO = NL + "window.__prova = {" +
  " setOT:function(x){ openTrainings = x; }," +
  " setProfili:function(x){ publicProfilesCache = x; }," +
  " entra:function(u){ currentUser = { uid:u, email:'io@esempio.it' }; }," +
  " club:function(c){ state.profile = state.profile || {}; state.profile.compagnia = c; }," +
  " scheda:function(){ return compTab; }," +
  " apri:function(){ compTab = null; state.tab = 'compagnie'; state.screen = 'menu'; render(); }," +
  " vai:function(k){ compTab = k; state.tab = 'compagnie'; state.screen = 'menu'; render(); }," +
  " tira:function(){ state.tab = 'tira'; state.screen = 'menu'; render(); }," +
  " ridisegna:function(){ render(); }" +
  "};" + NL;

var src = fs.readFileSync("index.html", "utf8");
if (src.indexOf("var DEV_MODE = false;") < 0) throw new Error("DEV_MODE non trovato");
if (src.indexOf(NL + "initAuthFlow();") < 0) throw new Error("punto di aggancio non trovato");
fs.writeFileSync(path.join(DOVE, "index.html"),
  src.replace("var DEV_MODE = false;", "var DEV_MODE = true;")
     .replace(NL + "initAuthFlow();", GANCIO + "initAuthFlow();"));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

/* Domani e fra tre giorni: dentro la finestra dei sette giorni, sempre. */
var DOMANI = new Date(Date.now() + 86400000);
var DOPO = new Date(Date.now() + 3 * 86400000);
function iso(d) { return d.toISOString().slice(0, 10); }
var MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

var OT = [
  { id: "a1", field: "Fornasona/Cascina Ronco, Cerrione (BI)", clubCode: "01ARTU",
    date: iso(DOMANI), time: "09:30", datetime: DOMANI.getTime(), spots: 5,
    ownerUid: "u9", ownerName: "Marco B.", participantUids: ["u7", "u8"],
    participants: [{ uid: "u7", name: "Anna" }, { uid: "u8", name: "Carlo" }],
    visibility: "club", note: "Portiamo il materiale FIARC.", lat: 45.4, lng: 8.1 },
  { id: "a2", field: "Madonna del Sasso (NO)", clubCode: "01BICO",
    date: iso(DOPO), time: "14:00", datetime: DOPO.getTime(), spots: 2,
    ownerUid: "u5", ownerName: "Giulia R.", participantUids: ["u4", "u3"],
    participants: [{ uid: "u4", name: "Pino" }, { uid: "u3", name: "Milly" }],
    visibility: "all" }
];

function stato(conClub) {
  return {
    screen: "menu", tab: "compagnie", pendingArchers: [], lang: "it", country: "it",
    federation: "fiarc", theme: "light", profileSkipped: false,
    profile: conClub
      ? { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01ARTU",
          compagniaNome: "A.P.D. Pietro Micca" }
      : { nomeCognome: "Alessandro Zanetta", username: "alez" }
  };
}

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}
function titolo(t) { console.log("\n  " + t); }

async function apri(browser, conClub) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3'," +
    JSON.stringify(JSON.stringify(stato(conClub))) +
    "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  page.__err = [];
  page.on("pageerror", function (e) { page.__err.push(String(e.message)); });
  await page.goto("file:///" + path.join(DOVE, "index.html").split(path.sep).join("/"));
  await page.waitForTimeout(1200);
  return page;
}

(async function () {
  var browser = await chromium.launch();

  /* ══ 1. Le tre schede, e da dove si entra ══════════════════════════════ */
  titolo("LE TRE SCHEDE, E LA PORTA DIPENDE DAL PROFILO");
  var p = await apri(browser, true);
  prova("il gancio del banco c'e'", await p.evaluate(function () { return !!window.__prova; }));
  await p.evaluate(function (ot) { window.__prova.entra("io1"); window.__prova.setOT(ot); window.__prova.apri(); }, OT);
  await p.waitForTimeout(250);

  var eti = await p.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".scheda"), function (b) { return b.textContent.trim(); });
  });
  prova("tre etichette", eti.length === 3, "trovate " + eti.length);
  prova("e sono La mia / Scopri / Gestisci", eti.join("|") === "La mia|Scopri|Gestisci", eti.join("|"));
  prova("chi ha una compagnia entra da «La mia»",
    await p.evaluate(function () { return window.__prova.scheda(); }) === "mia");
  prova("l'etichetta accesa e' la prima",
    await p.evaluate(function () { return document.querySelector(".scheda.on").textContent.trim(); }) === "La mia");

  var senza = await apri(browser, false);
  await senza.evaluate(function () { window.__prova.entra("io1"); window.__prova.apri(); });
  await senza.waitForTimeout(250);
  prova("chi NON ce l'ha entra da «Scopri»",
    await senza.evaluate(function () { return window.__prova.scheda(); }) === "scopri",
    await senza.evaluate(function () { return window.__prova.scheda(); }));
  prova("e «La mia» gli spiega cosa fare, non finge una compagnia",
    (await senza.evaluate(function () {
      window.__prova.vai("mia");
      return document.getElementById("app").innerText;
    })).indexOf("non è ancora impostata") >= 0);
  await senza.context().close();

  /* ══ 2. La scheda sopravvive al ridisegno ══════════════════════════════ */
  titolo("LA SCHEDA SCELTA SOPRAVVIVE AL RIDISEGNO");
  await p.evaluate(function () { window.__prova.vai("gestisci"); });
  await p.waitForTimeout(200);
  await p.evaluate(function () { window.__prova.ridisegna(); });
  await p.waitForTimeout(200);
  prova("dopo render() si e' ancora su Gestisci",
    await p.evaluate(function () { return window.__prova.scheda(); }) === "gestisci");
  prova("e l'etichetta accesa e' la terza",
    await p.evaluate(function () { return document.querySelector(".scheda.on").textContent.trim(); }) === "Gestisci");

  /* ══ 3. La riga dell'allenamento ═══════════════════════════════════════ */
  titolo("L'ALLENAMENTO CHIUSO STA IN UNA RIGA");
  await p.evaluate(function () { window.__prova.tira(); });
  await p.waitForTimeout(300);
  var righe = await p.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll(".al-blocco"), function (b) {
      return {
        testo: b.innerText.replace(/\s+/g, " ").trim(),
        aperta: b.classList.contains("aperta"),
        pill: b.querySelector(".al-pill") ? b.querySelector(".al-pill").textContent.trim() : null,
        quando: b.querySelector(".al-quando") ? b.querySelector(".al-quando").innerText.replace(/\s+/g, " ").trim() : null,
        piuVisibile: b.querySelector(".al-piu") ? getComputedStyle(b.querySelector(".al-piu")).display !== "none" : null,
        alto: b.getBoundingClientRect().height
      };
    });
  });
  prova("due allenamenti, due righe", righe.length === 2, "trovate " + righe.length);
  prova("nessuna e' aperta all'inizio", righe.every(function (r) { return !r.aperta; }));
  prova("il dettaglio e' nascosto", righe.every(function (r) { return r.piuVisibile === false; }));
  prova("una riga chiusa sta sotto i 90 pixel", righe.every(function (r) { return r.alto < 90; }),
    righe.map(function (r) { return Math.round(r.alto); }).join(" / "));
  prova("la nota dell'organizzatore NON si vede da chiusa",
    righe[0].testo.indexOf("materiale FIARC") < 0, righe[0].testo);
  prova("ma l'ora, i posti e chi organizza si'",
    righe[0].testo.indexOf("09:30") >= 0 && righe[0].testo.indexOf("3/6") >= 0 &&
    righe[0].testo.indexOf("Marco B.") >= 0, righe[0].testo);

  titolo("LA DATA E' UNA DATA, NON UN DATO");
  var atteso = String(DOMANI.getDate()) + " " + MESI[DOMANI.getMonth()];
  prova("il quadrato dice «" + atteso + "»",
    String(righe[0].quando).toLowerCase() === atteso, righe[0].quando);
  prova("e da nessuna parte c'e' «" + iso(DOMANI) + "»",
    righe[0].testo.indexOf(iso(DOMANI)) < 0, righe[0].testo);

  titolo("LA PASTIGLIA DICE COSA SI PUO' FARE");
  prova("dove c'e' posto: si puo' partecipare",
    righe[0].pill === "Partecipo", righe[0].pill);
  prova("dove non ce n'e': lo dice invece di offrirlo",
    righe[1].pill === "Al completo", righe[1].pill);
  prova("e non c'e' il segno di spunta a mangiare il nome del campo",
    String(righe[0].pill).indexOf("✔") < 0);

  titolo("SI APRE, E L'APERTURA SOPRAVVIVE AL RIDISEGNO");
  await p.evaluate(function () { document.querySelectorAll(".al-tocca")[0].click(); });
  await p.waitForTimeout(250);
  var dopo = await p.evaluate(function () {
    var b = document.querySelectorAll(".al-blocco")[0];
    return { aperta: b.classList.contains("aperta"), testo: b.innerText.replace(/\s+/g, " "),
             pill: getComputedStyle(b.querySelector(".al-azione")).display };
  });
  prova("la prima riga e' aperta", dopo.aperta);
  prova("adesso si vede la nota", dopo.testo.indexOf("materiale FIARC") >= 0);
  prova("e chi c'e'", dopo.testo.indexOf("Anna") >= 0 && dopo.testo.indexOf("Carlo") >= 0);
  prova("la pastiglia sparisce: sotto c'e' lo stesso gesto per esteso",
    dopo.pill === "none", dopo.pill);
  prova("e il tasto largo c'e'", dopo.testo.indexOf("Partecipo") >= 0);

  await p.evaluate(function () { window.__prova.ridisegna(); });
  await p.waitForTimeout(250);
  prova("dopo render() e' ancora aperta",
    await p.evaluate(function () { return document.querySelectorAll(".al-blocco")[0].classList.contains("aperta"); }));
  prova("e le altre restano chiuse",
    await p.evaluate(function () { return !document.querySelectorAll(".al-blocco")[1].classList.contains("aperta"); }));

  await p.evaluate(function () { document.querySelectorAll(".al-tocca")[0].click(); });
  await p.waitForTimeout(200);
  prova("toccandola di nuovo si richiude",
    await p.evaluate(function () { return !document.querySelectorAll(".al-blocco")[0].classList.contains("aperta"); }));

  /* ══ 4. I numeri sono veri ═════════════════════════════════════════════ */
  titolo("I NUMERI DELLA COMPAGNIA SONO VERI O NON CI SONO");
  await p.evaluate(function (ot) { window.__prova.setOT(ot); window.__prova.vai("mia"); }, OT);
  await p.waitForTimeout(300);
  var mia = await p.evaluate(function () {
    return {
      testa: !!document.querySelector(".comp-testa"),
      conti: !!document.querySelector(".comp-conti"),
      nome: document.querySelector(".comp-nome") ? document.querySelector(".comp-nome").textContent : "",
      righe: document.querySelectorAll(".comp-testa ~ .card .al-blocco").length,
      testo: document.getElementById("app").innerText.replace(/\s+/g, " ")
    };
  });
  prova("la testa della compagnia c'e'", mia.testa);
  prova("col nome giusto", mia.nome.indexOf("Pietro Micca") >= 0, mia.nome);
  prova("nessuna fascia di numeri: 01ARTU non ha percorsi ne' punteggi", !mia.conti);
  prova("e da nessuna parte compare «iscritti», che l'app non sa",
    mia.testo.indexOf("iscritti") < 0);
  prova("l'allenamento della MIA compagnia c'e'", mia.righe === 1, "righe " + mia.righe);
  prova("e quello dell'altra compagnia no", mia.testo.indexOf("Madonna del Sasso") < 0);

  /* ══ 5. Scopri: elenco, non tendina ════════════════════════════════════ */
  titolo("SCOPRI: UN ELENCO CHE SI GUARDA, NON UNO CHE SI APRE");
  await p.evaluate(function () { window.__prova.vai("scopri"); });
  await p.waitForTimeout(350);
  var sco = await p.evaluate(function () {
    var sel = document.getElementById("cpSelRegione");
    return {
      regione: sel ? sel.value : null,
      righe: document.querySelectorAll(".comp-riga").length,
      luogoSel: !!document.getElementById("cpSelLuogo"),
      prima: document.querySelector(".comp-riga") ? document.querySelector(".comp-riga").innerText.replace(/\s+/g, " ") : ""
    };
  });
  prova("la regione parte da quella della mia compagnia", sco.regione === "Piemonte", sco.regione);
  prova("la terza tendina non c'e' piu'", !sco.luogoSel);
  prova("al suo posto c'e' un elenco", sco.righe > 3, "righe " + sco.righe);

  await p.evaluate(function () {
    var r = document.querySelectorAll(".comp-riga");
    for (var i = 0; i < r.length; i++) { if (r[i].innerText.indexOf("Pietro Micca") >= 0) { r[i].click(); return; } }
  });
  await p.waitForTimeout(350);
  var scelta = await p.evaluate(function () {
    return { segnata: !!document.querySelector(".comp-riga.on"),
             scheda: !!document.getElementById("cp-scheda"),
             testo: document.getElementById("app").innerText.replace(/\s+/g, " ") };
  });
  prova("toccando una riga resta segnata", scelta.segnata);
  prova("e si apre la sua scheda", scelta.scheda);
  prova("con i suoi contatti veri", scelta.testo.indexOf("347 9533670") >= 0);

  prova("nessun errore in pagina", p.__err.length === 0, p.__err[0]);
  await browser.close();

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exitCode = ko ? 1 : 0;
})();
