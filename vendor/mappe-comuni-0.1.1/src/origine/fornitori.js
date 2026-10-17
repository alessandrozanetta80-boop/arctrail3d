// ORIGINE: Adrenalina battuta-live/js/map/fornitori.js (commit c6586b6636, SHA-256 fonte 8b9bc1359726850a…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: mappe base Mappa/Aerea-Ibrida/Terreno/Offline (preset Piemonte) e creaStrato.
// Sostituzioni: 1 (elenco in strumenti/importa-da-fonti.mjs).
// MAPPE BASE (MapProvider) — Mappa, Terreno, Aerea, Ibrida + riserva offline.
//
// Ogni mappa base e' composta da uno o piu' STRATI (servizi di tile). La
// mappa usa solo questa tabella: cambiare fonte = cambiare una voce qui,
// non la schermata. Servizi verificati con richieste reali (GetCapabilities
// + GetMap sull'area del CAVCO1): vedi docs/BATTUTA-LIVE-INTEGRAZIONE.md.
//
// Fonti istituzionali (Regione Piemonte, Geoportale), nessuna chiave API:
//   BDTRE sfondo              CC BY 4.0 (metadato r_piemon:d83488c6-c90e-4b5e-9a02-8f8a64aef781)
//   Rilievo ombreggiato ICE   CC BY 4.0 (metadato r_piemon:e10eb79d-b61b-44b3-804d-9adc082abbd3)
//   Allestimento BDTRE 1:25.000 colori 2026 (serie "allestimento cartografico di
//                             riferimento BDTRE", CC BY 4.0 sulle schede della serie)
//   Ortofoto AGEA 2024        vedi la nota qui sotto
//
// ORTOFOTO: PERCHE' AGEA 2024, E COSA SAPERE.
// Per riconoscere un versante, un canale o una radura serve una foto
// recente: l'ortofoto ICE 2009-2011, l'unica CC BY 4.0 disponibile per il
// Piemonte, ha ormai quindici anni e boschi e piste non sono piu' quelli.
// AGEA 2024 e' ufficiale (Regione Piemonte, geoservizio pubblico senza
// chiave), a colori, risoluzione dichiarata 30 cm, e verificata funzionante
// sull'area del comprensorio.
// ATTENZIONE, ed e' scritto qui perche' non vada perso: il metadato
// r_piemon:ad786e89-4c44-4de7-8ea7-5c96aab65af2 riporta
// "AGEA 2024 (c) tutti i diritti riservati" e condizioni d'uso "sconosciute".
// Non e' una licenza aperta come le altre fonti di questo file. Va bene per
// la consultazione a schermo in una build privata di prova; NON autorizza a
// ridistribuire le immagini ne' a scaricarle per l'offline. Per questo
// l'ortofoto resta uno strato di rete e non entra mai nel pacchetto offline.
// Se servisse una base aerea ridistribuibile, l'alternativa CC BY e'
// l'ICE 2009-2011 (rp_ortofoto_2010 sullo stesso servizio).
//
// Nessuno di questi servizi consente il download massivo per l'offline:
// senza rete si passa alla MAPPA OFFLINE (estratti OpenStreetMap per
// comprensorio, VCO1/VCO2/VCO3, scaricati a richiesta da "Mappe offline"),
// senza fermare GPS e traccia.

// ZOOM OPERATIVO (0.18.2): la mappa arriva a z22 per separare postazioni
// vicine. Ogni strato dichiara fin dove ha tile vere (maxNativeZoom per le
// carte di rete, maxDataZoom per i dati offline): oltre, Leaflet ingrandisce
// l'ultima tile disponibile invece di lasciare il grigio.
import { daPixelMondo } from './nomiCarta.js';

export const ZOOM_MASSIMO = 22;
export const ZOOM_NATIVO = 19;

const ATTR_PIEMONTE = '&copy; <a href="https://www.geoportale.piemonte.it">Regione Piemonte</a>';
const WMS_PIEMONTE = 'https://geomap.reteunitaria.piemonte.it/mapproxy/service';
const WMS_AGEA2024 = 'https://opengis.csi.it/mp/regp_agea_2024';
const ATTR_TERRENO = ATTR_PIEMONTE + ' - Rilievo ICE 2009-2011 e BDTRE 1:25.000 2026, CC BY 4.0';
const ATTR_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL) · <a href="https://protomaps.com">Protomaps</a>';

