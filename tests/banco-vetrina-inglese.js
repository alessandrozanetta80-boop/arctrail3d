/* banco-vetrina-inglese.js — l'inglese della vetrina non e' un paese.
 *
 * Nato il 18/09/2026. Fino a quel giorno `LINGUA_PAESE` diceva en→uk: chi
 * leggeva in inglese era trattato da britannico — Archery GB ed EFAA nella
 * fascia, le federazioni UK in testa — anche un americano che cercava ASA.
 *
 * Adesso i contesti inglesi sono tre, e questo banco li prova sulla pagina
 * vera, in Chromium, arrivandoci in tutti e due i modi (indirizzo e tendina):
 *
 *   en     internazionale: nessun paese davanti, tutte le federazioni,
 *          nella fascia World Archery e IFAA — niente UK, niente USA;
 *   en-US  ASA e IBO in testa e nella fascia, «range», l'esempio con ASA/IBO
 *          in iarde — e tutte le altre federazioni ancora li';
 *   en-GB  Archery GB, EFAA e NFAS in testa, l'esempio con l'NFAS.
 *
 * E in piu': la lingua del browser non sceglie mai una regione da sola
 * (en-US di sistema → en), la scelta si ricorda, i link all'app portano
 * `lang=en` (l'app le varianti non le conosce), le altre otto lingue non si
 * muovono, e non nasce nessun hreflang verso un indirizzo che non esiste.
 *
 * SABOTAGGIO: `node tests/banco-vetrina-inglese.js --sabota` rimette en→uk in
 * una copia della pagina e pretende il rosso.
 */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SABOTA = process.argv.indexOf("--sabota") !== -1;
let passate = 0, fallite = 0;
function ok(nome, cond, extra) {
  if (cond) { passate++; console.log("  ✓ " + nome); }
  else { fallite++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}

let FILE = path.resolve("index.html");
let src = fs.readFileSync(FILE, "utf8");
let COPIA = null;
if (SABOTA) {
  src = src.replace(/var LINGUA_PAESE = \{([^}]*)\};/, 'var LINGUA_PAESE = {$1, en:"uk" };');
  // Accanto all'originale, perche' le immagini e l'app sono relative.
  COPIA = path.resolve(".banco-vetrina-sabotata.html");
  fs.writeFileSync(COPIA, src);
  FILE = COPIA;
  console.log("\n  (SABOTAGGIO: en→uk rimesso in LINGUA_PAESE)\n");
}

const UK = ["Archery GB", "EFAA", "NFAS"];
const US = ["ASA", "IBO"];
const ALTRE = [["it", "it"], ["fr", "fr"], ["de", "de"], ["tr", "tr"], ["es", "es"],
               ["sv", "se"], ["nl", "nl"], ["ru", ""]];

