# Search Console — cosa fare dopo il merge della PR SEO

**Da fare solo dopo che la PR `seo/international-indexing-2026-09-18` è su
`main` e GitHub Pages l'ha pubblicata.** Prima, URL Inspection vede ancora le
pagine vecchie.

## 0. La sitemap

Ripresentarla in *Sitemap* con questo indirizzo, esatto:

**https://arctrail3d.com/sitemap.xml**

Controllare che *Stato* sia «Operazione riuscita» e che gli URL rilevati siano
**12** (erano 10: +3 pagine nuove, −`app.html`).

## 1. Gli URL, in ordine di priorità

### 1. https://arctrail3d.com/asa-3d.html

- **Query target:** `asa scoring`, `asa 12 ring`, `asa pro am scoring`
- **Motivo:** pagina nuova, contenuto raro (i due 12-ring), circuito appena
  arrivato nell'app.
- **URL Inspection:** *Richiedi indicizzazione*. Poi nel test live: pagina
  «può essere indicizzata», canonical dichiarato = canonical scelto da Google
  = l'URL stesso; lingua rilevata inglese; nessuna risorsa bloccata.

### 2. https://arctrail3d.com/ibo-3d.html

- **Query target:** `ibo scoring`, `ibo 11 ring`, `ibo 440`
- **Motivo:** come ASA; la regola del corno e l'origine del 440.
- **URL Inspection:** come ASA.

### 3. https://arctrail3d.com/3d-archery-scoring-app.html

- **Query target:** `3d archery scoring app`, `3d archery scorecard app`
- **Motivo:** l'unica pagina in inglese costruita per l'intento «strumento».
- **URL Inspection:** come sopra. In più: nel *codice HTML sottoposto a
  scansione* la tabella di confronto deve esserci per intero (è HTML statico,
  deve esserci).

### 4. https://arctrail3d.com/app.html

- **Query target:** nessuna — deve **uscire** dall'indice.
- **Motivo:** ora è `noindex,follow`.
- **URL Inspection:** test live → «Esclusa dal tag "noindex"». *Non* chiedere
  la rimozione (strumento Rimozioni): il noindex basta e non è temporaneo.
  Nelle settimane dopo, in *Pagine*, `app.html` deve passare fra le escluse per
  noindex, e l'avviso di doppione sulla home deve sparire.

### 5. https://arctrail3d.com/regolamenti-3d.html

- **Query target:** `regolamenti tiro con l'arco 3d`, `punteggio 3d`
- **Motivo:** l'hub è cambiato (sei regolamenti, Stati Uniti, link nuovi) ed
  è da qui che Google trova ASA e IBO. Ora è linkato anche dalla home.
- **URL Inspection:** *Richiedi indicizzazione*; nel test live controllare che
  i link a `asa-3d.html` e `ibo-3d.html` compaiano nell'HTML.

### 6. https://arctrail3d.com/

- **Query target:** `arctrail`, `segnapunti tiro con l'arco 3d`
- **Motivo:** nuovo link all'hub; e serve una **fotografia** del problema
  multilingua prima di toccarlo.
- **URL Inspection:** nel test live guardare lo *screenshot* e l'HTML
  renderizzato: in che lingua lo vede Googlebot? Annotare `lang`, title e
  description renderizzati. In *Pagine* cercare `/?lang=` fra le «Pagine
  alternative con tag canonical appropriato». Serve a decidere
  `docs/SEO-MULTILINGUA-PIANO.md`.

## 2. Cosa guardare fra 4–6 settimane

| Dove | Cosa |
|---|---|
| *Rendimento* → Pagine | impression per le tre pagine nuove |
| *Rendimento* → Query | `asa`, `ibo`, `3d archery` |
| *Pagine* → Non indicizzate | `app.html` per noindex (atteso); nessuna delle 12 URL in sitemap |
| *Pagine* → Canonical | nessun «Google ha scelto un canonical diverso» sulle pagine nuove |