const wms = (layers, attribution, extra = {}) => ({
  tipo: 'wms', url: WMS_PIEMONTE,
  opzioni: { layers, format: 'image/png', transparent: false, version: '1.3.0', maxZoom: ZOOM_MASSIMO, maxNativeZoom: ZOOM_NATIVO, minZoom: 7, ...extra },
  attribution
});

// Strato BDTRE: tile XYZ gia' pronte in EPSG:3857 (le piu' veloci).
const STRATO_BDTRE = {
  tipo: 'xyz',
  // strato-carta: nello stile «Leggibile» la carta si schiarisce un poco (CSS), i nomi sopra prevalgono
  classe: 'strato-carta',
  url: 'https://geomap.reteunitaria.piemonte.it/mapproxy/wmts/regp_sfondo_bdtre_epsg3857_wmts/grid_global_mercator_3857_nw/{z}/{x}/{y}.png',
  opzioni: { maxZoom: ZOOM_MASSIMO, maxNativeZoom: ZOOM_NATIVO, minZoom: 7 },
  attribution: ATTR_PIEMONTE + ' - BDTRE, CC BY 4.0'
};

// Ortofoto AGEA 2024: servizio separato dal MapProxy regionale, EPSG:3857
// nativo (quindi niente riproiezioni lato client), JPEG per non pesare.
const STRATO_AEREA = {
  tipo: 'wms', url: WMS_AGEA2024,
  opzioni: {
    layers: 'regp_agea_2024', format: 'image/jpeg', transparent: false,
    version: '1.3.0', maxZoom: ZOOM_MASSIMO, maxNativeZoom: ZOOM_NATIVO, minZoom: 7
  },
  attribution: ATTR_PIEMONTE + ' - Ortofoto AGEA 2024'
};

export const MAPPA_OFFLINE = Object.freeze({
  id: 'offline',
  nome: 'Mappa offline',
  descrizione: 'OpenStreetMap, dalle mappe scaricate (VCO1, VCO2, VCO3)',
  offline: true,
  // la sorgente non e' un file fisso: sono i pacchetti presenti sul telefono (mappaOffline.js)
  strati: [{ tipo: 'pmtiles', url: null, opzioni: { maxZoom: ZOOM_MASSIMO, minZoom: 8, maxDataZoom: 15 }, attribution: ATTR_OSM }]
});

export const MAPPE_BASE = Object.freeze([
  {
    id: 'mappa',
    nome: 'Mappa',
    descrizione: 'Carta tecnica regionale: strade, sentieri, località',
    fonte: 'Regione Piemonte, BDTRE (CC BY 4.0)',
    // la carta stampa gia' i nomi ufficiali: sopra si scrivono solo quelli che mancano (shared/nomiCarta.js).
    // Verificato sulle tile vere (Bozzela, Frino): fino a z15 le scritte 1:25.000, da z16 quelle 1:10.000.
    nomiStampati: [[0, ['scritta25']], [16, ['scritta10']]],
    strati: [STRATO_BDTRE],
    predefinita: true
  },
  {
    id: 'aerea',
    nome: 'Aerea',
    descrizione: 'Fotografia aerea a colori, ripresa 2024 (30 cm)',
    fonte: 'Regione Piemonte, ortofoto AGEA 2024',
    strati: [STRATO_AEREA]
  },
  {
    id: 'terreno',
    nome: 'Terreno',
    descrizione: 'Rilievo ombreggiato con curve di livello: montagne, valli, pendenze',
    fonte: 'Regione Piemonte: rilievo ombreggiato ICE 2009-2011 + carta BDTRE 1:25.000 (CC BY 4.0)',
    nomiStampati: [[0, ['scritta25']]],          // allestimento 1:25.000 a ogni zoom
    // Crediti: una riga sola per i due strati (stesso testo = Leaflet lo scrive una volta),
    // con fonte, serie e licenza di entrambi; prima erano tre righe sopra la mappa a 360 px.
    strati: [
      // rilievo alleggerito (opacita'): valli leggibili anche nelle zone in ombra.
      // Stile «Leggibile» (14/10/2026): ombre ancora piu' tenui (opacitaLeggibile), nomi e piste sopra si leggono.
      { ...wms('regp_ombreggiature', ATTR_TERRENO, { opacity: 0.55 }), opacitaLeggibile: 0.3 },
      // la carta si "moltiplica" sul rilievo: restano linee, nomi e colori, il rilievo si vede sotto
      { ...wms('regp_basecarto25col_2026', ATTR_TERRENO), classe: 'strato-moltiplica strato-carta' }
    ]
  },
  {
    id: 'ibrida',
    nome: 'Ibrida',
    descrizione: 'Fotografia aerea con strade e località sovrapposte',
    fonte: 'Ortofoto AGEA 2024 (Regione Piemonte) + strade e nomi OpenStreetMap (ODbL)',
    strati: [
      STRATO_AEREA,
      // strade e nomi dalle mappe offline scaricate: niente sfondo, solo linee ed etichette
      { tipo: 'pmtiles', url: null, soloEtichette: true, opzioni: { maxZoom: ZOOM_MASSIMO, minZoom: 8, maxDataZoom: 15 }, attribution: ATTR_OSM }
    ]
  }
]);

