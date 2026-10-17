// ORIGINE: Adrenalina battuta-live/shared/terreno.js (commit c6586b6636, SHA-256 fonte 52e039b4c0cfedc4…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: quota DTM 5 m, dislivello, profilo.
// Adattamenti dichiarati: testi senza «CA VCO1» (come il Gestionale v18, che scrive «Comprensorio»; qui «territorio», neutro).
// Sostituzioni: 2 (elenco in strumenti/importa-da-fonti.mjs).
// TERRENO — quota di un punto, dislivello e pendenza di un tratto (logica pura, testabile).
//
// FONTE UNICA, VERIFICATA IL 13/10/2026: «RIPRESA AEREA ICE 2009-2011 - DTM 5»
// della Regione Piemonte (metadato r_piemon:224de2ac-023e-441c-9ae0-ea493b217a8e,
// licenza CC BY 4.0). Rilievo LIDAR su tutto il Piemonte, griglia di 5 m,
// precisione in quota dichiarata ±0,30 m (±0,60 m nelle aree boscate e
// densamente urbanizzate). Servizi pubblici senza chiave, CORS aperto:
//   - WMS GetFeatureInfo  -> quota di UN punto (testo semplice)
//   - WCS 1.0.0 GetCoverage GEOTIFF_16 -> griglia di quote (float32 non compresso)
//
// NESSUNA QUOTA INVENTATA: senza rete, fuori dal Piemonte o con una risposta
// strana il valore e' null e l'interfaccia lo dice. I dati sono del 2009-2011:
// una pista aperta dopo non cambia il terreno, una frana si'.
// Le richieste partono SOLO quando l'utente le chiede (Quota, Dislivello) e
// contengono solo coordinate, mai chi le chiede. Niente download massivo:
// la griglia di un tratto e' al massimo MAX_LATO_GRIGLIA x MAX_LATO_GRIGLIA.

import { distanzaMetri } from './geo.js';

export const FONTE_DTM = Object.freeze({
  nome: 'DTM 5 m Regione Piemonte (ripresa ICE 2009-2011)',
  breve: 'DTM 5 m Regione Piemonte 2009-2011',
  licenza: 'CC BY 4.0',
  attribuzione: '© Regione Piemonte — DTM ICE 2009-2011, CC BY 4.0',
  metadato: 'r_piemon:224de2ac-023e-441c-9ae0-ea493b217a8e',
  passoM: 5,
  precisione: '±0,3 m (±0,6 m nel bosco e nei paesi)',
  copertura: 'solo Piemonte'
});

export const WMS_DTM = 'https://geomap.reteunitaria.piemonte.it/ws/taims/rp-01/taimsdtmwms/wms_ice_2009_2011_dtm';
export const WCS_DTM = 'https://geomap.reteunitaria.piemonte.it/ws/taims/rp-01/taimsdtmwcs/wcs_ice_2009_2011_dtm';

/** Lato massimo della griglia chiesta per un tratto: 256 x 256 float32 = 256 kB. */
export const MAX_LATO_GRIGLIA = 256;
/** Tratto piu' lungo di cui si calcola il dislivello (oltre, la griglia sarebbe troppo rada). */
export const MAX_TRATTO_M = 10_000;
/** Tratto minimo su cui si dice una pendenza: sotto, conta piu' il rumore del dato. */
export const TRATTO_PENDENZA_M = 25;
/** Isteresi per sommare salite e discese: oscillazioni sotto 1 m non contano. */
export const SOGLIA_DISLIVELLO_M = 1;

// Quote plausibili in Piemonte (Lago Maggiore 193 m, Monte Rosa 4.634 m): fuori e' "nessun dato".
const QUOTA_MIN = -10, QUOTA_MAX = 4_900;
const quotaPlausibile = (q) => Number.isFinite(q) && q > QUOTA_MIN && q < QUOTA_MAX;

const coordValida = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

// ------------------------------------------------------------ quota di un punto (WMS)
/** GetFeatureInfo su un riquadro di ~20 m centrato sul punto (WMS 1.3.0: asse lat,lon). */
export function urlQuotaPunto(p) {
  if (!coordValida(p)) return null;
  const d = 0.0001;
  const bbox = [p.lat - d, p.lon - d, p.lat + d, p.lon + d].map((x) => x.toFixed(6)).join(',');
  return WMS_DTM + '?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=DTM&QUERY_LAYERS=DTM&STYLES=' +
    '&CRS=EPSG:4326&BBOX=' + bbox + '&WIDTH=3&HEIGHT=3&I=1&J=1&INFO_FORMAT=text/plain';
}

