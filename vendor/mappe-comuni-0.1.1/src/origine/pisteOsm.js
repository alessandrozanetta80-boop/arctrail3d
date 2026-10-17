// ORIGINE: Adrenalina battuta-live/shared/pisteOsm.js (commit c6586b6636, SHA-256 fonte 19d03cdf32d2f241…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: palette, stili Leggibile/Dettagliato, schede delle piste OSM.
// Sostituzioni: nessuna (copia identica).
// PISTE FORESTALI, STRADE E SENTIERI DA OPENSTREETMAP (prototipo v63).
//
// Serve a chi recupera i cani: vedere quali strade, piste e sentieri ci sono
// davvero, per non fare giri assurdi. NON e' un navigatore e non dice dove si
// puo' passare con il fuoristrada: riporta i tag OSM come sono, e dove un tag
// manca lo scrive ("non indicato", "non verificato"), senza indovinare.
//
// Tre regole che non si piegano:
//   - "gippabile" non vuol dire "transito consentito" ne' "passabile oggi";
//   - un tag OSM (motor_vehicle=no...) non e' la norma locale: la scheda lo
//     dice come dato della mappa, non come divieto accertato;
//   - la qualita' (buona / media / precaria) si mostra SOLO se tracktype,
//     smoothness o surface sono marcati; altrimenti "qualita' non indicata".
//
// Modulo puro (niente DOM, niente Leaflet): lo usano lo script che produce il
// GeoJSON (tools/osm-piste-pilota.mjs), la mappa e i test.

export const CATEGORIA = Object.freeze({ CARRABILE: 'carrabile', PISTA: 'pista', SENTIERO: 'sentiero' });
export const QUALITA = Object.freeze({ BUONA: 'buona', MEDIA: 'media', PRECARIA: 'precaria' });
export const ACCESSO = Object.freeze({
  PERMESSO: 'permesso', VIETATO: 'vietato', PRIVATO: 'privato', LIMITATO: 'limitato', NON_INDICATO: 'non-indicato'
});
export const FILTRO = Object.freeze({ TUTTI: 'tutti', PISTE: 'piste', SENTIERI: 'sentieri' });

export const ZOOM_MINIMO_PISTE = 12;
/** Tetto del file scaricato dalla mappa: oltre, non si legge (file sbagliato o gonfiato). */
export const LIMITE_BYTE_PISTE = 8 * 1024 * 1024;
export const LIMITE_FEATURE_PISTE = 50000;
const MAX_TESTO = 120;

const CARRABILI = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified',
  'residential', 'living_street', 'service', 'road']);
const SENTIERI = new Set(['path', 'footway', 'bridleway', 'steps', 'cycleway', 'pedestrian', 'via_ferrata']);

/** Tag OSM conservati nel GeoJSON (tutti gli altri si scartano). */
export const TAG_CONSERVATI = Object.freeze(['highway', 'tracktype', 'surface', 'smoothness', 'width', 'access',
  'vehicle', 'motor_vehicle', 'motorcar', '4wd_only', 'name', 'ref', 'foot', 'barrier', 'sac_scale',
  'motor_vehicle:conditional', 'access:conditional', 'mtb:scale']);
export const TAG_BARRIERA = Object.freeze(['barrier', 'access', 'vehicle', 'motor_vehicle', 'motorcar', 'foot', 'locked', 'name']);

/** Testo dai dati: solo stringa, senza caratteri di controllo, corto. Mai HTML (si mostra con textContent). */
export function testoPulito(v, max = MAX_TESTO) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function soloTag(tags, chiavi) {
  const out = {};
  if (!tags || typeof tags !== 'object') return out;
  for (const k of chiavi) {
    if (!Object.prototype.hasOwnProperty.call(tags, k)) continue;
    const v = testoPulito(tags[k]);
    if (v !== null) out[k] = v;
  }
  return out;
}

function highwayBase(h) {
  return typeof h === 'string' ? h.replace(/_link$/, '') : '';
}

/** Carrabile / pista / sentiero, oppure null se la via non ci interessa. */
export function categoria(tags) {
  const h = highwayBase(tags && tags.highway);
  if (h === 'track') return CATEGORIA.PISTA;
  if (CARRABILI.has(h)) return CATEGORIA.CARRABILE;
  if (SENTIERI.has(h)) return CATEGORIA.SENTIERO;
  return null;
}

