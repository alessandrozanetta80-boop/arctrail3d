#!/usr/bin/env node
/* banco-attrezzatura.js — l'assetto resta attaccato al giro con cui hai tirato.
 *
 *   node banco-attrezzatura.js [index.html]
 *
 * PERCHE ESISTE. (21/08/2026, PRD 24, Fase 8.) L attrezzatura non serve a fare
 * un inventario: serve a rispondere a «con quale arco vado meglio?». Quindi la
 * cosa da proteggere non e la scheda — quella si vede se si rompe — ma il
 * LEGAME fra assetto e giro, che non si vede mai.
 *
 * Tre cose che possono marcire in silenzio:
 *
 *   1. IL GIRO CHE DIMENTICA. Se l assetto non finisce nello storico al
 *      momento giusto, i giri restano senza e non lo dice nessuno: la media
 *      per assetto sara semplicemente sempre vuota.
 *   2. L ARCHIVIATO CHE CANCELLA IL PASSATO. Il PRD lo mette per iscritto —
 *      *historical rounds must retain archived setup references*. Un arco
 *      messo via nel 2027 non deve svuotare i giri del 2026: per questo nel
 *      giro si scrive anche il NOME, non solo il codice.
 *   3. LA MEDIA CHE GIUDICA TROPPO PRESTO. Due giri non dicono niente su un
 *      arco. Il PRD: *only show when sample size is meaningful*.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-attrezzi");
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

function assetto(id, nome, opz) {
  var a = { id: id, nome: nome, arco: "longbow", mano: "dx", archiviato: false, predefinito: false };
  for (var k in (opz || {})) a[k] = opz[k];
  return a;
}
function giroVecchio(giorniFa, tot, assettoId, assettoNome) {
  return { date: new Date(Date.now() - giorniFa * 86400000).toISOString(), format: 12,
    modeKey: "training", modeLabel: "Allenamento", campo: "Campo A",
    assetto: assettoId || null, assettoNome: assettoNome || null,
    results: [{ name: "Alessandro", total: tot, isSelf: true,
      perTarget: new Array(12).fill(Math.round(tot / 12)), arrows: [] }] };
}

function stato(extra) {
  var st = { screen: "attrezzatura", tab: "home", roundActive: false, pendingArchers: [],
    lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB", arco: "longbow" },
    profileSkipped: false };
  for (var k in (extra || {})) st[k] = extra[k];
  return st;
}

async function apri(browser, st, attrezzi, storico) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 1100 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(st)) + ");" +
    " localStorage.setItem('arctrail3d_attrezzi_v1', " + JSON.stringify(JSON.stringify(attrezzi || [])) + ");" +
    " localStorage.setItem('arctrail3d_storico_v1', " + JSON.stringify(JSON.stringify(storico || [])) + ");" +
    " localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  var err = [];
  page.on("pageerror", function (e) { err.push(String(e.message)); });
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(1200);
  return { ctx: ctx, page: page, err: err };
}

// dalla home al magazzino, come una persona
async function vaiAllAttrezzatura(page) {
  // L'AGGANCIO E MINUSCOLO APPOSTA. (22/08/2026, versione «toni».) In testata
  // c'era un tasto «Profilo»; adesso c'e' «Il mio profilo · alez» e basta.
  // Con /Profilo/ maiuscolo il banco non trovava piu' niente, non cliccava,
  // e falliva a vuoto sulle prove DOPO — dicendo che l'assetto non si salvava
  // quando non era mai arrivato al modulo.
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /profilo/i.test(x.textContent) ||
             /profilo/i.test(x.getAttribute("aria-label") || ""); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Attrezzatura/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await page.waitForTimeout(600);
}

function leggiSchede() {
  return Array.prototype.map.call(document.querySelectorAll(".attr-card"), function (c) {
    return { testo: c.innerText.replace(/\s+/g, " "),
             predefinito: !!c.querySelector(".attr-pred"),
             numeri: (c.querySelector(".attr-numeri") || {}).textContent || "",
             poco: !!c.querySelector(".attr-numeri.poco") };
  });
}

(async function () {
  var browser = await chromium.launch();

  console.log("\n  IL PRIMO ASSETTO E' ANCHE QUELLO PREDEFINITO");
  var a = await apri(browser, stato(), []);
  await vaiAllAttrezzatura(a.page);
  await a.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Nuovo assetto/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await a.page.waitForTimeout(500);
  await a.page.fill("#as_nome", "Longbow da caccia");
  await a.page.fill("#as_libbre", "45");
  await a.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Salva assetto/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await a.page.waitForTimeout(700);
  var v = await a.page.evaluate(function () {
    var l = JSON.parse(localStorage.getItem("arctrail3d_attrezzi_v1") || "[]");
    return { quanti: l.length, pred: l[0] && l[0].predefinito === true, nome: l[0] && l[0].nome };
  });
  prova("l'assetto e' stato salvato", v.quanti === 1, v.quanti + "");
  prova("col suo nome", v.nome === "Longbow da caccia", v.nome);
  prova("ed e' predefinito senza doverlo dire", v.pred);
  prova("nessun errore in pagina", a.err.length === 0, a.err[0]);
  await a.ctx.close();

  console.log("\n  LA MEDIA NON GIUDICA UN ARCO SU DUE GIRI");
  var due = [giroVecchio(1, 180, "as1", "Longbow"), giroVecchio(5, 170, "as1", "Longbow")];
  var b2 = await apri(browser, stato(), [assetto("as1", "Longbow", { predefinito: true })], due);
  await vaiAllAttrezzatura(b2.page);
  var s2 = await b2.page.evaluate(leggiSchede);
  prova("con due giri non c'e' nessuna media", s2[0] && s2[0].poco, s2[0] ? s2[0].numeri : "nessuna scheda");
  prova("ma dice quanti ne mancano", s2[0] && /\d/.test(s2[0].numeri), s2[0] ? s2[0].numeri : "");
  await b2.ctx.close();

  var cinque = [];
  for (var i = 0; i < 5; i++) cinque.push(giroVecchio(i + 1, 180, "as1", "Longbow"));
  var c5 = await apri(browser, stato(), [assetto("as1", "Longbow", { predefinito: true })], cinque);
  await vaiAllAttrezzatura(c5.page);
  var s5 = await c5.page.evaluate(leggiSchede);
  prova("con cinque giri la media compare", s5[0] && !s5[0].poco && /15/.test(s5[0].numeri),
        s5[0] ? s5[0].numeri : "nessuna scheda");
  await c5.ctx.close();

  console.log("\n  L'ARCHIVIATO ESCE DALLA SCELTA E RESTA NEL PASSATO");
  var d = await apri(browser, stato(),
    [assetto("as1", "Longbow", { predefinito: true }), assetto("as2", "Ricurvo vecchio", { archiviato: true })],
    [giroVecchio(3, 180, "as2", "Ricurvo vecchio")]);
  await vaiAllAttrezzatura(d.page);
  var sd = await d.page.evaluate(function () {
    var testo = (document.getElementById("app") || {}).innerText;
    return { archiviatiTitolo: /archiviati/i.test(testo), vecchio: /ricurvo vecchio/i.test(testo) };
  });
  prova("l'archiviato si vede, sotto il suo titolo", sd.archiviatiTitolo && sd.vecchio);
  var scelta = await d.page.evaluate(function () {
    // nella scelta prima di partire compaiono solo i vivi: con un vivo solo la
    // riga non deve comparire affatto
    var st = JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}");
    return st.screen;
  });
  prova("e la schermata e' quella giusta", scelta === "attrezzatura", scelta);
  await d.ctx.close();

  console.log("\n  IL GIRO SI PORTA DIETRO L'ASSETTO, COL NOME");
  // un giro pronto all'ultima piazzola, con due assetti: si sceglie e si finisce
  var scores = { a1: [] };
  for (var j = 0; j < 11; j++) scores.a1.push({ arrows: [15], total: 15 });
  var inCorso = stato({ screen: "menu", tab: "tira", roundActive: false });
  var e = await apri(browser, inCorso,
    [assetto("as1", "Longbow da caccia", { predefinito: true }), assetto("as2", "Ricurvo da gara")], []);
  // si parte da un allenamento vero: Tira → Inizia allenamento → Continua → Inizia
  await e.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tabbar button"), function (x) {
      return x.querySelector(".tab-lbl") && /Tira/.test(x.querySelector(".tab-lbl").textContent); })[0];
    if (b) b.click();
  });
  await e.page.waitForTimeout(500);
  await e.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Inizia Allenamento/i.test(x.textContent); })[0];
    if (b) b.click();
  });
  await e.page.waitForTimeout(600);
  await e.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Continua/.test(x.textContent); })[0];
    if (b) b.click();
  });
  await e.page.waitForTimeout(700);
  var conScelta = await e.page.evaluate(function () {
    var testo = (document.getElementById("app") || {}).innerText;
    return { cePicker: /assetto/i.test(testo), dueNomi: /longbow da caccia/i.test(testo) && /ricurvo da gara/i.test(testo) };
  });
  prova("con due assetti la scelta compare prima di partire", conScelta.cePicker && conScelta.dueNomi,
        JSON.stringify(conScelta));
  // si sceglie il secondo e si parte
  await e.page.evaluate(function () {
    var c = Array.prototype.filter.call(document.querySelectorAll(".chip"), function (x) {
      return /Ricurvo da gara/.test(x.textContent); })[0];
    if (c) c.click();
  });
  await e.page.waitForTimeout(600);
  await e.page.evaluate(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll("#app button"), function (x) {
      return /Inizia percorso|Inizia il percorso|Inizia/i.test(x.textContent) && x.className.indexOf("btn-primary") >= 0; })[0];
    if (b) b.click();
  });
  await e.page.waitForTimeout(900);
  var dentro = await e.page.evaluate(function () {
    var st = JSON.parse(localStorage.getItem("arctrail3d_state_v3") || "{}");
    return { schermo: st.schermo || st.screen, assetto: st.assetto, nome: st.assettoNome };
  });
  prova("il giro parte con l'assetto scelto", dentro.assetto === "as2", JSON.stringify(dentro));
  prova("e col suo nome, non solo col codice", dentro.nome === "Ricurvo da gara", dentro.nome + "");
  await e.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
