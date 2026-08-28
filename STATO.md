# STATO — ArcTrail 3D

**Questo è l'unico file che si legge per intero, e si legge per primo.**
Dice cos'è vero oggi. *Perché* è così lo dicono gli archivi, che non si leggono
mai per intero: si cercano.

| file | mestiere | si legge |
|---|---|---|
| **STATO.md** *(questo)* | cos'è vero oggi | tutto, ogni sessione |
| **REGOLE-LAVORO.md** | come si lavora qui | tutto, ogni sessione |
| **NOTE-DESIGN.md** | perché l'app è così — archivio | si cerca |
| **NOTE-MERCATINO.md** | perché il mercatino è così — archivio | si cerca |

Aggiornato il **28/08/2026**, notte.

---

## 1. Dove stanno i file, e cosa è pubblicato

**Il 25/08 la radice è cambiata: `index.html` è la VETRINA, l'app è `app.html`.**
Chi legge questo file per la prima volta parta da qui, perché ogni riferimento
più vecchio di oggi chiama `index.html` l'app.

| file | cos'è | timbro | copia buona |
|---|---|---|---|
| `index.html` | la vetrina, porta di casa | `2026-08-27-identita` | **GitHub** |
| `app.html` | l'app | `2026-08-28-conferma` | **GitHub** |
| `compagnie-data.js` | le societa', 4912 in sette paesi | — | **GitHub** |
| `marketplace.html` | il mercatino | `2026-08-25-radice` | **GitHub** |
| `sw.js` | | `arctrail3d-v139` | **GitHub** |
| `favicon.ico` | l'icona per chi guarda da fuori | — | GitHub, caricata a mano |
| cinque `vetrina-*.webp` | le foto della vetrina | — | GitHub, caricate a mano |
| `index.js` | | — | GitHub *(si pubblica dal Cloud Shell)* |
| `firestore.rules` | | `2026-08-28-offerta` | **solo la console** — vedi C19 |
| diari, banchi, script | | — | il progetto, e nient'altro |
| `DOPPIE-TESSERE-ITALIA.md` | le 40 società italiane con due tessere | — | il progetto |

`vetrina.html` e `vetrina-anteprima.html` **non esistono più** (25/08).

**`controlla-base.js` confronta i TIMBRI, non il contenuto.** Succede: file
diversi, stesso timbro, e il banco dice IN PARI. **Prima di ogni consegna** si
scarica in `/tmp` e si confronta col `diff`. Il file di lavoro **non si
sovrascrive mai in automatico** (regola 2). *Un timbro nato da una versione mai
pubblicata è una cancellazione: due build non pubblicate si fondono in una.*

## 2. I banchi

`sh controlla-tutto.sh` — **~2,5 minuti**. I due cancelli (base, sintassi) in
fila e per primi; il resto **sei alla volta**. `PAR=1` li rimette in fila, ed è
la prima cosa da provare se un banco comincia a fallire in modo strano.

**Quanti sono lo dice il copione, non questo file** — un conto ricopiato in
prosa invecchia il giorno che si aggiunge un banco, e poi mente per settimane.
Per saperlo: `grep -c '^banco ' controlla-tutto.sh`.

**Non si lancia tutto per ogni ritocco.** Quanto girare, e quando, lo decidono
i tre livelli della regola 3 — veloce, normale, critico. Il giro completo resta
obbligatorio **prima di consegnare**, a ogni livello.

Al 28/08/2026: **passano tutti tranne `controlla-token.js`** (vedi C18). Se
un banco Playwright dice no su una macchina piccola, prima di aprire un file
si riprova con `PAR=1`: cinque su cinque erano carico, non difetti.
`banco-regole.js` sta **fuori** dal giro: vuole l'emulatore Firestore. In una chat nuova può mancare `jsdom`:
`npm install jsdom`. Se poi playwright dice che il browser non esiste, la copia
locale è senza browser: si allinea la versione di `playwright` a quella del
browser presente in `/opt/pw-browsers` invece di scaricarne uno nuovo.

