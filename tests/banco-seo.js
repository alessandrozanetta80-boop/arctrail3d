/* BANCO SEO — le pagine pubbliche dicono a Google cose vere e coerenti.
 *
 * Nato il 18/09/2026, insieme alle pagine ASA, IBO e al confronto in inglese.
 * Legge i file veri del sito (nessun browser, nessuna rete) e controlla:
 *
 *   1. ogni pagina INDICIZZABILE ha title, description, H1, canonical su se
 *      stessa, html lang — e title e description non si ripetono fra pagine;
 *   2. hreflang: se c'e', ha l'x-default e ogni coppia fra due file diversi e'
 *      reciproca;
 *   3. la sitemap: solo pagine indicizzabili, solo URL canonici, niente
 *      parametri, niente noindex — e nessuna pagina indicizzabile ne resta fuori;
 *   4. robots.txt dichiara https://arctrail3d.com/sitemap.xml e non blocca
 *      pagine della sitemap;
 *   5. app.html e' noindex,follow, fuori dalla sitemap, e la PWA non si e'
 *      mossa: manifest, start_url, service worker;
 *   6. ASA e IBO sono raggiungibili, nei due sensi, dall'hub dei regolamenti;
 *   7. ogni link interno porta a un file che esiste, e nessuna pagina
 *      indicizzabile e' orfana;
 *   8. nessuna pagina pubblica dice che ArcTrail sia ufficiale, approvata o
 *      valida in gara. La frase negata («non e' un'app ufficiale») si'.
 *
 * NOTO E NON ROSSO: la home e privacy/termini dichiarano hreflang verso
 * `?lang=xx`, che hanno canonical sulla pagina senza parametro. Google li
 * ignora. Non si ripara con una riga: serve un URL vero per lingua — piano in
 * docs/SEO-MULTILINGUA-PIANO.md. Il banco lo STAMPA a ogni giro, perche' un
 * debito che nessuno vede e' un debito che nessuno paga.
 *
 * SABOTAGGIO: `node tests/banco-seo.js --sabota` rimette app.html nella
 * sitemap e pretende il rosso.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SABOTA = process.argv.indexOf("--sabota") !== -1;
const SITO = "https://arctrail3d.com";
let passate = 0, fallite = 0;

function ok(nome, cond, extra) {
  if (cond) { passate++; console.log("  ✓ " + nome); }
  else { fallite++; console.log("  ✗ " + nome + (extra ? "  — " + extra : "")); }
}
function leggi(f) { return fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"); }
function testo(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
             .replace(/<style[\s\S]*?<\/style>/gi, " ")
             .replace(/<!--[\s\S]*?-->/g, " ")
             .replace(/<[^>]+>/g, " ")
             .replace(/&nbsp;|&middot;/g, " ")
             .replace(/\s+/g, " ");
}
function attr(tag, nome) {
  const m = new RegExp("\\s" + nome + "=\"([^\"]*)\"", "i").exec(tag);
  return m ? m[1] : null;
}

// ── Le pagine ────────────────────────────────────────────────────────────
// Tutti gli .html in radice. `archive/` non e' pubblicato come pagina.
const FILE = fs.readdirSync(".").filter(f => /\.html$/.test(f)).sort();

function urlDi(f) { return f === "index.html" ? SITO + "/" : SITO + "/" + f; }
function fileDi(u) {
  if (u.indexOf(SITO) !== 0) return null;
  let p = u.slice(SITO.length).split("#")[0].split("?")[0];
  if (p === "" || p === "/") return "index.html";
  return p.replace(/^\//, "");
}

const PAG = {};
for (const f of FILE) {
  const h = leggi(f);
  // Solo la <head> per i metadati: app.html ha altri H1 e <html> dentro al JS.
  const testa = (h.split(/<\/head>/i)[0]) || "";
  const corpo = h.slice(testa.length);
  const robotsTag = /<meta name="robots"[^>]*>/i.exec(testa);
  const robots = robotsTag ? (attr(robotsTag[0], "content") || "") : "";
  const canTag = /<link rel="canonical"[^>]*>/i.exec(testa);
  const htmlTag = /<html[^>]*>/i.exec(h);
  const descTag = /<meta name="description"[^>]*>/i.exec(testa);
  const tit = /<title[^>]*>([^<]*)<\/title>/i.exec(testa);
  // Gli H1 fuori dai copioni: quelli dentro al JS sono schermate dell'app.
  const corpoStatico = corpo.replace(/<script[\s\S]*?<\/script>/gi, "");
  const h1 = (corpoStatico.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || []).map(x => testo(x).trim());
  const alt = [];
  const re = /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(testa))) alt.push({ lang: m[1], href: m[2] });
  const link = [];
  const reA = /<a\s[^>]*href="([^"]+)"/gi;
  while ((m = reA.exec(corpoStatico))) link.push(m[1]);
  PAG[f] = {
    html: h, robots: robots,
    indicizzabile: !/noindex/i.test(robots),
    canonical: canTag ? attr(canTag[0], "href") : null,
    lang: htmlTag ? attr(htmlTag[0], "lang") : null,
    desc: descTag ? attr(descTag[0], "content") : null,
    title: tit ? tit[1].trim() : null,
    h1: h1, alt: alt, link: link
  };
}
const INDICIZZABILI = FILE.filter(f => PAG[f].indicizzabile);

// ── 1. I metadati di ogni pagina indicizzabile ──────────────────────────
console.log("\n  1. Metadati delle pagine indicizzabili (" + INDICIZZABILI.length + ")\n");
const LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
for (const f of INDICIZZABILI) {
  const p = PAG[f];
  ok(f + ": title", !!p.title);
  ok(f + ": meta description", !!p.desc && p.desc.length >= 50, p.desc ? p.desc.length + " caratteri" : "manca");
  ok(f + ": almeno un H1 statico", p.h1.length >= 1);
  ok(f + ": canonical su se stessa", p.canonical === urlDi(f), "e' " + p.canonical);
  ok(f + ": html lang valido", LINGUE.indexOf(p.lang) >= 0, "e' " + p.lang);
}
function unici(campo) {
  const visti = {};
  for (const f of INDICIZZABILI) {
    const v = PAG[f][campo];
    if (!v) continue;
    (visti[v] = visti[v] || []).push(f);
  }
  return Object.keys(visti).filter(k => visti[k].length > 1).map(k => visti[k].join(" = "));
}
ok("i title non si ripetono", unici("title").length === 0, unici("title").join("; "));
ok("le description non si ripetono", unici("desc").length === 0, unici("desc").join("; "));
(function(){
  const visti = {};
  for (const f of INDICIZZABILI) {
    const h = PAG[f].h1[0];
    if (h) (visti[h] = visti[h] || []).push(f);
  }
  const doppi = Object.keys(visti).filter(k => visti[k].length > 1);
  ok("il primo H1 non si ripete fra pagine", doppi.length === 0, doppi.join("; "));
})();

// ── 2. hreflang ──────────────────────────────────────────────────────────
console.log("\n  2. hreflang\n");
const noteQuery = [];
for (const f of FILE) {
  const a = PAG[f].alt;
  if (!a.length) continue;
  ok(f + ": hreflang con x-default", a.some(x => x.lang === "x-default"));
  ok(f + ": nessuna lingua dichiarata due volte",
     new Set(a.map(x => x.lang)).size === a.length);
  for (const x of a) {
    const g = fileDi(x.href);
    ok(f + ": hreflang " + x.lang + " porta a un file che esiste", !!g && fs.existsSync(g), x.href);
    if (g && g !== f && fs.existsSync(g)) {
      ok(f + " ↔ " + g + ": hreflang reciproco",
         PAG[g].alt.some(y => fileDi(y.href) === f), "manca il ritorno");
    }
    if (/\?/.test(x.href) && x.lang !== "x-default") noteQuery.push(f);
  }
}
const conQuery = Array.from(new Set(noteQuery));
if (conQuery.length) {
  console.log("  … NOTO, NON ROSSO: hreflang verso ?lang= (canonical altrove) in " +
              conQuery.join(", ") + " — vedi docs/SEO-MULTILINGUA-PIANO.md");
}

// ── 3. La sitemap ────────────────────────────────────────────────────────
console.log("\n  3. sitemap.xml\n");
let sitemap = leggi("sitemap.xml");
if (SABOTA) {
  sitemap = sitemap.replace("</urlset>",
    "  <url>\n    <loc>https://arctrail3d.com/app.html</loc>\n  </url>\n</urlset>");
  console.log("  (SABOTAGGIO: app.html rimessa nella sitemap)\n");
}
const LOC = (sitemap.match(/<loc>[^<]+<\/loc>/g) || []).map(x => x.replace(/<\/?loc>/g, "").trim());
ok("la sitemap ha degli URL", LOC.length > 0);
ok("nessun URL doppio nella sitemap", new Set(LOC).size === LOC.length);
for (const u of LOC) {
  const f = fileDi(u);
  ok(u + ": il file esiste", !!f && fs.existsSync(f));
  ok(u + ": senza parametri", u.indexOf("?") < 0 && u.indexOf("#") < 0);
  if (f && PAG[f]) {
    ok(u + ": indicizzabile (niente noindex)", PAG[f].indicizzabile, PAG[f].robots);
    ok(u + ": e' il canonical della sua pagina", PAG[f].canonical === u, "canonical " + PAG[f].canonical);
  }
}
for (const f of INDICIZZABILI) {
  ok(f + ": indicizzabile e presente in sitemap", LOC.indexOf(urlDi(f)) >= 0);
}

// ── 4. robots.txt ────────────────────────────────────────────────────────
console.log("\n  4. robots.txt\n");
const robotsTxt = leggi("robots.txt");
ok("robots.txt dichiara " + SITO + "/sitemap.xml",
   /^Sitemap:\s*https:\/\/arctrail3d\.com\/sitemap\.xml\s*$/m.test(robotsTxt));
const vietati = (robotsTxt.match(/^Disallow:\s*(\S+)/gm) || []).map(x => x.replace(/^Disallow:\s*/, ""));
for (const u of LOC) {
  const p = u.slice(SITO.length) || "/";
  ok(p + ": non bloccata da robots.txt", !vietati.some(v => v && p.indexOf(v) === 0));
}

