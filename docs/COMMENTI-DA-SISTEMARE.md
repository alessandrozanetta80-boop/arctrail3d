# COMMENTI DA SISTEMARE

Elenco raccolto da Alessandro il **20/08/2026**, guardando l'app in esecuzione.
Sono osservazioni, non lavori aperti: nessun file è stato toccato, nessun timbro
alzato, `controlla-tutto.sh` non è stato lanciato.

L'elenco è ancora **aperto**: Alessandro continuerà ad aggiungere voci.
Prima di lavorare su una qualunque di queste voci vale la procedura di sempre
(REGOLE-LAVORO.md → `controlla-tutto.sh` → diari).

---

## 1 · Schermata di primo accesso — ✅ FATTA il 20/08
**Versione:** `2026-08-20-vetrina-e-scala` + `sw` v31 · **Da caricare.**

Adesso, sopra il primo passo: **«Il segnapunti per il tiro con l'arco 3D»** e
sotto *«Segni le frecce sul percorso anche dove non prende, e ritrovi tutto
nel diario. Conosce i regolamenti della tua federazione.»*

**La frase l'ho scelta io: è una proposta, non una decisione.** Due righe e
nessun aggettivo — chi apre l'app la sera prima della gara sta decidendo se
fidarsi, e la fiducia si compra con una cosa specifica.

**In che lingua?** È la schermata che CHIEDE la lingua, quindi `t()` cadrebbe
sull'italiano. Adesso legge quella del telefono, e se non è fra le nove cade
sull'inglese. Provata con tre telefoni: italiano, tedesco, giapponese.

**E il marchio era a sinistra** da sempre: `text-align:center` non fa niente
su un SVG a blocco. Visto guardando la foto, non rileggendo.
**File:** `index.html` · **Stato osservato:** pubblicato 2026-08-19

Chi entra per la prima volta vede: marchio, un solo blocco
`1 · LINGUA / LANGUAGE` con la tendina vuota (trattino), e sotto due terzi di
schermo bianchi. Nessuna riga che dica cosa sia ArcTrail 3D né cosa si guadagni
a proseguire. Il primo passo chiede di scegliere prima di aver capito dove si è.

**Da fare:** sistemare la pagina di accesso e metterci una descrizione veloce di
cosa fa l'app. È la vetrina.

---

## 2 · Ritorno dal link di verifica email — ✅ FATTO il 20/08
**File:** `index.html` · **Versione:** `2026-08-20-ritorno-dall-email` + `sw` v20
**Da caricare su GitHub, non ancora online.** Racconto per intero in `NOTE-DESIGN.md`.

Oggi: fatta la registrazione arriva la mail, si clicca il link, e l'app riparte
dal passo 1 (selezione lingua). La lingua era già stata scelta in fase di
registrazione, quindi il passo viene chiesto due volte.

**Atteso:** cliccato il link di verifica si atterra direttamente sul **login**,
con la lingua già impostata da registrazione.

**Causa vera, ed era diversa da come sembrava.** La lingua non era stata
dimenticata: era rimasta **nell'altro browser**. Il link della verifica lo apre
l'app della posta, quasi sempre in un browser suo, dove `localStorage` è vuoto.
E l'indirizzo di ritorno era `origin + "/"` e basta — non portava niente con
sé, e `index.html` non leggeva nessun parametro dall'indirizzo.

**Ed era peggio del previsto.** Con `localStorage` vuoto il login non era al
passo 2: era al **quinto**. Passo 1, passo 2, passo 3, schermata di benvenuto
— che offre «Registrati» come primo tasto, cioè manda a rifare la cosa appena
finita — e solo allora «Accedi».

**Curato in tre pezzi:** il ritorno porta `?da=email&lang=`; l'app li legge
all'avvio e poi pulisce l'indirizzo; e chi arriva da un'email vede il login,
non il benvenuto. Vale anche per la reimpostazione della password, che passa
dalla stessa strada.

**Resta da provare con una registrazione vera:** iscriversi dal telefono e
aprire la mail da un'altra parte. Le prove dicono che l'indirizzo si costruisce
e si rilegge; il giro completo lo dice solo il giro completo.

**Resta aperto accanto:** paese e federazione vanno comunque rifatti nel
browser nuovo. Vivono solo in `localStorage` e non seguono la persona — vale
per ogni telefono nuovo, non solo per il ritorno da un'email. È un lavoro suo.

---

## 3 · Il sito sembra caricarsi due volte — ✅ FATTO il 20/08
**File:** `index.html` / `sw.js` · **Versione:** `2026-08-20-avvio-senza-lampo` + `sw` v19
**Da caricare su GitHub, non ancora online.** Racconto per intero in `NOTE-DESIGN.md`.

All'apertura si vede una prima resa e poi un secondo passaggio, come un lampo o
un ridisegno completo.

**Piste, verificate una per una:**

- ~~service worker che serve la cache e poi la sostituisce~~ — **no.** Per i
  file nostri `sw.js` va prima in rete col cronometro: nessuna sostituzione.
- **tema applicato dopo il primo paint** — **sì, ed era metà del problema.**
  `applyTheme()` sta dentro `paintScreen()`. `:root` è il tema chiaro, quindi
  chi ha **scuro o sole** vedeva la pagina nascere chiara e poi girare.
  Curato con dieci righe in cima al `<body>`, prima di `#app`.
- ~~`render()` chiamato due volte~~ — **no, il contrario:** all'avvio veniva
  chiamato **una volta sola e troppo tardi**, da `onAuthStateChanged`, che va
  in rete. Fino a lì `#app` era vuoto: bianco, attesa, e poi tutto insieme.
  Adesso c'è un `render()` prima di `initAuthFlow()`.

**Resta da guardare con un occhio, non con un banco:** aprire l'app con tema
**scuro** o **sole** e vedere se il lampo è sparito. In chiaro non si vedeva
nemmeno prima. E resta il bianco durante la lettura del file, che è un'altra
cosa e non si fa di sfuggita — vedi il diario.

---

## 4 · Revisione generale del design — 🟢 LINGUAGGIO E IGIENE FATTI (20/08)
**Versione:** `2026-08-20-vetrina-e-nomi` + `sw` v32 · **Da caricare.**

| | mattina | sera |
|---|---|---|
| stili in linea | 515 | **452** |
| esadecimali fuori dai primitivi | 56 | **44** |
| misure fuori scala | 61 | **12** |
| caratteri a mano in linea | 239 | **2** |
| spaziature a mano | 272+ | **29** |
| raggi a mano | 84+ | **9** |

