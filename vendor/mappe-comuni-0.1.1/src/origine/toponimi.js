// ORIGINE: Adrenalina battuta-live/shared/toponimi.js (commit c6586b6636, SHA-256 fonte 3825d468cd6d5a25…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: nomi di paesi, alpeggi e cime (anticollisione).
// Sostituzioni: nessuna (copia identica).
// NOMI DI PAESI, FRAZIONI, ALPEGGI E CIME SULLA MAPPA (mappa leggibile, 14/10/2026).
//
// Perche': sulle carte regionali (Mappa, Terreno) i nomi sono scritti DENTRO
// le immagini, piccoli e grigi; con piste, rilievo e curve accesi non si
// leggono, e molti alpeggi (Alpe Busé, Alpe Laman) non ci sono proprio.
// Un'immagine non si puo' ristilizzare: i nomi si mettono SOPRA, da un dato
// vero e geolocalizzato, con alone chiaro, dimensioni diverse per tipo e
// senza sovrapposizioni.
//
// FONTE UNICA: OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0),
// estratto Geofabrik «Italy / Nord-Ovest» dell'11/10/2026, lo stesso delle
// piste (tools/osm-toponimi-vco.mjs). Si prendono SOLO:
//   place=town/city/village                       -> paese
//   place=hamlet/suburb/neighbourhood/quarter     -> frazione
//   place=locality/isolated_dwelling/farm         -> localita' (alpe se il nome
//                                                    comincia con Alpe/Alpi/Alp)
//   natural=peak con nome e/o ele                  -> cima
// Nomi e quote sono quelli dei tag: nessun nome aggiunto a mano, nessuna quota
// presa dal DTM o stimata. Una cima senza ele numerico in metri non ha quota;
// una cima senza nome e senza ele non c'e'.
//
// Modulo puro (niente DOM, niente Leaflet): lo usano lo script che produce
// il file, la mappa e i test.

export const TIPO = Object.freeze({ PAESE: 'paese', FRAZIONE: 'frazione', ALPE: 'alpe', LOCALITA: 'localita', CIMA: 'cima' });
const TIPI = new Set(Object.values(TIPO));

const PAESI = new Set(['city', 'town', 'village']);
const FRAZIONI = new Set(['hamlet', 'suburb', 'neighbourhood', 'quarter']);
const LOCALITA = new Set(['locality', 'isolated_dwelling', 'farm']);
const NOME_ALPE = /^alp(e|i|eggio)?\b/i;

/** Quote ammesse (m s.l.m.): fuori da qui il tag e' sbagliato e la quota non si mostra. */
export const QUOTA_MIN = 100;
export const QUOTA_MAX = 4810;
const MAX_NOME = 60;

export const ATTRIBUZIONE_NOMI = 'Nomi e quote © OpenStreetMap contributors, ODbL';
/** Credito sulla mappa (corto: la riga sta sopra la scala). Testo fisso, nessun dato dentro. */
export const ATTRIBUZIONE_NOMI_HTML = 'Nomi © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ODbL';

/** Nome pulito: stringa senza caratteri di controllo, corta. Mai HTML (si mostra con textContent). */
export function nomePulito(v) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > MAX_NOME ? s.slice(0, MAX_NOME - 1) + '…' : s;
}

/**
 * Quota dal tag ele SOLO se e' un numero in metri ("1311", "1311.5", "1311 m").
 * Piedi, intervalli, testi: null (nessuna quota, non una stima).
 */
export function quotaDaTag(ele) {
  if (typeof ele !== 'string' && typeof ele !== 'number') return null;
  const s = String(ele).trim().replace(',', '.');
  const m = /^(\d{2,4}(?:\.\d+)?)(?:\s*m)?$/.exec(s);
  if (!m) return null;
  const q = Math.round(Number(m[1]));
  return q >= QUOTA_MIN && q <= QUOTA_MAX ? q : null;
}

/**
 * Tipo del punto dai tag OSM, oppure null se non va sulla mappa.
 * @returns {{tipo: string, sotto: string, nome: string|null, quota: number|null}|null}
 */
export function classifica(tags) {
  if (!tags || typeof tags !== 'object') return null;
  const nome = nomePulito(tags.name) || nomePulito(tags['name:it']);
  if (tags.natural === 'peak') {
    const quota = quotaDaTag(tags.ele);
    if (!nome && quota === null) return null;
    return { tipo: TIPO.CIMA, sotto: 'peak', nome, quota };
  }
  const p = typeof tags.place === 'string' ? tags.place : '';
  if (!nome || !p) return null;
  const quota = quotaDaTag(tags.ele);
  if (PAESI.has(p)) return { tipo: TIPO.PAESE, sotto: p, nome, quota };
  if (FRAZIONI.has(p) || LOCALITA.has(p)) {
    if (NOME_ALPE.test(nome)) return { tipo: TIPO.ALPE, sotto: p, nome, quota };
    return { tipo: FRAZIONI.has(p) ? TIPO.FRAZIONE : TIPO.LOCALITA, sotto: p, nome, quota };
  }
  return null;
}

