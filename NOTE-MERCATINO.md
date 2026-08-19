# Il mercatino — note di design *(17/08/2026)*

**Questo e' il diario di `marketplace.html`. `NOTE-DESIGN.md` e' il diario
dell'app.** Sono due file perche' sono due programmi: il mercatino ha un suo
foglio di stile, un suo JavaScript e non passa da `index.html` — esattamente
come il guardiano e i banchi hanno il loro file e non una sezione.

*Quello che vale per tutti e due sta in `NOTE-DESIGN.md` e non si ricopia qui:
i tre strati del foglio di stile, la scala 4/8/12/16/24/32/48, i 44 pixel, i
due caratteri, come si risponde, come si racconta il mercatino. Qui c'e' solo
quello che riguarda questa pagina.* **Se una regola generale cambia, cambia
li'** — e questo file va riletto per vedere se e' rimasto indietro.

*Perche' non e' una sezione di `NOTE-DESIGN.md`, detto una volta: quel file
non si puo' modificare a pezzi, si riscrive intero. Riscrivere settanta pagine
per aggiungerne cinque e' il modo piu' probabile di perderne una senza che se
ne accorga nessuno — ed e' il difetto peggiore che quel documento possa avere,
peggio di non trovarlo. I due nomi stanno uno accanto all'altro nell'elenco
dei documenti del progetto: chi apre una chat nuova li vede tutti e due.*

Timbro attuale: **`2026-08-19-mercatino-beta`** (`<body data-build>`), nato da
`2026-08-19-mercatino-cerchio`. **Fra `-e` e `mercatino-cerchio` questo diario
non è stato aggiornato**: i giri del 18 e del 19/08 — le segnalazioni, il
cerchio — sono nel file e non qui. Chi riprende non li trova scritti da nessuna
parte, ed è esattamente il difetto che questo documento esiste per evitare.
*Non sono stati ricostruiti a posteriori: inventarli sarebbe peggio che
ammettere che mancano.*