**Da adesso tipografia, angoli, ritmo e note si cambiano ognuno da una riga.**
**File:** `index.html` · **Versione:** `2026-08-20-caratteri-sulla-scala` + `sw` v22
**Da caricare su GitHub, non ancora online.** Racconto per intero in `NOTE-DESIGN.md`.

Non è un bug singolo: rivedere l'intero linguaggio visivo dell'app per renderlo
**più moderno, elegante e immediato**. In più — e conta quanto il resto — l'app
deve essere **sexy**: deve invogliare all'uso, non limitarsi a funzionare.
Attrattiva al primo sguardo, piacere nell'usarla, voglia di riaprirla.

Tocca tipografia, spaziature, gerarchia, colore, movimento, componenti.

**Vincoli già in essere:** si passa dal sistema a tre layer
(primitivi → ruoli → componenti) e dal guardiano `controlla-token.js`, non da
CSS sparso. Le decisioni già scritte in NOTE-DESIGN.md restano tali salvo
indicazione contraria di Alessandro.

---

### Quello che il conto ha detto, il 20/08

**La revisione non era «da fare»: era inapplicabile.** Il sistema esiste ma non
arrivava ai componenti — `font-size` 79 con i token contro 91 a mano nel
foglio, `border-radius` 29 contro 48, e nel copione **514 stili in linea**.

Il dato che decideva tutto: **239 `font-size` scritti a mano, trenta valori
diversi**, e i primi otto tutti dentro due pixel e mezzo (0.85 – 0.68rem).
Nessuno vede la differenza fra 0.78 e 0.80: non erano decisioni, era rumore.
Ma finché esistevano, cambiare la tipografia voleva dire 239 modifiche a mano,
e la revisione dopo altre 239.

### Fatto (primo passo: i caratteri)

**236 misure portate sulla scala `--t-*`.** Trenta valori diventano cinque, e
173 su 236 finiscono tutti in un token solo. Da adesso la tipografia dell'app
si cambia **da un posto solo**.

Qualcosa si sposta, ed è giusto dirlo: i valori a mano erano fissi, i token
sono `clamp()`. Lo scarto è del **3–5%**, cioè mezzo pixel su un testo da 13px
— sul telefono rimpicciolisce, sul computer cresce, che è la scala che fa il
mestiere che prima non faceva.

Restano a mano due cose, di proposito: il copione di soccorso (è quello che
disegna «si è verificato un problema», e non deve dipendere dal foglio di
stile che potrebbe essere il rotto) e la bandierina della federazione, che è
a `1.15em` cioè *un po' più grande del testo accanto*.

### Resta da fare

1. ~~**I raggi**~~ — ✅ **fatto il 20/08** (`raggi-sulla-scala`, sw v23).
   **84 punti** portati sui token fra foglio e stile in linea, zero pixel di
   differenza. È nato anche `--r-xs:8px`: la scala partiva da 10 e quindici
   punti erano fermi a 8, cioè un gradino vero che il sistema non sapeva
   nominare. Restano dodici raggi fuori scala — fra cui **`.card` a 18px**,
   la superficie più vista dell'app: spostarla cambia il carattere di tutto,
   quindi appartiene alla prova, non all'igiene.
2. **I 91 `font-size` nel foglio** — stessa operazione, ma passano dentro
   `@media print` e movimento ridotto, dove un `clamp()` con i `vw` è sbagliato
   per definizione. Vanno guardati, non passati con lo stesso script.
3. ~~**I margini**~~ — ✅ **primo passo fatto il 20/08** (`spazi-sulla-scala`,
   sw v24). **203 spaziature** portate sui token, zero pixel di differenza.
   **Ma il censimento ha trovato altro:** i valori piu' usati che restano
   fuori sono 10, 6, 14, 2, 18 — cioè tutti i punti **di mezzo** fra i
   gradini. Non e' rumore: l'app e' stata costruita su una **griglia da 2**,
   e la scala dichiarata e' da **4**. Duecentododici punti stanno li'.
   Sceglierne una sposta duecento distanze di due pixel l'una: **si guarda,
   non si conta**, e appartiene alla prova.
4. **Il linguaggio nuovo** — 🟡 **la prova è pronta, aspetta te.**

   👉 **https://claude.ai/code/artifact/776da0ed-9ad2-4b2e-aefe-4d3434cd2164**

   Tre versioni della schermata dove si tira — **Oggi**, **A · meno scatole**,
   **B · una gerarchia** — nei tre temi. Non sono disegni: sono **foto
   dell'app vera**, scattate col suo codice. Nessun file del sito è stato
   toccato per farle.

   **La colonna passa da 599px a 450**, e nessuna funzione si perde.

   **La griglia da 2 o da 4 si è chiusa da sola:** arrotondando ogni misura
   al gradino da 4 la colonna passa da 450 a **442px**. Otto pixel. Si può
   fare senza perdere niente.

   **Scelta: B, con l'arancio.** Alessandro: «l'arancio mi manca». Aveva
   ragione, e la proposta era sbagliata a metà: **l'arancio non era il
   problema, era il peso.** Adesso la gara tiene il suo arancio **sul
   contorno**, e l'icona resta piena — stessa forza, un decimo del peso.

   👉 **Il giro completo, prima e dopo:**
   **https://claude.ai/code/artifact/62e848a7-b00a-4af6-b1e6-8007026a5542**

   **Poi, provata: il verde pieno è durato un caricamento.** Alessandro:
   «lo start training cosi grosso mi disturba, tornerei ai tasti grossi
   uguali; e poi è troppo verde». Aveva ragione: *una gerarchia si legge una
   volta, un pieno grande si subisce sempre*. Le tre pastiglie sono tornate
   uguali di peso; **tutto il resto del giro resta.**

   Versione `2026-08-20-tasti-pari` + `sw` v26. **Da caricare su GitHub.**

   **Due errori trovati solo fotografando:** le prime regole erano finite
   dentro `@media (min-width:900px)`, cioè valevano solo da computer — nel
   file sembravano giuste e sul telefono non facevano niente; e il primo
   fotografo scattava **nove volte la stessa schermata**, perché all'apertura
   l'app riparte sempre dalla home.

   **Quattro schermate non sono nel giro** — Campi, Compagnie, Mercatino,
   Profilo: senza accesso non si aprono. Quelle vanno guardate a mano.

**Da guardare su un telefono:** mezzo pixel è mezzo pixel, ma duecentotrentasei
mezzi pixel tutti insieme sono un'altra cosa, e lo dice l'occhio.

