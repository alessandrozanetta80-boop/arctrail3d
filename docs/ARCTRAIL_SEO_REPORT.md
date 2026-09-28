# ARCTRAIL 3D — REPORT SEO / SEARCH CONSOLE — 28/09/2026

## STATO ATTUALE (28/09/2026, dopo la pubblicazione)

| proposta | esito |
|---|---|
| 1. link dalla home alle pagine regolamento | **approvata e pubblicata** (`84ee133`) |
| 2. via gli hreflang verso `?lang=` | **approvata e pubblicata** (`84ee133`) |
| 3. lastmod della home | **approvata e pubblicata** (`84ee133`), con data 2026-09-28 |
| 4. accorciare 4 title | **non approvata**, in sospeso |
| 5. Search Console API | **predisposta, non ancora autorizzata né configurata**: da fare in un secondo momento |

**Audit online finale: stato tecnico OK, 0 bloccanti, 0 avvisi.**

Dettaglio della pubblicazione (fasi B, C, D):
> - **1.** Piede della home: link a World Archery, FITARCO, IFAA, NFAS, ASA, IBO
>   e al confronto in inglese (nomi propri, senza traduzione). Le 7 prioritarie
>   passano da 2 a **1 clic** dalla home.
> - **2.** Tolti gli hreflang verso `?lang=` da `index.html`, `privacy.html`,
>   `termini.html` (un commento dice perché). `banco-seo` ora li considera un
>   errore e controlla i sette link della home (203 prove; sabotaggi
>   `--sabota`, `--sabota-hreflang`, `--sabota-piede` tutti rossi).
> - **3.** `lastmod` della home a **2026-09-28**, non al 19/09 come proposto:
>   con questa modifica la home è cambiata oggi, e la data onesta è questa.
>
> Timbri: vetrina `2026-09-28-seo-regolamenti`, privacy/termini
> `2026-09-28-seo-hreflang`, cassa `arctrail3d-v171` (impronta riscritta).
> Test prima del push: tutti i banchi della vetrina e delle lingue, versioni,
> cassa, pubblicazione, pwa, contrasto, accessibile, bordi — verdi; piede
> guardato a 360 e 1280 px, senza scorrimento orizzontale. Dopo la
> pubblicazione: `controlla-base` IN PARI, file interni a 404,
> **`seo:audit:online` → Stato tecnico OK, 0 bloccanti, 0 avvisi.**
> App, Functions, regole e APK invariati.
>
> **Prossimo passo:** fra 3–4 settimane `npm run seo:control`; niente nuove
> richieste di indicizzazione, salvo al massimo una sulla home (è cambiata
> davvero) se Alessandro vuole accelerare la lettura dei nuovi link.

---

# STORICO — la fase A del 28/09 mattina, come fu scritta

*Da qui in giù è l'analisi fatta PRIMA dell'approvazione. Dove dice «in
attesa», «proposta» o «da approvare», vale lo STATO ATTUALE qui sopra: 1, 2 e 3
sono pubblicate, la 4 non è approvata, la 5 è da fare. Anche i conteggi dei
test (per esempio 217 prove di `banco-seo`) sono quelli di allora.*

Giro di **sola analisi e strumentazione** (fase A). **Nessuna modifica di
produzione:** nessun file del sito toccato, nessun push, nessuna richiesta a
Google. Le proposte in fondo aspettano l'approvazione di Alessandro (fase B).
La procedura viva sta in `docs/SEO-AUTOMAZIONE.md`.

**In una riga:** tecnicamente il sito è sano — nessun errore bloccante, le 7
pagine prioritarie rispondono 200, sono indicizzabili, hanno canonical giusto,
stanno in sitemap e sono linkate. Le 9 pagine «Rilevata, ma non indicizzata»
non hanno un difetto tecnico che le blocchi: Google le conosce e non le ha
ancora scansionate. Si può aiutare con i link dalla home (proposta 1) e
togliendo segnali in conflitto (proposta 2); il resto è tempo e autorevolezza.

---

## 1. Stato iniziale

- Cartella `C:\Users\Ale\Desktop\PROGETTI\ArcTrail3D-Git`, repository
  `alessandrozanetta80-boop/arctrail3d`, ramo `main`, ultimo commit `09b9dd8`
  (1 commit di documenti avanti su `origin/main`, non pubblicato: non tocca il
  sito).
- **Sito online = file locali:** tutte le 16 pagine, `sitemap.xml` e
  `robots.txt` identici a `origin/main` e a quello che serve arctrail3d.com (a
  parte gli a-capo di Windows).
