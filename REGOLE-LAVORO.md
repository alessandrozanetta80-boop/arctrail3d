# REGOLE DI LAVORO — ArcTrail 3D

Come si lavora qui. Valgono per **ogni** sessione senza che vengano ripetute.

Si legge insieme a **STATO.md**, che dice cos'è vero oggi. Gli archivi dicono
*perché*, e non si leggono per intero: si cercano.

*Riscritto il 23/08/2026, rivisto il 26/08 con i tre livelli. Il contenuto è
tutto qui: quello che è stato ritirato sta in fondo, col motivo.*

---

## Le prime tre mosse di ogni sessione

**1. Dire se il progetto si può scrivere, prima di lavorare.**

`/mnt/project/` è una **copia montata dentro il contenitore della singola
chat**: a volte dichiarata in sola lettura, a volte no, e non dipende da
Alessandro. `touch` non risponde alla domanda giusta — scriverci riesce quasi
sempre, ma quella copia muore con la sessione. La domanda non è *«posso
scrivere qui?»*, è *«questo file lo rivedrà qualcun altro?»*

- Se il progetto è **scrivibile**: leggere → modificare → riscrivere lì → dire
  in una riga cosa è cambiato.
- Se è **in sola lettura**: dirlo **alla prima riga**. *«Qui il progetto è in
  sola lettura: i file te li consegno e li carichi tu.»* Poi lavorare
  normalmente.

❌ **Mai lasciare che lo scopra alla fine.** Il 17/08 è costato mezz'ora di
strada un'informazione che costava una riga.

**2. Chiedere se questa è la base giusta.**

```
node controlla-base.js
```

Il progetto **può essere indietro rispetto a GitHub**, e una volta lo era di
due versioni: i banchi hanno girato sui file vecchi e hanno detto di sì a
tutto. Erano contenti, e guardavano il file sbagliato.

Tre risposte, e sono diverse fra loro:

- **IN PARI** → si lavora.
- **AVANTI** → c'è lavoro fatto e non caricato. Dirlo ad Alessandro.
- **INDIETRO O DIVERGENTE** → **fermarsi**, e *non* sovrascrivere niente.

**Il recupero si fa in due mosse, e la prima è guardare.** *(Corretto il
26/08: qui c'era un `curl -o app.html` che scriveva diritto sul file di lavoro,
proprio nel ramo in cui è più probabile che ci sia dentro roba non caricata.)*

```
curl -sL -o /tmp/on-app.html https://raw.githubusercontent.com/alessandrozanetta80-boop/arctrail3d/main/app.html
diff /tmp/on-app.html app.html
```

Poi si decide **guardando il diff**, e si copia a mano solo se il locale non
contiene lavoro da salvare. *Un file che funziona non si sovrascrive mai in
automatico.*

**E il timbro non è il contenuto.** `controlla-base.js` confronta i timbri:
il 25/08 tre volte i file erano diversi con lo stesso timbro, e diceva IN
PARI. La parità vera si dichiara solo dopo un `diff` contro `/tmp`, ed è
obbligatoria **prima di ogni consegna**, non a inizio sessione.

Se GitHub non risponde, il banco non passa: *un controllo che non può dire di
no è spento.*

**3. Scegliere il livello PRIMA di lavorare, e attenersi a quello.**

*(Riscritta il 26/08/2026. Prima questa regola diceva «lancia tutti i banchi
prima di scegliere il lavoro» e la regola 25 diceva «il giro completo si fa
una volta sola alla fine». Chi leggeva in ordine faceva il giro completo per
cambiare una parola: cinque minuti di Chromium per una riga di CSS.)*

Il numero dei banchi **non si scrive qui**: lo dice `controlla-tutto.sh`, che
è l'unica fonte. *Un conto ricopiato in prosa invecchia il giorno che si
aggiunge un banco, e poi mente per settimane.*

