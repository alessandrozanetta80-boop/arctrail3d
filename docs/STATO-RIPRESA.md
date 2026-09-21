# STATO-RIPRESA — ArcTrail 3D, mattina del 22/09/2026

Da qui si riparte. Il dettaglio sta nei tre documenti tecnici:
`ALLENAMENTI-2026-09-21.md` (registrazione e storico, tenuti separati),
`DIAGNOSI-PUSH-SAMSUNG-2026-09-21.md`, `RUNBOOK-DEPLOY-2026-09-22.md`.

---

## Produzione

**INVARIATA — NESSUN DEPLOY NOTTURNO.** È il rollback del 20/09, verificato il 21/09
file per file: sito = `7b0ffe9` (app `2026-09-18-campi-fiarc`, cassa `v166`), sette
Functions = `7b0ffe9` (`2026-08-28-notifica-verificata`), regole = `7b0ffe9`
(`2026-08-28-porte-verified`). Nella notte nessun comando di deploy, nessuna
scrittura su Firebase di produzione, nessun push su GitHub. Le prove con Firebase
hanno girato solo sugli emulatori, su un progetto `demo-*` che per costruzione non
può raggiungere la produzione.

---

## Registrazione allenamenti

- **Causa.** L'app della release del 20/09 partiva **prima** delle librerie
  Firebase (`defer`) e non le inizializzava mai (`956bf36`, fase 23): modalità locale
  per ogni telefono già usato, fascia «Stai lavorando solo su questo telefono», i
  giri restavano nel telefono. Nessuna regola e nessuna Function coinvolte.
- **Fix.** Solo l'avvio in `app.html`: «non ancora» non è più «mai»;
  l'inizializzazione avviene quando le librerie arrivano, anche in ritardo.
- **Test.** `banco-librerie-defer.js` (15/15; sulla release 8 rossi). Matrice reale
  3 app × 2 regole (`sh tests/lancia-e2e.sh`, 18/18): primo write, campi,
  ownership, offline→online, riapertura, allenamento «solo club», chi lo vede.
  Terzo asse, Functions vere (`sh tests/lancia-e2e-claim.sh`, 11/11).
- **Perché non si vedeva:** i banchi mettevano Firebase finto **prima** della
  pagina; l'ordine vero non l'aveva nessuno.

## Storico >150

- **Causa del limite.** `HISTORY_MAX = 150` nel telefono (dall'agosto); la scheda
  Giri ne mostrava **20**; oltre i 150 non si vedeva niente; ogni apertura leggeva
  **tutto** lo storico dal cloud. **Nessun commit ha mai tolto il limite**: `2ceb5d4`
  (release) correggeva il riepilogo permanente, non l'elenco — il revert l'ha tolto
  dalla produzione, nel ramo c'è.
- **Soluzione.** 20 alla volta dal telefono, poi 30 alla volta dal cloud a
  richiesta (`startAfter`), in memoria e non nel telefono; la sincronia chiede per
  id. Niente «tutto senza limite».
- **Test.** `banco-storico-150.js` 39/39 (149, 150, 151, il 151° tirato, 2.000 giri,
  ordine, doppioni, lapidi, rete che manca, modalità locale).
- **Prestazioni.** 2.000 giri: apertura ≤ 450 letture (prima 2.300); 30 letture per
  blocco; 270 righe ridisegnate in 186–268 ms a CPU ×4.

## Dati locali

- **Il 20/09 non si è perso niente.** La migrazione «di chi sono i dati» della
  release vive in `onAuthReady`, che con Firebase spento non è mai partito; i giri
  tirati nella finestra sono rimasti nella chiave di sempre, l'app del 18/09 li ha
  visti e caricati. Provato: 18/09 → release → 18/09 (`banco-dati-rollback.js`).
- **Rischio di domani, corretto.** Con l'app nuova la migrazione parte davvero, e i
  profili dei primi giorni (senza email, prima del 09/08) finivano «da parte»:
  riepilogo da 180 giri a 4, attrezzatura sparita dalla vista. Peggio: il tasto
  «Aggiungili al mio account» riprendeva solo i giri e **buttava** riepilogo,
  attrezzatura, lapidi e marchio IFAA. Adesso: «Aggiungili» riprende tutto senza
  contare due volte; e se il profilo messo da parte ha lo stesso nome utente e lo
  stesso nome dell'account appena entrato, i dati tornano da soli. Un altro account
  su un telefono condiviso resta fuori come prima. `banco-dati-rollback.js` 23/23
  (prima della correzione: 3 rossi).
- **Rischio che resta:** se si tornasse all'app del 18/09 DOPO che l'app nuova ha
  messo da parte i dati di un altro account, l'app del 18/09 non li vede (non
  conosce `arctrail3d_orfani_v1`). Non si cancellano: tornano con l'app nuova.

## File interni

