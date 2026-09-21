# ALLENAMENTI — 21/09/2026: due problemi, tenuti separati

Ramo `fix/avvio-firebase-2026-09-21`, nato da `bae26e8` (la release del 20/09
com'era quando è stata pubblicata). **Niente è stato pubblicato. Nessun dato reale
è stato letto in scrittura o modificato.** `main` e la produzione sono ancora
quelli del 18/09 (`7b0ffe9`), verificati il 21/09 file per file.

I due problemi non hanno niente in comune tranne la parola «allenamento», e qui
restano in due capitoli diversi:

- **A. La registrazione e la sincronizzazione** di un allenamento nuovo — la
  regressione che ha fatto tornare indietro la release del 20/09.
- **B. Lo storico oltre i 150 giri** — un limite che c'era già il 18/09, e c'è
  ancora in produzione.

---

## A. Registrazione allenamento (regressione del 20/09)

### Causa

**L'app della release non inizializzava mai Firebase.** Non erano le regole, non
erano le Functions, non era il claim.

Commit `956bf36` (20/09, 00:26, «perf(avvio)», fase 23): per far arrivare prima la
Home, l'app smette di aspettare `DOMContentLoaded` e parte **subito**, dall'ultimo
copione del `<body>`. Ma le cinque librerie Firebase sono `<script defer>`, e il
browser esegue gli script `defer` **dopo** l'ultimo copione del body. Nel momento
in cui l'app faceva

```js
if(DEV_MODE || !fbVivo()){ firebaseReady = false; } else { firebase.initializeApp(...) }
```

`firebase` non c'era **mai** — su nessun telefono, con qualunque rete. Quindi:

| telefono | cosa succedeva |
|---|---|
| già usato (profilo o storico) | modalità locale: fascia «Stai lavorando solo su questo telefono», il giro si segna e resta nel telefono, **niente sale sul cloud** |
| nuovo | «Connessione non riuscita», non si arriva nemmeno all'accesso |

`avviaAccessoQuandoPronto()` aspettava le librerie, ma poi chiamava
`initAuthFlow()`, che esce subito se `firebaseReady` è falso: nessuno rifaceva
l'inizializzazione. **Nessuna scrittura è stata rifiutata**: non ne partiva
nessuna.

### Quale combinazione app / regole / Functions

Provato, non dedotto (`tests/e2e-emulatore.js`, SDK Firebase 10.12.2 vero,
emulatori Auth + Firestore, regole vere):

| app | regole | risultato |
|---|---|---|
| release 20/09 | qualunque | Firebase mai inizializzato: non si entra, non sale niente |
| corretta | del ramo (`2026-09-20-visibilita`) | giro sul server ✓, allenamento aperto sul server ✓, elenco ✓, socio con claim vede i «solo club» ✓, altra compagnia no ✓ (nemmeno per nome) |
| corretta | del 18/09 (`2026-08-28-porte-verified`, produzione) | giro ✓, allenamento ✓, elenco ✓ |

Le Functions non entrano nel percorso della registrazione: `claimCompagnia`
serve solo a far vedere ai soci i «solo club» della loro compagnia.

### Perché i banchi non lo vedevano

Tutti i banchi con browser usano `tests/firebase-finto.js`, che mette
`window.firebase` con `addInitScript`, cioè **prima** che la pagina parta. In
prova `firebase` c'era sempre già: l'ordine vero — prima l'app, poi le librerie —
non l'aveva nessun banco. `banco-esterni.js` provava gstatic **appeso**, mai
gstatic **che risponde**. `banco-porta.js`, l'unico con le librerie vere, sta
fuori dal giro (`ESTERNI=1`). E `banco-fumo.js` controllava che il giro finisse
nello storico **del telefono**, non sul cloud.

### Riproduzione

- `node tests/banco-librerie-defer.js` — il Firebase finto non si mette prima: si
  **serve** all'indirizzo vero di `firebase-app-compat.js`, e arriva col `defer`
  nell'ordine della produzione. Sulla release: **8 rossi su 15** (Firebase mai
  inizializzato, fascia locale, giro mai sul cloud, «Connessione non riuscita»
  su un telefono nuovo).
- `sh tests/lancia-e2e.sh` con `APP=` l'app della release: Firebase mai
  inizializzato dopo 20 s.
- A mano, il 21/09: l'app della release servita in locale, librerie vere da
  gstatic, tutto il resto della rete chiuso → `firebase.apps.length === 0` e la
  fascia «solo su questo telefono»; l'app del 18/09 nelle stesse condizioni →
  `1`, nessuna fascia.

### Fix

Solo `app.html`, solo l'avvio:

1. l'inizializzazione diventa una funzione, `inizializzaFirebase()`;
2. se all'avvio le librerie **non ci sono ancora**, non è un «no»: si segna
   `firebaseInArrivo`, `authState` resta `"loading"`, e né la fascia locale né
   «Connessione non riuscita» si disegnano mentre si aspetta;
