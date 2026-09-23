# STATO-RIPRESA — ArcTrail 3D, mattina del 22/09/2026

Da qui si riparte. Il dettaglio sta nei tre documenti tecnici:
`ALLENAMENTI-2026-09-21.md` (registrazione e storico, tenuti separati),
`DIAGNOSI-PUSH-SAMSUNG-2026-09-21.md`, `RUNBOOK-DEPLOY-2026-09-22.md`.

Nella cartella **`00-ALESSANDRO-CHATGPT`** (radice del progetto, fuori da Git) gli
stessi documenti hanno nomi fissi: questo è `00-LEGGIMI-STATO-PROGETTO.md`, il runbook
è `01-RUNBOOK-DEPLOY.md`, gli allenamenti `02-ALLENAMENTI.md`, push e Samsung
`03-PUSH-SAMSUNG.md`, l'APK `04-APK.md` (scritto dallo script leggendo l'APK vero).
In Dropbox vanno tutti e cinque dentro `CONSEGNA_CHATGPT.zip`.

---

## DISTRIBUZIONE ARCTRAIL (dal 23/09/2026)

- **Tecnologia Android:** Trusted Web Activity, progetto `android/` generato da
  Bubblewrap (`@bubblewrap/core` 1.25.0). L'APK è un contenitore: apre
  `https://arctrail3d.com/app.html` a schermo intero con Chrome. L'app vera resta il
  sito: gli aggiornamenti web arrivano da soli, **l'APK si rigenera solo se cambiano
  icona, nome, colori o package**. Scelta perché ArcTrail è già una PWA completa
  (manifest, icone maskable, service worker, dominio proprio); Capacitor non serviva.
- **Package:** `com.arctrail3d.app` — definitivo, non si cambia più.
- **Firma ufficiale:** chiave `arctrail3d` (RSA 4096, PKCS12, 10000 giorni), creata il
  23/09/2026 in `C:\Users\Ale\.arctrail3d\signing\` (permessi solo per l'utente Ale).
  Password solo in `keystore.properties` in quella cartella. **Mai nel repository, mai
  in Dropbox.** Se la cartella si perde, nessun APK futuro aggiornerà quelli installati:
  **Alessandro deve farne una copia su chiavetta.**
- **SHA-256:** `2E:93:03:A4:B6:93:5D:28:BA:1A:C2:5D:37:D4:A3:20:DA:A9:DB:9B:1E:78:CB:D2:6D:81:48:E3:01:8D:9D:69`
  (lo stesso in `.well-known/assetlinks.json`, che lega l'APK al dominio: senza,
  l'app si apre con la barra dell'indirizzo). **Online dal 23/09** (push di `main`
  `0048d36`, solo sito, dopo la suite verde): HTTP 200, JSON valido, package e
  impronta giusti, confermati anche dall'API Digital Asset Links di Google. App e
  cassa invariate (`arctrail3d-v170`); `android/`, `tools/`, `docs/` a 404.
  **Functions e regole INVARIATE.**
- **Da provare a mano:** installare `ArcTrail3D.apk` su un Android (serve «installa
  app sconosciute») e controllare che si apra a schermo intero, senza barra
  dell'indirizzo. Nessun telefono era collegato: non provato su dispositivo.
- **APK corrente:** `ArcTrail3D.apk`, release firmata.
- **versionName:** `2026.09.23`
- **versionCode:** `1` (in `android/versione-apk.properties`, sale sempre).
- **Aggiornabile da vecchio APK: NO.** Il vecchio APK (package e firma mai ritrovati,
  vedi «APK (ricerca completa)» sotto) non si aggiorna: **QUESTO APK È PER NUOVE
  INSTALLAZIONI. NON AGGIORNA IL VECCHIO APK CON FIRMA DIVERSA.** Chi ha il vecchio lo
  disinstalla a mano e installa questo. Da oggi ogni APK nuovo aggiorna questo.
- **Comando automatico build:** `powershell -ExecutionPolicy Bypass -File tools\genera-apk.ps1`
  (controlla tutto, costruisce, verifica firma/package/versione, copia in Dropbox), poi
  si committa `android/versione-apk.properties` e `android/twa-manifest.json`.
  Consegna: `powershell -ExecutionPolicy Bypass -File tools\prepara-consegna.ps1`.
- **Dropbox** `C:\Users\Ale\Dropbox\PROGETTI\ArcTrail 3D\`, solo tre file:
  - APK: `ArcTrail3D.apk`
  - WEB: `ArcTrail3D-WEB.url` → `https://arctrail3d.com/app.html`
  - `CONSEGNA_CHATGPT.zip`: i cinque documenti `00`–`04`, nient'altro.