/* IBRIDA SENZA MAPPE OFFLINE (0.20.0).
 *
 * Il bug "Stefano non vede Ibrida su Mac/iPhone" non era di Apple: strade e
 * nomi dell'Ibrida vengono dagli estratti OpenStreetMap scaricati da "Mappe
 * offline". Su un dispositivo che non li ha (il suo), l'app ripiegava IN
 * SILENZIO su Aerea: il pannello segnava Aerea e Ibrida "non si apriva".
 * Stesso comportamento su Windows, Android, Mac, iPhone (diagnosi:
 * tools/dev/diagnosi-ibrida.mjs).
 *
 * Adesso, senza estratto offline, Ibrida resta Ibrida: foto aerea + carta
 * tecnica regionale in bianco e nero 1:10.000 (strade, sentieri, nomi,
 * curve di livello) sovrapposta "a moltiplica" — il bianco sparisce, restano
 * le linee. Stessa fonte e licenza della carta gia' usata (Regione Piemonte,
 * CC BY 4.0), nessuna chiave. Con l'estratto offline si usano ancora strade
 * e nomi OpenStreetMap, piu' leggeri sulla foto.
 */
export const IBRIDA_SENZA_OFFLINE = Object.freeze({
  ...MAPPE_BASE.find((m) => m.id === 'ibrida'),
  fonte: 'Ortofoto AGEA 2024 + carta tecnica regionale 1:10.000 (Regione Piemonte, CC BY 4.0)',
  nomiStampati: [[0, ['scritta10']]],            // carta tecnica 1:10.000
  strati: [
    STRATO_AEREA,
    { ...wms('regp_basecarto10bn_2026', ATTR_PIEMONTE + ' - Carta tecnica 1:10.000 2026, CC BY 4.0'), classe: 'strato-moltiplica' }
  ]
});

/* GOOGLE SATELLITE — PREDISPOSTO, NON ATTIVO.
 *
 * Non basta un URL di tile: quelli che girano in rete sono endpoint interni
 * e usarli viola i termini di Google. La via lecita e' la Map Tiles API di
 * Google Maps Platform, che richiede una chiave e una sessione.
 *
 * Qui non c'e' nessuna chiave, e non deve entrarci MAI: sarebbe pubblicata
 * nel repository e utilizzabile da chiunque, a spese dell'intestatario. La
 * chiave arriva a runtime dalla configurazione (config-mappe.json, fuori da
 * git) e solo allora la voce compare fra le mappe base.
 *
 * Vale anche qui il divieto di prefetch: le tile di Google non si scaricano
 * per l'uso offline. L'offline resta OpenStreetMap, dalle mappe scaricate.
 */
export function googleSatellite(chiave, sessione) {
  if (!chiave || !sessione) return null;
  return Object.freeze({
    id: 'google-satellite',
    nome: 'Satellite (Google)',
    descrizione: 'Immagini satellitari Google Maps Platform',
    fonte: 'Google Maps Platform, Map Tiles API',
    richiedeChiave: true,
    strati: [{
      tipo: 'xyz',
      url: 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=' +
        encodeURIComponent(sessione) + '&key=' + encodeURIComponent(chiave),
      opzioni: { maxZoom: ZOOM_MASSIMO, maxNativeZoom: 20, minZoom: 7 },
      attribution: '&copy; Google'
    }]
  });
}

/**
 * Mappe base disponibili data la configurazione. Senza configurazione sono
 * quelle istituzionali: e' il caso normale.
 * @param {{googleMapTilesApiKey?: string, googleMapTilesSession?: string}} config
 */
