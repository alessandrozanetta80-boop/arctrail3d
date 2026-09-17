# I due regolamenti americani — ASA e IBO

**Letti il 17/09/2026.** Questo file esiste perché un numero di punteggio senza
una fonte accanto è una voce di corridoio. Qui c'è, per ciascuna regola che
ArcTrail applica: **dove sta scritta**, **che anno è**, **quale articolo**.

Chi deve rifare questo lavoro fra un anno parte da qui, non da `app.html`.

I banchi `tests/banco-asa.js` e `tests/banco-ibo.js` ricopiano questi numeri
**a mano** e li confrontano con quelli del file. Se un giorno divergono, sono
loro a dirlo — non questo documento, che invecchia in silenzio.

---

## 1. ASA — Archery Shooters Association

| | |
|---|---|
| **Fonte** | ASA Pro/Am Rules — 2026 |
| **URL** | <https://asaarchery.com/rules/asa-pro-am-rules/> |
| **Consultata** | 17/09/2026 |
| **Lingua** | inglese |
| **Verifica** | `verificato` — pagina ufficiale, letta sezione per sezione |
| **In `app.html`** | `REGOLAMENTI.asa_proam`, circuito `asa` |
| **Data di entrata in vigore** | **non dichiarata dalla fonte** → `dal: null` |

### Cosa dice, e cosa l'app fa

| Regola | Testo della fonte (sezione) | In ArcTrail |
|---|---|---|
| Frecce | «Only one arrow, per shooter, per target will be shot from their designated stake» (*Shooting Rules*) | `arrowsPerTarget: 1` |
| Zone e punti | «Arrows in the corresponding area of the target will be scored with point values of 5, 8, 10, or 12» (*Scoring*) | zone `12 / 10 / 8 / 5` |
| Formato | «Each ASA Pro/Am tournament will consist of two (2) rounds of twenty (20) individual 3-D targets» (*Tournament Format*) | `formats: [20]` — **un round**, vedi §1.1 |
| Zero | «An arrow that glances off and goes past the target will be scored as a "0"» (*Scoring*) | lo zero esiste già nel motore |
| Linea | «The arrow shaft must be touching a portion of the next highest scoring line to be scored for the higher value» (*Scoring*) | regola di campo: la decide l'arciere, l'app registra la zona scelta |
| Pareggi | conteggio dei *bonus ring* (i 12), poi «Closest-to-the-Center of the 10-ring» (*Scoring*) | i 12 sono contati come zona; il conteggio dedicato è **aperto**, §1.2 |
| Distanze | «In the "Classes" section all classes have been designated as Known or Unknown» | **aperto**, §1.3 |

**Massimo teorico di un round:** 20 × 1 × 12 = **240**.

### 1.1 Venti piazzole, non quaranta — decisione presa

Il torneo sono due round; il **cartellino** è uno per round. Il regolamento lo
ripete in tre punti («the properly completed official-colored scorecards must
be turned in by the group to the range official before leaving the range»).

Un giro di ArcTrail **è un cartellino**. Quindi `asa_proam` vale 20 piazzole, e
chi tira il torneo intero segna due giri — come fa già oggi chi tira due
giorni. *Non è un'interpretazione del regolamento: è la mappatura fra due unità
di misura, e sta scritta qui perché si possa contestare.*

### 1.2 I due 12-ring — DECISIONE DI PRODOTTO, APERTA

> «Each target has two (2) 12-rings. At each target the lower 12-ring will be in
> play initially for all shooters and a shooter may elect to have the upper
> 12-ring scored by announcing their intention to shoot for it. […] The
> shooter's decision to stay with the lower 12-ring, or to call the upper
> 12-ring cannot be changed after coming to full draw.»

**Il barème non cambia:** chi chiama l'alto e lo colpisce prende 12, come chi
colpisce il basso. Cambia la *scommessa*, non il punteggio — e per questo ASA
oggi è implementabile senza quella scelta.