/** Testo della risposta -> quota in metri, oppure null (nessuna feature, nodata, testo strano). */
export function leggiQuotaPunto(testo) {
  if (typeof testo !== 'string' || testo.length > 10_000) return null;
  const m = /value_0\s*=\s*'(-?\d+(?:\.\d+)?)'/.exec(testo);
  if (!m) return null;
  const q = Number(m[1]);
  return quotaPlausibile(q) ? q : null;
}

// ------------------------------------------------------------ griglia (WCS + GeoTIFF float32)
/** WCS 1.0.0 in EPSG:4326: BBOX = ovest,sud,est,nord. */
export function urlGriglia({ ovest, sud, est, nord }, larghezza, altezza) {
  const n = (x) => Number(x).toFixed(6);
  return WCS_DTM + '?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=DTM&CRS=EPSG:4326' +
    '&BBOX=' + [ovest, sud, est, nord].map(n).join(',') + '&WIDTH=' + larghezza + '&HEIGHT=' + altezza + '&FORMAT=GEOTIFF_16';
}

/**
 * GeoTIFF minimale: un solo canale float32, non compresso, a strisce (quello
 * che il WCS regionale restituisce). Qualunque altra cosa -> errore, mai
 * valori letti a caso.
 * @returns {{larghezza: number, altezza: number, valori: Float32Array, nodata: number|null}}
 */
export function leggiTiffFloat32(buffer) {
  const dv = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  if (dv.byteLength < 16) throw new Error('griglia vuota');
  const ordine = String.fromCharCode(dv.getUint8(0), dv.getUint8(1));
  if (ordine !== 'II' && ordine !== 'MM') throw new Error('non e\' un TIFF');
  const le = ordine === 'II';
  if (dv.getUint16(2, le) !== 42) throw new Error('TIFF non classico');
  const ifd = dv.getUint32(4, le);
  const n = dv.getUint16(ifd, le);
  const DIM = { 1: 1, 2: 1, 3: 2, 4: 4 };
  const tag = new Map();
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const id = dv.getUint16(o, le), tipo = dv.getUint16(o + 2, le), conta = dv.getUint32(o + 4, le);
    const dim = DIM[tipo];
    if (!dim) { tag.set(id, { tipo, conta, valori: [] }); continue; }
    const inLinea = dim * conta <= 4;
    const base = inLinea ? o + 8 : dv.getUint32(o + 8, le);
    if (base + dim * conta > dv.byteLength) throw new Error('TIFF troncato');
    const valori = [];
    for (let k = 0; k < Math.min(conta, 65_536); k++) {
      const p = base + k * dim;
      valori.push(dim === 1 ? dv.getUint8(p) : dim === 2 ? dv.getUint16(p, le) : dv.getUint32(p, le));
    }
    tag.set(id, { tipo, conta, valori });
  }
  const uno = (id, def = null) => (tag.has(id) && tag.get(id).valori.length ? tag.get(id).valori[0] : def);
  const larghezza = uno(256), altezza = uno(257);
  if (!(larghezza > 0 && altezza > 0 && larghezza <= 4096 && altezza <= 4096)) throw new Error('dimensioni della griglia non valide');
  if (uno(258) !== 32 || uno(339, 1) !== 3 || uno(277, 1) !== 1) throw new Error('la griglia non e\' float32 a un canale');
  if (uno(259, 1) !== 1) throw new Error('griglia compressa non supportata');
  if (uno(284, 1) !== 1 && uno(277, 1) !== 1) throw new Error('organizzazione non supportata');
  const offsets = tag.has(273) ? tag.get(273).valori : [];
  const conteggi = tag.has(279) ? tag.get(279).valori : [];
  const righePerStriscia = uno(278, altezza);
  const valori = new Float32Array(larghezza * altezza);
  let scritti = 0;
  for (let s = 0; s < offsets.length && scritti < valori.length; s++) {
    const righe = Math.min(righePerStriscia, altezza - s * righePerStriscia);
    const quanti = Math.min(righe * larghezza, conteggi[s] ? conteggi[s] / 4 : righe * larghezza);
    if (offsets[s] + quanti * 4 > dv.byteLength) throw new Error('TIFF troncato');
    for (let k = 0; k < quanti; k++) valori[scritti++] = dv.getFloat32(offsets[s] + k * 4, le);
  }
  if (scritti !== valori.length) throw new Error('griglia incompleta');
  let nodata = null;
  if (tag.has(42113)) {
    const t = tag.get(42113);
    const testo = String.fromCharCode(...t.valori).replace(/\0/g, '').trim();
    if (testo !== '' && Number.isFinite(Number(testo))) nodata = Number(testo);
  }
  return { larghezza, altezza, valori, nodata };
}

