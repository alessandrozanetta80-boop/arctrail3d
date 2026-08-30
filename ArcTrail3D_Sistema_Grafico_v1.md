# ArcTrail 3D — Sistema grafico v1

**Scopo:** portare la tavolozza della vetrina dentro *ogni* finestra dell'app, in modo che
sembri tutto lo stesso oggetto. Non è una lista di ritocchi: è un unico strato di variabili
CSS più le regole di uso. Applicato lo strato, le schermate si ritingono da sole.

Base: tavolozza "Visual System v1 · 20-8-2026" (Alpine Lichen, Sediment Brown, Catalyst
Orange, Shale Grey, Obsidian Trail, Bone Dust), già decisa il 21/08 per tutta l'app.

---

## 1. Il principio: tre strati, non una tavolozza

Il problema di "mettere i colori della vetrina dappertutto" è che se ogni schermata usa tutti
e sei i colori, non ne riconosci nessuno. La continuità si ottiene al contrario: **stessi
ruoli, stessi posti, in ogni finestra.**

| Strato | Colori | Dove vive | Regola |
|---|---|---|---|
| **Superficie** | Bone Dust, bianco, Obsidian | fondi, card, separatori | neutra, non parla mai |
| **Struttura** | Alpine Lichen `#4A5D4E` | barra, testate, titoli di sezione, pulsante principale | è l'identità: c'è **sempre**, in ogni schermata |
| **Segnale** | Catalyst Orange `#FF4D00` | dove sei, cosa è attivo, cosa richiede attenzione | **una sola cosa per schermata** |

**La regola che risolve il verde/rosa:** Catalyst non è mai un fondo esteso. Un arancio
acceso steso su una superficie chiara perde saturazione e vira al salmone — è esattamente
quello che vedi su Borgodale. L'arancio torna arancio solo se resta **piccolo e pieno**:
un filetto, un'icona, un numero, un bordo. Mai un lavaggio.

**Il richiamo ricorrente (la firma):** un **picchetto** — filetto verticale di 4px in Catalyst
a sinistra dell'elemento attivo o del titolo di sezione. È il segnavia del percorso 3D, quindi
viene dal mondo dell'app e non è decorazione: dice sempre la stessa cosa, "sei qui". È questo
elemento, ripetuto identico in Campi, Tira, Compagnie, Marketplace, Profilo e nel pannello
admin, a fare la continuità con la vetrina — non la quantità di colore.

---

## 2. Strato di variabili — blocco pronto

Da inserire nel `<style>` **dopo** le variabili esistenti, delimitato dai commenti come è già
stato fatto per la veste chiara (così si torna indietro cancellando il blocco).

