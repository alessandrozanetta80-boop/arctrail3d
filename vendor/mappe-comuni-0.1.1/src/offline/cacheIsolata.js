// CACHE OFFLINE ISOLATA PER PROGETTO / ENTE / VERSIONE, con verifica SHA-256.
//
// Stesso contratto dell'archivio DTM di Adrenalina/Gestionale (leggi, salva, chiavi, svuota), cosi' PacchettoDtm (copiato
// dal Gestionale v18) lo usa senza modifiche. Differenze volute:
//   - ogni chiave vive sotto lo spazio «progetto/ente/versione/»: due app, due enti o due versioni dello stesso pacchetto
//     non vedono MAI i dati l'uno dell'altro, e svuotare uno spazio non tocca gli altri;
//   - i dati binari si salvano solo se lo SHA-256 dichiarato corrisponde, e a ogni lettura si ricontrolla: un dato
//     rovinato non torna alla mappa (si cancella e si risponde null).
// Nessun dato dell'utente e nessuna credenziale: solo file cartografici pubblici scaricati a richiesta.

const ID = /^[A-Za-z0-9_.-]{1,64}$/;

export async function sha256Esadecimale(dati, cripto = globalThis.crypto) {
  if (!cripto || !cripto.subtle) throw new Error('verifica SHA-256 non disponibile');
  const buf = dati instanceof ArrayBuffer ? dati : ArrayBuffer.isView(dati) ? dati.buffer.slice(dati.byteOffset, dati.byteOffset + dati.byteLength) : new TextEncoder().encode(String(dati)).buffer;
  const h = await cripto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Spazio di memoria: { leggi(k), scrivi(k, rec), elimina(k), chiavi() } su chiavi complete. */
export function memoriaInRam() {
  const m = new Map();
  return {
    async leggi(k) { return m.has(k) ? m.get(k) : null; },
    async scrivi(k, rec) { m.set(k, rec); },
    async elimina(k) { m.delete(k); },
    async chiavi() { return [...m.keys()]; }
  };
}

/** Memoria IndexedDB in un database SOLO della base comune ('mappe-comuni-cache'). */
export function memoriaIndexedDB({ indexedDB = globalThis.indexedDB, nomeDb = 'mappe-comuni-cache' } = {}) {
  const STORE = 'file';
  let promessa = null;
  const db = () => {
    if (!promessa) {
      promessa = new Promise((ok, ko) => {
        if (!indexedDB) { ko(new Error('memoria del browser non disponibile')); return; }
        const r = indexedDB.open(nomeDb, 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      }).catch((e) => { promessa = null; throw e; });
    }
    return promessa;
  };
  const op = async (modo, fn) => {
    const d = await db();
    return new Promise((ok, ko) => {
      const tx = d.transaction(STORE, modo);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => ko(tx.error);
    });
  };
  return {
    leggi: async (k) => (await op('readonly', (s) => s.get(k))) || null,
    scrivi: (k, rec) => op('readwrite', (s) => s.put(rec, k)),
    elimina: (k) => op('readwrite', (s) => s.delete(k)),
    chiavi: async () => (await op('readonly', (s) => s.getAllKeys())) || []
  };
}

/**
 * @param {{progetto: string, ente: string, versione: string, memoria?: object, cripto?: object}} opz
 */
export function creaCacheIsolata({ progetto, ente, versione, memoria = null, cripto = globalThis.crypto } = {}) {
  for (const [k, v] of Object.entries({ progetto, ente, versione })) {
    if (typeof v !== 'string' || !ID.test(v)) throw new Error('cache offline: ' + k + ' mancante o non valido');
  }
  const spazio = progetto + '/' + ente + '/' + versione + '/';
  const mem = memoria || memoriaIndexedDB();
  return {
    spazio,
    /** @returns {Promise<{chiave, sha256, dati?: ArrayBuffer, testo?: string}|null>} */
    async leggi(chiave) {
      const rec = await mem.leggi(spazio + chiave);
      if (!rec) return null;
      if (rec.dati) {
        const h = await sha256Esadecimale(rec.dati, cripto);
        if (h !== rec.sha256) { await mem.elimina(spazio + chiave); return null; }
      }
      return { ...rec, chiave };
    },
    async salva(rec) {
      if (!rec || typeof rec.chiave !== 'string' || !rec.chiave) throw new Error('cache offline: chiave mancante');
      if (rec.dati) {
        const h = await sha256Esadecimale(rec.dati, cripto);
        if (!rec.sha256 || h !== rec.sha256) throw new Error('cache offline: SHA-256 diverso da quello dichiarato per ' + rec.chiave);
      } else if (typeof rec.testo !== 'string') {
        throw new Error('cache offline: record senza dati');
      }
      await mem.scrivi(spazio + rec.chiave, { sha256: rec.sha256 || '', ...(rec.dati ? { dati: rec.dati } : { testo: rec.testo }) });
    },
    async chiavi() {
      return (await mem.chiavi()).filter((k) => String(k).startsWith(spazio)).map((k) => String(k).slice(spazio.length));
    },
    async svuota(prefisso = '') {
      let n = 0;
      for (const k of await mem.chiavi()) {
        if (String(k).startsWith(spazio + prefisso)) { await mem.elimina(k); n++; }
      }
      return n;
    }
  };
}
