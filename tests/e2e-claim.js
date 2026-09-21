#!/usr/bin/env node
/* e2e-claim.js — il terzo asse: le Functions. `claimCompagnia` VERA
 * nell'emulatore delle Functions, l'app VERA, le regole del ramo, su un
 * progetto `demo-*` (non puo' toccare la produzione).
 *
 *   sh tests/lancia-e2e-claim.sh
 *
 * PERCHE' ESISTE. (21/09/2026.) La matrice app × regole (e2e-emulatore.js)
 * mette il claim a mano nell'account. Qui lo mette la Function, e il socio ha
 * l'app GIA' APERTA col token vecchio quando il claim arriva: e' il giorno
 * della pubblicazione delle regole. Deve arrivarci da solo con la politica
 * scritta nell'app — «permesso negato» sulla finestra della compagnia →
 * scrittura di richiamo `claimRichiesto` → `getIdToken(true)` → la finestra
 * si riapre.
 *
 * UN LIMITE DELL'EMULATORE, NON DEL CODICE. firebase-tools 13.35.1 passa alle
 * Functions `admin.firestore` come funzione LEGATA (`bind`), e una funzione
 * legata perde le proprieta' statiche: `admin.firestore.FieldValue` vale
 * `undefined` SOLO qui. Quindi nell'emulatore `claimCompagnia` mette il
 * claim in Auth (verificato sotto) ma fallisce la riga dopo, quella che
 * scrive `claimApplicata`. In produzione il modulo e' quello vero:
 * `pushNotifica` usa `admin.firestore.FieldValue` da agosto, e il 20/09
 * `claimApplicata` e' stato scritto (commit 1cd0652). La scrittura di
 * `claimApplicata` e l'«non si avvita» li prova banco-claim.js con un admin
 * finto; qui si prova tutto il resto.
 */
"use strict";
var fs = require("fs");
var { chromium } = require("playwright");
var C = require("./e2e-comune.js");

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}
function pausa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function claimsAuth(uid) {
  var r = await C.richiesta("POST", C.AUTH_HOST, "/identitytoolkit.googleapis.com/v1/projects/" + C.PROGETTO + "/accounts:lookup", { localId: [uid] });
  var u = r.j && r.j.users && r.j.users[0];
  try { return u && u.customAttributes ? JSON.parse(u.customAttributes) : {}; } catch (e) { return {}; }
}
async function aspettaClaim(uid, atteso, ms) {
  var t0 = Date.now(), c;
  while (Date.now() - t0 < ms) { c = await claimsAuth(uid); if ((c.compagnia || null) === atteso) return c; await pausa(500); }
  return await claimsAuth(uid);
}
function profilo(chi, compagnia) {
  return { email: chi.email, approved: true, nomeCognome: chi.nome + " Prova", username: chi.nome, compagnia: compagnia,
    federazioni: [{ code: "fiarc", tessera: "FI" + chi.nome }], privacy: true, terms: true };
}
async function vedeEntro(page, id, ms) {
  var t0 = Date.now();
  while (Date.now() - t0 < ms) {
    var v = await page.evaluate(function () { return window.__prova.allenamenti(); });
    if (v.indexOf(id) >= 0) return Date.now() - t0;
    await page.waitForTimeout(500);
  }
  return -1;
}