**Il 25/08 quattro banchi erano rotti o ciechi, e la colpa era del banco**
(uno non partiva, uno era fuori dal giro, uno faceva la domanda sbagliata, uno
la faceva dal lato sbagliato). *Da lontano si somigliano tutti: dicono di sì.*

**Il guardiano dello stile non è a zero, ed è normale.** Il tetto in
`tetto-token.json` non sale mai, e scende da solo quando una regola migliora.
I numeri li stampa lui: **qui non si ricopiano.**

## 3. Cosa è aperto

Numerate. Il numero non cambia mai: quando una voce si chiude si **cancella**,
e il racconto resta nell'archivio.

### A — Si chiude solo con un telefono in mano, e non da questa parte

Il **punto 0**: sole in faccia, in piedi, una mano sola. Un banco prova lo
*stato*, mai la *percezione*.

- **A1. Un giro vero, intero.** Restano non provate **le due ore**
  (ventiquattro piazzole camminando) e **la seconda firma**: da solo la regola
  *una firma vale se qualcuno ha visto* non è mai stata esercitata.
- **A2. I colori al sole.** Il tema Sole (27/08) porta gli accenti del tema
  scuro su bianco. **Costo dichiarato e mai provato in piena luce:** verde
  scritto 2,66, oro 2,55, numerone arancione 3,33 — sul numerone non conta,
  sulle scritte piccole sì. *Se al sole il verde spinge, si scende di luce, non
  si cambia tinta.* Restano il **tema scuro** col verde prato e le **fasce
  velate**, che è poca luminanza e in piena luce sparisce.
- **A3. La pista, in piedi.** È la schermata che si giudica camminando, ed è
  ferma apposta: cambiarla da questa parte dello schermo è quello che il
  punto 0 vieta.
- **A5. Il ritorno dal link di verifica.** L'indirizzo lo prova il banco; che il
  dominio sia autorizzato in Firebase lo dice solo una registrazione vera.
- **A6. Il pollice.** Filtri allenamenti, dito sul grafico (largo dieci punti),
  striscia schede admin, barra in fondo: a scrivania sembrano ovvie.

### B — Aspettano una decisione di Alessandro, non una correzione

- **B1. Il giro aperto si comanda da tre punti** — «Riprendi» in cima, «Azzera»
  in fondo, `resume-banner` nella scheda Tira, che è un doppione e dice la
  stessa cosa peggio. Unirli è giusto su carta, ma la distanza fra Riprendi e
  Azzera è una protezione: un comando distruttivo accanto a quello che si preme
  sempre si tocca per sbaglio.
- **B3. La richiesta di gestione compagnia non chiede nessuna prova.**
  *Scritta tre volte negli archivi, mai decisa.*
- **B4. Il verde della testata e del marchio.** Tutto è passato al tinto il
  23/08; testata e marchio no, perché sono identità e non fondo.
- **B6. `.btn-arancio` è a 2,79:1**, sotto soglia. Regge perché è grande e grassetto. La strada è quella del 25/08: si abbassa la luce **e** si gira l'inchiostro sul crema, non si toglie colore. Resta una decisione.
- **B8. I dati che il referente scrive non li vede nessuno.** L'etichetta dice
  «Compaiono agli arcieri nella scheda della compagnia»; la scheda invece
  prende tutto da `compagnie-data.js`. Referente, `tel`, `indirizzo` e `note`
  non compaiono da nessuna parte — l'unico usato è `emailComp`, per il tasto
  mail della segnalazione. *L'app promette una cosa che non fa.* Alessandro
  (25/08): i dati restano come sono, si sistema **come si vedono**.
- **B9. Le note della compagnia sono un riquadro senza forma**, leggibile da
  chiunque: giusto per accesso e orari, non per un cellulare privato o un dato
  su un minore. Si cura con un avviso sopra il campo, non con una regola.
