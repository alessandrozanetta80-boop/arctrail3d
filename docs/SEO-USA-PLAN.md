# Piano SEO Stati Uniti — tre pagine, nessuna pubblicata

**Scritto il 17/09/2026.** Le pagine **non esistono ancora**: qui c'è il piano,
non il codice. Si pubblica quando ASA e IBO sono nell'app pubblicata, non prima:
una pagina che promette un segnapunti ASA e manda su un'app che non ce l'ha è una
pagina che guadagna una visita e perde una persona.

Il modello è quello che il sito usa già: `ifaa-3d.html`, `nfas-3d.html`,
`world-archery-3d.html`, tutte figlie di `regolamenti-3d.html`. **Nessuna
architettura nuova.**

---

## 0. Due decisioni da prendere prima di scrivere una riga

### 0.1 In che lingua — DECISIONE APERTA

Le quattro pagine regolamento esistenti sono **in italiano** (`<html lang="it">`)
e **non hanno `hreflang`**: sono pagine singole, non tradotte. Le tre pagine
americane hanno senso **solo in inglese**, e quindi rompono quella regola.

Le strade:

- **(a)** pagine in inglese `<html lang="en">`, senza `hreflang`, come le
  italiane ma nell'altra lingua. È la più semplice e la più coerente con
  l'esistente. **Consigliata.**
- **(b)** ogni pagina regolamento in due lingue con `hreflang` reciproco. Costa
  otto pagine nuove e un impegno di manutenzione che oggi non c'è.
- **(c)** una sezione `/en/` completa. Fuori scala per tre pagine.

> Il resto di questo piano è scritto **assumendo (a)**, e segna dove cambierebbe
> con (b).

### 0.2 Il nome dei file — DECISIONE APERTA

L'esistente usa nomi italiani (`regolamenti-3d.html`). Per pagine in inglese, il
nome del file è anche l'URL, cioè testo che Google legge.

- **(a)** `asa-3d.html`, `ibo-3d.html`, `3d-archery-scoring-app.html`.
  **Consigliata**: continua la serie `<sigla>-3d.html` già in sitemap.
- **(b)** `asa-scoring-app.html`, `ibo-scoring-app.html` — più vicini alla
  keyword, ma spezzano la serie.

Il resto del piano assume **(a)**.

---

## 1. `3d-archery-scoring-app.html` — la pagina madre

| Campo | Valore |
|---|---|
| **Intento** | *commerciale/navigazionale*. Chi cerca vuole **uno strumento**, non una spiegazione: sta per scaricare qualcosa. |
| **Keyword principale** | `3d archery scoring app` |
| **Keyword secondarie** | `3d archery scorecard app`, `archery score keeper app`, `3d archery scoring sheet`, `free 3d archery app` |
| **URL** | `https://arctrail3d.com/3d-archery-scoring-app.html` |
| **Title** (≤60) | `3D Archery Scoring App — ASA, IBO, IFAA, World Archery` |
| **H1** | `A 3D archery scoring app that knows your rulebook` |
| **Meta description** (≤155) | `Keep score on any 3D course: ASA 12/10/8/5, IBO 11/10/8/5, IFAA, World Archery. Works offline, no account needed to start. Free.` |
| **Canonical** | se stessa |
| **hreflang** | nessuno con (a). Con (b): coppia `en` ↔ `it` verso `regolamenti-3d.html` + `x-default` sull'inglese |
| **Fonte regolamento** | nessuna propria: **rimanda** alle pagine figlie, che le hanno |

### Contenuto distinto — cosa c'è qui e in nessun'altra pagina

Questa è l'unica pagina che parla di **strumento**, non di regole:

1. **Cosa fa l'app in quattro righe**, con lo screenshot del segnapunti.
2. **Tabella di confronto dei barème** — una riga per circuito (ASA, IBO, IFAA
   Standard, IFAA Hunting, World Archery, NFAS, FIARC), colonne: frecce per
   bersaglio, zone, punti, massimo. **Nessun'altra pagina del sito ha questa
   tabella**: è il pezzo che la rende linkabile.