| | **VELOCE** | **NORMALE** | **CRITICO** |
|---|---|---|---|
| **cosa** | parole, colori, misure, spaziature — cose che si giudicano a occhio | un comportamento isolato: una schermata, una tendina, un elenco | punteggio, accesso, memoria offline, Firestore, service worker, pubblicazione |
| **da leggere prima** | `STATO.md` §1 (i timbri) | `STATO.md` intero | `STATO.md` intero + le voci d'archivio della zona |
| **prima di toccare** | `node controlla-base.js` | `controlla-base.js` + misurare il difetto | `controlla-base.js` + misurare + rileggere le voci che spiegano *perché* è così |
| **dopo ogni passaggio** | `controlla-sintassi` + `controlla-token` + il banco della zona | come veloce, più i banchi che toccano quel comportamento | come normale, più il banco che protegge l'invariante toccata |
| **giro completo** | **una volta sola**, prima di consegnare la versione accettata | prima di consegnare | prima di consegnare, **e** non si consegna se un banco è spento |
| **sabotaggio** | solo se nasce o cambia sostanza un banco | idem | **sempre** sul banco che protegge l'invariante toccata |
| **diario** | **una volta sola**, dopo che Alessandro ha accettato | a pezzo finito | a pezzo finito, con la diagnosi anche se è incerta |
| **parità con l'online** | `diff` contro `/tmp` prima di consegnare | idem | idem, **più** «visto funzionare» (regola 9) |

**Quello che nessun livello salta mai:** `controlla-sintassi.js`,
`controlla-token.js`, il banco della zona toccata, e il giro completo prima di
consegnare. *Il livello decide quante volte, non se.*

**Nel dubbio si sale, non si scende.** Un ritocco di colore dentro la
schermata del punteggio è critico: conta dove atterra, non quanto è corto.

---

## I file

**4. Dove vivono, e sono tre posti diversi.**

- **Il progetto Claude** — diari, banchi, script, sorgenti del dizionario.
  **Esiste solo dentro la chat che lo scrive**, se non è scrivibile.
