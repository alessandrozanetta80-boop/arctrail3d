// ADATTATORE SUPABASE — usa il client supabase-js v2 GIA' CREATO DALL'APP (createClient con chiave pubblica + sessione
// dell'utente). Qui non si crea nessun client, non si leggono chiavi, non si fanno login.
//
// Isolamento: ogni query ha .eq(campoScope, ente); insert con campoScope forzato; update/delete con .eq(campoScope, ente)
// e verifica delle righe toccate (0 righe = NON_TROVATO, mai un successo finto); realtime con filtro
// `campoScope=eq.ente` e canale rimosso al cambio scope/logout. Le policy RLS restano obbligatorie (docs/SICUREZZA_DATI.md).
// Vietato nel browser: chiave service_role / sb_secret_ (aggirerebbe le RLS) -> errore CHIAVE_VIETATA.
import { FonteDatiBase, ErroreDatiMappa } from './contratto.js';

function payloadJwt(t) {
  try {
    const parte = String(t).split('.')[1];
    if (!parte) return null;
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const testo = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(testo);
  } catch { return null; }
}

/** true se la chiave del client e' una chiave di servizio (service_role JWT o nuova sb_secret_). */
export function chiaveDiServizio(client) {
  const chiavi = [client && client.supabaseKey, client && client.headers && client.headers.apikey, client && client.rest && client.rest.headers && client.rest.headers.apikey]
    .filter((k) => typeof k === 'string');
  return chiavi.some((k) => k.startsWith('sb_secret_') || (payloadJwt(k) || {}).role === 'service_role');
}

const errore = (e, cosa) => new ErroreDatiMappa('BACKEND', 'Supabase ' + cosa + ': ' + (e && (e.message || e.details) || e), e);

export class FonteDatiSupabase extends FonteDatiBase {
  /**
   * @param {{client: object, collezioni: Record<string, {tabella: string, schema?: string, campoScope: string, campoAutore?: string, campi?: object, operazioni?: string[]}>}} opz
   */
  constructor({ client, collezioni } = {}) {
    if (!client || typeof client.from !== 'function') throw new ErroreDatiMappa('CONFIG', 'Supabase: serve il client supabase-js creato dall\'app');
    if (chiaveDiServizio(client)) throw new ErroreDatiMappa('CHIAVE_VIETATA', 'Supabase: chiave di servizio (service_role/sb_secret) vietata nel browser: usare la chiave pubblica + sessione utente');
    const realtime = typeof client.channel === 'function' && typeof client.removeChannel === 'function';
    super({ tipo: 'supabase', collezioni, chiaveNome: 'tabella', supporta: ['leggi', 'crea', 'aggiorna', 'elimina', ...(realtime ? ['ascolta'] : [])] });
    this.client = client;
  }

  _tab(def) { return def.schema ? this.client.schema(def.schema).from(def.tabella) : this.client.from(def.tabella); }

  async _leggi(def, ente) {
    const { data, error } = await this._tab(def).select('*').eq(def.campoScope, ente);
    if (error) throw errore(error, 'lettura ' + def.tabella);
    return (data || []).map((riga) => ({ id: riga[def.campi.id], riga }));
  }

  _ascolta(def, ente, consegna, segnalaErrore) {
    let chiuso = false;
    // RICARICHE SERIALIZZATE: una sola lettura alla volta; se arriva un evento durante la lettura il risultato (forse
    // gia' vecchio) si scarta e si rilegge. Cosi' una risposta fuori ordine non riporta punti eliminati.
    let inCorso = false, ancora = false;
    const ricarica = async () => {
      if (inCorso) { ancora = true; return; }
      inCorso = true;
      try {
        do {
          ancora = false;
          const r = await this._leggi(def, ente);
          if (chiuso) return;
          if (!ancora) consegna(r);
        } while (ancora && !chiuso);
      } catch (e) { if (!chiuso) segnalaErrore(e); } finally { inCorso = false; }
    };
    const nomeCanale = 'mappe-comuni:' + def.tabella + ':' + ente + ':' + this.generazione;
    const canale = this.client.channel(nomeCanale)
      .on('postgres_changes', { event: '*', schema: def.schema || 'public', table: def.tabella, filter: def.campoScope + '=eq.' + ente }, () => { if (!chiuso) ricarica(); })
      .subscribe((stato, e) => {
        if (chiuso) return;
        if (stato === 'SUBSCRIBED') ricarica();
        else if (stato === 'CHANNEL_ERROR' || stato === 'TIMED_OUT') segnalaErrore(errore(e || stato, 'realtime ' + def.tabella));
      });
    return () => { chiuso = true; try { this.client.removeChannel(canale); } catch { /* gia' rimosso */ } };
  }

  async _crea(def, riga) {
    const { data, error } = await this._tab(def).insert(riga).select(def.campi.id).single();
    if (error) throw errore(error, 'inserimento ' + def.tabella);
    if (!data || data[def.campi.id] === undefined) throw new ErroreDatiMappa('BACKEND', 'Supabase: inserimento senza id restituito (RLS di SELECT mancante?)');
    return String(data[def.campi.id]);
  }

  async _aggiorna(def, ente, id, riga, guardia = () => {}) {
    guardia();
    const { data, error } = await this._tab(def).update(riga).eq(def.campi.id, id).eq(def.campoScope, ente).select(def.campi.id);
    if (error) throw errore(error, 'aggiornamento ' + def.tabella);
    if (!data || !data.length) throw new ErroreDatiMappa('NON_TROVATO', 'nessuna riga aggiornata: id inesistente o di un altro ente');
    return true;
  }

  async _elimina(def, ente, id, guardia = () => {}) {
    guardia();
    const { data, error } = await this._tab(def).delete().eq(def.campi.id, id).eq(def.campoScope, ente).select(def.campi.id);
    if (error) throw errore(error, 'eliminazione ' + def.tabella);
    if (!data || !data.length) throw new ErroreDatiMappa('NON_TROVATO', 'nessuna riga eliminata: id inesistente o di un altro ente');
    return true;
  }
}

export const creaAdattatoreSupabase = (opz) => new FonteDatiSupabase(opz);
