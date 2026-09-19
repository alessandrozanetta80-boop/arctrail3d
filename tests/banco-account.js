#!/usr/bin/env node
/* banco-account.js — due persone, un telefono: i dati di A non vanno a B.
 *
 *   node tests/banco-account.js              # sull'app.html del repository
 *   APP=percorso node tests/banco-account.js # su un'altra copia (sabotaggio)
 *
 * PERCHE' ESISTE. (19/09/2026, audit P0-2.) Uscire dall'account faceva solo
 * `auth.signOut()`. Storico, riepilogo, profilo con le tessere, attrezzatura e
 * giro aperto restavano nel telefono, e al primo accesso di un'altra persona
 * l'app li caricava nel cloud di QUELLA persona: i giri di A nello storico di
 * B, il giro aperto di A nella copia di B, il profilo di A nel documento di B.
 * Un telefono di compagnia, o di famiglia, e' il caso normale.
 *
 * COME FA. L'app gira in PRODUZIONE (DEV_MODE spento) su un Firebase finto
 * (`firebase-finto.js`): e' l'unico modo di vedere `riallineaStorico`,
 * `cercaGiroSulCloud` e il salvataggio del profilo fare il loro lavoro. Ogni
 * scrittura verso il cloud e' registrata, e il banco guarda cosa e' andato nel
 * cloud di chi.
 *
 * SABOTAGGIO: `APP=<app.html di prima del 19/09> node tests/banco-account.js`
 * deve dire no sulle prove del passaggio da A a B.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");
var F = require("./firebase-finto.js");

var SORGENTE = process.env.APP || "app.html";
var DOVE = fs.mkdtempSync(path.join(os.tmpdir(), "arctrail-banco-account-"));
var ok = 0, ko = 0;
function prova(nome, cond, extra) {
  if (cond) { ok++; console.log("  ✓ " + nome); }
  else { ko++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}

var GANCIO = "window.__prova = {\n" +
  "  stato: function(){ return JSON.parse(JSON.stringify(state)); },\n" +
  "  esciConTasto: (typeof esciDallAccount === 'function') ? function(b){ window.__esciSenzaRicarica = true; esciDallAccount(b); } : null,\n" +
  "  esci: function(){ window.__esciSenzaRicarica = true; if(typeof esciDallAccount === 'function'){ esciDallAccount(null); } else { auth.signOut().then(function(){ authState = 'needLogin'; currentUser = null; render(); }); } }\n" +
  "};";
fs.writeFileSync(path.join(DOVE, "app.html"), F.copiaProduzione(fs.readFileSync(SORGENTE, "utf8"), { gancio: GANCIO }));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(DOVE, x));
});

function giro(giorniFa, punti, campo) {
  var d = new Date(Date.now() - giorniFa * 86400000);
  return { date: d.toISOString(), format: 12, modeKey: "training", modeLabel: "Allenamento", campo: campo,
           results: [{ name: "anna", total: punti, isSelf: true, ownerUid: null,
                       perTarget: new Array(12).fill(10), arrows: [] }] };
}
var A = { uid: "uidAnna", email: "anna@esempio.it" };
var B = { uid: "uidBruno", email: "bruno@esempio.it" };
function docUtente(u, nome, tessera) {
  return { email: u.email, approved: true, nomeCognome: nome, username: nome.split(" ")[0].toLowerCase(),
           federazioni: [{ code: "fiarc", tessera: tessera }], privacy: true, terms: true };
}
var STORICO_A = [giro(1, 111, "Campo di Anna"), giro(3, 99, "Campo di Anna")];
var STATO_A = {
  screen: "menu", tab: "home", pendingArchers: [], lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Anna Rossi", username: "anna", email: A.email, federazioni: [{ code: "fiarc", tessera: "A-1111" }], privacy: true },
  profileSkipped: false
};
var ATTREZZI_A = [{ id: "arcoA", nome: "Arco di Anna", tipo: "ricurvo", creato: Date.now() }];

async function apri(browser, utente, seme, dati) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 860 } });
  await ctx.route(/^https?:\/\//, function (r) { return r.abort(); });
  await ctx.addInitScript(F.scriptIniziale({ utente: utente, dati: dati }));
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('seminato')){ sessionStorage.setItem('seminato','1');" +
    Object.keys(seme).map(function (k) { return "localStorage.setItem(" + JSON.stringify(k) + "," + JSON.stringify(seme[k]) + ");"; }).join("") +
    "localStorage.setItem('arctrail3d_welcome_v2','1'); } }catch(e){}");
  var page = await ctx.newPage();
  var errori = [];
  page.on("pageerror", function (e) { errori.push(e.message); });
  await page.goto("file://" + path.join(DOVE, "app.html").replace(/\\/g, "/"));
  await page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return { ctx: ctx, page: page, errori: errori };
}
function scrittureVerso(page, prefisso) {
  return page.evaluate(function (p) {
    return (window.__scritture || []).filter(function (w) { return w.path.indexOf(p) === 0; });
  }, prefisso);
}
function contiene(scritture, testo) {
  return scritture.some(function (w) { return JSON.stringify(w.data || {}).indexOf(testo) >= 0; });
}

(async function () {
  var browser = await chromium.launch();
  var semeA = {
    "arctrail3d_state_v3": JSON.stringify(STATO_A),
    "arctrail3d_storico_v1": JSON.stringify(STORICO_A),
    "arctrail3d_attrezzi_v1": JSON.stringify(ATTREZZI_A)
  };
  var datiCloud = { "users": {} };
  datiCloud.users[A.uid] = docUtente(A, "Anna Rossi", "A-1111");
  datiCloud.users[B.uid] = docUtente(B, "Bruno Bianchi", "B-2222");

  console.log("\n  IL TELEFONO DI ANNA, E ENTRA BRUNO (dati di prima di questa versione)\n");
  var s1 = await apri(browser, B, semeA, datiCloud);
  var versoB = await scrittureVerso(s1.page, "users/" + B.uid);
  prova("i giri di Anna NON finiscono nello storico di Bruno",
        !contiene(versoB, "Campo di Anna"), JSON.stringify(versoB.map(function (w) { return w.path; })).slice(0, 200));
  prova("l'attrezzatura di Anna NON finisce nel documento di Bruno", !contiene(versoB, "Arco di Anna"));
  prova("la tessera di Anna NON finisce nel documento di Bruno", !contiene(versoB, "A-1111"));
  var st1 = await s1.page.evaluate(function () { return window.__prova.stato(); });
  prova("il profilo sul telefono e' quello di Bruno", st1.profile && st1.profile.email === B.email,
        st1.profile ? st1.profile.email : "nessun profilo");
  var storicoLocale1 = await s1.page.evaluate(function () { return localStorage.getItem("arctrail3d_storico_v1") || ""; });
  prova("lo storico di Anna non e' piu' sul telefono", storicoLocale1.indexOf("Campo di Anna") < 0);
  prova("lingua e federazione del telefono restano", st1.lang === "it" && st1.federation === "fiarc");
  prova("nessun errore JavaScript", s1.errori.length === 0, s1.errori.join(" | "));
  await s1.ctx.close();

  console.log("\n  ANNA RIENTRA SUL SUO TELEFONO: NIENTE SI PERDE\n");
  var semeAconProprietario = Object.assign({ "arctrail3d_proprietario_v1": A.uid }, semeA);
  var s2 = await apri(browser, A, semeAconProprietario, datiCloud);
  var locale2 = await s2.page.evaluate(function () { return localStorage.getItem("arctrail3d_storico_v1") || ""; });
  prova("lo storico di Anna resta sul suo telefono", locale2.indexOf("Campo di Anna") >= 0);
  var versoA = await scrittureVerso(s2.page, "users/" + A.uid + "/storico");
  prova("e sale nel SUO cloud", contiene(versoA, "Campo di Anna"));
  await s2.ctx.close();

  console.log("\n  ANNA ESCE: IL TELEFONO SI SVUOTA DEI SUOI DATI\n");
  var s3 = await apri(browser, A, semeAconProprietario, datiCloud);
  await s3.page.evaluate(function () { window.__prova.esci(); });
  await s3.page.waitForTimeout(3800);
  var dopo = await s3.page.evaluate(function () {
    var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o;
  });
  prova("dopo l'uscita lo storico non c'e' piu'", !dopo["arctrail3d_storico_v1"]);
  prova("dopo l'uscita l'attrezzatura non c'e' piu'", !dopo["arctrail3d_attrezzi_v1"]);
  var stato3 = JSON.parse(dopo["arctrail3d_state_v3"] || "{}");
  prova("dopo l'uscita il profilo (con la tessera) non c'e' piu'", !stato3.profile && JSON.stringify(dopo).indexOf("A-1111") < 0);
  prova("dopo l'uscita restano lingua e tema", stato3.lang === "it" && stato3.theme === "light");
  var cache = await s3.page.evaluate(function () { return { t: !!window.__terminato, c: !!window.__cachePulita, u: window.__uscito || 0 }; });
  prova("dopo l'uscita la cache di Firestore e' pulita", cache.t && cache.c);
  prova("l'uscita ha davvero chiuso la sessione di Firebase", cache.u >= 1);
  await s3.ctx.close();

  console.log("\n  USCIRE SENZA RETE CON UN GIRO NON SALVATO CHIEDE CONFERMA\n");
  var statoGiro = Object.assign({}, STATO_A, { roundActive: true, screen: "menu" });
  var semeGiro = Object.assign({}, semeAconProprietario, { "arctrail3d_state_v3": JSON.stringify(statoGiro) });
  var s4 = await apri(browser, A, semeGiro, datiCloud);
  await s4.ctx.setOffline(true);
  var primo = await s4.page.evaluate(function () {
    if (!window.__prova.esciConTasto) return { manca: true };
    var b = document.createElement("button"); b.textContent = "Esci"; document.body.appendChild(b);
    window.__tasto = b;
    window.__prova.esciConTasto(b);
    return { testo: b.textContent, uscito: window.__uscito || 0 };
  });
  prova("primo tocco: avvisa e NON esce", !primo.manca && primo.uscito === 0 && primo.testo !== "Esci",
        JSON.stringify(primo));
  if (!primo.manca) {
    await s4.page.evaluate(function () { window.__prova.esciConTasto(window.__tasto); });
    await s4.page.waitForTimeout(3800);
  }
  var secondo = await s4.page.evaluate(function () { return window.__uscito || 0; });
  prova("secondo tocco: esce davvero", secondo >= 1);
  await s4.ctx.close();

  await browser.close();
  try { fs.rmSync(DOVE, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