export function mappeBaseConfigurate(config = null) {
  const g = config && googleSatellite(config.googleMapTilesApiKey, config.googleMapTilesSession);
  return g ? [...MAPPE_BASE, g] : [...MAPPE_BASE];
}

// Il nome interno della vista aerea e' cambiato da 'satellite' ad 'aerea':
// chi aveva gia' scelto quella mappa se la ritrova, invece di tornare alla
// predefinita senza capire perche'.
const ID_SUPERATI = Object.freeze({ satellite: 'aerea' });

/* AEREA / IBRIDA: UNA SOLA VOCE (giro finale 14/10/2026). Decisione utente:
   «Aerea e Ibrida sono uguali e andavano bene». Nel pannello Layer c'e' una
   sola scelta «Aerea / Ibrida» (la foto) e sotto un interruttore «Strade e
   nomi della carta sulla foto»: spento = Aerea (foto pulita), acceso = Ibrida
   (con l'estratto offline o, senza, la carta 1:10.000 sulla foto). Le due
   varianti restano QUELLE DI PRIMA (stessi strati, stessa grafica) e gli id
   salvati sul telefono ('aerea', 'ibrida', il vecchio 'satellite') valgono
   ancora: nessuna migrazione, nessuna reinstallazione. */
export const VOCE_FOTO = 'foto';
const VARIANTI_FOTO = new Set(['aerea', 'ibrida']);
/** Voce del pannello per una base: 'aerea' e 'ibrida' -> VOCE_FOTO. */
export const voceDiBase = (id) => (VARIANTI_FOTO.has(ID_SUPERATI[id] || id) ? VOCE_FOTO : id);
/** Voci del pannello «Mappa base», in ordine: Mappa, Aerea / Ibrida, Terreno, Offline. */
export function vociMappaBase(config = null) {
  const voci = [];
  for (const m of [...mappeBaseConfigurate(config), MAPPA_OFFLINE]) {
    if (m.id === 'ibrida') continue;
    voci.push(m.id === 'aerea'
      ? { id: VOCE_FOTO, nome: 'Aerea / Ibrida', descrizione: 'Fotografia aerea 2024 (30 cm); strade e nomi della carta sopra la foto a scelta', varianti: ['aerea', 'ibrida'] }
      : { id: m.id, nome: m.nome, descrizione: m.descrizione, varianti: [m.id] });
  }
  return voci;
}

export const mappaBase = (id, config = null) => {
  const vero = id === VOCE_FOTO ? 'aerea' : ID_SUPERATI[id] || id;
  return mappeBaseConfigurate(config).find((m) => m.id === vero) ||
    (vero === MAPPA_OFFLINE.id ? MAPPA_OFFLINE : null);
};
export const MAPPA_PREDEFINITA = MAPPE_BASE.find((m) => m.predefinita);

/** Scritte BDTRE che la carta di base stampa a questo zoom ([] = nessun nome stampato: foto, PMTiles). */
export function scritteStampate(m, z) {
  let fonti = [];
  for (const [da, f] of (m && m.nomiStampati) || []) if (z >= da) fonti = f;
  return fonti;
}

/** La mappa base usa l'estratto offline (serve l'archivio PMTiles aperto)? */
export const usaArchivioOffline = (m) => m.strati.some((s) => s.tipo === 'pmtiles');
/** Richiede Internet per lo sfondo principale. */
export const richiedeInternet = (m) => m.strati.some((s) => s.tipo !== 'pmtiles');

// Strati OSM da tenere nella mappa IBRIDA (sopra la foto aerea): strade,
// confini amministrativi e nomi. Niente terra, acqua, boschi, edifici.
const DATI_IBRIDA_LINEE = new Set(['roads', 'transit', 'boundaries']);

/* UNA SOLA FONTE PER OGNI NOME (14/10/2026). Sull'Ibrida e sull'Offline i
   nomi di paesi, alpeggi e cime li scriviamo noi (data/toponimi-osm, stile
   «Terreno Ghiffa»); l'estratto Protomaps ne ha di suoi. Un'etichetta
   Protomaps di luogo o di cima si salta se `coperto(nome, lat, lon)` dice che
   la scriviamo gia' noi li' vicino (shared/nomiCarta.js): fuori dai CA, dove i
   nostri non arrivano, resta quella Protomaps. Le etichette delle strade no. */
