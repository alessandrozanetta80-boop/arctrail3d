// DOVE STANNO LE MAPPE OFFLINE SCARICATE — un adattatore per piattaforma.
//
// Tutti e tre rispondono allo stesso contratto, usato da pacchettiOffline.js:
//
//   tipo, persistente                      descrizione dello storage
//   elenca()        -> Promise<meta[]>     SOLO le copie presenti e integre
//                                          (file che c'e', con i byte dichiarati)
//   salva(id, blob, meta) -> Promise       ATOMICO: o la copia nuova completa,
//                                          o resta quella di prima
//   apri(id)        -> Promise<ArrayBuffer> il file intero, per protomaps
//   elimina(id)     -> Promise             file e metadati
//
// ANDROID (Capacitor): file veri nella memoria dell'app (Directory.Data),
//   non nella cache: il sistema non li butta per fare spazio, restano dopo
//   la chiusura e dopo il riavvio, se ne vanno solo con "Cancella dati" o
//   disinstallando.
// BROWSER / iPHONE (PWA): IndexedDB, con richiesta di storage persistente.
//   iOS puo' comunque liberarlo (app web non usata a lungo, telefono pieno):
//   per questo lo stato si rilegge sempre da qui, mai da un flag.
//
// NIENTE BLOB, NE' IN SCRITTURA NE' IN LETTURA. Il pacchetto si salva come
// ArrayBuffer e si rilegge intero in memoria. Motivo, provato su WebKit (il
// motore di Safari): un Blob in IndexedDB viene rifiutato ("UnknownError:
// Error preparing Blob/File data to be stored in object store"), e su iOS
// sono noti i Blob letti da IndexedDB che diventano illeggibili dopo un po'
// ("WebKitBlobResource error"). Un ArrayBuffer non ha questi problemi. Costo:
// il pacchetto di un CA sta in memoria mentre si guarda quel CA (17-30 MB);
// quelli degli altri CA si aprono solo se servono.
// MEMORIA: per i test.

const CHUNK = 1024 * 1024;   // 1 MB per chiamata al ponte nativo

/* ------------------------------------------------------------------ IndexedDB */

const NOME_DB = 'arctrail3d-mappe';
const STORE = 'pacchetti';

function richiesta(req) {
  return new Promise((ok, ko) => { req.onsuccess = () => ok(req.result); req.onerror = () => ko(req.error); });
}

function fineTransazione(tx) {
  return new Promise((ok, ko) => {
    tx.oncomplete = () => ok();
    tx.onabort = () => ko(tx.error || new Error('transazione annullata'));
    tx.onerror = () => ko(tx.error || new Error('errore di scrittura'));
  });
}

export function archivioIndexedDB({ indexedDB = globalThis.indexedDB, storage = globalThis.navigator && globalThis.navigator.storage } = {}) {
  let promessaDb = null;
  const db = () => {
    if (!promessaDb) {
      promessaDb = new Promise((ok, ko) => {
        if (!indexedDB) { ko(new Error('Memoria del browser non disponibile (IndexedDB)')); return; }
        const r = indexedDB.open(NOME_DB, 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
        r.onsuccess = () => {
          const d = r.result;
          // se il sistema o un'altra scheda chiude il database, si riapre alla prossima richiesta
          d.onclose = () => { promessaDb = null; };
          d.onversionchange = () => { d.close(); promessaDb = null; };
          ok(d);
        };
        r.onerror = () => ko(r.error);
        r.onblocked = () => ko(new Error('Memoria del browser occupata da un\'altra scheda'));
      }).catch((e) => { promessaDb = null; throw e; });
    }
    return promessaDb;
  };
  const leggiTutti = async () => richiesta((await db()).transaction(STORE).objectStore(STORE).getAll());
  const dimensione = (dato) => (dato && typeof dato.size === 'number' ? dato.size : dato && typeof dato.byteLength === 'number' ? dato.byteLength : -1);

  return {
    tipo: 'IndexedDB del browser',
    persistente: false,          // aggiornato da richiediPersistenza()
    async richiediPersistenza() {
      try {
        if (!storage) return false;
        const gia = storage.persisted ? await storage.persisted() : false;
        this.persistente = gia || (storage.persist ? await storage.persist() : false);
      } catch { this.persistente = false; }
      return this.persistente;
    },
    async stimaSpazio() {
      try { return storage && storage.estimate ? await storage.estimate() : null; } catch { return null; }
    },
    async elenca() {
      const tutti = await leggiTutti();
      const buoni = [];
      for (const r of tutti) {
        if (r && r.meta && dimensione(r.dato) === r.meta.bytes) buoni.push(r.meta);
        else {
          // copia monca o illeggibile: non e' una mappa, si toglie
          try { const tx = (await db()).transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(r.id); await fineTransazione(tx); } catch { /* niente */ }
        }
      }
      return buoni;
    },
    async salva(id, blob, meta) {
      // UNA transazione: IndexedDB sostituisce il record vecchio solo quando
      // quella nuova e' completa. Se si interrompe resta la mappa di prima.
      const dato = await blob.arrayBuffer();
      try {
        const tx = (await db()).transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).put({ id, meta, dato });
        try { await fineTransazione(tx); } catch (e) { throw req.error || e; }
      } catch (e) { throw traduciErrore(e); }
      const r = await richiesta((await db()).transaction(STORE).objectStore(STORE).get(id));
      if (!r || dimensione(r.dato) !== meta.bytes) throw new Error('La memoria del browser non ha conservato la mappa completa');
    },
    async apri(id) {
      const r = await richiesta((await db()).transaction(STORE).objectStore(STORE).get(id));
      if (!r || dimensione(r.dato) !== (r.meta && r.meta.bytes)) throw new Error('Mappa offline ' + id + ' non presente sul telefono');
      // copie di versioni precedenti di questo codice potevano essere Blob
      return r.dato instanceof ArrayBuffer ? r.dato : await r.dato.arrayBuffer();
    },
    async elimina(id) {
      const tx = (await db()).transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      await fineTransazione(tx);
    }
  };
}

