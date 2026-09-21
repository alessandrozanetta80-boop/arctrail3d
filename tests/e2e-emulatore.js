#!/usr/bin/env node
/* e2e-emulatore.js — la MATRICE app × regole, con l'app VERA, le librerie
 * Firebase VERE (10.12.2, quelle di produzione) e gli emulatori Auth +
 * Firestore con le regole VERE. Nessun Firebase finto, nessuna scrittura
 * ricopiata a mano.
 *
 *   sh tests/lancia-e2e.sh                     # tutta la matrice
 *   SOLO="ramo" sh tests/lancia-e2e.sh         # una sola app (18/09 | release | ramo)
 *
 * PERCHE' ESISTE. (21/09/2026, regressione del 20/09.) I banchi con browser
 * usano `firebase-finto.js`; `banco-finestra`/`banco-regole` provano le
 * regole con scritture RICOPIATE dall'app. Nessuno dei due vede cosa succede
 * quando l'app vera, con l'SDK vero, parla con le regole vere.
 *
 * LA MATRICE. Tre app — quella del 18/09 in produzione (`7b0ffe9`), quella
 * della release del 20/09 (`bae26e8`), quella di questo ramo — per due
 * regole — quelle del 18/09 (`7b0ffe9`) e quelle del ramo. Per ognuna delle
 * sei combinazioni, da capo (emulatori vuoti):
 *   - Firebase si inizializza? si entra? c'e' la fascia «solo su questo telefono»?
 *   - un giro dall'interfaccia: il PRIMO WRITE arriva sul server? con quali
 *     campi? nel percorso di chi l'ha tirato (ownership)?
 *   - un secondo giro SENZA RETE: resta nel telefono, e al ritorno della
 *     rete sale da solo;
 *   - RIAPERTURA: ricaricata la pagina, i due giri ci sono, sul server sono
 *     due (nessun doppione);
 *   - un allenamento aperto «solo club» dal modulo vero: arriva? con quali campi?
 *   - l'elenco: il proprietario lo vede? un socio CON il claim? un socio
 *     SENZA claim (il giorno della pubblicazione, prima di `claimCompagnia`)?
 *     uno di un'altra compagnia?
 *   - quanti «permesso negato» ha visto la console.
 * Alla fine stampa la tabella, e fa le prove solo dove l'esito atteso e'
 * certo (il ramo deve funzionare con tutte e due le regole; la release non
 * inizializza Firebase; l'app del 18/09 funziona con le regole del 18/09).
 *
 * RETE: la prima volta scarica le librerie da gstatic e le tiene in una
 * cartella temporanea. Nessun contatto con la produzione: tutto il resto e'
 * bloccato, e l'SDK parla solo con 127.0.0.1.
 */
"use strict";
var fs = require("fs");
var { chromium } = require("playwright");
var C = require("./e2e-comune.js");
var CLUB = C.CLUB, D = C.D, git = C.git, azzera = C.azzera, regole = C.regole, account = C.account, apri = C.apri,
    unGiro = C.unGiro, giriSulServer = C.giriSulServer, aspettaServer = C.aspettaServer, elenco = C.elenco, tocca = C.tocca;

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

