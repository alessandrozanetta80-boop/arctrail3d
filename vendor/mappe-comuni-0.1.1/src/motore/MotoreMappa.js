// MOTORE DI MAPPA COMUNE — Leaflet.
//
// ORIGINE: estratto a mano da Adrenalina battuta-live/js/map/MappaLeaflet.js (0.18.21, commit c6586b6, SOLO LETTO il
// 15/10/2026). Metodi copiati con lo stesso corpo e gli stessi valori (pane, colori, opacita', schede, anelli, misura,
// nomi): impostaBase, osservaBase, mostraRilievo, impostaStilePercorsi, applicaStileBase, toponimi (impostaToponimi,
// mostraToponimi, impostaNomiRegione, aggiornaToponimi e aiuti), aggiungiLayerTerritoriale, legaScheda, preparaScheda,
// limitaDettaglio, spazioScheda, areeIn, aggiornaIo, mostraAnelli, mostraMisura, suTocchi, suPressioneLunga,
// suGestoUtente, centra/segui/zoom. Adattamenti dichiarati:
//   - Leaflet arriva dal chiamante (opzione `L`): niente globale obbligatoria, funziona con Vite e con <script>;
//   - NIENTE dati di squadra (persone, cani, postazioni, tracce): restano nelle app;
//   - NIENTE territorio fisso: confine, layer, nomi e piste arrivano dal pacchetto territoriale;
//   - la classificazione delle aree (colore, «CACCIA VIETATA»...) e' una funzione passata dall'app/territorio
//     (`classificaArea`), perche' le regole venatorie sono dominio dell'app, non della cartografia;
//   - piste OSM da una collezione GeoJSON (non tassellata) e punti dei dati dell'app (`aggiornaPunti`);
//   - lo spazio libero per le schede si misura DENTRO la radice della mappa (piu' mappe per pagina).
// Sicurezza: nomi ed etichette solo con textContent, mai HTML dai dati.

import { creaStrato, scritteStampate, ZOOM_MASSIMO } from '../origine/fornitori.js';
import { puntoInGeometria } from '../origine/geo.js';
import { schedaPista, schedaBarriera, passaFiltro, filtroValido, FILTRO, ZOOM_MINIMO_PISTE, ZOOM_DETTAGLIO_PISTE, COLORI_PISTE,
  sfondoDiBase, fasciaZoomPiste, visibileAZoom, stilePercorso, stileBarriera, stilePercorsiValido, STILE_PERCORSI, STILE_PERCORSI_PREDEFINITO } from '../origine/pisteOsm.js';
import { indicePunti, giaSullaCarta, coperturaNomi } from '../origine/nomiCarta.js';
import { rettangoliScritte, metriPerPixel } from '../origine/scritteCarta.js';
import { zoomMinimo, scegliEtichette, posizioniEtichetta, grigliaLinee, grigliaLuoghi, testoQuota, TIPO as TIPO_NOME, ATTRIBUZIONE_NOMI_HTML as ATTRIBUZIONE_NOMI } from '../origine/toponimi.js';
import { classificaNeutra, STATO_AREA } from './aree.js';

// senza canvas 2D (jsdom dei test, vecchi browser) le piste vanno in SVG, come in MappaLeaflet
let canvas2d = null;
function canvasDisponibile(L) {
  if (canvas2d === null) {
    try { canvas2d = !!(L.Browser.canvas && document.createElement('canvas').getContext('2d')); } catch { canvas2d = false; }
  }
  return canvas2d;
}

export const PANE = Object.freeze({ UFFICIALI: 'livello-ufficiali', PISTE: 'livello-piste', DATI: 'livello-squadra' });
const PANE_RILIEVO = 'livello-rilievo';
const PANE_CURVE = 'livello-curve';
export const PANE_NOMI = 'livello-nomi';

export const COLORI = Object.freeze({ posizione: '#ff7a1a', postazione: '#ffd23f' });

export class MotoreMappa {
  /**
   * @param {HTMLElement} elemento  contenitore della mappa
   * @param {{L: object, vista?: {lat:number, lon:number, zoom:number}, classificaArea?: Function, radice?: HTMLElement}} opz
   */
  constructor(elemento, { L, vista = { lat: 45.9, lon: 8.4, zoom: 10 }, classificaArea = classificaNeutra, radice = null, codiceConfine = null } = {}) {
    this.codiceConfine = codiceConfine;
    if (!L || typeof L.map !== 'function') throw new Error('MotoreMappa: serve Leaflet (opzione L)');
    this.L = L;
    this.radice = radice || elemento.parentElement || elemento;
    this.classificaArea = classificaArea;
    this.map = L.map(elemento, { zoomControl: false, attributionControl: true, preferCanvas: false, tap: true, maxZoom: ZOOM_MASSIMO })
      .setView([vista.lat, vista.lon], vista.zoom);
    this.map.attributionControl.setPrefix(false);
    for (const [nome, z] of [[PANE.UFFICIALI, 410], [PANE.PISTE, 420], [PANE.DATI, 440]]) this.map.createPane(nome).style.zIndex = String(z);
    for (const [nome, z, blend] of [[PANE_RILIEVO, 250, 'multiply'], [PANE_CURVE, 260, '']]) {
      const p = this.map.createPane(nome);
      p.style.zIndex = String(z);
      p.style.pointerEvents = 'none';
      if (blend) p.style.mixBlendMode = blend;
    }
    this.map.createPane(PANE_NOMI).style.zIndex = '430';
    this.map.getPane(PANE_NOMI).style.pointerEvents = 'none';
    this.rilievo = new Map();
    this.rilievoDef = new Map();
    this.stilePercorsi = STILE_PERCORSI_PREDEFINITO;
    this.stratiBase = [];
    this.map.getContainer().classList.add('bl-mappa-leggibile');
    this.nomiCartaBase = null;
    this.toponimi = null;
    this.nomiRegione = null;
    this.esitiCarta = new Map();
    this.ultimaBase = null;
    this.zoneOccupate = () => [];
    this.canvas = L.canvas({ padding: 0.3, pane: PANE.UFFICIALI });
    this.base = null;
    this.idBase = null;
    this.suStatoBase = () => {};
    this.statoBaseCorrente = 'in-caricamento';
    this.territoriali = new Map();    // id -> { layer, meta, collezione, voluto }
    this.punti = new Map();           // id gruppo dati -> { gruppo, voluto }
    this.piste = null;
    this.io = null;
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(this.map);
    this.map.on('zoomend moveend', () => this.aggiornaVisibilita());
  }

  /** Smonta la mappa e libera listener e layer (cambio ente, logout, componente React smontato). */
  distruggi() {
    try { this.map.off(); this.map.remove(); } catch { /* gia' rimossa */ }
    this.territoriali.clear();
    this.punti.clear();
    this.piste = null;
    this.io = null;
  }

  suPressioneLunga(fn) {
    this.map.on('contextmenu', (e) => {
      if (e && e.originalEvent && e.originalEvent.preventDefault) e.originalEvent.preventDefault();
      if (e && e.latlng) fn({ lat: e.latlng.lat, lon: e.latlng.lng });
    });
  }

  suGestoUtente(fn) {
    this.gestoUtente = fn;
    this.map.on('dragstart', () => fn());
    const c = this.map.getContainer();
    c.addEventListener('wheel', () => fn(), { passive: true });
    c.addEventListener('dblclick', () => fn());
    c.addEventListener('touchstart', (e) => { if (e.touches && e.touches.length > 1) fn(); }, { passive: true });
  }