---

## ADESSO (22/09/2026, sera) — HOME + S26 PUBBLICATI (solo sito)

**Online:** `main` = `03b16d0`, app `2026-09-22-home-periodi`, cassa `arctrail3d-v169`.
Prima del push la suite era verde: 67 banchi, 2890 prove, 0 cadute, «TUTTI PASSATI».
Dopo il push: `controlla-base` IN PARI, `controlla-sito-pubblico` tutto a posto (file
interni a 404). **Functions e regole INVARIATE** (7 Functions e regole del 18/09).
Il push stavolta è passato da Claude Code, autorizzato dal file
`ARCTRAIL3D_CHIUSURA_HOME_S26_DEPLOY_SITO`.

- **Home.** Il riquadro «Questo mese» ora sceglie il periodo: Questo mese, 3 mesi,
  Stagione, 1 anno. Si apre toccando il titolo (il triangolino); la freccia a destra
  apre i dettagli come prima.
  - Le finestre sono quelle del Diario (31 giorni, 92 giorni, dal 1° gennaio) più
    1 anno (365 giorni), in una funzione sola per Home e Diario (`inizioPeriodo`).
  - La scelta resta sul telefono (`arctrail3d_home_periodo`), nessuna lettura dal cloud.
  - Con zero giri nel periodo compare «Nessun giro in questo periodo.».
  - «Ultimo giro» non cambia.
- **S26 Ultra.** Causa, fix e misure: `03-PUSH-SAMSUNG.md`, prima sezione.
  - Testata su una riga fino al 150% a 384 px (prima andava a capo dal 130%).
  - Porta di Allenamento a 92 px invece di 140 al 150%.
  - Il telefono di Alessandro resta identico.
- **Versioni.** App `2026-09-22-home-periodi` (genitore `2026-09-22-avvio-storico`),
  cassa `arctrail3d-v169`.
- **Test.** Nuovo `banco-home-periodi.js` (21 prove); `banco-font-scale.js` ha 67 combinazioni.
- **Banco delle regole.** `banco-finestra.js` distingue per nome le regole del ramo
  (`firestore.rules`) dalle regole live (`REGOLE_LIVE`, di default `1cd0652`, cioè il
  18/09). Se coincidono, si ferma. Quando le regole nuove andranno online, il default
  torna `main`.
- **Test reale Home: SUPERATO** sul telefono di Alessandro (22/09, sera).
- **S26 Ultra, dal telefono vero:** QHD+ 3120×1440, carattere «Predefinito», grassetto
  OFF, dimensione carattere e zoom schermo sui valori **standard**. Con la v169 le porte
  di Tira e la barra in basso sono a posto, **la testata era ancora su due righe**: il
  difetto non dipende da impostazioni estreme.
- **v170 (pronta, NON pubblicata): il fix della testata a quattro gradini.** Non più una
  soglia, ma lo spazio misurato: si scende di un gradino alla volta (spazi, bordi,
  marchio di un gradino più piccolo, sentiero via) e ci si ferma al primo che basta.
  Testata su una riga a 320, 336, 344, 352, 360 e 384 px dal 100% al 150%, con i quattro
  tasti sempre a 44 px. Dettaglio e misure: `03-PUSH-SAMSUNG.md`.
