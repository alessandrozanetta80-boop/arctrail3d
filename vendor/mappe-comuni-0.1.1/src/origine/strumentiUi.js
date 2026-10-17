// ORIGINE: Adrenalina battuta-live/js/strumentiUi.js (commit c6586b6636, SHA-256 fonte 87c1d278289a308e…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: STRUMENTI: distanze, misura, dislivello, quota, vai al punto, vento.
// Adattamenti dichiarati: gli elementi si cercano dentro la mappa che li possiede (vista.el) e non in tutto il documento: piu' mappe per pagina.
// Sostituzioni: 3 (elenco in strumenti/importa-da-fonti.mjs).
// STRUMENTI DELLA MAPPA (0.18.0) — Distanze, Misura distanza, Vento.
//
// Stanno nel pannello Layer e (0.18.1) nel mini pannello del pulsante
// STRUMENTI sulla colonna destra, cosi' si trovano sul campo. Tutto spento
// all'avvio. Distanze e misura sono calcoli locali (funzionano offline).
// Il vento si chiede SOLO quando l'utente apre "Vento", con coordinate
// arrotondate a ~1 km; il dato resta sul telefono, mai nei dati squadra.
//
// VCO1 MAPPE PRO (13/10/2026):
//   - Misura distanza su PIU' punti: ogni tocco aggiunge un vertice; si
//     legge la lunghezza lungo la linea e la linea d'aria; «Annulla ultimo».
//   - Dislivello del tratto e Quota di un punto dal DTM 5 m della Regione
//     Piemonte (shared/terreno.js): SOLO su richiesta e con rete, mai valori
//     inventati; fonte, griglia e precisione sempre scritte.
//   - Vai al punto: distanza e direzione dal GPS verso un punto della misura
//     o una postazione, aggiornate a ogni fix. Linea d'aria, non navigazione.
//
// FASE 2 (13/10/2026):
//   - Profilo altimetrico GRAFICO sotto il dislivello, chiuso di default
//     («Profilo altimetrico» da aprire): compare solo con un profilo completo
//     e usa gli stessi campioni del dislivello (shared/profiloGrafico.js).

import { raggiDistanze, etichettaRaggio, NOTA_DISTANZE, misura, misuraSpezzata, versoPunto, NOTA_VAI, Vento, testoVento, SETTORI_16 } from './strumentiMappa.js';
import { ServizioTerreno, testoQuota, righeDislivello, NOTA_DTM } from './terreno.js';
import { NOTA_DTM25 } from './dtmOffline.js';
import { geometriaProfilo, descrizioneProfilo, AREA_GRAFICO } from './profiloGrafico.js';


function el(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
}

export class StrumentiMappa {
  constructor(vista, { vento = new Vento(), terreno = new ServizioTerreno() } = {}) {
    this.vista = vista;
    this.vento = vento;
    this.terreno = terreno;
    this.punti = [];             // vertici della misura (oltre alla mia posizione)
    this.dislivello = null;      // righe del dislivello calcolato per i punti correnti
    this.profiloTratto = null;   // profilo completo (con i campioni) dei punti correnti
    this.profiloAperto = false;  // il grafico resta come l'ha lasciato l'utente fra un fix e l'altro
    this.meta = null;            // { lat, lon, nome } di «Vai al punto»
    this.aspettaQuota = null;    // modalita' Quota attiva
    this.distanze = false;
    this.bersaglio = null;       // punto della misura
    this.fineTocchi = null;      // modalita' misura attiva
    this.aperto = null;          // 'misura' | 'vento' | 'quota' | 'vai' | null
  }

