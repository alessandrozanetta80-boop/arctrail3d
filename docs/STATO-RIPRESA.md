# STATO-RIPRESA — ArcTrail 3D — aggiornato il 02/10/2026

Da qui si riparte. **§1 è lo stato di oggi, §2 cosa resta da fare, §3 lo storico.**
Dove lo storico dice «non pubblicato», «in attesa» o «da approvare», vale §1.

Nella consegna (`CONSEGNA_CHATGPT.zip`, e la cartella `00-ALESSANDRO-CHATGPT` in radice,
fuori da Git) gli stessi documenti hanno nomi fissi:

| file nella consegna | originale | cosa |
|---|---|---|
| `00-LEGGIMI-STATO-PROGETTO.md` | `docs/STATO-RIPRESA.md` | **questo**: stato, prossimi passi, storico |
| `01-RUNBOOK-DEPLOY.md` | `docs/RUNBOOK-DEPLOY-2026-09-22.md` | come si pubblicano sito, Functions e regole (gate 1–3) |
| `02-ALLENAMENTI.md` | `docs/ALLENAMENTI-2026-09-21.md` | registrazione allenamenti e storico dei giri |
| `03-PUSH-SAMSUNG.md` | `docs/DIAGNOSI-PUSH-SAMSUNG-2026-09-21.md` | push, Samsung S26, App Check |
| `04-APK.md` | scritto dallo script leggendo l'APK vero | package, versione, firma |
| `05-SEO-REPORT.md` | `docs/ARCTRAIL_SEO_REPORT.md` | report SEO del 28/09 (analisi e pubblicazione) |
| `06-SEO-AUTOMAZIONE.md` | `docs/SEO-AUTOMAZIONE.md` | procedura SEO, comandi, come autorizzare Search Console |
| `07-PULIZIA-REPORT.md` | `docs/ARCTRAIL_PULIZIA_REPORT.md` | pulizia del 28/09 |
| `08-FIARC-REPORT.md` | `docs/FIARC-CHIUSURA-2026-09-28.md` | calendario FIARC reale e audit FIARC (28/09), chiusura FIARC finale (29/09, §9) |

Le regole di lavoro complete stanno in `docs/REGOLE-LAVORO.md` e `docs/STATO.md`
(nel repository GitHub); l'elenco completo delle voci aperte del prodotto in
`docs/STATO.md` §3.

---

## 1. STATO ATTUALE (29/09/2026; in cima il giro del 02/10)

### 1.0-quater Mappa campo GPS: percorsi + segnalazioni (02/10/2026) — PUBBLICATO (giri _06 e _08)

**Giro _08 (`CLAUDE_TASK_ARCTRAIL_GPS_UI_PUBBLICAZIONE_08.md`, 02/10): v176 PUBBLICATA E
VERIFICATA ONLINE.** Push autorizzato da Alessandro nel task. Prima del push, test mirati di nuovo
verdi: `banco-campo-schermo` 75/75, `banco-campo-geo` 53/53, `controlla-versioni` 30/30,
`controlla-cache` ok, `controlla-pubblicazione` 32/32, `git diff --check` pulito. Commit
`dcd80cd` su `main` (i 5 file del giro _07). Online dopo ~1 minuto: `app.html`, `sw.js`,
`campo-mappa.js`, `campo-geo.js` **identici al commit**; timbro `2026-10-02-campo-porte`, cassa
`arctrail3d-v176`. Nel browser su `https://arctrail3d.com` (pagina scaricata dall'online, con il
solo interruttore DEV del banco perché senza login l'online mostra l'accesso; script del campo
presi dal sito vero) a 360×740, 384×832 e 1280×800: due tasti «Mappa campo» / «Segnala problema»
in `.campo-porte`, dentro lo schermo, alti 58/58/44 px; vecchia scheda «Segnala un problema su un
percorso» assente; «Segnala problema» apre il modulo, «Mappa campo» no; nessuno scorrimento
orizzontale; nessun errore JS. **Firebase (regole, Storage), Functions e APK invariati.** Suite
completa non rilanciata (come da task). Resta la prova a telefono da utente loggato (sotto).

**Giro _07 (`CLAUDE_TASK_ARCTRAIL_GPS_UI_CONTINUAZIONE_07.md`, 02/10): Campi con due porte
separate — pubblicato nel giro _08 (sopra); qui com'era a fine giro, in locale.**
Nato dalla prova a telefono: il tasto unico «Mappa campo · Segnala problema» e la vecchia
scheda in fondo «Segnala un problema su un percorso» confondevano.
- **Cosa cambia (solo UI):** in cima a Campi due tasti affiancati (`.campo-porte`):
  **«Mappa campo»** apre la schermata `campo-mappa` nella vista mappa/percorsi (Registra
  percorso, elenco percorsi, mappa); **«Segnala problema»** apre la stessa schermata già nella
  vista «segnala» (posizione GPS, categoria, nota, foto) e avvia il GPS. Se l'utente non può
  segnalare (email non verificata) si ricade sulla mappa con l'avviso di sempre. La vista
  scelta resta anche dopo la scelta del codice compagnia. **Tolta** la vecchia scheda in fondo.
- **File:** `app.html` (tasti, variabile `campoApriVista`, passaggio `vista` a
  `CampoMappaUI.schermo`, CSS `.campo-porte`, scheda vecchia rimossa), `campo-mappa.js`
  (legge `ctx.vista`; 10 righe), `sw.js`, `tests/banco-campo-schermo.js` (+9 prove).
  Logica GPS, modello dati, regole Firestore/Storage, Functions: **invariati**.
- **Versioni:** app `2026-10-02-campo-porte` (genitore `2026-10-02-campo-gps`), cassa
  `arctrail3d-v176` (genitore v175), impronta `arctrail3d-v176:f496cc1ecc70c814`.
- **Test mirati:** `banco-campo-schermo` 75/75 a 360×740, 384×832 (S26) e 1280×800 (due tasti
  separati, in cima, dentro lo schermo, ≥ 44 px, vecchia scheda assente, «Segnala problema» apre
  subito il modulo, «Mappa campo» apre mappa e non il modulo, nessun errore JS);
  `banco-campo-geo` 53/53; `controlla-versioni` 30/30; `controlla-cache` ok;
  `controlla-pubblicazione` 32/32; `controlla-token` «niente è peggiorato»; `git diff --check`
  pulito. Suite completa NON rilanciata (quella GPS del _04 era verde; modifica solo UI).
