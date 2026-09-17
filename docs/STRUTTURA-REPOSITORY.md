# STRUTTURA DEL REPOSITORY — ArcTrail 3D

*Nata il 15/09/2026 col riordino del repository (branch
`chore/repo-cleanup-2026-09-15`). Dice **dove sta cosa e perché**. L'elenco
esatto dei file lo dà `git ls-files`, non questa pagina: le cartelle sono
descritte per famiglie di nomi, così un banco nuovo non la fa invecchiare.*

## Il principio

Il repository **è il sito**: GitHub Pages pubblica tutto quello che contiene,
cartelle comprese. Nella **radice** restano solo i file che il sito, il browser
o Firebase cercano per indirizzo. Tutto il resto sta in quattro cartelle.

| cartella | mestiere | la legge il sito? |
|---|---|---|
| radice | il sito e Firebase | sì |
| `docs/` | documentazione operativa e archivi | no |
| `tests/` | i banchi e i controlli | no |
| `tools/` | generatori e strumenti per guardare e misurare | no |
| `archive/` | materiale storico o da decidere | no |

## Radice — il sito e Firebase

| famiglia | file |
|---|---|
| pagine | `index.html` *(la vetrina)*, `app.html` *(l'app)*, `marketplace.html`, `presentazione.html`, `fiarc.html`, `regolamenti-3d.html`, `world-archery-3d.html`, `ifaa-3d.html`, `nfas-3d.html`, `privacy.html`, `termini.html`, `elimina-account.html` |
| app installabile | `sw.js`, `firebase-messaging-sw.js`, `manifest.json`, `icon-192.png`, `icon-192-maskable.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon.ico`, `logo.jpg`, `logo.webp` |
| dati e foto | `compagnie-data.js`, le cinque `vetrina-*.webp` |
| dominio e motori di ricerca | `CNAME`, `robots.txt`, `sitemap.xml` |
| Firebase | `pubblica.sh`, `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc` — il backend sta in `functions/` |
| progetto | `package.json` e `package-lock.json` *(le dipendenze dei banchi)*, `README.md`, `.gitignore` |

**Cosa resta nella radice anche se non sono pagine:**

- `pubblica.sh` — la regola 17 lo scarica da
  `raw.githubusercontent.com/.../main/pubblica.sh`. Dal 17/09/2026 **non
  costruisce piu' una cartella Functions al volo**: clona il repository e
  pubblica `functions/`, cosi' il codice che si vede su GitHub e' il codice
  che Firebase pubblica.
- `firebase.json` — dice all'emulatore dove sta `firestore.rules` (si usa
  lanciando `tests/banco-regole.js` dalla radice) **e** dice a Firebase che la
  sorgente delle funzioni e' `functions/`. `.firebaserc` dice a quale progetto.

## `functions/` — il backend Firebase, deployabile

| file | cosa |
|---|---|
| `index.js` | le sette Cloud Functions. **La sorgente canonica**: non esistono altre copie |
| `package.json` | entrypoint, runtime Node e le due sole dipendenze (`firebase-admin`, `firebase-functions`) |
| `package-lock.json` | le versioni risolte, perche' il deploy non peschi qualcosa di diverso |

Stava in radice fino al 17/09/2026, e li' `firebase deploy --only functions`
non poteva funzionare: la CLI non sapeva dove guardare. Da qui si pubblica
anche **una funzione sola**:

```
firebase deploy --only functions:pushNotifica --project arctrail3d
```

`tests/banco-functions-layout.js` tiene ferma questa struttura: se il backend
torna in radice, o gli export non sono piu' esattamente sette, dice di no.

## `tests/` — i banchi e i controlli

| file | cosa |
|---|---|
| `controlla-tutto.sh` | il giro completo; si porta da solo nella radice prima di partire |
| `controlla-*.js` | i controlli: base, sintassi, token, contrasto, tavolozza, diari |
| `banco-*.js` | i banchi. `banco-regole.js` non entra nel giro: vuole l'emulatore Firestore |
| `prova-schermo.js`, `prova-schermo-market.js` | le schermate costruite davvero |
| `copia-dev.js` | prepara la copia di prova dell'app; lo usano anche gli strumenti in `tools/` |
| `tetto-token.json` | il tetto di `controlla-token.js`, che lo cerca accanto a sé |

## `tools/` — generatori e strumenti

| file | cosa |
|---|---|
| `genera.py` + `dizionario-a.py`, `dizionario-b.py`, `dizionario-c.py` + `markup.html` | il dizionario del mercatino: scrive in `marketplace.html` nella radice e nel blocco `PAROLE` di `functions/index.js` (regola 24) |
| `genera-presentazione.py` | l'elenco delle federazioni in `presentazione.html`, nella radice |
| `genera-federazioni.py` | le pagine dei regolamenti, scritte in `nuove/` nella radice per essere guardate prima di copiarle |
| `trova-doppie.js` | con `--scrivi` rigenera `docs/DOPPIE-TESSERE-ITALIA.md` |
| `foto-app.js`, `foto-giro.js`, `misura.js`, `misura-colori-porte.js`, `cerca-doppioni.js` | per guardare e misurare l'app vera; non fanno parte del giro |

## `docs/` — documentazione operativa

| file | cosa | si legge |
|---|---|---|
| `STATO.md` | cos'è vero oggi | tutto, ogni sessione |
| `REGOLE-LAVORO.md` | come si lavora — **l'unica fonte operativa** | tutto, ogni sessione |
| `NOTE-DESIGN.md`, `NOTE-MERCATINO.md` | perché l'app e il mercatino sono così — archivi | si cercano |
| `COMMENTI-DA-SISTEMARE.md` | osservazioni raccolte guardando l'app | si cerca |
| `DOPPIE-TESSERE-ITALIA.md` | generato da `tools/trova-doppie.js`: non si corregge a mano | si cerca |
| `seo-federazioni-report.md` | resoconto del lavoro SEO del 28/08 | si cerca |
| `STRUTTURA-REPOSITORY.md` | questa pagina | quando serve |

## `archive/` — storico o da decidere

Niente di questa cartella è letto dal sito, dai banchi o dai generatori, e
**non è una seconda fonte**: la copia di `REGOLE-LAVORO` che sta lì non vale.
Cosa contiene ogni file, e perché è stato tenuto invece che cancellato, lo dice
[`archive/README.md`](../archive/README.md).

## Come si lanciano

Sempre **dalla radice del repository**: banchi e generatori leggono `app.html`,
`index.html`, `marketplace.html` e `index.js` dalla cartella in cui si lanciano.

```
npm install
sh tests/controlla-tutto.sh        # il giro completo (oppure: npm run controlla)
node tests/controlla-base.js       # e' questa la base giusta?
node tests/controlla-diari.js      # i documenti in docs/ si possono ancora leggere?
python tools/genera.py             # dizionario del mercatino e PAROLE in index.js
```

## Cosa non entra in git

`.gitignore` tiene fuori `node_modules/`, le fotografie che i banchi scrivono
nella radice a ogni giro (`barra-*.png`, `schermo-*.png`) e le uscite dei
generatori da guardare prima di copiarle (`nuove/`, `dizionario.js`) e la cache di
Python (`__pycache__/`).