3. `avviaAccessoQuandoPronto()` inizializza quando le librerie arrivano
   (`DOMContentLoaded` / `load`), poi fa partire l'accesso;
4. dopo 4 s senza librerie si segna in locale come prima (fase 15), **ma
   l'accesso non si chiude**: se le librerie arrivano dopo (3G lento), Firebase si
   inizializza e la nuvola torna senza ricaricare. Prima quel timeout chiudeva la
   sessione in locale anche a chi stava solo scaricando piano.

Quello che la fase 23 voleva — disegnare subito — resta.

### Test

| banco | release 20/09 | ramo corretto |
|---|---|---|
| `banco-librerie-defer.js` (nuovo, nel giro) | 7 ✓ · **8 ✗** | **15 ✓** |
| `e2e-emulatore.js` (nuovo, fuori dal giro: `sh tests/lancia-e2e.sh`) | non parte: Firebase mai inizializzato | **18 ✓** (10 regole nuove + 8 regole del 18/09) |

### Stato

**Causa trovata e riprodotta, fix scritto e provato fin dove si può senza
telefono.** Non pubblicato. Il cancello resta la creazione di un allenamento
vera da telefono (vedi «Cosa provare col telefono» in fondo).

Un difetto visto per strada e **non** corretto, perché non è la regressione: il
modulo «Annuncia allenamento» scrive senza aspettare il server e dice
«Pubblicato!» comunque; se il database rifiutasse, l'errore finirebbe solo nella
console. Oggi le prove dicono che non rifiuta.

---

## B. Storico allenamenti oltre i 150 giri

### Origine del limite

`HISTORY_MAX = 150` in `app.html`, c'è dall'agosto 2026 (`4eeb052`). Il telefono
tiene in `localStorage` i 150 giri più recenti; il cloud
(`users/{uid}/storico`) li tiene **tutti**. In produzione oggi (18/09) e nella
release del 20/09, identici:

1. la scheda **Diario → Giri** mostrava **20** giri (`hist.slice(0,20)`), anche con
   150 nel telefono — il commento accanto diceva «li ha tutti»;
2. i giri oltre i 150 non si vedevano **da nessuna parte**: il Diario lavora solo
   su quelli del telefono;
3. `pushLocalHistoryToCloud` leggeva **tutta** la raccolta `storico`, lapidi
   comprese, a ogni apertura, più altri 300 di `restoreHistoryFromCloud`. Con
   2.000 giri: **2.300 letture** a ogni apertura (misurato dal banco).

### Commit o modifica che lo affrontava

**Nessun commit ha mai tolto il limite di 150.** `git log -S HISTORY_MAX` su tutti
i rami: la costante non è mai cambiata. Quello che la release del 20/09 conteneva
è `2ceb5d4` (punto 4): **il riepilogo permanente** — record e totali — veniva
ricostruito dai 150 giri rimasti, e chi ne aveva di più perdeva record e totali
aprendo l'app su un secondo telefono. `2ceb5d4` lo trasforma in una somma che si
aggiunge (`arctrail3d_lifetime_visti_v1`), con `banco-riepilogo.js`. Era una
correzione giusta, ma di un'altra cosa: il riepilogo, non l'elenco.

### Stato dopo il rollback

- in **produzione** (`main` = `7b0ffe9`): il limite c'è, il riepilogo si rifà dai
  150 (la correzione di `2ceb5d4` è stata annullata dal revert insieme al resto);
- nel **ramo** (nato da `bae26e8`): la correzione del riepilogo c'è, e da oggi
  anche quella dell'elenco (sotto).

### Soluzione adottata

Non «tutto senza limite»: **paginazione a due livelli**, compatibile con quello
che c'è.

1. **Giri del telefono, 20 alla volta**: «Mostra altri giri (n)». Nessuna
   lettura dal cloud, sono già lì.
2. **Giri più vecchi dei 150, dal cloud, 30 alla volta, solo a richiesta**:
   «Carica i giri più vecchi». Query `orderBy("date","desc").startAfter(cursore)
   .limit(30)` — il cursore riparte dal giro più vecchio già visto. Aprire il
   Diario costa esattamente quanto prima: niente scende da solo.
   - restano **in memoria**, non in `localStorage`: il telefono continua a
     tenerne 150, e lo spazio non cresce;
   - niente doppioni (un giro già nel telefono, già sceso, o sepolto non entra);
   - non toccano record e totali: si guardano, si aprono, si possono cancellare
     (con la stessa lapide degli altri);
   - senza rete lo dice, e il tasto resta; in modalità locale il tasto non c'è.
3. **`pushLocalHistoryToCloud` chiede per nome** solo i giri del telefono e le sue
   lapidi, a blocchi di 30 (`FieldPath.documentId() in [...]`): le risposte che le
   servono sono le stesse, la domanda è più stretta. Con 2.000 giri si passa da
   2.300 a ≤ 450 letture per apertura.

`HISTORY_MAX` resta 150. Il Diario non è stato ridisegnato: due tasti in fondo
all'elenco che c'era.

### Test

