// ORIGINE: Adrenalina battuta-live/shared/scritteCarta.js (commit c6586b6636, SHA-256 fonte e8ffff76b7fe46b5…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: rettangoli delle scritte stampate.
// Sostituzioni: nessuna (copia identica).
// DOVE LA CARTA REGIONALE HA GIA' SCRITTO (Mappa e Terreno, 14/10/2026).
//
// Schermate vere v69 a Trarego: «Alpe Laman» (nostro, OSM) scritto sopra
// «Monti Lemanni» stampato nella carta, «Località Sasè» sopra «Trarego
// Viggiona». Le scritte della carta sono pixel delle tile: non si spostano.
// Si sa pero' DOVE la carta le stampa: le «scritte cartografiche» BDTRE
// (data/toponimi-regione/, scr_cr 1:25.000 e 1:10.000) danno il punto di
// stampa. Confrontato con le tile vere (UI_REVIEW/MAPPA_TERRENO_FINALE_20261014):
//   - il punto e' l'INIZIO della scritta (lato sinistro), circa a meta' altezza;
//   - la scritta ha dimensioni in METRI sul terreno, non in pixel: raddoppia
//     a ogni livello di zoom, su Terreno (WMS 1:25.000) e su Mappa;
//   - 1:25.000: 29-33 m per lettera (Monti Lemanni, Prome, Vugn, Fodrasca),
//     ~48 per i comuni (Trarego Viggiona), alta 40-80 m;
//   - 1:10.000 (Mappa da z16): ~9-10 m per lettera (Alpe Buse'), ~17 i comuni, alta 20-33 m.
// Qui si stima il rettangolo di ogni scritta stampata nella vista, cosi' un
// nostro nome non ci finisce sopra: si sposta di pochi px o, se non c'e'
// posto, a quello zoom non si scrive (il dato resta; Aerea li scrive tutti).
// E' una stima prudente (un po' larga), non una lettura dei pixel.

import { chiaveNome } from './nomiCarta.js';

export const MISURE_SCRITTE = Object.freeze({
  scritta25: Object.freeze({ mLettera: 38, mAltezza: 60 }),
  scritta10: Object.freeze({ mLettera: 12, mAltezza: 28 })
});

const CELLA = 0.02;   // stessa griglia di indicePunti (shared/nomiCarta.js)
// Nomi lunghi (riserve, parchi, valli: «Riserva speciale del Sacro Monte di Ghiffa») la carta li
// stampa su piu' righe, inclinati o spaziati sull'area: una riga stimata sarebbe falsa. Non si usano.
export const LETTERE_MAX_SCRITTA = 24;

/** Metri per pixel CSS a questa latitudine e zoom (Web Mercator, tile da 256 px). */
export function metriPerPixel(lat, z) {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (256 * Math.pow(2, z));
}

/** Scritte stampate (fonti: 'scritta25' / 'scritta10') con il punto dentro il riquadro allargato. */
export function scritteNelRiquadro(indice, { sud, nord, ovest, est }, fonti) {
  if (!indice || !fonti || !fonti.length) return [];
  // una scritta puo' cominciare fuori a sinistra ed entrare nella vista: si allarga a ovest
  const o = ovest - 0.02, i0 = Math.floor((sud - 0.005) / CELLA), i1 = Math.floor((nord + 0.005) / CELLA);
  const j0 = Math.floor(o / CELLA), j1 = Math.floor(est / CELLA);
  const out = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    for (const r of indice.get(i + ':' + j) || []) {
      if (!fonti.includes(r.f) || !MISURE_SCRITTE[r.f] || [...r.n].length > LETTERE_MAX_SCRITTA) continue;
      if (r.lat < sud - 0.005 || r.lat > nord + 0.005 || r.lon < o || r.lon > est) continue;
      out.push(r);
    }
  }
  return out;
}

/**
 * Rettangolo (px dello schermo) di una scritta stampata.
 * @param {{lat:number, lon:number, f:string, n:string}} r  scritta BDTRE
 * @param {(lat:number, lon:number) => {x:number, y:number}} proietta  punto sullo schermo
 * @param {number} mpp  metri per pixel
 */
export function rettangoloScritta(r, proietta, mpp) {
  const m = MISURE_SCRITTE[r.f];
  const c = proietta(r.lat, r.lon);
  const lettere = [...String(r.n)].length;
  const w = (lettere * m.mLettera) / mpp, h = m.mAltezza / mpp;
  return { x0: c.x - 4, y0: c.y - 0.55 * h, x1: c.x + w + 4, y1: c.y + 0.6 * h, n: r.n };
}

/** Rettangoli delle scritte che la carta stampa nella vista corrente (solo quelli che toccano lo schermo). */
export function rettangoliScritte(indice, riquadro, fonti, proietta, mpp, { larghezza = Infinity, altezza = Infinity } = {}) {
  const out = [];
  for (const r of scritteNelRiquadro(indice, riquadro, fonti)) {
    const q = rettangoloScritta(r, proietta, mpp);
    if (q.x1 < 0 || q.y1 < 0 || q.x0 > larghezza || q.y0 > altezza) continue;
    out.push(q);
  }
  return out;
}

/**
 * Il nome OSM e' l'INIZIO di un nome stampato li' vicino («Trarego» e la carta
 * scrive «Trarego Viggiona», «Cannero» / «Cannero Riviera»): stesso posto
 * detto in modo piu' corto, sulla carta sarebbe un doppione. Distanza misurata
 * dal punto OSM alla scritta intera (che parte dal punto di stampa e va a est).
 * @returns {null|{nome:string, f:string, distanzaM:number}}
 */
export function inizioDiScritta(p, indice, fonti, raggioM = 600) {
  if (!p || !p.n || !indice || !fonti || !fonti.length) return null;
  const k = chiaveNome(p.n);
  if (k.length < 4) return null;
  const i = Math.floor(p.lat / CELLA), j = Math.floor(p.lon / CELLA);
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180), ky = 110574;
  for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
    for (const r of indice.get(a + ':' + b) || []) {
      if (!MISURE_SCRITTE[r.f] || !fonti.includes(r.f) || !r.k.startsWith(k + ' ')) continue;
      // segmento della scritta: dal punto di stampa verso est per la sua lunghezza stimata
      const lungM = [...r.n].length * MISURE_SCRITTE[r.f].mLettera;
      const x = (p.lon - r.lon) * kx, y = (p.lat - r.lat) * ky;
      const dx = Math.max(0, Math.min(lungM, x));
      const d = Math.hypot(x - dx, y);
      if (d <= raggioM) return { nome: r.n, f: r.f, distanzaM: Math.round(d) };
    }
  }
  return null;
}