```css
/* ===== SISTEMA GRAFICO v1 ===== */

/* --- Tema chiaro (predefinito) --- */
body.theme-light{
  --bg:            #F5F2ED;  /* Bone Dust */
  --surface:       #FFFFFF;
  --surface-2:     #FBF9F5;
  --line:          #D9D4CC;  /* Shale Grey */
  --line-soft:     #E8E4DC;

  --ink:           #2D2926;  /* Obsidian Trail — 12,9 su Bone Dust */
  --ink-2:         #6E6259;  /* testo secondario — 5,4 */
  --ink-3:         #8B7E74;  /* Sediment: solo meta ≥18px o decorativo (3,5) */

  --accent:        #4A5D4E;  /* Alpine Lichen — fondo pieno, bianco sopra: 7,1 */
  --accent-ink:    #FFFFFF;
  --accent-soft:   #4A5D4E;  /* come testo su chiaro: 6,4 — stesso valore, va bene */
  --accent-line:   #C3CCC4;

  --signal:        #FF4D00;  /* Catalyst puro: SOLO grafica ≥3px, mai testo */
  --signal-ink:    #CC3D00;  /* testo/link arancio: 4,9 su bianco */
  --signal-fill:   #CC3D00;  /* fondo pieno con testo bianco: 4,9 */
  --signal-wash:   #F7DFD0;  /* opaco, non alpha: resta arancio, non vira al rosa */

  --navbar-bg:     #4A5D4E;
  --navbar-ink:    #FFFFFF;
  --navbar-active: #FF4D00;
}

/* --- Tema elegante (scuro) --- */
body.theme-elegante{
  --bg:            #1F1D1B;
  --surface:       #2D2926;  /* Obsidian Trail */
  --surface-2:     #363130;
  --line:          #453F3B;
  --line-soft:     #383331;

  --ink:           #F0EBE4;
  --ink-2:         #B3A99F;
  --ink-3:         #8B7E74;

  --accent:        #4A5D4E;
  --accent-ink:    #FFFFFF;
  --accent-soft:   #8FA893;  /* verde come testo su scuro: 5,6 */
  --accent-line:   #3E4C41;

  --signal:        #FF4D00;
  --signal-ink:    #FF6A2B;  /* su scuro l'arancio regge anche come testo: 4,3+ */
  --signal-fill:   #CC3D00;
  --signal-wash:   #3A2A22;

  --navbar-bg:     #2D2926;
  --navbar-ink:    #F0EBE4;
  --navbar-active: #FF4D00;
}

/* --- Tema saturo (scuro, più contrastato) --- */
body.theme-satura{
  --bg:            #161815;
  --surface:       #22261F;
  --surface-2:     #2B3028;
  --line:          #3C4438;
  --line-soft:     #2F3529;

  --ink:           #F2F0E9;
  --ink-2:         #B8BDAF;
  --ink-3:         #93887C;

  --accent:        #4F6952;
  --accent-ink:    #FFFFFF;
  --accent-soft:   #9DBFA2;
  --accent-line:   #3F5343;

  --signal:        #FF4D00;
  --signal-ink:    #FF6A2B;
  --signal-fill:   #D94200;
  --signal-wash:   #33241C;

  --navbar-bg:     #22261F;
  --navbar-ink:    #F2F0E9;
  --navbar-active: #FF4D00;
}

/* --- Il picchetto: il richiamo che si ripete in ogni finestra --- */
.is-open, .is-active, .card.selected, .sect-title{
  position: relative;
  padding-left: 14px;
}
.is-open::before, .is-active::before,
.card.selected::before, .sect-title::before{
  content:"";
  position:absolute; left:0; top:.15em; bottom:.15em;
  width:4px; border-radius:2px;
  background: var(--signal);
}
/* ===== FINE SISTEMA GRAFICO v1 ===== */
```

> I nomi delle classi nell'ultimo blocco sono da agganciare a quelli veri del sorgente:
> è l'unico punto che va adattato a mano.

---

## 3. Contrasti misurati (WCAG)

| Combinazione | Rapporto | Uso ammesso |
|---|---|---|
| Obsidian `#2D2926` su Bone Dust | 12,9 | testo normale ✔ |
| `#6E6259` su Bone Dust | 5,4 | testo secondario ✔ |
| Alpine `#4A5D4E` su Bone Dust | 6,4 | testo ed etichette ✔ |
| Bianco su Alpine `#4A5D4E` | 7,1 | pulsanti pieni ✔ |
| `#CC3D00` su bianco | 4,9 | testo, link, prezzi ✔ |
| Bianco su `#CC3D00` | 4,9 | pulsante d'azione ✔ |
| **Catalyst `#FF4D00` su bianco** | **3,3** | **solo grafica ≥3px — mai testo** |
| Sediment `#8B7E74` su Bone Dust | 3,5 | solo testo grande o decorazione |
| `#8FA893` su Obsidian | 5,6 | verde come testo nel tema scuro ✔ |

Sediment Brown e Catalyst puro **non** passano come testo: da qui i due gradini `#6E6259`
e `#CC3D00`, che sono gli stessi colori un passo più scuri.

---

## 4. Il caso Borgodale (Campi) — cosa cambia

**Adesso:** card verde con lavaggio rosa/salmone sull'elemento aperto, contrasto basso.

**Nuovo:**

```
┌──────────────────────────────────┐
│▌ Borgodale                       │   ▌ picchetto 4px  #FF4D00
│  FIARC · 24 piazzole · Verbania  │   meta            #6E6259
│                                  │   fondo card      #FFFFFF
│  [ Percorso ]  [ Contatti ]      │   chip attiva     fondo #4A5D4E, testo bianco
└──────────────────────────────────┘   chip inattiva   bordo #D9D4CC, testo #2D2926
```

