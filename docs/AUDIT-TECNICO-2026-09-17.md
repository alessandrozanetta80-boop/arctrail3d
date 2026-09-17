# AUDIT TECNICO — 17/09/2026

*Sessione autonoma sul computer nuovo. Tutto quello che c'è qui è **misurato su
questa macchina**, non dedotto: dove non si è potuto misurare, c'è scritto
BLOCCATO e perché. Non è stato fatto nessun deploy, non è stato toccato
Firebase remoto, non è stato modificato `main`.*

**Cosa è cambiato nei file: due.** Questo documento, e **una riga in
`.gitignore`**: `firebase emulators:exec` scrive `firestore-debug.log` nella
radice del repository, e non era coperto da nessuna regola — la prima volta che
qualcuno lancia l'emulatore si ritrova un file di diario da committare per
sbaglio. `app.html`, `sw.js`, `functions/index.js`, `firestore.rules`, i banchi
e `package.json` **non** sono stati toccati.

---

## 1. Toolchain del PC nuovo

| strumento | versione | nota |
|---|---|---|
| git | 2.55.0.windows.5 | `core.autocrlf=true` di sistema: blob LF su GitHub, copia di lavoro CRLF, `git status` pulito |
| node | v24.21.0 | |
| npm / npx | 11.19.0 | |
| python | 3.14.0 | risponde a `python` e `py`, **non** a `python3` |
| java | **21.0.12** *(era 17.0.17)* | installato oggi, vedi sotto |
| firebase-tools | **15.30.1** | installato oggi |
| gh | 2.101.0 | |
| claude | 2.1.274 | |
| jsdom / playwright | 30.0.1 / 1.62.1 | dal `package.json`, lockfile **non** toccato |
| Chromium Playwright | 151.0.7922.34 | installato oggi: 20 banchi su 31 lo vogliono |

