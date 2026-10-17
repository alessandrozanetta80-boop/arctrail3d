// MAPPE OFFLINE PER COMPRENSORIO — logica pura (niente rete, niente storage).
//
// Tre pacchetti separati, uno per CA: VCO1, VCO2, VCO3. Ognuno si scarica,
// si aggiorna e si elimina da solo. Qui ci sono le regole che non dipendono
// da dove il pacchetto e' salvato (IndexedDB nel browser, file nell'app
// Android): stato, testi, priorita' fra pacchetti che si sovrappongono.
//
// LO STATO NON E' UN FLAG. "Scaricata" vuol dire che il file c'e' davvero,
// con la dimensione dichiarata: lo stato si ricava ogni volta dalla copia
// presente sul telefono confrontata con il manifest, mai da una spunta
// salvata dall'interfaccia. Se iOS ha svuotato lo storage, la mappa torna
// "Non scaricata" invece di promettere uno sfondo che non c'e'.

export const STATO_MAPPA = Object.freeze({
  NON_SCARICATA: 'NON_SCARICATA',
  SCARICATA: 'SCARICATA',
  AGGIORNAMENTO: 'AGGIORNAMENTO'
});

export const TESTO_STATO_MAPPA = Object.freeze({
  NON_SCARICATA: 'Non scaricata',
  SCARICATA: 'Scaricata',
  AGGIORNAMENTO: 'Aggiornamento disponibile'
});

/** Id logici dei pacchetti, nell'ordine in cui si mostrano. */
export const ID_PACCHETTI = Object.freeze(['CAVCO1', 'CAVCO2', 'CAVCO3']);

/** Sigla breve per i messaggi: CAVCO2 -> VCO2. */
export const sigla = (id) => String(id || '').replace(/^CA/, '');

/**
 * Manifest valido? Restituisce l'elenco dei problemi (vuoto = valido).
 * @param {any} m
 */
export function problemiManifest(m) {
  const p = [];
  if (!m || typeof m !== 'object') return ['manifest assente'];
  if (m.schemaVersion !== 1) p.push('schemaVersion non supportata: ' + m.schemaVersion);
  if (!Array.isArray(m.packages)) return [...p, 'packages mancante'];
  for (const x of m.packages) {
    const n = x && x.id ? x.id : '?';
    if (!ID_PACCHETTI.includes(n)) p.push(n + ': id sconosciuto');
    if (!x.versione) p.push(n + ': versione mancante');
    if (!(Number.isInteger(x.bytes) && x.bytes > 0)) p.push(n + ': bytes non valido');
    if (!/^[0-9a-f]{64}$/.test(x.sha256 || '')) p.push(n + ': sha256 non valido');
    if (!x.url) p.push(n + ': url mancante');
    if (!(Array.isArray(x.bbox) && x.bbox.length === 4 && x.bbox.every(Number.isFinite))) p.push(n + ': bbox non valido');
    if (!Number.isFinite(x.minZoom) || !Number.isFinite(x.maxZoom)) p.push(n + ': zoom mancanti');
  }
  return p;
}

/**
 * Stato di un pacchetto.
 * @param {object|null} voce     voce del manifest online (null se il manifest non e' raggiungibile)
 * @param {object|null} locale   metadati della copia PRESENTE e verificata sul telefono, o null
 */
export function statoPacchetto(voce, locale) {
  if (!locale) return STATO_MAPPA.NON_SCARICATA;
  // senza manifest (offline) una copia presente e' semplicemente scaricata
  if (!voce) return STATO_MAPPA.SCARICATA;
  return locale.sha256 === voce.sha256 && locale.versione === voce.versione ? STATO_MAPPA.SCARICATA : STATO_MAPPA.AGGIORNAMENTO;
}

/** Megabyte all'italiana: 30619178 -> "29,2 MB". */
export function formattaMB(byte) {
  const mb = (Number(byte) || 0) / 1048576;
  return mb.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MB';
}

/** "Scaricamento VCO2 — 43% · 14,8 MB di 34,2 MB" */
export function testoAvanzamento(id, fatti, totale) {
  return 'Scaricamento ' + sigla(id) + ' — ' + percentuale(fatti, totale) + '% · ' + formattaMB(fatti) + ' di ' + formattaMB(totale);
}

/** Percentuale intera 0-100 (per la barra). */
export function percentuale(fatti, totale) {
  return totale > 0 ? Math.min(100, Math.floor((fatti / totale) * 100)) : 0;
}

/**
 * CHI DISEGNA DOVE DUE PACCHETTI SI SOVRAPPONGONO.
 *
 * I riquadri hanno 3 km di margine, quindi al confine due pacchetti coprono
 * le stesse tile. Una tile viene da UN SOLO pacchetto: prima quello del
 * comprensorio attivo, poi gli altri nell'ordine VCO1, VCO2, VCO3. Niente
 * doppio disegno (etichette ripetute, aloni piu' scuri) e nessun cambio
 * di fonte mentre si trascina la mappa.
 *
 * @param {string[]} installati  id dei pacchetti presenti
 * @param {string} attivo        comprensorio attivo
 */
export function ordinePriorita(installati, attivo) {
  const presenti = ID_PACCHETTI.filter((id) => installati.includes(id));
  return presenti.includes(attivo) ? [attivo, ...presenti.filter((id) => id !== attivo)] : presenti;
}

/** Riquadro geografico [w, s, e, n] della tile z/x/y (Web Mercator). */
export function riquadroTile(z, x, y) {
  const n = 2 ** z;
  const lon = (i) => (i / n) * 360 - 180;
  const lat = (j) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * j) / n))) * 180) / Math.PI;
  return [lon(x), lat(y + 1), lon(x + 1), lat(y)];
}

/** La tile z/x/y tocca il riquadro [w, s, e, n]? */
export function tileNelRiquadro(z, x, y, bbox) {
  const [w, s, e, n] = riquadroTile(z, x, y);
  return !(e < bbox[0] || w > bbox[2] || n < bbox[1] || s > bbox[3]);
}

/**
 * Serve spazio per il nuovo file PIU' la copia in memoria durante la
 * verifica: si chiede un margine del 10%. `stima` = navigator.storage.estimate().
 * Restituisce null se lo spazio basta (o non si puo' sapere), altrimenti il messaggio.
 */
export function controlloSpazio(stima, byte) {
  if (!stima || !Number.isFinite(stima.quota) || !Number.isFinite(stima.usage)) return null;
  const libero = stima.quota - stima.usage;
  if (libero >= byte * 1.1) return null;
  return 'Spazio insufficiente sul telefono: servono ' + formattaMB(byte * 1.1) + ', liberi ' + formattaMB(Math.max(0, libero)) + '.';
}
