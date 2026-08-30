# REGOLE DI LAVORO — ArcTrail 3D

Come si lavora qui. Valgono per **ogni** sessione senza che vengano ripetute.

Si legge insieme a **STATO.md**, che dice cos'è vero oggi. Gli archivi dicono
*perché*, e non si leggono per intero: si cercano.

*Riscritto il 23/08/2026, rivisto il 26/08 coi tre livelli, corretto il 29 e il
30/08. Il contenuto è tutto qui: il ritirato sta in fondo, col motivo.*

---

## Le prime tre mosse di ogni sessione

**1. Dire se il progetto si può scrivere, prima di lavorare.**

`/mnt/project/` è una **copia montata dentro la singola chat**. `touch` non
risponde alla domanda giusta: scriverci riesce quasi sempre, ma quella copia
muore con la sessione. La domanda è *«questo file lo rivedrà qualcun altro?»*
**Non si fanno esperimenti per provarlo:** se l'ambiente non garantisce
esplicitamente che la scrittura torna nel Progetto, si tratta come sola lettura
e si consegnano i file.

- Se il progetto è **scrivibile**: leggere → modificare → riscrivere lì → dire
  in una riga cosa è cambiato.
- Se è **in sola lettura**: dirlo **alla prima riga**. *«Qui il progetto è in
  sola lettura: i file te li consegno e li carichi tu.»* Poi lavorare
  normalmente.

❌ **Mai lasciare che lo scopra alla fine:** costa mezz'ora un'informazione che
costava una riga.

**2. Chiedere se questa è la base giusta.**

> ⛔ **Se il lavoro tocca esclusivamente documenti interni, questa regola si
> SALTA: si applica direttamente la 3-bis.** La classificazione documentale
> viene **prima** dell'esecuzione di `controlla-base.js`.

```
node controlla-base.js
```

Il progetto **può essere indietro rispetto a GitHub**: su file vecchi i banchi
dicono di sì a tutto, e guardano il file sbagliato. **Quattro risposte, non tre.**

- **IN PARI** → si lavora.
- **AVANTI** → c'è lavoro fatto e non caricato. Dirlo ad Alessandro.
- **INDIETRO e basta** — il locale è un antenato puro: ogni riga che ha solo
  lui è la versione *vecchia* di una riga cambiata online → **si riallinea da
  soli e si tira dritto.** *Essere indietro non è un motivo per fermarsi.*
- **DIVERGENTE** — nel locale c'è lavoro che online non c'è → **fermarsi**, e
  *non* sovrascrivere niente.

**Quale delle due sia lo dice il `diff`, non il timbro**, e guardare resta
sempre la prima mossa.

**Il recupero si fa in due mosse, e la prima è guardare.**

```
curl -sL -o /tmp/on-app.html https://raw.githubusercontent.com/alessandrozanetta80-boop/arctrail3d/main/app.html
diff /tmp/on-app.html app.html
```

**`app.html` qui è solo un esempio.** Si confrontano **i file del prodotto
davvero toccati**: si modifica `index.html` → si confronta `index.html`; si
modifica `marketplace.html` → si confronta quello. *`app.html` non si confronta
per abitudine quando `app.html` non c'entra.*

Si decide **guardando il diff**, e si copia a mano solo se il locale non ha
lavoro da salvare: *un file che funziona non si sovrascrive in automatico.*

**E il timbro non è il contenuto.** File diversi possono avere lo stesso timbro
e il banco dice IN PARI. La parità vera si dichiara solo dopo un `diff` contro
`/tmp`, **prima di ogni consegna di FILE DEL PRODOTTO** — non a inizio sessione,
e **mai in un MICRO DOCUMENTALE** (3-bis).

Se GitHub non risponde, il banco non passa: *un controllo che non può dire di
no è spento.*

**3. Scegliere il livello PRIMA di lavorare, e attenersi a quello.**