- **`?diag=s26`**: pannello con le misure vere del telefono, solo con quella query.
- **Test automatici:** `banco-font-scale` da 67 a 83 combinazioni; sabotaggio rosso.
- **Test reali da fare (adesso che è online).** Il S26 prende la v169 alla riapertura.
  Se il problema resta: niente fix alla cieca, servono gli screenshot e i valori del
  telefono.
  1. Home: cambio periodo.
  2. Home: il periodo resta dopo la riapertura.
  3. S26: testata.
  4. S26: porte di Tira.
  5. S26: barra in basso.

## Gate 1 (22/09/2026, 12:00)

**GATE 1 REALE SUPERATO.** Il sito del ramo `work/sicurezza-qualita-2026-09-22` è
online (`main` = `5f4878d`, push fatto a mano da Alessandro; app
`2026-09-22-avvio-storico`, cassa `arctrail3d-v168`; i file interni rispondono 404).
Test col telefono confermati da Alessandro: **nessuna fascia «solo su questo
telefono»; giro salvato; chiusura e riapertura riuscite; giro ancora presente;
sincronizzazione verificata sul secondo dispositivo.**
**Functions e regole restano INVARIATE** (7 Functions del 18/09, regole del 18/09):
gate 2 e gate 3 solo su decisione esplicita. Le sezioni qui sotto raccontano come si
è arrivati qui; dove dicono «non pubblicato», vale questa riga.

---

## Produzione (fino al gate 1)

**INVARIATA — NESSUN DEPLOY NOTTURNO.** È il rollback del 20/09, verificato il 21/09
file per file: sito = `7b0ffe9` (app `2026-09-18-campi-fiarc`, cassa `v166`), sette
Functions = `7b0ffe9` (`2026-08-28-notifica-verificata`), regole = `7b0ffe9`
(`2026-08-28-porte-verified`). Nella notte nessun comando di deploy, nessuna
scrittura su Firebase di produzione, nessun push su GitHub. Le prove con Firebase
hanno girato solo sugli emulatori, su un progetto `demo-*` che per costruzione non
può raggiungere la produzione.

---

## Registrazione allenamenti

- **Causa.** L'app della release del 20/09 partiva **prima** delle librerie
  Firebase (`defer`) e non le inizializzava mai (`956bf36`, fase 23): modalità locale
  per ogni telefono già usato, fascia «Stai lavorando solo su questo telefono», i
  giri restavano nel telefono. Nessuna regola e nessuna Function coinvolte.
- **Fix.** Solo l'avvio in `app.html`: «non ancora» non è più «mai»;
  l'inizializzazione avviene quando le librerie arrivano, anche in ritardo.
- **Test.** `banco-librerie-defer.js` (15/15; sulla release 8 rossi). Matrice reale
  3 app × 2 regole (`sh tests/lancia-e2e.sh`, 18/18): primo write, campi,
  ownership, offline→online, riapertura, allenamento «solo club», chi lo vede.
  Terzo asse, Functions vere (`sh tests/lancia-e2e-claim.sh`, 11/11).
- **Perché non si vedeva:** i banchi mettevano Firebase finto **prima** della
  pagina; l'ordine vero non l'aveva nessuno.

## Storico >150