---

## 5 · Spaziature del fondo pagina — schermata Shoot — ✅ FATTO il 20/08
**File:** `index.html` · **Versione:** `2026-08-20-ritmo-del-fondo` + `sw` v21
**Da caricare su GitHub, non ancora online.** Racconto per intero in `NOTE-DESIGN.md`.

Dallo screenshot: le tre carte *Start Training / Free Competition /
Prepare Event* stanno in un riquadro; poi *My journal* e *Full reset* sono due
bottoni larghi impilati con aria diseguale tra loro; sotto, un terzo riquadro
con la riga di testo e *Report a problem*.

Tre contenitori con respiro diverso, due bottoni centrali sfusi senza
contenitore, vuoti verticali che non seguono una scala unica.

**Il conto era 18 → 0 → 10 → 0.** Il riquadro staccava di 18px; «Il mio
diario» di **zero**, perché la regola che lo centra (`margin:0 auto`) azzera
anche il verticale; «Azzera il giro» di 10 scritti in linea; il riquadro della
segnalazione di zero. Un tasto senza aria sotto si **incolla al riquadro che
viene dopo**: per questo si leggeva come disordine e non come una distanza
sbagliata.

**Il numero giusto c'era già: 16.** Lo dicevano `.resume-banner` e i titoli di
sezione, e 16 sta sulla scala dichiarata dell'app. Erano 18, 14 e 10 a essere
fuori. Adesso riquadri, griglia dei tre comandi e tasti sfusi dicono tutti 16.

**I due tasti restano sfusi, di proposito.** Sono azioni secondarie: un
riquadro intorno darebbe loro il peso di quelle primarie. Mancava il respiro,
non il contenitore.

**E adesso lo tiene fermo una macchina.** `controlla-token.js` ha una domanda
nuova che controlla quei quattro punti e protesta se qualcuno torna a
scostarsi dal 16.

**Resta da guardare su un telefono vero:** il ritmo si giudica con l'occhio,
non col righello.

**Resta aperto, e è una tua decisione:** «Azzera il giro» è il **secondo**
comando per il percorso in corso — in cima c'è già la striscia con
«Riprendi». Metterli insieme toglierebbe un tasto invece di spaziarlo. Non
l'ho fatto perché oggi la distanza è una protezione: un comando distruttivo
accanto a quello che si preme sempre si tocca per sbaglio.

---

## 6 · Cinque cose dal campo (20/08, sera) — 🟢 QUATTRO FATTE, UNA APERTA
**File:** `index.html` · **Versione:** `2026-08-20-tendine-visibili` + `sw` v29
**Da caricare su GitHub.** Racconto per intero in `NOTE-DESIGN.md`.

1. ✅ **La chat aveva bisogno di ricaricare.** Erano due difetti sommati: il
   messaggio non veniva creato finché il server non confermava la testata, e
   quando arrivava aveva data `null` — che Firestore mette **in cima**, fuori
   dalla vista. Corretti tutti e due, su **entrambe** le chat.
2. ✅ **Dopo il link di conferma compariva un'altra conferma.** L'app aveva in
   mano l'utente di prima, che diceva ancora «non verificata». Adesso lo
   ricarica — ma solo quando si arriva da un'email.
3. ✅ **«Test the bell che senso ha?»** Adesso lo dice, in una riga sotto il
   titolo, e lo vedono solo i collaudatori e l'admin.
4. ✅ **Le notifiche si potevano solo accendere.** Adesso si spengono, e lo
   spegnimento sopravvive al riavvio. Il tasto dice anche cosa NON si perde:
   gli avvisi restano nella campanella dentro l'app.
5. ✅ **Gli allenamenti aperti.** Il difetto è corretto — l'elenco era una
   fotografia scattata all'accesso, adesso è in ascolto e si aggiorna da sé.
   **Ma il disegno che hai chiesto non è fatto:** la tendina ben visibile con
   i filtri per regione e provincia. È possibile — **tutte e 663 le compagnie
   hanno regione e provincia** — ed è il prossimo lavoro.
   **Le tendine ci sono, e da due allenamenti in su.** La prima versione le
   mostrava solo da due REGIONI in su, e con due allenamenti vicini — stessa
   regione — non compariva niente: nascoste proprio nel caso in cui sei
   andato a cercarle. Corretto. Il titolo porta anche il conto:
   «Allenamenti aperti · 2».

   Regione e provincia sono prese dalla compagnia del
   campo — tutte e 663 le compagnie ce l'hanno, quindi vale anche per gli
   allenamenti già pubblicati. Compaiono solo quando c'è più di una regione,
   e ogni voce porta il suo conto.

   **E «ne abbiamo registrati due e se ne vede solo uno» adesso l'app lo
   dice.** Tre filtri voluti toglievano allenamenti in silenzio: i sette
   giorni, la visibilità di compagnia, i blocchi. In fondo alla scheda c'è
   una riga — *«Non in elenco: 2 oltre i 7 giorni · 1 altra compagnia»* — e
   quando non manca niente non compare.

---

## 7 · Il nome vecchio nella chat — ✅ FATTO il 20/08
**File:** `index.html` · **Versione:** `2026-08-20-nome-vero` + `sw` v30
**Da caricare su GitHub.** Racconto per intero in `NOTE-DESIGN.md`.

*«Un utente ha cambiato username ma nella chat aperta rimane uguale.»*

**Il nome era copiato dentro ogni messaggio** al momento dell'invio, dentro la
testata della conversazione e dentro l'allenamento. Ed era la scelta giusta:
senza, per disegnare venti messaggi servirebbero venti letture in più. Ma una
copia non si aggiorna da sola.

**Non ho rifatto le copie** — vorrebbe dire riscrivere ogni messaggio di ogni
conversazione, dentro documenti che il telefono non può nemmeno toccare.
**La copia resta, ma non comanda più:** il nome si legge da `public_profiles`,
che ce l'ha sempre giusto, e la copia diventa il ripiego per chi ha chiuso il
profilo o non c'è più.

Guarite cinque schermate: le bolle di tutte e due le chat, il titolo di tutte
e due, l'elenco delle conversazioni, e l'allenamento aperto — organizzatore e
partecipanti.

**Resta vecchio** il nome dentro le notifiche già mandate: sono testi già
composti dal server, lì non c'è un uid da cui risalire.

---

---

## 8 · Il PRD v2.1 — 🟢 LA HOME È NEL FILE (20/08)
**Versione:** `2026-08-20-la-home` + `sw` v33 · **Da caricare.**

