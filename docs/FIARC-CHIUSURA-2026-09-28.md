# FIARC: calendario reale e audit mirato. 28/09/2026

Il giro è partito dal task `CLAUDE_TASK_ARCTRAIL_FIARC.md` ed è stato fatto da Claude Code sul ramo
`main` il 28/09 e chiuso il 29/09 (timbro, test finali, report). Il giro di lavoro non ha fatto
né commit né push: la pubblicazione è venuta dopo (§0).

**Stato: PUBBLICATO E VERIFICATO ONLINE (29/09/2026).** Restano aperti solo i punti della §6.

## 0. Pubblicazione (29/09/2026)

- **Commit** `1bcc935` «feat(fiarc): calendario reale 2026 e audit area FIARC», pushato su
  `main` (`main` = `origin/main` = `1bcc935`). Solo sito: **Functions, regole Firestore e APK
  invariati**.
- **Verifica di produzione su arctrail3d.com, 29/09/2026:**
  - `app.html` risponde HTTP 200, `BUILD_STAMP` `2026-09-29-calendario-fiarc`;
  - 17 gare FIARC vere presenti, `CAL_MOCK` assente, `CAL_AGGIORNATO` = `2026-09-28`;
  - prima e ultima gara presenti: `01DAHU` 04/10 e `14ELFI` 22/11;
  - `sw.js` online: cassa `arctrail3d-v172`, genitore `v171`, impronta
    `arctrail3d-v172:5bf13f453fcbe9da`.
- **Le 6 gare di Emilia Romagna e RSM e Triveneto restano.** Sono verificate sulle pagine
  ufficiali FIARC 2026 (§1) e Alessandro ha chiesto di avere tutto il calendario disponibile.
  L'indicazione della §1 su come toglierle non si applica più.

---

## 1. Fonti ufficiali usate (verificate il 28/09/2026)

La fonte madre è `https://www.fiarc.it/`, sezione *Calendario gare*. La home collega 7 pagine
regionali. Su ogni pagina il calendario è pubblicato come **due immagini** (non c'è nessun feed
né API). La tabella riporta, per ogni pagina, titolo, immagini, impronta SHA-256 (primi 16
caratteri) e `Last-Modified` HTTP delle immagini così come erano il 28/09.

| Zona | Pagina (URL ufficiale) | Titolo pagina | Immagini (`/wp-content/uploads/2026/01/`) | SHA-256 (16) | Last-Modified |
|---|---|---|---|---|---|
| Piemonte e Liguria | https://www.fiarc.it/le-nostre-gare/piemonte-e-liguria-2025/ | «Piemonte e Liguria 2026» | `PIEMONTE_LIGURIA-.jpg`, `PIEMONTE_LIGURIA_2.jpg` | 955d1d7f0d03eb19, 01b50332af75b112 | 28/01/2026 |
| Lombardia | https://www.fiarc.it/le-nostre-gare/lombardia-2025/ | «Lombardia 2026» | `Lom_cale.jpg`, `Lom_cale_2.jpg` | d96dfa5557d786b6, cf021f14bb82dd09 | 28/01/2026 |
| Triveneto | https://www.fiarc.it/le-nostre-gare/triveneto-2025/ | «Triveneto 2026» | `Triveneto_cale.jpg`, `Triveneto_cale_2.jpg` | 556757042958e004, ea541f7ef1f38213 | 30/01/2026 |
| Emilia Romagna e RSM | https://www.fiarc.it/le-nostre-gare/emilia-romagna-e-rsm-2025/ | «Emilia Romagna e RSM 2026» | `Emilia_cale.jpg`, `Emilia_cale_2.jpg` | 2679fb388cd0c575, 62baa53e9eab51a3 | 30/01/2026 |
| Toscana | https://www.fiarc.it/le-nostre-gare/toscana-2025/ | «Toscana 2026» | `Toscana_cale.jpg`, `Toscana_cale_2-1.jpg` | 288dd9267a693ea4, b5b26868db8dd79f | 30/01/2026 |
| Lazio | https://www.fiarc.it/le-nostre-gare/lazio-2026/ | «Lazio 2026» | `Lazio_cale.jpg`, `Lazio_cale_2.jpg` | e40be84d54746a57, 75fdfd43cc9f2f50 | 30/01/2026 |
| Campania, Puglia, Calabria, Basilicata | https://www.fiarc.it/le-nostre-gare/campania-puglia-calabria-basilicata-2026/ | «Campania, Puglia, Calabria, Basilicata 2026» | `CPCB_cale.jpg`, `CPCB_cale_2.jpg` | 13ee76e25c8a7930, b606b3127f35f3c4 | 28/01/2026 |

