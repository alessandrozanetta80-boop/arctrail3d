// ORIGINE: Adrenalina battuta-live/shared/dtmOffline.js (commit c6586b6636, SHA-256 fonte 3eaf527b3cf1ee76…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: quota senza rete dai tasselli DTM 25 m.
// Sostituzioni: nessuna (copia identica).
// QUOTA SENZA RETE NEL CA VCO1 — pacchetto DTM 25 m (fase 2 VCO1, 13/10/2026). Logica pura.
//
// FONTE: «RIPRESA AEREA ICE 2009-2011 - DTM 25» della Regione Piemonte,
// metadato r_piemon:f4b00ea3-6e98-4a04-a2ae-bc5d4f285aed, licenza CC BY 4.0
// (ridistribuzione permessa con attribuzione). E' il prodotto UFFICIALE a
// 25 m, scaricato una volta dal catalogo regionale (zip unico, non dai
// servizi WMS/WCS) e ritagliato sul CA VCO1 da tools/dtm-vco1.mjs.
// Non e' il 5 m ricampionato dall'app: e' il dato a 25 m cosi' come lo
// pubblica la Regione, e l'app lo dice («DTM 25 m, offline»).
//
// PACCHETTO (battuta-live/data/dtm-vco1/): indice.json + tasselli di
// LATO x LATO celle (200 x 200 = 5 x 5 km) in Int16 little-endian, quota in
// DECIMETRI, -32768 = nessun dato (fuori Piemonte o buco del rilievo).
// Ogni tassello ha il suo SHA-256 nell'indice: un file diverso non si usa.
//
// Si scarica SOLO quando l'utente lo chiede (tutto il CA o la zona
// inquadrata), finisce in un database del telefono separato da mappe
// offline, piste e dati personali (js/map/archivioDtm.js).
//
// La quota fra quattro nodi della griglia e' bilineare, come per il 5 m:
// il valore non e' piu' preciso del passo (25 m: creste e fossi piu' stretti
// non si vedono), e il testo lo scrive sempre.

import { versoUtm } from './utm.js';

export const NODATA_DTM = -32768;
export const BASE_DTM_OFFLINE = 'data/dtm-vco1/';

export const FONTE_DTM25 = Object.freeze({
  nome: 'DTM 25 m Regione Piemonte (ripresa ICE 2009-2011)',
  breve: 'DTM 25 m Regione Piemonte 2009-2011',
  licenza: 'CC BY 4.0',
  attribuzione: '© Regione Piemonte — DTM 25 m ICE 2009-2011, CC BY 4.0',
  metadato: 'r_piemon:f4b00ea3-6e98-4a04-a2ae-bc5d4f285aed',
  passoM: 25
});

export const NOTA_DTM25 = FONTE_DTM25.breve + ' (CC BY 4.0), copia sul telefono · griglia di 25 m: valore indicativo, creste e fossi più stretti di 25 m non si vedono.';

const chiaveValida = (k) => typeof k === 'string' && /^\d{1,3}-\d{1,3}$/.test(k);
const shaValido = (h) => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);

/** Indice ben formato? (formato, griglia, tasselli con SHA-256): altrimenti non si usa. */
export function indiceDtmValido(ind) {
  return !!ind && ind.formato === 'dtm-tasselli-int16-dm' && ind.versione === 1 &&
    ind.crs === 'EPSG:32632' && ind.passo === 25 && Number.isInteger(ind.lato) && ind.lato > 0 && ind.lato <= 1000 &&
    Number.isFinite(ind.x0) && Number.isFinite(ind.y0) && ind.scala === 0.1 && ind.nodata === NODATA_DTM &&
    !!ind.tasselli && typeof ind.tasselli === 'object' && Object.keys(ind.tasselli).length > 0 &&
    Object.entries(ind.tasselli).every(([k, t]) => chiaveValida(k) && t && shaValido(t.sha256) && t.byte === ind.lato * ind.lato * 2);
}

/** Byte totali dei tasselli indicati (tutti se `chiavi` manca). */
export function pesoTasselli(ind, chiavi = null) {
  return (chiavi || Object.keys(ind.tasselli)).reduce((s, k) => s + (ind.tasselli[k] ? ind.tasselli[k].byte : 0), 0);
}

/** Cella (colonna, riga) della griglia intera per un punto UTM; la cella 0,0 ha lo spigolo in alto a sinistra su x0,y0. */
function cella(ind, e, n) {
  return { i: (e - ind.x0) / ind.passo - 0.5, j: (ind.y0 - n) / ind.passo - 0.5 };
}

const chiaveDi = (ind, ci, cj) => Math.floor(ci / ind.lato) + '-' + Math.floor(cj / ind.lato);

/** Tasselli dell'indice che coprono il riquadro geografico {ovest, sud, est, nord}. */
export function tasselliPerRiquadro(ind, r) {
  const angoli = [[r.sud, r.ovest], [r.sud, r.est], [r.nord, r.ovest], [r.nord, r.est]].map(([lat, lon]) => versoUtm({ lat, lon }));
  const es = angoli.map((a) => a.e), ns = angoli.map((a) => a.n);
  const c0 = cella(ind, Math.min(...es), Math.max(...ns)), c1 = cella(ind, Math.max(...es), Math.min(...ns));
  const out = [];
  const L = ind.lato;
  for (let tr = Math.floor(Math.floor(c0.j) / L); tr <= Math.floor(Math.ceil(c1.j) / L); tr++) {
    for (let tc = Math.floor(Math.floor(c0.i) / L); tc <= Math.floor(Math.ceil(c1.i) / L); tc++) {
      const k = tc + '-' + tr;
      if (ind.tasselli[k]) out.push(k);
    }
  }
  return out;
}

/** Tasselli necessari per i punti (i quattro nodi attorno a ciascuno). */
export function tasselliPerPunti(ind, punti) {
  const s = new Set();
  for (const p of punti) {
    const u = versoUtm(p);
    const c = cella(ind, u.e, u.n);
    const i0 = Math.floor(c.i), j0 = Math.floor(c.j);
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const k = chiaveDi(ind, i0 + di, j0 + dj);
      if (ind.tasselli[k]) s.add(k);
    }
  }
  return [...s];
}

/**
 * Quota (m) di un punto dai tasselli gia' in memoria (`tassello(k)` -> Int16Array|null).
 * null se manca un tassello, se un nodo e' "nessun dato" o il punto e' fuori pacchetto.
 */
export function quotaDaTasselli(ind, tassello, p) {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  const u = versoUtm(p);
  const c = cella(ind, u.e, u.n);
  const i0 = Math.floor(c.i), j0 = Math.floor(c.j);
  const tx = c.i - i0, ty = c.j - j0;
  const L = ind.lato;
  const nodo = (ci, cj) => {
    if (ci < 0 || cj < 0) return null;
    const t = tassello(chiaveDi(ind, ci, cj));
    if (!t) return null;
    const v = t[(cj % L) * L + (ci % L)];
    return v === NODATA_DTM || v === undefined ? null : v * ind.scala;
  };
  const v = [nodo(i0, j0), nodo(i0 + 1, j0), nodo(i0, j0 + 1), nodo(i0 + 1, j0 + 1)];
  if (v.some((q) => q === null)) return null;
  return (v[0] * (1 - tx) + v[1] * tx) * (1 - ty) + (v[2] * (1 - tx) + v[3] * tx) * ty;
}

/** Testo del peso: «4,1 MB». */
export const testoPeso = (byte) => (byte / 1048576).toFixed(1).replace('.', ',') + ' MB';
