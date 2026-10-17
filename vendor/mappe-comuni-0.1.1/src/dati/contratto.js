// CONTRATTO COMUNE DEI DATI DELLA MAPPA (overlay e punti cartografici), uguale per Firebase e Supabase.
//
// Chi fa cosa:
//   - l'APP inizializza Firebase/Supabase, fa il login e decide i permessi; passa all'adattatore il client gia' pronto
//     e lo SCOPE {ente, utente, permessi}. La base comune non crea app cloud, non legge credenziali, non conosce ruoli.
//   - l'ADATTATORE applica lo scope a OGNI lettura, scrittura e ascolto (filtro sul campo di scope nella query, campo
//     forzato nelle scritture, controllo del record prima di modificarlo/eliminarlo), scarta e conta le righe di altri
//     enti che arrivassero comunque, chiude gli ascolti al cambio di scope o al logout.
//   - il DATABASE resta l'ultima difesa: RLS (Supabase) o Firestore rules devono imporre lo stesso scope
//     (docs/SICUREZZA_DATI.md). Il filtro dell'adattatore NON sostituisce le regole del server.
//
// Forma di un punto (lato mappa): { id, lat, lon, nome?, tipo?, note? } — i nomi delle colonne/campi sono configurazione.

export const OPERAZIONI = Object.freeze(['leggi', 'ascolta', 'crea', 'aggiorna', 'elimina']);

export class ErroreDatiMappa extends Error {
  /** @param {'NON_SUPPORTATO'|'SCOPE_MANCANTE'|'PERMESSO'|'FUORI_SCOPE'|'CONFIG'|'CHIAVE_VIETATA'|'BACKEND'|'NON_TROVATO'|'SCOPE_CAMBIATO'} codice */
  constructor(codice, messaggio, causa) {
    super(messaggio);
    this.name = 'ErroreDatiMappa';
    this.codice = codice;
    if (causa) this.causa = causa;
  }
}

// ente e utente finiscono in filtri di query (es. Supabase `ente_id=eq.X`): solo caratteri sicuri, niente iniezioni.
const ID_SICURO = /^[A-Za-z0-9_.:@-]{1,128}$/;

/** Valida lo scope ricevuto dall'app. Lancia ErroreDatiMappa('SCOPE_MANCANTE'). */
export function validaScope(scope) {
  if (!scope || typeof scope !== 'object') throw new ErroreDatiMappa('SCOPE_MANCANTE', 'scope mancante: l\'app deve passare {ente, utente, permessi} dopo il login');
  const { ente, utente } = scope;
  if (typeof ente !== 'string' || !ID_SICURO.test(ente)) throw new ErroreDatiMappa('SCOPE_MANCANTE', 'scope.ente mancante o non valido');
  if (typeof utente !== 'string' || !ID_SICURO.test(utente)) throw new ErroreDatiMappa('SCOPE_MANCANTE', 'scope.utente mancante o non valido');
  // FAIL-CLOSED: senza elenco esplicito di permessi dall'app nessuna operazione e' consentita (nessuna autorizzazione implicita)
  const permessi = Array.isArray(scope.permessi) ? scope.permessi.filter((p) => OPERAZIONI.includes(p)) : [];
  return Object.freeze({ ente, utente, permessi: Object.freeze([...new Set(permessi)]) });
}

/** Valida la configurazione di una collezione/tabella. */
export function validaCollezione(nome, def, chiaveNome) {
  if (!def || typeof def !== 'object') throw new ErroreDatiMappa('CONFIG', 'collezione «' + nome + '» senza configurazione');
  if (typeof def[chiaveNome] !== 'string' || !def[chiaveNome]) throw new ErroreDatiMappa('CONFIG', 'collezione «' + nome + '»: manca «' + chiaveNome + '»');
  if (typeof def.campoScope !== 'string' || !def.campoScope) throw new ErroreDatiMappa('CONFIG', 'collezione «' + nome + '»: manca campoScope (isolamento per ente obbligatorio)');
  const operazioni = Array.isArray(def.operazioni) ? def.operazioni : ['leggi', 'ascolta'];
  for (const o of operazioni) if (!OPERAZIONI.includes(o)) throw new ErroreDatiMappa('CONFIG', 'collezione «' + nome + '»: operazione sconosciuta ' + o);
  const campi = { id: 'id', lat: 'lat', lon: 'lon', nome: 'nome', tipo: 'tipo', note: 'note', ...(def.campi || {}) };
  return Object.freeze({ ...def, nome, operazioni: Object.freeze(operazioni), campi: Object.freeze(campi), campoAutore: def.campoAutore || null });
}

