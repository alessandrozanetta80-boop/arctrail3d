// ORIGINE: Adrenalina battuta-live/shared/strumentiMappa.js (commit c6586b6636, SHA-256 fonte 41d515f2bb1dc757…), SOLO LETTO. Copia generata da strumenti/importa-da-fonti.mjs: non modificare a mano.
// Uso in MAPPE COMUNI: distanze, misura, vai al punto, vento.
// Sostituzioni: nessuna (copia identica).
// STRUMENTI DELLA MAPPA — distanze, misura, vento (logica pura, testabile).
//
// Nessuna falsa precisione: ogni distanza parte dalla posizione GPS mostrata
// e ne eredita l'errore (±m della fascia). Il vento e' una STIMA METEO del
// modello, non una misura locale del telefono, e non finisce mai nei dati
// della squadra.

import { distanzaMetri, formattaDistanza } from './geo.js';

// ------------------------------------------------------------ cerchi di distanza
// Raggi scelti sulla scala della mappa (stesse soglie delle postazioni fisse:
// z<14 lontano, z14-15 medio, z16+ vicino).
export function raggiDistanze(zoom) {
  if (!Number.isFinite(zoom) || zoom < 14) return [500, 1000, 2000];
  if (zoom < 16) return [100, 200, 500];
  return [50, 100, 200];
}

export function etichettaRaggio(m) {
  return m >= 1000 ? String(m / 1000).replace('.', ',') + ' km' : m + ' m';
}

export const NOTA_DISTANZE = 'Stime cartografiche dalla posizione GPS corrente: ereditano l\'errore ±m mostrato nella fascia.';

// ------------------------------------------------------------ misura distanza
/**
 * Distanza in linea d'aria dalla mia posizione a un punto toccato.
 * Niente sentieri, niente dislivello: solo la distanza geodetica.
 * @returns {{metri: number, testo: string, gps: string}|null}
 */
export function misura(da, a) {
  if (!da || !a || !Number.isFinite(da.lat) || !Number.isFinite(da.lon) || !Number.isFinite(a.lat) || !Number.isFinite(a.lon)) return null;
  const metri = distanzaMetri(da, a);
  const acc = Number.isFinite(da.acc) && da.acc > 0 ? Math.round(da.acc) : null;
  return { metri, testo: formattaDistanza(metri, acc || 0), gps: acc ? 'GPS ±' + acc + ' m' : 'GPS ± sconosciuto' };
}

// ------------------------------------------------------------ misura su piu' punti (VCO1 mappe pro)
/**
 * Spezzata: dalla mia posizione (se c'e') attraverso i punti toccati.
 * Lunghezza lungo la linea disegnata e distanza in linea d'aria fra inizio e
 * fine. L'errore del GPS vale solo per l'inizio: si dichiara, non si somma.
 * @returns {{metri, testo, aria, testoAria, tratti, gps, daGps}|null}
 */
export function misuraSpezzata(da, punti) {
  const ok = (punti || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const daGps = !!(da && Number.isFinite(da.lat) && Number.isFinite(da.lon));
  const tutti = daGps ? [da, ...ok] : ok;
  if (tutti.length < 2) return null;
  let metri = 0;
  for (let i = 1; i < tutti.length; i++) metri += distanzaMetri(tutti[i - 1], tutti[i]);
  const acc = daGps && Number.isFinite(da.acc) && da.acc > 0 ? Math.round(da.acc) : 0;
  const aria = distanzaMetri(tutti[0], tutti[tutti.length - 1]);
  return {
    metri, testo: formattaDistanza(metri, acc), aria, testoAria: formattaDistanza(aria, acc), tratti: tutti.length - 1,
    gps: daGps ? (acc ? 'GPS ±' + acc + ' m' : 'GPS ± sconosciuto') : 'senza GPS: dal primo punto toccato', daGps, punti: tutti
  };
}

// ------------------------------------------------------------ vai al punto (VCO1 mappe pro)
/** Direzione iniziale (azimut geodetico) da a verso b, in gradi da nord in senso orario. */
export function azimut(a, b) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}

