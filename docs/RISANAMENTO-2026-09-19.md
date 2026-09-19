# RISANAMENTO 19–20/09/2026 — cosa è cambiato, come si pubblica, cosa resta

Ramo `risanamento-post-audit`, **quindici commit locali**, base `main @ 7b0ffe9`.
**Niente è pubblicato.** Questo file racconta il lavoro; `docs/STATO.md` §R dice
cosa fare col telefono in mano.

L'audit che lo ha originato è `docs/AUDIT-TECNICO-2026-09-19.md`: **non è su
GitHub e non deve andarci**, perché elenca per filo e per segno vulnerabilità di
un'app viva, e `docs/` sarebbe servito dal sito. `_config.yml` lo tiene fuori
comunque; resta una scelta, non una svista.

---

## 1. I tre P0 dell'audit

| | cos'era | cosa si è fatto | chi lo difende |
|---|---|---|---|
| **P0-1** | sei XSS salvati: spot degli allenamenti, piazzole dei percorsi, segnalazioni, numeri del profilo pubblico, nomi in Prepara gara | `interoSicuro()` sui numeri, `escapeHtml` sui testi, e le stesse porte chiuse anche nelle regole (`numeroOpz`, `testoOpz`) | `banco-xss.js`, `banco-regole.js` |
| **P0-2** | i dati locali non avevano un padrone: entrando con un altro account, i giri di Anna finivano nel cloud di Bruno | `arctrail3d_proprietario_v1`; i dati di un altro si mettono **da parte** (`LEGACY_ORPHANED`), non si caricano mai da soli; l'uscita chiude sessione, toglie il token del dispositivo e pulisce | `banco-account.js` |
| **P0-3** | un aggiornamento poteva togliere l'app di mano: `install` con `.catch()` muto, `activate` che buttava le casse, ricarica a metà giro | `install` che fallisce invece di mentire, `activate` che verifica prima di buttare, nessuna ricarica a giro aperto | `banco-sw-aggiornamento.js`, `banco-salto-versione.js` |

**P0 risolti: 3 su 3**, ognuno con un banco che, puntato sulla versione di
prima, dice di no.

## 2. La notte del 20/09 — affidabilità

- **Il giro ha un nome.** `roundId` da 128 bit, stabile, indipendente dalla data
  di fine; sta nel locale, nella copia cloud e nello storico. Dal 20/09 lo
  riceve anche un giro **già aperto** al momento dell'aggiornamento: prima glielo
  dava solo il salvataggio sul cloud, che in bosco non parte mai.
- **Due telefoni non si sovrascrivono in silenzio.** La copia cloud porta
  `rev`, `deviceId` e `stato`: se l'altro dispositivo ha una revisione più
  avanti, l'app **mostra il conflitto e fa scegliere**. Nessun vincitore scelto
  di nascosto.
- **La tastiera non copre più il pulsante che manda** (`interactive-widget`
  + uno spazio di corsa mentre un campo ha il fuoco).
- **Il salto di versione lontana**: dalla `v156` del 29/08 a oggi, con i dati di
  allora in casa — storico IFAA migrato, riepilogo permanente, tema con un nome
  vecchio, giro aperto senza nome.
- **I sei timbri di versione** hanno un solo controllo che li tiene insieme.
- **Le chiavi delle società straniere** (sha1/md5 del nome) hanno un'istantanea:
  se l'elenco viene rigenerato si sa **quali** sono sparite.

## 3. Le misure, prima e dopo

Con `tools/misura-avvio.js` (file serviti gzip, CPU rallentata, reti finte):

| | prima | dopo |
|---|---|---|
| primo disegno, rete veloce | 0,68 s | **0,16 s** |
| primo disegno, 4G lento | 4,07 s | **0,76 s** |
| primo disegno, 3G | 15,0 s | **2,5 s** |
| Home utile, 3G | 15,0 s | **11,3 s** |

Cosa l'ha prodotto: scheletro d'avvio dentro `#app`, l'accesso che parte quando
le librerie ci sono (o dopo quattro secondi), le società caricate **dopo** il
primo disegno, i font di Google che non bloccano più niente.

## 4. Come si pubblica — l'ordine conta

Le regole **stringono**, quindi vale la regola 18: il sito prima.

1. `main` ← `risanamento-post-audit`: `app.html` (`2026-09-20-notturno`),
   `sw.js` (`arctrail3d-v167`), `index.html`, `manifest.json`,
   `compagnie-data.js`, `_config.yml`, `.github/`, `docs/`, `tests/`, `tools/`.
2. Guardare che il sito vero sia la versione nuova: `node tests/controlla-base.js`
   (dice IN PARI / AVANTI / INDIETRO file per file).
3. Functions: `bash ~/pubblica.sh` — versione `2026-09-20-dispositivi`.
   `pushNotifica` legge i dispositivi **e** il vecchio `users/{uid}.fcmToken`:
   la migrazione è già dentro, non serve un passaggio separato.
4. Regole: incollare `firestore.rules` `2026-09-20-dispositivi` in console e
   premere **Pubblica**. Vanno **dopo** il sito: chiudono porte che l'app nuova
   non usa più, ma quella vecchia sì.

Prima di toccare qualunque cosa: `sh tests/controlla-tutto.sh` e
`node tools/anteprima-sito.js` per vedere il sito com'è davvero.

## 5. Cosa resta aperto

- **`pushsubscriptionchange` non è gestito**: si misura dai log di
  `pushNotifica` («token scaduti») prima di scrivere codice.
- **DE, NL, ES**: le chiavi hanno la stessa forma delle altre ma non sono
  ricalcolabili dai campi del file. Sono protette dall'istantanea, non dalla
  regola.
- **`banco-porta` resta un esterno** (vuole `gstatic.com` e Firebase vivi):
  `ESTERNI=1 sh tests/controlla-tutto.sh` con la rete vera. Il runner lo
  **nomina** e lo salta: un test saltato non deve somigliare a uno passato.
- **Le prove col telefono in mano** sono elencate in `docs/STATO.md` §R2: nessun
  banco le sostituisce.
