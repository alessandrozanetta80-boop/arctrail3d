// GPS: provider di posizione di Adrenalina (browser, simulato). Separato dal database: la posizione non passa dagli adattatori.
export { LocationProvider, STATO_GPS, ERRORE_GPS } from './origine/LocationProvider.js';
export { BrowserGeolocationProvider } from './origine/BrowserGeolocationProvider.js';
export { SimulatedLocationProvider } from './origine/SimulatedLocationProvider.js';
