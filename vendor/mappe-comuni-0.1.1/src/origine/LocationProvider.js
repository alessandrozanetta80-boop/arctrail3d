// ORIGINE: Adrenalina battuta-live/js/location/LocationProvider.js (commit c6586b6636, SHA-256 fonte ab3844ea6edc2acf…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: contratto del provider GPS.
// Sostituzioni: nessuna (copia identica).
// LOCATION PROVIDER — interfaccia comune di ogni sorgente di posizione.
//
// Il resto dell'app (mappa, sincronizzazione, stato) conosce SOLO questa
// interfaccia. Aggiungere una sorgente (app nativa, collare GPS) vuol dire
// scrivere un nuovo provider, non cambiare la mappa.
//
//   start(suPosizione, suErrore, opzioni)  inizia a produrre posizioni
//   stop()                                 smette e libera le risorse
//   stato()                                vedi STATO_GPS
//
// suPosizione riceve { lat, lon, timestamp, accuracy, speed, heading,
// altitude } con null per i valori non forniti dal dispositivo: nessun
// valore viene inventato (ne' velocita' ne' direzione).
// suErrore riceve { codice, messaggio } con codice in ERRORE_GPS.

export const STATO_GPS = Object.freeze({
  SPENTO: 'SPENTO',
  IN_ATTESA: 'IN_ATTESA',      // avviato, nessuna posizione ancora
  ATTIVO: 'ATTIVO',
  NEGATO: 'NEGATO',            // permesso rifiutato
  NON_DISPONIBILE: 'NON_DISPONIBILE',
  NON_SUPPORTATO: 'NON_SUPPORTATO'
});

export const ERRORE_GPS = Object.freeze({
  PERMESSO_NEGATO: 'PERMESSO_NEGATO',
  POSIZIONE_NON_DISPONIBILE: 'POSIZIONE_NON_DISPONIBILE',
  TIMEOUT: 'TIMEOUT',
  NON_SUPPORTATO: 'NON_SUPPORTATO',
  CONTESTO_NON_SICURO: 'CONTESTO_NON_SICURO'
});

export class LocationProvider {
  /** Nome leggibile della sorgente (per diagnosi e interfaccia). */
  get nome() { return 'astratto'; }
  /** SORGENTE.* di shared/modello.js prodotta da questo provider. */
  get sorgente() { throw new Error('non implementato'); }
  // eslint-disable-next-line no-unused-vars
  start(suPosizione, suErrore, opzioni) { throw new Error('non implementato'); }
  stop() {}
  stato() { return STATO_GPS.SPENTO; }
}