- **B10. Il guscio è passato da 1060 a 1200px** (25/08): ogni schermata da
  computer è 140px più larga. Misurato, ma **mai visto su un monitor vero**.
- **B12. Le date degli assetti si registrano e non si vedono.** `creato` e
  `archiviatoIl` esistono dal 25/08. Mostrarle costa due etichette in nove
  lingue.
- **B13. La cartolina del risultato.** Chiesta il 25/08, **non iniziata**: funzione nuova, ~60 stringhe. Il «Condividi» di oggi manda la scheda del GRUPPO — la cartolina personale è un altro oggetto, non una correzione di quello.
- **B7. Il tinto dice ancora abbastanza?** Tre tasti tinti e nessuno pieno
  lasciano l'occhio senza un punto di partenza. Si vede col pollice, non a
  scrivania.
- **C17. Due code del ridisegno chat.** *(a)* Segnala e Blocca stanno in cima e
  spostarli tocca un obbligo per gli store. *(b)* La riga di scrittura tocca
  `.input-field`, che vive in tutta l'app.
- **C16. Nessun banco misura un'altezza sullo schermo.** `banco-bordi.js` misura
  i margini, ma nessuno guarda se le tre porte di Tira sono alte uguale — cosa
  che il 23/08 ha scoperto Alessandro guardando l'app.

### C — Lavoro tecnico

- **C1. La classifica per divisione e la gara staccata dal formato** sono **un
  lavoro solo**: aspettano *il giro che sa da quale gara viene*. Gli arcieri
  sono `{id, name}` e la classifica non ha da dove prendere le sigle. **Il
  lavoro è quel collegamento, non la tabella.**
- **C2. Il token FCM si rinnova solo aprendo l'app**, e a app chiusa le notifiche
  smettono. **La cura ovvia non esiste:** nel service worker non c'è `getToken`
  né `currentUser`. O si *misura* quanto spesso scade, o si *esce da FCM*.
- **C3. La chat dell'allenamento attacca un ascoltatore a ogni ridisegno e non lo stacca mai** (`loadOtMsgs`).
- **C4. La chat dell'allenamento si ferma a 50 messaggi** e non ha un conto dei
  non letti: l'unico segnale è entrare a guardare.
- **C6. Chi entra con Google passa la porta al primo giro:** `approved:false` ma `authState = "ready"`. **C7.** Gli avvisi scritti dal server sono in italiano, tutte e sette le funzioni.
- **C8. Paese e federazione vivono solo in `localStorage`**: ogni browser nuovo
  li richiede. Vanno fatti scendere dal profilo dopo l'accesso.
- **C9. Il campo del giro è testo libero.** «Cerrione» e «Fornasona, Cerrione»
  sono lo stesso posto. *Un giro nato da un allenamento aperto conosce già il
  campo e lo chiede lo stesso: è il primo posto dove togliere la domanda.*
- **C18. Il tetto dei token è stato misurato da orbo.** Riparato il guardiano
  (27/08), sono comparse quattro regole «peggiorate» che peggiorate non sono:
  stavano nei blocchi di stile che prima non leggeva. *Il debito c'era già; si
  è aperto l'occhio.* Il tetto non si alza: le righe stanno quasi tutte in
  `arctrail-tira-mockup-fedele-v1` e `home-compatta-v2`. Finché non è fatto
  **il giro completo non passa.**
- **C19. Le regole nuove sono SCRITTE, non pubblicate e non provate.**
  `app.html` e `sw.js` sono online e **visti funzionare** (28/08). Resta il
  passo che nessuna chat può fare: incollare `2026-08-28-offerta` in console e
  premere *Pubblica*. Il database gira ancora con `2026-08-21-profilo-pubblico`
  — `2026-08-28-verificata` è su GitHub e **non è mai stata attiva**, quindi
  il salto è diretto. `banco-regole.js`, 68 prove, **non è mai stato eseguito**:
  l'emulatore da qui non si scarica. Finché non gira, sono intenzioni.