  online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }

  posizione() { return this.vista.posizioneMostrata(); }

  /** Voci degli strumenti: nel pannello Layer (id base) e nel mini pannello STRUMENTI (suffisso '-rapido'). */
  disegna(box, suffisso = '') {
    if (!box) return;
    box.replaceChildren();
    box.appendChild(this.vista.voceLayer({
      titolo: 'Distanze', nota: 'cerchi bianchi tratteggiati attorno a te · ' + NOTA_DISTANZE,
      disponibile: true, acceso: this.distanze, cambia: (si) => { this.impostaDistanze(si); this.ridisegnaRapido(); }, id: 'ls-distanze' + suffisso
    }));
    const azioni = el('div', 'bl-pila bl-strumenti-azioni');
    const b1 = el('button', 'bl-btn', 'Misura distanza');
    b1.type = 'button'; b1.id = 'b-misura' + suffisso;
    b1.onclick = () => { this.vista.chiudiFogli(); this.chiudiRapido(); this.avviaMisura(); };
    const b2 = el('button', 'bl-btn', 'Vento');
    b2.type = 'button'; b2.id = 'b-vento' + suffisso;
    b2.onclick = () => { this.vista.chiudiFogli(); this.chiudiRapido(); this.apriVento(); };
    const b3 = el('button', 'bl-btn', 'Quota di un punto');
    b3.type = 'button'; b3.id = 'b-quota' + suffisso;
    b3.onclick = () => { this.vista.chiudiFogli(); this.chiudiRapido(); this.avviaQuota(); };
    azioni.append(b1, b2, b3);
    box.appendChild(azioni);
  }

  // ------------------------------------------------------------ mini pannello STRUMENTI (0.18.1)
  apriChiudiRapido() {
    const box = this.vista.el('pannello-strumenti');
    if (!box) return;
    if (!box.hidden) { this.chiudiRapido(); return; }
    this.vista.chiudiFogli();
    this.disegna(box, '-rapido');
    box.hidden = false;
    const b = this.vista.el('b-strumenti');
    if (b) b.setAttribute('aria-expanded', 'true');
  }

  chiudiRapido() {
    const box = this.vista.el('pannello-strumenti');
    if (box) box.hidden = true;
    const b = this.vista.el('b-strumenti');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  ridisegnaRapido() {
    const box = this.vista.el('pannello-strumenti');
    if (box && !box.hidden) this.disegna(box, '-rapido');
  }

  // ------------------------------------------------------------ distanze
  impostaDistanze(si) {
    this.distanze = !!si;
    this.aggiornaDistanze();
    if (this.distanze && !this.posizione()) this.vista.avviso('Distanze: i cerchi compaiono attorno a te appena è disponibile la posizione GPS.', 'info');
  }

  aggiornaDistanze() {
    const m = this.vista.mappa;
    if (!m) return;
    const p = this.posizione();
    if (this.distanze && p) m.mostraAnelli(p, raggiDistanze, etichettaRaggio);
    else m.nascondiAnelli();
  }

  /** Chiamato a ogni nuovo fix mostrato: sposta cerchi e linea, non ricrea la mappa. */
  suPosizione() {
    if (this.distanze) this.aggiornaDistanze();
    if (this.punti.length) this.aggiornaMisura();
    if (this.meta) this.aggiornaVai();
  }

  // ------------------------------------------------------------ riquadro sulla mappa
  riquadro(righe, pulsanti) {
    const box = this.vista.el('bl-strumento');
    if (!box) return;
    box.replaceChildren(...righe.map((r) => (typeof r === 'string' ? el('p', '', r) : r)));
    const az = el('div', 'bl-strumento-azioni');
    for (const [testo, fn, id] of pulsanti) {
      // «Chiudi» e' una X nell'angolo (tocco 44x44): sui telefoni piccoli il
      // riquadro resta basso e lascia libera la mappa da toccare
      const chiudi = testo === 'Chiudi';
      const b = el('button', chiudi ? 'bl-strumento-x' : 'bl-btn bl-btn-tenue', chiudi ? '×' : testo);
      b.type = 'button';
      if (chiudi) b.setAttribute('aria-label', 'Chiudi');
      if (id) b.id = id;
      b.onclick = fn;
      if (chiudi) box.prepend(b); else az.appendChild(b);
    }
    if (az.childElementCount) box.appendChild(az);
    box.hidden = false;
  }

  chiudiRiquadro() {
    const box = this.vista.el('bl-strumento');
    if (box) { box.hidden = true; box.replaceChildren(); }
    this.aperto = null;
  }

  // ------------------------------------------------------------ misura distanza (piu' punti)
  avviaMisura() {
    this.chiudiVento(); this.chiudiQuota(); this.chiudiVai();
    this.aperto = 'misura';
    if (!this.fineTocchi) this.fineTocchi = this.vista.mappa.suTocchi((q) => { this.aggiungiPunto(q); });
    this.punti = [];
    this.bersaglio = null;
    this.dislivello = null;
    this.profiloTratto = null;
    this.profiloAperto = false;
    this.riquadro(['Misura distanza: tocca uno o più punti sulla mappa (dalla tua posizione GPS, o dal primo punto se il GPS è spento).'],
      [['Chiudi', () => this.chiudiMisura(), 'b-misura-chiudi']]);
  }

  aggiungiPunto(q) {
    this.punti = [...this.punti, q];
    this.bersaglio = q;
    this.dislivello = null;
    this.profiloTratto = null;
    this.aggiornaMisura();
  }

  annullaUltimo() {
    this.punti = this.punti.slice(0, -1);
    this.bersaglio = this.punti[this.punti.length - 1] || null;
    this.dislivello = null;
    this.profiloTratto = null;
    if (this.punti.length) this.aggiornaMisura();
    else { this.vista.mappa.nascondiMisura(); this.avviaMisura(); }
  }

  aggiornaMisura() {
    if (!this.punti.length) return;
    const p = this.posizione();
    const r = misuraSpezzata(p, this.punti);
    const chiudi = ['Chiudi', () => this.chiudiMisura(), 'b-misura-chiudi'];
    const annulla = ['Annulla ultimo', () => this.annullaUltimo(), 'b-misura-annulla'];
    if (!r) {
      // un solo punto e niente GPS: si aspetta il secondo punto
      this.vista.mappa.mostraMisura(null, this.punti);
      this.riquadro(['Posizione GPS non disponibile: tocca un altro punto per misurare dal primo.'], [annulla, chiudi]);
      return;
    }
    this.vista.mappa.mostraMisura(p, this.punti);
    const testo = el('p', 'bl-misura-valore', r.tratti === 1 && p ? misura(p, this.punti[0]).testo : r.testo);
    testo.id = 'misura-valore';
    const righe = [testo];
    if (r.tratti > 1) {
      const aria = el('p', '', 'Lungo la linea disegnata (' + r.tratti + ' tratti) · in linea d\'aria ' + r.testoAria);
      aria.id = 'misura-aria';
      righe.push(aria);
    }
    righe.push(r.gps + ' · ' + (r.tratti > 1 ? 'sulla linea disegnata, non sul sentiero.' : 'linea d\'aria · tocca altri punti per allungare.'));
    if (this.dislivello) {
      const box = el('div', 'bl-misura-dislivello');
      box.id = 'misura-dislivello';
      box.append(...this.dislivello.map((t) => el('p', '', t)));
      righe.push(box);
      const grafico = this.graficoProfilo(this.profiloTratto);
      if (grafico) righe.push(grafico);
    }
    const pulsanti = [annulla];
    if (!this.dislivello) pulsanti.push(['Dislivello', () => this.calcolaDislivello(), 'b-misura-dislivello']);
    pulsanti.push(['Vai qui', () => this.vaiA({ ...this.punti[this.punti.length - 1], nome: 'punto della misura' }), 'b-misura-vai'], chiudi);
    this.riquadro(righe, pulsanti);
  }

  async calcolaDislivello() {
    const r = misuraSpezzata(this.posizione(), this.punti);
    if (!r) return;
    const chiave = this.punti;
    this.dislivello = ['Dislivello: richiesta al servizio della Regione Piemonte…'];
    this.aggiornaMisura();
    const esito = await this.terreno.dislivello(r.punti, { online: this.online() });
    // nel frattempo la misura e' cambiata o chiusa: il risultato non vale piu'
    if (this.aperto !== 'misura' || this.punti !== chiave || !this.dislivello) return;
    this.profiloTratto = esito.profilo && esito.profilo.completo ? esito.profilo : null;
    this.dislivello = esito.profilo
      ? [...righeDislivello(esito.profilo), ...(r.daGps ? ['Inizio = tua posizione (' + r.gps + ').'] : []),
        ...(esito.fonte === 'dtm25' ? ['Senza rete: quote dal DTM 25 m scaricato sul telefono.', NOTA_DTM25] : [NOTA_DTM])]
      : ['Dislivello non disponibile: ' + esito.motivo + '. Nessun valore stimato.'];
    this.aggiornaMisura();
  }

  /** Grafico quota/distanza, chiuso di default; null senza profilo completo (mai dati inferiti). */
  graficoProfilo(pr) {
    const g = pr && pr.completo ? geometriaProfilo(pr.serie) : null;
    if (!g) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const nodo = (tag, attr, testo) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attr)) n.setAttribute(k, String(v));
      if (testo !== undefined) n.textContent = testo;
      return n;
    };
    const det = el('details', 'bl-profilo');
    det.id = 'misura-profilo';
    det.open = this.profiloAperto;
    det.addEventListener('toggle', () => { this.profiloAperto = det.open; });
    const a = AREA_GRAFICO;
    const svg = nodo('svg', { viewBox: '0 0 ' + a.larghezza + ' ' + a.altezza, role: 'img', 'aria-label': descrizioneProfilo(pr), focusable: 'false' });
    svg.append(
      nodo('title', {}, descrizioneProfilo(pr)),
      nodo('line', { x1: a.sinistra, x2: g.xFine, y1: g.yMax, y2: g.yMax, class: 'bl-profilo-guida' }),
      nodo('line', { x1: a.sinistra, x2: g.xFine, y1: g.yMin, y2: g.yMin, class: 'bl-profilo-guida' }),
      nodo('path', { d: g.riempimento, class: 'bl-profilo-area' }),
      nodo('path', { d: g.linea, class: 'bl-profilo-linea' }),
      nodo('line', { x1: a.sinistra, x2: g.xFine, y1: g.fondo, y2: g.fondo, class: 'bl-profilo-asse' }),
      nodo('text', { x: a.sinistra - 3, y: g.yMax + 4, 'text-anchor': 'end' }, g.testoMax),
      nodo('text', { x: a.sinistra - 3, y: g.yMin + 4, 'text-anchor': 'end' }, g.testoMin),
      nodo('text', { x: a.sinistra, y: a.altezza - 4, 'text-anchor': 'start' }, '0'),
      nodo('text', { x: g.xFine, y: a.altezza - 4, 'text-anchor': 'end' }, g.testoDistanza)
    );
    const sintesi = el('summary', '', 'Profilo altimetrico');
    det.append(sintesi, svg, el('p', 'bl-profilo-nota', 'Quota in m s.l.m. lungo la linea (stessi ' + pr.campioni + ' campioni del dislivello, ogni ' + Math.round(pr.passoM) + ' m).'));
    return det;
  }

  chiudiMisura() {
    if (this.fineTocchi) { this.fineTocchi(); this.fineTocchi = null; }
    this.bersaglio = null;
    this.punti = [];
    this.dislivello = null;
    this.profiloTratto = null;
    if (this.vista.mappa && !this.meta) this.vista.mappa.nascondiMisura();
    if (this.aperto === 'misura') this.chiudiRiquadro();
  }

  // ------------------------------------------------------------ quota di un punto
  avviaQuota() {
    this.chiudiVento(); this.chiudiMisura(); this.chiudiVai();
    this.aperto = 'quota';
    if (!this.aspettaQuota) this.aspettaQuota = this.vista.mappa.suTocchi((q) => this.mostraQuota(q));
    this.riquadro(['Quota: tocca un punto sulla mappa. Con la rete: DTM 5 m della Regione Piemonte; senza rete solo se hai scaricato «Quota senza rete» (Layer).'],
      [['Chiudi', () => this.chiudiQuota(), 'b-quota-chiudi']]);
  }

  async mostraQuota(q) {
    this.puntoQuota = q;
    this.vista.mappa.mostraMisura(null, [q]);
    this.riquadro(['Quota: richiesta…'], [['Chiudi', () => this.chiudiQuota(), 'b-quota-chiudi']]);
    const r = await this.terreno.quota(q, { online: this.online() });
    if (this.aperto !== 'quota' || this.puntoQuota !== q) return;
    const t = el('p', 'bl-misura-valore', r.quota === null ? 'Quota non disponibile' : testoQuota(r.quota) + (r.fonte === 'dtm25' ? ' (offline, 25 m)' : ''));
    t.id = 'quota-valore';
    this.riquadro([t, r.quota === null ? r.motivo + '. Nessun valore stimato.' : r.fonte === 'dtm25' ? NOTA_DTM25 : NOTA_DTM, 'Tocca un altro punto per un\'altra quota.'],
      [['Chiudi', () => this.chiudiQuota(), 'b-quota-chiudi']]);
  }

  chiudiQuota() {
    if (this.aspettaQuota) { this.aspettaQuota(); this.aspettaQuota = null; }
    this.puntoQuota = null;
    if (this.aperto === 'quota') {
      if (this.vista.mappa && !this.meta) this.vista.mappa.nascondiMisura();
      this.chiudiRiquadro();
    }
  }

  // ------------------------------------------------------------ vai al punto
  /** Distanza e direzione dal GPS verso un punto (della misura o una postazione). Nessuna scrittura. */
  vaiA(meta) {
    if (!meta || !Number.isFinite(meta.lat) || !Number.isFinite(meta.lon)) return;
    this.chiudiVento(); this.chiudiQuota();
    this.meta = { lat: meta.lat, lon: meta.lon, nome: String(meta.nome || 'punto').slice(0, 60) };
    this.metaArrivato = false;
    if (this.aperto === 'misura') this.chiudiMisura();
    this.aperto = 'vai';
    this.aggiornaVai();
  }

  aggiornaVai() {
    if (!this.meta) return;
    const p = this.posizione();
    const chiudi = [['Chiudi', () => this.chiudiVai(), 'b-vai-chiudi']];
    if (!p) {
      this.vista.mappa.mostraMisura(null, [this.meta]);
      this.riquadro(['Vai a ' + this.meta.nome + ': accendi la posizione GPS per avere distanza e direzione.', NOTA_VAI], chiudi);
      return;
    }
    const r = versoPunto(p, this.meta, { ora: Date.now(), giaArrivato: this.metaArrivato });
    this.metaArrivato = r.arrivato;
    this.vista.mappa.mostraMisura(p, [this.meta]);
    const riga = el('p', 'bl-vento-riga');
    if (r.arrivato) {
      const t = el('span', 'bl-misura-valore', 'Sei arrivato (entro l\'errore del GPS)');
      t.id = 'vai-valore';
      riga.append(t);
    } else if (r.entroErrore) {
      // GPS troppo impreciso per dire «arrivato» e per dare una direzione
      const t = el('span', 'bl-misura-valore', 'Vicino, entro l\'errore del GPS');
      t.id = 'vai-valore';
      riga.append(t);
    } else {
      // freccia sulla mappa (nord in alto): punta verso il punto, non dipende dalla bussola
      const f = el('span', 'bl-vento-freccia', '↑');
      f.style.transform = 'rotate(' + r.gradi + 'deg)';
      f.setAttribute('aria-hidden', 'true');
      const t = el('span', 'bl-misura-valore', r.testo + ' verso ' + r.settore + ' (' + r.gradi + '°)');
      t.id = 'vai-valore';
      riga.append(f, t);
    }
    const avvisi = [];
    if (r.fermo) avvisi.push('Posizione di ' + r.etaS + ' s fa: distanza e direzione non aggiornate.');
    if (r.impreciso) avvisi.push('GPS impreciso (' + r.gps + '): l\'arrivo non si può confermare, aspetta un segnale migliore.');
    else if (r.direzioneIncerta) avvisi.push('Direzione incerta: sei a meno di due volte l\'errore del GPS.');
    const avviso = avvisi.length ? el('p', 'bl-vai-avviso', avvisi.join(' ')) : null;
    if (avviso) avviso.id = 'vai-avviso';
    this.riquadro([el('p', '', 'Vai a ' + this.meta.nome), riga, ...(avviso ? [avviso] : []), r.gps + ' · direzione rispetto al nord (in alto sulla mappa). ' + NOTA_VAI], chiudi);
  }

  chiudiVai() {
    if (!this.meta) return;
    this.meta = null;
    this.metaArrivato = false;
    if (this.vista.mappa) this.vista.mappa.nascondiMisura();
    if (this.aperto === 'vai') this.chiudiRiquadro();
  }

  // ------------------------------------------------------------ vento
  async apriVento() {
    this.chiudiMisura(); this.chiudiQuota(); this.chiudiVai();
    this.aperto = 'vento';
    this.riquadro(['Vento: richiesta della stima meteo…'], [['Chiudi', () => this.chiudiVento(), 'b-vento-chiudi']]);
    const v = await this.vento.chiedi(this.posizione(), { online: navigator.onLine !== false });
    if (this.aperto !== 'vento') return;
    this.mostraVento(v);
  }

  mostraVento(v) {
    const righe = [];
    if (Number.isFinite(v.gradi)) {
      // la freccia punta DOVE VA il vento (provenienza + 180°)
      const f = el('span', 'bl-vento-freccia', '↑');
      f.style.transform = 'rotate(' + ((v.gradi + 180) % 360) + 'deg)';
      f.setAttribute('aria-hidden', 'true');
      const riga = el('p', 'bl-vento-riga');
      const t = el('span', '', testoVento(v));
      t.id = 'vento-testo';
      riga.append(f, t);
      righe.push(riga);
    } else {
      const t = el('p', '', testoVento(v));
      t.id = 'vento-testo';
      righe.push(t);
    }
    const pulsanti = [['Imposta manualmente', () => this.ventoManuale(), 'b-vento-manuale']];
    if (this.vento.manuale) pulsanti.push(['Azzera manuale', () => { this.vento.azzeraManuale(); this.apriVento(); }, 'b-vento-azzera']);
    pulsanti.push(['Chiudi', () => this.chiudiVento(), 'b-vento-chiudi']);
    this.riquadro(righe, pulsanti);
  }

  async ventoManuale() {
    const valori = await this.vista.modulo({
      titolo: 'Vento impostato a mano',
      righe: ['Vale solo per questa sessione e prevale sulla stima meteo finché non lo azzeri.'],
      campi: [
        { id: 'settore', etichetta: 'Da dove viene', valore: 'N', opzioni: SETTORI_16.map((s) => ({ valore: s, testo: s })) },
        { id: 'kmh', etichetta: 'Velocità km/h (facoltativa)', valore: '', max: 3 }
      ],
      si: 'Imposta'
    });
    if (valori) {
      const kmh = String(valori.kmh || '').trim() === '' ? null : Number(String(valori.kmh).replace(',', '.'));
      this.vento.impostaManuale(valori.settore, Number.isFinite(kmh) ? kmh : null);
    }
    await this.apriVento();
  }

  chiudiVento() {
    if (this.aperto === 'vento') this.chiudiRiquadro();
  }
}