/* ------------------------------------------------------------------ Android */

/** Blob -> base64 senza passare da FileReader (funziona anche nei test in Node). */
async function base64(blob) {
  const b = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

function traduciErrore(e) {
  const m = String((e && (e.message || e.name)) || e);
  if (/QuotaExceeded|ENOSPC|No space|spazio|quota/i.test(m)) return new Error('Spazio insufficiente sul telefono per salvare la mappa');
  return e instanceof Error ? e : new Error(m);
}

/*
 * I FILE SU ANDROID, E PERCHE' NON SI RINOMINA MAI SOPRA UN FILE ESISTENTE.
 *
 *   mappe-offline/CAVCO2-20260918-3b4e7fa0.pmtiles        la mappa
 *   mappe-offline/CAVCO2-20260918-3b4e7fa0.json           i suoi metadati
 *
 * Il nome porta la versione. Un aggiornamento scrive un file NUOVO accanto
 * al vecchio (prima .tmp, poi rinominato quando e' completo e verificato),
 * poi i suoi metadati; solo allora cancella il vecchio. In ogni istante c'e'
 * almeno una coppia mappa+metadati completa: se la corrente salta a meta',
 * alla riapertura si tiene la piu' recente completa e si butta il resto.
 * Nessuna rinomina finisce su un file che c'e' gia': come si comporta il
 * plugin in quel caso non e' documentato, e qui non serve saperlo.
 */
export function archivioFilesystem({ Filesystem, convertFileSrc, fetchImpl = (...a) => fetch(...a), directory = 'DATA', cartella = 'mappe-offline', piattaforma = 'android' }) {
  const p = (nome) => cartella + '/' + nome;
  const opz = (nome) => ({ path: p(nome), directory });
  const nomeFile = (m) => m.id + '-' + m.versione + '.pmtiles';
  const nomeMeta = (m) => m.id + '-' + m.versione + '.json';
  const esiste = async (nome) => { try { return (await Filesystem.stat(opz(nome))).size; } catch { return -1; } };
  const cancella = async (nome) => { try { await Filesystem.deleteFile(opz(nome)); } catch { /* gia' assente */ } };
  const cartellaPronta = async () => { try { await Filesystem.mkdir({ path: cartella, directory, recursive: true }); } catch { /* esiste gia' */ } };
  // file di un salvataggio in corso: una rilettura dello stato nel frattempo non deve toccarli
  const inScrittura = new Set();

  async function leggiMeta(nome) {
    try {
      const r = await Filesystem.readFile({ ...opz(nome), encoding: 'utf8' });
      const m = JSON.parse(typeof r.data === 'string' ? r.data : await r.data.text());
      return m && m.id && m.versione ? m : null;
    } catch { return null; }
  }

  /** Metadati validi, uno per pacchetto (il piu' recente); tutto il resto si cancella. */
  async function riordina() {
    await cartellaPronta();
    let voci;
    try { voci = (await Filesystem.readdir({ path: cartella, directory })).files.map((f) => (typeof f === 'string' ? f : f.name)); } catch { return []; }
    const perId = new Map();
    for (const nome of voci.filter((n) => n.endsWith('.json'))) {
      const m = await leggiMeta(nome);
      if (!m || nome !== nomeMeta(m) || (await esiste(nomeFile(m))) !== m.bytes) { await cancella(nome); continue; }
      const prima = perId.get(m.id);
      if (!prima || String(m.scaricato) > String(prima.scaricato)) perId.set(m.id, m);
    }
    const tenuti = new Set([...perId.values()].flatMap((m) => [nomeFile(m), nomeMeta(m)]));
    for (const nome of voci) if (!tenuti.has(nome) && !inScrittura.has(nome)) await cancella(nome);   // .tmp, versioni superate, file senza metadati
    return [...perId.values()];
  }

  return {
    tipo: 'memoria dell\'app (' + (piattaforma === 'ios' ? 'iPhone' : 'Android') + ')',
    persistente: true,
    async richiediPersistenza() { return true; },
    async stimaSpazio() { return null; },
    elenca: riordina,
    async salva(id, blob, meta) {
      await cartellaPronta();
      const tmp = nomeFile(meta) + '.tmp';
      const tmpMeta = nomeMeta(meta) + '.tmp';
      const miei = [tmp, tmpMeta, nomeFile(meta), nomeMeta(meta)];
      miei.forEach((n) => inScrittura.add(n));
      await cancella(tmp);
      try {
        for (let da = 0; da < blob.size || da === 0; da += CHUNK) {
          const data = await base64(blob.slice(da, da + CHUNK));
          if (da === 0) await Filesystem.writeFile({ ...opz(tmp), data, recursive: true });
          else await Filesystem.appendFile({ ...opz(tmp), data });
          if (blob.size === 0) break;
        }
        if ((await esiste(tmp)) !== meta.bytes) throw new Error('file salvato incompleto');
        // stesso nome gia' presente = copia rovinata della stessa versione (una buona sarebbe "Scaricata")
        await cancella(nomeFile(meta));
        await Filesystem.rename({ from: p(tmp), to: p(nomeFile(meta)), directory, toDirectory: directory });
        await Filesystem.writeFile({ ...opz(tmpMeta), data: JSON.stringify(meta), encoding: 'utf8', recursive: true });
        await cancella(nomeMeta(meta));
        await Filesystem.rename({ from: p(tmpMeta), to: p(nomeMeta(meta)), directory, toDirectory: directory });
      } catch (e) {
        await cancella(tmp);
        await cancella(tmpMeta);
        throw traduciErrore(e);
      } finally {
        miei.forEach((n) => inScrittura.delete(n));
      }
      // da qui la versione nuova e' completa: si toglie la vecchia
      await riordina();
    },
    async apri(id) {
      const m = (await riordina()).find((x) => x.id === id);
      if (!m) throw new Error('Mappa offline ' + id + ' non presente sul telefono');
      const { uri } = await Filesystem.getUri(opz(nomeFile(m)));
      // il server locale di Capacitor non serve richieste parziali: il file si legge intero una volta
      const r = await fetchImpl(convertFileSrc(uri));
      if (!r.ok) throw new Error('mappa offline ' + id + ' non leggibile (HTTP ' + r.status + ')');
      const buf = await r.arrayBuffer();
      if (buf.byteLength !== m.bytes) throw new Error('mappa offline ' + id + ' incompleta');
      return buf;
    },
    async elimina(id) {
      const tutti = await riordina();
      for (const m of tutti.filter((x) => x.id === id)) {
        await cancella(nomeMeta(m));      // prima i metadati: da questo istante non risulta piu' scaricata
        await cancella(nomeFile(m));
      }
    }
  };
}

/* ------------------------------------------------------------------ memoria (test) */

export function archivioMemoria() {
  const dati = new Map();
  return {
    tipo: 'memoria (test)',
    persistente: false,
    async richiediPersistenza() { return false; },
    async stimaSpazio() { return null; },
    async elenca() { return [...dati.values()].filter((r) => r.blob.size === r.meta.bytes).map((r) => r.meta); },
    async salva(id, blob, meta) { dati.set(id, { blob, meta }); },
    async apri(id) { const r = dati.get(id); if (!r) throw new Error('non presente'); return r.blob.arrayBuffer(); },
    async elimina(id) { dati.delete(id); },
    _dati: dati
  };
}

/** L'adattatore giusto per dove gira l'app. */
export function archivioPredefinito(cap = globalThis.Capacitor) {
  const nativo = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Filesystem;
  if (nativo) {
    let piattaforma = 'android';
    try { if (cap.getPlatform) piattaforma = cap.getPlatform(); } catch { /* android */ }
    return archivioFilesystem({ Filesystem: cap.Plugins.Filesystem, convertFileSrc: (u) => cap.convertFileSrc(u), piattaforma });
  }
  return archivioIndexedDB();
}
