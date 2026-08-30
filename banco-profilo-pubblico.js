#!/usr/bin/env node
/* banco-profilo-pubblico.js — quello che si pubblica di se, e quello che no.
 *
 *   node banco-profilo-pubblico.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 43.) Il profilo pubblico e l unica schermata
 * dell app che prende dati di una persona e li mette dove li leggono tutti. Un
 * difetto qui non si vede: la schermata funziona benissimo anche mentre
 * pubblica una cosa che non doveva.
 *
 * LA GARANZIA DA PROTEGGERE E UNA SOLA, e in negativo: **se non hai acceso
 * l interruttore, i tuoi numeri non escono**. E non «escono con un flag a
 * false»: non escono proprio. Un `mostraNumeri:false` accanto ai numeri veri
 * sarebbe una serratura disegnata sulla porta.
 *
 * COME. Il banco non guarda una schermata: chiama la funzione vera che decide
 * cosa va nel documento pubblico — `publicProfileData` — e guarda cosa
 * restituisce. Al posto di Firebase c e una controfigura che segna le
 * cancellazioni, perche e cosi che si toglie un campo da un documento.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-pp");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });

var html = require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8"));
var ANCORA = "function writePublicProfile(uid, d){";
if (html.indexOf(ANCORA) < 0) { console.log("  ✗ writePublicProfile non c'e' piu': il banco guarda un'altra app"); process.exit(1); }
// la porticina: l'app vive dentro una chiusura, da fuori non si chiama niente
html = html.replace(ANCORA,
  "window.__pp = { dati: function(d){ return publicProfileData(d); },\n" +
  " numeri: function(){ return mieiNumeriPubblici(); } };\n" + ANCORA);
fs.writeFileSync(path.join(D, "index.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

/* IL SEGNALE DELLA CANCELLAZIONE ARRIVA IN DUE FORME. Le pagine caricano
   comunque il codice di Firebase, che si riprende `window.firebase` dopo la
   controfigura: quindi a volte torna la targhetta finta, a volte la
   cancellazione vera. Sono la stessa cosa — un campo che NON viene scritto —
   e il banco deve riconoscerle tutte e due, se no misura il caso invece del
   comportamento. */
function tolto(v){
  if(v === "<<TOLTO>>") return true;
  try{ return JSON.stringify(v).indexOf("FieldValue.delete") >= 0; }catch(e){ return false; }
}

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

// La controfigura di Firebase: `delete()` diventa una targhetta riconoscibile,
// cosi' il banco puo' distinguere «campo tolto» da «campo scritto vuoto».
var FINTA =
"window.firebase = { firestore: { FieldValue: {\n" +
"  serverTimestamp: function(){ return 'ORA'; },\n" +
"  delete: function(){ return '<<TOLTO>>'; } } } };";

function giro(giorniFa, tot, piazzole, campo) {
  return { date: new Date(Date.now() - giorniFa * 86400000).toISOString(), format: piazzole,
    modeKey: "training", modeLabel: "Allenamento", campo: campo || null,
    results: [{ name: "Alessandro", total: tot, isSelf: true,
      perTarget: new Array(piazzole).fill(Math.round(tot / piazzole)), arrows: [] }] };
}

var STATO = { screen: "menu", tab: "home", roundActive: false, pendingArchers: [],
  lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB" },
  profileSkipped: false };

async function apri(browser, storico) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(FINTA);
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(STATO)) + ");" +
    " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(storico || [])) + ");" +
    " localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  return { ctx: ctx, page: page, err: err };
}

