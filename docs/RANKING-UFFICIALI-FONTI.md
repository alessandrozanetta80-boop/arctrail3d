# Classifiche ufficiali FIARC e FITARCO — dove sono, cosa contengono

**Ricerca preliminare del 18/09/2026.** Solo fonti pubbliche ufficiali, lette
con poche richieste a mano. **Niente scraping, niente import, niente dati
personali salvati nel repository.** Serve a decidere *se* e *come* ArcTrail
potrà un giorno mostrare un ranking, non a farlo.

Legenda: **verificato** = visto il 18/09 sulla fonte · **da verificare** = non
letto, o letto solo in parte.

---

## FITARCO

| | |
|---|---|
| **Pagina** | *Ranking List per l'ammissione ai Campionati Italiani* — <https://www.fitarco-italia.org/gare/ranking.php> (dal sito nuovo: <https://www.fitarco.it/gare-e-risultati/ranking.html>) |
| **Che cos'è** | la lista che decide chi è ammesso ai Campionati Italiani, **non** una classifica di stagione generale. Nota della pagina: «La Ranking List Individuale è calcolata sulla classe di appartenenza effettiva alla data dei prossimi Campionati Italiani» — **verificato** |
| **Formato** | **HTML**, generato da un modulo in GET (`viewrankingI.php?Divisione=…&Classe=…&Sesso=…&Tipo=I&Regione=…&3D=1`) — **verificato** |
| **Sezione 3D** | sì, separata da Indoor, Targa e Campagna — **verificato** |
| **Filtri 3D** | Divisione `CO`, `AN`, `AI`, `LB` (compound, arco nudo, arco istintivo, longbow); Classe `S`, `J` (Seniores, Juniores); Sesso `M`/`F`; solo individuale (squadre disabilitate); Regione tutte o una — **verificato sul modulo** |
| **Campi per arciere** | posizione, **tessera** (es. un numero di 4–5 cifre, linkato a `/arcieri/situazione.php?Codice=…`), cognome e nome, **codice società** e nome società, i punteggi che contano con **luogo e data della gara** (ogni gara linkata a `/gare/classifica.php?Codice=…`) — **verificato su una riga** |
| **Totale / punteggio di ranking** | come si combinano i punteggi (somma, media, i migliori N) **da verificare** sul regolamento |
| **Data di aggiornamento** | **non vista** sulla pagina dei risultati: la data sta sulle singole gare. **Da verificare** |
| **PDF / CSV / API** | nessun PDF né CSV sulla pagina di ranking; **nessuna API pubblica** trovata |
| **Accesso autenticato** | la ranking è pubblica. Le pagine per arciere (`situazione.php`) esistono e sono linkate pubblicamente — **non aperte**, per scelta: sono dati personali |
| **Nota tecnica** | il 18/09 `fitarco.it` rispondeva **503** agli strumenti automatici, e dopo poche richieste anche `fitarco-italia.org`. Un sistema che interrogasse queste pagine verrebbe bloccato — e non deve esistere senza un accordo |

## FIARC

| | |
|---|---|
| **Pagina** | nessuna pagina di ranking di stagione trovata. La voce di menu <https://www.fiarc.it/classifiche/> il 18/09 conteneva **regolamenti e polizze**, non classifiche — **verificato** |
| **Dove sono i risultati** | un articolo per gara in *Ultime notizie* (es. «CLASSIFICA 08TIME del 16/09/2026») con allegato **PDF**; per il Campionato Italiano una pagina evento con più PDF (classifica, Coppa delle Regioni maschile e femminile) — **verificato** |
| **Formato** | **PDF** in `wp-content/uploads/AAAA/MM/`. Quello di gara ha testo estraibile; quello del Campionato Italiano 2026 (15 pagine) **no**: è un'immagine — **verificato** |
| **Campi (PDF di gara)** | `POS.`, `CLASSE` (es. `CAF`, `CAM`), `CAT.` (es. `AS`, `LB`, `RI`, `AN`, `FS`), `ARCIERE`, `COMPAGNIA` (codice, es. `08RUPE`), `TESSERA`, `PUNTI`, `SPOT`, `S. SPOT` — **verificato**. Intestazione con **data**, **formato** (es. *Percorso*) e codice della compagnia organizzatrice |
| **Significato delle sigle** | classi e categorie **da verificare** sul Regolamento Sportivo prima di usarle |
| **Data di aggiornamento** | la data della gara nel PDF; nessun aggregato di stagione |
| **CSV / API** | **nessuno** trovato |
| **Accesso autenticato** | *Area Personale* (`areariservata.fiarc.it`) e *Gestionale* (`fiarc-gestione.it`) richiedono login: **non esplorati** |

---

## Cosa se ne ricava

1. **Nessuna delle due federazioni pubblica un'API o un file strutturato.**
   FITARCO pubblica HTML generato, FIARC PDF gara per gara — e a volte PDF
   immagine.
2. **Entrambe pubblicano la tessera accanto al nome.** È il ponte naturale fra
   un profilo ArcTrail e un risultato ufficiale — ed è anche un dato personale.
3. **Un «ranking ufficiale dentro ArcTrail» oggi vorrebbe dire scraping**, con
   i limiti tecnici visti (blocchi 503, PDF immagine) e i limiti che contano di
   più: termini d'uso dei siti e dati personali di terzi.

## Strade possibili — decisione umana, nessuna iniziata

| Strada | Com'è | Pro | Contro |
|---|---|---|---|
| **A. Link, non dati** | nel profilo, l'arciere inserisce la sua tessera e ArcTrail mostra un **link** alla sua pagina ufficiale | zero dati di terzi, zero scraping, subito fattibile | nessun numero dentro l'app |
| **B. Inserimento a mano** | l'arciere copia il suo piazzamento | dato suo, dichiarato da lui | non verificato; va detto in chiaro |
| **C. Accordo con la federazione** | export o API concessi | l'unica strada per dati veri e aggiornati | tempi e rapporto istituzionale; non va fatta sembrare un'approvazione dell'app |
| ~~D. Scraping~~ | — | — | **esclusa** |

## Da verificare prima di qualsiasi decisione

- FITARCO: regolamento della ranking list 3D (come si calcola, ogni quanto
  si aggiorna), e i termini d'uso del sito.
- FIARC: se esiste un ranking di stagione nell'area riservata; significato
  ufficiale delle sigle di classe e categoria; termini d'uso.
- Per entrambe: base giuridica per mostrare risultati di terzi (GDPR), anche
  solo per link.
