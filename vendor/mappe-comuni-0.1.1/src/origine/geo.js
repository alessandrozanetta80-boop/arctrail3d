// ORIGINE: GESTIONALE COMPRENSORI src/gps/shared/geo.js (commit 62d935678e, SHA-256 fonte 0f26b7737848a623…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: distanze, punto in poligono, centro visivo.
// Adattamenti dichiarati: dalla 0.1.1 la fonte è la copia del Gestionale v20 (1.1.20-test): uguale a battuta-live/shared/geo.js salvo riquadro() per ogni geometria GeoJSON (correzione del crash mappa v19 «e[0] is not iterable» con i livelli a linee).
// Sostituzioni: nessuna (copia identica).
// ORIGINE: copia adattata da Adrenalina, battuta-live/shared/geo.js (21/09/2026).
// L'originale in ../Adrenalina non e' stato modificato. Vedi docs/ADRENALINA_GPS_REUSE.md.
//
// GEOMETRIA — distanze e contenimento punto/poligono su GeoJSON WGS84.
//
// Le distanze fra partecipanti sono di centinaia di metri o pochi km:
// la formula dell'emisenoverso (haversine) sul raggio medio terrestre ha
// un errore dell'ordine dello 0,5% al massimo, molto inferiore
// all'incertezza del GPS di un telefono nel bosco.

const R_TERRA_M = 6_371_008.8;

export function distanzaMetri(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TERRA_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Distanza leggibile senza falsa precisione: l'arrotondamento non e' mai
 * piu' fine dell'incertezza combinata delle due posizioni.
 */
const GRADINI = [5, 10, 25, 50, 100, 250, 500, 1000, 5000];

function gradinoPer(v) {
  return GRADINI.find((g) => g >= v) || GRADINI[GRADINI.length - 1];
}

export function formattaDistanza(metri, incertezzaMetri = 0) {
  if (!Number.isFinite(metri) || metri < 0) return '—';
  const inc = Number.isFinite(incertezzaMetri) ? Math.max(0, incertezzaMetri) : 0;
  // Piu' vicini dell'incertezza: la distanza non si puo' dire.
  if (inc > 0 && metri <= inc) return '< ' + formattaMetri(gradinoPer(inc));
  const passoBase = metri < 100 ? 5 : metri < 1000 ? 10 : 100;
  const passo = Math.max(passoBase, inc > 0 ? gradinoPer(inc) : 0);
  const arrotondato = Math.round(metri / passo) * passo;
  return (passo > passoBase ? '~' : '') + formattaMetri(arrotondato);
}

function formattaMetri(m) {
  if (m < 1000) return Math.round(m) + ' m';
  const km = m / 1000;
  return (km < 10 ? km.toFixed(1) : String(Math.round(km))).replace('.', ',') + ' km';
}

/** Raggio-punto in un anello (ray casting). anello: [[lon,lat], ...]. */
function inAnello(lon, lat, anello) {
  let dentro = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i];
    const [xj, yj] = anello[j];
    const interseca = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (interseca) dentro = !dentro;
  }
  return dentro;
}

function inPoligono(lon, lat, anelli) {
  if (!anelli.length || !inAnello(lon, lat, anelli[0])) return false;
  for (let k = 1; k < anelli.length; k++) {
    if (inAnello(lon, lat, anelli[k])) return false;   // buco
  }
  return true;
}

/** Il punto {lat, lon} cade nella geometria GeoJSON (Polygon/MultiPolygon)? */
export function puntoInGeometria(punto, geometria) {
  if (!geometria) return false;
  const { lon, lat } = punto;
  if (geometria.type === 'Polygon') return inPoligono(lon, lat, geometria.coordinates);
  if (geometria.type === 'MultiPolygon') {
    return geometria.coordinates.some((p) => inPoligono(lon, lat, p));
  }
  return false;
}

/**
 * Riquadro [minLon, minLat, maxLon, maxLat] di una geometria GeoJSON di qualunque tipo.
 * Poligoni: anello esterno (i buchi stanno dentro). Punti e linee: tutte le posizioni.
 * Fix crash v19 (15/10/2026): i livelli VCO3 a linee (sentieri, viabilita') passavano di qui da
 * featureCheContengono e `p[0]` di una LineString e' un numero ("e[0] is not iterable").
 * Una geometria vuota o sconosciuta da' il riquadro vuoto [Inf, Inf, -Inf, -Inf]: nessun punto ci cade.
 */