👉 **I mockup:** https://claude.ai/code/artifact/56b8c60f-5e99-4e78-8ecb-707caf6c9766

**La Home non esisteva.** L'app si apriva su «COSA VUOI FARE?», che non è una
risposta: è la domanda girata indietro. Adesso c'è il saluto (che sa che ore
sono), «Pronto a tirare?», due comandi, i quattro numeri del mese, chi si
allena vicino, e l'ultimo giro col salto rispetto al precedente.

**Con un giro aperto cambia priorità**: sparisce la scelta e resta una cosa
sola da fare, con l'avanzamento e la riga «salvato sul telefono».

**I numeri vengono dallo storico vero**, e se non ci sono giri la fascia non
compare affatto — un cruscotto pieno di zeri scoraggia e mente.

**Il mercatino esce dalla barra** per far posto a Tira al centro: era chiuso
ai non collaudatori, quindi per quasi tutti era una voce che porta a una porta
chiusa. La sua porta resta in una scorciatoia sulla Home.
Ordine nuovo: **Home · Campi · Tira · Compagnie · Profilo**.

**Il grafico dell'andamento è fatto** (`2026-08-20-andamento`, sw v35): tre
finestre (mese / 3 mesi / stagione), si tocca per leggere punteggio, data e
campo, e **sotto quattro giri non disegna niente** — due punti uniti da una
retta sembrano una tendenza e non lo sono. Il colore della linea è stato
misurato, non scelto: al buio il verde del marchio faceva 2,13:1 di contrasto.

**Resta da fare:** il campo più vicino e il meteo
(il PRD li dà per opzionali); il corpo del testo **è salito a 16px** (`2026-08-20-corpo-16`, sw v37): sul
telefono adesso corpo 16,1 · piccolo 14 · micro 12, come chiede il PRD. La
pagina cresce di **34 pixel in tutto** — il 2,7% — perché le schede sono fatte
di margini, non di righe. Otto righe di modifica, e la scala vecchia è nel
commento sopra per tornare indietro.

**~~«Scopri» è ancora un pulsante che apre Maps~~ — ✅ fatto il 21/08**, ed è
la voce 12 qui sotto: la Fase 3 del PRD.

**Attività è fatta** (`2026-08-20-attivita`, sw v36): tre schede — Insieme,
Giri, Record — con il riepilogo di stagione e il grafico in cima. Il profilo
è uscito dalla barra come chiede il PRD; la barra adesso è
**Home · Campi · Tira · Attività · Compagnie**, con Tira al centro.

**Il campo è stato aggiunto al giro** (`2026-08-20-dove-si-tira`, sw v34).
Si chiede nella preparazione, **per ultimo e facoltativo**, con i suggerimenti
già pronti: il campo della tua compagnia e quelli che hai già scritto. Chi non
lo scrive non si trova un campo inventato nel diario.

**I giri già fatti non lo avranno:** non si può dedurre dove fosse qualcuno il
18 agosto. Il diario resta misto per un po', ed è onesto che lo sia.

**E il campo è testo libero:** due persone scriveranno «Cerrione» e
«Fornasona, Cerrione» per lo stesso posto. Va bene finché serve a leggere il
proprio diario; il giorno in cui serve a confrontare fra arcieri servirà un
campo vero, con un codice.

---

---

## 9 · Icone e arancio (20/08) — ✅ FATTO
**Versione:** `2026-08-20-casetta-e-arancio` + `sw` v38 · **Da caricare.**

**La casetta.** Home e Tira usavano la STESSA icona — il bersaglio — perché
quando la Home è nata ha preso in prestito quella che c'era. Disegnata nella
stessa lingua delle altre, con la porta come accento arancione.

**La chat non è più una busta.** La posta è un'altra cosa: si scrive, si
aspetta, si risponde domani. Qui si parla — nuvoletta coi tre puntini.

**L'arancio, in tre posti, e uno era un errore:**

1. **I contatori dei non letti erano rossi.** Il rosso il PRD lo riserva a
   distruttivo, sicurezza ed errori seri. Un messaggio non letto è *attenzione
   che vale*, cioè arancio. *Usare il rosso per tutto quello che chiede
   attenzione lo consuma: quando arriva un errore vero non ha più niente da
   dire.*
2. **«Partecipo» era verde.** Il verde è tirare; unirsi a quello che fa un
   altro è diverso — e il PRD dice esplicitamente che join è arancio.
3. **L'ultimo punto del grafico**, l'unico posto in una linea tutta verde
   dove un secondo colore dice qualcosa invece di decorare.

Tutti verificati a 3:1 sui tre temi prima di usarli.

**Da guardare:** la barra non compare in nessuna foto — senza un utente
collegato `DEV_MODE` non la disegna. Le icone sono state viste una accanto
all'altra, non al loro posto.

---

---

## 10 · Area compagnia e allenamenti (20/08) — ✅ FATTO
**Versione:** `2026-08-20-area-compagnia` + `sw` v39 · **Da caricare.**

**Il problema.** Chi non è referente — quasi tutti — apriva «Compagnie» e
trovava un modulo per REGISTRARE una compagnia, un tasto di menu e tre tendine
vuote. *La sua compagnia, che sta nel profilo, non compariva da nessuna parte.*

**Tre schede: La mia · Scopri · Gestisci.** La porta d'ingresso dipende dal
profilo ma è un suggerimento, non un muro. La scheda scelta sopravvive al
ridisegno (iscriversi a un allenamento ridisegna tutto).

**«La mia»**: fascia, stemma, nome, regione/provincia/codice, l'indirizzo del
campo, i contatti come pastiglie da toccare, e gli allenamenti in programma lì.
I numeri sono solo quelli veri — niente «iscritti», che l'app non sa.

**Gli allenamenti come nelle bozze.** Prima ogni allenamento era alto mezzo
schermo; adesso è una riga sotto i 90 pixel: quadrato della data, campo, ora,
quanti sono, chi organizza, e la pastiglia «Partecipo». Il resto si apre
toccando. La data è «21 AGO», non «2026-08-21».

**«Scopri»**: le due tendine su una riga, e al posto della terza un elenco di
compagnie da toccare. La regione parte da quella della tua compagnia.

**Due cose rotte trovate per strada:**

1. **Il testo sulle pastiglie arancioni era illeggibile sul tema Sole** —
   2,44:1. Ieri avevo scritto «verificati sui tre temi» senza misurare il
   terzo. Adesso c'è un ruolo suo: 4,74 / 6,00 / 7,51.
