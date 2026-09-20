# RISANAMENTO — FASE 3 (20/09/2026)

**Chiusura dei dieci problemi importanti rimasti** dopo la verifica della fase 2.
Ramo `risanamento-post-audit`. **Niente è pubblicato, niente è deployato.**

Le fasi precedenti: `docs/RISANAMENTO-2026-09-19.md` (P0 dell'audit, finestra di
deploy, `roundId`, riepilogo permanente). L'audit che ha originato tutto è
`docs/AUDIT-TECNICO-2026-09-19.md`, che **non è su GitHub e non deve andarci**.

Quanti commit: `git log --oneline main..HEAD | wc -l`.
Quanti banchi: `grep -c '^banco ' tests/controlla-tutto.sh`.

---

## La regola che ha guidato tutta la fase

Ogni blocco chiude una cosa che **nessuno vedeva fallire**: un `if` sempre falso,
un campo che nessuno mostrava, una zona che non si salvava, un ascoltatore che si
moltiplicava. Nessuno di questi guasti produceva un errore a schermo — è la
ragione per cui erano ancora aperti dopo un audit.

Perciò ogni blocco ha, insieme:
1. la correzione;
2. un banco che, **puntato sulla versione di prima, dice no**;
3. una riga scritta accanto al codice che dice *perché*, non *cosa*.

Dove la correzione tocca la finestra di deploy, sta anche in
`tests/banco-finestra.js` — comprese le cose che **si perdono apposta** (§2).

---

## 1. Le foto del mercatino non si cancellavano mai

**Cos'era.** `wipeAccountData` aveva un ramo `if(firebase.storage){ … }` che non è
**mai** stato vero: `app.html` carica cinque SDK Firebase, e `storage-compat` non
è fra quelli. Un `if` che protegge da una libreria mancante, quando la libreria
manca sempre, non è una precauzione: è codice spento. Intanto
`elimina-account.html:118` promette per iscritto «gli annunci del Mercatino e le
relative foto».

**Cosa si è fatto.** `caricaStorageSDK()` inietta la libreria **al momento**, non
all'avvio: un sesto download a ogni apertura per una cosa che si fa una volta
nella vita dell'account sarebbe andato contro il lavoro sull'avvio della fase 2.
Se non arriva entro otto secondi, la cancellazione dell'account **procede lo
stesso** — senza rete non si cancella niente comunque — ma la cosa **non si tace**:
finisce in `errors` come `wipe/foto-mercatino`, così dall'altra parte si vede che
quelle foto sono rimaste.

**Chi lo difende.** `controlla-pwa.js`, sei prove: la libreria non c'è all'avvio,
c'è quando serve, ha la stessa versione delle altre, il ramo morto non esiste più,
e il silenzio è vietato. Sull'app di ieri: **5 rosse**.

## 2. SEC-09 — i dati privati leggibili da qualunque account

L'audit metteva quattro raccolte sotto la stessa voce. Una era già chiusa il
19/09; qui ci sono le altre tre.

### `percorsi` — già chiuso (verificato)
`read` ristretto a chi l'ha creato e all'admin, e `createdByEmail` non si scrive
più. La query dell'app è `where('createdBy','==',uid)`: resta valida.

### `compagnie_admin` — la scheda del referente è sua
**Cos'era.** Un documento solo teneva due cose molto diverse: chi gestisce la
compagnia (serve a tutti) e i dati del referente — **nome, telefono, indirizzo,
note private del club**. La regola diceva `read: if signedIn()`: quindi il
telefono di casa di una persona lo leggeva qualunque account, anche non
verificato.

**Cosa si è fatto.** Le regole di Firestore non sanno nascondere *un campo*: o si
legge il documento o no. Quindi i due dati che servono davvero a tutti — `adminUid`
e `emailComp` — sono stati spostati in **`compagnie_contatto/{codice}`**, leggibile
da chiunque abbia un account e scrivibile solo dal referente di *quella* compagnia
o dall'admin (`hasOnly` stretto: se un giorno ci finisse dentro un telefono,
saremmo tornati al punto di partenza senza accorgercene). La scheda si chiude al
suo referente.

