# Arc Trail Italia ready — 18/09/2026

Branch `release/italia-ready-2026-09-18`, partito da `main` a `ef7aa22`.
Obiettivo: un arciere italiano trova FIARC e FITARCO davanti, conta giusto,
ritrova i suoi giri, e l'app regge sul telefono e senza rete. **Nessuna
funzione nuova, nessun ridisegno, nessun dato toccato.**

Legenda: **VERDE** provato e a posto · **DA VERIFICARE** non dimostrabile da
qui (serve hardware o un account vero) · **BLOCCANTE** impedisce il rilascio.

## La tabella

| AREA | FIARC | FITARCO | ESITO | NOTE |
|---|---|---|---|---|
| Fonti | Regolamento Sportivo, delibera 033/2023/D del 02/12/2023 (fiarc.it, ancora il vigente il 18/09) | Regolamento Tecnico di Tiro, Libro 2 e Libro 4 in vigore dal 01/01/2026 (fitarco.it, scaricati il 18/09) | VERDE | Letti articolo per articolo. `REGOLAMENTI.fiarc_rt` citava il Regolamento **Tecnico** (classi) come fonte dei punteggi: corretto in **Sportivo**, con URL, `verificato` |
| Regolamenti | Round 3D (art. 7), Percorso (5), Tracciato (6), Battuta (4) | 3D (L2 4.5.6.1, L4 23.3.1), zone (L2 9.2.2) | VERDE | Barème identici alle fonti, scritti a mano in `banco-italia.js` |
| Scoring | 16/14/10–9/7/5 · 11/9/6–9/7/4–7/5/2 · 22/20/16–16/14/10–10/8/4 · 13/11/7; branco si ferma al primo zero, tempo somma sempre | 11/10/8/5 uguali per le due frecce, 24 sagome | VERDE | FITARCO: i tasti dicevano Perfect/Super Spot (parole FIARC): ora i nomi di L2 art. 9.2.2, chiavi dei dati invariate |
| Onboarding | proposta per prima | proposta per seconda | VERDE | Italia preselezionata dalla lingua; solo FIARC e FITARCO. La tendina «aggiungi federazione» ora mette il paese dell'arciere per primo (prima: ÖBSV, FFTA, FFTL, DFBV, DSB davanti) |
| Profilo | FIARC · Italia | idem | VERDE | Riga della federazione attiva, Impostazioni, modifica |
| Tessere | FI111 salvata | FT222 salvata | VERDE | `data-tessera-fed` per federazione |
| Doppia federazione | ✓ | ✓ | VERDE | Si cambia la federazione attiva, le due tessere restano; modificata una, l'altra resta com'era |
| Tira | solo Round 3D, Percorso, Tracciato, Battuta | solo «3D», nessun formato FIARC | VERDE | Nessuna contaminazione fra i due |
| Salvataggio | 24 × [16, 7] = 552 nello storico | 24 × [11, 10] = 504 | VERDE | |
| Riapertura | giro a metà → chiudi → «Riprendi percorso» → piazzola 11 | idem (offline) | VERDE | Anche con l'app installata e senza rete |
| Diario | Round 3D 552 | 3D 504 | VERDE | Riaprendo l'app ci sono tutti e due |
| Storico | modeKey `round3d` | `fitarco3d` | VERDE | |
| Record | 552, una sola volta | 504, a parte | VERDE | Chiavi `nome|modo`: mai sommati |
| Statistiche | «Insieme» mostra il regolamento attivo | idem | VERDE | Media 504 · 3D, **non** 528 (media mescolata) |
| Offline | app installata, rete staccata: si apre, segna, riprende | idem | VERDE | `banco-italia-offline.js` su http con service worker vero |
| Sync | non modificata | non modificata | DA VERIFICARE | La coda verso il cloud è provata da `banco-giro-sicuro` con una nube finta; con Firebase vero serve un account e un telefono |
| Mobile | 360/384/390/412/430 px × 100/120/150 % | idem | VERDE | 1921 controlli, 0 rossi. Trovato e corretto: nella schermata del giro la tacca del telefono era contata **due volte** (125 px invece di ~55) e c'erano 12 px scoperti sopra la testata |
| Calendario | filtro FIARC, eventi d'esempio | filtro FITARCO | VERDE | FIDASC assente; la fila dei filtri scorre di lato apposta; «Dati di esempio» dichiarato |
| Sito | `fiarc.html` ora linka l'hub e FITARCO | **nuova** `fitarco-3d.html` | VERDE | 360/390 px senza scorrimento; hub e World Archery la collegano |
| SEO | title, description, H1, canonical, robots a posto | pagina con contenuto nazionale vero, non un doppione | VERDE | `banco-seo` 217/217; sitemap a 13 URL |
| Italiano | descrizione Round 3D sbagliata in 9 lingue | nomi zona corretti in 9 lingue | VERDE | «dallo stesso piquet» → due distanze diverse (art. 7.1b); «ginocchio mai ammesso» → mai imposto (7.1f); «piquet» → «picchetto» in 10 frasi |
| FIDASC | — | — | VERDE | Nascosta dalle scelte nuove; chi ce l'ha la ritrova, con tessera e «Conferma» |
| Claim | «non è un'app ufficiale FIARC» | «non è un'app ufficiale FITARCO», e la scheda cartacea prevale (L4 25.4.1) | VERDE | Nessuna promessa di validità in gara |