  // ------------------------------------------------------------ mappa base
  impostaBase(mb, opz = {}) {
    const L = this.L;
    const nomiCoperti = this.toponimiVoluti() && this.toponimi.punti.length ? this.toponimi.copertura : null;
    const stradeFinoAZoom = this.stradeNellePiste() ? ZOOM_MINIMO_PISTE - 1 : null;
    const strati = mb.strati.map((s) => creaStrato(L, s, { ...opz, nomiCoperti, stradeFinoAZoom }));
    this.ultimaBase = { mb, opz };
    if (this.base) this.map.removeLayer(this.base);
    this.base = L.layerGroup(strati);
    this.idBase = mb.id;
    this.stratiBase = strati.map((layer, i) => ({ layer, def: mb.strati[i] }));
    this.nomiCartaBase = mb.nomiStampati ? mb : null;
    this.applicaStileBase();
    this.ristilizzaPiste();
    this.aggiornaToponimi(true);
    this.statoBaseCorrente = 'in-caricamento';
    this.osservaBase(strati[0], mb);
    this.base.addTo(this.map);
    strati.forEach((s, i) => { if (s.setZIndex) s.setZIndex(i + 1); });
    return true;
  }

  osservaBase(strato, mb) {
    let errori = 0, caricate = 0;
    const aggiorna = () => {
      const stato = errori > 0 && caricate === 0 ? 'non-disponibile' : caricate > 0 ? 'ok' : 'in-caricamento';
      if (stato !== this.statoBaseCorrente) { this.statoBaseCorrente = stato; this.suStatoBase(stato, mb.id); }
    };
    if (strato && strato.on) {
      strato.on('loading', () => { errori = 0; caricate = 0; });
      strato.on('tileload', () => { caricate++; aggiorna(); });
      strato.on('tileerror', () => { errori++; aggiorna(); });
    }
    if (mb.offline) { caricate = 1; aggiorna(); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { errori = 1; aggiorna(); }
  }

  statoBase() { return this.statoBaseCorrente; }

  // ------------------------------------------------------------ rilievo e curve sopra la base
  mostraRilievo(def, si, { filtroArea = null } = {}) {
    const L = this.L;
    if (def.filtroFoto) this.map.getPane(PANE_CURVE).style.filter = this.sfondoPiste() === 'foto' ? def.filtroFoto : '';
    const c = this.rilievo.get(def.id);
    if (!si) {
      if (c) { this.map.removeLayer(c); this.rilievo.delete(def.id); }
      return;
    }
    if (c) return;
    const esiti = new Map();
    const Strato = L.TileLayer.WMS.extend({
      _isValidTile(coords) {
        if (!L.TileLayer.WMS.prototype._isValidTile.call(this, coords)) return false;
        if (!filtroArea) return true;
        const k = coords.z + '/' + coords.x + '/' + coords.y;
        if (!esiti.has(k)) {
          const b = this._tileCoordsToBounds(coords);
          esiti.set(k, !!filtroArea({ ovest: b.getWest(), sud: b.getSouth(), est: b.getEast(), nord: b.getNorth() }));
        }
        return esiti.get(k);
      }
    });
    const layer = new Strato(def.url, {
      layers: def.layers, format: def.formato, transparent: def.trasparente, version: '1.3.0', styles: '',
      opacity: this.opacitaRilievo(def), minZoom: def.minZoom, maxZoom: ZOOM_MASSIMO, maxNativeZoom: def.maxNativeZoom,
      pane: def.moltiplica ? PANE_RILIEVO : PANE_CURVE, attribution: def.attribution, className: 'strato-' + def.id
    });
    layer.addTo(this.map);
    this.rilievo.set(def.id, layer);
    this.rilievoDef.set(def.id, def);
  }

  rilievoAcceso(id) { return this.rilievo.has(id); }

  opacitaRilievo(def) {
    return this.stilePercorsi === STILE_PERCORSI.LEGGIBILE && Number.isFinite(def.opacitaLeggibile) ? def.opacitaLeggibile : def.opacita;
  }

  // ------------------------------------------------------------ stile «Leggibile» / «Dettagliato»
  impostaStilePercorsi(stile) {
    const s = stilePercorsiValido(stile);
    if (s === this.stilePercorsi) return false;
    this.stilePercorsi = s;
    this.map.getContainer().classList.toggle('bl-mappa-leggibile', s === STILE_PERCORSI.LEGGIBILE);
    this.applicaStileBase();
    for (const [id, layer] of this.rilievo) layer.setOpacity(this.opacitaRilievo(this.rilievoDef.get(id)));
    this.ristilizzaPiste(true);
    return true;
  }

  applicaStileBase() {
    for (const { layer, def } of this.stratiBase) {
      if (!def || !Number.isFinite(def.opacitaLeggibile) || !layer.setOpacity) continue;
      const normale = def.opzioni && Number.isFinite(def.opzioni.opacity) ? def.opzioni.opacity : 1;
      layer.setOpacity(this.stilePercorsi === STILE_PERCORSI.LEGGIBILE ? def.opacitaLeggibile : normale);
    }
  }

  // ------------------------------------------------------------ nomi di paesi, frazioni, alpeggi e cime (OSM)
  impostaToponimi(punti) {
    const L = this.L;
    if (this.toponimi) { this.map.removeLayer(this.toponimi.gruppo); this.map.attributionControl.removeAttribution(ATTRIBUZIONE_NOMI); }
    const voluto = this.toponimi ? this.toponimi.voluto : false;
    const lista = Array.isArray(punti) ? punti : [];
    this.toponimi = { punti: lista, gruppo: L.layerGroup(), voluto, mostrati: new Map(), foto: null, zoom: null, copertura: coperturaNomi(lista) };
    this.ricreaBasePmtiles();
    this.aggiornaToponimi(true);
  }

  mostraToponimi(si) {
    if (!this.toponimi) return;
    const prima = this.toponimi.voluto;
    this.toponimi.voluto = !!si;
    if (prima !== this.toponimi.voluto) this.ricreaBasePmtiles();
    this.aggiornaToponimi(true);
  }

  impostaNomiRegione(punti) {
    this.nomiRegione = Array.isArray(punti) && punti.length ? indicePunti(punti) : null;
    this.esitiCarta = new Map();
    this.aggiornaToponimi(true);
  }

  giaSullaCartaInCache(p, stampate) {
    const parteDelNome = this.cartaRegionale();
    const k = stampate.join() + (parteDelNome ? '|carta' : '');
    let m = this.esitiCarta.get(k);
    if (!m) this.esitiCarta.set(k, m = new WeakMap());
    if (!m.has(p)) m.set(p, giaSullaCarta(p, this.nomiRegione, stampate, { parteDelNome }));
    return m.get(p);
  }

  ricreaBasePmtiles() {
    const u = this.ultimaBase;
    if (!u || !u.mb.strati.some((s) => s.tipo === 'pmtiles')) return;
    try { this.impostaBase(u.mb, u.opz); } catch { /* estratto non piu' disponibile: resta la base attuale */ }
  }

  toponimiVoluti() { return !!this.toponimi && this.toponimi.voluto; }
  toponimiVisibili() { return !!this.toponimi && this.map.hasLayer(this.toponimi.gruppo); }
  etichetteToponimi() {
    if (!this.toponimiVisibili()) return [];
    return [...this.toponimi.mostrati.values()].map(({ p }) => ({ id: p.id, tipo: p.t, nome: p.n, quota: p.q }));
  }

  rettangoliOccupati() {
    const c = this.map.getContainer();
    const base = c.getBoundingClientRect();
    const r = [];
    const aggiungi = (e) => {
      if (!e || e.hidden || !e.getClientRects().length) return;
      const b = e.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) r.push({ x0: b.left - base.left, y0: b.top - base.top, x1: b.right - base.left, y1: b.bottom - base.top });
    };
    for (const e of c.querySelectorAll('.leaflet-control')) aggiungi(e);
    try { for (const e of this.zoneOccupate() || []) aggiungi(e); } catch { /* schermata senza comandi */ }
    return r;
  }

