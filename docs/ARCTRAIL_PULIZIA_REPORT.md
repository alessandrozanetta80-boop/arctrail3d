# ARCTRAIL 3D — REPORT DI PULIZIA — 28/09/2026

Pulizia **controllata** della cartella ArcTrail 3D. Prima l'inventario, poi le
decisioni. Si è cancellato solo ciò che è chiaramente rigenerabile e fuori da
Git; il resto è conservato o spostato. **Nessuna modifica funzionale, SEO o di
contenuto; nessun file del sito toccato; nessun deploy.** Nessun altro
progetto toccato. Il file VCO3 di Gestionale Comprensori, già tolto a mano da
Alessandro, non è stato cercato né ricreato.

Repository: `C:\Users\Ale\Desktop\PROGETTI\ArcTrail3D-Git`, ramo `main`,
all'inizio `main` = `origin/main` = `61d75f5`, albero pulito salvo i due task
non tracciati.

---

## Eliminati

Tutti **non tracciati da Git e ignorati** (`.gitignore`), controllato file per
file prima di cancellare (`git ls-files --error-unmatch`).

| file | motivo |
|---|---|
| `barra-computer.png`, `barra-telefono.png` | foto che `tests/prova-schermo-market.js` riscrive in radice a ogni giro della suite; quelle del 23/09 erano già state lette («pulite», `STATO-RIPRESA` §3). Si rigenerano con `sh tests/controlla-tutto.sh` |
| `schermo-computer-chiara.png`, `schermo-computer-scura.png`, `schermo-svedese.png`, `schermo-telefono-chiara.png`, `schermo-telefono-scura.png`, `schermo-telefono-sole.png` | come sopra: uscite dello stesso banco |
| `firestore-debug.log` (radice) | diario che l'emulatore Firebase riscrive a ogni `firebase emulators:exec`; `.gitignore` lo definisce «non del progetto» |

Nessun `.bak`, `.tmp`, `.orig`, copia `(1)`/`(2)` o ZIP di prova trovato nel
progetto (esclusi `node_modules`).

## Spostati (non eliminati)