/** Numero vero: number finito o stringa numerica (colonne numeric di Postgres). null, '', spazi, booleani -> null (mai 0 inventato). */
export function numeroCoordinata(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v);
  return null;
}

/** Riga del database -> punto della mappa. null se senza coordinate valide o senza id. */
export function rigaAPunto(def, riga, id = undefined) {
  if (!riga) return null;
  const c = def.campi;
  const lat = numeroCoordinata(riga[c.lat]), lon = numeroCoordinata(riga[c.lon]);
  const idVero = id !== undefined ? id : riga[c.id];
  if (idVero === undefined || idVero === null || String(idVero).trim() === '') return null;
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const p = { id: String(idVero), lat, lon };
  for (const k of ['nome', 'tipo', 'note']) if (riga[c[k]] !== undefined && riga[c[k]] !== null) p[k] = String(riga[c[k]]);
  return p;
}

/** Punto (o modifiche parziali) -> riga del database, SENZA campo di scope (lo mette l'adattatore). */
export function puntoARiga(def, punto, { parziale = false } = {}) {
  if (!punto || typeof punto !== 'object') throw new ErroreDatiMappa('CONFIG', 'punto mancante');
  const c = def.campi;
  const riga = {};
  for (const k of ['lat', 'lon']) {
    if (punto[k] === undefined && parziale) continue;
    const v = numeroCoordinata(punto[k]);
    if (v === null || (k === 'lat' ? Math.abs(v) > 90 : Math.abs(v) > 180)) throw new ErroreDatiMappa('CONFIG', 'coordinata ' + k + ' non valida');
    riga[c[k]] = v;
  }
  for (const k of ['nome', 'tipo', 'note']) if (punto[k] !== undefined) riga[c[k]] = punto[k] === null ? null : String(punto[k]).slice(0, 500);
  return riga;
}

/**
 * Parte comune degli adattatori: scope, permessi, ascolti con generazione, scarto delle righe fuori scope.
 * Le sottoclassi implementano _leggi, _ascolta, _crea, _aggiorna, _elimina.
 */
export class FonteDatiBase {
  constructor({ tipo, collezioni, chiaveNome, supporta }) {
    this.tipo = tipo;
    this.scope = null;
    this.generazione = 0;
    this.ascolti = new Set();
    this.scartatiFuoriScope = 0;
    this.supporta = new Set(supporta);
    this.collezioni = new Map();
    for (const [nome, def] of Object.entries(collezioni || {})) this.collezioni.set(nome, validaCollezione(nome, def, chiaveNome));
    if (!this.collezioni.size) throw new ErroreDatiMappa('CONFIG', 'nessuna collezione configurata');
  }

  /** Operazioni davvero disponibili per la collezione: configurate E supportate dal backend. */
  capacita(nome) {
    const def = this.collezioni.get(nome);
    return def ? def.operazioni.filter((o) => this.supporta.has(o)) : [];
  }

  /** Imposta (o cambia) lo scope: chiude SEMPRE gli ascolti precedenti, anche se l'ente e' lo stesso. */
  impostaScope(scope) {
    const s = validaScope(scope);
    this.fermaAscolti();
    this.scope = s;
    return s;
  }

  /** Logout: niente piu' scope, nessun ascolto attivo, nessuna richiesta possibile. */
  chiudi() {
    this.fermaAscolti();
    this.scope = null;
  }

  fermaAscolti() {
    this.generazione++;
    for (const stop of [...this.ascolti]) { try { stop(); } catch { /* gia' chiuso */ } }
    this.ascolti.clear();
  }

  ascoltiAttivi() { return this.ascolti.size; }

  _controlla(nome, operazione) {
    const def = this.collezioni.get(nome);
    if (!def) throw new ErroreDatiMappa('CONFIG', 'collezione sconosciuta: ' + nome);
    if (!this.supporta.has(operazione)) throw new ErroreDatiMappa('NON_SUPPORTATO', this.tipo + ': operazione «' + operazione + '» non supportata da questo adattatore');
    if (!def.operazioni.includes(operazione)) throw new ErroreDatiMappa('NON_SUPPORTATO', 'collezione «' + nome + '»: operazione «' + operazione + '» non prevista dalla configurazione');
    if (!this.scope) throw new ErroreDatiMappa('SCOPE_MANCANTE', 'nessuno scope attivo (login non fatto o logout)');
    if (!this.scope.permessi.includes(operazione)) throw new ErroreDatiMappa('PERMESSO', 'permesso «' + operazione + '» non concesso dall\'app per questo utente');
    return def;
  }