const DA_TRACKTYPE = { grade1: QUALITA.BUONA, grade2: QUALITA.BUONA, grade3: QUALITA.MEDIA, grade4: QUALITA.PRECARIA, grade5: QUALITA.PRECARIA };
const DA_SMOOTHNESS = {
  excellent: QUALITA.BUONA, good: QUALITA.BUONA, intermediate: QUALITA.BUONA,
  bad: QUALITA.MEDIA,
  very_bad: QUALITA.PRECARIA, horrible: QUALITA.PRECARIA, very_horrible: QUALITA.PRECARIA, impassable: QUALITA.PRECARIA
};
const DA_SURFACE = {
  asphalt: QUALITA.BUONA, paved: QUALITA.BUONA, concrete: QUALITA.BUONA, 'concrete:plates': QUALITA.BUONA,
  paving_stones: QUALITA.BUONA, sett: QUALITA.BUONA, compacted: QUALITA.BUONA, fine_gravel: QUALITA.BUONA,
  gravel: QUALITA.MEDIA, unpaved: QUALITA.MEDIA, pebblestone: QUALITA.MEDIA, cobblestone: QUALITA.MEDIA, unhewn_cobblestone: QUALITA.MEDIA,
  ground: QUALITA.PRECARIA, dirt: QUALITA.PRECARIA, earth: QUALITA.PRECARIA, grass: QUALITA.PRECARIA, mud: QUALITA.PRECARIA,
  sand: QUALITA.PRECARIA, rock: QUALITA.PRECARIA, stone: QUALITA.PRECARIA
};
const ORDINE_QUALITA = [QUALITA.BUONA, QUALITA.MEDIA, QUALITA.PRECARIA];

/**
 * Qualita' del fondo per piste e strade, SOLO dai tag marcati. Se piu' tag
 * dicono cose diverse vale la peggiore (prudenza). Valori sconosciuti: ignorati.
 * @returns {{livello: string|null, da: string[]}}
 */
export function qualita(tags) {
  const t = tags || {};
  const voti = [];
  const da = [];
  for (const [k, tabella] of [['tracktype', DA_TRACKTYPE], ['smoothness', DA_SMOOTHNESS], ['surface', DA_SURFACE]]) {
    const v = typeof t[k] === 'string' ? t[k] : null;
    if (v && Object.prototype.hasOwnProperty.call(tabella, v)) { voti.push(tabella[v]); da.push(k + '=' + v); }
  }
  if (!voti.length) return { livello: null, da };
  const peggiore = voti.reduce((a, b) => (ORDINE_QUALITA.indexOf(b) > ORDINE_QUALITA.indexOf(a) ? b : a));
  return { livello: peggiore, da };
}

const PERMESSI = new Set(['yes', 'permissive', 'designated', 'official']);
const LIMITATI = new Set(['destination', 'customers', 'delivery', 'agricultural', 'forestry', 'agricultural;forestry',
  'forestry;agricultural', 'permit', 'discouraged', 'emergency', 'use_sidepath']);

/**
 * Accesso ai veicoli a motore secondo i tag OSM, dal piu' specifico al piu'
 * generale (motorcar, motor_vehicle, vehicle, access). Nessun tag = "non
 * indicato": NON si deduce un permesso dal tipo di strada.
 * @returns {{stato: string, tag: string|null, condizionato: string|null}}
 */
export function accessoMotore(tags) {
  const t = tags || {};
  const condizionato = testoPulito(t['motor_vehicle:conditional'] || t['access:conditional'] || null);
  for (const k of ['motorcar', 'motor_vehicle', 'vehicle', 'access']) {
    const v = typeof t[k] === 'string' ? t[k].trim() : '';
    if (!v) continue;
    let stato;
    if (PERMESSI.has(v)) stato = ACCESSO.PERMESSO;
    else if (v === 'no') stato = ACCESSO.VIETATO;
    else if (v === 'private') stato = ACCESSO.PRIVATO;
    else if (LIMITATI.has(v)) stato = ACCESSO.LIMITATO;
    else stato = ACCESSO.LIMITATO;          // valore insolito: non e' un "si'"
    return { stato, tag: k + '=' + v, condizionato };
  }
  return { stato: ACCESSO.NON_INDICATO, tag: null, condizionato };
}

/** Accesso motorizzato ristretto (vietato, privato o limitato): da segnare bene sulla mappa. */
export function ristretta(tags) {
  if (categoria(tags) === CATEGORIA.SENTIERO) return false;
  const s = accessoMotore(tags).stato;
  return s === ACCESSO.VIETATO || s === ACCESSO.PRIVATO || s === ACCESSO.LIMITATO;
}

export function passaFiltro(tags, filtro) {
  const c = categoria(tags);
  if (!c) return false;
  if (filtro === FILTRO.PISTE) return c !== CATEGORIA.SENTIERO;
  if (filtro === FILTRO.SENTIERI) return c === CATEGORIA.SENTIERO;
  return true;
}

export function filtroValido(f) {
  return Object.values(FILTRO).includes(f) ? f : FILTRO.TUTTI;
}

// ---------------------------------------------------------------- livello di dettaglio e tasselli (VCO1)
/* A zoom 12-13 un tassello di Verbania ha 1500 vie: vie dei paesi, vie di
   servizio e marciapiedi coprirebbero la carta e peserebbero sul telefono.
   Lontano si vedono piste, sentieri e strade di collegamento; da zoom 14
   anche il dettaglio dei paesi e le sbarre. Il dato resta lo stesso. */
export const ZOOM_DETTAGLIO_PISTE = 14;
const DETTAGLIO_VICINO = new Set(['residential', 'service', 'living_street', 'pedestrian', 'footway', 'steps', 'cycleway']);

