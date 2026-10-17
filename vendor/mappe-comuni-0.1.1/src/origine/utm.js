// ORIGINE: Adrenalina battuta-live/shared/utm.js (commit c6586b6636, SHA-256 fonte f1cff43440874c57…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: conversione UTM per il DTM offline.
// Sostituzioni: nessuna (copia identica).
// WGS84 -> UTM (fuso 32 nord, EPSG:32632): il DTM 25 m della Regione Piemonte
// e' in questo sistema. Serie di Krüger al terzo ordine (errore sotto il
// millimetro nel fuso), nessuna libreria.

const A_ELL = 6_378_137, F_ELL = 1 / 298.257223563, K0 = 0.9996, E0 = 500_000;
const N3 = F_ELL / (2 - F_ELL);
const A_RETT = A_ELL / (1 + N3) * (1 + N3 * N3 / 4 + N3 ** 4 / 64);
const ALFA = [N3 / 2 - 2 / 3 * N3 * N3 + 5 / 16 * N3 ** 3, 13 / 48 * N3 * N3 - 3 / 5 * N3 ** 3, 61 / 240 * N3 ** 3];
const C2 = 2 * Math.sqrt(N3) / (1 + N3);

/** {lat, lon} in gradi -> {e, n} in metri, fuso con meridiano centrale `lon0` (32 nord: 9°). */
export function versoUtm({ lat, lon }, lon0 = 9) {
  const phi = lat * Math.PI / 180, dl = (lon - lon0) * Math.PI / 180;
  const s = Math.sin(phi);
  const t = Math.sinh(Math.atanh(s) - C2 * Math.atanh(C2 * s));
  const xi = Math.atan(t / Math.cos(dl)), eta = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let e = eta, n = xi;
  for (let j = 1; j <= 3; j++) {
    e += ALFA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
    n += ALFA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
  }
  return { e: E0 + K0 * A_RETT * e, n: K0 * A_RETT * n };
}