/* QUANDO COMPARE UN NOME. «Sempre visibile» vuol dire al giusto zoom: a z10
   cento nomi non si leggono. Lontano solo i paesi, poi frazioni e cime alte,
   da z14 (scala ~500 m) alpeggi e cime, da z15 localita' minori e cime senza nome. */
export function zoomMinimo(p) {
  switch (p.t) {
    case TIPO.PAESE: return p.s === 'village' ? 12 : 10;
    case TIPO.FRAZIONE: return 13;
    case TIPO.ALPE: return 14;
    case TIPO.LOCALITA: return 15;
    case TIPO.CIMA: return !p.n ? 15 : p.q !== null && p.q >= 1000 ? 13 : 14;
    default: return 99;
  }
}

/** Priorita' (piu' bassa = piu' importante) nelle collisioni: prima i nomi dei luoghi, poi le quote. */
export function priorita(p) {
  switch (p.t) {
    case TIPO.PAESE: return p.s === 'village' ? 1 : 0;
    case TIPO.FRAZIONE: return 2;
    case TIPO.ALPE: return 3;
    case TIPO.CIMA: return p.n ? 4 : 6;
    case TIPO.LOCALITA: return 5;
    default: return 9;
  }
}

/** Ordine deterministico: priorita', poi cime piu' alte, poi nome, poi id. */
export function confronta(a, b) {
  return priorita(a) - priorita(b) || (b.q ?? -1) - (a.q ?? -1) || String(a.n || '').localeCompare(String(b.n || ''), 'it') || a.id - b.id;
}

/** Testo della quota: «1311 m». */
export const testoQuota = (q) => (Number.isFinite(q) ? q + ' m' : '');

// ---------------------------------------------------------------- file dell'app
/* Formato compatto (un CA intero pesa poco): una riga per punto
   [lon, lat, tipo, sottotipo, nome|null, quota|null, idOsm, n|w]
   n = nodo OSM, w = via OSM (area: centro dei vertici). */
export const LIMITE_BYTE_TOPONIMI = 2 * 1024 * 1024;
export const LIMITE_PUNTI_TOPONIMI = 40000;

/**
 * Testo del file -> punti puliti {lon, lat, t, s, n, q, id, el}. Lancia con un
 * messaggio chiaro se il file e' rotto; le righe sbagliate si scartano.
 */
export function leggiToponimi(testo) {
  if (typeof testo !== 'string') throw new Error('file dei nomi non leggibile');
  if (testo.length > LIMITE_BYTE_TOPONIMI) throw new Error('file dei nomi troppo grande');
  let dati;
  try { dati = JSON.parse(testo); } catch { throw new Error('file dei nomi non è JSON valido'); }
  if (!dati || dati.formato !== 1 || !Array.isArray(dati.punti)) throw new Error('file dei nomi in formato sconosciuto');
  if (dati.punti.length > LIMITE_PUNTI_TOPONIMI) throw new Error('file dei nomi con troppi punti');
  const punti = [];
  let scartati = 0;
  for (const r of dati.punti) {
    const p = rigaPulita(r);
    if (p) punti.push(p); else scartati++;
  }
  return { punti, scartati, fonte: dati.fonte || null };
}

function rigaPulita(r) {
  if (!Array.isArray(r) || r.length < 7) return null;
  const [lon, lat, t, s, n, q, id, el] = r;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
  if (!TIPI.has(t) || typeof s !== 'string' || !Number.isSafeInteger(id) || id <= 0) return null;
  const nome = n === null ? null : nomePulito(n);
  const quota = q === null || q === undefined ? null : (Number.isInteger(q) && q >= QUOTA_MIN && q <= QUOTA_MAX ? q : undefined);
  if (quota === undefined) return null;
  if (t === TIPO.CIMA ? !nome && quota === null : !nome) return null;
  return { lon, lat, t, s, n: nome, q: quota, id, el: el === 'w' ? 'w' : 'n' };
}

// ---------------------------------------------------------------- scelta delle etichette (anticollisione)
/* POSIZIONE DELL'ETICHETTA (rifinitura 14/10/2026). Un nome centrato sul
   suo punto finisce spesso proprio sopra la strada che attraversa il paese
   o porta all'alpeggio, e sembra tagliato dal percorso. Oltre al centro si
   provano pochi spostamenti piccoli (sopra, sotto, ai lati, in diagonale:
   al massimo ~20 px, il nome resta attaccato al suo punto e non indica un
   altro luogo) e si sceglie quello con meno linee sotto il testo. Il dato
   (lat/lon) non cambia: si sposta solo il disegno. Le cime no: il triangolo
   segna la vetta. */
