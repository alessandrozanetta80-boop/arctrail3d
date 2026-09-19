# STATO — ArcTrail 3D

**Questo è il PRIMO file che si legge, e si legge per intero.** Dice cos'è vero
oggi. Insieme a `REGOLE-LAVORO.md` sono **i due soli file vivi letti per
intero**. Gli archivi non si leggono mai tutti: si cercano.

| file | mestiere | si legge |
|---|---|---|
| **STATO.md** *(questo)* | cos'è vero oggi | tutto, ogni sessione |
| **REGOLE-LAVORO.md** | come si lavora qui | tutto, ogni sessione |
| **NOTE-DESIGN.md** | perché l'app è così — archivio | si cerca |
| **NOTE-MERCATINO.md** | perché il mercatino è così — archivio | si cerca |

Aggiornato il **20/09/2026** (risanamento notturno, §R).

---

## 1. Dove stanno i file, e cosa è pubblicato

**Dal 25/08 `index.html` è la VETRINA e l'app è `app.html`:** ogni riferimento
più vecchio chiama `index.html` l'app.

| file | cos'è | timbro | copia buona |
|---|---|---|---|
| `index.html` | la vetrina, porta di casa | online `2026-09-18-inglese` · ramo `2026-09-19-risanamento` | **GitHub** |
| `app.html` | l'app | online `2026-09-18-campi-fiarc` · ramo `2026-09-20-notturno` | **GitHub** |
| `compagnie-data.js` | le societa', 4950 in otto paesi | — | **GitHub** |
| `marketplace.html` | il mercatino | `2026-08-25-radice` | **GitHub** |
| `sw.js` | | online `arctrail3d-v166` · ramo `v167` | **GitHub** |
| `favicon.ico` | l'icona per chi guarda da fuori | — | GitHub, caricata a mano |
| cinque `vetrina-*.webp` | le foto della vetrina | — | GitHub, caricate a mano |
| `functions/index.js` | le 7 Cloud Functions *(dal 17/09 in `functions/`)* | ramo `2026-09-20-dispositivi` | GitHub *(deploy: `bash ~/pubblica.sh`)* |
| `firestore.rules` | | console `2026-08-28-porte-verified` · ramo `2026-09-20-dispositivi` | GitHub **e** console Firebase |
| diari, banchi, script | `docs/`, `tests/`, `tools/` | — | il progetto, **e dal 15/09 anche GitHub**: `docs/STRUTTURA-REPOSITORY.md` |
| `DOPPIE-TESSERE-ITALIA.md` | le 40 società italiane con due tessere | — | il progetto; su GitHub in `docs/` |

`vetrina.html` e `vetrina-anteprima.html` **non sono più pagine del sito** (25/08); l'anteprima è conservata in `archive/` (15/09).

**20/09/2026 — `index.js` e `firestore.rules` sono cambiati** (ramo
`risanamento-post-audit`, non ancora su `main`): torna a valere la regola 9. Cosa
va pubblicato, in che ordine, e cosa si guarda col telefono: §R.

**`tests/controlla-base.js` confronta i TIMBRI, non il contenuto:** file diversi con
lo stesso timbro e il banco dice IN PARI. **Prima di ogni consegna di un FILE DEL
PRODOTTO si confronta col `diff` la copia online del file toccato.** Il **MICRO
DOCUMENTALE è escluso** (regola 3-bis). Il file di lavoro **non si sovrascrive
mai in automatico** (regola 2). *Un timbro nato da una versione mai pubblicata è
una cancellazione.*

## 2. I banchi

`sh tests/controlla-tutto.sh` — **~2,5 minuti**. I due cancelli (base, sintassi) in
fila e per primi; il resto **sei alla volta**. Un rosso nel parallelo si tratta
con la **regola 23** di `REGOLE-LAVORO.md`.

**Quanti sono lo dice il copione, non questo file:**
`grep -c '^banco ' tests/controlla-tutto.sh`.

