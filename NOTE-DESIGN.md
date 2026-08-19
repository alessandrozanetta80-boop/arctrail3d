# ArcTrail 3D — note di design (aggiornate al 17/08/2026)

Documento di lavoro. Serve a chi riprende il progetto per sapere **cosa è
stato deciso e perché**, senza doverlo dedurre dal codice.

---

## Come si lavora qui — leggere per primo

*Scritto il 15/08/2026, perché era già stato detto a voce e si era già dovuto
ripetere.*

**Questo documento è la memoria del progetto.** Chi lo legge — me compreso, in
una chat nuova — **non ricorda niente della chat precedente**. Non c'è
continuità fra una conversazione e l'altra: c'è solo questo file e il codice.
Quindi ogni decisione presa a voce va scritta qui, altrimenti la volta dopo va
ridetta da capo. È già successo.

**A fine chat si riconsegnano TUTTI i file, sempre.** Dal 16/08 sono **sei**:
`index.html`, `NOTE-DESIGN.md`, `controlla-token.js`, `banco-firme.js`,
`tetto-token.json` e `prova-schermo.js` —
anche quelli non toccati, anche se sembra spreco. Chi lavora da telefono non
può tenere insieme una cartella pezzo per pezzo, e un file dimenticato non si
nota: si nota due giorni dopo, quando il guardiano gira senza tetto o il banco
non c'è. **Riconsegnare tutto costa niente; riconsegnare cinque su sei
costa una chat.** Se un file non è cambiato, si dice — ma si dà lo stesso.

**Le note non si discutono, si eseguono.** Le decisioni scritte qui sono prese.
Rimetterle in discussione da una chat nuova — magari con argomenti buoni — non
è utile: fa perdere tempo e fa dubitare del lavoro già fatto. Se leggendo il
codice si trova che *non fa quello che le note dicono*, quello va segnalato e
corretto; ma è lavoro rimasto indietro, non un errore di ragionamento.

**L'obiettivo, per intero:** l'app per il tiro con l'arco 3D più bella del
mondo. Impeccabile tecnicamente ed esteticamente. Non un segnapunti che
funziona: il migliore che esista.

**Il metro di giudizio.** Ogni scelta va guardata come la guarderebbero
insieme Jony Ive, Don Norman, Julie Zhuo, e studi come IDEO, Huge, R/GA,
EL Passion, Cubix e il gruppo di Material Design. In pratica, e in ordine:

1. *Norman* — l'errore è del disegno, mai di chi tira. Se serve un'istruzione,
   il disegno non c'è ancora.
2. *Ive* — quasi sempre la mossa giusta è **togliere**. Vedi il pannello
   sagoma, le 95 schermate di passaggio, le tre ripetizioni per freccia.
3. *Zhuo* — il documento non è il prodotto. Una regola che vive solo nelle
   note non è una regola.
4. *IDEO* — finché non è stata provata al sole, in piedi, con una mano sola,
   è un'ipotesi. *(Fino al 16/08 questa riga diceva «col guanto». Il guanto
   non lo usa nessuno: era un'immagine presa da un altro sport, ripetuta per
   dieci pagine perché suonava bene. Una prova sbagliata è peggio di nessuna
   prova, perché dà la stessa tranquillità senza il lavoro. Le condizioni vere
   sono tre: **sole in faccia, in piedi, una mano sola** — l'altra tiene
   l'arco.)*
5. *Material* — i token li fa rispettare una macchina, non la buona memoria.

**Come si risponde.** Frasi corte, italiano semplice, niente elenchi di
considerazioni. Se c'è del lavoro da fare **si fa sul file**, non si descrive.
Prima il fatto, poi (se serve) due righe di spiegazione.

**Il resoconto di fine lavoro ha una forma, e sono tre domande.**
*(Regola nuova, 16/08/2026, e nasce da una lamentela giusta: «non capisco mai
cosa dici, non capisco se è positivo o negativo, se i file migliorano».)*

1. **Cosa fa l'app oggi che ieri non faceva** — detto da fuori, come lo
   racconterebbe un arciere, non come lo racconta il codice. *«Ogni iscritto
   ha Classe e Categoria, e se scrivi un codice di compagnia sbagliato te lo
   dice in rosso»*, non *«la riga porta due `<select>` e un `aria-label`»*.
2. **Cosa è andato storto, e se è ancora storto** — questa è la parte che si
   sbaglia sempre. Raccontare un errore trovato **e corretto** con lo stesso
   tono di uno rimasto aperto fa sembrare grave una cosa risolta. Quindi si
   dice sempre **in che stato è finito**: risolto, o aperto e allora dove.
3. **Cosa resta da fare**, in ordine.

**E si dice se il giro è andato bene o male, con parole, non con i numeri.**
Il guardiano e i banchi stampano cifre; le cifre non sono la risposta. La
risposta è *«nessun peggioramento, tutte le prove passate»* — poi, sotto, le
cifre per chi le vuole.

**Il gergo di questo documento non esce da questo documento.** *Firma muta*,
*ridisegno mirato*, *il banco*, *il guardiano*, *la cricca si stringe*: qui
sono nomi utili, in un resoconto sono un muro. Fuori si dice cosa fanno.

---

## Il sistema di stile: tre strati, e nient'altro sopra

Il foglio di stile in `index.html` è organizzato così:

1. **PRIMITIVI** — i colori esistono, non hanno ancora un mestiere
   (`--green-800`, `--clay-600`, `--sand-200`, `--moss-800`…)
2. **RUOLI** — l'unico vocabolario che i componenti possono usare
   (`--surface`, `--surface-1`, `--text-1/2/3`, `--border`, `--border-strong`,
   `--brand`, `--clay`, `--gold-role`, `--elev-1/2/3`, `--focus-ring`…)
3. **ALIAS** — i vecchi nomi (`--bg`, `--cream`, `--line`, `--accent`…)
   rimappati sui ruoli, così il CSS scritto prima continua a funzionare.

**Cambiare tema = riscrivere la mappa dei ruoli.** Zero regole di componente.

### Regole non negoziabili

- Un componente **non nomina mai un esadecimale**. Se serve una tinta nuova,
  si aggiunge ai primitivi. *L'ultima violazione era il segno d'impatto sulla
  sagoma, un `#1d5fd1` scritto a mano dentro `drawMarker()`: nel tema scuro
  era blu sopra la zona sagoma, cioè invisibile proprio dove serviva. Ora è
  alone chiaro + nucleo scuro, il doppio tratto della cartografia, che regge
  su qualunque fondo. Le due eccezioni rimaste sono lì di proposito.*
- **Niente `body.theme-light .qualcosa`.** Se un componente ha bisogno di un
  valore diverso per tema, quel valore diventa un token. Ne restano due sole
  in tutto il file, ed è già troppo.
- **Niente `!important`** fuori da stampa e `prefers-reduced-motion`.
- **Niente stile in linea dal JS** per cose che il CSS può fare. Lo stile in
  linea vince sul foglio di stile, e per riprendersi il controllo servono
  catene di `!important`: è così che era nato il bug della sezione attiva
  verde-su-verde, illeggibile.
- **Quello che deve sopravvivere a un ridisegno si dichiara nel markup, non
  si indovina nel JS.** Vedi *Continuità*, più sotto.
- **Scala 4 / 8 / 12 / 16 / 24 / 32 / 48** (`--s-1`…`--s-7`). Nessun 6,
  nessun 7, nessun 13. Se una misura non ci sta, si cambia il disegno.
- **Raggi**: `--r-sm/md/lg/xl/pill`. **Bersaglio minimo**: `--hit` (44px).
- **Movimento**: una curva (`--ease`), tre durate (`--dur-1/2/3`).
  **Nessuna animazione a ciclo infinito.** Il movimento racconta un cambio di
  stato; se non c'è un cambio, non deve muoversi niente.

### Caratteri *(rivisti il 15/08/2026)*

Due famiglie, tre mestieri:
- **Fraunces** (`--font-display`) → marchio, titoli, e la cifra della piazzola
  quando comanda la scena. Niente altro: **mai su un dato**.
- **Inter** (`--font-ui`) → tutto il resto
- **Inter tabular con zero barrato** (`--font-num`,
  `font-variant-numeric:tabular-nums slashed-zero`) → **ogni cifra**

**Perché Outfit se n'è andato, ed è lo stesso errore di Playfair commesso in
un altro modo.** Playfair era stato tolto perché è un Didone ad aste
sottilissime: al riverbero le aste spariscono e un 8 diventa un 3. Outfit è un
geometrico: le sue cifre sono costruite sul cerchio, quindi **0, 6, 8 e 9 sono
quasi la stessa forma** e si distinguono solo per un dettaglio piccolo. Di
sfuggita, al sole, in piedi, quel dettaglio non c'è. Due caratteri scelti
per come stanno fermi in una schermata, non per come si leggono in mezzo
secondo — e questa è un'app che scrive numeri per due ore.

Inter è disegnato per gli schermi e per i corpi piccoli: aperture larghe,
occhio grande, cifre tabulari vere. **Lo zero barrato** non è un vezzo: è
l'unica cifra che si confonde con una lettera, e uno `0` sul tasto accanto
alla `O` di SPOT non deve essere una domanda.

L'obiezione onesta a Inter: è il carattere d'interfaccia più usato al mondo,
quindi non aggiunge niente all'identità. **Va bene così.** L'identità la porta
Fraunces, che è distintivo e raro; il carattere d'interfaccia deve sparire e
lasciar leggere. Un carattere che si fa notare mentre segni un punteggio sta
lavorando contro di te.

---

## La pista: la schermata del percorso *(rifatta, 15/08/2026)*

**La regola, e da questa discende tutto il resto: questa schermata non
scorre.**

Il conto che l'ha decisa: un percorso FIARC sono 24 piazzole × 3 frecce = 72
tiri per arciere. In quattro fanno **288 tocchi di punteggio**. Un gesto che
si ripete 288 volte non può stare in fondo a una pagina lunga 1150px, sotto
un timer che non stai usando e sopra una sagoma mezza fuori schermo.

`#app` diventa una colonna flessibile — e **solo** su questa schermata, via
`body.schermo-percorso` — così `.pista-spazio` assorbe l'avanzo e la tastiera
resta in fondo **senza `position:fixed`**. Niente livelli sovrapposti, niente
`padding-bottom` da compensare a mano: è il flusso normale, in una colonna
che non scorre.

### Le decisioni, in ordine di importanza

**La gerarchia era invertita, e la correzione era troppo secca**
*(rivista il 15/08/2026, dopo il primo giro su un telefono vero)*. L'elemento
più grande era il numero della piazzola: l'informazione che l'arciere già
possiede, perché è dipinta sul paletto. Era stato sostituito dal nome di chi
tira — il dato che cambia in continuazione ed è l'unico che si sbaglia.

Vero, **quando ci sono altri**. Da solo il nome non cambia mai, la fila dei
turni non viene nemmeno disegnata, e l'elemento più grande dello schermo
diventa l'unica informazione con valore zero: *se tiro da solo so come mi
chiamo.* E il paletto non c'è sempre: in allenamento a formato libero le
piazzole le hai decise tu, non sono dipinte da nessuna parte — lì il numero è
l'unica cosa che dice a che punto sei.

**Quindi la regola non è fissa, è condizionale: comanda quello che cambia.**

| | protagonista | l'altro |
|---|---|---|
| **da solo** | la piazzola, `7 / 14` | il nome non compare affatto |
| **in gruppo** | il nome | la piazzola, contatore in testata |

Il posto sullo schermo resta lo stesso: cambia chi lo occupa, e cambia una
volta sola a inizio giro. La memoria muscolare non ne soffre. E il numero si
dice **una volta sola**: se comanda la scena, la testata tiene la sola barra.

**Fraunces non va su uno username.** È un carattere da titoli, con grazie e
contrasto forte: un nome proprio lo regge, «Ale_01Verb» diventa la copertina
di un libro. Nella scena il nome sta in Outfit, e Fraunces torna al mestiere
che queste note gli avevano dato — marchio e titoli — più la cifra della
piazzola, che è un titolo anche lei.

**Le schermate di passaggio non ci sono più.** Erano 96 per giro, e riusavano
lo stesso `.card.target-stage` della schermata di tiro: cambiavano stato
senza cambiare forma, quindi bisognava *leggere* per sapere dove si era.
`registerShot()` ora avanza in linea; a dire di chi è il turno è la fila dei
cerchi dentro la scena — pieno = fatto, contornato = tocca a lui, tratteggiato
= aspetta. Lo diceva già mentre segnavi il precedente.

**Resta una sola sosta: la fine del giro.** È l'unica dove c'è davvero
qualcosa da decidere (vedere il finale, oppure `+ aggiungi piazzola` in
allenamento a formato libero), e per questo `targetTransitionScreen()` è
rimasta viva. `archerTransitionScreen()` era **codice morto**, lasciata lì di
proposito per un rilascio: **tolta il 15/08/2026**.

**L'annulla si è spostato accanto all'errore.** Era in fondo a 1150px di
pagina mentre lo sbaglio era in cima. Ora è una striscia che compare dopo
ogni freccia (`state.lastShotInfo`) e sparisce quando la si usa. È la
sostituzione della conferma: si segna e si va avanti, il rimedio resta a
vista. *Era il punto "Annulla invece di conferma" della lista in pausa: non
era un lavoro a parte, era la stessa cosa.*

**La striscia dichiara l'unità** *(15/08/2026)*. `lastShotInfo.score` voleva
dire due cose diverse a seconda di chi lo scriveva: la **freccia** in
`registerShot`, il **totale** in `finishTargetEarly`. A schermo, chiusa una
piazzola da 15+10+5, il cerchio del turno diceva `30` e la striscia
`Ultimo: Anna 5`: due numeri per la stessa persona nello stesso istante,
risolvibili solo sapendo quale dei due era un totale. Adesso il campo porta
con sé `unit` (`"freccia"` / `"piazzola"`) e `n`, e la striscia legge
`Anna · 3ª freccia 5` oppure `Anna · piazzola chiusa 30`.
Il tasto resta **uno solo** — `Annulla freccia` — perché l'azione è una
sola: si toglie sempre l'ultima freccia, anche a piazzola appena chiusa.
Se `unit` manca (giro salvato da una versione precedente) si ricade sulla
vecchia stringa `pista_ultimo`, quindi nessun giro in corso si rompe.

**La striscia dichiara anche il luogo** *(15/08/2026, secondo giro)*. Stessa
ambiguità dell'unità, un livello più su. Chiusa l'ultima piazzola,
`registerShot` chiama `advanceToNextTarget()` e si avanza subito; ma
`advanceToNextTarget` azzera `state.panel` e **non** `state.lastShotInfo`.
Risultato: la testata dice `Piazzola 14 / 24` e la striscia dice
`Dino · 3ª freccia 5`, che è la 13.

La correzione ovvia — azzerare il campo — è quella sbagliata. `undoLastShot()`
sa già tornare indietro: ripristina l'ordine con `orderForTarget(targetNum)`,
riapre l'ultima entry e rimette le frecce in `pendingArrows`. E il caso in cui
serve è fra i più frequenti: ci si accorge dell'errore camminando verso il
bersaglio dopo. Azzerare toglierebbe il rimedio proprio dove serve.

Quindi il campo dichiara anche il **dove**: `lastShotInfo.target` accanto a
`unit` e `n`, e la striscia lo stampa **solo** quando è diverso da
`state.target` — `Dino · 3ª freccia (piazzola 13)`. La regola generale:
**il rimedio dev'essere adiacente all'errore nello spazio e nel tempo.** Lo
spazio era risolto; il tempo no (vedi sotto).

**Il timer si mette in pausa, non si distrugge** *(15/08/2026)*. Era il punto
peggiore della schermata: un tocco solo azzerava il conto, senza conferma e
senza rimedio, nella stessa schermata che dedica un'intera striscia a rendere
annullabile un punteggio. Adesso vale la stessa asimmetria dell'annulla: il
tocco sulla pastiglia mette in pausa — non si perde niente — e un secondo
tocco riprende. **Azzerare è un comando a parte**, che compare nella riga sotto
la pastiglia solo a conto fermo, insieme a *Riprendi*. A timer scaduto resta il
solo *Azzera*, perché non c'è più niente da riprendere.

**La barra in alto non offre uscite durante il giro** *(15/08/2026)*. La regola
«capienza 2 + troppo-pieno» limita **quante** azioni, non **quali**: durante un
giro la barra teneva notifiche e messaggi, con i loro contatori di non letti,
nel menu dell'ultimo tasto — e tutti e quattro i comandi su schermo largo. La
schermata che ha tolto 95 interruzioni non può tenere in alto due porte
d'uscita con un pallino rosso addosso: un pallino non è un'informazione, è una
richiesta. **Durante il giro la barra porta marchio, uscita e segnalazione, e
nient'altro.** I messaggi aspettano: a differenza della freccia appena tirata,
non scadono. Con `homeOverride` (si sta guardando il menu a giro aperto)
tornano, perché lì la schermata è un'altra.

**La tastiera: mai più di tre tasti per riga.** Il vincolo che costringeva
l'etichetta a `clamp(0.5rem, …)` — otto pixel, in maiuscoletto, sul controllo
più importante dell'app, pensato per essere letto al sole in piedi — era la
riga unica, non il testo. Con tre per riga un tasto passa da 54 a circa 90px
su un telefono da 390, e l'etichetta torna dentro la scala (`--t-xs`).
La regola di impaginazione, secondo il numero di zone della federazione:
3 tasti → una riga; 4 → due da due; 5 → tre più due; 6 → due da tre.
Lo zero resta sempre ultimo, lontano dai punteggi alti.
Le colonne stanno in `[data-n]` nel CSS, **non** in uno stile in linea.

**La sagoma non c'è più** *(15/08/2026)*. Erano due affordance per lo stesso
obiettivo, con costi diversi (un tocco contro tocco + conferma), presentate
insieme senza che una fosse dominante: moltiplicato per 288, diventa
esitazione. Il tentativo di salvarla dandole un mestiere diverso — *i tasti
segnano il punteggio, la sagoma segna il punto d'impatto* — è durato una
versione: nel codice `pending.x` / `pending.y` non entravano mai in `entry`,
quindi il pannello costava tocco + conferma e produceva esattamente lo stesso
dato di un tocco sui tasti. Era il problema delle due affordance spostato
dietro un bottone.

**E il mestiere non era recuperabile, per una ragione strutturale.** Una mappa
dei tiri serve quando esiste una popolazione di tiri confrontabili: stesso
bersaglio, stessa distanza, molte frecce. Un percorso 3D è l'opposto per
costruzione — 24 animali diversi, 24 distanze stimate a occhio, spesso una
freccia per bersaglio. La dispersione sarebbe quasi tutta errore di stima
mescolato alla sagoma dell'animale: su venti bersagli diversi la nuvola dei
punti non è un segnale sporco, **non è un segnale**. La prova a contrario: la
mappa funziona nel tiro alla targa, dove il bersaglio è sempre lo stesso e la
distanza è nota. Quella non è quest'app.

Se ne sono andati insieme: `pannelloSagoma()`, `drawMarker()` con i suoi due
esadecimali a mano, `legendParts` (ristampava le stesse cifre già sui tasti,
nello stesso schermo), `targetSVG()`, il flusso `pending` → *Conferma*, le
variabili `pending` e `zoomed`, sette voci di dizionario × nove lingue,
undici regole di CSS, l'icona `sight` e quattro token di zona rimasti senza
mestiere. **Il tasto *Classifica* resta, e adesso è largo tutta la riga.**
`state.panel` ha un valore solo.

**I pannelli occupano lo spazio centrale, mai quello dei tasti.** Anche con
la classifica aperta la tastiera è dove era: la posizione è un contratto, e
sopra un contratto si costruisce la memoria muscolare — segnare senza
guardare, che è l'obiettivo vero all'aperto.

**Il timer è una pastiglia, non una scatola da 140px.** Da fermo è un comando
che si apre sui `+/−`; mentre corre è un numero che cambia colore. In nessuno
dei due casi merita il terzo migliore dello schermo.