export function visibileAZoom(tags, zoom) {
  if (zoom < ZOOM_MINIMO_PISTE) return false;
  if (zoom >= ZOOM_DETTAGLIO_PISTE) return true;
  if (tags && tags.elemento === 'barriera') return false;
  return !DETTAGLIO_VICINO.has(highwayBase(tags && tags.highway));
}

/** Nome di un tassello come lo scrive tools/osm-piste-vco1.mjs ("9_6"): nient'altro entra in un URL. */
export function chiaveTasselloValida(k) {
  return typeof k === 'string' && /^\d{1,3}_\d{1,3}$/.test(k);
}

/**
 * Tasselli del pacchetto che toccano il riquadro (gradi). Solo quelli che
 * esistono nell'indice: fuori dal CA non si chiede niente.
 * @param {{origine:number[], cella:{dLon:number,dLat:number}, tasselli:object}} pac
 */
export function tasselliNelRiquadro(pac, { ovest, sud, est, nord }) {
  if (!pac || !Array.isArray(pac.origine) || !pac.cella || !pac.tasselli) return [];
  const [lon0, lat0] = pac.origine;
  const { dLon, dLat } = pac.cella;
  if (!(dLon > 0 && dLat > 0)) return [];
  const i0 = Math.floor((ovest - lon0) / dLon), i1 = Math.floor((est - lon0) / dLon);
  const j0 = Math.floor((sud - lat0) / dLat), j1 = Math.floor((nord - lat0) / dLat);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) return [];          // riquadro assurdo: niente
  const out = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = i + '_' + j;
    if (Object.prototype.hasOwnProperty.call(pac.tasselli, k) && chiaveTasselloValida(k)) out.push(k);
  }
  return out;
}

/** Il riquadro tocca il bbox del pacchetto? [ovest, sud, est, nord] */
export function riquadroInCopertura(pac, { ovest, sud, est, nord }) {
  const b = pac && pac.copertura && pac.copertura.bbox;
  if (!Array.isArray(b) || b.length !== 4) return false;
  return !(est < b[0] || ovest > b[2] || nord < b[1] || sud > b[3]);
}

// ---------------------------------------------------------------- stile
export const COLORI_PISTE = Object.freeze({
  carrabile: '#ffd54f',     // giallo strada
  pista: '#8d4a1f',         // marrone pista forestale
  sentiero: '#1a1a1a',      // nero tratteggiato, come sulle carte escursionistiche
  bordoScuro: '#2b1d0e',
  bordoChiaro: '#fff8e1',
  ristretta: '#d500f9'      // magenta: NON il rosso, che sulla mappa vuol dire divieto di caccia
});

/* SFONDO FOTO (VCO1 mappe pro, 13/10/2026). Sulla foto aerea (bosco scuro,
   prati, roccia) il marrone della pista e il nero del sentiero spariscono:
   restano leggibili solo grazie al bordo chiaro, che a sua volta si confonde
   con strade e radure. Sulla foto si inverte: linee CHIARE su bordo SCURO.
   Stesse forme (pieno/lineette/puntini, tratteggio del sentiero), stesso
   magenta per l'accesso ristretto: cambia solo il contrasto. */
export const SFONDO_PISTE = Object.freeze({ CARTA: 'carta', FOTO: 'foto' });
export const COLORI_PISTE_FOTO = Object.freeze({
  carrabile: '#ffe082',
  pista: '#ffb366',         // arancio chiaro: la stessa "pista" del marrone, leggibile sul bosco
  sentiero: '#ffffff',
  bordo: '#14100b'
});

/** Mappe base fotografiche: la resa delle piste passa allo stile "foto". */
export function sfondoDiBase(idBase) {
  return idBase === 'aerea' || idBase === 'ibrida' || idBase === 'google-satellite' ? SFONDO_PISTE.FOTO : SFONDO_PISTE.CARTA;
}

function spessoreZoom(zoom) {
  return zoom >= 17 ? 1.6 : zoom >= 15 ? 1.25 : zoom >= 14 ? 1 : 0.8;
}

/** Fascia di zoom dello spessore: si ristilizza solo quando cambia (z16 conta per le sbarre del «Leggibile»). */
export function fasciaZoomPiste(zoom) {
  return zoom >= 17 ? 4 : zoom >= 16 ? 3 : zoom >= 15 ? 2 : zoom >= 14 ? 1 : 0;
}

/**
 * Stile della linea e del suo bordo. Il bordo stacca la linea da qualunque
 * sfondo (carta, terreno, foto aerea); e' magenta quando l'accesso ai mezzi
 * a motore risulta ristretto nei tag.
 * @param {string} sfondo  SFONDO_PISTE.CARTA (predefinito) o FOTO
 * @returns {{linea: object, bordo: object}}
 */
