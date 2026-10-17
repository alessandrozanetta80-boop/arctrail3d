// ORIGINE: Adrenalina battuta-live/js/mappaLeggibileUi.js (commit c6586b6636, SHA-256 fonte 8a5e7d7b522d406a…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: Nomi di paesi, alpeggi e cime + Stile percorsi Leggibile/Dettagliato.
// Adattamenti dichiarati: file dei nomi dal pacchetto territoriale (opzione file) invece dei percorsi fissi del VCO.
// Sostituzioni: 4 (elenco in strumenti/importa-da-fonti.mjs).
// MAPPA LEGGIBILE — voci nel pannello Layer (14/10/2026).
//
// Due scelte sotto la mappa base, nel pannello Layer gia' esistente (niente
// pulsanti nuovi sul bordo della mappa), ricordate SOLO sul telefono
// (localStorage, nessuna scrittura Firestore):
//   - «Nomi di paesi, alpeggi e cime»: ACCESO di default. Nomi e quote veri
//     di OpenStreetMap (data/toponimi-osm/, file dentro l'app: funziona anche
//     senza rete, nella PWA e' nel precache del service worker).
//   - «Stile percorsi»: «Leggibile» (predefinito dalla 0.23.34) oppure
//     «Dettagliato» = lo stile v66 com'era, a due tocchi (LAYER -> Dettagliato).
// Dettagli e fonti: shared/toponimi.js, shared/pisteOsm.js.
// Su Mappa, Terreno e Ibrida-carta i nomi che la carta regionale stampa gia'
// non si ripetono (data/toponimi-regione/, BDTRE Toponimi: shared/nomiCarta.js).

import { leggiToponimi, ATTRIBUZIONE_NOMI } from './toponimi.js';
import { leggiNomiRegione } from './nomiCarta.js';
import { STILE_PERCORSI, stilePercorsiValido } from './pisteOsm.js';

export const CHIAVE_MAPPA_LEGGIBILE = 'battuta-live-mappa-leggibile';
export const FILE_TOPONIMI = 'data/toponimi-osm/toponimi-vco.json';
export const FILE_NOMI_REGIONE = 'data/toponimi-regione/toponimi-bdtre-vco.json';

function el(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
}

/** Preferenza salvata: {nomi, stile}. Assente o rovinata: nomi accesi, stile «Leggibile». */
export function leggiPreferenzaLeggibile(archivio) {
  try {
    const v = JSON.parse(archivio.getItem(CHIAVE_MAPPA_LEGGIBILE) || 'null');
    return { nomi: !(v && v.nomi === false), stile: stilePercorsiValido(v && v.stile) };
  } catch {
    return { nomi: true, stile: stilePercorsiValido(null) };
  }
}

export class GestioneMappaLeggibile {
  /**
   * @param {object} vista  VistaBattuta (mappa, voceLayer, avviso, disegnaSceltaBase)
   * @param {{archivio?: Storage, fetchImpl?: Function}} opz
   */
  constructor(vista, { archivio = globalThis.localStorage, fetchImpl = (u) => fetch(u), file = { toponimi: FILE_TOPONIMI, nomiRegione: FILE_NOMI_REGIONE } } = {}) {
    this.file = file || {};
    this.vista = vista;
    this.archivio = archivio;
    this.fetch = fetchImpl;
    this.pref = leggiPreferenzaLeggibile(archivio);
    this.punti = null;
    this.errore = null;
    this.erroreRegione = null;
  }

  salva() {
    try { this.archivio.setItem(CHIAVE_MAPPA_LEGGIBILE, JSON.stringify(this.pref)); } catch { /* storage pieno o assente */ }
  }

  /** Subito dopo la creazione della mappa: lo stile vale gia' per le prime linee disegnate. */
  applicaStile() {
    const m = this.vista.mappa;
    if (m && m.impostaStilePercorsi) m.impostaStilePercorsi(this.pref.stile);
  }