export const SPOSTAMENTO_MAX_ETICHETTA = 20;
export const PESO_SPOSTAMENTO = 1.2;     // px di linea sotto il testo che "valgono" 1 px di spostamento
export const BONUS_POSIZIONE_ATTUALE = 8; // una etichetta gia' sulla mappa non salta per poco
/* Le localita' minori (e le quote senza nome) sono l'ultimo gradino: se anche
   nella posizione migliore piu' di meta' della loro larghezza resta sotto
   strade e sentieri (dentro un paese fitto di vie) non si scrivono a questo
   zoom — tornano avvicinando. Paesi, frazioni, alpeggi e cime con nome
   restano sempre, nella posizione piu' pulita. */
export const LINEA_MAX_MINORI = 0.5;
const minore = (p) => p.t === TIPO.LOCALITA || (p.t === TIPO.CIMA && !p.n);

/** Spostamenti candidati {dx, dy} (px) per un'etichetta w x h: il centro per primo. */
export function posizioniEtichetta(p, w, h) {
  if (!p || p.t === TIPO.CIMA) return [{ dx: 0, dy: 0 }];
  const v = Math.min(13, Math.round(h / 2 + 3));
  const o = Math.min(Math.round(Math.sqrt(SPOSTAMENTO_MAX_ETICHETTA ** 2 - v * v)), Math.round(w / 4));
  return [{ dx: 0, dy: 0 }, { dx: 0, dy: -v }, { dx: 0, dy: v }, { dx: -o, dy: 0 }, { dx: o, dy: 0 },
    { dx: -o, dy: -v }, { dx: o, dy: -v }, { dx: -o, dy: v }, { dx: o, dy: v }];
}

/**
 * Etichette da mostrare: candidate gia' proiettate sullo schermo, in ordine di
 * priorita'; una etichetta entra solo se il suo riquadro (piu' un margine) non
 * tocca quelli gia' presi e sta nello schermo. Nessun nome due volte vicino.
 * Con `costo` (px di linea sotto un rettangolo) e `c.posizioni` si prova anche
 * qualche piccolo spostamento e vince il piu' pulito; il centro a parita'.
 * @param {Array<{p: object, x: number, y: number, w: number, h: number, ax: number, ay: number,
 *         posizioni?: Array<{dx,dy}>, attuale?: {dx,dy}, testo?: {x0,y0,x1,y1}}>} candidate
 *        x,y = punto sullo schermo; w,h = dimensioni; ax,ay = ancora dentro il riquadro;
 *        testo = riquadro del solo testo relativo all'angolo dell'etichetta (per il costo)
 * @param {{larghezza: number, altezza: number, margine?: number, massimo?: number, occupate?: Array<{x0,y0,x1,y1}>,
 *         vietate?: Array<{x0,y0,x1,y1}>  (scritte della carta: escluse per tutti tranne le cime),
 *         costo?: (r: {x0,y0,x1,y1}, c: object) => number}} opz
 * @returns {Array} candidate scelte con r (riquadro), dx, dy (spostamento scelto)
 */