- **Causa dell'esposizione.** Il sito è il repository (GitHub Pages + Jekyll).
  `_config.yml` con l'elenco `exclude` è nato il 19/09 nella release; il revert del
  20/09 l'ha tolto. **Oggi in produzione rispondono 200** `docs/`, `tests/`,
  `functions/index.js`, `firestore.rules`, `pubblica.sh`, `package.json`, e
  `archive/ArcTrail3D-Compagnie_build-2026-07-31.html` (un'app vecchia collegata al
  Firebase vero; le regole valgono comunque, lato server).
- **Fix preparato.** `_config.yml` nel ramo; `controlla-pubblicazione.js` ora simula
  l'uscita di Jekyll sui file tracciati e dice no a qualunque file non da sito
  (senza `_config.yml` escono 174 file, con 36); `.gitignore` tiene fuori le
  istruzioni di sessione `/ARCTRAIL3D_*.md`; su questo PC `.git/info/exclude`
  protegge i file riservati anche su `main`. `tools/controlla-sito-pubblico.js`
  guarda il sito vero dopo il gate 1 (oggi: 13 file interni a 200).
- **Da sapere:** il repository GitHub è **pubblico**. `_config.yml` toglie i file
  dal sito, non da github.com. I documenti riservati si proteggono solo non
  committandoli.

## Push

- **Diagnosi.** In produzione: un token per persona (l'ultimo dispositivo vince),
  nessuna `Urgency` (Android in Doze aspetta lo sblocco), token rinnovato solo
  aprendo l'app. Nel ramo tutto questo è già corretto (release, `3efd0b6`/`2d60c12`).
- **Fix della notte.** `invalid-argument` non spegne più tutti i dispositivi quando
  il difetto è nel messaggio (`banco-push` 46/46). Functions `2026-09-22-push-argomento`.
- **Resta:** `TEST REALE TELEFONO NECESSARIO` — app chiusa, telefono bloccato, due
  dispositivi, risparmio batteria di Samsung su Chrome.

## S26

- **Diagnosi.** Viewport, `text-size-adjust`, tacca e barra in basso già a posto
  (17–18/09). Misurato stanotte: sul viewport di un S26 Ultra la testata va a capo
  dal **130%** di testo (61 → 97 px, fino a 112 al 200%; zoom schermo 90 px).
- **Fix.** Nessuno: non è un guasto (niente si sovrappone o esce), è una scelta di
  design (marchio troncato o comandi sotto i 44 px). Il banco ora misura la testata e
  dice no sopra un quinto dello schermo.
- **Resta:** `TEST REALE S26 ULTRA NECESSARIO`, con i valori di «Dimensione
  carattere» e «Zoom schermo».

## Service worker / offline

- **Stato.** Tre salti provati col banco del salto di versione, dati e giro aperto
  compresi: **v166 → v168** (domani, dalla produzione), **v167 → v168** (chi ha
  preso la release), **v167 → v166** (il rollback vero del 20/09): 16/16 ciascuno.
  La cassa vecchia se ne va, senza rete si apre la versione nuova, lo storico non
  perde niente, il giro aperto si riprende senza ricarica sotto il dito. Le push non
  dipendono dalla cassa.
- **Test.** `banco-salto-versione.js` (con `VECCHIO=`/`NUOVO=`), `banco-italia-offline`,
  `banco-giro-sicuro`, `banco-esterni`, `banco-librerie-defer` — tutti nel giro.

## Suite finale (22/09, notte)

- `sh tests/controlla-tutto.sh`: **65 banchi, 2831 prove, 0 cadute — TUTTI PASSATI**.
  Include `banco-regole` e `banco-finestra` (emulatore), `banco-claim`, `banco-push`,
  i tre banchi nuovi (`librerie-defer`, `storico-150`, `dati-rollback`),
  `banco-font-scale` (67 combinazioni).
- Saltato: `banco-porta.js` (esterno, vuole la rete vera: `ESTERNI=1`).
- Da leggere a mano (non contano le prove): `controlla-token`, `banco-firme`,
  `prova-schermo`, mercatino. Letti: puliti.
- In attesa (voluto): 2 prove di `banco-ritorno` (brief del 30/08 mai pubblicato).
- Fuori dal giro, eseguiti: `sh tests/lancia-e2e.sh` **18/18**,
  `sh tests/lancia-e2e-claim.sh` **11/11**.

## Git

- Ramo di lavoro: **`fix/avvio-firebase-2026-09-21`**, solo locale (niente push).
- `main` = `origin/main` = `1cd0652` (il revert del 20/09), intatto.
- Il ramo contiene `main` con un merge `-s ours`: al gate 1 `main` avanza in
  fast-forward, senza stati intermedi.
- Working tree pulito; i file riservati e le istruzioni di sessione sono esclusi.
- Commit locali: quelli del 21/09 (`811c5f4`, `738cb24`) più quelli della notte —
  l'elenco preciso: `git log --oneline main..fix/avvio-firebase-2026-09-21`.

---

## Primo passo stamattina

Leggere `RUNBOOK-DEPLOY-2026-09-22.md`, e se si decide di procedere: **GATE 1, solo
il sito**, poi i test 1–4 e 6 col telefono. Il 2 e il 3 sono il cancello.