Il numero dei banchi **non si scrive qui**: lo dice `controlla-tutto.sh`, che
è l'unica fonte. *Un conto ricopiato in prosa invecchia il giorno che si
aggiunge un banco, e poi mente per settimane.*

*`STATO.md` e `REGOLE-LAVORO.md` si leggono per intero una volta, all'apertura
della sessione. La riga «da leggere prima» dice cosa **rileggere per quel
pezzo**, non di rileggerli da capo.*

| | **MICRO** | **STANDARD** | **CRITICO** |
|---|---|---|---|
| **cosa** | HTML, CSS, testo, metadata, SEO, JSON-LD, icone, immagini — uno o due file, e **nessuna logica**: né accesso, né dati, né punteggio | un comportamento isolato: una schermata, una tendina, un elenco | punteggio, accesso, memoria offline, Firestore, service worker, pubblicazione |
| **da leggere prima** | `STATO.md` §1 (i timbri) | `STATO.md` intero | `STATO.md` intero + le voci d'archivio della zona |
| **prima di toccare** | `node controlla-base.js` | `controlla-base.js` + misurare il difetto | `controlla-base.js` + misurare + rileggere le voci che spiegano *perché* è così |
| **dopo ogni passaggio** | i controlli pertinenti al file toccato (regola 21) | come MICRO, più i banchi che toccano quel comportamento | come STANDARD, più il banco che protegge l'invariante toccata |
| **giro completo** | **no.** Solo i controlli che c'entrano con quello che è cambiato | prima di consegnare | prima di consegnare, **e** non si consegna se un banco è spento |
| **sabotaggio** | no, se nessun banco è cambiato | solo se nasce o cambia sostanza un banco | **sempre** sul banco che protegge l'invariante toccata |
| **diario** | solo se Alessandro lo chiede | a pezzo finito | a pezzo finito, con la diagnosi anche se è incerta |
| **parità con l'online** | `diff` contro `/tmp` prima di consegnare | idem | idem, **più** «visto funzionare» (regola 9) |

**Quello che nessun livello salta mai, sui file del PRODOTTO:** i controlli
pertinenti al file toccato (regola 21), il banco della zona e il `diff` contro
l'online prima di consegnare. *Il giro completo non sta in questa riga: è dello
STANDARD in su. Sui documenti non vale niente di tutto questo: vedi 3-bis.*

**3-bis. MICRO DOCUMENTALE — quando si toccano solo i documenti.**

`STATO.md`, `REGOLE-LAVORO.md`, `NOTE-DESIGN.md`, `NOTE-MERCATINO.md` e gli
altri documenti interni non pubblicati **non sono il prodotto**. *I copioni
(`.js`, `.sh`) non sono documenti: per loro valgono i controlli pertinenti
della regola 21.* Qui non servono
`controlla-base.js`, la sintassi e i token dell'app, il banco della zona del
sito, né il `diff` con l'online.

Il percorso è: **leggere `STATO.md` e il documento che c'entra → modificare →
`node controlla-diari.js` → consegnare**, se il progetto è in sola lettura.

Se il documento deve registrare un dato online **non già verificato**, si
verifica *solo quel dato*. Un controllo dell'intero sito per una correzione
documentale è tempo buttato.

**Un MICRO va dall'inizio alla consegna senza fermarsi:** base riallineata da
soli, modifica, controlli della zona, consegna. **Nessuna domanda intermedia**,
salvo un conflitto vero. *Né audit né analisi lunghe prima di lavorare.*
**Un MICRO già localizzato non chiede diagnosi né studio del sistema:** si cerca
il punto indicato, si modifica, si prova.

**SI SALE PER L'INVARIANTE CHE LA MODIFICA PUÒ ROMPERE, non per il file o la
schermata che la contiene.** Codice critico lì accanto non promuove niente.

- colore o testo nella schermata del punteggio, **senza toccare geometria né
  comportamento** → MICRO;
- dimensione, posizione o area sensibile dei comandi di punteggio → può essere
  CRITICO;