- Tre permalink contengono ancora «2025» (Piemonte-Liguria, Lombardia, Toscana) e due di
  quelli segnalati come dubbi (Emilia, Triveneto). In ogni caso il titolo della pagina e
  l'intestazione dell'immagine dicono **«CALENDARIO GARE 2026»**, e le immagini sono caricate in
  `/2026/01/`. Sulle pagine non compare nessuna immagine caricata nel 2025.
- Le 11 gare del task sono state **ricontrollate una per una** sulle immagini e coincidono con
  la trascrizione di ChatGPT per data, codice e tipo.

### Emilia Romagna e RSM, Triveneto: aggiunte, con prova

Il task le escludeva perché ChatGPT aveva visto immagini «Calendario Gare 2025». Il task però
permetteva di aggiungerle se si trovava una fonte 2026 inequivocabile, riportando URL e prova.
Il 28/09 le **stesse pagine ufficiali** collegate dalla home mostrano:

- **Emilia Romagna e RSM**: `Emilia_cale.jpg` ha l'intestazione «CALENDARIO GARE 2026 — EMILIA -
  ROMAGNA e RSM», con date dal 22/02/2026. `Emilia_cale_2.jpg` prosegue, dal 13/09/2026
  all'08/11/2026. Caricate il 30/01/2026.
- **Triveneto**: `Triveneto_cale.jpg` ha l'intestazione «CALENDARIO GARE 2026 — TRIVENETO», con
  date dal 18/01/2026. `Triveneto_cale_2.jpg` prosegue, dal 10/10/2026 al 25/10/2026. Caricate il
  30/01/2026.

Probabilmente il sito è stato aggiornato dopo il controllo di ChatGPT, oppure ChatGPT ha visto
una copia in cache. **Le 6 gare future di queste due zone sono state importate** (§2) e,
su decisione di Alessandro, **restano nel calendario pubblicato** (§0).

## 2. Gare importate (17, dal 28/09/2026 in poi)

| Data | Codice | Tipo | Zona FIARC | Organizzatore (da `compagnie-data.js`) | Regione per il filtro |
|---|---|---|---|---|---|
| 04/10/2026 | 01DAHU | Percorso | Piemonte e Liguria | A.S.D. Compagnia Arcieri del Dahu | Piemonte |
| 04/10/2026 | 09HILL | Percorso | Toscana | Arcieri della Collina | Toscana |
| 10/10/2026 | 06MARE | Tracciato | Triveneto ★ | A.S.D. Arcieri del Mare | Veneto |
| 11/10/2026 | 04GAOP | Tracciato | Lombardia | A.S.D. Gruppo Arcieri Oltrepò Pavese | Lombardia |
| 11/10/2026 | 06MARE | Percorso | Triveneto ★ | A.S.D. Arcieri del Mare | Veneto |
| 18/10/2026 | 04POTA | Round 3D | Lombardia | A.S.D. Compagnia Prealpi Orobiche Trescore Arcieristica | Lombardia |
| 18/10/2026 | 08RAMI | Tracciato | Emilia Romagna e RSM ★ | A.S.D. Frecce di Romagna | Emilia-Romagna |
| 18/10/2026 | 09COVO | Battuta | Toscana | Gli Arcieri del Tiburzi | Toscana |
| 25/10/2026 | 03FINA | Battuta | Piemonte e Liguria | A.S.D. Arcieri del Finale | Liguria |
| 25/10/2026 | 07HAWK | Round 3D | Triveneto ★ | Il Falcone Arco Club | Friuli-Venezia Giulia |
| 25/10/2026 | 08CALE | Battuta | Emilia Romagna e RSM ★ | Le Lontre del Bosconé di Calendasco | Emilia-Romagna |
| 25/10/2026 | 12RING | Battuta | Lazio | A.S.D. La Compagnia dell'Anello | Lazio |
| 08/11/2026 | 08LAUR | Percorso | Emilia Romagna e RSM ★ | — *(codice non presente in `compagnie-data.js`)* | — |
| 08/11/2026 | 09ROSE | Percorso | Toscana | A.S.D. Compagnia Arcieri delle Sei Rose | Toscana |
| 15/11/2026 | 17LAGO | Tracciato | Campania, Puglia, Calabria, Basilicata | A.S.D. Arcieri del Lago | Calabria |
| 22/11/2026 | 09TEAM | Tracciato | Toscana | Arcieri del Borgo le Piane | Toscana |
| 22/11/2026 | 14ELFI | Round 3D | Campania, Puglia, Calabria, Basilicata | Elfi delle Terre Calde | Campania |