Il timbro, come il
`BUILD_STAMP` dell'app va cambiato **nella stessa mossa** in cui si cambia il
file. I quattro giri del 16/08, in ordine: `-a` (il mercatino diventa
dell'app), `-b` (il modulo nascosto, le ricerche salvate, la porta delle
recensioni), `-c` (le nove lingue), `-d` (dieci difetti trovati rileggendo, e i
preferiti che seguono l'account). Il 17/08: `-e`, **le ricerche salvate
bussano**.

*Il 17/08 sono state due giornate diverse sullo stesso file. La prima non lo ha
toccato affatto — si e' chiusa la regola Firestore dei preferiti, che stava
fuori: vedi **Il pezzo che stava fuori dal file**. La seconda ha chiuso la
voce 2, e quella il file lo tocca: vedi **Quinto giro**, in fondo.*

**I file di questo pezzo sono sette**, e si riconsegnano tutti insieme:

| file | cos'e' |
|---|---|
| `marketplace.html` | la pagina — l'unica che va online |
| `NOTE-MERCATINO.md` | questo diario |
| `prova-schermo-market.js` | il banco: apre la pagina e le fa quindici domande |
| `banco-avvisi.js` | il banco della Cloud Function degli avvisi *(nuovo, 17/08)* |
| `dizionario-a.py`, `-b.py`, `-c.py` | le parole, nove lingue per riga |
| `genera.py` | controlla il dizionario, lo scrive dentro la pagina **e dentro `index.js`** |
| `markup.html` | il testo statico con gli agganci `data-t` |

*Il settimo e' nato il 17/08 insieme agli avvisi, e non e' un banco della
pagina: e' il banco di `index.js`, le Cloud Functions. Sta qui perche' guarda
una decisione del mercatino — chi viene avvisato e chi no — e chi lavora sul
mercatino deve lanciarlo.*

**Il dizionario dentro `marketplace.html` e' generato: non si corregge li'.**
Si cambia il `.py` e si rilancia `genera.py`, altrimenti la correzione sparisce
alla prossima passata — ed e' lo stesso motivo per cui il tetto dei token non
si alza a mano. **Dal 17/08 vale anche per `index.js`**: il titolo della
notifica degli avvisi vive in nove lingue anche li', fra due marcatori, e lo
scrive lo stesso generatore.

---

## Il difetto grosso: il mercatino non era dell'app

Non era una questione di gusto. Erano **quattro cose che il resto del progetto
aveva gia' deciso, e che qui non erano mai arrivate.** Nessuna si vedeva
guardando la pagina da sola: si vedono solo mettendola accanto all'app.

### 1. Il tema non arrivava fin qui

«La scelta del tema vale su ogni schermo» e' scritto in *Decisioni di prodotto
gia' prese* dal primo giorno. Il mercatino era l'unica pagina che non la
rispettava: si usciva dall'app in **Scura** e si finiva su una pagina bianca.
Non e' un dettaglio estetico — e' la stessa app che rinnega una scelta appena
fatta, che e' il modo piu' veloce per non essere creduti (la stessa frase
scritta per il tema che non si salvava).

Ora la pagina **legge** `arctrail3d_state_v3` e mette la classe su `<html>`
prima di dipingere. Non scrive niente: il tema si cambia dal profilo dell'app,
e qui si obbedisce.

**Ed e' costato quello che doveva costare: una mappa di ruoli.** Il file aveva
la sua tavolozza scritta a mano; adesso ha i tre strati di `index.html`
— primitivi copiati riga per riga, ruoli, e gli **alias** (`--bg`, `--accent`,
`--line`, `--bark`…) che sono i nomi con cui erano gia' scritte milleduecento
righe di componenti. Zero regole di componente riscritte. E' la promessa in
cima al foglio di stile riscossa una seconda volta, su un file nato fuori.

*Il Sole ci arriva insieme agli altri due. Il tasto per accenderlo NO: sta
sulla pista, dove serve. Il mercatino si guarda a casa.*

### 2. I valori copiati a mano avevano gia' cominciato a divergere

Il badge BETA diceva `rgba(232,114,47)` e `--bark` diceva `#D9601E`: **due
arancioni diversi nella stessa testata.** Il verde-acqua `rgba(29,154,140)` del
dettaglio non esiste in nessun punto dell'app. L'oro dei riquadri era
`rgba(203,163,92)` in un posto e `#A6791F` in un altro.

Nessuno di questi si vede a occhio nudo, ed e' esattamente il punto: **un
valore riscritto a mano non sbaglia subito, sbaglia dopo.** Regola gia' scritta
per la presentazione, valida qui uguale: *un valore che sta anche in
`index.html` non si riscrive, si copia.* Esadecimali dentro i componenti:
**zero.**

### 3. Outfit era ancora qui, e qui ci sono solo cifre

Outfit era stato tolto dall'app il 15/08 perche' e' un geometrico: 0, 6, 8 e 9
sono quasi lo stesso cerchio. Il mercatino lo caricava ancora — e il mercatino
scrive **prezzi, libraggi, allunghi, spine**, cioe' quasi solo cifre. Era lo
stesso errore, in un file che non era stato guardato.

Adesso: **Inter** con `tabular-nums slashed-zero` su ogni cifra, **Fraunces**
sul marchio e sui titoli di schermata. **Non** sul titolo di un annuncio:
«Ricurvo Hoyt Satori 40lb» e' pieno di sigle e numeri, ed e' la stessa ragione
per cui Fraunces non va su uno username.

### 4. Un bersaglio su tre era sotto i 44 pixel

`--hit:44px` e' «il pavimento, non il traguardo». Qui erano sotto: la chiusura
dei pannelli (30), le frecce delle foto (34), il cuore dei preferiti (28), la
× della nota (28), le chip (36), le pastiglie dei filtri (38), l'interruttore
degli avvisi (26 di altezza), l'iniziale in testata (36).

Due casi meritano una riga a parte, perche' non sono stati risolti allargando:

- **L'interruttore degli avvisi** resta alto 26 pixel *a vederlo* — quella e'
  la forma giusta — ma il tasto e' 44 e la pastiglia si disegna in un
  `::before`. Il disegno non cambia, il dito si'.
- **La crocetta per togliere una foto** era 20 pixel, su un'azione che
  cancella. Non e' stata ingrandita: **e' stata tolta.** Una foto gia' messa si
  tocca e si sceglie — *sostituisci* oppure *togli*. Un tocco in piu', e
  nessun errore da rimediare.

---

## La scheda dell'annuncio non diceva cos'era l'oggetto

Questo e' il difetto che vale piu' di tutti gli altri messi insieme, ed e' di
prodotto, non di stile.

Il motivo per cui questo mercatino esiste invece di un gruppo Facebook e' che
**sa cos'e' un libraggio**. Sta scritto in *Cosa non ha nessuna delle sei*:
«il mercatino dell'usato con i filtri veri del 3D — libbraggio, allungo, mano,
spine». I filtri c'erano. La **scheda** no: diceva citta', quando, e se
spedisce. Per sapere se un arco era 40 o 50 libbre, destro o mancino,
bisognava aprirlo. Su venti annunci sono venti aperture.

Adesso la scheda ha due righe distinte, e la prima e' quella tecnica:

```
HOYT · Ricurvo · 40 lb · 28″ · destro
Verbania (VB) · 1h fa · spedisce
```

*Dirlo solo dentro la scheda aperta significa non dirlo.*

### E c'era un solo modo di scoprire che era rotta: contare i costruttori

**Erano quattro.** Elenco, preferiti, profilo del venditore e «i miei annunci»
disegnavano la stessa scheda in quattro modi diversi, tre dei quali a stile in
linea. *Due percorsi che disegnano la stessa cosa divergono sempre, e divergono
in silenzio* — regola gia' scritta per `roundScreen()` e `dipingiPista()`, e
qui era gia' successo: **nei preferiti e sul profilo del venditore un annuncio
«Cerco» stampava `€ 0`**, perche' quelle due copie non sapevano che un «Cerco»
ha un budget e non un prezzo. Nessuno l'aveva segnalato: sembra soltanto un
prezzo strano.

Adesso il costruttore e' **uno**, `cardHtml(a, opt)`, e le quattro schermate lo
chiamano. Come effetto collaterale sono spariti circa quaranta stili in linea:
**il JS di questa pagina adesso non ne genera nessuno.**

---

## Le finestre del browser non sono pezzi dell'app

Tre gesti passavano da `prompt()` e `confirm()`.

- **La controproposta** era un `prompt()`. Ma l'offerta — che e' la stessa
  identica cosa vista dall'altra parte — aveva il suo modulo curato, con la
  cifra grande. Due affordance per lo stesso gesto, con due aspetti diversi:
  chi riceve un'offerta seria rispondeva da una casella che sembra un errore
  del browser.
- **Il link a una foto** era un `prompt()` con una regex dietro.
- **Le due cancellazioni** erano `confirm()`.

Adesso c'e' **un foglio solo** (`openAsk`) per chiedere un numero o un testo,
con la validazione che parla in italiano invece di far sparire quello che avevi
scritto; e le cancellazioni le chiede la stessa pastiglia rossa di tutte le
altre azioni. *Una finestra di sistema in mezzo a un foglio che sale dal basso
e' un pezzo di un'altra app — e su iOS, in PWA, blocca tutto finche' non si
risponde.*

---

## Le cose piccole, che erano piccole davvero

- **`maximum-scale=1` tolto.** Bloccare la pinch e' togliere l'ingrandimento a
  chi ne ha bisogno. Un annuncio si guarda anche con gli occhiali sbagliati.
- **Le emoji sono diventate disegni.** Arco, cuore, pacco, lente: un'emoji si
  disegna diversa su ogni telefono, quindi il marchio non controlla come
  appare — e nel tema scuro un cuore bianco resta bianco. Ora sono SVG che
  prendono `currentColor`. *(E' il punto 3 di «Cosa manca», applicato qui.)*
- **La foto del dettaglio non taglia piu' l'oggetto** (`object-fit:contain`):
  un arco tagliato a meta' non e' la foto di un arco. Da computer era gia'
  cosi', sul telefono no.
- **L'iniziale in testata non spariva piu' da computer.** Era l'unica porta
  per le *Ricerche salvate*, e sopra i 760px era `display:none`.
- **Un preferito che non c'e' piu' lo dice.** Se un annuncio salvato viene
  venduto o messo in pausa spariva in silenzio, e chi guardava pensava di aver
  sbagliato. Adesso si contano: *«2 preferiti non sono piu' disponibili»*.
  Le righe che non si possono mostrare si contano — la stessa regola
  dell'importazione degli iscritti.
- **La ricerca guarda anche la marca.** Cercare «hoyt» non trovava gli annunci
  che avevano HOYT nel campo marca e non nel titolo.
- **Il comando primario non e' piu' tagliato.** A 390px «Nuovo annuncio»
  divideva la riga con due filtri e usciva dallo schermo. Adesso i filtri
  stanno sopra e il comando prende tutta la riga: e' l'unica azione primaria
  della pagina.
- **I collegamenti sono assoluti** (`https://arctrail3d.com/…`). Stessa regola
  della presentazione: una pagina che si puo' aprire da un file scaricato non
  ha link relativi.
- **La nota del mercatino dice quello che manca, non un principio.** Diceva
  «l'app non gestisce i pagamenti e non fa da intermediario» — che e' la stessa
  frase vietata in *Come si racconta il mercatino*: descrive una scelta di
  modello che non e' stata presa. Adesso: *«dentro l'app **non ci sono ancora**
  opzioni di pagamento: **per il momento** prezzo, pagamento e consegna li
  accordate per messaggio»*.

---

# Secondo giro — `2026-08-16-mercatino-b`

*Tre cose, e la prima non e' debito di stile: e' un pezzo dell'app che non
funzionava.*

## Il modulo di modifica si apriva dietro la schermata

Da **I miei annunci** si toccava un annuncio e non succedeva niente. Il modulo
si apriva davvero — `ovForm` prendeva la classe `open`, il titolo diventava
*Modifica annuncio*, i campi si riempivano — e restava **nascosto dietro un
fondo pieno**. Nessun errore, niente in console: il tocco sembrava non aver
fatto nulla, ed era **l'unica strada per correggere un proprio annuncio**.

La causa e' una riga: pannelli e schermate a tutto schermo erano tutti e due a
`z-index:100`, e a parita' di livello vince chi sta piu' in basso nel
documento. Le schermate a tutto schermo sono scritte **dopo** i pannelli.
Adesso i pannelli stanno a 110: un pannello e' sempre l'ultima cosa aperta,
quindi sta sempre davanti.

*Come e' saltato fuori, e conta piu' del bug:* non guardando la pagina, ma
**contando l'ordine degli elementi nel file** mentre si spostava un altro
pannello. Poi provato con una sonda che chiede al browser *chi c'e' in quel
punto dello schermo* — e la risposta era `fsMyAds`. **Un bug che non lascia
tracce si trova solo chiedendo al browser, non leggendo il codice.**

## «Avvisi attivi» era una bugia, adesso e' un conto

L'interruttore delle ricerche salvate diceva *Avvisi attivi* e dietro **non
c'era niente**: le ricerche vivevano in `localStorage`, non passavano da
Firestore, e nessuna notifica e' mai partita. E' Norman nella forma peggiore,
perche' la cosa promessa era la piu' seria che un mercatino possa promettere —
*a quello ci penso io* — e chi ci contava perdeva l'annuncio **senza sapere
perche'**.

C'erano due strade: farla funzionare davvero, o dire il vero. La prima vuole un
pezzo sul server che oggi non c'e' (qualcuno che guardi i nuovi annunci e mandi
la notifica), e **non si scrive che ci sia**.

Quindi adesso fa una cosa vera, e la dice: **conta i nuovi**. Ogni ricerca
ricorda quando l'hai guardata; entrando nel Marketplace la campanella porta il
numero degli annunci arrivati da allora. Toccare una ricerca la **esegue**, ed
e' anche il momento in cui l'hai guardata: il conto riparte da li'. *Il numero
non si azzera guardandolo da lontano — si azzera aprendo quello che conta.*

Sopra l'elenco c'e' una riga sola, e dice anche **cosa non fa**: «sul telefono
non arriva ancora nessuna notifica». Vale la regola gia' scritta per i
pagamenti: una funzione che non c'e' si descrive per quello che oggi manca.

*Una ricerca salvata prima d'oggi non ha una data. Metterla a zero le farebbe
dire «180 nuovi» al primo sguardo — rumore, non una notizia: si parte da
adesso, e la migrazione si riscrive subito.*

## Le recensioni hanno una porta

`openRevSheet()` era scritta, funzionante, e **non la chiamava nessuno**. Il
profilo del venditore mostrava media, stelle e conteggio di recensioni che non
c'era modo di scrivere. *Codice vivo senza una porta e' peggio di codice morto:
fa sembrare fatta una funzione che non c'e', e da fuori sembra soltanto che
nessuno abbia ancora recensito.*

La porta si apre dove c'e' stato davvero uno scambio: **sotto un'offerta
accettata**, dentro la chat. Non prima — una recensione senza trattativa e' un
voto, non una testimonianza, ed e' la stessa asimmetria della controfirma sul
percorso: **vale perche' l'altro c'era**. Una per scambio: due voti della stessa
persona sullo stesso annuncio non sono due testimonianze, sono la stessa detta
due volte.

*Quello che resta fuori, di proposito:* un venditore che segna «venduto» non
puo' recensire nessuno, perche' l'app non sa **a chi** l'ha venduto. Inventare
un destinatario sarebbe peggio che non offrire il gesto.

---

# Terzo giro — `2026-08-16-mercatino-c`: le nove lingue

**Perche' questa prima delle altre cose aperte.** Nella presentazione c'e' una
frase che l'app puo' dire e nessun concorrente puo': *«un'app che tenga insieme
i punteggi e le persone — la compagnia, gli allenamenti aperti, il mercatino, i
messaggi — senza passare da uno store, **in nove lingue**, gratis»*. Con il
mercatino in solo italiano quella frase era **falsa**, e una frase smontata una
volta si porta dietro tutto il resto della presentazione. Non era la voce piu'
grossa della lista: era l'unica che rendeva vera una cosa che diciamo gia'.

## La lingua si eredita, non si chiede

Come il tema: si legge `state.lang` dall'app e basta. **Un mercatino che chiede
una seconda volta in che lingua parli e' un secondo prodotto, non una pagina
dello stesso.** Da qui non si scrive nulla: la lingua si cambia nel profilo
dell'app, e qui si obbedisce.

## Il markup porta la chiave, non la frase

`data-t` sul testo, `data-th` dove dentro c'e' del grassetto, `data-tp` sul
segnaposto, `data-ta` sull'etichetta per chi non vede, `data-tt` sul
suggerimento. `traduci()` passa una volta sola all'avvio — qui la lingua non
cambia mai a pagina aperta, quindi non serve altro.

**E le etichette che stanno nei dati sono chiavi, non testo.** Nel database si
salva `arco`, `ottimo`, `paused`; la parola la sceglie chi guarda. Se l'app
avesse salvato *«Archi»* la stessa riga sarebbe illeggibile in svedese — e non
ci sarebbe modo di aggiustarla senza riscrivere gli annunci gia' pubblicati.

## Il dizionario si genera, non si scrive a mano nel file

`dizionario-a/b/c.py` → `genera.py` → il blocco dentro `marketplace.html`.
**Non si corregge nel file**: si corregge nel sorgente e si rigenera. Prima di
scrivere, `genera.py` fa le stesse domande che il guardiano fa a `index.html`:

1. ogni chiave esiste in **tutte e nove** le lingue?
2. i segnaposto (`{n}`, `{v}`, `{name}`) sono **identici** in tutte e nove? —
   `t()` fa una sostituzione testuale, e un segnaposto perso diventa una frase
   monca a schermo, non un errore;
3. ogni chiave chiesta dal markup o dal codice **esiste davvero**?
4. quali chiavi sono scritte e non usate da nessuno?

Oggi: **299 chiavi, nove lingue, nessun buco.**

*La quarta domanda ha dovuto imparare a leggere.* Al primo giro diceva che
`hand_dx_s`, `fav_gone_1`, `status_active` non le usava nessuno — e le usa il
codice, dentro un ternario (`t(a.mano==="dx"?"hand_dx_s":"hand_sx_s")`) o
composte a mano (`t("status_"+k)`). **Un elenco di «mai usate» pieno di falsi
allarmi viene ignorato la volta che ha ragione**, quindi legge dentro la
chiamata a parentesi bilanciate, salta le stringhe a destra di `==` (quelle
sono condizioni, non chiavi) e riconosce i prefissi composti.

## Il difetto che il banco ha trovato subito: `t` coperta

`metaLine()` cominciava con `var t=[]`. Dentro tutta la funzione — **e dentro
le funzioni annidate** — `t` non era piu' la funzione delle lingue ma un
elenco. Lo stesso in `sndMsg()`, dove `var t` era il testo del messaggio e la
`catch` lì dentro chiamava `t("send_failed")`: sarebbe scoppiato **solo** quando
un invio fosse fallito, cioe' quasi mai, cioe' addosso a qualcuno al campo.

Il messaggio e' `t is not a function` e non dice dove. *Regola: in questo file
`t` e' un nome riservato.* Le due variabili si chiamano ora `parti` e `txt`, e
il parametro di `setADT` si chiama `tipo`.

## Quello che NON e' stato tradotto, di proposito

- **I nomi delle marche.** `HOYT`, `EASTON`, `W&W` sono nomi propri, e sono
  anche la chiave con cui si cerca: tradurli spezzerebbe la ricerca.
- **Il titolo e la descrizione degli annunci.** Li scrive chi vende, nella sua
  lingua. Un olandese che legge un annuncio italiano vede l'interfaccia in
  olandese e il testo in italiano — ed e' giusto: quello e' il testo di una
  persona, non dell'app.
- **`lb` e `″`.** Sono unita', non parole.
- **Il messaggio in console** quando si sfonda il tetto dei 200 annunci: parla
  a chi sviluppa, non a chi tira.

## Il rischio, scritto perche' e' reale

**Queste traduzioni non sono state riviste da un madrelingua.** Le note
dell'app raccontano gia' come va a finire: `print_sign_archer` in svedese
diceva *«Skättens»* invece di *«Skyttens»*, e **nessun controllo poteva
trovarlo — per accorgersene bisogna essere svedesi**. Qui ci sono 299 chiavi
per otto lingue oltre l'italiano: qualche parola sara' sbagliata.

Quello che il generatore garantisce e' diverso e vale comunque: che **non
manchi niente** e che **niente cada in italiano di nascosto**. La differenza e'
fra *sbagliata* e *assente*: una parola sbagliata si corregge quando qualcuno
la segnala, una frase che cade nella lingua sbagliata non la segnala nessuno
perche' sembra giusta.

---

# Quarto giro — `2026-08-16-mercatino-d`: dieci difetti trovati rileggendo

*Una rilettura del file a occhi freschi, cercando **solo** comportamenti
sbagliati. Ne sono usciti dieci, e i primi quattro erano cose che chi usa
l'app avrebbe visto — non debito, roba rotta. Il fatto che siano rimasti
nascosti attraverso tre giri di lavoro sullo stesso file e' il punto: **si
guardava se il disegno era giusto, non se il codice faceva quello che dice.***

## I quattro che si vedevano

**1. Sul profilo di un venditore con recensioni gli annunci non si aprivano.**
Si montavano le schede, si attaccavano i click, e **subito dopo** un
`innerHTML +=` aggiungeva le recensioni — riscrivendo tutto il contenitore e
buttando via i listener appena messi. Sul profilo di un venditore *senza*
recensioni funzionava. Cioe' si rompeva esattamente sui venditori che si va a
guardare. *Regola: `innerHTML +=` non e' un'aggiunta, e' una riscrittura.*

**2. Correggere un annuncio venduto lo rimetteva in vendita.** `status:"active"`
stava nel payload di sempre, e per la modifica si fa `update()`. Segni un arco
come venduto, poi apri l'annuncio per correggere una parola nella descrizione,
salvi — e ricominciano ad arrivare messaggi per una cosa che non hai piu'.
*Adesso `status` si scrive solo alla nascita.*

**3. Cambiando categoria i dati vecchi restavano attaccati.** `update()` non
tocca quello che non nomini: chi aveva pubblicato per errore delle frecce
dentro «Archi» e correggeva la categoria si ritrovava un set di frecce che
diceva ancora *«HOYT · Compound · 40 lb · 28″ · destro»* — e continuava a
comparire a chi filtra per archi compound da 40 libbre. **Un dato che
sopravvive alla sua categoria non e' un residuo: e' una bugia con dentro dei
numeri.** Adesso i campi che non c'entrano piu' si cancellano davvero
(`FieldValue.delete()`).

**4. I propri annunci venduti rientravano nell'elenco pubblico.** Per far
trovare l'annuncio al modulo di modifica lo si spingeva dentro `allAds` — che
e' l'elenco pubblico, e `matchF()` non guarda lo stato. Il proprio annuncio
venduto ricompariva nei risultati, contava nel numero «N annunci», si poteva
mettere fra i preferiti, e spariva da solo al prossimo aggiornamento dal
server: cioe' in un momento che nessuno collega al gesto di prima. Adesso
c'e' `adCache`, che sta accanto e non dentro.

## I sei che non si vedevano, e uno era il piu' frequente di tutti

**5. Il fondo si sbloccava sotto un pannello ancora aperto.** Ogni chiusura
scriveva `overflow=""` senza guardare se sotto restava qualcosa. E i pannelli
si sovrappongono in continuazione: il foglio *aggiungi foto* si chiude sopra il
modulo — **a ogni foto** —, il modulo si chiude sopra *I miei annunci*, il
profilo del venditore si chiude sopra il dettaglio. Il dito si portava via lo
sfondo invece del contenuto. Adesso c'e' `bloccaFondo()`, che conta quanto e'
rimasto aperto.

**6. Una foto lenta finiva nell'annuncio dopo.** Metti una foto, la barra gira
ancora, chiudi il modulo; riapri *Nuovo annuncio* e **quella foto compare da
sola**, dentro un annuncio a cui non appartiene, e chi la vede non ha modo di
capire da dove sia arrivata. Se invece non riapri, il JPEG resta nel bucket per
sempre. Adesso il modulo ha un numero di giro: quello che arriva fuori tempo
massimo e' orfano e si cancella subito.

**7. Uscendo restavano i preferiti e le ricerche di chi usciva.** `myFavs` e
`savedS` non si azzeravano: chi entrava dopo sullo stesso telefono trovava
cuori accesi su annunci mai visti — e al primo tocco quella roba veniva
**scritta sotto la sua chiave** e diventava sua.

**8. Il filtro marca restava acceso e invisibile.** «Archi + HOYT», togli
Archi, applichi, e continui a vedere solo HOYT senza piu' un posto dove
leggerlo. Sembra un mercatino vuoto. *Un filtro che non si vede non si azzera.*

**9. Una cifra dal database entrava dentro un `onclick`.** `m.amount` finiva
grezzo nell'attributo del tasto *Contro*. Serve un interlocutore che scriva
direttamente su Firestore, quindi e' improbabile — ma era l'unico punto del
file dove un dato non nostro entrava in un attributo eseguibile. `Number()`, e
la porta si chiude.

**10. La chat non si staccava.** Uscendo dalla conversazione l'ascoltatore
Firestore restava aperto a consumare dati e batteria fino alla chat successiva.
Non rompeva niente, e per questo non lo notava nessuno. Adesso `chiudiChat()`,
chiamata da tutti e tre i modi di uscire.

*Piu' un'ombra fragile, non un difetto: dentro `dipingiCampana` il `reduce`
chiamava `t` la sua variabile. Non traduceva niente li' dentro, quindi non
rompeva — ma e' la stessa trappola che aveva gia' colpito due volte, e le
trappole si tolgono quando si passa di li'.*

---

## I preferiti seguono l'account, non il telefono

Era il punto 3 della lista aperta. Stavano solo in `localStorage`: chi cambiava
telefono li perdeva, **e non gliel'aveva detto nessuno**.

Adesso salgono anche su Firestore, con tre scelte che vale la pena scrivere:

- **Il telefono resta la fonte primaria**, il cloud e' una copia. Si scrive
  subito in locale — quindi il cuore risponde anche senza rete, che al campo
  e' la regola — e si manda su dopo.
- **Al rientro i due elenchi si uniscono, non si sovrascrivono.** Chi ha
  salvato qualcosa su due telefoni diversi non deve perdere niente: un
  preferito si toglie a mano, non per sincronizzazione.
- **Se il cloud non risponde, lo dice.** Un salvataggio che fallisce in
  silenzio e' la stessa promessa vuota delle vecchie «Avvisi attivi»: la
  schermata Preferiti scrive che quei preferiti stanno solo su questo telefono.

### Serve una regola su Firestore, altrimenti quel messaggio compare a tutti

*Scritta e chiusa il 17/08. Vedi il capitolo qui sotto.*

---

# Il pezzo che stava fuori dal file — 17/08/2026

*Il mercatino non e' stato toccato: `marketplace.html` resta a
`2026-08-16-mercatino-d`. Quello che e' cambiato sta in altri due file, ed e'
la voce 3 della lista aperta — l'unica che non si chiudeva da dentro.*

## La regola `market_favs`

`firestore.rules` passa a **`2026-08-17-market-favs`**. Il blocco sta accanto
alle altre `market_*`:

```
match /market_favs/{userId} {
  allow read: if signedIn() && request.auth.uid == userId;
  allow create, update: if signedIn() && request.auth.uid == userId
                        && request.resource.data.keys().hasOnly(['ids','updatedAt'])
                        && request.resource.data.get('ids', []) is list;
  allow delete: if signedIn() && request.auth.uid == userId;
}
```

Tre scelte, e nessuna e' scontata:

- **Nemmeno l'admin legge.** Ovunque nel mercatino `isAdmin()` sta fuori
  dall'AND perche' l'admin modera. Qui non c'e' niente da moderare: **la lista
  di cosa uno sta cercando di comprare non serve a nessun altro.** E' l'unica
  raccolta `market_*` chiusa anche a chi tiene l'app.
- **Niente `isApproved()`.** Stessa ragione per cui il delete degli annunci non
  ce l'ha: i propri dati devono restare cancellabili anche a un utente
  sospeso, altrimenti l'eliminazione dell'account si ferma a meta'.
- **`create, update` separati dal `delete`.** In una richiesta di
  cancellazione `request.resource` non esiste: un `hasOnly` dentro un unico
  `allow write` avrebbe bloccato proprio la cancellazione dell'account —
  cioe' la cosa che questa regola deve garantire.

*E `hasOnly` ha un costo dichiarato: se un giorno il documento avra' un terzo
campo, va aggiunto nella regola **nella stessa mossa** in cui lo scrive il
client. Altrimenti il salvataggio viene rifiutato e la schermata Preferiti
ricomincia a dire che i preferiti stanno solo su questo telefono — che e' il
messaggio giusto per il motivo sbagliato.*

**Ordine di applicazione: le regole PRIMA di `marketplace.html`.** Al contrario
ogni telefono scrive «questi preferiti stanno solo qui» per tutto il tempo in
mezzo: comportamento corretto, frase sbagliata, mostrata a tutti.

## Il difetto trovato scrivendo la regola: i preferiti sopravvivevano all'account

Non era in nessuna lista. E' saltato fuori chiedendosi **chi cancella questo
documento** — e la risposta era nessuno.

`wipeAccountData()` in `index.html` cancellava annunci, trattative, messaggi,
recensioni scritte e le foto su Storage. `market_favs/{uid}` no: era nato il
giorno prima, dentro `marketplace.html`, e la cancellazione dell'account vive
in un altro file. **Un dato aggiunto in un file si cancella in un altro, e
questo e' esattamente il modo in cui un residuo passa inosservato.**

Restava sul cloud, dopo l'eliminazione, l'elenco di cosa uno stava cercando di
comprare — cioe' proprio il tipo di residuo che Google verifica sulle app con
contenuti scritti dagli utenti. Una riga, e non e' una query ma un documento:

```js
jobs.push(db.collection("market_favs").doc(uid).delete().catch(function(){}));
```

`BUILD_STAMP` dell'app passa a **`2026-08-17-market-favs`**: la riga e il
timbro nella stessa mossa, come sempre.

*Regola che vale oltre questo caso: **una raccolta nuova non e' finita quando
si scrive — e' finita quando qualcuno la cancella.** Le domande sono tre, e
vanno fatte tutte e tre lo stesso giorno: chi la scrive, chi la legge, chi la
porta via quando l'account sparisce.*

## Come e' stata provata: pubblicata e guardata

**L'emulatore Firestore non si e' potuto eseguire** — il `.jar` si scarica da
`storage.googleapis.com`, che dall'ambiente di lavoro non si raggiunge — quindi
la sintassi era stata solo riletta a mano. *Un banco che non e' stato eseguito
non e' un banco: e' un'opinione ben scritta.*

**Il 17/08 le regole sono state pubblicate e `index.html` con esse, e la prova
e' stata fatta sul posto: funziona.** Un cuore acceso sale su Firestore, la
riga «questi preferiti stanno solo su questo telefono» non compare piu'.

*Resta vero che nessun banco automatico guarda questa regola: se un giorno il
documento prendera' un terzo campo, il primo segnale sara' quella riga che
ricompare. Non c'e' niente che lo dica prima.*

---

## I due banchi

`node prova-schermo-market.js` guarda **la pagina**. `node banco-avvisi.js`
guarda **la decisione del server**: quale annuncio fa partire quale avviso, a
chi, in che lingua. Sono due file perche' sono due domande diverse, e la
seconda non ha uno schermo da guardare. **Vanno lanciati tutti e due prima di
consegnare.**

*Il secondo e' nato il 17/08, lo stesso giorno della funzione, e non un giorno
dopo: fino a quel momento di questo pezzo non guardava niente, e in questo
diario c'e' gia' scritto che un banco non eseguito e' un'opinione ben scritta.*

## Il banco della pagina: `prova-schermo-market.js`

`node prova-schermo-market.js` — serve `playwright`. Firebase e' finto: qui non
si guarda il database, si guarda **lo schermo**.

Apre la pagina **dieci volte** — telefono in chiara, scura e Sole; computer in
chiara e scura; svedese, olandese, russo e turco; e un ultimo giro sui difetti
della revisione — e chiede quindici cose:

1. **la scheda dice cos'e' l'oggetto?** (libraggio, spine, mano sulla riga
   tecnica, e nessun `€ 0` su un «Cerco»);
2. **il tema e' arrivato davvero fin qui?** (`html.theme-…` e `--surface`);
3. **la barra del browser segue il foglio di stile**, invece di essere scritta
   a mano;
4. **c'e' qualche bersaglio sotto i 44 pixel?**
5. **il modulo di modifica si vede**, aprendolo da *I miei annunci*? (lo chiede
   al browser: *chi c'e' in questo punto dello schermo?*);
6. **la campanella conta i nuovi**, e la schermata dice che l'avviso arriva —
   e non dice piu' ne' «Avvisi attivi» ne' «non arriva ancora nessuna
   notifica», che dal 17/08 sarebbero due bugie opposte;
6b. **la ricerca accesa sale su `market_searches`** con la lingua, e quella
   spenta no *(nuova, 17/08: e' quella che rende possibile l'avviso)*;
6c. **le tre righe si dicono solo quando si sa**: notifiche spente lo dice,
   notifiche accese **tace**, elenco non salito lo dice *(nuova, 17/08)*;
7. **dopo un'offerta accettata si puo' recensire**, e **prima no**;
8. **la lingua dell'app arriva fin qui**, la parola giusta c'e', **non e'
   rimasto niente in italiano** a schermo, e nessuna chiave si vede scritta
   com'e' (`sav_note` al posto di una frase);
9. sul profilo di un venditore **con** recensioni gli annunci si aprono;
10. salvare una modifica **non** riscrive lo stato — un venduto resta venduto;
11. cambiando categoria i campi di prima **si cancellano** davvero;
12. un proprio annuncio venduto **non** entra nell'elenco pubblico;
13. chiudendo un pannello sopra un altro **il fondo resta bloccato**, e
    uscendo non restano i preferiti di chi e' uscito.

**E' stato messo alla prova rompendo il file apposta**, quattordici volte: tolta la
riga tecnica dalla scheda, rimesso il colore della barra scritto a mano,
rimessi i pannelli sotto le schermate, spenta la conta dei nuovi, tolta la
porta delle recensioni, aperta troppo presto, rimessi i listener del profilo
prima delle recensioni, rimesso `status` nel payload di sempre, rimesso lo
sblocco del fondo a ogni chiusura, tolto l'azzeramento all'uscita; e il 17/08
altre quattro — fatte salire anche le ricerche spente, tolta del tutto la
salita sul cloud, tolta la riga sulle notifiche spente, rimessa la vecchia
frase «non arriva ancora nessuna notifica». **Le trova tutte, ognuna con la sua
frase**, ed esce con 1.

La prima volta pero' **si schiantava invece di parlare** — `righe[0]` non
esisteva piu' — quindi diceva di no con una pila di Node al posto del motivo.
*Un banco che si schianta funziona e non serve.* Corretto prima di fidarsene.

### Quello che il banco non prova

- **La rete.** Firestore, Storage e l'autenticazione sono finti. Che le regole
  di sicurezza lascino passare quello che deve passare non lo dice questo
  banco. **E dal 17/08 ci sono due regole che nessun banco guarda**
  (`market_favs`, `market_searches`): la prima e' stata provata a mano il
  giorno in cui e' stata pubblicata; la seconda ancora no.
- **Il deploy.** `banco-avvisi.js` prova che la funzione **decide** bene: chi
  avvisare, in che lingua, quante volte. Non prova che sia stata pubblicata,
  ne' che la push esca davvero da Google e arrivi a un telefono. Quello si vede
  solo pubblicando e guardando.
- **Il dito.** Nessuno ha ancora toccato questa pagina su un telefono vero. I
  44 pixel sono misurati, non provati.
- **Se le parole sono quelle giuste.** Sa dire che in svedese c'e' *una*
  parola svedese al posto giusto; non sa dire se e' quella che userebbe uno
  svedese. Vedi *Il rischio, scritto perche' e' reale*.

---

# Quinto giro — `2026-08-17-mercatino-e`: le ricerche bussano

*Era la voce 2 della lista aperta, e da sola non si chiudeva: il pezzo che
mancava non stava in questo file.*

## Cosa c'era, e perche' non bastava

Il 16/08 «Avvisi attivi» era stato tolto perche' era una bugia, e al suo posto
era rimasta una cosa vera: **il conto**. Ogni ricerca ricorda quando l'hai
guardata, la campanella porta il numero dei nuovi. Onesto — ma il conto lo vedi
**solo entrando**. Chi salva una ricerca non vuole ricordarsi di controllare:
vuole che ci pensi qualcun altro. *Un mercatino che ti fa venire a controllare
non ti ha tolto il lavoro, te l'ha solo spostato di posto.*

## Il pezzo che mancava: `avvisaRicerche`

Una terza Cloud Function in `index.js`. Scatta alla **nascita** di un annuncio,
guarda chi lo stava aspettando, e scrive.

**Non manda nessuna push da sola**, ed e' la scelta che regge tutto il resto:
scrive in `notifications/{uid}/items`, cioe' fa nascere il documento su cui
scatta gia' `pushNotifica`. Da li' in poi la strada e' quella di sempre — token
scaduto che si ripulisce da solo, corpo del messaggio, icona, link. Tre
conseguenze, e nessuna e' un ripiego:

- chi ha acceso le notifiche riceve l'avviso sul telefono, **anche ad app
  chiusa**;
- chi non le ha accese lo trova comunque **nell'elenco dentro l'app**, dove
  gia' guarda;
- se un giorno la consegna cambia, cambia in un posto solo.

*Due strade per consegnare la stessa cosa divergono sempre, e in silenzio: e'
scritto quattro volte in questo diario, ogni volta dopo averlo pagato.*

## Perche' il file e' stato toccato: una ricerca che resta qui non avvisa

Le ricerche salvate vivevano in `localStorage`. Il server non le vede — quindi
**per il server non esistono**, e la funzione piu' bella del mondo avviserebbe
nessuno. Adesso le ricerche **accese** salgono su `market_searches/{uid}`.

Sale poco, e ogni pezzo ha un motivo:

- **solo le accese.** L'interruttore adesso significa qualcosa: spento, la
  ricerca esce dall'elenco che sale e il server smette di guardarla. Prima
  spegneva un conteggio locale e basta.
- **in minuscolo.** Il confronto lato server lavora in minuscolo: mandarle
  gia' cosi' toglie il giorno in cui le due parti tagliano la stringa in modo
  diverso.
- **la lingua di chi le ha salvate.** La notifica si scrive nella lingua di chi
  la riceve, e il server non ha altro modo di saperla. *Tradurre otto lingue di
  interfaccia e poi bussare in italiano e' peggio che non tradurre: sembra
  rotta la traduzione buona.*
- **il `lastSeen` NO.** Quello e' di questo telefono, serve al conto sulla
  campanella e non riguarda nessun altro. Il cloud non e' un posto dove mettere
  le cose «gia' che ci siamo».

Al rientro i due elenchi **si uniscono**, come i preferiti: chi ha salvato una
ricerca su un altro telefono non deve perderla, e una ricerca si toglie a mano.
Quelle che arrivano da fuori nascono con `lastSeen` = adesso, se no direbbero
«180 nuovi» al primo sguardo — rumore, non una notizia. E' la stessa migrazione
gia' scritta il 16/08, per lo stesso motivo.

## La riga sullo schermo, riscritta nella stessa mossa

Il diario lo chiedeva a chiare lettere: *«quando si fa, la riga della schermata
va riscritta nella stessa mossa, altrimenti resta a dire che non ci sono».*
Non diceva quanto sarebbe stato difficile dirlo bene.

Adesso ce ne sono **tre**, e le ultime due si mostrano **solo quando si sa**:

1. cosa succede — *ti avviso io: quando esce un annuncio che le corrisponde
   arriva una notifica*;
2. **le notifiche del telefono sono spente** — l'avviso non si perde, ti aspetta
   dentro l'app, e si dice dove si accendono (nel profilo dell'app, che e'
   l'unico posto dove si puo' fare);