(async () => {
  // ── 1. Sul testo: la mappa e gli hreflang ────────────────────────────────
  console.log("\n  1. Il sorgente\n");
  const mappa = (src.match(/var LINGUA_PAESE = \{([^}]*)\}/) || [])[1] || "";
  ok("LINGUA_PAESE non da' un paese all'inglese", !/\ben\s*:/.test(mappa), mappa.trim());
  const testa = src.split(/<\/head>/i)[0];
  const alt = Array.from(testa.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)).map(m => ({ l: m[1], h: m[2] }));
  ok("nessun hreflang regionale: /en-us/ e /en-gb/ non esistono ancora",
     !alt.some(a => /^en-/i.test(a.l)), alt.map(a => a.l).join(","));
  ok("nessun hreflang verso una cartella di lingua",
     !alt.some(a => /arctrail3d\.com\/[a-z]{2}(-[a-z]{2})?\//i.test(a.h)));
  ok("canonical sempre sulla radice", /<link rel="canonical" href="https:\/\/arctrail3d\.com\/">/.test(testa));
  for (const d of ["en", "en-us", "en-gb"])
    ok("la cartella /" + d + "/ non c'e' (nessun URL doppio)", !fs.existsSync(path.resolve(d)));
  const sitemap = fs.readFileSync("sitemap.xml", "utf8");
  ok("la sitemap non ha ?lang ne' cartelle di lingua", !/\?lang=|\/en(-[a-z]{2})?\//i.test(sitemap));
  // Le frasi regionali: chiavi che esistono, e diverse dall'inglese.
  const P = JSON.parse((src.match(/var PAROLE = (\{.*?\});\r?\n/s) || [])[1]);
  const R = Function("return " + ((src.match(/var REGIONALI = (\{[\s\S]*?\n  \});/) || [])[1] || "null"))();
  ok("le frasi regionali si leggono", !!R && !!R["en-US"] && !!R["en-GB"]);
  if (R) for (const v of ["en-US", "en-GB"]) for (const k of Object.keys(R[v])) {
    ok(v + "." + k + ": la chiave esiste in PAROLE", !!P[k]);
    ok(v + "." + k + ": non ripete l'inglese generico", !P[k] || P[k].en !== R[v][k]);
  }

  const browser = await chromium.launch();
  const url = "file://" + FILE;

  async function misura(page) {
    return page.evaluate(() => {
      const fed = Array.from(document.querySelectorAll("#fed span"));
      const lingua = document.querySelector(".lingua").getBoundingClientRect();
      return {
        lang: document.documentElement.lang,
        fascia: (document.querySelector('[data-k="tre_reg_s"]') || {}).textContent || "",
        s7: (document.querySelector('[data-k="s7_guida"]') || {}).textContent || "",
        campi: (document.querySelector('[data-k="nav_campi"]') || {}).textContent || "",
        tutte: fed.map(x => x.textContent),
        mie: fed.filter(x => x.classList.contains("mia")).map(x => x.textContent),
        app: Array.from(document.querySelectorAll("a[data-app]")).map(a => a.getAttribute("href")),
        sigla: (document.getElementById("linguaSigla") || {}).textContent,
        nome: (document.getElementById("linguaNome") || {}).textContent,
        sporge: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        linguaFuori: lingua.right > window.innerWidth + 0.5,
        salvata: (function(){ try { return localStorage.getItem("arctrail-vetrina-lingua"); } catch (e) { return "?"; } })(),
        indirizzo: location.search
      };
    });
  }

  // ── 2. Il riferimento: l'italiano, per sapere quante federazioni ci sono ──
  const ctxIt = await browser.newContext({ locale: "it-IT" });
  const pIt = await ctxIt.newPage();
  await pIt.goto(url + "?lang=it");
  const TUTTE = (await misura(pIt)).tutte.slice().sort();
  await ctxIt.close();
  ok("il riferimento ha delle federazioni", TUTTE.length >= 19, TUTTE.length);

  const CASI = {
    "en":    { mie: [], fascia: ["World Archery", "IFAA"], s7: ["IFAA", "World Archery"], campi: "Fields", sigla: "EN", nome: "English" },
    "en-US": { mie: US, fascia: US, s7: ["ASA", "IBO", "yardage"], campi: "Ranges", sigla: "EN-US", nome: "English (US)" },
    "en-GB": { mie: UK, fascia: ["Archery GB", "EFAA"], s7: ["NFAS"], campi: "Fields", sigla: "EN-GB", nome: "English (UK)" }
  };

  function prova(etichetta, c, m, atteso) {
    ok(`[${etichetta}] <html lang> = ${c}`, m.lang === c, m.lang);
    ok(`[${etichetta}] le federazioni in testa sono ${atteso.mie.join(", ") || "nessuna"}`,
       m.mie.join("|") === atteso.mie.slice().sort((a, b) => a.localeCompare(b, "en")).join("|") &&
       m.tutte.slice(0, m.mie.length).join("|") === m.mie.join("|"), m.mie.join(", ") || "—");
    ok(`[${etichetta}] nessuna federazione sparisce (${TUTTE.length})`,
       m.tutte.slice().sort().join("|") === TUTTE.join("|"), m.tutte.length);
    for (const f of atteso.fascia) ok(`[${etichetta}] la fascia nomina ${f}`, m.fascia.includes(f), m.fascia);
    const altrui = c === "en" ? UK.concat(US) : c === "en-US" ? UK : US;
    ok(`[${etichetta}] la fascia non nomina federazioni di un altro paese`,
       !altrui.some(f => m.fascia.includes(f)), m.fascia);
    for (const w of atteso.s7) ok(`[${etichetta}] l'esempio dei regolamenti dice «${w}»`, m.s7.includes(w), m.s7);
    ok(`[${etichetta}] la sezione campi si chiama «${atteso.campi}»`, m.campi === atteso.campi, m.campi);
    ok(`[${etichetta}] la scelta si vede: «${atteso.sigla}» / «${atteso.nome}»`,
       m.sigla === atteso.sigla && m.nome === atteso.nome, m.sigla + " / " + m.nome);
    ok(`[${etichetta}] i link all'app portano lang=en`,
       m.app.length > 0 && m.app.every(h => h === "app.html?lang=en"), m.app[0]);
    ok(`[${etichetta}] niente sporge di lato, il selettore sta nello schermo`,
       m.sporge <= 0 && !m.linguaFuori, m.sporge + "px");
  }

  // ── 3. Dall'indirizzo, telefono e computer ──────────────────────────────
  for (const [schermo, w] of [["telefono", 390], ["computer", 1280]]) {
    console.log(`\n  3. Dall'indirizzo — ${schermo}\n`);
    for (const c of Object.keys(CASI)) {
      const ctx = await browser.newContext({ locale: "it-IT", viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(url + "?lang=" + c.toLowerCase());
      prova(schermo + "/" + c, c, await misura(page), CASI[c]);
      await ctx.close();
    }
  }

  // ── 4. Dalla tendina, e la scelta si ricorda ─────────────────────────────
  console.log("\n  4. Dalla tendina\n");
  {
    const ctx = await browser.newContext({ locale: "it-IT" });
    const page = await ctx.newPage();
    await page.goto(url + "?lang=it");
    for (const c of ["en-US", "en-GB", "en"]) {
      await page.selectOption("#sceltaLingua", c);
      const m = await misura(page);
      prova("tendina/" + c, c, m, CASI[c]);
      ok(`[tendina/${c}] la scelta si salva e finisce nell'indirizzo`,
         m.salvata === c && m.indirizzo.includes("lang=" + c), m.salvata + " " + m.indirizzo);
    }
    await page.selectOption("#sceltaLingua", "en-US");
    await page.goto(url);
    ok("ricaricata senza parametro, resta en-US", (await misura(page)).lang === "en-US");
    await ctx.close();
  }

  // ── 5. Il browser non sceglie una regione da solo ────────────────────────
  console.log("\n  5. La lingua del telefono\n");
  for (const loc of ["en-US", "en-GB", "en-AU"]) {
    const ctx = await browser.newContext({ locale: loc });
    const page = await ctx.newPage();
    await page.goto(url);
    const m = await misura(page);
    ok(`telefono in ${loc}, nessuna scelta fatta → en internazionale`, m.lang === "en" && m.mie.length === 0, m.lang);
    await ctx.close();
  }

  // ── 6. Le altre otto lingue non si muovono ───────────────────────────────
  console.log("\n  6. Le altre lingue\n");
  const PAESE_FED = { it: ["FIARC", "FITARCO"], fr: ["FFTA", "FFTL"], de: ["DFBV", "DSB"], tr: ["TOF"],
                      es: ["RFETA"], se: ["SBF", "SFSF"], nl: ["KHSN"], "": [] };
  for (const [l, paese] of ALTRE) {
    const ctx = await browser.newContext({ locale: "it-IT" });
    const page = await ctx.newPage();
    await page.goto(url + "?lang=" + l);
    const m = await misura(page);
    const attese = PAESE_FED[paese].slice().sort((a, b) => a.localeCompare(b, "en"));
    ok(`${l}: lingua ${l}, federazioni in testa «${attese.join(", ") || "nessuna"}», tutte presenti`,
       m.lang === l && m.mie.join("|") === attese.join("|") && m.tutte.length === TUTTE.length,
       m.lang + " / " + m.mie.join(", "));
    ok(`${l}: i link all'app portano lang=${l}`, m.app.every(h => h === "app.html?lang=" + l), m.app[0]);
    await ctx.close();
  }

  await browser.close();
  if (COPIA) { try { fs.unlinkSync(COPIA); } catch (e) {} }
  console.log("\n  " + passate + " passate, " + fallite + " fallite.\n");
  process.exit(fallite ? 1 : 0);
})().catch(e => {
  if (COPIA) { try { fs.unlinkSync(COPIA); } catch (x) {} }
  console.error(e);
  process.exit(1);
});