**Installato oggi, e perché:** Chromium di Playwright (senza, due terzi della
suite non parte); `firebase-tools` (serviva l'emulatore); **JDK 21 Temurin**
perché `firebase-tools` 15 rifiuta Java < 21 con un messaggio esplicito —
*«firebase-tools no longer supports Java version before 21»*. Il pacchetto
winget non ha uno scope utente, quindi il JDK è lo **zip ufficiale Adoptium
estratto in `%LOCALAPPDATA%\Programs\jdk-21.0.12.1+1`**: niente tocca il
sistema, e l'emulatore si lancia impostando `JAVA_HOME` su quella cartella.
Identità Git globale impostata (non esisteva alcun `~/.gitconfig`).

---

## 2. Test

Tre esecuzioni complete, stessa macchina, stessa revisione.

| giro | durata | banchi | esito |
|---|---|---|---|
| `PAR=1` | **7m 05s** (425 s) | 31 locali | 1 rosso atteso (C30), 2 in attesa |
| `PAR=1 ESTERNI=1` | **8m 00s** (480 s) | 31 + `banco-porta` | 2 rossi: C30 + `banco-porta` |
| `PAR=2` | **5m 44s** (344 s) | 31 locali | 1 rosso atteso (C30), 2 in attesa |
| `PAR=4` | **4m 23s** (263 s) | 31 locali | 1 rosso atteso (C30), 2 in attesa |

**Il parallelo conviene, e non costa niente in affidabilità.** Da `PAR=1` a
`PAR=2` si risparmiano 81 secondi (−19%), da `PAR=2` a `PAR=4` altri 81 (−24%);
in tutto **−38%**. I tre giri producono un'uscita di **1622 righe identiche**:
stesse 23 righe «passate, 0 fallite», stesse 2 in attesa, stesso unico rosso.

**La configurazione consigliata per questo PC è `PAR=4`** per il lavoro di tutti
i giorni, e `PAR=1` prima di una consegna STANDARD o CRITICA, come dice la
regola 23 — non perché qui serva, ma perché la regola serve altrove. Il runner
non è stato toccato.

**Niente flaky su questa macchina.** Le tre esecuzioni locali danno lo stesso
identico insieme di rossi: il C24 di `STATO.md` — «in parallelo qualche banco
dice no, e ogni giro è un banco diverso» — **non si è riprodotto qui**. Non
vuol dire che sia chiuso: vuol dire che su questo hardware non si vede.

**La fragilità CRLF è chiusa.** Nessun banco usa `split("\n")`; gli unici due
`gm` (in `banco-lingue.js`) passano su questa copia, che è CRLF. Provato due
volte oggi.

---

## 3. Emulatori — `banco-regole.js` torna riproducibile

**Classificazione: A — test valido e riproducibile.** Girato oggi, **78/78
passate**, con l'emulatore Firestore vero.

```
JAVA_HOME=%LOCALAPPDATA%\Programs\jdk-21.0.12.1+1
npm install --no-save @firebase/rules-unit-testing
npx firebase emulators:exec --only firestore --project demo-arctrail "node tests/banco-regole.js"
```

Tre cose lo tenevano fuori, e oggi sono tutte e tre risolte:

1. **Java.** Serve il 21, non il 17 (§1).
2. **Il login.** `firebase emulators:exec` senza `--project` chiede
   l'autenticazione. Con **`--project demo-arctrail`** (prefisso `demo-`) gira
   completamente offline: nessun account, nessun progetto vero toccato.
3. **La libreria.** `@firebase/rules-unit-testing` non è in `package.json`.
   Oggi è stata installata con `--no-save` apposta per non toccare i manifest.

*Resta una decisione:* se rientri nella suite serve la libreria in
`package.json` (dev), e il giro completo passerebbe da ~7 a ~8 minuti. Il banco
non è stato aggiunto a `controlla-tutto.sh`.

---

## 4. `banco-porta` — la causa non è la rete

**Rete verificata prima di lanciarlo, da questo PC:** `gstatic.com` HTTP 200 in
0,47 s, `arctrail3d.com` HTTP 200, `raw.githubusercontent.com` HTTP 200.

**Risultato: 20 fallimenti**, «la porta non c'è proprio» in tutte e nove le
lingue e su tutte e due le larghezze, più i due tasti verso la vetrina.

**Causa finale, misurata e non dedotta.** Riprodotto un caso singolo con la
console aperta: **0 richieste fallite, 0 errori JS, `firebase` caricato**, e
l'app disegna comunque «Connessione non riuscita». Stesso risultato su
`file://` e su `http://127.0.0.1`, a 900 ms e a 6 secondi. Quindi non è la
rete, non è il browser headless, non è il dominio autorizzato.

La catena è questa, tutta dentro `app.html`:

```
banco-porta mette DEV_MODE = true   e uno stato con profile:null
    -> if(DEV_MODE || !fbVivo()){ firebaseReady = false; }      (riga ~5561)
    -> backendPronto() = !!firebaseReady && !!auth && !!db      = false
    -> telefonoConfigurato() = false  (niente profilo, niente storico)
    -> if(!backendPronto() && !telefonoConfigurato()) -> firebaseErrorScreen()
```

Il guardiano che intercetta è quello nato il **29/08/2026** («su un telefono
vergine non si finge un account»). `banco-porta` è del **25–26/08**: è stato
scritto prima che quella porta esistesse, e da allora non può più arrivare alla
schermata che vuole misurare — **con o senza rete**.

**La controprova, fatta oggi.** Stesso file, stesso browser, stessa rete,
stesso `DEV_MODE`: cambia solo lo stato iniziale.

| stato | `.porta` | cosa si vede |
|---|---|---|
| `profile:null`, nessuno storico *(come il banco)* | **no** | «Connessione non riuscita» |
| con un profilo | no | si entra dritti nella Home: la porta è già passata |
| **senza profilo, ma con uno storico** | **sì** | la porta vera, due tasti nella coppia, titolo giusto |

Quindi la variabile che decide è `telefonoConfigurato()`, e la riga che
rimetterebbe in piedi il banco è **uno storico finto in `localStorage`** — non un
profilo, che lo farebbe saltare oltre la schermata da misurare.

**Classificazione: D — problema reale, ma del banco, non dell'app.** Il
comportamento dell'app è quello voluto e documentato. La riga del banco da
guardare è lo stato iniziale (`profile:null`): gli altri banchi passano perché
`copia-dev.js` inietta anche un utente finto e il loro stato ha un profilo.

*Non è stato corretto:* cambiare un banco per farlo passare è esattamente
quello che la sessione vietava, e la scelta fra «dare un profilo al banco» e
«far provare davvero la porta a chi non ha niente» è una decisione, non una
pulizia.

---

## 5. Push — cosa è dimostrato e cosa no

`banco-push.js` passa (22 prove) in tutti e tre i giri.

**Dimostrato localmente:** il server mette titolo, corpo e i campi di
instradamento dentro `data`; `sw.js` legge `d.title || n.title`; la deduplica
guarda il **tag** e non le parole, quindi due avvisi diversi che si somigliano
non si mangiano a vicenda; il gestore del clic esiste e chiude l'avviso.

**Trovato guardando la catena intera** (non lo copre nessun banco):

- **il server non scrive mai `data.link`** — l'unica occorrenza di `link` in
  `functions/index.js` è `fcmOptions: { link: "https://arctrail3d.com" }`;
- **`sw.js` costruisce `data:{ link: d.link || "/" }`** → il link è **sempre
  `/`**;
- **`sw.js` non legge mai `apri`, `adId`, `clubCode`**: i tre campi aggiunti il
  17/09 arrivano al telefono e lì si fermano.

Quindi **il tocco su un avviso porta sempre alla radice**, che dal 25/08 è la
**vetrina**. Ad app installata la vetrina salta all'app da sola (lo prova
`banco-vetrina`), quindi si arriva — con un passo in mezzo. Da browser si
resta sulla vetrina. La destinazione vera la risolve `destinazioneNotifica()`
**dentro** l'app, leggendo il documento Firestore, non l'avviso.