3. **l'elenco non e' salito** — allora l'avviso non parte affatto, e chi ha
   acceso l'interruttore deve saperlo. Stessa promessa mancata dei preferiti,
   detta per le ricerche.

**La 2 si mostra solo se `users/{uid}.fcmToken` manca davvero.** Se la lettura
non riesce non si scrive niente: *accusare qualcuno di avere le notifiche
spente senza saperlo e' lo stesso errore dell'elenco parziale dei sodalizi —
una riga sbagliata detta con sicurezza vale meno di una riga che non c'e'.*

## Le due copie della stessa domanda

`combacia()` nel server e `matchQ()` nel mercatino rispondono alla stessa
domanda in due file diversi, e non c'e' modo di condividerle: uno gira su Node,
l'altro dentro una pagina. Se divergono, il danno e' preciso e invisibile —
**uno riceve un avviso per un annuncio che poi, entrando, non trova**, e non ha
nessun modo di capire perche'.

Non si e' risolto con un commento. Il banco **le estrae dai due file veri** e le
mette una contro l'altra su dodici casi: se un giorno una impara un campo in
piu' e l'altra no, lo dice il giorno stesso.

## Le tre cose che il server si rifiuta di fare

- **Non avvisa il venditore del proprio annuncio.** Non e' una notizia.
- **Un avviso solo per annuncio**, anche se combaciano tre ricerche. Tre
  notifiche per lo stesso arco non sono tre notizie: sono la stessa detta tre
  volte, ed e' il modo piu' veloce per farsi spegnere la campanella.
