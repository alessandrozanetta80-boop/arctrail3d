#!/usr/bin/env node
/* banco-giro-sicuro.js — il giro in corso non muore col telefono.
 *
 *   node banco-giro-sicuro.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 16.5-16.7.) Fino a oggi un giro fatto da
 * soli viveva solo nel localStorage di quel telefono: spegnilo alla piazzola
 * 18 e diciotto piazzole non esistono piu. Adesso il giro viene copiato fuori
 * a ogni piazzola chiusa, e se lo si ritrova si puo riprendere.
 *
 * E questa e la parte che nessun altro banco puo guardare, per un motivo
 * preciso: un salvataggio che non parte NON DA NESSUN ERRORE. La schermata
 * continua a funzionare, i punti si segnano, tutto sembra a posto — e la
 * copia non c e. Se un giorno qualcuno toglie una delle quattro chiamate,
 * l app gira uguale e nessuno se ne accorge fino al giorno in cui serviva.
 *
 * LA CONTROFIGURA, dichiarata. Qui dentro Firebase non c e: i banchi girano
 * senza rete e senza account. Al posto del documento vero c e un oggetto in
 * pagina che si comporta come lui — accetta una scrittura, la ricorda, e
 * risponde di si o di no a comando. Quindi questo banco prova COSA l app
 * scrive e QUANDO, e come racconta quello che sta succedendo. **Non prova
 * che Firestore accetti quel documento**: quello lo dicono le regole e una
 * prova vera col telefono in mano.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-giro");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });

var html = require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8"));

// La sola riga sostituita: da dove arriva il documento. Tutto il resto —
// quando si scrive, cosa si scrive, cosa dice la riga di stato — e il codice
// vero dell'app.
var VERA = 'function cloudGiroRef(){\n' +
  'if(DEV_MODE || !db || !currentUser) return null;\n' +
  'return db.collection("users").doc(currentUser.uid).collection("giro_aperto").doc("corrente");\n}';
if (html.indexOf(VERA) < 0) { console.log("  ✗ cloudGiroRef non e' piu' quella attesa: il banco guarda un'altra app"); process.exit(1); }
// LA PORTICINA. Tutta l app vive dentro una chiusura: da fuori non si
// chiama niente. Il cartello del giro ritrovato lo accende onAuthReady, che
// senza Firebase non parte mai — quindi in questa copia (e solo qui) le due
// funzioni che servono vengono appese a window. Non e una scorciatoia sul
// codice provato: quello resta quello vero, cambia solo chi lo chiama.
html = html.replace(VERA, 'function cloudGiroRef(){ return window.__nubeRef || null; }\n' +
  'window.__banco = { cerca: function(){ return cercaGiroSulCloud(); },' +
  ' stato: function(){ return giroNube.stato; },' +
  ' nomeStorico: function(d){ return roundDocId(d); },' +
  ' giro: function(){ return { attivo: state.roundActive === true, schermata: state.screen,' +
  ' punti: state.scores ? Object.keys(state.scores).length : -1, tab: state.tab }; } };');
fs.writeFileSync(path.join(D, "index.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

// La controfigura: vive nella pagina, ricorda le scritture, e risponde come
// le si dice di rispondere.
var FINTA =
"window.__nube = { scritti: [], cancellati: 0, risposta: 'si', dentro: null };\n" +
"window.firebase = { firestore: { FieldValue: { serverTimestamp: function(){ return 'ORA'; } } } };\n" +
"window.__nubeRef = {\n" +
"  set: function(d){ window.__nube.scritti.push(d);\n" +
"    if(window.__nube.risposta === 'no') return Promise.reject(new Error('finta: rifiutata'));\n" +
"    if(window.__nube.risposta === 'muta') return new Promise(function(){});\n" +
"    return Promise.resolve(); },\n" +
"  get: function(){ return Promise.resolve({ exists: !!window.__nube.dentro,\n" +
"    data: function(){ return window.__nube.dentro; } }); },\n" +
"  delete: function(){ window.__nube.cancellati++; window.__nube.dentro = null; return Promise.resolve(); }\n" +
"};";

function senzaGiro() {
  return { screen: "menu", tab: "tira", roundActive: false, pendingArchers: [],
    lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
    profileSkipped: false };
}

function giroSeminato(piazzola, punti) {
  var scores = { a1: [] };
  for (var i = 0; i < (piazzola - 1); i++) scores.a1.push({ arrows: [punti], total: punti });
  return {
    screen: "round", tab: "tira", roundActive: true, mode: "training", format: 12,
    archers: [{ id: "a1", name: "Alessandro", isSelf: true }],
    archersBase: [{ id: "a1", name: "Alessandro", isSelf: true }],
    rotBaseTarget: 1, scores: scores, target: piazzola, archerIndex: 0, arrowIndex: 0,
    pendingArrows: [], liveBattutaTypes: {}, awaitingStep: null, savedToHistory: false,
    roundEntryDate: null, firme: {}, consegna: null, sessionId: null, campo: "Fornasona, Cerrione (BI)",
    lang: "it", country: "it", federation: "fiarc", theme: "light", pendingArchers: [],
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
    profileSkipped: false
  };
}

async function apri(browser, statoIniziale) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  await ctx.addInitScript(FINTA);
  if (statoIniziale) {
    await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(statoIniziale)) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  } else {
    await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  }
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  return { ctx: ctx, page: page, err: err };
}

// L'app all'apertura riparte sempre dalla home: al giro si torna dal banner,
// come farebbe una persona.
async function riprendi(page) {
  await page.evaluate(function () {
    // Con un giro aperto la Home cambia priorita e mostra una cosa sola da
    // fare: quello e il tasto che tocca una persona. Il gemello dentro la
    // scheda Tira ha id resumeBtn, e vale come ripiego.
    var b = document.querySelector(".home-riprendi") || document.getElementById("resumeBtn");
    if (b) b.click();
  });
  await page.waitForTimeout(500);
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  MENTRE SI SEGNA, LA COPIA PARTE");
  var a = await apri(browser, giroSeminato(4, 20));
  await riprendi(a.page);
  var inPista = await a.page.evaluate(function () {
    return { pista: !!document.querySelector(".pista"),
             dove: (document.querySelector(".pista-dove") || {}).textContent || "",
             stato: (document.querySelector(".pista-stato") || {}).textContent || "" };
  });
  prova("si e' nel giro", inPista.pista);
  prova("la riga dice dove si tira e con che regolamento",
        /Cerrione/.test(inPista.dove) && inPista.dove.indexOf("·") > 0, inPista.dove);

  // una freccia da 20: chiude la piazzola (allenamento 3D, una freccia)
  await a.page.evaluate(function () {
    var b = document.querySelector(".quick-btn");
    if (b) b.click();
  });
  await a.page.waitForTimeout(1200);
  var dopoUnaFreccia = await a.page.evaluate(function () {
    var n = window.__nube.scritti.length;
    var ultimo = n ? window.__nube.scritti[n - 1] : null;
    var giro = ultimo ? JSON.parse(ultimo.giro) : null;
    return { scritture: n, piazzola: ultimo ? ultimo.piazzola : 0,
             segnate: giro ? (giro.scores.a1 || []).length : -1,
             campo: ultimo ? ultimo.campo : null,
             stato: (document.querySelector(".pista-stato") || {}).textContent || "" };
  });
  prova("chiusa la piazzola, la copia parte", dopoUnaFreccia.scritture > 0, dopoUnaFreccia.scritture + " scritture");
  prova("e dentro c'e' il punteggio appena segnato", dopoUnaFreccia.segnate === 4, "piazzole segnate: " + dopoUnaFreccia.segnate);
  prova("con la piazzola e il campo, leggibili senza aprire il giro",
        dopoUnaFreccia.piazzola > 0 && /Cerrione/.test(dopoUnaFreccia.campo || ""), JSON.stringify(dopoUnaFreccia));
  prova("e la riga dice che e' al sicuro", /sicuro/i.test(dopoUnaFreccia.stato), dopoUnaFreccia.stato);
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  console.log("\n  QUANDO NON PARTE, LO DICE — E NON DICE CHE E' SALVATO");
  var b = await apri(browser, giroSeminato(3, 15));
  await b.page.evaluate(function () { window.__nube.risposta = "no"; });
  await riprendi(b.page);
  await b.page.evaluate(function () {
    var x = document.querySelector(".quick-btn");
    if (x) x.click();
  });
  await b.page.waitForTimeout(1200);
  var rotto = await b.page.evaluate(function () {
    return { stato: (document.querySelector(".pista-stato") || {}).textContent || "",
             classe: (document.querySelector(".pista-stato") || {}).className || "",
             provato: window.__nube.scritti.length };
  });
  prova("ci ha provato", rotto.provato > 0);
  prova("e dice che non e' partito", /non inviat/i.test(rotto.stato), rotto.stato);
  prova("senza mentire dicendo «al sicuro»", !/sicuro/i.test(rotto.stato), rotto.stato);
  prova("e si vede che e' un guaio, non solo dal colore", rotto.classe.indexOf("rotto") >= 0, rotto.classe);
  await b.ctx.close();

  console.log("\n  SENZA RETE: SI SEGNA LO STESSO, E LA COPIA ASPETTA");
  var c = await apri(browser, giroSeminato(2, 18));
  await c.page.evaluate(function () {
    try { Object.defineProperty(window.navigator, "onLine", { get: function () { return false; }, configurable: true }); } catch (e) {}
    window.__nube.risposta = "muta";   // offline: la scrittura resta in coda
  });
  await riprendi(c.page);
  await c.page.evaluate(function () {
    var x = document.querySelector(".quick-btn");
    if (x) x.click();
  });
  await c.page.waitForTimeout(1200);
  var senzaRete = await c.page.evaluate(function () {
    var giro = JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}");
    return { stato: (document.querySelector(".pista-stato") || {}).textContent || "",
             segnateSulTelefono: ((giro.scores || {}).a1 || []).length };
  });
  prova("il punteggio e' sul telefono comunque", senzaRete.segnateSulTelefono === 2,
        "piazzole sul telefono: " + senzaRete.segnateSulTelefono);
  prova("e la riga dice che partira' da sola", /rete|invia/i.test(senzaRete.stato), senzaRete.stato);
  await c.ctx.close();

  console.log("\n  IL GIRO RITROVATO");
  var d = await apri(browser, senzaGiro());
  await d.page.evaluate(function () {
    window.__nube.dentro = { giro: JSON.stringify({
      roundActive: true, mode: "training", format: 12, target: 7, archerIndex: 0, arrowIndex: 0,
      archers: [{ id: "a1", name: "Alessandro", isSelf: true }],
      archersBase: [{ id: "a1", name: "Alessandro", isSelf: true }], rotBaseTarget: 1,
      scores: { a1: [{arrows:[20],total:20},{arrows:[20],total:20},{arrows:[20],total:20},
                     {arrows:[20],total:20},{arrows:[20],total:20},{arrows:[16],total:16}] },
      pendingArrows: [], liveBattutaTypes: {}, campo: "Fornasona, Cerrione (BI)" }),
      piazzola: 7, piazzole: 12, modo: "Allenamento 3D", campo: "Fornasona, Cerrione (BI)" };
    window.__banco.cerca();
  });
  await d.page.waitForTimeout(700);
  var cartello = await d.page.evaluate(function () {
    var n = document.querySelector(".resume-banner.ritrovato");
    return { c: !!n, testo: n ? n.innerText.replace(/\s+/g, " ") : "" };
  });
  prova("il cartello compare", cartello.c);
  prova("e dice a che piazzola si era", /7/.test(cartello.testo) && /12/.test(cartello.testo), cartello.testo);
  prova("e dove si stava tirando", /Cerrione/.test(cartello.testo), cartello.testo);

  await d.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".ritrovato button"), function (x) { return true; });
    var t = document.querySelector(".resume-banner.ritrovato .btn-primary");
    if (t) t.click();
  });
  await d.page.waitForTimeout(800);
  var ripreso = await d.page.evaluate(function () {
    var st = JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}");
    return { pista: !!document.querySelector(".pista"), target: st.target,
             segnate: ((st.scores || {}).a1 || []).length, totale: ((st.scores || {}).a1 || [])
               .reduce(function (s, x) { return s + (x.total || 0); }, 0) };
  });
  prova("riprendendo si torna nel giro", ripreso.pista);
  prova("alla piazzola dove si era", ripreso.target === 7, "piazzola " + ripreso.target);
  prova("con tutti i punti di prima", ripreso.segnate === 6 && ripreso.totale === 116,
        ripreso.segnate + " piazzole, " + ripreso.totale + " punti");
  await d.ctx.close();

  console.log("\n  FINITO IL GIRO, LA COPIA SE NE VA");
  // Altrimenti il cartello «giro non finito» si presenterebbe il giorno dopo
  // per un giro che era finito benissimo — ed e' il modo piu' veloce per far
  // smettere di credere a un avviso.
  var f = await apri(browser, giroSeminato(12, 15));   // ultima piazzola di dodici
  await riprendi(f.page);
  await f.page.evaluate(function () {
    var b = document.querySelector(".quick-btn");
    if (b) b.click();
  });
  await f.page.waitForTimeout(600);
  // L'ultima piazzola non porta dritti al finale: c'e' la sosta dove si
  // sceglie fra vedere il risultato e aggiungerne un'altra. E' l'unica sosta
  // rimasta in tutto il giro, ed e' voluta.
  await f.page.evaluate(function () {
    // il tasto sta SOTTO la scheda, non dentro: e' il primo primario a schermo
    var b = document.querySelector(".target-stage") ? document.querySelector("#app .btn-primary") : null;
    if (b) b.click();
  });
  await f.page.waitForTimeout(1200);
  var finito = await f.page.evaluate(function () {
    var st = JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}");
    return { schermo: st.screen, attivo: st.roundActive, cancellati: window.__nube.cancellati };
  });
  prova("il giro e' finito", finito.schermo === "summary" && finito.attivo === false,
        finito.schermo + " / roundActive " + finito.attivo);
  prova("e la copia del giro in corso e' stata cancellata", finito.cancellati > 0,
        "cancellazioni: " + finito.cancellati);
  await f.ctx.close();

  console.log("\n  IL TELEFONO CHE HAI IN MANO HA RAGIONE");
  var e = await apri(browser, giroSeminato(9, 20));
  await e.page.evaluate(function () {
    window.__nube.dentro = { giro: JSON.stringify({ roundActive: true, mode: "training",
      format: 12, target: 2, scores: { a1: [] }, archers: [] }), piazzola: 2, piazzole: 12, modo: "Allenamento 3D" };
    window.__banco.cerca();
  });
  await e.page.waitForTimeout(700);
  var conGiroLocale = await e.page.evaluate(function () {
    return { cartello: !!document.querySelector(".resume-banner.ritrovato") };
  });
  prova("con un giro gia' aperto qui, il cartello non compare", !conGiroLocale.cartello);
  await e.ctx.close();

  /* E ALLORA DA DOVE SI ESCE? (22/08/2026.) La prova qui sopra dice una cosa
     giusta — il telefono in mano vince — ma per un anno ha nascosto la sua
     conseguenza: se il cartello del giro RITROVATO non compare, l'unico
     cartello che resta e' quello del percorso in corso, e quello aveva un
     tasto solo. Un giro aperto per sbaglio non si poteva chiudere: bisognava
     riprenderlo e arrivare in fondo. Dal computer si vedeva subito.
     Queste tre prove guardano l'uscita, non l'aspetto: che il tasto ci sia,
     che voglia due tocchi, e che dopo il giro sia finito davvero — sia qui
     che sul cloud. Se qualcuno lo toglie, l'app gira uguale e non lo dice. */
  console.log("\n  IL GIRO APERTO QUI HA UNA VIA D'USCITA");
  // SI GUARDA LA HOME, e non e' un dettaglio: il caricamento dello stato
  // rimette `tab = "home"` a ogni avvio, quindi la home E' il posto dove un
  // giro dimenticato si ripresenta. Il cartello nella scheda Tira ce l'ha
  // anche lui, il tasto, ma li' non ci si arriva per caso.
  var semeAperto = giroSeminato(5, 18);
  semeAperto.screen = "menu";
  var g = await apri(browser, semeAperto);
  await g.page.waitForTimeout(400);
  var vis = await g.page.evaluate(function () {
    var b = document.querySelector(".home-ripresa");
    var no = b && b.querySelector(".ritrovato-butta");
    return { cartello: !!b, tasto: !!no, scritta: no ? no.textContent.trim() : "",
             riprendi: !!(b && b.querySelector(".home-riprendi")) };
  });
  prova("lo strato del percorso in corso c'e' nella home", vis.cartello);
  prova("e il tasto per riprendere e' ancora il primo", vis.riprendi);
  prova("e adesso porta anche il tasto per scartare", vis.tasto, vis.scritta);
  prova("che dice «Scarta il giro», non «Buttalo via»", /Scarta il giro/.test(vis.scritta), vis.scritta);

  // UN TOCCO SOLO NON DEVE BASTARE.
  await g.page.evaluate(function () {
    document.querySelector(".home-ripresa .ritrovato-butta").click();
  });
  await g.page.waitForTimeout(300);
  var dopoUno = await g.page.evaluate(function () {
    return { attivo: window.__banco.giro().attivo,
             scritta: (document.querySelector(".home-ripresa .ritrovato-butta")||{}).textContent || "" };
  });
  prova("un tocco solo non scarta niente", dopoUno.attivo);
  prova("ma il tasto avvisa che il secondo e' quello vero", /Scartare il giro/.test(dopoUno.scritta), dopoUno.scritta);

  await g.page.evaluate(function () {
    document.querySelector(".home-ripresa .ritrovato-butta").click();
  });
  await g.page.waitForTimeout(500);
  var dopoDue = await g.page.evaluate(function () {
    var gg = window.__banco.giro();
    return { attivo: gg.attivo, schermata: gg.schermata, punti: gg.punti,
             cancellati: window.__nube.cancellati,
             cartello: !!document.querySelector(".home-ripresa"),
             salvato: (function(){ try{ return (JSON.parse(localStorage.getItem("arctrail3d_state_v3")||"{}").roundActive === true); }catch(e){ return "illeggibile"; } })() };
  });
  prova("al secondo tocco il giro non e' piu' attivo", dopoDue.attivo === false);
  prova("e i punti se ne sono andati con lui", dopoDue.punti === -1, dopoDue.punti + "");
  prova("il cartello sparisce", !dopoDue.cartello);
  prova("si resta al menu, non si finisce in una schermata vuota", dopoDue.schermata === "menu", dopoDue.schermata);
  prova("e non torna riaprendo l'app: e' scartato anche nel salvataggio", dopoDue.salvato === false, String(dopoDue.salvato));
  // LA PARTE CHE NESSUNO GUARDEREBBE: la copia sul cloud. Scartare qui e
  // lasciarla la' vorrebbe dire ritrovarsi il cartello del giro ritrovato
  // dieci minuti dopo, con dentro il giro appena scartato.
  prova("e la copia sul cloud e' stata cancellata, se no torna da sola", dopoDue.cancellati > 0, dopoDue.cancellati + "");
  await g.ctx.close();

  /* ══ I TRE CASI DEL 25/08, CHE NON AVEVANO UN BANCO ═════════════════════
     Le tre correzioni di quel giorno — il ricarico da offline, il rientro in
     linea che fa ripartire anche quello che era FALLITO, e il documento unico
     che non si duplica — erano state provate a mano e basta. *Una correzione
     senza banco e' una correzione che sopravvive finche' nessuno tocca quella
     riga.* Sono i tre passaggi in cui l'app dice all'arciere se puo' spegnere
     il telefono: qui sotto glielo si fa dire davanti a un testimone. */

  console.log("\n  RICARICO SENZA RETE: IL GIRO C'E', E LA RIGA NON MENTE");
  var r = await apri(browser, giroSeminato(12, 20));
  await riprendi(r.page);
  await r.page.waitForTimeout(400);
  // Si stacca la rete e si ricarica, come chi riapre l'app nel bosco.
  await r.ctx.setOffline(true);
  await r.page.reload();
  await r.page.waitForTimeout(1200);
  await r.page.evaluate(function () {
    try { Object.defineProperty(window.navigator, "onLine", { get: function () { return false; }, configurable: true }); } catch (e) {}
    window.__nube.risposta = "muta";
  });
  await riprendi(r.page);
  /* QUI SI FA QUELLO CHE FA L'ACCESSO. Nella copia di prova Firebase non
     c'e', quindi `onAuthReady` non parte mai — ed e' lui che a ogni apertura
     chiama `cercaGiroSulCloud`. Chiamarla a mano non e' una scorciatoia sul
     codice provato: e' esattamente la riga che l'app esegue quando la
     sessione e' pronta, ed e' la riga aggiunta il 25/08 perche' un giro
     ricaricato ripartisse verso il cloud. Senza questa chiamata il banco
     proverebbe una app senza account, dove «Sul telefono» e' la verita'. */
  await r.page.evaluate(function () { window.__banco.cerca(); });
  await r.page.waitForTimeout(700);
  var dopoRicarico = await r.page.evaluate(function () {
    var g = window.__banco.giro();
    var riga = document.querySelector(".pista-sotto .pista-stato");
    return { attivo: g.attivo, punti: g.punti, stato: window.__banco.stato(),
             riga: riga ? riga.textContent.trim() : "(manca)" };
  });
  prova("il giro e' ancora aperto dopo il ricarico", dopoRicarico.attivo === true);
  prova("con tutte le piazzole gia' segnate", dopoRicarico.punti === 1, dopoRicarico.punti + "");
  /* LA RIGA NON PUO' DIRE «Sul telefono». In quest'app quella frase vuol dire
     una cosa sola — «non hai fatto l'accesso, questo giro esiste solo qui» —
     e a un utente collegato con dodici piazzole in mano sarebbe falsa due
     volte: gli toglie un accesso che ha, e gli nasconde una copia che
     aspetta. */
  prova("e la riga dice che la copia parte con la rete, non «Sul telefono»",
        dopoRicarico.stato === "coda", dopoRicarico.stato + " · «" + dopoRicarico.riga + "»");

  console.log("\n  TORNA LA RETE: LA COPIA PARTE DA SOLA");
  var primaDelRientro = await r.page.evaluate(function () { return window.__nube.scritti.length; });
  await r.ctx.setOffline(false);
  await r.page.evaluate(function () {
    try { Object.defineProperty(window.navigator, "onLine", { get: function () { return true; }, configurable: true }); } catch (e) {}
    window.__nube.risposta = "si";
    window.dispatchEvent(new Event("online"));
  });
  await r.page.waitForTimeout(900);
  var dopoRientro = await r.page.evaluate(function () {
    var riga = document.querySelector(".pista-sotto .pista-stato");
    return { stato: window.__banco.stato(), scritti: window.__nube.scritti.length,
             riga: riga ? riga.textContent.trim() : "(manca)" };
  });
  prova("il rientro in linea fa partire la scrittura senza toccare niente",
        dopoRientro.scritti > primaDelRientro, primaDelRientro + " -> " + dopoRientro.scritti);
  prova("e adesso la riga dice che e' al sicuro", dopoRientro.stato === "salvato",
        dopoRientro.stato + " · «" + dopoRientro.riga + "»");
  await r.ctx.close();

  console.log("\n  TORNA LA RETE DOPO UN ERRORE, NON SOLO DOPO UNA CODA");
  /* La correzione del 25/08 diceva: *«prima ripartiva solo la coda. Una
     scrittura andata in errore — non senza rete, proprio rifiutata — restava
     ferma fino alla piazzola dopo, e all'ultima piazzola non c'e' una
     piazzola dopo»*. Quella riga vale solo per lo stato «errore», e il caso
     della coda — provato qui sopra — non la esercita: con la vecchia
     condizione passerebbe lo stesso. Serve una scrittura RIFIUTATA. */
  var f = await apri(browser, giroSeminato(11, 20));
  await f.page.evaluate(function () { window.__nube.risposta = "no"; });
  await riprendi(f.page);
  await f.page.evaluate(function () {
    var x = document.querySelector(".quick-btn");
    if (x) x.click();
  });
  await f.page.waitForTimeout(1200);
  var inErrore = await f.page.evaluate(function () {
    return { stato: window.__banco.stato(), scritti: window.__nube.scritti.length };
  });
  prova("la scrittura rifiutata lascia lo stato in errore", inErrore.stato === "errore", inErrore.stato);
  // Nessuno tocca il cartellino: torna solo la rete.
  await f.page.evaluate(function () {
    window.__nube.risposta = "si";
    window.dispatchEvent(new Event("online"));
  });
  await f.page.waitForTimeout(900);
  var dopoErrore = await f.page.evaluate(function () {
    return { stato: window.__banco.stato(), scritti: window.__nube.scritti.length };
  });
  prova("e il rientro in linea riprova da solo, senza toccare niente",
        dopoErrore.scritti > inErrore.scritti, inErrore.scritti + " -> " + dopoErrore.scritti);
  prova("e il giro finisce al sicuro", dopoErrore.stato === "salvato", dopoErrore.stato);
  await f.ctx.close();

  console.log("\n  RIPROVANDO NON NASCE UN SECONDO GIRO");
  /* Il caso che il brief chiama «duplicate on retry». Non si prova contando
     le scritture — quelle DEVONO essere piu' d'una, e' il senso di riprovare —
     ma guardando DOVE vanno: il giro aperto e' un documento solo, `corrente`,
     e ogni tentativo lo riscrive. *Un doppione nasce quando la seconda copia
     ha un nome nuovo, non quando la scrittura si ripete.* */
  var d = await apri(browser, giroSeminato(6, 18));
  await riprendi(d.page);
  await d.page.waitForTimeout(400);
  /* Prima si fa fallire una scrittura VERA — segnando una freccia con la
     controfigura che rifiuta — perche' il cartellino risponde solo quando c'e'
     un errore da riprovare: e' scritto cosi' apposta, un cartellino che
     risponde sempre sembra un tasto. Poi si riprova tre volte, e alla terza
     la rete torna buona. */
  await d.page.evaluate(function () {
    window.__nube.risposta = "no";
    window.__nube.scritti.length = 0;
    var x = document.querySelector(".quick-btn");
    if (x) x.click();
  });
  await d.page.waitForTimeout(1000);
  await d.page.evaluate(function () {
    var riga = document.querySelector(".pista-sotto .pista-stato");
    if (riga) riga.click();
  });
  await d.page.waitForTimeout(600);
  await d.page.evaluate(function () {
    window.__nube.risposta = "si";
    var riga = document.querySelector(".pista-sotto .pista-stato");
    if (riga) riga.click();
  });
  await d.page.waitForTimeout(800);
  var doppioni = await d.page.evaluate(function () {
    var s = window.__nube.scritti;
    // Tutte le scritture del giro aperto portano gli stessi quattro campi di
    // servizio: se una portasse un identificativo diverso, sarebbe un secondo
    // giro travestito da riprova.
    var piazzole = {}, modi = {};
    s.forEach(function (x) { piazzole[x.piazzola] = true; modi[x.modo] = true; });
    return { tentativi: s.length, piazzoleDiverse: Object.keys(piazzole).length,
             modiDiversi: Object.keys(modi).length, stato: window.__banco.stato(),
             giriLocali: (function () {
               try { return (JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}").roundActive === true) ? 1 : 0; }
               catch (e) { return "illeggibile"; }
             })() };
  });
  prova("riprovando si riscrive davvero", doppioni.tentativi > 1, doppioni.tentativi + " tentativi");
  prova("ma sempre lo stesso giro, non uno nuovo per tentativo",
        doppioni.piazzoleDiverse === 1 && doppioni.modiDiversi === 1,
        doppioni.piazzoleDiverse + " piazzole / " + doppioni.modiDiversi + " modi");
  prova("e alla fine e' al sicuro", doppioni.stato === "salvato", doppioni.stato);
  prova("e qui il giro aperto resta uno solo", doppioni.giriLocali === 1, String(doppioni.giriLocali));
  await d.ctx.close();

  console.log("\n  IL GIRO FINITO HA UN NOME SOLO, E NON CAMBIA");
  /* Il doppione vero non nasce nel giro aperto — quello e' un documento solo,
     `corrente`, e la prova qui sopra lo dice. Nasce nello STORICO: se il nome
     del documento venisse dall'orologio invece che dalla data del giro, ogni
     riprova scriverebbe un giro nuovo, e l'arciere si ritroverebbe lo stesso
     percorso tre volte nel diario. *Il nome deve dipendere solo dal giro, non
     da quando lo si manda.* */
  var h = await apri(browser, senzaGiro());
  var nomi = await h.page.evaluate(function () {
    var quando = "2026-08-25T14:32:10.000Z";
    var primo = window.__banco.nomeStorico(quando);
    var dopo = window.__banco.nomeStorico(quando);
    var altro = window.__banco.nomeStorico("2026-08-25T14:32:11.000Z");
    return { primo: primo, dopo: dopo, altro: altro };
  });
  prova("lo stesso giro mandato due volte ha lo stesso nome",
        nomi.primo === nomi.dopo && !!nomi.primo, nomi.primo + " / " + nomi.dopo);
  prova("e due giri diversi hanno nomi diversi", nomi.primo !== nomi.altro,
        nomi.primo + " / " + nomi.altro);
  await h.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