- **Causa del limite.** `HISTORY_MAX = 150` nel telefono (dall'agosto); la scheda
  Giri ne mostrava **20**; oltre i 150 non si vedeva niente; ogni apertura leggeva
  **tutto** lo storico dal cloud. **Nessun commit ha mai tolto il limite**: `2ceb5d4`
  (release) correggeva il riepilogo permanente, non l'elenco — il revert l'ha tolto
  dalla produzione, nel ramo c'è.
- **Soluzione.** 20 alla volta dal telefono, poi 30 alla volta dal cloud a
  richiesta (`startAfter`), in memoria e non nel telefono; la sincronia chiede per
  id. Niente «tutto senza limite».
- **Test.** `banco-storico-150.js` 39/39 (149, 150, 151, il 151° tirato, 2.000 giri,
  ordine, doppioni, lapidi, rete che manca, modalità locale).
- **Prestazioni.** 2.000 giri: apertura ≤ 450 letture (prima 2.300); 30 letture per
  blocco; 270 righe ridisegnate in 186–268 ms a CPU ×4.

## Dati locali

- **Il 20/09 non si è perso niente.** La migrazione «di chi sono i dati» della
  release vive in `onAuthReady`, che con Firebase spento non è mai partito; i giri
  tirati nella finestra sono rimasti nella chiave di sempre, l'app del 18/09 li ha
  visti e caricati. Provato: 18/09 → release → 18/09 (`banco-dati-rollback.js`).
- **Rischio di domani, corretto.** Con l'app nuova la migrazione parte davvero, e i
  profili dei primi giorni (senza email, prima del 09/08) finivano «da parte»:
  riepilogo da 180 giri a 4, attrezzatura sparita dalla vista. Peggio: il tasto
  «Aggiungili al mio account» riprendeva solo i giri e **buttava** riepilogo,
  attrezzatura, lapidi e marchio IFAA. Adesso: «Aggiungili» riprende tutto senza
  contare due volte; e se il profilo messo da parte ha lo stesso nome utente e lo
  stesso nome dell'account appena entrato, i dati tornano da soli. Un altro account
  su un telefono condiviso resta fuori come prima. `banco-dati-rollback.js` 23/23
  (prima della correzione: 3 rossi).
- **Rischio che resta:** se si tornasse all'app del 18/09 DOPO che l'app nuova ha
  messo da parte i dati di un altro account, l'app del 18/09 non li vede (non
  conosce `arctrail3d_orfani_v1`). Non si cancellano: tornano con l'app nuova.

## File interni

- **Causa dell'esposizione.** Il sito è il repository (GitHub Pages + Jekyll).
  `_config.yml` con l'elenco `exclude` è nato il 19/09 nella release; il revert del
  20/09 l'ha tolto. **Oggi in produzione rispondono 200** `docs/`, `tests/`,
  `functions/index.js`, `firestore.rules`, `pubblica.sh`, `package.json`, e
  `archive/ArcTrail3D-Compagnie_build-2026-07-31.html` (un'app vecchia collegata al
  Firebase vero; le regole valgono comunque, lato server).
- **Fix preparato.** `_config.yml` nel ramo; `controlla-pubblicazione.js` ora simula
  l'uscita di Jekyll sui file tracciati e dice no a qualunque file non da sito
  (senza `_config.yml` escono 174 file, con 36); `.gitignore` tiene fuori le
  istruzioni di sessione `/ARCTRAIL3D_*.md`; su questo PC `.git/info/exclude`
  protegge i file riservati anche su `main`. `tools/controlla-sito-pubblico.js`
  guarda il sito vero dopo il gate 1 (oggi: 13 file interni a 200).
- **Da sapere:** il repository GitHub è **pubblico**. `_config.yml` toglie i file
  dal sito, non da github.com. I documenti riservati si proteggono solo non
  committandoli.

## Push

