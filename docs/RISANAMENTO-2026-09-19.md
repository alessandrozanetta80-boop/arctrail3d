# RISANAMENTO 19–20/09/2026 — cosa è cambiato, come si pubblica, cosa resta

Ramo `risanamento-post-audit`, base `main @ 7b0ffe9`.
**Quanti commit lo dice git, non questa riga:** `git log --oneline main..HEAD | wc -l`.
*(Qui c'era «quindici», ed erano diciannove: un conto ricopiato in un diario
invecchia al commit dopo. E' la stessa regola dei banchi — vedi
`tests/controlla-tutto.sh` in cima.)*
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
  di fine. Dal 20/09 lo riceve anche un giro **già aperto** al momento
  dell'aggiornamento: prima glielo dava solo il salvataggio sul cloud, che in
  bosco non parte mai.
  *Correzione del 20/09 (verifica).* Qui c'era scritto che stava «nel locale,
  nella copia cloud e nello storico»: erano **tre posti su quattro**. Nel
  documento dello storico **sul cloud** non c'era — e quello è proprio il
  documento che `verificaGiroAltrove()` interroga con
  `storico.where("roundId","==",id)` per sapere se il giro è già stato chiuso su
  un altro telefono. La domanda non poteva trovare niente: il telefono spento
  alla 12 resuscitava il giro già finito sul tablet, cioè il difetto che il
  `roundId` era nato per chiudere. Non si era visto perché il banco il documento
  se lo scriveva da solo, col campo dentro. Adesso `giroPerNuvola` ci mette
  `roundId` **e** `interrotto`, e il banco guarda il documento che esce
  dall'app.
- **Il riepilogo permanente non si rifà più da capo** (20/09, verifica). Esiste
  perché lo storico si taglia a 150 giri e i record devono sopravvivere al
  taglio; ma in due punti il codice lo **cancellava** e lo ricostruiva dai 150
  rimasti. Chi ne ha di più perdeva record e totali la prima volta che dei giri
  scendevano dal cloud — cioè aprendo l'app su un secondo telefono. Adesso c'è
  l'elenco delle identità già contate (`arctrail3d_lifetime_visti_v1`,
  chiave `roundDocId(date)`) e il conto **si aggiunge**. `banco-riepilogo.js`,
  puntato sull'app di stanotte, dice no in sei punti: 300 giri diventavano 150
  e il record da 540 tornava 500.
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

| | prima | dopo | rimisurato 20/09 |
|---|---|---|---|
| primo disegno, rete veloce | 0,68 s | **0,16 s** | 0,18 s |
| primo disegno, 4G lento | 4,07 s | **0,76 s** | 0,78 s |
| primo disegno, 3G | 15,0 s | **2,5 s** | 2,5 s |
| Home utile, 3G | 15,0 s | ~~11,3 s~~ | **15,4 s** |

**Correzione del 20/09 (verifica).** I tre numeri del primo disegno si
rifanno quasi al millisecondo. Il quarto no: rimisurando con lo stesso
strumento, la Home utile su 3G è a 15,4 s (e 15,7 / 16,4 / 17,3 s con la CPU
rallentata), cioè **come prima**. Su 3G è migliorato il primo disegno — l'app
smette di essere una pagina bianca dopo 2,5 s invece di 15 — ma il momento in
cui la Home è utile non si è mosso: lo decide il download, non il codice.
*Un numero che nessuno rifà è un numero che diventa vero da solo.*

Cosa l'ha prodotto: scheletro d'avvio dentro `#app`, l'accesso che parte quando
le librerie ci sono (o dopo quattro secondi), le società caricate **dopo** il
primo disegno, i font di Google che non bloccano più niente.

## 4. Come si pubblica — e perché l'ordine adesso è libero

**Correzione del 20/09 (verifica).** Qui c'era scritto: «le regole stringono,
quindi il sito prima», e le regole andavano al punto 4 perché «chiudono porte
che l'app nuova non usa più, ma quella vecchia sì». **Quella frase non reggeva
alla prova.** Messe a confronto riga per riga con l'app online, le regole nuove
non chiudono nessuna porta che l'app di ieri usi: la chat costruisce già l'id
ordinato, `percorsi` si legge già filtrato per `createdBy`, `piazzola` è già un
numero, i campi di `errors` sono già tagliati alle stesse misure.

C'era invece il contrario, e nessuno l'aveva visto: `users/{uid}/devices` esiste
**solo** nelle regole nuove, e `scriviTokenPush` scriveva prima il dispositivo e
*poi* il vecchio `fcmToken`, in fila. Con il sito pubblicato e le regole no —
cioè proprio il punto 1 di questo elenco — la prima scrittura veniva rifiutata e
la seconda non partiva: chi apriva l'app nuova **non registrava le push da
nessuna parte**. Dal 20/09 le due scritture partono insieme e ne basta una.

E c'era un secondo guasto nella stessa direzione: i tetti di lunghezza messi il
19/09 erano copiati dal limite di prodotto (2000 caratteri per un messaggio),
ma quel limite è nato con questa versione — l'app nei telefoni non ha
`maxlength` sulle caselle. Con le regole pubblicate, un messaggio lungo scritto
da un'app non aggiornata sarebbe **sparito in silenzio**. Adesso i tetti nelle
regole sono soffitti d'abuso (8.000 / 20.000) e il limite che si vede sta sulla
casella.

Tutte e quattro le combinazioni della finestra sono provate da
`tests/banco-finestra.js`, che legge le regole di ieri da `git show
main:firestore.rules` invece che da una copia. Puntato sulle regole di stanotte
dice **no in tre punti**: erano rotture vere.

**Quindi l'ordine sotto resta consigliato, non obbligatorio.** Se le regole
arrivano dopo il sito, nella finestra le push continuano ad arrivare dal vecchio
`fcmToken` e i documenti per dispositivo si scrivono appena le regole ci sono
(alla prima apertura successiva).

1. `main` ← `risanamento-post-audit`: `app.html` (`2026-09-20-notturno`),
   `sw.js` (`arctrail3d-v167`), `index.html`, `manifest.json`,
   `compagnie-data.js`, `_config.yml`, `.github/`, `docs/`, `tests/`, `tools/`.
2. Guardare che il sito vero sia la versione nuova: `node tests/controlla-base.js`
   (dice IN PARI / AVANTI / INDIETRO file per file).
3. Functions: `bash ~/pubblica.sh` — versione `2026-09-20-dispositivi`.
   `pushNotifica` legge i dispositivi **e** il vecchio `users/{uid}.fcmToken`:
   la migrazione è già dentro, non serve un passaggio separato.
4. Regole: incollare `firestore.rules` `2026-09-20-dispositivi` in console e
   premere **Pubblica**. Prima si fanno meno ore di finestra sui dispositivi,
   dopo non si rompe niente: è indifferente, e il banco lo dimostra.

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
- **I tetti che si vedono e quelli che difendono** ora sono due cose separate
  (`maxlength` sulle caselle, soffitti d'abuso nelle regole). Le caselle che
  ancora non hanno un tetto — la nota di un allenamento, la nota del finale —
  scrivono in campi che nessuna regola limita: il giorno che una regola li
  limita, il tetto va messo prima sulla casella.
- **`compagnie_admin`, `percorsi_campo` e le coordinate di `open_trainings`
  restano leggibili da qualunque account** (SEC-09 dell'audit, chiuso solo per
  `percorsi`). I documenti scritti prima del 19/09 portano ancora
  `createdByEmail`: l'app non lo scrive più, ma nessuno li ha ripuliti.