2. **Il titolo «Compagnie» sopra l'elenco dei percorsi**, dentro la scheda di
   una compagnia.

**Due banchi nuovi.** `controlla-sintassi.js` (secondo, ferma la corsa: oggi una
parentesi non chiusa spegneva l'app e i primi otto banchi dicevano tutti di sì)
e `banco-compagnia.js` (dodicesimo, 41 prove).

**Da guardare:** la riga dell'allenamento su un telefono vero — il nome del
campo si taglia a metà su 390 pixel, e il banco misura che ci stia, non che si
legga.

---

---

## 11 · I percorsi: l'arciere propone, la compagnia conferma (20/08) — ✅ FATTO
**Versione:** `2026-08-20-percorsi-proposti` + `sw` v40 · **Da caricare.**
**Servono anche:** `firestore.rules` e `index.js` (funzioni) — nell'ordine
scritto in fondo.

**La regola.** Chi propone puo' scrivere SOLO «proposto» — e lo impediscono le
regole di Firestore, non la pagina. Un percorso proposto non compare agli altri
arcieri: comparirebbe come vero. Compare a chi l'ha proposto (se sparisse
crederebbe di aver sbagliato a premere) e a chi deve confermarlo.

**Rifiutare cancella**, non archivia: un percorso che non esiste non deve
restare in giro a farsi riproporre.

**Due porte, perche' sono due persone.** Avviso dentro l'app al referente (e lo
porta dove si conferma), posta a chi tiene l'app e all'indirizzo della
compagnia. Servono tutte e due: una compagnia senza referente non ha nessuno
da svegliare dentro l'app. E per quelle che non hanno ne' l'uno ne' l'altro
c'e' la sesta scheda del pannello.

**✅ LA POSTA PARTE.** L'estensione «Trigger Email» e' installata su Aruba
(`smtps.aruba.it:465`, casella `info@arctrail3d.com`) e la prova e' passata:
`delivery.state: SUCCESS` e la mail arrivata in casella. I dettagli e le due
trappole che costano un'ora — la `@` da scrivere `%40` e il certificato che
non e' del dominio — stanno nella regola 14 di REGOLE-LAVORO.md.

Il pannello continua a contare la coda: se un giorno l'estensione si ferma, il
numero sale e le lavorate restano ferme.

**Via i dati finti.** I due percorsi e gli undici punteggi di Anna, Carlo, Pino
e Milly precaricati su 01VERB non ci sono piu': erano inventati e li vedeva
solo chi apriva quella compagnia sul proprio telefono.

**ORDINE DI CARICAMENTO, da rispettare — e NON è quello solito:**
1. **`firestore.rules`** — su GitHub (copia di sicurezza) **e** incollato in
   console Firebase → Firestore → Regole → Pubblica. Sono due mosse: GitHub le
   mette al sicuro, non le applica.
2. **`index.js`** su GitHub, poi `bash ~/pubblica.sh` dal Cloud Shell
3. **`index.html`** + **`sw.js`** su GitHub

Di solito le regole vanno per ultime, perche' STRINGONO. Queste ALLARGANO:
aggiungono due raccolte che prima non c'erano e non tolgono niente a nessuno.
Se arrivassero per ultime, l'app nuova scriverebbe in una raccolta senza
regola — e una raccolta senza regola è negata: il tasto «Proponi»
fallirebbe con permission-denied per tutto il tempo in mezzo.

---

## 12 · I campi si cercano dentro l'app (21/08) — ✅ FATTO
**Versione:** `2026-08-21-campi-nell-app` + `sw` v41 · **Da caricare.**
È la **Fase 3 del PRD** (Discover + Fields), e il suo criterio è una riga:
*field discovery happens inside ArcTrail; external maps used for navigation,
not discovery.*

**Prima:** «Campi» era un pulsante che apriva Google Maps. Non era poco perché
faceva poco: era poco perché **mandava via**. E i campi ce li avevamo già —
**663**, uno per compagnia, con luogo, provincia, contatti — solo che per
vederli bisognava passare da «Compagnie», cioè cercare un'associazione quando
si sta cercando un posto.

**Adesso** la sezione si apre già piena sulla tua regione («In Piemonte · 13
campi»), ha una casella sola che cerca luogo, nome, provincia e codice
insieme, e ogni riga mette avanti **dove si tira** e sotto **chi lo tiene** —
che è l'ordine in cui la domanda viene fatta davvero. Toccando una riga si
apre la scheda **sotto la riga**: contatti da toccare, «Allenamenti aperti
qui: 2» quando ce ne sono, e **«Portami lì»**, che è il mestiere vero di Maps.

**La ricerca larga di Maps resta, in fondo e dichiarata:** serve a chi è fuori
dall'elenco — all'estero, o in un posto che non è di nessuna compagnia. *Un
ripiego dichiarato non è una scorciatoia nascosta.*

