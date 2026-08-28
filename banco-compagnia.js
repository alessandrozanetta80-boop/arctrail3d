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
 *   5. Un percorso PROPOSTO non si presenta come vero: lo vede chi l'ha
 *      proposto (se sparisse crederebbe di aver sbagliato a premere) e chi
 *      deve confermarlo. A tutti gli altri non compare finche' non e' vero.
 *   6. I numeri della compagnia sono veri: se non c'e' niente da contare non
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
  " referente:function(cod,uid,mail){ compagnieAdminCache = {}; compagnieAdminCache[cod] = { adminUid:uid, emailComp:mail||'' }; }," +
  " percorsi:function(cod,lista){ percorsiCampo[cod] = { stato:'pronto', lista:lista }; }," +
  " modulo:function(cod){ pcForm = cod; render(); }," +
  " visibili:function(cod){ return percorsiVisibili(cod).map(function(p){ return p.id; }); }," +
  " apri:function(){ compTab = null; state.tab = 'compagnie'; state.screen = 'menu'; render(); }," +
  " vai:function(k){ compTab = k; state.tab = 'compagnie'; state.screen = 'menu'; render(); }," +
  " tira:function(){ state.tab = 'tira'; state.screen = 'menu'; render(); }," +
  " ridisegna:function(){ render(); }" +
  "};" + NL;

var src = fs.readFileSync("app.html", "utf8");
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

/* ══ PRIMA DEL BROWSER, PERCHE' QUESTE SI POSSONO CHIEDERE AL FILE ═════════
   (23/08/2026.) Lo spazio compagnia mostrava una scheda bianca con dentro
   `nome + " — " + luogo`: «A.S.D. Arcieri del VCO & Valgrande — Via A.
   Alberti, Vignone (VB)», tre righe di titolo in cui l'indirizzo si
   travestiva da ragione sociale. I due dati sono separati nell'archivio da
   sempre: li incollava la schermata.
   E la testata giusta esisteva gia' — fascia, stemma, nome, indirizzo con lo
   spillo — ma la vedevano solo gli arcieri. Il referente no, proprio lui che
   quei dati li scrive.
   Queste prove stanno QUI e non dentro il browser di proposito: girano anche
   dove un browser non c'e', e il difetto che cercano si legge nel file. */
var src = fs.readFileSync(process.argv[2] || "app.html", "utf8");
console.log("\n  IL REFERENTE VEDE LA SUA COMPAGNIA COME LA VEDONO GLI ALTRI");
prova("lo spazio compagnia usa la testata vera",
      /wrap\.appendChild\(compagniaMiaCard\(codice\)\);/.test(src));