class SoloNomiMancanti {
  constructor(symbolizer, coperto) { this.symbolizer = symbolizer; this.coperto = coperto; }
  place(layout, geom, feature) {
    const c = this.coperto;
    const nome = feature && feature.props && (feature.props['name:it'] || feature.props.name);
    const pt = geom && geom[0] && geom[0][0];
    if (c && nome && pt) {
      const { lat, lon } = daPixelMondo(pt.x, pt.y, layout.zoom);
      if (c(nome, lat, lon)) return undefined;
    }
    return this.symbolizer.place(layout, geom, feature);
  }
}
const DATI_NOMI_LUOGO = new Set(['places', 'pois']);
const filtraNomi = (regole, coperto) => (!coperto ? regole : regole.map((r) =>
  (DATI_NOMI_LUOGO.has(r.dataLayer) ? { ...r, symbolizer: new SoloNomiMancanti(r.symbolizer, coperto) } : r)));

/**
 * Crea il layer Leaflet di uno strato. `sorgentePmtiles`: archivio delle
 * mappe offline presenti (mappaOffline.js), obbligatorio per gli strati pmtiles.
 */
export function creaStrato(L, s, { sorgentePmtiles = null, nomiCoperti = null, stradeFinoAZoom = null } = {}) {
  if (s.tipo === 'xyz') {
    return L.tileLayer(s.url, { ...s.opzioni, attribution: s.attribution, className: s.classe || '' });
  }
  if (s.tipo === 'wms') {
    return L.tileLayer.wms(s.url, { ...s.opzioni, attribution: s.attribution, className: s.classe || '' });
  }
  if (s.tipo === 'pmtiles') {
    const P = globalThis.protomapsL;
    if (!P) throw new Error('Libreria della mappa offline non caricata');
    if (!sorgentePmtiles) throw new Error('Mappa offline non disponibile');
    if (!s.soloEtichette) {
      if (!nomiCoperti) return P.leafletLayer({ url: sorgentePmtiles, flavor: 'light', lang: 'it', ...s.opzioni, attribution: s.attribution });
      // stesse regole dello stile 'light', con le etichette dei luoghi che abbiamo gia' tolte
      const stile = P.leafletLayer({ url: sorgentePmtiles, flavor: 'light', lang: 'it' });
      return P.leafletLayer({
        url: sorgentePmtiles, ...s.opzioni, attribution: s.attribution, backgroundColor: stile.backgroundColor,
        paintRules: stile.paintRules || [], labelRules: filtraNomi(stile.labelRules || [], nomiCoperti)
      });
    }
    // Ibrida: strade chiare dello stile 'light' (regole lette da un layer di
    // appoggio mai aggiunto alla mappa) e nomi bianchi con alone scuro,
    // leggibili sulla foto aerea. Le regole si passano alla creazione: le
    // etichette si preparano nel costruttore.
    const chiaro = P.leafletLayer({ url: sorgentePmtiles, flavor: 'light', lang: 'it' });
    const nome = ['name:it', 'name'];
    const testo = (font, width) => ({ labelProps: nome, fill: '#ffffff', stroke: '#1c211e', width, font });
    return P.leafletLayer({
      url: sorgentePmtiles, ...s.opzioni, attribution: s.attribution,
      // Con le nostre piste accese (che hanno gia' strade, piste e sentieri) le strade Protomaps si
      // fermano allo zoom prima delle piste: sulla foto una linea per strada, non due sovrapposte.
      paintRules: (chiaro.paintRules || []).filter((r) => DATI_IBRIDA_LINEE.has(r.dataLayer))
        .map((r) => (r.dataLayer === 'roads' && Number.isFinite(stradeFinoAZoom) ? { ...r, maxzoom: Math.min(r.maxzoom ?? Infinity, stradeFinoAZoom) } : r)),
      labelRules: filtraNomi([
        { dataLayer: 'places', symbolizer: new P.CenteredTextSymbolizer(testo('700 14px sans-serif', 3.5)) },
        { dataLayer: 'pois', minzoom: 12, filter: (z, f) => f.props.kind === 'peak',
          symbolizer: new P.CenteredTextSymbolizer(testo('italic 600 12px sans-serif', 3)) },
        { dataLayer: 'roads', minzoom: 13, symbolizer: new P.LineLabelSymbolizer(testo('600 12px sans-serif', 3)) }
      ], nomiCoperti)
    });
  }
  throw new Error('Tipo di strato non supportato: ' + s.tipo);
}
