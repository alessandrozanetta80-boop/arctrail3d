#!/usr/bin/env node
/* seo-gsc.js — Google Search Console di arctrail3d.com, in SOLA LETTURA.
 *
 *   node tools/seo-gsc.js                      # ultimi 28 giorni: totali, query, pagine, paesi, sitemap
 *   node tools/seo-gsc.js --giorni 90          # un altro intervallo
 *   node tools/seo-gsc.js --dal 2026-09-01 --al 2026-09-27
 *   node tools/seo-gsc.js --ispeziona          # + URL Inspection delle pagine prioritarie
 *   node tools/seo-gsc.js --righe 50 --json    # piu' righe; JSON su stdout
 *   node tools/seo-gsc.js --verifica           # dice solo se le credenziali ci sono e funzionano
 *
 * Da npm: `npm run seo:gsc`, `npm run seo:gsc:ispeziona`.
 *
 * CREDENZIALI. Mai nel repository, mai in chat. Il file JSON sta in
 * %USERPROFILE%\.arctrail3d\gsc\ (come la chiave dell'APK) e lo si indica con
 * GSC_CREDENTIALS, oppure si mette li' col nome `credenziali.json`. Vanno bene:
 *   - un service account (type "service_account"), aggiunto in Search Console
 *     come utente con autorizzazione «Limitata» — la strada consigliata;
 *   - credenziali OAuth di un utente (type "authorized_user", con refresh_token).
 * Lo scope chiesto e' uno solo: webmasters.readonly. Se il file sta dentro al
 * repository lo script si rifiuta di usarlo. Nessun segreto viene stampato.
 * Istruzioni passo passo: docs/SEO-AUTOMAZIONE.md.
 *
 * API USATE, tutte in lettura: sites.list, searchanalytics.query,
 * sitemaps.list, urlInspection.index.inspect (quota: 2.000 al giorno e 600 al
 * minuto per proprieta'; qui al massimo ~10 per giro, una ogni 1,5 secondi).
 * NON usa la Indexing API: e' riservata a JobPosting e BroadcastEvent, e per
 * pagine come queste Google la considera un abuso. La richiesta di
 * indicizzazione resta un clic di Alessandro in Search Console, e raramente.
 * (28/09/2026)
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const RADICE = path.join(__dirname, "..");
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://searchconsole.googleapis.com";
const CARTELLA = path.join(os.homedir(), ".arctrail3d", "gsc");
const DOMINIO = "arctrail3d.com";

// Un `.env` in radice (fuori da git, vedi .env.example) puo' dare GSC_CREDENTIALS e GSC_SITE.
function leggiEnv() {
  const f = path.join(RADICE, ".env");
  if (!fs.existsSync(f)) return;
  for (const r of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = /^\s*(GSC_[A-Z_]+)\s*=\s*(.*?)\s*$/.exec(r);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function dentroAlRepository(f) {
  const r = path.relative(RADICE, path.resolve(f));
  return !!r && !r.startsWith("..") && !path.isAbsolute(r);
}

function trovaCredenziali() {
  leggiEnv();
  const f = process.env.GSC_CREDENTIALS || path.join(CARTELLA, "credenziali.json");
  if (!fs.existsSync(f)) return { errore: "nessun file di credenziali (" + (process.env.GSC_CREDENTIALS ? "GSC_CREDENTIALS punta a un file che non c'e'" : "atteso in " + CARTELLA) + ")" };
  if (dentroAlRepository(f)) return { errore: "il file di credenziali sta dentro al repository: spostarlo in " + CARTELLA };
  let j;
  try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return { errore: "il file di credenziali non e' JSON valido" }; }
  if (j.type !== "service_account" && j.type !== "authorized_user") return { errore: "tipo di credenziali non gestito: " + j.type };
  return { j };
}

async function post(u, corpo, token, form) {
  const r = await fetch(u, {
    method: "POST",
    headers: Object.assign({ "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" },
      token ? { Authorization: "Bearer " + token } : {}),
    body: form ? new URLSearchParams(corpo).toString() : JSON.stringify(corpo),
    signal: AbortSignal.timeout(30000)
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok) throw new Error("HTTP " + r.status + " " + u.replace(/\?.*/, "") + ": " + ((j && j.error && (j.error.message || j.error_description || j.error)) || t.slice(0, 200)));
  return j;
}
async function get(u, token) {
  const r = await fetch(u, { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error("HTTP " + r.status + " " + u + ": " + ((j && j.error && j.error.message) || ""));
  return j;
}

async function token(j) {
  if (j.type === "authorized_user") {
    const r = await post("https://oauth2.googleapis.com/token",
      { client_id: j.client_id, client_secret: j.client_secret, refresh_token: j.refresh_token, grant_type: "refresh_token" }, null, true);
    return r.access_token;
  }
  const b64 = x => Buffer.from(JSON.stringify(x)).toString("base64url");
  const ora = Math.floor(Date.now() / 1000);
  const aud = j.token_uri || "https://oauth2.googleapis.com/token";
  const dati = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: j.client_email, scope: SCOPE, aud, iat: ora, exp: ora + 3600 });
  const firma = crypto.createSign("RSA-SHA256").update(dati).sign(j.private_key).toString("base64url");
  const r = await post(aud, { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: dati + "." + firma }, null, true);
  return r.access_token;
}

