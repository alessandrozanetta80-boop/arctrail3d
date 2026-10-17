// ORIGINE: Adrenalina battuta-live/shared/rilievo.js (commit c6586b6636, SHA-256 fonte 146d46f7ab14942c…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: rilievo ombreggiato e curve (WMS regionali).
// Adattamenti dichiarati: il CA non e' fisso (in Adrenalina CAVCO1): lo da' il pacchetto territoriale (stesso adattamento del Gestionale v18).
// Sostituzioni: 1 (elenco in strumenti/importa-da-fonti.mjs).
// RILIEVO SOPRA LA MAPPA BASE (VCO1 MAPPE PRO, seconda fase, 13/10/2026).
//
// Due livelli FACOLTATIVI, spenti di default, nel pannello Layer gia'
// esistente (sezione Mappa base): niente comandi nuovi sul bordo della mappa.
//
//   Rilievo ombreggiato  «RIPRESA AEREA ICE 2009-2011 - Rilievo ombreggiato»
//                        Regione Piemonte, metadato r_piemon:e10eb79d-b61b-44b3-804d-9adc082abbd3,
//                        CC BY 4.0. WMS MapProxy regionale, layer regp_ombreggiature
//                        (lo stesso gia' usato dentro la base Terreno).
//   Curve di livello     «BDTRE - Curva di livello (CV_LIV)», metadato
//                        r_piemon:8cebbbb4-8c58-4e01-951e-f3db4181d325; geoservizio
//                        «BDTRE - Orografia» r_piemon:a5bae183-65b5-4071-aaf0-ce0535083d44,
//                        CC BY 4.0, Fees "no conditions apply". WMS bdtre_oro, layer cv_liv:
//                        PNG trasparente in EPSG:3857, con le quote scritte. Il servizio lo
//                        disegna solo fino a 1:50.000 (MaxScaleDenominator 50001): da z14 in su.
// Verificati il 13/10/2026 con GetCapabilities e GetMap reali (CORS «*»).
//
// Regole:
//   - NON sulla base Terreno: ha gia' rilievo e curve (sarebbe un doppione);
//     NON sulla mappa offline: servono la rete e il servizio regionale.
//   - SOLO NEL CA VCO1: una tile si chiede solo se tocca il confine ufficiale
//     del CAVCO1 (comprensori-vco.geojson). Fuori, nessuna richiesta.
//   - Nessun dato dell'utente nelle richieste: sono tile cartografiche.
//   - Nessun prefetch e niente offline: solo tile della vista corrente.

export const WMS_PIEMONTE = 'https://geomap.reteunitaria.piemonte.it/mapproxy/service';
export const WMS_OROGRAFIA = 'https://geomap.reteunitaria.piemonte.it/ws/taims/rp-01/taimswms/bdtre_oro';

export const CA_RILIEVO = null;   // MAPPE COMUNI: il codice del confine arriva dal pacchetto territoriale

export const SOVRAPPOSIZIONI = Object.freeze([
  Object.freeze({
    id: 'ombreggiatura',
    titolo: 'Rilievo ombreggiato',
    nota: 'ombre dei versanti sopra Mappa, Aerea e Ibrida',
    fonte: 'Regione Piemonte, rilievo ombreggiato ICE 2009-2011 (CC BY 4.0)',
    metadato: 'r_piemon:e10eb79d-b61b-44b3-804d-9adc082abbd3',
    url: WMS_PIEMONTE,
    layers: 'regp_ombreggiature',
    formato: 'image/png',
    trasparente: false,
    // rilievo grigio "moltiplicato" sulla base: il chiaro sparisce, le ombre scuriscono un po'
    moltiplica: true,
    opacita: 0.32,
    opacitaLeggibile: 0.22,   // stile «Leggibile» (14/10/2026): ombre piu' tenui sotto nomi e piste
    minZoom: 10,
    maxNativeZoom: 16,      // il dato e' a 5 m: oltre z16 si ingrandisce l'ultima tile
    // corta: la riga dei crediti sta gia' sopra SEGNA POSIZIONE, e Regione Piemonte c'e' gia' con la base
    attribution: 'Rilievo ICE Regione Piemonte, CC BY 4.0'
  }),
  Object.freeze({
    id: 'curve',
    titolo: 'Curve di livello',
    nota: 'linee e quote della carta regionale, da vicino (zoom 14 e oltre)',
    fonte: 'Regione Piemonte, BDTRE Curve di livello (CC BY 4.0)',
    metadato: 'r_piemon:8cebbbb4-8c58-4e01-951e-f3db4181d325',
    url: WMS_OROGRAFIA,
    layers: 'cv_liv',
    formato: 'image/png',
    trasparente: true,
    moltiplica: false,
    opacita: 0.9,
    opacitaLeggibile: 0.6,    // stile «Leggibile»: curve meno dominanti, quote della carta ancora leggibili
    // sulla foto aerea le linee marroni sottili spariscono: diventano chiare con un alone scuro
    // (stesso criterio dello stile "foto" delle piste), sulla carta restano quelle della Regione
    filtroFoto: 'brightness(0) invert(1) drop-shadow(0 0 1px rgba(0,0,0,.95))',
    minZoom: 14,            // il servizio non le disegna sotto 1:50.000
    maxNativeZoom: 18,
    attribution: 'Curve BDTRE Regione Piemonte, CC BY 4.0'
  })
]);