- **C10. Container query per le schede.** Metà fatto: sulla pagina, non sulle
  schede dentro le schermate.
- **C11. Un solo alfabeto di icone.** Restano emoji sparse: si disegnano diverse
  su ogni telefono, quindi il marchio non controlla come appaiono.
  `navIcon()` e `ICON_PATHS` esistono già.
- **C12. Il marchio in SVG.** I file hanno il **verde vecchio dentro i pixel**:
  non si ritingono con un token. Sagoma di animale, non un
  altro bersaglio ad anelli.
- **C13. Il bianco durante la lettura del file.** `app.html` è oltre un megabyte: fra la prima riga e `DOMContentLoaded` `#app` è vuoto, e le cure fatte coprono l'attesa della *rete*, non della *lettura*.
- **C15. L'elenco «Scopri» non ha una ricerca**, e `compagnie-data.js` ha qualche provincia sbagliata. Non è codice: è l'elenco.

### D — Mercatino

- **D1. Le traduzioni non le ha lette nessuno che le parli.** Otto lingue, 302
  chiavi. **Non si sblocca da dentro:** si riapre coi collaudatori stranieri.
  *Pesa di più da quando una notifica esce dal telefono da sola: una frase
  sbagliata in svedese non si corregge chiudendo la pagina.*
- **D2. Nessuno ha visto arrivare un avviso su un telefono vero.** La funzione
  decide bene (`banco-avvisi.js`); deploy, regola e push non sono mai stati
  **visti funzionare**. Si prova in due: uno salva «hoyt», l'altro lo pubblica.
- **D3. Il mercatino è chiuso a chi non ha `betaTester: true`**, ed è voluto: si
  accende dal pannello. *Da fuori chiusura e guasto si somigliano molto.*
- **D4. Due limiti che arrivano lo stesso giorno**: oltre 200 annunci i più
  vecchi spariscono in silenzio, e le ricerche salvate non si potano mai. Spie:
  `adsCapped`, `RICERCHE_TANTE`. *Una ricerca scritta male non trova niente e
  non lo dice: la strada probabile non è potare, è dirlo.*
- **D6/D7. Il mercatino non l'ha toccato nessuno con un dito** (vale A1), e non
  è stato guardato in nessun tema dopo il 23/08 — il 25/08 gli è cambiata anche
  la barra. **La cosa più urgente da guardare col telefono.**
- **D8. Quarantacinque stringhe nuove senza revisione** (25/08): i titoli degli
  stati vuoti in nove lingue. Stesso debito di D1, più piccolo.

### F — Nate con lo scambio della radice (25/08)

- **F1. Il ritorno dalla mail.** `actionSettings()` manda ad `app.html`, e si
  prova solo **con un telefono e una casella di posta**: un banco vede la
  riga, non il rimbalzo vero.
- **F2. La vetrina non è indicizzata.** I nove `hreflang` puntano alla radice,
  ma è una pagina sola: le otto lingue non italiane restano invisibili finché
  non si generano nove pagine vere.
- **F5. Google mostra ancora il marchio vecchio: si aspetta e basta.** Il 27/08 identità e riscansione sono a posto e viste funzionare. **Nessuno può fare altro:** si chiude quando la Search Console dice «ultima scansione» dopo il 14/08.
- **F3. Le 702 stringhe della vetrina non le ha lette nessuno che le parli.**
  Stesso debito di D1, sulla pagina che si vede una volta sola nella vita.
- **F4. Chi ha un segnalibro sulla radice trova la vetrina.** Voluta: un
  segnalibro vecchio non si distingue da una prima visita, e fra i due chi
  arriva per la prima volta non ha una seconda occasione.

### E — Fuori dal codice

- **E1. Outreach ai club.** 663 club FIARC in `compagnie-data.js`. Prima i club
  conosciuti, poi 20–25 email a mano al giorno. **Mai BCC di massa.** FIARC dopo
  aver avuto numeri d'uso veri.

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