(async function () {
  var browser = await chromium.launch();
  // tre giri: 2 campi diversi, 12+12+24 = 48 piazzole, media (180/12+180/12+240/24)/3 = 13.3
  var storico = [giro(1, 180, 12, "Campo A"), giro(5, 180, 12, "Campo A"), giro(9, 240, 24, "Campo B")];
  var a = await apri(browser, storico);

  console.log("\n  SENZA INTERRUTTORE, I NUMERI NON ESCONO");
  var spento = await a.page.evaluate(function () {
    return window.__pp.dati({ username: "alez", nomeCognome: "Alessandro Zanetta",
      compagnia: "01VERB", compagniaNome: "Verbano", arco: "longbow", mostraNumeri: false });
  });
  prova("il campo dei numeri non c'e': viene tolto", tolto(spento.numeri), JSON.stringify(spento.numeri));
  prova("e non c'e' nessun interruttore pubblicato accanto",
        Object.keys(spento).indexOf("mostraNumeri") < 0, Object.keys(spento).join(","));
  prova("il resto si pubblica: nome, compagnia, arco",
        spento.nomeCognome === "Alessandro Zanetta" && spento.compagnia === "01VERB" && spento.arco === "longbow",
        JSON.stringify(spento));

  console.log("\n  CON L'INTERRUTTORE, I TRE NUMERI SONO QUELLI VERI");
  var acceso = await a.page.evaluate(function () {
    return window.__pp.dati({ username: "alez", nomeCognome: "Alessandro Zanetta",
      compagnia: "01VERB", compagniaNome: "Verbano", mostraNumeri: true });
  });
  prova("i numeri ci sono", acceso.numeri && typeof acceso.numeri === "object", JSON.stringify(acceso.numeri));
  prova("tre giri", acceso.numeri && acceso.numeri.giri === 3, JSON.stringify(acceso.numeri));
  prova("quarantotto piazzole", acceso.numeri && acceso.numeri.piazzole === 48, JSON.stringify(acceso.numeri));
  prova("due campi diversi, non tre giri", acceso.numeri && acceso.numeri.campi === 2, JSON.stringify(acceso.numeri));
  /* LA MEDIA NON SI PUBBLICA PIU', ED È VOLUTO. (Corretto il 30/08/2026.)
     Fino a qui questa riga chiedeva che `numeri.media` ci fosse e stesse fra
     12 e 15. Il 29/08 la media e' uscita dalla carta pubblica — sta scritto
     accanto a `mieiNumeriPubblici` — perche' senza il contesto della gara non
     dice niente; e continuava a finire in Firestore anche dopo essere sparita
     dallo schermo. *Un dato che nessuno vede piu' ma che si continua a
     pubblicare e' peggio di uno visibile: nessuno lo controlla.*
     Adesso la prova e' rovesciata: la media NON deve uscire di qui. Se un
     giorno qualcuno la rimette, questa riga diventa rossa, che e'
     esattamente il suo mestiere. */
  prova("la media non esce piu': non si pubblica un numero senza contesto",
        acceso.numeri && acceso.numeri.media === undefined, JSON.stringify(acceso.numeri));

  console.log("\n  E QUELLO CHE NON C'E' NON SI INVENTA");
  var b = await apri(browser, []);
  var vuoto = await b.page.evaluate(function () {
    return window.__pp.dati({ username: "alez", nomeCognome: "A Z", mostraNumeri: true });
  });
  prova("senza nemmeno un giro i numeri non si pubblicano", tolto(vuoto.numeri), JSON.stringify(vuoto.numeri));
  await b.ctx.close();

  console.log("\n  IL NOME NASCOSTO RESTA NASCOSTO");
  var nascosto = await a.page.evaluate(function () {
    return window.__pp.dati({ username: "alez", nomeCognome: "Alessandro Zanetta", nomeNascosto: true });
  });
  prova("chi nasconde il nome non lo pubblica", tolto(nascosto.nomeCognome), JSON.stringify(nascosto.nomeCognome));
  prova("ma il nome utente resta, se no non lo trova nessuno", nascosto.username === "alez");

  console.log("\n  LA PRESENTAZIONE HA UNA FINE");
  var lunga = await a.page.evaluate(function () {
    var testo = "";
    for (var i = 0; i < 40; i++) testo += "parole a caso ";
    return window.__pp.dati({ username: "alez", bio: testo });
  });
  prova("la bio si ferma a centosessanta caratteri", lunga.bio.length === 160, lunga.bio.length + "");
  var senzaBio = await a.page.evaluate(function () {
    return window.__pp.dati({ username: "alez" });
  });
  prova("e chi non la scrive non pubblica una riga vuota", tolto(senzaBio.bio), JSON.stringify(senzaBio.bio));
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