export const NOTA_VAI = 'Linea d\'aria, non un percorso: accesso e percorribilità non sono garantiti.';

/**
 * Distanza e direzione dalla mia posizione al punto scelto.
 * Piu' vicino dell'errore GPS: "sei arrivato", la direzione non si dice.
 * @returns {{metri, testo, gradi, settore, arrivato, gps}|null}
 */
export function versoPunto(da, meta, { ora = null, giaArrivato = false } = {}) {
  if (!da || !meta || !Number.isFinite(da.lat) || !Number.isFinite(da.lon) || !Number.isFinite(meta.lat) || !Number.isFinite(meta.lon)) return null;
  const metri = distanzaMetri(da, meta);
  const acc = Number.isFinite(da.acc) && da.acc > 0 ? Math.round(da.acc) : null;
  /* GPS INSTABILE (fase 2): con un errore oltre ACC_AFFIDABILE_M il cerchio
     dell'errore puo' contenere la meta anche a 100 m: non si dice «sei
     arrivato», si dice che il segnale non basta. Una volta arrivati si resta
     arrivati finche' non ci si allontana di ISTERESI_ARRIVO_M in piu' (niente
     «arrivato / 12 m / arrivato» a ogni fix). */
  const raggio = Math.max(acc || 0, 10);
  const affidabile = acc === null || acc <= ACC_AFFIDABILE_M;
  const arrivato = affidabile && metri <= raggio + (giaArrivato ? ISTERESI_ARRIVO_M : 0);
  const entroErrore = !arrivato && metri <= raggio;
  const gradi = arrivato || entroErrore ? null : Math.round(azimut(da, meta));
  const etaS = Number.isFinite(ora) && Number.isFinite(da.t) ? Math.max(0, Math.round((ora - da.t) / 1000)) : null;
  return {
    metri, testo: formattaDistanza(metri, acc || 0), gradi, settore: gradi === null ? null : settore(gradi), arrivato,
    gps: acc ? 'GPS ±' + acc + ' m' : 'GPS ± sconosciuto',
    entroErrore, impreciso: !affidabile,
    direzioneIncerta: gradi !== null && acc !== null && metri < 2 * acc,
    etaS, fermo: etaS !== null && etaS > ETA_FIX_VECCHIO_S
  };
}

/** Oltre questo errore GPS l'arrivo non si dichiara. */
export const ACC_AFFIDABILE_M = 30;
/** Arrivati, si "esce" solo allontanandosi di altri 10 m. */
export const ISTERESI_ARRIVO_M = 10;
/** Un fix piu' vecchio di cosi' si dichiara: distanza e direzione sono di allora. */
export const ETA_FIX_VECCHIO_S = 30;

// ------------------------------------------------------------ vento
export const SETTORI_16 = Object.freeze(['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']);
export const NOTA_VENTO = 'stima meteo, non misura locale';
export const CACHE_VENTO_MS = 15 * 60_000;
export const SPOSTAMENTO_NUOVA_RICHIESTA_M = 2_000;

/** Direzione di PROVENIENZA in gradi -> settore italiano a 16 punti ("NO"). */
export function settore(gradi) {
  if (!Number.isFinite(gradi)) return null;
  const g = ((gradi % 360) + 360) % 360;
  return SETTORI_16[Math.round(g / 22.5) % 16];
}

export function gradiDiSettore(s) {
  const i = SETTORI_16.indexOf(s);
  return i < 0 ? null : i * 22.5;
}

/** Coordinate arrotondate a 2 decimali (~1 km): la postazione precisa non esce dal telefono. */
export function arrotonda(p) {
  return { lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 };
}

/** URL Open-Meteo (nessuna chiave per uso non commerciale, doc ufficiale /en/docs). */
export function urlOpenMeteo(p) {
  const r = arrotonda(p);
  return 'https://api.open-meteo.com/v1/forecast?latitude=' + r.lat.toFixed(2) + '&longitude=' + r.lon.toFixed(2) +
    '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto';
}

