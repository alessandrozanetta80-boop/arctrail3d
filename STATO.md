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

Aggiornato il **30/08/2026**.

---

## 1. Dove stanno i file, e cosa è pubblicato

**Dal 25/08 `index.html` è la VETRINA e l'app è `app.html`:** ogni riferimento
più vecchio chiama `index.html` l'app.

| file | cos'è | timbro | copia buona |
|---|---|---|---|
| `index.html` | la vetrina, porta di casa | `2026-08-29-sfsf` | **GitHub** |
| `app.html` | l'app | `2026-08-30-ritorno` | **GitHub** |
| `compagnie-data.js` | le societa', 4912 in sette paesi | — | **GitHub** |
| `marketplace.html` | il mercatino | `2026-08-25-radice` | **GitHub** |
| `sw.js` | | `arctrail3d-v157` | **GitHub** |
| `favicon.ico` | l'icona per chi guarda da fuori | — | GitHub, caricata a mano |
| cinque `vetrina-*.webp` | le foto della vetrina | — | GitHub, caricate a mano |
| `index.js` | | — | GitHub *(si pubblica dal Cloud Shell)* |
| `firestore.rules` | | — | GitHub **e** console Firebase |
| diari, banchi, script | | — | il progetto, e nient'altro |
| `DOPPIE-TESSERE-ITALIA.md` | le 40 società italiane con due tessere | — | il progetto |

`vetrina.html` e `vetrina-anteprima.html` **non esistono più** (25/08).

**30/08/2026 — Alessandro conferma che le Cloud Functions e le regole Firestore
attive sono aggiornate rispetto al lavoro corrente.** Quindi **non si richiede
conferma di deploy o pubblicazione** nelle sessioni che non toccano `index.js` o
`firestore.rules`. Se uno dei due cambia, torna a valere la regola 9 e il nuovo
stato va verificato.

**`controlla-base.js` confronta i TIMBRI, non il contenuto:** file diversi con
lo stesso timbro e il banco dice IN PARI. **Prima di ogni consegna di un FILE DEL
PRODOTTO si confronta col `diff` la copia online del file toccato.** Il **MICRO
DOCUMENTALE è escluso** (regola 3-bis). Il file di lavoro **non si sovrascrive
mai in automatico** (regola 2). *Un timbro nato da una versione mai pubblicata è
una cancellazione.*

## 2. I banchi

`sh controlla-tutto.sh` — **~2,5 minuti**. I due cancelli (base, sintassi) in
fila e per primi; il resto **sei alla volta**. Un rosso nel parallelo si tratta
con la **regola 23** di `REGOLE-LAVORO.md`.

**Quanti sono lo dice il copione, non questo file:**
`grep -c '^banco ' controlla-tutto.sh`.