*Non toccato:* la sessione vietava di modificare le push.

**Solo dopo il deploy:** che FCM consegni davvero, che il token sia valido, e
quale dei due percorsi (SDK che disegna da sé / `onBackgroundMessage`) prenda
quel telefono. **Solo con un telefono in mano:** l'avviso ad app chiusa, e dove
finisce il dito.

---

## 6. S26 / responsive

`banco-safe-area` passa (10 prove). Misurato oggi sulle quattro larghezze
richieste, con e senza una tacca simulata da 47 px:

| larghezza | overflow | testata | salto allo scorrere | barra in fondo |
|---|---|---|---|---|
| 390×844 | 0 px | top 0, primo testo a 19 | **0 px** | 776→844 su 844 |
| 412×915 | 0 px | top 0, primo testo a 19 | **0 px** | 847→915 su 915 |
| 360×800 | 0 px | top 0, primo testo a 19 | **0 px** | 732→800 su 800 |
| 430×932 | 0 px | top 0, primo testo a 19 | **0 px** | 864→932 su 932 |

Con una tacca simulata da 47 px, su tutte e quattro: **il primo testo passa da
19 a 66**, cioè scende di **esattamente 47 px — una tacca, contata una volta**,
e il salto allo scorrere resta **0**. La barra in fondo finisce sempre esatta sul
bordo dello schermo, mai oltre, e le sue quattro voci non sono mai coperte né
più piccole di 44 px.

Nessun overflow orizzontale da nessuna parte. Nessuna media query
Samsung-specifica introdotta: non serviva.

**Il limite resta quello noto:** `env(safe-area-inset-top)` non si imposta da
fuori, quindi la tacca si simula riscrivendo la proprietà. La prova vera è
l'app **installata** sull'S26, in verticale, scorrendo.

---

## 7. Offline / service worker

`APP_SHELL` elenca 11 file: **esistono tutti**. `CACHE_NAME` è
`arctrail3d-v159`, `CACHE_PARENT` `v158`, coerenti con `BUILD_STAMP`
`2026-09-17-safe-area`. `activate` cancella ogni cache che non sia quella
corrente; `skipWaiting` + `clients.claim` ci sono.

Provato davvero, servendo il repository su HTTP e poi staccando la rete:

**16 sì su 17.** Il service worker si registra, diventa attivo e riempie la
cache con **17 voci** in `arctrail3d-v159` (gli 11 di `APP_SHELL` più `./` e le
cinque librerie del CDN). Staccata la rete:

- `app.html` risponde **200 senza interpellare il server**: viene dalla cache;
- l'app **disegna** — compare la schermata di benvenuto, «Il segnapunti per il
  tiro con l'arco 3D»;
- **`compagnie-data.js` c'è: 4950 società leggibili offline** (era il difetto
  chiuso il 29/08, ed è ancora chiuso);
