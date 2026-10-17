// MAPPA COMUNE — UNICO proprietario dei controlli: colonna (LAYER, STRUMENTI, +, −, centra, N), foglio «Layer»,
// mini pannello STRUMENTI, riquadro degli strumenti, scheda delle aree, SEGNA POSIZIONE.
//
// Markup, classi e testi sono quelli di Adrenalina battuta-live/index.html e js/app.js (disegnaPannelloLayer, voceLayer,
// apriFoglio/chiudiFogli; 0.18.21, SOLO LETTI): stesse classi .bl-*, quindi lo stesso CSS (stile/battuta-live.css).
// Le parti di Adrenalina riusate cosi' come sono: StrumentiMappa (strumentiUi.js), GestioneRilievo (rilievoUi.js),
// GestioneMappaLeggibile (mappaLeggibileUi.js), mappe base (fornitori.js). Gli adattatori (vanilla, React) NON
// disegnano un secondo menu: chiamano questa funzione e passano configurazione e callback.
//
// Cosa resta nell'app ospitante: login, permessi, scelta dell'ente, regole venatorie, dati di dominio (squadra,
// recuperi...), moduli di inserimento dopo SEGNA POSIZIONE, pannelli propri (traccia, menu, testata).
import { MotoreMappa } from '../motore/MotoreMappa.js';
import { classificaNeutra } from '../motore/aree.js';
import { vociMappaBase, mappaBase, richiedeInternet, VOCE_FOTO, voceDiBase, MAPPA_PREDEFINITA, IBRIDA_SENZA_OFFLINE, MAPPA_OFFLINE } from '../origine/fornitori.js';
import { StrumentiMappa } from '../origine/strumentiUi.js';
import { GestioneRilievo } from '../origine/rilievoUi.js';
import { GestioneMappaLeggibile } from '../origine/mappaLeggibileUi.js';
import { ServizioTerreno } from '../origine/terreno.js';
import { Vento } from '../origine/strumentiMappa.js';
import { COLORI_PISTE, FILTRO, STILE_PERCORSI, ZOOM_MINIMO_PISTE, ZOOM_DETTAGLIO_PISTE } from '../origine/pisteOsm.js';
import { PacchettoDtm } from '../origine/pacchettoDtm.js';
import { creaCacheIsolata } from '../offline/cacheIsolata.js';
import { caricaTerritorio } from '../territorio/territorio.js';

function el(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
}

/** Preferenze dell'utente separate per progetto ed ente (stesso Storage, chiavi diverse). */
export function archivioConPrefisso(archivio, prefisso) {
  return {
    getItem: (k) => { try { return archivio ? archivio.getItem(prefisso + k) : null; } catch { return null; } },
    setItem: (k, v) => { try { if (archivio) archivio.setItem(prefisso + k, v); } catch { /* storage pieno o assente */ } },
    removeItem: (k) => { try { if (archivio) archivio.removeItem(prefisso + k); } catch { /* assente */ } }
  };
}