**Tolte tre ripetizioni per ognuna delle 288 frecce:** la legenda sotto la
sagoma (ripeteva le stesse cifre già stampate sui tasti), il badge della
modalità (l'hai scelta tu due minuti fa) e il suggerimento sotto i tasti.

**La filigrana non c'è più** *(15/08/2026, dopo due prove sul campo)*. Era il
bersaglio disegnato in trasparenza dentro `.pista-spazio`, la regione che per
definizione è vuota. Due prove, due bocciature, e la seconda dopo una
correzione fatta apposta: la prima volta finiva al centro geometrico dello
schermo ed era l'elemento più grande della pagina; spostata nell'angolo e
ingrandita perché due bordi la tagliassero sempre, alla seconda prova era di
nuovo la cosa più grande, solo storta.

**La ragione è strutturale, e va scritta perché fra due mesi qualcuno la
rimette.** `.pista-spazio` è la regione più grande dello schermo *per
costruzione*: assorbe tutto l'avanzo perché la tastiera resti in fondo. Un
disegno messo lì dentro non può essere piccolo, qualunque siano le sue misure,
perché è l'unica cosa dentro il rettangolo più grande. **Nessun valore di
opacità o di posizione risolve un problema di gerarchia.**

E la prova del nove è quella che queste note usano già altrove: *si scriva cosa
fa*. Non dice il punteggio, non dice il turno, non dice dove sei. Era
decorazione — la sola cosa nell'app senza un mestiere — su una schermata che si
guarda per due ore. Toccava a lei andarsene per prima.

Quello che resta del ragionamento vale ancora, ed è la parte utile: il disegno
nella maschera e non nel colore (zero righe per tema), il taglio che dichiara
fondale invece che oggetto, i raggi veri della sagoma invece di un bersaglio
generico. Se un giorno servirà un fondale, quelle tre cose sono giuste. Il
posto no.

**Ma vuoto e basta era altrettanto sbagliato**, e l'ha detto il campo subito
dopo: *«mi sembra tanto vuoto senza il bersaglio, così è triste»*. Ed è vero —
la regione più grande dello schermo, per due ore, che non dice niente. Togliere
una decorazione è giusto; lasciare un buco al suo posto è mezzo lavoro.

**L'andamento** *(15/08/2026)*. Nello stesso spazio va l'unica informazione che
l'app possedeva e non mostrava da nessuna parte durante il giro: **il totale e
le piazzole già chiuse**. È esattamente il motivo per cui si apriva la
Classifica, ma senza aprire niente — e su un giro da solo la Classifica non ha
nemmeno senso, perché non c'è nessuno con cui confrontarsi.

Passa la prova che la filigrana non passava: *si scriva cosa fa*. **Dice a
quanto sei e come ci sei arrivato.** Le piazzole vanno a capo invece di
scorrere, perché una riga che scorre nasconde metà del giro, e questa è
l'unica vista d'insieme che non chiede di aprire niente.

*La lezione più generale, che vale oltre questo caso:* **il rimedio a una
decorazione non è il vuoto, è un'informazione.** Se una regione è grande per
ragioni strutturali, si trova qualcosa che meriti di starci — oppure si cambia
la struttura. Riempirla con un disegno è la scorciatoia, e lasciarla vuota è la
scorciatoia opposta.

**E il primo tentativo era nel posto sbagliato** *(corretto lo stesso giorno)*.
L'andamento era stato messo dentro `.pista-scena`. Ma la scena è **l'unica
regione che cede** (`flex:0 1 auto; overflow-y:auto`): con tre arcieri la
scheda è diventata più alta dello spazio disponibile, ha cominciato a
scorrere, e scorrendo **nascondeva il nome di chi tira** — cioè esattamente la
cosa per cui quella scheda esiste. Un'informazione in più aveva mangiato
l'informazione principale.

Il posto giusto è `.pista-spazio`, che è la regione che **cresce**. Se c'è
posto l'andamento si vede; se non ce n'è viene ritagliato e la scena resta
intatta. È la stessa proprietà che rendeva la filigrana «gratis» — con la
differenza che questo si può scrivere cosa fa.

Due conseguenze obbligate della scelta del posto:

- **una riga sola, le più recenti a destra.** Andare a capo farebbe crescere
  la fila senza limite, e tornerebbe a rubare spazio alla scena: sarebbe
  l'errore appena corretto, un mese dopo. Quello che non ci sta esce da
  sinistra — le piazzole più vecchie, che sono anche le meno interessanti.
  La vista completa resta la Classifica.
- **ancorato in basso.** Stringendosi lo spazio, sparisce prima la fila delle
  piazzole e per ultimo il totale, che è quello che conta.

### Cosa resta da guardare

- ~~`min-height:100dvh` non garantisce che la schermata non scorra.~~
  **Fatto il 15/08/2026**, esattamente come era stato progettato qui:
  `height:100dvh` + `overflow:hidden` **su `body.schermo-percorso`** (non sul
  body in generale: le altre schermate scorrono e devono continuare a farlo),
  safe area dentro il `padding-top` di `#app`, `margin-top:0` sulla testata,
  `.pista-scena` unica regione che cede (`flex:0 1 auto; min-height:0;
  overflow-y:auto`). La safe area **in basso** è rimasta solo sul `body`:
  contarla due volte sarebbe stato lo stesso bug al contrario.
  **Resta da verificare su un telefono vero** — è l'unica cosa che non si può
  provare da qui.
- ~~`--t-xs` è una vittoria per specificità, non per struttura.~~
  **Fatto il 15/08/2026.** Il `clamp(0.5rem, …)` è stato tolto da
  `.quick-btn .quick-lbl`, che ora dichiara `--t-xs` alla base; la regola
  stretta `.tastiera .quick-btn .quick-lbl` tiene solo la spaziatura fra
  lettere, cioè l'unica cosa davvero specifica del percorso. Gli 8px non sono
  più nel file, quindi non possono più tornare.
- **Il sistema di stile è dichiarato qui e non è applicato nel file.**
  *Trovato contando, il 15/08/2026.* Le «regole non negoziabili» in cima a
  questo documento sono giuste, ma nessuno le fa rispettare:

  | regola | al 15/08, dopo la sagoma |
  |---|---|
  | niente stile in linea dal JS | **608** attributi `style=` |
  | scala 4/8/12/16/24/32/48 | **74** valori fuori scala (`gap:6px`, `margin-top:10px`) |
  | nessun esadecimale nei componenti | **71** |
  | niente `!important` fuori da stampa e movimento ridotto | **3** |
  | niente `body.theme-` su un componente | **3** righe, 2 regole |
  | `clamp()` su un carattere | **1** (`.brand-title`) |

  **Il controllo esiste dal 15/08/2026** — `controlla-token.js`, vedi la voce
  in *Fatto*. I numeri qui sopra erano contati a grep e sono stati corretti
  dallo strumento (un grep conta anche i commenti che *spiegano* la regola, e
  gli 8 `#…` dentro i primitivi, che sono il posto giusto). I veri sono in
  `tetto-token.json`.

- ~~**Il blocco «rifinitura del tema chiaro» non è del tema chiaro.**~~
  *Chiuso il 16/08.* Il commento dichiarava di valere solo con
  `body.theme-light` e i selettori dentro non erano qualificati: valevano
  dappertutto. **Corretto il commento, non il codice** — il codice era giusto,
  era la descrizione a essere sbagliata. Il commento nuovo lo dice, e dice
  anche cosa diceva prima: chi legge deve poter capire perché il blocco si
  chiama ancora così.
- **Un partecipante che non ha ricaricato il file vede una sessione vuota.**
  Il documento condiviso ha cambiato forma (vedi *La firma*): chi segna scrive
  `shots`, chi legge accetta ancora `scores`. Il verso che conta è quello —
  una sessione aperta ieri resta leggibile — ma il verso opposto non si può
  aggiustare da qui: un telefono con la PWA aperta dall'altro ieri legge
  `scores`, che nel documento nuovo non c'è, e mostra *nessun dato*. Vuoto e
  visibile, non sbagliato e silenzioso. Si risolve ricaricando, e sparisce da
  solo quando tutti avranno aperto l'app una volta. **Da togliere fra un
  rilascio**: `confirmSessionShotLegacy()` e il ramo `scores` di
  `sessionShots()`, che esistono solo per questo.
- **La verifica su un telefono vero non è stata fatta.** La logica del flusso
  è verificata (vedi sotto), il *rendering* no. La prima cosa da controllare
  è che la tastiera resti in fondo senza far comparire la barra di
  scorrimento, e che ci stia con il testo di sistema ingrandito.
- **Se al campo la sagoma manca davvero, il rimedio non è rimetterla dov'era.**
  Tornerebbe la seconda affordance. Il segnale da ascoltare è un altro: se
  qualcuno la cerca per *guardare* il bersaglio e non per segnare, allora
  quello che mancava era un ripasso delle zone, ed è un'altra cosa — una volta
  sola a inizio giro, non un pannello raggiungibile 288 volte.

### Terminologia, per chi tradurrà ancora

Le nove lingue usano già un vocabolario coerente, e va rispettato invece di
reinventato a ogni chiave nuova. La piazzola è `target_singular` — *Cible*,
*Ziel*, *Hedef*, *Мишень*, *Diana*, *Mål*, *Doel* — e dentro una frase
`target_inline`. La sagoma come **zona di punteggio** è `zone_sagoma`
(*Silhouette*, *Siluet*, *Силуэт*…); il pannello riusa la stessa parola, che in
francese serve anche a non collidere con *Cible*. In francese: spazio prima dei
due punti (`Suivant : {name}`), apostrofo tipografico (`d\u2019impact`) e
**niente ordinali** con un segnaposto numerico — «flèche 3», non «3e flèche»,
che sarebbe sbagliato per la prima. I nomi dei formati FIARC (*Percorso*,
*Tracciato*, *Battuta*) restano in italiano in tutte le lingue: sono nomi
propri, non parole.

I segnaposto `{name}`, `{n}`, `{tot}` devono comparire identici in tutte le
lingue: `t()` fa una sostituzione testuale e un segnaposto perso diventa una
frase monca a schermo, non un errore.

### Sulla posizione dello zero, e perché la domanda era mal posta

Era stato notato che lo zero sta in basso a destra, cioè dove il pollice
arriva più facilmente senza guardare — il posto peggiore per il punteggio
che nessuno vuole premere per sbaglio. **L'obiezione giusta: dipende da con
che mano si tiene il telefono.** Se dipende dalla mano, una posizione
ergonomicamente giusta non esiste, e allora quello che conta non è dove sta
il pollice ma che il tasto **non si sposti mai**. Su 288 tocchi la memoria
muscolare vale più dell'ergonomia. La disposizione resta com'è.

### Sulla vibrazione per zona, che è stata scartata

Era in cima alla lista delle cose in pausa, con l'idea che permettesse di
segnare *senza guardare*. **Scartata, e la ragione è solida: si guarda
comunque**, perché nessuno si fida di un punteggio che non ha visto.
La conseguenza è più interessante dell'idea: se lo sguardo c'è sempre,
allora il valore non è "segnare senza guardare" ma **quanto è veloce quello
sguardo** — dopo il tocco, in mezzo secondo, si deve vedere il punteggio
appena dato e di chi è il turno adesso. Quello lo fa già la fila dei turni.
Da qui discende la riga sopra sulla striscia: l'unico investimento che
restava era renderla non ambigua, ed è stato fatto.

### Il banco di prova del flusso

Il flusso di stato è stato verificato estraendo le funzioni vere
(`registerShot`, `undoLastShot`, `advanceToNextTarget`, `orderForTarget`) in
un banco Node e simulando percorsi interi: 288 tocchi esatti per chiudere un
percorso da 24 piazzole in quattro, rotazione FIARC che regge l'annulla a
ritroso, modalità a 1/2/3 frecce, `stopAtFirstHit`, e 40 annulli di fila
dall'inizio senza rompere niente. Il banco non è nel repository: va rifatto
se si tocca di nuovo il flusso.

---

## Continuità: cosa sopravvive a un ridisegno

`render()` svuota `#app` e lo ricostruisce. È semplice e non sbaglia mai lo
stato, ma sfratta chi sta usando l'app: buttava via posizione di scorrimento,
fuoco della tastiera e cursore a metà parola. Il rimedio non è un framework:
sta tutto dentro `render()`.

`renderNow()` è un involucro di tre righe attorno a `paintScreen()` — che è
la vecchia `renderNow` —, perché quella funzione ha undici `return` anticipati
e ricordarsi del ripristino in ognuno era una trappola.

**Due livelli, e la separazione è il punto.**

- **Automatico** — scorrimento, fuoco, cursore. Non possono fare danno: se al
  ridisegno il campo non si ritrova, si lascia perdere in silenzio.
- **Dichiarato** — il testo non ancora inviato (`data-keep="chiave"`) e i
  riquadri con scorrimento proprio (`data-scroll-key="chiave"`) si salvano
  **solo se il markup lo chiede**. Qui indovinare è pericoloso: ripescare da
  solo il contenuto di un campo significa, prima o poi, far ricomparire nella
  chat un messaggio già spedito.

**La chiave deve contenere l'identità dell'oggetto.** Al primo utilizzo la
chiave era fissa (`dm:draft`): la bozza per Anna compariva nel campo di
Bruno. Una chiave senza identità non è una chiave, è un nome globale. Ora è
`dm:draft:<chatId>`.

**Chi invia deve dimenticare.** `forgetDraft(chiave)` accanto a ogni
`campo.value = ""`. Senza, il messaggio spedito torna nel campo al primo
ridisegno.

**"In fondo" si ricorda come stato, non come numero.** Se sei in fondo a una
chat e intanto arriva un messaggio, devi restare in fondo — non tornare al
pixel di prima. `restoreBox(nodo, ripiego)` vuole sempre il ripiego: per una
chat è `"end"`, per un elenco è l'inizio.

**Il ripristino è istantaneo.** Sul desktop `html` ha `scroll-behavior:smooth`;
rimettere la pagina dov'era non è uno spostamento ma un ripristino, quindi
`applyScroll()` accende `html.no-smooth` per due fotogrammi.

**Navigazioni che ripartono dall'alto** lo dicono con `forgetScroll()` prima
di `render()` — non con un `window.scrollTo(0,0)` dopo, che combatterebbe col
ripristino. Il cambio scheda è l'unico caso attuale.

### Limite noto, e non è un bug

Un campo **senza `id`** viene riconosciuto dalla sua posizione nell'albero.
Se cancelli una riga *sopra* quella in cui stai scrivendo, tutte quelle sotto
slittano e il fuoco finisce nella riga accanto. Non si perdono dati e non si
scrive nel campo sbagliato: il cursore si sposta e te ne accorgi.

**La cura è dare un `id` ai campi degli arcieri** — il codice preferisce già
l'`id` quando c'è. Da fare quando la schermata di registrazione avrà il suo
turno.

Stessa famiglia: `scrollKey()` conosce solo `state.dmUid` e
`state.compagniaAttiva`. Se nasce un'altra schermata di dettaglio, il suo
identificativo va aggiunto lì, altrimenti due contenuti diversi si scambiano
la posizione di scorrimento.

---

## Decisioni di prodotto già prese

- **Tre temi**: chiaro (predefinito), scuro, automatica. Il chiaro è
  predefinito perché all'aperto il vetro aggiunge un velo luminoso che sul
  fondo scuro mangia il contrasto.
- **La scelta del tema vale su ogni schermo.**
- **I tasti del punteggio sono pieni con la cifra bianca**, in tutti i temi:
  il colore si legge da lontano, il numero da vicino.
- **Transizioni di schermata** via `startViewTransition()`, ma **solo** quando
  cambia davvero schermata o sezione. Sul percorso ogni freccia ridisegna:
  dissolvere lì ritarderebbe la conferma del punteggio.
- **Il service worker (v3)** tiene in cache caratteri e librerie, dà 3 secondi
  alla rete e poi parte dalla cache. Firestore, login e notifiche restano
  **fuori** dalla cache: un punteggio vecchio spacciato per fresco è il peggior
  bug possibile su quest'app. Per i file nostri la rete viene prima, quindi un
  `index.html` nuovo arriva da solo: `CACHE_NAME` non va toccato a ogni
  pubblicazione.
- **`BUILD_STAMP`** in fondo alla schermata Info è il modo per sapere se il
  telefono sta girando il file nuovo o una copia in cache. Va cambiato a ogni
  pubblicazione, **e va aggiornato anche qui nella stessa mossa**: il 15/08 si
  è scoperto che queste note ne citavano uno (`2026-08-15-pista-e`) diverso da
  quello nel file (`2026-08-15-firma-a`). L'unico oggetto che dice quale file
  sta girando non può essere il primo a mentire.
  Attuale: **`2026-08-17-avvisi-ricerche`**.
- **Come si racconta il mercatino** *(16/08/2026)*. Si dice che **per il
  momento** pagamento e spedizione si accordano per messaggio fra chi vende e
  chi compra, e che dentro l'app **non ci sono ancora** opzioni di pagamento.
  Non si dice *«non tratteniamo i soldi»*: descrive una scelta di modello che
  non è stata presa, e il giorno che un pagamento entrasse nell'app quella
  frase diventerebbe una promessa rotta. Le due parole che portano il peso sono
  *per il momento* e *non ancora*: dicono il vero adesso e non chiudono niente
  dopo. *Regola generale: una funzione che non c'è si descrive per quello che
  oggi manca, mai per un principio che non abbiamo deciso di difendere.*

---

## Le divisioni: chi vince contro chi *(15/08/2026, sera)*

**Decisione presa: divisione vera, come nelle gare.** Non la classe d'arco
generica che l'app usa oggi nel profilo (compound / ricurvo / longbow /
storico), che serve alla classifica di compagnia e lì può restare.

**Non è una terna, è una coppia.** L'idea di partenza era *stile + classe
d'età + sesso*. Il regolamento dice altro: **il sesso è già dentro la classe**.
Le sigle ufficiali FIARC (Regolamento Tecnico, Art. 3, delibera 033/2023/D del
02/12/2023) sono queste, e sono la codifica che la federazione usa già «al fine
di unificare la codifica informatica per la compilazione delle classifiche»:

| Classi | | Categorie (stile) | |
|---|---|---|---|
| Cuccioli Femminile | `CUF` | Arco Storico | `AS` |
| Cuccioli Maschile | `CUM` | Longbow | `LB` |
| Scout Femminile | `SCF` | Arco Ricurvo | `RI` |
| Scout Maschile | `SCM` | Arco Nudo | `AN` |
| Cacciatori Femminile | `CAF` | Arco Compound | `CO` |
| Cacciatori Maschile | `CAM` | Stile Libero | `SL` |
| Seniores Femminile | `SEF` | Stile Libero Illimitato | `SI` |
| Seniores Maschile | `SEM` | Freestyle | `FS` |
| Diversamente Abili | `DA` | Ospiti | `OSP` |

**La prova che la coppia è giusta e la terna no: `DA` non ha sesso.** Con tre
assi indipendenti quella classe non si può scrivere; con la coppia è una riga
come le altre. Un modello che non sa rappresentare una classe del regolamento è
sbagliato, per quanto sia elegante.

**La sigla è la chiave, non un nostro codice.** La federazione ha già deciso
come si chiamano: se l'app inventa `arco_ricurvo` invece di `RI`, la classifica
che consegna va tradotta da qualcuno prima di essere usata. Si salvano le due
sigle, e la classifica esce nella lingua di chi la riceve.

**`OSP` non è un ripiego, è nel regolamento**, ed è insieme classe e categoria:
non ha né l'una né l'altra, e non entra in classifica. Quindi il *fuori
classifica* non va inventato — chi non dichiara è Ospite, che è una cosa che in
gara esiste e ha un nome.

**Settantadue divisioni, e la conseguenza sul disegno.** Nove classi per otto
categorie — `OSP` non è una nona categoria, è il caso in cui la coppia non c'è.
In pattuglia siete al massimo in sei, quasi certamente in sei divisioni
diverse: **la classifica per divisione non può stare nel riepilogo di fine
giro.** Mostrerebbe sei primi posti, cioè niente. Una schermata che proclama un
vincitore a testa mente educatamente.

Quindi il lavoro si divide così, e non è discutibile:
- **nel giro** la divisione è una pastiglia accanto al nome, e basta. Il gruppo
  confronta le persone che ha visto tirare, come ha sempre fatto con la scheda
  di carta.
- **nella gara** la divisione *è* la classifica. E si può stilare solo quando
  tutte le squadre hanno consegnato.
- **in allenamento** non si chiede niente: la divisione si eredita dal profilo
  e sta zitta.

**Divisione e consegna sono lo stesso lavoro**, e non due voci in fila: la
classifica per divisione nasce dove i risultati convergono, cioè in *Prepara
gara*. È il primo motivo serio per cui quel pezzo deve esistere davvero.

### La consegna ha già un formato, e non l'abbiamo scelto noi

Art. 18.j: la classifica di ogni gara deve riportare, per ogni partecipante,
**suddivisione in Classi e Categorie, ordine di arrivo, numero di tessera
FIARC, cognome e nome, codice di Compagnia, punteggio**; e va inviata entro
quindici giorni alla Segreteria Nazionale, al Comitato Regionale e a tutte le
Compagnie i cui arcieri hanno partecipato.

Cambia la domanda di prima — *a chi si consegna* — da questione di disegno a
questione di lettura: **il destinatario, il contenuto e il termine sono
scritti.** Con due conseguenze immediate sull'anagrafica: servono il **numero
di tessera FIARC** e il **codice di Compagnia**, che oggi non esistono da
nessuna parte, né nel profilo né fra gli iscritti di *Prepara gara*.

Altre due righe che toccano il prodotto e non l'estetica:
- **Si premia solo con almeno tre partecipanti** nella Classe/Categoria
  (Art. 14.a). Una divisione da due esiste in classifica ma non sul podio: la
  schermata non deve promettere una premiazione che non ci sarà.
- **Una gara chiusa a zero punti non entra in classifica** (Art. 18.h), e una
  gara non finita **resta valida se la tabella è firmata** (Art. 18.i). La
  firma non è un ornamento: è ciò che salva un giro interrotto.

### Chi assegna la divisione *(deciso il 15/08/2026, sul file il 16/08)*

**L'organizzatore, in Prepara gara.** Non l'arciere quando entra in squadra.
Il regolamento fa passare l'iscrizione dalla Compagnia (Art. 5.c): la divisione
è già decisa prima che il giro cominci, e l'arciere la eredita. **A gara aperta
non si cambia**, altrimenti si cambia avversario a metà classifica.

Fatto **davvero il 16/08** — il 15/08 sera questa riga diceva già «fatto» e sul
file non c'era niente, vedi il riquadro in *Fatto*. Nella riga di ogni iscritto
ci sono due menu, Classe e Categoria, e la sigla compare accanto al nome — perché è la sigla che finisce in classifica, e
se è sbagliata è sbagliato il vincitore. Chi non ha la coppia completa **dice
«Ospite» a chiare lettere** invece di stare zitto: un vuoto silenzioso lo scopri
alla premiazione.

I nomi di Classe e Categoria restano in italiano in tutte e nove le lingue. Si
traduce l'etichetta del menu, non il nome: *Cacciatori Maschile* e *Longbow*
sono nomi propri del regolamento, come *Percorso*, *Tracciato* e *Battuta*.

**Una federazione senza tabella non rompe niente**: `divisioniPer()` restituisce
`null` e i due menu non compaiono — un olandese vede la riga di prima, con la
sola tessera e il codice, e nessuna sigla italiana addosso. È provato: la prova
6 di `prova-schermo.js` costruisce la riga di uno svedese e conta due campi,
non quattro. Aggiungere una federazione è aggiungere una
voce a `DIVISIONI`, non toccare codice. Oggi c'è solo FIARC, ed è onesto che si
veda.

### L'anagrafica la compila la Compagnia *(15/08/2026)*

Il numero di tessera esisteva già, ma **nel profilo personale dell'arciere** —
cioè in un posto dove chi organizza non può guardare, e che la maggior parte
degli iscritti non ha nemmeno, perché non sono account collegati. Serviva
all'arciere; non serviva a chi compila la classifica.

Ora ogni iscritto ha, nella sua riga: Classe, Categoria, **numero di tessera**
e **codice di Compagnia**. Sono i quattro dati che mancavano all'Art. 18.j: se
non ci sono qui, non ci sono nel documento che si consegna, e lì non si
recuperano più.

**Il codice di Compagnia non è testo libero.** L'elenco vero è già nel file
(`compagnie-data.js`, 25 file del sito): scritto il codice, la riga risponde
col nome della compagnia. Se il codice non esiste lo dice subito, in rosso. Un
codice sbagliato spedito alla Segreteria è un errore che scopre qualcun altro,
giorni dopo, e che nessuno può più correggere. **E non si fa contare fra quelli
buoni**: il resoconto dell'importazione conta solo i codici che esistono
davvero, altrimenti direbbe *«tutti con compagnia»* di una lista piena di
codici inventati.

**I quattro dati stanno a vista, e l'etichetta non si ripete sessanta volte.**
A vista perché un campo che si apre solo se lo cerchi resta vuoto, e il vuoto
si scopre alla premiazione. Senza etichette ripetute perché due menu si
presentano da soli — **la voce vuota porta il nome del menu** — e i due numeri
si riconoscono dalla forma: cifre la tessera, due cifre e quattro lettere il
codice, che per giunta risponde col nome della compagnia. Il nome per esteso
esiste lo stesso, ma solo per chi non vede: `aria-label`, e dice **di chi** è
il campo («Codice di Compagnia di Natale Luca»), perché in un elenco di
sessanta righe *quale* conta quanto *quale dato*.

**I campi non chiamano `render()`.** Scrivono dentro l'oggetto della persona —
lo stesso oggetto che sta anche dentro la squadra, quindi il dato viaggia da
solo — e la pastiglia della divisione si aggiorna da sé. Un ridisegno a ogni
lettera perde il cursore e il posto nell'elenco, e qui si compilano sessanta
righe di fila. È la stessa regola di *Continuità*, presa dal lato opposto:
invece di far sopravvivere il fuoco al ridisegno, non si ridisegna.

### L'importazione legge il senso, non la posizione

L'importazione da testo c'era già, ma capiva solo *Cognome* e *Cognome, Nome*.
Adesso capisce anche tessera, sigle e codice di Compagnia — e **l'ordine delle
colonne non conta**.

Questa è la decisione vera, e vale oltre questa schermata. Un formato deciso da
noi («cognome, nome, tessera, classe…») obbliga l'organizzatore a riordinare a
mano cento righe uscite dal suo foglio di calcolo: **è lavoro nostro scaricato
su di lui.** Quindi ogni pezzo si riconosce da com'è fatto:

| forma | significato |
|---|---|
| solo cifre, almeno quattro | numero di tessera |
| due cifre + quattro lettere (`01VERB`) | codice di Compagnia, e si confronta con l'elenco vero |
| sigla nota, tutta maiuscola | Classe o Categoria |
| il resto, in ordine | cognome, poi nome |

**La trappola, e la sua guardia.** `DA` è la sigla di *Diversamente Abili* ed è
anche l'inizio di *DA SILVA*. Una sigla non viene mai riconosciuta nel primo
pezzo della riga, che è sempre il cognome. Provato: `DA SILVA, Joao` resta un
cognome, `Natale · Luca · DA · CO` è una divisione.

**E il caso che prova la guardia non era quello.** Il banco è stato messo alla
prova con la guardia tolta di proposito, e **è passato lo stesso**: `DA SILVA`
è un pezzo unico, non coincide con la sigla `DA`, quindi quella riga non tocca
la regola che doveva verificare. Il caso secco è `DA, Joao` — il primo pezzo
*è* la sigla, lettera per lettera. Senza la guardia il cognome sparisce e Joao
diventa un Diversamente Abili senza cognome. Adesso ci sono tutti e due, più
`CO, Ana, LB`. *Vale ancora, e adesso al secondo giro: una prova che non è mai
stata vista fallire non è una prova — e va fatta fallire per la ragione
giusta, non per una qualsiasi.*

**Le righe non capite non si buttano, si mostrano.** Un'importazione che perde
tre nomi su cento in silenzio è peggio di una che non parte: l'errore si scopre
in gara, quando manca una persona. E se una riga arriva senza separatori — dai
PDF capita — ma dentro ha una tessera o una sigla, **non diventa un cognome
assurdo**: finisce fra quelle da ricontrollare.

Alla fine l'importazione **dichiara cosa ha capito**: quanti iscritti, quanti
con divisione, quanti con tessera, quanti con compagnia. Non è una conferma da
premere, è un resoconto che resta lì.

### Fatto subito, perché era un numero sbagliato e non un disegno

**La squadra arriva a sei, non a cinque.** In *Prepara gara* il limite era
cinque, scritto a mano in nove lingue e nel codice, senza fonte. Il
regolamento dice sei (Art. 5.c), e l'Art. 7.m ne impegna già quattro di ruolo:
Caposquadra, due Marcatori, Cronometrista. Un organizzatore con squadre da sei
doveva spezzarle per far contenta l'app.

*Nota di metodo.* La lista da cui eravamo partiti — trovata su una pagina
divulgativa — diceva tre classi e sei categorie. Il regolamento ne dice nove e
nove, e aggiunge Arco Nudo, Freestyle, Seniores e Diversamente Abili. **Su
questa materia non si va a memoria e non si va per divulgazione: si legge la
delibera.** Se sbagli la divisione, sbagli il vincitore.

---

## Il logo

`logo.webp` è un rattoppo, non la soluzione. Il file originale (`logo.jpg`)
era un quadrato scuro 300×300 appoggiato in alto a sinistra di una tela
308×308: fuori centro, quindi qualsiasi angolo arrotondato tagliava il disegno
in alto a sinistra e lasciava una lunetta bianca in basso a destra.

`logo.webp` è lo stesso disegno ritagliato sul quadrato vero, centrato, con
gli angoli tondi **nel canale alfa**. Il CSS non taglia più niente.

**Resta da fare: il marchio va ridisegnato in SVG.** Un logo è geometria, non
una fotografia. `logo.jpg` serve ancora a `presentazione.html` e alle
anteprime social: non va cancellato.

### Il giro sul marchio del 16/08/2026, e cosa ne è uscito

Un pomeriggio intero. **Il marchio in SVG non è stato fatto**, e conviene
sapere perché prima di riaprirlo.

**Cosa è stato adottato.** Un'icona **raster**: bersaglio ad anelli interrotti
verde e oro, freccia in diagonale, su **fondo crema**. Generata, poi scontornata
dal bianco, ritagliata, saturata e montata su quadrato tondo. Sul telefono
regge per una ragione sola, che si vede solo lì: **è l'unica icona chiara in
mezzo a icone di tinta piena satura**, e il chiaro si trova per primo.
Provati quattro fondi: sui verdi i vuoti fra gli anelli si fondono con gli
anelli stessi e il disegno si impasta.

**La regola delle due misure.** Sopra i 48px la foto, sotto il vettoriale.
`marchio-piccolo.svg` non è la stessa immagine rimpicciolita: tiene solo quello
che sopravvive — **un anello grosso e una freccia che lo taglia**. Provate
prima quattro versioni con archi sottili a spirale: a 16px le linee sottili
spariscono per prime. *A quella misura serve massa, non tratto.* E la freccia
deve **uscire** dall'anello: una diagonale che attraversa resiste al
rimpicciolimento, un segno chiuso dentro un cerchio no.

**Il difetto trovato nei nomi.** `manifest.json` cerca `icon-192.png`,
`icon-512.png`, `icon-512-maskable.png` — **con i trattini**; nel repository i
file si chiamavano `icon192.png`, `icon512.png`, `icon512maskable.png`,
**senza**. Anche `index.html` punta a `icon-192.png` per favicon e icona iOS.
I tre nomi del manifest non risolvevano: l'icona dell'app installata non poteva
essere caricata da lì. Corretto.

**`CACHE_NAME` va alzato ogni volta.** `sw.js` tiene in cache `manifest.json`,
`logo.webp`, `logo.jpg` e le icone dentro `APP_SHELL`, e svuota la cache
vecchia **solo quando cambia il nome**. Caricare icone nuove senza toccare
`CACHE_NAME` non cambia niente: il service worker continua a servire le
vecchie. Portato a `arctrail3d-v4`, e aggiunta `icon-512-maskable.png`
all'`APP_SHELL`, dove mancava — ed è la sola icona che Android usa davvero.
*Regola: `CACHE_NAME` è il `BUILD_STAMP` della cache. Se non sale, nessuno si
accorge che è cambiato qualcosa.*

**Chi installa da APK non vede niente di tutto questo.** In un APK l'icona sta
dentro il pacchetto, copiata quando l'APK è stato generato. Il sito può cambiare
quanto vuole: va **rigenerato l'APK**, con la stessa chiave di firma.

**Il soggetto giusto, per quando si riapre.** Bersaglio ad anelli più freccia in
diagonale è il **simbolo generico del tiro a bersaglio**: chiunque tenga la
matita arriva lì, e ci si arriva sempre. Le due sole direzioni che escono dal
generico sono **la sagoma di animale** — che è il nostro sport, e nessuna app
concorrente ce l'ha — e **la paglia**, il materiale vero dei bersagli, per cui i
colori esistono già (`--straw-200/500/900`).

**Due errori da non ripetere.** L'asta troppo spessa: gli steli moderni in
carbonio sono sottili, un'asta grassa fa sembrare il disegno un giocattolo.
E le alette troppo aperte: su una freccia vera l'aletta è alta poco più del
diametro dell'asta, con la rampa d'attacco lunga e dritta (vane parabolic da
compound), non è una piuma né un'aletta di razzo.

---

## La scheda di carta non è un registro, è una firma

*Revisione del criterio, 15/08/2026. Cambia l'ordine di tutto quello che segue.*

La riga «la scheda di carta sopravvive finché l'app ha stati che non si vedono»
è giusta. La conclusione che ne era stata tratta — *lo stato mancante è la
sincronizzazione* — è troppo stretta.

