// ORIGINE: GESTIONALE COMPRENSORI src/cartografia/pacchettoDtm.js (commit 62d935678e, SHA-256 fonte ca7305de0df182ba…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: quota senza rete: tasselli DTM verificati con SHA-256, uno per ente.
// Sostituzioni: 1 (elenco in strumenti/importa-da-fonti.mjs).
// ORIGINE: copia adattata da Adrenalina (battuta-live/js/map/pacchettoDtm.js, solo letto il 15/10/2026): quota senza rete dal DTM
// 25 m regionale, mappa identica ad Adrenalina. Adattamenti: un pacchetto per ente (base e id dal costruttore, il VCO3 ha il suo),
// import dai moduli copiati nel Gestionale.
// QUOTA SENZA RETE NEL CA DELL'ENTE — copia del pacchetto DTM 25 m sul telefono (fase 2 di Adrenalina).
//
// I tasselli (data/dtm-vco1/, vedi shared/dtmOffline.js) arrivano SOLO quando
// l'utente preme «Scarica» nel pannello Layer: tutto il CA o la zona
// inquadrata. Ognuno si controlla col suo SHA-256 prima di salvarlo e si
// rilegge solo se lo SHA e' quello dell'indice corrente.
// DATABASE A PARTE ('battuta-live-dtm'): non vede mappe offline, piste o
// dati personali, e «Togli dal telefono» qui cancella solo le quote.
// Nelle richieste: solo i nomi dei file del pacchetto, mai una posizione.
// Archivio: js/map/archivioDtm.js.

import { indiceDtmValido, tasselliPerPunti, quotaDaTasselli, pesoTasselli } from './dtmOffline.js';
// MAPPE COMUNI: l'archivio e' SEMPRE quello isolato per progetto/ente/versione (offline/cacheIsolata.js), passato dal chiamante.
const archivioDtmIndexedDB = () => { throw new Error('PacchettoDtm: archivio isolato obbligatorio (creaCacheIsolata)'); };



async function sha256Byte(buf, cripto) {
  if (!cripto || !cripto.subtle) throw new Error('verifica SHA-256 non disponibile su questo browser');
  const h = await cripto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class PacchettoDtm {
  /** @param {{fetchImpl?: Function, archivio?: object, cripto?: object, base?: string, id?: string}} opz */
  constructor({ fetchImpl = (u) => fetch(u), archivio = null, cripto = globalThis.crypto, base, id } = {}) {
    this.id = id;
    this.fetch = fetchImpl;
    this.archivio_ = archivio;
    this.cripto = cripto;
    this.base = base;
    this.ind = null;
    this.memoria = new Map();      // tasselli gia' letti in questa sessione: chiave -> Int16Array
    this.scarico = null;           // {fatti, totale} durante lo scaricamento
  }

  archivio() {
    if (!this.archivio_) this.archivio_ = archivioDtmIndexedDB();
    return this.archivio_;
  }

  chiave(k) { return this.id + '/' + k + '@' + this.ind.tasselli[k].sha256; }

  /** Indice: dal sito/app; senza rete, la copia salvata insieme ai tasselli. null se non c'e'. */
  async indice() {
    if (this.ind) return this.ind;
    let ind = null;
    try {
      const r = await this.fetch(this.base + 'indice.json');
      if (r && r.ok) ind = await r.json();
    } catch { /* senza rete: si prova la copia */ }
    if (!indiceDtmValido(ind)) {
      try {
        const rec = await this.archivio().leggi(this.id + '/indice');
        ind = rec && rec.testo ? JSON.parse(rec.testo) : null;
      } catch { ind = null; }
    }
    this.ind = indiceDtmValido(ind) ? ind : null;
    return this.ind;
  }

  /** Quanti tasselli dell'indice corrente sono sul telefono. */
  async stato() {
    const ind = await this.indice();
    if (!ind) return null;
    const presenti = new Set((await this.archivio().chiavi()).filter((k) => k.startsWith(this.id + '/') && k !== this.id + '/indice'));
    const ks = Object.keys(ind.tasselli);
    const giu = ks.filter((k) => presenti.has(this.chiave(k)));
    return { presenti: giu.length, totale: ks.length, byte: pesoTasselli(ind, giu), byteTotale: pesoTasselli(ind), chiaviPresenti: giu };
  }

  /**
   * Scarica i tasselli indicati (tutti se `chiavi` manca) che non ci sono gia'; SHA-256 verificato su ognuno.
   * @param {string[]|null} [chiavi]
   * @param {{avanzamento?: (fatti: number, totale: number) => void}} [opz]
   */
  async scarica(chiavi = null, { avanzamento = () => {} } = {}) {
    const ind = await this.indice();
    if (!ind) throw new Error('indice del pacchetto non disponibile');
    const arch = this.archivio();
    const gia = new Set(await arch.chiavi());
    const da = (chiavi || Object.keys(ind.tasselli)).filter((k) => ind.tasselli[k] && !gia.has(this.chiave(k)));
    this.scarico = { fatti: 0, totale: da.length };
    try {
      for (const k of da) {
        const r = await this.fetch(this.base + 't/' + k + '.bin');
        if (!r || !r.ok) throw new Error('zona ' + k + ': risposta ' + (r ? r.status : '?'));
        const buf = await r.arrayBuffer();
        if (buf.byteLength !== ind.tasselli[k].byte || await sha256Byte(buf, this.cripto) !== ind.tasselli[k].sha256) throw new Error('zona ' + k + ': file diverso dall\'indice (SHA-256)');
        await arch.salva({ chiave: this.chiave(k), sha256: ind.tasselli[k].sha256, dati: buf });
        this.scarico.fatti++;
        avanzamento(this.scarico.fatti, this.scarico.totale);
      }
      await arch.salva({ chiave: this.id + '/indice', sha256: '', testo: JSON.stringify(ind) });
      return da.length;
    } finally { this.scarico = null; }
  }

  /** Toglie dal telefono SOLO le quote del CA dell'ente (indice compreso). */
  async elimina() {
    this.memoria.clear();
    return this.archivio().svuota(this.id + '/');
  }

  /** Carica in memoria i tasselli necessari ai punti (solo da quelli scaricati); false se ne manca uno. */
  async prepara(punti) {
    const ind = await this.indice();
    if (!ind) return false;
    let tutti = true;
    for (const k of tasselliPerPunti(ind, punti)) {
      if (this.memoria.has(k)) continue;
      const rec = await this.archivio().leggi(this.chiave(k)).catch(() => null);
      if (!rec || rec.sha256 !== ind.tasselli[k].sha256 || !rec.dati) { tutti = false; continue; }
      this.memoria.set(k, new Int16Array(rec.dati));
    }
    return tutti;
  }

  /** Funzione sincrona di quota sui tasselli in memoria (dopo prepara). */
  quotaDi() {
    const ind = this.ind;
    return (p) => (ind ? quotaDaTasselli(ind, (k) => this.memoria.get(k) || null, p) : null);
  }
}
