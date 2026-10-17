// MAPPE OFFLINE PER COMPRENSORIO — manifest, stato reale, download, aggiornamento.
//
// Il manifest (mappe-offline/manifest.json, sul sito della PWA) dice quali
// pacchetti esistono, quanto pesano e con quale SHA-256. Il telefono sa
// quali ha davvero (archivioMappe.js). Dal confronto: Non scaricata,
// Scaricata, Aggiornamento disponibile.
//
// UN DOWNLOAD NON E' "SCARICATO" FINCHE' NON E' VERIFICATO.
//   1. si scarica tutto in memoria, contando i byte (avanzamento);
//   2. HTTP diverso da 200, rete caduta, file piu' corto o piu' lungo del
//      dichiarato, SHA-256 diverso: errore, e sul telefono non cambia niente;
//   3. solo dopo la verifica il file va nello storage, in modo atomico: per
//      un aggiornamento la mappa vecchia resta usabile fino a quel momento.
// Chiudere l'app a meta' e' come la rete caduta: quello che era in memoria
// sparisce, lo storage non e' stato toccato.
//
// Niente parte da solo: si scarica solo quando qualcuno preme "Scarica mappa".

import { ID_PACCHETTI, problemiManifest, statoPacchetto, controlloSpazio, sigla } from './pacchettiMappe.js';

/** Dove sta il manifest: stesso sito nella PWA; nell'app Android il sito pubblico (i pacchetti non sono nell'APK). */
export const SITO_PUBBLICO = 'https://adrenalina---hunting.firebaseapp.com/';
export function urlManifestPredefinito(cap = globalThis.Capacitor, loc = globalThis.location) {
  const nativo = cap && cap.isNativePlatform && cap.isNativePlatform();
  return nativo ? SITO_PUBBLICO + 'mappe-offline/manifest.json' : new URL('../mappe-offline/manifest.json', loc.href).href;
}

const CHIAVE_MANIFEST = 'arctrail3d-mappe-manifest';

export class ErroreMappa extends Error {
  constructor(messaggio, codice) { super(messaggio); this.codice = codice; }
}