Su un percorso la scheda non serve a **ricordare**: per quello basta un
quaderno. Serve a **testimoniare**. Gli altri del gruppo guardano chi scrive, e
alla fine si firma. Il valore non è nell'inchiostro, è nel fatto che gli altri
hanno visto. Tre mestieri distinti, e l'app oggi ne copre uno:

| mestiere | scheda di carta | ArcTrail 3D |
|---|---|---|
| **registrare** | la matita | risolto, e meglio della carta |
| **testimoniare** | gli altri guardano | **c'è nel codice, invisibile sul percorso** |
| **consegnare** | si firma e si porta al tavolo | non esiste |

La riga di mezzo **non è lavoro nuovo**. Il meccanismo è già tutto scritto:
`createSharedSession()` apre la sessione quando ci sono arcieri invitati,
`syncShotToSession()` ci scrive ogni piazzola chiusa, `state.doubleConfirm`
decide se un punteggio nasce già confermato, e `confirmSessionShot(archerId,
idx)` permette a un altro arciere di **controfirmare un singolo tiro**, con
tanto di `confirmedBy`. C'è tutto quello che serve a mandare in pensione la
carta. E sulla schermata dove si segna — l'unica che si guarda per due ore —
non compare da nessuna parte. Chi segna non sa se qualcuno lo sta seguendo;
chi segue lo scopre solo aprendo `session-follow`, che sul percorso nessuno apre.

Quindi la pastiglia accanto al marchio non dice

> *sul telefono / in coda / sincronizzato* — lo stato della **macchina**

ma

> *solo qui / lo vedono / l'hanno confermato* — lo stato del **documento**

Lo stato tecnico non sparisce: diventa il gradino più basso della stessa scala,
perché un punteggio che non è partito non può essere visto da nessuno.

---

## La firma *(fatta, 15/08/2026)*

Erano i punti 1 e 2, ed erano un lavoro solo: il secondo non si poteva
accendere prima che il primo fosse chiuso.

### Il prerequisito: l'annulla propaga

`undoLastShot()` toglieva la freccia sul telefono e non toccava la sessione
condivisa; `syncShotToSession()` scriveva con `arrayUnion` e non rimuoveva
nessuno. Finché la controfirma era invisibile il buco era innocuo. Il giorno in
cui la pastiglia dice *l'hanno confermato*, quella frase certificherebbe una
riga che sul telefono di chi segna non esiste più. **Una firma su un documento
sbagliato è peggio di nessuna firma.**

**I tiri non sono più un elenco, sono una mappa con chiave.** Le due correzioni
ovvie erano tutt'e due sbagliate, e vale la pena scrivere perché:

- **una transazione** legge, decide e riscrive in un giro solo — ma richiede la
  rete. Senza campo non parte, e senza campo è esattamente dove si annulla: in
  mezzo a un bosco, camminando verso il bersaglio dopo essersi accorti
  dell'errore. Una correzione che funziona ovunque tranne dove serve.
- **`arrayRemove` con l'oggetto identico** funziona offline, perché l'SDK la
  mette in coda come qualunque altra scrittura — ma confronta l'oggetto intero.
  Basta un campo ricostruito diverso di un byte e la riga resta lì. Fallisce in
  silenzio, cioè si comporta come il bug di prima, ma senza più nemmeno
  l'onestà di essere dichiarato.

Con una mappa, togliere è scrivere una cancellazione su una chiave:
`shots.<chiave> = FieldValue.delete()`. Atomico, esatto, e messo in coda come
ogni altra scrittura — **l'annulla fatto sotto gli alberi parte appena c'è
campo**. La chiave è `sessionShotKey(archerId, sid)`, dove `sid` è l'identità
della riga, generata alla prima sincronizzazione e conservata sul tiro.

Due conseguenze che non erano l'obiettivo e sono venute gratis:

- **La riga non viene mai riscritta**, quindi la controfirma non può più
  abitarci dentro: sta in `confirms`, con la stessa chiave. Questo ha chiuso un
  bug che nessuno aveva ancora visto perché la funzione non si usava —
  `confirmSessionShot()` faceva leggi-modifica-riscrivi sull'elenco intero, e
  due arcieri che controfirmavano due tiri diversi nello stesso istante
  leggevano entrambi l'elenco di prima: chi scriveva per secondo cancellava la
  firma dell'altro. Adesso ognuno scrive sulla propria chiave.
- **La firma se ne va con la riga.** `unsyncShotFromSession()` cancella tiro e
  controfirma insieme: una firma orfana certificherebbe un tiro che non esiste.
  E quando l'arciere ricompleta la piazzola nasce un `sid` nuovo, perché **non
  si corregge una testimonianza, se ne scrive un'altra.**

La chiave comincia per `k` per una ragione noiosa che è meglio scritta che
riscoperta: è un pezzo di percorso di campo Firestore, `uid()` può cominciare
con una cifra, e un percorso che comincia con una cifra va citato fra apici
inversi. Un byte contro tutta quella classe di guai.

### La pastiglia: tre gradini, e dice sempre il peggiore

Accanto al marchio, durante il giro:

> **solo qui** → **lo vedono** → **firmato**

- **solo qui** — c'è una riga che non è ancora salita
  (`snapshot.metadata.hasPendingWrites`, l'unico evento che distingue *scritto
  sul telefono* da *arrivato agli altri*; serve `includeMetadataChanges`).
- **lo vedono** — tutto è arrivato, i partecipanti possono leggerlo.
- **firmato** — a doppia conferma attiva, ogni tiro ha la controfirma di un
  altro. Parziale si legge `firmato 8/12`. Una firma vale **solo se è di un
  altro**: chi segna non controfirma se stesso.

**La scala dice il gradino peggiore, non la media.** Un documento con una sola
riga rimasta sul telefono non è *visto*: è *solo qui*. È la stessa asimmetria
dell'annulla e del timer — il caso brutto vince, sempre.

**Compare al primo tiro salito, non all'apertura del giro.** Prima non c'è
nessun documento di cui dire lo stato, e un'etichetta che non parla di niente è
l'errore già fatto col badge della modalità. Per la stessa ragione **non
compare mai in un giro senza arcieri invitati**: dire *solo qui* a chi si
allena da solo è enunciare l'ovvio per due ore.

**Non viola «marchio, uscita e segnalazione, e nient'altro».** Quella regola
conta le *porte*, e questa non è una porta: non è un tasto, non ha un menu, non
si può toccare. Un pallino rosso è una richiesta; questa è una risposta. Ha
`role="status"`, quindi è anche il primo pezzo del punto sullo schermo che
parla.

**Non ridisegna la schermata.** L'ascoltatore chiama `dipingiFirma()`, che
tocca il solo nodo della pastiglia: aggiungerlo, aggiornarlo o toglierlo. È il
primo pezzo — piccolo, e per questo un buon banco di prova — del punto sul
ridisegno della sola regione cambiata. Se avesse chiamato `render()`, ogni
conferma del server avrebbe rifatto la pista: novantasei ridisegni per giro,
ciascuno capace di mangiarsi il `:active` del tasto appena premuto.

**Zero righe per tema.** `--clay` e `--success-role` sono ruoli e esistono in
tutti e due; il fondo si ricava dalla superficie con un `color-mix`. Nessun
esadecimale, nessun `body.theme-…`.

### Quello che il banco ha trovato

Il flusso è stato riverificato estraendo le funzioni vere in un banco Node, con
un finto Firestore che applica i percorsi puntati: percorso intero da 24
piazzole in quattro (288 tocchi esatti, 96 righe), 40 annulli di fila,
l'annulla a piazzola già chiusa, la ricompletata che deve generare un `sid`
nuovo, la modalità a una freccia, la chiusura anticipata. La domanda era una
sola, ripetuta dopo ogni mossa: **il documento condiviso contiene esattamente
le righe che il telefono ha in `state.scores`?**

Un difetto è saltato fuori dalla prova della scala, non dal codice: a documento
vuoto `firme >= tiri` è `0 >= 0`, cioè vero, e la pastiglia avrebbe detto
*firmato* di una scheda su cui non c'è scritto niente. Non si sarebbe visto,
perché `firmaVisibile()` pretende almeno un tiro — ma **una regola giusta solo
grazie a una guardia lontana è un bug con un timer**, e la guardia sta ora
dentro la regola (`firme > 0`).

Il banco non è nel repository: va rifatto se si tocca di nuovo il flusso.

---

## La superficie, dopo il primo giro su un telefono vero *(15/08/2026)*

Quattro correzioni, tutte nate dal guardare l'app su uno schermo vero invece
che nel ragionamento.

**La filigrana è stata bocciata due volte e poi tolta.** Vedi *La pista*. Il
punto 0 ha funzionato esattamente come era scritto che dovesse funzionare: una
cosa decisa al chiuso su uno schermo calibrato non ha retto un dito su un
vetro. Ed è servito **sbagliare due volte** per capire che il problema non era
una manopola ma il posto.

**Il blu non aveva parenti.** La tavolozza è verde bosco, terracotta, oro,
sabbia: poi arrivava un blu cobalto pieno, sull'unico controllo che conta.
Arancione + verde + cobalto + grigio insieme si leggono come un'app di quiz,
non come uno strumento di precisione. L'ardesia (`--slate-600/700`) fa lo
stesso mestiere — quarta tinta, distinguibile a colpo d'occhio, bianco sopra a
6,6 — ma **appartiene al paesaggio**: è il colore delle montagne lontane.

**Il rosso è una notizia, non un'etichetta.** Il triangolo della segnalazione
stava in rosso pieno in testata per tutto il giro, a riposo. Rosso vuol dire
*adesso c'è un problema*, e lì non c'era niente. **Un colore che grida sempre
non sa più gridare.** A riposo è neutro come l'altro; diventa rosso quando lo
si tocca.

**Il tasto *Classifica* era diventato un quinto tasto punteggio.** Finché
erano due (con la sagoma) si bilanciavano. Rimasto solo, largo tutta la riga,
con il fondo dorato e attaccato sopra la tastiera, stava esattamente dove il
pollice arriva per sbaglio. È un'azione secondaria: adesso occupa lo spazio di
un'azione secondaria, allineato a destra, senza fondo pieno. *Effetto
collaterale di una sottrazione: togliere una cosa cambia il peso di quella
che resta.*

---

## Chi tira, e come si torna a cambiarlo *(15/08/2026)*

**Dalla schermata degli arcieri si andava avanti e basta.** Nessun ritorno. Chi
toccava *Continua* per sbaglio, o si accorgeva dopo di aver dimenticato
qualcuno, non aveva nessuna strada per rimettere mano alla squadra se non
ricominciare da capo. Ed è il contrario di quello che serve: **la squadra è
l'unica cosa che non si può più cambiare una volta partiti**, quindi è
l'ultima che dovrebbe essere irreversibile prima di partire.

In cima alle due schermate di setup c'è ora una riga che fa **due cose con lo
stesso pezzo di schermo**: dice *chi* c'è — il dato che avevi appena inserito e
che la schermata dopo nascondeva — e offre la strada per tornarci. Un ritorno
che mostra anche lo stato non è un tasto indietro: **è una conferma.**

**E i due campi non dicevano di essere diversi.** Uno aggiunge un nome
qualunque, l'altro cerca un iscritto, e il `+` appartiene solo al primo: due
rettangoli identici uno sotto l'altro, senza una parola che li distingua. Chi
non lo sa già non può dedurlo — ed è il caso di Norman in forma pura: *se serve
un'istruzione, il disegno non c'è ancora*. Adesso ognuno dice a chi serve
(«chi non è iscritto: scrivi il nome» / «chi è iscritto: cercalo per
username»), e il titolo porta il conteggio.

---

## Le righe dentro una scheda non sono schede *(15/08/2026)*

Sul telefono vero il Profilo aveva **quattro rettangoli arrotondati uno dentro
l'altro** per dire una riga di elenco: fondo crema → scheda bianca col filo
d'oro → pastiglia grigia col suo bordo → quadretto grigio col suo bordo → e
finalmente l'icona. Quattro livelli, e i due di mezzo non aggiungono nessuna
informazione: sono tutti dello stesso grigio, quindi **non aiutano nemmeno a
scorrere l'elenco**, che è l'unica cosa che dovrebbero fare.

Dentro una scheda una riga è una riga: testo, sottotitolo, un filo che la
separa dalla successiva, una freccia che dice dove porta. Il quadretto
dell'icona se ne va — un contenitore che non contiene niente è peso — e resta
il segno, nel grigio del testo minore.

Due limiti scritti apposta, perché la regola non diventi una moda:

- **Vale solo dentro una scheda** (`.card .menu-btn.btn-ghost`). Lo stesso
  tasto da solo in mezzo alla pagina resta una pastiglia: lì non è un elenco,
  è un comando.
- **I tre comandi colorati restano pastiglie.** Training, gara, prepara sono
  il contenuto della schermata *Tira*, non un elenco di destinazioni.

La freccia (`›`) non è decorazione: ora che il rettangolo non dice più «questa
cosa si tocca», deve dirlo qualcos'altro.

---

## Quattro numeri, e dove non vanno *(15/08/2026)*

Le decisioni di queste note sono argomentate bene, e queste note sono scritte
abbastanza bene da far sembrare un argomento una prova. Adesso ci sono quattro
numeri, in fondo alla schermata Info, sotto la versione del file:

| numero | la domanda a cui risponde |
|---|---|
| giri finiti / iniziati | il giro arriva in fondo, o si abbandona a metà? |
| annulli per giro | quanto spesso si sbaglia a segnare? |
| classifiche aperte per giro | quanto pesa quel tasto, l'unico rimasto? |
| secondi fra due frecce (mediana) | **quanto è veloce lo sguardo dopo il tocco?** |

**Non si spediscono da nessuna parte.** Vivono in una chiave di `localStorage`
loro (`arctrail3d_misure_v1`), separata dallo stato del giro. Non passano da
Firestore, non entrano nella sessione condivisa, non hanno un identificatore, e
c'è un *Azzera* a doppia conferma dentro il riquadro. Un numero che non parte
non può essere frainteso da nessuno — e su un'app dove il dato è il punteggio
di qualcun altro, questa non è una precauzione, è la regola.

**Il quarto è cambiato rispetto a com'era scritto qui, e la ragione va detta.**
Era *secondi mediani per piazzola*. Ma il tempo di una piazzola è quasi tutto
tiro, cammino e attesa degli altri: l'app ci sta dentro per una frazione,
quindi quel numero non avrebbe potuto dare un voto al ridisegno — che era
l'unica cosa per cui esisteva. **La distanza fra due frecce dello stesso
arciere sulla stessa piazzola invece è quasi solo app.** I salti oltre il
minuto si scartano: quello non è esitare, è camminare. Il banco lo verifica
mettendo 45 secondi fra un arciere e l'altro e 2 fra due frecce, e pretendendo
che la mediana esca 2.

**Mediana, non media**: una pausa pranzo a metà giro sposta una media e non
sposta una mediana. E tetto a 300 intervalli, perché oltre non aggiungono
niente e la memoria del telefono non è nostra.

**Finito vuol dire arrivato in fondo.** L'interruzione dalla classifica porta
alla stessa schermata di riepilogo, ma contarla come un giro finito
cancellerebbe proprio il numero che si voleva sapere.

---

## Le regioni: il ridisegno mirato *(15/08/2026)*

**La premessa, che era già scritta qui.** La vibrazione per zona era stata
scartata perché si guarda comunque; da lì discendeva che il valore non è
*segnare senza guardare* ma **quanto è veloce lo sguardo** dopo il tocco.
Quello sguardo *è* il ridisegno. Finché ogni freccia svuotava `#app` e
ricostruiva testata, timer, scena, filigrana, striscia e tastiera, la funzione
dichiarata come l'unica che conta era anche la più costosa — e per strada si
mangiava il `:active` del tasto ancora sotto il dito.

**Quattro regioni, ognuna sa dirsi con una firma.** `pistaTesta()`,
`pistaScena()`, `pistaStriscia()`, `pistaTastiera()`. Ognuna scrive in
`data-firma` una stringa che riassume tutto ciò che la farebbe sembrare
diversa. `dipingiPista()` rifà solo le regioni la cui firma è cambiata, e
torna `false` quando la schermata ha cambiato **forma** (sosta di fine giro,
scelta della piazzola in battuta, pannello aperto, fine del giro). Chi segna
scrive sempre la stessa riga:

```
save(); if(!dipingiPista()) render();
```

**Nessuna regione ha due costruttori.** `roundScreen()` e `dipingiPista()`
chiamano le stesse quattro funzioni. Due percorsi che disegnano la stessa cosa
divergono sempre, e divergono in silenzio: è il modo classico di rompere una
schermata sei mesi dopo, in un caso che nessuno riprova.

### Le due cose che il banco ha trovato, e che a ragionare non si vedevano

**La tastiera in Percorso cambia a ogni freccia.** Prima freccia 20/18/16,
seconda 14/12/10, terza 8/6/4: con una firma sola la tastiera si rifaceva
**287 volte su 288**, cioè il tasto sotto il dito moriva comunque e tutto
questo lavoro non serviva a niente. Quindi due firme:

| firma | cosa contiene | quanto cambia |
|---|---|---|
| `data-firma` | righe, colori, etichette | quasi mai |
| `data-numeri` | le cifre | ogni freccia |

Se cambiano solo i numeri **i nodi restano** e si riscrive la sola cifra
dentro i tasti che ci sono già. Su un percorso intero: **0 tastiere
ricostruite, 287 cifre riscritte.** Il tasto appena premuto resta lo stesso
nodo per tutta la durata del tocco.

Conseguenza obbligata: **il punteggio sta nel nodo, non in una chiusura.**
`data-pts` e `data-zona`, letti al momento del click. Un ascoltatore legato a
una chiusura vecchia, dopo un aggiornamento sul posto, segnerebbe il punteggio
della freccia precedente — il bug peggiore possibile su quest'app, e
silenzioso.

**La testata non si può costruire «per prova».** Le altre tre regioni si
costruiscono, si confrontano e se serve si buttano: non costa niente. La
testata no: dentro c'è il conto alla rovescia con il suo `setInterval`, e
`avviaConto()` comincia con `clearInterval` di quello vecchio. Costruire una
testata per confronto e poi buttarla avrebbe spostato l'intervallo su un nodo
che nessuno vede: **il timer visibile si sarebbe fermato da solo**, senza
errori a console. Per questo la sua firma si calcola **prima**, con
`firmaTesta()`, e la regione si costruisce solo se serve davvero.

La firma della testata include il turno (`piazzola_arciere`) apposta: cambiando
arciere il timer *deve* ripartire da zero, e il modo più sicuro di garantirlo è
che la regione si rifaccia.

### Il banco

`banco-firme.js`, accanto al controllo dei token. Estrae dal file le funzioni
vere (`registerShot`, `undoLastShot`, `advanceToNextTarget`) e ricalcola le
firme vere, poi fa la stessa domanda dopo ogni tocco, due volte:

- **firma muta** — il contenuto è cambiato e la firma no. Lo schermo mostrerebbe
  il turno di prima, o il punteggio di prima, e nessuno se ne accorgerebbe.
- **ridisegno sprecato** — la firma è cambiata a contenuto uguale. Non fa danno,
  ma vuol dire che la firma contiene qualcosa che non è informazione.

Prove: percorso intero da 288 tocchi, 40 annulli di fila, modalità a una
freccia (dove la tastiera non deve cambiare **mai**), giro da solo. Va
rilanciato se si tocca una firma o una funzione di flusso.

**Il confronto fra due istanti consecutivi non basta, e il banco l'ha scoperto
il 15/08 nel modo peggiore: dicendo di sì a una firma rotta.** Tolto
`state.target` dalla firma della scena — il bug che avrebbe congelato il
numero grande nel giro da solo — il banco passava lo stesso, perché fra un
tocco e il successivo cambiava *anche* il numero della freccia, che mascherava
il buco. La domanda giusta è più forte e non dipende dall'ordine:

> **due contenuti diversi possono avere la stessa firma?**

Ogni firma vista finisce in un dizionario insieme al contenuto che aveva. Se
la stessa firma ricompare con un contenuto diverso è una **collisione**: prima
o poi capiterà anche fra due istanti consecutivi, e quel giorno lo schermo
mentirà. Con la firma rotta il banco ne trova decine e esce con 1.

*Regola generale, che vale oltre questo banco:* **una prova che non è mai
stata vista fallire non è una prova.** Prima di fidarsi di questo banco gli è
stato dato un file guasto, apposta.

**E una domanda giusta non basta se manca il caso.** Aggiunto l'andamento alla
scena, il banco è stato di nuovo messo alla prova con la firma incompleta — e
è passato. Non per un difetto della domanda, ma perché **nessuno dei giri
simulati faceva la cosa che rompe**: tornare indietro su una piazzola già
chiusa e rifarla con un punteggio diverso. Lì ti ritrovi esattamente dov'eri —
stessa piazzola, stesso arciere, stessa freccia, stessa fila dei turni — e
l'unica cosa cambiata è il totale. È anche il caso più frequente sul campo:
te ne accorgi camminando verso il bersaglio dopo. Adesso è la prova 6, e con
la firma incompleta il banco esce con 1.

**La prova 7 non è una firma, ed è lì per la stessa ragione.** *(16/08/2026.)*
L'importazione da testo è la seconda funzione del file che può **sbagliare in
silenzio lasciando credere che sia andato tutto bene**: perde tre nomi su cento
e non protesta, e l'errore si scopre in gara, quando manca una persona.
Tredici righe di prova, e la tabella delle divisioni **non è una copia scritta
nel banco** — si estrae da `index.html`, così una sigla battuta male fa
smettere di leggersi le righe di prova, che è esattamente quello che deve
succedere: una sigla sbagliata è un vincitore sbagliato.

**Un secondo banco, che prova quello che il primo non può: i nodi.**
`prova-schermo.js` costruisce la riga dell'iscritto **davvero**, in un DOM
finto (`npm install jsdom`; senza, gli altri due girano lo stesso). Conta i
campi, legge le etichette e gli `aria-label`, sceglie due sigle e verifica che
la pastiglia cambi **senza che la pagina si rifaccia**, scrive un codice di
compagnia buono e uno inventato, e prova la riga di uno svedese. Ha già
guadagnato il suo posto: ha fatto vedere **«1 iscritti»** nel resoconto
dell'importazione — un numero infilato dentro una frase che deve concordare, in
nove lingue con nove regole di plurale diverse. Ora il numero sta **dopo i due
punti** (*«Iscritti: 1 · con divisione: 1»*), che è giusto in tutte e nove e non
chiede a nessuno di conoscere il plurale svedese. *Regola: un conteggio non si
mette dentro una frase che deve accordarsi con lui.*

Quello che nessuno dei due banchi prova è la resa: 288 tocchi verificati a
scrivania, zero in piedi su un percorso. Resta il punto 0.

---

## Il guardiano: `controlla-token.js` *(15/08/2026)*

Le regole non negoziabili in cima a questo documento erano giuste e non le
faceva rispettare nessuno. Adesso sei domande, una passata sul file, uscita
con codice 1:

`style=` dentro il JS · esadecimale fuori dai primitivi · `!important` fuori
da stampa e movimento ridotto · `body.theme-` addosso a un componente ·
misura di spaziatura fuori dalla scala 4/8/12/16/24/32/48 · `clamp()` su un
carattere.

**Tre scelte che decidono se lo strumento sopravvive.**

**La settima domanda non ha tetto: le funzioni chiamate esistono?**
*(aggiunta il 15/08/2026, dopo aver pubblicato un file rotto.)* Uno script di
modifica si è interrotto a metà: aveva scritto la chiamata a `pistaSpazio()` e
non la definizione. `node --check` diceva OK — **la sintassi era perfetta** — e
la schermata del percorso mostrava la sola testata, tutto il resto vuoto. Un
`ReferenceError` a metà ridisegno non lascia niente a schermo e non lascia
niente nei log, se nessuno apre la console.

Questa domanda non è debito di stile, è un file rotto: qualunque numero sopra
zero esce con 1, tetto o non tetto. Non grida al lupo perché conosce i nomi
dichiarati nel file, i parametri di ogni funzione, una lista di nomi del
linguaggio e del browser, e **ignora del tutto le chiamate a metodo**. Al primo
tentativo trovava diciassette fantasmi, tutti dentro i commenti italiani: *«il
timer si mette in pausa (non si perde niente)»* è una parola seguita da una
parentesi. Lavora sul file senza commenti e senza il contenuto delle stringhe.

*La lezione vera è a monte dello strumento:* **uno script che si interrompe a
metà è più pericoloso di uno che fallisce del tutto**, perché lascia il file in
uno stato che compila e non funziona. Gli agganci vanno verificati tutti prima
di scrivere, non uno alla volta mentre si scrive.

**Il tetto, non lo zero.** Il file parte con 608 violazioni della prima
regola. Un controllo che dice sempre *no* viene spento entro una settimana:
`tetto-token.json` registra i numeri di oggi e il controllo protesta solo
quando un numero **peggiora**. La cricca si stringe, non si apre mai. Chi
migliora un conto non deve ricordarsi di niente: **se niente è peggiorato e
qualcosa è migliorato, il tetto scende da solo** e quel numero non può più
tornare indietro. `--fissa` resta per fissarlo di forza.

**Il guardiano era spento, e non lo sapeva nessuno.** *(15/08/2026, sera.)*
Cercava il tetto in `.tetto-token.json`, col punto davanti; il file sul disco
si chiama `tetto-token.json`, senza. Quando il tetto non si trova, il codice
prendeva **i numeri di oggi** come tetto: ogni giro diceva *«niente è
peggiorato»*, sempre, qualunque cosa fosse successa al file. Un controllo che
non può dire di no non è un controllo, è un timbro. Adesso i due nomi valgono
uguale, e se non c'è né l'uno né l'altro lo dice in testa alla passata invece
di passare in silenzio. *La regola più larga: un file di stato che comincia col
punto si perde — non entra in uno zip, non si vede in un elenco, non arriva
sull'altra macchina — e il codice che lo legge deve accorgersi che manca.*

E il tetto conteneva ancora i numeri della mattina (607 · 71 · 74 · 1): tutto
quello che era stato ripulito in giornata era terreno **guadagnato e non
registrato**, quindi restituibile in silenzio. Ora è a 602 · 66 · 3 · 3 · 63 ·
0, e ci è sceso da sé.

**Le regole non leggono i commenti.** Questo file e il codice sono pieni di
frasi come *«niente `!important`»* e *«era un `#1d5fd1` scritto a mano»*: un
grep le conta come violazioni e punisce chi ha spiegato la regola. Il
controllo lavora su una copia del file senza commenti, riga per riga
allineata all'originale, così i numeri che riporta sono numeri veri. È per
questo che la tabella delle violazioni qui sopra è cambiata senza che nessuno
avesse toccato quelle righe: **prima era contata a occhio, adesso è misurata.**