  aggiornaToponimi(forza = false) {
    const L = this.L;
    const t = this.toponimi;
    if (!t) return;
    if (!t.voluto) {
      if (this.map.hasLayer(t.gruppo)) { this.map.removeLayer(t.gruppo); this.map.attributionControl.removeAttribution(ATTRIBUZIONE_NOMI); }
      return;
    }
    if (!this.map.hasLayer(t.gruppo)) { t.gruppo.addTo(this.map); this.map.attributionControl.addAttribution(ATTRIBUZIONE_NOMI); }
    const z = this.map.getZoom();
    const foto = this.sfondoPiste() === 'foto';
    const carta = this.cartaRegionale();
    if (forza || t.foto !== foto || t.carta !== carta || t.zoom !== z) {
      t.gruppo.clearLayers();
      t.mostrati.clear();
      t.foto = foto; t.carta = carta; t.zoom = z;
    }
    const dim = this.map.getSize();
    const b = this.map.getBounds();
    const [s, n, o, e] = [b.getSouth(), b.getNorth(), b.getWest(), b.getEast()];
    const candidate = [], luoghi = [];
    const stampate = this.nomiCartaBase && this.nomiRegione ? scritteStampate(this.nomiCartaBase, z) : [];
    for (const p of t.punti) {
      if (p.lat < s || p.lat > n || p.lon < o || p.lon > e) continue;
      const c = this.map.latLngToContainerPoint([p.lat, p.lon]);
      luoghi.push({ p, x: c.x, y: c.y });
      if (zoomMinimo(p) > z) continue;
      if (stampate.length && this.giaSullaCartaInCache(p, stampate)) continue;
      const d = misuraEtichetta(p, z, carta);
      const gia = t.mostrati.get(p.el + p.id);
      candidate.push({ p, x: c.x, y: c.y, ...d, posizioni: posizioniEtichetta(p, d.w, d.h), attuale: gia ? { dx: gia.dx, dy: gia.dy } : null });
    }
    const scelte = scegliEtichette(candidate, { larghezza: dim.x, altezza: dim.y, massimo: Math.round((dim.x * dim.y) / 6500),
      occupate: this.rettangoliOccupati(), vietate: this.scritteStampateSulloSchermo(stampate), costo: costoPosizioneNome(grigliaLinee(this.trattiPisteSulloSchermo()), grigliaLuoghi(luoghi)) });
    const voluti = new Map(scelte.map((c) => [c.p.el + c.p.id, c]));
    for (const [k, x] of t.mostrati) {
      const c = voluti.get(k);
      if (!c || c.dx !== x.dx || c.dy !== x.dy) { t.gruppo.removeLayer(x.m); t.mostrati.delete(k); }
    }
    for (const [k, c] of voluti) {
      if (t.mostrati.has(k)) continue;
      const m = L.marker([c.p.lat, c.p.lon], { icon: iconaNome(L, c, z, foto, carta), pane: PANE_NOMI, interactive: false, keyboard: false });
      t.gruppo.addLayer(m);
      t.mostrati.set(k, { p: c.p, m, dx: c.dx, dy: c.dy });
    }
  }

  scritteStampateSulloSchermo(stampate) {
    if (!stampate || !stampate.length || !this.nomiRegione || !this.cartaRegionale()) return [];
    const b = this.map.getBounds(), dim = this.map.getSize();
    const proietta = (lat, lon) => this.map.latLngToContainerPoint([lat, lon]);
    return rettangoliScritte(this.nomiRegione, { sud: b.getSouth(), nord: b.getNorth(), ovest: b.getWest(), est: b.getEast() }, stampate,
      proietta, metriPerPixel(this.map.getCenter().lat, this.map.getZoom()), { larghezza: dim.x, altezza: dim.y });
  }

  trattiPisteSulloSchermo() {
    const t = this.piste;
    if (!t || !this.map.hasLayer(t.tutti)) return [];
    const b = this.map.getBounds().pad(0.05);
    const tratti = [];
    for (const l of t.linee.getLayers()) {
      if (!b.intersects(l.getBounds())) continue;
      const peso = Number(l.options.weight) || 2;
      let a = null;
      for (const ll of l.getLatLngs()) {
        const c = this.map.latLngToContainerPoint(ll);
        if (a) tratti.push([a.x, a.y, c.x, c.y, peso]);
        a = c;
      }
    }
    return tratti;
  }

  // ------------------------------------------------------------ layer territoriali (dal pacchetto del territorio)
  aggiungiLayerTerritoriale(meta, collezione) {
    const L = this.L;
    const linee = meta.categoria === 'riferimento';
    const confine = meta.categoria === 'confine' || meta.categoria === 'confine-comprensorio';
    const layer = L.geoJSON(collezione, {
      pane: PANE.UFFICIALI,
      style: (f) => this.stileLayer(meta, f),
      renderer: linee ? this.canvas : undefined,
      interactive: !confine,
      onEachFeature: (f, l) => {
        if (confine) return;
        l.on('click', (ev) => { this.ultimoTocco = ev && ev.latlng; });
        this.legaScheda(l, () => popupArea(meta, f, this.areeIn(this.ultimoTocco), this.classificaArea));
      }
    });
    this.territoriali.set(meta.id, { layer, geo: layer, meta, collezione, voluto: !!meta.attivoDefault });
    this.aggiornaVisibilita();
    return layer;
  }