// La proprieta': GSC_SITE, altrimenti quella che Search Console elenca per arctrail3d.com (prima il dominio).
async function proprieta(tk) {
  if (process.env.GSC_SITE) return process.env.GSC_SITE;
  const r = await get(API + "/webmasters/v3/sites", tk);
  const siti = (r.siteEntry || []).filter(s => s.permissionLevel !== "siteUnverifiedUser").map(s => s.siteUrl);
  const scelta = siti.find(s => s === "sc-domain:" + DOMINIO) || siti.find(s => s === "https://" + DOMINIO + "/") ||
    siti.find(s => s.indexOf(DOMINIO) >= 0);
  if (!scelta) throw new Error("le credenziali non vedono nessuna proprieta' di " + DOMINIO + " (utente non aggiunto in Search Console?)");
  return scelta;
}

function giorno(d) { return d.toISOString().slice(0, 10); }
function intervallo(o) {
  if (o.dal && o.al) return { dal: o.dal, al: o.al };
  // I dati degli ultimi 2-3 giorni sono parziali: si chiude a ieri e si chiede dataState "all" (come l'interfaccia).
  const al = new Date(Date.now() - 864e5);
  const dal = new Date(al.getTime() - ((o.giorni || 28) - 1) * 864e5);
  return { dal: giorno(dal), al: giorno(al) };
}
async function analisi(tk, sito, iv, dimensioni, righe) {
  const r = await post(API + "/webmasters/v3/sites/" + encodeURIComponent(sito) + "/searchAnalytics/query",
    { startDate: iv.dal, endDate: iv.al, dimensions: dimensioni, rowLimit: righe || 25, dataState: "all" }, tk);
  return (r.rows || []).map(x => ({ chiavi: x.keys || [], clic: x.clicks, impressioni: x.impressions, ctr: x.ctr, posizione: x.position }));
}
const pausa = ms => new Promise(r => setTimeout(r, ms));

async function ispeziona(tk, sito, urls) {
  const out = [];
  for (const u of urls.slice(0, 20)) {
    try {
      const r = await post(API + "/v1/urlInspection/index:inspect", { inspectionUrl: u, siteUrl: sito, languageCode: "it-IT" }, tk);
      const s = (r.inspectionResult || {}).indexStatusResult || {};
      out.push({ url: u, verdict: s.verdict || null, stato: s.coverageState || null, robots: s.robotsTxtState || null,
        indicizzazione: s.indexingState || null, fetch: s.pageFetchState || null, ultimaScansione: s.lastCrawlTime || null,
        canonicalGoogle: s.googleCanonical || null, canonicalDichiarato: s.userCanonical || null,
        sitemap: s.sitemap || [], referenti: s.referringUrls || [] });
    } catch (e) { out.push({ url: u, errore: e.message }); }
    await pausa(1500);
  }
  return out;
}

/* Il riepilogo che usa anche seo-audit.js --gsc. Non lancia mai: se qualcosa
   manca torna { configurata: false, motivo }. */
async function riepilogo(o) {
  o = o || {};
  const c = trovaCredenziali();
  if (c.errore) return { configurata: false, motivo: c.errore };
  let tk, sito;
  try { tk = await token(c.j); } catch (e) { return { configurata: false, motivo: "accesso rifiutato da Google: " + e.message }; }
  try { sito = await proprieta(tk); } catch (e) { return { configurata: false, motivo: e.message }; }
  const iv = intervallo(o);
  const righe = o.righe || 25;
  const r = { configurata: true, proprieta: sito, tipoCredenziali: c.j.type, intervallo: iv };
  const tot = await analisi(tk, sito, iv, [], 1);
  r.totali = tot[0] || { clic: 0, impressioni: 0, ctr: 0, posizione: null };
  r.query = await analisi(tk, sito, iv, ["query"], righe);
  r.pagine = await analisi(tk, sito, iv, ["page"], righe);
  r.paesi = await analisi(tk, sito, iv, ["country"], righe);
  try {
    const s = await get(API + "/webmasters/v3/sites/" + encodeURIComponent(sito) + "/sitemaps", tk);
    r.sitemap = (s.sitemap || []).map(x => ({ path: x.path, inviata: x.lastSubmitted || null, scaricata: x.lastDownloaded || null,
      inAttesa: !!x.isPending, errori: +x.errors || 0, avvisi: +x.warnings || 0,
      contenuti: (x.contents || []).map(k => ({ tipo: k.type, inviati: +k.submitted || 0 })) }));
  } catch (e) { r.sitemap = { errore: e.message }; }
  if (o.urls && o.urls.length) r.ispezioni = await ispeziona(tk, sito, o.urls);
  return r;
}