export function riquadro(geometria) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const aggiungi = (pos) => {
    const [x, y] = pos;
    if (x < b[0]) b[0] = x;
    if (y < b[1]) b[1] = y;
    if (x > b[2]) b[2] = x;
    if (y > b[3]) b[3] = y;
  };
  const visita = (g) => {
    if (!g) return;
    const c = g.coordinates;
    if (g.type === 'GeometryCollection') (g.geometries || []).forEach(visita);
    else if (!Array.isArray(c)) return;
    else if (g.type === 'Point') aggiungi(c);
    else if (g.type === 'LineString' || g.type === 'MultiPoint') c.forEach(aggiungi);
    else if (g.type === 'MultiLineString') c.forEach((l) => l.forEach(aggiungi));
    else if (g.type === 'Polygon') (c[0] || []).forEach(aggiungi);
    else if (g.type === 'MultiPolygon') c.forEach((p) => (p[0] || []).forEach(aggiungi));
  };
  visita(geometria);
  return b;
}

/**
 * Tutte le feature di una FeatureCollection che contengono il punto.
 * Usa un riquadro precalcolato per scartare in fretta.
 */
export function featureCheContengono(punto, collezione) {
  const out = [];
  for (const f of collezione.features || []) {
    if (!f || !f.geometry) continue;
    const b = f.__riquadro || (f.__riquadro = riquadro(f.geometry));
    if (punto.lon < b[0] || punto.lon > b[2] || punto.lat < b[1] || punto.lat > b[3]) continue;
    if (puntoInGeometria(punto, f.geometry)) out.push(f);
  }
  return out;
}

// ------------------------------------------------------------ distanza dal bordo
const METRI_PER_GRADO = 6371008.8 * Math.PI / 180;

function distanzaSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx - px, y = ay + t * dy - py;
  return Math.sqrt(x * x + y * y);
}

/**
 * Distanza in metri dal punto {lat, lon} al bordo piu' vicino (anelli
 * esterni e buchi) di un Polygon/MultiPolygon. Proiezione locale
 * equirettangolare centrata sul punto: errore trascurabile entro qualche km,
 * che e' la scala che interessa (precisione GPS, vicinanza al confine).
 * `limiteM`: i segmenti il cui riquadro dista piu' di cosi' vengono saltati.
 */
export function distanzaDalBordo(punto, geometria, limiteM = Infinity) {
  if (!geometria) return Infinity;
  const ky = METRI_PER_GRADO;
  const kx = METRI_PER_GRADO * Math.cos(punto.lat * Math.PI / 180);
  const poligoni = geometria.type === 'Polygon' ? [geometria.coordinates]
    : geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
  let min = Infinity;
  for (const p of poligoni) {
    for (const anello of p) {
      for (let i = 1; i < anello.length; i++) {
        const ax = (anello[i - 1][0] - punto.lon) * kx, ay = (anello[i - 1][1] - punto.lat) * ky;
        const bx = (anello[i][0] - punto.lon) * kx, by = (anello[i][1] - punto.lat) * ky;
        // scarto rapido: segmento interamente oltre il limite (o oltre il minimo gia' trovato)
        const soglia = Math.min(min, limiteM);
        if ((ax > soglia && bx > soglia) || (ax < -soglia && bx < -soglia) ||
            (ay > soglia && by > soglia) || (ay < -soglia && by < -soglia)) continue;
        const d = distanzaSegmento(0, 0, ax, ay, bx, by);
        if (d < min) min = d;
      }
    }
  }
  return min;
}

/** Riquadro della feature allargato di `metri` (per scartare in fretta). */
export function riquadroAllargato(f, metri, lat) {
  const b = f.__riquadro || (f.__riquadro = riquadro(f.geometry));
  const dLat = metri / METRI_PER_GRADO;
  const dLon = metri / (METRI_PER_GRADO * Math.cos(lat * Math.PI / 180));
  return [b[0] - dLon, b[1] - dLat, b[2] + dLon, b[3] + dLat];
}