export function stilePista(tags, zoom = 15, sfondo = SFONDO_PISTE.CARTA) {
  const k = spessoreZoom(zoom);
  const c = categoria(tags);
  const chiusa = ristretta(tags);
  const foto = sfondo === SFONDO_PISTE.FOTO;
  let linea, bordo;
  if (c === CATEGORIA.CARRABILE) {
    linea = { color: foto ? COLORI_PISTE_FOTO.carrabile : COLORI_PISTE.carrabile, weight: 3.5 * k, dashArray: null };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : COLORI_PISTE.bordoScuro, weight: 3.5 * k + 3 };
  } else if (c === CATEGORIA.PISTA) {
    const q = qualita(tags).livello;
    // tratto per qualita': pieno spesso / lineette / puntini; non indicata = pieno sottile
    const dash = q === QUALITA.MEDIA ? '10 5' : q === QUALITA.PRECARIA ? '3 5' : null;
    const w = q === QUALITA.BUONA ? 4 : q ? 3.5 : 2.5;
    linea = { color: foto ? COLORI_PISTE_FOTO.pista : COLORI_PISTE.pista, weight: w * k, dashArray: dash };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : COLORI_PISTE.bordoChiaro, weight: w * k + 3, dashArray: null };
  } else {
    linea = { color: foto ? COLORI_PISTE_FOTO.sentiero : COLORI_PISTE.sentiero, weight: 2 * k, dashArray: '6 4' };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : COLORI_PISTE.bordoChiaro, weight: 2 * k + 2.5, dashArray: null };
  }
  if (chiusa) bordo = { ...bordo, color: COLORI_PISTE.ristretta, weight: bordo.weight + 1.5 };
  return {
    linea: { ...linea, opacity: 1, lineCap: linea.dashArray ? 'butt' : 'round', lineJoin: 'round' },
    bordo: { ...bordo, opacity: chiusa ? 0.95 : foto ? 0.85 : 0.8, lineCap: 'round', lineJoin: 'round' }
  };
}

/* STILE «LEGGIBILE» (mappa leggibile, 14/10/2026), predefinito dalla 0.23.34.
   Con piste, sentieri, rilievo e curve accesi la carta sembrava un «albero di
   Natale»: linee spesse e sature con bordi pesanti coprivano nomi e terreno.
   Stesse linee, stesse forme, meno inchiostro:
     - strade principali giallo pallido, strade minori BIANCHE con bordo grigio
       sottile (come sulle carte escursionistiche);
     - piste marrone meno saturo e piu' sottili, tratto per qualita' invariato
       (pieno / lineette / puntini);
     - sentieri sottili tratteggiati, bruno scuro invece del nero;
     - accesso motorizzato ristretto: bordo MAGENTA sempre, solo piu' fine
       (resta l'unico magenta: identificazione univoca);
     - spessori che crescono con lo zoom; lontano (z12-13) le linee sono piu'
       tenui, da vicino piu' piene.
   «Dettagliato» = lo stile v66 qui sopra, invariato, a due tocchi dal pannello Layer. */
export const STILE_PERCORSI = Object.freeze({ LEGGIBILE: 'leggibile', DETTAGLIATO: 'dettagliato' });
export const STILE_PERCORSI_PREDEFINITO = STILE_PERCORSI.LEGGIBILE;
export const stilePercorsiValido = (s) => (Object.values(STILE_PERCORSI).includes(s) ? s : STILE_PERCORSI_PREDEFINITO);

export const COLORI_PISTE_LEGGIBILE = Object.freeze({
  principale: '#f6d77a',       // strada principale/provinciale: giallo pallido
  bordoPrincipale: '#a3843a',
  minore: '#ffffff',           // strada minore: bianca
  bordoMinore: '#8f8778',
  pista: '#97683e',            // marrone pista, meno saturo del v66
  sentiero: '#4b3a2c',         // bruno scuro, non nero
  bordoChiaro: '#fffaf0'
});
const PRINCIPALI = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

function spessoreLeggibile(zoom) {
  return zoom >= 17 ? 1.45 : zoom >= 15 ? 1.1 : zoom >= 14 ? 0.92 : 0.78;
}