  /** Stile di un'area: colore e tratto dalla classificazione (regola -> colore, mai il contrario). Valori di MappaLeaflet.stileLayer. */
  stileLayer(meta, feature) {
    const confine = meta.categoria === 'confine' || meta.categoria === 'confine-comprensorio';
    if (confine) {
      // Confine CA: ciano #00b8d4, spessore 3; quello del territorio pieno (0.85 / 0.05), gli altri tenui (0.25 / 0.015):
      // valori di Adrenalina stileComprensorio / OPACITA_CA, il CA attivo e' quello del pacchetto territoriale.
      const codice = feature && feature.properties ? String(feature.properties[meta.campoCodice || 'nome'] || '').toUpperCase() : '';
      const spento = !!this.codiceConfine && !!codice && codice !== String(this.codiceConfine).toUpperCase();
      return { color: meta.colore || '#00b8d4', weight: meta.spessore || 3, opacity: spento ? 0.25 : 0.85, fill: true, fillColor: meta.colore || '#00b8d4', fillOpacity: spento ? 0.015 : 0.05, dashArray: null };
    }
    const vicino = meta.categoria === 'comprensorio-vicino';
    const linee = meta.categoria === 'riferimento' && !meta.riempimento;
    const tutelata = ['area-protetta', 'natura2000', 'altro-vincolo', 'divieto-venatorio', 'area-percorsa-dal-fuoco'].includes(meta.categoria);
    const reg = feature ? this.classificaArea(meta, feature) : null;
    const vietato = !!reg && reg.stato === STATO_AREA.DIVIETO && !reg.temporale;
    return {
      color: (reg && reg.colore) || meta.colore || '#ff6b00',
      weight: vietato ? 4 : meta.spessore || (tutelata ? 2.5 : 2),
      fill: !linee,
      fillOpacity: vietato ? 0.28 : meta.riempimento ? 0.35 : vicino ? 0.015 : tutelata ? (meta.tratteggio ? 0.07 : 0.15) : 0.12,
      opacity: vicino ? 0.6 : 1,
      dashArray: (reg && reg.tratteggio) || (vietato ? null : (meta.tratteggio || null))
    };
  }

  legaScheda(l, contenuto) {
    const L = this.L;
    l.on('popupopen', (e) => {
      const p = e.popup, el = p.getElement();
      if (!el || el.blRidimensiona) return;
      el.blRidimensiona = true;
      const x = el.querySelector('.leaflet-popup-close-button');
      if (x) { x.setAttribute('aria-label', 'Chiudi scheda'); x.title = 'Chiudi'; }
      const riadatta = () => {
        if (!p.isOpen()) return;
        const spazio = this.spazioScheda();
        L.setOptions(p, spazio);
        this.limitaDettaglio(el, spazio);
        p._updateLayout();
        p._updatePosition();
        if (!this.map._animatingZoom) p._adjustPan();
        else this.map.once('zoomend', riadatta);
      };
      el.addEventListener('bl-scheda-ridimensiona', riadatta);
    });
    l.on('click', () => this.preparaScheda(l));
    l.bindPopup(contenuto, { className: 'bl-popup-area', ...this.spazioScheda() });
  }

  preparaScheda(l) {
    const L = this.L;
    const p = l.getPopup();
    if (!p) return;
    if (this.gestoUtente) this.gestoUtente();
    L.setOptions(p, { ...this.spazioScheda(), autoPan: !this.map._animatingZoom });
    if (this.map._animatingZoom) {
      this.map.once('zoomend', () => {
        L.setOptions(p, { ...this.spazioScheda(), autoPan: true });
        if (p.isOpen()) p.update();
      });
    }
  }

  limitaDettaglio(el, spazio) {
    const corpo = el.querySelector('.scheda-corpo');
    const involucro = el.querySelector('.leaflet-popup-content-wrapper');
    if (!corpo || !involucro || corpo.hidden) return;
    corpo.style.maxHeight = 'none';
    const resto = involucro.offsetHeight - corpo.offsetHeight;
    const alto = this.map.getSize().y || 0;
    const punta = 24;
    const libero = alto - spazio.autoPanPaddingTopLeft[1] - spazio.autoPanPaddingBottomRight[1] - punta;
    const tetto = Math.min(libero, alto * 0.5 - punta) - resto;
    corpo.style.maxHeight = Math.max(72, Math.floor(tetto)) + 'px';
  }

  /** Come MappaLeaflet.spazioScheda, ma misurato dentro la radice di QUESTA mappa (coordinate relative alla mappa). */
  spazioScheda() {
    const largo = this.map.getSize().x || 320;
    const alto = this.map.getSize().y || 0;
    const cont = this.map.getContainer().getBoundingClientRect();
    const box = (s) => { const el = this.radice.querySelector(s); const r = el && !el.hidden && el.getBoundingClientRect(); return r && r.height ? r : null; };
    const strumento = box('.bl-strumento');
    const sopra = Math.max(8, strumento ? strumento.bottom - cont.top : 0) + 8;
    const comandi = box('.bl-controlli');
    const destra = comandi ? Math.max(8, cont.right - comandi.left + 8) : 64;
    const segna = box('.bl-segna');
    const sotto = segna ? Math.max(8, cont.bottom - segna.top + 8) : Math.min(160, alto / 4);
    const maxWidth = Math.max(160, Math.min(300, largo - destra - 8 - 26));
    return { maxWidth, minWidth: Math.min(200, maxWidth), autoPanPaddingTopLeft: [8, sopra], autoPanPaddingBottomRight: [destra, sotto] };
  }

  areeIn(latlng) {
    if (!latlng || !Number.isFinite(latlng.lat) || !Number.isFinite(latlng.lng)) return [];
    const punto = { lat: latlng.lat, lon: latlng.lng };
    const fuori = [];
    for (const v of this.territoriali.values()) {
      if (!v.voluto || !v.collezione || v.meta.categoria === 'riferimento') continue;
      for (const feature of v.collezione.features || []) {
        if (!feature || !feature.geometry) continue;
        const t = feature.geometry.type;
        if (t !== 'Polygon' && t !== 'MultiPolygon') continue;
        if (puntoInGeometria(punto, feature.geometry)) fuori.push({ meta: v.meta, feature });
      }
    }
    return fuori;
  }

  aggiornaVisibilita() {
    const z = this.map.getZoom();
    for (const t of this.territoriali.values()) {
      const vedi = t.voluto && (!Number.isFinite(t.meta.minZoom) || z >= t.meta.minZoom);
      if (vedi && !this.map.hasLayer(t.layer)) t.layer.addTo(this.map);
      if (!vedi && this.map.hasLayer(t.layer)) this.map.removeLayer(t.layer);
    }
    this.aggiornaVisibilitaPiste();
    this.aggiornaToponimi();
  }

  /** Inquadra la sola feature con quel codice (campoCodice del layer, es. CAVCO3). false se non c'e'. */
  adattaAFeature(id, codice) {
    const t = this.territoriali.get(id);
    if (!t || !codice) return false;
    const campo = t.meta.campoCodice || 'nome';
    const f = (t.collezione.features || []).find((x) => x && x.properties && String(x.properties[campo]).toUpperCase() === String(codice).toUpperCase());
    if (!f) return false;
    const b = this.L.geoJSON(f).getBounds();
    if (!b.isValid()) return false;
    this.map.fitBounds(b, { padding: [10, 10] });
    return true;
  }

  haLayer(id) { return this.territoriali.has(id); }
  mostraLayer(id, visibile) {
    const t = this.territoriali.get(id);
    if (!t) return;
    t.voluto = !!visibile;
    this.aggiornaVisibilita();
  }
  layerVoluto(id) { const t = this.territoriali.get(id); return !!t && t.voluto; }
  layerVisibile(id) { const t = this.territoriali.get(id); return !!t && this.map.hasLayer(t.layer); }
  adattaA(id) {
    const t = this.territoriali.get(id);
    const b = t ? t.geo.getBounds() : null;
    if (b && b.isValid()) { this.map.fitBounds(b, { padding: [10, 10] }); return true; }
    return false;
  }

