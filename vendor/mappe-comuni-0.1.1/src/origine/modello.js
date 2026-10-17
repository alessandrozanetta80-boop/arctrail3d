// ORIGINE: Adrenalina battuta-live/shared/modello.js (commit c6586b6636, SHA-256 fonte b792ecc86bcc5698…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: SORGENTE dei fix GPS (provider di posizione).
// Sostituzioni: nessuna (copia identica).
// MODELLO DEI DATI — condiviso fra browser e server (moduli ES puri).
//
// Concetti:
//   LiveSession      una Battuta Live: id, codice di accesso, stato, orari
//   Participant      una persona entrata nella sessione (nome, consenso GPS)
//   TrackedEntity    qualcosa che ha una posizione sulla mappa. Oggi solo
//                    PERSON da PHONE; in futuro DOG da TRACKER, senza
//                    cambiare il resto dell'architettura
//   PositionSample   una singola rilevazione di posizione, con il suo
//                    istante GPS e l'istante di ricezione del server
//   DeviceState      stato del dispositivo (GPS, rete, batteria se nota)
//   MapLayer         strato cartografico (base o territoriale)

export const TIPO_ENTITA = Object.freeze({
  PERSON: 'PERSON',
  DOG: 'DOG'            // predisposto: NON implementato (vedi DogLocationProvider)
});

export const SORGENTE = Object.freeze({
  PHONE: 'PHONE',
  TRACKER: 'TRACKER',   // predisposto: NON implementato
  OTHER: 'OTHER',
  SIMULATED: 'SIMULATED' // solo test/simulazioni, sempre visibile come tale in UI
});

export const STATO_SESSIONE = Object.freeze({
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',     // chiusa dall'organizzatore
  EXPIRED: 'EXPIRED'    // scaduta (durata massima o inattivita')
});

/**
 * @typedef {Object} PositionSample
 * @property {string} entityId        partecipante / dispositivo che ha rilevato
 * @property {number} seq             progressivo del dispositivo (crescente)
 * @property {number} lat             gradi WGS84 [-90, 90]
 * @property {number} lon             gradi WGS84 [-180, 180]
 * @property {number} timestamp       istante della rilevazione GPS (ms epoch)
 * @property {number|null} accuracy   raggio di incertezza in metri
 * @property {number|null} speed      m/s, solo se fornita dal dispositivo
 * @property {number|null} heading    gradi [0, 360), solo se fornita
 * @property {number|null} altitude   metri, solo se fornita
 * @property {string} source          SORGENTE.*
 * @property {number} [receivedAt]    istante di ricezione del server (ms)
 */

/**
 * @typedef {Object} TrackedEntity
 * @property {string} id
 * @property {string} type            TIPO_ENTITA.*
 * @property {string} source          SORGENTE.*
 * @property {string} label           nome mostrato
 * @property {PositionSample|null} last  ultima posizione ACCETTATA
 * @property {Object} [dog]           solo type=DOG (futuro), vedi shared/cani.js
 */

/** Crea un PositionSample dai dati di un fornitore di posizione. */
export function creaCampione(entityId, seq, dati, source = SORGENTE.PHONE) {
  return {
    entityId,
    seq,
    lat: dati.lat,
    lon: dati.lon,
    timestamp: dati.timestamp,
    accuracy: numeroONull(dati.accuracy),
    speed: numeroONull(dati.speed),
    heading: numeroONull(dati.heading),
    altitude: numeroONull(dati.altitude),
    source
  };
}

/** Crea una TrackedEntity. Oggi usata solo con PERSON/PHONE. */
export function creaEntita({ id, type = TIPO_ENTITA.PERSON, source = SORGENTE.PHONE, label }) {
  return { id, type, source, label, last: null };
}

function numeroONull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Regola di ordinamento: un campione nuovo sostituisce l'ultimo accettato
 * solo se e' davvero piu' recente. Mai sovrascrivere una posizione nuova
 * con una vecchia (arrivi fuori ordine, ritrasmissioni, code offline).
 * A parita' di istante GPS decide il progressivo del dispositivo.
 * @returns {'ACCETTATO'|'DUPLICATO'|'VECCHIO'}
 */
export function confrontaCampioni(ultimo, nuovo) {
  if (!ultimo) return 'ACCETTATO';
  if (nuovo.seq === ultimo.seq && nuovo.timestamp === ultimo.timestamp) return 'DUPLICATO';
  if (nuovo.timestamp > ultimo.timestamp) return 'ACCETTATO';
  if (nuovo.timestamp === ultimo.timestamp && nuovo.seq > ultimo.seq) return 'ACCETTATO';
  return 'VECCHIO';
}