**Non si lancia tutto per ogni ritocco.** Quanto girare, e quando, lo decidono
i tre livelli della regola 3 — **MICRO, STANDARD, CRITICO**. Nel MICRO il giro
completo non si fa; prima di consegnare è obbligatorio **dallo STANDARD in su**.
*(Allineato alla regola 3 il 29/08: qui c'era scritto «a ogni livello».)*

**«Tutti passati» non è mai la fotografia di ieri:** lo dà l'ultima esecuzione.
L'ultimo conto sta in `docs/RISANAMENTO-2026-09-19.md`. Dal 19/09 **`banco-regole`
gira con gli altri** (`tests/lancia-regole.sh`, emulatore, Java ≥ 17: senza, dice
no) e `tests/firebase-finto.js` fa girare l'app in PRODUZIONE (non DEV_MODE) su un
Firebase in memoria. Il runner conta anche le **prove**, non solo i banchi, ed
elenca a parte quelli che non ne contano nessuna. In `banco-ritorno` due prove
restano **in attesa** (`attrBtn`, brief del 30/08 mai pubblicato).

Dipendenze: tutte in `package.json` (anche l'emulatore, dal 19/09): `npm install`.
**`banco-porta` è una prova d'INTEGRAZIONE** (vuole `gstatic.com` e Firebase vivi):
il runner la nomina e la salta; `ESTERNI=1 sh tests/controlla-tutto.sh` con la rete vera.

**Il guardiano dello stile non è a zero, ed è normale.** Il tetto in
`tests/tetto-token.json` non sale mai. I numeri li stampa lui: **qui non si ricopiano.**

## 3. Cosa è aperto

Numerate. Il numero non cambia mai: quando una voce si chiude si **cancella**,
e il racconto resta nell'archivio.

**APERTO non significa PROSSIMO.** Le voci marcate **RINVIATA** non si
propongono come lavoro finché non è Alessandro a riaprirle.

### A — Si chiude solo con un telefono in mano, e non da questa parte

- **A5. Il ritorno dal link di verifica. RINVIATA** *(30/08)*. Registrazione con
  un'email vera → link → ritorno su `app.html`: l'indirizzo lo prova il banco,
  che il dominio sia autorizzato in Firebase no. **F1 è l'altro nome di questa
  stessa prova, non un secondo lavoro.**

### B — Aspettano una decisione di Alessandro, non una correzione

- **B1. Il giro aperto si comanda da tre punti** — «Riprendi», «Azzera», e il
  `resume-banner` nella scheda Tira, che è un doppione. Unirli è giusto su
  carta, ma la distanza fra Riprendi e Azzera è una protezione: un comando
  distruttivo accanto a uno che si preme sempre si tocca per sbaglio.
- **B3. La richiesta di gestione compagnia non chiede nessuna prova.**
  *Scritta tre volte negli archivi, mai decisa.*
- **B4. Il verde della testata e del marchio.** Tutto è passato al tinto il
  23/08; testata e marchio no, perché sono identità e non fondo.
- **B6. `.btn-arancio` è a 2,79:1**, sotto soglia. Regge perché è grande e
  grassetto. *La strada, imparata il 25/08:* l'arancione perde forza abbassando
  la luce e girando l'inchiostro sul crema, non togliendo colore. Resta una
  decisione.
- **B8. I dati che il referente scrive non li vede nessuno.** La scheda prende
  tutto da `compagnie-data.js`: referente, `tel`, `indirizzo` e `note` non
  compaiono da nessuna parte (l'unico usato è `emailComp`). *L'app promette una
  cosa che non fa.* Alessandro (25/08): si sistema **come si vedono**.
- **B9. Le note della compagnia sono un riquadro senza forma**, leggibile da
  chiunque: si cura con un avviso sopra il campo, non con una regola.
- **B12. Le date degli assetti si registrano e non si vedono.** `creato` e
  `archiviatoIl` esistono dal 25/08. Mostrarle costa due etichette in nove
  lingue.
- **B13. La cartolina del risultato.** Chiesta il 25/08, **non iniziata**:
  funzione nuova, ~60 stringhe. Il «Condividi» di oggi manda la scheda del
  GRUPPO: la cartolina personale è un altro oggetto, non una sua correzione.

### C — Lavoro tecnico

- **C1. La classifica per divisione e la gara staccata dal formato** sono **un
  lavoro solo**: aspettano *il giro che sa da quale gara viene*. Gli arcieri sono
  `{id, name}`. **Il lavoro è quel collegamento, non la tabella.**
- **C2. Il token FCM si rinnova solo aprendo l'app.** Dal 19/09 (ramo) un token
  PER DISPOSITIVO, push solo `data`, `onMessage`, tocco che apre la notifica.
  Resta `pushsubscriptionchange` non gestito: si *misura* dai log di `pushNotifica`.
- **C3/C4. La chat dell'allenamento attacca un ascoltatore a ogni ridisegno e non lo stacca mai** (`loadOtMsgs`); si ferma a 50 messaggi e non conta i non letti.
- **C7.** Gli avvisi scritti dal server sono in italiano, tutte e sette le funzioni.
- **C8. Paese e federazione vivono solo in `localStorage`**: ogni browser nuovo li richiede. Vanno fatti scendere dal profilo dopo l'accesso.
- **C9. Il campo del giro è testo libero.** «Cerrione» e «Fornasona, Cerrione»
  sono lo stesso posto. *Un giro nato da un allenamento aperto conosce già il
  campo e lo chiede lo stesso: è il primo posto dove togliere la domanda.*
- **C10. Container query per le schede.** Metà fatto: sulla pagina, non sulle
  schede dentro le schermate.
- **C11. Un solo alfabeto di icone.** Restano emoji sparse, disegnate diverse su
  ogni telefono: `navIcon()` e `ICON_PATHS` esistono già.
- **C12. Il marchio in SVG** ha il **verde vecchio dentro i pixel**: non si ritinge
  con un token. Sagoma di animale, non un altro bersaglio ad anelli.
- **C15. L'elenco «Scopri» non ha una ricerca**, e `compagnie-data.js` ha qualche provincia sbagliata. Non è codice: è l'elenco.
- **C16. Che le tre porte di Tira siano alte uguale non lo misura nessuno.** La
  tastiera sì, dal 19/09: `banco-pista-schermi` in undici schermi.
- **C17. Due code del ridisegno chat.** *(a)* Segnala e Blocca in cima: spostarli
  tocca un obbligo per gli store. *(b)* La riga di scrittura tocca
  `.input-field`, che vive in tutta l'app.
- **C21. Nessun controllo dice «questo nome di classe è già di qualcun altro».**
  Il 28/08 `.prof-testa` è stata riusata e la carta d'identità si è disegnata
  tutta su una riga. `controlla-token.js` sa dire il contrario, non questo.
- **C23. Cinque versioni senza una voce propria** (verificate il 30/08, l'ultima
  il 15/09): `2026-08-28-sito`, `2026-08-28-nfas-fonte`, `2026-08-29-freeze`,
  `2026-08-29-locale` e `2026-08-30-profilo-assetti`, cioè l'app online: il
  codice c'è, il racconto no. **Nessuna è ricostruibile dai file.** Le cinque
  pagine SEO dei regolamenti stanno nel `sitemap.xml` e in nessun archivio.
- **C24. In parallelo qualche banco dice no, e ogni giro è un banco diverso.**
  Causa probabile, dall'audit: 164 `waitForTimeout` e nessuna attesa su una
  condizione. **La procedura è la regola 23 di `REGOLE-LAVORO.md`.**
- **C25. Il calendario mostra dieci gare inventate, e lo dichiara in cima.**
  `calEventi()` è l'unica giuntura, `calUrlSicuro()` vaglia già gli indirizzi: il
  cartello si toglie **nella stessa mossa** in cui entra il primo feed. Con
  diciassette federazioni le pastiglie diventano una parete: si ripensa coi dati
  veri davanti. **«La mia regione» resta un filtro per regione finché non ci
  saranno coordinate: il nome vero di «vicino» costa i dati, non il codice.**
- **C30. Il debito dello stile.** Il guardiano è verde (tetto 35 `!important`):
  il debito sono i tre blocchi «mockup-fedele-v1/v2» e «home-compatta-v2».

### D — Mercatino

*Stato voluto, non lavoro aperto:* **il mercatino è chiuso a chi non ha
`betaTester: true`**, e si accende dal pannello. *Da fuori chiusura e guasto si
somigliano molto.*

- **D1. Le traduzioni non le ha lette nessuno che le parli.** Otto lingue, 302
  chiavi. **Non si sblocca da dentro:** si riapre coi collaudatori stranieri.
  *Pesa di più da quando una notifica esce dal telefono da sola: una frase
  sbagliata in svedese non si corregge chiudendo la pagina.*
- **D4. Due limiti che arrivano lo stesso giorno**: oltre 200 annunci i più
  vecchi spariscono in silenzio, e le ricerche salvate non si potano mai (spie:
  `adsCapped`, `RICERCHE_TANTE`). *La strada probabile non è potare, è dirlo.*
- **D6/D7. Il mercatino non l'ha toccato nessuno con un dito**, e non è stato
  guardato in nessun tema dopo il 23/08, quando gli è cambiata anche la barra.
  **RINVIATA** *(30/08)*: si guarda quando riparte il lavoro sul mercatino, e
  fino ad allora non si propone.
- **D8. Quarantacinque stringhe nuove senza revisione** (25/08): stesso debito
  di D1, più piccolo. *Dal 29/08 ci sono anche le venti del calendario.*

### F — Nate con lo scambio della radice (25/08)

*Stato voluto, non lavoro aperto (era F4):* **chi ha un segnalibro sulla radice
trova la vetrina.** Un segnalibro vecchio non si distingue da una prima visita,
e chi arriva per la prima volta non ha una seconda occasione.

- **F1 = A5**, non un lavoro in più: `actionSettings()` manda ad `app.html` e un
  banco vede la riga, non il rimbalzo. **RINVIATA** con A5.
- **F2. La vetrina ha una URL sola per nove lingue.** *(La radice è indicizzata:
  verificato il 30/08.)* I nove `hreflang` puntano tutti lì, quindi le otto
  lingue non italiane non hanno pagine proprie da indicizzare come risultati
  distinti: servono nove URL vere.
- **F3. Le 702 stringhe della vetrina non le ha lette nessuno che le parli.**
  Stesso debito di D1, sulla pagina che si vede una volta sola nella vita.

### R — Il risanamento (19–20/09): pubblicare, poi guardare

Ramo `risanamento-post-audit`, **non su `main`, niente pubblicato**. Racconto,
conti dei banchi e cosa resta: `docs/RISANAMENTO-2026-09-19.md`.

- **R1. Pubblicare, in quest'ordine** (le regole stringono: regola 18, il sito
  prima). *(1)* `main` ← ramo: `app.html`, `sw.js`, `index.html`,
  `manifest.json`, `compagnie-data.js`, `_config.yml`, `.github/`, banchi.
  *(2)* Guardare che il sito vero sia la versione nuova
  (`node tests/controlla-base.js`). *(3)* `bash ~/pubblica.sh` (Functions
  `2026-09-20-dispositivi`). *(4)* Incollare in console `firestore.rules`
  `2026-09-20-dispositivi` e premere **Pubblica**.
- **R2. Col telefono in mano:** push (app chiusa, in background, aperta, due
  dispositivi) e tocco; orizzontale; Samsung con lo scuro forzato; avvio senza
  rete a giro aperto; tastiera aperta in chat e in fondo al profilo;
  `docs/` non piu' raggiungibile su arctrail3d.com.
- **R3. Il primo aggiornamento vero va guardato**: chi ha l'app installata passa
  da `v166` a `v167`, magari con un giro aperto. Il banco lo prova
  (`banco-salto-versione.js`, anche dalla `v156` del 29/08); la prima volta no.
- **R4. `tests/chiavi-compagnie.json` è un'istantanea di 4950 chiavi**: se
  l'elenco società viene rigenerato dice quali sono sparite **prima** che
  spariscano gli iscritti. Si aggiorna a mano, dopo aver guardato:
  `node tests/banco-chiavi-compagnie.js --scrivi`.

### E — Fuori dal codice

- **E1. Outreach ai club.** Prima i conosciuti, poi 20–25 email a mano al
  giorno. **Mai BCC di massa.** FIARC dopo aver avuto numeri d'uso veri.

## 4. Perché questo file esiste

*Un archivio che invecchia fa rifare lavoro già fatto.* Il racconto è in
`NOTE-DESIGN.md` (23/08/2026).

## 5. Le cose che non cambiano

- **I cinque tasti del punteggio sono identici in tutti i temi.** Memoria
  muscolare: è un comando di sicurezza, non una scelta di stile.
- **La pista non scorre.** `height:100dvh`, `overflow:hidden`.
- **La barra di firma mostra lo stato peggiore presente, mai la media.**
- **Nessun esadecimale fuori dai primitivi. Nessun `!important` fuori da stampa
  e movimento ridotto.**
- **Mai un'osservazione che i dati non reggono.** «A Fornasona tiri il 7% più
  alto» con nove giri su tre campi è rumore travestito da statistica.
- **Il metro di giudizio.** Norman: l'errore è del disegno, mai di chi tira.
  Ive: quasi sempre la mossa giusta è togliere. Zhuo: una regola che vive solo
  nelle note non è una regola. IDEO: finché non è provata al sole, in piedi, con
  una mano sola, è un'ipotesi. Material: i token li fa rispettare una macchina.
