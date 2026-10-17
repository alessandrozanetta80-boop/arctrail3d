// mappe-comuni — base cartografica comune (Adrenalina + Gestionale). Punto d'ingresso per le app vanilla/DOM.
// React: 'mappe-comuni/react'. Dati: 'mappe-comuni/dati'. Stile: 'mappe-comuni/stile.css'.
export { creaMappaComune, archivioConPrefisso } from './ui/mappaComune.js';
export { MotoreMappa, popupArea, nodoSchedaPista } from './motore/MotoreMappa.js';
export { classificaNeutra, STATO_AREA, COLORE_AREA } from './motore/aree.js';
export { caricaTerritorio, problemiTerritorio, FORMATO_TERRITORIO } from './territorio/territorio.js';
export { MAPPE_BASE, MAPPA_OFFLINE, IBRIDA_SENZA_OFFLINE, vociMappaBase, mappaBase } from './origine/fornitori.js';
export { VERSIONE } from './versione.js';