3. **Funziona senza rete** — il punto che le app concorrenti non hanno.
4. **Nove lingue**.
5. Tre link in uscita, uno per pagina figlia.

**Trappola da evitare:** non ripetere qui i barème completi di ASA e IBO. Se lo
fa, le tre pagine si cannibalizzano e Google ne sceglie una sola. Qui **una riga
per circuito**, il dettaglio sta nelle figlie.

### Link interni

- **verso**: `/asa-3d.html`, `/ibo-3d.html`, `/regolamenti-3d.html`, `/app.html`
- **da**: `/regolamenti-3d.html` (nuova riga nell'elenco), piè di pagina di
  `/asa-3d.html` e `/ibo-3d.html`, `/presentazione.html`

---

## 2. `asa-3d.html` — ASA

| Campo | Valore |
|---|---|
| **Intento** | *informazionale con coda commerciale*. Chi cerca vuole capire **come si conta**; chi ha capito vuole segnarlo. |
| **Keyword principale** | `asa scoring app` |
| **Keyword secondarie** | `asa archery scoring`, `asa 12 ring rules`, `asa pro am scoring`, `upper 12 ring asa`, `asa scorecard` |
| **URL** | `https://arctrail3d.com/asa-3d.html` |
| **Title** (≤60) | `ASA 3D Scoring: 12, 10, 8, 5 and the two 12-rings` |
| **H1** | `How ASA Pro/Am scoring works` |
| **Meta description** (≤155) | `ASA Pro/Am scoring explained: 20 targets a round, one arrow each, 12/10/8/5, and the upper vs lower 12-ring call. Keep score free with ArcTrail 3D.` |
| **Canonical** | se stessa |
| **hreflang** | nessuno con (a) |
| **Fonte regolamento** | **ASA Pro/Am Rules 2026** — <https://asaarchery.com/rules/asa-pro-am-rules/>, citata in fondo con `rel="nofollow noopener"`, come fa già `nfas-3d.html` |

### Contenuto distinto

1. **Il barème in tabella**: 12 / 10 / 8 / 5, e lo `0` per la freccia che
   rimbalza via («glances off and goes past the target»).
2. **I due 12-ring** — *è questo il pezzo che nessun'altra pagina al mondo spiega
   bene*, ed è la ragione per cui questa pagina può posizionarsi: il basso è in
   gioco per tutti, l'alto si **chiama** prima del tiro, e chi lo chiama perde il
   basso. Stesso punteggio, scommessa diversa.
3. **Un round è 20 bersagli, un torneo è due round.** Confusione frequente:
   vale la pena scriverlo esplicitamente.
4. **Known vs Unknown**: cosa cambia (tempo, telemetri) e cosa **non** cambia
   (i punti).
5. **Il 14-ring**: dire che **non è nelle regole 2026** e che se ne parla per gli
   shoot-off. Una riga onesta su una cosa che tutti cercano.

**Trappola:** non copiare il regolamento. Cinque concetti spiegati bene battono
trenta articoli ricopiati, e ricopiare espone a un reclamo.

### Link interni

- **verso**: `/3d-archery-scoring-app.html`, `/ibo-3d.html` («the other American
  circuit»), `/app.html`, `/regolamenti-3d.html`
- **da**: la pagina madre, `/regolamenti-3d.html`

---

## 3. `ibo-3d.html` — IBO

| Campo | Valore |
|---|---|
| **Intento** | *informazionale con coda commerciale*, come ASA. |
| **Keyword principale** | `ibo scoring app` |
| **Keyword secondarie** | `ibo archery scoring`, `ibo 11 ring`, `ibo scoring rules`, `ibo 3d scorecard`, `ibo 440 max score` |
| **URL** | `https://arctrail3d.com/ibo-3d.html` |
| **Title** (≤60) | `IBO 3D Scoring: the 11 ring, 10, 8, 5 and the zero` |
| **H1** | `How IBO 3D scoring works` |
| **Meta description** (≤155) | `IBO scoring explained: 11/10/8/5, unmarked distances, and why an arrow in the horn counts zero. Keep score free and offline with ArcTrail 3D.` |
| **Canonical** | se stessa |
| **hreflang** | nessuno con (a) |
| **Fonte regolamento** | **IBO Rules and Class Definitions 2026** — <https://iboarchery.com/rules-and-regulations>, citata in fondo |

### Contenuto distinto

1. **Il barème**: 11 / 10 / 8 / 5 / 0, con la definizione **vera** di ogni
   anello (II.B.1–4) — l'11 è un cerchio dentro il 10, grande circa un quarto.
2. **La regola del corno** (II.B.5): freccia nel corno che non tocca il colore
   del corpo = zero. *Nessun'altra pagina del sito ha una regola come questa*,
   ed è memorabile: è il pezzo che si guadagna i link.
3. **Distanze sempre non marcate** (II.A.3), con la tabella dei paletti per
   colore: blu 50 yd, verde 45, rosso 40, giallo 35, arancio 30, bianco 25,
   rosa neon 20. **Dato ufficiale, tabella pronta, molto cercata.**
4. **Il 440**: dire che il massimo pubblicato viene da 40 bersagli × 11 e che
   **il regolamento non fissa il numero di bersagli**. Questa onestà è un
   vantaggio: chi cerca «ibo 440» trova la spiegazione vera.
5. **IBO non è IFAA**: due sigle simili, due circuiti diversi. Link a
   `/ifaa-3d.html`.

### Link interni

- **verso**: `/3d-archery-scoring-app.html`, `/asa-3d.html`, `/ifaa-3d.html`
  (il chiarimento sulle sigle), `/app.html`
- **da**: la pagina madre, `/regolamenti-3d.html`, `/ifaa-3d.html` (riga nuova:
  «IBO is a different organisation»)

---

## 4. Cosa toccare quando si pubblica

| File | Cosa |
|---|---|
| `sitemap.xml` | tre `<url>` nuove, `lastmod` del giorno |
| `regolamenti-3d.html` | tre righe nell'elenco dei regolamenti |
| `ifaa-3d.html` | una riga: IBO è un'altra organizzazione, con link |
| `index.html` | nessuna modifica: la vetrina resta in nove lingue e non deve crescere |
| `robots.txt` | nessuna modifica |

---

## 5. Cosa NON fare

- **Non** pubblicare prima che ASA e IBO siano nell'app **pubblicata**.
- **Non** ricopiare gli articoli dei regolamenti: si spiega, si cita, si linka.
- **Non** mettere lo stesso barème su due pagine: si cannibalizzano.
- **Non** promettere «official ASA app» o «official IBO app»: ArcTrail non è
  affiliata a nessuna delle due, e scriverlo è insieme falso e pericoloso.
  Formula sicura: *«a scoring app that follows the ASA Pro/Am rules»*.
- **Non** aggiungere `hreflang` parziali: o tutte le pagine o nessuna.

---

## 6. Come si misura, fra tre mesi

| Metrica | Dove | Soglia che dice «ha funzionato» |
|---|---|---|
| Impression su `asa scoring app`, `ibo scoring app` | Search Console | > 0 entro 6 settimane dall'indicizzazione |
| Posizione media delle tre pagine | Search Console | entro la pagina 2 a 3 mesi |
| Clic verso `/app.html` dalle tre pagine | link interni | il numero da battere è quello che fa oggi `nfas-3d.html` |
| Giri ASA/IBO segnati davvero | app | **è questa la metrica vera**: una pagina che porta visite e zero giri ha sbagliato promessa |
