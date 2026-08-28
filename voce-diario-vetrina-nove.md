<!-- ═══════════════════════════════════════════════════════════════
     DA INCOLLARE IN `NOTE-DESIGN.md`, in fondo, dopo l'ultima voce.
     E nella tabella in cima, riga nuova:
     | 24/08/2026 | La vetrina impara nove lingue | `vetrina-nove` |
     ═══════════════════════════════════════════════════════════════ -->

## La vetrina impara nove lingue *(24/08/2026, versione `vetrina-nove`)*

### Prima, tre parole

Tre cose chieste, e la terza ha portato via la giornata.

**«Tiri dove vuoi» → «Scegli la tua federazione».** In italiano *tirare* è
anche quello che fa chi si fa di cocaina, e sulla pagina che si legge una
volta sola nella vita non è un rischio che valga la pena correre. Il titolo
adesso dice quello che la sezione fa davvero. E il testo sotto cominciava con
*«Scegli la tua alla prima apertura»*: due «scegli» a due righe di distanza,
diventato *«La imposti alla prima apertura»*.

**«Non si tira da soli» → «Organizza un allenamento».** Il verbo era un
problema, ma il problema più grosso era la forma: impersonale, negativa, al
presente. Suonava come un cartello all'ingresso del campo, non come un invito.

**Resta aperto qui accanto:** il titolo dice *Organizza*, il tasto sotto dice
*Trova un allenamento*. Due verbi opposti nella stessa sezione. Non è per
forza sbagliato — organizzi il tuo, trovi quello degli altri — ma chi arriva
nuovo non ha ancora niente da organizzare.

### Poi la domanda vera: in che lingua si apre?

*«Si può fare in modo che a seconda della posizione dell'utente si apra nella
lingua della nazione?»*

**No, e non è una limitazione tecnica: è che sono due cose diverse.** Un
italiano in Francia vuole l'italiano. La posizione dice dove sei, non che
lingua parli — e chi legge questa pagina spesso sta guardando un campo
all'estero, cioè proprio il caso in cui le due non coincidono. In più
chiederla fa comparire un permesso del browser sulla pagina che si vede una
volta sola: un cartello che chiede prima di dare. E dall'IP servirebbe un
servizio esterno, cioè una chiamata di rete prima di mostrare il testo, su una
pagina che si apre spesso col telefono nel bosco.

**Il segnale giusto ce l'ha già il telefono**, e l'app ha risolto questo
identico problema il 20/08 con `linguaProbabile()`. La vetrina fa la stessa
cosa, con lo stesso ordine: l'indirizzo (`?lang=fr`), poi la scelta già fatta
qui, poi la lingua del telefono. Se non è una delle nove si cade
**sull'inglese, non sull'italiano** — fra due lingue che non capisci l'inglese
è quella che qualcuno capisce.

**E la scelta viaggia.** L'app legge già `?lang=` dall'indirizzo — c'era da
prima, per i ritorni dalle email. Quindi i sette link che dalla vetrina
entrano nell'app portano la lingua con sé: chi legge in svedese e preme
*Öppna appen* trova l'app in svedese, senza rispondere di nuovo alla stessa
domanda.

### La struttura: `data-it`/`data-en` non regge nove lingue

Erano due attributi per nodo. A nove sarebbero stati nove, su settantacinque
nodi: la pagina si sarebbe letta solo con un editor. Adesso c'è un dizionario
a chiavi, `data-k="s1_h2"`, come `STRINGS` nell'app — **78 chiavi × 9 lingue,
702 stringhe.** Tradotti anche il titolo del documento, la descrizione per i
motori e i cinque testi alternativi delle foto, che erano rimasti in italiano
anche in inglese.

*Le chiavi sono state assegnate con un controllo, non a mano libera:* uno
script confronta l'italiano di ogni nodo con l'italiano nel dizionario e si
ferma se non combaciano. Assegnare una chiave alla stringa sbagliata è
l'errore che non dà nessun errore — si vede solo cambiando lingua.

Il tasto `EN`/`IT` è diventato un selettore a nove. Dentro c'è un `<select>`
vero, disteso sopra e trasparente: così su ogni telefono si apre la rotella di
sistema invece di un menu disegnato a mano, arriva col tasto tab e lo legge un
lettore di schermo. **I nomi delle lingue non si traducono mai** — chi cerca
la propria la cerca scritta come la scrive lui.

### E qui è cominciato il lavoro vero

Nove lingue non sono nove traduzioni: sono **nove composizioni diverse**. Il
tedesco è più lungo di un terzo, il turco attacca parole che altrove sono due,
il cirillico maiuscolo occupa più dell'alfabeto latino.

