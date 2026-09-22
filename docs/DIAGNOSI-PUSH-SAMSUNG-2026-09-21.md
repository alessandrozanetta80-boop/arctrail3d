# Push e Samsung S26 Ultra — diagnosi del 21–22/09/2026

Le due cose si chiudono solo con un telefono in mano: qui c'è cosa è già stato
fatto, dove sta, cosa è stato corretto nella notte fra il 21 e il 22 e cosa resta
da guardare.

## Notte 21–22/09: cosa è cambiato

**Push — un difetto di codice corretto, uno escluso.**

- **Corretto.** Nel ramo `pushNotifica` trattava `messaging/invalid-argument` come
  «token morto» (nato con la release, `3efd0b6`; in produzione oggi no). FCM
  restituisce quel codice anche per un **messaggio** fatto male, e allora fallisce
  per tutti i token: un solo difetto nel payload avrebbe spento in silenzio i
  dispositivi di ogni destinatario. Adesso conta come token morto solo se l'errore
  parla del token. `banco-push.js` A2-bis: prima 1 rosso, adesso 46/46. Functions
  `2026-09-22-push-argomento`.
- **Escluso.** Nell'emulatore delle Functions `admin.firestore.FieldValue` vale
  `undefined`: è firebase-tools 13.35.1 che passa `admin.firestore` come funzione
  legata (`bind`), e una funzione legata perde le proprietà statiche. In produzione
  il modulo è quello vero (`pushNotifica` lo usa da agosto; il 20/09
  `claimApplicata` è stato scritto). Non si è toccato niente.
- **Controllato e a posto, sul ramo:** token per dispositivo
  (`users/{uid}/devices`) più il vecchio `fcmToken`; rinnovo a ogni apertura e su
  `pushsubscriptionchange`; gestore in primo piano (`onMessage` → notifica con la
  stessa etichetta); gestore in background (`onBackgroundMessage`, messaggio solo
  `data`, deduplica per etichetta); `notificationclick` apre `app.html?n=<id>`;
  `Urgency: high`, TTL un giorno; il cambio di cassa (`v168`) non tocca la
  sottoscrizione, che è della registrazione e non della cassa.
- **TEST REALE TELEFONO NECESSARIO:** app chiusa (tolta dai recenti), telefono
  bloccato da minuti (Doze), due dispositivi, e il risparmio batteria di Samsung su
  Chrome. Nessun banco può provarli.

**Giorno 22/09 (ramo `work/sicurezza-qualita-2026-09-22`).**

- `sendNotification`: `toUid` diventa un percorso Firestore e non era validato;
  adesso `^[A-Za-z0-9_-]{1,128}$`, altrimenti `invalid-argument` prima di toccare
  il database (nessun exploit trovato: con una «/» si otteneva un errore o
  «destinatario inesistente»). `banco-push` A3-bis; con le Functions di prima 2 rossi.
- Il **TTL** di un giorno c'era nel codice e in nessuna prova: adesso c'è.
  `banco-push` 49/49, `banco-push-app` 20/20.
- **App Check: preparato, spento, protetto da un banco.** Stato: `app.html` ha
  `attivaAppCheck()` con la chiave segnaposto (`APP_CHECK_SITE_KEY =
  "INCOLLA_QUI…"` → non carica niente); `functions/index.js` ha
  `APP_CHECK_OBBLIGATORIO = false` su `sendNotification`; `controlla-pwa.js`
  impedisce di accenderlo per sbaglio. Servizi coinvolti: Firestore, Storage, la
  callable `sendNotification`. **Cosa protegge davvero:** che le richieste
  vengano dall'app e non da uno script con la chiave web pubblica — non chi è
  l'utente (quello lo fanno le regole). **PWA:** compatibile (reCAPTCHA v3 o
  Enterprise sul web). **Rischio:** accendere l'obbligo prima che i telefoni
  mandino il timbro spegne l'app a tutti quelli non aggiornati. **Prerequisiti,
  in ordine:** chiave reCAPTCHA in console → chiave nell'app → caricare la
  libreria App Check insieme alle altre (oggi arriva dopo l'inizializzazione:
  le prime richieste partirebbero senza timbro) → pubblicare il sito → guardare
  in console le «richieste non verificate» finché non sono quasi zero → obbligo
  su Firestore, poi Storage, poi `APP_CHECK_OBBLIGATORIO = true` e deploy delle
  Functions. **Test prima dell'obbligo:** emulatore con token di debug App Check,
  e un telefono vero con l'app aggiornata. **Non è pronto per oggi**, e non è
  stato toccato.

**S26 Ultra — misurato, nessun difetto di robustezza, una decisione da prendere.**

`banco-font-scale.js` adesso misura anche quanto è alta la testata (`MISURA=1`) e
dice no se supera un quinto dello schermo. Sul viewport di un S26 Ultra (384×832
px CSS):

| testo | testata | quota |
|---|---|---|
| 100–120% | 61 px | 7% |
| **130%** | **97 px** | 12% — va a capo: i comandi scendono su una seconda riga |
| 150% | 102 px | 12% |
| 175% | 107 px | 13% |
| 200% | 112 px | 13% |
| zoom schermo 130% / 150% | 90 px | 14% / 16% |