- una navigazione sconosciuta ripiega sulla **vetrina**, `marketplace.html`
  ripiega sull'**app**: esattamente le due regole scritte in `ripiego()`;
- **nessun errore JS** che non sia la rete assente.

L'unico «no» è una soglia mia, non un difetto: contavo più di 20 nodi dentro
`#app` e ce ne sono 18, perché la schermata di benvenuto è volutamente povera.

*Questa prova non è un banco del repository: è uno script di sessione. Se
diventasse un banco servirebbe un server HTTP nel giro — `banco-porta` ne ha già
uno, sulla 8731; questo usava la 8732 per non pestargli i piedi.*

**Osservazioni, non bug:**

- `marketplace.html` **non è in `APP_SHELL`**, ma `ripiego()` manda le sue
  navigazioni su `app.html`: senza rete il mercatino non è il mercatino. È
  coerente con «il mercatino è chiuso a chi non è collaudatore», ma è una cosa
  da sapere.
- `firebase-messaging-sw.js` non è precaricato, e non deve esserlo: è una riga
  che fa `importScripts("./sw.js")`.
- Le cinque `vetrina-*.webp` e `favicon.ico` restano fuori di proposito.

`sw.js` **non è stato toccato**: non è emerso nessun bug oggettivo.

---

## 8. Accessibilità — lista per priorità

Audit statico (jsdom) su `index.html`, `app.html`, `marketplace.html`,
`presentazione.html`: **zero** bottoni senza nome, zero campi senza etichetta,
zero `img` senza `alt`, zero `tabindex` positivi. *Il markup servito è quasi
vuoto: l'app si disegna da JS, quindi questo numero vale poco.*

Audit sull'app **disegnata** (390×844):

| | |
|---|---|
| bottoni visibili | 11, **tutti con un nome accessibile** |
| aree di tocco sotto i 44 px | **0** |
| campi senza etichetta | 0 (nella Home non ce ne sono) |
| `img` senza `alt` | 0 |
| `tabindex` positivi | 0 |

**CRITICO:** niente.

**MEDIO — due cose, e nessuna è dimostrata come rotta:**

1. **Il focus da tastiera non è stato misurato.** `app.html` ha 6 regole
   `:focus-visible` e **3 `outline:none`**: la sonda non è riuscita a leggere lo
   stile dello pseudo-stato, quindi non posso dire se quei tre `outline:none`
   siano coperti da un `:focus-visible` che rimette un segno. Va guardato con un
   Tab vero, non contato.
2. **La copertura di questo audit è la sola Home.** L'app si disegna da JS:
   schermate come il giro, la chat e il mercatino non sono state guardate.

**BASSO:** l'audit statico sul markup servito (`index.html`, `app.html`,
`marketplace.html`, `presentazione.html`) è a zero su tutto, ma vale poco
proprio perché quel markup è quasi vuoto.

---

## 9. Performance

| file | peso |
|---|---|
| `app.html` | 1 759 170 byte — **79% JS in linea**, 20% CSS, 0,3% HTML |
| `compagnie-data.js` | 991 332 byte |
| `marketplace.html` | 346 953 byte |
| `index.html` | 130 924 byte |
| `logo.jpg` | 260 968 byte — **ed è in `APP_SHELL` insieme a `logo.webp` (28 346)** |
| `icon-512.png` | 265 632 byte |

**Non bloccante:** i cinque SDK Firebase e `compagnie-data.js` sono tutti
`defer`. Nessuno script blocca il disegno.

**Quick win, in ordine di resa:**

1. **`preconnect` verso `www.gstatic.com`.** Oggi ci sono solo quelli per
   `fonts.googleapis.com` e `fonts.gstatic.com`; i cinque SDK arrivano da
   `www.gstatic.com` e pagano la stretta di mano per intero.
2. **`logo.jpg` in `APP_SHELL`.** 261 KB precaricati accanto ai 28 KB del
   `.webp`, che fa lo stesso mestiere. Da verificare chi usa ancora il `.jpg`
   prima di toglierlo.
3. **`icon-512.png` è 266 KB**, più del doppio della sua versione maskable.

**Da non toccare:** la dimensione di `app.html` (è C13 in `STATO.md`, e
spezzarlo cambia il modello di caricamento offline) e i `clamp()` di C30, che
sono tipografia fluida, non sporcizia.

---

## 10. Sicurezza — dipendenze