async function sha256Esadecimale(buf) {
  const h = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class GestorePacchetti {
  /**
   * @param {{archivio: object, urlManifest: string, fetchImpl?: Function, digest?: Function,
   *          online?: () => boolean, memoria?: {getItem: Function, setItem: Function}, tentativi?: number}} opz
   */
  constructor({ archivio, urlManifest, fetchImpl = (...a) => fetch(...a), digest = sha256Esadecimale,
    online = () => typeof navigator === 'undefined' || navigator.onLine !== false, memoria = null, tentativi = 2 }) {
    this.archivio = archivio;
    this.urlManifest = urlManifest;
    this.fetchImpl = fetchImpl;
    this.digest = digest;
    this.online = online;
    this.memoria = memoria;
    this.tentativi = tentativi;
    this.manifest = null;            // ultimo manifest valido letto dalla rete
    this.erroreManifest = null;
    this.inCorso = new Map();        // id -> { promessa, controllore, fatti, totale }
  }

  /** Manifest dalla rete (mai dalla cache). Se non arriva resta l'ultimo noto, solo per nomi e dimensioni. */
  async caricaManifest() {
    try {
      const r = await this.fetchImpl(this.urlManifest, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const m = await r.json();
      const p = problemiManifest(m);
      if (p.length) throw new Error('manifest non valido: ' + p.join('; '));
      this.manifest = m;
      this.erroreManifest = null;
      try { this.memoria && this.memoria.setItem(CHIAVE_MANIFEST, JSON.stringify(m)); } catch { /* niente */ }
      return m;
    } catch (e) {
      this.erroreManifest = e.message;
      return null;
    }
  }

  /** Ultimo manifest noto (rete o copia locale), senza andare in rete. */
  manifestNoto() {
    if (this.manifest) return this.manifest;
    try {
      const m = this.memoria && JSON.parse(this.memoria.getItem(CHIAVE_MANIFEST) || 'null');
      return m && !problemiManifest(m).length ? m : null;
    } catch { return null; }
  }

  voce(id, manifest = this.manifestNoto()) {
    return manifest ? manifest.packages.find((p) => p.id === id) || null : null;
  }

  /** URL assoluto del file di un pacchetto (gli url del manifest sono relativi al manifest). */
  urlPacchetto(voce) { return new URL(voce.url, this.urlManifest).href; }

  /**
   * Stato REALE dei tre pacchetti: legge lo storage (copie presenti e integre)
   * e, se `rete`, anche il manifest online.
   */
  async stato({ rete = true } = {}) {
    const [manifest, presenti] = await Promise.all([
      rete && this.online() ? this.caricaManifest() : Promise.resolve(null),
      this.archivio.elenca().catch(() => [])
    ]);
    const noto = manifest || this.manifestNoto();
    return ID_PACCHETTI.map((id) => {
      const locale = presenti.find((m) => m.id === id) || null;
      const voce = this.voce(id, noto);
      // senza manifest fresco non si puo' dire "aggiornamento disponibile"
      const stato = statoPacchetto(manifest ? voce : null, locale);
      const corso = this.inCorso.get(id);
      return {
        id, nome: (voce && voce.nome) || (locale && locale.nome) || sigla(id),
        stato, locale, voce,
        bytes: (stato === 'SCARICATA' && locale ? locale.bytes : voce ? voce.bytes : locale ? locale.bytes : null),
        inCorso: corso ? { fatti: corso.fatti, totale: corso.totale } : null
      };
    });
  }

  /** Id dei pacchetti presenti e integri. */
  async installati() { return (await this.archivio.elenca().catch(() => [])).map((m) => m.id); }

  /**
   * Scarica (o aggiorna) un pacchetto. Una sola operazione per pacchetto:
   * un secondo tocco su "Scarica mappa" restituisce quella gia' in corso.
   * @param {string} id
   * @param {{suAvanzamento?: (fatti: number, totale: number) => void}} opz
   */
  scarica(id, { suAvanzamento = () => {} } = {}) {
    const gia = this.inCorso.get(id);
    if (gia) return gia.promessa;
    const controllore = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const corso = { controllore, fatti: 0, totale: 0, promessa: null };
    corso.promessa = this._scarica(id, corso, suAvanzamento).finally(() => this.inCorso.delete(id));
    this.inCorso.set(id, corso);
    return corso.promessa;
  }

  /** Interrompe un download in corso (la mappa gia' presente, se c'e', resta). */
  annulla(id) {
    const c = this.inCorso.get(id);
    if (c && c.controllore) c.controllore.abort();
  }

  async _scarica(id, corso, suAvanzamento) {
    if (!this.online()) throw new ErroreMappa('Serve una connessione Internet', 'OFFLINE');
    const manifest = await this.caricaManifest();
    if (!manifest) throw new ErroreMappa('Elenco delle mappe non raggiungibile (' + (this.erroreManifest || 'rete') + ')', 'MANIFEST');
    const voce = this.voce(id, manifest);
    if (!voce) throw new ErroreMappa('Mappa ' + sigla(id) + ' non disponibile sul server', 'ASSENTE');
    corso.totale = voce.bytes;
    const messaggioSpazio = controlloSpazio(await this.archivio.stimaSpazio(), voce.bytes);
    if (messaggioSpazio) throw new ErroreMappa(messaggioSpazio, 'SPAZIO');
    // la PWA chiede al browser di non liberare questo storage (iOS/Safari puo' dire di no)
    await this.archivio.richiediPersistenza().catch(() => false);

    let ultimo;
    for (let t = 1; t <= this.tentativi; t++) {
      try {
        const blob = await this._scaricaFile(voce, corso, suAvanzamento);
        const sha = await this.digest(await blob.arrayBuffer());
        if (sha !== voce.sha256) throw new ErroreMappa('File ricevuto diverso da quello atteso (SHA-256): non salvato', 'HASH');
        const meta = {
          id, nome: voce.nome, versione: voce.versione, bytes: voce.bytes, sha256: voce.sha256,
          bbox: voce.bbox, minZoom: voce.minZoom, maxZoom: voce.maxZoom, datiOsm: voce.datiOsm || null,
          scaricato: new Date().toISOString()
        };
        await this.archivio.salva(id, blob, meta);
        return meta;
      } catch (e) {
        ultimo = e;
        const annullato = corso.controllore && corso.controllore.signal.aborted;
        // si riprova solo cio' che puo' andare meglio al secondo colpo: rete, server momentaneamente giu', file troncato
        const ritentabile = !annullato && (e.codice === 'RETE' || e.codice === 'TRONCATO' || (e.codice === 'HTTP' && e.status >= 500));
        if (annullato) throw new ErroreMappa('Scaricamento annullato', 'ANNULLATO');
        if (!ritentabile || t === this.tentativi || !this.online()) break;
        corso.fatti = 0;
      }
    }
    throw ultimo instanceof ErroreMappa ? ultimo : new ErroreMappa(ultimo.message || String(ultimo), 'SALVATAGGIO');
  }

  async _scaricaFile(voce, corso, suAvanzamento) {
    let r;
    try {
      r = await this.fetchImpl(this.urlPacchetto(voce), { cache: 'no-store', signal: corso.controllore ? corso.controllore.signal : undefined });
    } catch (e) {
      throw new ErroreMappa('Rete non disponibile durante lo scaricamento', 'RETE');
    }
    if (r.status !== 200) {
      const e = new ErroreMappa('Il server ha risposto HTTP ' + r.status, 'HTTP');
      e.status = r.status;
      throw e;
    }
    const parti = [];
    corso.fatti = 0;
    suAvanzamento(0, voce.bytes);
    try {
      if (r.body && r.body.getReader) {
        const lettore = r.body.getReader();
        for (;;) {
          const { done, value } = await lettore.read();
          if (done) break;
          parti.push(value);
          corso.fatti += value.byteLength;
          if (corso.fatti > voce.bytes) { lettore.cancel().catch(() => {}); throw new ErroreMappa('File piu\' grande del previsto: non salvato', 'DIMENSIONE'); }
          suAvanzamento(corso.fatti, voce.bytes);
        }
      } else {
        const b = new Uint8Array(await r.arrayBuffer());
        parti.push(b);
        corso.fatti = b.byteLength;
        suAvanzamento(corso.fatti, voce.bytes);
      }
    } catch (e) {
      if (e instanceof ErroreMappa) throw e;
      throw new ErroreMappa('Collegamento interrotto durante lo scaricamento (' + Math.round(corso.fatti / 1048576) + ' MB ricevuti)', 'RETE');
    }
    if (corso.fatti !== voce.bytes) {
      throw new ErroreMappa('File incompleto: ricevuti ' + corso.fatti + ' byte di ' + voce.bytes, corso.fatti < voce.bytes ? 'TRONCATO' : 'DIMENSIONE');
    }
    return new Blob(parti, { type: 'application/octet-stream' });
  }

  async elimina(id) {
    this.annulla(id);
    await this.archivio.elimina(id);
  }

  apri(id) { return this.archivio.apri(id); }
}