**L'ottava e la nona domanda.** *(16/08/2026.)* Le prime sette guardavano
com'è scritto il file. Queste due guardano se **dice il vero**.

- **Classi fantasma.** La classe è nel markup, la regola nel foglio non c'è.
  È il bug di `.iscritto-row`: il diario la dava per fatta, la classe era
  davvero scritta nel JS, e nel foglio non c'era niente. **Questo bug non si
  vede da fuori** — l'elemento esce senza stile e sembra soltanto *un po'
  diverso*, quindi nessuno lo segnala e il diario continua a dire che è fatto.
  È il modo più silenzioso che ha una nota di diventare falsa. Ne restano
  cinque, elencate a ogni passata: `.input-field` (18 usi), `.checkbox-row`
  (6), `.printable` (3), `.gruppo-card`, `.theme-satura`.
- ~~**Federazioni scoperte.**~~ *Chiuso il 16/08: e' la dodicesima domanda del
  guardiano.* `FEDERATIONS` e `PROFILE_FEDERATIONS` restano due elenchi
  scritti a mano in due punti lontani del file, ma adesso c'e' una macchina
  che li confronta a ogni passata e dice quale federazione e' rimasta scoperta,
  da che parte. Oggi combaciano tutte e sedici. *Provato togliendo lo svedese
  dal profilo: lo trova e lo nomina.*

**La decima domanda: la chiave che si chiede esiste, e in tutte e nove?**
*(16/08/2026.)* `t()` ha due modi di cadere, e nessuno dei due si vede da qui.
Il primo è rumoroso: una chiave che non esiste in italiano **finisce a schermo
com'è scritta** — l'arciere legge `pg_div_ospite` al posto di *Ospite*. Basta
una lettera sbagliata in una chiamata. Il secondo è silenzioso, ed è peggio:
una chiave che c'è in italiano e manca in svedese **cade sull'italiano**. Lo
schermo resta pieno, la frase è giusta, ed è nella lingua sbagliata. Se ne
accorge uno svedese, in gara.

La prima esce con 1 — è testo rotto a schermo. La seconda avvisa e basta,
perché l'app resta usabile: *usabile in italiano*. Provata su un file guasto
apposta, con una chiamata storpiata e una riga svedese cancellata: le trova
tutt'e due e per la prima esce con 1.

Il momento in cui questa domanda serviva era oggi: **quattordici chiavi per
nove lingue in un colpo solo**, centoventisei voci scritte a mano. Adesso:
nove lingue, **715 chiavi ciascuna, nessun buco**, e delle 573 chiamate a
`t()` nessuna punta a un testo che non esiste.

**E questo controllo esisteva già, ma non era un controllo.** Il conta-chiavi
qui sotto era uno script di giornata: ha contato una volta, il 16/08 mattina,
e poi non è mai entrato nel guardiano. Cioè era **una regola che viveva in una
nota** — esattamente la cosa che questo documento dice di non fare, commessa
dallo strumento nato per impedirla.

**E un controllo gridava al lupo.** Il conta-chiavi delle nove lingue diceva
*«manca la chiave `it`»* in sette lingue su otto. Erano due errori suoi: contava
come blocco lingua anche l'elenco delle federazioni per paese (che comincia con
`it: [`), e prendeva la riga `it: {` come se fosse una chiave. **Un controllo
che grida al lupo viene ignorato la volta che ha ragione**, quindi è stato
corretto prima di guardare i suoi numeri. *(I numeri di quel giorno: nove
lingue, 700 chiavi ciascuna, nessun buco, 559 chiamate tutte buone. Quelli di
adesso li dà il guardiano a ogni passata.)*

**L'undicesima domanda: la regola c'è, ma solo sul computer?** *(16/08/2026,
sera.)* Nessuna delle prime dieci guarda **dove** sta una regola, e quel giorno
quattro regole nuove sono finite dentro `@media (min-width:900px)`: giuste,
valide, invisibili sul telefono. Il racconto per esteso sta più sotto, in *Una
classe non è un aggancio finché il foglio non la conosce*.

**Le regioni si trovano dai marcatori, non dai numeri di riga.** `STRATO 1 ·
PRIMITIVI`, `STRATO 2 · RUOLI`, `<style>`, `<script>`: bastano le righe di
separazione già scritte nel foglio di stile. Un controllo tarato su numeri di
riga scade al primo inserimento, e un controllo scaduto mente.

**E infatti ha detto di no, la prima volta che contava.** *(16/08/2026.)*
`stile in linea dal JS` è a **602**, il tetto dice **597**. Cinque righe
entrate col timbro `squadra-sei` — che in questo diario **non ha una voce**: la
sua unica traccia sono quei cinque numeri. Un file pubblicato senza la riga che
dice cosa conteneva è la stessa bugia del timbro sbagliato, solo più
silenziosa.

**Il tetto non si alza per far passare il file.** La regola scritta sopra vale
anche quando è scomoda: *la cricca si stringe, non si apre.* Si tolgono i
cinque stili e si rimettono nel foglio. `node controlla-token.js --elenca
SITO\index.html` li stampa uno per uno.

Va detto che è **debito di stile, non di comportamento**: il banco passa
pulito (0 tastiere ricostruite, 287 cifre riscritte, mediana 2 secondi).
Nessuno se ne accorge tirando. Ed è esattamente il motivo per cui si scrive
qui: un debito che non si vede è un debito che nessuno paga.

Non è nel file: sta accanto, e si lancia con `node controlla-token.js
index.html`. **Va lanciato prima di pubblicare**, non dopo. E gli strumenti
vanno tenuti **fuori dall'archivio**: fino al 16/08 `controlla-token.js`,
`banco-firme.js` e `tetto-token.json` esistevano solo dentro uno zip sul
desktop, quindi non giravano mai. È così che 602 è passato inosservato.

---

## Una classe non è un aggancio finché il foglio non la conosce *(16/08/2026)*

L'ottava domanda del guardiano ne aveva trovate cinque: `input-field` (18
volte), `checkbox-row` (6), `printable` (3), `gruppo-card` (1), `theme-satura`
(1). Nomi scritti sugli elementi dal JS, e nel foglio di stile niente.

**Non erano tutte uguali, e la differenza è il punto.** Tre erano rumore:
un campo di testo è già vestito dal selettore di elemento, quindi `input-field`
era un nome vuoto che *sembrava* un aggancio; `printable` non ha mai voluto
dire niente, perché il blocco di stampa lavora su `.card` e su `.no-print`;
`theme-satura` era la pulizia di un tema che non esiste più. Una no:
`gruppo-card` è la scheda di un percorso salvato, e usciva **come testo nudo**
dove ogni altra scheda dell'app ha fondo, bordo e respiro. Nessuno l'aveva mai
segnalato: sembra soltanto «un po' diverso».

**La regola dietro tutte e cinque.** Se una classe non decide niente, o le si
dà un mestiere o si toglie. Un aggancio che non tiene è peggio che non averlo,
perché la volta dopo qualcuno ci appende qualcosa.

Quindi: `input-field` adesso decide la forma del campo e la sua spaziatura
(`cerca`, `in-modulo`, `in-riga`, più tre larghezze), `checkbox-row` decide la
riga con la spunta, `gruppo-card` è una scheda. `printable` e `theme-satura`
non ci sono più. **Stile in linea da 562 a 529.**

**E il testo delle spunte è salito di un gradino.** Stava su `--muted`, il
ruolo più spento dei tre. È il testo di un consenso — privacy, condizioni: la
cosa che si sta accettando. Al sole non si legge. Ora è `--text-2`, distinto
dal testo pieno ma leggibile. *(La spunta della doppia conferma non è un
consenso, è un interruttore: quella è `.principale`, testo pieno.)*

### Il difetto che si prova dove non si manifesta

Le regole nuove erano finite nel punto che sembrava giusto — accanto alle
altre regole dei campi, sezione 7 del foglio. **Quel punto è dentro
`@media (min-width:900px)`**, la rifinitura da computer. Il file era valido, il
foglio era valido, tutte e dieci le domande del guardiano tacevano: **nessuna
guarda dove sta una regola.** Sullo schermo largo di chi la scrive funziona.
Sul telefono — l'unico posto dove si tira — la riga con la spunta sarebbe
tornata testo accatastato.

È il difetto più beffardo che questo file possa avere: **si prova proprio
dove non si manifesta.** Trovato solo perché le regole sono state misurate su
una pagina finta invece di essere date per applicate.

**L'undicesima domanda.** *Quali classi il JS scrive sempre, e il foglio le
veste solo sopra i 900px?* Le eccezioni vere — `menu-cols`, `narrow`,
`no-smooth`: agganci che sul telefono **non devono** fare niente — stanno
dichiarate dentro il guardiano con la ragione accanto, e una classe nuova in
quella lista entra a mano. La domanda è stata provata sabotando il file
apposta: dice di no.

*Regola operativa, da qui in avanti: **una regola nuova non si scrive dopo il
commento «RIFINITURA DA COMPUTER»**, mai, nemmeno se il vicinato sembra
giusto. Sotto quel commento si sta dentro una media query fino a «FINE
RIFINITURA».*

---

## La consegna *(16/08/2026)*

Era il punto 1, ed era quello che decideva se l'app è un accessorio o no.
Registrare era già risolto, e meglio della carta. Testimoniare lo dice la
pastiglia durante il giro. Mancava il terzo mestiere: **su un percorso il giro
finisce quando la scheda passa di mano.**

**Due regole, e sono quelle che distinguono una consegna da un secondo
«condividi» con un'icona diversa.**

1. **Una firma vale se qualcuno ha visto.** In gruppo ne servono almeno due, da
   soli basta la propria. È la stessa asimmetria della controfirma durante il
   giro: chi segna non controfirma se stesso.
2. **Dopo la consegna non si tocca più niente.** Non si firma, non si toglie
   una firma, non si riconsegna. È l'irreversibilità a rendere l'atto un atto;
   senza, è un'etichetta.

Ognuno firma **toccando il proprio nome**. Non c'è una firma disegnata col
dito: sarebbe mimare la carta invece di sostituirla, e su un vetro sporco al
sole non la si legge comunque. Quello che serve alla testimonianza è che la
persona ci fosse e abbia visto il totale — e il totale è sulla riga che tocca.

**Togliere una firma si può, finché la scheda è in mano, e chiede conferma.**
Non è ancora uscita di lì, quindi il ripensamento è legittimo; ma non è un
interruttore, quindi si domanda due volte. `armDoubleConfirm()` non si poteva
riusare — riscrive `textContent` e distruggerebbe l'icona dentro la pastiglia —
quindi la riga ha i suoi due gradini, con la stessa attesa di quattro secondi.

**Il tasto principale non è più «Torna al menu».** Finché la scheda non è
consegnata, quello passa a fantasma e il primario è la consegna. Era l'unica
azione in evidenza della schermata, e diceva di andarsene esattamente prima del
gesto che chiude il giro: una gerarchia che rema contro il rito.

**Sulla stampa la riga della firma non è più vuota.** Se qualcuno ha firmato
nell'app, quella colonna porta i nomi. Due righe da riempire a penna quando la
firma c'è già sono la carta che rientra dalla finestra.

**Il giro interrotto lo dice, e dice che vale.** FIARC Art. 18.i: una gara non
finita resta valida se la tabella è firmata. Chi non conosce l'articolo non può
saperlo, e buttare una scheda buona sarebbe un errore del disegno, non suo.

### Il codice scheda è stato disegnato e poi tolto, prima di scriverlo

Sei lettere maiuscole in caratteri tabulari, alfabeto senza O/0 e I/1 perché si
legge ad alta voce al tavolo. Bello, e falso. Non passa la prova che deve
passare ogni cosa su questo schermo — *si scriva cosa fa* — perché un codice
che punta solo dentro l'archivio di questo telefono **non è una ricevuta, è una
ricevuta finta**: ha l'aria di essere stato emesso da qualcuno.

Restano data, ora e i nomi di chi ha firmato, che sono veri tutti e tre. *È la
stessa lezione della filigrana, applicata prima di scrivere il codice invece
che dopo averlo messo su un telefono: la seconda volta costa meno.*

### In allenamento la scheda non esiste

`schedaVisibile()` guarda `garaModes`. Dire «consegna la scheda» a chi tira da
solo dietro casa è lo stesso errore del badge della modalità: un'etichetta che
non parla di niente, per due ore.

### APERTO — «allenamento» e «gara» sono due parole per tre cose *(16/08/2026)*

**La domanda che l'ha aperta, dal campo:** *fuori da FIARC, che senso ha
distinguere allenamento e gara, se i punteggi sono gli stessi?*

**È una buona domanda, e la risposta guardata nel codice è: i punteggi sono
davvero gli stessi, ma la modalità non decide solo i punteggi.**

Fuori da FIARC, fra `X_training` e `X_3d` cambiano tre cose:

| | allenamento | gara |
|---|---|---|
| **frecce per piazzola** | 1 | 2 (3 in NFAS Big Game) |
| **piazzole** | libere, da 1 a 99 | fisse: 24, o 28 in IFAA e NFAS |
| **tabella dei punti** | uguale | uguale — **tranne IFAA e NFAS** |

Le zone e i valori della prima freccia sono identici in tutte le federazioni a
regolamento unico. L'eccezione sono **IFAA** (20/18 alla prima, 16/14 alla
seconda) e **NFAS**, dove la freccia successiva vale meno: lì la tabella cambia
davvero, e non per il fatto di essere in gara ma per il fatto che esiste una
seconda freccia.

**Quindi la distinzione fuori da FIARC è reale, ma non è quella che il nome
promette.** Non è *sto gareggiando o mi sto allenando* — quello l'app non lo
sa e non lo può sapere. È *sto facendo il giro regolamentare, o sto tirando e
basta*: **quante frecce, quante piazzole.** Un arciere che si allena sul giro
completo, due frecce e ventiquattro piazzole, oggi deve scegliere *gara* per
avere il conteggio giusto — e sceglie un'etichetta che dice il falso su di lui.

**In FIARC la parola invece porta informazione vera**, ed è l'unico posto dove
la porta: `garaModes` sono quattro giochi diversi — Round 3D, Percorso,
Tracciato, Battuta — con tabelle, numero di frecce e formati diversi fra loro
(Battuta ha perfino le frecce per piazzola scritte una a una, Art. 4.1).
Lì scegliere non è un'etichetta, è dire *a cosa si sta giocando*.

**Le tre cose sono quindi, in ordine:**

1. **giro libero** — piazzole e frecce le decidi tu (oggi: `training`);
2. **giro regolamentare** — il formato della federazione, e in FIARC *quale*
   dei quattro (oggi: `garaModes`);
3. **gara ufficiale** — iscritti, divisioni, classifica, firma e consegna.
   Oggi **non esiste come cosa a sé**: è accesa dal punto 2, ed è il difetto
   scritto qui sotto.

**Il difetto è che oggi i nomi sono due e i piani sono tre**, quindi la
seconda parola ne regge due mestieri: dice il formato *e* accende il rito della
consegna. Due arcieri che tirano un Round 3D fra loro la domenica si vedono
chiedere due firme e una consegna irreversibile per una scheda che nessuno
raccoglierà; e chi si allena sul giro completo deve dichiararsi in gara.

**Cosa fare, e in che ordine.** Prima staccare il terzo piano dal secondo: la
firma e la consegna si accendono **solo quando il giro nasce da una gara vera**
— quella preparata in *Prepara gara*, con iscritti e divisioni. È lo stesso
collegamento mancante del punto 1 di *Cosa manca*: gli arcieri di un giro sono
`{id, name}` e basta, il giro non sa da quale gara viene. Poi, e solo poi,
guardare i nomi: *allenamento* e *gara* descrivono chi tira, e dovrebbero
descrivere il giro. **Nessuna scorciatoia con un interruttore** *«questa è una
gara ufficiale»* a inizio giro: sposta sull'arciere una domanda a cui l'app
saprà rispondere da sola, e Norman qui è netto.

**Il banco avrà una sesta domanda:** *in un formato di gara non collegato a
nessuna gara, la scheda compare?* Oggi risponderebbe sì. Va scritta insieme al
collegamento, non prima: una prova che fallisce da mesi si impara a ignorare.

**E fino ad allora la gara ufficiale non si racconta come una funzione.**
Nella presentazione sta sotto *a cosa stiamo lavorando*, con scritto che è in
prova e che per valere deve passare dalle federazioni. Promettere un timbro che
non è stato ancora concesso è la stessa bugia del codice scheda.

### Quello che il banco chiede al codice

Cinque domande in `banco-firme.js`, e sono le cinque che, se rispondono male,
fanno danno in ordine decrescente: si consegna una scheda che nessuno ha visto?
dopo la consegna si firma ancora? consegnando due volte l'ora cambia? fra i
firmatari finisce chi non ha firmato? in allenamento la scheda compare?

**Provato sabotando il file apposta** — tolta l'irreversibilità a
`registraConsegna()` e a `firmaScheda()` — il banco esce con 1 e stampa due
frasi: *«si è potuto firmare DOPO la consegna»* e *«la seconda consegna non
restituisce la prima»*. La prima stesura si schiantava invece di parlare:
usciva con 1, quindi tecnicamente diceva di no, ma con una pila di Node al
posto del motivo. **Un banco che si schianta funziona e non serve.**

---

## Il tema Sole *(16/08/2026, e l'ha chiesto il campo)*

Il campo ha detto due frasi, e sono due lavori diversi.

**«Col telefono sotto il sole diretto ci vorrebbe un po' più di contrasto, ma
all'ombra anche la modalità chiara funziona benissimo.»**

Sotto il sole diretto lo schermo perde la battaglia: la luce che emette è meno
di quella che gli arriva addosso, e tutto ciò che stava a metà strada fra il
testo e il fondo sparisce. **Non sparisce a caso** — se ne vanno i grigi
intermedi, i veli, le ombre; le tinte sature e i neri veri restano. Quindi il
rimedio non è un disegno nuovo, è **il chiaro con i mezzi toni tolti di
mezzo**: il grigio minore va quasi al nero, i bordi si vedono, velo e grana
a zero, ombre via — un'ombra al sole non è un'elevazione, è contrasto buttato.

**Ed è costato una mappa di ruoli, zero regole di componente.** È esattamente
la promessa scritta in cima al foglio di stile — *cambiare tema = riscrivere
la mappa dei ruoli* — riscossa per la prima volta su un tema nato dopo. Se il
sistema a tre strati non fosse esistito, questa sarebbe stata una giornata.

**Quello che è rimasto fuori di proposito.** La *modalità sole* immaginata a
maggio prevedeva bersagli a 56px e testo a 1,15×. Sono rimasti fuori: cambiare
le misure sposta l'impaginazione della schermata che per regola non scorre, e
questo non si decide da questa parte dello schermo. **Il campo ha chiesto
contrasto, e ha avuto contrasto.** Se al prossimo giro dice che i tasti sono
piccoli, allora si parla di misure — con quella frase in mano.

**La gerarchia, al sole, non la fa il colore.** Per questo `--text-2` e
`--text-3` possono collassare quasi sullo stesso valore senza appiattire
niente: a distinguere restano il peso e la dimensione, che al sole si vedono.

### «In modalità automatica non cambia nulla»

Vero, e giusto: *Automatica* segue l'impostazione **del telefono**, e nessuno
cambia l'impostazione del telefono mentre cammina. Ma l'etichetta prometteva
che l'app si accorgesse di dove sei — ed è Norman in forma pura: **un'etichetta
che promette più di quello che fa è un errore del disegno anche quando il
codice è corretto.** Sotto le quattro pastiglie adesso c'è scritto cosa fa
ciascuna, in una riga.

*Non è stato usato nessun sensore di luce ambientale: su iOS non esiste, e
un'automazione che funziona su metà dei telefoni è peggio di una scelta
manuale che funziona su tutti.*

### Il colore della barra non si ripete più

Il colore della barra del browser era un elenco di esadecimali scritti a mano
accanto ai temi. Con il terzo tema diventava **una fonte per due**, cioè il
posto esatto da cui parte una divergenza silenziosa. Adesso `applyTheme()` lo
**chiede al foglio di stile** — legge `--surface` calcolato sul body, cioè la
stessa mappa che ha appena colorato la pagina. Non può più sbagliarsi, e un
tema nuovo non deve ricordarsi di aggiornarlo. *Due esadecimali in meno: il
tetto è sceso da 66 a 64.*

---

## Tre cose dette dal campo in una frase sola *(16/08/2026, sera)*

*«La modalità automatica continua a non funzionare, la modalità sole non cambia
molto dalla light, il tasto attiva notifiche funziona? perché ogni volta che
vado sul mio profilo mi chiede di attivare le notifiche ma l'ho fatto 1000
volte.»*

Tre difetti diversi, e **nessuno dei tre era un errore di codice**. Il codice
faceva esattamente quello che c'era scritto. È il caso di Norman al completo:
tre volte l'errore è del disegno, e tre volte chi usa l'app si è chiesto se
avesse sbagliato lui.

### Il tasto delle notifiche non guardava mai se erano già attive

Diceva *Attiva notifiche su questo dispositivo* sempre, anche a permesso già
concesso da settimane. **Chiedere una cosa già fatta non è solo inutile: fa
dubitare di averla fatta, e la volta dopo la si rifà.** Mille volte, appunto.