/** Stile «Leggibile» (stesse chiavi di stilePista). */
export function stilePistaLeggibile(tags, zoom = 15, sfondo = SFONDO_PISTE.CARTA) {
  const k = spessoreLeggibile(zoom);
  const c = categoria(tags);
  const chiusa = ristretta(tags);
  const foto = sfondo === SFONDO_PISTE.FOTO;
  const lontano = zoom < ZOOM_DETTAGLIO_PISTE;
  let linea, bordo;
  if (c === CATEGORIA.CARRABILE) {
    const principale = PRINCIPALI.has(highwayBase(tags && tags.highway));
    const w = (principale ? 2.8 : 2.1) * k;
    linea = { color: foto ? COLORI_PISTE_FOTO.carrabile : principale ? COLORI_PISTE_LEGGIBILE.principale : COLORI_PISTE_LEGGIBILE.minore, weight: w, dashArray: null };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : principale ? COLORI_PISTE_LEGGIBILE.bordoPrincipale : COLORI_PISTE_LEGGIBILE.bordoMinore, weight: w + 1.5 };
  } else if (c === CATEGORIA.PISTA) {
    const q = qualita(tags).livello;
    const dash = q === QUALITA.MEDIA ? '7 4' : q === QUALITA.PRECARIA ? '2 4' : null;
    const w = (q === QUALITA.BUONA ? 2.3 : q ? 2.05 : 1.7) * k;
    linea = { color: foto ? COLORI_PISTE_FOTO.pista : COLORI_PISTE_LEGGIBILE.pista, weight: w, dashArray: dash };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : COLORI_PISTE_LEGGIBILE.bordoChiaro, weight: w + 1.6, dashArray: null };
  } else {
    const w = 1.3 * k;
    linea = { color: foto ? COLORI_PISTE_FOTO.sentiero : COLORI_PISTE_LEGGIBILE.sentiero, weight: w, dashArray: '4 3' };
    bordo = { color: foto ? COLORI_PISTE_FOTO.bordo : COLORI_PISTE_LEGGIBILE.bordoChiaro, weight: w + 1.4, dashArray: null };
  }
  if (chiusa) bordo = { ...bordo, color: COLORI_PISTE.ristretta, weight: linea.weight + 2.4 };
  return {
    linea: { ...linea, opacity: lontano ? 0.85 : 1, lineCap: linea.dashArray ? 'butt' : 'round', lineJoin: 'round' },
    bordo: { ...bordo, opacity: chiusa ? 0.85 : foto ? 0.7 : 0.5, lineCap: 'round', lineJoin: 'round' }
  };
}

/* SULLE CARTE REGIONALI (Mappa e Terreno, giro finale 14/10/2026). La carta
   stampa gia' strade, piste e sentieri: le nostre linee OSM ci corrono sopra a
   pochi metri e la carta sembrava «sporca» (schermate v69 a Trarego). Nel
   «Leggibile» le nostre linee restano TUTTE, stesse forme e colori, ma piu'
   tenui e con il bordo chiaro quasi assente; il bordo MAGENTA dell'accesso
   ristretto resta pieno com'era. Foto, Offline e «Dettagliato»: invariati. */
export const ATTENUA_CARTA_REGIONALE = Object.freeze({ linea: 0.72, sentiero: 0.66, bordo: 0.3, spessore: 0.9 });

function suCartaRegionale(st, tags) {
  const a = ATTENUA_CARTA_REGIONALE;
  const sentiero = categoria(tags) === CATEGORIA.SENTIERO;
  const chiusa = ristretta(tags);
  return {
    linea: { ...st.linea, weight: st.linea.weight * a.spessore, opacity: st.linea.opacity * (sentiero ? a.sentiero : a.linea) },
    bordo: chiusa ? st.bordo : { ...st.bordo, weight: st.linea.weight * a.spessore + (st.bordo.weight - st.linea.weight) * 0.8, opacity: a.bordo }
  };
}

/** Stile della linea secondo la scelta «Stile percorsi» (e la base: carta regionale = linee piu' tenui). */
export function stilePercorso(tags, zoom, sfondo, stile = STILE_PERCORSI_PREDEFINITO, { cartaRegionale = false } = {}) {
  if (stile === STILE_PERCORSI.DETTAGLIATO) return stilePista(tags, zoom, sfondo);
  const st = stilePistaLeggibile(tags, zoom, sfondo);
  return cartaRegionale && sfondo !== SFONDO_PISTE.FOTO ? suCartaRegionale(st, tags) : st;
}

/** Pallino di sbarre e cancelli: sempre magenta pieno con bordo bianco; nel «Leggibile» piu' piccolo lontano. */
export function stileBarriera(zoom = 15, stile = STILE_PERCORSI_PREDEFINITO) {
  if (stile === STILE_PERCORSI.DETTAGLIATO) return { radius: 6, weight: 2 };
  return zoom >= 16 ? { radius: 5.5, weight: 1.8 } : zoom >= 15 ? { radius: 4.5, weight: 1.6 } : { radius: 3.5, weight: 1.4 };
}