Il contatto si riallinea **nello stesso gesto** del salvataggio, non con un tasto a
parte: due scritture separate divergono il giorno che una delle due fallisce.
Le compagnie già gestite prima di oggi non hanno il contatto finché quel referente
non apre la sua scheda — lì si scrive da solo, una volta.

### `percorsi_campo` — un percorso confermato è pubblico, una proposta no
**Cos'era.** `read: if signedIn()`, quindi anche le proposte non ancora valutate,
col nome di chi le ha mandate (e, nei documenti di prima del 19/09, la sua email).

**Cosa si è fatto.** Confermato → lo legge chiunque: ci si va a tirare. Proposta →
chi l'ha scritta, il referente di quella compagnia, l'admin.
**L'app ora fa due query separate**, e non è un dettaglio: Firestore non *filtra*
una query che tocca documenti vietati, la **rifiuta intera**. Una query sola su
`clubCode` avrebbe smesso di funzionare per tutti appena una compagnia avesse una
proposta aperta.
Il risultato si tiene da parte sapendo *come* è stato letto (`conProposte`): se
l'elenco dei club che amministro scende dopo, la lettura si rifà. «Non si sa» non
è «no».

### `open_trainings` — dove si tira, e a che ora
**Cos'era.** `lat` e `lng` dentro il documento dell'allenamento, che ogni account
può leggere. Per un allenamento «solo club» sono il dato più pesante che ci sia:
dicono dove sarà una persona, e quando. La visibilità «club» era applicata **solo
nel client**, cioè da nessuna parte per chi non usa questo client.

**Cosa si è fatto.** Il punto sta in `open_trainings/{id}/dove/punto`, e lo legge
chi quell'allenamento riguarda: organizzatore, invitati, iscritti — e tutti, se
l'allenamento è aperto a tutti. Si chiede **al tocco** su «Indicazioni», non
nell'elenco: l'elenco non ne ha bisogno, e un documento in più per ognuno dei
cinquanta annunci sarebbe cinquanta letture per un tasto che si preme una volta.
Il documento porta `dove: true/false`, che dice *se* il punto c'è senza dire dov'è:
serve a non mostrare un tasto che poi non porta da nessuna parte.

**Quello che NON chiude, detto chiaro.** Chi ha un account vede ancora *che* c'è
un allenamento al campo X alle nove. Chiuderlo per davvero vuol dire spezzare in
tre la query dell'elenco (`visibility=='all'`, `clubCode==mio`,
`invitedUids array-contains me`) e creare **due indici composti** — cioè una
modifica legata a un deploy, non a un file. È il punto 1 dei problemi rimasti.

**Chi difende tutto il blocco.** `banco-regole.js`, 21 prove nuove sull'emulatore
vero: la scheda, il contatto, i percorsi confermati e proposti, il punto letto da
quattro persone diverse.

## 3. App Check — CODICE PRONTO, ENFORCEMENT NON ATTIVO

Sono due cose diverse e vanno tenute separate, perché una senza l'altra è un
guaio.

**CODICE PRONTO** (fatto, in questo ramo):
- `app.html`: `attivaAppCheck()`, chiamata **subito dopo** `initializeApp` — non
  dopo, o le prime richieste partirebbero senza timbro. La site key si incolla in
  un posto solo (`APP_CHECK_SITE_KEY`), stessa forma che ha già `VAPID_KEY`.
- **Finché la chiave è il segnaposto non succede niente**: nessuna libreria in
  più da scaricare, nessun millisecondo in più all'avvio. La funzione esce subito.
- `functions/index.js`: `const APP_CHECK_OBBLIGATORIO = false`, collegato a
  `enforceAppCheck` di `sendNotification`.

**ENFORCEMENT ATTIVO** (NON fatto, e non si può fare da qui):