- **Diagnosi.** In produzione: un token per persona (l'ultimo dispositivo vince),
  nessuna `Urgency` (Android in Doze aspetta lo sblocco), token rinnovato solo
  aprendo l'app. Nel ramo tutto questo è già corretto (release, `3efd0b6`/`2d60c12`).
- **Fix della notte.** `invalid-argument` non spegne più tutti i dispositivi quando
  il difetto è nel messaggio (`banco-push` 46/46). Functions `2026-09-22-push-argomento`.
- **Resta:** `TEST REALE TELEFONO NECESSARIO` — app chiusa, telefono bloccato, due
  dispositivi, risparmio batteria di Samsung su Chrome.

## S26

- **Diagnosi.** Viewport, `text-size-adjust`, tacca e barra in basso già a posto
  (17–18/09). Misurato stanotte: sul viewport di un S26 Ultra la testata va a capo
  dal **130%** di testo (61 → 97 px, fino a 112 al 200%; zoom schermo 90 px).
- **Fix (22/09 sera, dopo le due foto; ramo non pubblicato).** Si toglie aria solo
  quando serve, senza toccare testo e tasti:
  - testata `stretta`: sentiero 1em, tasti 44×44 attaccati;
  - porte di Tira `porte-strette`: placca 40, spazi 8.
  - Risultato: una riga fino al 150% a 384 px; Allenamento 92 px invece di 140.
  - Oltre il 150%, o con zoom schermo e testo grande insieme, la testata resta su due
    righe (documentato).
- **Resta:** `TEST REALE S26 ULTRA NECESSARIO`, con i valori di «Dimensione
  carattere» e «Zoom schermo».

## Service worker / offline

- **Stato.** Tre salti provati col banco del salto di versione, dati e giro aperto
  compresi: **v166 → v168** (domani, dalla produzione), **v167 → v168** (chi ha
  preso la release), **v167 → v166** (il rollback vero del 20/09): 16/16 ciascuno.
  La cassa vecchia se ne va, senza rete si apre la versione nuova, lo storico non
  perde niente, il giro aperto si riprende senza ricarica sotto il dito. Le push non
  dipendono dalla cassa.
- **Test.** `banco-salto-versione.js` (con `VECCHIO=`/`NUOVO=`), `banco-italia-offline`,
  `banco-giro-sicuro`, `banco-esterni`, `banco-librerie-defer` — tutti nel giro.

## Suite finale (22/09, notte)

- `sh tests/controlla-tutto.sh`: **65 banchi, 2831 prove, 0 cadute — TUTTI PASSATI**.
  Include `banco-regole` e `banco-finestra` (emulatore), `banco-claim`, `banco-push`,
  i tre banchi nuovi (`librerie-defer`, `storico-150`, `dati-rollback`),
  `banco-font-scale` (67 combinazioni).
- Saltato: `banco-porta.js` (esterno, vuole la rete vera: `ESTERNI=1`).
- Da leggere a mano (non contano le prove): `controlla-token`, `banco-firme`,
  `prova-schermo`, mercatino. Letti: puliti.
- In attesa (voluto): 2 prove di `banco-ritorno` (brief del 30/08 mai pubblicato).
- Fuori dal giro, eseguiti: `sh tests/lancia-e2e.sh` **18/18**,
  `sh tests/lancia-e2e-claim.sh` **11/11**.

## Git

- Ramo di lavoro: **`fix/avvio-firebase-2026-09-21`**, solo locale (niente push).
- `main` = `origin/main` = `1cd0652` (il revert del 20/09), intatto.
- Il ramo contiene `main` con un merge `-s ours`: al gate 1 `main` avanza in
  fast-forward, senza stati intermedi.
- Working tree pulito; i file riservati e le istruzioni di sessione sono esclusi.
- Commit locali: quelli del 21/09 (`811c5f4`, `738cb24`) più quelli della notte —
  l'elenco preciso: `git log --oneline main..fix/avvio-firebase-2026-09-21`.

## Metodo di lavoro (dal 22/09/2026, come Adrenalina e Gestionale Comprensori)

- **Cartella locale:** `C:\Users\Ale\Desktop\PROGETTI\ArcTrail 3D` (prima
  `ArcTrail3D-Git`). È il repository: la fonte di verità del codice è GitHub.
- **`00-ALESSANDRO-CHATGPT/`** in radice: SOLO i documenti correnti (`00`–`04`), nomi
  fissi, fuori da Git e fuori dal sito. Si aggiornano, non si moltiplicano.
- **Dropbox** `C:\Users\Ale\Dropbox\PROGETTI\ArcTrail 3D\` (dal 23/09): SOLO
  `ArcTrail3D.apk`, `ArcTrail3D-WEB.url`, `CONSEGNA_CHATGPT.zip` — vedi «DISTRIBUZIONE
  ARCTRAIL» in cima. Niente mirror del repository, niente snapshot, niente sorgenti,
  niente storico di APK o ZIP. Nel sistema di backup ArcTrail ha `"Backup": false`.
- **A fine di ogni sessione sostanziale:** si aggiornano gli originali in `docs/`, poi
  `tools\prepara-consegna.ps1` (copie locali, ZIP, link, pulizia di Dropbox).
- Quello che c'era in Dropbox fino al 22/09 (mirror del 20/09 e uno snapshot) è
  stato spostato, non cancellato, in
  `C:\Users\Ale\Desktop\PROGETTI\_ARCHIVIO\ArcTrail 3D - Dropbox fino al 2026-09-22\`.

---

## Primo passo

Leggere `RUNBOOK-DEPLOY-2026-09-22.md` (in cima: lo stato del gate 1 e quale ramo
usare), e se si decide di procedere: **GATE 1, solo il sito, a mano**, poi i test
1–4 e 6 col telefono. Il 2 e il 3 sono il cancello.

---

## LAVORO AUTONOMO DEL 22/09

**Gate 1 precedente.** Tecnicamente pronto e verificato (precondizioni verdi,
suite 65/2831/0, e2e 18/18), **non pubblicato**: il fast-forward di `main` e il
push sono stati fermati dal controllo dei permessi di Claude Code come «deploy in
produzione». Produzione invariata (sito `v166`, verificato). Si fa a mano.

**Corretto davvero** (ramo `work/sicurezza-qualita-2026-09-22`, nato dal ramo fix):
- «Annuncia allenamento» dice «Pubblicato» solo col sì del server; rifiuto e rete
  assente detti chiaramente, dati mai persi (anche dopo un ridisegno), nuovo
  tentativo e doppio tocco senza doppioni — `banco-annuncia.js` 16/16 (prima 10 ✗);
- `sendNotification` valida `toUid` prima di usarlo come percorso — `banco-push`
  A3-bis (prima 2 ✗);
- prove aggiunte dove mancavano: TTL delle push; 13 confini delle regole (lapidi e
  cancellazioni nello storico altrui, proprietario falsificato, richiesta di
  gestione «in attesa», pannelli admin) — verdi, e rosse contro regole aperte;
  le carte di lavoro locali nel controllo di pubblicazione.

**Sicurezza trovata:** nessuna credenziale amministrativa in tutta la storia git
(service account, chiavi private, `.env`, token): **nessuna**; le `AIza…` sono la
configurazione web di Firebase, pubblica per natura. Regole: **nessuna falla** nei
confini provati. **Limite di prodotto, non corretto:** l'appartenenza a una
compagnia è autodichiarata (`users.compagnia` la scrive l'utente, la Function ne
fa un claim), quindi chiunque dichiari un club vede i suoi «solo club».
**Noto, non toccato:** `isAdmin()` non chiede `email_verified` (P3): prima di
stringerlo va controllato in console che l'email dell'admin sia verificata.
**Aperto:** il repository GitHub è pubblico; oggi il sito serve ancora i file
interni (si chiude col gate 1).

**App Check:** preparato e spento, protetto da `controlla-pwa`; non pronto per
l'obbligo — prerequisiti in `03-PUSH-SAMSUNG.md`. **Push:** ramo coperto da prove
(multi-dispositivo, token scaduto, payload invalido, solo `data`, Urgency, TTL,
`pushsubscriptionchange`, deduplica, tocco); resta `TEST REALE TELEFONO
NECESSARIO`. **Storico >150:** invariato, 39/39 nella suite.

**APK:** `APK NON GENERATO — ARCTRAIL È ATTUALMENTE PWA E NON ESISTE UNA PIPELINE
APK SUPPORTATA NEL PROGETTO.`

**Suite finale del ramo:** 66 banchi, 2869 prove, 0 cadute; e2e matrice 18/18;
claim con Functions vere 11/11.

**Non pubblicato:** sito, Functions, regole — niente. Nessun push.

**Da verificare a mano (massimo 5):**
1. Gate 1 a mano, poi test 2 e 3 (cancello);
2. «Annuncia allenamento» da telefono: pubblicato, e in modalità aereo il
   messaggio «NON è ancora online» senza perdere i dati;
3. push ad app chiusa, due dispositivi (dopo il gate 2);
4. S26 Ultra: testata su una riga?;
5. in console Auth: l'email dell'admin è verificata? (serve per stringere `isAdmin`).

---

## SESSIONE DEL 22/09, MATTINA (gate 1 e APK)

**Gate 1.** Test del ramo tutti verdi (suite 66 banchi / 2869 prove / 0 cadute; e2e
18/18; claim 11/11); `main` avanzato in fast-forward a `5f4878d`; push bloccato dal
controllo permessi di Claude Code e fatto a mano da Alessandro (`1cd0652..5f4878d`).
Verifica tecnica: `controlla-base` IN PARI (app, sw, vetrina, mercatino);
`controlla-sito-pubblico` tutti gli interni a 404, compresa la vecchia app in
`archive/`; sito a 200. **Test reali superati** (vedi «ADESSO» in cima).

**APK.** Vedi la sezione «APK» qui sotto, aggiornata alla ricerca completa.

## APK (ricerca completa, 22/09 pomeriggio)

> **Superato il 23/09:** c'è una pipeline APK nuova con firma nuova — vedi
> «DISTRIBUZIONE ARCTRAIL» in cima. Quanto sotto resta vero per il VECCHIO APK.

**`APK UPDATE NON GENERABILE: FIRMA ORIGINALE NON RECUPERATA.`**

- **Cercato**, in sola lettura: Desktop, Downloads, Documents, Dropbox, `PROGETTI` e
  `_ARCHIVIO`, tutto il profilo utente compresa `AppData` e le cartelle nascoste
  `.android`, `.gradle`, `.config` (niente `.bubblewrap`); tipi `*.apk`, `*.aab`,
  `*.jks`, `*.keystore`, `*.p12`, `*.pem`, `twa-manifest.json`, `assetlinks.json`,
  `android-package*`, `pwabuilder*`, `bubblewrap*`, `signing*`, `keystore*`,
  `arctrail*`; storia git di tutti i rami e testi (PWABuilder, Bubblewrap, TWA,
  package name, applicationId, keystore, firma).
- **Trovato:** nessun APK ArcTrail, nessun keystore di release, nessun artefatto
  TWA/PWABuilder/Bubblewrap. Solo: `~/.android/debug.keystore` (chiave di DEBUG
  standard di Android, novembre 2025), la chiave interna della cache di Gradle e
  file di log di OneDrive — nessuno serve a firmare ArcTrail;
  `Desktop\Fiarc3DTraining` è un'altra app (nativa Kotlin, `com.fiarc.training`).
  `NOTE-DESIGN.md` dice solo che un APK esisteva e andava rigenerato «con la stessa
  chiave di firma».
- **Telefono:** `adb` presente, nessun dispositivo collegato.
- **Quindi non noti:** package name, versionCode e certificato SHA-256 dell'APK
  installato; strumento usato allora.
- **Cosa manca esattamente:** la chiave di firma privata originale (con PWABuilder è
  `signing.keystore` più `signing-key-info.txt` nello ZIP scaricato allora,
  probabilmente sul PC precedente), oppure il telefono collegato via USB per leggere
  almeno package e certificato.
- **Da controllare prima di tutto:** se l'app sul telefono fosse stata installata da
  Chrome («Installa app»), è una **WebAPK** (`org.chromium.webapk.*`): si aggiorna da
  sola col sito, e non serve nessun APK. Lo si vede in Impostazioni → App, oppure col
  telefono collegato (`adb shell pm list packages | grep -i -E "webapk|arctrail"`).
- **Non deciso** (e non si decide qui): un APK nuovo con una firma nuova
  installerebbe solo da zero, non aggiornerebbe quello esistente.