// ---------------------------------------------------------------- scheda
const NOMI_HIGHWAY = {
  track: 'pista / strada forestale', path: 'sentiero', footway: 'percorso pedonale', bridleway: 'mulattiera',
  steps: 'scalinata', cycleway: 'ciclabile', pedestrian: 'area pedonale', via_ferrata: 'via ferrata',
  service: 'strada di servizio', residential: 'strada residenziale', unclassified: 'strada minore',
  tertiary: 'strada locale', secondary: 'strada provinciale/secondaria', primary: 'strada principale',
  trunk: 'superstrada', motorway: 'autostrada', living_street: 'zona residenziale', road: 'strada (tipo non indicato)'
};
const NOMI_SURFACE = {
  asphalt: 'asfalto', paved: 'pavimentato', concrete: 'cemento', 'concrete:plates': 'lastre di cemento',
  paving_stones: 'autobloccanti', sett: 'pietra squadrata', compacted: 'terra battuta compatta', fine_gravel: 'ghiaietto',
  gravel: 'ghiaia', unpaved: 'sterrato', pebblestone: 'ciottoli', cobblestone: 'acciottolato', unhewn_cobblestone: 'acciottolato grezzo',
  ground: 'terreno naturale', dirt: 'terra', earth: 'terra', grass: 'erba', mud: 'fango', sand: 'sabbia',
  rock: 'roccia', stone: 'pietra', wood: 'legno'
};
const NOMI_ACCESSO = {
  [ACCESSO.PERMESSO]: 'consentito secondo OSM',
  [ACCESSO.VIETATO]: 'vietato secondo OSM',
  [ACCESSO.PRIVATO]: 'privato secondo OSM',
  [ACCESSO.LIMITATO]: 'limitato secondo OSM',
  [ACCESSO.NON_INDICATO]: 'non indicato — non verificato'
};
const NOMI_QUALITA = { [QUALITA.BUONA]: 'buona', [QUALITA.MEDIA]: 'media', [QUALITA.PRECARIA]: 'precaria' };
const NOMI_BARRIERE = { gate: 'cancello', lift_gate: 'sbarra', swing_gate: 'cancello a battente', bollard: 'paletti',
  chain: 'catena', block: 'blocchi', fence: 'recinzione', cattle_grid: 'griglia per bestiame', stile: 'scaletta', kissing_gate: 'passaggio pedonale' };

export const AVVISO_PISTE = 'Dato OpenStreetMap: non dice se oggi si passa né se il transito è consentito. Le norme locali prevalgono.';

/**
 * Contenuto della scheda di un percorso, come righe di testo (il DOM lo fa la mappa).
 * @returns {{titolo: string, stato: string, ristretta: boolean, sintesi: Array<[string,string]>, dettaglio: Array<[string,string]>, avviso: string, link: string|null}}
 */
export function schedaPista(props) {
  const p = props || {};
  const c = categoria(p);
  const q = qualita(p);
  const a = accessoMotore(p);
  const nome = testoPulito(p.name);
  const ref = testoPulito(p.ref, 30);
  const tipo = NOMI_HIGHWAY[highwayBase(p.highway)] || 'via';
  const titolo = nome ? nome + (ref ? ' (' + ref + ')' : '') : ref || (tipo.charAt(0).toUpperCase() + tipo.slice(1) + ' senza nome');
  const intestazione = c === CATEGORIA.CARRABILE ? 'STRADA CARRABILE' : c === CATEGORIA.PISTA ? 'PISTA FORESTALE' : 'SENTIERO / PERCORSO PEDONALE';
  const stato = c === CATEGORIA.PISTA
    ? intestazione + ' · ' + (q.livello ? 'qualità ' + NOMI_QUALITA[q.livello] : 'qualità non verificata')
    : intestazione;
  const fondo = p.surface ? (NOMI_SURFACE[p.surface] || p.surface) : 'non indicato';
  const sintesi = [['Tipo', tipo + ' (highway=' + (p.highway || '?') + ')'], ['Fondo', fondo]];
  if (c !== CATEGORIA.SENTIERO) {
    sintesi.push(['Mezzi a motore', NOMI_ACCESSO[a.stato] + (a.tag ? ' (' + a.tag + ')' : '')]);
  }
  const dettaglio = [];
  if (c !== CATEGORIA.SENTIERO) dettaglio.push(['Qualità', q.livello ? NOMI_QUALITA[q.livello] + ' (da ' + q.da.join(', ') + ')' : 'non verificata: tracktype, smoothness e surface mancano']);
  if (p.tracktype) dettaglio.push(['Tracktype', p.tracktype]);
  if (p.smoothness) dettaglio.push(['Smoothness', p.smoothness]);
  if (p.width) dettaglio.push(['Larghezza', p.width + ' m (dichiarata)']);
  if (p['4wd_only'] === 'yes') dettaglio.push(['Solo fuoristrada', 'sì (4wd_only=yes)']);
  if (a.condizionato) dettaglio.push(['Accesso condizionato', a.condizionato]);
  if (c === CATEGORIA.SENTIERO) dettaglio.push(['Mezzi a motore', NOMI_ACCESSO[a.stato] + (a.tag ? ' (' + a.tag + ')' : '')]);
  if (p.foot) dettaglio.push(['A piedi', p.foot]);
  if (p.sac_scale) dettaglio.push(['Difficoltà (sac_scale)', p.sac_scale]);
  if (p.barrier) dettaglio.push(['Barriera sulla via', NOMI_BARRIERE[p.barrier] || p.barrier]);
  const barriere = Array.isArray(p.barriere) ? p.barriere : [];
  if (barriere.length) {
    dettaglio.push(['Sbarre/cancelli segnati', barriere.map((b) => (NOMI_BARRIERE[b.barrier] || b.barrier) +
      (b.access || b.motor_vehicle ? ' (' + (b.motor_vehicle ? 'motor_vehicle=' + b.motor_vehicle : 'access=' + b.access) + ')' : '')).join('; ')]);
  }
  const id = Number.isSafeInteger(p.id) && p.id > 0 ? p.id : null;
  dettaglio.push(['Fonte', '© OpenStreetMap contributors, ODbL' + (id ? ' · way ' + id : '')]);
  return { titolo, stato, ristretta: ristretta(p), sintesi, dettaglio, avviso: AVVISO_PISTE,
    link: id ? 'https://www.openstreetmap.org/way/' + id : null };
}