| passo | dove si fa | cosa succede |
|---|---|---|
| 1. registrare l'app web con reCAPTCHA v3 | **Firebase Console → App Check** | esce una site key |
| 2. incollare la key e pubblicare il sito | `APP_CHECK_SITE_KEY` in `app.html` | i telefoni cominciano a mandare il timbro |
| 3. guardare le metriche | **Firebase Console → App Check** | «richieste non verificate» = telefoni non ancora aggiornati; calano da sole |
| 4. quando sono quasi zero: applicare | **Console** per Firestore e Storage; `APP_CHECK_OBBLIGATORIO = true` + deploy per le Functions | da qui in poi una richiesta senza timbro viene rifiutata |

**L'ordine non è negoziabile.** Accendere l'obbligo prima che i timbri arrivino
vuol dire rispondere `unauthenticated` a tutti — compresi quelli che non hanno
ancora aggiornato l'app, che dopo un deploy sono la maggioranza, per giorni.
Ogni passo si disfa: togliere l'obbligo è immediato.

**Chi lo difende.** `controlla-pwa.js` chiede le due cose **insieme**: il codice
c'è, e la chiave è ancora da incollare. Il giorno che la si incolla, quella prova
dirà no — ed è giusto: vuol dire «adesso il passo 3 è cominciato».

## 4. Le notifiche non dicevano chi le aveva scritte

**Cos'era.** Titolo e testo di un avviso li scrive il **client**; il server li
accorcia e basta. Il mittente invece lo mette il server (`fromUid`, dal token, dal
17/08) — ma non si mostrava da nessuna parte. Quindi un iscritto qualunque poteva
mandare «ArcTrail 3D — il tuo account sarà sospeso, apri la chat» e l'avviso
arrivava **senza faccia**, indistinguibile da uno del sistema.

**Cosa si è fatto.** Ogni riga del centro notifiche porta la firma: «da @nome»
oppure «da ArcTrail 3D». Sta **sotto** il testo e non sopra: il titolo resta la
prima cosa che si legge, la firma è quello che si va a cercare quando il titolo
dice qualcosa di strano. Nove lingue. *Un messaggio senza mittente prende in
prestito l'autorità di chi lo consegna.*

**Chi lo difende.** `banco-push-app.js`: tre avvisi nella stessa schermata — uno
vero di un'altra persona, uno **che si finge il sistema**, e uno vero del sistema
— e si pretende che il finto non risulti firmato ArcTrail.

## 5. Il giro non sapeva da quale gara veniva

**Cosa si è fatto.** Il giro (locale **e** la copia sul cloud) porta ora
`federation`, `division`, `eventId`. Si scrivono **sempre**, anche quando valgono
`null`: è la stessa regola che `sessionType` segue dal 29/08 — un campo che
compare solo quando serve costringe chi legge a indovinare cosa vuol dire la sua
assenza.

- **`federation` ce l'abbiamo davvero.** Senza, un `ifaa_3d` non si può
  attribuire: quella chiave la usano **sette** federazioni, quindi il modo non
  basta a dire di chi è il giro.
- **`division` è `null`, e non è una dimenticanza.** `DIVISIONI` esiste solo per
  FIARC e vive in Prepara gara, cioè addosso agli *iscritti di una gara*, non al
  profilo di chi tira. Dedurla dall'arco sarebbe **peggio** che lasciarla vuota:
  il profilo distingue quattro archi, FIARC otto categorie, e un arco nudo
  finirebbe marchiato ricurvo. *Meglio un campo vuoto che un dato inventato.*
- **`eventId` è `null`** perché non ha ancora una sorgente: nessun giro nasce da
  una gara preparata. Il campo esiste perché il giorno che nasce l'entità gara il
  legame si scrive lì, e i giri di prima si distinguono da soli.

Il blocco dell'audit — «il giro non sa da quale gara, federazione e divisione
viene» — era la **forma del dato**, e adesso c'è. Quello che manca per riempire
`division` è la classe per federazione nel profilo: è una funzione, non un difetto
(punto 2 dei rimasti).

## 6. Barème non versionati per FIARC, FITARCO, WA e NFAS