**Due cose viste solo provandola:** «1 campi» (che compare proprio quando la
ricerca ha funzionato — ora c'è il singolare in nove lingue) e il tetto delle
sessanta righe, che adesso **dice** quante non ha mostrato.

**Resta fuori, e va detto:** niente mappa e niente «entro 30 km». Le 663 righe
hanno il luogo scritto a parole, non le coordinate: la distanza oggi non si
può calcolare, e fingere di saperla sarebbe peggio che non offrirla. È un
lavoro di dati, non di schermate.

---

---

## 13 · La barra non stava dentro lo schermo (21/08) — ✅ FATTO
**Stessa versione e stesso caricamento della voce 12.**

La barra a cinque voci è di ieri e **non era mai comparsa in una foto**: si
disegna solo con un utente collegato, e le prove giravano senza. Guardata
finalmente al suo posto — e misurata — a **320px** (iPhone SE, e i telefoni
piccoli che restano in giro) la riga sforava lo schermo: **«Verenigingen»
usciva di venti pixel**, il russo di diciotto, l'italiano di tre.

**La causa non era la parola, era la cella:** le celle non possono
restringersi sotto il proprio contenuto, quindi a cedere era la riga. Tolti
quattro pixel d'aria per cella sotto i 360px, **tutte e nove le lingue
rientrano intere**. Si toglie l'aria, non le lettere.

**Due banchi nuovi**, il tredicesimo e il quattordicesimo: `banco-barra.js`
(13 prove, quattro larghezze × nove lingue) e `banco-campi.js` (23 prove).
Più `copia-dev.js`, che prepara la copia di prova con l'utente finto: prima
quella riga era ricopiata in quattro file diversi.

**Da guardare, e non l'ho toccato:** nella barra «Attività» è l'unica icona
con una barra arancione piena — l'area arancione più grande delle cinque. Da
spenta pesa più di «Tira», che è la voce centrale e la cosa che si fa più
spesso. È una decisione di disegno tua, di ieri: te la lascio.

---

## 14 · I dettagli della compagnia comparivano in fondo (21/08) — ✅ FATTO
**Versione:** `2026-08-21-scheda-sotto-la-riga` + `sw` v42 · **Da caricare.**

*«Quando clicco su una compagnia i dettagli devono essere immediatamente
sotto, non in fondo a tutte le compagnie.»*

Era peggio di come suona: con quattordici righe in elenco, la scheda di quella
toccata a metà finiva **sotto le altre nove**, fuori dallo schermo. Sembrava
che toccare non avesse fatto niente, e chi ritoccava la riga la chiudeva
credendo di riprovare. C'era una toppa che faceva scorrere la pagina fin
laggiù — e una toppa che porta l'occhio dove il disegno non lo ha messo è il
segnale che il disegno è sbagliato.

**Adesso la scheda entra nell'elenco, subito sotto la sua riga**, e le righe
che seguono restano al loro posto. **Fondo arancione molto diluito** (10% sul
chiaro, 14% sullo scuro, 12% sul Sole): dice che quel blocco appartiene alla
riga sopra e non è un'altra sezione della pagina. Le schede dentro perdono il
proprio fondo bianco, altrimenti dell'arancione si vedrebbe solo una cornice
da due pixel.

Stessa risposta nella sezione Campi, dove il disegno è nato: *lo stesso gesto
non può avere due risposte in due schermate.*

---

## 15 · Il giro in corso non muore col telefono (21/08) — ✅ FATTO
**Versione:** `2026-08-21-giro-al-sicuro` + `sw` v43 · **Servono anche le
regole Firestore**, e vanno PRIMA. Ordine in fondo.

È la prima cosa della **Fase 4** del PRD, ed è nata cercando da dove partire.

**La falla, che non sapevamo di avere:** un giro fatto da solo viveva solo nel
telefono. La copia su Firestore nasce solo se inviti altri arcieri; il diario
si scrive alla fine. Telefono spento alla piazzola 18 di un giro da solo, e
diciotto piazzole non esistevano più. Non era un difetto nuovo: era una cosa
che non c'era mai stata, e che nessuno aveva chiesto perché nessuno l'aveva
ancora persa.

**Adesso** il giro viene copiato fuori dal telefono **a ogni piazzola chiusa e
a ogni annulla** — non a ogni freccia: una piazzola chiusa è un fatto, una
freccia a metà è un gesto. Prima si salva sul telefono, poi si prova il cloud:
*il cloud è una copia, non il posto dove vivono i punti.* Senza rete si segna
esattamente come prima e la copia parte da sola quando la rete torna.

**Se il giro si perde, ricompare.** All'accesso, se su questo telefono non c'è
nessun giro aperto ma sul cloud sì: *«Abbiamo trovato un giro non finito ·
Allenamento · piazzola 7 di 12 · Fornasona, Cerrione (BI)»*, con Riprendi e
Buttalo via. Se un giro qui c'è, il cartello **non compare**: il telefono che
hai in mano ha ragione, sempre.

**E lo schermo lo dice mentre segni.** Sotto la barra c'è una riga nuova: a
sinistra dove si tira e con che regolamento (lo chiede il PRD §16.1), a destra
lo stato — «Al sicuro», «Invio…», «Parte con la rete», «Non inviato». Le
parole sono corte perché la prima versione, fotografata, si mangiava il nome
del regolamento.

**Il banco è il quindicesimo** (`banco-giro-sicuro.js`, 22 prove) ed è il più
importante di tutti per un motivo solo: **un salvataggio che non parte non dà
nessun errore.** Tutto sembra a posto e la copia non c'è.

**ORDINE DI CARICAMENTO — le regole vanno PRIMA, come per i percorsi:**
1. **`firestore.rules`** — su GitHub **e** incollato in console Firebase →
   Firestore → Regole → **Pubblica**. Sono due mosse: GitHub le mette al
   sicuro, non le applica.
2. **`index.html`** + **`sw.js`** su GitHub.

Queste regole **allargano** (una sottoraccolta nuova, `giro_aperto`, chiusa a
tutti tranne l'interessato): se arrivassero dopo, l'app nuova scriverebbe in
una raccolta senza regola — e una raccolta senza regola è negata. La riga di
stato direbbe «Non inviato» per tutto il tempo in mezzo.

**Non serve il Cloud Shell:** `index.js` non è cambiato.

---

## 16 · Il finale del giro (21/08) — ✅ FATTO
**Versione:** `2026-08-21-il-finale` + `sw` v44 · **Da caricare.**
Solo due file: niente regole, niente Cloud Shell.

È il **PRD §17**, il secondo pezzo della Fase 4.

**Prima:** dopo due ore di bosco il giro finiva con un foglio di calcolo —
arciere, piazzole, totale, «vs precedente». Giusto, e muto.

**Adesso**, sopra la scheda: il **punteggio grande**, il confronto col giro
precedente **sullo stesso campo**, la pastiglia del **record personale** quando
c'è, e i numeri veri — piazzole, media, frecce a zero, **durata**, media della
prima freccia dove le frecce sono più d'una. In fondo **dove sono andate le
frecce** (super spot · spot · sagoma · nulla), nelle stesse tinte della
tastiera.

**La scheda di gara resta tutta lì, sotto**: classifica, piazzola per piazzola,
firma, stampa. Il finale non va sulla carta.

**Tre cose che potevano diventare bugie, e non lo sono:** il confronto si fa
solo fra giri dello stesso tipo e sullo stesso campo (e quando il campo è
diverso lo **dice**); il primo giro non è un record; e quello che non si sa non
si scrive — niente zeri al posto dei dati mancanti.

**Una cosa nuova che l'app non sapeva:** l'ora in cui un giro comincia. Da oggi
si segna, altrimenti la durata non si può dedurre da niente. **I giri già fatti
resteranno senza**, come per il campo.

**Il banco è il sedicesimo** (`banco-finale.js`, 24 prove) e non semina una
schermata di riepilogo: **finisce un giro davvero**, dalla tastiera fino allo
storico. Guarda anche che la scheda di gara sotto sia rimasta intera.

---

## 17 · Che gara è, detto prima di sceglierla (21/08) — ✅ FATTO
**Versione:** `2026-08-21-che-gara-e` + `sw` v45 · **Da caricare.** Due file.

È il **PRD §14**, e va detto che **c'era già quasi tutto**: i nomi sono parole,
non sigle, e ogni gara ha la sua descrizione col barème. Mancavano due cose.

**Uno.** Fra Percorso e Tracciato la differenza non è il nome: in uno si
sommano tutte e tre le frecce, nell'altro vale solo la prima a segno. Per
saperlo bisognava toccarne una, leggere sotto, toccare l'altra e ricordarsi la
prima. Adesso ogni riga lo dice da sé — e **la frase è dedotta dal codice che
conta i punti**, non scritta a mano accanto: così non possono divergere.

**Due.** Si ripartiva sempre da Round 3D. Adesso si riparte da **quella che hai
già tirato**, con la pastiglia «l'ultima volta». Non è un consiglio dell'app:
in FIARC si usano tutti e quattro i tipi, quindi un consigliato per tutti non
esiste — l'unica cosa vera che l'app sa è cosa hai fatto l'ultima volta.

**Niente casella di ricerca**, che il PRD chiede: con quattro voci sarebbe un
ostacolo, non una scorciatoia.

**Trovato per strada:** la preselezione veniva decisa nella scheda «Tira»,
prima ancora di arrivare alla schermata dove si sceglie — quindi «l'ultima
volta» finiva su una riga e l'accensione su un'altra.

**Il banco è il diciassettesimo** (`banco-regolamenti.js`, 18 prove).

---

## 18 · L'arancio non si vedeva, e la spiegazione stava in fondo (21/08) — ✅ FATTO
**Versione:** `2026-08-21-arancio-che-si-vede` + `sw` v46 · **Da caricare.**

Due cose dal campo, tue: nelle compagnie il fondo arancione non si vedeva, e
nella scelta della gara la spiegazione doveva aprirsi **sotto la riga scelta**
come nei campi, senza ripetere il nome.

**Il fondo c'era davvero e non si vedeva:** 10% di arancio su bianco fa bianco
sporco. Portato a 22 / 20 / 24 nei tre temi. Ora si vede e resta leggero.

**La spiegazione della gara si apre sotto la sua riga**, con lo stesso fondo, e
il titolo non ripete piu' il nome: dice solo «24 piazzole».

Le tre schermate dove si sceglie da un elenco — campi, compagnie, tipo di gara
— adesso rispondono allo stesso modo.

---

## 19 · Le tre veloci (21/08) — ✅ FATTE
**Versione:** `2026-08-21-tre-veloci` + `sw` v50 · **Da caricare.** Due file.
Contiene anche `dopo-il-giro` e `la-nota`, che non sono mai andate online da sole.

1. **La nota del giro** (PRD §17.3): si scrive a fine giro, si salva uscendo dal
   campo, e si rilegge nel diario.
2. **L'icona «Attività»** non è più la macchia arancione più grande della
   barra: l'accento è un segno in cima, come negli altri quattro disegni. Da
   spenta non pesa più di «Tira».
3. **Il nome del campo va a capo una volta** nella riga dell'allenamento,
   invece di finire in puntini su 390px. Era la voce lasciata aperta nel §10.

**Da guardare su un telefono:** la riga dell'allenamento adesso può essere alta
due righe di nome. Il banco dice che ci sta; l'occhio dica se si legge.

---

## 20 · Fase 8: traguardi e attrezzatura (21/08) — ✅ FATTA
**Versione:** `2026-08-21-attrezzatura` + `sw` v52 · **Da caricare.** Due file.

**I traguardi** stanno in Attività › Record: sette voci contate dallo storico,
righe e non medaglie. Già caricati con `2026-08-21-traguardi`.

**L'attrezzatura** è nel menu del Profilo. Assetti con arco, marca, modello,
libbraggio, mano, frecce, spine, lunghezza, punta e note; uno è il predefinito;
si archiviano invece di cancellarli.

**La cosa che conta non è la scheda, è il legame:** ogni giro si porta dietro
l'assetto con cui l'hai tirato, **col nome** e non solo col codice — così un
arco archiviato fra tre anni non svuota i giri di oggi. Nel diario, sotto il
giro, compare la riga «Assetto: …».

**La media per assetto compare da cinque giri in su**, e sotto la soglia dice
quanti ne mancano: due giri non dicono niente su un arco.

**Niente regole Firestore nuove:** l'attrezzatura sta nel documento dell'utente,
che le regole gli permettono già di scrivere.

**Resta della Fase 8:** il profilo pubblico con la privacy (PRD §43) — oggi il
profilo è un modulo, non una pagina che si mostra.

---

## 21 · Il profilo pubblico (21/08) — ✅ FATTO · Fase 8 CHIUSA
**Versione:** `2026-08-21-profilo-pubblico` + `sw` v53 · **Servono anche le
regole Firestore**, e vanno PRIMA.

Una carta d'identità sportiva: nome, compagnia, **zona** (regione e provincia,
dedotte dalla compagnia — nessun GPS), arco, due righe di presentazione, e
quattro numeri **se hai acceso l'interruttore**.

**La privacy qui è un'assenza, non un campo:** chi non mostra i numeri non
pubblica un «false» accanto ai numeri veri — non pubblica proprio niente.
L'interruttore parte spento.

**Lo storico dei singoli giri non lo vede nessuno**, mai: quello che esce è un
riassunto di quattro numeri che scrivi tu quando salvi il profilo.

**Ci si arriva dal nome in cima alla chat.** Era un titolo e basta: si parlava
con qualcuno senza poter sapere chi fosse.

**ORDINE DI CARICAMENTO — le regole PRIMA:**
1. **`firestore.rules`** su GitHub **e** in console Firebase → Regole →
   **Pubblica** (tre campi in più: `bio`, `arco`, `numeri`).
2. **`index.html`** + **`sw.js`** su GitHub.

Se il file arrivasse prima delle regole, salvare il profilo fallirebbe in
silenzio: la scrittura verrebbe rifiutata perché contiene campi non permessi.

**Con questo la Fase 8 è chiusa:** traguardi, attrezzatura, profilo pubblico.

---

## 22 · Sei cose dal campo, e una regola (21/08) — 🟢 CINQUE FATTE, UNA DA CAPIRE
**Versione:** `2026-08-21-meno-cose-piu-chiare` + `sw` v54 · **Da caricare.**

La regola vale più delle sei: *dare una gerarchia, decidere cosa conta per ogni
pagina e cosa è contorno; meno cose ma più chiare, anche per chi ha più di
sessant'anni.*

1. ✅ **La prima schermata era troppo piena.** I numeri del mese e il grafico
   erano due sezioni sempre aperte fra il tasto per tirare e il resto. Adesso
   sono **una striscia staccata**, letta come uno strumento, che si apre e
   dentro ha il grafico. Le cifre restano leggibili: è il peso nella pagina
   che è calato, non la dimensione utile.
2. ✅ **La casetta aveva i muri del doppio** delle altre icone: assottigliata.
3. ✅ **Il nome in cima alla chat** adesso ha la freccia e dice «Vedi il
   profilo».
4. ✅ **La scheda del campo in «cerca campo»** ha il fondo arancione come le
   altre due.
5. ✅ **Via l'arancio dalla gestione compagnia**: pastiglie dei passaggi, filo
   in cima alla scheda e nome in oro. Tre accenti dove non c'era niente di
   urgente.
6. ❓ **«Sul desktop non funziona»** — questa non l'ho ancora capita, e non
   voglio correggerla alla cieca. Nel banco il tasto del nome funziona sia a
   390px sia a 1280px. **Il sospetto:** la chat del **mercatino** è un altro
   programma (`marketplace.html`) e lì il profilo non c'è proprio. Serve sapere
   da dove hai provato.

---

## 23 · Lo sfondo nella compagnia (21/08) — ✅ TOLTO
**Versione:** `2026-08-21-compagnia-senza-tinta` + `sw` v55 · **Da caricare.**

Due cose, e la seconda era un guasto vero.

**Uno.** La tinta arancione se ne va dal blocco della compagnia. Regge un
dettaglio corto — i contatti di un campo e due tasti — non mezza schermata di
contatti, percorsi, risultati e classifica. Resta un **filo arancione a
sinistra** che dice che il blocco è di quella riga.

**Due.** La classe `.comp-sotto` **esisteva già** per un'altra cosa (la riga
«chi è» dentro la scheda di una compagnia, con `display:flex`). Il blocco
nuovo aveva lo stesso nome e si prendeva quel flex: le schede dentro venivano
messe in riga. Era per questo che sembrava un campo salmone con dei riquadri
che galleggiano. Rinominato `.comp-dettaglio`.

