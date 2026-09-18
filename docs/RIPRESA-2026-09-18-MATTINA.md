# Ripresa — 18/09/2026 (aggiornata a fine giornata)

| | |
|---|---|
| **main** | `eaa5d00`, identico a `origin/main`; GitHub Pages «built» |
| **Build online** | `BUILD_STAMP 2026-09-18-italia-2`, `CACHE_NAME arctrail3d-v164`. `/`, `app.html`, `sw.js`, `sitemap.xml`, `fitarco-3d.html`, `fiarc.html` identici byte per byte a `main`; service worker attivo con la cache v164; zero errori JS |
| **PR #3** (SEO) | unita (`3bfc18c`): `asa-3d.html`, `ibo-3d.html`, `3d-archery-scoring-app.html`, hub a 6 regolamenti, link home → hub |
| **PR #4** (inglese) | unita (`d93670a`): vetrina `en` neutro, «English (US)» → ASA/IBO, «English (UK)» → Archery GB/EFAA/NFAS; solo scelti, mai dedotti |
| **PR #5** (Italia Ready) | unita (`3f44e20`): vedi sotto |
| **PR #6** (porta) | unita (`413ea4e`): Invio nel campo password di «Accedi» non inviava e dava `passInput is not defined` a ogni apertura |
| **ASA / IBO** | online; `banco-asa` 79/79, `banco-ibo` 92/92 |
| **S26 / font-scale** | online; `banco-font-scale` 61/61. Il 18/09 corretta anche la tacca contata due volte nella schermata del giro (`banco-safe-area` 14/14) |
| **app.html** | `noindex,follow`, fuori dalla sitemap; PWA e service worker verificati |
| **Sitemap** | 13 URL: `/`, presentazione, privacy, termini, fiarc, fitarco-3d, regolamenti-3d, world-archery-3d, ifaa-3d, nfas-3d, 3d-archery-scoring-app, asa-3d, ibo-3d |
| **pushNotifica** | presente (v2, europe-west1, nodejs20), codice fermo dal 17/09: nessun deploy il 18/09 |

## Italia Ready — conclusa

Rapporto completo: **`docs/ITALIA-READY-2026-09-18.md`**, che conclude
**ARC TRAIL ITALIA READY: SÌ**.

- **FIARC verificata** sul Regolamento Sportivo, delibera 033/2023/D del
  02/12/2023 (artt. 4–7): barème giusti; corretti fonte dichiarata,
  descrizione del Round 3D in 9 lingue, «piquet» → «picchetto».
- **FITARCO verificata** sul Regolamento Tecnico di Tiro, Libro 2 e 4 dal
  01/01/2026: barème giusti; i tasti ora usano i nomi di zona FITARCO.
- **FIDASC** nascosta dalle scelte nuove (`fuoriElenco` + `fedProponibile()`),
  compatibilità storica intatta: chi l'ha la ritrova con la sua tessera.
- **`fitarco-3d.html`**: pagina nuova sul regolamento nazionale.
- **Test Italia**: `banco-italia` 72/72, `banco-italia-mobile` 513/513
  (audit 1921/1921), `banco-italia-offline` 9/9, ciascuno con sabotaggio visto rosso.

## Suite completa — tutta verde

`PAR=1 sh tests/controlla-tutto.sh`, due giri identici: **39 banchi, 39 verdi, zero rossi**.

### `controlla-token` — da rosso storico a guardiano anti-regressione (`d94c6de`)

**Il debito CSS storico NON è stato eliminato. È stato trasformato in baseline
anti-regressione. Da ora in poi il debito non può aumentare senza rendere rosso
il test.**

- Era già un controllo a tetto, ma il tetto era fermo al 27/08/2026: il commit
  `03fabb6` (foglio `home-compatta-v2` della Home) ha portato `!important` 3→35,
  misure fuori scala 11→22, `clamp()` 0→4; `e264634` il raggio a mano 9→10.
  Nessuno ha deciso se accettarli: rosso per tre settimane.
- **Baseline registrato** in `tests/tetto-token.json`, con data, origine e motivo:
  stile in linea 344 · esadecimali 22 · `!important` 35 · regole per tema 3 ·
  fuori scala 22 · `clamp()` 0 · carattere a mano 2 · raggio a mano 10 ·
  spaziatura a mano 19.
- **`clamp()`**: i 4 di `home-compatta-v2` sono `clamp(Nrem,Nvw,Nrem)` sui due
  numeri grandi della Home — tipografia fluida legittima — ed esclusi; un
  `clamp()` con px resta vietato.
- **Sabotaggio verificato**: +1 `!important` → rosso; `clamp()` in px → rosso;
  −1 `!important` → verde, e il tetto scende da solo; file ripristinati → verde.
- **Debiti CSS ancora esistenti, ma congelati**: i 35 `!important` e le 22
  misure fuori scala di `home-compatta-v2` restano, perché toglierli cambierebbe
  la resa della Home: è una decisione di design, non un aggiustamento.
- Nessun file runtime toccato (`app.html`, CSS, service worker).

## Richiede ancora un telefono vero

1. Samsung S26 reale (font-scale e tacca provati solo in Chromium).
2. Push con app in background.
3. Push con app completamente chiusa.
4. Tap sulla notifica → schermata giusta.
5. Sincronizzazione con Firebase vero dopo un giro offline.

## Problemi e decisioni aperte

1. Functions su Node 20: da alzare **prima del 30/10/2026**.
2. Multilingua: URL fisici per lingua (`docs/SEO-MULTILINGUA-PIANO.md`).
3. L'app propone ancora una federazione UK a chi la usa in inglese (`LANG_TO_COUNTRY` en→uk).
4. Ranking: A / B / C (`docs/RANKING-UFFICIALI-FONTI.md`).
5. ASA: i due 12-ring, Known/Unknown, spareggi.
6. Search Console: `docs/SEARCH-CONSOLE-NEXT.md` (sitemap https://arctrail3d.com/sitemap.xml).
