# Multilingua e indicizzazione — piano, NON implementato

**Scritto il 18/09/2026** sul branch `seo/international-indexing-2026-09-18`.
Il problema è strutturale: toccarlo vuol dire cambiare come nasce la vetrina.
Per questo qui c'è il piano e nel codice **non è cambiato niente** su questo
punto. `tests/banco-seo.js` lo stampa a ogni giro come «NOTO, NON ROSSO».

---

## 1. Com'è oggi, misurato sui file

| Pagina | `<html lang>` statico | canonical | hreflang | Come sceglie la lingua |
|---|---|---|---|---|
| `/` (`index.html`) | `it` | `https://arctrail3d.com/` | 9 lingue → `/?lang=xx`, x-default → `/` | JS: `?lang` → scelta salvata → lingua del browser → **inglese** |
| `privacy.html` | `it` | `/privacy.html` | `it`, `en` → `?lang=xx`, x-default → senza parametro | JS: mostra un blocco e nasconde l'altro |
| `termini.html` | `it` | `/termini.html` | come privacy | come privacy |
| `app.html` | `it` | `/app.html` | nessuno | JS: `?lang` → profilo → browser |
| pagine regolamento | `it` (le nuove: `en`) | se stesse | nessuno | nessuna: una lingua per pagina |

### Cosa vede Google

1. **Gli hreflang puntano a URL che non sono canonici.** `/?lang=en` è lo
   stesso file di `/`, e dichiara canonical `/`. Google tiene il canonical e
   **scarta l'alternativa**: il gruppo hreflang, in pratica, non esiste. È il
   caso che Search Console classifica di solito come *«Pagina alternativa con
   tag canonical appropriato»* — da verificare lì, non l'ho visto.
2. **La lingua di `/` è ambigua.** L'HTML dice `lang="it"` e ha title e
   description in italiano; Googlebot però esegue il JS con un browser in
   inglese, e `linguaProbabile()` gli risponde inglese: `lang`, `title` e
   `description` diventano inglesi dopo il rendering. Quale delle due versioni
   finisca nell'indice lo decide Google.
3. **Nessuna lingua diversa dall'italiano ha un URL suo.** Chi cerca in
   tedesco trova, se va bene, la pagina italiana.

### Perché non si ripara con una riga

- **Canonical scritto dal JS** (`/?lang=en` → canonical su se stesso): Google
  sconsiglia di cambiare il canonical col JS, e qui il canonical statico
  direbbe una cosa e quello renderizzato un'altra. Due segnali opposti sulla
  home sono peggio di un segnale ignorato.
- **Togliere gli hreflang:** non guadagna niente (oggi sono già ignorati) e
  cancella la mappa delle lingue che servirà dopo.
- **`hreflang="it"` → `/`:** direbbe a Google che `/` è italiano, mentre
  Googlebot la vede in inglese. Scambierebbe un errore con un altro.

Quindi, oggi: **niente**. Il danno attuale è «nove lingue che Google non
vede», non «una penalità».

---

## 2. Dove arrivare

Un URL vero per lingua, con l'HTML **già scritto** in quella lingua — non
tradotto dal JS dopo il caricamento.

```
/            vetrina adattiva, come oggi — diventa l'x-default
/it/         vetrina in italiano, statica
/en/         vetrina in inglese, statica
/fr/ /de/ /tr/ /ru/ /es/ /sv/ /nl/
```

Ogni `/xx/index.html`:

- `<html lang="xx">`, `<title>` e `description` in quella lingua **nel file**;
- canonical su se stessa;
- lo stesso blocco di 9 hreflang + x-default → `/`, **identico in tutte**
  (reciprocità gratis);
- il JS continua a funzionare, ma parte già dalla lingua giusta:
  `?lang` non serve più per entrare.

`/` resta com'è (adattiva) e prende lo stesso blocco hreflang: è la pagina
x-default, cioè quella per chi non ha una lingua fra le nove.

### Come si generano — senza scriverle a mano

Nove copie scritte a mano divergono in un mese. Le parole ci sono già tutte
in `PAROLE` dentro `index.html`: serve **uno script** (`tools/genera-vetrine.py`,
nello stile di `genera-presentazione.py`) che per ogni lingua:

1. prende `index.html`;
2. sostituisce il testo di ogni `[data-k]` con `PAROLE[k][xx]`, e gli `alt` di
   `[data-k-alt]`;
3. scrive `lang`, title, description, canonical, `og:locale`, `og:url`;
4. corregge i percorsi relativi (`vetrina-*.webp`, `logo.webp`, `app.html`)
   perché la pagina sta un livello più giù — **oppure** li rende assoluti
   in `index.html` prima, così la copia non deve toccarli;
5. i link verso l'app diventano `/app.html?lang=xx` (lo fa già `parla()`,
   ma va scritto anche nell'HTML statico).

Il generatore gira prima di ogni pubblicazione della vetrina; un banco
controlla che le nove copie siano **identiche a quello che il generatore
produrrebbe oggi** (se qualcuno ne modifica una a mano, rosso).

---

## 3. Cosa rischia di rompersi, e come si controlla

| Cosa | Rischio | Controllo |
|---|---|---|
| **Service worker** | `APP_SHELL` contiene `./` e `index.html`, non `/xx/`. Offline una navigazione a `/en/` cade sul ripiego di `sw.js` (riga ~312: `index.html` per tutto ciò che non è app/mercatino) | accettabile: la vetrina non serve offline. Da provare con `banco-giro-sicuro` e a mano in modalità aereo |
| **Chi ha già l'app installata** | la vetrina ha lo script che rimanda in `app.html` chi apre in `display-mode: standalone`. Le copie devono tenerlo | `banco-vetrina` sulle copie |
| **Percorsi relativi** | immagini rotte in `/xx/` | banco: ogni `src`/`href` delle copie risolve |
| **`banco-vetrina`** | oggi prova `index.html` in nove lingue via `?lang` | estenderlo: stesse prove su `/xx/` senza parametro |
| **Timbri** | `index.html` cambia → regola 8: `BUILD_STAMP`/`data-build`/`CACHE_NAME` | come sempre |
| **Sitemap** | 9 URL in più | `banco-seo` lo pretende già: ogni pagina indicizzabile in sitemap |

**Nessun impatto** su Firestore, Functions, account, dati degli utenti.

---

## 4. Le pagine legali

`privacy.html` e `termini.html` hanno lo stesso schema (`?lang=it|en` con
canonical senza parametro). Sono pagine a bassa priorità di ricerca: la
strada più semplice è **togliere gli hreflang** quando si fa la vetrina, oppure
spezzarle in `privacy.html` (it) + `privacy-en.html` (en) con hreflang
reciproco. Da decidere insieme alla vetrina, non prima.

---

## 5. Decisioni umane prima di cominciare

1. **Schema degli URL:** `/en/` (consigliato: una cartella per lingua, pulito,
   estendibile) oppure `index-en.html`.
2. **`/` resta adattiva** (consigliato: nessun link esistente si rompe) o
   diventa italiana fissa?
3. **Le pagine regolamento in italiano** (`fiarc.html`, `world-archery-3d.html`,
   `ifaa-3d.html`, `nfas-3d.html`, `regolamenti-3d.html`) restano solo in
   italiano? Tradurle è un lavoro di contenuti, non tecnico.

## 6. Stima

Generatore + banco + sitemap + timbri: **mezza giornata** di lavoro con la
suite accanto. Pubblicazione separata, su un branch suo, dopo che la PR SEO
del 18/09 è stata unita.