**Dove l'arancione resta:** la scheda del campo in «cerca campo» e la
spiegazione del tipo di gara — due blocchi corti.

---

## 24 · «Trova un campo» era in due posti (21/08) — ✅ TOLTO DALLA HOME
**Versione:** `2026-08-21-una-porta-sola` + `sw` v56 · **Da caricare.**
Contiene anche `compagnia-senza-tinta`, che è andata online solo a metà: era
stato caricato `index.html` ma non `sw.js`.

La barra in fondo ha già Campi, sempre a schermo. Il secondo tasto sulla Home
non era una comodità: era una decisione in più da prendere ogni volta, nel
punto migliore dello schermo. Sulla prima schermata resta **una** cosa da fare.

---

## 25 · La barra, la Home e i Campi (21/08) — ✅ FATTE
**Versione:** `2026-08-21-barra-e-home` + `sw` v57 · **Da caricare.**

1. **«Il mio profilo» torna sulla Home.** È il passaggio per diario,
   attrezzatura e spazio compagnia: tre stanze senza porta nella barra.
2. **Via «Annuncia un allenamento» dai Campi.** Era in tre posti, e lì era
   anche fuori tema: quella schermata serve a *trovare* un campo.
3. **Attività esce dalla barra, torna il Marketplace.** I numeri si vanno a
   cercare da «Il mio diario», che è anche un nome che si capisce.

