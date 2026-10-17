// ORIGINE: Adrenalina battuta-live/shared/nomiCarta.js (commit c6586b6636, SHA-256 fonte 000f6027769b4756…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: nomi gia' stampati dalla carta regionale.
// Sostituzioni: nessuna (copia identica).
// NOMI GIA' SCRITTI DALLA MAPPA BASE: UNA SOLA FONTE VISIVA PER LUOGO (14/10/2026)
//
// Correzione utente: su Terreno a scala 50 m comparivano «Promè» (nostro,
// OpenStreetMap) e «Prome» (stampato dalla carta regionale) a ~185 m l'uno
// dall'altro, e «Frino» scritto due volte. Due nomi per lo stesso posto, in
// punti diversi, confondono chi e' sul terreno.
//
// Regole (nessun dato cancellato: i 4197 punti OSM restano nel file, qui si
// decide solo cosa DISEGNARE sopra una certa base):
//   - Mappa, Terreno, Ibrida senza estratto offline: la carta regionale e'
//     l'autorita' di visualizzazione. Conta cio' che quella carta STAMPA a
//     quello zoom (scritte cartografiche BDTRE della sua scala, vedi
//     SCALE_STAMPATE in fornitori.js): un luogo BDTRE che la carta non scrive
//     (Bozzela sul Terreno) non toglie il nome OSM. Un nome OSM non si ripete
//     se la carta stampa lo stesso nome a meno di RAGGIO_STESSO_NOME_M,
//     oppure se un luogo ufficiale STAMPATO con un altro nome sta a meno di
//     RAGGIO_LUOGO_UFFICIALE_M (stesso punto, la carta lo chiama gia' in un
//     modo: Casa San Michele OSM a ~30 m dal punto di Prome della Regione).
//     Le cime senza nome (solo quota) restano: la carta non le scrive come nome.
//   - Aerea: la foto non ha nomi, si scrivono tutti i nostri.
//   - Ibrida e Offline con l'estratto PMTiles: si scrivono i nostri e si
//     tolgono le etichette Protomaps dei luoghi che abbiamo gia' (stesso nome
//     a meno di RAGGIO_PROTOMAPS_M); fuori dai CA, dove i nostri non
//     arrivano, restano quelle Protomaps. Mai due copie.
// Giro finale Mappa/Terreno (14/10/2026): conta anche il nome OSM che e'
// l'INIZIO di una scritta stampata li' sopra («Trarego» OSM e la carta scrive
// «Trarego Viggiona»): motivo 'parte-del-nome' (shared/scritteCarta.js).
// Il confronto dei nomi ignora maiuscole, accenti e apostrofi («Promè» =
// «Prome»): serve SOLO a non scrivere due volte, non unisce ne' corregge dati.

import { inizioDiScritta } from './scritteCarta.js';

export const RAGGIO_STESSO_NOME_M = 600;
export const RAGGIO_LUOGO_UFFICIALE_M = 60;
export const RAGGIO_PROTOMAPS_M = 1500;
export const LIMITE_BYTE_NOMI_REGIONE = 2 * 1024 * 1024;
/** Scritte cartografiche BDTRE: 1:10.000 e 1:25.000. */
export const SCRITTE = Object.freeze(['scritta10', 'scritta25']);

const CELLA = 0.02;   // gradi (~2 km in lat, ~1.5 km in lon a 46°N)

/** «Alpe Busé», «ALPE BUSE'» -> «alpe buse». */
export function chiaveNome(n) {
  if (typeof n !== 'string') return '';
  return n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function metri(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r), y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371008.8;
}

/**
 * Testo di data/toponimi-regione/toponimi-bdtre-vco.json -> [{lon, lat, f, n, k}].
 * f: 'luogo' (punto geografico loc_sg) | 'scritta10' | 'scritta25' (posizione di stampa).
 */
export function leggiNomiRegione(testo) {
  if (typeof testo !== 'string' || testo.length > LIMITE_BYTE_NOMI_REGIONE) throw new Error('file dei nomi regionali non leggibile');
  let d;
  try { d = JSON.parse(testo); } catch { throw new Error('file dei nomi regionali non è JSON valido'); }
  if (!d || d.formato !== 1 || !Array.isArray(d.punti)) throw new Error('file dei nomi regionali in formato sconosciuto');
  const out = [];
  for (const r of d.punti) {
    if (!Array.isArray(r) || r.length < 4) continue;
    const [lon, lat, f, n] = r;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || typeof n !== 'string') continue;
    if (f !== 'luogo' && f !== 'scritta10' && f !== 'scritta25') continue;
    const k = chiaveNome(n);
    if (k) out.push({ lon, lat, f, n, k });
  }
  return out;
}

