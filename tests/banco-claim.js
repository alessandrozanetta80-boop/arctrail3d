#!/usr/bin/env node
/* banco-claim.js — la compagnia nel token: come ci arriva, e come NON si avvita.
 *
 *   node tests/banco-claim.js
 *
 * PERCHE' ESISTE. (20/09/2026.) La regola che decide chi puo' ELENCARE gli
 * allenamenti «solo club» guarda `request.auth.token.compagnia`, e li' dentro
 * la compagnia ce la mette la Cloud Function `claimCompagnia`. Tutta la
 * catena — scrittura, trigger, claim, rinnovo del token, query riaperta — sta
 * in piedi su cose che non si vedono: se si inceppa, l'unico sintomo e' un
 * elenco a cui mancano dei pezzi, e nessuno lo collega al token.
 *
 * Due difetti possibili, opposti, e tutti e due gia' scritti una volta:
 *   - NON PARTE MAI. La prima stesura della Function usciva se la compagnia
 *     non era CAMBIATA. Il giorno della pubblicazione nessuno ha il claim e a
 *     nessuno la compagnia sta per cambiare: sarebbero rimasti tutti senza,
 *     per sempre, aspettando un cambio che non arriva.
 *   - NON SI FERMA PIU'. La Function scrive in `users/{uid}`, cioe' nello
 *     stesso documento che la fa partire. Senza una condizione d'uscita che
 *     regge alla SECONDA passata, si richiama da sola all'infinito — e si
 *     paga a ogni giro.
 *
 * COSA PROVA.
 *   A. la Function, eseguita davvero, con un finto `admin` che registra ogni
 *      `setCustomUserClaims`: mette il claim a chi non ce l'ha, non lo rimette
 *      a chi ce l'ha gia' (seconda passata = zero scritture), lo toglie a chi
 *      esce dalla compagnia, e rifiuta un codice che non ha la forma giusta;
 *   B. la politica del client: due tentativi per sessione e non di piu', un
 *      tentativo si conta solo se il rinnovo e' RIUSCITO, offline non si
 *      tenta, e c'e' un solo ascoltatore `online`.
 */
"use strict";
const Module = require("module");
const fs = require("fs");
const path = require("path");

let ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra !== undefined ? "  — " + extra : "")); }
}

/* ══ A. LA FUNCTION, ESEGUITA ═════════════════════════════════════════════ */
const scritti = {};            // percorso -> trigger onDocumentWritten
const trigger = {};            // percorso -> trigger onDocumentCreated
let claimFatti = [];           // ogni setCustomUserClaims che passa di qui
let scritteUtente = [];        // ogni set() su users/{uid}
let AUTH_ROTTA = false;

const finto = {
  "firebase-functions/v2/firestore": {
    onDocumentCreated: function (p, fn) { trigger[p] = fn; return fn; },
    onDocumentWritten: function (p, fn) { scritti[p] = fn; return fn; }
  },
  "firebase-functions/v2/https": {
    onCall: function (_o, fn) { return fn; },
    HttpsError: class extends Error { constructor(c, m) { super(m); this.code = c; } }
  },
  "firebase-functions/v2": { setGlobalOptions: function () {} },
  "firebase-admin": {
    initializeApp: function () {},
    messaging: function () { return { send: function () { return Promise.resolve(); } }; },
    auth: function () {
      return {
        getUserByEmail: function () { return Promise.reject(new Error("user-not-found")); },
        setCustomUserClaims: function (uid, claims) {
          if (AUTH_ROTTA) return Promise.reject(new Error("auth/internal-error"));
          claimFatti.push({ uid: uid, claims: claims });
          return Promise.resolve();
        }
      };
    },
    firestore: Object.assign(function () {
      return {
        collection: function (nome) {
          return {
            get: function () { return Promise.resolve({ size: 0, forEach: function () {} }); },
            doc: function (id) {
              return {
                get: function () { return Promise.resolve({ exists: false, data: function () { return {}; } }); },
                set: function (v) { scritteUtente.push({ raccolta: nome, id: id, doc: v }); return Promise.resolve(); },
                update: function () { return Promise.resolve(); },
                collection: function () {
                  return { add: function () { return Promise.resolve({}); },
                           doc: function () { return { get: function () { return Promise.resolve({ exists:false, data:function(){return {};} }); },
                                                       create: function () { return Promise.resolve({}); },
                                                       update: function () { return Promise.resolve(); },
                                                       delete: function () { return Promise.resolve(); } }; } };
                }
              };
            }
          };
        }
      };
    }, {
      FieldValue: { serverTimestamp: function () { return "@ora"; },
                    delete: function () { return "@cancella"; },
                    increment: function (n) { return "@piu" + n; } }
    })
  }
};

const caricaVero = Module._load;
Module._load = function (richiesto) {
  if (Object.prototype.hasOwnProperty.call(finto, richiesto)) return finto[richiesto];
  return caricaVero.apply(this, arguments);
};
require(path.resolve(__dirname, "..", "functions", "index.js"));
Module._load = caricaVero;

const claim = scritti["users/{uid}"];

/* Un evento come lo manda Firebase: prima e dopo, e i parametri del percorso. */
function evento(prima, dopo, uid) {
  function lato(d) {
    return d === null ? { exists: false, data: function () { return {}; } }
                      : { exists: true, data: function () { return d; } };
  }
  return { params: { uid: uid || "utenteA" }, data: { before: lato(prima), after: lato(dopo) } };
}

