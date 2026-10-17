// CLASSIFICAZIONE DELLE AREE PER LA SCHEDA E PER IL COLORE — versione NEUTRA del pacchetto comune.
//
// Le regole venatorie (che cosa e' divieto, che cosa e' da verificare, quale atto lo dice) sono DOMINIO DELL'APP:
// in Adrenalina stanno in battuta-live/shared/registroAree.js, nel Gestionale in src/cartografia/regole.ts.
// La base comune NON le reinventa: legge quello che il pacchetto territoriale porta gia' scritto nei dati
// (properties.area, come i layer VCO3 del Gestionale v18) e altrimenti dichiara «da verificare».
// L'app puo' passare la propria funzione `classificaArea(meta, feature)` a creaMappaComune: stesso formato di ritorno.
//
// Colori: gli stessi di Adrenalina (registroAree.js, COLORE): il colore esce dalla regola, mai il contrario.

export const STATO_AREA = Object.freeze({ DIVIETO: 'DIVIETO', LIMITAZIONE: 'LIMITAZIONE', DA_VERIFICARE: 'DA_VERIFICARE', INFORMATIVO: 'INFORMATIVO' });

export const COLORE_AREA = Object.freeze({
  DIVIETO: '#d32f2f',          // rosso: solo divieto dichiarato da una fonte
  NATURA2000: '#8e24aa',       // viola: tutela Natura 2000
  LIMITAZIONE: '#c9851f',      // ocra: limitazioni o disciplina particolare
  DA_VERIFICARE: '#7b6bb0',    // viola spento: tutelata, regime ignoto
  INFORMATIVO: '#9aa0a6'       // grigio: contesto, nessuna regola
});

const PRIORITA = Object.freeze({ DIVIETO: 100, LIMITAZIONE: 50, DA_VERIFICARE: 20, INFORMATIVO: 0 });

/**
 * @param {object} meta     voce del territorio (id, titolo, categoria, campoNome, campoCodice, campoTipo, fonteBreve, colore)
 * @param {object} feature  GeoJSON Feature
 * @returns {{id: string, nome: string, stato: string, colore: string, priorita: number, messaggio: string|null,
 *            tipologia: string|null, codice: string|null, validoFino: string|null, prescrizioni: string[], fonte: string|null, fonteUrl: string|null, tratteggio: string|null}}
 */
export function classificaNeutra(meta, feature) {
  const p = (feature && feature.properties) || {};
  const a = p.area && typeof p.area === 'object' ? p.area : null;
  const nome = String((a && a.nome) || p[meta.campoNome || 'nome'] || meta.titolo || 'Area');
  const codice = (a && a.codice) || p[meta.campoCodice || 'codice'] || null;
  const tipologia = (a && a.tipologia) || p[meta.campoTipo || 'tipo'] || null;
  let stato;
  if (a && a.effetto === 'DIVIETO') stato = STATO_AREA.DIVIETO;
  else if (a && (a.effetto === 'LIMITAZIONE' || a.effetto === 'REGOLAMENTATA')) stato = STATO_AREA.LIMITAZIONE;
  else if (meta.categoria === 'comprensorio-vicino' || meta.categoria === 'riferimento') stato = STATO_AREA.INFORMATIVO;
  else stato = STATO_AREA.DA_VERIFICARE;
  const colore = stato === STATO_AREA.DIVIETO ? COLORE_AREA.DIVIETO
    : stato === STATO_AREA.INFORMATIVO ? (meta.colore || COLORE_AREA.INFORMATIVO)
      : meta.categoria === 'natura2000' ? COLORE_AREA.NATURA2000
        : stato === STATO_AREA.LIMITAZIONE ? COLORE_AREA.LIMITAZIONE : (meta.colore || COLORE_AREA.DA_VERIFICARE);
  const messaggio = (a && a.messaggioBreve) || (stato === STATO_AREA.DA_VERIFICARE ? 'VINCOLO DA VERIFICARE' : null);
  const validoFino = (a && (a.validaAl || a.validoFino)) || p.dataFineDivieto || null;
  // divieto A TERMINE (es. aree percorse dal fuoco): come Adrenalina (DIVIETO_CERTO_TEMPORALE) rosso ma tratteggiato,
  // riquadro della scheda non pieno; il divieto permanente e' marcato (spessore 4, riempimento 0.28, riquadro rosso)
  const temporale = stato === STATO_AREA.DIVIETO && !!validoFino;
  return {
    id: meta.id + ':' + (codice || nome),
    nome, stato, colore, priorita: PRIORITA[stato] || 0, messaggio, tipologia, codice,
    validoFino, temporale,
    prescrizioni: (a && Array.isArray(a.prescrizioni) ? a.prescrizioni : []).filter((t) => typeof t === 'string'),
    riferimento: (a && a.riferimentoNormativo) || null,
    dataFonte: (a && a.dataFonte) || null,
    fonte: (a && a.fonte) || p.fonte || meta.fonteBreve || null,
    fonteUrl: (a && a.fonteUrl) || (typeof p.riferimento === 'string' ? p.riferimento : null),
    tratteggio: null
  };
}