Ma la scelta è **informazione di gara**, e un segnapunti serio potrebbe volerla
registrare (chi ha chiamato l'alto quante volte, e con che esito). Servirebbe
una domanda **bersaglio per bersaglio**, prima del tiro: una schermata nuova.

**Serve una decisione:**

- **(a)** lasciare com'è — un solo 12, la scommessa non si registra;
- **(b)** aggiungere un interruttore per piazzola «chiamo l'alto», che non cambia
  i punti ma resta nello storico;
- **(c)** (b) più una statistica dedicata nel diario.

*Non scelta in autonomia: cambia la schermata del giro, che è territorio di
prodotto.*

### 1.3 Known / Unknown — DECISIONE DI PRODOTTO, APERTA

Le classi ASA sono designate `Known` o `Unknown`, e la differenza è reale
(tempo per tiro diverso, telemetri vietati in Unknown). **Non cambia il
punteggio**, quindi il barème è uno solo.

Se un giorno ArcTrail vorrà distinguerli — per esempio per non confrontare un
record Known con uno Unknown — la strada è la stessa dell'IFAA: **due modi**
(`asa_proam_known`, `asa_proam_unknown`) con lo stesso barème e chiavi di
record diverse. Oggi non è stato fatto perché **spaccherebbe i record in due
prima che esista un solo giro americano da mettere dentro**.

### 1.4 Il 14-ring — NON IMPLEMENTATO, e non per dimenticanza

Nella pagina ufficiale 2026 la stringa «14» **non compare mai** come anello: i
valori dichiarati sono 5, 8, 10, 12. Fonti di terze parti (es. blog divulgativi)
raccontano di un 14-ring usato **negli spareggi**.

**Finché non sta nel regolamento, non sta nell'app.** `tests/banco-asa.js` ha
una sezione apposta («IL 14 NON ESISTE») che lo pretende: se un giorno qualcuno
lo aggiunge per sentito dire, il banco diventa rosso.

> **Da verificare** alla prossima lettura: se ASA pubblica il regolamento degli
> shoot-off separatamente, cercare lì il 14 e citarlo qui.

---

## 2. IBO — International Bowhunting Organization

| | |
|---|---|
| **Fonte** | IBO Rules and Class Definitions — 2026 |
| **URL** | <https://iboarchery.com/rules-and-regulations> (documento: `IBO-Rules.pdf`) |
| **Consultata** | 17/09/2026 — PDF scaricato ed estratto |
| **Lingua** | inglese |
| **Verifica** | `verificato` — documento ufficiale, letto articolo per articolo |
| **In `app.html`** | `REGOLAMENTI.ibo_rules`, circuito `ibo` |
| **Data di entrata in vigore** | **non dichiarata dalla fonte** → `dal: null` |

### Cosa dice, e cosa l'app fa

| Regola | Articolo e testo | In ArcTrail |
|---|---|---|
| Anello 11 | **II.B.1** «An "11" ring consisting of a circle centered within the 10 ring. The circle size should be approximately twenty five percent (25%) of the size of the 10 ring» | zona `11` |
| Anello 10 | **II.B.2** «A 10 ring consisting of a circle inside the vital area» | zona `10` |
| Vitale (8) | **II.B.3** «A vital area (8 ring) that roughly approximates the heart, lung, and liver area» | zona `8` |
| Corpo (5) | **II.B.4** «The remainder of the animal shall be considered a "body"» | zona `5` |
| Punti | **IV.B.2.a** 11 = 11 ring o «X»; 10 = 10 ring o heart; 8 = Vital; 5 = Body; 0 = «Miss or arrow not touching body color» | barème `11 / 10 / 8 / 5` |
| Corno | **II.B.5** «An arrow embedded in the horn of an animal, not touching body color, is considered a miss and is scored as a zero» | **nella descrizione del modo**, in nove lingue |
| Linea | **IV.B.2.c** «An arrow shaft touching the line of a greater scoring area shall be given the higher score» | regola di campo |
| Distanze | **II.A.3** «Targets shall be set at unmarked distances» + massimi per colore del paletto (blu 50 yd, verde 45, rosso 40, giallo 35, arancio 30, bianco 25, rosa neon 20) | sempre **non note** |
| Pareggi | **IV.F.1** «11s will be used to break ties for all places except…» | gli 11 sono contati come zona; conteggio dedicato **non implementato** |

### 2.1 Il numero di bersagli — NON È UNA REGOLA

**Cercato in tutto il documento: non c'è nessun articolo che fissi quante
piazzole siano.** Il 40 che ArcTrail usa è il **preset delle gare IBO**, e
40 × 11 = 440 coincide col massimo che le fonti di terze parti pubblicano — ma
resta un preset.

Per questo il modo porta `bersagliNonImposti: true`, la descrizione lo dice in
tutte e nove le lingue («ArcTrail usa un preset da 40 piazzole; il regolamento
IBO non fissa un numero di bersagli»), e `tests/banco-ibo.js` pretende
entrambe le cose. *Un preset scritto senza dirlo diventa una regola inventata
nel giro di sei mesi.* È la stessa onestà che l'NFAS ha già nella sua riga.

### 2.2 Frecce per bersaglio — dedotto, non citato

Il documento **non contiene** una frase del tipo «one arrow per target». Lo
dicono però tre regole insieme, e senza ambiguità:

- **IV.A.5** il tempo è «two minute period» per arciere allo stesso paletto;
- **IV.B.2.h** «An arrow released or dropped accidentally will be scored a zero
  unless the archer is able to retrieve it […] and re-shoot it within that
  archer's two minute period»;
- tutto l'apparato di punteggio parla di **un** arrow per target.

ArcTrail usa `arrowsPerTarget: 1`.

> **Da verificare** alla prossima lettura: cercare una formulazione esplicita.
> Se esiste in un'appendice o nel regolamento Traditional (`IBOTradRules.pdf`),
> citarla qui e togliere questa nota.

### 2.3 L'11 di IBO non è l'11 di World Archery

Valgono lo stesso numero e vengono da **due libri che nessuno tiene allineati**.
In `app.html` zone e tabelle sono **oggetti separati**, non riferimenti allo
stesso: il giorno che uno dei due cambia, l'altro non deve muoversi.

`tests/banco-ibo.js` confronta le **identità** degli oggetti, non solo i
valori, perché è esattamente l'errore che un refactor «di pulizia» farebbe fra
un anno.

---

## 3. Cosa NON è stato implementato, e perché

| Cosa | Circuito | Motivo |
|---|---|---|
| Conteggio dedicato dei 12 / degli 11 per lo spareggio | ASA, IBO | è una **classifica**, non un punteggio: serve sapere dove va mostrata |
| Scelta 12-ring alto/basso per piazzola | ASA | **decisione di prodotto**, §1.2 |
| Classi Known / Unknown separate nei record | ASA | **decisione di prodotto**, §1.3 |
| 14-ring | ASA | **non è nel regolamento 2026**, §1.4 |
| Regola del corno = 0 come zona cliccabile | IBO | l'app non sa dove sia il corno: resta regola di campo, scritta nella descrizione |
| Massimi di distanza per colore del paletto | IBO | ArcTrail non registra la distanza di una piazzola |
| Classi, divisioni, limiti di velocità e libbraggio | ASA, IBO | ArcTrail non fa iscrizioni né controlli attrezzatura per questi circuiti |

---

## 4. Dove guardare in `app.html`

| Cosa | Dove |
|---|---|
| Zone | `ZONES_4_ASA`, `ZONES_4_IBO` (accanto a `ZONES_3_NFAS`) |
| Modi | `GAME_MODES.asa_training`, `.asa_proam`, `.ibo_training`, `.ibo_3d` |
| Circuiti | `CIRCUITI.asa`, `CIRCUITI.ibo` |
| Regolamenti | `REGOLAMENTI.asa_proam`, `REGOLAMENTI.ibo_rules` |
| Federazioni | `FEDERATIONS.asa`, `FEDERATIONS.ibo` |
| Paese | `COUNTRY_LIST` (`us`), `COUNTRY_FEDERATIONS.us`, `PROFILE_FEDERATIONS` |
| Marchi del barème | `ASA_SCHEMA`, `IBO_SCHEMA`, `schemaPunteggio()` |
| Parole | `STRINGS`, chiavi `mode_asa_*`, `mode_ibo_*`, `zone_asa_*`, `zone_ibo_*`, `country_usa` |