`banco-vetrina.js` — nuovo, il venticinquesimo — misura nove lingue per
quattro larghezze e guarda quattro cose che una traduzione rompe **senza dire
niente**:

1. **l'H1 dell'eroe deve fare tre righe.** Ha tre `<br>` messi a mano: se una
   riga va a capo da sola diventano quattro e la composizione si rompe in
   silenzio;
2. **i tasti dell'eroe** o stanno tutti in fila, o stanno tutti impilati a
   piena larghezza — mai uno lungo con sotto uno corto e storto;
3. **niente italiano** dove la lingua non è l'italiano;
4. **la testata non si accavalla e niente sporge di lato.**

Al primo giro ha detto no sei volte. Alla fine ne aveva trovate quindici.

### Le tre cose che ha trovato, e due c'erano già in italiano

**L'H1 in russo faceva quattro righe.** *«Твой следующий / круг. / Он там.»* —
la prima riga era troppo lunga. Diventata *«Следующий / круг. / уже там.»*

**I tasti dell'eroe sforavano in quattro lingue.** La colonna è 474px e la
coppia italiana ne chiede 448: francese 542, olandese 530, russo e spagnolo
479. Accorciati i primi tasti — `Commencer`, `Начать круг`, `Empezar`,
`Beginnen` — e anche il tedesco, che con `Jetzt loslegen` lasciava tredici
pixel di margine e sarebbe stata la prossima a rompersi.

**E poi due difetti vecchi, che non c'entravano con le traduzioni:**

- **Fra i 960 e i 1140 pixel i tasti dell'eroe si spezzavano storti, anche in
  italiano.** Sopra i 960 l'eroe torna a due colonne e i tasti tornano
  affiancati, ma a 1024 la colonna del 46% vale 379px e la coppia ne chiede
  448. Nessuno l'aveva mai visto perché è una fascia di larghezze che a
  scrivania non si prova quasi mai. Adesso lì si impilano, come sotto i 960.
- **La testata usciva dal suo spazio su telefono**, di 88px in russo, di 25 in
  turco — **e di 7 in inglese.** Il tasto ha adesso due forme: `Apri l'app`
  dove c'è posto, `Apri` sotto gli 860, la stessa soglia della sigla della
  lingua, così la barra cambia tutta insieme invece che a pezzi. In russo
  anche la forma lunga è scesa a `Открыть`: era l'unica a due parole, e la
  seconda non aggiungeva niente.

*La lezione è quella di sempre, ma per la prima volta su una pagina di
presentazione:* **una traduzione non è un testo, è una misura.** E un banco che
misura le lingue trova anche i difetti che l'italiano nascondeva, perché
l'italiano è la lingua su cui è stato disegnato tutto e quindi è l'unica che
non fa mai da controprova.

### Il banco sabotato, e due buchi suoi

Sabotato in tre punti: una traduzione tedesca tornata italiana, la caduta
portata sull'italiano invece che sull'inglese, un link verso l'app senza il
suo marchio. **Ne ha presi uno su tre.** I due che gli sono sfuggiti erano
difetti del banco, non del file:

- cercava l'italiano in `innerText`, che restituisce il testo **già
  trasformato** dal foglio di stile: i titoli sono in maiuscolo, e
  «Cinque cose» nel file diventa «CINQUE COSE». Adesso confronta in minuscolo;
- guardava il **primo** link verso l'app. Toglierne il marchio a uno degli
  altri sei non si vedeva. Adesso li conta tutti e sette, e conta anche quanti
  puntano all'app senza essere marcati.

Corretto, ri-sabotato, e li prende tutti e tre.

### Cosa resta aperto qui accanto

- **Le traduzioni non le ha lette nessuno che le parli.** Sono 702 stringhe
  scritte da chi non parla sette di queste nove lingue. È lo stesso punto
  aperto del mercatino (D1), ma qui pesa di più: un errore in svedese dentro
  l'app lo vede chi la sta già usando, in vetrina lo vede uno che sta ancora
  decidendo se fidarsi.
- **Una pagina sola, non nove.** La lingua cambia col copione, quindi i motori
  di ricerca vedono solo l'italiano: la vetrina francese non esiste per chi
  cerca *«application tir à l'arc 3D»*. I nove `hreflang` verso `?lang=xx` ci
  sono già e il dizionario a chiavi è esattamente quello che serve per
  generare nove pagine da uno stampo, il giorno che il traffico arriva dai
  motori invece che dai link mandati a mano.
- **Il titolo degli allenamenti dice *Organizza*, il tasto sotto dice
  *Trova*.**
- **Nessuno l'ha ancora vista su un telefono vero** — vale sempre A7.