- **Da provare a telefono (dopo la pubblicazione, decisione di Alessandro):** Campi → i due
  tasti in cima, leggibili; «Segnala problema» → chiede la posizione e mostra subito il modulo;
  «Mappa campo» → mappa e percorsi; in fondo a Campi nessuna scheda di segnalazione.
- **Backlog laterale (non toccato):** il vecchio modulo `field-report` resta raggiungibile solo
  dal tasto «Segnala» della barra durante un giro (`app.html` ~riga 18810): decidere se
  portarlo anche lui alla segnalazione geolocalizzata; la chiave i18n `fr_report_open_btn` (9 lingue)
  non è più usata da nessuna parte (`fr_report_sub` sì, altrove); le etichette dei due tasti sono solo
  it/en come il tasto di prima.

**Giro _06 (`CLAUDE_TASK_ARCTRAIL_GPS_PUBBLICAZIONE_06.md`, 02/10): GPS ONLINE senza gate 2/3.**
Strada (b) autorizzata da Alessandro. Vale questo paragrafo; quanto sotto sul _05 è superato.
- **Regole Firestore PUBBLICATE** (02/10 16:13 UTC, ruleset `8690dc23…`): file
  `tools/regole-live-campo/firestore.rules`, versione `2026-10-02-live-campo-gps` = regole che
  erano online (`2026-08-28-porte-verified`, letto dall'API Rules: identico a `7b0ffe9`) + SOLO il
  blocco `field_maintainers`/`field_routes`(+`segments`)/`field_issues`(+`history`) + le due
  funzioni che usa (`testoOpz`, `attivo`, copiate identiche da main; nessuna regola vecchia le
  usa). Rispetto al live cambiano solo 2 righe di commento in testa. Si pubblica con
  `npx firebase deploy --only firestore:rules --project arctrail3d --config tools/regole-live-campo/firebase.json`.
  **`firestore.rules` di main resta il gate 3 (`2026-10-02-campo-gps`, NON pubblicato).**
- **Regole Storage PUBBLICATE** (ruleset `130de6c9…`): `storage.rules` `2026-10-02-campo-gps` =
  live `2026-08-13-listall` + sola regola `field_issues/...`; target `storage` aggiunto in
  `firebase.json` (gli altri invariati). Online letto dopo il deploy = file locale, per entrambe.
- **Rollback:** copie delle regole online PRIMA del deploy in
  `C:\Users\Ale\.arctrail3d\rollback-regole\` (`cloud.firestore.rules`,
  `arctrail3d.firebasestorage.app.rules`), fuori da Git.
- **Test mirati prima del deploy:** `banco-campo-regole` sulle regole live+campo
  (`REGOLE=tools/regole-live-campo/firestore.rules sh tests/lancia-campo-regole.sh`) 58/58;
  banco regole dell'epoca live (`7b0ffe9:tests/banco-regole.js`) 78/78 sia sul live originale sia
  sul live+campo (comportamento vecchio invariato); `banco-finestra` col live+campo 28/31: i 3
  «rossi» sono proprio i comportamenti del gate 3 (app di ieri che perde elenco «solo club» e
  scheda referente, documento `devices`), assenti come voluto; `banco-campo-geo` 53/53;
  `controlla-versioni` 30/30; `controlla-cache` ok; `controlla-pubblicazione` 32/32 (ammessi
  `campo-geo.js` e `campo-mappa.js` fra i .js del sito); dry-run di deploy compilato sul server;
  `git diff --check` pulito. Suite completa NON rilanciata (quella del _04 era verde).
- **Sito v175 PUBBLICATO:** commit `5005e24` pushato su `main`. Online `app.html`, `sw.js`,
  `campo-geo.js`, `campo-mappa.js` identici al commit; timbro `2026-10-02-campo-gps`; nel browser
  (384×832) cassa `arctrail3d-v175` con i due file del campo, nessun errore JS; regole, banchi,
  `tools/` e `docs/` a 404.
- **APK: NO** (TWA, GPS in primo piano). Functions invariate (7, `2026-08-28-notifica-verificata`).
- **Resta solo la prova a telefono** (sotto, «Prova reale»): permesso posizione, percorso breve,
  segnalazione con foto/note, offline→online. Per registrare percorsi serve essere admin,
  referente (`compagnie_admin`) o manutentore in `field_maintainers/{code}/members/{uid}`.
- **Backlog laterale (non toccato):** `banco-finestra`/`lancia-regole` usano come «live»
  `REGOLE_LIVE=1cd0652`, ora non più vero (online c'è il live+campo): il prossimo giro sulle
  regole deve aggiornarlo; al gate 3 si pubblica `firestore.rules` di main (contiene già il
  campo) e `tools/regole-live-campo/` va ritirato. CI «banchi» del push in corso al momento della
  chiusura.

**Giro _05 (`CLAUDE_TASK_ARCTRAIL_GPS_PUBBLICAZIONE_05.md`, 02/10): PUBBLICAZIONE BLOCCATA PRIMA
DI QUALUNQUE DEPLOY. Nulla pubblicato, nulla committato, nessun push, nessun APK.** Controlli
iniziali verdi (HEAD `9f5649b`, working tree = quello del giro _04, `git diff --check` pulito,
nessun altro Claude ArcTrail attivo). Tre blocchi reali, nessuno risolvibile senza una decisione
di Alessandro:
1. **Regole Firestore = regressione in produzione se pubblicate ora.** `firestore.rules` del
   working tree (`2026-10-02-campo-gps`) è costruito sopra `2026-09-20-visibilita` di `main`,
   cioè il **gate 3** del runbook, mai pubblicato (online c'è ancora `2026-08-28-porte-verified`).
   Quelle regole chiudono i «solo club» dietro il claim `compagnia` della Function
   `claimCompagnia`, che fa parte del **gate 2** (Functions `2026-09-22-push-argomento`), anch'esso
   NON pubblicato (online le 7 Functions `2026-08-28-notifica-verificata`). Pubblicarle oggi:
   i soci non vedono più gli allenamenti «solo club» della propria compagnia, e l'app del 18/09
   si vede rifiutare l'elenco (runbook, gate 2–3). Ordine obbligato: gate 2 → conferma telefono →
   gate 3 (+ campo GPS), oppure un file regole separato = live `2026-08-28` + sole regole
   `field_*` (nuovo lavoro, da testare agli emulatori).
2. **Sito v175 = push su GitHub.** Il sito è GitHub Pages: «pubblicare hosting/web» significa
   `git push origin main`, vietato dal task (e bloccato dai permessi di Claude Code: lo ha
   sempre fatto Alessandro a mano). Pubblicare il sito senza le regole sarebbe comunque inutile:
   le scritture su `field_routes`/`field_issues` verrebbero rifiutate dalle regole live.
3. **Regole Storage: nessun target di deploy.** `firebase.json` non ha la voce `storage` (solo
   `tests/campo-firebase.json` per gli emulatori): `firebase deploy --only storage` oggi non ha
   cosa pubblicare. Serve aggiungere `"storage": {"rules": "storage.rules"}` (modifica di
   configurazione, non fatta). Le regole Storage nuove sono solo additive (`field_issues/...`,
   mercatino invariato) e da sole non danno rischi, ma senza Firestore e sito non servono.

**APK: NO** — l'APK è una TWA che apre `https://arctrail3d.com/app.html`; il GPS è in primo piano
(`navigator.geolocation` + Wake Lock dalla pagina), il permesso posizione lo chiede Chrome per il
sito: nessuna modifica nativa necessaria. Punto 9 (TWA che carica la v175) non verificabile finché
il sito non è pubblicato. **Decisione chiesta ad Alessandro:** (a) prima gate 2 (Functions) e,
dopo la conferma a telefono, gate 3 insieme al campo GPS + push del sito fatto a mano; oppure
(b) un giro che prepara regole «live + solo campo GPS» da provare agli emulatori, per pubblicare
il GPS senza gate 2/3. Prova reale a telefono (sotto) ancora tutta da fare.
**Rilancio del giro _05 (02/10, 18:00), stesso task file senza decisione nuova: blocco CONFERMATO,
nessuna azione.** `firestore.rules` = `HEAD` (`2026-09-20-visibilita`) + 113 righe `field_*`;
`firebase.json` ancora senza `storage`; working tree identico. Rilanciare il _05 non serve: serve
un task nuovo con la scelta (a) o (b).

**Giro _04 (`CLAUDE_TASK_ARCTRAIL_GPS_VERIFICA_FINALE_04.md`, 02/10): modulo GPS VERIFICATO e
pronto per la decisione di pubblicazione di Alessandro.** Una sola suite completa
`tests/controlla-tutto.sh` con la correzione porte di `tests/campo-firebase.json`: **72 banchi,
3174 prove, 0 cadute, TUTTI PASSATI, exit 0**. Banchi GPS/emulatori: `banco-campo-geo` 53/53,
`banco-campo-schermo` 54/54, regole 180/180 + finestra 31/31, `banco-campo-regole` 58/58 (i due
banchi a emulatore partiti in parallelo senza conflitti). Nessun `java` emulatore né porta
emulatore rimasti aperti dopo la suite. `git diff --check` pulito. Nessuna modifica al codice in
questo giro; nulla committato, pushato o deployato. Il deploy (regole Firestore + Storage, poi
sito) resta rischio C e decisione di Alessandro; poi la prova reale a telefono qui sotto. Il
residuo e il backlog laterale del giro _03 restano validi.

Task `CLAUDE_TASK_ARCTRAIL_GPS_PERCORSI_SEGNALAZIONI_01/02.md`, rischio **C**. Nulla committato,
pushato o deployato. Il giro _01 è stato fermato dal supervisore lasciando il lock; il giro _02
l'ha ripreso (stesso agente, nessun processo vivo) e ha completato il collegamento all'app.

- **File:** `campo-geo.js` (logica pura + `creaRepositoryFirestore`: unico punto che parla con
  Firebase, da sostituire per PostGIS), `campo-mappa.js` (schermata), `app.html` (rotta
  `campo-mappa`, tasto «Mappa campo · Segnala problema» in cima a Campi, caricamento pigro dei due
  script e dello Storage SDK, CSS `.campo-*`), `sw.js` (i due file nell'`APP_SHELL`),
  `firestore.rules` (`2026-10-02-campo-gps`), `storage.rules` (`2026-10-02-campo-gps`),
  `tests/banco-campo-geo.js`, `tests/banco-campo-regole.js`, `tests/lancia-campo-regole.sh`,
  `tests/campo-firebase.json` (emulatori su 8086/9198), `tests/controlla-tutto.sh` (+2 banchi).
- **Modello dati:** `field_routes/{id}` (companyCode, name, status `draft|published`, createdBy,
  date, bbox, center, lengthM, pointCount, segmentCount, schemaVersion 1) +
  `segments/{seq}` (≤ 500 punti, WGS84 lat/lon a 1e-7, acc, t, geohash 9); `field_issues/{id}`
  (lat/lon/acc/geohash, categoria `pianta|sentiero|bersaglio|piazzola|segnaletica|sicurezza|altro`,
  stato `open|in_progress|resolved`, reporterUid, statusBy/At, routeId opz., `photoPaths`) +
  `history/{hId}` solo in aggiunta; `field_maintainers/{code}/members/{uid}` (`active`, grantedBy).
  Foto in Storage `field_issues/{code}/{issueId}/{fotoId}.jpg`: si salva il **path**, mai l'URL.
  Export GeoJSON (LineString + Point); GPX in `campo-geo.js`.
- **Sicurezza:** percorso pubblicato leggibile da chi ha un account; bozza solo da chi gestisce
  (admin, referente `compagnie_admin`, manutentore con `active == true`). `users.compagnia` NON
  dà poteri. Segnalazione: qualunque account attivo, a nome proprio, sempre «aperta»; cambio stato
  solo a chi gestisce, con voce di storico nello stesso batch. Storage: solo immagini, < 5 MB,
  email verificata, `ownerUid` = chi carica, niente sovrascritture; cancella proprietario o gestore.
- **Limiti dichiarati:** registrazione **solo con app aperta e schermo acceso** (Wake Lock se c'è);
  nessun tracking in background nella TWA/PWA. La «mappa» è un disegno SVG in metri (percorso,
  marker, posizione, scala) + «Apri nel navigatore»: niente tile né mappe offline in questo giro.
  Offline: traccia, segnalazione e foto restano in coda locale (`localStorage`) e partono al ritorno
  della rete con id stabili (nessun doppione); «sincronizzato» solo dopo Storage + Firestore.
- **Versioni:** app `2026-10-02-campo-gps` (genitore `2026-09-29-calendario-fitarco`), cassa
  `arctrail3d-v175` (genitore v174), impronta `arctrail3d-v175:6cd82103f2245479` (giro _03).
- **Test fatti (mirati):** `banco-campo-geo` 53/53; `lancia-campo-regole.sh` (Firestore+Storage
  emulatori) 58/58; `controlla-versioni` 30/30; `controlla-cache` ok; `controlla-pubblicazione`
  32/32; `git diff --check` pulito; `lancia-regole.sh` (banco regole principale): vedi report finale
  del giro.
- **NON fatti — BLOCCO di tempo (supervisore 30 min / 35 turni):** suite completa finale; prova
  responsive 360/384/desktop a schermo; prova offline simulata nel browser vero (la coda è provata
  solo nel banco Node); nomi delle compagnie nella schermata (mostra il solo codice). Sono il
  prossimo giro, prima di qualunque deploy. Adrenalina e Gestionale non toccati.
- **Esito test del giro _02:** `lancia-regole.sh` 180/180 + finestra 31/31. **Suite completa (una sola): 71
  banchi, 3120 prove, 0 cadute, ma exit 1** per `controlla-token` (guardiano dello stile): il CSS `.campo-*`
  aveva tinte esadecimali e raggi a mano. Corretto coi token (`--line`, `--r-app`, `--r-xs`, `--red-700`,
  `--green-500`, `--blue-600`, `--danger`, `--bg-panel`). Rilanciato da solo **senza gli argomenti della
  suite** segna ancora «esadecimale +1, misura fuori scala +22, clamp +6»: va rilanciato come lo chiama
  `controlla-tutto.sh` per capire se resta qualcosa di mio (probabile: `.campo-mk text{ font-size:10px }`
  e `.campo-freccia{ font-size:1.4em }`). **Prossimo giro, primo passo:** chiudere `controlla-token`,
  poi responsive 360/384/desktop e offline simulato nel browser, poi una suite completa.

- **Giro _03 (`CLAUDE_TASK_ARCTRAIL_GPS_CONTINUA_03.md`, 02/10):**
  - FATTO: `controlla-token` ora verde come lo chiama la suite (niente peggiorato: il ritocco
    coi token del giro _02 bastava). Nome della compagnia accanto al codice nella schermata
    (`ctx.nomeCompagnia = compagniaNome`, una riga in `app.html`). Nuovo banco
    `tests/banco-campo-schermo.js` (Playwright, nella suite): 360×740, S26 384×832, desktop
    1280×800 — niente scorrimento orizzontale, tasti dentro lo schermo e ≥ 44 px; senza rete
    registrazione (GPS finto, da manutentore) + segnalazione restano in coda, sopravvivono alla
    ricarica senza doppioni; «Raggiungi» dà distanza e direzione; l'utente semplice non vede
    «Registra percorso»; nessun errore JS. Impronta riscritta su `v175` (mai pubblicata):
    `arctrail3d-v175:6cd82103f2245479`.
  - TEST: `banco-campo-schermo` 54/54; `banco-campo-geo` 53/53; `controlla-versioni` 30/30;
    `controlla-cache` ok; `controlla-pubblicazione` 32/32; `controlla-token` ok;
    `git diff --check` pulito. **Suite completa (una sola): 72 banchi, 2905 prove, 0 cadute, ma
    exit 1**: i due banchi a emulatore (45 `lancia-regole.sh`, 46 `lancia-campo-regole.sh`) non
    sono partiti, «Error: An unexpected error» del CLI. Causa (da `firebase-debug.log`): girando
    in parallelo usavano lo stesso hub (4400) e la stessa websocket Firestore (9150); il giro _02
    era passato per caso d'ordine. Corretto in `tests/campo-firebase.json` (hub 4406, logging
    4506, websocket 9156). Il giro fallito aveva lasciato due `java` emulatore orfani su 8080 e
    8086 (progetti di prova), terminati. Prova mirata **dei due banchi insieme, in parallelo come
    nella suite**: 180/180 + finestra 31/31, campo 58/58, nessun processo rimasto. Seconda suite
    completa NON lanciata (regola: una per giro) → **da rifare una volta prima di qualunque
    deploy** (rischio C).
  - RESIDUO: invio reale della coda nel browser (rete che torna → Firestore/Storage) provato
    solo nel banco Node e sugli emulatori, non dal browser con Firebase; prova a telefono dopo
    il deploy (sotto). Backlog laterale, non toccato: `controlla-token` segnala 3 classi senza
    regola (`cal-aggiornato`, `finale-sotto`, `finale-stato`) e un «ritmo rotto» del riquadro,
    pre-esistenti; `.campo-eti` è definita due volte in `app.html` (righe ~1982 e ~5049, la
    seconda è di un'altra schermata); un banco a emulatore che fallisce all'avvio lascia il
    `java` dell'emulatore vivo (il runner non lo raccoglie): da guardare nel supervisore/runner.

- **Prova reale (dopo il deploy, se Alessandro decide):** gate regole (Firestore + Storage), poi
  sito. Da telefono: Campi → «Mappa campo» → codice compagnia → Registra percorso (Start, Pausa,
  Riprendi, Termina) camminando 2–3 minuti a schermo acceso → Pubblica; Segnala problema con foto in
  modalità aereo → riattivare la rete → la segnalazione compare una volta sola su un secondo
  dispositivo; un manutentore autorizzato cambia stato; revocato non può più.

### 1.0-ter Calendario FITARCO 3D (29/09/2026, terzo giro)

Task `CLAUDE_TASK_ARCTRAIL_FITARCO_3D_2026.md`. Fonte unica: elenco inviti ufficiale
https://www.fitarco-italia.org/gare/inviti.php (verificato il 29/09/2026).

- **Aggiunte 3 gare FITARCO 3D** (`federation:"fitarco"`, `roundType:"3D"`, fonte
  `fitarco-2026-inviti` in `CAL_FONTI`): R2621020 03/10 Bressanone/Brixen (BZ) FT21013,
  R2621021 04/10 Bressanone/Brixen (BZ) FT21013, R2612053 04/10 Colleferro (RM) FT12162.
  Esclusa S2611006 (Città della Pieve, mista HF+3D). Nessun'altra gara 3D futura nell'elenco.
- La scheda mostra «Codice gara FITARCO» (nuova chiave `cal_det_codice_gara`, 9 lingue); la
  nota del calendario ora cita FIARC e FITARCO (9 lingue). `CAL_AGGIORNATO` = `2026-09-29`.
  Le 17 gare FIARC sono invariate.
- **Versioni:** app `2026-09-29-calendario-fitarco` (genitore `2026-09-29-fiarc-finale`),
  cassa `arctrail3d-v174` (genitore v173), impronta `arctrail3d-v174:dc2ec7b09c86f734`.
- **Test:** nuovo `tests/banco-calendario-fitarco.js`; `banco-calendario.js` e
  `banco-calendario-fiarc.js` adattati alla presenza di FITARCO (le prove FIARC restano su FIARC).
- **Pubblicazione:** vedi riga finale di questa sezione.

### 1.0-bis FIARC finale (29/09/2026, secondo giro)

Task `CLAUDE_TASK_ARCTRAIL_FIARC_FINALE.md`; dettaglio e fonti in `08-FIARC-REPORT.md` §9.
Solo fonti ufficiali fiarc.it (elenchi compagnie di luglio 2026, calendario Emilia-RSM,
Regolamento Sportivo 02/12/2023).

- **08LAUR / 08LUAR:** il calendario stampa 08LAUR (08/11/2026, Percorso); l'elenco compagnie
  del 22/07/2026 ha solo 08LUAR «I Lunghi Archi», Sasso Marconi BO. La gara conserva il codice
  della fonte (`sourceClubCode`, id) e risolve la compagnia canonica 08LUAR (nome, regione). La
  scheda mostra «Codice sul calendario FIARC: 08LAUR» (9 lingue). Luogo gara sempre «da
  confermare».
- **Metadati compagnie:** 01LUPI, 03LUNA, 04CORM, 09ATON coincidono con gli elenchi (campo vuoto →
  «—»). 04GROA: tolta la provincia «MB», non presente nell'elenco ufficiale. 08LUAR coincide.
- **Regolamento:** punteggi e codice dei 4 formati già giusti. Corrette in 9 lingue le distanze
  delle descrizioni di Battuta, Percorso e Tracciato: erano «da 20 a 40/55 m», il regolamento dà
  solo massimi per gruppo (40/40/30/20, Tracciato 55/40/30/20). Chiusa la voce «descrizioni non
  verificabili a fondo».
- **Versioni:** app `2026-09-29-fiarc-finale` (genitore `2026-09-29-calendario-fiarc`), cassa
  `arctrail3d-v173` (genitore v172), impronta `arctrail3d-v173:51ba4b7dde86329a`.
- **Test:** suite completa 68 banchi, 2994 prove, 0 cadute, TUTTI PASSATI (un primo giro aveva una
  caduta di `banco-font-scale` sotto carico, 83/83 da solo: vedi report §9.5).
- **PUBBLICATO E VERIFICATO ONLINE (29/09):** commit `cc4f468` su `main`, solo sito. Online
  `app.html`, `sw.js` e `compagnie-data.js` identici al commit, timbro `2026-09-29-fiarc-finale`,
  cassa `arctrail3d-v173`; `controlla-base` IN PARI, file interni a 404 (report §9.6).
  Functions, regole Firestore e APK invariati.
- **CI GitHub «banchi»: rossa, come nei 5 run precedenti** — 6 cadute di `banco-font-scale`
  (font del runner Linux, pre-esistenti) e 2 di `banco-dati-rollback` (app storiche, 23/23 in
  locale tre volte). Dettaglio e proposta in report §9.6.

### 1.0 FIARC: calendario reale, PUBBLICATO E VERIFICATO ONLINE (29/09/2026)

- **Pubblicato:** commit `1bcc935` «feat(fiarc): calendario reale 2026 e audit area FIARC»
  pushato su `main` (solo sito). Functions, regole e APK invariati.
- **Verificato su arctrail3d.com il 29/09:** HTTP 200, `BUILD_STAMP`
  `2026-09-29-calendario-fiarc`, 17 gare FIARC vere, `CAL_MOCK` assente, `CAL_AGGIORNATO` =
  `2026-09-28`, presenti la prima (`01DAHU` 04/10) e l'ultima (`14ELFI` 22/11); `sw.js` online
  `arctrail3d-v172`, genitore `v171`, impronta `arctrail3d-v172:5bf13f453fcbe9da`.
- **Le 6 gare di Emilia Romagna e Triveneto restano:** verificate sulle pagine ufficiali FIARC
  2026, e Alessandro ha chiesto di avere tutto il calendario disponibile.

Sotto, il giro com'era a fine lavoro in locale (28/09, chiuso il 29/09):

- **Il calendario non è più di prova.** Tolti `CAL_MOCK` (10 gare inventate, 6 federazioni) e
  il cartello «Dati di esempio». Ci sono **17 gare FIARC 2026 vere**, dal 04/10 al 22/11,
  ricopiate dalle immagini ufficiali di 7 pagine fiarc.it: le 11 del task più 6 di Emilia
  Romagna e Triveneto, che il 28/09 mostrano «CALENDARIO GARE 2026» (prova nel report).
  Sardegna esclusa (nessun calendario 2026 pubblico). Il luogo della gara resta **«Luogo da
  confermare»**: non si usa il campo della compagnia. Niente link alle iscrizioni.
- **Audit FIARC:** nessun problema bloccante. Corretti in questo giro la ricerca della
  compagnia per codice (profilo) e il controllo del codice FIARC in «Prepara gara». 01VICO non
  esiste: è 01BICO, già VB dal 18/09.
- **Chiuso il 29/09:** il timbro dell'app è passato al 29/09, perché il lavoro si è chiuso quel
  giorno. Dati e data di verifica del calendario restano al 28/09. Due banchi di prova
  (`banco-firme`, `prova-schermo`) sono stati allineati alla funzione nuova `codiceFiarcDi`.
- **Versioni:** app `2026-09-29-calendario-fiarc`, cassa `arctrail3d-v172` (impronta
  `5bf13f453fcbe9da`), **online dal 29/09** (prima: `2026-09-22-testata-s26` e `v171`).
- **Test (29/09):** suite completa **68 banchi, 2973 prove, 0 cadute, TUTTI PASSATI**. I 4 banchi
  senza conteggio sono stati letti a mano e sono puliti. Dettaglio in `08-FIARC-REPORT.md` §8.1.
  Banco nuovo: `tests/banco-calendario-fiarc.js` (66/66).
- **Da fare:** ricontrollare le 7 pagine FIARC a metà ottobre (rinvii o aggiunte). Dopo il
  22/11 il calendario resta vuoto fino al 2027.

### 1.1 Produzione

- **GitHub:** ultimo commit che ha toccato il sito: `cc4f468` (29/09, FIARC finale; prima
  `1bcc935`, calendario FIARC reale).
  Eventuali commit successivi solo documentali non cambiano la versione online. Repository pubblico
  `alessandrozanetta80-boop/arctrail3d`; il sito è GitHub Pages su arctrail3d.com.
- **Sito online:** vetrina `2026-09-28-seo-regolamenti` e mercatino `2026-08-25-radice`
  (verificati il 28/09); app `2026-09-29-fiarc-finale` e cassa `arctrail3d-v173`
  (verificate il 29/09, §1.0-bis).
- **02/10 (giro _06): sito v175 (`5005e24`, mappa campo GPS) e regole Firestore
  `2026-10-02-live-campo-gps` + Storage `2026-10-02-campo-gps` ONLINE** — §1.0-quater. Le
  regole live sono quelle del 28/08 + solo campo GPS; il resto della riga sotto vale ancora.
- **02/10 (giro _08): sito v176 (`dcd80cd`, Campi con «Mappa campo» / «Segnala problema»)
  ONLINE**, app `2026-10-02-campo-porte`, cassa `arctrail3d-v176` — §1.0-quater. Solo sito.
- **Functions INVARIATE dal 18/09; regole Firestore fino al 02/10.** Online: 7 Functions
  `2026-08-28-notifica-verificata`, regole `2026-08-28-porte-verified`. Su `main` ci
  sono già le versioni nuove, **NON pubblicate**: Functions `2026-09-22-push-argomento`
  (8 funzioni) e regole `2026-09-20-visibilita` — gate 2 e 3 del runbook, solo su
  decisione di Alessandro.
- **Test reali superati:** gate 1 (22/09: giro salvato, riapertura, sincronizzazione
  su un secondo dispositivo); Home con i periodi (22/09); **Samsung S26 Ultra (23/09)**:
  testata su una riga, Tira, Home, Profilo e Campi a posto.

### 1.2 SEO (28/09/2026)

- **Proposte 1, 2, 3: approvate da Alessandro e PUBBLICATE** (`84ee133`): nel piede
  della home i link alle 7 pagine prioritarie (ora a 1 clic); tolti gli hreflang verso
  `?lang=` da home, privacy e termini; lastmod della home 2026-09-28.
- **Audit online finale: stato tecnico OK, 0 bloccanti, 0 avvisi.**
- **Proposta 4** (accorciare 4 title lunghi): **NON approvata**, in sospeso.
- **Proposta 5** (Search Console API): **predisposta, NON ancora autorizzata né
  configurata**; si fa in un secondo momento (§2).
- **Regola:** ANALISI → PROPOSTA → **APPROVAZIONE di Alessandro** → MODIFICA → TEST →
  PUBBLICAZIONE → VERIFICA → REPORT. Claude non tocca file SEO del sito senza il sì.
- **Comandi (sola lettura):** `npm run seo:audit`, `npm run seo:audit:online`,
  `npm run seo:control`, `npm run seo:gsc`, `npm run seo:gsc:ispeziona`. Dettagli in
  `06-SEO-AUTOMAZIONE.md`; analisi completa in `05-SEO-REPORT.md`.
- **Search Console al 27/09** (ultimo dato, letto a mano): 8 clic e 84 impressioni in
  3 mesi; 4 pagine indicizzate, 15 no (di cui 9 «rilevate, non indicizzate», nessun
  blocco tecnico). L'indicizzazione di `3d-archery-scoring-app.html` è già stata
  chiesta una volta: **non si ripete**.

### 1.3 Distribuzione: APK e Dropbox (dal 23/09/2026)

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
  - `CONSEGNA_CHATGPT.zip`: i documenti `00`–`08` elencati in cima, nient'altro.

### 1.4 Cose aperte fuori dalla SEO che chiedono un'azione

- **APK:** mai provato installato su un telefono vero (serve «installa app
  sconosciute»): deve aprirsi a schermo intero, senza barra dell'indirizzo. Il test
  S26 del 23/09 era sulla web app, non sull'APK.
- **Push:** `TEST REALE TELEFONO NECESSARIO` — app chiusa, telefono bloccato, due
  dispositivi; ha senso dopo il gate 2 (Functions).
- **Chiave di firma:** una copia di `C:\Users\Ale\.arctrail3d\signing\` su chiavetta.
- **Admin:** in console Auth, l'email dell'admin è verificata? Serve prima di
  stringere `isAdmin()` (P3).

### 1.5 Metodo di lavoro (dal 22/09/2026, come Adrenalina e Gestionale Comprensori)

- **Cartella locale:** `C:\Users\Ale\Desktop\PROGETTI\ArcTrail 3D` (prima
  `ArcTrail3D-Git`). È il repository: la fonte di verità del codice è GitHub.
- **`00-ALESSANDRO-CHATGPT/`** in radice: SOLO i documenti correnti (`00`–`08`), nomi
  fissi, fuori da Git e fuori dal sito. Si aggiornano, non si moltiplicano.
- **`CONSEGNA_CHATGPT.zip`**: uno solo, in Dropbox e (copia identica) nella radice del
  progetto, fuori da Git. Lo rifà `tools\prepara-consegna.ps1`.
- **Istruzioni di sessione eseguite** (`ARCTRAIL3D_*.md`, `CLAUDE_TASK_*.md`): non
  restano in radice, vanno in `_SESSIONI-CLAUDE\istruzioni\` (fuori da Git).
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

## 2. PROSSIMI PASSI

Separati e indipendenti; ognuno chiede prima il sì di Alessandro.

**FIARC: manutenzione del calendario (pubblicato il 29/09, §1.0).** Ricontrollare le 7
pagine FIARC a metà ottobre (rinvii o aggiunte) e quando esce il 2027; se FIARC corregge
08LAUR/08LUAR su una delle due fonti, togliere `sourceClubCode`. Backlog separato, non
bloccante per l'uso FIARC attuale: una compagnia per federazione nel profilo; una regola unica
(comitato o geografia) per la regione in `compagnie-data.js`; classifiche ufficiali. Altri
residui in `08-FIARC-REPORT.md` §6.

**SEO — configurazione Search Console API (proposta 5).** Una volta sola, ~10 minuti,
nessun segreto in chat: service account `seo-lettura` nel progetto Cloud `arctrail3d`,
chiave JSON in `C:\Users\Ale\.arctrail3d\gsc\credenziali.json`, utente **Limitato** in
Search Console, poi `node tools/seo-gsc.js --verifica`. Passo passo in
`06-SEO-AUTOMAZIONE.md`.

**SEO — proposta 4 (title), solo se Alessandro la approva.** Accorciare sotto ~65
caratteri i title di `world-archery-3d.html` (80), `fiarc.html` (73), `fitarco-3d.html`
(73) e `presentazione.html` (71), stessa sostanza; il testo nuovo si mostra prima.

**SEO — monitoraggio nelle prossime settimane.** Verso il 20/10: `npm run seo:control`
(senza API: Search Console a mano, *Pagine* e *Rendimento*) e confronto col 27/09.
Controllo a mano, 2 minuti: in *Sitemap*, `https://arctrail3d.com/sitemap.xml` inviata
nella stessa proprietà delle ispezioni, letta dopo il 18/09, 13 URL. Niente richieste
di indicizzazione in serie; al massimo una sulla home.

**Prodotto (decisioni di Alessandro):** gate 2 (Functions) e gate 3 (regole) del
runbook; test dell'APK su un telefono; test push ad app chiusa; copia della chiave di
firma.

---

## 3. STORICO

Non è lo stato attuale: racconta come ci si è arrivati. Dove dice «non pubblicato»,
«in attesa» o «da approvare», **vale §1**.

### SEO, 28/09 — la pubblicazione e, sotto, la fase A com'era (superata)

**Pubblicato il 28/09** (approvazione di Alessandro, push di `main` `84ee133`, solo
sito): la home linka nel piede le 7 pagine prioritarie (ora a **1 clic**); tolti gli
hreflang verso `?lang=` da home, privacy e termini; lastmod della home 2026-09-28.
Vetrina `2026-09-28-seo-regolamenti` (da `2026-09-19-risanamento`), cassa
`arctrail3d-v171` (da v170). Prima del push: `banco-seo` (hreflang `?lang=` ora
rosso, home → 7 pagine; tre sabotaggi rossi), vetrina, vetrina-inglese, lingue,
paese-lingua, regolamenti, accessibile, bordi, versioni, cassa, pubblicazione, pwa,
contrasto: tutti verdi; piede guardato a 360 e 1280 px. Dopo: `controlla-base` IN
PARI (index, app, mercatino, sw), interni a 404, `seo:audit:online` **OK, 0
bloccanti, 0 avvisi**. **App, Functions e regole INVARIATE.** Restano aperte le
proposte 4 (title lunghi) e 5 (Search Console API). Sotto: la fase A, com'era.


Giro di sola analisi e strumenti. **Nessuna modifica di produzione**: file del sito,
app, Functions, regole e APK invariati; nessun push; nessuna richiesta a Google.
Report completo: `docs/ARCTRAIL_SEO_REPORT.md`; procedura e comandi:
`docs/SEO-AUTOMAZIONE.md` (entrambi nel repository, non nello ZIP: questa sezione
ne è il riassunto).

- **Regola da oggi:** ANALISI → PROPOSTA → **APPROVAZIONE di Alessandro** → MODIFICA →
  TEST → PUBBLICAZIONE → VERIFICA → REPORT. Claude non tocca file SEO del sito senza il sì.
- **Stato tecnico: ATTENZIONE, 0 bloccanti.** Le 7 prioritarie (confronto EN, ASA, IBO,
  IFAA, World Archery, FITARCO, NFAS) rispondono 200, indicizzabili, canonical su se
  stesse, in sitemap, 461–1.140 parole di HTML statico, nessuna orfana. Sitemap (13 URL)
  e robots.txt corretti, identici fra sito e repository.
- **Search Console al 27/09:** 3 «redirect» = `http://` e `www` → 301 alla home,
  corretti. 9 «rilevate, non indicizzate» (ultima scansione N/D): nessun blocco
  tecnico, è la coda di scansione. «Nessuna sitemap di referral»: il file è giusto;
  da controllare a mano in *Sitemap* che sia inviata nella **stessa proprietà**, letta
  **dopo il 18/09**, con **13 URL**.
- **Problemi:** M1 hreflang di home, privacy e termini verso `?lang=xx` (canonical
  altrove: Google li ignora, probabile origine delle voci «alternativa» e «duplicata»);
  M2 le prioritarie sono a 2 clic dalla home (solo via `regolamenti-3d.html`);
  M3 Search Console API non configurata. Bassi: lastmod della home fermo al 28/08,
  4 title oltre 70 caratteri.
- **Proposte in attesa (MICRO, indipendenti):** 1) link dal piede della home alle 7
  pagine regolamento; 2) togliere gli hreflang `?lang=`; 3) lastmod home 2026-09-19;
  4) accorciare 4 title; 5) autorizzare Search Console API. La 1 e la 2 toccano
  `index.html` (nell'`APP_SHELL`): timbro e cassa salgono, meglio insieme.
- **Comandi (sola lettura):** `npm run seo:audit` (file locali), `npm run seo:audit:online`
  (sito vero), `npm run seo:control` (sito + Search Console), `npm run seo:gsc`,
  `npm run seo:gsc:ispeziona`. Exit 1 = bloccante.
- **Search Console API:** codice pronto (`tools/seo-gsc.js`, scope `webmasters.readonly`,
  niente Indexing API). Manca l'autorizzazione una tantum: service account `seo-lettura`
  nel progetto Cloud `arctrail3d`, chiave in `C:\Users\Ale\.arctrail3d\gsc\credenziali.json`
  (mai repository, Dropbox o chat), utente **Limitato** in Search Console.
- **Segnalato:** nella radice c'è `CLAUDE_TASK_VCO3_CENSIMENTI_RECUPERI_ISPRA_02.md`, file
  di Gestionale Comprensori (fuori da git). Non toccato: va tolto a mano.

---

### TEST REALE SAMSUNG S26 ULTRA: SUPERATO — 23/09/2026

Sul S26 Ultra vero, con la v170 online (`arctrail3d-v170`): screenshot di **Profilo,
Tira, Home e Campi** ricevuti e verificati. **Il problema responsive S26 è chiuso.**

- Telefono: QHD+ 3120×1440, carattere Samsung predefinito, grassetto OFF, dimensione
  carattere e zoom schermo circa standard.
- Testata ArcTrail su **una riga**; logo, campanella, chat, avatar e bandiera allineati;
  nessun a capo.
- Tira: porte compatte, «Inizia Allenamento» su una riga, «Gara libera» e «Prepara
  gara» impaginate bene.
- Barra in basso stabile; Home e Profilo corretti; Campi usabile senza rotture;
  nessuno scorrimento orizzontale evidente.
- Nessun altro fix S26. Codice, sito, Functions, regole e APK non toccati in questo
  passaggio. Dettaglio: `03-PUSH-SAMSUNG.md`, prima sezione.

I punti «S26» più sotto (test da fare, `TEST REALE S26 ULTRA NECESSARIO`) sono
**superati** da questo test.

---

### ADESSO (22/09/2026, sera) — HOME + S26 PUBBLICATI (solo sito)

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

### Gate 1 (22/09/2026, 12:00)

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

### Produzione (fino al gate 1)

**INVARIATA — NESSUN DEPLOY NOTTURNO.** È il rollback del 20/09, verificato il 21/09
file per file: sito = `7b0ffe9` (app `2026-09-18-campi-fiarc`, cassa `v166`), sette
Functions = `7b0ffe9` (`2026-08-28-notifica-verificata`), regole = `7b0ffe9`
(`2026-08-28-porte-verified`). Nella notte nessun comando di deploy, nessuna
scrittura su Firebase di produzione, nessun push su GitHub. Le prove con Firebase
hanno girato solo sugli emulatori, su un progetto `demo-*` che per costruzione non
può raggiungere la produzione.

---

### Registrazione allenamenti

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

### Storico >150

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

### Dati locali

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

### File interni

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

### Push

- **Diagnosi.** In produzione: un token per persona (l'ultimo dispositivo vince),
  nessuna `Urgency` (Android in Doze aspetta lo sblocco), token rinnovato solo
  aprendo l'app. Nel ramo tutto questo è già corretto (release, `3efd0b6`/`2d60c12`).
- **Fix della notte.** `invalid-argument` non spegne più tutti i dispositivi quando
  il difetto è nel messaggio (`banco-push` 46/46). Functions `2026-09-22-push-argomento`.
- **Resta:** `TEST REALE TELEFONO NECESSARIO` — app chiusa, telefono bloccato, due
  dispositivi, risparmio batteria di Samsung su Chrome.

### S26

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
- **23/09: `TEST REALE SAMSUNG S26 ULTRA: SUPERATO`** con la v170 (vedi in cima).

### Service worker / offline

- **Stato.** Tre salti provati col banco del salto di versione, dati e giro aperto
  compresi: **v166 → v168** (domani, dalla produzione), **v167 → v168** (chi ha
  preso la release), **v167 → v166** (il rollback vero del 20/09): 16/16 ciascuno.
  La cassa vecchia se ne va, senza rete si apre la versione nuova, lo storico non
  perde niente, il giro aperto si riprende senza ricarica sotto il dito. Le push non
  dipendono dalla cassa.
- **Test.** `banco-salto-versione.js` (con `VECCHIO=`/`NUOVO=`), `banco-italia-offline`,
  `banco-giro-sicuro`, `banco-esterni`, `banco-librerie-defer` — tutti nel giro.

### Suite finale (22/09, notte)

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

### Git (22/09, superato: oggi `main` = `origin/main`, vedi §1)

- Ramo di lavoro: **`fix/avvio-firebase-2026-09-21`**, solo locale (niente push).
- `main` = `origin/main` = `1cd0652` (il revert del 20/09), intatto.
- Il ramo contiene `main` con un merge `-s ours`: al gate 1 `main` avanza in
  fast-forward, senza stati intermedi.
- Working tree pulito; i file riservati e le istruzioni di sessione sono esclusi.
- Commit locali: quelli del 21/09 (`811c5f4`, `738cb24`) più quelli della notte —
  l'elenco preciso: `git log --oneline main..fix/avvio-firebase-2026-09-21`.

---

### Primo passo (22/09, superato: il gate 1 è fatto)

Leggere `RUNBOOK-DEPLOY-2026-09-22.md` (in cima: lo stato del gate 1 e quale ramo
usare), e se si decide di procedere: **GATE 1, solo il sito, a mano**, poi i test
1–4 e 6 col telefono. Il 2 e il 3 sono il cancello.

---

### LAVORO AUTONOMO DEL 22/09

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

### SESSIONE DEL 22/09, MATTINA (gate 1 e APK)

**Gate 1.** Test del ramo tutti verdi (suite 66 banchi / 2869 prove / 0 cadute; e2e
18/18; claim 11/11); `main` avanzato in fast-forward a `5f4878d`; push bloccato dal
controllo permessi di Claude Code e fatto a mano da Alessandro (`1cd0652..5f4878d`).
Verifica tecnica: `controlla-base` IN PARI (app, sw, vetrina, mercatino);
`controlla-sito-pubblico` tutti gli interni a 404, compresa la vecchia app in
`archive/`; sito a 200. **Test reali superati** (vedi «ADESSO» in cima).

**APK.** Vedi la sezione «APK» qui sotto, aggiornata alla ricerca completa.

### APK (ricerca completa, 22/09 pomeriggio)

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