Il permesso lo sa il browser, e bastava chiederglielo: mancava la domanda, non
il dato. I tre stati vanno detti diversi perché *sono* diversi — **concesso**
(non c'è niente da fare, e il tasto lo dice invece di invitare), **negato**
(non si può riaprire da qui, va cambiato nelle impostazioni: un tasto che non
può funzionare non deve invitare a premerlo, ed è spento), **mai chiesto** (e
allora si chiede).

### «Automatica» era corretta e sembrava rotta

Segue l'impostazione **del telefono**, e nessuno cambia l'impostazione del
telefono mentre cammina su un percorso. Dal di fuori: non succede niente, due
volte di fila, quindi è rotta.

Aggiungere una riga di spiegazione — fatto poche ore prima — non è bastato:
una nota sotto un controllo è una didascalia, e le didascalie non si leggono.
**Adesso lo dice la pastiglia stessa: *Automatica · chiara*.** Così la si può
smentire guardandola, invece di sospettarla. *La lezione, e non è la prima
volta: se una cosa sembra rotta, il rimedio non è spiegarla accanto, è farle
dire cosa sta facendo.*

**E il tema si salva appena scelto.** Restava appeso al tasto *Salva* insieme
al nome e alla tessera: chi sceglieva un tema e usciva senza salvare se lo
ritrovava cambiato al rientro. Un tema non è un campo di un modulo — si vede
subito, quindi si salva subito. **L'app eseguiva una scelta e poi la
rinnegava**, che è il modo più veloce per non essere creduti.

### Il tema Sole era un mezzo passo, e un mezzo passo qui vale zero

Prima versione: fondo `sand-100` contro `sand-200` del chiaro, un solo gradino
di grigio più scuro. La differenza c'era, e non si vedeva — che al sole
significa che non c'era. **Un mezzo passo verso il contrasto non è metà del
risultato: è zero, più una voce in più nel menu.**

Adesso il foglio è **bianco pieno**, i separatori vanno al nero (`sand-900`
per i bordi forti), il grigio minore resta l'unico gradino intermedio. Se
all'ombra risulterà brutto va bene così: **non è il tema dell'ombra.** Il
timore di renderlo sgradevole era il motivo della timidezza, ed era il timore
sbagliato — un tema con un mestiere dichiarato va giudicato sul mestiere.

---

## Le compagnie straniere: perché l'elenco francese non è stato caricato *(16/08/2026)*

È arrivato il PDF **«Clubs labellisés – saison 2025»** della FFTA, con circa
250 righe, e il link al portale club della FFTL. La domanda era: li carichi?

**No, e la ragione non è il lavoro — è che quel PDF non è l'elenco dei club
francesi.** È l'elenco dei club *labellizzati*, cioè quelli che hanno ottenuto
un riconoscimento federale: due-tre centinaia su circa milleseicento. Caricarlo
come «i club FFTA» darebbe all'app una lista che **dice «Codice sconosciuto»,
in rosso, alla grande maggioranza dei club veri.**

E questo è il difetto peggiore possibile per un controllo. Chi riceve
un'accusa falsa fa una di due cose: **cancella un dato giusto**, oppure
**smette di fidarsi del rosso**. Nel secondo caso il controllo è spento e non
lo sa nessuno — la stessa frase già scritta per il guardiano che gridava al
lupo. *Un elenco parziale non è un elenco al 20%: come strumento di verifica
vale meno di zero.*

La FFTL non si è potuta nemmeno leggere: il portale costruisce la lista con
JavaScript dopo il caricamento, quindi la pagina scaricata è vuota. Serve
l'elenco vero, in un formato che sia un elenco — un CSV, un foglio, o la
pagina già aperta e salvata.

### Quello che invece si poteva fare subito, ed è stato fatto

L'app possedeva **solo** l'elenco FIARC e lo applicava a **tutti**. Un
organizzatore francese, svedese o inglese scriveva il codice del proprio club
e si vedeva rispondere *Codice sconosciuto* in rosso, ogni volta, su ogni
iscritto — e **non era un difetto teorico in attesa dei dati francesi: c'era
già oggi, per tutte e sedici le federazioni tranne una.**

`haElencoCompagnie(fed)` dice se l'app possiede una lista per quella
federazione. Dove non la possiede, **tace**: il codice si scrive, si salva e
non si giudica. Dove la possiede, il rosso resta esattamente com'era.

*Regola generale, e vale oltre questo caso:* **un controllo può dire «no» solo
dove sa dire «sì».** Se non ha i dati, il silenzio è l'unica risposta onesta.

### Cosa serve per caricarli davvero

1. **L'elenco completo**, non un sottoinsieme. Se esiste solo il parziale, il
   codice del club per quella federazione resta senza controllo — che è la
   situazione di adesso, ed è corretta.
2. **Una mappa per federazione**, non una sola. Oggi `COMPAGNIE` è una mappa
   piatta di codici FIARC con regione, provincia e contatti: quei campi non
   esistono per un club francese, che ha *région*, *département* e un numero
   di struttura a sei cifre. Due elenchi diversi nella stessa mappa si
   scontrerebbero il giorno in cui due codici coincidono.
3. **Il filtro del campo va rivisto.** Oggi accetta sei caratteri
   alfanumerici, tagliati a sei: il formato FIARC. Un numero di struttura
   francese ci passa per caso, non per disegno.

---

## Al sole la tinta sopravvive, la profondità no *(16/08/2026, sera tardi)*

**Il tema Sole era stato spinto nel verso sbagliato, e l'ha detto il campo:**
*«al sole i colori così scuri sono difficili da vedere, dei colori più vivi
aiuterebbero, magari in tutta l'app, che è un po' spenta».*

Il ragionamento a scrivania era: al sole serve contrasto, quindi tutto più
scuro. **Vale per il testo, e non vale per un tasto colorato**, per una ragione
che da qui non si vede: sotto il sole lo schermo non riesce più a fare il
bianco luminoso, quindi un fondo scuro e un altro fondo scuro diventano due
macchie fangose, distinguibili solo avvicinando gli occhi. E il tasto del
punteggio **non si legge, si riconosce** — a colpo d'occhio, mentre si guarda
il bersaglio.

**Quello che sopravvive alla luce forte è la tinta, non la profondità.** Quindi
fondi vivi, e sopra **inchiostro nero invece del bianco**: sul fondo chiaro il
nero regge, e la tinta resta tinta. È la soluzione dei cartelli stradali, che
quel problema lo hanno risolto un secolo prima di noi. Il testo, invece, resta
quasi nero su bianco: lì il ragionamento di prima era giusto.

*La lezione, e va scritta perché è la seconda volta oggi:* **contrasto e
riconoscibilità non sono la stessa grandezza.** Il testo si legge e vuole
luminanza; un codice colore si riconosce e vuole saturazione. Trattarli con la
stessa regola sbaglia uno dei due, sempre.

### «Un po' spenta», e cosa non è stato fatto

La seconda metà della frase — *magari in tutta l'app* — non è stata eseguita, e
non per pigrizia. La tavolozza terrosa è una scelta di identità presa mesi fa e
scritta in *Il sistema di stile*; ribaltarla su tutti e tre i temi in una sera,
al buio, per una frase, sarebbe **cambiare l'app perché una condizione la
metteva in difficoltà** — e per quella condizione ora esiste un tema apposta.
Il posto giusto dove provare i colori vivi è il tema Sole: se lì funzionano e
piacciono, allora se ne riparla per il resto, con una prova in mano.

### Il tema automatico è stato tolto

*Automatica* prometteva che l'app si accorgesse della luce intorno. **Non
può**: il sensore di luce ambientale non è disponibile su iOS né su Safari, e
su Android sta dietro un permesso sperimentale. Un'automazione che funziona su
metà dei telefoni è peggio di una scelta manuale che funziona su tutti.

Il rimedio è stato tentato **tre volte in un giorno**, e la sequenza vale più
della conclusione: prima una riga di spiegazione sotto il controllo (una
didascalia — non si leggono), poi la pastiglia che dichiarava a cosa stava
corrispondendo (*Come il telefono · chiara*), infine il nome cambiato. Alla
terza volta che la domanda tornava, la risposta giusta era **toglierla**.

> **Una funzione che va spiegata due volte è una funzione di troppo.**

Restano tre temi — Chiara, Scura, Sole — tutti e tre scelti a mano, e l'app
parte da chiara. È la mossa di Ive, e questa volta l'ha proposta il campo:
*«togli la modalità automatica, l'app si apre su light e poi ognuno sceglierà
quale modalità usare»*.

**Chi aveva «automatica» salvata sul telefono passa a chiara senza
accorgersene.** `normalizeTheme()` continua ad accettare `"auto"` per quello e
solo per quello, come già fa per i vecchi `"elegante"` e `"satura"`: è una
migrazione, non un residuo. E la conversione **si riscrive**, invece di
ripetersi ad ogni apertura — un valore che il foglio di stile non conosce non
deve restare in memoria ad aspettare qualcuno che lo legga senza passare di lì.

---

## Chi c'è già, e cosa fa *(verificato il 16/08/2026)*

*Scritto perché stava per finire in una presentazione la frase «non esiste
nessun'altra app che fa quello che facciamo noi». **È falsa.** Questa sezione
esiste per non farla riscrivere fra tre mesi.*

**3D SKill Board** — Bowsport Software Solutions GmbH, area di lingua tedesca.
iOS, Android e Amazon; gratuita con funzioni a pagamento (Stripe). Si definisce
*die #1 App im Bogensport* e ha i numeri per dirlo: oltre 25.000 download e 4,8 di media. Fa: punteggi con
sistemi di valutazione diversi, un *Parcours Wiki* — elenco centrale dei percorsi tenuto
aggiornato dagli utenti stessi, che possono votarli e commentarli, sincronizzazione del risultato di un evento fra tutti gli
arcieri partecipanti che usano l'app, tornei, statistiche,
profili di attrezzatura, vista mappa e registrazione della traccia GPS.
Dietro c'è la piattaforma **3dturnier.com**, che tiene un calendario dei tornei dove ogni arciere registrato può
pubblicarne uno, e la gestione permette già di condurre per intero un torneo
3D.

**3D Score Buddy** — Android. Cloud-Connect per i
tornei, tracciamento GPS, risultati dal vivo. Per chi gestisce un
campo: pubblicazione del percorso e degli eventi, i
visitatori si portano tutti i bersagli dentro l'app, classifiche dal vivo
proiettabili su uno schermo per le premiazioni, e il tracciamento di tutti i
gruppi sul percorso in tempo reale per vedere dove si formano le code.

**Archery 3D** — Beavercode sagl, Chiasso. **Solo iOS**, in italiano, ed è la
più vicina a noi sul punteggio: Tracciato, Battuta,
Unmarked Animal, 3D-3D, 3D Standard, 3D Hunting, Percorso e Round 3D, con il
numero di frecce attivato o disattivato a seconda del percorso scelto e la
possibilità di aggiungere quante piazzole si vuole. Cioè: **i
formati FIARC li fa già qualcuno, e li fa bene.**

**Schiesszettel** — solo iPhone, tedesca. Punteggi per più persone insieme,
i sistemi di valutazione dei parcours, fino a tre foto per piazzola, invio del
risultato per e-mail o messaggio, e il percorso spedibile come modello agli
amici.

**MyTargets** — gratuita e a codice aperto, in oltre venti lingue, con gestione dell'attrezzatura, statistiche e
venticinque visuali di bersaglio fra cui campagna e 3D. È però
un'app da targa e campagna con il 3D dentro, non un'app da percorso.

**iShoot 3D Archery** — Stati Uniti, costruita
attorno alle regole IBO e ASA, una freccia per bersaglio.

### Cosa non possiamo più dire

**Queste tre cose le fanno già, e meglio di noi in almeno un caso:**

- **funziona senza rete** — le app native lo fanno da sempre. Per noi è
  notevole perché siamo una pagina web, non perché sia raro;
- **conosce i regolamenti e conta da sola** — lo fanno tutte;
- **l'elenco dei campi** — il *Parcours Wiki* di Skill Board è più grande,
  più vecchio e lo tengono aggiornato migliaia di persone. Il nostro elenco di
  compagnie non gli si avvicina.

**E la parte scomoda: la gara ufficiale — il punto 1 di *Cosa manca* — è
esattamente dove la concorrenza è più forte.** Skill Board conduce un torneo
intero da anni; Score Buddy proietta la classifica dal vivo alla premiazione.
Non è un campo vuoto in cui arrivare con calma: è il loro.

### Cosa invece, oggi, non ha nessuna delle sei

Non un elenco di funzioni: **è un solo pezzo**, che sono le persone fra un
giro e l'altro. Le altre app finiscono quando finisce il percorso.

- lo spazio della **compagnia**, con i suoi campi e i risultati di chi ci tira;
- gli **allenamenti aperti**: dico quando vado, chi vuole si aggiunge;
- il **mercatino dell'usato** con i filtri veri del 3D — libbraggio, allungo,
  mano, spine;
- il **modo di scriversi** senza passare da WhatsApp o Facebook.

E due cose di forma, che valgono più di quanto sembri:

- **si installa dal browser, non da uno store.** Beavercode è solo iOS,
  Schiesszettel solo iPhone, Score Buddy solo Android: chi cambia telefono o
  tira con un gruppo misto perde metà del gruppo. Noi no;
- **è gratis per intero.** Skill Board ha funzioni a pagamento, Score Buddy ha
  piani per i campi. Non è una virtù eterna — è una descrizione di oggi, e va
  detta come si dice del mercatino: *per il momento*.

### La frase che si può dire, e quella che no

- **No:** *«non esiste nessun'altra app che offra questi servizi»*. È falsa, e
  la smonta chiunque tiri in Austria o in Ticino. Una frase così, sbugiardata
  una volta, si porta dietro tutto il resto della presentazione.
- **Sì:** *«di app per segnare i punteggi ce ne sono, e alcune fatte bene.
  Quello che non abbiamo trovato è un'app che tenga insieme i punteggi e le
  persone: la compagnia, gli allenamenti aperti, il mercatino, i messaggi —
  senza passare da uno store, in nove lingue, gratis.»*

*Questo controllo va rifatto prima di ogni presentazione pubblica. Vale al
16/08/2026 e non oltre.*

### Il Sole a portata di pollice, sul percorso *(fatto il 16/08/2026, l'ha chiesto il campo)*

**Nasce da un equivoco utile.** Nella presentazione le pastiglie *Chiara /
Sole* stanno **fuori** dalla scheda: sono un comando della pagina, servono a
far vedere il tema a chi la legge, non sono un pezzo dell'app. Ma la domanda
che è arrivata guardandole è quella giusta: *se uno al campo non riesce più a
leggere lo schermo, deve davvero andare nel profilo per cambiare tema?*

**No, e il motivo è già scritto due volte in queste note.** Il rimedio sta
accanto al problema — è la regola della striscia dell'annulla, ed è
esattamente l'errore che è costato una stella a Skill Board (la correzione
c'era, ma stava altrove e nessuno l'ha trovata). Il problema qui si presenta
**sul percorso**, in piedi, col guanto, con lo schermo che non si legge. Farsi
attraversare tre schermate proprio con lo schermo che non si legge è il
disegno che fallisce nel momento in cui serve.

**Ma tre pastiglie sul percorso sono la risposta sbagliata.** Sono tre comandi
sempre presenti, inutili per il 99% del giro, su **l'unica schermata che per
regola non scorre** e che deve mostrare tre cose sole. E un tocco per sbaglio
ti ribalta l'aspetto dell'app in mezzo a una piazzola.

**La forma giusta è un interruttore solo, e binario: Sole acceso / spento.**
Perché *Sole* non è una preferenza — è un'emergenza. Chiara e Scura sono la
preferenza, e restano nel profilo dove si scelgono una volta e basta. Il Sole
si accende quando esce il sole e si spegne quando si rientra nel bosco, e
spegnendolo si torna al tema che avevi scelto: **due stati, nessuna scelta da
fare.** Un interruttore non ha bisogno di essere capito.

**Dove:** nella testata del percorso, che c'è già, non scorre, e sta lontana
dalla tastiera dei punteggi — quindi nessun rischio di prenderlo mentre segni.
**Come:** con l'etichetta scritta, non un solo glifo di sole. *Di soli glifi
non lo legge nessuno*, e un sole da solo si legge come «luminosità».

#### È durato mezz'ora in testata, e il campo aveva ragione

**Prima versione: un tasto icona in testata, fra l'uscita e la segnalazione.
Nessuno lo vedeva.** Il verdetto dal campo, testuale: *«il problema secondo me
è che non si nota; pensavo di trovarmi le scritte come hai fatto qua»*. Tre
motivi, tutti prevedibili e nessuno previsto:

1. **In cima.** Il pollice sul percorso sta in basso, sui tasti del punteggio.
   La testata è dove si guarda quando si cerca l'uscita, non quando si cerca
   un rimedio.
2. **Solo glifo.** La testata dà 44 pixel e nessuna parola. Un sole senza la
   parola si legge «luminosità» — e questo è il comando che deve essere
   trovato **quando lo schermo non si legge più**: se per trovarlo devi leggere
   bene, non serve a niente.
3. **Grigio come gli altri due.** Tre tasti neutri identici, e il terzo è
   arrivato dopo: non c'era nessun motivo per notarlo.

**Adesso sta nella riga delle scorciatoie**, a sinistra, con la parola,
alto quanto la Classifica. Quella riga era allineata tutta a destra e **metà
larghezza stava vuota**: lo spazio c'era già, ed era esattamente lì.

**Spento è neutro, non giallo.** La Classifica accanto è già dorata: due tinte
d'oro affiancate sarebbero due etichette e nessuna notizia — la stessa regola
per cui *Segnala* a riposo non è rosso. Ma neutro non vuol dire spento: bordo
pieno, testo a `--text-1` e la parola. **Piccolo non vuol dire invisibile** —
ed è la stessa correzione già fatta una volta su questa riga, quando la
Classifica senza fondo era sparita.

**Acceso è pieno**, con `--sun-on-bg` / `--sun-on-fg`. Al sole diretto bordi e
tinte tenui sono le prime cose a sparire, quindi lo stato deve reggere proprio
nella condizione in cui lo accendi. Porta anche `aria-pressed`.

*Ripulito.* Le regole `.bar-btn.acceso` e la variante di testata sono state
tolte, e con loro il supporto a `premuto` in `tastoBarra`: **una regola senza
nessuno che la produca è un tranello che aspetta**, ed è la stessa lezione
degli 8px rimasti nel file pronti a tornare.

#### Com'è fatto

- **`toggleSole()`** ricorda in `state.themeAvantiSole` il tema da cui sei
  partito e ce lo riporta quando spegni. Chi ha scelto Sole dal profilo non ha
  un «tema di prima»: torna a chiara, che è il predefinito dichiarato.
- **Compare durante il giro**, nella riga delle scorciatoie, quindi non c'è
  quando è aperto il pannello della classifica — lì la scorciatoia non esiste
  proprio, e il pannello si chiude con un tocco.
- **Non è legato a `currentUser`.** Chi segna un giro senza essere entrato ha
  lo stesso sole addosso.
- **`--sun-on-bg` / `--sun-on-fg`, una coppia per tema.** Il primo tentativo
  usava `var(--gold)` con testo scuro scritto a mano: nel tema Sole `--gold`
  vale `gold-800`, cioè un oro scuro, e il tasto sarebbe stato scuro su scuro —
  illeggibile **esattamente nel tema che esiste per essere letto**. Un
  esadecimale dentro un componente, e la trappola è scattata al primo tema.
- **Ha richiesto zero traduzioni nuove:** `theme_sun_label` esiste già in tutte
  e nove le lingue, perché il tema c'era già nel profilo.

`BUILD_STAMP` → `2026-08-16-sole-scorciatoie`.

#### Cosa NON è stato fatto, e perché

- **Non è nelle altre schermate.** Il diario e la compagnia si guardano quasi
  sempre a casa. Un comando che sta ovunque smette di voler dire qualcosa.
- **Non sono tre pastiglie.** Chiara e Scura restano una scelta da fare una
  volta, nel profilo. Sole non è una preferenza, è il tempo che cambia.

*Verifica fatta.* Il tema Sole nell'app c'è ed è completo — `body.theme-sole`,
`normalizeTheme` che accetta `"sole"`, la pastiglia nel profilo, e il colore
della barra del browser chiesto al foglio di stile invece che scritto a mano.
**Quindi la riga della presentazione che promette tre temi e il Sole è vera e
si può pubblicare.**

#### Il pallino giallo *(16/08/2026, e l'ha chiesto il campo)*

Il tasto neutro era la scelta giusta sul colore di fondo e **sbagliata sul
glifo**. Adesso il disco centrale del sole è pieno di `--sun-dot:#FFC21A`,
giallo vivo, in tutti e tre i temi e sia acceso che spento.

**È l'unica tinta dell'app che non cambia fra i temi, e non è una svista:** è
un contrassegno, non un colore di superficie. Il tasto deve farsi trovare in
tutti e tre i temi **e con lo schermo già illeggibile**, e a quel punto un
giallo che si adatta al tema si adatta anche a sparire. È largo quattro pixel
di raggio: si nota senza gridare, che è quello che serve a un comando usato
due volte in un giro. La regola *«il colore è una notizia, non un'etichetta»*
resta in piedi — il fondo del tasto è ancora neutro a riposo e pieno quando è
acceso; il pallino non dice uno stato, dice *sono io*.

*Come.* `style="fill:var(--sun-dot)"` dentro il tracciato del glifo, non
l'attributo `fill=`: gli attributi di presentazione dell'SVG non conoscono
`var()`. Un `fill="var(--sun-dot)"` sarebbe stato semplicemente ignorato.

**Link assoluti, sempre.** I collegamenti erano scritti `href="/"`. Sul sito è
corretto; **ma questa pagina non vive solo sul sito** — si manda per posta, si
apre da un file scaricato, si guarda da un'anteprima. Da lì `"/"` punta alla
radice di *quel* posto, non ad arctrail3d.com, e chi tocca *Apri ArcTrail 3D*
finisce da un'altra parte. Adesso sono tutti `https://arctrail3d.com/…`.
**Regola: una pagina fatta per essere spedita non ha link relativi.**

#### Quanto è fedele la dimostrazione, per davvero

Non è una figura dell'app: è **ricostruita**, con gli stessi primitivi, gli
stessi caratteri, gli stessi colori dei tasti e la stessa sequenza di regioni
— testata, scena, scorciatoie, striscia dell'annulla, tastiera. Quello che
**non** è identico, e va saputo:

- **I cerchi del turno sono pallini**, non le pastiglie con il nome sotto
  (`.turno-badge` + `.turno-nome`). In una scheda larga 330px i nomi non ci
  stanno senza andare a capo.
- **L'andamento è ridotto a due numeri** — totale e piazzole chiuse. Nell'app
  la scena porta di più.
- **Il pannello della classifica è due righe finte**, con Anna che segue i
  punteggi toccati e Dino fermo.
- **La tastiera è quattro tasti due per due**, che è quello che dà davvero il
  Round 3D FIARC. La regola dell'app — *mai più di tre per riga* — è
  rispettata; ma le altre federazioni hanno tastiere diverse, e la pagina ne
  mostra una sola.

Se un giorno la schermata del percorso cambia, **la pagina non se ne accorge da
sola**: va aggiornata a mano. È il prezzo di una dimostrazione viva invece di
una figura, e va scritto qui perché è esattamente il modo in cui una pagina
comincia a mentire.

#### La tastiera mostrava la minoranza, e il tema Sole era inventato

**Due errori trovati insieme, il 16/08, e tutti e due dallo stesso sguardo:
la pagina non stava copiando l'app, la stava indovinando.**

**Primo: la tastiera non aveva il Perfect.** Era il Round 3D FIARC — tre zone,
Super Spot / Spot / Sagoma — e il campo ha fatto notare che *la maggior parte
delle federazioni ha il Perfect*. Contato sul codice, ha ragione: `ZONES_4`
(Perfect 11 / Super Spot 10 / Spot 8 / Sagoma 5) è la tabella di **FITARCO,
FFTA, SwissArchery, Archery GB, Spagna, Svezia, Turchia e Russia**. `ZONES_3`
è **solo FIARC**, `ZONES_2_IFAA` è IFAA, e NFAS ha le sue. La pagina mostrava
il caso di **una** federazione su sedici.

*Non si è aggiunto un Perfect al Round 3D*, che non ce l'ha: si è **cambiata
federazione**. La schermata ora è la tabella 3D di World Archery. Cinque tasti,
righe di **tre e due** — con la stessa regola dell'app, ricopiata dal suo
codice: `≤3` una riga, `4` due e due, `5` tre e due. **Una tastiera inventata
per stare bene in pagina sarebbe stata la prima bugia.**

*Quello che si perde:* con World Archery le due frecce valgono uguale, quindi
la pagina non racconta più che in FIARC la seconda vale meno. Va bene: quella
era una finezza per chi tira in FIARC, e la pagina la legge anche chi non ci
tira.

**Secondo, e più grave: i colori del tema Sole nella pagina erano inventati.**
Erano tinte scure e sature con l'inchiostro bianco. Nell'app sono l'opposto:
`clay-400`, `lime-500`, `slate-400`, `red-400` — **fondi vivi con
l'inchiostro nero**, che è la soluzione dei cartelli stradali e sta scritta nel
foglio di stile con i rapporti di contrasto calcolati. La pagina stava
mostrando un tema Sole **che non esiste**, e mostrandolo come prova che il tema
Sole funziona. Adesso i token sono copiati riga per riga.

**La regola che ne esce, e vale per ogni pagina futura:** *un valore che sta
anche in `index.html` non si riscrive a mano, si copia.* Se sembra più comodo
riscriverlo, è perché nessuno ha ancora messo a confronto le due schermate.

### La presentazione in inglese *(16/08/2026)*

`presentation-en.html`. **Stesso identico CSS e stesso identico JavaScript**,
copiati carattere per carattere: cambiano solo il testo e quattro etichette
della dimostrazione. Se un giorno il disegno cambia, cambia in un posto e si
incolla — **due fogli di stile che si somigliano divergono, sempre.**

Le uniche scelte di traduzione che non erano ovvie:
- *Sagoma* → **Body**, *Zero* → **Miss**. Non «Silhouette» e «Zero»: sono le
  parole che un arciere di lingua inglese usa al picchetto.
- *Piazzola* → **Target**. In inglese non esiste la distinzione fra la
  postazione e l'animale, e forzarla creerebbe un termine che nessuno usa.
- **I nomi dei giochi FIARC restano in italiano** — Percorso, Tracciato,
  Battuta. Sono nomi propri di formati di gara: tradurli li renderebbe
  irriconoscibili proprio a chi va a tirare in Italia.
- *Libbraggio, allungo, spine* → **draw weight, draw length, spine**.

### Il loro design, e perché la nostra pagina sembrava vecchia *(16/08/2026)*

**Prima la diagnosi, che non è quella che sembrava.** Le due app di
concorrenza provate su Android **non hanno un disegno migliore del nostro** —
detto dal campo dopo averle usate. Skill Board dichiara nell'App Store che le
sue icone piatte vengono da `icons8.com`, e il suo sito è firmato *Design by
Zemez*, cioè un modello comprato. Score Buddy usa **emoji** come icone delle
funzioni sulla propria pagina. Sono scelte da chi risolve il disegno
comprandolo, non da chi lo fa.

**Quella che sembra più moderna è la pagina di Beavercode**, l'app di Chiasso.
E lì la sensazione è giusta, ma la causa non è il gusto: **è che loro hanno una
pagina di prodotto e noi avevamo un documento.** La loro ha il logo in SVG, una
fotografia grande della sagoma, un video dimostrativo, la galleria delle
schermate e le testimonianze con nome e faccia. La nostra aveva un'icona da 76
pixel e poi duemila parole. **Nessuna quantità di scrittura buona compensa il
fatto che non si vede niente.** Ed era il punto su cui si girava da tempo senza
concludere.

#### La correzione, e perché non è «fare le schermate»

La strada ovvia — foto e schermate — è quella che fanno tutti, costa tempo, e
produce **immagini morte** che invecchiano a ogni versione. E per un'app che
non sta su nessuno store, mettere in pagina il *ritratto* di qualcosa che il
browser saprebbe **eseguire** è assurdo.

**Quindi la schermata del percorso è dentro la pagina, e funziona.** Non un
PNG: la pista vera, con la testata, i cerchi del turno, l'andamento, la
striscia dell'annulla e i quattro tasti del Round 3D FIARC ai valori di
regolamento — 16/14/10 alla prima freccia, 9/7/5 alla seconda. Chi apre la
pagina **tocca un tasto e vede il totale salire**: la frase *un tocco è una
freccia* non va letta, si prova in tre secondi. È l'unica cosa che nessuno dei
sei concorrenti può fare, perché sono tutte app native che distribuiscono
figure.

**E lì dentro c'è anche il tema Sole**, acceso **dal tasto che sta dentro la
schermata**, dove sta nell'app — insieme alla Classifica, che apre il pannello
con i totali. Le prime due pastiglie *Chiara / Sole* stavano **sotto** la
scheda ed erano un comando della pagina: hanno fatto il loro mestiere per
mezza giornata e poi sono diventate una bugia, perché nel frattempo l'app il
comando ce l'ha davvero e in un altro posto. **Una dimostrazione che si
allontana dal prodotto è peggio di una figura ferma**, perché una figura ferma
almeno non promette un gesto che poi non c'è.

Il tema si dimostra cambiandolo, non descrivendolo — ed è la prova pubblica
della promessa scritta in cima al foglio di stile: *cambiare tema = riscrivere
la mappa dei ruoli*, zero regole di componente. La `.pista.sole` della pagina è
esattamente questo, dieci righe di variabili.

#### Le altre due cose che facevano sembrare vecchia la pagina

- **I caratteri erano quelli di sistema.** L'app ha un'identità tipografica
  scritta e difesa in queste note — Fraunces per marchio e titoli, Inter per
  tutto il resto e per ogni cifra — e la pagina che la presenta la buttava via,
  usando lo stack di sistema. **Una pagina che presenta un prodotto e non gli
  somiglia sta dicendo due cose diverse.** Ora carica le stesse due famiglie
  dallo stesso URL: stessa cache, e la pagina *è* l'app.
- **I colori erano un secondo insieme, inventato lì.** `--ink`, `--teal`,
  `--paper`: nomi che non esistono nel prodotto, valori vicini ma non uguali.
  Adesso la pagina ha gli stessi tre strati del foglio dell'app e i primitivi
  sono copiati da `index.html`. *Regola: la presentazione non inventa token.*

**Quello che NON è stato fatto, di proposito:** niente video, niente
testimonianze, niente foto. Il video invecchia a ogni versione, le
testimonianze a questo punto sarebbero due amici, e la fotografia non ce
l'abbiamo. Una pagina che finge di essere più avanti di quanto è si smonta al
primo che apre l'app. *La boldezza si spende in un posto solo: qui è la pista
viva, e tutto il resto sta zitto.*

### Le due serie, guardate da vicino *(16/08/2026)*

**3D SKill Board** — Bowsport Software Solutions GmbH, una società, molti anni
di lavoro. **Come è fatta:** gli arcieri si inseriscono una volta e si
riusano; il percorso si carica dal *Parcours Wiki* o si crea in locale; a fine
evento il risultato si sincronizza con tutti i partecipanti che hanno l'app.
**Come si mantiene:** gratis alla base, **Premium 24 €/anno**, **Training
49 €/anno**. Nel gratuito stanno punteggio, confronto, attrezzatura, wiki e
sistemi di valutazione. Dietro il muro stanno **le statistiche, la traccia
GPS, la classifica del percorso, l'inserimento del punto d'impatto e le figure
degli animali**; nel piano Training il diario di allenamento, i gruppi di
allenamento e l'analisi della rosata. Per le compagnie: iscrizione al torneo,
punteggi, panoramica dal vivo per il pubblico, gestione del sodalizio, e **il
pagamento della quota del percorso dentro l'app** — così al campo c'è meno
contante da sorvegliare.

**3D Score Buddy** — Jürgen Weiß, *Made with ❤️ in Germany*: **una persona
sola**, come qui. iOS e Android, sette lingue **compreso l'italiano**. Gratis,
e **gratis anche il portale per le compagnie**. Fa: tocco singolo, rotazione
automatica degli arcieri, oltre trenta sistemi di punteggio più quelli
personalizzati, funziona senza rete. Per chi organizza: percorsi e tornei in
pochi minuti, classi d'arco, **manifesti con il QR**, valutazione a somma, a
scarti o *best-of*, esportazione Excel e PDF, riconoscimento automatico dei
doppioni, distribuzione dei punteggi e **difficoltà per bersaglio**.

#### Le tre idee che valgono, in ordine

