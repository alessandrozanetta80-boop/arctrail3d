# Pagine SEO federazioni — report di verifica

*Quarta e ultima passata, 28/08/2026. La prima aveva un errore sostanziale
sul regolamento IFAA; la seconda l'ha corretto ma lasciava i punteggi vecchi
liberi di battere i nuovi; la terza ha chiuso quel buco ma pubblicava sedici
pagine quasi identiche. Qui c'è tutto, e su quale documento.*

---

## Due correzioni di questa passata

### 1. Il marchio finiva anche sul modo di ieri

`schemaPunteggio()` passava per `baseModeKey()`, che toglie il suffisso
`_v1`. Risultato: `schemaPunteggio("ifaa_3d_v1")` restituiva il marchio del
barème **nuovo**.

Il caso in cui morde è stretto ma reale: un giro cominciato ieri, dirottato
su `ifaa_3d_v1` alla ripresa, e poi **chiuso**. Alla chiusura si sarebbe
salvato con `scoringVersion: "ifaa-standard-2021"` addosso — cioè un giro
calcolato con 20/18 e 16/14 si sarebbe dichiarato del barème nuovo, e nello
storico e sul cloud sarebbe stato indistinguibile da uno corretto.

Adesso il confronto è esatto: `modeKey === "ifaa_3d"`. **`baseModeKey` serve
alle parole** — il modo di compatibilità deve leggersi «IFAA 3-D Standard
Round» come l'altro — ma il marchio non è una parola, è un fatto sul
punteggio, e lì i due modi sono cose diverse.

Il banco copre la catena intera: un giro di ieri viene ripreso, dirottato,
chiuso senza marchio, e resta nella casella dei vecchi. E non può rientrare
fra i nuovi per nessuna strada, nemmeno passandogli il marchio a mano.

### 2. Sedici pagine quasi identiche non si pubblicano

La passata precedente faceva **una pagina per federazione**: sedici file in
cui cambiava la sigla e restava identico tutto il resto, perché dieci
federazioni applicano lo stesso regolamento World Archery e sette lo stesso
regolamento IFAA. Sono *doorway pages*: pagine che esistono per intercettare
una parola chiave e non per dire qualcosa che le altre non dicono. Google le
riconosce e le declassa, ed è giusto che lo faccia.

**Una pagina per regolamento, non per federazione.**

| pagina | cosa contiene |
|---|---|
| `fiarc.html` | già online e approvata, **non toccata** |
| `world-archery-3d.html` | 24 bersagli, 2 frecce, 11/10/8/5 + 10 federazioni in sezioni ancorate |
| `ifaa-3d.html` | Standard e Hunting Round + 7 federazioni in sezioni ancorate |
| `nfas-3d.html` | Big Game Round — regolamento proprio, resta una pagina sua |
| `regolamenti-3d.html` | l'indice: quattro regolamenti, poi le 17 federazioni per paese |

Il regolamento si spiega **una volta sola**, con la sua fonte e la sua
versione. Le federazioni diventano sezioni con un'ancora: chi cerca
«punteggio FITARCO 3D» atterra su `world-archery-3d.html#fitarco` e trova il
suo nome, la sua fonte nazionale e il regolamento vero sopra, invece di una
copia. Le due federazioni su due circuiti — ÖBSV e KHSN — compaiono in
entrambe le pagine, e ciascuna sezione rimanda all'altra.

Le quindici pagine federazione **non sono mai state pubblicate**, quindi non
servono redirect: escono dal pacchetto e dalla sitemap e basta.

**Il generatore è stato riscritto sulla nuova architettura**, non solo
l'output: le federazioni sono dati, non file. Se lo fosse stato solo
l'output, la prossima rigenerazione avrebbe ricreato le sedici copie.

---

## La correzione, prima di tutto

**La passata precedente aveva sbagliato il 3-D Standard Round IFAA**, e con
lo stesso errore ha assolto `app.html`, che lo portava dentro da prima.