  // ------------------------------------------------------------ piste, strade e sentieri OSM (palette di Adrenalina)
  // ---- copia dei metodi piste di MappaLeaflet (senza il caricamento a tasselli: una collezione per territorio)
  creaStatoPiste(filtro) {
    const L = this.L;
    if (this.piste) this.map.removeLayer(this.piste.tutti);
    const svg = L.svg({ pane: PANE.PISTE, padding: 0.3 });
    // senza canvas 2D (vecchi browser, jsdom dei test) tutto in SVG, come nel pilota
    const tela = canvasDisponibile(L) ? L.canvas({ pane: PANE.PISTE, padding: 0.3 }) : svg;
    const bordi = L.layerGroup(), linee = L.layerGroup(), tocchi = L.layerGroup(), barriere = L.layerGroup();
    const tutti = L.layerGroup([bordi, linee, tocchi, barriere]);
    const voluto = this.piste ? this.piste.voluto : false;
    this.piste = { tutti, bordi, linee, tocchi, barriere, voci: [], punti: [], voluto, filtro: filtroValido(filtro),
      zoomStile: this.map.getZoom(), sfondo: this.sfondoPiste(), cartaRegionale: this.cartaRegionale(), stile: this.stilePercorsi, dettaglio: null, svg, tela, pacchetto: null, pacchetti: [], caricaTassello: null, tasselli: new Map(), suErroreTassello: null };
    return this.piste;
  }
  vociPiste(collezione, zoom) {
    const L = this.L;
    const t = this.piste;
    const voci = [], punti = [];
    for (const f of (collezione && collezione.features) || []) {
      const p = f.properties || {};
      const g = f.geometry;
      if (g.type === 'LineString') {
        const ll = g.coordinates.map(([lon, lat]) => [lat, lon]);
        const st = stilePercorso(p, zoom, t.sfondo, t.stile, { cartaRegionale: t.cartaRegionale });
        const voce = {
          p,
          bordo: L.polyline(ll, { ...st.bordo, renderer: t.tela, interactive: false }),
          linea: L.polyline(ll, { ...st.linea, renderer: t.tela, interactive: false }),
          tocco: L.polyline(ll, { renderer: t.svg, color: '#000', opacity: 0, weight: 18, interactive: true, className: 'bl-pista-tocco' })
        };
        voce.tocco.feature = f;
        this.legaScheda(voce.tocco, () => nodoSchedaPista(schedaPista(p)));
        // Fasce larghe si sovrappongono dove pista e sentiero corrono vicini:
        // la scheda e' quella della linea PIU' VICINA al dito, non della fascia
        // disegnata per ultima.
        voce.tocco.off('click', voce.tocco._openPopup, voce.tocco);
        voce.tocco.on('click', (ev) => {
          L.DomEvent.stop(ev);
          const v = this.pistaPiuVicina(ev.latlng) || voce;
          this.preparaScheda(v.tocco);
          v.tocco.openPopup(ev.latlng);
        });
        voci.push(voce);
      } else if (g.type === 'Point' && p.elemento === 'barriera') {
        const m = L.circleMarker([g.coordinates[1], g.coordinates[0]], { renderer: t.svg, ...stileBarriera(zoom, t.stile), color: '#ffffff',
          fillColor: COLORI_PISTE.ristretta, fillOpacity: 1, interactive: true, className: 'bl-pista-barriera' });
        this.legaScheda(m, () => nodoSchedaPista(schedaBarriera(p)));
        punti.push({ p, m });
      }
    }
    return { voci, punti };
  }
  aggiungiPisteOsm(collezione, { filtro = FILTRO.TUTTI } = {}) {
    const t = this.creaStatoPiste(filtro);
    const { voci, punti } = this.vociPiste(collezione, t.zoomStile);
    t.voci = voci; t.punti = punti;
    this.applicaFiltroPiste();
    this.aggiornaVisibilitaPiste();
    return { vie: voci.length, barriere: punti.length };
  }
  aggiungiAiGruppiPiste(voci, punti) {
    const t = this.piste;
    const z = this.map.getZoom();
    const si = voci.filter((v) => passaFiltro(v.p, t.filtro) && visibileAZoom(v.p, z));
    // tutti i bordi prima di tutte le linee: un bordo non copre mai una linea
    for (const v of si) t.bordi.addLayer(v.bordo);
    for (const v of si) { t.linee.addLayer(v.linea); t.tocchi.addLayer(v.tocco); }
    // sbarre e cancelli contano per chi va con il mezzo: non nel filtro "Sentieri"
    if (t.filtro !== FILTRO.SENTIERI) for (const b of punti) if (visibileAZoom(b.p, z)) t.barriere.addLayer(b.m);
  }
  applicaFiltroPiste() {
    const t = this.piste;
    if (!t) return;
    for (const g of [t.bordi, t.linee, t.tocchi, t.barriere]) g.clearLayers();
    t.dettaglio = this.map.getZoom() >= ZOOM_DETTAGLIO_PISTE;
    this.aggiungiAiGruppiPiste(t.voci, t.punti);
    this.aggiornaToponimi();
  }
  aggiornaVisibilitaPiste() {
    const t = this.piste;
    if (!t) return;
    const z = this.map.getZoom();
    const vedi = t.voluto && z >= ZOOM_MINIMO_PISTE;
    if (vedi && !this.map.hasLayer(t.tutti)) t.tutti.addTo(this.map);
    if (!vedi && this.map.hasLayer(t.tutti)) this.map.removeLayer(t.tutti);
    if (!vedi) return;
    // dettaglio dei paesi (da z14) acceso o spento: si rifanno i gruppi
    if ((z >= ZOOM_DETTAGLIO_PISTE) !== t.dettaglio) this.applicaFiltroPiste();
    // spessori per fascia di zoom: si ristilizza solo quando la fascia cambia
    if (fasciaZoomPiste(z) !== fasciaZoomPiste(t.zoomStile)) {
      t.zoomStile = z;
      this.ristilizzaPiste(true);
    }
  }
  sfondoPiste() { return sfondoDiBase(this.idBase); }
  cartaRegionale() { return !!this.nomiCartaBase && this.sfondoPiste() !== 'foto'; }
  ristilizzaPiste(forza = false) {
    const t = this.piste;
    if (!t) return;
    const sfondo = this.sfondoPiste();
    const regionale = this.cartaRegionale();
    if (!forza && sfondo === t.sfondo && regionale === t.cartaRegionale) return;
    t.sfondo = sfondo;
    t.cartaRegionale = regionale;
    t.stile = this.stilePercorsi;
    for (const v of t.voci) {
      const st = stilePercorso(v.p, t.zoomStile, sfondo, t.stile, { cartaRegionale: regionale });
      v.bordo.setStyle(st.bordo); v.linea.setStyle(st.linea);
    }
    const sb = stileBarriera(t.zoomStile, t.stile);
    for (const b of t.punti) { b.m.setRadius(sb.radius); b.m.setStyle({ weight: sb.weight }); }
  }
  pistaPiuVicina(latlng) {
    const L = this.L;
    const t = this.piste;
    if (!t || !latlng) return null;
    const p = this.map.latLngToLayerPoint(latlng);
    let migliore = null, dMin = 10;               // meta' fascia (18 px) + un margine
    for (const v of t.voci) {
      if (!t.tocchi.hasLayer(v.tocco)) continue;
      for (const parte of v.tocco._parts || []) {
        for (let i = 1; i < parte.length; i++) {
          const d = L.LineUtil.pointToSegmentDistance(p, parte[i - 1], parte[i]);
          if (d < dMin) { dMin = d; migliore = v; }
        }
      }
    }
    return migliore;
  }
  haPisteOsm() { return !!this.piste; }
  mostraPisteOsm(si) {
    if (!this.piste) return;
    const prima = this.stradeNellePiste();
    this.piste.voluto = !!si;
    this.aggiornaVisibilitaPiste();
    if (prima !== this.stradeNellePiste()) this.ricreaBasePmtiles();
    this.aggiornaToponimi();
  }
  impostaFiltroPiste(filtro) {
    if (!this.piste) return;
    const prima = this.stradeNellePiste();
    this.piste.filtro = filtroValido(filtro);
    this.applicaFiltroPiste();
    if (prima !== this.stradeNellePiste()) this.ricreaBasePmtiles();
  }
  stradeNellePiste() { return this.pisteVolute() && this.piste.filtro !== FILTRO.SENTIERI; }
  pisteVolute() { return !!this.piste && this.piste.voluto; }
  pisteVisibili() { return !!this.piste && this.map.hasLayer(this.piste.tutti); }
  filtroPiste() { return this.piste ? this.piste.filtro : FILTRO.TUTTI; }