- Search Console al 27/09 (dato di Alessandro): 8 clic e 84 impressioni in 3
  mesi; 4 pagine indicizzate, 15 no (3 redirect, 1 alternativa con canonical,
  9 rilevate non indicizzate, 1 doppione con canonical scelto da Google,
  1 scansionata non indicizzata).
- Esisteva già `tests/banco-seo.js` (217 prove, verde): invarianti SEO sui file.
  Mancava tutto quello che riguarda il sito vero e Search Console.

**Segnalazione (altro progetto):** nella radice c'è
`CLAUDE_TASK_VCO3_CENSIMENTI_RECUPERI_ISPRA_02.md`, identico byte per byte al
file di **Gestionale Comprensori**. È fuori da git, non entra nel sito né nello
ZIP. **Non l'ho toccato:** va tolto a mano da questa cartella quando conviene.
Inoltre `CLAUDE.md` parla della cartella `ArcTrail 3D`, ma sul disco il
progetto è ancora `ArcTrail3D-Git`.

## 2. Controlli eseguiti

Sul sito pubblico e sui file locali, con `tools/seo-audit.js`:

| area | esito |
|---|---|
| **sitemap** `https://arctrail3d.com/sitemap.xml` | 200, `application/xml`, `<urlset>` sitemaps.org ben formato, 13 URL assoluti https, nessun doppione, nessun parametro, nessun redirect, nessuna pagina `noindex`; ogni URL è il canonical della sua pagina; **tutte e 7 le prioritarie presenti**, più home, presentazione, hub, FIARC, privacy, termini; identica al file locale |
| **robots.txt** | 200, `User-agent: *` + `Allow: /`, nessun `Disallow`, `Sitemap:` dichiarata. Googlebot non è bloccato su niente |
| **canonical** | presente, assoluto e su se stessa in tutte le 13 pagine indicizzabili; nessun canonical verso la home per errore |
| **hreflang** | solo su home, privacy e termini, e **puntano a `?lang=xx`** (vedi problema M1). Le pagine regolamento non hanno hreflang: giusto, non hanno traduzioni. EN/EN-US: nessuna distinzione nelle pagine SEO |
| **meta** | title, description, `lang`, H1, Open Graph (title, description, url, image, type) presenti ovunque; nessun title/description/H1 ripetuto; robots `index,follow` sulle 13, `noindex` su app, mercatino, elimina-account (voluto) |
| **link interni** | nessun link rotto; nessuna pagina orfana; le prioritarie hanno 3–4 link entranti ciascuna, **tutti dall'hub e fra loro: dalla home sono a 2 clic** |
| **HTTP** | 200 su tutte, nessun redirect imprevisto, nessun 4xx/5xx, nessun `X-Robots-Tag`; contenuto nell'HTML statico (461–1.140 parole per pagina prioritaria), niente dipende dal JavaScript |
| **dati strutturati** | home: `WebApplication`, `Organization`, `WebSite` (+ `Offer`, `Person`), validi. Pagine regolamento: nessuno — va bene (vedi §4 di `SEO-AUDIT-2026-09-18.md`) |
| **doppioni di contenuto** | nessuna coppia di pagine con più del 30% di testo in comune (5-grammi): **niente pagine doorway** |
| **redirect host** | `http://`, `www` (http e https) e `…github.io/arctrail3d/` → 301 verso `https://arctrail3d.com/`: corretti |

### Cosa spiegano i numeri di Search Console

- **3 «Pagina con reindirizzamento»** = `http://arctrail3d.com/`,
  `https://www.arctrail3d.com/`, `http://www.arctrail3d.com/`: tutti 301 verso
  la home. **Corretto, nessuna azione.**
- **1 «Alternativa con canonical appropriato»** e **1 «Duplicata, Google ha
  scelto un canonical diverso»**: con i file di oggi le candidate sono
  `/index.html` (200, canonical `/`) e gli URL `/?lang=xx`,
  `/privacy.html?lang=en`, `/termini.html?lang=en`, che la home e le pagine
  legali stesse annunciano come hreflang e che hanno canonical senza parametro.
  Con `/?lang=en` il JavaScript mostra la home in inglese, con un canonical
  che dice «sono la home italiana»: è il candidato più probabile per il
  «canonical scelto da Google diverso». **Da confermare** con l'URL Inspection
  via API (`canonicalGoogle` ≠ `canonicalDichiarato`) o a mano in *Pagine* →
  quel motivo → elenco degli URL.
