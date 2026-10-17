// ORIGINE: Adrenalina battuta-live/js/rilievoUi.js (commit c6586b6636, SHA-256 fonte 16dc37ec274ddb38…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: voci Rilievo ombreggiato / Curve di livello del foglio Layer.
// Adattamenti dichiarati: confine dal pacchetto territoriale (codiceConfine, nomeConfine) invece del CA VCO1 fisso.
// Sostituzioni: 5 (elenco in strumenti/importa-da-fonti.mjs).
// RILIEVO E CURVE SOPRA LA MAPPA BASE — voci del pannello Layer (fase 2 VCO1).
//
// Due caselle sotto la scelta della mappa base, SPENTE di default, scelta
// ricordata sul telefono. Le tile si chiedono solo nel CA VCO1 (confine
// ufficiale) e mai sulla base Terreno (le ha gia') o sulla mappa offline.
// Dettagli, fonti e licenze: shared/rilievo.js.

import { SOVRAPPOSIZIONI, CHIAVE_RILIEVO, leggiPreferenzaRilievo, motivoEsclusione, anelliDelCa, riquadroToccaAnelli } from './rilievo.js';

export class GestioneRilievo {
  /** @param {object} vista VistaBattuta (mappa, voceLayer, avviso) */
  constructor(vista, { archivio = globalThis.localStorage, codiceConfine = null, nomeConfine = 'territorio' } = {}) {
    this.codiceConfine = codiceConfine;
    this.nomeConfine = nomeConfine;
    this.vista = vista;
    this.archivio = archivio;
    this.pref = leggiPreferenzaRilievo(archivio);
    this.anelli = [];
    this.filtro = (r) => riquadroToccaAnelli(r, this.anelli);
  }

  salva() {
    try { this.archivio.setItem(CHIAVE_RILIEVO, JSON.stringify(this.pref)); } catch { /* storage pieno o assente */ }
  }

  /** Confine del CA VCO1 dai comprensori ufficiali: senza confine il rilievo non si accende. */
  impostaConfine(collezione) {
    this.anelli = anelliDelCa(collezione, this.codiceConfine);
    this.applica();
  }

  /** Mostra/nasconde secondo scelta, base corrente e rete. Chiamato a ogni cambio base. */
  applica() {
    const m = this.vista.mappa;
    if (!m || !m.mostraRilievo) return;
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    for (const def of SOVRAPPOSIZIONI) {
      const si = this.pref[def.id] && !motivoEsclusione(m.idBase) && online && this.anelli.length > 0;
      m.mostraRilievo(def, si, { filtroArea: this.filtro });
    }
  }

  cambia(id, si) {
    this.pref = { ...this.pref, [id]: !!si };
    this.salva();
    this.applica();
    const m = this.vista.mappa;
    const motivo = m && motivoEsclusione(m.idBase);
    if (si && motivo) this.vista.avviso(SOVRAPPOSIZIONI.find((d) => d.id === id).titolo + ': ' + motivo + '.', 'info');
    else if (si && id === 'curve' && m && m.map.getZoom() < 14) this.vista.avviso('Curve di livello: compaiono avvicinando la mappa (zoom 14 e oltre).', 'info');
  }

  disegna(box) {
    if (!box) return;
    box.replaceChildren();
    const m = this.vista.mappa;
    const motivo = m ? motivoEsclusione(m.idBase) : null;
    for (const def of SOVRAPPOSIZIONI) {
      const disponibile = this.anelli.length > 0;
      box.appendChild(this.vista.voceLayer({
        titolo: def.titolo,
        nota: !disponibile ? 'confine del ' + this.nomeConfine + ' non ancora caricato'
          : (motivo ? 'ora non si vede: ' + motivo : def.nota) + ' · solo ' + this.nomeConfine + ', serve Internet · ' + def.fonte,
        disponibile,
        acceso: this.pref[def.id],
        cambia: (si) => this.cambia(def.id, si),
        id: 'lr-' + def.id
      }));
    }
  }
}
