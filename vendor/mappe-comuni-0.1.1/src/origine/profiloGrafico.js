// ORIGINE: Adrenalina battuta-live/shared/profiloGrafico.js (commit c6586b6636, SHA-256 fonte 406253cf47297c5b…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: grafico del profilo altimetrico.
// Sostituzioni: nessuna (copia identica).
// PROFILO ALTIMETRICO GRAFICO (fase 2 VCO1) — geometria del disegno, logica pura.
//
// Il grafico nasce SOLO da un profilo completo (shared/terreno.js, `serie`):
// gli stessi campioni del dislivello, nessun punto aggiunto o smussato. Se
// manca anche una quota non c'e' profilo e quindi non c'e' grafico.
// Per stare leggero su un telefono si tengono al massimo MAX_PUNTI_GRAFICO
// campioni, scegliendo a ogni passo il piu' alto e il piu' basso del gruppo:
// cime e fondi restano dove sono, non si "tagliano".

export const MAX_PUNTI_GRAFICO = 240;

/** Dimensioni del disegno (viewBox): margini per le quote a sinistra e i km sotto.
 *  Larghezza vicina a quella vera del riquadro a 320 px (~225 px): il testo resta leggibile. */
export const AREA_GRAFICO = Object.freeze({ larghezza: 230, altezza: 100, sinistra: 40, destra: 6, sopra: 9, sotto: 17 });

/** Riduce la serie a ~max punti tenendo min e max di ogni gruppo (in ordine di distanza). */
export function riduciSerie(serie, max = MAX_PUNTI_GRAFICO) {
  if (!Array.isArray(serie) || serie.length <= max) return serie || [];
  const gruppi = Math.max(1, Math.floor(max / 2));
  const passo = serie.length / gruppi;
  const out = [];
  for (let g = 0; g < gruppi; g++) {
    const da = Math.floor(g * passo), a = Math.min(serie.length, Math.floor((g + 1) * passo));
    let iMin = da, iMax = da;
    for (let i = da; i < a; i++) {
      if (serie[i].q < serie[iMin].q) iMin = i;
      if (serie[i].q > serie[iMax].q) iMax = i;
    }
    for (const i of iMin === iMax ? [iMin] : [Math.min(iMin, iMax), Math.max(iMin, iMax)]) out.push(serie[i]);
  }
  const ultimo = serie[serie.length - 1];
  if (out[0] !== serie[0]) out.unshift(serie[0]);
  if (out[out.length - 1] !== ultimo) out.push(ultimo);
  return out;
}

/**
 * Geometria del profilo: percorso SVG della linea e dell'area, scala e
 * testi degli assi. null se la serie non basta o contiene un valore non finito.
 */
export function geometriaProfilo(serie, area = AREA_GRAFICO) {
  if (!Array.isArray(serie) || serie.length < 2 || !serie.every((c) => c && Number.isFinite(c.d) && Number.isFinite(c.q))) return null;
  const pts = riduciSerie(serie);
  const dMax = serie[serie.length - 1].d;
  if (!(dMax > 0)) return null;
  let qMin = Infinity, qMax = -Infinity;
  for (const c of serie) { if (c.q < qMin) qMin = c.q; if (c.q > qMax) qMax = c.q; }
  // almeno 10 m di scala: su un tratto in piano il rumore non deve sembrare una montagna
  const centro = (qMin + qMax) / 2, mezzo = Math.max(5, (qMax - qMin) / 2);
  const basso = centro - mezzo, alto = centro + mezzo;
  const w = area.larghezza - area.sinistra - area.destra, h = area.altezza - area.sopra - area.sotto;
  const x = (d) => area.sinistra + d / dMax * w;
  const y = (q) => area.sopra + (alto - q) / (alto - basso) * h;
  const f = (n) => Math.round(n * 10) / 10;
  const linea = pts.map((c, i) => (i ? 'L' : 'M') + f(x(c.d)) + ' ' + f(y(c.q))).join(' ');
  const fondo = area.sopra + h;
  const riempimento = linea + ' L' + f(x(dMax)) + ' ' + f(fondo) + ' L' + f(x(0)) + ' ' + f(fondo) + ' Z';
  return {
    linea, riempimento, punti: pts.length, dMax, qMin, qMax,
    yMax: f(y(qMax)), yMin: f(y(qMin)), xFine: f(x(dMax)), xInizio: area.sinistra, fondo: f(fondo),
    testoMax: Math.round(qMax) + ' m', testoMin: Math.round(qMin) + ' m',
    testoDistanza: dMax >= 1000 ? (dMax / 1000).toFixed(dMax >= 10_000 ? 0 : 1).replace('.', ',') + ' km' : Math.round(dMax) + ' m'
  };
}

/** Descrizione per chi usa un lettore di schermo (stessi numeri del dislivello). */
export function descrizioneProfilo(pr) {
  if (!pr || !pr.completo) return '';
  const n = (x) => Math.round(x).toLocaleString('it-IT');
  return 'Profilo altimetrico del terreno sotto la linea: ' + n(pr.lunghezza) + ' m, da ' + n(pr.quotaInizio) + ' a ' + n(pr.quotaFine) +
    ' m s.l.m., minimo ' + n(pr.quotaMin) + ', massimo ' + n(pr.quotaMax) + ', salita ' + n(pr.salita) + ' m, discesa ' + n(pr.discesa) + ' m.';
}