const MODELLO = `
<div class="mc-mappa" data-mc="mappa" aria-label="Mappa"></div>
<div class="bl-strumento" data-mc="bl-strumento" role="status" aria-live="polite" hidden></div>
<div class="bl-controlli" aria-label="Controlli mappa">
  <button type="button" class="bl-ctrl bl-ctrl-layer" data-mc="b-layer" aria-label="Layer della mappa" aria-haspopup="dialog">
    <span class="bl-ico-layer" aria-hidden="true"></span><span class="mini">LAYER</span>
  </button>
  <button type="button" class="bl-ctrl bl-ctrl-strumenti" data-mc="b-strumenti" aria-label="Strumenti: distanze, misura, vento" aria-expanded="false">
    <span class="bl-ico-strumenti" aria-hidden="true"></span><span class="mini">STRUMENTI</span>
  </button>
  <div class="bl-mini-strumenti" data-mc="pannello-strumenti" role="group" aria-label="Strumenti della mappa" hidden></div>
  <button type="button" class="bl-ctrl bl-zoom-piu" data-mc="b-zoom-piu" aria-label="Avvicina">+</button>
  <button type="button" class="bl-ctrl bl-zoom-meno" data-mc="b-zoom-meno" aria-label="Allontana">&minus;</button>
  <button type="button" class="bl-ctrl bl-centra" data-mc="b-centra" aria-label="Centra sulla mia posizione" aria-pressed="false">
    <span class="bl-ico-centra" aria-hidden="true"></span>
  </button>
  <div class="bl-ctrl bl-nord" title="La mappa è sempre orientata a nord" aria-label="Nord in alto">N</div>
</div>
<button type="button" class="bl-segna" data-mc="b-segna" aria-label="Segna posizione: salva un punto dove sei">
  <span class="ico" aria-hidden="true"></span><span class="testo">Segna posizione</span>
</button>
<div class="mc-avvisi" data-mc="avvisi" aria-live="polite"></div>
<div class="bl-foglio" data-mc="f-layer" role="dialog" aria-modal="true" aria-label="Layer" hidden>
  <div class="bl-foglio-corpo">
    <div class="bl-foglio-testa"><h2>Layer</h2><button type="button" class="bl-chiudi" data-chiudi aria-label="Chiudi">&times;</button></div>
    <h3 data-mc="h-leggibile">Nomi e percorsi</h3>
    <div class="bl-scelte" data-mc="l-leggibile" aria-label="Nomi e stile dei percorsi"></div>
    <h3>Mappa base</h3>
    <div class="bl-scelte" data-mc="l-base" role="radiogroup" aria-label="Mappa base"></div>
    <p class="bl-nota" data-mc="l-base-nota"></p>
    <div class="bl-scelte" data-mc="l-rilievo" aria-label="Sopra la mappa base"></div>
    <button type="button" class="bl-btn bl-btn-tenue bl-apri-mappe" data-mc="b-mappe-offline" hidden>Mappe offline</button>
    <h3 data-mc="h-territorio">Territorio</h3>
    <div class="bl-scelte" data-mc="l-territorio"></div>
    <h3 data-mc="h-dati" hidden>Dati</h3>
    <div class="bl-scelte" data-mc="l-dati"></div>
    <h3 data-mc="h-strumenti">Strumenti</h3>
    <div class="bl-scelte" data-mc="l-strumenti"></div>
    <div class="bl-scelte" data-mc="l-dtm"></div>
    <p class="bl-nota" data-mc="l-nota"></p>
  </div>
</div>
<div class="bl-foglio" data-mc="f-modulo" role="dialog" aria-modal="true" aria-label="Modulo" hidden>
  <div class="bl-foglio-corpo" data-mc="modulo-corpo"></div>
</div>`;

/**
 * Crea la mappa comune dentro `contenitore`.
 * @param {HTMLElement} contenitore  elemento con altezza propria (la mappa lo riempie)
 * @param {object} config            vedi docs/GUIDA_INTEGRAZIONE.md
 */