/** Scheda di una sbarra/cancello (nodo OSM con barrier=*). */
export function schedaBarriera(props) {
  const p = props || {};
  const tipo = NOMI_BARRIERE[p.barrier] || p.barrier || 'barriera';
  const a = accessoMotore(p);
  const id = Number.isSafeInteger(p.id) && p.id > 0 ? p.id : null;
  const dettaglio = [];
  if (p.locked) dettaglio.push(['Chiuso a chiave', p.locked]);
  dettaglio.push(['Fonte', '© OpenStreetMap contributors, ODbL' + (id ? ' · node ' + id : '')]);
  return {
    titolo: (tipo.charAt(0).toUpperCase() + tipo.slice(1)) + (p.name ? ' · ' + p.name : ''),
    stato: 'SBARRA / CANCELLO SEGNATO IN OSM', ristretta: true,
    sintesi: [['Tipo', tipo + ' (barrier=' + (p.barrier || '?') + ')'], ['Mezzi a motore', NOMI_ACCESSO[a.stato] + (a.tag ? ' (' + a.tag + ')' : '')]],
    dettaglio, avviso: 'Se è aperto o chiuso oggi, la mappa non lo sa.',
    link: id ? 'https://www.openstreetmap.org/node/' + id : null
  };
}

// ---------------------------------------------------------------- conversione OSM -> GeoJSON
function coordinata(n) {
  return Math.round(n * 1e6) / 1e6;
}
function puntoOk(g) {
  return g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180;
}

/**
 * Risposta JSON di Overpass (`out body geom` per le vie, `out body` per i
 * nodi barriera) -> FeatureCollection deterministica (ordinata per id).
 * Scarta tutto cio' che non e' una via highway riconosciuta con almeno due
 * punti validi. Non inventa nulla: geometrie e tag sono quelli della fonte.
 */
export function osmAGeoJson(dati, { maxElementi = 200000 } = {}) {
  if (!dati || typeof dati !== 'object' || !Array.isArray(dati.elements)) throw new Error('Risposta OSM non valida: manca "elements"');
  if (dati.elements.length > maxElementi) throw new Error('Risposta OSM troppo grande: ' + dati.elements.length + ' elementi');
  const barriere = new Map();
  for (const e of dati.elements) {
    if (!e || e.type !== 'node' || !Number.isSafeInteger(e.id) || !e.tags || typeof e.tags.barrier !== 'string') continue;
    if (!puntoOk(e)) continue;
    barriere.set(e.id, { id: e.id, lat: coordinata(e.lat), lon: coordinata(e.lon), ...soloTag(e.tags, TAG_BARRIERA) });
  }
  const vie = [];
  const usate = new Set();
  let scartate = 0;
  for (const e of dati.elements) {
    if (!e || e.type !== 'way') continue;
    if (!Number.isSafeInteger(e.id) || !e.tags || !categoria(e.tags) || !Array.isArray(e.geometry)) { scartate++; continue; }
    const coords = e.geometry.filter(puntoOk).map((g) => [coordinata(g.lon), coordinata(g.lat)]);
    if (coords.length < 2 || coords.length !== e.geometry.length) { scartate++; continue; }
    const props = { id: e.id, ...soloTag(e.tags, TAG_CONSERVATI) };
    const sue = (Array.isArray(e.nodes) ? e.nodes : []).filter((n) => barriere.has(n));
    if (sue.length) {
      props.barriere = [...new Set(sue)].map((n) => { const b = barriere.get(n); usate.add(n); return { id: b.id, barrier: b.barrier, ...(b.access ? { access: b.access } : {}), ...(b.motor_vehicle ? { motor_vehicle: b.motor_vehicle } : {}) }; });
    }
    vie.push({ type: 'Feature', id: 'w' + e.id, properties: props, geometry: { type: 'LineString', coordinates: coords } });
  }
  vie.sort((a, b) => a.properties.id - b.properties.id);
  const punti = [...usate].sort((a, b) => a - b).map((n) => {
    const b = barriere.get(n);
    const { lat, lon, ...resto } = b;
    return { type: 'Feature', id: 'n' + n, properties: { ...resto, elemento: 'barriera' }, geometry: { type: 'Point', coordinates: [lon, lat] } };
  });
  return { collezione: { type: 'FeatureCollection', features: [...vie, ...punti] }, scartate };
}