- **9 «Rilevata, ma attualmente non indicizzata»**, ultima scansione N/D:
  Google conosce gli URL ma non li ha mai scaricati. Nessun blocco tecnico
  (sopra). È la coda di scansione di un sito giovane con pochi segnali;
  Google stesso lo spiega con «sito sovraccarico o scansione rimandata». La
  leva che dipende da noi: **percorsi di link più corti da pagine già
  indicizzate** (proposta 1).
- **«Nessuna Sitemap di referral rilevata»** su `3d-archery-scoring-app.html`:
  la sitemap è corretta e contiene l'URL esatto (stesso host, https, senza
  slash o parametri diversi), quindi il motivo non è nel file. Le cause
  possibili, in ordine:
  1. i dati di ispezione di un URL **mai scansionato** sono quasi vuoti, e il
     campo «sitemap di riferimento» spesso non viene compilato finché Google
     non scansiona la pagina;
  2. la sitemap è inviata a **un'altra proprietà** (per esempio a
     `https://arctrail3d.com/` mentre si ispeziona da `sc-domain:`, o il
     contrario), oppure non è stata **riletta** dopo il 18/09, quando le pagine
     ASA, IBO, FITARCO e confronto sono entrate;
  3. la sitemap non risulta inviata affatto.
  **Come si verifica, senza cambiare niente:** Search Console → *Sitemap* (nella
  stessa proprietà dove si fa l'ispezione): stato «Operazione riuscita», data
  di ultima lettura **dopo il 18/09**, **13 URL rilevati**. Con l'API
  configurata lo dice `npm run seo:gsc:ispeziona` (campo `sitemap` di ogni URL,
  più l'elenco delle sitemap con data di lettura).

## 3. Problemi trovati, per priorità

**Alta — bloccanti tecnici: nessuno.**

**Media**

- **M1. hreflang verso URL con parametro** (`index.html`, `privacy.html`,
  `termini.html`). Le annotazioni puntano a `?lang=xx`, che hanno canonical
  sulla pagina senza parametro: Google ignora gli hreflang e in più scopre URL
  duplicati da classificare (probabile origine di «alternativa» e
  «duplicata»). Già noto dal 18/09 (`SEO-MULTILINGUA-PIANO.md`), mai corretto.
- **M2. Le pagine prioritarie sono a 2 clic dalla home**, raggiungibili solo
  attraverso `regolamenti-3d.html`. La home linka solo presentazione, hub,
  privacy, termini e l'app. Per un sito con poche pagine indicizzate, Google
  decide cosa scansionare anche dai link delle pagine che ha già.
- **M3. Search Console API non configurata**: senza, il controllo non sa quali
  pagine sono indicizzate né perché. Serve un'autorizzazione una tantum (§6).

**Bassa**

- **B1.** `lastmod` della home fermo al 2026-08-28, ma la home è cambiata nella
  sostanza il 18–19/09 (inglese neutro, varianti US/UK, correzioni mobile).
  FIARC e World Archery hanno commit del 18/09 ma è un link in più: il loro
  lastmod del 28/08 è onesto.
- **B2.** Title lunghi (verranno tagliati nei risultati): `world-archery-3d.html`
  80 caratteri, `fiarc.html` 73, `fitarco-3d.html` 73, `presentazione.html` 71;
  description di `presentazione.html` 182. Non è un errore, è estetica dello
  snippet.
- **B3.** `/index.html` risponde 200 con la home (canonical `/`): comportamento
  di GitHub Pages, gestito dal canonical, nessuna azione.
- **B4.** Privacy e termini hanno due H1 (uno per lingua): voluto, bassa
  priorità SEO, nessuna azione.

**Non problemi** (da non «correggere»): i 3 redirect degli host; `app.html`,
`marketplace.html`, `elimina-account.html` fuori dall'indice (`noindex`
voluto); privacy e termini non indicizzati (non sono una priorità).

## 4. Cosa è automatizzato, cosa chiede autorizzazione, cosa resta manuale

| | |
|---|---|
| **automatico, da oggi** | audit tecnico completo di file locali e sito vero (`npm run seo:audit`, `seo:audit:online`), exit code non-zero sui bloccanti, report JSON, confronto sito ↔ repository, proposte generate dai problemi trovati |
| **automatico dopo l'autorizzazione una tantum** | clic, impressioni, CTR, posizione, query, pagine, paesi, sitemap inviate e lette, URL Inspection delle prioritarie (`npm run seo:control`, `seo:gsc`, `seo:gsc:ispeziona`) |
| **chiede l'approvazione di Alessandro ogni volta** | ogni modifica ai file del sito (fase B), ogni pubblicazione |
| **resta manuale, per scelta di Google** | «Richiedi indicizzazione» (una volta per URL, solo dopo una modifica vera), invio/reinvio della sitemap nell'interfaccia, gestione utenti di Search Console |

## 5. Strumenti creati

| file | cosa |
|---|---|
| `tools/seo-audit.js` | l'audit, in sola lettura: sitemap (struttura, URL, lastmod, coerenza con canonical e locale), robots.txt (regole per Googlebot), per pagina status/redirect/X-Robots-Tag/title/description/canonical/robots/lang/H1/OG/JSON-LD/hreflang (reciprocità, destinazioni, canonical delle destinazioni), link rotti, orfane, profondità dalla home, doppioni e quasi-doppioni, redirect degli host. Nessuna dipendenza |
| `tools/seo-gsc.js` | Search Console in sola lettura (scope `webmasters.readonly`): service account (JWT firmato con `crypto` di Node) o utente OAuth; autodetect della proprietà; rifiuta credenziali dentro al repository; niente Indexing API. Nessuna dipendenza |
| `docs/SEO-AUTOMAZIONE.md` | la regola A→B→C→D, i comandi, la procedura per autorizzare Search Console |
| `.env.example` | solo percorsi, nessun segreto |
| `package.json` | 5 comandi `seo:*` |
| `.gitignore` | `.env` e nomi tipici di file di credenziali |

## 6. Comandi

```
npm run seo:audit              # file locali
npm run seo:audit:online       # il sito vero
npm run seo:control            # sito vero + Search Console → il riepilogo «SEO CONTROL»
npm run seo:gsc                # Search Console, ultimi 28 giorni
npm run seo:gsc:ispeziona      # + URL Inspection delle 7 prioritarie
node tools/seo-gsc.js --verifica
```

## 7. Stato Search Console API

**Non configurata.** Sul PC non c'è nessuna credenziale Google per Search
Console (nessun `GOOGLE_APPLICATION_CREDENTIALS`, niente `gcloud`, nessun
service account; c'è solo il login di `firebase-tools`, che non ha lo scope e
non va usato per questo). Il codice è pronto e provato fin dove si può senza
Google: firma del JWT verificata contro un server locale, rifiuto delle
credenziali nel repository, messaggi senza segreti.

**Autorizzazione da dare una volta** (dettaglio in `docs/SEO-AUTOMAZIONE.md`):
abilitare la Search Console API nel progetto Cloud `arctrail3d`, creare il
service account `seo-lettura` con una chiave JSON salvata in
`C:\Users\Ale\.arctrail3d\gsc\credenziali.json`, aggiungerlo in Search Console
come utente **Limitato**. Nessun segreto passa dalla chat.

## 8. File modificati

Nuovi: `tools/seo-audit.js`, `tools/seo-gsc.js`, `docs/SEO-AUTOMAZIONE.md`,
`docs/ARCTRAIL_SEO_REPORT.md` (questo), `.env.example`.
Modificati: `package.json` (5 script), `.gitignore` (blocco Search Console),
`docs/STATO-RIPRESA.md` (sezione SEO).
Fuori da git: `00-ALESSANDRO-CHATGPT\` e `CONSEGNA_CHATGPT.zip` rigenerati da
`tools\prepara-consegna.ps1`.

**Nessun file del sito** (HTML, sitemap, robots, sw, manifest) è cambiato.
Tutti i file nuovi stanno in `tools/` o `docs/`, esclusi dal sito da
`_config.yml`; `.env.example` inizia con il punto e Jekyll lo salta.

## 9. Test eseguiti

| prova | esito |
|---|---|
| `node tools/seo-audit.js` (locale) | ATTENZIONE, 0 bloccanti, 3 avvisi (M1), exit 0 |
| `node tools/seo-audit.js --online` | ATTENZIONE, 0 bloccanti, 3 avvisi, exit 0; ~4 s |
| `--online --gsc` senza credenziali | prosegue e dice «non configurata», exit 0 |
| ripetibilità | due giri locali con output identico |
| sola lettura | impronta SHA-1 di tutti i file del progetto uguale prima e dopo tre giri |
| sabotaggio (copia in scratchpad, `--radice`): `noindex` su ASA, IBO fuori sitemap, canonical di FITARCO verso la home, robots che blocca NFAS, title tolto da World Archery | 6 bloccanti, tutti presi, exit 1 |
| sabotaggio: tutti i link verso NFAS tolti | «orfana» bloccante, exit 1 |
| `--json` | JSON valido |
| `seo-gsc.js` senza credenziali / con credenziali nel repository / service account finto | «non configurata» exit 3 / rifiutate / JWT RS256 con scope `webmasters.readonly` verificato, errore di Google riportato senza eccezioni |
| `node tests/banco-seo.js` | 217 passate, 0 fallite |
| `node tests/controlla-pubblicazione.js` | 32 passate, 0 fallite |
| `node tests/controlla-diari.js` | verde (`STATO.md` 249/250, non toccato) |
| `node --check` sui due script | ok |

La suite completa (`sh tests/controlla-tutto.sh`) **non** è stata lanciata:
nessun file del sito né dell'app è cambiato, e per strumenti e documenti la
regola 21 chiede solo i controlli pertinenti (regola 3, livello MICRO).

## 10. Cosa NON è stato modificato

HTML del sito, `sitemap.xml`, `robots.txt`, `sw.js`, `manifest.json`, app,
Functions, regole Firestore, APK, contenuti e regolamenti delle federazioni.
Nessun push, nessun deploy, nessuna richiesta di indicizzazione, nessun uso
della Indexing API. `docs/STATO.md` non toccato (è a 248 righe su 250 e la
sessione non cambia lo stato del prodotto). Nessun altro progetto toccato.

## 11. Proposte per Alessandro (fase B)

Ognuna è indipendente. Livello MICRO (solo HTML/metadata), nessuna logica
dell'app. `index.html` sta nell'`APP_SHELL`: se la si tocca, `CACHE_NAME` sale.
Le proposte 1 e 2 conviene farle insieme, per un salto di cassa solo.

| # | proposta | file | effetto atteso | rischio |
|---|---|---|---|---|
| **1** | **Link dalla home alle pagine regolamento.** Nel piede della home, accanto al link «Regolamenti» che c'è già, una riga di link testuali alle 6 pagine regolamento + il confronto in inglese. Nessun testo nuovo da tradurre oltre ai nomi propri | `index.html` | le prioritarie passano da 2 a 1 clic dalla pagina più forte del sito; più probabilità che Google le scansioni | basso. `index.html` è nell'`APP_SHELL` di `sw.js`: salgono `data-build` e `CACHE_NAME` (regola 8) |
| **2** | **Togliere gli hreflang verso `?lang=`** da home, privacy e termini (tutti, x-default compreso), finché non esistono URL veri per lingua. Il cambio lingua dell'app resta identico | `index.html`, `privacy.html`, `termini.html`, `tests/banco-seo.js` (la nota «NOTO» diventa un controllo); con `index.html` salgono timbro e cassa | Google smette di scoprire e classificare `?lang=xx`; probabile uscita delle voci «alternativa» e «duplicata» | basso; nessun effetto sugli utenti |
| **3** | **`lastmod` della home** a `2026-09-19` (ultima modifica sostanziale) | `sitemap.xml` | segnale di freschezza onesto | nullo |
| **4** | **Accorciare 4 title** (World Archery, FIARC, FITARCO, presentazione) sotto i ~65 caratteri, stessa sostanza | 4 HTML | snippet non tagliato | basso; il testo proposto va visto prima |
| **5** | **Autorizzare Search Console API** (§7) | nessuno nel sito | il controllo sa cosa è indicizzato e perché; verifica automatica della sitemap di riferimento | nessuno sul sito |

**Da NON fare adesso:** richieste di indicizzazione in serie (quella di
`3d-archery-scoring-app.html` è già in coda: non si ripete); pagine nuove o
traduzioni; `BreadcrumbList`/`FAQPage`; toccare i testi dei regolamenti.

**Da fare a mano, 2 minuti, sola lettura:** Search Console → *Sitemap*: la
sitemap `https://arctrail3d.com/sitemap.xml` è inviata **nella stessa
proprietà** dove si fanno le ispezioni? Stato, data di ultima lettura (dopo il
18/09?) e URL rilevati (13?). Se la data è vecchia, reinviarla una volta.

## 12. Prossimo step consigliato

1. Alessandro dice sì/no alle proposte 1–4 e fa (o rimanda) la 5.
2. Controllo a mano della pagina *Sitemap* in Search Console (sopra).
3. Con le proposte approvate: fase C (patch, `banco-seo`, `seo:audit`,
   pubblicazione col runbook), poi fase D (`seo:audit:online`, e
   `seo:gsc:ispeziona` se autorizzato).
4. Fra 3–4 settimane: `npm run seo:control` e confronto con i numeri del 27/09.
