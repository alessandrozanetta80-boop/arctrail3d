// ORIGINE: Adrenalina battuta-live/js/location/BrowserGeolocationProvider.js (commit c6586b6636, SHA-256 fonte 2011a5cd96f258f2…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: GPS del browser.
// Sostituzioni: 1 (elenco in strumenti/importa-da-fonti.mjs).
// POSIZIONE DAL BROWSER — Geolocation API (watchPosition).
//
// Limiti reali (vedi docs/GPS-BACKGROUND.md):
//   - serve un contesto sicuro (https:// oppure http://localhost);
//   - a schermo spento, scheda in background o telefono bloccato il
//     browser SOSPENDE o rallenta gli aggiornamenti: questo provider NON
//     garantisce il tracciamento continuo. Per quello serve l'app nativa.

import { LocationProvider, STATO_GPS, ERRORE_GPS } from './LocationProvider.js';
import { SORGENTE } from './modello.js';

function numero(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }

/**
 * Istante del fix in millisecondi. Alcuni motori (WebKit, visto nelle prove
 * del 24/09/2026) lo danno in MICROSECONDI: 1790214458785000 invece di
 * 1790214458785. Un istante cosi' "nel futuro" faceva sembrare live per
 * sempre una posizione ferma da ore (e sballava eta' e durate della traccia).
 * Microsecondi -> millisecondi; un valore ancora assurdo (piu' di un'ora
 * avanti) o assente -> l'ora di ricezione.
 */
export function istanteFix(t, ricevuto = Date.now()) {
  let v = numero(t);
  if (v === null) return ricevuto;
  if (v > ricevuto * 100) v = Math.round(v / 1000);
  if (v > ricevuto + 3_600_000) return ricevuto;
  return v;
}

export class BrowserGeolocationProvider extends LocationProvider {
  constructor(geolocation = (typeof navigator !== 'undefined' ? navigator.geolocation : undefined),
    { contestoSicuro = (typeof window !== 'undefined' ? window.isSecureContext : true) } = {}) {
    super();
    this.geo = geolocation;
    this.contestoSicuro = contestoSicuro;
    this.idWatch = null;
    this._stato = STATO_GPS.SPENTO;
  }

  get nome() { return 'Browser (Geolocation API)'; }
  get sorgente() { return SORGENTE.PHONE; }
  stato() { return this._stato; }

  start(suPosizione, suErrore, opzioni = {}) {
    if (!this.contestoSicuro) {
      this._stato = STATO_GPS.NON_SUPPORTATO;
      suErrore({ codice: ERRORE_GPS.CONTESTO_NON_SICURO,
        messaggio: 'Il browser blocca il GPS su questo indirizzo: serve https:// (o localhost).' });
      return;
    }
    if (!this.geo || typeof this.geo.watchPosition !== 'function') {
      this._stato = STATO_GPS.NON_SUPPORTATO;
      suErrore({ codice: ERRORE_GPS.NON_SUPPORTATO, messaggio: 'Questo browser non fornisce la posizione.' });
      return;
    }
    this.stop();
    this._stato = STATO_GPS.IN_ATTESA;
    this.idWatch = this.geo.watchPosition(
      (p) => {
        this._stato = STATO_GPS.ATTIVO;
        const c = p.coords;
        suPosizione({
          lat: c.latitude,
          lon: c.longitude,
          // istante della rilevazione fornito dal browser, non "adesso" (in ms: vedi istanteFix)
          timestamp: istanteFix(p.timestamp),
          accuracy: numero(c.accuracy),
          // velocita' e direzione solo se il dispositivo le fornisce davvero
          speed: numero(c.speed),
          heading: numero(c.heading) !== null && numero(c.speed) !== null && c.speed > 0.3
            ? c.heading : null,
          altitude: numero(c.altitude)
        });
      },
      (e) => {
        const codice = e && e.code === 1 ? ERRORE_GPS.PERMESSO_NEGATO
          : e && e.code === 3 ? ERRORE_GPS.TIMEOUT : ERRORE_GPS.POSIZIONE_NON_DISPONIBILE;
        if (codice === ERRORE_GPS.PERMESSO_NEGATO) this._stato = STATO_GPS.NEGATO;
        else if (this._stato !== STATO_GPS.ATTIVO) this._stato = STATO_GPS.NON_DISPONIBILE;
        suErrore({ codice, messaggio: messaggioErrore(codice) });
      },
      {
        enableHighAccuracy: opzioni.enableHighAccuracy !== false,
        maximumAge: opzioni.maximumAge ?? 0,
        timeout: opzioni.timeout ?? 30_000
      }
    );
  }

  stop() {
    if (this.idWatch !== null && this.geo) this.geo.clearWatch(this.idWatch);
    this.idWatch = null;
    if (this._stato !== STATO_GPS.NEGATO) this._stato = STATO_GPS.SPENTO;
  }
}

function messaggioErrore(codice) {
  switch (codice) {
    case ERRORE_GPS.PERMESSO_NEGATO:
      return 'Permesso di posizione negato. Abilitalo nelle impostazioni del browser per questo sito.';
    case ERRORE_GPS.TIMEOUT:
      return 'Il GPS non ha risposto in tempo. Continuo a provare.';
    default:
      return 'Posizione non disponibile al momento (cielo coperto, bosco fitto o GPS spento).';
  }
}