**Non si lancia tutto per ogni ritocco.** Quanto girare, e quando, lo decidono
i tre livelli della regola 3 — **MICRO, STANDARD, CRITICO**. Nel MICRO il giro
completo non si fa; prima di consegnare è obbligatorio **dallo STANDARD in su**.
*(Allineato alla regola 3 il 29/08: qui c'era scritto «a ogni livello».)*

**«Tutti passati» al 26/08/2026 è una fotografia di quel giorno, non il
risultato di oggi:** il risultato corrente lo dà l'ultima esecuzione, e C24
rende il giro in parallelo inaffidabile come fotografia singola. I banchi
citati in C24 passano quando sono lanciati da soli.

In una chat nuova può mancare `jsdom`:
`npm install jsdom`. Se poi playwright dice che il browser non esiste, la copia
locale è senza browser: si allinea la versione di `playwright` a quella del
browser presente in `/opt/pw-browsers` invece di scaricarne uno nuovo.
E se la rete del contenitore blocca `gstatic.com`, **`banco-porta` non può
passare**: senza Firebase l'app su stato vergine disegna — giustamente —
«Connessione non riuscita». Non è un rosso dell'app: si prova da una macchina
con la rete vera. *(Verificato il 30/08.)*

**Il guardiano dello stile non è a zero, ed è normale.** Il tetto in
`tetto-token.json` non sale mai. I numeri li stampa lui: **qui non si ricopiano.**

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
- **C2. Il token FCM si rinnova solo aprendo l'app**, e a app chiusa le notifiche
  smettono. **La cura ovvia non esiste:** nel service worker non c'è `getToken`
  né `currentUser`. O si *misura* quanto spesso scade, o si *esce da FCM*.
- **C3. La chat dell'allenamento attacca un ascoltatore a ogni ridisegno e non lo stacca mai** (`loadOtMsgs`). **C4.** Si ferma a 50 messaggi e non ha un conto dei non letti: l'unico segnale è entrare a guardare.
- **C6. Chi entra con Google passa la porta al primo giro:** `approved:false` ma `authState = "ready"`. **C7.** Gli avvisi scritti dal server sono in italiano, tutte e sette le funzioni.
- **C8. Paese e federazione vivono solo in `localStorage`**: ogni browser nuovo
  li richiede. Vanno fatti scendere dal profilo dopo l'accesso.
- **C9. Il campo del giro è testo libero.** «Cerrione» e «Fornasona, Cerrione»
  sono lo stesso posto. *Un giro nato da un allenamento aperto conosce già il
  campo e lo chiede lo stesso: è il primo posto dove togliere la domanda.*
- **C10. Container query per le schede.** Metà fatto: sulla pagina, non sulle
  schede dentro le schermate.
- **C11. Un solo alfabeto di icone.** Restano emoji sparse: si disegnano diverse
  su ogni telefono, quindi il marchio non controlla come appaiono.
  `navIcon()` e `ICON_PATHS` esistono già.
- **C12. Il marchio in SVG.** I file hanno il **verde vecchio dentro i pixel**:
  non si ritingono con un token. Sagoma di animale, non un
  altro bersaglio ad anelli.
- **C13. Il bianco durante la lettura del file.** `app.html` è oltre un
  megabyte: fra la prima riga e `DOMContentLoaded` `#app` è vuoto — le cure
  fatte coprono l'attesa della *rete*, non della *lettura*.
- **C15. L'elenco «Scopri» non ha una ricerca**, e `compagnie-data.js` ha qualche provincia sbagliata. Non è codice: è l'elenco.
- **C16. Nessun banco misura un'altezza sullo schermo.** `banco-bordi.js` misura
  i margini; che le tre porte di Tira siano alte uguale l'ha scoperto Alessandro
  guardando l'app.
- **C17. Due code del ridisegno chat.** *(a)* Segnala e Blocca in cima: spostarli
  tocca un obbligo per gli store. *(b)* La riga di scrittura tocca
  `.input-field`, che vive in tutta l'app.
- **C21. Nessun controllo dice «questo nome di classe è già di qualcun
  altro».** Il 28/08 `.prof-testa` è stata riusata per la testa del profilo ed
  esisteva già nella schermata di modifica: la carta d'identità si è disegnata
  tutta su una riga. `controlla-token.js` sa dire il contrario — classe
  nominata dal JS e mai definita — non questo. Visto fotografando.
- **C23. Quattro versioni senza una voce propria**, verificate il 30/08:
  `2026-08-28-sito` e `2026-08-28-nfas-fonte` citate solo come genitori,
  `2026-08-29-freeze` citata solo come genitore di `2026-08-29-verifica`,
  `2026-08-29-locale` che negli archivi non compare. **Nessuna è ricostruibile
  dai file:** restano dichiarate, non raccontate. E le cinque pagine SEO dei
  regolamenti stanno nel `sitemap.xml` e in nessun archivio.
- **C24. In parallelo qualche banco dice no, e ogni giro e' un banco diverso.**
  Primo giro: `banco-finale`. Secondo: `banco-giro-sicuro` e `banco-regolamenti`.
  Lanciati da soli passano tutti e tre, 94 prove su 94. *Un insieme che cambia
  a ogni giro non e' un difetto del prodotto: e' il parallelo.* Un giro che dice
  no a caso insegna a ignorarlo, ed è il modo in cui un banco vero passa
  inosservato. **La procedura è la regola 23 di `REGOLE-LAVORO.md`.**
- **C25. Il calendario mostra dieci gare inventate, e lo dichiara in cima.**
  `calEventi()` è l'unica giuntura, `calUrlSicuro()` vaglia già gli indirizzi.
  Il cartello si toglie **nella stessa mossa** in cui entra il primo feed.
  *Con diciassette federazioni le pastiglie diventano una parete: si ripensa
  coi dati veri davanti.* **«La mia regione» resterà un filtro per regione
  finché non ci saranno coordinate: il nome vero di «vicino» costa i dati, non
  il codice.**
- **C30. Il guardiano dello stile è rosso sull'online, non solo qui.**
  Verificato il 30/08 sul file `2026-08-29-verifica` intatto: 35 `!important`
  (tetto 3), 4 `clamp()` su un carattere (tetto 0), tutti dal blocco
  «Controlla la tua email» del 29/08 (righe ~5196–5374). *Il tetto non sale
  mai: è il blocco che va rifatto coi token.* Finché resta, nessun giro
  completo può dire «tutti passati».

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