**Nessun BLOCCANTE.**

## FITARCO: cosa è confermato e da chi

| | Informazione | Fonte |
|---|---|---|
| **A** | 24 sagome a distanze sconosciute, 2 frecce | L2 art. 4.5.6.1; L4 art. 23.3.1 |
| **A** | quattro zone 11, 10, 8, 5 e come sono disegnate | L2 art. 9.2.2 |
| **A** | linea al valore più alto; corna e zoccoli Miss; coda e ali valide | L2 art. 9.2.2 |
| **A** | freccia passante senza accordo = 5 | L4 art. 25.2.2 |
| **A** | pari merito: più 11, poi più 10 | L4 art. 25.3.1 |
| **A** | divisioni: Compound, Arco Nudo, Longbow, Tradizionale (Istintivo) | L2 art. 4.3.7 |
| **A** | picchetto rosso (Compound) 5–45 m, blu (le altre) 5–30 m | L2 art. 9.1.1.7 |
| **A** | fino a 6 «piazzole bis» nelle gare FITARCO | nota a L2 art. 4.5.6.1 |
| **B** | tempo di tiro, fasi finali | World Archery Book 4 (applicato da FITARCO) — l'app non li usa |
| **C** | classi 3D (Seniores/Juniores?) | la ranking list pubblica filtra S e J, ma nei Libri 2/4 non c'è una tabella di classi 3D: **non dichiarato** in app né sul sito |

## FIDASC: dove è nascosta, cosa resta

- **Nascosta** (`fuoriElenco` + `fedProponibile()`): passo «federazione» del
  primo avvio e delle Impostazioni; tendina «aggiungi federazione» del profilo
  e della registrazione. Vetrina e presentazione già non la mostravano
  (nessun barème).
- **Resta**: `FEDERATIONS.fidasc`, `COUNTRY_FEDERATIONS.it`, `PROFILE_FEDERATIONS`,
  `REGOLAMENTI.fidasc_reg`. Chi l'ha: profilo «FIDASC · Italia», Impostazioni
  con FIDASC selezionata e «Conferma», tessera intatta, Tira che spiega che il
  regolamento non c'è. Nessun dato migrato.

## `controlla-token`

Unico rosso della suite, **identico** almeno dal commit `9a6060c` (prima di
ASA/IBO): 35 `!important` (tetto 3), 22 misure fuori scala (11), 4 `clamp()`
su caratteri (0), 10 raggi a mano (9). Per rientrare bisogna togliere
`!important` e `clamp()` dal CSS dell'app, cioè cambiare la cascata a
runtime: è una decisione di design, non un aggiustamento. Alzare il tetto
nasconderebbe il debito. **Non forzato.**

## Resta fisicamente da fare (serve hardware vero)

1. Samsung S26 reale: font-scale e tacca provati solo in Chromium simulato.
2. Push con app in background.
3. Push con app completamente chiusa.
4. Tap sulla notifica → schermata giusta.
5. Sincronizzazione con Firebase vero dopo un giro offline.

## Test

| Banco | Esito |
|---|---|
| `banco-italia.js` | 68/68; `--sabota` (FIDASC di nuovo scelta) rosso; sabotaggio sul file (Round 3D 9 → 8) rosso |
| `banco-italia-mobile.js` | suite 513/513; `--tutto` 1921/1921; `--sabota` rosso |
| `banco-italia-offline.js` | 9/9; `--sabota` (app.html fuori da sw.js) rosso |
| `banco-safe-area.js` | 14/14 (parte 3 nuova: rossa prima del fix) |
| `banco-seo.js` | 217/217 |
| Suite `PAR=1`, due volte | 39 banchi, 38 verdi, unico rosso `controlla-token`; i due giri danno esiti identici riga per riga |