- calcolo, salvataggio o validazione del punteggio → CRITICO.

*Non si promuove un MICRO per stare tranquilli:* un giro di banchi speso dove
non serve è un giro tolto a dove serviva. E `sw.js` sale **solo se il file
cambiato sta dentro `APP_SHELL`** — lì è tecnica, non prudenza: senza nome nuovo
il telefono serve la copia vecchia.

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

**Ma se il progetto è in sola lettura vale il contrario:** si consegna **nella
stessa mossa in cui si modifica**, non a fine sessione. Se la chat si
interrompe, quello che non è in mano ad Alessandro è perso.

**E si dice sempre dove va** — *«questi tre su GitHub»*, *«questo e poi il
deploy»*. Un file consegnato senza destinazione è un compito senza istruzioni.

**6. Un nome solo per file.** Due copie con nomi diversi vogliono dire che **una
chat nuova non sa quale vale**. Coi dizionari è peggio: una traduzione nella copia
sbagliata sparisce alla prima passata di `genera.py`, **senza nessun errore**. Si
consegna con lo stesso nome, e la copia vecchia si cancella nella stessa mossa.

**7. Gli upload binari non si modificano da qui.** Le immagini si producono,
si consegnano e si ricaricano a mano, dicendolo.

---

## Le versioni

**8. Il timbro sale nella stessa mossa in cui cambia il file.**

`BUILD_STAMP` in `app.html`, `data-build` in `index.html` e `marketplace.html`,
`CACHE_NAME` in `sw.js`. Ogni file dichiara **da quale versione è nato**:
`BUILD_PARENT`, `data-parent`, `CACHE_PARENT`. **Il genitore è l'ultima versione
confermata online, non l'ultimo build locale:** un file nato da una versione non
pubblicata non è un aggiornamento, **è una cancellazione**, e `controlla-base.js`
fa fallire la sessione.

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
console, prove sul telefono — **non si consegna l'elenco intero:** un passo, la
conferma, poi il successivo. Un elenco di sei punti si perde per strada.

- **Una cosa sola per messaggio.** Tre comandi che non possono fallire in mezzo
  valgono come un passo; se uno può rispondere male, si spezza.
- **Si dice cosa deve rispondere** (*«deve dire `Deploy complete!`»*) e **cosa
  fare se va storto**, quando lo storto è prevedibile.
- **Uno screenshot vale come conferma.**

*Sui file vale il contrario: quelli si scrivono senza chiedere il permesso
pezzo per pezzo (regola 12).*

**10-bis. Quando Alessandro dice «non funziona», la prima domanda è QUALE.**

- **Prima si chiede dove sei e cosa tocchi**, con uno screenshot: Alessandro
  giudica guardando il telefono, quindi ce l'ha già in mano.
- **Alla seconda segnalazione della stessa cosa, è sbagliata la diagnosi, non
  la cura.** Si smette di correggere e si torna a guardare.
- **Un banco che passa non dice che funziona:** un banco che invecchia col
  prodotto conferma e basta.

**11. Il resoconto di fine lavoro ha tre domande, in quest'ordine.**

1. **Cosa fa l'app oggi che ieri non faceva** — detto come lo racconterebbe un
   arciere, non come è scritto nel codice.
2. **Cosa è andato storto, e in che stato è finito** — risolto, o aperto e
   allora dove. *Raccontare un errore corretto con lo stesso tono di uno
   rimasto aperto fa sembrare grave una cosa risolta.*
3. **Cosa resta da fare**, in ordine.

E si dice **con parole** se il giro è andato bene o male, poi le cifre per chi
le vuole. **Il gergo dei diari non esce dai diari:** *firma muta*, *il banco*,
*il guardiano* lì sono nomi utili, in un resoconto sono un muro.

**12. Quando fermarsi e chiedere.** Solo per: cancellare un documento,
riscrivere da zero più file, cambiamenti architetturali che buttano via lavoro.
**Per tutto il resto: procedere.**

