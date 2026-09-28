# SEO di ArcTrail 3D — come si lavora (dal 28/09/2026)

Il documento **vivo** della SEO: la regola, i comandi, Search Console.
Lo stato del giro del 28/09 è in `ARCTRAIL_SEO_REPORT.md`.
`SEARCH-CONSOLE-NEXT.md` è la lista del 18/09 (dopo la PR SEO), storica.

---

## La regola: quattro fasi, e la B è di Alessandro

**ANALISI → PROPOSTA → APPROVAZIONE → MODIFICA → TEST → PUBBLICAZIONE → VERIFICA → REPORT**

| fase | chi | cosa |
|---|---|---|
| **A — sola lettura** | Claude | `npm run seo:control` (audit del sito vero + Search Console se configurata), legge, propone. **Non tocca file del sito.** |
| **B — approvazione** | Alessandro | approva o respinge le proposte, una per una |
| **C — esecuzione** | Claude, solo dopo la B | modifica i file (livello MICRO, regola 21: patch con `assert`), `node tests/banco-seo.js` + `npm run seo:audit`, pubblica con la procedura del runbook |
| **D — dopo la pubblicazione** | Claude | `npm run seo:audit:online`, URL Inspection delle pagine toccate, report, `STATO-RIPRESA.md` |

Un URL **non indicizzato non è di per sé un errore.** Redirect degli host,
pagine alternative con canonical giusto e pagine `noindex` sono fuori
dall'indice per scelta.

**Cosa non si fa mai:** keyword stuffing, pagine doorway (la stessa pagina con
un'altra federazione), testo nascosto, backlink artificiali, promesse di
posizione, richieste di indicizzazione ripetute sullo stesso URL, **Indexing
API** (è solo per `JobPosting` e `BroadcastEvent`). Discovery = sitemap + link
interni + contenuto utile. I regolamenti delle federazioni non si ritoccano
senza la fonte.

---

## I comandi

Dalla radice del repository.

| comando | cosa fa | scrive? |
|---|---|---|
| `npm run seo:audit` | audit dei **file locali** | no |
| `npm run seo:audit:online` | audit di **https://arctrail3d.com** (solo GET) e confronto col locale | no |
| `npm run seo:control` | audit online **+ Search Console** (se configurata) nel formato «SEO CONTROL» | no |
| `npm run seo:gsc` | Search Console, ultimi 28 giorni: clic, impressioni, CTR, posizione, query, pagine, paesi, sitemap | no |
| `npm run seo:gsc:ispeziona` | come sopra + URL Inspection delle 7 pagine prioritarie | no |
| `node tests/banco-seo.js` | il banco della suite (file locali, invarianti) | no |

Opzioni utili:

```
node tools/seo-audit.js --online --json          # report JSON su stdout
node tools/seo-audit.js --radice <cartella>      # un'altra copia (per sabotare lo strumento)
node tools/seo-gsc.js --giorni 90                # altro intervallo
node tools/seo-gsc.js --dal 2026-09-01 --al 2026-09-27
node tools/seo-gsc.js --verifica                 # solo: le credenziali ci sono e funzionano?
```

**Uscita di `seo-audit.js`:** 0 = OK o ATTENZIONE, **1 = almeno un BLOCCANTE**,
2 = strumento rotto. `seo-gsc.js`: 3 = Search Console non configurata.

**Livelli.** BLOCCANTE: una pagina che deve stare in Google non può starci
(404, redirect, `noindex`, canonical altrove, fuori sitemap, bloccata da
robots, orfana, sitemap rotta). ATTENZIONE: segnali deboli o in conflitto
(hreflang, doppioni, lastmod, pagina online diversa dal repository).
INFO: da sapere.

**Le pagine prioritarie** sono scritte in cima a `tools/seo-audit.js`
(`PRIORITARIE`, `BASSA`, `FUORI_PER_SCELTA`): si cambiano lì.

**`banco-seo.js` e `seo-audit.js`** non sono doppioni: il banco blocca la suite
se un invariante si rompe nei file; l'audit guarda anche il sito vero, gli
header HTTP, i redirect, la profondità dei link e Search Console, e produce le
proposte.

---

## Search Console API — da autorizzare UNA volta

**Stato al 28/09/2026: NON configurata.** Sul PC non c'è nessuna credenziale
Google utilizzabile (c'è solo il login di `firebase-tools`, che non ha lo scope
di Search Console e non va usato per questo). Il codice è pronto: appena il
file c'è, `npm run seo:control` legge anche Search Console.

**Nessuna password, token o chiave va incollata in chat.** Il file resta sul PC,
fuori dal repository e fuori da Dropbox; lo script rifiuta un file dentro al
repository e non stampa mai segreti.

### Strada consigliata: un service account in sola lettura (10 minuti)

1. **Google Cloud Console** → progetto **`arctrail3d`** (lo stesso di Firebase)
   → *API e servizi* → *Libreria* → **Google Search Console API** → *Abilita*.
2. *IAM e amministrazione* → *Account di servizio* → *Crea account di servizio*,
   nome `seo-lettura`. **Nessun ruolo** sul progetto: non serve.
3. Sull'account appena creato → *Chiavi* → *Aggiungi chiave* → *JSON*. Il file
   scaricato si **sposta** (non si copia) in:
   `C:\Users\Ale\.arctrail3d\gsc\credenziali.json`
   (la cartella accanto a `signing\`; niente Dropbox, niente repository).
4. **Search Console** → proprietà di arctrail3d.com → *Impostazioni* →
   *Utenti e autorizzazioni* → *Aggiungi utente* → l'indirizzo email
   dell'account di servizio (`seo-lettura@arctrail3d.iam.gserviceaccount.com`
   o simile, è scritto nel file e nella console) → autorizzazione **Limitata**.
   Limitata basta per leggere tutto, e non può cambiare niente.
5. Prova: `node tools/seo-gsc.js --verifica` → deve dire
   `credenziali service_account valide, proprieta' sc-domain:arctrail3d.com`
   (o `https://arctrail3d.com/`).

Se la chiave si perde o si teme sia uscita: Cloud Console → account di
servizio → *Chiavi* → elimina, e se ne crea una nuova. Search Console non
cambia.

### In alternativa: credenziali OAuth dell'utente

Un file `authorized_user` (con `client_id`, `client_secret`, `refresh_token`)
per lo scope `https://www.googleapis.com/auth/webmasters.readonly`, nella
stessa cartella. Più scomodo (serve un client OAuth «app desktop» e il consenso
una volta), stesso risultato.

### Cosa legge, e con quali limiti

- `searchanalytics.query`: clic, impressioni, CTR, posizione, per query, pagina,
  paese; intervallo configurabile; chiude a ieri con `dataState: all`.
- `sitemaps.list`: quali sitemap sono inviate, quando Google le ha lette, errori.
- `urlInspection.index.inspect`: per le 7 prioritarie — verdetto, stato di
  copertura, ultima scansione, **sitemap che citano l'URL** (il «Nessuna
  Sitemap di referral rilevata»), canonical dichiarato e scelto da Google.
  Quota: 2.000 al giorno, 600 al minuto; qui ~7 per giro, una ogni 1,5 s.
- **Non chiede indicizzazioni**: l'API non lo permette per pagine normali, e va
  bene così. «Richiedi indicizzazione» resta un clic di Alessandro, raro.

`GSC_CREDENTIALS` e `GSC_SITE` si possono dare in un `.env` (vedi
`.env.example`, fuori da git); senza, valgono i predefiniti.
