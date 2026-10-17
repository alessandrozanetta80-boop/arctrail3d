# Changelog — mappe-comuni

Ogni versione: voce qui, `src/versione.js` e `package.json` allineati, `npm run build` dalla radice (importazione
controllata, test, pacchetto .tgz verificato in un consumer pulito, build dei due esempi). Le app aggiornano SOLO
cambiando esplicitamente la versione del .tgz nel proprio `package.json` + smoke della mappa (docs/GUIDA_INTEGRAZIONE.md).

## 0.1.1 — 15/10/2026 — correzione geometrie a linee (solo locale)

- `geo.riquadro()` (esposto da `mappe-comuni/core` come `geo`) calcola il riquadro di OGNI geometria GeoJSON (Point, MultiPoint,
  LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection). Nella 0.1.0 leggeva solo poligoni:
  `geo.featureCheContengono` e `geo.riquadroAllargato` sui livelli a linee del territorio (sentieri, viabilità, strade)
  lanciavano `TypeError: p[0] is not iterable` — lo stesso difetto del crash mappa v19 del Gestionale («e[0] is not iterable»).
- Il motore interno (`MotoreMappa`) non era colpito: filtra già i soli poligoni prima di `puntoInGeometria`.
- `src/origine/geo.js` è rigenerato da `strumenti/importa-da-fonti.mjs` con fonte `GESTIONALE COMPRENSORI src/gps/shared/geo.js`
  (v20, 1.1.20-test: uguale ad Adrenalina salvo `riquadro()`); Adrenalina non modificata. Test: `test/geo-linee.test.js` (dati reali vco3).

## 0.1.0 — 15/10/2026 — prima base comune (solo locale)

- Motore Leaflet comune (`MotoreMappa`) estratto da Adrenalina battuta-live 0.18.21 (`MappaLeaflet.js`): mappa base,
  rilievo/curve, stile Leggibile/Dettagliato, nomi di paesi/alpeggi/cime con anticollisione, layer territoriali con
  scheda compatta (Dettagli ▾), piste OSM con bordo/linea/fascia di tocco, posizione GPS, anelli, misura, tocchi.
- Interfaccia comune (`creaMappaComune`): colonna LAYER / STRUMENTI / + / − / centra / N, foglio «Layer» con le sezioni
  di Adrenalina, mini pannello STRUMENTI e riquadro (Distanze, Misura distanza, Dislivello e profilo, Quota, Vai al punto,
  Vento), SEGNA POSIZIONE con callback all'app. Unico CSS: `stile/battuta-live.css` generato dalla fonte + `contenitore.css`.
- 22 moduli di Adrenalina/Gestionale v18 copiati con `strumenti/importa-da-fonti.mjs` (ORIGINE, SHA-256, sostituzioni
  dichiarate; `PROVENIENZA.json`).
- Pacchetti territoriali (`territorio.json` con SHA-256 di ogni file) preparati da `strumenti/prepara-territorio.mjs`.
- Dati: contratto comune + adattatori Firebase (modulare e compat) e Supabase, scope ente/utente obbligatorio,
  permessi dall'app, realtime chiuso al cambio scope/logout, chiavi di servizio rifiutate.
- Offline: cache isolata progetto/ente/versione con SHA-256; quota senza rete (PacchettoDtm del Gestionale v18).
- Wrapper React sottile (`mappe-comuni/react`) sullo stesso motore e sugli stessi controlli.
- Revisione Codex del contratto dati (stesso giro, prima del rilascio locale): coordinate null/vuote/booleane rifiutate
  (mai 0 inventato), righe senza id scartate, permessi assenti = nessuna operazione (fail-closed), `elenca` e scritture
  Firebase dopo cambio ente/logout -> `SCOPE_CAMBIATO` (risultato scartato / scrittura non inviata), ricariche realtime
  Supabase serializzate (una risposta vecchia non riporta punti eliminati). Test: `test/dati-revisione.test.js`.
- Scheda area allineata ad Adrenalina sul divieto a termine (riquadro non pieno, «Divieto fino al», Incendio del,
  Superficie boscata, Riferimento/Fonte/Data); vista iniziale sul solo CA del territorio.
- Ultima revisione visiva Codex (stesso giro 0.1.0, mai adottata/pubblicata): reset `box-sizing: border-box` di Adrenalina
  circoscritto a `.mc-radice` (foglio Layer e voci con le misure della fonte); riquadro degli strumenti a 18 px / 128 px
  dai bordi come in Adrenalina e nel Gestionale v18 (238 px su 384); descrizione «Mappa offline» dai territori della
  configurazione (`territoriOffline` o nome del pacchetto) invece di VCO1/VCO2/VCO3.