`tests/banco-storico-150.js` (nuovo, nel giro): **38 ✓** sul ramo; sulla release
**18 ✗**.

| caso | cosa si prova |
|---|---|
| 149 / 150 / 151 giri | all'apertura i 20 più recenti; scorrendo si vedono **tutti**; ordine cronologico; nessun doppione; nel telefono al massimo 150 |
| il 151° tirato davvero | nel telefono restano 150, sul cloud 151, il più vecchio **non** viene cancellato dal cloud, e dal Diario ci si arriva |
| 2.000 giri | aprire l'app ≤ 450 letture (release: 2.300); «Mostra altri» nessuna lettura; «Carica più vecchi» **30** letture per tocco; 270 in fila senza buchi né doppioni; spazio nel telefono fermo a 150; il dettaglio di un giro vecchio si apre |
| lapidi | un giro cancellato non ricompare; cancellare un giro vecchio lascia la lapide |
| rete che manca | lo dice, il tasto resta, i 150 restano; al tocco dopo arrivano |
| modalità locale | i 150 del telefono tutti visibili, nessun tasto inutile |

`firebase-finto.js` ha imparato tre cose, perché prima non le sapeva e un difetto
lì dentro non si sarebbe visto: `startAfter` (era un no-op), `FieldPath.documentId()`
e il conteggio delle letture (`window.__letture`).

### Grandi quantità di dati

| | prima | adesso |
|---|---|---|
| letture a ogni apertura, 2.000 giri | 2.300 | ≤ 450 (300 di `restore` + ≤ 150 + lapidi locali) |
| letture per aprire il Diario | 0 | 0 |
| letture per vedere 30 giri vecchi | impossibile | 30 |
| giri in `localStorage` | 150 | 150 |
| giri in memoria | 150 | 150 + quelli chiesti in questa sessione |

### Quello che resta, e non è stato toccato

- **Chi non ha un account** (solo modalità locale) oltre i 150 perde i più
  vecchi: non esiste un cloud da cui riprenderli. Il conteggio resta nel
  riepilogo permanente. Alzare il limite per loro o avvisarli è una **decisione**,
  non una correzione.
- «Cancella storico» cancella i giri del telefono (fino a 150), come prima: quelli
  più vecchi restano sul cloud e il Diario li può ancora caricare. Era così anche
  prima, ma prima non si vedevano.
- Le statistiche della scheda (giri, media, record) sono calcolate sui giri del
  telefono più il riepilogo permanente, come prima: i giri caricati dal cloud
  non le cambiano.

---

## Giro completo e timbri (21/09/2026, sul ramo)

- `sh tests/controlla-tutto.sh`: **64 banchi, 2801 prove, 0 cadute — TUTTI PASSATI**
  (compresi `banco-regole` e `banco-finestra` sull'emulatore).
- `sh tests/lancia-e2e.sh`: **18 passate, 0 fallite**.
- Timbri: `app.html` `2026-09-21-avvio-storico` (nato da `2026-09-18-campi-fiarc`,
  cioè quello online); `sw.js` `arctrail3d-v168` (nato da `v166`, online). **Non
  `v167`**: è stata online mezz'ora il 20/09, e un telefono che l'ha presa non
  prenderebbe un'altra `v167` come nuova. Regole e Functions: invariate rispetto
  alla release (`2026-09-20-visibilita`).
- Cambiati anche, solo nei banchi: `banco-avvio.js` (la prova statica di
  `authState` ora accetta `firebaseInArrivo`) e `firebase-finto.js` (`startAfter`,
  `FieldPath.documentId()`, conteggio letture).

## Cosa provare col telefono (non l'ha provato nessuno)

Quando si pubblicherà — **una componente alla volta**, e prima il **sito**, perché
la correzione sta tutta in `app.html` e le regole di produzione la accettano
(provato) — le prove sono queste, in quest'ordine, e la prima è un **cancello**:

1. **CANCELLO.** Telefono già usato, con rete: l'app si apre **senza** la fascia
   «Stai lavorando solo su questo telefono». Si tira un giro breve, si chiude, e
   nella schermata finale lo stato dice **salvato** (non «in coda», non
   «errore»). Poi lo si ritrova su un secondo dispositivo o dal computer. Se
   fallisce: **stop, nessun altro deploy.**
2. Pubblicare un allenamento aperto: compare nell'elenco del telefono, e da un
   altro account compare (o no, secondo la visibilità — con le regole di oggi la
   visibilità «solo club» è ancora un filtro dell'app).
3. Telefono nuovo (o dati del sito cancellati): si arriva alla schermata
   d'accesso, mai «Connessione non riuscita».
4. Diario → Giri: «Mostra altri giri», e — solo per un account con più di 150
   giri — «Carica i giri più vecchi».
5. Solo DOPO, e separatamente: Functions (`claimCompagnia`) e poi regole
   (`2026-09-20-visibilita`), ognuna col suo giro di prove, come nel runbook del
   20/09 (`git show bae26e8:docs/ROLLOUT-2026-09-20.md`).