(async function () {
  await C.librerie();
  await C.azzera();
  await C.regole(fs.readFileSync("firestore.rules", "utf8"));
  var browser = await chromium.launch();
  var url = C.preparaApp("ramo", fs.readFileSync(process.env.APP || "app.html", "utf8"));

  console.log("\n  LA FUNCTION, DA SOLA\n");
  var mario = await C.account("mario@prova.it", C.CLUB, false);
  var c1 = await aspettaClaim(mario.uid, C.CLUB, 10000);
  prova("la scrittura del profilo fa scattare claimCompagnia: il claim e' nel token", c1.compagnia === C.CLUB, JSON.stringify(c1));

  console.log("\n  L'ALLENAMENTO «SOLO CLUB»\n");
  var m = await C.apri(browser, url, mario);
  await m.page.evaluate(function (c) { window.__prova.nuovoAllenamento("Campo di prova", c); }, C.CLUB);
  await m.page.waitForTimeout(500);
  var domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await m.page.evaluate(function (d) { var x = document.querySelector("input.data[type=date]"); x.value = d; x.dispatchEvent(new Event("input", { bubbles: true })); x.dispatchEvent(new Event("change", { bubbles: true })); }, domani);
  await C.tocca(m.page, "Pubblica");
  var ot = await C.aspettaServer(async function () { var x = await C.elenco("open_trainings"); return x.length ? x : null; }, 10000);
  var idOt = ot && ot[0] && ot[0].name.split("/").pop();
  prova("Mario pubblica un «solo club» della sua compagnia", !!idOt);
  await m.ctx.close();

  console.log("\n  IL GIORNO DELLA PUBBLICAZIONE: SOCIA DI SEMPRE, CLAIM MAI MESSO\n");
  /* Ada e' socia da mesi: compagnia nel documento e nel telefono. Il claim
     pero' non l'ha: per lei la Function non e' mai scattata (e' la situazione
     di TUTTI il giorno in cui si pubblicano le regole, per chi non ha aperto
     l'app fra il deploy delle Functions e quello delle regole). Qui la
     Function scatta alla semina, quindi il claim glielo si toglie a mano in
     Auth. Nell'emulatore `claimApplicata` non c'e' (vedi in cima), quindi la
     Function lo rimettera' alla prossima scrittura — come in produzione per
     chi non l'ha mai avuto. Apre l'app: token senza claim, «no» sulla
     finestra della compagnia, e da qui l'app deve arrivarci DA SOLA. */
  var ada = await C.account("ada@prova.it", C.CLUB, false);
  await aspettaClaim(ada.uid, C.CLUB, 10000);
  await C.richiesta("POST", C.AUTH_HOST, "/identitytoolkit.googleapis.com/v1/projects/" + C.PROGETTO + "/accounts:update", { localId: ada.uid, customAttributes: "{}" });
  prova("preparazione: Ada entra senza claim", !(await claimsAuth(ada.uid)).compagnia);
  var a = await C.apri(browser, url, ada);
  var ms = await vedeEntro(a.page, idOt, 30000);
  var richiesto = await C.richiesta("GET", C.FS_HOST, "/v1/projects/" + C.PROGETTO + "/databases/(default)/documents/users/" + ada.uid);
  prova("l'app, dopo il «no», scrive il richiamo (claimRichiesto)", !!(richiesto.j && richiesto.j.fields && richiesto.j.fields.claimRichiesto));
  prova("la Function rimette il claim", (await claimsAuth(ada.uid)).compagnia === C.CLUB);
  prova("...e Ada vede il «solo club» SENZA ricaricare e senza rifare l'accesso", ms >= 0, ms >= 0 ? ("dopo " + ms + " ms") : "mai in 30 s");
  await a.ctx.close();

  console.log("\n  IL CLAIM CHE ARRIVA TARDI (limite dichiarato)\n");
  /* Eva apre l'app PRIMA che la sua compagnia arrivi nel documento: i due
     tentativi di rinnovo dell'app si spendono a vuoto. Poi arriva la
     compagnia, la Function mette il claim — ma l'app non riprova piu' in
     questa sessione (due tentativi, per scelta: niente rincorse). La vede
     riaprendo l'app. Lo si prova, perche' e' il comportamento promesso. */
  var eva = await C.account("eva@prova.it", null, false);
  await pausa(3000);
  eva.compagnia = C.CLUB;
  var e = await C.apri(browser, url, eva);
  await e.page.waitForTimeout(12000);          // i due tentativi si consumano
  await C.seme("users/" + eva.uid, { compagnia: C.CLUB }, true);
  await aspettaClaim(eva.uid, C.CLUB, 10000);
  await e.page.evaluate(function () { window.__prova.ricaricaAllenamenti(); });
  var tardi = await vedeEntro(e.page, idOt, 8000);
  prova("nella stessa sessione non lo vede (i due tentativi sono finiti)", tardi < 0);
  await e.page.reload();
  await e.page.waitForFunction(function () { return !!window.__prova; }, null, { timeout: 20000 });
  var dopo = await vedeEntro(e.page, idOt, 20000);
  prova("riaprendo l'app lo vede", dopo >= 0, dopo >= 0 ? ("dopo " + dopo + " ms") : "mai in 20 s");
  await e.ctx.close();

  console.log("\n  CHI NON E' DEL CLUB\n");
  var ugo = await C.account("ugo@prova.it", "02ALTR", false);
  await aspettaClaim(ugo.uid, "02ALTR", 10000);
  var u = await C.apri(browser, url, ugo);
  await u.page.waitForTimeout(6000);
  var vu = await u.page.evaluate(function () { return window.__prova.allenamenti(); });
  prova("Ugo, altra compagnia col suo claim, NON lo vede", vu.indexOf(idOt) < 0);
  await u.ctx.close();

  console.log("\n  CAMBIARE COMPAGNIA\n");
  await C.seme("users/" + mario.uid, profilo(mario, "03NUOV"));
  var c3 = await aspettaClaim(mario.uid, "03NUOV", 10000);
  prova("cambiando compagnia il claim segue", c3.compagnia === "03NUOV", JSON.stringify(c3));
  await C.seme("users/" + mario.uid, profilo(mario, "<script>"));
  var c4 = await aspettaClaim(mario.uid, null, 10000);
  prova("un codice inventato non entra nel token (lo svuota)", !c4.compagnia, JSON.stringify(c4));

  await browser.close();
  try { fs.rmSync(C.D, { recursive: true, force: true }); } catch (x) {}
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", (e && e.stack) || e); process.exit(1); });