In `_SESSIONI-CLAUDE\istruzioni\`, dove il progetto tiene dal 22/09 le istruzioni
di sessione ricevute (fuori da Git, fuori dal sito). Sono **eseguite e chiuse**,
ma alcune sono citate nello storico come prova di un'autorizzazione (per esempio
il push del 22/09 «autorizzato dal file `ARCTRAIL3D_CHIUSURA_HOME_S26_DEPLOY_SITO`»):
per questo non si cancellano.

- `ARCTRAIL3D_APK_AUTOMATICO_DROPBOX_STANDARD_23-09-2026.md`
- `ARCTRAIL3D_CHIUSURA_HOME_S26_DEPLOY_SITO_22-09-2026.md`
- `ARCTRAIL3D_CHIUSURA_TEST_REALE_S26_23-09-2026.md`
- `ARCTRAIL3D_FIX_DEFINITIVO_S26_MISURE_REALI_22-09-2026.md`
- `ARCTRAIL3D_HOME_PERIODI_FIX_S26_22-09-2026.md`
- `ARCTRAIL3D_PUBBLICA_V170_SOLO_SITO_22-09-2026.md`
- `ARCTRAIL3D_URGENTE_STORICO_SCOMPARSO_22-09-2026.md`
- `CLAUDE_TASK_ARCTRAIL_SEO.md` (giro SEO del 28/09, chiuso)
- `CLAUDE_TASK_ARCTRAIL_PULIZIA.md` (questo giro: spostato a fine lavoro)

## Conservati intenzionalmente

| file / cartella | perché resta |
|---|---|
| tutto il sito (HTML, `sitemap.xml`, `robots.txt`, `sw.js`, `manifest.json`, icone, immagini, `CNAME`, `.well-known/`) | produzione |
| `tests/`, `tools/` (compresi `seo-audit.js`, `seo-gsc.js`, `genera-apk.ps1`, `prepara-consegna.ps1`), `.github/workflows/banchi.yml`, `pubblica.sh`, `functions/`, `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`, `package*.json`, `_config.yml`, `.env.example`, `.gitignore` | test, build, deploy, APK, SEO |
| `android/` compreso `android/.gradle` (1,2 MB) e `android/app/build` (29 MB) | cache di Gradle, ignorate da Git: rendono più veloce `genera-apk.ps1`. Non sono «chiaramente inutili»; si possono togliere, si ricostruiscono alla prossima build |
| `node_modules/`, `functions/node_modules/` | dipendenze dei banchi e delle Functions |
| `archive/` (9 file, tracciati) | il suo `README.md` dice file per file perché è lì e **cosa resta da decidere** (per esempio lo ZIP `hub-profilo-blocco1_2026-08-30_non-pubblicato.zip`, lavoro mai entrato in Git). Decisione di Alessandro |
| `docs/APERTI-2026-09-20.md`, `docs/AUDIT-TECNICO-2026-09-19.md` | ignorati di proposito: la mappa dei punti deboli, da non pubblicare. Operativi |
| `_SESSIONI-CLAUDE\foto-e-log-dei-banchi\` (foto del 21/09 e un log emulatore di 229 KB) | messi da parte a mano il 22/09 come carte di sessione; sono uscite rigenerabili, ma la scelta di tenerli era deliberata. **Dubbio: da decidere**, 1,4 MB |
| documenti in `docs/` senza riferimenti o superati: `RIPRESA-2026-09-18.md`, `RIPRESA-2026-09-18-MATTINA.md`, `ROADMAP-TECNICA-POST-STABILITA.md`, `SEO-AUTHORITY-PLAN.md`, `SEARCH-CONSOLE-NEXT.md` (sostituito da `SEO-AUTOMAZIONE.md`, che lo dichiara storico), `ROLLOUT-2026-09-20.md` | tracciati in Git e documenti: la regola 12 di `REGOLE-LAVORO.md` vuole il sì di Alessandro prima di **cancellare un documento**. **Candidati alla cancellazione, da decidere** |
| `00-ALESSANDRO-CHATGPT\` | la cartella della consegna: rigenerata, non ripulita a mano |
| `CONSEGNA_CHATGPT.zip` (radice) e quello in Dropbox | uno solo per posto, sovrascritti a fine giro |

Nessun segreto o credenziale trovato nella cartella: la chiave di firma sta in
`C:\Users\Ale\.arctrail3d\signing\` (fuori, non toccata), nessuna credenziale di
Search Console esiste ancora. Nessun file di altri progetti trovato.

## Documenti aggiornati

- **`docs/STATO-RIPRESA.md`** (è il `00-LEGGIMI` della consegna) riordinato in
  **§1 STATO ATTUALE**, **§2 PROSSIMI PASSI**, **§3 STORICO**. Tutte le sezioni di
  prima sono in §3, parola per parola (controllato riga per riga: cambiano solo
  titolo, intestazione e tre righe che contavano «cinque documenti»). §1 dice:
  proposte SEO 1–3 approvate e pubblicate (`84ee133`); audit online finale 0
  bloccanti, 0 avvisi; proposta 4 non approvata; proposta 5 (Search Console
  API) predisposta ma non configurata; timbri online; Functions e regole
  invariate con le versioni non pubblicate su `main`; test reali superati; cose
  aperte fuori dalla SEO (APK mai provato su telefono, push ad app chiusa,
  copia della chiave, email admin). Le sezioni «Git» e «Primo passo» del 22/09,
  ormai false, sono marcate «superato».
- **`docs/ARCTRAIL_SEO_REPORT.md`**: in cima una sezione **STATO ATTUALE** con la
  tabella delle 5 proposte; tutta l'analisi del mattino sotto **STORICO**, con
  la nota che dove dice «in attesa» vale lo stato attuale.
- **`docs/STATO.md`**: corretti in §1 i timbri ormai falsi (vetrina, app, cassa
  «online … · ramo …») e la frase «non ancora su `main`» per Functions e regole
  (sono su `main`, non pubblicate). Stesso numero di righe: 249/250.
- **`tools/prepara-consegna.ps1`**: lo ZIP passa da 5 a 8 documenti (vedi sotto).

## Test

| comando | esito |
|---|---|
| `node tests/controlla-diari.js` | verde (`STATO.md` 249/250) |
| `node tests/controlla-pubblicazione.js` | 32 passate, 0 fallite |
| `node tests/banco-seo.js` | 203 passate, 0 fallite |
| `node --check` su `tools/seo-audit.js`, `tools/seo-gsc.js`; parser PowerShell su `prepara-consegna.ps1` | ok |
| `npm run seo:audit` | Stato tecnico OK, 0 bloccanti, 0 avvisi |
| `npm run seo:audit:online` | Stato tecnico OK, 0 bloccanti, 0 avvisi |
| `node tools/seo-gsc.js --verifica` | «NON configurata» (atteso) |
| `node tools/controlla-sito-pubblico.js` | tutto come deve essere (interni 404, sito 200) |
| `node tests/controlla-base.js` | base giusta, IN PARI |
| `tools\prepara-consegna.ps1` | APK verificato, 8 documenti, nessun segreto, ZIP in Dropbox e in radice |

Nessun deploy: non è cambiata nessuna pagina di produzione.

## Stato Git finale

- Ramo `main`, allineato a `origin/main` (`61d75f5`) fino al commit: **nessun
  commit e nessun push fatti in questo giro**.
- Modificati: `docs/STATO-RIPRESA.md`, `docs/STATO.md`,
  `docs/ARCTRAIL_SEO_REPORT.md`, `tools/prepara-consegna.ps1`.
- Nuovo, non tracciato: `docs/ARCTRAIL_PULIZIA_REPORT.md` (questo).
- Le cancellazioni e gli spostamenti riguardano solo file ignorati: Git non li vede.
- **Anomalia da sapere:** `C:\Users\Ale\Desktop\PROGETTI\CLAUDE.md` (fuori dalla
  cartella ArcTrail, non toccato) dice ancora che `00-ALESSANDRO-CHATGPT` e lo ZIP
  contengono «esattamente e solo cinque file», e che la cartella si chiama
  `ArcTrail 3D` (sul disco è ancora `ArcTrail3D-Git`). Da aggiornare a mano o in
  un giro dedicato.

## CONSEGNA_CHATGPT.zip

Un solo file, stesso nome, in `C:\Users\Ale\Dropbox\PROGETTI\ArcTrail 3D\` e
(copia identica) nella radice del progetto. Contenuto:

| file | originale |
|---|---|
| `00-LEGGIMI-STATO-PROGETTO.md` | `docs/STATO-RIPRESA.md` — stato attuale, prossimi passi, storico, indice della consegna |
| `01-RUNBOOK-DEPLOY.md` | `docs/RUNBOOK-DEPLOY-2026-09-22.md` — gate 1–3 (sito, Functions, regole) |
| `02-ALLENAMENTI.md` | `docs/ALLENAMENTI-2026-09-21.md` |
| `03-PUSH-SAMSUNG.md` | `docs/DIAGNOSI-PUSH-SAMSUNG-2026-09-21.md` |
| `04-APK.md` | scritto leggendo l'APK vero (package, versione, firma, comandi) |
| `05-SEO-REPORT.md` | `docs/ARCTRAIL_SEO_REPORT.md` |
| `06-SEO-AUTOMAZIONE.md` | `docs/SEO-AUTOMAZIONE.md` |
| `07-PULIZIA-REPORT.md` | `docs/ARCTRAIL_PULIZIA_REPORT.md` (questo) |

**Autosufficiente:** stato, prossimi passi, procedura di deploy, APK, SEO
(analisi, esito, procedura e comandi) e ultimo giro sono dentro; il LEGGIMI ha
in cima l'indice dei file. **Nessun segreto:** lo script cerca password,
chiavi private e chiavi di accesso in ogni documento, e la password vera della
chiave di firma, e si ferma se ne trova. Nessun task già eseguito, nessun file
di altri progetti.

## Prossimi passi

**Search Console API (proposta 5).** Autorizzazione una tantum, ~10 minuti,
nessun segreto in chat: service account `seo-lettura`, chiave in
`C:\Users\Ale\.arctrail3d\gsc\credenziali.json`, utente Limitato; poi
`node tools/seo-gsc.js --verifica`. Passo passo: `06-SEO-AUTOMAZIONE.md`.

**Proposta 4 (title).** Solo se Alessandro la approva: 4 title sotto ~65
caratteri (World Archery 80, FIARC 73, FITARCO 73, presentazione 71).

**Monitoraggio indicizzazione.** Verso il 20/10: `npm run seo:control` (o Search
Console a mano) contro i numeri del 27/09; in *Sitemap* controllare proprietà,
data di lettura (dopo il 18/09) e 13 URL. Niente richieste di indicizzazione in
serie.

**Pulizia, da decidere:** i 6 documenti candidati in `docs/`,
`_SESSIONI-CLAUDE\foto-e-log-dei-banchi\`, le cache di `android/`, lo ZIP del
30/08 in `archive/`; e l'aggiornamento di `PROGETTI\CLAUDE.md`.