/** Indice a griglia per cercare in fretta i punti vicini. */
export function indicePunti(punti) {
  const celle = new Map();
  for (const p of punti) {
    const c = Math.floor(p.lat / CELLA) + ':' + Math.floor(p.lon / CELLA);
    let l = celle.get(c);
    if (!l) celle.set(c, l = []);
    l.push(p);
  }
  return celle;
}

function* vicini(indice, lat, lon) {
  const i = Math.floor(lat / CELLA), j = Math.floor(lon / CELLA);
  for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
    const l = indice.get(a + ':' + b);
    if (l) yield* l;
  }
}

function stampato(indice, k, lat, lon, fonti) {
  for (const r of vicini(indice, lat, lon)) if (r.k === k && fonti.includes(r.f) && metri(lat, lon, r.lat, r.lon) <= RAGGIO_STESSO_NOME_M) return r;
  return null;
}

/**
 * Perche' un nome OSM NON va scritto sopra una carta che stampa gia' i nomi
 * regionali, oppure null se va scritto.
 * @param {{lat:number, lon:number, t:string, n:string|null}} p  punto di shared/toponimi.js
 * @param {Map} indice  indicePunti(leggiNomiRegione(...))
 * @param {string[]} fonti  scritte che QUESTA carta stampa a QUESTO zoom (SCRITTE: tutte)
 * @param {{parteDelNome?: boolean}} opz  anche il nome OSM che e' l'inizio di una scritta stampata (Mappa, Terreno)
 * @returns {null|{motivo:'stesso-nome'|'luogo-ufficiale'|'parte-del-nome', nome:string, f:string, distanzaM:number}}
 */
export function giaSullaCarta(p, indice, fonti = SCRITTE, { parteDelNome = true } = {}) {
  if (!p || !p.n || !indice || !fonti || !fonti.length) return null;   // cima con sola quota: la carta non la scrive come nome
  const k = chiaveNome(p.n);
  let vicino = null;
  for (const r of vicini(indice, p.lat, p.lon)) {
    const d = metri(p.lat, p.lon, r.lat, r.lon);
    if (r.k === k && d <= RAGGIO_STESSO_NOME_M && fonti.includes(r.f)) return { motivo: 'stesso-nome', nome: r.n, f: r.f, distanzaM: Math.round(d) };
    // stesso nome: conta solo se stampato (sopra); un luogo vicino con un ALTRO nome che la carta scrive
    if (r.k === k && r.f === 'luogo' && d <= RAGGIO_STESSO_NOME_M && stampato(indice, k, r.lat, r.lon, fonti)) {
      return { motivo: 'stesso-nome', nome: r.n, f: r.f, distanzaM: Math.round(d) };
    }
    if (r.f === 'luogo' && r.k !== k && p.t !== 'cima' && d <= RAGGIO_LUOGO_UFFICIALE_M && (!vicino || d < vicino.distanzaM) &&
        stampato(indice, r.k, r.lat, r.lon, fonti)) {
      vicino = { motivo: 'luogo-ufficiale', nome: r.n, f: r.f, distanzaM: Math.round(d) };
    }
  }
  if (vicino) return vicino;
  // solo Mappa e Terreno (parteDelNome): l'Ibrida resta com'era (decisione utente 14/10/2026)
  const parte = parteDelNome ? inizioDiScritta(p, indice, fonti, RAGGIO_STESSO_NOME_M) : null;
  return parte ? { motivo: 'parte-del-nome', ...parte } : null;
}

/**
 * Funzione (nome, lat, lon) -> true se fra i NOSTRI punti c'e' lo stesso nome
 * a meno di RAGGIO_PROTOMAPS_M: l'etichetta Protomaps sarebbe un doppione.
 */
export function coperturaNomi(punti) {
  const indice = indicePunti(punti.filter((p) => p.n).map((p) => ({ lat: p.lat, lon: p.lon, k: chiaveNome(p.n) })));
  return (nome, lat, lon) => {
    const k = chiaveNome(nome);
    if (!k || !Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    for (const r of vicini(indice, lat, lon)) if (r.k === k && metri(lat, lon, r.lat, r.lon) <= RAGGIO_PROTOMAPS_M) return true;
    return false;
  };
}

/** Pixel del mondo (indice delle etichette Protomaps: 256 * 2^z) -> {lat, lon}. */
export function daPixelMondo(x, y, z) {
  const n = 256 * Math.pow(2, z);
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lat, lon };
}