/** Risposta Open-Meteo -> {gradi, kmh, ora} oppure null se manca qualcosa (mai dati inventati). */
export function leggiOpenMeteo(json) {
  const c = json && json.current;
  if (!c || !Number.isFinite(c.wind_direction_10m) || !Number.isFinite(c.wind_speed_10m) || typeof c.time !== 'string') return null;
  return { gradi: c.wind_direction_10m, kmh: c.wind_speed_10m, ora: c.time };
}

/**
 * Vento con cache breve e prevalenza del manuale.
 * Una richiesta parte SOLO da chiedi() (l'utente apre "Vento"), mai da sola.
 */
export class Vento {
  /** @param {{fetch?: Function, ora?: () => number}} opz */
  constructor({ fetch: f = globalThis.fetch ? (...a) => globalThis.fetch(...a) : null, ora = () => Date.now() } = {}) {
    this.fetch = f;   // mai il fetch nudo come metodo: nel browser vuole window come this
    this.ora = ora;
    this.cache = null;      // { dato, il, dove }
    this.manuale = null;    // { settore, kmh|null }
  }

  impostaManuale(settoreScelto, kmh = null) {
    if (gradiDiSettore(settoreScelto) === null) throw new Error('direzione non valida');
    this.manuale = { settore: settoreScelto, kmh: Number.isFinite(kmh) && kmh >= 0 ? kmh : null };
  }

  azzeraManuale() { this.manuale = null; }

  /**
   * @param {{lat, lon}|null} posizione
   * @param {{online?: boolean}} opz
   * @returns {Promise<{fonte: 'manuale'|'stima'|'cache'|'nessuno', ...}>}
   */
  async chiedi(posizione, { online = true } = {}) {
    if (this.manuale) return { fonte: 'manuale', settore: this.manuale.settore, gradi: gradiDiSettore(this.manuale.settore), kmh: this.manuale.kmh };
    const adesso = this.ora();
    const c = this.cache;
    const vicina = c && posizione && distanzaMetri(c.dove, posizione) < SPOSTAMENTO_NUOVA_RICHIESTA_M;
    if (c && (!posizione || vicina) && adesso - c.il < CACHE_VENTO_MS) return this.daCache('stima');
    if (!online || !posizione || !this.fetch) {
      return c ? this.daCache('cache') : { fonte: 'nessuno', motivo: !posizione ? 'posizione GPS non disponibile' : 'non disponibile offline' };
    }
    try {
      const r = await this.fetch(urlOpenMeteo(posizione));
      if (!r || !r.ok) throw new Error('risposta ' + (r ? r.status : '?'));
      const dato = leggiOpenMeteo(await r.json());
      if (!dato) throw new Error('dato incompleto');
      this.cache = { dato, il: adesso, dove: arrotonda(posizione) };
      return this.daCache('stima');
    } catch (e) {
      return c ? this.daCache('cache') : { fonte: 'nessuno', motivo: 'stima non disponibile (' + (e && e.message ? e.message : e) + ')' };
    }
  }

  daCache(fonte) {
    const { dato, il } = this.cache;
    return { fonte, settore: settore(dato.gradi), gradi: dato.gradi, kmh: dato.kmh, ora: dato.ora, etaMs: this.ora() - il };
  }
}

/** Testo per la scheda: "da NO · 12 km/h · stima meteo delle 07:15, non misura locale". */
export function testoVento(v) {
  if (!v || v.fonte === 'nessuno') return 'Vento: ' + (v && v.motivo ? v.motivo : 'non disponibile');
  const vel = Number.isFinite(v.kmh) ? ' · ' + Math.round(v.kmh) + ' km/h' : '';
  if (v.fonte === 'manuale') return 'Vento da ' + v.settore + vel + ' · impostato a mano';
  const ora = typeof v.ora === 'string' && v.ora.length >= 16 ? v.ora.slice(11, 16) : '?';
  const eta = v.fonte === 'cache' ? ' · ultimo dato di ' + Math.max(1, Math.round(v.etaMs / 60_000)) + ' min fa (offline)' : '';
  return 'Vento da ' + v.settore + vel + ' · ' + NOTA_VENTO + ' (dato delle ' + ora + ')' + eta;
}