/**
 * Riquadro e dimensioni della griglia per un tratto: margine di 2 celle, passo
 * mai piu' fine di 5 m (il dato) e lato mai oltre MAX_LATO_GRIGLIA.
 * @returns {{riquadro, larghezza, altezza, passoM}|null}
 */
export function grigliaPerTratto(punti) {
  const ok = (punti || []).filter(coordValida);
  if (ok.length < 2) return null;
  let ovest = Infinity, est = -Infinity, sud = Infinity, nord = -Infinity;
  for (const p of ok) { ovest = Math.min(ovest, p.lon); est = Math.max(est, p.lon); sud = Math.min(sud, p.lat); nord = Math.max(nord, p.lat); }
  const latM = (sud + nord) / 2;
  const mLat = 111_195, mLon = 111_195 * Math.cos(latM * Math.PI / 180);
  const margine = 2 * FONTE_DTM.passoM;
  ovest -= margine / mLon; est += margine / mLon; sud -= margine / mLat; nord += margine / mLat;
  const larghM = (est - ovest) * mLon, altM = (nord - sud) * mLat;
  const larghezza = Math.max(2, Math.min(MAX_LATO_GRIGLIA, Math.ceil(larghM / FONTE_DTM.passoM)));
  const altezza = Math.max(2, Math.min(MAX_LATO_GRIGLIA, Math.ceil(altM / FONTE_DTM.passoM)));
  const passoM = Math.max(FONTE_DTM.passoM, larghM / larghezza, altM / altezza);
  return { riquadro: { ovest, sud, est, nord }, larghezza, altezza, passoM };
}

/** Quota interpolata (bilineare fra i centri delle celle); null fuori griglia o su nodata. */
export function quotaInGriglia(g, riquadro, p) {
  if (!g || !riquadro || !coordValida(p)) return null;
  const { larghezza: w, altezza: h, valori, nodata } = g;
  const fx = (p.lon - riquadro.ovest) / (riquadro.est - riquadro.ovest) * w - 0.5;
  const fy = (riquadro.nord - p.lat) / (riquadro.nord - riquadro.sud) * h - 0.5;
  if (!(fx >= -0.5 && fy >= -0.5 && fx <= w - 0.5 && fy <= h - 0.5)) return null;
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)));
  const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
  const v = [valori[y0 * w + x0], valori[y0 * w + x1], valori[y1 * w + x0], valori[y1 * w + x1]];
  if (v.some((q) => !quotaPlausibile(q) || (nodata !== null && q === nodata))) return null;
  return (v[0] * (1 - tx) + v[1] * tx) * (1 - ty) + (v[2] * (1 - tx) + v[3] * tx) * ty;
}

/** Lunghezza di una spezzata in metri. */
export function lunghezzaSpezzata(punti) {
  let d = 0;
  for (let i = 1; i < punti.length; i++) d += distanzaMetri(punti[i - 1], punti[i]);
  return d;
}

/** Campioni lungo la spezzata ogni `passoM` metri (vertici compresi). */
export function campionaSpezzata(punti, passoM, max = 2_000) {
  const out = [];
  let percorsi = 0;
  for (let i = 1; i < punti.length; i++) {
    const a = punti[i - 1], b = punti[i];
    const L = distanzaMetri(a, b);
    const n = Math.max(1, Math.ceil(L / passoM));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, d: percorsi + L * t });
    }
    percorsi += L;
  }
  if (out.length <= max) return out;
  const passo = (out.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => out[Math.round(i * passo)]);
}

/**
 * Profilo di un tratto dalla griglia. Se manca anche una sola quota il
 * risultato lo dice (`completo: false`) e non si inventa niente.
 * @returns {{completo, lunghezza, quotaInizio, quotaFine, quotaMin, quotaMax, salita, discesa,
 *   pendenzaMediaPct, pendenzaMaxPct, passoM, campioni: number, mancanti: number}}
 */
export function profilo(punti, g, riquadro, passoGrigliaM) {
  return profiloDa(punti, (c) => quotaInGriglia(g, riquadro, c), Math.max(passoGrigliaM || FONTE_DTM.passoM, FONTE_DTM.passoM));
}

/**
 * Stesso calcolo con qualunque sorgente di quota (griglia WCS online o
 * pacchetto DTM offline). `serie` = i campioni [{d, q}] da cui escono
 * dislivello e pendenze: il grafico del profilo usa ESATTAMENTE questi.
 */