// ---------------------------------------------------------------- lettura sicura nella mappa
/**
 * Testo del file -> collezione pulita. Lancia con un messaggio chiaro se il
 * file e' troppo grande, non e' JSON o non e' una FeatureCollection. Le
 * feature sbagliate si scartano; delle proprieta' restano solo i tag noti.
 */
export function leggiPisteOsm(testo) {
  if (typeof testo !== 'string') throw new Error('file piste non leggibile');
  if (testo.length > LIMITE_BYTE_PISTE) throw new Error('file piste troppo grande (' + Math.round(testo.length / 1024) + ' kB)');
  let dati;
  try { dati = JSON.parse(testo); } catch { throw new Error('file piste non è JSON valido'); }
  if (!dati || dati.type !== 'FeatureCollection' || !Array.isArray(dati.features)) throw new Error('file piste non è una FeatureCollection');
  if (dati.features.length > LIMITE_FEATURE_PISTE) throw new Error('file piste con troppe feature');
  const valide = [];
  let scartate = 0;
  for (const f of dati.features) {
    const pulita = featurePulita(f);
    if (pulita) valide.push(pulita); else scartate++;
  }
  return { collezione: { type: 'FeatureCollection', features: valide }, scartate };
}

function featurePulita(f) {
  if (!f || f.type !== 'Feature' || !f.geometry || !f.properties || typeof f.properties !== 'object') return null;
  const g = f.geometry;
  const ok = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  const id = Number.isSafeInteger(f.properties.id) && f.properties.id > 0 ? f.properties.id : null;
  if (!id) return null;
  if (g.type === 'LineString') {
    if (!Array.isArray(g.coordinates) || g.coordinates.length < 2 || !g.coordinates.every(ok)) return null;
    const props = { id, ...soloTag(f.properties, TAG_CONSERVATI) };
    if (!categoria(props)) return null;
    if (Array.isArray(f.properties.barriere)) {
      props.barriere = f.properties.barriere.slice(0, 20)
        .filter((b) => b && Number.isSafeInteger(b.id))
        .map((b) => ({ id: b.id, ...soloTag(b, ['barrier', 'access', 'motor_vehicle']) }));
    }
    return { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: g.coordinates.map((p) => [p[0], p[1]]) } };
  }
  if (g.type === 'Point' && f.properties.elemento === 'barriera') {
    if (!ok(g.coordinates)) return null;
    const props = { id, elemento: 'barriera', ...soloTag(f.properties, TAG_BARRIERA) };
    if (!props.barrier) return null;
    return { type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [g.coordinates[0], g.coordinates[1]] } };
  }
  return null;
}

// ---------------------------------------------------------------- qualita' del dato
function lunghezzaKm(coords) {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lo1, la1] = coords[i - 1], [lo2, la2] = coords[i];
    const r = Math.PI / 180;
    const x = (lo2 - lo1) * r * Math.cos(((la1 + la2) / 2) * r), y = (la2 - la1) * r;
    m += Math.sqrt(x * x + y * y) * 6371008.8;
  }
  return m / 1000;
}

/** Conteggi per il report e per i metadati: quanti segmenti, quanti con fondo/accesso/qualita' indicati. */
export function statistiche(collezione) {
  const s = {
    vie: 0, km: 0, barriere: 0,
    perCategoria: { carrabile: 0, pista: 0, sentiero: 0 },
    kmPerCategoria: { carrabile: 0, pista: 0, sentiero: 0 },
    perHighway: {},
    piste: { conQualita: 0, senzaQualita: 0, buona: 0, media: 0, precaria: 0, conTracktype: 0 },
    senzaFondo: 0, senzaAccessoMotore: 0, senzaAccessoMotoreCarrabiliPiste: 0, ristrette: 0, conNome: 0
  };
  for (const f of (collezione && collezione.features) || []) {
    const p = f.properties || {};
    if (p.elemento === 'barriera') { s.barriere++; continue; }
    const c = categoria(p);
    if (!c) continue;
    const km = lunghezzaKm(f.geometry.coordinates);
    s.vie++; s.km += km;
    s.perCategoria[c]++; s.kmPerCategoria[c] += km;
    s.perHighway[p.highway] = (s.perHighway[p.highway] || 0) + 1;
    if (!p.surface) s.senzaFondo++;
    const a = accessoMotore(p).stato;
    if (a === ACCESSO.NON_INDICATO) { s.senzaAccessoMotore++; if (c !== CATEGORIA.SENTIERO) s.senzaAccessoMotoreCarrabiliPiste++; }
    if (ristretta(p)) s.ristrette++;
    if (p.name || p.ref) s.conNome++;
    if (c === CATEGORIA.PISTA) {
      const q = qualita(p).livello;
      if (q) { s.piste.conQualita++; s.piste[q]++; } else s.piste.senzaQualita++;
      if (p.tracktype) s.piste.conTracktype++;
    }
  }
  const tondo = (x) => Math.round(x * 100) / 100;
  s.km = tondo(s.km);
  for (const k of Object.keys(s.kmPerCategoria)) s.kmPerCategoria[k] = tondo(s.kmPerCategoria[k]);
  return s;
}