Al 130% il marchio (150 px) più i comandi (200 px: quattro tasti da 44) non stanno
più nei 352 px utili, e la testata va a capo **per scelta** (`flex-wrap`): niente si
sovrappone, niente esce, tutte le 67 combinazioni del banco passano. È con buona
probabilità la «barra troppo grande»: con il carattere di Samsung al 130% o più la
testata raddoppia. Tenerla su una riga vuol dire scegliere fra marchio troncato e
comandi più piccoli (sotto i 44 px di bersaglio): **è una decisione di design, non
una correzione**, e non è stata presa.
**TEST REALE S26 ULTRA NECESSARIO:** la testata sta su una riga? Se no, annotare
Impostazioni → Schermo → «Dimensione e stile carattere» e «Zoom schermo».

---


## A) Notifiche push ad app chiusa o in background

**Sintomo storico:** le notifiche «arrivano quando si apre l'app», non ad app
chiusa o in background.

**In produzione oggi (18/09, `7b0ffe9`), dal codice:**

1. **Un token solo per persona** (`users/{uid}.fcmToken`). L'ultimo dispositivo
   che apre l'app sovrascrive il token degli altri: col telefono e il computer,
   il telefono resta senza push finché non si riapre l'app **lì**, e a quel
   punto l'avviso si vede dentro l'app. È la spiegazione che combacia meglio col
   sintomo.
2. **Nessuna `Urgency`** nel messaggio web push (`pushNotifica`,
   `functions/index.js`): vale «normal», e Android in Doze consegna le push
   normali alla finestra di manutenzione successiva — di solito quando si sblocca
   il telefono.
3. **Il token si rinnova solo aprendo l'app** (STATO C2). Se FCM lo scarta, il
   server lo cancella e da lì niente push fino alla prossima apertura.
4. Messaggio `notification` + `data`: l'SDK disegna da sé **e** chiama
   `onBackgroundMessage`; il doppione è gestito con il `tag`. Non spiega il
   sintomo.

**Già corretto, ma annullato dal rollback del 20/09** — sta nella release e quindi
nel ramo `fix/avvio-firebase-2026-09-21` (commit `3efd0b6` e `2d60c12` del
19/09, `2ceb5d4` del 20/09): un token **per dispositivo** (`users/{uid}/devices/{id}`), invio con
`sendEachForMulticast`, messaggio **solo `data`**, `Urgency: high`, TTL un giorno,
tocco che apre la notifica giusta; e il vecchio `fcmToken` resta scritto insieme,
così l'app nuova funziona anche con le Functions di oggi. `banco-push.js` prova
server → FCM → service worker → clic, ma **non** può provare il Doze né il
comportamento di Samsung.

**Cosa resta, e si vede solo col telefono:**

- dopo la pubblicazione delle Functions nuove: push con app **chiusa**, in
  **background**, telefono **bloccato da qualche minuto**, due dispositivi;
- su Samsung: Impostazioni → Batteria → «App in sospensione» / «sospensione
  profonda» per **Chrome** (la PWA vive dentro Chrome): se Chrome è lì, nessuna
  push web arriva ad app chiusa, qualunque cosa faccia il server;
- nei log di `pushNotifica`: «nessun token» e «token scaduto», per sapere quante
  se ne perdono per il punto 3.

**Nessun fix improvvisato**: la prossima mossa è pubblicare le Functions del
ramo (una componente alla volta, dopo il sito) e guardare.

## B) Samsung S26 Ultra — barra/interfaccia troppo grande

**Già fatto e in produzione** (tutto antenato di `7b0ffe9`):

| commit | cosa | banco |
|---|---|---|
| `7bdbf64` (17/09) | la tacca del telefono contata **una volta sola** nella testata: in PWA la prima riga stava due tacche sotto il bordo — è la «barra superiore troppo grande» | `banco-safe-area.js` |
| `ca6931c` (18/09) | lo stesso nella schermata di tiro | `banco-safe-area.js` |
| `b5d2ac3` (18/09) | caratteri grandi di Android: le etichette della barra in basso non escono più dalla loro cella (a 390 px e 130% «MARKETPLACE» era 105 px in 94) | `banco-font-scale.js`, 61 combinazioni |

Il 21/09 `banco-safe-area` e `banco-font-scale` sono verdi su `main`.

**Nel ramo, annullati dal rollback:** `5d1b076` (con la tastiera aperta e il
testo grande si arriva a mandare) e `02ee38c` (tasti del punteggio sempre in
vista, zoom, scuro forzato di Samsung).

**Cosa manca:** nessuno ha ancora guardato un S26 Ultra **dopo** il 17-18/09. Da
guardare: la testata in PWA installata e nel browser; Impostazioni → Schermo →
«Dimensione e stile carattere» e «Zoom schermo» ai valori che usa chi ha
segnalato; tema scuro forzato. Se è ancora grande, serve uno screenshot con i
due valori: i banchi coprono 360–430 px × 100–150%, e il difetto andrebbe
cercato fuori da quel campo.