- **Rispetta i blocchi.** Chi ha bloccato il venditore non riceve i suoi
  annunci. *Un blocco che vale nelle chat e non negli avvisi non e' un blocco,
  e' un'impostazione decorativa.*

## Il costo, dichiarato

**Si leggono tutte le ricerche a ogni annuncio nuovo.** La ricerca e' per
sottostringa — chi cerca «hoyt» vuole trovarlo dentro «Ricurvo Hoyt Satori» —
e una sottostringa non si indicizza: non esiste una query Firestore che chieda
*chi stava aspettando questo?*. Con poche centinaia di persone e' una lettura da
niente.

Non si e' nascosto: `RICERCHE_TANTE = 800` accende un avviso nei log il giorno
in cui smette di essere trascurabile, e allora servira' un indice vero — non un
giro piu' furbo su questo elenco. **E' la stessa spia di `adsCapped`, per lo
stesso motivo: un tetto si dichiara e si conta, non si subisce.** C'e' anche
`MAX_AVVISI = 200` per singolo annuncio, e quello che non parte viene contato
nei log invece di sparire.

## Le due cose trovate strada facendo

**1. Uscendo restava acceso `favCloud`.** Non si azzerava con il resto: il
prossimo che entrava su quel telefono poteva vedersi la frase «questi preferiti
stanno solo qui» per una risposta che riguardava un altro account — o, peggio,
**non** vedersela quando invece era vera. E' il difetto 7 del quarto giro
(«uscendo restavano i preferiti di chi usciva») rimasto per meta': si erano
azzerati i dati, non i semafori. Adesso `favCloud`, `savCloud` e `pushOn` vanno
via insieme a tutto il resto.