`npm audit` in radice: **0 vulnerabilità**.

`npm audit` in `functions/`: **8 moderate, 0 high, 0 critical**, e sono **una
sola cosa**.

| | |
|---|---|
| **pacchetto** | `uuid`, transitivo sotto `firebase-admin` |
| **difetto** | *Missing buffer bounds check in v3/v5/v6 when `buf` is provided* |
| **runtime o dev** | runtime (`firebase-admin` è una delle due dipendenze vere) |
| **sfruttabile da noi** | **no.** Le sette funzioni non chiamano `uuid` e non passano mai un `buf`. Gli altri sette avvisi (`@google-cloud/firestore`, `@google-cloud/storage`, `gaxios`, `google-gax`, `retry-request`, `teeny-request`) sono lo stesso `uuid` contato lungo la catena |
| **aggiornamento** | `npm audit fix` risolve, ma tocca `firebase-admin` |
| **rischio regressione** | **alto rispetto al guadagno**: si cambierebbe l'SDK del backend per un difetto non raggiungibile, e il codice nuovo non è ancora in produzione |

**Raccomandazione: non aggiornare adesso.** Da rivedere quando `firebase-admin`
si aggiorna per un motivo suo. Nessun `npm audit fix` è stato eseguito.

---

## 11. Archive — e una cosa da decidere subito

`archive/README.md` classifica già tutto, e regge. Riletto e riclassificato:

| file | classe |
|---|---|
| `hub-profilo-blocco1_2026-08-30_non-pubblicato.zip` | **4 — da decidere.** Mai entrato in git; 3 righe su 109 sono nell'app pubblicata |
| `voce-diario-vetrina-nove_2026-08-24_mai-incollata.md` | **3 — utile non integrato.** 1 riga su 110 in `NOTE-DESIGN.md` |
| `REGOLE-LAVORO_copia-divergente_2026-08-30.md` | **2 — superato.** La copia valida è `docs/REGOLE-LAVORO.md` |
| `LEGGIMI-PRIMA-freeze_2026-08-29.txt` | **3 — utile non integrato**, per l'unica riga che conta: lo smoke test offline non risulta mai fatto. *Oggi quella prova è stata fatta (§7)* |
| `LEGGIMI-icone_2026-08-28.md` | **1 — già integrato** |
| `vetrina-anteprima_2026-08-25.html` | **5 — eliminabile in futuro.** Ha `noindex` |
| `ArcTrail3D-Compagnie_build-2026-07-31.html` | **5 — eliminabile in futuro.** Nessun `noindex` |
| `prova-mercatino_2026-08-28.html` | **5 — eliminabile in futuro.** Nessun `noindex` |

**⚠️ `archive/` è servito da arctrail3d.com, ed è indicizzabile.** Verificato
oggi con `curl`:

```
https://arctrail3d.com/archive/README.md                              -> 200
https://arctrail3d.com/archive/ArcTrail3D-Compagnie_build-2026-07-31.html -> 200
https://arctrail3d.com/archive/hub-profilo-blocco1_..._non-pubblicato.zip -> 200
```

Quindi **una copia intera dell'app di luglio è online e indicizzabile**, e uno
zip di lavoro mai pubblicato si scarica da chiunque. `robots.txt` dice
`Allow: /`. Il `README` stesso lo scrive — ma scriverlo non lo risolve.

**La riga che lo chiude, quando decidi:** `Disallow: /archive/` in
`robots.txt`. Non è stata aggiunta: la sessione vietava di toccare la SEO.

Niente è stato reintegrato.

---

## 12. ASA / IBO — architettura, zero numeri

L'innesto esiste già ed è pulito. Dal codice di oggi:

- **`GAME_MODES`** ha 20 chiavi (`training`, `round3d`, `percorso`, `tracciato`,
  `battuta`, `fitarco3d`, `ifaa_3d`, più le coppie nazionali). Circuiti citati
  nel blocco: `fiarc`, `wa`.
- **`FEDERATIONS`** ha 19 voci; **`PROFILE_FEDERATIONS`** le rispecchia con
  `{code,label}` — e `controlla-token.js` incrocia già le due liste.
- **`scoringVersion`** non è un campo di `GAME_MODES`: è la **marca sul giro
  salvato**, e `modoDelGiro(modeKey, scoringVersion)` traduce il legacy
  (`ifaa_3d` senza marca → `ifaa_3d_v1`). *L'assenza del campo È
  l'informazione.*