function pct(x) { return (x * 100).toFixed(1).replace(".", ",") + "%"; }
function pos(x) { return x == null ? "-" : x.toFixed(1).replace(".", ","); }
function stampa(r) {
  const L = [];
  if (!r.configurata) { L.push("non configurata — " + r.motivo); return L; }
  L.push("proprieta' " + r.proprieta + " — " + r.intervallo.dal + " → " + r.intervallo.al);
  L.push("clic: " + r.totali.clic + " · impressioni: " + r.totali.impressioni + " · CTR: " + pct(r.totali.ctr || 0) + " · posizione media: " + pos(r.totali.posizione));
  const tab = (tit, rr, n) => {
    L.push(tit + (rr.length ? "" : ": nessun dato"));
    rr.slice(0, n).forEach(x => L.push("  " + (x.chiavi[0] + " ".repeat(48)).slice(0, 48) + String(x.clic).padStart(5) + " clic " +
      String(x.impressioni).padStart(6) + " impr. " + pct(x.ctr).padStart(6) + "  pos " + pos(x.posizione)));
  };
  tab("query principali:", r.query, 10);
  tab("pagine:", r.pagine, 10);
  tab("paesi:", r.paesi, 8);
  if (Array.isArray(r.sitemap)) {
    if (!r.sitemap.length) L.push("sitemap: NESSUNA sitemap inviata a questa proprieta'");
    r.sitemap.forEach(s => L.push("sitemap " + s.path + " — inviata " + (s.inviata || "-").slice(0, 10) + ", letta " + (s.scaricata || "-").slice(0, 10) +
      (s.inAttesa ? ", in attesa" : "") + ", errori " + s.errori + ", avvisi " + s.avvisi +
      (s.contenuti.length ? ", URL inviati " + s.contenuti.map(k => k.inviati).join("+") : "")));
  } else if (r.sitemap) L.push("sitemap: " + r.sitemap.errore);
  if (r.ispezioni) {
    L.push("URL Inspection:");
    r.ispezioni.forEach(x => L.push("  " + x.url.replace(/^https:\/\/[^/]+/, "") + " — " + (x.errore ? "errore: " + x.errore :
      (x.verdict || "?") + " · " + (x.stato || "?") + " · ultima scansione " + (x.ultimaScansione || "N/D").slice(0, 10) +
      " · sitemap " + (x.sitemap.length ? x.sitemap.join(", ") : "nessuna") +
      (x.canonicalGoogle && x.canonicalDichiarato && x.canonicalGoogle !== x.canonicalDichiarato ? " · CANONICAL DI GOOGLE ≠ DICHIARATO: " + x.canonicalGoogle : ""))));
  }
  return L;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = k => (a.indexOf(k) >= 0 ? a[a.indexOf(k) + 1] : undefined);
  const o = { giorni: +val("--giorni") || 28, dal: val("--dal"), al: val("--al"), righe: +val("--righe") || 25 };
  (async () => {
    if (a.includes("--verifica")) {
      const c = trovaCredenziali();
      if (c.errore) { console.log("Search Console: NON configurata — " + c.errore); process.exit(3); }
      const tk = await token(c.j);
      console.log("Search Console: credenziali " + c.j.type + " valide, proprieta' " + await proprieta(tk));
      return;
    }
    if (a.includes("--ispeziona")) o.urls = require("./seo-audit.js").PRIORITARIE.map(p => "https://arctrail3d.com" + p);
    const r = await riepilogo(o);
    if (a.includes("--json")) process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    else console.log("\nARCTRAIL 3D — SEARCH CONSOLE (sola lettura)\n\n" + stampa(r).join("\n") + "\n");
    process.exit(r.configurata ? 0 : 3);
  })().catch(e => { console.error("seo-gsc: " + e.message); process.exit(2); });
}
module.exports = { riepilogo, stampa };