export function profiloDa(punti, quotaDi, passoCampione) {
  const lunghezza = lunghezzaSpezzata(punti);
  const camp = campionaSpezzata(punti, passoCampione).map((c) => ({ ...c, q: quotaDi(c) }));
  const mancanti = camp.filter((c) => c.q === null).length;
  const base = { lunghezza, passoM: passoCampione, campioni: camp.length, mancanti };
  if (mancanti || camp.length < 2) return { ...base, completo: false };
  const q = camp.map((c) => c.q);
  // salite e discese con isteresi: si conta solo quando ci si allontana di oltre 1 m dall'ultimo riferimento
  let rif = q[0], salita = 0, discesa = 0;
  for (const x of q) {
    if (x - rif >= SOGLIA_DISLIVELLO_M) { salita += x - rif; rif = x; } else if (rif - x >= SOGLIA_DISLIVELLO_M) { discesa += rif - x; rif = x; }
  }
  // pendenza massima su finestre di almeno TRATTO_PENDENZA_M (e almeno due celle)
  const finestra = Math.max(TRATTO_PENDENZA_M, 2 * passoCampione);
  let pendenzaMaxPct = null;
  for (let i = 0, j = 0; i < camp.length; i++) {
    while (j < camp.length && camp[j].d - camp[i].d < finestra) j++;
    if (j >= camp.length) break;
    const p = Math.abs(camp[j].q - camp[i].q) / (camp[j].d - camp[i].d) * 100;
    if (pendenzaMaxPct === null || p > pendenzaMaxPct) pendenzaMaxPct = p;
  }
  return {
    ...base, completo: true,
    quotaInizio: q[0], quotaFine: q[q.length - 1], quotaMin: Math.min(...q), quotaMax: Math.max(...q),
    salita, discesa,
    pendenzaMediaPct: lunghezza >= TRATTO_PENDENZA_M ? (q[q.length - 1] - q[0]) / lunghezza * 100 : null,
    pendenzaMaxPct,
    serie: camp.map((c) => ({ d: c.d, q: c.q }))
  };
}

// ------------------------------------------------------------ testi (niente falsa precisione)
const m = (x) => Math.round(x).toLocaleString('it-IT') + ' m';
const pct = (x) => (x >= 0 ? '' : '−') + Math.round(Math.abs(x)) + '%';

export function testoQuota(q) {
  return Number.isFinite(q) ? 'Quota ' + m(q) + ' s.l.m.' : 'Quota non disponibile';
}

export const NOTA_DTM = FONTE_DTM.breve + ' (CC BY 4.0) · quota ' + FONTE_DTM.precisione + ' · terreno del 2009-2011: frane e lavori successivi non ci sono.';

/** Righe del dislivello di un tratto (corte: stanno nel riquadro di un telefono da 320 px); la pendenza e' del TERRENO lungo la linea, non del sentiero. */
export function righeDislivello(pr) {
  if (!pr || !pr.completo) return ['Dislivello non disponibile: il servizio non ha restituito la quota di tutto il tratto (fuori dal Piemonte o dato mancante).'];
  const n = (x) => Math.round(x).toLocaleString('it-IT');
  const righe = [
    'Dislivello: +' + m(pr.salita) + ' / −' + m(pr.discesa),
    'Quota da ' + n(pr.quotaInizio) + ' a ' + m(pr.quotaFine) + ' s.l.m. (min ' + n(pr.quotaMin) + ', max ' + n(pr.quotaMax) + ')'
  ];
  if (pr.pendenzaMediaPct !== null) {
    righe.push('Pendenza media ' + pct(pr.pendenzaMediaPct) + (pr.pendenzaMaxPct !== null ? ', massima ~' + pct(pr.pendenzaMaxPct) + ' su tratti di almeno ' + Math.round(Math.max(TRATTO_PENDENZA_M, 2 * pr.passoM)) + ' m' : ''));
  } else righe.push('Tratto troppo corto per una pendenza affidabile (meno di ' + TRATTO_PENDENZA_M + ' m)');
  righe.push('Terreno sotto la linea disegnata (campioni ogni ' + Math.round(pr.passoM) + ' m), non il sentiero vero.');
  return righe;
}

// ------------------------------------------------------------ servizio (rete solo su richiesta)
/* FASE 2: QUOTA SENZA RETE. Se l'utente ha scaricato il pacchetto DTM 25 m
   del CA VCO1 (js/map/pacchettoDtm.js) e manca la rete — o il servizio
   regionale non risponde — quota e dislivello escono da li', con
   `fonte: 'dtm25'`: l'interfaccia scrive «DTM 25 m, offline» e il passo vero
   dei campioni. Con la rete si usa sempre il 5 m. Senza pacchetto o fuori
   dalle zone scaricate resta «non disponibile»: mai un valore stimato. */
