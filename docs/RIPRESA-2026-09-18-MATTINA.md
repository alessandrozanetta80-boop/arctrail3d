# Ripresa — 18/09/2026 (aggiornata a fine mattina)

| | |
|---|---|
| **main** | `d93670a` — merge della PR #4, identico a `origin/main` |
| **Build online** | `BUILD_STAMP 2026-09-18-inglese` (app e vetrina), `CACHE_NAME arctrail3d-v162`. `/`, `/app.html`, `/sw.js`, `/sitemap.xml` identici byte per byte a `origin/main`, GitHub Pages «built» |
| **PR #3** (SEO) | **unita** (`3bfc18c`) e online: `asa-3d.html`, `ibo-3d.html`, `3d-archery-scoring-app.html`, hub a 6 regolamenti / 19 federazioni, link home → hub |
| **PR #4** (inglese) | **unita** (`d93670a`) e online |
| **ASA / IBO** | online; `banco-asa` 79/79, `banco-ibo` 92/92 |
| **S26 / font-scale** | online; `banco-font-scale` 61/61 |
| **app.html** | `noindex,follow`, **fuori dalla sitemap**; PWA e service worker verificati sul sito vero |
| **Sitemap** | 12 URL: `/`, presentazione, privacy, termini, fiarc, regolamenti-3d, world-archery-3d, ifaa-3d, nfas-3d, 3d-archery-scoring-app, asa-3d, ibo-3d |
| **Inglese** | vetrina: `en` neutro (World Archery, IFAA; nessun paese davanti); «English (US)» → ASA/IBO; «English (UK)» → Archery GB/EFAA/NFAS. Solo scelti, mai dedotti. Nessun URL `/en*/` ancora: piano in `SEO-MULTILINGUA-PIANO.md` §2-bis |
| **Test** | suite PAR=1: **36 banchi, 35 verdi**, unico rosso `controlla-token` (debito di stile, numeri invariati dal 17/09). `banco-seo` 204/204, `banco-vetrina-inglese` 169/169 |
| **pushNotifica** | presente (v2, europe-west1, nodejs20); `functions/` ferma dal 17/09 17:31 UTC, deploy delle 20:14 UTC: la versione giusta è online, **nessun deploy** fatto il 18/09. Log e revisione dal vivo non letti (comando bloccato dai permessi della sessione) |

## Richiede ancora un telefono vero

1. Samsung S26 reale: il fix font-scale è provato solo in Chromium simulato.
2. Push con app **in background**.
3. Push con app **completamente chiusa**.
4. **Tap** sulla notifica → schermata giusta.

## Problemi rimasti

1. `controlla-token` rosso: debito di stile.
2. Multilingua: hreflang verso `?lang=` non canonici → `docs/SEO-MULTILINGUA-PIANO.md`.
3. Functions su Node 20: da alzare **prima del 30/10/2026**.
4. L'app propone ancora una federazione UK a chi la usa in inglese (`LANG_TO_COUNTRY` en→uk).
5. `fitarco.it` risponde 503 agli strumenti automatici.

## Decisioni umane

1. Search Console: `docs/SEARCH-CONSOLE-NEXT.md` (sitemap: https://arctrail3d.com/sitemap.xml).
2. Multilingua: URL fisici per tutte le lingue (piano §2, §5).
3. Ranking: A / B / C → `docs/RANKING-UFFICIALI-FONTI.md`.
4. Rimaste dal 17/09: i due 12-ring ASA, Known/Unknown, spareggi, Node 22.

## Lavoro che parte ora

**Arc Trail Italia ready** — branch `release/italia-ready-2026-09-18`: FIARC e
FITARCO in primo piano, FIDASC nascosta (non cancellata), audit dei
regolamenti, flussi completi, italiano della UI, mobile, offline. Rapporto in
`docs/ITALIA-READY-2026-09-18.md`.