export const sovrapposizione = (id) => SOVRAPPOSIZIONI.find((s) => s.id === id) || null;

/** Basi su cui il rilievo NON va: Terreno lo contiene gia', l'offline non ha rete. */
const BASI_ESCLUSE = Object.freeze({ terreno: 'già compreso nella mappa Terreno', offline: 'serve Internet (servizio della Regione Piemonte)' });

/** null se il livello puo' stare sulla base, altrimenti il motivo (testo breve). */
export function motivoEsclusione(idBase) {
  return BASI_ESCLUSE[idBase] || null;
}

// ------------------------------------------------------------ preferenza (spenti di default)
export const CHIAVE_RILIEVO = 'battuta-live-rilievo';

/** {ombreggiatura: bool, curve: bool}; valore rovinato o assente -> tutto spento. */
export function leggiPreferenzaRilievo(archivio) {
  try {
    const v = JSON.parse(archivio.getItem(CHIAVE_RILIEVO) || 'null');
    return { ombreggiatura: !!(v && v.ombreggiatura === true), curve: !!(v && v.curve === true) };
  } catch {
    return { ombreggiatura: false, curve: false };
  }
}

// ------------------------------------------------------------ solo dentro il CA VCO1
/** Anelli esterni (lon,lat) del CA dal GeoJSON dei comprensori; [] se manca. */
export function anelliDelCa(collezione, ca = CA_RILIEVO) {
  const f = collezione && Array.isArray(collezione.features)
    ? collezione.features.find((x) => x && (x.id === ca || (x.properties && x.properties.nome === ca))) : null;
  const g = f && f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates[0]];
  if (g.type === 'MultiPolygon') return g.coordinates.map((p) => p[0]);
  return [];
}

function dentroAnello(lon, lat, anello) {
  let dentro = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i], [xj, yj] = anello[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Il segmento a-b attraversa il riquadro? (Liang-Barsky) */
function segmentoNelRiquadro(a, b, r) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lati = [[-dx, a[0] - r.ovest], [dx, r.est - a[0]], [-dy, a[1] - r.sud], [dy, r.nord - a[1]]];
  for (const [p, q] of lati) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

/**
 * Il riquadro {ovest, sud, est, nord} tocca almeno un anello?
 * Vero se un angolo e' dentro, o un lato del confine passa nel riquadro.
 */
export function riquadroToccaAnelli(r, anelli) {
  if (!r || !anelli || !anelli.length) return false;
  for (const anello of anelli) {
    if (dentroAnello((r.ovest + r.est) / 2, (r.sud + r.nord) / 2, anello)) return true;
    for (const [lon, lat] of [[r.ovest, r.sud], [r.ovest, r.nord], [r.est, r.sud], [r.est, r.nord]]) {
      if (dentroAnello(lon, lat, anello)) return true;
    }
    for (let i = 1; i < anello.length; i++) {
      const a = anello[i - 1], b = anello[i];
      if (Math.max(a[0], b[0]) < r.ovest || Math.min(a[0], b[0]) > r.est || Math.max(a[1], b[1]) < r.sud || Math.min(a[1], b[1]) > r.nord) continue;
      if (segmentoNelRiquadro(a, b, r)) return true;
    }
  }
  return false;
}