★ = zona aggiunta con la prova della §1. Le altre 11 sono esattamente quelle del task.

Per ogni gara valgono queste regole:

- **ID stabile** nella forma `fiarc-AAAA-MM-GG-CODICE-tipo`, per esempio `fiarc-2026-10-04-01DAHU-percorso`.
- `federation:"fiarc"`, `source:"FIARC"`, `country:"it"`, `roundType` scritto esattamente come
  sull'immagine.
- `sourceRef` rimanda alla pagina in `CAL_FONTI`, e `officialUrl` è l'URL di quella pagina.
- **`location` è `null` in tutte le gare**: le immagini non dicono dove si tira. Il campo della
  compagnia **non** è stato usato come luogo della gara, e senza luogo non compare «Portami lì».
- `club` e `region` vengono da `compagnie-data.js` tramite il codice. `region` è la **regione
  della compagnia organizzatrice**, non il luogo della gara. È documentato nel codice (forma del
  dato), e il filtro si chiama «La mia regione», non promette una distanza.
- **`registrationUrl` è `null` in tutte le gare**: non esiste un link ufficiale pubblico alle
  iscrizioni della singola gara. Il gestionale FIARC richiede il login, e non è stato usato come
  finto link pubblico.
- Per `08LAUR`, che non è nel file delle compagnie, **il nome e la regione non sono stati
  indovinati**. La riga mostra «Compagnia 08LAUR» e la zona «Emilia Romagna e RSM».

## 3. Aree non importate

- **Sardegna**: nessuna pagina pubblica FIARC con il calendario regionale 2026. La home collega
  solo una classifica («CLASSIFICA GARA SARDEGNA 22LAM 30 agosto», PDF), che non è un
  calendario. Resta fuori. Il 2025 non è stato riciclato.
- **Gare passate** (prima del 28/09/2026): non importate, perché non servono a chi cerca dove
  andare. In ogni caso il codice nasconde il passato da solo.

## 4. Cosa cambia nell'app

- **`CAL_MOCK` è stato tolto**, insieme alle sue 10 gare inventate su FIARC, FITARCO, DSB, FAAS,
  SFSF e NFAS. Al suo posto ci sono `CAL_AGGIORNATO`, `CAL_FONTI` (7 pagine con anno, URL,
  immagini e data di verifica) e `CAL_GARE` (17 gare).
- **Offline-first**: i dati stanno dentro `app.html`, che è già in `APP_SHELL`. A runtime
  nessuna richiesta va a fiarc.it.
- **Scelta architetturale: dati in `app.html` e non in un file a parte.** Un file dati separato
  avrebbe richiesto un secondo caricamento asincrono, un'altra voce essenziale nella cassa del
  service worker e l'aggiornamento di tutti i banchi che copiano i file in cartelle temporanee.
  Per 17 righe il rischio non valeva il guadagno. Il blocco è autonomo, commentato e ha le
  istruzioni per aggiornarlo. `calEventi()` resta l'unica giuntura.
- **`calGaraValida()`** scarta le righe con data malformata, senza pagina ufficiale, con un anno
  diverso da quello della pagina (così una riga del 2025 non si presenta come 2026) o con una
  federazione diversa. L'ordine è per data e, a parità di data, per id. Il passato sparisce da
  solo.