**2. Il finto Firebase del banco non sapeva dire da quale raccolta.**
`db.collection(nome)` buttava via il nome, quindi ogni scrittura sembrava
uguale a ogni altra e la domanda *«questa e' finita su `market_searches`?»* non
si poteva nemmeno porre. Corretto prima di fidarsi della prima risposta verde —
*un banco che non sa distinguere risponde comunque, ed e' il modo piu' facile
per credere di aver provato qualcosa.*

## Fuori dal mercatino, nella stessa mossa

- **`firestore.rules` → `2026-08-17-avvisi-ricerche`.** La regola di
  `market_searches` sta accanto a quella dei preferiti e le somiglia: chiusa a
  tutti tranne l'interessato, admin compreso, niente `isApproved()`, `hasOnly`
  sui tre campi. In piu' un **tetto di 60 ricerche**: senza, un client
  modificato potrebbe caricare diecimila stringhe e far girare a vuoto la
  funzione a ogni annuncio pubblicato da chiunque. Nessuno salva sessanta
  ricerche davvero.
- **`index.html` → `BUILD_STAMP 2026-08-17-avvisi-ricerche`.**
  `wipeAccountData()` cancella anche `market_searches/{uid}`. Le tre domande di
  una raccolta nuova — chi la scrive, chi la legge, chi la porta via — fatte
  tutte e tre lo stesso giorno, come dice la regola scritta ieri. Qui c'era un
  motivo in piu' del residuo: finche' il documento resta, **la funzione
  continua a scrivere notifiche per un account che non esiste piu'.**