Fonte letta questa volta: **IFAA Book of Rules 2021, diciottesima edizione,
revisione 4 aprile 2021**, scaricato dal sito ufficiale IFAA. Sono gli
articoli **Article V sezione E** e **Article V sezione F**.

| | cosa dice il regolamento | cosa dicevo io il giro scorso | cosa aveva `app.html` |
|---|---|---|---|
| **3-D Standard Round (2 Arrows)** | 28 bersagli, **due** posizioni di tiro, una freccia da ciascuna, entrambe contate. Tre zone. **Kill 10 · Vital 8 · Wound 5** per ogni freccia | 28 bersagli, 2 frecce, **due sole aree**, 20/18 poi 16/14 | zone `spot`/`lowarea`, 20/18 poi 16/14 |
| **3-D Hunting Round (1 Arrow)** | 28 bersagli, **una** posizione, **una** freccia. **Kill 20 · Vital 16 · Wound 10** | «barème non confermato, nessuna tabella pubblicata» | `kill:20, vital:16, wound:10` — **già corretto** |

**Da dove veniva il 20/18 + 16/14.** Quei numeri esistono davvero nel Book of
Rules, e sono dell'**Animal Round** — marcato e non marcato — dove le frecce
sono tre, a scendere, e le aree sono due: `KILL 20/16/12`, `WOUND 18/14/10`.
Erano stati portati su una gara diversa. Il massimo teorico dello Standard
passa così da 1008 a **560**, che è anche il massimo dell'Hunting: due gare
diverse che arrivano allo stesso numero per strade opposte.

**Sul 3-D Hunting mi ero sbagliato due volte.** Non solo non l'ho pubblicato,
ma avevo scritto nel report che i suoi numeri erano in conflitto con l'app e
che la sagoma IFAA ha due aree. Erano giusti loro. La sezione E descrive
esplicitamente tre aree — Kill, Vital, Wound — e la sezione F rimanda proprio
a quelle: *«Scoring areas are as defined under section 3 of the IFAA 3D
Hunting Round»*. Il commento in `app.html` che diceva «dati verificati da
Alessandro» diceva il vero.

---

## La tabella

| Federazione | Paese | File | Formati trovati | Fonte ufficiale | Versione/data regolamento | Stato |
|---|---|---|---|---|---|---|
| FIARC | Italia | `fiarc.html` *(già online)* | Round 3D, Percorso, Tracciato, Battuta | fiarc.it | Reg. Sportivo, 02/12/2023 | OK |
| FITARCO | Italia | `world-archery-3d.html#fitarco` | 3D Round WA | fitarco.it + worldarchery.sport | Libro 2 e Libro 4, dal 01/01/2026 | OK |
| FFTA | Francia | `world-archery-3d.html#ffta` | 3D Round WA | ffta.fr + worldarchery.sport | pagina «Le tir 3D» + Book 2/4 2026-03-13 | OK |
| FFTL | Francia | `ifaa-3d.html#fftl` | 3-D Standard + 3-D Hunting IFAA | ifaa-archery.org | Book of Rules, rev. 04/04/2021 | OK |
| SwissArchery | Svizzera | `world-archery-3d.html#swissarchery` | 3D Round WA | worldarchery.sport | Book 2 e Book 4, 2026-03-13 | OK |
| FAAS | Svizzera | `ifaa-3d.html#faas` | 3-D Standard + 3-D Hunting IFAA | ifaa-archery.org | rev. 04/04/2021 | OK |
| ÖBSV | Austria | `world-archery-3d.html#oebsv` + `ifaa-3d.html#oebsv` | IFAA (due round) + 3D Round WA | ifaa-archery.org, worldarchery.sport | come sopra | OK |
| DSB | Germania | `world-archery-3d.html#dsb` | 3D Round WA | dsb.de + worldarchery.sport | «Modus 3D» + Book 2/4 2026-03-13 | OK |
| DFBV | Germania | `ifaa-3d.html#dfbv` | 3-D Standard + 3-D Hunting IFAA | ifaa-archery.org | rev. 04/04/2021 | OK |
| Archery GB | Regno Unito | `world-archery-3d.html#archerygb` | 3D Round WA | worldarchery.sport | Book 2 e Book 4, 2026-03-13 | OK |
| NFAS | Regno Unito | `nfas-3d.html` | Big Game Round | nfas.net | Shooting Handbook 2026 + “What We Do” | OK |
| EFAA | Regno Unito | `ifaa-3d.html#efaa` | 3-D Standard + 3-D Hunting IFAA | ifaa-archery.org | rev. 04/04/2021 | OK |
| TOF | Turchia | `world-archery-3d.html#tof` | 3D Round WA | worldarchery.sport | Book 2 e Book 4, 2026-03-13 | OK |
| RFETA | Spagna | `world-archery-3d.html#rfeta` | 3D Round WA | worldarchery.sport | Book 2 e Book 4, 2026-03-13 | OK |
| KHSN | Paesi Bassi | `world-archery-3d.html#khsn` + `ifaa-3d.html#khsn` | IFAA (due round) + 3D Round WA | ifaa-archery.org, worldarchery.sport | come sopra | OK |
| SBF | Svezia | `world-archery-3d.html#sbf` | 3D Round WA | bagskytte.se + worldarchery.sport | pagina «3D» + Book 2/4 2026-03-13 | OK |
| SFSF | Svezia | `ifaa-3d.html#sfsf` | 3-D Standard + 3-D Hunting IFAA | ifaa-archery.org, sfsf-archery.com | rev. 04/04/2021 | OK |