**Cos'era.** Il marchio ce l'avevano solo IFAA, ASA e IBO — i tre che erano già
cambiati sotto i piedi. Gli altri rispondevano `null`, e `null` vuol dire **due
cose diverse** che nessuno può più distinguere: «barème mai cambiato» e «giro di
prima che i marchi esistessero». Il giorno che FIARC ritocca un punteggio — il
28/08 è successo a IFAA — i giri vecchi e i nuovi si sommerebbero nella stessa
media.

**Cosa si è fatto.** La chiave è il **regolamento**, non il modo: ogni modo in
`GAME_MODES` dichiara già da quale libro vengono i suoi numeri, e sono **nove
libri per trentaquattro modi**. Elencare i modi avrebbe voluto dire dimenticarsene
uno alla prossima federazione — e infatti, scrivendoli a mano, avevo scritto
`nfas_3d`, che non esiste: si chiama `nfas_biggame`. Così un modo nuovo nasce
marchiato da solo.

`ifaa_3d_v1` resta **senza** marchio: è il modo di compatibilità che *porta* la
tabella vecchia, e dargli un nome direbbe il contrario di quello che è.
I giri già in archivio non si riscrivono: l'assenza resta l'informazione, e
`modoDelGiro` non cambia comportamento per nessuno.

## 7. Le frecce erano punti, non zone

**Cos'era.** `pendingArrows` teneva i punti, e i punti non bastano a ricostruire
il tiro: nel Big Game NFAS innerkill e kill valgono **tutti e due 14** alla
seconda freccia; in ASA il 12 alto e il 12 basso sono due zone con lo stesso
punteggio. Un archivio che tiene solo la somma non potrà mai rispondere a «quante
volte ho preso il kill».

**Cosa si è fatto.** Le zone in un elenco **parallelo**, non dentro
`pendingArrows`: quel campo viaggia nella copia del giro aperto sul cloud e lo
legge anche l'app di ieri, che si aspetta numeri. Cambiargli forma avrebbe rotto
un giro ripreso durante la finestra di aggiornamento.
Due elenchi paralleli però possono **scivolare** — si toglie una freccia da uno e
non dall'altro, e da quel momento ogni zona parla della freccia sbagliata, senza
che nulla appaia storto a schermo. Perciò `pendingArrows` non si tocca più a mano
da nessuna parte: si passa da tre funzioni (`aggiungiFreccia`,
`togliUltimaFreccia`, `azzeraFrecce`), e **`banco-tiri` controlla la lunghezza dopo
ogni gesto**, non con una prova sola in fondo.
Il nulla si chiama `zero` e non una casella vuota: un nulla **voluto** deve
distinguersi da una zona non registrata, che è quello che si trova nei giri di
prima.

## 8. L'uid degli arcieri invitati si perdeva

Un arciere aggiunto cercandolo per username porta `invitedUid`: è un iscritto
vero, con un account. Finiva nella sessione condivisa e **non nel giro**, quindi
lo storico teneva solo il suo *nome* — e un nome cambia, non si confronta, e non
serve a nessuna classifica. Ora `ownerUid` del risultato vale
`ownerUid || invitedUid`.

## 9. Una lingua non è un paese

**Cos'era.** `LANG_TO_COUNTRY` diceva `en:"uk"`. Ma la causa non era quella riga:
era `.slice(0,2)` su `navigator.language`, che **butta la regione** prima che
qualcuno possa guardarla. `it-IT` e `de-DE` portano la risposta scritta dentro, e
la si stava gettando.

**Cosa succedeva, caso per caso:**

| locale | prima | adesso | perché conta |
|---|---|---|---|
| `en-GB` | uk | **uk** | giusto per caso |
| `en-US` | uk | **us** | un americano partiva da Archery GB invece che da ASA e IBO |
| `en-CA`, `en-AU` | uk | **nessuno** | paesi che non copriamo: proporre UK è peggio che non proporre niente |
| `en` | uk | **nessuno** | l'inglese non dice dove sei |
| `it-IT` | it | **it** | giusto per caso |
| `de-DE` | de | **de** | giusto per caso |
| `de-AT` | **de** | **at** | tre federazioni sbagliate su tre: in Austria c'è ÖBSV |
| `de-CH`, `fr-CH` | de / fr | **ch** | SwissArchery e FAAS |
| `pt-BR`, `zh-Hans-CN` | — | **nessuno** | e la regione si trova anche col terzo pezzo |