**Da sapere:** per chi non è collaudatore il Marketplace porta alla schermata
che spiega perché è chiuso. Si tiene così perché aprirà a tutti presto, e una
voce che compare e sparisce dalla barra è peggio di una che aspetta.

**Una parola cambiata:** in nederlandese la voce compagnie era «Verenigingen»
e non ci stava più accanto a «Marktplaats»: è diventata «Clubs». Da far
confermare a chi lo parla.

**Un buco dichiarato:** `banco-home` ha perso tre domande sull'ultimo giro
(che sia l'ultimo, il salto, il campo al posto del tipo). Quel blocco è
passato ad Attività e le domande **non sono ancora state riscritte** per la
schermata nuova. È scritto dentro il banco.

---

## 26 · La barra si muove su Safari (21/08) — 🟢 ATTENUATO, non curato
**Versione:** `2026-08-21-barra-ferma-safari` + `sw` v58 · **Da caricare.**

**Non è un difetto dell'app:** Safari su iPhone fa sparire e ricomparire la sua
barra degli indirizzi mentre scorri, e una barra fissa è agganciata alla
finestra di impaginazione, non a quella visibile.

**Messa un'attenuazione** (la barra va su un livello grafico suo): il tremolio
cala, il riassestamento resta.

**Installata sulla schermata Home il problema non esiste**, perché in modalità
app la barra degli indirizzi non c'è. È anche come l'app è pensata per il
campo.

**Il cantiere vero resta aperto e valutato:** pagina che non scorre, contenuto
in una colonna alta quanto lo schermo, barra come ultima riga. Mezza giornata
più prove sul telefono, e tocca scorrimento salvato, tastiera nei moduli,
stampa della scheda e la pista. Da fare quando ci sarà un secondo motivo.

---

## 27 · La tavolozza nuova su tutta l'app (21/08) — ✅ FATTA
**Versione:** `2026-08-21-tavolozza` (index **e** mercatino) + `sw` v59.
**Da caricare: otto file.**

159 tinte sostituite in sette file. Criterio: **stessa luminosità, tinta**
**nuova** — così nessun contrasto può peggiorare per costruzione.

**Gradini correttivi usati:** `#CC3D00` per i fondi arancioni con testo bianco,
`#FF4D00` puro solo come segnale, `#6E6259` per i testi secondari.

**Aggiunto un gradino:** `--red-300:#F26B5C`, perché sul fondo scuro nuovo il
rosso faceva 3,67. Vale solo per il tema scuro (pericolo e timer).

**Verifica:** 202 coppie testo/fondo misurate sull'app vera, tre temi più la
veste da computer: nessuna sotto soglia. Nessun residuo di #315B35, #116E62,
#C25E18, #0E1512, #F5F4F0. Venti banchi verdi.

**Il logo resta del verde vecchio:** è un'immagine, non un token. Serve il
sorgente vettoriale.

**Schermate di prova:** `DesktopArcTrail3Dprova-tavolozza`.

---

*(segue — elenco in corso di raccolta)*
