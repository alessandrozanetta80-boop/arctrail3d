// ORIGINE: Adrenalina battuta-live/shared/geojson.js (commit c6586b6636, SHA-256 fonte b2fb2c3ceee94d42…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: validazione GeoJSON.
// Sostituzioni: nessuna (copia identica).
// VALIDAZIONE GEOJSON — un file di layer corrotto o incompleto non deve
// far cadere l'app: si scartano le feature non valide e lo si dice.

const TIPI_AMMESSI = ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString', 'Point', 'MultiPoint'];

function posizioneValida(p) {
  return Array.isArray(p) && p.length >= 2 &&
    Number.isFinite(p[0]) && Number.isFinite(p[1]) &&
    p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90;
}

function anelloValido(a) {
  return Array.isArray(a) && a.length >= 4 && a.every(posizioneValida);
}

export function geometriaValida(g) {
  if (!g || typeof g !== 'object' || !TIPI_AMMESSI.includes(g.type)) return false;
  const c = g.coordinates;
  switch (g.type) {
    case 'Point': return posizioneValida(c);
    case 'MultiPoint': return Array.isArray(c) && c.every(posizioneValida);
    case 'LineString': return Array.isArray(c) && c.length >= 2 && c.every(posizioneValida);
    case 'MultiLineString': return Array.isArray(c) && c.every((l) => Array.isArray(l) && l.length >= 2 && l.every(posizioneValida));
    case 'Polygon': return Array.isArray(c) && c.length >= 1 && c.every(anelloValido);
    case 'MultiPolygon': return Array.isArray(c) && c.length >= 1 && c.every((p) => Array.isArray(p) && p.length >= 1 && p.every(anelloValido));
    default: return false;
  }
}

/**
 * @returns {{ok: boolean, collezione?: object, scartate: number, errore?: string}}
 */
export function validaCollezione(dati) {
  if (!dati || typeof dati !== 'object' || dati.type !== 'FeatureCollection' || !Array.isArray(dati.features)) {
    return { ok: false, scartate: 0, errore: 'Non è una FeatureCollection GeoJSON' };
  }
  const valide = dati.features.filter((f) => f && f.type === 'Feature' && geometriaValida(f.geometry));
  return {
    ok: true,
    collezione: { type: 'FeatureCollection', features: valide },
    scartate: dati.features.length - valide.length
  };
}
