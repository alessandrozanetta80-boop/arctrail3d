// ORIGINE: Adrenalina battuta-live/js/location/SimulatedLocationProvider.js (commit c6586b6636, SHA-256 fonte 91b6cfeeca7fbc85…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: GPS SIMULATO per prove e demo.
// Sostituzioni: 1 (elenco in strumenti/importa-da-fonti.mjs).
// SIMULATE — posizione SIMULATA per sviluppo e test.
//
// Si attiva solo in modo esplicito (?simula=1 nell'indirizzo, oppure dai
// test). La sorgente e' SORGENTE.SIMULATED: il server la accetta solo per
// partecipanti entrati come simulati, e l'interfaccia mostra sempre
// l'etichetta "SIMULATA". Le coordinate di partenza sono un punto
// generico passato dall'esterno, non dati reali di nessuno.

import { LocationProvider, STATO_GPS } from './LocationProvider.js';
import { SORGENTE } from './modello.js';

export class SimulatedLocationProvider extends LocationProvider {
  constructor({ partenza, passoMetri = 3, intervalloMs = 2000, accuracy = 12 } = {}) {
    super();
    if (!partenza) throw new Error('SIMULATE: serve un punto di partenza esplicito');
    this.pos = { ...partenza };
    this.passo = passoMetri;
    this.intervallo = intervalloMs;
    this.accuracy = accuracy;
    this.timer = null;
    this._stato = STATO_GPS.SPENTO;
    this.angolo = Math.random() * 360;
  }

  get nome() { return 'SIMULATA'; }
  get sorgente() { return SORGENTE.SIMULATED; }
  stato() { return this._stato; }

  start(suPosizione) {
    this.stop();
    this._stato = STATO_GPS.ATTIVO;
    const emetti = () => {
      // passo casuale ma continuo: una camminata, non un salto
      this.angolo += (Math.random() - 0.5) * 60;
      const r = this.angolo * Math.PI / 180;
      this.pos.lat += (this.passo * Math.cos(r)) / 111_320;
      this.pos.lon += (this.passo * Math.sin(r)) / (111_320 * Math.cos(this.pos.lat * Math.PI / 180));
      suPosizione({ lat: this.pos.lat, lon: this.pos.lon, timestamp: Date.now(),
        accuracy: this.accuracy, speed: this.passo / (this.intervallo / 1000),
        heading: ((this.angolo % 360) + 360) % 360, altitude: null });
    };
    emetti();
    this.timer = setInterval(emetti, this.intervallo);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this._stato = STATO_GPS.SPENTO;
  }
}