- **Il guardiano era rosso all'arrivo**, e non per gli avvisi: `index.html`
  aveva 67 esadecimali fuori dai primitivi contro un tetto di 64. Cinque
  stavano nello **strato dei ruoli**, dove non devono stare: quattro bianchi
  (`--brand-ink`, `--sun-on-fg` nei due temi, `--navbar-pill-ink`) che erano
  gia' `--sand-50` scritto in un altro modo, e l'ambra chiara del timer, che
  era una tinta vera senza primitivo — adesso e' `--gold-150`. Zero
  cambiamenti a schermo, tetto sceso da solo a **61**. *Il tetto non sale per
  accogliere il file.*

## Come e' stata provata

- **`banco-avvisi.js` (nuovo).** Carica `index.js` con i quattro moduli di
  Firebase sostituiti, prende il trigger e lo chiama a mano su nove scenari:
  chi aspettava viene avvisato **nella sua lingua** (svedese, non italiano); il
  venditore no; un annuncio che non nasce attivo non avvisa; tre ricerche di
  una persona sola fanno **un** avviso; chi ha bloccato non riceve; una parola
  che sta solo nella descrizione basta; un «Cerco» non stampa un prezzo che non
  ha; chi non cercava niente non riceve niente; e le due copie della stessa
  domanda sono d'accordo su dodici casi.
  **Messo alla prova rompendo la funzione apposta**, quattro volte — tolta
  l'esclusione del venditore, tolto l'uno-per-annuncio, tolto il controllo dei
  blocchi, fatta divergere `combacia` da `matchQ`: le trova tutte, ognuna con
  la sua frase.
- **`prova-schermo-market.js`.** La prova 2 e' stata riscritta: non chiede piu'
  che la schermata dica «non arriva ancora nessuna notifica» — adesso chiede il
  contrario, e chiede che la ricerca **accesa** salga su `market_searches` e
  quella **spenta** no, con la lingua. E c'e' una prova 2b sulle tre righe: le
  notifiche spente lo dicono, le notifiche accese **tacciono**, l'elenco non
  salito lo dice. Rotta apposta quattro volte, trovate tutte e quattro.
- **Quello che nessun banco prova, e va detto.** Che il deploy sia andato a
  buon fine, che le regole lascino passare `market_searches`, che la push arrivi
  davvero su un telefono vero. **Questo si sapra' solo pubblicando e
  guardando**, come per i preferiti il giorno prima.

**ORDINE DI APPLICAZIONE, come sempre e per lo stesso motivo:**
`firebase deploy --only functions` → `firestore.rules` → `marketplace.html` e
`index.html`. Al contrario, per tutto il tempo in mezzo ogni telefono scrive
«queste ricerche stanno solo su questo telefono»: frase vera, motivo sbagliato,
mostrata a tutti.

---

---

# Sesto giro — 17/08/2026: il quinto giro c'era solo a parole

**Cosa si è trovato aprendo il progetto.** Il diario raccontava il quinto giro
come fatto. Nel progetto era arrivata solo metà: `firestore.rules`,
`banco-avvisi.js`, `prova-schermo-market.js` e queste note sì; `index.js`,
`marketplace.html` e `index.html` no. `marketplace.html` era ancora fermo a
`2026-08-16-mercatino-d`, e `avvisaRicerche` in `index.js` non esisteva.

Il risultato era la combinazione peggiore possibile, e vale la pena scriverla
perché non è un caso isolato: **le regole aprivano la porta a una raccolta che
nessuno scriveva.** Chiunque avesse pubblicato le regole avrebbe avuto un
Firestore pronto a ricevere `market_searches` e nessuna riga di codice che ci
scrivesse dentro — cioè un mercatino che promette avvisi e non ne manda
nessuno, che è esattamente la vecchia bugia di «Avvisi attivi», tornata dalla
porta di servizio.