- Fondo della card aperta: **bianco pieno**, non tinto. Se preferisci comunque un fondo
  diverso da quello delle card chiuse, usa `--signal-wash: #F7DFD0` — è opaco e sta sul
  giallo-arancio, quindi non vira al rosa come faceva l'arancio trasparente.
- Testata della schermata di dettaglio: fascia **Alpine Lichen** con titolo bianco.
- Il verde resta, ma cambia mestiere: non è più il fondo dell'elemento selezionato,
  è la struttura intorno. L'arancio fa una cosa sola: dice quale campo è aperto.

---

## 5. Mappa schermata per schermata

| Schermata | Struttura (verde) | Segnale (arancio) |
|---|---|---|
| **Barra a 5 sezioni** | fondo `--navbar-bg`, icone `--navbar-ink` | sezione attiva: icona + etichetta `#FF4D00` |
| **Campi** | testata dettaglio, chip attiva | picchetto sul campo aperto |
| **Tira** | pulsante "Inizia", topbar del giro | numero della piazzola corrente |
| **Cartellino** | fondi invariati | cifre già decise il 21/08 (`#A63200` / `#2E4A33` / `#2A4257` / `#8E1116` / `#524B45`) |
| **Il mio diario** | intestazioni, assi dei grafici `--accent-line` | record personale |
| **Compagnie** | badge iniziale compagnia, testata Spazio compagnia | badge "referente" |
| **Marketplace** | testata scura + area annunci Bone Dust (ibrido invariato) · "Nuovo annuncio" verde pieno | prezzo `#CC3D00`, pastiglia "nuovo" |
| **Profilo / Info** | titoli di sezione col picchetto | opzione selezionata |
| **Notifiche / chat** | testata, bolla propria `--accent` + testo bianco | pallino "non letto" |
| **Pannello admin** | riepilogo a 4 numeri su fondo verde | il numero "in attesa" quando è > 0 |
| **Pagine legali + presentazione** | vedi § 6 | link e pulsanti |

Regola trasversale già in vigore, confermata: **fondo pieno → `--accent` + `--accent-ink`;
testo/icona/bordo su fondo scuro → `--accent-soft`.**

---

## 6. Fuori dall'app (senza queste, la continuità si rompe proprio dove entra la gente)

- `privacy.html`, `termini.html`, `elimina-account.html`, `presentazione.html`:
  teal `#116E62` → **`#4A5D4E`**, arancio `#C25E18` → **`#CC3D00`**, fondo → **`#F5F2ED`**.
- `marketplace.html`: `theme-color` teal → **`#4A5D4E`**.
- `index.html`: `<meta name="theme-color">` dinamica → `#4A5D4E` (chiaro) e `#2D2926` (scuri).
- `manifest.json`: `theme_color` **`#4A5D4E`**, `background_color` **`#F5F2ED`**.
  Si legge solo all'installazione: sul telefono la barra resta com'è finché non reinstalli la PWA.

---

## 7. Restano fuori, per scelta

Confermato il 21/08: **rosso**, **verde-riuscita**, **tinte del bersaglio**
(`--slate-*`, `--lime-500`, `--straw-*`), **`--sun-dot #FFC21A`** e le **pastiglie
d'arco/divisione** non si toccano — sono codici, non estetica. L'**oro `--gold-*`** viene
assorbito da Sediment Brown.

## 8. Punti aperti

1. **Il logo.** `logo.jpg` / `logo.webp` hanno il verde vecchio dentro i pixel: con la
   tavolozza nuova stona ovunque compare. Serve il sorgente vettoriale (SVG/AI), altrimenti
   va ridisegnato.
2. **Verde spot del cartellino `#2E4A33` vs Alpine `#4A5D4E`:** sono parenti stretti. Sul
   cartellino non convivono, ma se in futuro una cifra spot finisce su un fondo verde vanno
   riguardati insieme.
3. **Nomi delle classi** del blocco "picchetto" (§ 2): da agganciare al sorgente vero.