export async function creaMappaComune(contenitore, config = {}) {
  const { L } = config;
  if (!contenitore) throw new Error('creaMappaComune: contenitore mancante');
  if (!L) throw new Error('creaMappaComune: serve Leaflet (config.L)');
  const progetto = config.progetto || 'app';
  const funz = { segnaPosizione: true, strumenti: true, rilievo: true, nomi: true, piste: true, dtmOffline: true, ...(config.funzioni || {}) };
  const cb = config.callback || {};

  const radice = el('div', 'bl-tema mc-radice');
  radice.innerHTML = MODELLO;
  contenitore.appendChild(radice);
  const q = (id) => radice.querySelector('[data-mc="' + id + '"]');
  if (config.testi && config.testi.segna) q('b-segna').querySelector('.testo').textContent = config.testi.segna;
  if (!funz.segnaPosizione) q('b-segna').hidden = true;
  if (!funz.strumenti) q('b-strumenti').hidden = true;

  // ---- territorio (pacchetto) e preferenze isolate per progetto/ente
  const territorio = config.territorio && config.territorio.manifesto ? config.territorio
    : config.territorio && config.territorio.base ? await caricaTerritorio({ base: config.territorio.base, fetchImpl: config.fetchImpl }) : null;
  const idTerr = territorio ? territorio.id : 'nessuno';
  const prefs = archivioConPrefisso(config.archivio === undefined ? globalThis.localStorage : config.archivio, 'mappe-comuni:' + progetto + ':' + idTerr + ':');
  const vistaIniziale = (territorio && territorio.manifesto.vista) || config.vista || { lat: 45.9, lon: 8.4, zoom: 10 };

  const motore = new MotoreMappa(q('mappa'), { L, vista: vistaIniziale, classificaArea: config.classificaArea || classificaNeutra, radice,
    codiceConfine: territorio && territorio.manifesto.confine ? territorio.manifesto.confine.codice : null });
  motore.zoneOccupate = () => [...radice.querySelectorAll('.bl-controlli, .bl-segna, .bl-strumento')];

  const avvisi = q('avvisi');
  const avviso = (testo, tipo = 'info') => {
    if (cb.avviso && cb.avviso(testo, tipo) === true) return;
    const a = el('div', 'mc-avviso mc-avviso-' + tipo, testo);
    avvisi.appendChild(a);
    setTimeout(() => a.remove(), 4500);
  };

  // ---- la «vista» che StrumentiMappa, GestioneRilievo e GestioneMappaLeggibile si aspettano (contratto di VistaBattuta)
  let ultimaPosizione = null;
  let segui = false;
  const vista = {
    mappa: motore,
    el: q,
    posizioneMostrata: () => ultimaPosizione,
    avviso,
    chiudiFogli,
    voceLayer,
    disegnaSceltaBase: () => { if (!q('f-layer').hidden) disegnaPannelloLayer(); },
    modulo
  };

  function voceLayer({ titolo, nota, disponibile, acceso, colore, cambia, id }) {
    const s = el('label', 'bl-scelta' + (disponibile ? '' : ' non-disponibile'));
    const i = el('input');
    i.type = 'checkbox'; i.checked = !!acceso; i.disabled = !disponibile; if (id) i.id = id;
    i.onchange = () => cambia(i.checked);
    const testi = el('span', 'testi');
    testi.append(el('span', 'titolo', titolo), el('small', '', nota));
    s.append(i);
    if (colore) { const c = el('span', 'campione'); c.style.borderColor = colore; c.style.background = colore + '33'; s.append(c); }
    s.append(testi);
    return s;
  }

  function chiudiFogli() {
    for (const f of radice.querySelectorAll('.bl-foglio')) if (f.dataset.mc !== 'f-modulo') f.hidden = true;
  }

  function apriFoglio(id) {
    chiudiFogli();
    if (strumenti) strumenti.chiudiRapido();
    q(id).hidden = false;
    if (id === 'f-layer') disegnaPannelloLayer();
  }

  /** Piccolo modulo (vento manuale): stesso formato di VistaBattuta.modulo. */
  function modulo({ titolo, righe = [], campi = [], si = 'OK' }) {
    return new Promise((fatto) => {
      const corpo = q('modulo-corpo');
      corpo.replaceChildren(el('h2', '', titolo), ...righe.map((r) => el('p', 'bl-nota', r)));
      const valori = {};
      for (const c of campi) {
        const lab = el('label', 'bl-campo');
        lab.append(el('span', '', c.etichetta));
        let inp;
        if (c.opzioni) { inp = el('select'); for (const o of c.opzioni) { const op = el('option', '', o.testo); op.value = o.valore; inp.appendChild(op); } } else { inp = el('input'); inp.maxLength = c.max || 60; }
        inp.value = c.valore || '';
        valori[c.id] = inp;
        lab.appendChild(inp);
        corpo.appendChild(lab);
      }
      const az = el('div', 'bl-griglia2');
      const ok = el('button', 'bl-btn bl-btn-primario', si); ok.type = 'button';
      const no = el('button', 'bl-btn bl-btn-tenue', 'Annulla'); no.type = 'button';
      const chiudi = (v) => { q('f-modulo').hidden = true; fatto(v); };
      ok.onclick = () => chiudi(Object.fromEntries(Object.entries(valori).map(([k, i]) => [k, i.value])));
      no.onclick = () => chiudi(null);
      az.append(ok, no);
      corpo.appendChild(az);
      q('f-modulo').hidden = false;
    });
  }

  // ---- mappa base: stesse voci e stessa logica di Adrenalina (Mappa, Aerea / Ibrida, Terreno, Mappa offline)
  const CHIAVE_BASE = 'base';
  const sorgentePmtiles = config.sorgentePmtiles || null;
  let sceltaBase = prefs.getItem(CHIAVE_BASE) || MAPPA_PREDEFINITA.id;
  function definizioneBase(id) {
    let mb = mappaBase(id) || MAPPA_PREDEFINITA;
    // Ibrida senza estratto offline: foto + carta 1:10.000 (fornitori.js, IBRIDA_SENZA_OFFLINE)
    if (mb.id === 'ibrida' && !sorgentePmtiles) mb = IBRIDA_SENZA_OFFLINE;
    return mb;
  }
  function applicaBase(id) {
    const mb = definizioneBase(id);
    if (mb.id === MAPPA_OFFLINE.id && !sorgentePmtiles) {
      avviso('Mappa offline: nessuna mappa scaricata per questo territorio.', 'info');
      if (cb.suMappeOffline) cb.suMappeOffline();
      disegnaPannelloLayer();
      return;
    }
    try {
      motore.impostaBase(mb, { sorgentePmtiles });
      sceltaBase = mb.id === IBRIDA_SENZA_OFFLINE.id ? 'ibrida' : mb.id;
      prefs.setItem(CHIAVE_BASE, sceltaBase);
      if (rilievo) rilievo.applica();
      if (cb.suCambioBase) cb.suCambioBase(sceltaBase);
    } catch (e) { avviso('Mappa base non disponibile: ' + e.message, 'errore'); }
    if (!q('f-layer').hidden) disegnaPannelloLayer();
  }

  // ---- parti riusate da Adrenalina
  const confineMeta = territorio && territorio.manifesto.confine;
  const rilievo = funz.rilievo ? new GestioneRilievo(vista, { archivio: prefs, codiceConfine: confineMeta ? confineMeta.codice : null, nomeConfine: territorio ? territorio.nome : 'territorio' }) : null;
  const fileNomi = territorio ? { toponimi: territorio.manifesto.toponimi || null, nomiRegione: territorio.manifesto.nomiRegione || null } : {};
  const leggibile = funz.nomi ? new GestioneMappaLeggibile(vista, {
    archivio: prefs, file: fileNomi,
    fetchImpl: async (voce) => ({ ok: true, status: 200, text: () => territorio.leggiTesto(voce) })
  }) : null;
  let dtm = null;
  if (funz.dtmOffline && territorio && territorio.baseDtm()) {
    const archivioDtm = config.cacheOffline || creaCacheIsolata({ progetto, ente: territorio.id, versione: territorio.manifesto.versioneDati, memoria: config.memoriaOffline || undefined });
    dtm = new PacchettoDtm({ base: territorio.baseDtm(), id: 'dtm', archivio: archivioDtm, fetchImpl: config.fetchImpl || ((u) => fetch(u)) });
  }
  const terreno = new ServizioTerreno({ offline: dtm });
  const strumenti = funz.strumenti ? new StrumentiMappa(vista, { terreno, vento: new Vento() }) : null;

  // ---- territorio: layer pubblici dal pacchetto (caricati se accesi di default, gli altri quando li si accende)
  const statoLayer = new Map();   // id -> 'pronto' | 'in-caricamento' | errore
  async function caricaLayer(meta) {
    if (motore.haLayer(meta.id)) return true;
    statoLayer.set(meta.id, 'in-caricamento');
    try {
      const coll = await territorio.leggiJson(meta);
      motore.aggiungiLayerTerritoriale(meta, coll);
      if (confineMeta && meta.id === confineMeta.layer && rilievo) rilievo.impostaConfine(coll);
      statoLayer.set(meta.id, 'pronto');
      return true;
    } catch (e) {
      statoLayer.set(meta.id, 'errore: ' + e.message);
      avviso(meta.titolo + ': ' + e.message, 'errore');
      return false;
    }
  }
  async function accendiLayer(meta, si) {
    if (si && !(await caricaLayer(meta))) { disegnaPannelloLayer(); return; }
    motore.mostraLayer(meta.id, si);
    prefs.setItem('layer:' + meta.id, si ? '1' : '0');
    disegnaPannelloLayer();
  }

  // piste OSM (una collezione per territorio)
  const prefPiste = { acceso: prefs.getItem('piste') === '1', filtro: prefs.getItem('piste-filtro') || FILTRO.TUTTI };
  let errorePiste = null;
  async function accendiPiste(si) {
    prefPiste.acceso = !!si;
    prefs.setItem('piste', si ? '1' : '0');
    if (si && !motore.haPisteOsm()) {
      try { motore.aggiungiPisteOsm(await territorio.leggiJson(territorio.manifesto.piste), { filtro: prefPiste.filtro }); errorePiste = null; } catch (e) { errorePiste = e.message; }
    }
    motore.mostraPisteOsm(si && !errorePiste);
    if (si && motore.map.getZoom() < ZOOM_MINIMO_PISTE) avviso('Piste e sentieri: compaiono avvicinando la mappa (zoom ' + ZOOM_MINIMO_PISTE + ' e oltre).', 'info');
    disegnaPannelloLayer();
  }

  // ---- dati dell'app (adattatore Firebase o Supabase): overlay di punti, scope dall'app
  const dati = config.dati || null;
  const overlay = new Map();     // collezione -> { def, stop, punti, voluto, errore }
  let erroreDati = null;
  function avviaOverlay() {
    for (const o of overlay.values()) if (o.stop) { o.stop(); o.stop = null; }
    if (!dati || !dati.fonte || !dati.fonte.scope) return;
    for (const def of dati.overlay || []) {
      const o = overlay.get(def.collezione) || { def, punti: [], voluto: true, errore: null };
      overlay.set(def.collezione, o);
      o.punti = [];
      motore.svuotaPunti(def.collezione);
      const ricevi = (punti) => {
        o.punti = punti; o.errore = null;
        motore.aggiornaPunti(def.collezione, punti, (p) => { if (cb.suToccoPunto) cb.suToccoPunto(p, def.collezione); });
        motore.mostraPunti(def.collezione, o.voluto);
        vista.disegnaSceltaBase();
      };
      const sbaglio = (e) => { o.errore = e.message; erroreDati = e; if (cb.suErroreDati) cb.suErroreDati(e); vista.disegnaSceltaBase(); };
      try {
        if (dati.fonte.capacita(def.collezione).includes('ascolta')) o.stop = dati.fonte.ascolta(def.collezione, ricevi, sbaglio);
        else dati.fonte.elenca(def.collezione).then(ricevi, (e) => { if (e && e.codice !== 'SCOPE_CAMBIATO') sbaglio(e); });   // risposta di un ente precedente: scartata in silenzio
      } catch (e) { sbaglio(e); }
    }
  }

  /* Territori della mappa offline: dalla configurazione (config.territoriOffline) o dal pacchetto territoriale,
     mai l'elenco VCO1/VCO2/VCO3 di Adrenalina. Lo scarico dei PMTiles resta all'app (callback suMappeOffline). */
  function descrizioneOffline() {
    const nomi = Array.isArray(config.territoriOffline) && config.territoriOffline.length ? config.territoriOffline : territorio ? [territorio.nome] : [];
    return 'OpenStreetMap, dalle mappe scaricate' + (nomi.length ? ' (' + nomi.join(', ') + ')' : '');
  }

  // ---- pannello Layer (stesso ordine e stessi testi di Adrenalina; «Battuta» -> sezione dati dell'app)
  function disegnaPannelloLayer() {
    const base = q('l-base');
    base.replaceChildren();
    const voceAttiva = motore.idBase ? voceDiBase(motore.idBase === IBRIDA_SENZA_OFFLINE.id ? 'ibrida' : motore.idBase) : null;
    for (const v of vociMappaBase()) {
      const attiva = voceAttiva === v.id;
      const scelta = el('label', 'bl-scelta' + (attiva ? ' attiva' : ''));
      const i = el('input');
      i.type = 'radio'; i.name = 'base-' + progetto; i.value = v.id; i.checked = attiva;
      i.onchange = () => applicaBase(v.id === VOCE_FOTO ? 'aerea' : v.id);
      const testi = el('span', 'testi');
      testi.append(el('span', 'titolo', v.nome), el('small', '', v.id === MAPPA_OFFLINE.id ? descrizioneOffline() : v.descrizione));
      const online = richiedeInternet(mappaBase(v.varianti[0]));
      scelta.append(i, testi, el('span', 'etichetta-stato ' + (online ? 'online' : 'offline'), online ? 'Internet' : 'Offline'));
      base.appendChild(scelta);
      if (v.id === VOCE_FOTO && attiva) {
        const ibrida = sceltaBase === 'ibrida';
        const sotto = voceLayer({
          titolo: 'Strade e nomi della carta sulla foto',
          nota: ibrida ? (sorgentePmtiles ? 'dalle mappe offline scaricate (OpenStreetMap)' : 'carta regionale 1:10.000 sopra la foto · con le mappe offline sono più leggeri')
            : 'spento: foto pulita · nomi, piste e sentieri restano accendibili qui sotto',
          disponibile: true, acceso: ibrida, cambia: (si) => applicaBase(si ? 'ibrida' : 'aerea'), id: 'l-foto-carta'
        });
        sotto.classList.add('bl-sotto-voce');
        base.appendChild(sotto);
      }
    }
    q('l-base-nota').textContent = 'Mappa, Terreno e Aerea / Ibrida richiedono Internet. Senza rete serve la mappa offline del territorio' + (sorgentePmtiles ? '.' : ' (non ancora scaricata).');
    if (rilievo) rilievo.disegna(q('l-rilievo'));
    if (leggibile) leggibile.disegna(q('l-leggibile'));
    q('h-leggibile').hidden = !leggibile;
    const bMappe = q('b-mappe-offline');
    bMappe.hidden = !cb.suMappeOffline;
    if (territorio) bMappe.textContent = 'Mappe offline · ' + territorio.nome;

    const terr = q('l-territorio');
    terr.replaceChildren();
    for (const meta of territorio ? territorio.manifesto.layers : []) {
      const st = statoLayer.get(meta.id);
      const errore = st && st.startsWith('errore');
      terr.appendChild(voceLayer({
        titolo: meta.titolo,
        nota: errore ? 'non caricato: ' + st.slice(8) : (meta.fonteBreve || '') + (meta.suRichiesta ? ' · si carica quando lo accendi' : ' · disponibile offline'),
        disponibile: !errore,
        acceso: motore.layerVoluto(meta.id),
        colore: meta.colore || (meta.categoria === 'confine' ? '#00b8d4' : null),
        cambia: (si) => accendiLayer(meta, si),
        id: 'lt-' + meta.id
      }));
    }
    if (funz.piste && territorio && territorio.manifesto.piste) disegnaPiste(terr);
    q('h-territorio').hidden = !terr.childElementCount;

    const box = q('l-dati');
    box.replaceChildren();
    q('h-dati').hidden = !(dati && (dati.overlay || []).length);
    if (dati && dati.titoloSezione) q('h-dati').textContent = dati.titoloSezione;
    for (const def of (dati && dati.overlay) || []) {
      const o = overlay.get(def.collezione);
      const attivo = !!(dati.fonte && dati.fonte.scope);
      box.appendChild(voceLayer({
        titolo: def.titolo || def.collezione,
        nota: !attivo ? 'accedi per vedere i dati' : o && o.errore ? 'non disponibile: ' + o.errore : (o ? o.punti.length : 0) + ' punti · ' + (def.nota || 'dati dell\'app'),
        disponibile: attivo && !(o && o.errore),
        acceso: !!(o && o.voluto && attivo),
        cambia: (si) => { if (o) { o.voluto = si; motore.mostraPunti(def.collezione, si); } },
        id: 'ld-' + def.collezione
      }));
    }
    if (strumenti) strumenti.disegna(q('l-strumenti'));
    q('h-strumenti').hidden = !strumenti;
    disegnaDtm(q('l-dtm'));
    q('l-nota').textContent = (territorio && territorio.manifesto.nota) || 'I layer cartografici sono strumenti di supporto. Le disposizioni vigenti vanno verificate sulle fonti ufficiali competenti.';
  }

  function disegnaPiste(box) {
    const acceso = prefPiste.acceso && !errorePiste;
    box.appendChild(voceLayer({
      titolo: 'Piste forestali, strade e sentieri (OSM)',
      nota: errorePiste ? 'non caricate: ' + errorePiste : territorio.nome + ' · © OpenStreetMap, ODbL · dato da verificare sul posto',
      disponibile: true, acceso, colore: COLORI_PISTE.pista, cambia: (si) => accendiPiste(si), id: 'lt-piste-osm'
    }));
    if (!acceso) return;
    const extra = el('div', 'bl-piste-extra');
    const filtri = el('div', 'bl-piste-filtri');
    filtri.setAttribute('role', 'radiogroup');
    filtri.setAttribute('aria-label', 'Quali percorsi mostrare');
    for (const [v, t] of [[FILTRO.TUTTI, 'Tutti'], [FILTRO.PISTE, 'Piste/strade'], [FILTRO.SENTIERI, 'Sentieri']]) {
      const l = el('label', 'bl-piste-filtro' + (prefPiste.filtro === v ? ' attiva' : ''));
      const i = el('input');
      i.type = 'radio'; i.name = 'piste-filtro-' + progetto; i.value = v; i.checked = prefPiste.filtro === v; i.id = 'lp-' + v;
      i.onchange = () => { prefPiste.filtro = v; prefs.setItem('piste-filtro', v); motore.impostaFiltroPiste(v); disegnaPannelloLayer(); };
      l.append(i, el('span', '', t));
      filtri.appendChild(l);
    }
    const leggibileAttivo = motore.stilePercorsi !== STILE_PERCORSI.DETTAGLIATO;
    const legenda = el('ul', 'bl-piste-legenda' + (leggibileAttivo ? ' leggibile' : ''));
    for (const [classe, testo] of [
      ...(leggibileAttivo ? [['principale', 'Strada principale / provinciale'], ['carrabile', 'Strada minore carrabile']] : [['carrabile', 'Strada carrabile']]),
      ['pista-buona', 'Pista forestale, fondo buono (tag)'], ['pista-media', 'Pista, fondo medio (tag)'], ['pista-precaria', 'Pista, fondo precario (tag)'],
      ['pista-ignota', 'Pista, qualità non indicata'], ['sentiero', 'Sentiero / percorso pedonale'], ['ristretta', 'Bordo magenta: mezzi a motore vietati/limitati secondo OSM']
    ]) {
      const li = el('li');
      li.append(el('span', 'bl-piste-campione ' + classe), el('span', '', testo));
      legenda.appendChild(li);
    }
    const nota = el('p', 'bl-nota', 'Tocca un percorso per la scheda. «Gippabile» non vuol dire transito consentito né passabile oggi: le norme locali prevalgono. Da zoom ' +
      ZOOM_MINIMO_PISTE + ' piste, sentieri e strade di collegamento; da zoom ' + ZOOM_DETTAGLIO_PISTE + ' anche vie dei paesi, marciapiedi e sbarre. Fuori dal ' + territorio.nome + ' il livello è vuoto.');
    extra.append(filtri, legenda, nota);
    box.appendChild(extra);
  }

  // ---- quota senza rete (pacchetto DTM del territorio, cache isolata con SHA-256)
  let statoDtm = null;
  function disegnaDtm(box) {
    box.replaceChildren();
    if (!dtm) return;
    const scaricato = statoDtm && statoDtm.presenti === statoDtm.totale && statoDtm.totale > 0;
    const riga = voceLayer({
      titolo: 'Quota senza rete · ' + territorio.nome,
      nota: dtm.scarico ? 'scaricamento ' + dtm.scarico.fatti + '/' + dtm.scarico.totale + '…'
        : statoDtm ? (scaricato ? 'sul telefono: quota e dislivello anche offline (DTM 25 m)' : statoDtm.presenti + '/' + statoDtm.totale + ' zone · ' + (statoDtm.byteTotale / 1048576).toFixed(1).replace('.', ',') + ' MB')
          : 'DTM 25 m Regione Piemonte (CC BY 4.0) · solo su richiesta',
      disponibile: true, acceso: !!scaricato,
      cambia: async (si) => {
        try {
          if (si) { await dtm.scarica(null, { avanzamento: () => disegnaDtm(box) }); avviso('Quota senza rete pronta.', 'info'); }
          else await dtm.elimina();
        } catch (e) { avviso('Quota senza rete: ' + e.message, 'errore'); }
        statoDtm = await dtm.stato().catch(() => null);
        disegnaDtm(box);
      },
      id: 'l-dtm-offline'
    });
    box.appendChild(riga);
  }

  // ---- comandi della colonna (comportamento di app.js)
  function impostaSegui(si) { segui = !!si; q('b-centra').setAttribute('aria-pressed', String(segui)); }
  q('b-zoom-piu').onclick = () => { impostaSegui(false); motore.zoomPiu(); };
  q('b-zoom-meno').onclick = () => { impostaSegui(false); motore.zoomMeno(); };
  q('b-centra').onclick = () => {
    if (!ultimaPosizione) { avviso('Posizione non ancora disponibile: attendi il segnale GPS.', 'info'); return; }
    motore.centra(ultimaPosizione.lat, ultimaPosizione.lon);
    impostaSegui(true);
  };
  q('b-layer').onclick = () => apriFoglio('f-layer');
  q('b-strumenti').onclick = () => { if (strumenti) strumenti.apriChiudiRapido(); };
  q('b-mappe-offline').onclick = () => { chiudiFogli(); if (cb.suMappeOffline) cb.suMappeOffline(); };
  q('b-segna').onclick = () => {
    if (cb.suSegnaPosizione) cb.suSegnaPosizione(ultimaPosizione ? { ...ultimaPosizione } : null, api);
    else avviso('Segna posizione: funzione non collegata dall\'app.', 'info');
  };
  for (const f of radice.querySelectorAll('.bl-foglio')) {
    f.addEventListener('click', (e) => { if (e.target === f && f.dataset.mc !== 'f-modulo') chiudiFogli(); });
  }
  for (const b of radice.querySelectorAll('[data-chiudi]')) b.onclick = () => chiudiFogli();
  motore.suGestoUtente(() => impostaSegui(false));
  if (cb.suPressioneLunga) motore.suPressioneLunga((p) => cb.suPressioneLunga(p, api));
  motore.suStatoBase = (stato, id) => { if (cb.suStatoBase) cb.suStatoBase(stato, id); };

  // ---- GPS: provider dell'app (browser, nativo, simulato), separato dal database
  let fermaGps = null;
  function aggiornaPosizione(fix) {
    if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lon)) { ultimaPosizione = null; motore.aggiornaIo(null); return; }
    ultimaPosizione = { lat: fix.lat, lon: fix.lon, acc: fix.acc, heading: fix.heading, t: fix.t || Date.now() };
    motore.aggiornaIo({ ...ultimaPosizione, stato: fix.stato || 'live' });
    if (segui) motore.segui(fix.lat, fix.lon);
    if (strumenti) strumenti.suPosizione();
  }
  if (config.gps) {
    const g = config.gps;
    // contratto LocationProvider di Adrenalina: start(suPosizione, suErrore, opzioni), stop()
    const suFix = (s) => aggiornaPosizione({ lat: s.lat, lon: s.lon, acc: s.accuracy, heading: s.heading, t: s.timestamp });
    const suErr = (e) => avviso('GPS: ' + ((e && (e.messaggio || e.message)) || e), 'errore');
    try { Promise.resolve(g.start(suFix, suErr, config.opzioniGps || {})).catch(suErr); } catch (e) { suErr(e); }
    fermaGps = () => { try { g.stop(); } catch { /* gia' fermo */ } };
  }

  // ---- avvio
  applicaBase(sceltaBase);
  if (leggibile) {
    leggibile.applicaStile();
    if (territorio && (fileNomi.toponimi || fileNomi.nomiRegione)) leggibile.avvia();
  }
  if (territorio) {
    for (const meta of territorio.manifesto.layers) {
      const salvato = prefs.getItem('layer:' + meta.id);
      const voluto = salvato === null ? !!meta.attivoDefault : salvato === '1';
      if (voluto || (confineMeta && meta.id === confineMeta.layer)) {
        await caricaLayer(meta);
        motore.mostraLayer(meta.id, voluto);
      }
    }
    // all'apertura si inquadra il CA del territorio, non tutti i confini del file (come Adrenalina adattaAComprensorio)
  }
  const inquadraIniziale = () => {
    if (!territorio || !confineMeta || territorio.manifesto.vista) return;
    if (!motore.adattaAFeature(confineMeta.layer, confineMeta.codice)) motore.adattaA(confineMeta.layer);
  };
  inquadraIniziale();
  if (territorio) {
    if (prefPiste.acceso && funz.piste && territorio.manifesto.piste) accendiPiste(true);
    if (dtm) dtm.stato().then((s) => { statoDtm = s; }, () => {});
  }
  if (dati && dati.fonte && dati.scope) {
    dati.fonte.impostaScope(dati.scope);
  }
  avviaOverlay();
  // SEGNA POSIZIONE sopra i crediti (altezza vera: vanno a capo, cambiano con la base) — come misuraPannello di app.js
  const misura = () => {
    const attrib = radice.querySelector('.leaflet-control-attribution');
    if (attrib) radice.style.setProperty('--attrib-h', attrib.offsetHeight + 'px');
    radice.style.setProperty('--mc-altezza', radice.clientHeight + 'px');
  };
  const osserva = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { misura(); motore.ridisegna(); }) : null;
  if (osserva) { osserva.observe(radice); const a = radice.querySelector('.leaflet-control-attribution'); if (a) osserva.observe(a); }
  // il contenitore puo' avere l'altezza vera solo dopo il primo layout (React, flex): si riquadra allora
  setTimeout(() => { misura(); motore.ridisegna(); inquadraIniziale(); }, 0);

  const api = {
    motore,
    radice,
    territorio,
    apriLayer: () => apriFoglio('f-layer'),
    chiudiFogli,
    avviso,
    aggiornaPosizione,
    posizione: () => (ultimaPosizione ? { ...ultimaPosizione } : null),
    /** Cambio di ente/utente deciso dall'app: chiude gli ascolti del vecchio scope e riparte col nuovo. */
    impostaScope(scope) {
      if (!dati || !dati.fonte) throw new Error('nessuna fonte dati configurata');
      dati.fonte.impostaScope(scope);
      avviaOverlay();
      vista.disegnaSceltaBase();
    },
    /** Logout: nessun ascolto, nessun punto dell'utente precedente sulla mappa. */
    logout() {
      if (dati && dati.fonte) dati.fonte.chiudi();
      for (const o of overlay.values()) { o.stop = null; o.punti = []; motore.svuotaPunti(o.def.collezione); }
      vista.disegnaSceltaBase();
    },
    statoDati: () => ({ ascoltiAttivi: dati && dati.fonte ? dati.fonte.ascoltiAttivi() : 0, errore: erroreDati ? erroreDati.message : null, overlay: [...overlay.entries()].map(([k, o]) => ({ collezione: k, punti: o.punti.length, errore: o.errore })) }),
    indietro() {
      if (!q('f-modulo').hidden) return true;
      if ([...radice.querySelectorAll('.bl-foglio')].some((f) => !f.hidden)) { chiudiFogli(); return true; }
      if (!q('pannello-strumenti').hidden) { strumenti.chiudiRapido(); return true; }
      return motore.chiudiScheda();
    },
    distruggi() {
      if (fermaGps) fermaGps();
      if (osserva) osserva.disconnect();
      for (const o of overlay.values()) if (o.stop) o.stop();
      if (dati && dati.fonte && dati.chiudiAllaDistruzione !== false) dati.fonte.fermaAscolti();
      motore.distruggi();
      radice.remove();
    }
  };
  return api;
}
