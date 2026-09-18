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
/en/         vetrina in inglese internazionale, statica (catch-all)
/en-us/      vetrina per gli Stati Uniti — solo perche' e' davvero diversa (§2-bis)
/en-gb/      vetrina per il Regno Unito — idem
/fr/ /de/ /tr/ /ru/ /es/ /sv/ /nl/
```

Ogni `/xx/index.html`:

- `<html lang="xx">`, `<title>` e `description` in quella lingua **nel file**;
- canonical su se stessa;
- lo stesso blocco di hreflang (9 lingue, più `en-US` ed `en-GB` per la
  vetrina) + x-default → `/`, **identico in tutte**
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

## 2-bis. L'inglese: una variante generica, due regionali solo dove servono

*Aggiunto il 18/09/2026 su indicazione di Alessandro.*

L'inglese **non** è una variante sola e indistinta. Ma nemmeno tre copie di
tutto: una variante regionale nasce **solo** quando il contenuto è davvero
diverso.

```
/en/       English internazionale — la variante di ripiego (catch-all)
/en-us/    English USA  — solo pagine con contenuto americano vero
/en-gb/    English UK   — solo pagine con contenuto britannico vero
```

### Gli hreflang

| Codice | URL | Chi ci arriva |
|---|---|---|
| `en` | `/en/…` | chiunque legga inglese e non sia coperto da una variante regionale: Irlanda, Australia, Canada, chi cerca in inglese dall'Europa… |
| `en-US` | `/en-us/…` | chi cerca in inglese dagli Stati Uniti |
| `en-GB` | `/en-gb/…` | chi cerca in inglese dal Regno Unito |
| `x-default` | `/` | chi non ha una lingua fra quelle offerte |

Regole che il banco dovrà pretendere:

1. **Un gruppo che ha `en-US` o `en-GB` ha sempre anche `en`.** La variante
   regionale non sostituisce quella generica: senza `en`, un irlandese non ha
   una pagina di ripiego.
2. **Ogni pagina del gruppo elenca tutte le altre e se stessa**, con lo stesso
   blocco identico (reciprocità), e ha il canonical su se stessa. Mai il
   canonical di `/en-us/` su `/en/`: sarebbero di nuovo alternative non canoniche,
   cioè il problema di oggi.
3. **`<html lang>` coerente:** `en`, `en-US`, `en-GB`.
4. **Una pagina che non ha varianti regionali non dichiara codici regionali.**
   Niente `en-US` «per sicurezza» su una pagina che esiste in una versione sola.

### Quando nasce una variante regionale — e quando no

**Criterio:** la pagina `/en-us/` o `/en-gb/` deve differire da `/en/` in
qualcosa che il lettore **vede e usa**: le federazioni proposte, le unità, i
termini, gli esempi, le regole di cui parla. Cambiare solo «colour/color» **non
basta**: quella è una pagina duplicata, e resta in `/en/`.

| Contenuto | Dove | Perché |
|---|---|---|
| **ASA, IBO**, terminologia e iarde americane (*stake*, *yardage*, *known/unknown*), le query `3d archery scoring app`, `asa scoring`, `ibo scoring` | **en-US** | circuiti, parole e unità solo americane |
| **NFAS, EFAA, Archery GB**, terminologia britannica (*peg*, *round*, *club shoot*) | **en-GB** | circuiti e parole solo britanniche |
| World Archery 3D, IFAA, FIARC in inglese; la tabella di confronto; privacy e termini | **en** | uguali per tutti i lettori inglesi |

### La vetrina è già il caso da regionalizzare

In `index.html` oggi `LINGUA_PAESE` fa **`en: "uk"`**: chi legge la vetrina in
inglese vede le federazioni britanniche in cima e nell'elenco, **anche se è
americano** e cerca un segnapunti ASA. Con le varianti:

- `/en/` — nessun paese: federazioni per circuito, senza privilegiarne uno;
- `/en-us/` — ASA e IBO in evidenza, iarde, i due link a `asa-3d.html` e
  `ibo-3d.html`;
- `/en-gb/` — NFAS, EFAA e Archery GB in evidenza.

Tecnicamente: `PAROLE` resta con la chiave `en`, più **sovrascritture solo
per le chiavi che cambiano** (`en-US`, `en-GB`); il generatore usa
`PAROLE[k]["en-US"]` se c'è, altrimenti `PAROLE[k].en`. `LINGUA_PAESE`
diventa per variante (`en` → nessun paese, `en-US` → `us`, `en-GB` → `uk`).
Così una frase uguale si scrive una volta sola, e la variante contiene solo
la differenza — che è anche la prova che la variante ha ragione di esistere.

### Le pagine inglesi già pubblicate nella PR #3

`asa-3d.html`, `ibo-3d.html` e `3d-archery-scoring-app.html` stanno in radice,
`lang="en"`, senza hreflang. **Restano dove sono.** GitHub Pages non fa
redirect 301 lato server: spostare un URL già indicizzato vorrebbe dire un
redirect in HTML/JS, che trasmette i segnali peggio. Quindi:

- `asa-3d.html` e `ibo-3d.html` sono contenuto americano **senza alternative**:
  per la regola 4 non dichiarano hreflang. Col tempo si può portare
  `<html lang>` a `en-US` — è un cambio di una riga, non una migrazione;
- `3d-archery-scoring-app.html` oggi confronta **tutti** i regolamenti: è
  contenuto generico, cioè la pagina `en`. La query `3d archery scoring app`
  dagli Stati Uniti la serve lei **finché** non esiste una versione americana
  diversa davvero (ASA e IBO in testa, iarde, niente FIARC in evidenza). Quando
  nascerà, la radice resterà `en` e la nuova `/en-us/…` sarà `en-US`, con
  hreflang reciproco fra le due — senza spostare niente.

### Cosa NON fare

- non generare `/en-us/` e `/en-gb/` per tutte le pagine «perché il generatore
  lo sa fare»;
- non regionalizzare l'app (`app.html`): è noindex, la lingua la sceglie
  l'utente;
- non usare codici solo-paese (`hreflang="us"` non esiste) né `en-UK` (il
  codice giusto è `en-GB`).

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
| **`banco-seo`** | oggi accetta in `<html lang>` solo i nove codici base: `en-US`/`en-GB` sarebbero rossi | allargare la lista **e** aggiungere le regole di §2-bis: `en` sempre presente accanto a un regionale, niente codici regionali su pagine senza varianti, `en-GB` e mai `en-UK` |

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

1. **Schema degli URL:** cartelle per lingua — deciso il 18/09: `/it/`, `/en/`,
   `/de/`, `/fr/` …, più `/en-us/` ed `/en-gb/` solo dove il contenuto è
   regionale (§2-bis). Resta da decidere **quali pagine** nascono per prime in
   `en-US`/`en-GB`: consigliata la sola vetrina.
2. **`/` resta adattiva** (consigliato: nessun link esistente si rompe) o
   diventa italiana fissa?
3. **Le pagine regolamento in italiano** (`fiarc.html`, `world-archery-3d.html`,
   `ifaa-3d.html`, `nfas-3d.html`, `regolamenti-3d.html`) restano solo in
   italiano? Tradurle è un lavoro di contenuti, non tecnico.

## 6. Stima

Generatore + banco + sitemap + timbri: **mezza giornata** di lavoro con la
suite accanto. Pubblicazione separata, su un branch suo, dopo che la PR SEO
del 18/09 è stata unita.