- Lo storico è `arctrail3d_storico_v1`, i record `arctrail3d_lifetime_v1` con
  chiave `nome|modoDelGiro(...)`.

**Checklist ASA** — ogni riga ha già il suo posto nel codice:

| # | cosa | dove | dato |
|---|---|---|---|
| 1 | voce `asa_3d` con la sua tabella `scoring` | `GAME_MODES` | **DA VERIFICARE SU FONTE UFFICIALE** |
| 2 | `scoringVersion` iniziale | costante accanto a `IFAA_SCHEMA` | si sceglie, non si verifica |
| 3 | zone e raggi | `ZONES_*` / `RADII_*` | **DA VERIFICARE SU FONTE UFFICIALE** (l'anello da 14 esiste? 12/10/8/5?) |
| 4 | circuito `asa` | `CIRCUITI` | — |
| 5 | federazione ASA | `FEDERATIONS` **e** `PROFILE_FEDERATIONS` | — |
| 6 | USA in `COUNTRY_LIST` / `COUNTRY_FEDERATIONS` | — | — |
| 7 | 4 chiavi × 9 lingue | `tools/genera.py` + `dizionario-*.py` | mai a mano nell'HTML |
| 8 | bersagli per giro, frecce per bersaglio | `GAME_MODES` | **DA VERIFICARE SU FONTE UFFICIALE** |
| 9 | classi e divisioni | non esistono nel profilo (§13) | **DA VERIFICARE SU FONTE UFFICIALE** |
| 10 | banco del barème sul modello di `banco-ifaa.js`, con `--sabota` | `tests/` | **prima dei numeri** |

**Checklist IBO:** identica riga per riga, con `ibo_3d`, circuito `ibo`, e gli
stessi quattro **DA VERIFICARE SU FONTE UFFICIALE** (11/10/8/5? bersagli?
frecce? classi?).

**Nel repository non esiste nessuna fonte ASA né IBO.** Non è stato inventato
nessun numero. Il precedente vale come avvertimento: il 28/08 `ifaa_3d`
portava il barème dell'Animal Round — numeri veri, gara sbagliata.

**Migrazioni:** non servono. Servirebbero solo se cambiasse un barème **già
pubblicato**; ASA e IBO nascono nuovi.

---

## 13. SEO USA / internazionale

**Lo stato, verificato pagina per pagina:**

| | |
|---|---|
| `canonical` | su tutte le pagine indicizzabili (10 su 12); mancano su `marketplace.html` e `elimina-account.html`, che sono `noindex` — **corretto così** |
| `hreflang` | solo `index.html` (9 lingue + `x-default`), `privacy.html` e `termini.html` (it/en + `x-default`). **Le cinque pagine dei regolamenti non ne hanno** |
| `sitemap.xml` | 10 URL, **nessun `xhtml:link` alternate** |
| `?lang=` | solo lato client |
| `<html lang>` | `it` su **tutte** le pagine, anche quelle servite in altre lingue |

**Il difetto tecnico vero, dimostrato oggi.** Gli `hreflang` di `index.html`
puntano a `https://arctrail3d.com/?lang=xx`, ma quella pagina dichiara
`canonical = https://arctrail3d.com/`. Un `hreflang` che punta a una URL il cui
canonical è un'altra **viene ignorato**: le nove lingue si consolidano in una
sola pagina. *Non è un hreflang mancante: è un hreflang che si annulla da solo.*

**Struttura futura, quando si farà** (non fatta, non una pagina creata):

- tenere `?lang=` come preferenza a runtime;
- URL proprie **solo** alle pagine con contenuto proprio: le cinque dei
  regolamenti e `presentazione.html` → `/en/regolamenti-3d.html` ecc., generate
  dallo stesso `tools/genera-federazioni.py`;
- `canonical` **auto-referenziale per lingua**, altrimenti si ripete il difetto
  di sopra;
- `hreflang` reciproco completo + `x-default` sull'italiano, e alternate anche
  nella sitemap;
- `<html lang>` coerente per pagina;
- un solo `en`, non `en-US` + `en-GB`.

**`/usa/` non ha senso adesso**, e nemmeno `ASA scoring` / `IBO scoring`: sono
pagine che raccontano un punteggio che l'app non sa ancora calcolare. Prima il
barème (§12), poi la pagina. Niente doorway pages. **Non spostare** gli URL già
indicizzati.

---

## 14. Profilo / ranking — schema minimo

**Oggi, dal codice:** `federazioniScelte()` costruisce
`[{ code, tessera }]`, e finisce in `users/{uid}.federazioni`. Più federazioni
insieme **funzionano già**.

**Cosa manca davvero:** `classe` e `divisione` **non esistono nel profilo**:
vivono solo come dati d'iscrizione a una gara.

**Estensione retrocompatibile — si allarga la voce che c'è, nessuna collezione
nuova:**

```
federazioni: [{
  code, tessera,                 // esistono oggi
  categoria?, divisione?,        // per federazione, non globali
  idFederale?,                   // se la federazione ne pubblica uno
  ranking?: { valore?, posizione?, fonte, aggiornato }
}]
```

`fonte` distingue **dichiarato dall'arciere** da **importato**: senza, un numero
scritto a mano e uno ufficiale diventano indistinguibili. `aggiornato` è la
data: un ranking senza data invecchia in silenzio.

**Andamento separato per federazione: non serve nessun campo nuovo.** Ogni giro
porta già `modeKey` e `scoringVersion`; `GAME_MODES[modeKey].circuito` dice il
circuito, e `FEDERATIONS[x].garaModes` dice quali modi sono di chi. FIARC,
FITARCO, World Archery, IFAA e i futuri ASA/IBO si separano raggruppando lo
storico, come fa già `arctrail3d_lifetime_v1`.

**Da decidere PRIMA di scrivere codice:** `public_profiles/{uid}` oggi espone di
proposito solo nome mostrato, compagnia, bio, arco e quattro numeri — e le
regole hanno un `hasOnly`. Categoria, divisione e ranking sono dati personali:
va deciso **prima** cosa diventa pubblico, perché la regola lo impone, non lo
suggerisce. Firestore non è stato toccato.

---

## 15. Problemi bloccanti

1. **LOGIN NECESSARIO — Firebase CLI.** `firebase login:list` dice *No
   authorized accounts*; `firebase use` e `firebase projects:list` falliscono
   con *Failed to authenticate*. Serve `firebase login` dalle tue mani. **Non
   blocca l'emulatore** (§3), che gira con `--project demo-arctrail`.
2. **Le push non sono in produzione.** Il codice è in `main` dal 17/09 e non è
   stato pubblicato. È l'unico lavoro finito che non serve a nessuno.
3. **`banco-porta` non può passare** finché non si decide cosa deve provare
   (§4). Non è la rete.
4. **La tacca sull'S26** non si chiude da qui (§6).

## 16. Quick wins

| | costo | dove |
|---|---|---|
| `Disallow: /archive/` in `robots.txt` | una riga | §11 |
| `preconnect` verso `www.gstatic.com` | una riga in `app.html` (obbliga al timbro) | §9 |
| `banco-regole.js` nella suite | una riga in `controlla-tutto.sh` + la dipendenza dev | §3 |
| ~~`firestore-debug.log` in `.gitignore`~~ | **fatto oggi** | in questo ramo |
| il commento obsoleto a ~riga 4494 di `app.html` | si sana alla prossima modifica vera di quel file | roadmap §3.4 |

## 17. Ordine consigliato

1. **`firebase login` su questo PC** — un comando, e sblocca tutto il resto.
2. **Pubblicare le Cloud Functions** (`bash ~/pubblica.sh pushNotifica`) e
   provare una push ad app chiusa su un telefono vero.
3. **Guardare dove porta il dito** su quell'avviso (§5): è la cosa che nessun
   banco può dire.
4. **La tacca sull'S26 installata** — due minuti.
5. **`Disallow: /archive/`**, o cancellare quello che non serve più.
6. **Decidere `banco-porta`**: dargli un profilo, o farlo provare davvero la
   porta di chi non ha niente.
7. **`banco-regole.js` dentro la suite**, ora che è riproducibile.
8. **C30**, con calma e guardando l'app: è disegno, non pulizia.
9. **ASA**, ma solo col regolamento ufficiale sul tavolo. Prima il banco.
10. **IBO**, stesso metodo. Solo dopo, la SEO USA.
