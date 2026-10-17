// MAPPA OFFLINE — lo sfondo OpenStreetMap dai pacchetti scaricati (VCO1/VCO2/VCO3).
//
// Prima c'era un solo estratto, CAVCO1 + 3 km, dentro l'app. Ora ogni
// comprensorio ha il suo pacchetto, scaricato solo da chi lo vuole
// (pacchettiOffline.js); qui si mettono insieme quelli presenti.
//
// UN SOLO LAYER, PIU' PACCHETTI. protomaps chiede le tile a un oggetto con
// getZxy(z, x, y): ArchivioComposto gira la richiesta al pacchetto giusto.
//   - Solo i pacchetti il cui riquadro tocca la tile vengono interrogati.
//   - Dove due riquadri si sovrappongono (i 3 km di margine al confine)
//     risponde il pacchetto del COMPRENSORIO ATTIVO, poi gli altri in ordine:
//     una tile arriva da una fonte sola, niente etichette doppie.
//   - Si passa da VCO1 a VCO2 trascinando la mappa senza ricaricare niente.
//   - Un pacchetto si apre la prima volta che serve una sua tile: chi ha
//     scaricato tutti e tre ma guarda il Cusio non tiene in memoria l'Ossola.
//
// Il pacchetto si legge intero in memoria (ArrayBuffer) la prima volta che
// serve, e protomaps ci pesca i pezzi con SorgenteMemoria. Nell'app Android
// perche' il server locale di Capacitor non gestisce le richieste parziali;
// nella PWA perche' su WebKit i Blob sono inaffidabili (archivioMappe.js).

import { ordinePriorita, tileNelRiquadro } from './pacchettiMappe.js';
import { GestorePacchetti, urlManifestPredefinito } from './pacchettiOffline.js';
import { archivioPredefinito } from './archivioMappe.js';

function caricaScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error('script non caricato: ' + src));
    document.head.appendChild(s);
  });
}

let gestoreUnico = null;
/** Il gestore dei pacchetti di questa installazione. */
export function gestore() {
  if (!gestoreUnico) {
    let memoria;
    try { memoria = globalThis.localStorage || null; } catch { memoria = null; }
    gestoreUnico = new GestorePacchetti({ archivio: archivioPredefinito(), urlManifest: urlManifestPredefinito(), memoria });
  }
  return gestoreUnico;
}
/** Solo per i test: un gestore con archivio e rete finti. */
export function impostaGestore(g) { gestoreUnico = g; aperti.clear(); }

export class ArchivioComposto {
  /** @param {{id: string, meta: object, apri: () => Promise<object>}[]} voci */
  constructor(voci, attivo) {
    this.voci = voci;
    this.ordina(attivo);
  }

  ordina(attivo) {
    this.attivo = attivo;
    this.ordinati = ordinePriorita(this.voci.map((v) => v.id), attivo).map((id) => this.voci.find((v) => v.id === id));
  }

  get ids() { return this.voci.map((v) => v.id); }

  /** Il pacchetto che fornisce la tile z/x/y (null se nessuno la copre). */
  fonte(z, x, y) {
    return this.ordinati.find((v) => z <= v.meta.maxZoom && tileNelRiquadro(z, x, y, v.meta.bbox)) || null;
  }

  async getZxy(z, x, y, signal) {
    for (const v of this.ordinati) {
      if (z > v.meta.maxZoom || !tileNelRiquadro(z, x, y, v.meta.bbox)) continue;
      const archivio = await v.apri();
      const r = await archivio.getZxy(z, x, y, signal);
      if (r) return r;
    }
    return undefined;
  }

  async getHeader() { return (await this.ordinati[0].apri()).getHeader(); }
}

/** Sorgente PMTiles su un ArrayBuffer: stesso contratto di pmtiles.FileSource, senza Blob. */
export class SorgenteMemoria {
  constructor(buf, chiave) { this.buf = buf; this.chiave = chiave; }
  getKey() { return this.chiave; }
  async getBytes(offset, length) { return { data: this.buf.slice(offset, offset + length) }; }
}

// pacchetti gia' aperti in questa sessione, per id@versione (un aggiornamento cambia la chiave)
const aperti = new Map();

function apertura(g, meta) {
  const chiave = meta.id + '@' + meta.versione;
  if (!aperti.has(chiave)) {
    aperti.set(chiave, (async () => {
      if (!globalThis.pmtiles) await caricaScript('vendor/pmtiles/pmtiles.js');
      const buf = await g.apri(meta.id);
      return new globalThis.pmtiles.PMTiles(new SorgenteMemoria(buf, meta.id + '@' + meta.versione));
    })().catch((e) => { aperti.delete(chiave); throw e; }));
  }
  return aperti.get(chiave);
}

/**
 * Archivio per protomaps con i pacchetti PRESENTI sul telefono.
 * Lancia se non ce n'e' nessuno: la mappa offline non si puo' mostrare.
 * @param {string} attivo  comprensorio attivo (precedenza nelle sovrapposizioni)
 */
export async function apriArchivio(attivo) {
  const g = gestore();
  const presenti = await g.archivio.elenca();
  if (!presenti.length) throw new Error('nessuna mappa offline scaricata');
  // le versioni superate non servono piu'
  for (const k of [...aperti.keys()]) if (!presenti.some((m) => k === m.id + '@' + m.versione)) aperti.delete(k);
  return new ArchivioComposto(presenti.map((meta) => ({ id: meta.id, meta, apri: () => apertura(g, meta) })), attivo);
}

/** Dimentica le aperture (dopo un'eliminazione la memoria si libera). */
export function chiudi(id) { for (const k of [...aperti.keys()]) if (k.startsWith(id + '@')) aperti.delete(k); }