// ── 5. app.html: fuori da Google, dentro al telefono ─────────────────────
console.log("\n  5. app.html\n");
ok("app.html e' noindex,follow", /noindex/i.test(PAG["app.html"].robots) && /(^|,)\s*follow/i.test(PAG["app.html"].robots),
   PAG["app.html"].robots);
ok("app.html non e' in sitemap", LOC.indexOf(SITO + "/app.html") < 0);
const manifest = JSON.parse(leggi("manifest.json"));
ok("manifest: start_url resta sull'app", /app\.html/.test(manifest.start_url || ""), manifest.start_url);
ok("app.html dichiara ancora il manifest", /<link rel="manifest" href="[^"]*manifest\.json"/.test(PAG["app.html"].html));
const sw = leggi("sw.js");
ok("sw.js tiene ancora app.html fra i file dell'app", /"app\.html"/.test(sw));

// ── 6. ASA e IBO ─────────────────────────────────────────────────────────
console.log("\n  6. ASA, IBO e l'hub\n");
function linka(da, a) {
  return !!PAG[da] && PAG[da].link.some(h => h.split("?")[0].split("#")[0].replace(/^\//, "") === a);
}
for (const f of ["asa-3d.html", "ibo-3d.html"]) {
  ok(f + " esiste", !!PAG[f]);
  if (!PAG[f]) continue;
  ok(f + " e' in sitemap", LOC.indexOf(urlDi(f)) >= 0);
  ok("hub → " + f, linka("regolamenti-3d.html", f));
  ok(f + " → hub", linka(f, "regolamenti-3d.html"));
  ok(f + " → app", linka(f, "app.html"));
  ok(f + " cita la fonte ufficiale", /asaarchery\.com|iboarchery\.com/.test(PAG[f].html));
  ok(f + " dichiara l'anno del regolamento", /2026/.test(testo(PAG[f].html)));
}
ok("presentazione → hub", linka("presentazione.html", "regolamenti-3d.html"));

// ── 7. Link interni e pagine orfane ──────────────────────────────────────
console.log("\n  7. Link interni\n");
const rotti = [];
for (const f of FILE) {
  for (const h of PAG[f].link) {
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(h)) continue;
    const g = h.split("#")[0].split("?")[0].replace(/^\//, "") || "index.html";
    if (!fs.existsSync(g)) rotti.push(f + " → " + h);
  }
}
ok("nessun link interno rotto", rotti.length === 0, rotti.join("; "));
for (const f of INDICIZZABILI) {
  if (f === "index.html") continue;
  const da = INDICIZZABILI.filter(g => g !== f && linka(g, f));
  ok(f + ": non orfana (link da un'altra pagina indicizzabile)", da.length > 0);
}

// ── 8. Niente promesse ufficiali ─────────────────────────────────────────
console.log("\n  8. Nessun claim ufficiale\n");
// Una frase proibita passa solo se nelle 60 lettere prima c'e' una negazione.
// «approved by» da solo no: in privacy.html ci sono le clausole «approved by
// the European Commission», che sono vere e non parlano di tiro con l'arco.
const ENTI = "(the )?(ASA|IBO|IFAA|NFAS|FIARC|FITARCO|FIDASC|World Archery|any|a|la|una)? ?(federation|federazione|circuit|circuito|ASA|IBO|IFAA|NFAS|FIARC|FITARCO|World Archery)";
const PROIBITE = [
  /official (scoring )?app/i, /officially (approved|accepted|recogni[sz]ed)/i,
  new RegExp("(approved|endorsed|recogni[sz]ed) by " + ENTI, "i"),
  /valid in (competition|tournaments?)/i,
  /replaces? the (paper|official) score ?card/i,
  /app ufficiale/i, new RegExp("(approvat[ao]|riconosciut[ao]) da(lla|l)? " + ENTI, "i"),
  /omologat[ao]/i,
  /valid[oa]? (ufficialmente )?in gara/i, /accettat[ao] in gara/i,
  /sostituisce il cartellino/i
];
const NEG = /(\bnon\b|\bnot\b|\bnor\b|\bné\b|n't\b|\bno\b|\bnessun)/i;
for (const f of INDICIZZABILI) {
  if (f === "app.html") continue;
  const t = testo(PAG[f].html);
  const colpe = [];
  for (const re of PROIBITE) {
    const g = new RegExp(re.source, "gi");
    let k;
    while ((k = g.exec(t))) {
      const prima = t.slice(Math.max(0, k.index - 60), k.index);
      if (!NEG.test(prima)) colpe.push("«" + t.slice(Math.max(0, k.index - 30), k.index + k[0].length + 10).trim() + "»");
    }
  }
  ok(f + ": nessun claim ufficiale", colpe.length === 0, colpe.join(" "));
}

console.log("\n  " + passate + " passate, " + fallite + " fallite.\n");
process.exit(fallite ? 1 : 0);