**Diciassette federazioni verificate, tutte OK.** Non c'è più nessuna riga
DA VERIFICARE né BLOCCATA.

**Ma le pagine sono cinque, non diciassette.** La colonna «File» qui sopra
indica la pagina o la sezione ancorata in cui ogni federazione è documentata;
quasi nessuna ha un file separato.
Vedi «Sedici pagine quasi identiche non si pubblicano», in cima.

---

## I dati verificati, uno per uno

### IFAA — 3-D Standard Round → OK

Book of Rules 2021, Article V F. Due unità standard da 14 bersagli = **28**.
Due posizioni di tiro, una freccia da ciascuna. *«Both arrows are counted for
score.»* Zone come alla sezione E. **Kill 10, Vital 8, Wound 5.**

### IFAA — 3-D Hunting Round → OK

Article V E. Due unità da 14 = **28** bersagli. Una posizione, una freccia.
Zone: Kill (il cerchio interno; se ce n'è più di uno contano come uno solo),
Vital (l'area attorno), Wound (fino alla *hairline*).
**Kill 20, Vital 16, Wound 10.**

### World Archery — 3D Round → OK

Book 2 (Events) versione **2026-03-13**, art. 4.5.2.1 (24 bersagli, 2 frecce),
art. 4.5.2.3 (distanze non segnate, 5–45 m compound e 5–30 m per le altre
divisioni), art. 8.2.2.1 (le quattro zone **11 / 10 / 8 / 5** descritte una
per una). Book 4 versione **2026-03-13**, art. 20.3.1 (due frecce in tutte le
fasi) e art. 21.8 (120 secondi in qualifica).

### FITARCO → OK

Regolamento Tecnico di Tiro, **Libro 4 in vigore dal 1° gennaio 2026**:
art. 23.3.1 *«nelle gare 3D è consentito tirare in tutte le fasi di gara due
frecce per bersaglio (sagoma)»*; art. 25.3.1 e 25.4 nominano i **10** e gli
**11**; art. 25.2.2 il **5**. **Libro 2**: *«La gara 3D consiste in un
percorso di 24 bersagli (sagome) posti a distanze sconosciute. Da ogni
postazione di tiro vengono tirate due (2) frecce.»*

### FFTA → OK

Pagina ufficiale «Le tir 3D»: *24 cibles*, e *«On peut marquer 5, 8, 10 ou 11
points en fonction des zones atteintes»*. Il numero di frecce viene dal Book 4
World Archery, che la FFTA applica come federazione affiliata.

### DSB → OK

Pagina ufficiale «Modus 3D»: *«24 Passen à 2 Pfeile»*, e le quattro zone
elencate una per una — **11** l'anello più interno, **10** l'anello maggiore
nell'area vitale, **8** l'area vitale, **5** il corpo.

### SBF → OK

Pagina ufficiale «3D»: *«I 3D ronden skjuts normalt två (2) pilar per mål»*,
*«inre ring 11 p, yttre ring 10 p, vital ring 8 p och 5 p för resten av
målet»*, *«Maximalt 22 p per mål»*, *«En 3D-rond omfattar normalt 24 mål»*.

### NFAS — Big Game Round → OK

NFAS Shooting Handbook. Fino a tre picchetti, una freccia da ciascuno finché
non si va a segno. *Inner kill* 24 sulla prima freccia soltanto; *kill*
20/14/8; *wound* 16/10/4.

---

## SFSF — da BLOCCATA a OK

Il giro scorso avevo bloccato la pagina perché `app.html` elencava per la
Svezia una federazione siglata **SFF**, senza indirizzo, e il membro IFAA
svedese risultava chiamarsi diversamente.

Confermato sul sito ufficiale IFAA: il membro svedese è la **Svenska
Fältbågskytte Förbundet**, e l'IFAA la elenca fra i suoi membri europei. Il
suo sito è `sfsf-archery.com`, che dichiara l'affiliazione IFAA.

Cosa è stato fatto in `app.html`:

- **la chiave interna `sff` non è stata toccata.** Sta nei profili e nello
  storico di chi l'ha già scelta: rinominarla farebbe cadere quelle persone su
  un'altra federazione in silenzio, ed è lo stesso motivo per cui esiste
  `fuoriElenco` invece della cancellazione;
- le etichette visibili passano da `SFF` a `SFSF`, in `COUNTRY_FEDERATIONS` e
  in `PROFILE_FEDERATIONS`;
- aggiunta l'URL ufficiale, che era l'unica delle diciassette a mancare;
- creata la sezione `#sfsf` in `ifaa-3d.html`, e nell'indice e nei testi pubblici si legge SFSF.

---

## FITARCO — il flag `provisional` è stato tolto

`fitarco3d` aveva `provisional:true`, che nell'app fa comparire in schermata
la riga *«Dati non ancora confermati da un regolamento ufficiale certo:
potrebbero cambiare»*.

Quella bandiera aveva **una ragione sola**, e la ragione era quella scritta:
il regolamento non era stato letto. Adesso lo è — Libro 2 e Libro 4 in vigore
dal 1° gennaio 2026 — e conferma 24 sagome, due frecce e le zone 11/10/8/5.
Il flag è stato tolto sia dal modo sia dall'elenco dei paesi. Non c'era una
seconda ragione da preservare.

---

## Cosa è cambiato in `app.html`, e cosa succede ai dati di ieri

### La modifica

```
ifaa_3d:  zones ZONES_2_IFAA          →  ZONES_3_IFAA_HUNT
          scoring 1:{spot:20,lowarea:18}, 2:{spot:16,lowarea:14}
                                       →  1:{kill:10,vital:8,wound:5}
                                          2:{kill:10,vital:8,wound:5}
```

`arrowsPerTarget` resta 2 e `formats` resta [28]: la struttura del giro non
cambia, cambiano il valore delle zone e il numero delle zone.

`ifaa_hunting` **non è stato toccato**: era già corretto.

`ifaa_training` **non è stato toccato**, ed è una scelta, non una
dimenticanza. È un allenamento a formato libero, non un round del
regolamento: nessun articolo del Book of Rules gli corrisponde, quindi non
c'è una fonte che dica cosa dovrebbe diventare. Resta però una stonatura
onesta da segnalare: propone una sagoma a **due** zone con barème 20/18,
mentre le sagome IFAA ne hanno tre. La strada probabile è allinearlo
all'Hunting Round — una freccia, tre zone, 20/16/10 — ma è una decisione tua,
e cambierebbe anche il senso degli allenamenti già registrati.

### Lo storico: non serviva migrare niente, e il motivo è nel formato

I giri chiusi salvano **numeri già calcolati**, non nomi di zona:
`state.pendingArrows.push(score)` accumula valori, e ogni piazzola diventa
`{ arrows: [numeri], total: numero }`. Il totale non viene mai ricalcolato da
una tabella. **Nessun giro chiuso cambia punteggio, e nessuno diventa
illeggibile.**

L'unico posto dove il valore torna a incontrare la tabella è il riquadro
«dove sono andate le frecce» del finale, che risale alla zona partendo dal
numero. Quel codice già oggi non inventa: se un valore non combacia con
nessuna zona non lo conta, e il totale delle frecce riconosciute lo dice.

### Il caso vero: il giro lasciato **aperto**

È l'unico scoperto. Un giro IFAA in corso ha già frecce da 20, 18, 16 o 14 in
memoria; proseguendo con la tabella nuova, le prime piazzole e le ultime
seguirebbero due regolamenti diversi dentro lo stesso punteggio.

La cura, in `app.html`:

- un modo `ifaa_3d_v1` che conserva la definizione di ieri, **non presente in
  nessun `garaModes`**: dai menu non ci si arriva;
- `adattaGiroIfaa()`, chiamata al caricamento dello stato locale **e** alla
  ripresa del giro ritrovato sul cloud — che può arrivare da un telefono
  rimasto alla versione vecchia;
- il riconoscimento è **certo, non euristico**: con la tabella nuova nessuna
  freccia può valere più di 10, quindi un 14, un 16, un 18 o un 20 in memoria
  possono venire solo dalla tabella vecchia. Conta anche la freccia in
  sospeso;
- **non si converte niente**: convertire vorrebbe dire riscrivere il
  punteggio di frecce già tirate e già viste sullo schermo da chi era in
  piazzola. Il giro finisce con la tabella con cui è cominciato;
- `baseModeKey()` toglie il suffisso `_v1` quando si cercano le parole del
  modo: chi ha un giro aperto legge lo stesso nome di prima, e non nasce un
  secondo dizionario da tenere allineato in nove lingue.

---

## La separazione dello storico: il marchio

Il giro precedente si fermava a metà. I giri **aperti** venivano dirottati sul
modo di ieri, ma quelli **già conclusi** restavano salvati con
`modeKey:"ifaa_3d"` — e i nuovi pure. `recordLifetime()` usa `modeKey` come
parte della chiave, quindi un 900 fatto col barème 20/18–16/14 e un 500 fatto
col barème 10/8/5 finivano nella stessa casella: stessa media, stesso record.
**Il 900 avrebbe vinto per sempre una gara che non ha mai tirato.**

### Il marchio, non la data

L'identificatore è `scoringVersion: "ifaa-standard-2021"`, e sta **sul giro**.

Una data non sarebbe bastata: si può importare un backup vecchio, si può
cambiare l'orologio del telefono, si può ricevere dal cloud un documento
scritto mesi fa. Il marchio invece viaggia col giro dovunque vada — storico
locale, Firestore, giro aperto — e dice quale tabella ha prodotto quei numeri.

**La regola è una sola, e vale in ogni punto del programma:** un giro
`ifaa_3d` senza marchio è un giro di ieri, e si legge come `ifaa_3d_v1`.
La porta è la funzione `modoDelGiro(modeKey, scoringVersion)`; se un giorno
nascesse un secondo barème corretto, si aggiungerebbe lì e in nessun altro
posto.

### Dove il marchio viene scritto

| punto | cosa succede |
|---|---|
| `beginRound()` | il giro nasce marchiato, dalla prima piazzola |
| `CAMPI_DEL_GIRO` | il marchio viaggia col giro aperto, anche sul cloud |
| storico locale | `scoringVersion` nella riga del giro chiuso |
| `backupRoundToCloud()` | il marchio sale col giro appena chiuso |
| `pushLocalHistoryToCloud()` | e anche coi giri arretrati |
| `restoreHistoryFromCloud()` | **normalizzato alla lettura**: un documento senza il campo diventa `ifaa_3d_v1` in locale |

**Firestore non viene riscritto in massa.** Un documento vecchio non ha il
campo, e non averlo *è* l'informazione: si normalizza quando scende, non
riscrivendo centinaia di documenti per aggiungere un `null`.

### La migrazione, una volta sola

`migraSchemaIfaa()` gira al caricamento, **prima** di `backfillLifetimeOnce()`
— al contrario, il backfill rimetterebbe i giri di ieri sotto `ifaa_3d`.

1. **Storico locale** — ai giri `ifaa_3d` senza marchio si riscrive `modeKey`
   in `ifaa_3d_v1`. `arrows`, `perTarget` e `total` restano identici:
   **nessun punteggio viene ricalcolato**, cambia solo la casella.
2. **`LIFETIME_KEY`** — le voci `nome|ifaa_3d` passano a `nome|ifaa_3d_v1`.
   Se la destinazione esiste già le due si **fondono**: giri e somma si
   sommano, il record più alto vince e si porta dietro la sua data e il suo
   formato, la prima data è la più vecchia e l'ultima la più recente,
   proprietario ed etichetta non si perdono.

Non è idempotente da sola — dopo il primo giro corretto la casella
`nome|ifaa_3d` torna a esistere, e legittimamente — quindi si segna di averla
fatta in `arctrail3d_ifaa_schema_v1`. Un travaso ripetuto sposterebbe i record
*nuovi* fra i vecchi, che è lo stesso difetto al contrario.

**Niente viene cancellato.** Le voci non spariscono: cambiano chiave.

### Il giro aperto, riconosciuto meglio di prima

Il giro scorso `adattaGiroIfaa()` guardava i numeri: con la tabella nuova
nessuna freccia può superare 10, quindi un 14 o un 20 tradiva il barème
vecchio. Funzionava, ma aveva un buco: **un giro aperto e ancora a zero
frecce sarebbe passato per nuovo.** Adesso decide il marchio, che c'è dalla
prima piazzola.

### Le etichette

`baseModeKey("ifaa_3d_v1")` continua a restituire `ifaa_3d`, quindi chi ha un
giro o un record legacy legge la normale etichetta **IFAA 3-D Standard
Round**. Nessuna stringa nuova in nove lingue per un modo che nessuno sceglie.

**Risultato:** un punteggio ottenuto col barème 20/18–16/14 non può più
diventare record, media o confronto del nuovo Standard IFAA 10/8/5.

### Le traduzioni

**Non è stato necessario cambiarne nessuna.** Le nove descrizioni
`mode_ifaa_3d_desc` dicevano già *«28 piazzole, 2 frecce a piazzola da due
piquet diversi (entrambe le frecce si sommano)»*, che è esattamente il
regolamento. Nessuna diceva «due zone» né «la seconda freccia vale meno» —
l'errore stava solo nei numeri del motore. Il banco lo controlla comunque
lingua per lingua, così se qualcuno la riscrive male se ne accorge.

### Il commento falso accanto a `ifaa_hunting`

Sopra `ifaa_hunting` era rimasta una riga che diceva che nello Standard *«la
seconda freccia vale meno»* e che le zone *«sono tre invece di due»*.
Descriveva l'Animal Round, ed era diventata falsa con la correzione.
Riscritta sul Book of Rules, senza toccare la logica. Il banco controlla che
non ricompaia.

### `presentazione.html`: il generatore che non esisteva

Il commento dentro `presentazione.html` diceva già *«lo riscrive
`genera-presentazione.py`»*. **Quel file non è mai esistito**: l'elenco si
scriveva a mano sotto un cartello che vietava di scriverlo a mano, ed è il
motivo per cui la Svezia è rimasta a «SFF» mentre l'app diceva già SFSF.

Adesso `genera-presentazione.py` c'è. Legge `FEDERATIONS` e
`COUNTRY_FEDERATIONS` da `app.html`, lascia fuori chi ha `garaModes: []` e chi
ha `fuoriElenco: true`, e riscrive il blocco fra i marker. Rieseguito una
seconda volta dice «nessuna modifica».

Ha anche chiuso un difetto di struttura: i `<li>` dell'elenco stavano **nudi
nel documento**, senza `<ul>`. Il browser li disegnava lo stesso, ma un
lettore di schermo non sapeva di essere in un elenco né quanto fosse lungo.
Il `<ul>` lo apre e lo chiude il generatore, così non si può più perdere.

Il link a `/regolamenti-3d.html` è rimasto dov'era.

### I regolamenti, ora con la versione

`REGOLAMENTI` portava `verifica:"serve_regolamento"` per `wa_book4` e
`"parziale"` per `ifaa_book`, con un commento che diceva che di nessuno era
stata verificata la versione. Adesso di due lo è: entrambi passano a
`verificato`, con versione, data e indirizzo. Il commento è stato corretto
invece che lasciato a mentire. **Gli altri sei restano come stavano.**

---

## I test eseguiti

**`banco-ifaa.js`, nuovo.** Scrive i numeri **a mano dal regolamento** e li
confronta con quello che l'app calcola davvero, eseguendo il blocco dei modi
invece di leggerlo con una regex. Un banco che si fa dettare le attese dal
file che deve controllare non può dire di no.

Copre: i due round IFAA piazzola per piazzola e zona per zona; i massimi
teorici (560 per entrambi); che i due round non si confondano; che il vecchio
barème non sia più raggiungibile; il modo di compatibilità e la sua
irraggiungibilità dai menu; `adattaGiroIfaa()` eseguita su cinque casi —
giro vecchio, giro nuovo, freccia in sospeso, giro chiuso, giro di un'altra
federazione; il formato numerico dello storico; le nove descrizioni.

**Sabotato.** Rimettendo `20/18 + 16/14` in una copia in memoria, il banco
passa da 48/0 a 38/10 e dichiara il sabotaggio rilevato. Un banco che non è
mai stato visto dire di no non si sa se funziona.

**Esteso il 28/08 con la separazione storico/record**, che è la parte dove
un difetto non si vede a occhio. Le prove nuove non simulano niente: eseguono
la vera `migraSchemaIfaa()` su un `localStorage` finto e guardano dove
finiscono i numeri.

Coprono: il marchio messo solo sullo Standard e su nessun altro modo; un
marchio sconosciuto che non passa per nuovo; un vecchio giro concluso senza
marchio che diventa legacy col punteggio intatto; un record da 900 che esce
da `Ale|ifaa_3d` ed entra in `Ale|ifaa_3d_v1` con giri, somma, data e formato
interi; un giro nuovo da 500 che sta nel gruppo nuovo mentre il 900 resta nel
vecchio; le due medie che non si mescolano (500 e 800); la migrazione che non
gira due volte e non trascina i record nuovi fra i vecchi al secondo giro; la
fusione quando la destinazione esiste già; i giri dal cloud con e senza
versione; il giro aperto con e senza marchio, **anche a zero frecce**; e i
sette punti di scrittura letti nel file.

**Il banco ha già preso un difetto vero.** La migrazione del riepilogo
tagliava la chiave con `slice(-9)`, ma `"|ifaa_3d"` sono otto caratteri: le
voci non si spostavano, e il 900 sarebbe rimasto esattamente dov'era. Il
banco l'ha detto al primo giro, prima che il file uscisse.

Registrato in `controlla-tutto.sh`, che passa da 26 a 27 banchi.

| banco | esito |
|---|---|
| `banco-ifaa.js` | **92 passate, 0 fallite** |
| `banco-ifaa.js --sabota` | sabotaggio rilevato |
| `banco-giro-sicuro.js` | 48 passate, 0 fallite |
| `banco-finale.js` | 28 passate, 0 fallite |
| `banco-regolamenti.js` | 18 passate, 0 fallite |
| `banco-avvio.js` | 37 passate, 0 fallite |
| `banco-schede.js` | 19 passate, 0 fallite |
| `banco-traguardi.js` | 12 passate, 0 fallite |
| `banco-campi.js` | 30 passate, 0 fallite |
| `banco-home.js` | 17 passate, 0 fallite |
| `banco-allenamenti.js` | 23 passate, 0 fallite |
| `banco-lingue.js` | tutte passate |
| `controlla-sintassi.js` | i 3 copioni sono grammatica |
| `controlla-token.js` | **identico alla base online** — le quattro regole aperte sono C18, preesistenti |
| `controlla-base.js` | base giusta; `app.html` e `sw.js` AVANTI, cioè da caricare |

**Sitemap: 10 URL.** Le sei preesistenti più `regolamenti-3d.html`,
`world-archery-3d.html`, `ifaa-3d.html` e `nfas-3d.html`. Le quindici pagine
federazione eliminate non ci sono mai entrate. XML valido, nessun duplicato.
La data di `presentazione.html` passa a `2026-08-28` perché la pagina è
cambiata oggi; nessun'altra data è stata toccata.

Controlli SEO statici sulle quattro pagine generate: un solo H1 ciascuna,
zero JavaScript, tag bilanciati, canonical assoluta e corretta, nessuna
canonical duplicata, **nessuna ancora duplicata** (dieci su World Archery,
sette su IFAA), nessun link interno rotto — né di pagina né di ancora —
nessuna pagina orfana rispetto all'indice.

---

## Versioni

| file | timbro | nato da |
|---|---|---|
| `app.html` | `2026-08-28-marchio` | `2026-08-28-schema` |
| `sw.js` | `arctrail3d-v148` | `arctrail3d-v147` |

`sw.js` sale perché `app.html` sta dentro `APP_SHELL`: senza nome nuovo il
telefono continuerebbe a servire dalla cache la versione col barème
sbagliato. Le pagine SEO non stanno in `APP_SHELL` e non lo fanno salire.

`v147` era la versione del pacchetto precedente, e `2026-08-28-schema` il
suo timbro: la catena non salta un anello.

---

## I due dubbi del giro scorso, chiusi

Erano rimasti aperti ÖBSV e KHSN: avevo verificato *i due regolamenti*, non
che quelle due federazioni stessero davvero su entrambi i circuiti. Se una
delle due non fosse stata membro IFAA, la sua pagina avrebbe offerto un
formato che quella federazione non tira.

- **ÖBSV** — la Wettkampfordnung, al **§1.1**, dichiara l'ÖBSV membro di
  World Archery **e** di IFAA.
- **KHSN** — la pagina ufficiale `handboogsport.nl/over-khsn/` dichiara
  l'adesione a World Archery **e** alla International Field Archery
  Association.

Entrambe le pagine offrono quindi i formati giusti, e i due punti escono
dalle questioni aperte.

---

## Cosa resta aperto

1. **`ifaa_training`** — allenamento libero con sagoma a due zone in un
   circuito le cui sagome ne hanno tre. Nessuna fonte da applicare, decisione
   tua (vedi sopra).
2. **Il numero di piazzole NFAS** — il Big Game Round non fissa un totale di
   bersagli. La regola delle unità da 14 appartiene allo Swedish Forester
   Round, non al Big Game. NFAS indica che la maggior parte dei percorsi ha
   36 o 40 bersagli. L'app mantiene per ora un preset da 28, dichiarato
   esplicitamente come scelta ArcTrail e non come regola NFAS.
3. **Sei regolamenti su otto restano non verificati** in `REGOLAMENTI`:
   `fiarc_rt` (parziale), `ffta_reglement`, `dsb_sportordnung`, `sbf_regler`,
   `nfas_rules`, `fidasc_reg`. Per FFTA, DSB e SBF le pagine pubbliche sono
   ora verificate sulla fonte nazionale, ma il *documento* regolamentare
   completo non è stato letto: la riga in `REGOLAMENTI` dice il vero.

---

## Le pagine si rigenerano

Escono tutte da `genera-federazioni.py`, con i barème in una tabella sola in
cima al file. **Il generatore è stato corretto insieme alle pagine**: se lo
fosse stato solo l'output, l'errore IFAA sarebbe tornato alla prima
rigenerazione, e non se ne sarebbe accorto nessuno finché non l'avesse letto
un arciere in gara.