async function combinazione(browser, app, url, reg) {
  var riga = { app: app, regole: reg.nome };
  await azzera();
  await regole(reg.testo);
  var mario = await account("mario@prova.it", CLUB, true);
  var bea = await account("bea@prova.it", CLUB, true);
  var ada = await account("ada@prova.it", CLUB, false);
  var ugo = await account("ugo@prova.it", "02ALTR", true);

  var m = await apri(browser, url, mario);
  riga.init = m.init; riga.fascia = m.fascia;
  if (!m.init) { riga.nota = "Firebase mai inizializzato: niente accesso, niente scritture"; await m.ctx.close(); return riga; }

  // ── primo giro, con rete ────────────────────────────────
  riga.giro1 = await unGiro(m.page);
  var s1 = await aspettaServer(async function () { var x = await giriSulServer(mario.uid); return x.length >= 1 ? x : null; }, 10000);
  riga.primoWrite = !!(s1 && s1.length);
  riga.campi = s1 && s1[0] ? Object.keys(s1[0].fields).sort().join(",") : "";
  riga.ownership = !!(s1 && s1[0] && s1[0].name.indexOf("/users/" + mario.uid + "/storico/") > 0);

  // ── secondo giro SENZA RETE, poi la rete torna ──────────
  await m.ctx.setOffline(true);
  await unGiro(m.page);
  var localiOffline = (await m.page.evaluate(function () { return window.__prova.storico(); })).length;
  var sOff = (await giriSulServer(mario.uid)).length;
  await m.ctx.setOffline(false);
  var s2 = await aspettaServer(async function () { var x = await giriSulServer(mario.uid); return x.length >= 2 ? x : null; }, 20000);
  riga.offline = localiOffline >= 2 && sOff === 1 && !!(s2 && s2.length === 2);
  riga.offlineDett = "locali " + localiOffline + ", server senza rete " + sOff + ", server dopo " + (s2 ? s2.length : (await giriSulServer(mario.uid)).length);

  // ── riapertura ──────────────────────────────────────────
  await m.page.reload();
  await m.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 }).catch(function () {});
  await m.page.waitForTimeout(2500);
  var locDopo = (await m.page.evaluate(function () { return window.__prova.storico(); })).length;
  var srvDopo = (await giriSulServer(mario.uid)).length;
  riga.riapertura = locDopo === 2 && srvDopo === 2;
  riga.riaperturaDett = "locali " + locDopo + ", server " + srvDopo;

  // ── allenamento aperto «solo club» ──────────────────────
  await m.page.evaluate(function (c) { window.__prova.nuovoAllenamento("Campo di prova", c); }, CLUB);
  await m.page.waitForTimeout(500);
  var domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await m.page.evaluate(function (d) { var x = document.querySelector("input.data[type=date]") || document.querySelector("input[type=date]"); if (!x) return; x.value = d; x.dispatchEvent(new Event("input", { bubbles: true })); x.dispatchEvent(new Event("change", { bubbles: true })); }, domani);
  await tocca(m.page, "Pubblica");
  var ot = await aspettaServer(async function () { var x = await elenco("open_trainings"); return x.length ? x : null; }, 10000);
  riga.allenamento = !!(ot && ot.length === 1);
  riga.campiAllenamento = ot && ot[0] ? Object.keys(ot[0].fields).sort().join(",") : "";
  var idOt = ot && ot[0] && ot[0].name.split("/").pop();
  var vis = ot && ot[0] && ot[0].fields.visibility && ot[0].fields.visibility.stringValue;
  riga.visibilita = vis || "";

  async function vede(chi) {
    var x = chi === mario ? m : await apri(browser, url, chi);
    await x.page.evaluate(function () { window.__prova.ricaricaAllenamenti(); });
    await x.page.waitForTimeout(2500);
    var v = await x.page.evaluate(function () { return window.__prova.allenamenti(); });
    var neg = x.negati.length;
    if (x !== m) await x.ctx.close();
    return { vede: !!idOt && v.indexOf(idOt) >= 0, n: v.length, negati: neg };
  }
  riga.proprietario = await vede(mario);
  riga.socioConClaim = await vede(bea);
  riga.socioSenzaClaim = await vede(ada);
  riga.altraCompagnia = await vede(ugo);
  riga.negatiProprietario = m.negati.length;
  riga.negatiEsempio = m.negati.slice(0, 1).join("");
  await m.ctx.close();
  return riga;
}