  /** Tiene solo le righe dell'ente corrente; le altre si contano (diagnostica) e non arrivano mai alla mappa. */
  _filtraScope(def, righe, ente) {
    const ok = [];
    for (const r of righe) {
      if (r && r.riga && String(r.riga[def.campoScope]) === ente) ok.push(r);
      else this.scartatiFuoriScope++;
    }
    return ok;
  }

  _rigaDaScrivere(def, punto, parziale) {
    const riga = puntoARiga(def, punto, { parziale });
    if (punto && Object.prototype.hasOwnProperty.call(punto, def.campoScope) && String(punto[def.campoScope]) !== this.scope.ente) {
      throw new ErroreDatiMappa('FUORI_SCOPE', 'tentata scrittura su un altro ente');
    }
    if (!parziale) {
      riga[def.campoScope] = this.scope.ente;
      if (def.campoAutore) riga[def.campoAutore] = this.scope.utente;
    }
    return riga;
  }

  async elenca(nome) {
    const def = this._controlla(nome, 'leggi');
    const ente = this.scope.ente;
    const gen = this.generazione;
    const lette = await this._leggi(def, ente);
    // risposta arrivata dopo un cambio di ente o un logout: non appartiene piu' allo scope corrente, si scarta
    this._ancoraValido(gen, ente);
    const righe = this._filtraScope(def, lette, ente);
    return righe.map((r) => rigaAPunto(def, r.riga, r.id)).filter(Boolean);
  }

  /**
   * Ascolto in tempo reale. Restituisce la funzione per fermarlo. Dopo stop, cambio scope o logout nessun callback arriva piu'.
   * @param {(punti: object[]) => void} suDati
   * @param {(e: ErroreDatiMappa) => void} [suErrore]
   */
  ascolta(nome, suDati, suErrore = () => {}) {
    const def = this._controlla(nome, 'ascolta');
    const ente = this.scope.ente;
    const gen = this.generazione;
    let attivo = true;
    const vivo = () => attivo && gen === this.generazione && this.scope && this.scope.ente === ente;
    const consegna = (righe) => { if (vivo()) suDati(this._filtraScope(def, righe, ente).map((r) => rigaAPunto(def, r.riga, r.id)).filter(Boolean)); };
    const errore = (e) => { if (vivo()) suErrore(e instanceof ErroreDatiMappa ? e : new ErroreDatiMappa('BACKEND', String(e && e.message || e), e)); };
    let stopBackend = null;
    const stop = () => {
      if (!attivo) return;
      attivo = false;
      this.ascolti.delete(stop);
      if (stopBackend) { try { stopBackend(); } catch { /* gia' chiuso */ } }
    };
    this.ascolti.add(stop);
    stopBackend = this._ascolta(def, ente, consegna, errore);
    return stop;
  }

  /** Lancia SCOPE_CAMBIATO se dopo un await l'ente o la generazione non sono piu' quelli dell'inizio dell'operazione. */
  _ancoraValido(gen, ente) {
    if (gen !== this.generazione || !this.scope || this.scope.ente !== ente) {
      throw new ErroreDatiMappa('SCOPE_CAMBIATO', 'ente cambiato o logout durante l\'operazione: risultato scartato');
    }
  }

  async crea(nome, punto) {
    const def = this._controlla(nome, 'crea');
    return this._crea(def, this._rigaDaScrivere(def, punto, false));
  }

  async aggiorna(nome, id, modifiche) {
    const def = this._controlla(nome, 'aggiorna');
    if (modifiche && Object.prototype.hasOwnProperty.call(modifiche, def.campoScope)) throw new ErroreDatiMappa('FUORI_SCOPE', 'il campo di scope non si modifica');
    return this._aggiorna(def, this.scope.ente, this._id(id), this._rigaDaScrivere(def, modifiche, true), this._guardia());
  }

  async elimina(nome, id) {
    const def = this._controlla(nome, 'elimina');
    return this._elimina(def, this.scope.ente, this._id(id), this._guardia());
  }

  _id(id) {
    if (id === undefined || id === null || String(id).trim() === '') throw new ErroreDatiMappa('CONFIG', 'id mancante');
    return String(id);
  }

  /** Funzione da chiamare prima di INVIARE una scrittura dopo un await: se nel frattempo c'e' stato cambio ente/logout, si annulla. */
  _guardia() {
    const gen = this.generazione, ente = this.scope.ente;
    return () => this._ancoraValido(gen, ente);
  }
}