- **Riga**:
  - la seconda riga mostra federazione, tipo e codice compagnia, per esempio «FIARC · Percorso ·
    01DAHU»;
  - la terza riga mostra «Luogo da confermare · Toscana» (la zona o la regione dell'organizzatore);
  - il dettaglio «Organizza» mostra nome e codice.
- **Cartello «Dati di esempio» tolto** in tutte e nove le lingue (chiave `cal_prova`). Al suo
  posto c'è una nota sobria: «Da calendari ufficiali FIARC · aggiornato al 28/09/2026. Verifica
  sempre sul sito FIARC: ArcTrail non è un servizio FIARC.» (chiave `cal_aggiornato`, 9 lingue).
  La nuova chiave `cal_luogo_nd` («Luogo da confermare») è anch'essa in 9 lingue.
- Il tasto **«Sito della gara» ora dice «Pagina ufficiale»** in 9 lingue, perché porta alla
  pagina del calendario di zona e non a un sito della singola gara.
- Restano uguali: filtri (weekend, 30 giorni, la mia regione, federazione, tipo), ordinamento,
  vaglio http/https dei link (`calUrlSicuro`), `target=_blank rel=noopener`.
- **Versioni**:
  - app `2026-09-29-calendario-fiarc` (genitore `2026-09-22-testata-s26`). Il 28/09 era
    `2026-09-28-calendario-fiarc`; il 29/09 il lavoro si è chiuso e `app.html` risultava
    modificato quel giorno, quindi `controlla-versioni` chiedeva un timbro non più vecchio
    del file. È cambiato **solo il timbro**: dati del calendario, `CAL_AGGIORNATO` e
    `verificata` restano al 28/09, che è la data vera della verifica sulle fonti;
  - cassa `arctrail3d-v172` (genitore `v171`), invariata dal 28/09; è online dal 29/09 (§0);
  - `SHELL_IMPRONTA` riscritta il 29/09 con `controlla-cache.js --scrivi
    --versione-non-pubblicata`: `arctrail3d-v172:5bf13f453fcbe9da`.

## 5. Audit FIARC (stato attuale del codice, non dei report)

| Area | Esito |
|---|---|
| Onboarding Italia | **OK.** L'Italia propone FIARC per prima, poi FITARCO. FIDASC resta fuori elenco finché non ha un regolamento di punteggio. La scelta è salvata in `state.country` / `state.federation`. |
| Profilo, tessera, cambio federazione | **OK, con un limite architetturale** (§6.2). Le tessere sono salvate per federazione (FIARC e FITARCO convivono). La compagnia invece è un campo unico. |
| Compagnia e codice (profilo) | **Corretto in questo giro.** La ricerca non trovava la compagnia scrivendo il codice (`01VERB`), che è proprio il modo in cui un arciere FIARC la conosce. Ora cerca anche sul codice e lo mostra nella riga («01VERB · Via A. Alberti, Vignone (VB)»). |
| Codice compagnia in «Prepara gara» | **Corretto in questo giro.** Per una gara FIARC venivano accettati come validi anche codici FITARCO o esteri presenti nello stesso file (per esempio `FT01100`). Ora vale solo un codice FIARC vero (`codiceFiarcDi`). |
| «Tira» | **OK.** Con FIARC compaiono esattamente Round 3D, Percorso, Tracciato e Battuta, più «Allenamento». Nessun formato FITARCO o IFAA. |
| Punteggi dei 4 formati | **OK, coerenti** tra codice, `fiarc.html`, `docs/ITALIA-READY-2026-09-18.md` e `banco-italia.js`. Round 3D 24×2 (16/14/10, 9/7/5). Percorso 24×3 (11/9/6, 9/7/4, 7/5/2). Tracciato 24 × fino a 3 (22/20/16, 16/14/10, 10/8/4). Battuta 28 piazzole × 48 frecce (13/11/7). **Divergenza trovata solo in un documento storico**: `docs/NOTE-DESIGN.md` riportava per il Percorso 20/18/16 · 14/12/10 · 8/6/4. **Corretto** il documento; il codice era giusto. |
| Descrizioni dei formati | **Non verificabili a fondo.** Distanze e conteggi delle descrizioni (per esempio «max 35 m», «20–55 m») non hanno una fonte nel repository. Il PDF del regolamento non è qui (§6.3). |
| Diario, record, statistiche | **OK, nessuna contaminazione.** I record sono per arciere e per modo di tiro, e FIARC e FITARCO hanno chiavi diverse. Traguardi e stagioni confrontano solo giri dello stesso tipo. |
| Elenco compagnie FIARC | **Coerente** (147 voci FIARC, codici `NN` + 4 lettere). **01VICO non esiste** da nessuna parte (file, storia git su tutti i rami, documenti, altre cartelle): è quasi certamente un refuso per **01BICO** (Compagnia Arcieri Bicocca, Madonna del Sasso). Quella correzione, provincia **VB**, è già in `compagnie-data.js` (commit `3fe51c5`, 18/09). Non c'era niente da fare. |
| `fiarc.html` | **OK.** Cita il Regolamento Sportivo del 02/12/2023 e linka `https://www.fiarc.it/download-regolamenti/`. Il disclaimer «non è un'app ufficiale FIARC» è presente e le tabelle coincidono con il codice. |
| Testi «mock / prova / provvisorio / placeholder» | **OK.** Fuori dal calendario non c'è testo visibile di questo tipo. L'unico «Dati di esempio» era il cartello del calendario, ora tolto. Il segnaposto di importazione «Natale, Luca, 12345, SEM, LB, 01VERB» è un esempio di formato, dichiarato come tale. |

## 6. Problemi FIARC residui

### 6.1 Piccoli (locali, da decidere o fare in un giro breve)
- **Calendario da rinfrescare a mano.** Le immagini FIARC possono cambiare (rinvii, gare
  aggiunte). Consiglio: un controllo delle 7 pagine a metà ottobre e ogni volta che FIARC pubblica
  il calendario 2027. La procedura è scritta nel commento sopra `CAL_FONTI`.
- **Dopo il 22/11/2026 il calendario resta vuoto** finché non arriva il 2027. Mostra lo stato
  vuoto già esistente e non si rompe. Il banco usa un orologio fisso (`OGGI=`), quindi non diventa
  rosso da solo.
- **Codici compagnia con provincia «—»**: `01LUPI`, `03LUNA`, `04CORM`, `09ATON` (e `04GROA` senza
  luogo). Serve l'elenco ufficiale FIARC per completarli.
- **`08LAUR` non è in `compagnie-data.js`.** Va aggiunta quando si ha la scheda ufficiale della
  compagnia.
- Il conteggio «gare» dei traguardi guarda solo i modi della federazione attiva. Chi passa da FIARC
  a FITARCO smette di vedere nel conto le gare FIARC passate (non le perde).

### 6.2 Architetturali (proposta separata, non fatta)
- **Una compagnia per profilo, non una per federazione.** Chi passa da FIARC a FITARCO si tiene
  un `01xxxx` selezionato, mentre la ricerca propone solo `FT…`. Proposta: `profile.compagnie =
  {fiarc:…, fitarco:…}` con migrazione. Priorità media.
- **Regola della regione non uniforme in `compagnie-data.js`.** `01UKKO` (Castellanza, VA) e
  `03FENI` (AL) sono classificati per comitato FIARC, mentre `06SABE` (MN) è classificato per
  geografia. Influisce su «La mia regione». Va scelta una regola (comitato FIARC o regione
  geografica) e applicata a tutto il file. Priorità bassa.
- **Classifiche/ranking ufficiali FIARC**: non implementati, come da task. Non c'è un'API o un
  CSV pubblico, e ci sono questioni di termini e GDPR. Resta un lavoro separato.

### 6.3 Fonti esterne mancanti
- **Sardegna 2026**: nessun calendario pubblico.
- **Luogo esatto delle gare**: le immagini FIARC non lo dicono. Servono i bandi o le locandine
  delle singole compagnie, se e quando le pubblicano.
- **Link iscrizioni pubblici**: non esistono (il gestionale richiede il login).
- **Regolamento Sportivo in PDF**: serve per verificare distanze e conteggi citati nelle
  descrizioni dei formati.
- **Formato della tessera FIARC**: serve per validare il campo, che oggi è testo libero.

## 7. File modificati

- `app.html`:
  - calendario: dati reali, validazione, riga e dettaglio, nota fonte;
  - i18n in 9 lingue (`cal_prova` tolta; `cal_aggiornato` e `cal_luogo_nd` nuove; `cal_official`
    riscritta);
  - ricerca compagnia per codice;
  - controllo del codice FIARC in «Prepara gara»;
  - `BUILD_STAMP`.
- `sw.js`: `CACHE_NAME` `v172`, `CACHE_PARENT` `v171`, `SHELL_IMPRONTA`.
- `tests/banco-calendario.js`: riscritto sulle gare vere, con orologio fermo al 28/09/2026.
- `tests/banco-calendario-fiarc.js`: **nuovo**, 66 prove.
- `tests/banco-compagnia.js`: due prove per le correzioni dell'audit.
- `tests/banco-firme.js` e `tests/prova-schermo.js` (29/09): conoscono `codiceFiarcDi`. Sono
  banchi che estraggono pezzi di `app.html` e non contano le prove; dopo l'audit si fermavano
  con `ReferenceError: codiceFiarcDi is not defined` (vedi §8.1). Il primo ha uno stub
  coerente col suo elenco finto, il secondo estrae la funzione vera.
- `tests/controlla-tutto.sh`: registrato il banco nuovo.
- `tools/prepara-consegna.ps1`: questo report entra nella consegna come `08-FIARC-REPORT.md`.
- `docs/NOTE-DESIGN.md`: punteggi del Percorso corretti.
- `docs/FIARC-CHIUSURA-2026-09-28.md` (questo file) e `docs/STATO-RIPRESA.md`.

## 8. Test

Vedi §8.1 (compilata a fine giro con i risultati veri).

### 8.1 Risultati (29/09/2026)

**Prima suite completa, 29/09 mattina** (`PAR=6 sh tests/controlla-tutto.sh`): 68 banchi, 2973
prove contate, **1 caduta**: `controlla-versioni`, «timbro 2026-09-28 ≥ ultima modifica
2026-09-29» (`app.html` risultava toccato il 29/09 con il timbro ancora del 28/09).
Correzione: `BUILD_STAMP` passa a `2026-09-29-calendario-fiarc` e `SHELL_IMPRONTA` viene
riscritta sulla stessa cassa v172 (§4). Nessun dato del calendario è cambiato.

**Seconda suite, dopo il timbro:** 68 banchi, 2973 prove, **0 cadute, ma uscita 1** («ALMENO
UNO HA DETTO NO»). Leggendo a mano i banchi che non contano le prove sono emersi due crolli
causati dal giro FIARC, che il conteggio non poteva vedere:
- `banco-firme.js`: `ReferenceError: codiceFiarcDi is not defined` dentro `pgImporta`;
- `prova-schermo.js`: stesso errore dentro `diciCompagnia` / `iscrittoRow`.

Il codice dell'app era giusto: mancava la funzione nuova nei due banchi (§7). Nel log di
ieri/stamattina non si leggeva perché era scritto in UTF-16 da `Tee-Object`.

**Suite finale, 29/09: `sh tests/controlla-tutto.sh` → 68 banchi, 2973 prove contate, 0
cadute, «TUTTI PASSATI», uscita 0.**
- I 4 banchi senza conteggio sono stati letti a mano e sono puliti: `controlla-token` («Niente
  e' peggiorato»), `banco-firme`, `prova-schermo` e mercatino.
- Saltato come sempre: `banco-porta.js` (esterno, vuole la rete vera).

**Banchi pertinenti rilanciati uno per uno (29/09, dopo il timbro), tutti uscita 0:**

| Banco | Esito |
|---|---|
| `controlla-versioni` | 30/30 |
| `controlla-cache` | impronta `arctrail3d-v172:5bf13f453fcbe9da` coerente |
| `controlla-sintassi` | OK (tutti i copioni sono grammatica) |
| `controlla-pwa` | 26/26 |
| `controlla-pubblicazione` | 32/32 |
| `banco-calendario` | 65/65 |
| `banco-calendario-fiarc` (nuovo) | 66/66 |
| `banco-compagnia` | 72/72 |
| `banco-italia` | 72/72 |
| `banco-italia-mobile` | 513/513 |
| `banco-italia-offline` | 9/9 |
| `banco-lingue` | tutte passate (9 lingue) |
| `banco-paese-lingua` | 30/30 |
| `banco-sw-aggiornamento` | 14/14 |
| `banco-salto-versione` | 16/16 |
| `banco-avvio` | 48/48 |
| `banco-tiri` | 28/28 |
| `banco-firme`, `prova-schermo` (dopo la correzione) | puliti |
