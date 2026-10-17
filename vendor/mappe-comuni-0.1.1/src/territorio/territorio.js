// PACCHETTO TERRITORIALE — confini, layer pubblici, nomi, piste e DTM di UN territorio, fuori dal motore.
//
// Il motore non conosce VCO1/VCO2/VCO3: legge un `territorio.json` preparato da strumenti/prepara-territorio.mjs
// (formato derivato dal layers.json per ente del Gestionale v18). Ogni file ha SHA-256 e dimensione nel manifesto:
// un file diverso (corrotto, sostituito, versione sbagliata) non entra nella mappa.
// I servizi cartografici pubblici e questi file NON dipendono dal database scelto (Firebase o Supabase).
import { sha256Esadecimale } from '../offline/cacheIsolata.js';

export const FORMATO_TERRITORIO = 'mappe-comuni-territorio';
const CATEGORIE = new Set(['confine', 'confine-comprensorio', 'comprensorio-vicino', 'area-protetta', 'natura2000', 'altro-vincolo',
  'divieto-venatorio', 'area-percorsa-dal-fuoco', 'riferimento']);

/** Elenco dei problemi del manifesto ([] = valido). */
export function problemiTerritorio(t) {
  const p = [];
  if (!t || typeof t !== 'object') return ['manifesto mancante'];
  if (t.formato !== FORMATO_TERRITORIO) p.push('formato diverso da ' + FORMATO_TERRITORIO);
  if (!Number.isInteger(t.versione)) p.push('versione mancante');
  if (typeof t.id !== 'string' || !/^[a-z0-9-]{2,40}$/.test(t.id)) p.push('id non valido');
  if (typeof t.nome !== 'string' || !t.nome) p.push('nome mancante');
  if (typeof t.versioneDati !== 'string' || !t.versioneDati) p.push('versioneDati mancante');
  if (!Array.isArray(t.layers)) p.push('layers mancante');
  const visti = new Set();
  for (const l of t.layers || []) {
    if (!l || typeof l.id !== 'string') { p.push('layer senza id'); continue; }
    if (visti.has(l.id)) p.push('layer duplicato: ' + l.id);
    visti.add(l.id);
    if (!CATEGORIE.has(l.categoria)) p.push(l.id + ': categoria sconosciuta ' + l.categoria);
    if (!fileValido(l)) p.push(l.id + ': file, sha256 o byte mancanti');
  }
  for (const k of ['toponimi', 'nomiRegione', 'piste']) if (t[k] && !fileValido(t[k])) p.push(k + ': file, sha256 o byte mancanti');
  if (t.confine && (typeof t.confine.layer !== 'string' || !visti.has(t.confine.layer))) p.push('confine.layer non tra i layer');
  if (t.dtm && (typeof t.dtm.base !== 'string' || !/^[a-z0-9-]+\/$/.test(t.dtm.base))) p.push('dtm.base non valida');
  return p;
}

const fileValido = (f) => typeof f.file === 'string' && /^[A-Za-z0-9_./-]+$/.test(f.file) && !f.file.includes('..') && /^[0-9a-f]{64}$/.test(f.sha256) && Number.isInteger(f.byte);

/**
 * Carica un pacchetto territoriale servito sotto `base` (URL che finisce con '/').
 * @param {{base: string, fetchImpl?: Function, cripto?: object}} opz
 */
export async function caricaTerritorio({ base, fetchImpl = (u) => fetch(u), cripto = globalThis.crypto } = {}) {
  if (typeof base !== 'string' || !base.endsWith('/')) throw new Error('territorio: base deve finire con /');
  const r = await fetchImpl(base + 'territorio.json');
  if (!r || !r.ok) throw new Error('territorio.json non raggiungibile (' + (r ? r.status : '?') + ')');
  const manifesto = await r.json();
  const prob = problemiTerritorio(manifesto);
  if (prob.length) throw new Error('territorio non valido: ' + prob.join('; '));
  const cache = new Map();
  /** Testo del file verificato con SHA-256 e byte del manifesto. */
  const leggiFile = async (voce) => {
    if (cache.has(voce.file)) return cache.get(voce.file);
    const promessa = (async () => {
      const rr = await fetchImpl(base + voce.file);
      if (!rr || !rr.ok) throw new Error(voce.file + ': risposta ' + (rr ? rr.status : '?'));
      const buf = await rr.arrayBuffer();
      if (buf.byteLength !== voce.byte) throw new Error(voce.file + ': dimensione diversa dal manifesto');
      if (await sha256Esadecimale(buf, cripto) !== voce.sha256) throw new Error(voce.file + ': SHA-256 diverso dal manifesto');
      return new TextDecoder().decode(buf);
    })();
    cache.set(voce.file, promessa);
    promessa.catch(() => cache.delete(voce.file));
    return promessa;
  };
  return {
    base,
    manifesto,
    id: manifesto.id,
    nome: manifesto.nome,
    leggiTesto: leggiFile,
    async leggiJson(voce) { return JSON.parse(await leggiFile(voce)); },
    layer(id) { return manifesto.layers.find((l) => l.id === id) || null; },
    /** URL del pacchetto DTM (per PacchettoDtm) o null. */
    baseDtm() { return manifesto.dtm ? base + manifesto.dtm.base : null; }
  };
}