/* Il nome e l'indirizzo non si incollano: sono due dati e restano due. */
prova("il nome non e' piu' incollato all'indirizzo",
      !/COMPAGNIE\[codice\]\.nome \+ \(COMPAGNIE\[codice\]\.luogo/.test(src));
prova("e la testata li tiene separati, con lo spillo sull'indirizzo",
      /class="comp-nome">'\+escapeHtml\(nome\)/.test(src) &&
      /class="comp-sotto">'\+icon\("pin",16\)/.test(src));
/* Una scheda che conteneva solo il proprio titolo non separava: occupava. */
prova("non resta una scheda col solo titolo della sezione",
      !/head\.appendChild\(el\('<h2 class="section-title">'\+t\("club_space_title"\)/.test(src));

/* ── LA FASCIA ────────────────────────────────────────────────────────────
   L'onda era `--brand-ink` al 10%, disegnata quando la fascia era verde
   pieno. Sulla velatura del 23/08 diventava una seconda banda: staccava
   **1,228** dalla fascia, mentre la fascia stacca **1,201** dalla scheda
   sotto — il decoro si vedeva piu' della struttura.
   Torna facile: chi guarda una fascia vuota e' tentato di «arricchirla». */
console.log("\n  LA FASCIA E' PIATTA COME TUTTE LE ALTRE SUPERFICI");
prova("non c'e' nessuna onda sotto lo stemma",
      !/<path d="M0 40 Q90 20 180 34/.test(src));
prova("il confine con la scheda e' un filo, non un disegno",
      /\.comp-fascia\{[^}]*border-bottom:1px solid var\(--[a-z0-9-]+\)/.test(
        src.replace(/\s+/g, " ")));
/* Gli anelli sono l'unico segno d'identita' della fascia, e il loro colore
   NON puo' essere un primitivo: al chiaro la fascia e' chiara e serve un
   arancione scuro, al buio e' scura e lo stesso arancione crolla a 2,31. */
prova("non c'e' nessun anello nella fascia",
      !/comp-fascia[\s\S]{0,400}?<circle/.test(src));
prova("e non hanno piu' un velo sopra che li sbiadisce",
      !/<circle cx="310"[^>]*opacity="0.75"/.test(src));

/* ── LE IMPOSTAZIONI DEL PROFILO ──────────────────────────────────────────
   (23/08/2026.) Portavano dentro tre cose che il resto dell'app aveva gia'
   smesso di fare: un verde pieno con un `#fff` scritto a mano, una crocetta
   senza nome ne' area da premere, e «nome — luogo» incollati.
   L'ultima e' la piu' insidiosa: quella stringa finiva in `compagniaNome`, e
   da li' ricompariva nella pastiglia, nel profilo pubblico e negli
   allenamenti. *E' cosi' che un indirizzo diventa parte di una ragione
   sociale: nessuno lo scrive, lo copia una riga sola.* */
var cssP = (src.match(/<style>([\s\S]*?)<\/style>/) || ["",""])[1].replace(/\s+/g, " ");
console.log("\n  LE IMPOSTAZIONI DEL PROFILO SEGUONO IL RESTO");
prova("la compagnia scelta e' tinta, non verde piena",
      /\.club-scelto\{[^}]*background:var\(--verde-bg\)/.test(cssP) &&
      !/background:var\(--accent\);color:var\(--accent-ink\);border-radius:var\(--r-sm\)/.test(src));
prova("e non c'e' piu' un bianco scritto a mano nel tasto",
      !/color:#fff;font-size:var\(--t-lg\);cursor:pointer/.test(src));
/* Un carattere non e' un tasto: senza nome un lettore di schermo legge
   «times», e senza area da premere il pollice lo manca.
   IL NUMERO E' CAMBIATO, LA DOMANDA NO. (25/08/2026.) La prova pretendeva
   `--s-5`, cioe' 24px: era la misura del giorno in cui il tasto e' nato da un
   carattere nudo, ed era un passo avanti. Ma 24 resta sotto la soglia di
   qualunque bersaglio, e il 25/08 il tasto e' passato a `--hit` (44).
   *Il banco fissava il valore invece dell'intento, e cosi' e' diventato rosso
   per un miglioramento.* Adesso chiede quello che conta: che l'area ci sia e
   che sia quella standard dell'app. Se un giorno `--hit` cambia, questa riga
   lo segue senza bugie. */
prova("il tasto che toglie la compagnia ha un nome e un'area",
      /class="club-togli"[^>]*aria-label=/.test(src) &&
      /\.club-togli\{[^}]*width:var\(--hit\); height:var\(--hit\)/.test(cssP));
prova("il tasto e' tradotto, non scritto in italiano",
      /t\("profile_club_remove"\)/.test(src));
/* Si cerca su nome e luogo insieme, si mostra su due righe, si salva il nome. */
prova("i risultati mostrano nome e luogo su due righe",
      /class="club-voce"><b>'\+escapeHtml\(c\.nome\)/.test(src));
prova("e quello che si SALVA e' il nome, non la stringa incollata",
      /clubNome = c\.nome;/.test(src) && !/clubNome = label;/.test(src));

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

  /* ══ 6. I percorsi: l'arciere propone, la compagnia conferma ═══════════ */
  const PERC = [
    { id:"p1", clubCode:"01ARTU", nome:"Percorso Rosso", piazzole:24, stato:"confermato", createdBy:"u9" },
    { id:"p2", clubCode:"01ARTU", nome:"Anello del bosco", piazzole:12, stato:"proposto",
      createdBy:"io1", createdByName:"Alessandro Zanetta", note:"Parte dal parcheggio in alto." },
    { id:"p3", clubCode:"01ARTU", nome:"Percorso di un altro", piazzole:20, stato:"proposto",
      createdBy:"qualcunaltro", createdByName:"Marco B." }
  ];

  titolo("UN PERCORSO PROPOSTO NON SI PRESENTA COME VERO");
  await p.evaluate(function (arg) {
    window.__prova.entra("io1");
    window.__prova.referente("01ARTU", "un-altro-uid", "info@esempio.it");
    window.__prova.percorsi("01ARTU", arg);
    window.__prova.vai("mia");
  }, PERC);
  await p.waitForTimeout(300);
  var visti = await p.evaluate(function () { return window.__prova.visibili("01ARTU"); });
  prova("il confermato si vede", visti.indexOf("p1") >= 0);
  prova("il mio proposto si vede: se sparisse crederei di aver sbagliato a premere",
    visti.indexOf("p2") >= 0);
  prova("quello proposto da un ALTRO non si vede: comparirebbe come vero, e non lo e'",
    visti.indexOf("p3") < 0, visti.join(","));

  var vistaArciere = await p.evaluate(function () {
    var c = document.querySelectorAll(".cp-percorso-card");
    return {
      quante: c.length,
      attesa: document.querySelectorAll(".cp-percorso-card.in-attesa").length,
      decidi: document.querySelectorAll(".pc-decidi").length,
      testo: document.getElementById("app").innerText.replace(/\s+/g, " ")
    };
  });
  prova("due schede: il confermato e il mio", vistaArciere.quante === 2, "" + vistaArciere.quante);
  prova("il mio e' segnato come da confermare", vistaArciere.attesa === 1);
  prova("e lo dice a parole", vistaArciere.testo.indexOf("Aspetta la compagnia") >= 0);
  prova("posso ritirarlo", vistaArciere.testo.indexOf("Ritira") >= 0);
  prova("ma NON posso confermarlo io: non e' il mio campo", vistaArciere.decidi === 0);

  titolo("CHI RISPONDE DEL CAMPO PUO' CONFERMARE, E VEDE TUTTO");
  await p.evaluate(function (arg) {
    window.__prova.entra("ref1");
    window.__prova.referente("01ARTU", "ref1", "info@esempio.it");
    window.__prova.percorsi("01ARTU", arg);
    window.__prova.vai("mia");
  }, PERC);
  await p.waitForTimeout(300);
  var vistaRef = await p.evaluate(function () {
    return {
      visibili: window.__prova.visibili("01ARTU").length,
      decidi: document.querySelectorAll(".pc-decidi").length,
      testo: document.getElementById("app").innerText.replace(/\s+/g, " ")
    };
  });
  prova("li vede tutti e tre, anche quelli degli altri", vistaRef.visibili === 3, "" + vistaRef.visibili);
  prova("e ha due coppie Conferma/Rifiuta", vistaRef.decidi === 2, "" + vistaRef.decidi);
  prova("con le due parole giuste",
    vistaRef.testo.indexOf("Conferma") >= 0 && vistaRef.testo.indexOf("Rifiuta") >= 0);

  titolo("IL MODULO DICE CHE NON SI VEDE SUBITO");
  await p.evaluate(function () { window.__prova.modulo("01ARTU"); });
  await p.waitForTimeout(250);
  var mod = await p.evaluate(function () {
    var m = document.querySelector(".pc-modulo");
    return { c: !!m, campi: m ? m.querySelectorAll("input,textarea").length : 0,
             testo: m ? m.innerText.replace(/\s+/g, " ") : "" };
  });
  prova("il modulo si apre", mod.c);
  prova("tre campi: nome, piazzole, note", mod.campi === 3, "" + mod.campi);
  prova("e avverte che la compagnia deve confermare",
    mod.testo.indexOf("conferma che il percorso esiste") >= 0, mod.testo.slice(0, 90));
  prova("il tasto e' arancione: proporre e' pubblicare (PRD 9.3)",
    await p.evaluate(function () { return !!document.querySelector(".pc-modulo .btn-arancio"); }));

  prova("nessun errore in pagina", p.__err.length === 0, p.__err[0]);
  await browser.close();

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exitCode = ko ? 1 : 0;
})();
