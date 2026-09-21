# Push e Samsung S26 Ultra — diagnosi del 21/09/2026

Solo diagnosi, **nessuna correzione nuova**. Le due cose si chiudono solo con un
telefono in mano: qui c'è cosa è già stato fatto, dove sta, e cosa resta da
guardare.

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
