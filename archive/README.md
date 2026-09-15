# archive/ — materiale storico o da decidere

Spostato qui il **15/09/2026** nel riordino del repository (branch
`chore/repo-cleanup-2026-09-15`). Niente di questa cartella è letto dal sito,
dal service worker, dai banchi o dai generatori. **Non è stato cancellato**
perché contiene informazioni che potrebbero servire, o lavoro di cui non è
certo che sia già entrato nel progetto.

*Attenzione: anche questa cartella è pubblicata su GitHub Pages, come tutto il
repository.*

| file | nome di prima | cos'è | perché è qui e non cancellato |
|---|---|---|---|
| `hub-profilo-blocco1_2026-08-30_non-pubblicato.zip` | `files.zip` | Consegna del «BLOCCO 1 del brief hub» del 30/08/2026, **mai timbrata**: una versione di `app.html` (timbro ancora `2026-08-30-ritorno`), `banco-ritorno.js` riscritto («la porta unica del Profilo»), la riga relativa in `controlla-tutto.sh`, `foto-profilo.js` e una voce di ~160 righe per `NOTE-DESIGN.md` («Il Profilo smette di essere un cruscotto: sei porte e una sola maniglia»). | **Nessuno di questi file è mai entrato nella storia git.** L'`app.html` pubblicato dopo (`2026-08-30-profilo-assetti`) contiene solo 3 delle 109 righe nuove dello zip. Va deciso se il lavoro è da riprendere o abbandonato. |
| `REGOLE-LAVORO_copia-divergente_2026-08-30.md` | `REGOLE-LAVORO-aggiornato.md` | Una seconda copia delle regole caricata il 30/08, ma nata dal testo del 28/08 con qualche paragrafo in più sul livello MICRO. | La copia valida è `docs/REGOLE-LAVORO.md`: è quella che `STATO.md` cita (regola 3-bis, regola 23 sul parallelo) e che sta nel tetto di `controlla-diari.js` (questa ha 457 righe, il tetto è 450). I paragrafi in più sono già ripresi in forma corta nella versione valida, ma non è stato verificato riga per riga. |
| `voce-diario-vetrina-nove_2026-08-24_mai-incollata.md` | `voce-diario-vetrina-nove.md` | La voce di diario «La vetrina impara nove lingue» (24/08/2026, versione `vetrina-nove`), scritta per essere incollata in `NOTE-DESIGN.md`. | **Non è mai stata incollata:** solo 1 riga su 110 si trova in `NOTE-DESIGN.md`. Da incollare nell'archivio (con la riga d'indice, e aggiornando il numero di sezioni) oppure lasciare qui. |
| `LEGGIMI-PRIMA-freeze_2026-08-29.txt` | `LEGGIMI-PRIMA.txt` | Nota di consegna del freeze del 29/08 (cache `v156`), con l'unico smoke test manuale rimasto: l'app offline in modalità aereo. | È superata come consegna, ma non risulta scritto da nessuna parte che lo smoke test offline sia stato fatto. |
| `LEGGIMI-icone_2026-08-28.md` | `LEGGIMI.md` | Istruzioni per caricare le icone nuove e la correzione dei nomi nel `manifest.json`. | Consegna già eseguita (le icone coi trattini ci sono), ma racconta il difetto dei nomi del manifest. Il file stesso diceva di non caricarlo. |
| `vetrina-anteprima_2026-08-25.html` | `vetrina.html` | Anteprima della vetrina (`2026-08-25-vetrina-vere`, `noindex`). | `STATO.md` dice che non esiste più dal 25/08: la vetrina vera è `index.html`. Tenuta come fotografia di quella versione. |
| `ArcTrail3D-Compagnie_build-2026-07-31.html` | `ArcTrail3D-Compagnie.html` | Una versione intera dell'app del 31/07/2026 (`BUILD_STAMP 2026-07-31-h`). | Nessun riferimento nel progetto. Storica: è l'app di un mese prima. |
| `prova-mercatino_2026-08-28.html` | `prova-mercatino.html` | Pagina di prova: il foglio di stile del mercatino (quasi tutto uguale a `marketplace.html`) con i suoi pezzi disegnati affiancati, senza timbro. | Nessun riferimento nel progetto; caricata il 28/08 insieme ai banchi. |

## Cancellati nello stesso riordino (e perché non sono qui)

Recuperabili comunque dalla storia git.

- `CNAME.txt` — copia identica byte per byte di `CNAME`; GitHub Pages legge solo `CNAME`.
- `Microsoft.Services.Store.winmd` — file di sistema Windows finito nel caricamento, estraneo al progetto.
- `ChatGPT Image 30 ago 2026, 12_48_37.png` — schema di un frigo per dry aging, estraneo al progetto.
- `diff-app.html.txt`, `diff-firestore.rules.txt` — diff di consegna del 28/08; verificato che tutte le righe nuove (23/23 e 57/57) sono già dentro `app.html` e `firestore.rules`.
