// ADATTATORE FIREBASE (Cloud Firestore) — usa il Firestore GIA' INIZIALIZZATO DALL'APP con l'utente autenticato.
// Due forme, come le nostre app:
//   - modulare (SDK v9+): { db, sdk: { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc } }
//     (le funzioni si passano perche' nel modulare non sono metodi del db; la base non importa 'firebase')
//   - compat (Adrenalina usa firebase-*-compat.js): { db } con db.collection(...)
// Qui non si chiama initializeApp, non si leggono chiavi, non si fanno login, non si tocca Supabase.
//
// Isolamento: ogni query ha where(campoScope, '==', ente); addDoc con campoScope forzato; update/delete RILEGGONO il
// documento e procedono solo se e' dell'ente corrente (altrimenti FUORI_SCOPE / NON_TROVATO); ascolti chiusi al cambio
// scope/logout. Verifica e scrittura NON sono atomiche: fra le due puo' cambiare il documento (le Firestore rules
// restano l'unica garanzia lato server, docs/SICUREZZA_DATI.md); se cambia l'ente o c'e' logout durante la verifica la
// scrittura non viene inviata; una scrittura gia' inviata non si puo' richiamare.
// Vietato: Firestore di firebase-admin (privilegi di servizio, ignora le regole) -> errore CHIAVE_VIETATA.
import { FonteDatiBase, ErroreDatiMappa } from './contratto.js';

const FUNZIONI_MODULARI = ['collection', 'query', 'where', 'getDocs', 'addDoc', 'updateDoc', 'deleteDoc', 'doc', 'getDoc'];

/** true se `db` e' il Firestore di firebase-admin / @google-cloud/firestore (solo server). */
export function firestoreAmministrativo(db) {
  return !!db && (typeof db.listCollections === 'function' || typeof db.recursiveDelete === 'function' || typeof db.getAll === 'function');
}

const errore = (e, cosa) => new ErroreDatiMappa(e && e.code === 'permission-denied' ? 'PERMESSO' : 'BACKEND', 'Firestore ' + cosa + ': ' + (e && e.message || e), e);

export class FonteDatiFirebase extends FonteDatiBase {
  /**
   * @param {{db: object, sdk?: object, collezioni: Record<string, {collezione: string, campoScope: string, campoAutore?: string, campi?: object, operazioni?: string[]}>}} opz
   */
  constructor({ db, sdk = null, collezioni } = {}) {
    if (!db) throw new ErroreDatiMappa('CONFIG', 'Firebase: serve il Firestore inizializzato dall\'app');
    if (firestoreAmministrativo(db)) throw new ErroreDatiMappa('CHIAVE_VIETATA', 'Firebase: Firestore di firebase-admin vietato nel browser (ignora le regole di sicurezza)');
    let modo;
    if (sdk) {
      const mancano = FUNZIONI_MODULARI.filter((f) => typeof sdk[f] !== 'function');
      if (mancano.length) throw new ErroreDatiMappa('CONFIG', 'Firebase modulare: funzioni mancanti in sdk: ' + mancano.join(', '));
      modo = 'modulare';
    } else if (typeof db.collection === 'function') {
      modo = 'compat';
    } else {
      throw new ErroreDatiMappa('CONFIG', 'Firebase: db non riconosciuto (serve sdk per il modulare o un db compat)');
    }
    const realtime = modo === 'compat' || typeof sdk.onSnapshot === 'function';
    super({ tipo: 'firebase', collezioni, chiaveNome: 'collezione', supporta: ['leggi', 'crea', 'aggiorna', 'elimina', ...(realtime ? ['ascolta'] : [])] });
    this.db = db;
    this.sdk = sdk;
    this.modo = modo;
  }

  _query(def, ente) {
    if (this.modo === 'compat') return this.db.collection(def.collezione).where(def.campoScope, '==', ente);
    const s = this.sdk;
    return s.query(s.collection(this.db, def.collezione), s.where(def.campoScope, '==', ente));
  }

  _righe(snap) {
    const fuori = [];
    snap.forEach((d) => fuori.push({ id: d.id, riga: d.data() }));
    return fuori;
  }

  async _leggi(def, ente) {
    try {
      const q = this._query(def, ente);
      return this._righe(this.modo === 'compat' ? await q.get() : await this.sdk.getDocs(q));
    } catch (e) { throw errore(e, 'lettura ' + def.collezione); }
  }

  _ascolta(def, ente, consegna, segnalaErrore) {
    const q = this._query(def, ente);
    const suSnap = (snap) => consegna(this._righe(snap));
    const suErr = (e) => segnalaErrore(errore(e, 'ascolto ' + def.collezione));
    return this.modo === 'compat' ? q.onSnapshot(suSnap, suErr) : this.sdk.onSnapshot(q, suSnap, suErr);
  }

  _rif(def, id) {
    return this.modo === 'compat' ? this.db.collection(def.collezione).doc(id) : this.sdk.doc(this.db, def.collezione, id);
  }

  /** Rilegge il documento e verifica che sia dell'ente corrente prima di modificarlo. */
  async _verificaProprietario(def, ente, id) {
    let snap;
    try {
      const rif = this._rif(def, id);
      snap = this.modo === 'compat' ? await rif.get() : await this.sdk.getDoc(rif);
    } catch (e) { throw errore(e, 'lettura ' + def.collezione + '/' + id); }
    const esiste = typeof snap.exists === 'function' ? snap.exists() : !!snap.exists;
    if (!esiste) throw new ErroreDatiMappa('NON_TROVATO', 'documento inesistente: ' + id);
    const dati = snap.data() || {};
    if (String(dati[def.campoScope]) !== ente) throw new ErroreDatiMappa('FUORI_SCOPE', 'documento di un altro ente: modifica rifiutata');
  }

  async _crea(def, riga) {
    try {
      const r = this.modo === 'compat' ? await this.db.collection(def.collezione).add(riga) : await this.sdk.addDoc(this.sdk.collection(this.db, def.collezione), riga);
      return String(r.id);
    } catch (e) { throw errore(e, 'inserimento ' + def.collezione); }
  }

  async _aggiorna(def, ente, id, riga, guardia = () => {}) {
    await this._verificaProprietario(def, ente, id);
    guardia();   // cambio ente/logout durante la verifica: la scrittura NON parte
    try {
      const rif = this._rif(def, id);
      if (this.modo === 'compat') await rif.update(riga); else await this.sdk.updateDoc(rif, riga);
      return true;
    } catch (e) { throw errore(e, 'aggiornamento ' + def.collezione + '/' + id); }
  }

  async _elimina(def, ente, id, guardia = () => {}) {
    await this._verificaProprietario(def, ente, id);
    guardia();   // cambio ente/logout durante la verifica: l'eliminazione NON parte
    try {
      const rif = this._rif(def, id);
      if (this.modo === 'compat') await rif.delete(); else await this.sdk.deleteDoc(rif);
      return true;
    } catch (e) { throw errore(e, 'eliminazione ' + def.collezione + '/' + id); }
  }
}

export const creaAdattatoreFirebase = (opz) => new FonteDatiFirebase(opz);