**1. La voce che dice ad alta voce quello che è stato segnato.** Score Buddy
la chiama *Voice Output* e la spiega in una riga: *gli altri arcieri sentono
subito cosa è stato inserito, e questo riduce gli errori di segnatura.*

**È la nostra tesi, risolta meglio della nostra soluzione.** Queste note
dicono da sempre che una scheda vale perché **gli altri hanno visto**, e la
controfirma è il modo che avevamo trovato: costa un tocco a un'altra persona,
al picchetto, col guanto. La voce non costa niente a nessuno: **testimonianza
a costo zero**, che funziona a mani occupate, al sole, senza che nessuno
guardi uno schermo. Ed è coerente con l'obiettivo scritto nella *Pista* —
*segnare senza guardare*. La cosa che rende l'app sgradevole al picchetto (uno
con la testa nel telefono) diventa la cosa che la fa accettare dal gruppo.
*Da provare sul campo prima di crederci: `speechSynthesis` esiste nel browser,
ma va verificato che parli davvero a schermo spento, offline e su iPhone.*
Deve essere **spegnibile**, e deve dire poco: nome, numero della freccia,
punteggio.

**2. Il QR del percorso.** Il campo espone un codice, l'arciere lo inquadra e
si porta dentro l'app i bersagli di quel percorso — numeri, nomi, distanze.
Score Buddy lo dà gratis alle compagnie e ci stampa sopra dei manifesti.
**Per noi il pezzo mancante è solo il ponte**: compagnie, campi e percorsi ci
sono già, e chi li pubblica è già la compagnia. È anche la risposta a una
domanda che il nostro elenco non ha: *quando arrivo a un campo nuovo, come fa
l'app a sapere che percorso sto facendo?*

**3. La media della prima freccia.** Skill Board tiene due medie: `DPS`, la
media per freccia tirata, e `BHS` — *BowHunter Score* — **la media contando
solo la prima freccia, dove colpire alla seconda vale come sbagliare.** La
seconda è la misura giusta per il 3D, perché nel 3D il tiro che conta è il
primo. Il nostro diario ha le medie; questa è poco lavoro e dice molto di più.
*Il nome no: `DPS` viene dai giochi di ruolo e qui non dice niente a nessuno.*

#### Quello che fanno e per noi non è adesso

- **La cassa del percorso** (Skill Board): la quota si paga dall'app, al campo
  gira meno contante. Direzione interessante, ma è un sistema di pagamento —
  e vale la stessa riga scritta per il mercatino: oggi non c'è, e non
  promettiamo.
- **Il monitor dal vivo e la mappa dei flussi** (Score Buddy): classifica
  proiettata alla premiazione, gruppi seguiti in tempo reale, code individuate
  sul percorso, e la ripetizione a posteriori. Roba bella e che richiede molti
  utenti **sullo stesso campo nello stesso giorno**. Non è un lavoro di
  disegno, è un lavoro di massa critica: viene dopo, o non viene.
- **Esportazione PDF ed Excel con scarti, somma o best-of.** Questa è la forma
  vera della *gara ufficiale*, ed è utile saperla adesso: quando arriveremo al
  punto 1, quello è il capitolato minimo, non un di più.

#### Dove sono deboli, e sono aperture per noi

- **Il rimedio è nascosto.** Recensione sull'App Store di Skill Board: passato
  al bersaglio dopo, non si riesce più a correggere. Risposta dello
  sviluppatore: *si può, in qualunque momento, con un tocco lungo sul riepilogo
  dei risultati.* **La funzione c'è e l'arciere non l'ha trovata** — Norman da
  manuale, e conferma che la nostra striscia dell'annulla, accanto all'errore e
  senza gesti segreti, è la risposta giusta. Non spostarla mai.
- **Ci vuole un po' a capirla.** Altra recensione, positiva, stessa app. La
  loro superficie è enorme.
- **L'abbonamento respinge.** Sempre quella recensione: *l'app la comprerei
  volentieri, un abbonamento no.* Le loro statistiche migliori stanno dietro
  24–49 € l'anno. **Gratis per intero è la nostra leva — finché dura, e va
  detto come una descrizione di oggi.**
- **Tutte e due finiscono quando finisce il percorso.** Elenco dei campi e
  tornei, e basta: nessuna compagnia con il suo spazio, nessun allenamento
  aperto, nessun mercatino, nessun modo di scriversi. È l'unico posto dove il
  campo è davvero libero.

**E una cosa da tenere a mente, che non è una funzione.** Score Buddy è **una
persona**, e da solo ha messo in piedi il monitor dal vivo, la mappa dei
flussi, il portale delle compagnie e sette lingue. La scala non è una scusa.

---

## La porta chiusa da questa parte *(19/08/2026, versione `porta-conferma`)*

Una collaudatrice si è registrata, il link di conferma dell'email le è scaduto,
e non riusciva più a entrare. La prima diagnosi ovvia — *«il link scade, basta
richiederlo»* — era sbagliata: **da lei il tasto per richiederlo non esisteva.**

Due righe in `onAuthReady`, nell'ordine sbagliato:

```js
authState = data.approved ? "ready" : "pendingApproval";
if(authState === "ready" && needsEmailVerification(user)){ authState = "verifyEmail"; }
```

Quell'`authState === "ready" &&` voleva dire: *mostra la conferma dell'email
solo a chi è già approvato*. Ma dal 18/08 la porta è richiusa e **ogni nuovo
account nasce `approved:false`**. Quindi la seconda riga non si accendeva mai
per un nuovo iscritto, e la schermata `verifyEmailScreen()` — quella con
«Invia di nuovo» — era **codice irraggiungibile per esattamente le persone a
cui serviva.**

Il vicolo cieco, per intero: non poteva confermare (link morto), non poteva
richiedere (nessun tasto), non poteva rifare la registrazione (email già in
uso). Tre uscite, tutte murate. L'unica apertura era dall'altra parte del
pannello Approvazioni, a mano, e solo se qualcuno se ne accorgeva.

**La correzione è togliere l'AND**, non aggiungere un tasto:

```js
if(needsEmailVerification(user)){ authState = "verifyEmail"; }
```

**E la regola che ne esce, che vale oltre questo caso: fra due attese, si mostra
per prima quella che l'utente può chiudere da solo.** La conferma dell'email
dipende da lei; l'approvazione dipende da me. Metterle nell'ordine opposto
significa fermare qualcuno davanti a una porta che deve aprire un altro,
mentre quella che poteva aprire lei resta nascosta dietro. Le due schermate
adesso si mettono in fila da sole: «Ho confermato» richiama `onAuthReady()`,
che rilegge il documento e — se il via libera non c'è ancora — la manda
sull'attesa. Nessun codice di sequenza: solo il giusto ordine di due `if`.

Cambiata anche una frase di `pendingApprovalScreen()`: diceva *«Ti abbiamo anche
mandato un'email di conferma iscrizione: se non la vedi, controlla anche nella
cartella spam»*. Con il nuovo ordine chi arriva lì **ha già confermato**, e
quella riga lo rimandava a cercare un'email che non doveva più aprire. Adesso
dice che la conferma c'è e manca solo il via libera.

*Nessun banco ha visto questo difetto, e non è una svista dei banchi:*
`prova-schermo.js` monta la schermata degli iscritti, non decide quale
schermata si monta. Il difetto non stava dentro una schermata — stava
**nell'ordine con cui si sceglie fra due**. Per catturarlo servirebbe un banco
che, dato un utente (`approved`, `emailVerified`, data di creazione), dica quale
`authState` esce. Sono tre booleani: otto casi, un banco corto. **Non fatto
oggi**, e resta scritto qui perché la prossima volta un vicolo cieco
dell'ingresso non si scopra da un messaggio di qualcuno che non riesce a
entrare.

### Cosa resta aperto qui accanto

- **Un account nuovo con email già verificata dal fornitore entra lo stesso.**
  Nel ramo `!doc.exists` il codice scrive `approved:false` nel documento ma
  imposta `authState = "ready"`: chi entra con Google passa la porta al primo
  giro e trova l'attesa solo alla riapertura. Non toccato oggi — è un'altra
  porta e va chiusa guardandola, non di sfuggita.
- **`pendingApprovalScreen()` è scritta in italiano, dentro il codice.** Tutte
  le altre schermate passano da `t()`; questa no. Chi arriva lì da una delle
  altre otto lingue trova l'app che cambia lingua nel momento peggiore: quando
  le sta dicendo di aspettare.

## L'app parla nove lingue, la porta d'ingresso ne parlava una *(19/08/2026, versione `lingua-porta`)*

Il difetto della porta chiusa (qui sopra) ne ha scoperti altri tre, e sono la
stessa famiglia. **Le uniche schermate che un utente straniero vede di sicuro —
login, conferma email, attesa di approvazione — erano le uniche scritte in
italiano dentro il codice.** Nove lingue in duemila righe di dizionario, e poi
`el('<div class="onboard-title">Accesso in attesa di approvazione</div>')`.

Non è distrazione: è **dove sono nate**. Le tre schermate d'ingresso sono le
più vecchie dell'app, scritte quando l'app parlava italiano e basta. Tutto
quello che è venuto dopo è passato da `t()`, loro no, e nessuno ci è più
tornato perché *quando le guardi tu funzionano*. Un difetto di lingua non
rompe niente: non c'è errore, non c'è schermo bianco. C'è un turco che legge
una frase che non capisce e non sa nemmeno cosa gli è stato detto.

Tolto: quattro frasi della schermata d'attesa, i due «Esci», i quattro
messaggi d'errore del login. Tredici chiavi nuove × nove lingue.

**E un pezzo che era peggio dell'italiano fisso.** Due messaggi del login
dicevano `(err && err.message) ? err.message : "…"`, cioè: *se Firebase ha
qualcosa da dire, dillo tu*. Quel ramo vinceva sempre, e Firebase parla la
lingua di Firebase: `The password is invalid or the user does not have a
password.` Un messaggio tecnico, in inglese, su chi ha sbagliato password.
Adesso la frase è nostra e in nove lingue.

### Le due pagine legali: un file, due lingue, e l'italiano che prevale

`privacy.html` e `termini.html` erano interamente in italiano, per tutti.

**Non una pagina per lingua.** Diciotto file vuol dire diciotto documenti che
divergono in silenzio: si corregge una frase e le altre diciassette restano
com'erano, e non se ne accorge nessuno finché non è un problema legale. Il
testo sta in un posto solo, in `<div data-l="it">` e `<div data-l="en">`, e la
differenza fra le due versioni si vede aprendo il file.

La lingua si sceglie in quest'ordine: `?lang=` nell'indirizzo (lo passa l'app,
che apre i link con la lingua attiva) → la lingua scelta dentro l'app, letta
dal suo stato salvato (stesso dominio, stessa memoria) → la lingua del browser
→ italiano.

**La riga che conta è l'ultima:** tutto quello che non è italiano e non ha una
traduzione cade **sull'inglese, non sull'italiano.** Un olandese che non trova
la sua lingua deve trovare una lingua che legge, non quella di casa nostra. Le
altre sette si aggiungono un `<div data-l="xx">` alla volta e la funzione che
sceglie non cambia.

**L'inglese porta una fascia in cima che dice che prevale il testo italiano.**
Non è una formalità: una traduzione di cortesia non riletta da un legale non
può essere il testo che vincola, e dirlo è più onesto che nasconderlo. È la
stessa formula dei documenti multilingua veri. *La fascia è parte del
documento, non decorazione: il banco la controlla, e se sparisce il banco dice
di no.*

Aggiunta valida anche per l'italiano, già che il file era aperto: al reclamo al
Garante si affianca l'autorità del proprio paese, che è quello che dice l'art.
77 GDPR e che qui mancava.

### Dopo il link dell'email non si finiva da nessuna parte

Terza cosa, e la più corta da spiegare. `sendPasswordResetEmail` e
`sendEmailVerification` partivano **senza indirizzo di ritorno**. Chi apriva il
link cambiava la password su una pagina di Firebase, leggeva che era andata
bene, e restava lì: nessun tasto, nessuna strada. Doveva sapere da solo che
l'app si riapre altrove, con la password nuova in testa.

Adesso i tre invii passano da `conRitorno()`, che aggiunge `url` e fa comparire
il tasto che riporta all'app. **Con una seconda strada, e serve:** se il
dominio non è fra quelli autorizzati in Firebase → Authentication → Settings,
Firebase rifiuta l'invio con `auth/unauthorized-continue-uri` — e l'email non
partirebbe affatto. In quel caso si rimanda senza ritorno. *Meglio un'email
spoglia che nessuna email:* una comodità non può essere il motivo per cui il
recupero password smette di funzionare.

### `banco-lingue.js`, il sesto banco

Nessuno dei cinque poteva vedere niente di tutto questo, e non è colpa loro: il
guardiano guarda lo stile, `prova-schermo` monta una schermata, `banco-firme`
conta i ridisegni. Nessuno chiede *«questa frase esiste in tutte e nove le
lingue?»*.

Il sesto lo chiede. Controlla che tredici chiavi compaiano **nove volte esatte**
(una chiave dimenticata in una lingua sola non dà nessun errore: `t()`
restituisce la chiave e l'utente legge `pend_title`); che le frasi italiane non
tornino dentro il codice; che la riga dell'ordine fra conferma e approvazione
sia quella giusta; che i tre invii passino da `conRitorno`; e monta davvero le
due pagine legali con jsdom in quattro lingue.

**Una trappola in cui è caduto al primo giro, e vale la pena averla scritta.**
Cercava le frasi italiane in tutto il file e le trovava — *nel dizionario
italiano*, dove è giusto che stiano. Quattro no immediati, tutti falsi. Adesso
toglie prima le righe che hanno la forma `chiave: "valore"` e guarda solo il
resto. *Un banco che dice sempre di no è un banco che si smette di guardare:
è più pericoloso di un banco che non c'è, perché occupa il posto di quello che
servirebbe.*

Provato al contrario, come si fa qui: rimesso l'`&&` → lo prende; tolto
`pend_title` dallo svedese → dice «8 volte invece di 9»; tolta la fascia di
prevalenza dalla privacy → lo dice, e nomina il file.

`controlla-tutto.sh` adesso ne lancia sei.

### Cosa resta aperto qui accanto

- **Sette lingue su nove, nelle pagine legali, leggono l'inglese.** È la scelta
  giusta oggi — meglio una lingua franca che una lingua sconosciuta — ma resta
  una toppa. Le traduzioni vere valgono la voce 1 di NOTE-MERCATINO: si fanno
  leggere a chi le parla, e su un testo legale ancora più che altrove.
- **L'inglese di queste due pagine non l'ha riletto un legale.** Per questo c'è
  la fascia. Se un giorno l'app esce dalla beta con utenti stranieri veri,
  quella fascia non basta più.
- **Il ritorno dopo il link non è ancora stato visto funzionare.** Il banco
  controlla che `conRitorno` sia collegato ai tre invii; che il dominio sia
  autorizzato in Firebase lo dice solo un'email vera aperta su un telefono
  vero. Vale la regola: *caricato ≠ pubblicato ≠ visto funzionare.*

## La porta giusta, finalmente *(19/08/2026, sera, versione `porta-e-mercatino`)*

**Torna la regola del 14/08: per entrare basta registrarsi e confermare
l'email.** Nessun via libera dato a mano. **E il Mercatino torna ai soli
collaudatori.** Sono due movimenti opposti nella stessa mossa, ed è quello che
rende questa nota importante.

### Il difetto peggiore della settimana era un fraintendimento, non un bug

Il 18/08 Alessandro aveva chiesto: *«io vorrei che stesse in beta e prima
tiriamo la gente che usa l'app, se funziona; e se invece non la tiriamo,
amen»*. Quella frase è stata letta come **«chiudi le registrazioni»**, e la
sessione di quella mattina ha richiuso la porta d'ingresso.

Stasera Alessandro ha detto cosa intendeva davvero: *«avevo chiesto la chiusura
del marketplace a meno di non essere in beta»*. **La beta di cui parlava era
quella del Mercatino, non quella dell'app.**

Nessuno se n'è accorto per un giorno intero, e vale la pena capire perché:
**la modifica sbagliata funzionava benissimo.** Era scritta bene, motivata bene
in queste stesse note, reversibile come si deve, e ha perfino tenuto la sua
promessa quando si è trattato di disfarla. Un lavoro impeccabile sulla porta
sbagliata. *Un errore di comprensione non lascia tracce nel codice: lascia
codice corretto che fa una cosa che nessuno aveva chiesto — e nessun banco può
vederlo, perché i banchi confrontano il codice con sé stesso, mai con
l'intenzione.*

Le due conseguenze, e la seconda è la più cara: cinque giorni di Mercatino
aperto a chi non doveva vederlo, e un giorno e mezzo di registrazioni chiuse —
con dentro la collaudatrice murata fuori dal vicolo cieco della conferma email.
**Il costo del fraintendimento è stato più alto di quello di qualunque bug di
questa settimana.**

*La regola che ne esce, e non è tecnica: quando una richiesta arriva a voce e
tocca chi può entrare, si ripete indietro nominando la porta.* «Chiudo il
Mercatino a chi non è collaudatore, le registrazioni restano aperte» sono nove
parole, e avrebbero risparmiato tutto questo.

**È costata una riga per punto, come promesso.** La nota del 18 diceva: *«per
riaprire basta rimettere `true`: una riga, nessuna migrazione, nessuno da
recuperare»*. Era vero. `approved: false` → `approved: true` nei due punti in
cui un account può nascere — il ramo `!doc.exists` di `onAuthReady` e la
registrazione col modulo — e basta. **Una chiusura scritta per essere reversibile
si è disfatta in due minuti; quella per `betaTester`, che era l'altra strada
possibile, avrebbe richiesto una migrazione.** Il valore di quella scelta si
vede solo oggi, ed è oggi che va segnato: *quando si stringe qualcosa "per
ora", il modo in cui lo si stringe conta più della stretta.*

**Cosa NON è cambiato, di proposito:**

- **`firestore.rules` non si tocca.** Il `create` non guarda `approved` dal
  15/08, e `isApproved()` continuerà a dire di sì perché adesso i nuovi nascono
  già attivi. Una riapertura che avesse richiesto anche le regole sarebbe stata
  una riapertura in due tempi, con la finestra in mezzo in cui l'app dice sì e
  il database dice no.
- **`pendingApprovalScreen()` resta**, tradotta in nove lingue da `lingua-porta`
  poche ore fa. Non è lavoro sprecato: serve a chi si è iscritto fra il 18 e il
  19 e ha il documento a `approved:false`. E serve il giorno in cui un account
  va sospeso.
- **`avvisaIscrizione` smette di suonare da sola**, ed era previsto: guarda
  `approved`, non una configurazione. La nota del 18 lo aveva scritto in fondo
  — *«nessuno deve ricordarsi di spegnerla»* — e infatti nessuno se n'è dovuto
  ricordare. `banco-avvisi.js` lo conferma riga per riga: *«già attivo: niente,
  come deve»*. **Nessun deploy di `index.js` per questa riapertura.**

**Il campo `approved` non è diventato inutile: ha cambiato mestiere.** Non è più
la porta d'ingresso, è l'interruttore per spegnere un account. Il pannello
Approvazioni continua a funzionare, e l'utente continua a non poter cambiare
quel campo da sé — che è l'unica ragione per cui protegge qualcosa.

### E il Mercatino torna dietro alla porta della beta

**Tre punti, e solo il terzo è una porta vera.**

1. `index.html` — il `if(true)` che dal 14/08 mandava tutti a
   `marketplace.html` torna a essere `if(IS_BETA_TESTER === true)`. Il ramo
   `else` non era mai stato tolto: la schermata chiusa con
   `market_locked_body` stava lì da cinque giorni, tradotta in nove lingue, ad
   aspettare questa condizione. *È il secondo lavoro di oggi che si disfa in
   una riga perché chi l'aveva fatto non aveva cancellato la strada di
   ritorno.*
2. `marketplace.html` — chi ci arriva per link diretto trova il proprio
   controllo in cima al file: `approved` prima, `betaTester` poi. Il messaggio
   è **diverso** da quello dell'account non attivo, e non per gentilezza: là
   c'è qualcosa da fare (conferma l'email, scrivi), qui non c'è niente da fare,
   e l'indirizzo email a fondo pagina viene tolto. *Mandare a scrivere chi non
   può entrare è farlo bussare a una porta che non si apre a chi bussa.* Nasce
   `den_beta_body`, nove lingue, e le nove traduzioni non sono state inventate:
   sono le stesse di `market_locked_body`, che dice già esattamente quella cosa
   nell'app.
3. `firestore.rules` — **è qui che il Mercatino si chiude davvero.** Tutte le
   raccolte `market_*` passano da `isMarket()`, che è `isAdmin()` oppure
   *attivo E collaudatore*. Le prime due righe decidono cosa si vede; questa
   decide cosa si può leggere, ed è l'unica che regge davanti a una console del
   browser.

**Perché `isMarket()` e non `isBeta()` diretto.** Servono due condizioni:
`betaTester` dice chi è invitato, `approved` dice chi non è sospeso. Un
collaudatore sospeso non deve poter comprare e vendere, e con `isBeta()` da
solo avrebbe potuto. E `isAdmin()` sta fuori dall'AND: *la prima cosa che fa
una richiusura scritta male è chiudere fuori chi l'ha decisa.*

**Cosa resta aperto a chi resta fuori, e non è una svista.** Leggere e
cancellare i propri annunci, cancellare le proprie trattative e i propri
messaggi, ritirare le recensioni che ha scritto, i propri preferiti e le
proprie ricerche salvate. È la stessa idea che c'era già per l'utente sospeso:
*chi esce non deve restare con della roba sua che non può più toccare.* Quello
che non può più fare è pubblicare, scrivere in una trattativa e recensire.

**`banco-lingue.js` ha una sezione in più.** Il conteggio delle chiavi cercava
`chiave: ` e il dizionario del Mercatino scrive `chiave:"valore"`, senza
spazio: su quel file non trovava niente e **avrebbe detto di sì per assenza di
prove** — il modo più silenzioso in cui un banco sbaglia. Adesso
`marketplace.html` si legge a parte, con la sua forma, e `den_beta_body` è
controllata ×9.

### Quello che il codice non può riparare da solo

**Chi si è iscritto fra il 18 e il 19 ha già `approved:false` scritto nel
documento, e riaprire non lo tocca.** Quelle persone restano sulla schermata
d'attesa finché non le si approva a mano dal pannello. L'app non le può
sbloccare da sé, e non è una mancanza: le regole vietano all'utente di
cambiarsi `approved`, e se glielo permettessero il campo non varrebbe niente.

*Sono le uniche vittime della finestra 18→19, e sono anche le stesse che hanno
trovato il vicolo cieco della conferma email.* Chi entra da stasera non se ne
accorge; loro sì, e vanno guardate una per una.

### Il difetto che nessun banco poteva vedere, e stavolta non è un banco che manca

I sei banchi sono passati tutti, prima e dopo, in entrambe le direzioni. È
giusto così: **nessuno di loro può sapere se le registrazioni *devono* essere
aperte, o se il Mercatino *deve* essere chiuso.** Non è uno stato del codice,
è una decisione — e una decisione si controlla rileggendo queste note, non
facendo girare un banco. È il motivo per cui la nota del 18 e questa stanno una
sotto l'altra invece che una al posto dell'altra.

### Cosa resta aperto qui accanto

- **Nessuno ha ancora `betaTester: true`, a parte chi è stato marcato a mano.**
  Finché non si accendono dal pannello Approvazioni, il Mercatino è chiuso a
  tutti tranne l'admin — ed è il comportamento voluto, ma va detto perché da
  fuori sembra un guasto: la scheda Mercatino mostra la schermata d'attesa e
  non spiega che manca un flag.
- **Una notifica di un annuncio manda ancora a `marketplace.html` anche chi non
  è collaudatore**, e da lì rimbalza sulla schermata chiusa. Riguarda solo chi
  ha usato il Mercatino nei cinque giorni aperti e ha notifiche vecchie in
  sospeso. Non toccato: si guarda quando si sa quante sono.
- **L'ordine di applicazione conta, e va nella direzione opposta al solito.**
  Prima i file del sito, poi le regole: chi ha in mano l'app vecchia continua a
  vedere il Mercatino finché non ricarica, e se le regole arrivassero per prime
  vedrebbe una pagina che si apre e non carica niente — un `permission-denied`
  al posto di una spiegazione.

## Cosa manca, in ordine di valore

*Rifatta il 15/08/2026, quarto giro. Sono uscite quattro voci: il controllo dei
token, il pannello sagoma, il ridisegno per regioni e i quattro numeri.
Il 16/08 ne è uscita una quinta: la divisione — questa volta con le prove
accanto, vedi `banco-firme.js` e `prova-schermo.js`.*

**Quello che resta qui sotto non si può fare da questa parte dello schermo.**
Il punto 0 non è più il primo di una fila: è l'unica cosa che ha senso fare
adesso. Tutto quello che oggi è stato deciso a scrivania — la tastiera che
resta in fondo, il tasto che non perde il suo `:active` —
è un'ipotesi finché non passa un dito su un vetro, al sole, in piedi. E i
quattro numeri sono lì apposta per quel giro: **vanno sul telefono prima di
uscire, non dopo.***

**A che punto sta il punto 0** *(16/08/2026, sera).* Un Round 3D di prova è
stato fatto **su un telefono vero, da solo, in casa**, fino alla consegna: la
scheda compare, la firma si tocca, la consegna passa e la scheda si chiude.
Quindi il flusso regge fuori dal banco. **Ma tre cose restano non provate, e
sono proprio le tre che il banco non poteva provare:**

- ~~**il sole.**~~ *Guardato il 16/08, e ha prodotto un tema nuovo:* al sole
  diretto serviva più contrasto, all'ombra il chiaro andava già bene. Vedi
  *Il tema Sole*. **Resta da guardare il tema Sole stesso, al sole**: è stato
  disegnato per una condizione che chi lo ha scritto non stava vivendo.
- **la seconda firma.** Da solo ne basta una, quindi la regola che conta —
  *una firma vale se qualcuno ha visto* — non è mai stata esercitata a mano.
  Il banco la prova, un dito no.
- **le due ore.** Un giro di prova non è ventiquattro piazzole camminando.

*Scritto qui perché la prossima chat non legga «il giro è stato fatto» e
consideri chiuso il punto 0. Non lo è: è stato fatto un terzo.*

0. **Un giro vero, su un telefono vero, al sole.** Non è il punto dieci: è il
   punto zero, e può riordinare tutti gli altri. Il banco Node prova lo
   **stato**, non la **percezione**: 288 tocchi verificati a scrivania, zero
   in piedi. Due cose sono falsificabili in un giro solo — se la tastiera
   resta in fondo senza far comparire la barra di scorrimento (la correzione
   del 15/08 va confermata lì, non qui). *La filigrana era la seconda cosa da
   guardare: è stata guardata, ed è stata tolta.* **Terza cosa, nuova:** il ridisegno per regioni è stato fatto
   perché il tasto premuto non perda il suo `:active` a metà tocco. Che ci
   riesca lo dice un dito su un vetro, non un banco Node. **Quarta cosa, dal
   16/08:** le righe con la spunta (privacy, condizioni, «nascondi il nome») e
   le schede dei percorsi salvati vanno guardate *sul piccolo*, perché è
   esattamente lì che quel giorno si è rischiato di lasciarle nude.