  // ------------------------------------------------------------ punti dei dati dell'app (adattatore Firebase/Supabase)
  /**
   * Segnaposto a goccia con il nome sopra (stile «punto d'interesse della squadra» di Adrenalina).
   * @param {string} id  gruppo (es. 'punti')
   * @param {Array<{id: string, lat: number, lon: number, nome?: string}>} lista
   * @param {(p: object) => void} suTocco
   */
  aggiornaPunti(id, lista, suTocco = () => {}) {
    const L = this.L;
    let g = this.punti.get(id);
    if (!g) { g = { gruppo: L.layerGroup(), voluto: true }; this.punti.set(id, g); g.gruppo.addTo(this.map); }
    g.gruppo.clearLayers();
    for (const p of lista || []) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      const div = document.createElement('div');
      div.className = 'bl-poi-squadra';
      const m = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: '', html: div, iconSize: [26, 34], iconAnchor: [13, 32] }), pane: 'markerPane', keyboard: true, title: String(p.nome || '') });
      if (p.nome) {
        const et = document.createElement('span');
        et.textContent = String(p.nome).slice(0, 40);
        m.bindTooltip(et, { permanent: true, direction: 'top', offset: [0, -30], className: 'bl-etichetta bl-etichetta-poi-squadra' });
      }
      m.on('click', () => suTocco(p));
      g.gruppo.addLayer(m);
    }
    return g.gruppo.getLayers().length;
  }

  mostraPunti(id, si) {
    const g = this.punti.get(id);
    if (!g) return;
    g.voluto = !!si;
    if (si && !this.map.hasLayer(g.gruppo)) g.gruppo.addTo(this.map);
    if (!si && this.map.hasLayer(g.gruppo)) this.map.removeLayer(g.gruppo);
  }
  puntiVisibili(id) { const g = this.punti.get(id); return !!g && this.map.hasLayer(g.gruppo); }
  numeroPunti(id) { const g = this.punti.get(id); return g ? g.gruppo.getLayers().length : 0; }
  svuotaPunti(id) { const g = this.punti.get(id); if (g) g.gruppo.clearLayers(); }

  // ------------------------------------------------------------ la mia posizione (dal provider GPS dell'app)
  aggiornaIo(p) {
    const L = this.L;
    if (!p) {
      if (this.io) { this.map.removeLayer(this.io.marker); this.map.removeLayer(this.io.cerchio); this.io = null; }
      return;
    }
    const pos = [p.lat, p.lon];
    if (!this.io) {
      const radice = document.createElement('div');
      const punto = document.createElement('div');
      const freccia = document.createElement('div');
      freccia.className = 'bl-freccia';
      const sigla = document.createElement('span');
      sigla.className = 'bl-io-sigla';
      punto.append(freccia, sigla);
      radice.appendChild(punto);
      const marker = L.marker(pos, { icon: L.divIcon({ className: '', html: radice, iconSize: [26, 26], iconAnchor: [13, 13] }), keyboard: false, zIndexOffset: 1000, interactive: false }).addTo(this.map);
      const cerchio = L.circle(pos, { radius: 1, weight: 1.5, color: COLORI.posizione, fillColor: COLORI.posizione, fillOpacity: 0.1, interactive: false }).addTo(this.map);
      this.io = { marker, cerchio, punto, freccia, sigla };
    }
    const v = this.io;
    v.marker.setLatLng(pos);
    v.cerchio.setLatLng(pos);
    v.cerchio.setRadius(Number.isFinite(p.acc) ? p.acc : 0);
    v.cerchio.setStyle({ dashArray: p.stato === 'live' ? null : '5 5' });
    v.punto.className = 'bl-io stato-' + (p.stato || 'live');
    const conDirezione = Number.isFinite(p.heading) && p.stato === 'live';
    v.freccia.style.display = conDirezione ? 'block' : 'none';
    if (conDirezione) v.freccia.style.transform = 'rotate(' + p.heading + 'deg)';
  }

  // ------------------------------------------------------------ strumenti: anelli, misura, tocchi
  mostraAnelli(centro, raggiPer, etichetta) {
    const L = this.L;
    if (!centro) { this.nascondiAnelli(); return; }
    const raggi = raggiPer(this.map.getZoom());
    if (!this.anelli || this.anelli.raggi.join() !== raggi.join()) {
      this.nascondiAnelli();
      const gruppo = L.layerGroup().addTo(this.map);
      const voci = raggi.map((r) => {
        const cerchio = L.circle([centro.lat, centro.lon], { radius: r, color: '#ffffff', weight: 1.5, opacity: 0.9, dashArray: '6 6', fill: false, interactive: false, className: 'bl-anello' });
        const div = document.createElement('div');
        div.className = 'bl-anello-etichetta';
        div.textContent = etichetta(r);
        const nota = L.marker(puntoANord(centro, r), { icon: L.divIcon({ className: '', html: div, iconSize: [48, 16], iconAnchor: [24, 8] }), interactive: false, keyboard: false });
        gruppo.addLayer(cerchio).addLayer(nota);
        return { r, cerchio, nota };
      });
      this.anelli = { raggi, gruppo, voci, raggiPer, etichetta };
      if (!this.anelliAscolto) {
        this.anelliAscolto = true;
        this.map.on('zoomend', () => { if (this.anelli) this.mostraAnelli(this.anelli.centro, this.anelli.raggiPer, this.anelli.etichetta); });
      }
    }
    this.anelli.centro = centro;
    for (const v of this.anelli.voci) {
      v.cerchio.setLatLng([centro.lat, centro.lon]);
      v.nota.setLatLng(puntoANord(centro, v.r));
    }
  }

  nascondiAnelli() {
    if (this.anelli) { this.map.removeLayer(this.anelli.gruppo); this.anelli = null; }
  }

  mostraMisura(da, a) {
    const L = this.L;
    const punti = (Array.isArray(a) ? a : [a]).filter(Boolean);
    const linea = (da ? [da, ...punti] : punti).map((p) => [p.lat, p.lon]);
    if (!punti.length || linea.length < (da ? 2 : 1)) { this.nascondiMisura(); return; }
    const fine = punti[punti.length - 1];
    if (!this.misura) {
      const l = L.polyline([], { color: '#ffffff', weight: 3, opacity: 0.95, dashArray: '2 6', interactive: false, className: 'bl-misura-linea' });
      const div = document.createElement('div');
      div.className = 'bl-misura-bersaglio';
      const bersaglio = L.marker([fine.lat, fine.lon], { icon: L.divIcon({ className: '', html: div, iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, keyboard: false });
      const vertici = L.layerGroup();
      this.misura = { gruppo: L.layerGroup([l, vertici, bersaglio]).addTo(this.map), linea: l, bersaglio, vertici };
    }
    this.misura.linea.setLatLngs(linea);
    this.misura.bersaglio.setLatLng([fine.lat, fine.lon]);
    this.misura.vertici.clearLayers();
    for (const p of punti.slice(0, -1)) {
      this.misura.vertici.addLayer(L.circleMarker([p.lat, p.lon], { radius: 4, color: '#1b2a22', weight: 2, fillColor: '#ffffff', fillOpacity: 1, interactive: false, className: 'bl-misura-vertice' }));
    }
  }

  nascondiMisura() {
    if (this.misura) { this.map.removeLayer(this.misura.gruppo); this.misura = null; }
  }

  suTocchi(fn) {
    const el = this.map.getContainer();
    el.classList.add('bl-tocchi-mappa');
    const f = (e) => fn({ lat: e.latlng.lat, lon: e.latlng.lng });
    this.map.on('click', f);
    return () => { el.classList.remove('bl-tocchi-mappa'); this.map.off('click', f); };
  }

  centra(lat, lon, zoom) { this.map.setView([lat, lon], zoom || Math.max(this.map.getZoom(), 15)); }
  segui(lat, lon) { this.map.panTo([lat, lon], { animate: true, duration: 0.5 }); }
  zoomPiu() { this.map.zoomIn(); }
  zoomMeno() { this.map.zoomOut(); }
  ridisegna() { this.map.invalidateSize(); }
  chiudiScheda() {
    if (!this.map._popup || !this.map._popup.isOpen()) return false;
    this.map.closePopup();
    return true;
  }
}

function puntoANord(c, r) {
  return [c.lat + r / 111320, c.lon];
}

// ------------------------------------------------------------ scheda dell'area (popup) — markup di MappaLeaflet.popupFeature
let contaSchede = 0;

/**
 * Scheda compatta: in testa nome, risposta (es. CACCIA VIETATA) e tipo; dietro «Dettagli» il resto.
 * La risposta la da' `classifica(meta, feature)` (app/territorio), mai il colore.
 */
export function popupArea(meta, f, sovrapposte, classifica = classificaNeutra) {
  const box = document.createElement('div');
  box.className = 'bl-scheda-area';
  const p = f.properties || {};
  const testa = document.createElement('div');
  testa.className = 'scheda-testa';
  const corpo = document.createElement('div');
  corpo.className = 'scheda-corpo';
  corpo.id = 'bl-scheda-corpo-' + (++contaSchede);
  corpo.hidden = true;
  corpo.tabIndex = 0;
  corpo.setAttribute('role', 'region');
  corpo.setAttribute('aria-label', 'Dettaglio dell’area');
  const dettagli = document.createElement('button');
  dettagli.type = 'button';
  dettagli.className = 'scheda-dettagli';
  dettagli.setAttribute('aria-controls', corpo.id);
  const mostra = (aperto) => {
    corpo.hidden = !aperto;
    dettagli.setAttribute('aria-expanded', String(aperto));
    dettagli.textContent = aperto ? 'Nascondi dettagli ▴' : 'Dettagli ▾';
  };
  mostra(false);
  dettagli.addEventListener('click', () => {
    mostra(corpo.hidden);
    box.dispatchEvent(new CustomEvent('bl-scheda-ridimensiona', { bubbles: true }));
  });
  box.append(testa, dettagli, corpo);
  let dove = testa;
  const riga = (etichetta, valore, classe) => {
    if (valore === undefined || valore === null || valore === '') return;
    const d = document.createElement('div');
    if (classe) d.className = classe;
    const b = document.createElement('strong');
    b.textContent = etichetta + ': ';
    d.append(b, document.createTextNode(String(valore)));
    dove.appendChild(d);
  };
  const record = [classifica(meta, f)];
  for (const s of sovrapposte || []) {
    if (s.feature === f) continue;
    const r = classifica(s.meta, s.feature);
    if (!record.some((x) => x.id === r.id)) record.push(r);
  }
  const capo = record.reduce((a, b) => ((b.priorita || 0) > (a.priorita || 0) ? b : a), record[0]);
  const vietato = capo.stato === STATO_AREA.DIVIETO && !capo.temporale;
  const titolo = document.createElement('div');
  titolo.className = 'scheda-titolo';
  titolo.textContent = capo.nome;
  testa.appendChild(titolo);
  if (capo.messaggio) {
    const stato = document.createElement('div');
    stato.className = vietato ? 'divieto-confermato' : 'nota-tutela';
    stato.textContent = capo.messaggio;
    testa.appendChild(stato);
  }
  if (capo.validoFino) {
    const d = String(capo.validoFino).split('-');
    riga(capo.stato === STATO_AREA.DIVIETO ? 'Divieto fino al' : 'Fino al', d[2] + '/' + d[1] + '/' + d[0], 'scheda-regola');
  }
  riga('Tipo', capo.tipologia || meta.titolo, 'scheda-sintesi');
  dove = corpo;
  riga('Codice', capo.codice);
  riga('Ente gestore', p[meta.campoEnte] || p.ente_gestore);
  if (p.dataIncendio) { const d = String(p.dataIncendio).split('-'); riga('Incendio del', d[2] + '/' + d[1] + '/' + d[0]); }
  if (p.superficieBoscataHa) riga('Superficie boscata', p.superficieBoscataHa + ' ha');
  for (const t of capo.prescrizioni || []) {
    const d = document.createElement('div');
    d.className = 'scheda-regola';
    d.textContent = t;
    corpo.appendChild(d);
  }
  const altre = record.filter((r) => r !== capo);
  if (altre.length) {
    const d = document.createElement('div');
    d.className = 'scheda-altre';
    d.textContent = 'Qui vale anche: ' + altre.map((r) => r.nome + (r.tipologia ? ' (' + r.tipologia + ')' : '')).join('; ') + (vietato ? '. Prevale il divieto.' : '');
    corpo.appendChild(d);
  }
  if (capo.riferimento) {
    riga('Riferimento', capo.riferimento, 'scheda-fonte');
    riga('Fonte', capo.fonte, 'scheda-fonte');
    riga('Data', capo.dataFonte, 'scheda-fonte');
  } else {
    riga('Fonte del dato', capo.fonte || p[meta.campoFonte] || meta.fonteBreve, 'scheda-fonte');
  }
  const link = capo.fonteUrl || (meta.storico && meta.storico.paginaFonte);
  if (typeof link === 'string' && /^https:\/\//.test(link)) {
    const d = document.createElement('div');
    const a = document.createElement('a');
    a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = 'Apri la fonte ufficiale';
    d.appendChild(a);
    corpo.appendChild(d);
  }
  return box;
}

/** Scheda di una via OSM — copia identica di MappaLeaflet.nodoSchedaPista. */
export function nodoSchedaPista(s) {
  const box = document.createElement('div');
  box.className = 'bl-scheda-area bl-scheda-pista';
  const testa = document.createElement('div');
  testa.className = 'scheda-testa';
  const corpo = document.createElement('div');
  corpo.className = 'scheda-corpo';
  corpo.id = 'bl-scheda-corpo-' + (++contaSchede);
  corpo.hidden = true;
  corpo.tabIndex = 0;
  corpo.setAttribute('role', 'region');
  corpo.setAttribute('aria-label', 'Dettaglio del percorso');
  const dettagli = document.createElement('button');
  dettagli.type = 'button';
  dettagli.className = 'scheda-dettagli';
  dettagli.setAttribute('aria-controls', corpo.id);
  const mostra = (aperto) => {
    corpo.hidden = !aperto;
    dettagli.setAttribute('aria-expanded', String(aperto));
    dettagli.textContent = aperto ? 'Nascondi dettagli ▴' : 'Dettagli ▾';
  };
  mostra(false);
  dettagli.addEventListener('click', () => {
    mostra(corpo.hidden);
    box.dispatchEvent(new CustomEvent('bl-scheda-ridimensiona', { bubbles: true }));
  });
  const riga = (dove, [etichetta, valore], classe) => {
    const d = document.createElement('div');
    if (classe) d.className = classe;
    const b = document.createElement('strong');
    b.textContent = etichetta + ': ';
    d.append(b, document.createTextNode(String(valore)));
    dove.appendChild(d);
  };
  const titolo = document.createElement('div');
  titolo.className = 'scheda-titolo';
  titolo.textContent = s.titolo;
  const stato = document.createElement('div');
  stato.className = 'nota-pista' + (s.ristretta ? ' ristretta' : '');
  stato.textContent = s.stato;
  testa.append(titolo, stato);
  for (const r of s.sintesi) riga(testa, r, 'scheda-sintesi');
  for (const r of s.dettaglio) riga(corpo, r, r[0] === 'Fonte' ? 'scheda-fonte' : null);
  const avviso = document.createElement('div');
  avviso.className = 'scheda-altre';
  avviso.textContent = s.avviso;
  corpo.appendChild(avviso);
  if (typeof s.link === 'string' && /^https:\/\/www\.openstreetmap\.org\//.test(s.link)) {
    const d = document.createElement('div');
    const a = document.createElement('a');
    a.href = s.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = 'Apri su OpenStreetMap';
    d.appendChild(a);
    corpo.appendChild(d);
  }
  box.append(testa, dettagli, corpo);
  return box;
}

// ------------------------------------------------------------ nomi: misure e icone (MappaLeaflet, invariati)
const FONT_NOMI = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_QUOTA = '600 11.5px ' + FONT_NOMI;
export const SPAZIATURA_NOMI = Object.freeze({ paese: 0.03, frazione: 0.02, alpe: 0.02, localita: 0.01, cima: 0.01 });
const RIGA_NOMI = Object.freeze({ paese: 20, frazione: 17, alpe: 17, localita: 15, cima: 15 });

export function fontNome(p, z, carta = false) {
  if (carta) {
    switch (p.t) {
      case TIPO_NOME.PAESE: return '700 ' + (z >= 13 ? 14 : 13) + 'px ' + FONT_NOMI;
      case TIPO_NOME.FRAZIONE: return '600 13px ' + FONT_NOMI;
      case TIPO_NOME.ALPE: return '600 12.5px ' + FONT_NOMI;
      case TIPO_NOME.LOCALITA: return 'italic 500 12px ' + FONT_NOMI;
      default: return '600 12px ' + FONT_NOMI;
    }
  }
  switch (p.t) {
    case TIPO_NOME.PAESE: return '700 ' + (z >= 13 ? 16 : 14) + 'px ' + FONT_NOMI;
    case TIPO_NOME.FRAZIONE: return '600 14px ' + FONT_NOMI;
    case TIPO_NOME.ALPE: return '600 13px ' + FONT_NOMI;
    case TIPO_NOME.LOCALITA: return 'italic 500 12.5px ' + FONT_NOMI;
    default: return '600 12.5px ' + FONT_NOMI;
  }
}

let telaMisure = null;
const misureTesto = new Map();
function larghezzaTesto(testo, font, spaziatura = 0) {
  const k = font + '|' + spaziatura + '|' + testo;
  if (misureTesto.has(k)) return misureTesto.get(k);
  let w = null;
  try {
    if (telaMisure === null) telaMisure = document.createElement('canvas').getContext('2d') || false;
    if (telaMisure) { telaMisure.font = font; w = telaMisure.measureText(testo).width; }
  } catch { telaMisure = false; }
  const px = Number(/([\d.]+)px/.exec(font)[1]);
  if (!Number.isFinite(w) || w <= 0) w = testo.length * px * 0.62;
  w += [...testo].length * spaziatura * px;
  if (misureTesto.size > 4000) misureTesto.clear();
  misureTesto.set(k, w);
  return w;
}

export function misuraEtichetta(p, z, carta = false) {
  const font = fontNome(p, z, carta);
  const sp = SPAZIATURA_NOMI[p.t] || 0;
  if (p.t === TIPO_NOME.CIMA) {
    const wn = p.n ? larghezzaTesto(p.n, font, sp) : 0;
    const wq = p.q !== null ? larghezzaTesto(testoQuota(p.q), FONT_QUOTA) : 0;
    const w = Math.ceil(Math.max(12, wn, wq)) + 6;
    const h = 11 + (p.n ? RIGA_NOMI.cima : 0) + (p.q !== null ? 14 : 0);
    return { w, h, ax: w / 2, ay: 5, testo: { x0: 0, y0: 11, x1: w, y1: h } };
  }
  const h = RIGA_NOMI[p.t] || 16;
  const w = Math.ceil(larghezzaTesto(p.n, font, sp)) + 6;
  return { w, h, ax: w / 2, ay: h / 2, testo: { x0: 3, y0: 2, x1: w - 3, y1: h - 2 } };
}

const costoPosizioneNome = (linee, luoghi) => (r, c) => linee(r) + luoghi(r, c);

function iconaNome(L, c, z, foto, carta = false) {
  const p = c.p;
  const box = document.createElement('div');
  box.className = 'bl-nome bl-nome-' + p.t + (foto ? ' foto' : '') + (carta ? ' carta' : '');
  box.style.width = c.w + 'px';
  const riga = (classe, testo, font, spaziatura) => {
    const s = document.createElement('span');
    s.className = classe;
    s.textContent = testo;
    if (font) s.style.font = font;
    if (spaziatura) s.style.letterSpacing = spaziatura + 'em';
    box.appendChild(s);
  };
  const sp = SPAZIATURA_NOMI[p.t] || 0;
  if (p.t === TIPO_NOME.CIMA) {
    riga('bl-nome-simbolo', '▲');
    if (p.n) riga('bl-nome-testo', p.n, fontNome(p, z, carta), sp);
    if (p.q !== null) riga('bl-nome-quota', testoQuota(p.q), FONT_QUOTA);
  } else {
    riga('bl-nome-testo', p.n, fontNome(p, z, carta), sp);
  }
  const dx = c.dx || 0, dy = c.dy || 0;
  return L.divIcon({ html: box, className: 'bl-nome-icona', iconSize: [c.w, c.h], iconAnchor: [c.ax - dx, c.ay - dy] });
}