**13. Le note sono decisioni prese, non punti di discussione.** Rimetterle in
discussione fa perdere tempo e fa dubitare del lavoro fatto. Se il codice *non fa
quello che le note dicono*, quello sì va segnalato: è lavoro rimasto indietro.

---

## Come si scrive nei diari

**14. Lo stato sta in STATO.md, il racconto negli archivi.**

Un diario fa due mestieri, e mescolarli li rompe entrambi:

- **cos'è vero oggi** → `STATO.md`. Corto, un posto solo, si legge per intero.
- **perché è così** → `NOTE-DESIGN.md`, `NOTE-MERCATINO.md`. Cronologici, si
  cercano, non si leggono mai per intero.

**Quando una voce si chiude, si CANCELLA da STATO.md**, e il racconto resta
nell'archivio. **La sezione A non la chiude un banco: la chiude una frase di
Alessandro, e si cancella nella sessione in cui la dice.** *Una cosa fatta che
continua a chiedere attenzione costa quanto una da fare.*

`node controlla-diari.js` tiene il tetto: `STATO.md` sotto le 250 righe. Come
il tetto dei token, **non sale mai per far passare il file**.

**15. Il diario si scrive quando il pezzo è finito, non a fine sessione.** Se
la chat si interrompe a metà, quello che è già scritto è salvo.

*Eccezione, nel MICRO:* il «pezzo» è **la versione che Alessandro ha
accettato**, non il singolo ritocco. Un colore provato e scartato era una
proposta, non un fatto.

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

Lo script si ferma se manca una delle funzioni attese: GitHub non ha ancora
servito il file nuovo, e senza quel controllo il deploy **cancellerebbe** le
mancanti. `--force` non si usa mai. **Alla domanda `create` si risponde `y`; se
compare `delete` si risponde `N` e ci si ferma:** sta guardando un `index.js`
sbagliato. I comandi a mano stanno in testa a `pubblica.sh`, in un commento;
senza `npm install` il deploy muore su *«Couldn't find firebase-functions»*.

**18. Quando si toccano più strati, l'ordine è obbligatorio:** funzioni →
`firestore.rules` → `marketplace.html` + `app.html`. *Eccezione già vista:*
quando una regola **chiude** qualcosa che il sito mostra ancora, i file del
sito vanno **prima**, o chi ha l'app vecchia vede un `permission-denied` al
posto di una spiegazione.

---

## Le regole di Firestore

**19. Stanno su GitHub, ma GitHub non le applica.**

Il file nel repo è la **copia di sicurezza**: da GitHub parte solo GitHub Pages,
e il Cloud Shell pubblica le funzioni, non le regole. Le regole **attive** vivono
solo nella console Firebase → Firestore Database → Regole. Ogni volta **due
mosse**: il file su GitHub per non perderlo, il testo incollato in console per
farlo valere. **Nessuna chat le può dedurre dal codice:** raccontano decisioni
che nel codice non ci sono. La versione in cima al file
(`// Versione AAAA-MM-GG-nome`) è l'unico modo per sapere, mesi dopo, se quelle
scritte sono quelle attive.

---

## La posta

**20. Non la manda l'app.** `avvisaPercorso` scrive un documento in `mail`; a
spedirlo è l'estensione **Trigger Email from Firestore** — separati apposta, così
se l'estensione si ferma i documenti restano in coda invece di sparire. La
configurazione provata il 20/08, con la mail arrivata davvero:

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

**Trappola 1 — la chiocciola va scritta `%40`:** il nome utente è un indirizzo e
l'SMTP è un URI, la `@` spacca il campo. *L'errore parla di autenticazione, non
di sintassi.*

**Trappola 2 — non si usa `smtp.arctrail3d.com`:** il certificato di quel server
è `*.aruba.it`, non combacia, e l'estensione si ferma. *L'errore parla di TLS.*