export function scegliEtichette(candidate, { larghezza, altezza, margine = 4, massimo = 60, occupate = [], vietate = [], costo = null } = {}) {
  const ordinate = [...candidate].sort((a, b) => confronta(a.p, b.p));
  const prese = [];
  const nomiVicini = [];
  const tocca = (r, q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0;
  for (const c of ordinate) {
    if (prese.length >= massimo) break;
    // stesso nome a meno di 120 px (paese come nodo e come area, doppioni OSM): uno solo
    if (c.p.n && nomiVicini.some((q) => q.n === c.p.n && Math.hypot(q.x - c.x, q.y - c.y) < 120)) continue;
    const posizioni = costo && Array.isArray(c.posizioni) && c.posizioni.length ? c.posizioni : [{ dx: 0, dy: 0 }];
    let migliore = null;
    for (const s of posizioni) {
      const x0 = c.x - c.ax + s.dx, y0 = c.y - c.ay + s.dy;
      const r = { x0: x0 - margine, y0: y0 - margine, x1: x0 + c.w + margine, y1: y0 + c.h + margine };
      if (r.x0 < 0 || r.y0 < 0 || r.x1 > larghezza || r.y1 > altezza) continue;
      // sotto un pulsante, la scala o i crediti un nome non si legge: si salta
      if (occupate.some((q) => tocca(r, q))) continue;
      // scritte stampate dalla carta regionale: un nome non ci va sopra; le cime si' (il triangolo e' la vetta, non si sposta)
      if (c.p.t !== TIPO.CIMA && vietate.some((q) => tocca(r, q))) continue;
      if (prese.some((q) => tocca(r, q.r))) continue;
      if (!costo) { migliore = { r, s, v: 0, linea: 0 }; break; }
      const t = c.testo || { x0: 0, y0: 0, x1: c.w, y1: c.h };
      const linea = costo({ x0: x0 + t.x0, y0: y0 + t.y0, x1: x0 + t.x1, y1: y0 + t.y1 }, c);
      let v = linea + PESO_SPOSTAMENTO * Math.hypot(s.dx, s.dy);
      if (c.attuale && (c.attuale.dx !== s.dx || c.attuale.dy !== s.dy)) v += BONUS_POSIZIONE_ATTUALE;
      if (!migliore || v < migliore.v - 1e-9) migliore = { r, s, v, linea };
    }
    if (!migliore) continue;
    if (costo && minore(c.p) && migliore.linea > LINEA_MAX_MINORI * c.w) continue;
    prese.push({ ...c, r: migliore.r, dx: migliore.s.dx, dy: migliore.s.dy });
    if (c.p.n) nomiVicini.push({ n: c.p.n, x: c.x, y: c.y });
  }
  return prese;
}

/* LINEE SOTTO IL TESTO. Griglia dei tratti di piste/strade/sentieri gia'
   proiettati sullo schermo: per un rettangolo restituisce i px di linea che
   lo attraversano (pesati con lo spessore). Celle da 32 px: poche centinaia
   di tratti da guardare per etichetta anche con migliaia di linee. */
export function grigliaLinee(tratti, cella = 32) {
  const celle = new Map();
  tratti.forEach((s, i) => {
    const [x0, y0, x1, y1] = s;
    const cx0 = Math.floor(Math.min(x0, x1) / cella), cx1 = Math.floor(Math.max(x0, x1) / cella);
    const cy0 = Math.floor(Math.min(y0, y1) / cella), cy1 = Math.floor(Math.max(y0, y1) / cella);
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 400) return;     // tratto enorme fuori schermo: non conta
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const k = cx + ',' + cy;
      const l = celle.get(k);
      if (l) l.push(i); else celle.set(k, [i]);
    }
  });
  return (r) => {
    const visti = new Set();
    let somma = 0;
    for (let cx = Math.floor(r.x0 / cella); cx <= Math.floor(r.x1 / cella); cx++) {
      for (let cy = Math.floor(r.y0 / cella); cy <= Math.floor(r.y1 / cella); cy++) {
        for (const i of celle.get(cx + ',' + cy) || []) {
          if (visti.has(i)) continue;
          visti.add(i);
          const s = tratti[i];
          const lg = lunghezzaDentro(s, r);
          if (lg > 0) somma += lg * Math.max(1, (s[4] || 2) / 2);
        }
      }
    }
    return somma;
  };
}

/* ALTRI LUOGHI SOTTO IL NOME. Un nome spostato sopra il punto di un altro
   luogo puo' far pensare al posto sbagliato, e li' la carta regionale ha
   spesso gia' il suo nome stampato nell'immagine (che non si puo' spostare):
   ogni punto di un ALTRO luogo dentro il testo (piu' un piccolo margine)
   costa come PENALITA_ALTRO_LUOGO px di linea. Il punto del nome stesso no. */
export const PENALITA_ALTRO_LUOGO = 30;
export function grigliaLuoghi(punti, cella = 48, margine = 6) {
  const celle = new Map();
  for (const q of punti) {
    const k = Math.floor(q.x / cella) + ',' + Math.floor(q.y / cella);
    const l = celle.get(k);
    if (l) l.push(q); else celle.set(k, [q]);
  }
  return (r, c) => {
    let n = 0;
    for (let cx = Math.floor((r.x0 - margine) / cella); cx <= Math.floor((r.x1 + margine) / cella); cx++) {
      for (let cy = Math.floor((r.y0 - margine) / cella); cy <= Math.floor((r.y1 + margine) / cella); cy++) {
        for (const q of celle.get(cx + ',' + cy) || []) {
          if (c && q.p === c.p) continue;
          if (q.x >= r.x0 - margine && q.x <= r.x1 + margine && q.y >= r.y0 - margine && q.y <= r.y1 + margine) n++;
        }
      }
    }
    return n * PENALITA_ALTRO_LUOGO;
  };
}

/** Px del tratto [x0,y0,x1,y1] dentro il rettangolo (Liang-Barsky). */
export function lunghezzaDentro([x0, y0, x1, y1], r) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, x0 - r.x0], [dx, r.x1 - x0], [-dy, y0 - r.y0], [dy, r.y1 - y0]]) {
    if (p === 0) { if (q < 0) return 0; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return 0; if (t > t0) t0 = t; } else { if (t < t0) return 0; if (t < t1) t1 = t; }
  }
  return (t1 - t0) * Math.hypot(dx, dy);
}