  /** Carica il file dei nomi (dentro l'app) e lo mette sulla mappa. Un errore non ferma nulla. */
  async avvia() {
    this.applicaStile();
    // prima i nomi della carta regionale: cosi' i nostri non compaiono neanche un attimo in doppio
    try {
      if (!this.file.nomiRegione) throw new Error('nessun file dei nomi regionali nel pacchetto');
      const r = await this.fetch(this.file.nomiRegione);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (this.vista.mappa.impostaNomiRegione) this.vista.mappa.impostaNomiRegione(leggiNomiRegione(await r.text()));
      this.erroreRegione = null;
    } catch (e) {
      this.erroreRegione = e.message;
    }
    try {
      if (!this.file.toponimi) throw new Error('nessun file dei nomi nel pacchetto');
      const r = await this.fetch(this.file.toponimi);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { punti } = leggiToponimi(await r.text());
      this.punti = punti;
      this.errore = null;
      this.vista.mappa.impostaToponimi(punti);
      this.vista.mappa.mostraToponimi(this.pref.nomi);
    } catch (e) {
      this.errore = e.message;
    }
    this.vista.disegnaSceltaBase();
    return !this.errore;
  }

  cambiaNomi(si) {
    this.pref = { ...this.pref, nomi: !!si };
    this.salva();
    if (this.punti) this.vista.mappa.mostraToponimi(this.pref.nomi);
    this.vista.disegnaSceltaBase();
  }

  cambiaStile(stile) {
    this.pref = { ...this.pref, stile: stilePercorsiValido(stile) };
    this.salva();
    this.applicaStile();
    this.vista.disegnaSceltaBase();
  }

  disegna(box) {
    if (!box) return;
    box.replaceChildren();
    const m = this.vista.mappa;
    const carta = !!(m && m.nomiCartaBase);
    box.appendChild(this.vista.voceLayer({
      titolo: 'Nomi di paesi, alpeggi e cime',
      nota: this.errore ? 'non caricati: ' + this.errore
        : (carta && !this.erroreRegione ? 'su questa carta solo i nomi che la Regione non scrive già · '
          : 'paesi e frazioni, alpeggi e località, cime con la quota (m s.l.m.) · ') + 'anche senza rete · ' +
          ATTRIBUZIONE_NOMI.replace('Nomi e quote ', ''),
      disponibile: !this.errore,
      acceso: this.pref.nomi && !this.errore,
      cambia: (si) => this.cambiaNomi(si),
      id: 'll-nomi'
    }));
    const riga = el('div', 'bl-stile-percorsi');
    const titolo = el('span', 'bl-stile-titolo', 'Stile percorsi');
    titolo.id = 'll-stile-titolo';
    const gruppo = el('div', 'bl-piste-filtri');
    gruppo.setAttribute('role', 'radiogroup');
    gruppo.setAttribute('aria-labelledby', titolo.id);
    for (const [v, t] of [[STILE_PERCORSI.LEGGIBILE, 'Leggibile'], [STILE_PERCORSI.DETTAGLIATO, 'Dettagliato']]) {
      const l = el('label', 'bl-piste-filtro' + (this.pref.stile === v ? ' attiva' : ''));
      const i = el('input');
      i.type = 'radio'; i.name = 'stile-percorsi'; i.value = v; i.checked = this.pref.stile === v; i.id = 'll-stile-' + v;
      i.onchange = () => this.cambiaStile(v);
      l.append(i, el('span', '', t));
      gruppo.appendChild(l);
    }
    const nota = el('small', 'bl-nota', this.pref.stile === STILE_PERCORSI.LEGGIBILE
      ? 'Linee più sottili e tenui, Terreno e rilievo più chiari: stessi percorsi, nessuno tolto.'
      : 'Linee spesse e piene come nella versione 0.23.33.');
    riga.append(titolo, gruppo, nota);
    box.appendChild(riga);
  }
}
