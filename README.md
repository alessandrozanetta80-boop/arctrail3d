# ArcTrail 3D

Questo repository **è il sito** `arctrail3d.com` (GitHub Pages): quello che sta
qui dentro va online. Cos'è vero oggi lo dice [`docs/STATO.md`](docs/STATO.md),
come si lavora [`docs/REGOLE-LAVORO.md`](docs/REGOLE-LAVORO.md).

## Dove sta cosa

| cartella | cosa contiene |
|---|---|
| **radice** | il sito — `index.html` (vetrina), `app.html` (app), `marketplace.html`, le pagine legali e SEO, `sw.js`, `firebase-messaging-sw.js`, `manifest.json`, icone e immagini, `compagnie-data.js`, `CNAME`, `robots.txt`, `sitemap.xml` — e Firebase: `index.js`, `pubblica.sh`, `firestore.rules`, `storage.rules`, `firebase.json` |
| `docs/` | documentazione operativa: `STATO.md`, `REGOLE-LAVORO.md`, gli archivi `NOTE-DESIGN.md` e `NOTE-MERCATINO.md`, `COMMENTI-DA-SISTEMARE.md`, `DOPPIE-TESSERE-ITALIA.md`, `seo-federazioni-report.md` |
| `tests/` | i banchi di prova e i controlli: `controlla-tutto.sh`, `controlla-*.js`, `banco-*.js`, `prova-schermo*.js`, `copia-dev.js`, `tetto-token.json` |
| `tools/` | generatori e strumenti: `genera.py` con `dizionario-*.py` e `markup.html`, `genera-federazioni.py`, `genera-presentazione.py`, `trova-doppie.js`, e i fotografi/misuratori (`foto-*.js`, `misura*.js`, `cerca-doppioni.js`) |
| `archive/` | materiale storico o da decidere, non usato dal sito né dai banchi — vedi [`archive/README.md`](archive/README.md) |

**`index.js` e `pubblica.sh` restano nella radice apposta:** `pubblica.sh` scarica
`index.js` da `raw.githubusercontent.com/.../main/index.js`, e la regola 17 scarica
`pubblica.sh` dallo stesso indirizzo. Spostarli romperebbe il deploy delle funzioni.

## Come si lanciano

Sempre **dalla radice del repository**: i banchi leggono `app.html`,
`index.html` e gli altri file del sito dalla cartella in cui si lanciano.

```
npm install
sh tests/controlla-tutto.sh        # oppure: npm run controlla
node tests/controlla-base.js       # e' questa la base giusta?
node tests/controlla-diari.js      # i diari in docs/ sono ancora leggibili?
python tools/genera.py             # dizionario del mercatino e PAROLE in index.js
```