export const PASSO_DTM_OFFLINE_M = 25;

export class ServizioTerreno {
  /** @param {{fetch?: Function, timeoutMs?: number, offline?: {prepara: Function, quotaDi: Function}|null}} opz */
  constructor({ fetch: f = globalThis.fetch ? (...a) => globalThis.fetch(...a) : null, timeoutMs = 10_000, offline = null } = {}) {
    this.fetch = f;
    this.timeoutMs = timeoutMs;
    this.offline = offline;
    this.quote = new Map();          // "lat,lon" a 5 decimali -> quota (solo valori veri)
  }

  /** Quota dal pacchetto offline; null se non scaricato o fuori zona. */
  async quotaOffline(p) {
    if (!this.offline) return null;
    try {
      if (!(await this.offline.prepara([p]))) return null;
      const q = this.offline.quotaDi()(p);
      return quotaPlausibile(q) ? q : null;
    } catch { return null; }
  }

  async profiloOffline(punti) {
    if (!this.offline) return null;
    try {
      const camp = campionaSpezzata(punti, PASSO_DTM_OFFLINE_M);
      if (!(await this.offline.prepara(camp))) return null;
      const pr = profiloDa(punti, this.offline.quotaDi(), PASSO_DTM_OFFLINE_M);
      return pr.completo ? pr : null;
    } catch { return null; }
  }

  async scarica(url, tipo) {
    if (!this.fetch) throw new Error('rete non disponibile');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), this.timeoutMs) : null;
    try {
      const r = await this.fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (!r || !r.ok) throw new Error('risposta ' + (r ? r.status : '?'));
      return tipo === 'testo' ? await r.text() : await r.arrayBuffer();
    } finally { if (timer) clearTimeout(timer); }
  }

  /** @returns {Promise<{quota: number|null, motivo?: string}>} */
  async quota(p, { online = true } = {}) {
    if (!coordValida(p)) return { quota: null, motivo: 'punto non valido' };
    const k = p.lat.toFixed(5) + ',' + p.lon.toFixed(5);
    if (this.quote.has(k)) return { quota: this.quote.get(k) };
    if (!online) {
      const q = await this.quotaOffline(p);
      return q !== null ? { quota: q, fonte: 'dtm25' } : { quota: null, motivo: 'serve la rete (servizio della Regione Piemonte)' + (this.offline ? '; quota offline: zona non scaricata o fuori dal territorio' : '') };
    }
    try {
      const q = leggiQuotaPunto(await this.scarica(urlQuotaPunto(p), 'testo'));
      if (q === null) return { quota: null, motivo: 'nessun dato qui (il DTM copre solo il Piemonte)' };
      this.quote.set(k, q);
      return { quota: q };
    } catch (e) {
      const q = await this.quotaOffline(p);
      if (q !== null) return { quota: q, fonte: 'dtm25' };
      return { quota: null, motivo: 'servizio non raggiungibile (' + (e && e.name === 'AbortError' ? 'tempo scaduto' : e && e.message ? e.message : e) + ')' };
    }
  }

  /** @returns {Promise<{profilo?: object, motivo?: string}>} */
  async dislivello(punti, { online = true } = {}) {
    const ok = (punti || []).filter(coordValida);
    if (ok.length < 2) return { motivo: 'servono almeno due punti' };
    if (lunghezzaSpezzata(ok) > MAX_TRATTO_M) return { motivo: 'tratto oltre ' + MAX_TRATTO_M / 1000 + ' km: dividilo in pezzi più corti' };
    if (!online) {
      const pr = await this.profiloOffline(ok);
      return pr ? { profilo: pr, fonte: 'dtm25' } : { motivo: 'serve la rete (servizio della Regione Piemonte)' + (this.offline ? '; quota offline: tratto fuori dalle zone scaricate del territorio' : '') };
    }
    const gr = grigliaPerTratto(ok);
    try {
      const g = leggiTiffFloat32(await this.scarica(urlGriglia(gr.riquadro, gr.larghezza, gr.altezza), 'binario'));
      if (g.larghezza !== gr.larghezza || g.altezza !== gr.altezza) throw new Error('griglia di misura diversa da quella chiesta');
      return { profilo: profilo(ok, g, gr.riquadro, gr.passoM) };
    } catch (e) {
      const pr = await this.profiloOffline(ok);
      if (pr) return { profilo: pr, fonte: 'dtm25' };
      return { motivo: 'servizio non raggiungibile o risposta non valida (' + (e && e.name === 'AbortError' ? 'tempo scaduto' : e && e.message ? e.message : e) + ')' };
    }
  }
}