- **GitHub** (`alessandrozanetta80-boop/arctrail3d`) — **è il sito.**
  `index.html` *(la vetrina)*, `app.html` *(l'app)*, `marketplace.html`,
  `sw.js`, `firebase-messaging-sw.js`, le icone, le cinque `vetrina-*.webp`,
  `firestore.rules`, `pubblica.sh`, `index.js`. Quello che si carica qui
  va online. **Per i file del sito la copia buona è quella online**, non quella
  nel progetto.
- **Firebase** — le funzioni e le regole. Non partono da GitHub.

**5. Si consegnano SOLO i file che Alessandro deve portare fuori con le sue
mani.**

Cioè: i file del **sito** cambiati, e `index.js` se è cambiato. Diari, banchi,
file non toccati: **no**, se il progetto è scrivibile — sono già lì.

*Quattordici file in fondo a una risposta, di cui quattro da caricare, non
sono una consegna generosa: sono una domanda a cui Alessandro deve rispondere
da solo ogni volta, e sbagliarla costa.*

**Ma se il progetto è in sola lettura vale il contrario:** si consegna **nella
stessa mossa in cui si modifica**, non a fine sessione. Se la chat si
interrompe, quello che non è in mano ad Alessandro è perso.

**E si dice sempre dove va** — *«questi tre su GitHub»*, *«questo e poi il
deploy»*. Un file consegnato senza destinazione è un compito senza istruzioni.

**6. Un nome solo per file.** Due copie dello stesso file con nomi diversi
vogliono dire che **una chat nuova non sa quale delle due vale**. Coi dizionari
è peggio: una traduzione corretta nella copia sbagliata sparisce alla prima
passata di `genera.py`, **senza nessun errore**. Si consegna con lo stesso
nome, e la copia vecchia si cancella nella stessa mossa.

**7. Gli upload binari non si modificano da qui.** Le immagini si producono,
si consegnano e si ricaricano a mano, dicendolo.

---

## Le versioni

**8. Il timbro sale nella stessa mossa in cui cambia il file.**

`BUILD_STAMP` in `app.html`, `data-build` in `index.html` e in
`marketplace.html`, `CACHE_NAME` in `sw.js`. Ogni file dichiara **da quale versione è nato**:
`BUILD_PARENT`, `data-parent`, `CACHE_PARENT`.

**Il genitore è l'ultima versione confermata online, non l'ultimo build
locale.** Un file nato da una versione non pubblicata non è un aggiornamento:
**è una cancellazione**, e `controlla-base.js` fa fallire la sessione.

Ogni volta che cambia un file dentro `APP_SHELL`, `CACHE_NAME` sale.

**9. Caricato, pubblicato, visto funzionare sono tre cose diverse.**

- Caricare su GitHub **non pubblica**: la build può fallire in silenzio.
- Caricare `index.js` **non accende le funzioni**: serve il deploy.
- Incollare le regole in console **non le applica**: si preme *Pubblica*.
- Un deploy è fatto quando **la funzione compare nell'elenco della console**:
  è l'unica prova, e costa un clic.

**Nessuna chat può fare questi controlli da sola: vanno chiesti ad Alessandro.**

---

## Come si parla con Alessandro

**10. Un passo alla volta, e chi tiene il conto.**

Quando un lavoro ha più passi che deve fare **lui con le sue mani** — comandi,
console, prove sul telefono — **non si consegna l'elenco intero.** Si dà un
passo, si aspetta la conferma, poi il successivo.

Non è pazienza: un elenco di sei punti dato tutto insieme si perde per strada.

- **Una cosa sola per messaggio.** Tre comandi che non possono fallire in mezzo
  valgono come un passo; se uno può rispondere male, si spezza.
- **Si dice cosa deve rispondere** (*«deve dire `Deploy complete!`»*) e **cosa
  fare se va storto**, quando lo storto è prevedibile.
- **Uno screenshot vale come conferma.**

*Sui file vale il contrario: quelli si scrivono senza chiedere il permesso
pezzo per pezzo (regola 12).*

**10-bis. Quando Alessandro dice «non funziona», la prima domanda è QUALE.**

*(26/08/2026, e costa una giornata.)* Quattro correzioni giuste, tutte su
tasti diversi da quello che lui premeva. Ogni giro si chiedeva *«da browser o
dall'icona?»*, che non poteva distinguere fra quattro tasti. Uno screenshot ha
chiuso la diagnosi in dieci secondi.

- **Prima si chiede dove sei e cosa tocchi**, con uno screenshot: Alessandro
  giudica guardando il telefono, quindi ce l'ha già in mano.
- **Alla seconda segnalazione della stessa cosa, è sbagliata la diagnosi, non
  la cura.** Si smette di correggere e si torna a guardare.
- **Un banco che passa non dice che funziona.** Una prova scritta quando la
  Home del sito e l'app erano la stessa pagina ha continuato a chiedere la
  vecchia destinazione. *Un banco che invecchia col prodotto conferma.*

**11. Il resoconto di fine lavoro ha tre domande, in quest'ordine.**

1. **Cosa fa l'app oggi che ieri non faceva** — detto come lo racconterebbe un
   arciere, non come è scritto nel codice.
2. **Cosa è andato storto, e in che stato è finito** — risolto, o aperto e
   allora dove. *Raccontare un errore corretto con lo stesso tono di uno
   rimasto aperto fa sembrare grave una cosa risolta.*
3. **Cosa resta da fare**, in ordine.

E si dice **con parole** se il giro è andato bene o male: *«nessun
peggioramento, tutte le prove passate»*, poi le cifre per chi le vuole.

**Il gergo dei diari non esce dai diari.** *Firma muta*, *il banco*, *il
guardiano*: lì sono nomi utili, in un resoconto sono un muro.

**12. Quando fermarsi e chiedere.** Solo per: cancellare un documento,
riscrivere da zero più file, cambiamenti architetturali che buttano via lavoro.
**Per tutto il resto: procedere.**

**13. Le note sono decisioni prese, non punti di discussione.** Rimetterle in
discussione da una chat nuova fa perdere tempo e fa dubitare del lavoro fatto.
Se il codice *non fa quello che le note dicono*, quello va segnalato: è lavoro
rimasto indietro, non un errore di ragionamento.

---

## Come si scrive nei diari

**14. Lo stato sta in STATO.md, il racconto negli archivi.**

*(23/08/2026, da un conto: 463 KB di diari, di cui nessuna chat leggeva più
dell'inizio.)* Un diario fa due mestieri, e mescolarli li rompe entrambi:

- **cos'è vero oggi** → `STATO.md`. Corto, un posto solo, si legge per intero.
- **perché è così** → `NOTE-DESIGN.md`, `NOTE-MERCATINO.md`. Cronologici, si
  cercano, non si leggono mai per intero.

**Quando una voce si chiude, si CANCELLA da STATO.md**, e il racconto resta
nell'archivio. *Una cosa fatta che continua a chiedere attenzione costa quanto
una da fare.*

`node controlla-diari.js` tiene il tetto: `STATO.md` sotto le 250 righe. Come
il tetto dei token, **non sale mai per far passare il file**.

**15. Il diario si scrive quando il pezzo è finito, non a fine sessione.** Se
la chat si interrompe a metà, quello che è già scritto è salvo.

*Con una sola eccezione, ed è il livello veloce (regola 3):* lì il «pezzo» non
è il singolo ritocco, è **la versione che Alessandro ha accettato**. Scrivere
una voce per ogni colore provato riempie l'archivio di tentativi e ne
seppellisce le decisioni. Se la chat si interrompe prima dell'accettazione,
non c'è niente da salvare: quel colore era una proposta, non un fatto.

**16. Una diagnosi sbagliata si corregge nel diario**, lasciando visibile che
era sbagliata. Cancellarla e basta toglie l'unica cosa che insegna qualcosa.

---

## Come si pubblicano le funzioni

**17. Dal Cloud Shell della console Firebase**, icona `>_` a destra: già
autenticato, già su `arctrail3d`. La prima volta, una volta sola:

```
curl -sL -o ~/pubblica.sh https://raw.githubusercontent.com/alessandrozanetta80-boop/arctrail3d/main/pubblica.sh
```

Poi, ogni volta che cambia `index.js`:

```
bash ~/pubblica.sh
```

**Righe corte, una alla volta**: un comando lungo incollato porta caratteri
invisibili e muore. In Git Bash il ripiego è il Prompt dei comandi.

Lo script si ferma se manca una delle sette funzioni attese — è il caso in cui
GitHub non ha ancora servito il file nuovo, e senza quel controllo il deploy
**cancellerebbe** le mancanti. Non risponde da solo a firebase, e `--force` non
si usa mai. **Alla domanda `create` si risponde `y`; se compare `delete` si
risponde `N` e ci si ferma:** sta guardando un `index.js` sbagliato.

I comandi a mano stanno **in testa a `pubblica.sh`**, in un commento —
*uno script che non si può ricostruire a mano è una scatola nera*, e il posto
giusto per ricostruirlo è accanto allo script, non qui. Senza `npm install` il
deploy si ferma su *«Couldn't find firebase-functions package»*.

**18. Quando si toccano più strati, l'ordine è obbligatorio:** funzioni →
`firestore.rules` → `marketplace.html` + `app.html`. *Eccezione già vista:*
quando una regola **chiude** qualcosa che il sito mostra ancora, i file del
sito vanno **prima**, o chi ha l'app vecchia vede un `permission-denied` al
posto di una spiegazione.

---

## Le regole di Firestore

**19. Stanno su GitHub, ma GitHub non le applica.**

Il file nel repo è la **copia di sicurezza**. Ma da GitHub parte solo GitHub
Pages, e il Cloud Shell pubblica le funzioni, non le regole.

Le regole **attive** vivono solo nella console Firebase → Firestore Database →
Regole. Ogni volta **due mosse**: il file su GitHub per non perderlo, il testo
incollato in console per farlo valere. Saltare la seconda è il modo tipico di
credere di aver applicato una regola mai partita.

**E nessuna chat le può dedurre dal codice:** raccontano decisioni — perché
`market_favs` è chiuso anche all'admin, perché il create delle notifiche è
`false` — che nel codice non ci sono.

La versione in cima al file (`// Versione AAAA-MM-GG-nome`) è l'unico modo per
sapere, mesi dopo, se quelle scritte sono quelle attive.

---

## La posta

**20. Non la manda l'app.** `avvisaPercorso` scrive un documento in `mail`; a
spedirlo è l'estensione **Trigger Email from Firestore**. Separati apposta: se
l'estensione si ferma, i documenti restano in coda invece di sparire.

Provata il 20/08, mail arrivata davvero. La configurazione che ha funzionato:

| | |
|---|---|
| provider | **Aruba** (`62.149.128.201` = `smtp2.aruba.it`) |
| server | `smtps.aruba.it`, porta `465` |
| casella | `info@arctrail3d.com` |
| raccolta | `mail` |
| regione | `europe-west1` |
| SPF | già a posto — **il DNS non si tocca** |

```
smtps://info%40arctrail3d.com@smtps.aruba.it:465
```

**Trappola 1 — la chiocciola va scritta `%40`.** Il nome utente è un indirizzo
e l'SMTP è un URI: la `@` spacca il campo. *L'errore parla di autenticazione,
non di sintassi*, e si perde tempo sulla password, che è giusta.

**Trappola 2 — non si usa `smtp.arctrail3d.com`.** Il DNS ha un record che
sembra giusto; il certificato di quel server è `*.aruba.it`, non combacia, e
l'estensione si ferma. *L'errore parla di TLS e sembra la rete.*

**Come si prova.** Un documento scritto a mano in `mail` dalla console: `to`
array, `message` map con `subject` e `text`. **La prova vera è che la mail sia
arrivata**, non che il documento dica SUCCESS.

**Quando smette, si vede** dal pannello → Percorsi: se la coda sale e le
lavorate restano zero, l'estensione è ferma. *Una posta che non parte non fa
rumore, e un numero che sale sì.*

---

## Come si fa una modifica

**21. Patch via Python, con `assert s.count(v) == 1` prima di ogni scrittura.**
Se l'ancora è ambigua o mancante, **il file non viene toccato**. Ha già preso
bug veri: un'ancora in due posti, una classe CSS inesistente, un `BUILD_PARENT`
non pubblicato. Mai `sed` per sostituzioni multi-linea.

L'ordine è: scrivere lo script → eseguirlo → **subito**
`node controlla-sintassi.js app.html` → `node controlla-token.js app.html`
→ i banchi della zona. **Questi tre non si saltano a nessun livello**: sono
secondi, non minuti. Il giro completo è un'altra cosa e sta nella regola 3.

*Dal 25/08 il file dell'app è `app.html`: `index.html` è la vetrina.* Un
`assert` su un'ancora presa dal file sbagliato non scrive: è il modo giusto di
sbagliare, ma fa perdere un giro.

**Non indovinare i confini di una funzione con una regex** (25/08: metà
funzione sostituita, l'altra metà orfana — il racconto è in `NOTE-DESIGN.md`).
I confini si leggono dal file, e si controlla che il blocco finisca dove ci si
aspetta.

**25. VENTI MINUTI A MODIFICA.** *(25/08/2026, detto da Alessandro: «non ci
possiamo mettere più di 20 minuti per ogni modifica».)* È il tetto del livello
veloce, e la regola 3 dice come si rispetta.

*Il conto va fatto sulla misura, non sulla scrittura:* la modifica è un minuto,
il resto è misurare prima e raccontare dopo. Misurare prima resta obbligatorio
quando il difetto non si vede — la barra sembrava sbilanciata e le celle erano
uguali al pixel — ma sei larghezze si misurano **in una chiamata sola**.

Il giro completo prima di consegnare non salta mai: **quello è sicurezza, non
tempo.** Quello che è saltato è il giro completo *dentro* l'iterazione.

**22. Sabotare serve a battezzare un banco, non a ricontrollarlo ogni volta.**

Un banco che non è mai stato visto dire di no non si sa se funziona. Quindi si
sabota **quando nasce, e quando cambia sostanza** — cioè quando cambia *cosa
chiede*, non quando cambia un'attesa o un selettore.

E si sabota **sempre** su un banco che protegge un'invariante critica
(punteggio, accesso, memoria offline, regole, service worker), a ogni giro in
cui quella zona viene toccata. *Lì il costo di un banco cieco non è un giro
perso: è un punteggio sbagliato in gara.*

Nel livello veloce non si sabota niente se nessun banco è cambiato: si
starebbe ricontrollando una risposta già data.

**23. I banchi girano su un solo utente.** Tutti i difetti che servono due
persone non li copre nessun banco: il flickering della chat si è visto solo con
una seconda persona in linea.

**24. Il dizionario del mercatino si genera.** `genera.py` inietta il
dizionario in `marketplace.html` e il blocco `PAROLE` in `index.js`, fra marker
fissi. **Non si scrive a mano dentro i marker.**

---

# Regole ritirate

*Il racconto — quale regola, quando, e perché è stata tolta — sta in
`NOTE-DESIGN.md`, sezione **«Le regole ritirate, e perché»**. Sta lì e non qui
per la stessa ragione per cui ci sta tutto il resto della storia: questo file
si legge per intero ogni sessione, e una regola morta letta insieme a quelle
vive costa quanto una viva.*

*Ma non si cancellano: **una regola cancellata senza motivo torna da sola**.*