1. **La classifica per divisione, e la premiazione che non promette.** La
   divisione c'è ed è salvata, e adesso c'è anche dove attaccarla: la consegna.
   Manca il posto in cui diventa una classifica, ricordando l'Art. 14.a: **una
   divisione con meno di tre partecipanti esiste in classifica e non sul
   podio.** La schermata non deve promettere una premiazione che non ci sarà.
   *Attenzione al pezzo che manca davvero:* la divisione vive fra gli iscritti
   di *Prepara gara*, gli arcieri di un giro sono `{id, name}` e basta. Finché
   il giro non nasce da una squadra della gara, la classifica per divisione non
   ha da dove prendere le sigle. **Il lavoro è quel collegamento, non la
   tabella.**

1-bis. **Staccare la gara ufficiale dal formato di gara.** *(Aperto, dal campo
   il 16/08/2026.)* Le parole sono due — allenamento e gara — e i piani sono
   tre: giro libero, giro regolamentare, gara ufficiale. La seconda parola
   regge due mestieri, e uno dei due è irreversibile. Vedi *«Allenamento» e
   «gara» sono due parole per tre cose*, dentro *La consegna*. **Non è un
   lavoro separato dal punto 1**: entrambi aspettano lo stesso pezzo, il giro
   che sa da quale gara viene. Chi apre il punto 1 chiuda anche questo.

0. **IL TOKEN SI RINNOVA SOLO APRENDO L'APP, ed è un cerchio che non si
   chiude.** *(Aperta il 19/08, mentre la push tornava a funzionare. **Rivista
   la notte del 19/08:** quando è stata scritta sembrava la causa del guasto
   di quel giorno — non lo era, il guasto erano l'eco dello storico e una
   corsa asincrona, vedi la sezione della versione `prova-campanella`. Questa
   voce resta aperta perché il buco è vero, non perché spieghi quello che è
   successo.*)

   `pushNotifica` cancella `fcmToken` quando FCM lo rifiuta — giusto, un token
   morto fa fallire ogni invio futuro allo stesso modo. Ma a rimetterlo è solo
   `refreshPushToken()`, che gira **all'apertura dell'app**.

   Quindi: se il token scade mentre l'app è chiusa, le notifiche smettono. E
   riprendono solo aprendo l'app — cioè **proprio quando non servivano più**,
   perché chi apre l'app le notizie le vede da sé. La notifica serve a chi
   l'app non ce l'ha aperta: è l'unico caso in cui questo meccanismo è rotto,
   ed è l'unico caso che conta.

   Il cerchio si chiude nel service worker, non nella pagina: il browser
   lancia `pushsubscriptionchange` quando la sottoscrizione scade o cambia, e
   lì il token si può rinnovare senza che nessuno apra niente. Oggi
   `sw.js` non ascolta quell'evento.

   *Non toccato il 19/08 di proposito: la push aveva appena ripreso a
   funzionare dopo una notte intera, e mettere le mani nel service worker in
   quel momento era il modo migliore per non sapere più cosa aveva funzionato.
   Da fare a mente fresca, con la prova della campanella in mano — che adesso
   c'è, e rende verificabile in trenta secondi qualcosa che è costato quattro
   scambi di messaggi a indovinare.*

   ### Misurato il 19/08: **la cura scritta qui sopra non si puo' fare.**

   Prima di scrivere una riga di `sw.js` sono state guardate le tre cose che
   servirebbero dentro il service worker. **Non ce n'e' nessuna.**

   1. **`getToken` non esiste nel service worker.** Nel contesto SW l'SDK
      compat espone `onBackgroundMessage` e basta: `getToken` vive solo nella
      pagina. Un token FCM lo genera il dispositivo *mentre la pagina e'
      aperta* — e questo non e' un limite di come e' scritta l'app, e' come
      funziona FCM.
   2. **Nel SW non c'e' `currentUser`.** Non c'e' sessione di autenticazione:
      il service worker non sa di chi e' il telefono.
   3. **E se anche la sapesse, non potrebbe scriverla.** `refreshPushToken()`
      fa `users/{uid}.update({fcmToken})`, e la regola vuole
      `request.auth.uid == userId`. Senza auth la scrittura viene rifiutata.

   `pushsubscriptionchange` si puo' ascoltare — quello si — ma dentro non c'e'
   niente con cui rinnovare. **Ascoltarlo e non poter fare niente sarebbe una
   rete finta**, cioe' lo stesso difetto di `legacyPushWrite` (vedi
   NOTE-MERCATINO.md): codice che sembra una protezione e non lo e'.

   ### Cosa resta possibile, e sono due strade diverse

   - **MISURARE, non curare.** Il SW ascolta l'evento e lascia un segno con la
     data; l'app all'apertura lo legge e lo registra. Non chiude il cerchio —
     `refreshPushToken()` gira gia' a ogni apertura — ma risponde alla domanda
     che oggi nessuno sa: **quanto spesso un token scade davvero?** Una volta
     al mese o mai? Finche' non si sa, non si sa nemmeno se il buco vale il
     lavoro. Piccola, e non promette niente che non mantiene.
   - **CHIUDERLO SUL SERIO: uscire da FCM.** Con Web Push standard (VAPID) il
     service worker si risottoscrive da solo con `pushManager.subscribe()` e
     manda l'endpoint nuovo al server, senza che nessuno apra niente. E'
     l'unica strada che chiude il cerchio davvero — **e vuol dire cambiare il
     canale di invio**: `index.js` riscritto, un nuovo deploy, e la push
     rifatta da capo tre giorni dopo averla riparata. Non adesso.

   *La voce resta aperta, ma con una descrizione onesta: non e' «una riga da
   aggiungere a sw.js». Era scritta cosi', e chi la apriva ci avrebbe perso
   una sera prima di scoprirlo.*


2. **Container query** al posto delle media query per i componenti: quello che
   decide se una scheda sta in due colonne è la larghezza della *scheda*, non
   dello schermo. *(Metà fatta il notte fra il 17 e il 18/08: il guscio non si stringe più, si
   stringe la colonna dentro — vedi `2026-08-17-colonna-ferma`. Il principio è
   applicato al livello della pagina; resta da applicarlo alle schede dentro le
   schermate.)*

3. **Un solo alfabeto di icone.** Restano emoji sparse (bandiere, comandi):
   un'emoji si disegna diversa su ogni telefono, quindi il marchio non
   controlla come appare. `navIcon()` e `ICON_PATHS` esistono già.

4. **Il marchio in SVG.** Vedi *Il logo*. Un logo è geometria, non una
   fotografia. *Non è più urgente:* dal 16/08 c'è un'icona raster che regge sul
   telefono, e una versione piccola vettoriale per le misure sotto i 48px.
   Quello che manca è il marchio vero — ricolorabile, in tinta unita. Il giro
   del 16/08 dice anche **da dove ripartire**: sagoma di animale o paglia, non
   un altro bersaglio ad anelli.

### Fatto

**19/08/2026** — versione `2026-08-19-prova-campanella`, nata da
`2026-08-19-primo-giro-muto`:

**«Non arrivano più.»** Le altre push — chat, ricerche salvate — hanno smesso
anche loro. E questo cambia la diagnosi: non è un difetto del percorso delle
segnalazioni, è **tutta la catena della push** che non funziona.

C'è anche una spiegazione scomoda da mettere per iscritto: fino a
`primo-giro-muto`, quello che dall'esterno sembrava «la push arriva quando
apro l'app» era l'eco dello storico. Togliendo l'eco non ho aggiunto la push
vera: **ho tolto il velo che la copriva.** Probabilmente la push vera non
funziona da più tempo di quanto chiunque abbia creduto, e le notifiche
all'apertura hanno fatto da maschera.

**La catena ha cinque anelli** — permesso del telefono, token salvato,
funzione sul server, consegna di FCM, service worker che disegna — e da fuori
si vede solo che non suona. Quattro scambi di messaggi spesi a ipotizzare
quale fosse rotto sono la prova che mancava uno strumento, non un'idea.

**Quindi ora c'è un tasto: «Prova la campanella»**, nel profilo sotto le
notifiche. Manda una notifica a sé stessi percorrendo la catena intera, senza
bisogno di un secondo account e senza aspettare che qualcuno segnali qualcosa.
Sotto mostra lo stato dei due anelli controllabili da qui — il permesso del
telefono e se il token di questo dispositivo è stato registrato — perché *«non
funziona» diventa un'informazione solo quando si sa dove si interrompe*.

Il token viene rinfrescato prima di provare: se era scaduto, la prova è anche
la mossa che lo rimette.

**ESITO, dal campo: «le push arrivano».** Da questa versione la campanella
suona.

*Quale anello fosse rotto non lo sappiamo, e va scritto così invece di
inventare una causa.* Non è stato registrato lo stato del token prima della
prova, e quel dato distingueva due storie molto diverse: token sparito e
rimesso dalla prova, oppure token presente e difetto altrove. **Una diagnosi
mancante lasciata scritta come diagnosi certa sarebbe peggio di nessuna
diagnosi** — chi riprende il lavoro ci costruirebbe sopra.

Il sospetto più forte resta il primo, e porta con sé un rischio strutturale
che è aperto anche adesso che funziona: vedi «Cosa manca», voce sul rinnovo
del token.

### La diagnosi c'è, ed è un'altra *(scritta il 19/08, nella notte)*

**Il paragrafo qui sopra resta scritto apposta, ma il suo sospetto era
sbagliato, e va letto sapendolo.** Il token non c'entrava. I difetti erano
due, tutti e due dentro l'app:

1. **L'eco dello storico.** Il primo elenco che arriva all'apertura veniva
   trattato come *notizie nuove* invece che come *storico*. È questo che per
   mesi ha fatto sembrare che «la push arriva quando apro l'app»: non era una
   push, era il passato che si ripresentava.
2. **Una corsa fra il listener delle notifiche e il rinnovo del token.** Due
   righe consecutive nel codice — ma la seconda è asincrona e la risposta
   arriva quasi un secondo dopo. L'app concludeva *«qui la push vera non
   arriva»* **prima di avere la risposta.** Il verdetto era già scritto quando
   il dato con cui giudicare non era ancora arrivato.

**Perché questa correzione cambia le cose, e non è solo pignoleria.** La voce 0
di «Cosa manca» — il token che si rinnova solo aprendo l'app — era stata
aperta come *«il sospetto più forte per quello che è appena successo»*. Non lo
è: era una corsa, non un token scaduto. **Il buco resta reale e resta da
chiudere**, ma è robustezza per un guasto che non si è ancora visto, non la
riparazione di quello che si è visto. Chi lo apre non stia riparando ieri.

*Due righe consecutive che sembrano in ordine sono la forma più difficile da
vedere: non c'è niente di sbagliato da leggere, c'è solo qualcosa che manca da
aspettare.*

**Due errori miei, presi da controlli e non da me.** Avevo scritto
`firebase.functions()` invece di `fns`: le funzioni stanno in `europe-west1` e
senza regione la chiamata le cerca negli Stati Uniti, dove non c'è niente — un
tasto di prova che fallisce per conto suo direbbe una bugia peggiore del
silenzio che deve diagnosticare. E il guardiano ha contato **otto chiavi nude**
più due stili in linea: le prime sarebbero finite a schermo come nomi in
codice, i secondi erano solo pigrizia.

---

**19/08/2026** — versione `2026-08-19-primo-giro-muto`, nata da
`2026-08-19-la-x-cancella` (funzioni: `2026-08-19-token-che-parla`):

**«La push non è arrivata finché non ho aperto l'app.»**

Quella frase dice una cosa sola, e non è che la push sia lenta: **la push vera
non era arrivata affatto.** Quello che compariva all'apertura era una notifica
che l'app si genera da sola — `showLocalNotification`, pensata per chi ha dato
il permesso ma non riceve la push.

**Il primo giro di `onSnapshot` non porta notizie: porta lo storico.** Veniva
trattato come tutti gli altri, quindi ogni avviso non ancora letto diventava
una notifica di sistema all'apertura. Non era un ritardo: era un'eco.

**E c'era una corsa**, che è il motivo per cui la difesa già presente non
bastava. `showLocalNotification` tace se `pushRegisteredHere` è vero, cioè se
su questo dispositivo la push vera funziona. Ma il listener parte alla riga
2249 e `refreshPushToken()` alla 2250 — e il secondo è **asincrono**: deve
trovare il service worker, chiedere il token a FCM, scriverlo su Firestore.
Il primo elenco arriva molto prima, quando `pushRegisteredHere` è ancora
falso, e l'app concludeva *«qui la push vera non arriva, mostro la mia»*. Non
era vero: non era ancora arrivata la risposta.

*Due righe consecutive, e in mezzo un secondo di differenza. Le corse non si
vedono leggendo: si vedono quando qualcuno racconta un sintomo che non torna.*

Con il primo giro muto la corsa sparisce da sola: quando arriverà un avviso
nuovo, il token sarà stato deciso da un pezzo. Lo storico viene segnato come
già visto, così non riemerge al giro dopo.

**Nelle funzioni, due silenzi che nascondevano lo stesso guaio.** Quando la
push fallisce perché il token è scaduto — telefono cambiato, cache pulita,
succede — la funzione lo cancella. Giusto. Ma lo faceva in silenzio, e da quel
momento ogni avviso usciva da un `return` muto. **L'utente crede di avere le
notifiche accese e non riceve più niente**, finché non riapre l'app e il token
si rinnova da solo. Adesso entrambi i momenti si scrivono nei log: quando il
token viene tolto, e quale avviso non è stato consegnato per mancanza di token.

*`sw.js` a `arctrail3d-v12`: la v11 è già online, quindi il vecchio
`index.html` è già nella cache dei telefoni.*

---

**19/08/2026** — versione `2026-08-19-la-x-cancella`, nata da
`2026-08-19-la-x-parla`:

**La X cancellava davvero. Era lo schermo a non accorgersene.**

Dal campo: *«la X non cancella il file in automatico dalla finestra, ma devo
fare un refresh»*. Quindi la regola Firestore c'era e la cancellazione
funzionava — il difetto era un altro, ed è il peggiore dei due: **il dato era
giusto e lo schermo mentiva.**

Il centro notifiche ha un `onSnapshot` che riceve tutto correttamente. Ma il
ridisegno era subordinato a questa condizione:

```js
if(unread !== notifUnreadCount || nuove.length){ … render(); }
```

Cancellando una notifica **già letta**, il numero delle non lette non cambia e
non ci sono nuove: nessun ridisegno. La riga spariva da Firestore e restava a
schermo finché non si ricaricava la pagina.

**Il conteggio è un riassunto, e un riassunto non basta a decidere se
ridisegnare.** Due elenchi diversi possono avere lo stesso numero di non lette
— anzi, è il caso normale. Serve una firma dell'elenco intero, che è la stessa
idea di `dipingiPista`: si ridisegna quando cambia quello che si vede, non
quando cambia una statistica su quello che si vede.

**La domanda giusta non è «la firma cambia quando cambia il contenuto».** È
quella che il banco firme fa da sempre: *due contenuti diversi possono mai
produrre la stessa firma?* Per questo dentro la firma ci sono anche le
lunghezze degli id — senza, `"ab"+"c"` e `"a"+"bc"` darebbero la stessa
stringa e una cancellazione passerebbe inosservata.

**Sette domande nuove nel banco firme**, e il sabotaggio conferma che servono:
rimettendo la logica vecchia il banco ne segnala tre, fra cui esattamente
quella arrivata dal campo — *«togliere una riga letta non cambia la firma»*.

*`sw.js` sale a `arctrail3d-v11` benché la v10 sia di oggi: la v10 è già
online, quindi il vecchio `index.html` è già nella cache dei telefoni. Senza
alzare, questa correzione non si vedrebbe.*

---

**19/08/2026** — versione `2026-08-19-la-x-parla`, nata da
`2026-08-18-porta-e-segnalazioni`:

**La X del centro notifiche non cancellava, e non lo diceva.**

Dal campo: *«la X per cancellare il singolo messaggio non funziona»*. Il CSS
era a posto — bersaglio da 44px, posizionato bene — e il click arrivava. La
cancellazione veniva **rifiutata da Firestore**, e l'unica traccia era un
`console.error`: la X si spegneva un istante e la riga restava lì.

Su un telefono la console non la apre nessuno. **Il difetto non era la
cancellazione: era il silenzio.** Adesso il rifiuto si scrive dentro la riga
che non se n'è andata — attaccato alla cosa che non ha funzionato, non in un
avviso volante che sparisce in tre secondi.

*La causa quasi certa è che la regola Firestore su `notifications` non prevede
`delete`. Va verificata: è fuori dal file, come `market_favs` e
`market_reports`. Ma il silenzio andava tolto comunque — se la regola c'è ed è
un'altra cosa, adesso lo dirà.*

**Il guardiano mi ha fermato mentre lo scrivevo.** Avevo usato `error_short`
per la frase d'errore: quella chiave esiste in `marketplace.html` e **non
esisteva qui**. `controlla-token.js` l'ha segnalata come chiave nuda — a
schermo sarebbe finita la stringa `error_short` al posto del messaggio. È il
tipo di difetto che passa ogni revisione a occhio e che nessuno vede finché
non capita a un utente. Scritta nelle nove lingue, agganciata per posizione e
non per contenuto perché le lingue non latine nel file sono in sequenze
`\uXXXX` e cercarle per testo non funziona.

---

**18/08/2026, cinque del mattino** — versione `2026-08-18-porta-e-segnalazioni`,
nata da `2026-08-17-colonna-ferma`:

**La porta è richiusa: si torna all'approvazione a mano.**

Chiesto dal campo: *«io vorrei che stesse in beta e prima tiriamo la gente che
usa l'app, se funziona; e se invece non la tiriamo, amen»*. Il badge BETA
mentiva da quattro giorni — dal 14/08 le registrazioni erano aperte e chiunque
confermasse l'email entrava, mercatino compreso.

**È stata scelta la via reversibile, e vale la pena scrivere perché.** C'erano
due modi. Rimettere il filtro sul campo `betaTester` avrebbe buttato fuori **in
blocco tutti quelli entrati fra il 14 e il 18**, perché nessuno di loro ha quel
campo — Alessandro compreso, finché non si marca a mano. Rimettere invece
`approved: false` alla nascita non tocca nessuno di quelli già dentro: cambia
solo che i nuovi aspettano. Per riaprire basta rimettere `true`: una riga,
nessuna migrazione, nessuno da recuperare.

**Un account nasceva in due punti, e dicevano cose diverse.** Uno in
`onAuthReady` (documento assente al primo accesso), uno nella registrazione col
modulo. Il secondo avvisava chi tiene l'app, il primo no: da lì si poteva
restare in attesa per giorni senza che nessuno lo sapesse. Adesso i due punti
dicono la stessa cosa, e l'avviso non lo manda più il telefono.

**Una porta richiusa senza campanello è una porta murata.** L'avviso è passato
a `avvisaIscrizione` in `index.js`, un trigger sulla nascita del documento:
copre tutte le strade, anche quelle che verranno. Il vecchio
`notifyAdminNewSignup` cercava l'uid dell'admin dentro `app_config/admin` e, se
quel documento non c'era, faceva `return` **in silenzio** — un avviso che non
parte e non lo dice è peggio di un avviso che manca, perché si crede che
funzioni. La funzione resta nel file, non più chiamata, finché non si è visto
arrivare almeno un avviso dalla strada nuova.

*Se un giorno le registrazioni tornano aperte, `avvisaIscrizione` smette di
suonare da sola: guarda `approved`, non una configurazione. Nessuno deve
ricordarsi di spegnerla.*

**Nella stessa mossa:** `sw.js` a `arctrail3d-v9`, perché è cambiato
`index.html` che sta in `APP_SHELL`. E le date di ieri sera sono state corrette
in quattordici punti fra diari e file — erano scritte «17/08 sera» ed era la
notte fra il 17 e il 18. *Una data sbagliata lasciata scritta è come una
diagnosi sbagliata lasciata scritta: chi legge ci costruisce sopra.*

---

**notte fra il 17 e il 18/08/2026** — versione `2026-08-17-colonna-ferma`, nata da
`2026-08-17-push-dove-porta`:

**Il guscio non cambia più larghezza. La colonna sì.**

Dal campo, in una riga: *«in versione web le pagine principali hanno tutte la
stessa dimensione, mentre nei sottomenu le pagine si stringono»*. Non era una
sensazione. Misurato con la finestra a cinque larghezze, prima:

| finestra | pagine principali | sottomenu |
|---|---|---|
| 390 px | 520 | 520 |
| 800 px | 900 | **620** |
| 1000 px e oltre | 1060 | **660** |

Sul telefono non succedeva niente — ed è per questo che non era mai saltato
fuori: **fin qui l'app è stata guardata quasi sempre da telefono.** Da computer
la pagina saltava di 400 px a ogni ingresso in un sottomenu.

**Non era un difetto, era una scelta giusta applicata al posto sbagliato.**
`NARROW_SCREENS` esiste da sempre e ha ragione: sedici schermate — moduli,
chat, info, blocca utenti, elimina account, percorso — non devono essere larghe
1060 px, perché una riga di testo lunga un metro non si legge e un campo email
largo un metro è comico. Il problema è che quella regola stringeva **`#app`**,
cioè il guscio, e il guscio si porta dietro testata, insegna delle sezioni e
sfondo, che con la lunghezza della riga non c'entrano niente.

Quello che l'utente vedeva non era «questo modulo è più stretto». Era **la
finestra dell'app che si restringe**, con tutto dentro: il logo si spostava,
le cinque sezioni si spostavano, la fascia chiara sotto la colonna si
spostava. È la continuità spaziale che salta: il contenitore deve essere la
cosa ferma, e il contenuto quella che si adatta.

Adesso:

```css
#app.narrow > :not(header.top){ width:100%; max-width:660px; margin-inline:auto; }
```

Una regola, zero cambiamenti al DOM, nessuna delle sedici schermate riscritta.
Misurato dopo: insegna **992 px identica** in entrambi i casi a ogni larghezza,
contenuto 992 → 660. Sul telefono, come prima, non cambia una virgola.

**Il `width:100%` non è di troppo, e non è stato dedotto.** Durante il percorso
`#app` diventa un flex in colonna, e lì un margine automatico spegne lo
stretch: alla prima misura **la pista era larga 8 px** — la tastiera del giro
ridotta a una scheggia. Trovato dal banco, non dal ragionamento, ed è il motivo
per cui la misura si fa anche quando la regola sembra ovvia.

**Tolta una regola morta.** `@media (min-width:1080px){ #app{ max-width:960px } }`
era sovrascritta più sotto dal blocco dei 900 px, che rimette `#app` a 1060.
Senza effetto da settimane. *Una regola che non fa niente è peggio di una
regola assente:* chi legge crede che a 1080 px la pagina si stringa, e non è
vero.

**Tolte le due regole `#app.narrow header.top`** che mandavano le sezioni a
capo quando l'insegna si stringeva. Erano la conseguenza del difetto, non una
scelta: adesso l'insegna è larga uguale ovunque e le sezioni ci stanno in riga.

*Questo chiude anche metà del punto 2 di «Cosa manca» (container query): il
principio — la larghezza la decide il contenuto, non lo schermo — qui è
applicato. Il resto del punto 2 riguarda le schede dentro le schermate, e
resta aperto.*

**Nella stessa mossa: `sw.js` da `arctrail3d-v7` a `arctrail3d-v8`**, perché
è cambiato `index.html` che sta in `APP_SHELL`. Da oggi `sw.js` dichiara anche
`CACHE_PARENT`, come gli altri.

---

**Il banco che mancava: `controlla-base.js`.**

Il commento di `BUILD_PARENT` lo nominava — *«controlla-base.js confronta il
genitore dichiarato con l'ultimo timbro online»* — ma il file non esisteva in
nessuna cartella. Era il primo dei cinque, e mancava proprio lui.

Gli altri quattro banchi chiedono *«questo file è fatto bene?»*. Nessuno
chiedeva *«questo file è quello giusto?»*, **e la seconda domanda viene
prima.** Stasera è costata: il progetto era indietro di due versioni rispetto a
GitHub, i quattro banchi hanno girato sui file vecchi e hanno detto di sì a
tutto, allegramente. Se ne è accorto un occhio che guardava i timbri per un
altro motivo.

Il banco legge i tre timbri locali (`BUILD_STAMP`, `data-build`, `CACHE_NAME`)
e i tre genitori (`BUILD_PARENT`, `data-parent`, `CACHE_PARENT`), scarica gli
stessi tre da GitHub e dà **tre risposte diverse**, che è il punto:

- **IN PARI** — qui c'è quello che è online. Si lavora.
- **AVANTI** — il genitore dichiarato *è* l'ultimo online: lavoro fatto e non
  ancora caricato. Non è un errore, ma va detto.
- **INDIETRO O DIVERGENTE** — il genitore non è l'ultimo online. **Questo file
  non è un aggiornamento: è una cancellazione**, e porta via tutto quello che è
  successo in mezzo.

Se GitHub non risponde, lo dice e **non passa in silenzio**: un controllo che
non può dire di no è spento.

**È stato scritto mite e poi stretto**, e vale la pena scrivere perché. Alla
prima stesura, un file col timbro diverso dall'online ma senza `nato da`
riceveva una nota e passava. Provandolo sul vecchio `index.html` del progetto è
venuto fuori che quello era **esattamente il caso da bloccare**: timbro
diverso, nessun genitore, quindi non si può escludere che sia una copia
vecchia. Un dubbio su quale sia la base non è una nota a piè di pagina: è il
motivo per cui il file esiste. Adesso nel dubbio si ferma.

`controlla-tutto.sh` — che pure non era nel progetto, ed è stato riscritto —
lo lancia **per primo, e se dice no non lancia gli altri quattro**: su un file
vecchio direbbero di sì e non servirebbe a niente.

*`marketplace.html` non dichiarava `data-parent`: aggiunto la sera stessa, con
il sesto giro del mercatino. Adesso tutti e tre i file del sito dicono da dove
nascono, e il banco può rispondere per tutti e tre.*

---

**17/08/2026** — versione `2026-08-17-avvisi-ricerche`:

*Il lavoro di giornata è del mercatino e sta in `NOTE-MERCATINO.md` (quinto
giro). Qui si scrive solo quello che tocca `index.html`, perché è qui che si
guarda per sapere cosa fa il file dell'app.*