**Come si è visto in trenta secondi.** I due banchi. `banco-avvisi.js` ha detto
*«index.js non registra più nessun trigger su market_listings/{adId}»* e
`prova-schermo-market.js` è morto su `saveSavCloud is not defined`. Nessuno dei
due ha dovuto essere letto per capirlo. *Un banco che gira è l'unico modo di
sapere che il diario e i file dicono la stessa cosa* — e qui il diario aveva
ragione sul progetto e torto sui file, che è il modo in cui un diario mente
senza sbagliare una parola.

## Non è stato riprogettato niente: i banchi erano la specifica

Il lavoro è stato ricostruire, non ridecidere. E si è potuto fare senza
inventare nulla perché **i banchi del quinto giro erano arrivati**, e un banco
scritto bene non prova il codice: lo descrive. `banco-avvisi.js` diceva già che
il titolo dev'essere nella lingua di chi riceve, che il corpo deve dire dov'è e
quanto costa, che un «Cerco» non stampa un prezzo, che tre ricerche fanno un
avviso solo, che il venditore non si avvisa da solo, che un blocco vale anche
qui. `prova-schermo-market.js` diceva quali ricerche salgono, con quale lingua,
e quali delle tre righe si mostrano in quale stato.

*È la cosa più utile imparata oggi: un banco è anche un backup della decisione.
Il codice si può riscrivere da un banco; un banco non si può riscrivere dal
codice.*

## Cosa è stato rimesso, file per file

- **`index.js` → `2026-08-17-avvisi-ricerche`.** `avvisaRicerche`, la terza
  funzione: scatta alla nascita di un annuncio, legge `market_searches`, e
  scrive in `notifications/{uid}/items` — cioè fa nascere il documento su cui
  scatta già `pushNotifica`, invece di mandare la push per conto suo. Con
  `combacia()`, `RICERCHE_TANTE = 800`, `MAX_AVVISI = 200`, e i marcatori delle
  parole generate, che `genera.py` riempie da `dizionario-c.py`.
- **`marketplace.html` → `2026-08-17-mercatino-e`.** Le ricerche **accese**
  salgono su `market_searches/{uid}`, in minuscolo, con la lingua di chi le ha
  salvate; il `lastSeen` no, che è di questo telefono. Al rientro i due elenchi
  si uniscono, come i preferiti. Le tre righe sullo schermo. Il dizionario
  rigenerato: le tre chiavi nuove erano nei `.py` ma non nel blocco dentro la
  pagina — cioè `sav_note_off` e `sav_local_only` esistevano in nove lingue e
  non erano raggiungibili da nessuna schermata.
- **`index.html` → `2026-08-17-avvisi-ricerche`.** `wipeAccountData()` cancella
  anche `market_searches/{uid}`: finché il documento resta, la funzione
  continua a scrivere notifiche per un account che non esiste più.

## Tre cose decise mentre si ricostruiva

Non erano nel diario, e in un secondo giro non si sarebbero notate.

**1. La riga 1 tace quando l'elenco non è salito.** Le tre righe non sono un
elenco: sono una gerarchia. Se `savCloud === false` la prima riga — *«ti avviso
io»* — è una promessa falsa nel momento in cui la si legge, quindi non si
scrive affatto, e resta solo quella che dice perché. *Due righe che si
contraddicono a distanza di un centimetro non sono due informazioni: sono una
schermata che non sa cosa sta succedendo.*

**2. Le due righe di allarme compaiono anche a elenco vuoto.** Sapere che le
notifiche del telefono sono spente serve **prima** di salvare la prima ricerca,
non dopo: dopo, l'hai già salvata credendo che qualcuno ti avviserebbe.

**3. Eseguire una ricerca non tocca più il cloud.** `eseguiSav` aggiornava il
`lastSeen` e chiamava `saveSav()`, che adesso manda su anche l'elenco — un
documento identico riscritto a ogni tocco. Adesso scrive solo in locale, perché
il `lastSeen` in locale ci resta. *Il momento in cui una funzione impara a
scrivere sul cloud è il momento in cui va riletto chi la chiama.*

## E il guardiano era rosso, di nuovo per lo stesso motivo

67 esadecimali fuori dai primitivi contro un tetto di 64: la correzione del
quinto giro era in `index.html`, e `index.html` non era arrivato. Rifatta
identica — quattro bianchi nello strato dei ruoli (`--brand-ink`, `--sun-on-fg`
nei due temi, `--navbar-pill-ink`) che erano `--sand-50` scritto in un altro
modo, e l'ambra chiara del timer, che era una tinta vera senza primitivo e
adesso è `--gold-150`. Zero cambiamenti a schermo, tetto sceso da solo a **61**.

## Come è stata provata

Tutti e cinque i banchi, verdi:

- **`banco-avvisi.js`** — nove scenari, e le due copie della stessa domanda
  d'accordo su **12 casi su 12**.
- **`prova-schermo-market.js`** — `["hoyt"]` sale, `easton` (spenta) no, con la
  lingua; notifiche spente lo dice, accese tace, elenco non salito lo dice; e
  le quattro lingue non lasciano italiano a schermo.
- **`controlla-token.js`** — tetto 64 → **61**.
- **`banco-firme.js`** e **`prova-schermo.js`** — nessuna regressione.

**Quello che nessun banco prova, e resta vero:** che il deploy vada a buon fine,
che le regole lascino salire `market_searches`, che la push esca da Google e
suoni su un telefono. È la voce 2 della lista, e da qui dentro non si chiude.

**ORDINE DI APPLICAZIONE, invariato e per lo stesso motivo:**
`firebase deploy --only functions` → `firestore.rules` → `marketplace.html` e
`index.html`. Al contrario, per tutto il tempo in mezzo ogni telefono scrive
«queste ricerche stanno solo su questo telefono»: frase vera, motivo sbagliato,
mostrata a tutti.

---

## Il generatore era fermo, e non per il motivo scritto *(19/08/2026)*

*Trovato aprendo il progetto per contare i file, non cercandolo.*

`genera.py` non girava. Si fermava qui:

```
NON VA:
  - chiavi chieste e mai scritte: note_p2
```

**La diagnosi che girava era sbagliata.** Da qualche parte era rimasto scritto
che il blocco fosse `dizionario-c.py` mancante dal progetto. `dizionario-c.py`
c'e', ed e' sano. Il blocco era un altro, e piu' piccolo: `markup.html` aveva
ancora la riga

```html
<p data-th="note_p2"></p>
```

cioe' i «Venditori Fondatori», **tolti dai dizionari il 17/08 su decisione
presa.** Il generatore fa la cosa giusta — si rifiuta di scrivere un dizionario
a cui il markup chiede una parola che nessuno gli dara' mai — ma il messaggio
nomina la chiave, non il file che la chiede, e per quello si era guardato
dalla parte sbagliata.

**La misura che conta:** le chiavi `data-t*` di `markup.html` e quelle di
`marketplace.html` erano **139 in comune e una sola di scarto**, quella. Il
`data-build` di `markup.html` era fermo a `2026-08-16-mercatino-c` e sembrava
tre versioni indietro: non lo era: era indietro di una riga.

Tolta la riga, allineato il timbro a `2026-08-19-mercatino-cerchio`
(`data-parent` `2026-08-16-mercatino-c`), il generatore risponde:

```
chiavi: 302 · lingue: 9 · nessun buco, nessun segnaposto perso
scritto dizionario.js
index.js era gia' allineato
```

**302, non 303**, e la differenza e' proprio `note_p2`: il numero vecchio
contava una parola cancellata. `index.js` non e' cambiato — il blocco `PAROLE`
era gia' giusto — quindi **nessun file del sito e' toccato e nessun deploy
serve.**

*Una diagnosi sbagliata lasciata scritta costa piu' di nessuna diagnosi: manda
a cercare un file che c'e'. Corretta qui, dove verra' riletta.*

---

## Il ripiego delle notifiche non ripiega piu' *(19/08/2026)*

Controllando le regole Firestore contro quello che il client scrive davvero, e'
uscita una cosa che nessun banco puo' vedere.

`sendPushViaFirestore()` in `index.html` chiama la callable `sendNotification`,
e **se la funzione non risponde** (`not-found`, `internal`, `unavailable`)
ripiega su `legacyPushWrite()`, che scrive la notifica direttamente in
`notifications/{uid}/items`.

Ma dal 13/08 le regole dicono:

```
match /notifications/{userId}/items/{itemId} {
  allow create: if false;
}
```

**Il ripiego e' chiuso.** E l'unica riga che se ne accorgerebbe e'
`.catch(function(){})` — vuota.

Non e' un guasto di oggi: le funzioni sono pubblicate e la strada normale
funziona. E' peggio, e' **una rete che sembra esserci**. Il giorno in cui un
deploy fallisce, il ripiego non ripiega, la notifica non parte, e non lo dice
nessuno — perche' nessuno si lamenta di una notifica che non e' arrivata.

Le uscite oneste sono due, e vanno decise, non lasciate cosi':

- **togliere `legacyPushWrite()`** e far scrivere l'errore in `errors` quando
  la callable fallisce — cosi' il fallimento si vede dal pannello admin;
- oppure **riaprire il create** ai soli casi legittimi, che pero' e' il buco
  chiuso apposta il 13/08 (chiunque poteva notificare chiunque firmandosi con
  il nome di un altro). *Questa strada e' peggio della malattia.*

Non toccato oggi: e' una decisione, non una correzione.

---

## Cosa resta aperto, in ordine

1. **Far leggere le traduzioni a chi le parla.** — **FERMA: oggi non c'e'
   nessun madrelingua a cui chiedere.** *(17/08.)* Non e' un lavoro di codice
   ed e' l'unica cosa che il generatore non puo' fare; otto lingue, 302 chiavi,
   basta che un turco e uno svedese aprano il mercatino una volta. Resta in
   cima alla lista perche' e' la piu' importante, ma **non si sblocca da
   dentro**: si riapre quando arrivano collaudatori stranieri, non prima.
   **Dal 17/08 pesa di piu': una di queste frasi adesso esce dal telefono da
   sola.** `push_sav_title` e' l'unica parola dell'app che arriva addosso a
   qualcuno che non sta guardando lo schermo, e una notifica scritta male in
   svedese non si corregge chiudendo la pagina. Chi riprende il lavoro parta
   dalla voce 2.
2. **Nessuno ha ancora visto arrivare un avviso su un telefono vero.**
   *(Nuova, 17/08 — e' la seconda meta' della vecchia voce 2.)* La funzione
   decide bene, e questo lo dice `banco-avvisi.js`. Ma il deploy, la regola
   `market_searches` che deve lasciar salire l'elenco, e la push che esce da
   Google e suona: **nessuna delle tre e' stata vista funzionare.** Si prova in
   due, con due account: uno salva «hoyt», l'altro pubblica un Hoyt. Se non
   arriva, il primo posto dove guardare sono i log della funzione — dice per
   nome chi ha avvisato e chi no.
3. **Oltre 200 annunci i piu' vecchi spariscono in silenzio.** `adsCapped` e'
   la spia e c'e' gia'; quando si accende serve la ricerca lato server.
   Oggi la pagina scarica tutto e filtra sul telefono. *Dal 17/08 la stessa
   soglia ha un fratello dall'altra parte: `RICERCHE_TANTE` nella funzione.
   Probabilmente si accenderanno lo stesso giorno, ed e' il giorno in cui il
   mercatino diventa grande.*
4. **Nessuno ha ancora toccato questa pagina con un dito.** Vale qui il punto 0
   delle note dell'app: 44 pixel misurati non sono 44 pixel provati, e un
   mercatino si guarda in piedi in mezzo a un campo tanto quanto sul divano.
5. **I preferiti orfani non si potano mai.** L'id di un annuncio cancellato
   resta in `myFavs` per sempre: la schermata lo conta («2 preferiti non sono
   piu' disponibili») ma non lo toglie, e l'array su Firestore cresce e basta.
   Oggi non da' fastidio a nessuno — con 200 annunci e' rumore da niente.
   Diventa un problema il giorno in cui il mercatino e' grande, e allora la
   potatura va fatta **al momento giusto**: non all'apertura, o si
   cancellerebbe un preferito solo perche' quel giorno la rete non ha risposto.
6. **Le ricerche salvate non si potano mai, e qui costa di piu'.** *(Nuova,
   17/08.)* Una ricerca scritta male — «hyot» — non trova niente e non lo dice:
   resta accesa per sempre, sale su Firestore a ogni salvataggio, e la funzione
   la confronta con ogni annuncio pubblicato da chiunque, per sempre. Non e'
   un difetto di oggi: e' il primo pezzo del mercatino che **costa qualcosa a
   qualcun altro** quando e' sbagliato. La strada probabile non e' potare, e'
   dirlo: *«questa ricerca non ha mai trovato niente»*.

7. **Il progetto e i file possono raccontare due storie diverse.** *(Nuova,
   17/08 — sesto giro.)* Oggi il diario diceva fatto e metà dei file diceva no.
   Si è visto solo perché i banchi girano; senza, sarebbe stato scoperto
   pubblicando. Non c'è una regola di codice che lo eviti: c'è
   **l'abitudine di lanciare i banchi come prima cosa in una sessione nuova**,
   prima ancora di decidere cosa fare.

*Chiuse il 17/08: la regola Firestore per `market_favs` (era la voce 3) e gli
avvisi delle ricerche salvate (era la voce 2). Vedi **Il pezzo che stava fuori
dal file** e **Quinto giro**.*

---

## Il mercatino torna ai collaudatori *(19/08/2026, sera, `mercatino-beta`)*

**Da stasera questa pagina si apre solo a chi ha `betaTester: true`.**
L'apertura a tutti del 14/08 è durata cinque giorni.

**Non è un ripensamento: è la richiesta del 18/08 applicata alla porta
giusta.** Quel giorno Alessandro aveva chiesto che il mercatino restasse in
beta; la richiesta era stata capita male e a essere chiuse erano state le
*registrazioni* all'app. Da stasera le registrazioni sono di nuovo aperte a
chiunque confermi l'email, e la chiusura è dove doveva stare. Il racconto per
intero sta in `NOTE-DESIGN.md`, *La porta giusta, finalmente* — qui c'è solo
quello che riguarda questa pagina.

**Il controllo in cima al file adesso ha due domande, in quest'ordine:**
`approved !== true` → schermata dell'account non attivo; `betaTester !== true`
→ stessa schermata, **altro testo**.

*Perché due testi e non uno.* Sono due situazioni che chiedono cose diverse a
chi le legge. «Il tuo account non risulta attivo, conferma l'email, se il
problema resta scrivi a info@» dice: *c'è qualcosa che puoi fare*. A chi non è
in beta non c'è niente da far fare, e mandarlo a scrivere sarebbe farlo bussare
a una porta che non si apre a chi bussa. Il testo giusto ce l'aveva già l'app —
`market_locked_body`, *«Il Marketplace è in prova con un gruppo ristretto di
arcieri. Appena è pronto lo apriamo a tutti.»* — e le nove traduzioni sono
state prese da lì, non rifatte: la stessa frase tradotta due volte diverge alla
prima correzione.

Nasce `den_beta_body` × 9. **Si cambia la chiave sullo `<span>`, non il testo**:
`sp.setAttribute("data-t","den_beta_body")`. Scrivere sopra con `textContent`
avrebbe funzionato lo stesso e avrebbe portato la frase fuori dal meccanismo
delle traduzioni — cioè avrebbe rifatto, in piccolo, il difetto che il
19/08 è costato tredici chiavi. L'indirizzo email in fondo viene nascosto.

**La porta vera resta `firestore.rules`.** Questo controllo decide cosa si
vede; `isMarket()` decide cosa si può leggere, ed è l'unico che regge davanti a
una console del browser. Chi resta fuori conserva le strade per portarsi via la
propria roba: leggere e cancellare i propri annunci, cancellare trattative e
messaggi, ritirare le recensioni scritte, preferiti e ricerche salvate.

**`banco-lingue.js` guardava solo l'app.** Contava le chiavi con `chiave: `, e
qui si scrive `chiave:"valore"`: su questo file non trovava niente e diceva di
sì per assenza di prove. Adesso ha una sezione sua che legge
`marketplace.html` con la forma giusta — `den_title`, `den_body`,
`den_beta_body`, nove ciascuna.

### Cosa resta da guardare, qui

- **Finché nessuno ha il flag, il mercatino è vuoto di gente.** Si accende dal
  pannello Approvazioni, tasto «Beta ON/OFF». Da fuori una chiusura totale e un
  guasto si somigliano molto.
- **Gli annunci pubblicati nei cinque giorni aperti restano dove sono.** Chi
  li ha scritti li vede e li può cancellare, ma non li può più modificare: se
  qualcuno si lamenta, è questo, ed è voluto.
