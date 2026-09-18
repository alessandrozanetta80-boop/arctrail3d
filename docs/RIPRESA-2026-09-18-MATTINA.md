# Ripresa — 18/09/2026, mattina

| | |
|---|---|
| **main** | `5fddb4e` — merge ASA/IBO/S26, pushato, identico a `origin/main` |
| **Build online** | `BUILD_STAMP 2026-09-18-usa`, `CACHE_NAME arctrail3d-v160`. `/`, `/app.html`, `/sw.js` identici byte per byte a `origin/main` |
| **Push notification** | `pushNotifica` presente (v2, europe-west1, nodejs20). Codice di `functions/` fermo dal 17/09 17:31 UTC, deploy delle 20:14 UTC: **la versione giusta è online, nessun deploy fatto**. Log e revisione dal vivo **non letti**: il comando è stato bloccato dai permessi della sessione. Prova su telefono vero (background, app chiusa, tap) ancora da fare |
| **S26 / font-scale** | online; `banco-font-scale` 61/61 |
| **ASA** | online; `banco-asa` 79/79 |
| **IBO** | online; `banco-ibo` 92/92 |
| **SEO** | fatto sul branch, **non online** finché la PR non viene unita |
| **Branch SEO** | `seo/international-indexing-2026-09-18` |
| **PR** | PR_PLACEHOLDER — **da non unire in automatico** |
| **Test** | suite PAR=1 prima: 34 banchi, 33 verdi, rosso solo `controlla-token`. Sul branch SEO: **35 banchi, 34 verdi**, rosso solo `controlla-token` con numeri identici; `banco-seo` 204/204, sabotaggio visto rosso |

## Problemi rimasti

1. `controlla-token` rosso: debito di stile vecchio, non toccato.
2. Multilingua: hreflang verso `?lang=` non canonici → `docs/SEO-MULTILINGUA-PIANO.md`.
3. Functions su Node 20: da alzare **prima del 30/10/2026**.
4. `fitarco.it` risponde 503 agli strumenti automatici: la pagina FITARCO e le
   verifiche sulle ranking vanno fatte da browser.

## Decisioni umane

1. **Unire la PR SEO?** Poi `docs/SEARCH-CONSOLE-NEXT.md` (sitemap:
   https://arctrail3d.com/sitemap.xml).
2. **Multilingua:** schema `/en/`, `/` adattiva o italiana (piano §5).
3. **Ranking:** strada A (link alla pagina ufficiale), B (a mano) o C (accordo)
   → `docs/RANKING-UFFICIALI-FONTI.md`.
4. Rimaste dal 17/09: i due 12-ring ASA, Known/Unknown, conteggio spareggi,
   Node 22.

## Prossimo passo

Rivedere la PR, unirla, verificare online e fare i sei passi di Search Console.