- **`wipeAccountData()` cancella `market_searches/{uid}`.** Nuova raccolta,
  nata lo stesso giorno: le ricerche salvate del mercatino, che da oggi fanno
  partire una notifica quando esce un annuncio che le corrisponde. Le tre
  domande di una raccolta nuova — chi la scrive, chi la legge, **chi la porta
  via** — fatte tutte e tre nello stesso giorno, come la regola scritta il
  giorno prima per `market_favs`. Qui c'era un motivo in più del residuo sul
  cloud: finché il documento resta, la Cloud Function continua a scrivere
  notifiche per un account che non esiste più.
- **Cinque esadecimali tolti dallo strato dei ruoli.** Il guardiano era rosso
  *all'arrivo* della sessione — 67 contro un tetto di 64 — e non per il lavoro
  di oggi. Quattro erano bianchi (`--brand-ink`, `--sun-on-fg` nei due temi,
  `--navbar-pill-ink`) che erano già `--sand-50` scritto in un altro modo; il
  quinto era l'ambra chiara del gradiente del timer, una tinta vera senza
  primitivo, che adesso è **`--gold-150`**. Zero cambiamenti a schermo, e il
  tetto è sceso da solo a **61**. *Il tetto non sale per accogliere il file.*
- **`firestore.rules` → `2026-08-17-avvisi-ricerche`**, con il blocco
  `market_searches`. Ordine di applicazione: funzioni, poi regole, poi i due
  file HTML. Il motivo è scritto nelle note del mercatino.

**16/08/2026** — versione `2026-08-16-spazio-compagnia`:

*Scritta a posteriori, il 16/08 sera. Questa versione e quella prima erano
state fatte senza aggiornare il diario: `spazio-compagnia` non compariva da
nessuna parte, e `sole-scorciatoie` era citata solo come timbro da mettere.
Ricostruite leggendo il codice. È esattamente il buco che la regola
«`BUILD_STAMP` e `NOTE-DESIGN.md` nella stessa operazione» esiste per evitare.*

- **Una compagnia adesso ha una sua pagina, e qualcuno che la tiene.**
  `clubSpaceScreen()`: il referente scrive nome, indirizzo del campo e note
  per gli arcieri — accesso, quote, orari — e quei dati compaiono a chiunque
  guardi la scheda della compagnia. Prima le compagnie erano un elenco di
  codici: un nome e nient'altro.
- **Le segnalazioni sul percorso arrivano a chi può ripararle.** Un arciere
  che trova una piazzola rotta scrive dal campo (`fieldReportScreen`); la
  segnalazione va su `field_reports` con il codice della compagnia, e il
  referente se la trova nel suo spazio. Può segnarla risolta, mostrarle o
  nasconderle, e cancellare quelle chiuse.
- **Diventare referente richiede due passaggi, uno dei quali umano.** Si chiede
  dall'app, e si conferma via email. L'approvazione è a mano: una compagnia non
  si prende, si verifica. `compagnie_admin_requests`, chiave `codice_uid`, così
  la stessa persona non può chiedere due volte la stessa compagnia.

**Il difetto trovato mentre si costruiva.** Le richieste venivano già scritte
su `compagnie_admin_requests` — **e nessuno le leggeva.** Non c'era il pannello
dall'altra parte: una compagnia poteva chiedere e non essere attivata mai, e
dall'app non si vedeva alcuna differenza fra «in attesa» e «perso». Adesso il
pannello amministratore le mostra in attesa, con Approva e Rifiuta.
*Regola: una coda che nessuno svuota non è una coda, è un buco con l'etichetta.*

**16/08/2026** — versione `2026-08-16-sole-scorciatoie`:

- **Il Sole si accende durante il giro, non dal profilo.** Un tasto nella riga
  delle scorciatoie, con il pallino giallo `--sun-dot:#FFC21A` — l'unica tinta
  dell'app che non cambia fra i temi, perché è un contrassegno e non un colore
  di superficie. Vedi *Il Sole a portata di pollice, sul percorso*.
- **`toggleSole()` ricorda da dove sei partito** e ce lo riporta quando spegni.
- **Zero traduzioni nuove:** `theme_sun_label` c'era già in tutte e nove le
  lingue.

**16/08/2026** — versione `2026-08-16-tre-temi`:

- **Il tema automatico non c'è più.** Vedi *Il tema automatico è stato tolto*.
  Tre temi, tutti a mano, e si parte da chiara. Con lui se ne va la chiave
  `theme_auto_label` da nove lingue e l'ascoltatore di `prefers-color-scheme`.

**16/08/2026** — versione `2026-08-16-vivo-a`:

- **Il tema Sole ha colori vivi e cifre nere**, non fondi scuri. Vedi *Al sole
  la tinta sopravvive*. La versione di due ore prima andava nel verso
  sbagliato.
- **«Automatica» si chiama «Come il telefono».** Terza volta che tornava: il
  problema non era la spiegazione, era il nome.

**16/08/2026** — versione `2026-08-16-club-a`:

- **Il codice di Compagnia non viene più giudicato dove l'app non ha
  l'elenco.** Vedi *Le compagnie straniere*. Riguardava quindici federazioni
  su sedici, e c'era da prima che si parlasse di club francesi.

**16/08/2026** — versione `2026-08-16-sole-b`:

- **Il tasto delle notifiche dice se sono già attive**, invece di chiederlo
  ogni volta. Vedi *Tre cose dette dal campo*.
- **La pastiglia «Automatica» dice a cosa corrisponde adesso**, e il tema si
  salva nel momento in cui lo scegli, non quando premi Salva.
- **Il tema Sole è stato spinto sul serio.** La prima versione era timida e il
  campo se n'è accorto in un pomeriggio.

**16/08/2026** — versione `2026-08-16-sole-a`:

- **C'è un quarto tema, Sole**, per lo schermo sotto il sole diretto. Vedi
  *Il tema Sole*. Prima decisione di disegno di questo progetto presa da una
  frase detta su un percorso invece che a una scrivania.
- **«Automatica» dice cosa fa**, e cioè che segue il telefono e non la luce.
- **Il colore della barra del browser non è più scritto a mano.**

**16/08/2026** — versione `2026-08-16-consegna-c`:

- **Il guardiano confronta le due liste di federazioni.** Era un rischio noto e
  scritto («devi essere svedese per accorgertene»): una regola che vive in una
  nota non è una regola. Adesso è la dodicesima domanda.
- **Il commento che mentiva sul tema chiaro è stato corretto.** Vedi *Cosa
  resta da guardare*.

**16/08/2026** — versione `2026-08-16-consegna-b`:

- **Il tocco lungo su un tasto punteggio non seleziona più l'etichetta.** Vedi
  il commento nel foglio di stile. Trovato dal campo, non da un banco: nessuna
  delle undici domande del guardiano guarda cosa fa il *telefono* quando il
  dito resta giù mezzo secondo di troppo. **È il difetto peggiore trovato
  finora sulla pista**, perché colpisce il controllo più importante dell'app e
  non lascia traccia: chi lo subisce pensa di aver toccato male.
- **Il guanto esce dal metro di giudizio.** Vedi il punto 4 in *Come si lavora
  qui*. Le condizioni vere della prova sono sole in faccia, in piedi, una mano
  sola.

**16/08/2026** — versione `2026-08-16-consegna-a`:

- **La scheda si firma e si consegna.** Vedi *La consegna*, qui sopra. Era il
  punto 1: l'unica cosa che, da sola, sposta l'app da accessorio a necessaria.
- **Il tasto principale della schermata finale cambia peso** a seconda che la
  scheda sia da consegnare o no.
- **La consegna sopravvive alla schermata**: finisce sulla riga di cronologia
  e sulla copia in cloud, e la riga si ritrova per data — non per posizione.
  La prima della lista è quasi sempre quella giusta, e *quasi sempre* non è un
  criterio.
- **Un commento è stato tolto perché sembrava una chiave.** `/* la scheda: … */`
  dentro il dizionario italiano faceva dire al guardiano che otto lingue
  avevano un buco. Aveva ragione lui: un commento fatto come una chiave, in
  mezzo alle chiavi, è ambiguo per una macchina e lo sarebbe per una persona.
- **`print_sign_archer` in svedese diceva «Skättens».** Si scrive *Skyttens*.
  Nessun controllo poteva trovarlo: **per accorgersene bisogna essere svedesi**,
  che è la stessa frase già scritta per le federazioni scoperte.

**16/08/2026** — versione `2026-08-16-divisione-a`:

- **La divisione esiste sul file, e questa volta si può controllare.**
  `DIVISIONI` con le nove Classi e le otto Categorie del Regolamento Tecnico
  Art. 3 (delibera 033/2023/D), la **sigla come chiave** perché è quella che
  finisce in classifica, `OSP` come caso in cui la coppia non c'è. Nella riga
  di ogni iscritto: due menu, il numero di tessera, il codice di Compagnia — i
  quattro dati dell'Art. 18.j — e la pastiglia accanto al nome. Chi non ha la
  coppia intera dice **Ospite**. Vedi *Le divisioni*.
- **`divisioniPer()` dice `null` a chi non ha tabella**, e i due menu non
  compaiono: le sigle FIARC sono le sigle FIARC, non «le sigle». Provato con
  uno svedese, che vede due campi e nessuna divisione.
- **L'importazione legge il senso**: tessera, sigle, codice e nome si
  riconoscono dalla forma e l'ordine delle colonne non conta. Le righe
  schiacciate dai PDF finiscono fra quelle **da ricontrollare**, non fra i
  cognomi. Alla fine un resoconto che resta lì. Vedi *L'importazione legge il
  senso*.
- **L'intestazione di squadra si riconosce anche fuori dall'italiano.** Cercava
  `^squadra`: un olandese che incolla «Team 1» si ritrovava una persona di
  cognome *Team*. Adesso vale anche la parola della lingua in uso, presa da
  `pg_squadra_n`.
- **La decima domanda al guardiano**: le chiavi chieste a `t()` esistono, e
  esistono in tutte e nove le lingue. Vedi *Il guardiano*. Il conta-chiavi del
  16/08 mattina era uno script di giornata — una regola che viveva in una nota.
- **Due prove nuove**: la 7 nel banco (l'importazione, con la tabella vera
  estratta dal file) e `prova-schermo.js`, che costruisce la riga in un DOM
  finto. Vedi *Il banco*.
- **Il banco approvava un file sabotato.** Tolta di proposito la guardia della
  trappola `DA SILVA`, tutte le righe di prova passavano lo stesso: nessuna la
  toccava davvero. Aggiunti `DA, Joao` e `CO, Ana, LB`, che la toccano.
- **«1 iscritti».** Il resoconto infilava un conteggio dentro una frase che
  deve concordare, in nove lingue. Ora il numero sta dopo i due punti.
- **La bozza nasceva con squadre da cinque** mentre il campo diceva sei: due
  numeri diversi per la stessa cosa nella stessa schermata, rimasti indietro
  dalla correzione del 16/08 mattina.
- **I resoconti di fine lavoro erano illeggibili**, e non è un dettaglio di
  cortesia: se chi legge non capisce se il giro è andato bene o male, il
  documento ha fatto il suo lavoro e la chat no. Vedi *Come si risponde*.

**16/08/2026** — versione `2026-08-16-paesi-a`:

- **Il debito dei 602 è pagato: 562.** Non alzando il tetto. Sette campi di
  *Prepara gara* erano scritti a mano dal JS, e ognuno **ridisegnava da capo il
  campo che il foglio di stile già definisce**: fondo più scuro, bordo più
  sottile, padding fuori scala e — la cosa che conta — **nessun
  `min-height:var(--hit)`**. Erano campi **sotto i 44px** nell'unica schermata
  che si compila in piedi al banco iscrizioni. Non erano una variante voluta:
  erano il componente comune, peggiorato in silenzio, sette volte. Quindi non
  è nato nessun componente nuovo: quegli stili se ne sono andati e i campi sono
  tornati quelli di tutta l'app. Restano solo le eccezioni vere — una
  larghezza, un'altezza minima, una regola di flusso.
- **La riga dell'iscritto è una riga.** Vedi *Le righe dentro una scheda*: era
  un rettangolo con fondo, bordo e raggio dentro una scheda che ha già fondo,
  bordo e raggio. E il tasto che toglie l'iscritto era alto sedici pixel: ora è
  un bersaglio da 44 e dice **chi** sta togliendo (`aria-label`, nove lingue).
- **Cinque federazioni non potevano dire chi erano.** `FEDERATIONS` ne conosce
  sedici, `PROFILE_FEDERATIONS` ne elencava undici: **TOF, РФСЛ, RFETA, SBF,
  NHB**. Un turco poteva tirare il Round 3D turco e non poteva scrivere il
  proprio numero di tessera. Adesso sono sedici e sedici, e **il guardiano
  confronta le due liste** — vedi *La nona domanda*.
- **Le società non sono più tutte italiane per forza.** L'elenco ha 663
  società italiane e l'unico filtro separava FITARCO dal resto: uno svedese
  apriva *Klubbar* e trovava il **Piemonte**. Non era una lista vuota tradotta
  male, era la lista di un altro paese presentata come la sua. Ora una società
  ha un `paese` (assente = `it`, perché oggi lo sono tutte), il filtro passa da
  `compagniaVisibile()`, **le regioni mostrate sono solo quelle che hanno
  davvero una società**, e dove non ce n'è nessuna **il menu non compare
  affatto**: compare una frase che lo dice e il tasto per segnalarne una. Il
  giorno che entra la prima società francese le basta `paese:"fr"`.
- **«Trova campi vicino a me» cercava in italiano.** La frase mandata a Maps
  era `"tiro con l'arco campo 3D"` scritta a mano, uguale in tutte e nove le
  lingue: un olandese cercava in italiano, in Olanda. Ora è
  `campi_maps_query`, tradotta.
- **Il guardiano ha due domande in più** — classi fantasma e federazioni
  scoperte — e **una delle sue diceva il falso**. Vedi *Il guardiano*.

**16/08/2026** — versione `2026-08-16-date-a`:

- **Le date di questo documento erano sbagliate di un giorno, e sono state
  riallineate.** Tutto quello che qui risultava fatto il 16 (e il 17) agosto è
  del **15/08/2026**: la pista, il ridisegno per regioni, la striscia
  dell'annulla, la filigrana tolta, l'andamento, le divisioni, il guardiano.
  Sono stati spostati anche i nomi dei timbri, da `2026-08-16-*` a
  `2026-08-15-*`, perché un diario che data una versione in un giorno e la
  chiama con un altro è la stessa bugia che queste note vietano al
  `BUILD_STAMP`. **Questa è la data vera: non va rimessa indietro.** L'unica
  data del 16 agosto è questa riga.
- Corrette le stesse date nei commenti di `index.html` e in
  `controlla-token.js`. `EMAIL_VERIFY_SINCE` (14/08) **non** è una data di
  diario ed è rimasta dov'era.
- **Il guardiano boccia il file: 602 contro un tetto di 597.** Non è colpa del
  riallineamento — arriva da `squadra-sei`. *(Pagato il 16/08: 562. Vedi la
  voce `paesi-a` qui sopra.)* Vedi *Il guardiano*.
- **Le cartelle sul PC sono state rimesse in ordine.** `SITO\` tiene solo ciò
  che va online; `ArcTrail3D\` tiene il lavoro: queste note (**una copia
  sola**), i due strumenti, il tetto e le regole Firestore. C'erano due
  `NOTE-DESIGN.md` divergenti, una dentro la cartella pubblicata; ed è sparito
  `continuita.js`, che nessuno caricava più. I due strumenti accettano il
  percorso: `node controlla-token.js SITO\index.html`.

**15/08/2026, sera** — versione `2026-08-15-divisioni-b`, più
`controlla-token.js`:

> **METÀ DI QUESTA VOCE NON È MAI ARRIVATA SUL FILE.** *Verificato riga per
> riga il 16/08/2026, sull'`index.html` confermato come quello vero.* Le tre
> voci qui sotto barrate sono scritte qui e **non esistono nel codice**: la
> parola «divisione» non compare in `index.html` né in nessun altro file del
> progetto — solo in questo documento, quattordici volte. Sono state riaperte
> in *Cosa manca*. **La lezione, e vale più delle tre voci:** una riga di
> diario non è una prova che il lavoro sia stato fatto, ed è per questo che
> l'ottava e la nona domanda del guardiano esistono. Un diario che si crede
> senza controllare fa perdere una chat intera a scoprire il contrario.

- ~~**Tessera e codice di Compagnia si inseriscono in Prepara gara.**~~
  **Non nel file.** *Fatto il 16/08, vedi `divisione-a`.*
- ~~**L'importazione da testo capisce tessera, sigle e compagnia.**~~
  **Non nel file:** legge ancora solo `Cognome, Nome` e le intestazioni
  `Squadra N`. *Fatta il 16/08, vedi `divisione-a`.*
- ~~**La divisione esiste, e la assegna l'organizzatore.**~~ **Non nel file:**
  nessuna tabella `DIVISIONI`, nessun menu, nessuna delle quattro stringhe.
  *Fatta davvero il 16/08, vedi `divisione-a`. E le stringhe non erano quattro:
  quattordici, per nove lingue.*
- ~~**La riga dell'iscritto non è più stile in linea.**~~ La classe c'era nel
  markup, **la regola nel foglio no.** Fatta davvero il 16/08, vedi `paesi-a`.
- **La squadra arriva a sei**, come da Regolamento Tecnico FIARC Art. 5.c.
  Vedi *Le divisioni*. Nove etichette e due tetti nel codice.
- **Il guardiano non poteva dire di no**: cercava il tetto col punto davanti,
  non lo trovava, e usava i numeri di oggi. Vedi *Il guardiano*.
- **Il tetto scende da solo** quando una regola migliora. «Ricorda `--fissa`»
  era un promemoria, cioè buona memoria: la cosa che lo strumento esiste
  apposta per non chiedere.

**15/08/2026** — versione `2026-08-15-andamento-c`:

- **La versione `-b` era rotta e non doveva uscire.** Chiamava `pistaSpazio()`
  senza che la funzione esistesse: la schermata del percorso mostrava la sola
  testata. Rimessa la funzione, e — più importante — **aggiunta al guardiano la
  domanda che l'avrebbe fermata**. Vedi *Il guardiano*.

**15/08/2026** — versione `2026-08-15-andamento-b`:

- **L'andamento è uscito dalla scena ed è entrato nello spazio.** Vedi *La
  pista*: nella scena faceva scorrere la scheda e nascondeva il nome.
- **Si può tornare indietro a cambiare la squadra**, e la riga che lo permette
  dice anche chi c'è. Vedi *Chi tira*.
- **I due campi della schermata arcieri dicono a chi servono.**

**15/08/2026** — versione `2026-08-15-andamento-a`:

- **Lo spazio vuoto della pista adesso dice il totale e le piazzole chiuse.**
  Vedi *La pista*.
- **Toccando la casetta durante un giro spariva la barra di sezione.** Stessa
  famiglia del bug dello scorrimento, **stessa causa**: `appendTabBarTo()`
  usciva subito se `state.screen === "round"`, e con `homeOverride` lo stato
  resta *round* mentre a schermo c'è il menu. Chi toccava la casetta finiva in
  un vicolo cieco: niente barra e (fino a un'ora prima) nemmeno lo
  scorrimento. **Regola, valida per tutto il file: una guardia che decide
  l'aspetto deve guardare la schermata che si vede, non lo stato.** Con
  `homeOverride` le due cose non coincidono, ed è l'unico posto dove non
  coincidono — quindi è l'unico posto dove questa classe di bug può nascere.
  Vale la pena cercarne altri.
- **Il banco ha di nuovo mancato un buco**, e questa volta gli mancava una
  prova, non una domanda. Vedi *Il banco*.

**15/08/2026** — versione `2026-08-15-superficie-c`:

- **Uscendo dal giro la pagina restava bloccata.** `body.schermo-percorso`
  porta `height:100dvh` + `overflow:hidden`, e veniva messa guardando solo
  `state.screen === "round"`. Ma con `homeOverride` lo stato resta *round*
  mentre a schermo c'è il menu: il menu ereditava la regola e **non si
  scorreva più**. La regola «non scorre» deve seguire **la schermata che si
  vede**, non lo stato. Il bug c'era dal 15/08 mattina: nessuno era mai uscito
  dal giro per guardare il menu.
- **La filigrana è stata tolta.** Vedi *La pista*.
- **Il tasto *Classifica* era diventato invisibile.** La correzione precedente
  era andata troppo in là: senza fondo e in grigio chiaro spariva. *Piccolo non
  vuol dire invisibile* — un'azione secondaria deve avere il peso di un'azione
  secondaria, non di nessuna.
- **La striscia dell'annulla non va più a capo sul comando.** Sul telefono
  vero «Annulla freccia» si spezzava in due righe: un comando spezzato sembra
  due comandi. Il testo a sinistra si accorcia, il comando no.

**15/08/2026** — versione `2026-08-15-superficie-b`:

- **Outfit sostituito da Inter**, con cifre tabulari e zero barrato. Vedi
  *Caratteri*.
- **Filigrana, blu, rosso a riposo, tasto Classifica.** Vedi *La superficie*.
- **Il file non ha più nessun `clamp()` su un carattere** e ha cinque
  esadecimali in meno nei ruoli: `--score-spot`, `--score-ink` (due temi) e
  `--score-zero` usavano tinte scritte a mano che esistevano già fra i
  primitivi.

**15/08/2026** — versione `2026-08-15-superficie-a`. *Prima passata sulla
superficie, dopo aver visto l'app su un telefono vero:*

- **Il protagonista della scena dipende da quanti sono.** Vedi *La pista*.
- **Il nome esce da Fraunces.**
- **Le righe di elenco dentro una scheda non sono più scatole.** Vedi *Le
  righe dentro una scheda*.
- **Il guardiano aveva un falso positivo** e l'ha confessato: `border-top:1px`
  finiva nella regola della scala. Un filo da un pixel non è una spaziatura, e
  portarlo a 4 sarebbe stato rispettare la lettera contro il disegno. Corretta
  la regola, non il file: le misure fuori scala vere sono **63**, non 74.
- **Il banco era compiacente, e se n'è accorto da solo.** Vedi *Il banco*.

**15/08/2026** — versione `2026-08-15-misure-a`:

- **I quattro numeri esistono.** Vedi *Quattro numeri*, qui sotto. Erano
  l'ultima voce che si potesse chiudere senza uscire di casa, e vanno sul
  telefono **prima** del giro: misurano quel giro.

**15/08/2026** — versione `2026-08-15-regioni-a`:

- **La pista si ridisegna a regioni.** Vedi *Le regioni*, qui sotto. Era il
  punto 1: la funzione che il criterio dichiara essere l'unica che conta era
  anche la più costosa.
- **La barra dell'avanzamento non ha più uno stile in linea.** La percentuale
  entra come `--pct` e la larghezza la decide il foglio di stile: un dato è un
  dato, non una regola di presentazione.

**15/08/2026** — versione `2026-08-15-sagoma-via`:

- **Il controllo dei token esiste.** Vedi *Il guardiano*, qui sotto. Era il
  punto 2 e andava prima di tutto il resto, perché ogni lavoro fatto senza
  peggiorava il file in silenzio.
- **Il pannello sagoma non c'è più.** Vedi la voce in *La pista*. Con lui se
  ne sono andati `targetSVG()`, `drawMarker()`, `legendParts`, il flusso
  `pending` → *Conferma*, due variabili globali, sette chiavi × nove lingue,
  undici regole di CSS, l'icona `sight` e quattro token di zona. **8,2 kB in
  meno, e nessuna funzione persa**: il punteggio si segnava già coi tasti, e
  il punto d'impatto non veniva salvato da nessuna parte.

**15/08/2026** — versione `2026-08-15-pulizia-a`:

- **La regola «non scorre» è strutturale, non più sperata.** Vedi la voce in
  *Cosa resta da guardare*. Da verificare su un telefono vero.
- **Lo schermo parla**: `aria-live="polite"` sulla scena (chi non vede sente il
  cambio di turno), `role="status"` sulla striscia dell'annulla (comparire in
  silenzio, per chi non vede, è non esistere), e `.pista-arciere` è un `h2`
  invece di un `div`. Era la stessa funzione dell'app — *sapere di chi è il
  turno senza cercarlo* — per un utente diverso.
- **`archerTransitionScreen()` non c'è più.** Ventotto righe che nessuno
  chiamava dal 15/08.
- **Gli 8px sull'etichetta dei tasti non sono più nel file.**
- **Cinque componenti non nominano più un esadecimale**: `.ring-badge` (le due
  tinte della paglia sono diventate i primitivi `--straw-200/500/900` e i ruoli
  `--ring-bg-a/b`, `--ring-ink`, `--ring-empty-bg/bd`), `.ring-badge.empty`,
  le due pastiglie d'arco (`--bow-longbow`, `--bow-storico`, con valori diversi
  al buio) e `.adm-nd`. Anche `--success-role` era un esadecimale scritto due
  volte a mano: ora è `--green-success` / `--green-success-dk`. Da 118 a 63.

**15/08/2026** — versione `2026-08-15-firma-a`:

- **La schermata del percorso ha avuto il suo turno.** Vedi *La pista*.
- **Scorrimento e fuoco non si perdono più a ogni ridisegno.** Vedi
  *Continuità*. Resta aperto il limite dei campi senza `id`.
- **La striscia dell'annulla dichiara l'unità** e **anche il luogo**.
- **La filigrana del bersaglio.** *(tolta il 15/08, vedi La pista.)*
- **`state.panel` e `state.lastShotInfo` azzerati alla riapertura.** Un
  pannello è un modo, non un luogo; e un annulla offerto la mattina dopo per
  una freccia di ieri sera non è un aiuto, è una trappola.
- **Il timer si mette in pausa invece di distruggersi.**
- **La barra non offre uscite durante il giro.**
- **La firma**: i tiri sono una mappa con chiave, l'annulla propaga, la
  pastiglia dice il gradino peggiore. Vedi *La firma*.
- **Le stringhe `pista_*` in tutte e nove le lingue.** Con esse `timer_resume`,
  `pista_ultimo_altrove` e `target_inline`. Quest'ultima nasce da un errore che
  vale la pena ricordare: il titolo della classifica faceva
  `t("target_singular").toLowerCase()`, che in tedesco dava «ziel 13» — i
  sostantivi tedeschi vogliono la maiuscola. **La forma di una parola dentro
  una frase è una decisione di lingua, non di codice**: quindi è una stringa,
  non una chiamata a `toLowerCase()`.

### Messo in pausa di proposito (non dimenticato)

- ~~**Modalità sole**~~ *(fatta a metà il 16/08, e la metà giusta.)* Il
  contrasto c'è ed è un tema vero, vedi *Il tema Sole*. Le misure — bersagli
  a 56px, testo a 1,15× — restano in pausa: nessuno le ha chieste, e cambiarle
  sposta l'impaginazione della schermata che non scorre.

### Scartato, con la ragione

- `navigator.vibrate()` con pattern diversi per zona. Vedi *Sulla vibrazione
  per zona*: si guarda comunque, quindi il pattern conferma una cosa che
  l'occhio ha già confermato. Resta il `vibrate(15)` uniforme, che conferma
  il tocco e basta — ed è tutto quello che serve.