/* PUNTO INTERNO A UN POLIGONO ("point on surface").
 *
 * Serve a posare un'etichetta DENTRO l'area. Il centroide non basta: su un
 * comprensorio a ferro di cavallo, o su un multipoligono fatto di due lembi
 * separati, il centroide cade fuori — e l'etichetta "VCO2" finisce a
 * galleggiare sul territorio di qualcun altro.
 *
 * Metodo: si prende il poligono piu' esteso, si traccia una riga
 * orizzontale a meta' altezza, si guardano gli attraversamenti con i bordi
 * (anelli esterni e buchi) e si sceglie il punto medio del tratto INTERNO
 * piu' lungo. Cosi' l'etichetta sta dentro e nel punto piu' largo.
 *
 * @param {object} geometria  Polygon o MultiPolygon
 * @returns {{lat:number, lon:number}|null}
 */
export function puntoInterno(geometria) {
  if (!geometria) return null;
  const poligoni = geometria.type === 'Polygon' ? [geometria.coordinates]
    : geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
  if (!poligoni.length) return null;

  // il lembo piu' grande: su un multipoligono l'etichetta va sul principale
  let scelto = null, piuGrande = -1;
  for (const p of poligoni) {
    const b = riquadro({ type: 'Polygon', coordinates: p });
    const area = (b[2] - b[0]) * (b[3] - b[1]);
    if (area > piuGrande) { piuGrande = area; scelto = p; }
  }
  if (!scelto) return null;

  const b = riquadro({ type: 'Polygon', coordinates: scelto });
  const y = (b[1] + b[3]) / 2;

  // attraversamenti della riga orizzontale con TUTTI gli anelli (buchi compresi)
  const incroci = [];
  for (const anello of scelto) {
    for (let i = 1; i < anello.length; i++) {
      const [x1, y1] = anello[i - 1];
      const [x2, y2] = anello[i];
      if ((y1 > y) === (y2 > y)) continue;            // il segmento non taglia la riga
      incroci.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
  }
  if (incroci.length < 2) {
    const centro = { lat: y, lon: (b[0] + b[2]) / 2 };
    return puntoInGeometria(centro, geometria) ? centro : null;
  }
  incroci.sort((a, c) => a - c);

  // fra un attraversamento e il successivo si e' alternativamente dentro e
  // fuori: si tiene il tratto interno piu' largo
  let miglioreX = null, miglioreLarghezza = -1;
  for (let i = 0; i + 1 < incroci.length; i += 2) {
    const larghezza = incroci[i + 1] - incroci[i];
    if (larghezza > miglioreLarghezza) {
      miglioreLarghezza = larghezza;
      miglioreX = (incroci[i] + incroci[i + 1]) / 2;
    }
  }
  return miglioreX === null ? null : { lat: y, lon: miglioreX };
}

/* ------------------------------------------------------------ CENTRO VISIVO
 *
 * DOVE POSARE L'ETICHETTA DI UN TERRITORIO.
 *
 * `puntoInterno()` garantisce una cosa sola: che il punto sia dentro. Non
 * basta. Su CAVCO1 il tratto orizzontale piu' largo cade nella fascia bassa
 * del lago, e l'etichetta "VCO1" finiva appoggiata a Verbania, incollata al
 * bordo, su un'ansa che non rappresenta il comprensorio. Chi guarda la mappa
 * legge la posizione dell'etichetta come "questo e' il centro di quel
 * territorio": se e' su un bordo, dice una cosa falsa.
 *
 * Qui si cerca il POLO DI INACCESSIBILITA': il punto interno piu' lontano da
 * qualunque bordo (algoritmo polylabel di Mapbox — suddivisione a quadrati
 * con coda di priorita'). E' il centro del cerchio piu' grande che sta
 * dentro il poligono: il posto piu' "largo", che e' esattamente dove
 * un'etichetta non tocca niente.
 *
 * Si lavora in METRI, su una proiezione equirettangolare locale centrata sul
 * poligono: cosi' `distanzaBordoM` e' una distanza vera e la soglia di
 * precisione si puo' esprimere in metri invece che in gradi, che alle nostre
 * latitudini valgono il doppio in longitudine rispetto alla latitudine.
 */

/** Area (m^2, valore assoluto) di un anello proiettato: formula di Gauss. */
function areaAnello(anello) {
  let s = 0;
  for (let i = 1; i < anello.length; i++) {
    s += anello[i - 1][0] * anello[i][1] - anello[i][0] * anello[i - 1][1];
  }
  return Math.abs(s) / 2;
}

/** Distanza con segno dal bordo (positiva dentro) in metri, su anelli proiettati. */
function distanzaConSegno(x, y, anelli) {
  let dentro = false;
  let min = Infinity;
  for (const anello of anelli) {
    for (let i = 1, j = 0; i < anello.length; j = i++) {
      const a = anello[j], b = anello[i];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
      const d = distanzaSegmento(x, y, a[0], a[1], b[0], b[1]);
      if (d < min) min = d;
    }
  }
  return dentro ? min : -min;
}

/**
 * Centro visivo di un Polygon/MultiPolygon GeoJSON (WGS84).
 *
 * Su un MultiPolygon si sceglie il lembo di AREA maggiore — non di riquadro
 * maggiore: un'appendice lunga e sottile ha un riquadro grande e un
 * territorio piccolo, e l'etichetta non va li'.
 *
 * @param {object} geometria         Polygon o MultiPolygon
 * @param {{precisioneM?: number}} opz  quando smettere di affinare (default 100 m)
 * @returns {{lat:number, lon:number, distanzaBordoM:number}|null}
 */
export function centroVisivo(geometria, { precisioneM = 100 } = {}) {
  if (!geometria) return null;
  const poligoni = geometria.type === 'Polygon' ? [geometria.coordinates]
    : geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
  if (!poligoni.length) return null;

  // riferimento della proiezione: centro del riquadro complessivo
  const b0 = riquadro(geometria);
  const lat0 = (b0[1] + b0[3]) / 2;
  const lon0 = (b0[0] + b0[2]) / 2;
  const kx = METRI_PER_GRADO * Math.cos(lat0 * Math.PI / 180);
  const proietta = (anello) => anello.map(([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * METRI_PER_GRADO]);

  // il lembo con piu' territorio (esterno meno i buchi), non il piu' lungo
  let scelto = null, piuGrande = -1;
  for (const p of poligoni) {
    const anelli = p.map(proietta);
    const area = areaAnello(anelli[0]) - anelli.slice(1).reduce((a, r) => a + areaAnello(r), 0);
    if (area > piuGrande) { piuGrande = area; scelto = anelli; }
  }
  if (!scelto) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of scelto[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const larghezza = maxX - minX, altezza = maxY - minY;
  const lato = Math.min(larghezza, altezza);
  if (!(lato > 0)) return null;

  // Una cella: distanza del centro dal bordo, piu' il massimo teorico
  // raggiungibile al suo interno (diagonale). Serve a potare la ricerca.
  const cella = (x, y, h) => {
    const d = distanzaConSegno(x, y, scelto);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };

  let passo = lato / 2;
  const coda = [];
  for (let x = minX; x < maxX; x += passo) {
    for (let y = minY; y < maxY; y += passo) coda.push(cella(x + passo / 2, y + passo / 2, passo / 2));
  }
  let migliore = cella((minX + maxX) / 2, (minY + maxY) / 2, 0);

  // coda di priorita' povera ma sufficiente: poche migliaia di celle
  let giri = 0;
  while (coda.length && giri++ < 20000) {
    let k = 0;
    for (let i = 1; i < coda.length; i++) if (coda[i].max > coda[k].max) k = i;
    const c = coda.splice(k, 1)[0];
    if (c.d > migliore.d) migliore = c;
    if (c.max - migliore.d <= precisioneM) continue;
    passo = c.h / 2;
    coda.push(cella(c.x - passo, c.y - passo, passo), cella(c.x + passo, c.y - passo, passo),
      cella(c.x - passo, c.y + passo, passo), cella(c.x + passo, c.y + passo, passo));
  }
  if (!(migliore.d > 0)) return null;
  return {
    lat: lat0 + migliore.y / METRI_PER_GRADO,
    lon: lon0 + migliore.x / kx,
    distanzaBordoM: Math.round(migliore.d)
  };
}

/**
 * Punto dove posare l'etichetta di un territorio: il centro visivo, e se
 * l'algoritmo non conclude (geometria degenere) il vecchio punto interno.
 * Restituisce sempre un punto DENTRO la geometria, o null.
 */
export function puntoEtichetta(geometria) {
  const c = centroVisivo(geometria);
  if (c && puntoInGeometria(c, geometria)) return c;
  const p = puntoInterno(geometria);
  return p ? { ...p, distanzaBordoM: Math.round(distanzaDalBordo(p, geometria)) } : null;
}