*I casi che davano la risposta giusta per caso sono quelli che nascondevano il
difetto.* Quando non si sa, **non si indovina**: la tendina resta da aprire.
Meglio una domanda che una risposta sbagliata già fatta, che nessuno rilegge.

**Un quasi-incidente, registrato.** `LANG_TO_COUNTRY` faceva anche da *elenco
delle lingue esistenti* in `leggiRitornoEmail`. Togliendone l'inglese, un ritorno
da `?lang=en` avrebbe smesso di funzionare **in silenzio** — ed è la lingua di
metà dei collaudatori. Adesso quella domanda la fa `LANG_META`, che le nove lingue
le ha per davvero, e `banco-lingue` ha una prova apposta.

**Chi lo difende.** `banco-paese-lingua.js`, **30 prove**, la matrice intera.

## 10. L'ascoltatore che si moltiplicava, e la sottoscrizione che cambia

**La chat dell'allenamento (C3).** `otChatScreen()` viene richiamata a ogni
ridisegno, e ogni volta apriva un `onSnapshot` **nuovo** senza chiudere il
precedente: restando dieci minuti in una chat si accumulavano decine di canali
sullo stesso documento. Non si vedeva perché il risultato era **corretto**: dieci
ascoltatori che disegnano la stessa cosa disegnano la cosa giusta. Si pagava in
batteria, in dati e in letture. Adesso l'ascoltatore è uno, e si chiude uscendo —
in `render()` e non nel tasto «indietro», perché dalla chat si esce da sei posti
diversi e sei chiusure scritte a mano diventano cinque il giorno dopo.

**`pushsubscriptionchange`.** Il browser può revocare e rifare la sottoscrizione
da solo. Nessuno ascoltava: il token su Firestore restava quello morto e le push
smettevano — e il guasto si avvita, perché la persona non riapre l'app **proprio
perché** non le arriva più niente.
Da un service worker non si può coniare un token FCM (`getToken` vive nell'SDK
della pagina). Quindi si fanno le tre cose che si possono fare: **risottoscrivere**
con la stessa chiave VAPID, **avvisare** le finestre aperte, e **lasciare un segno**
in una cassa per quando non ce n'è nessuna — che è il caso normale, non quello
raro. L'app raccoglie il segno all'apertura, butta il token vecchio e ne scrive uno
nuovo.
*Quello che resta:* se la persona non riapre mai l'app, il token nuovo non arriva
mai al server. Chiuderlo per davvero vuol dire mandare le push col protocollo Web
Push invece che con i token FCM — cioè cambiare il server (punto 3 dei rimasti).

---

## Due banchi che dicevano no per il motivo sbagliato

Non erano nel piano, ma bloccavano il giro completo.

- **`banco-cronometro`** aspettava tre tempi fissi (1500, 600, 300 ms) con
  l'orologio finto installato. Quei numeri fanno avanzare il tempo **virtuale**,
  ma l'avvio dell'app costa tempo **vero**: su una macchina occupata il banco
  diceva «letto null», cioè «la schermata non c'era ancora» — che non ha niente a
  che vedere col cronometro. È la **C24** dei diari (164 attese a tempo fisso,
  nessuna su una condizione). Adesso aspetta gli elementi.
- **`banco-ifaa`** aveva due prove che guardavano il **nome di una riga**
  (`state.pendingArrows.push(score)`) invece dell'invariante. La riga è cambiata,
  l'invariante no: dentro `pendingArrows` ci vanno numeri. Ora è quello che si
  chiede. La terza — «il marchio si mette **solo** sullo Standard IFAA» —
  pretendeva il difetto, non l'invariante: è stata riscritta.

---

## Quello che cambia nella finestra di deploy

`tests/banco-finestra.js` prova tutte e quattro le combinazioni. Due novità di
questa fase:

- **`compagnie_admin` non si legge più dall'app di ieri, ed è previsto.** Durante
  la finestra, chi non ha ancora aggiornato, aprendo una compagnia gestita, vedrà
  «chiedi di gestire» invece di «gestita da», e una segnalazione di campo non
  troverà l'email del club. **Non si perde niente e non si rompe niente**: si
  perde una riga di informazione, per qualche ora.
  La scelta è dichiarata e va in questo verso perché l'alternativa — lasciare la
  scheda leggibile finché tutti aggiornano — vuol dire lasciare il telefono di
  casa di una persona leggibile da chiunque abbia un account, per un tempo che non
  decide nessuno.
- Tutto il resto (giro, zone, federazione, contatto, punto) è **additivo**: l'app
  di ieri ignora i campi che non conosce, e quella di oggi legge `null` dove i
  documenti vecchi non hanno niente.

---

## Cosa richiede Firebase Console (nulla è stato fatto)

1. **Regole Firestore** — incollare `firestore.rules` e premere Pubblica. Questa
   fase le ha cambiate (SEC-09): senza, le correzioni di §2 non esistono.
2. **App Check** — registrare l'app con reCAPTCHA v3, incollare la site key,
   guardare le metriche, e **solo dopo** applicare (§3).
3. **Cloud Functions** — `bash ~/pubblica.sh`. Questa fase ha toccato
   `functions/index.js` (solo l'interruttore di App Check, spento).
4. Non serve nessun indice composto nuovo: le query aggiunte sono su campi singoli
   o su `where` già indicizzati. *Il giorno che si chiude la visibilità
   dell'elenco allenamenti (punto 1), quelli serviranno.*

---

## TEST FINALI

- **banchi:** 61
- **prove:** 2699
- **pass:** 2699
- **fail:** 0
- **esterni non eseguiti:** 1 (`banco-porta`, vuole rete vera), nominato dal runner
- **in attesa:** 2 in `banco-ritorno` (requisito del brief mai pubblicato)

Banchi nuovi di questa fase: `banco-paese-lingua.js` (30 prove).
Banchi cresciuti: `banco-regole` (+21, SEC-09), `banco-tiri` (+5 e l'invariante
delle zone a ogni gesto), `banco-push` (+7, `pushsubscriptionchange`),
`banco-push-app` (+5, la firma degli avvisi), `controlla-pwa` (+13, foto e App
Check), `banco-ifaa` (riscritte 3), `banco-lingue` (+1), `banco-finestra` (+2),
`banco-ruoli-compagnia` (aggiornato ai due documenti).

**Sabotaggio** (ogni banco puntato sulla versione di prima):
`banco-tiri` 11 rosse · `controlla-pwa` 5 · `banco-paese-lingua` non compila
(la funzione non esisteva) · `banco-ifaa` 1 · `banco-regole` e `banco-finestra`
rossi sui casi nuovi.

---

## Cosa resta aperto

L'elenco puntuale **non sta qui**, e non è una dimenticanza:
`docs/APERTI-2026-09-20.md`, che `.gitignore` tiene fuori da git.

Il motivo è lo stesso per cui `AUDIT-TECNICO-2026-09-19.md` non è mai stato
aggiunto: **il repository è il sito** (`docs/STRUTTURA-REPOSITORY.md`), quindi
quello che sta qui dentro lo legge chiunque lo apra su GitHub. `_config.yml`
tiene `docs/` fuori dal **sito**, non dal **repository**: sono due cose diverse,
e fino a oggi l'audit era protetto solo dal fatto che nessuno aveva scritto
`git add -A`.

*Un elenco ordinato delle debolezze ancora aperte è una mappa, non un diario.*
Il racconto di cosa è stato fatto — questo file — resta pubblico: il codice lo è
comunque, e leggerlo insieme alle ragioni fa bene a chiunque lo apra.

Per orientarsi, senza dettagli: restano **nove** voci. Quattro aspettano un
deploy o la console Firebase, due una decisione, tre sono lavoro. Le due che
pesano di più sul rilascio sono la **pulizia dei documenti scritti prima del
19/09** e l'**attivazione di App Check**, entrambe descritte qui sopra ai §2 e §3.
