#!/usr/bin/env node
/* seo-audit.js — il controllo SEO di ArcTrail 3D, in sola lettura.
 *
 *   node tools/seo-audit.js                    # i file locali (la radice del repository)
 *   node tools/seo-audit.js --online           # il sito vero, https://arctrail3d.com
 *   node tools/seo-audit.js --online https://… # un altro indirizzo
 *   node tools/seo-audit.js --online --gsc     # + Search Console (se configurata: tools/seo-gsc.js)
 *   node tools/seo-audit.js --json             # lo stesso report, in JSON, su stdout
 *   node tools/seo-audit.js --radice <cartella> # i file di un'altra copia (prove, sabotaggio)
 *
 * Da npm: `npm run seo:audit`, `npm run seo:audit:online`, `npm run seo:control`.
 *
 * COSA FA. Legge sitemap, robots.txt e le pagine (dalla sitemap, le prioritarie
 * qui sotto e quelle raggiunte dai link) e guarda: status HTTP e redirect,
 * title, description, canonical, robots meta e X-Robots-Tag, hreflang, lang, H1,
 * Open Graph, JSON-LD, link interni, pagine orfane e profondita' dalla home,
 * doppioni di title/description/H1, pagine quasi uguali, coerenza sitemap ↔
 * canonical ↔ redirect, lastmod ↔ git, e (online) sito pubblicato ↔ file locali.
 *
 * COSA NON FA. Non scrive nessun file, non chiede indicizzazioni, non usa la
 * Indexing API (e' solo per JobPosting e BroadcastEvent, non per pagine come
 * queste). Online fa solo GET, una pagina alla volta.
 *
 * LIVELLI. BLOCCANTE = una pagina che deve stare in Google non puo' starci, o
 * il segnale e' sbagliato (noindex, 404, canonical altrove, sitemap rotta).
 * ATTENZIONE = segnali deboli o in conflitto. INFO = da sapere, non si ripara
 * per forza. Una pagina NON indicizzata non e' di per se' un errore.
 *
 * USCITA. 0 = OK o ATTENZIONE, 1 = almeno un BLOCCANTE, 2 = lo strumento si e'
 * rotto. (28/09/2026)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const argv = process.argv.slice(2);
// --radice <cartella>: un'altra copia del sito (serve a sabotare lo strumento senza toccare il repository).
const RADICE = argv.includes("--radice") ? path.resolve(argv[argv.indexOf("--radice") + 1]) : path.join(__dirname, "..");
const SITO = "https://arctrail3d.com";

// Le pagine che devono entrare in Google (CLAUDE_TASK_ARCTRAIL_SEO, 28/09/2026).
const PRIORITARIE = ["/3d-archery-scoring-app.html", "/asa-3d.html", "/ibo-3d.html", "/ifaa-3d.html",
  "/world-archery-3d.html", "/fitarco-3d.html", "/nfas-3d.html"];
// Indicizzabili ma non una priorita': non si forzano.
const BASSA = ["/privacy.html", "/termini.html"];
// Fuori da Google per scelta (noindex): se diventano indicizzabili e' un errore.
const FUORI_PER_SCELTA = ["/app.html", "/marketplace.html", "/elimina-account.html"];
const LINGUE = ["it", "en", "fr", "de", "tr", "ru", "es", "sv", "nl"];
const UA = "ArcTrail3D-SEO-audit/1.0 (+https://arctrail3d.com; sola lettura)";

const ONLINE = argv.includes("--online");
const JSON_OUT = argv.includes("--json");
const GSC = argv.includes("--gsc");
const BASE = ONLINE ? (argv.find(a => /^https?:\/\//.test(a)) || SITO).replace(/\/$/, "") : SITO;

// ── Trovati ──────────────────────────────────────────────────────────────
const trovati = [];
function segna(livello, codice, pagina, messaggio, proposta) {
  trovati.push({ livello, codice, pagina: pagina || null, messaggio, proposta: proposta || null });
}
const B = "BLOCCANTE", A = "ATTENZIONE", I = "INFO";

// ── Dove si legge: file locali o rete ────────────────────────────────────
function fileDi(p) {
  p = p.split("#")[0].split("?")[0];
  if (p === "" || p === "/") return "index.html";
  p = p.replace(/^\//, "");
  if (p.endsWith("/")) return p + "index.html";
  return p;
}
async function prendi(url) {
  if (!ONLINE) {
    const p = url.startsWith(SITO) ? url.slice(SITO.length) : url;
    let f = fileDi(p);
    if (!fs.existsSync(path.join(RADICE, f)) && !/\.[a-z0-9]+$/i.test(f) && fs.existsSync(path.join(RADICE, f + ".html"))) f += ".html";
    const pieno = path.join(RADICE, f);
    if (!fs.existsSync(pieno) || fs.statSync(pieno).isDirectory()) return { status: 404, headers: {}, body: "" };
    return { status: 200, headers: {}, body: fs.readFileSync(pieno, "utf8").replace(/\r\n/g, "\n") };
  }
  try {
    const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(20000) });
    const headers = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    const body = r.status === 200 ? (await r.text()).replace(/\r\n/g, "\n") : (await r.arrayBuffer(), "");
    return { status: r.status, headers, body };
  } catch (e) {
    return { status: 0, headers: {}, body: "", errore: e.message };
  }
}
function url(p) { return BASE + (p.startsWith("/") ? p : "/" + p); }
function relativo(u) {
  if (u.startsWith(BASE)) return u.slice(BASE.length) || "/";
  if (u.startsWith(SITO)) return u.slice(SITO.length) || "/";
  return null;
}
// In locale il sito e' sempre arctrail3d.com: canonical e sitemap parlano di lui.
function assoluto(p) { return SITO + (p.startsWith("/") ? p : "/" + p); }

// ── Lettura dell'HTML ────────────────────────────────────────────────────
function attributi(tag) {
  const a = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tag))) a[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return a;
}
function tag(html, nome) {
  return (html.match(new RegExp("<" + nome + "\\b[^>]*>", "gi")) || []).map(attributi);
}
function entita(s) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&middot;/g, "·").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function testo(html) {
  return entita(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function leggiPagina(html) {
  const testa = html.split(/<\/head>/i)[0] || "";
  const corpo = html.slice(testa.length);
  const statico = corpo.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const meta = tag(testa, "meta");
  const links = tag(testa, "link");
  const metaNome = n => { const t = meta.find(m => (m.name || "").toLowerCase() === n); return t ? t.content : null; };
  const metaProp = n => { const t = meta.find(m => (m.property || "").toLowerCase() === n); return t ? t.content : null; };
  const rel = r => links.filter(l => (l.rel || "").toLowerCase().split(/\s+/).includes(r));
  const tit = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(testa);
  const htmlTag = tag(html, "html")[0] || {};
  const jsonld = [];
  const reLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = reLd.exec(html))) {
    try {
      const j = JSON.parse(m[1]);
      const tipi = [];
      (function giro(x) {
        if (Array.isArray(x)) return x.forEach(giro);
        if (x && typeof x === "object") {
          if (x["@type"]) tipi.push(...[].concat(x["@type"]));
          Object.values(x).forEach(giro);
        }
      })(j);
      jsonld.push({ valido: true, tipi });
    } catch (e) { jsonld.push({ valido: false, errore: e.message }); }
  }
  const ancore = tag(statico, "a").filter(a => a.href).map(a => ({ href: entita(a.href), rel: (a.rel || "").toLowerCase() }));
  const parole = testo(statico).split(" ").filter(Boolean);
  return {
    title: tit ? entita(tit[1]).replace(/\s+/g, " ").trim() : null,
    description: metaNome("description"),
    robots: (metaNome("robots") || "") + (metaNome("googlebot") ? "," + metaNome("googlebot") : ""),
    canonical: rel("canonical").map(l => l.href),
    lang: htmlTag.lang || null,
    hreflang: rel("alternate").filter(l => l.hreflang).map(l => ({ lang: l.hreflang, href: l.href })),
    h1: (statico.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).map(x => testo(x)),
    og: { title: metaProp("og:title"), description: metaProp("og:description"), url: metaProp("og:url"),
      image: metaProp("og:image"), type: metaProp("og:type") },
    jsonld, ancore, parole
  };
}

// ── Utilita' ─────────────────────────────────────────────────────────────
function git(args) {
  try { return cp.execFileSync("git", args, { cwd: RADICE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch (e) { return ""; }
}
function interno(href, da) {
  if (/^(mailto:|tel:|javascript:|data:|#)/i.test(href)) return null;
  let u;
  try { u = new URL(href, url(da)); } catch (e) { return null; }
  const host = new URL(BASE).host;
  if (u.host !== host && u.host !== "arctrail3d.com" && u.host !== "www.arctrail3d.com") return null;
  let p = u.pathname;
  if (p === "/index.html") p = "/";
  return p;
}
function scaglie(parole, n) {
  const s = new Set();
  const w = parole.map(x => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
  for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(" "));
  return s;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let c = 0;
  for (const x of a) if (b.has(x)) c++;
  return c / (a.size + b.size - c);
}

// ── Il giro ──────────────────────────────────────────────────────────────
async function audit() {
  const report = { quando: new Date().toISOString(), modo: ONLINE ? "online" : "locale", base: BASE, pagine: {} };

  // 1. robots.txt
  const rb = await prendi(url("/robots.txt"));
  const robotsTxt = rb.body || "";
  report.robots = { status: rb.status };
  if (rb.status !== 200) segna(B, "robots-assente", "/robots.txt", "robots.txt risponde " + rb.status);
  const gruppi = [];
  let g = null;
  robotsTxt.split("\n").map(r => r.replace(/#.*/, "").trim()).filter(Boolean).forEach(r => {
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(r);
    if (!m) return;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (!g || g.regole.length) { g = { agenti: [], regole: [] }; gruppi.push(g); } g.agenti.push(v.toLowerCase()); }
    else if ((k === "disallow" || k === "allow") && g) g.regole.push({ tipo: k, via: v });
  });
  const sitemapDichiarate = (robotsTxt.match(/^\s*sitemap\s*:\s*(\S+)/gim) || []).map(x => x.replace(/^\s*sitemap\s*:\s*/i, ""));
  report.robots.sitemap = sitemapDichiarate;
  function bloccata(p) {
    // Il gruppo di Googlebot, altrimenti quello di *. Vince la regola piu' lunga; a pari lunghezza, allow.
    const grp = gruppi.find(x => x.agenti.includes("googlebot")) || gruppi.find(x => x.agenti.includes("*"));
    if (!grp) return false;
    let best = null;
    for (const r of grp.regole) {
      if (!r.via) continue;
      const re = new RegExp("^" + r.via.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
      if (re.test(p) && (!best || r.via.length > best.via.length || (r.via.length === best.via.length && r.tipo === "allow"))) best = r;
    }
    return !!best && best.tipo === "disallow";
  }
  if (!sitemapDichiarate.includes(SITO + "/sitemap.xml"))
    segna(A, "robots-senza-sitemap", "/robots.txt", "robots.txt non dichiara " + SITO + "/sitemap.xml",
      "aggiungere la riga «Sitemap: " + SITO + "/sitemap.xml»");
  if (bloccata("/")) segna(B, "robots-blocca-tutto", "/robots.txt", "robots.txt blocca la home a Googlebot");

  // 2. sitemap.xml
  const sm = await prendi(url("/sitemap.xml"));
  const xml = sm.body || "";
  report.sitemap = { status: sm.status, contentType: sm.headers["content-type"] || null, url: [] };
  if (sm.status !== 200) segna(B, "sitemap-assente", "/sitemap.xml", "sitemap.xml risponde " + sm.status);
  if (ONLINE && sm.status === 200 && !/xml/i.test(sm.headers["content-type"] || ""))
    segna(A, "sitemap-content-type", "/sitemap.xml", "content-type " + sm.headers["content-type"]);
  const blocchi = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const strutturaOk = /^\s*(<\?xml[^>]*\?>\s*)?<urlset\s[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"[^>]*>[\s\S]*<\/urlset>\s*$/.test(xml)
    && (xml.match(/<url>/g) || []).length === blocchi.length && (xml.match(/<\/url>/g) || []).length === blocchi.length
    && !/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(xml);
  if (sm.status === 200 && !strutturaOk) segna(B, "sitemap-xml", "/sitemap.xml", "la sitemap non e' un <urlset> sitemaps.org ben formato");
  const oggi = new Date().toISOString().slice(0, 10);
  for (const b of blocchi) {
    const locs = b.match(/<loc>\s*([^<]*?)\s*<\/loc>/g) || [];
    const loc = locs.length ? locs[0].replace(/<\/?loc>/g, "").trim() : null;
    const lm = (/<lastmod>\s*([^<]*?)\s*<\/lastmod>/.exec(b) || [])[1] || null;
    if (locs.length !== 1) segna(B, "sitemap-loc", "/sitemap.xml", "un <url> con " + locs.length + " <loc>");
    if (!loc) continue;
    report.sitemap.url.push({ loc, lastmod: lm });
    if (!/^https:\/\/arctrail3d\.com\//.test(loc)) segna(B, "sitemap-url-non-assoluto", loc, "URL della sitemap fuori da " + SITO + "/ (o non https)");
    if (/[?#]/.test(loc)) segna(A, "sitemap-parametri", loc, "URL con parametri o frammento nella sitemap");
    if (lm && !/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/.test(lm)) segna(A, "sitemap-lastmod", loc, "lastmod non W3C: " + lm);
    if (lm && lm.slice(0, 10) > oggi) segna(A, "sitemap-lastmod-futuro", loc, "lastmod nel futuro: " + lm);
  }
  const locs = report.sitemap.url.map(x => x.loc);
  const doppi = locs.filter((x, i) => locs.indexOf(x) !== i);
  if (doppi.length) segna(B, "sitemap-doppi", "/sitemap.xml", "URL ripetuti: " + Array.from(new Set(doppi)).join(", "));
  for (const p of PRIORITARIE)
    if (!locs.includes(assoluto(p))) segna(B, "prioritaria-fuori-sitemap", p, "pagina prioritaria assente dalla sitemap",
      "aggiungerla a sitemap.xml");
  for (const u of locs) if (bloccata(relativo(u) || "/")) segna(B, "robots-blocca-sitemap", relativo(u), "robots.txt blocca un URL della sitemap");
  // Online: la sitemap pubblicata e' quella del repository?
  if (ONLINE && sm.status === 200 && fs.existsSync(path.join(RADICE, "sitemap.xml"))) {
    const loc2 = fs.readFileSync(path.join(RADICE, "sitemap.xml"), "utf8").replace(/\r\n/g, "\n");
    report.sitemap.ugualeAlLocale = loc2 === xml;
    if (loc2 !== xml) segna(A, "sitemap-diversa-dal-locale", "/sitemap.xml", "la sitemap online non e' identica a quella locale");
  }

  // 3. Le pagine: sitemap + prioritarie + bassa + fuori per scelta + quelle linkate (un giro in ampiezza).
  const coda = [];
  const vista = new Set();
  function metti(p) { if (p && !vista.has(p)) { vista.add(p); coda.push(p); } }
  ["/"].concat(locs.map(relativo).filter(Boolean), PRIORITARIE, BASSA, FUORI_PER_SCELTA).forEach(metti);
  if (!ONLINE) fs.readdirSync(RADICE).filter(f => /\.html$/.test(f)).forEach(f => metti(f === "index.html" ? "/" : "/" + f));
  const P = report.pagine;
  while (coda.length && Object.keys(P).length < 80) {
    const p = coda.shift();
    const r = await prendi(url(p));
    const pag = { url: assoluto(p), status: r.status, redirect: r.headers.location || null,
      xRobots: r.headers["x-robots-tag"] || null, errore: r.errore || null };
    P[p] = pag;
    if (r.status !== 200 || !/<html/i.test(r.body)) { pag.html = false; continue; }
    Object.assign(pag, leggiPagina(r.body), { html: true });
    pag.indicizzabile = !/noindex|none/i.test(pag.robots) && !/noindex|none/i.test(pag.xRobots || "");
    pag.segue = !/nofollow|none/i.test(pag.robots);
    pag.linkInterni = Array.from(new Set(pag.ancore.map(a => interno(a.href, p)).filter(Boolean)));
    if (pag.segue) pag.linkInterni.filter(x => /(\.html|\/)$/.test(x)).forEach(metti);
    // Online: la pagina pubblicata e' quella del repository?
    if (ONLINE) {
      const f = path.join(RADICE, fileDi(p));
      if (fs.existsSync(f)) pag.ugualeAlLocale = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n") === r.body;
    }
    pag.ultimoCommit = git(["log", "-1", "--format=%cs", "--", fileDi(p)]) || null;
  }

  // 4. Controlli pagina per pagina.
  const inSitemap = p => locs.includes(assoluto(p));
  for (const p of Object.keys(P)) {
    const x = P[p];
    const pri = PRIORITARIE.includes(p);
    const deveStare = pri || inSitemap(p);
    if (x.status !== 200) {
      if (x.status >= 300 && x.status < 400) segna(deveStare ? B : A, "redirect", p, "risponde " + x.status + " → " + x.redirect,
        deveStare ? "mettere nella sitemap e nei link l'URL finale" : null);
      else segna(deveStare ? B : A, "http", p, "risponde " + (x.status || "nessuna risposta") + (x.errore ? " (" + x.errore + ")" : ""));
      continue;
    }
    if (!x.html) { segna(deveStare ? B : A, "non-html", p, "la risposta non e' una pagina HTML"); continue; }
    if (FUORI_PER_SCELTA.includes(p)) {
      if (x.indicizzabile) segna(A, "fuori-per-scelta-indicizzabile", p, "doveva essere noindex e non lo e'");
      if (inSitemap(p)) segna(B, "noindex-in-sitemap", p, "pagina fuori da Google per scelta, ma nella sitemap");
      continue;
    }
    if (!x.indicizzabile) {
      segna(deveStare ? B : I, "noindex", p, "robots «" + (x.robots || x.xRobots) + "»" + (deveStare ? " su una pagina che deve stare in Google" : ""));
      continue;
    }
    // canonical
    if (!x.canonical.length) segna(deveStare ? B : A, "canonical-assente", p, "nessun <link rel=canonical>", "canonical assoluto su se stessa");
    else {
      if (x.canonical.length > 1) segna(B, "canonical-multipli", p, x.canonical.length + " canonical: Google li ignora tutti");
      const c = x.canonical[0];
      if (!/^https:\/\//.test(c)) segna(B, "canonical-relativo", p, "canonical non assoluto: " + c);
      else if (c !== assoluto(p)) {
        const verso = c === SITO + "/" ? " (verso la home)" : "";
        segna(p === "/" || deveStare ? B : A, "canonical-altrove", p, "canonical " + c + verso + " invece di " + assoluto(p));
      }
    }
    if (x.xRobots) segna(I, "x-robots-tag", p, "header X-Robots-Tag: " + x.xRobots);
    // title, description, lang, h1
    if (!x.title) segna(B, "title-assente", p, "nessun <title>");
    else if (x.title.length > 70) segna(I, "title-lungo", p, "title di " + x.title.length + " caratteri: nei risultati viene tagliato");
    if (!x.description) segna(A, "description-assente", p, "nessuna meta description");
    else if (x.description.length < 50) segna(A, "description-corta", p, "description di " + x.description.length + " caratteri");
    else if (x.description.length > 170) segna(I, "description-lunga", p, "description di " + x.description.length + " caratteri: viene tagliata");
    if (!x.lang) segna(A, "lang-assente", p, "<html> senza lang");
    else if (!LINGUE.includes(x.lang.split("-")[0].toLowerCase())) segna(A, "lang-strano", p, "lang=" + x.lang);
    if (!x.h1.length) segna(A, "h1-assente", p, "nessun H1 nell'HTML statico");
    else if (x.h1.length > 1) segna(I, "h1-multipli", p, x.h1.length + " H1: " + x.h1.map(h => "«" + h.slice(0, 40) + "»").join(", "));
    // contenuto visibile senza JS
    x.paroleStatiche = x.parole.length;
    if (pri && x.parole.length < 250) segna(A, "contenuto-scarso", p, "solo " + x.parole.length + " parole nell'HTML statico");
    // Open Graph
    const ogMancanti = ["title", "description", "url", "image"].filter(k => !x.og[k]);
    if (ogMancanti.length) segna(I, "og-incompleto", p, "Open Graph senza " + ogMancanti.map(k => "og:" + k).join(", "));
    if (x.og.url && x.canonical[0] && x.og.url !== x.canonical[0]) segna(A, "og-url-diverso", p, "og:url " + x.og.url + " ≠ canonical " + x.canonical[0]);
    // JSON-LD
    x.jsonldTipi = [];
    for (const j of x.jsonld) {
      if (!j.valido) segna(A, "jsonld-rotto", p, "JSON-LD non valido: " + j.errore);
      else x.jsonldTipi.push(...j.tipi);
    }
    // sitemap e lastmod
    if (!inSitemap(p) && !BASSA.includes(p)) segna(A, "fuori-sitemap", p, "pagina indicizzabile non in sitemap", "aggiungerla a sitemap.xml, o metterla noindex");
    const voce = report.sitemap.url.find(u => u.loc === assoluto(p));
    if (voce && voce.lastmod && x.ultimoCommit && x.ultimoCommit > voce.lastmod.slice(0, 10))
      segna(I, "lastmod-indietro", p, "lastmod " + voce.lastmod + ", ultimo commit del file " + x.ultimoCommit,
        "aggiornare <lastmod> solo quando cambia il contenuto (non per ritocchi tecnici)");
    if (ONLINE && x.ugualeAlLocale === false) segna(A, "online-diverso-dal-locale", p, "la pagina pubblicata non e' identica al file locale");
    // hreflang
    if (x.hreflang.length) {
      const codici = x.hreflang.map(h => h.lang);
      if (!codici.includes("x-default")) segna(A, "hreflang-senza-x-default", p, "hreflang senza x-default");
      if (new Set(codici).size !== codici.length) segna(B, "hreflang-doppio", p, "una lingua dichiarata due volte");
      const cattivi = codici.filter(c => c !== "x-default" && !/^[a-z]{2,3}(-[A-Za-z]{2}|-[0-9]{3})?$/.test(c));
      if (cattivi.length) segna(B, "hreflang-codice", p, "codici non validi: " + cattivi.join(", "));
      if (!x.hreflang.some(h => h.href === x.canonical[0] || h.href === assoluto(p))) segna(I, "hreflang-senza-se-stessa", p, "hreflang non include la pagina stessa");
    }
  }

  // 5. hreflang: destinazioni, canonical delle destinazioni, reciprocita'.
  for (const p of Object.keys(P)) {
    const x = P[p];
    if (!x.html || !x.indicizzabile || !x.hreflang.length) continue;
    const conParam = [];
    for (const h of x.hreflang) {
      const q = relativo(h.href);
      if (!q) { segna(A, "hreflang-esterno", p, "hreflang " + h.lang + " fuori dal sito: " + h.href); continue; }
      const senza = q.split("?")[0];
      let dest = P[q] || P[senza];
      if (!dest) { dest = { status: (await prendi(url(senza))).status }; }
      if (dest.status !== 200) { segna(B, "hreflang-rotto", p, "hreflang " + h.lang + " → " + h.href + " risponde " + dest.status); continue; }
      if (/\?/.test(q)) conParam.push(h.lang);
      else if (dest.canonical && dest.canonical[0] && dest.canonical[0] !== h.href)
        segna(A, "hreflang-verso-non-canonico", p, "hreflang " + h.lang + " → " + h.href + " che ha canonical " + dest.canonical[0]);
      else if (dest.hreflang && senza !== p && !dest.hreflang.some(y => relativo(y.href) === p || relativo(y.href) === p.split("?")[0]))
        segna(A, "hreflang-non-reciproco", p, "hreflang " + h.lang + " → " + h.href + " non torna indietro");
    }
    if (conParam.length)
      segna(A, "hreflang-verso-parametri", p, "hreflang " + conParam.join(", ") + " puntano a «?lang=»: stessa pagina, canonical senza parametro → Google li ignora",
        "togliere questi hreflang finche' non esiste un URL vero per lingua (piano: docs/SEO-MULTILINGUA-PIANO.md)");
  }

  // 6. Link interni: rotti, orfane, profondita' dalla home.
  const indicizzabili = Object.keys(P).filter(p => P[p].html && P[p].indicizzabile);
  const entranti = {};
  for (const p of Object.keys(P)) {
    const x = P[p];
    if (!x.html) continue;
    for (const q of x.linkInterni) {
      if (q === p) continue;
      (entranti[q] = entranti[q] || new Set()).add(p);
      if (!P[q] && /(\.html|\/)$/.test(q)) {
        const r = await prendi(url(q));
        P[q] = { url: assoluto(q), status: r.status, html: false, esterno: true };
      }
      if (P[q] && P[q].status !== 200 && P[q].status !== 0 && !(P[q].status >= 300 && P[q].status < 400))
        segna(A, "link-rotto", p, "link a " + q + " che risponde " + P[q].status);
    }
    for (const a of x.ancore) if (/nofollow/.test(a.rel) && interno(a.href, p)) segna(I, "link-interno-nofollow", p, "link interno nofollow a " + a.href);
  }
  // Profondita': quanti clic dalla home, seguendo i link delle pagine che si lasciano seguire.
  const prof = { "/": 0 };
  const fila = ["/"];
  while (fila.length) {
    const p = fila.shift();
    const x = P[p];
    if (!x || !x.html || x.segue === false) continue;
    for (const q of x.linkInterni) if (prof[q] === undefined) { prof[q] = prof[p] + 1; fila.push(q); }
  }
  for (const p of indicizzabili) {
    const da = Array.from(entranti[p] || []).filter(q => q !== p && P[q] && P[q].html);
    P[p].linkEntranti = da;
    P[p].profondita = prof[p] === undefined ? null : prof[p];
    if (p === "/") continue;
    const deveStare = PRIORITARIE.includes(p) || inSitemap(p);
    if (!da.length) segna(deveStare ? B : A, "orfana", p, "nessun link HTML da altre pagine: la trova solo la sitemap",
      "collegarla da una pagina gia' indicizzata (hub o home)");
    else if (P[p].profondita === null) segna(A, "irraggiungibile-dalla-home", p, "non si arriva dalla home seguendo i link");
    else if (P[p].profondita > 3) segna(A, "profonda", p, P[p].profondita + " clic dalla home");
  }

  // 7. Doppioni: title, description, primo H1, testo quasi uguale.
  function doppioni(campo, nome) {
    const m = {};
    for (const p of indicizzabili) {
      const v = campo(P[p]);
      if (v) (m[v] = m[v] || []).push(p);
    }
    for (const v of Object.keys(m)) if (m[v].length > 1) segna(A, "doppio-" + nome, m[v].join(" = "), nome + " uguale: «" + v.slice(0, 80) + "»");
  }
  doppioni(x => x.title, "title");
  doppioni(x => x.description, "description");
  doppioni(x => x.h1[0], "h1");
  const sc = {};
  for (const p of indicizzabili) sc[p] = scaglie(P[p].parole, 5);
  report.somiglianze = [];
  for (let i = 0; i < indicizzabili.length; i++)
    for (let j = i + 1; j < indicizzabili.length; j++) {
      const a = indicizzabili[i], b = indicizzabili[j];
      const s = jaccard(sc[a], sc[b]);
      if (s >= 0.3) report.somiglianze.push({ a, b, somiglianza: +s.toFixed(2) });
      if (s >= 0.6) segna(A, "quasi-doppione", a + " ≈ " + b, "testo uguale al " + Math.round(s * 100) + "%: Google ne tiene una sola",
        "differenziare il contenuto o scegliere una canonical");
    }

  // 8. Online: i redirect degli host (spiegano «Pagina con reindirizzamento» in Search Console).
  if (ONLINE && BASE === SITO) {
    report.redirectHost = [];
    for (const v of ["http://arctrail3d.com/", "https://www.arctrail3d.com/", "http://www.arctrail3d.com/", SITO + "/index.html"]) {
      let r;
      try { r = await fetch(v, { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); }
      catch (e) { r = { status: 0, headers: new Map() }; }
      const loc = r.headers.get ? r.headers.get("location") : null;
      report.redirectHost.push({ da: v, status: r.status, verso: loc });
      if (v.endsWith("/index.html")) {
        if (r.status === 200) segna(I, "index-html-duplicato", "/index.html", "/index.html risponde 200 con lo stesso contenuto della home; il canonical la riporta a /");
      } else if (!(r.status === 301 || r.status === 308) || loc !== SITO + "/")
        segna(A, "redirect-host", v, "risponde " + r.status + (loc ? " → " + loc : "") + ", atteso 301 → " + SITO + "/");
    }
  }

  // 9. Dati strutturati: un riepilogo, non una lista della spesa.
  report.datiStrutturati = {};
  for (const p of indicizzabili) if (P[p].jsonldTipi && P[p].jsonldTipi.length) report.datiStrutturati[p] = Array.from(new Set(P[p].jsonldTipi));
  if (P["/"] && P["/"].jsonldTipi && !P["/"].jsonldTipi.includes("WebSite")) segna(I, "home-senza-website", "/", "la home non dichiara WebSite in JSON-LD");

  // 10. Search Console (facoltativa).
  if (GSC) {
    try { report.searchConsole = await require("./seo-gsc.js").riepilogo({ urls: PRIORITARIE.map(assoluto), giorni: 28 }); }
    catch (e) { report.searchConsole = { configurata: false, motivo: "errore: " + e.message }; }
  }

  // Pulizia: nel JSON non servono testi e ancore intere.
  for (const p of Object.keys(P)) { delete P[p].parole; delete P[p].ancore; delete P[p].jsonld; }
  report.trovati = trovati;
  report.stato = trovati.some(t => t.livello === B) ? B : trovati.some(t => t.livello === A) ? A : "OK";
  return report;
}

// ── Stampa ───────────────────────────────────────────────────────────────
function stampa(r) {
  const L = [];
  const riga = s => L.push(s === undefined ? "" : s);
  riga();
  riga("ARCTRAIL 3D — SEO CONTROL");
  riga("  " + (r.modo === "online" ? "sito pubblico " + r.base : "file locali (" + RADICE + ")") + " — " + r.quando.slice(0, 16).replace("T", " ") + " UTC");
  riga();
  riga("Stato tecnico: " + r.stato);
  riga();
  const sc = r.searchConsole;
  if (sc && sc.configurata && sc.ispezioni) {
    const ind = sc.ispezioni.filter(x => x.verdict === "PASS").length;
    riga("Indicizzate (Search Console, URL Inspection): " + ind + " / " + sc.ispezioni.length + " pagine prioritarie");
  } else riga("Indicizzate: n/d — serve Search Console (" + (sc ? sc.motivo : "aggiungere --gsc") + ")");
  riga();
  riga("Pagine controllate: " + Object.keys(r.pagine).length + " — sitemap: " + r.sitemap.url.length + " URL, HTTP " + r.sitemap.status);
  riga();
  riga("  pagina                          HTTP  idx  can  sm  h1  hl  in  prof  parole  JSON-LD");
  const ord = Object.keys(r.pagine).sort((a, b) => (PRIORITARIE.includes(b) - PRIORITARIE.includes(a)) || a.localeCompare(b));
  for (const p of ord) {
    const x = r.pagine[p];
    if (x.esterno) continue;
    const pri = PRIORITARIE.includes(p) ? "★" : " ";
    const idx = !x.html ? " - " : x.indicizzabile ? " sì" : " no";
    const can = !x.html || !x.canonical ? " - " : !x.canonical.length ? " ✗ " : x.canonical[0] === assoluto(p) ? " ✓ " : " ≠ ";
    const sm = r.sitemap.url.some(u => u.loc === assoluto(p)) ? " ✓" : " -";
    riga(" " + pri + (p + " ".repeat(32)).slice(0, 32) + String(x.status).padStart(4) + "  " + idx + "  " + can + " " + sm + "  " +
      String(x.h1 ? x.h1.length : "-").padStart(2) + "  " + String(x.hreflang ? x.hreflang.length : "-").padStart(2) + "  " +
      String(x.linkEntranti ? x.linkEntranti.length : "-").padStart(2) + "  " + String(x.profondita == null ? "-" : x.profondita).padStart(4) + "  " +
      String(x.paroleStatiche == null ? "-" : x.paroleStatiche).padStart(6) + "  " + (x.jsonldTipi && x.jsonldTipi.length ? Array.from(new Set(x.jsonldTipi)).join(",") : ""));
  }
  riga("  ★ prioritaria · idx indicizzabile · can canonical su se stessa · sm in sitemap · hl hreflang · in link entranti · prof clic dalla home");
  const per = liv => r.trovati.filter(t => t.livello === liv);
  for (const [liv, tit] of [[B, "Problemi BLOCCANTI"], [A, "Problemi (ATTENZIONE)"], [I, "Da sapere (INFO)"]]) {
    const t = per(liv);
    riga();
    riga(tit + ": " + (t.length || "nessuno"));
    for (const x of t) riga("  - " + (x.pagina ? x.pagina + ": " : "") + x.messaggio + "  [" + x.codice + "]");
  }
  if (r.redirectHost) {
    riga();
    riga("Redirect degli host (normali: sono le «Pagine con reindirizzamento» di Search Console):");
    for (const x of r.redirectHost) riga("  " + x.da + "  " + x.status + (x.verso ? " → " + x.verso : ""));
  }
  if (r.somiglianze.length) {
    riga();
    riga("Pagine con testo in comune (5-grammi, ≥30%):");
    for (const s of r.somiglianze) riga("  " + s.a + " ≈ " + s.b + "  " + Math.round(s.somiglianza * 100) + "%");
  }
  riga();
  riga("Search Console:");
  if (!sc) riga("  non richiesta (aggiungere --gsc)");
  else if (!sc.configurata) riga("  non configurata — " + sc.motivo + " (istruzioni: docs/SEO-AUTOMAZIONE.md)");
  else require("./seo-gsc.js").stampa(sc).forEach(s => riga("  " + s));
  const prop = r.trovati.filter(t => t.proposta && t.livello !== I);
  riga();
  riga("AZIONI PROPOSTE:");
  if (!prop.length) riga("  nessuna dal controllo tecnico.");
  const viste = new Set();
  let n = 0;
  for (const t of prop) {
    const k = t.codice + "|" + t.proposta;
    if (viste.has(k)) continue;
    viste.add(k);
    const stesse = prop.filter(x => x.codice === t.codice && x.proposta === t.proposta).map(x => x.pagina);
    riga("  " + (++n) + ". [" + t.livello + "] " + t.proposta + " — " + stesse.join(", "));
  }
  riga();
  riga("MODIFICHE DI PRODUZIONE NON ANCORA ESEGUITE.");
  riga("ATTENDO APPROVAZIONE.");
  riga();
  return L.join("\n");
}

if (require.main === module) {
  audit().then(r => {
    process.stdout.write(JSON_OUT ? JSON.stringify(r, null, 2) + "\n" : stampa(r) + "\n");
    process.exit(r.stato === B ? 1 : 0);
  }).catch(e => { console.error("seo-audit: " + (e.stack || e.message)); process.exit(2); });
}
module.exports = { audit, PRIORITARIE, BASSA, SITO };