(async function () {
  await C.librerie();
  var browser = await chromium.launch();
  var APP = [
    { nome: "18/09", html: git("7b0ffe9:app.html") },
    { nome: "release", html: git("bae26e8:app.html") },
    { nome: "ramo", html: fs.readFileSync(process.env.APP || "app.html", "utf8") }
  ].filter(function (a) { return !process.env.SOLO || process.env.SOLO.split(",").indexOf(a.nome) >= 0; });
  var REG = [
    { nome: "18/09", testo: git("7b0ffe9:firestore.rules") },
    { nome: "ramo", testo: fs.readFileSync("firestore.rules", "utf8") }
  ];
  var righe = [];
  for (var a = 0; a < APP.length; a++) {
    var url = C.preparaApp(APP[a].nome.replace(/\W/g, ""), APP[a].html);
    for (var r = 0; r < REG.length; r++) {
      process.stdout.write("  … app " + APP[a].nome + " × regole " + REG[r].nome + "\n");
      righe.push(await combinazione(browser, APP[a].nome, url, REG[r]));
    }
  }
  await browser.close();

  function si(x) { return x === true ? "sì" : x === false ? "NO" : (x === undefined ? "—" : String(x)); }
  function v(o) { return o ? (o.vede ? "vede" : "non vede") + (o.negati ? " (" + o.negati + " negati)" : "") : "—"; }
  console.log("\n  MATRICE\n");
  righe.forEach(function (x) {
    console.log("  app " + x.app + " × regole " + x.regole);
    console.log("     init " + si(x.init) + " · fascia locale " + si(x.fascia) + (x.nota ? " · " + x.nota : ""));
    if (!x.init) return;
    console.log("     primo write " + si(x.primoWrite) + " · ownership " + si(x.ownership) + " · campi: " + x.campi);
    console.log("     offline→online " + si(x.offline) + " (" + x.offlineDett + ") · riapertura " + si(x.riapertura) + " (" + x.riaperturaDett + ")");
    console.log("     allenamento " + si(x.allenamento) + " [" + x.visibilita + "] · campi: " + x.campiAllenamento);
    console.log("     elenco: proprietario " + v(x.proprietario) + " · socio con claim " + v(x.socioConClaim) +
                " · socio senza claim " + v(x.socioSenzaClaim) + " · altra compagnia " + v(x.altraCompagnia));
    if (x.negatiEsempio) console.log("     primo «negato»: " + x.negatiEsempio);
  });
  console.log("");

  function trova(a, r) { return righe.filter(function (x) { return x.app === a && x.regole === r; })[0]; }
  ["18/09", "ramo"].forEach(function (r) {
    var x = trova("ramo", r); if (!x) return;
    prova("ramo × regole " + r + ": si entra, niente fascia locale", x.init && !x.fascia);
    prova("ramo × regole " + r + ": il primo giro sale, nel percorso di chi l'ha tirato", x.primoWrite && x.ownership);
    prova("ramo × regole " + r + ": il giro senza rete sale al ritorno della rete", x.offline, x.offlineDett);
    prova("ramo × regole " + r + ": riaprendo, due giri e nessun doppione", x.riapertura, x.riaperturaDett);
    prova("ramo × regole " + r + ": l'allenamento aperto arriva sul server", x.allenamento);
    prova("ramo × regole " + r + ": il proprietario lo vede, senza «negato»", x.proprietario && x.proprietario.vede && x.negatiProprietario === 0, x.negatiEsempio);
    prova("ramo × regole " + r + ": un socio con il claim lo vede", x.socioConClaim && x.socioConClaim.vede);
  });
  var rn = trova("ramo", "ramo");
  if (rn) prova("ramo × regole ramo: un'altra compagnia NON lo vede", rn.altraCompagnia && !rn.altraCompagnia.vede);
  ["18/09", "ramo"].forEach(function (r) {
    var x = trova("release", r); if (!x) return;
    prova("release × regole " + r + ": Firebase MAI inizializzato (la regressione, riprodotta)", x.init === false);
  });
  var vv = trova("18/09", "18/09");
  if (vv) prova("18/09 × regole 18/09 (produzione oggi): giro, offline, riapertura, allenamento", vv.primoWrite && vv.offline && vv.riapertura && vv.allenamento);

  try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