**Come si prova.** Un documento scritto a mano in `mail` dalla console: `to`
array, `message` map con `subject` e `text`. **La prova vera è che la mail sia
arrivata**, non che il documento dica SUCCESS. **Quando smette si vede** dal
pannello → Percorsi: coda che sale e lavorate a zero = estensione ferma.

---

## Come si fa una modifica

**21. Patch via Python, con `assert s.count(v) == 1` prima di ogni scrittura.**
Se l'ancora è ambigua o mancante, **il file non viene toccato**. Ha già preso
bug veri: un'ancora in due posti, una classe CSS inesistente, un `BUILD_PARENT`
non pubblicato. Mai `sed` per sostituzioni multi-linea.

L'ordine è: scrivere lo script → eseguirlo → **subito i controlli pertinenti al
FILE TOCCATO.** Sono secondi, non minuti:

- `app.html` → `controlla-sintassi.js` + `controlla-token.js` + il banco della
  zona;
- gli altri HTML → i controlli che li reggono davvero;
- i `.js` → `node --check` e il banco che li riguarda;
- i documenti → `controlla-diari.js`, e basta (3-bis).

**Se `app.html` non è stato toccato e il lavoro non dipende da lui, su
`app.html` non si controlla niente.** Il giro completo è un'altra cosa e sta
nella regola 3. *Dal 25/08 il file dell'app è `app.html`: `index.html` è la
vetrina, e un'ancora presa dal file sbagliato non scrive.*

**Non indovinare i confini di una funzione con una regex:** si leggono dal file,
e si controlla che il blocco finisca dove ci si aspetta.

**22. Sabotare serve a battezzare un banco, non a ricontrollarlo ogni volta.**

Un banco mai visto dire di no non si sa se funziona. Si sabota **quando nasce e
quando cambia sostanza** — cioè quando cambia *cosa chiede*, non un'attesa o un
selettore. E si sabota **sempre** su un banco che protegge un'invariante critica
(punteggio, accesso, memoria offline, regole, service worker), a ogni giro in cui
quella zona viene toccata: *lì un banco cieco non costa un giro, costa un
punteggio sbagliato in gara.* Nel MICRO non si sabota niente se nessun banco è
cambiato.

**23. Un rosso del parallelo non vale tre giri.** *(È C24 in `STATO.md`.)* Se il
giro in parallelo fallisce su un banco senza una regressione evidente: **1)** si
rilancia **solo quel banco**; **2)** se da solo passa e il comportamento è
quello di C24, **il giro completo non si rilancia**; **3)** `PAR=1` si usa solo
quando serve una suite intera affidabile prima di una consegna STANDARD o
CRITICA.

**23-bis. I banchi girano su un solo utente.** Tutti i difetti che servono due
persone non li copre nessun banco: il flickering della chat si è visto solo con
una seconda persona in linea.

**24. Il dizionario del mercatino si genera.** `genera.py` inietta il
dizionario in `marketplace.html` e il blocco `PAROLE` in `index.js`, fra marker
fissi. **Non si scrive a mano dentro i marker.**

**25. VENTI MINUTI A MODIFICA.** *(25/08/2026, detto da Alessandro: «non ci
possiamo mettere più di 20 minuti per ogni modifica».)* È il tetto del livello
MICRO, e la regola 3 dice come si rispetta.

*Il conto va fatto sulla misura, non sulla scrittura.* Misurare prima resta
obbligatorio quando il difetto non si vede, ma sei larghezze si misurano **in
una chiamata sola**.

Il giro completo prima di consegnare **non si fa nel MICRO** — lì valgono solo i
controlli della regola 3. È obbligatorio dallo STANDARD in su.

---

# Regole ritirate

*Quale regola, quando, e perché è stata tolta: `NOTE-DESIGN.md`, sezione
**«Le regole ritirate, e perché»**. Non qui, perché questo file si legge per
intero ogni sessione. E non si cancellano: **una regola cancellata senza motivo
torna da sola**.*