(async function () {
  console.log("\n  LA FUNCTION: IL CLAIM ARRIVA, E UNA VOLTA SOLA\n");
  prova("la Function e' registrata su users/{uid}", typeof claim === "function");
  if (typeof claim !== "function") {
    console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
    process.exit(1);
  }

  /* IL CASO DEL GIORNO DELLA PUBBLICAZIONE: nessuno ha il claim, e a nessuno
     la compagnia sta cambiando. Se la Function guardasse «e' cambiata?»,
     questo non farebbe niente — ed e' il difetto che aveva. */
  claimFatti = []; scritteUtente = [];
  await claim(evento({ compagnia: "01VERB" }, { compagnia: "01VERB" }));
  prova("a chi ha la compagnia e NON ha il claim, il claim arriva (anche se non e' cambiata)",
        claimFatti.length === 1 && claimFatti[0].claims.compagnia === "01VERB",
        JSON.stringify(claimFatti));
  prova("e il documento si segna cosa e' stato applicato",
        scritteUtente.length === 1 && scritteUtente[0].doc.claimApplicata === "01VERB",
        JSON.stringify(scritteUtente));

  /* LA SECONDA PASSATA. La scrittura qui sopra fa ripartire il trigger sullo
     stesso documento: questa e' la passata che deve fermarsi. */
  claimFatti = []; scritteUtente = [];
  await claim(evento({ compagnia: "01VERB" },
                     { compagnia: "01VERB", claimApplicata: "01VERB", claimAl: "@ora" }));
  prova("la seconda passata non fa niente: nessun claim, nessuna scrittura",
        claimFatti.length === 0 && scritteUtente.length === 0,
        JSON.stringify({ claim: claimFatti, scritte: scritteUtente }));

  claimFatti = []; scritteUtente = [];
  await claim(evento({ compagnia: "01VERB", claimApplicata: "01VERB" },
                     { compagnia: "09ALTRA", claimApplicata: "01VERB" }));
  prova("cambiando compagnia il claim cambia",
        claimFatti.length === 1 && claimFatti[0].claims.compagnia === "09ALTRA",
        JSON.stringify(claimFatti));

  claimFatti = []; scritteUtente = [];
  await claim(evento({ compagnia: "01VERB", claimApplicata: "01VERB" },
                     { claimApplicata: "01VERB" }));
  prova("uscendo dalla compagnia il claim si svuota",
        claimFatti.length === 1 && !claimFatti[0].claims.compagnia,
        JSON.stringify(claimFatti));
  prova("e il documento lo registra",
        scritteUtente.length === 1 && scritteUtente[0].doc.claimApplicata === "",
        JSON.stringify(scritteUtente));

  /* IL CODICE LO SCRIVE IL CLIENT: se non ha la forma di una chiave di
     `compagnie-data.js`, nel token non ci entra. */
  claimFatti = []; scritteUtente = [];
  await claim(evento({}, { compagnia: "<img src=x onerror=1>" }));
  prova("un codice compagnia inventato non entra nel token",
        claimFatti.length === 1 && !claimFatti[0].claims.compagnia,
        JSON.stringify(claimFatti));

  /* AUTH IRRAGGIUNGIBILE: la Function non deve rompersi ne' segnare come
     applicato un claim che non e' stato messo. */
  claimFatti = []; scritteUtente = []; AUTH_ROTTA = true;
  let esplosa = false;
  try { await claim(evento({}, { compagnia: "01VERB" })); } catch (e) { esplosa = true; }
  AUTH_ROTTA = false;
  prova("se Auth non risponde la Function non esplode", !esplosa);
  prova("e NON scrive che il claim e' applicato (se no non ci riproverebbe mai)",
        scritteUtente.length === 0, JSON.stringify(scritteUtente));

  /* ══ B. LA POLITICA DEL CLIENT ══════════════════════════════════════════
     Non si esegue l'app: si chiede al testo che i limiti ci siano, perche'
     sono limiti — e un limite che non c'e' non si vede mai, finche' non e'
     tardi. */
  console.log("\n  LA POLITICA DEL CLIENT: NESSUNA RINCORSA\n");
  const APP = fs.readFileSync(process.env.APP || "app.html", "utf8");
  prova("c'e' un tetto di due tentativi per sessione",
        /claimTentativi >= 2\) return;/.test(APP));
  prova("un tentativo si conta solo se il rinnovo e' RIUSCITO (nel then, non nel catch)",
        /getIdToken\(true\);\s*\n\}\)\.then\(function\(\)\{\s*\nclaimTentativi\+\+/.test(APP),
        "l'incremento non e' nel ramo del successo");
  prova("offline non si tenta nemmeno",
        /navigator\.onLine === false\)\{ claimRiprovaAlRientro\(\); return; \}/.test(APP));
  prova("l'ascoltatore `online` si registra una volta sola",
        /if\(claimAscoltoRete\) return;\s*\nclaimAscoltoRete = true;/.test(APP));
  prova("la scrittura di richiamo e' una sola per sessione",
        /if\(!claimRichiesta\)\{\s*\nclaimRichiesta = true;/.test(APP));
  prova("il richiamo scrive un campo che non dice niente (claimRichiesto)",
        /set\(\{ claimRichiesto: Date\.now\(\) \}, \{ merge:true \}\)/.test(APP));
  prova("si riapre SOLO la finestra della compagnia, non tutte e quattro",
        /riapriFinestra\("compagnia"\)/.test(APP) && /function riapriFinestra\(nome\)/.test(APP));
  prova("cambiando compagnia il conto riparte (e' un caso nuovo, non una rincorsa)",
        /claimTentativi = 0; claimRichiesta = false; claimNegata = false;/.test(APP));
  prova("un «permesso negato» sulle altre finestre NON chiede token",
        /if\(negato && nome === "compagnia"\)\{/.test(APP));

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.error("  banco rotto:", e && e.message); process.exit(1); });
