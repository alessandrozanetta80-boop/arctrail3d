// ArcTrail 3D — Cloud Functions
// Versione 2026-09-22-push-argomento
// Nata da: 2026-08-28-notifica-verificata (col layout functions/ del 17/09)
//
// NOVITA' 2026-09-20 — I DISPOSITIVI SONO DOCUMENTI: users/{uid}/devices/{deviceId}
//  { token, platform, language, enabled, createdAt, updatedAt, lastSeen }. deviceId e'
//  casuale e nasce sul telefono; niente impronte del dispositivo. `pushNotifica` legge
//  i dispositivi `enabled` e, per la migrazione, anche il vecchio `users/{uid}.fcmToken`
//  (le app non ancora aggiornate scrivono solo quello). La mappa `fcmTokens` del
//  19/09 non e' mai andata online: non si legge. Ogni notifica porta `type`,
//  `senderUid`, `dest` ed `entityId`, decisi QUI (il client suggerisce, il server vaglia).
//
// NOVITA' 2026-09-19 — LE PUSH ARRIVANO A TUTTI I DISPOSITIVI E PORTANO DOVE DEVONO
//  (audit del 19/09, N1-N8.) `pushNotifica` leggeva una mappa di token (sostituita il 20/09
//  dai documenti in devices/) oltre al vecchio `fcmToken`, manda con sendEachForMulticast un messaggio
//  SOLO `data` con `link` all'app (`/app.html?n=<id>`), Urgency high e TTL di un giorno,
//  e toglie i token morti uno per uno in transazione, solo se sono ancora quelli.
//  `sendNotification` torna a salvare `dest` (destPulito, perso il 18/08).
//  DEPLOY: si pubblicano con `bash ~/pubblica.sh` DOPO che `app.html` 2026-09-19 e' online
//  (regola 18): le app vecchie scrivono ancora solo `fcmToken`, che qui si legge ancora.
//
// NOVITA' 2026-08-28 — `sendNotification` CHIEDE L'EMAIL CONFERMATA.
//  Dopo la revisione indipendente: il chiamante deve avere `email_verified`
//  nel token (stessa porta del `verified()` delle regole). Auth, firma
//  server-side (`fromUid`), rispetto di `blockedUsers` e freno `rate_limits`
//  restano invariati. Regressione dichiarata accanto al controllo.
//  ATTENZIONE: questo file mi e' arrivato timbrato 2026-08-20; NON ho la
//  console e non posso dire quale versione e' DEPLOYATA. Se online c'e' un
//  `index.js` piu' recente del 20/08, questa modifica va riportata LI', non
//  su questa base. Prova: `firebase functions:list`.
//
// Sette funzioni, con sette compiti diversi:
//
//  1) sendNotification  (callable)  — SCRIVE la notifica.
//     Prima scriveva il telefono, direttamente in notifications/{uid}/items.
//     Chiunque fosse loggato poteva quindi mandare una notifica a chiunque
//     altro dalla console del browser, firmandosi con il nome di un altro.
//     Adesso il documento lo scrive questa funzione con l'Admin SDK, che
//     ignora le regole Firestore; nelle regole il "create" dal client e' chiuso.
//
//  2) pushNotifica  (trigger)  — MANDA la push vera, anche ad app chiusa.
//     Scatta quando il documento compare, esattamente come prima: non e' stata
//     toccata. Non le importa chi ha scritto il documento, quindi continua a
//     funzionare identica.
//
//  3) avvisaRicerche (trigger) — guarda chi stava ASPETTANDO un annuncio.
//     Scatta alla nascita di un annuncio del mercatino. Non manda nessuna push
//     da sola: scrive in notifications/{uid}/items, cioe' fa nascere il
//     documento su cui scatta gia' la (2). Cosi' chi ha acceso le notifiche la
//     riceve sul telefono, chi non le ha accese la trova comunque nell'elenco
//     dentro l'app, e se un giorno la consegna cambia, cambia in un posto solo.
//     Due strade per consegnare la stessa cosa divergono sempre, e in silenzio.
//
//  4) avvisaSegnalazione (trigger) — sveglia CHI TIENE L'APP quando qualcuno
//     segnala un annuncio. Stessa strada della (3): non manda push da se',
//     scrive la riga su cui scatta la (2). Aggiunta il 18/08/2026 perche' fino
//     a quel giorno una segnalazione veniva scritta e non la leggeva nessuno:
//     chi segnalava riceveva un ringraziamento e non succedeva niente.
//
//  5) avvisaIscrizione (trigger) — sveglia chi tiene l'app quando qualcuno si
//     iscrive e resta in attesa. Aggiunta il 18/08/2026 insieme alla chiusura
//     delle registrazioni: una porta richiusa senza campanello e' una porta
//     murata, e chi aspetta non ha modo di farsi sentire.
//
//  6) avvisaRichiestaClub (trigger) — sveglia chi tiene l'app quando qualcuno
//     chiede di gestire una compagnia. Aggiunta il 20/08/2026, e la ragione e'
//     la stessa della (4) e della (5): la richiesta veniva scritta e finiva in
//     un pannello che bisognava SAPERE di dover aprire. Un pannello che nessuno
//     apre e' un cassetto, non un avviso — e la persona dall'altra parte
//     aspetta senza sapere se qualcuno ha visto.
//
//  7) avvisaPercorso (trigger) — un arciere ha PROPOSTO un percorso, e la
//     compagnia deve confermare che esiste. Aggiunta il 20/08/2026.
//     Sveglia due porte diverse perche' sono due persone diverse: il
//     referente della compagnia (avviso dentro l'app, quindi anche push) e
//     chi tiene l'app (avviso + posta). E mette in coda una email alla
//     compagnia, se il referente ne ha lasciata una.
//
//     PERCHE' DUE STRADE E NON UNA. L'avviso dentro l'app arriva solo a chi
//     l'app ce l'ha. Una compagnia su 663 che non ha ancora un referente non
//     ha nessuno da svegliare: quella la sveglia la posta, all'indirizzo che
//     conosce gia'. *Un percorso proposto che non raggiunge nessuno non e'
//     una proposta: e' una riga in un cassetto.*
//
// LA POSTA NON PARTE DA SOLA. Questa funzione SCRIVE il documento nella
// raccolta `mail`, nel formato che l'estensione Firebase "Trigger Email" si
// aspetta ({to, message:{subject, text, html}}). Se l'estensione non e'
// installata i documenti si accumulano e non parte niente — percio' il
// pannello conta quanti ce ne sono in coda: una coda che cresce si vede,
// una posta che non parte in silenzio no.
//
// ORDINE DI APPLICAZIONE, e DIPENDE DA COSA FANNO LE REGOLE.
//
//   REGOLE CHE STRINGONO (chiudono una porta che l'app vecchia usa):
//     1) deploy di queste funzioni   (firebase deploy --only functions)
//     2) pubblicazione di index.html
//     3) SOLO DOPO le nuove firestore.rules
//   Al contrario, tutte le notifiche smettono di partire in silenzio.
//
//   REGOLE CHE ALLARGANO (aprono una raccolta che prima non esisteva):
//     1) le nuove firestore.rules
//     2) deploy di queste funzioni
//     3) pubblicazione di index.html
//   Al contrario l'app nuova scrive in una raccolta senza regola, e una
//   raccolta senza regola e' NEGATA: il tasto fallisce con permission-denied.
//
//   Il 20/08/2026 (`percorsi_campo` e `mail`) e' il secondo caso: le regole
//   nuove non tolgono niente a nessuno, quindi vanno per prime. *L'ordine
//   non e' una formula: e' una domanda su chi rimane senza permesso mentre
//   i pezzi non sono ancora tutti al loro posto.*

const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

// La regione deve combaciare con FUNCTIONS_REGION in app.html, altrimenti la
// chiamata parte verso us-central1 e torna "not-found".

/* ══ APP CHECK: L'INTERRUTTORE, SPENTO ════════════════════════════════════
   (20/09/2026, audit SEC-14.) `app.html` sa gia' mandare il timbro di App
   Check (vedi `attivaAppCheck`), ma solo quando in console e' stata creata la
   chiave. Qui c'e' l'altra meta': pretenderlo.

   RESTA SPENTO, E NON E' UNA DIMENTICANZA. Accendere `enforceAppCheck` prima
   che i telefoni mandino il timbro vuol dire rispondere `unauthenticated` a
   TUTTI, compresi quelli che non hanno ancora aggiornato l'app — che dopo un
   deploy sono la maggioranza, per giorni. L'ordine e' sempre lo stesso:
     1. chiave in console e sito pubblicato (i timbri cominciano ad arrivare);
     2. si guardano le metriche «richieste non verificate» in console;
     3. quando sono quasi zero, qui si mette `true` e si ripubblica;
     4. se qualcosa non torna, si rimette `false` e si ripubblica.
   Firestore e Storage NON si accendono da qui: hanno il loro interruttore in
   console (App Check → Applica), e vanno accesi con lo stesso criterio. */
const APP_CHECK_OBBLIGATORIO = false;

const MAX_TITOLO = 120;
const MAX_TESTO = 500;
const LIMITE_AL_MINUTO = 40; // un invito ad allenamento ne manda uno per invitato

// ─────────────────────────────────────────────────────────────────────────────
// DOVE PORTA L'AVVISO. (19/09/2026, audit N8: regressione del 18/08.)
// `destPulito` c'era fino al commit 44b638b e poi e' sparito: l'app continuava a
// mandare `dest` — «apri la chat con chi scrive», «apri l'allenamento» — e il
// server lo buttava. Le notifiche di chat e di invito arrivavano, ma il tocco
// non portava da nessuna parte, e un commento nell'app diceva il contrario.
// Le forme sono quelle che `destinazioneNotifica()` in app.html sa leggere.
// Per `dm` l'uid NON viene dal client: e' il mittente vero, dal token.
// ─────────────────────────────────────────────────────────────────────────────
/* IL TIPO DELL'AVVISO. (20/09/2026, fase 17.) Deciso qui, da `dest`: il client
   puo' suggerirlo, ma vale solo se e' uno dei tipi noti E coincide con la
   destinazione. Serve al telefono per decidere l'icona e il testo, e a chi legge
   i log per contare cosa parte. */
const TIPI_AVVISO = ["dm", "allenamento", "annuncio", "compagnia", "avviso"];
function tipoDa(dest) {
  if (!dest) return "avviso";
  if (dest.k === "dm") return "dm";
  if (dest.k === "ot") return "allenamento";
  if (dest.k === "annuncio") return "annuncio";
  if (dest.k === "club-space") return "compagnia";
  return "avviso";
}
function entitaDi(dest) {
  if (!dest) return null;
  return dest.id || dest.code || dest.uid || null;
}

function destPulito(d, mittente) {
  const MAX_ID = 128;
  if (!d || typeof d !== "object") return null;
  const id = typeof d.id === "string" ? d.id.trim().slice(0, MAX_ID) : "";
  if (d.k === "dm") return { k: "dm", uid: mittente };
  if (d.k === "ot") return id ? { k: "ot", id: id } : null;
  if (d.k === "annuncio") return id ? { k: "annuncio", id: id } : null;
  if (d.k === "club-space") {
    const code = typeof d.code === "string" ? d.code.trim().toUpperCase() : "";
    return /^[A-Z0-9]{2,20}$/.test(code) ? { k: "club-space", code: code } : null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) SCRITTURA DELLA NOTIFICA — chiamata dall'app
// ─────────────────────────────────────────────────────────────────────────────
exports.sendNotification = onCall({ cors: true, enforceAppCheck: APP_CHECK_OBBLIGATORIO }, async (req) => {

  // Chi chiama deve essere autenticato. L'uid arriva dal token verificato dal
  // server, non da quello che dichiara il client: e' il punto chiave di tutto.
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Serve un accesso valido.");

  // EMAIL CONFERMATA. (28/08/2026, seconda passata.) Stessa porta del
  // `verified()` delle regole: chi non ha confermato l'email non manda avvisi
  // a sconosciuti. `email_verified` sta nel token verificato dal server, non
  // nel payload — un client modificato non se lo puo' regalare; Google e Apple
  // ce l'hanno gia' vero. NON tocca auth, firma server-side (`fromUid: uid`),
  // rispetto di `blockedUsers`, ne' il freno di `rate_limits`: quelli restano
  // com'erano. Nota di regressione dichiarata: un utente NON verificato non
  // riesce piu' a mandare nemmeno la notifica di prova a se stesso, ne'
  // l'avviso all'admin quando elimina il proprio account (destinatario admin).
  if (!(req.auth.token && req.auth.token.email_verified === true)) {
    throw new HttpsError("permission-denied", "Conferma l'email per inviare notifiche.");
  }

  const d = req.data || {};
  const toUid = typeof d.toUid === "string" ? d.toUid.trim() : "";
  const title = typeof d.title === "string" ? d.title.trim().slice(0, MAX_TITOLO) : "";
  const body  = typeof d.body  === "string" ? d.body.trim().slice(0, MAX_TESTO)  : "";
  if (!toUid || !title) {
    throw new HttpsError("invalid-argument", "Servono toUid e title.");
  }
  /* `toUid` DIVENTA UN PERCORSO, quindi prima si guarda com'e' fatto. (22/09/2026.)
     Un uid di Firebase e' corto e senza «/». Con una barra dentro si puntava a
     un altro livello di `users/...`: nessun danno (errore interno o «destinatario
     inesistente»), ma un parametro che diventa un percorso non si lascia al caso. */
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(toUid)) {
    throw new HttpsError("invalid-argument", "toUid non valido.");
  }

  const db = admin.firestore();

  // SOSPESO = NON AVVISA NESSUNO. (19/09/2026, audit SEC-08.) Lo stesso segno
  // che le regole guardano (`sospesi/{uid}`, scritto dall'admin revocando).
  const sospeso = await db.collection("sospesi").doc(uid).get();
  if (sospeso.exists) {
    throw new HttpsError("permission-denied", "Account sospeso.");
  }

  // Freno anti-abuso: massimo LIMITE_AL_MINUTO invii per utente al minuto.
  // In transazione, altrimenti due invii simultanei leggono lo stesso valore.
  const rlRef = db.collection("rate_limits").doc(uid);
  const ora = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rlRef);
    const dati = snap.exists ? (snap.data() || {}) : {};
    const inizioFinestra = Number(dati.windowStart || 0);
    const conteggio = Number(dati.count || 0);
    if (ora - inizioFinestra > 60000) {
      tx.set(rlRef, { windowStart: ora, count: 1 }, { merge: true });
      return;
    }
    if (conteggio >= LIMITE_AL_MINUTO) {
      throw new HttpsError("resource-exhausted", "Troppe notifiche in poco tempo.");
    }
    tx.set(rlRef, { windowStart: inizioFinestra, count: conteggio + 1 }, { merge: true });
  });

  // Rispetto dei blocchi: se il destinatario ha bloccato chi scrive, la
  // notifica non parte. Il mittente non se ne accorge, ed e' giusto cosi':
  // sapere di essere stati bloccati non gli spetta.
  // Le notifiche a se stessi (conferme d'invio) saltano il controllo.
  if (toUid !== uid) {
    const dest = await db.collection("users").doc(toUid).get();
    if (!dest.exists) return { ok: false, motivo: "destinatario inesistente" };
    const bloccati = (dest.data() || {}).blockedUsers || {};
    if (bloccati[uid]) return { ok: true, saltata: true };
  }

  // fromUid lo mette il server: e' la firma vera, non quella dichiarata.
  const doc = {
    title: title,
    body: body,
    read: false,
    fromUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const dest = destPulito(d.dest, uid);
  if (dest) doc.dest = dest;
  // Chi manda, di che tipo e' e a cosa si riferisce: deciso dal server.
  doc.senderUid = uid;
  doc.type = tipoDa(dest);
  const ent = entitaDi(dest);
  if (ent) doc.entityId = ent;
  if (TIPI_AVVISO.indexOf(doc.type) < 0) doc.type = "avviso";
  await db.collection("notifications").doc(toUid).collection("items").add(doc);

  return { ok: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) PUSH ANCHE AD APP CHIUSA — invariata
// Si attiva da sola quando compare un documento in notifications/{uid}/items:
// legge il token FCM dell'utente (salvato su users/{uid}.fcmToken quando attiva
// le notifiche) e manda la push.
// ─────────────────────────────────────────────────────────────────────────────
exports.pushNotifica = onDocumentCreated(
  "notifications/{uid}/items/{itemId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const d = snap.data() || {};
    const uid = event.params.uid;
    const itemId = event.params.itemId;
    const utenteRef = admin.firestore().collection("users").doc(uid);

    /* UN DOCUMENTO PER DISPOSITIVO. (19-20/09/2026, audit N1, fase 16.)
       Prima c'era un solo `fcmToken` per utente, e l'ultimo dispositivo aperto
       sovrascriveva gli altri: chi usa telefono e computer riceveva le push solo
       sull'ultimo. Adesso ogni dispositivo ha users/{uid}/devices/{deviceId}.
       `fcmToken` si legge ancora: e' quello che scrivono le app di prima. */
    const userSnap = await utenteRef.get();
    const u = userSnap.exists ? (userSnap.data() || {}) : {};
    const voci = [];
    const dispositivi = await utenteRef.collection("devices").where("enabled", "==", true).get();
    dispositivi.forEach(function (doc) {
      const v = doc.data() || {};
      if (typeof v.token === "string" && v.token &&
          !voci.some(function (x) { return x.token === v.token; })) {
        voci.push({ device: doc.id, token: v.token });
      }
    });
    if (typeof u.fcmToken === "string" && u.fcmToken &&
        !voci.some(function (v) { return v.token === u.fcmToken; })) {
      voci.push({ device: null, token: u.fcmToken });
    }
    if (!voci.length) {
      console.log("push per " + uid + ": nessun token, avviso «" + (d.title || "?") + "» non consegnato");
      return;
    }

    /* SOLO `data`, E IL SERVICE WORKER DISEGNA SEMPRE LUI. (19/09/2026, N3-N4.)
       Con un blocco `notification` disegnava l'SDK: il clic lo gestiva lui
       (e `sw.js` non lo vedeva mai), portava a `fcmOptions.link` — la vetrina —
       e con una pagina qualunque del sito aperta la push veniva consegnata alla
       pagina senza nessuna notifica. Con solo `data` passa sempre da
       `onBackgroundMessage` in sw.js, che disegna con l'etichetta giusta e al
       clic porta `link` all'app, che apre la notifica `n`.
       `Urgency: high`: su Android in Doze una push normale aspetta lo sblocco.
       TTL un giorno: un avviso vecchio di tre giorni non serve piu'. */
    const dati = {
      tag: itemId,
      title: String(d.title || "ArcTrail 3D"),
      body: String(d.body || ""),
      link: "/app.html?n=" + encodeURIComponent(itemId),
    };
    if (d.apri) dati.apri = String(d.apri);
    if (d.adId) dati.adId = String(d.adId);
    if (d.clubCode) dati.clubCode = String(d.clubCode);
    if (d.dest) dati.dest = JSON.stringify(d.dest);
    if (d.type) dati.type = String(d.type);
    if (d.senderUid) dati.senderUid = String(d.senderUid);
    if (d.entityId) dati.entityId = String(d.entityId);

    const tokens = voci.map(function (v) { return v.token; });
    let esito;
    try {
      esito = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        data: dati,
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
          fcmOptions: { link: "https://arctrail3d.com" + dati.link },
        },
      });
    } catch (err) {
      console.error("push fallita per", uid, err);
      return;
    }

    /* I TOKEN MORTI SI TOLGONO UNO PER UNO, E SOLO SE SONO ANCORA QUELLI.
       (19/09/2026, audit N7.) Prima si cancellava `fcmToken` senza guardare: se
       nel frattempo l'utente aveva aperto l'app e scritto il token NUOVO, veniva
       cancellato quello nuovo. Adesso in transazione, e solo se il valore sul
       documento e' ancora il token che ha fallito. */
    const morti = [];
    (esito.responses || []).forEach(function (r, i) {
      if (r.success) return;
      const code = r.error && (r.error.code || (r.error.errorInfo && r.error.errorInfo.code)) || "";
      const testo = String((r.error && (r.error.message || (r.error.errorInfo && r.error.errorInfo.message))) || "");
      /* `invalid-argument` E' UN TOKEN MORTO SOLO SE PARLA DEL TOKEN. (21/09/2026.)
         FCM lo restituisce anche per un messaggio fatto male — e allora fallisce
         per TUTTI i token: contarlo come token morto spegnerebbe in silenzio
         tutti i dispositivi di ogni destinatario. banco-push.js, A2-bis. */
      const tokenNonValido = code === "messaging/invalid-argument" && /registration token/i.test(testo);
      if (code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          tokenNonValido) {
        morti.push(voci[i]);
      } else {
        console.error("push fallita per", uid, code || r.error);
      }
    });
    if (!morti.length) return;
    console.warn("push per " + uid + ": " + morti.length + " token scaduti o revocati, li tolgo.");
    // Il dispositivo morto si spegne (enabled:false, token tolto) solo se il suo
    // token e' ancora quello che ha fallito; il vecchio fcmToken idem.
    for (const m of morti) {
      await admin.firestore().runTransaction(async function (tx) {
        if (m.device) {
          const ref = utenteRef.collection("devices").doc(m.device);
          const ora = await tx.get(ref);
          if (ora.exists && (ora.data() || {}).token === m.token) {
            tx.update(ref, { enabled: false, token: admin.firestore.FieldValue.delete(),
                             updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          }
        } else {
          const ora = await tx.get(utenteRef);
          if (ora.exists && (ora.data() || {}).fcmToken === m.token) {
            tx.update(utenteRef, { fcmToken: admin.firestore.FieldValue.delete() });
          }
        }
      }).catch(function () {});
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3) CHI STAVA ASPETTANDO QUESTO ANNUNCIO
// Scatta alla nascita di market_listings/{adId}.
//
// PERCHE' NON MANDA LA PUSH DA SOLA. Scrive in notifications/{uid}/items e si
// ferma li': su quel documento scatta gia' pushNotifica, che sa ripulire un
// token scaduto, mettere l'icona e il link. Se avvisasse per conto suo
// avremmo due strade per consegnare la stessa cosa, e due strade divergono
// sempre — in silenzio. E' scritto quattro volte nelle note del mercatino,
// ogni volta dopo averlo pagato.
//
// IL COSTO, DICHIARATO. Si leggono TUTTE le ricerche a ogni annuncio nuovo. La
// ricerca e' per sottostringa — chi cerca "hoyt" vuole trovarlo dentro
// "Ricurvo Hoyt Satori" — e una sottostringa non si indicizza: non esiste una
// query Firestore che chieda "chi stava aspettando questo?". Con qualche
// centinaio di persone e' una lettura da niente. RICERCHE_TANTE accende una
// spia nei log il giorno in cui smette di esserlo, e allora servira' un indice
// vero, non un giro piu' furbo su questo elenco.
// Un tetto si dichiara e si conta, non si subisce.
// ─────────────────────────────────────────────────────────────────────────────
const RICERCHE_TANTE = 800;  // oltre questa soglia la lettura non e' piu' gratis
const MAX_AVVISI = 200;      // per singolo annuncio; il resto si conta nei log

// ══ INIZIO PAROLE GENERATE — da dizionario-c.py con genera.py: non correggere qui.
// Le nove lingue hanno una sorgente sola. Per cambiare una di queste frasi
// si cambia il .py e si rilancia genera.py.
const PAROLE = {
  push_sav_title: {
    it: "Nuovo annuncio per «{q}»",
    en: "New listing for “{q}”",
    fr: "Nouvelle annonce pour « {q} »",
    de: "Neue Anzeige für „{q}“",
    tr: "«{q}» için yeni ilan",
    ru: "Новое объявление по «{q}»",
    es: "Nuevo anuncio para «{q}»",
    sv: "Ny annons för ”{q}”",
    nl: "Nieuwe advertentie voor ‘{q}’",
  },
};
// ══ FINE PAROLE GENERATE

/* LA STESSA DOMANDA, SCRITTA DUE VOLTE.
   Questa e' la gemella di matchQ() in marketplace.html: una gira su Node,
   l'altra dentro una pagina, e non c'e' modo di condividerle. Se divergono il
   danno e' preciso e invisibile — uno riceve un avviso per un annuncio che
   poi, entrando nel mercatino, non trova, e non ha nessun modo di capire
   perche'. `banco-avvisi.js` le estrae dai due file veri e le mette una contro
   l'altra su dodici casi: se un giorno una impara un campo in piu' e l'altra
   no, lo dice il giorno stesso.
   Il posto NON e' una corrispondenza: "Verbania" nella localita' non risponde
   a chi cerca "verbania" fra gli oggetti. Vale di la', vale qui. */
function combacia(a, q) {
  q = String(q || "").trim().toLowerCase(); if (!q) return false;
  return (a.title || "").toLowerCase().indexOf(q) >= 0
      || (a.description || "").toLowerCase().indexOf(q) >= 0
      || (a.marca || "").toLowerCase().indexOf(q) >= 0;
}

// Il corpo dice cos'e', dov'e' e quanto costa — in una riga, perche' una
// notifica si legge di sfuggita. Un "Cerco" non ha un prezzo da stampare: il
// budget di chi cerca non e' un'offerta, e metterlo li' lo farebbe sembrare
// tale.
function corpoAvviso(ad) {
  const pezzi = [ad.title || ""];
  if (ad.location) pezzi.push(ad.location);
  if (ad.type !== "cerco" && Number(ad.price) > 0) pezzi.push("€ " + ad.price);
  return pezzi.filter(Boolean).join(" · ");
}

exports.avvisaRicerche = onDocumentCreated(
  "market_listings/{adId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const ad = snap.data() || {};
    const adId = event.params.adId;

    // Un annuncio che non nasce in vendita non si annuncia.
    if (ad.status !== "active") return;
    const venditore = ad.sellerUid || "";

    const db = admin.firestore();
    const tutte = await db.collection("market_searches").get();
    if (tutte.size >= RICERCHE_TANTE) {
      console.warn("ricerche salvate: " + tutte.size + " — oltre " + RICERCHE_TANTE +
                   ", la lettura per annuncio non e' piu' trascurabile: serve un indice vero");
    }

    // UN AVVISO PER PERSONA, non uno per ricerca. Tre ricerche che combaciano
    // sullo stesso arco non sono tre notizie: sono la stessa detta tre volte,
    // ed e' il modo piu' veloce per farsi spegnere la campanella.
    const aspettavano = [];
    tutte.forEach(function (d) {
      if (d.id === venditore) return;              // il proprio annuncio non e' una notizia
      const dati = d.data() || {};
      const queries = Array.isArray(dati.queries) ? dati.queries : [];
      const trovata = queries.find(function (q) { return combacia(ad, q); });
      if (trovata) aspettavano.push({ uid: d.id, q: trovata, lang: dati.lang || "it" });
    });
    if (!aspettavano.length) return;

    const quanti = Math.min(aspettavano.length, MAX_AVVISI);
    if (aspettavano.length > MAX_AVVISI) {
      console.warn("annuncio " + adId + ": " + aspettavano.length + " in attesa, ne avviso " +
                   MAX_AVVISI + " — " + (aspettavano.length - MAX_AVVISI) + " restano senza avviso");
    }

    for (let i = 0; i < quanti; i++) {
      const c = aspettavano[i];
      // Un blocco che vale nelle chat e non negli avvisi non e' un blocco:
      // e' un'impostazione decorativa.
      const u = await db.collection("users").doc(c.uid).get().catch(function () { return null; });
      const bloccati = (u && u.exists ? (u.data() || {}) : {}).blockedUsers || {};
      if (venditore && bloccati[venditore]) continue;

      const modello = PAROLE.push_sav_title[c.lang] || PAROLE.push_sav_title.it;
      await db.collection("notifications").doc(c.uid).collection("items").add({
        title: modello.replace("{q}", c.q),
        body: corpoAvviso(ad),
        read: false,
        fromUid: venditore,
        adId: adId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(function (err) { console.error("avviso non scritto per", c.uid, err); });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4) QUALCUNO HA SEGNALATO UN ANNUNCIO
// Scatta alla nascita di market_reports/{repId}.
//
// PERCHE' ESISTE. Fino al 18/08/2026 `doRep()` scriveva la segnalazione e
// nessuno la leggeva: nessuna schermata, nessuna funzione, nessun avviso. La
// persona che segnalava un annuncio truffaldino riceveva «Segnalazione
// inviata, grazie», si fidava, e non succedeva niente. Un tasto rotto lo vedi
// e lo aggiri; una promessa mantenuta a meta' no.
//
// LA VELOCITA' E' IL PUNTO. All'apertura, un annuncio pacco lasciato in piedi
// mezza giornata costa piu' di dieci difetti di grafica: la prima volta che
// qualcuno viene truffato, la voce gira e non torna indietro. Percio' la
// segnalazione non aspetta che qualcuno apra una schermata: arriva addosso.
//
// UNA PUSH PER ANNUNCIO, NON UNA PER SEGNALAZIONE. La notizia e' «questo
// annuncio ha un problema», e detta cinque volte resta una notizia sola: cinque
// campanelle per lo stesso annuncio sono il modo piu' rapido per farsi spegnere
// le notifiche, e allora non arriva piu' nemmeno la prima. Quindi il documento
// dell'avviso ha un id FISSO ricavato dall'annuncio: la prima segnalazione lo
// crea — e solo la creazione fa scattare la (2) — le successive aggiornano il
// conteggio in silenzio. Quando la segnalazione viene archiviata, la riga
// sparisce e un'eventuale segnalazione nuova torna a suonare.
//
// TESTI IN ITALIANO, senza PAROLE[lang]. Questa notifica la legge una persona
// sola, e non e' un utente: e' chi tiene l'app. Stessa scelta gia' fatta per il
// pannello Approvazioni dentro index.html.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "alessandro.zanetta80@gmail.com";

// Il motivo arriva come codice dal telefono: qui diventa una frase leggibile.
// Se un giorno nasce un motivo nuovo nel mercatino e qui non viene aggiunto,
// la notifica mostra il codice grezzo invece di rompersi — brutta ma leggibile.
const MOTIVI = {
  price: "prezzo non realistico",
  photo: "foto non veritiere",
  forbidden: "articolo vietato",
  spam: "spam o truffa"
};

exports.avvisaSegnalazione = onDocumentCreated(
  "market_reports/{repId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const r = snap.data() || {};
    const adId = r.adId || "";
    if (!adId) return;

    const db = admin.firestore();

    // Chi tiene l'app. Cercato per email invece che scritto a mano come uid:
    // un uid copiato in un file e' una cosa che nessuno ricorda di cambiare.
    let adminUid = "";
    try {
      const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      adminUid = u.uid;
    } catch (err) {
      console.error("segnalazione " + event.params.repId +
                    ": nessun account per " + ADMIN_EMAIL + ", avviso non mandato", err);
      return;
    }

    // Il titolo dell'annuncio: da oggi il telefono lo copia dentro la
    // segnalazione, cosi' resta leggibile anche se l'annuncio viene cancellato
    // — ed e' la prima cosa che fa chi tenta una truffa. Il ripiego serve alle
    // segnalazioni scritte prima di oggi.
    let titolo = r.adTitle || "";
    if (!titolo) {
      const ad = await db.collection("market_listings").doc(adId).get().catch(function () { return null; });
      titolo = (ad && ad.exists ? (ad.data() || {}).title : "") || "annuncio non piu' disponibile";
    }

    const motivo = MOTIVI[r.reason] || r.reason || "motivo non indicato";
    const rif = db.collection("notifications").doc(adminUid).collection("items").doc("rep-" + adId);

    /* DUE DIFETTI CORRETTI IL 19/08/2026, e sono la ragione per cui la push
       non arrivava mai.

       PRIMO: IL CATCH ERA CIECO. Qualunque errore di `create` — non solo
       «esiste gia'», ma anche un campo rifiutato, una quota, un problema di
       rete — finiva nel ramo `update`, cioe' nel ramo che di proposito NON fa
       suonare niente. Un difetto che si travestiva da comportamento voluto:
       da fuori sembrava «la seconda segnalazione non suona, giusto cosi'»,
       mentre poteva essere «non ha mai suonato nessuna». Adesso solo
       ALREADY_EXISTS (codice 6) porta all'aggiornamento silenzioso; ogni
       altro errore si scrive nei log con la sua faccia.

       SECONDO, PIU' GRAVE: L'AVVISO GIA' LETTO NON SUONAVA PIU'. L'id fisso
       serve a non suonare cinque volte per lo stesso annuncio, e finche'
       l'avviso e' li' NON LETTO va bene cosi': la campanella e' gia' suonata,
       chi deve intervenire lo sa. Ma se l'avviso e' stato letto, la storia per
       chi legge e' chiusa — e una segnalazione nuova su quello stesso annuncio
       e' una notizia nuova, non un aggiornamento. Prima restava muta per
       sempre. Adesso l'avviso letto viene cancellato e rifatto, e cosi' torna
       a suonare. */
    let esisteva = null;
    try {
      const gia = await rif.get();
      if (gia.exists) esisteva = gia.data() || {};
    } catch (e) { /* se non si riesce a guardare, si prova comunque a creare */ }

    if (esisteva && esisteva.read === true) {
      // Gia' letto: storia chiusa, questa e' una notizia nuova.
      await rif.delete().catch(function (e) {
        console.error("segnalazione su " + adId + ": avviso vecchio non tolto", e);
      });
      esisteva = null;
    }

    try {
      // `create` fallisce se il documento esiste gia': e' proprio quello che
      // serve per distinguere «prima segnalazione» da «ennesima».
      await rif.create({
        title: "Annuncio segnalato",
        body: "«" + titolo + "» — " + motivo,
        read: false,
        adId: adId,
        apri: "marketplace",       // dice all'app dove porta il tocco
        quante: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("segnalazione su " + adId + ": avviso CREATO, la push parte");
    } catch (err) {
      const codice = err && (err.code !== undefined ? err.code : err.status);
      if (codice !== 6 && codice !== "already-exists" && codice !== "ALREADY_EXISTS") {
        // NON e' «esiste gia'»: qui la push non partira', e va detto forte
        // invece di finire nel ramo silenzioso come succedeva prima.
        console.error("segnalazione su " + adId +
                      ": avviso NON creato per un motivo diverso da «esiste gia'»." +
                      " La push non partira'.", err);
        return;
      }
      // Esisteva e non era ancora letto: la campanella e' gia' suonata, chi
      // deve intervenire lo sa. Si aggiorna il conteggio e non si suona.
      console.log("segnalazione su " + adId + ": avviso gia' presente e non letto, aggiornato in silenzio");
      await rif.update({
        quante: admin.firestore.FieldValue.increment(1),
        body: "«" + titolo + "» — piu' segnalazioni, l'ultima: " + motivo,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(function (e) {
        console.error("segnalazione su " + adId + ": avviso non aggiornato", e);
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5) QUALCUNO SI E' ISCRITTO E STA ASPETTANDO
// Scatta alla nascita di users/{uid}.
//
// PERCHE' STA QUI E NON NEL TELEFONO. L'avviso lo mandava index.html con
// `notifyAdminNewSignup()`, e aveva due buchi.
// Il primo: un account nasce in DUE punti di quel file — la registrazione col
// modulo e il documento creato al primo accesso quando non esiste — e solo il
// primo avvisava. Dal secondo si poteva restare in attesa per giorni senza che
// nessuno lo sapesse.
// Il secondo: cercava l'uid dell'admin dentro `app_config/admin` e, se quel
// documento non c'era, faceva `return` in silenzio. Un avviso che non parte e
// non lo dice e' peggio di un avviso che manca: si crede che funzioni.
// Qui il trigger e' sul documento, quindi copre tutte le strade — anche
// quelle che verranno.
//
// SOLO CHI ASPETTA DAVVERO. Se un giorno le registrazioni tornano aperte
// (`approved: true` alla nascita), questa funzione smette di suonare da sola,
// senza che nessuno debba ricordarsi di spegnerla.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6) RICHIESTA DI GESTIONE COMPAGNIA — la campanella di chi deve rispondere
//
// Scatta alla nascita di compagnie_admin_requests/{id}. Come la (3), la (4) e
// la (5) NON manda una push da se': scrive la riga in notifications/{uid}/items
// e lascia che sia la (2) a consegnarla. Una sola strada per consegnare, un
// solo posto da cambiare se la consegna cambia.
//
// L'ID DEL DOCUMENTO E' QUELLO DELLA RICHIESTA, non uno nuovo. Il documento
// della richiesta e' `{codice}_{uid}`, quindi due richieste della stessa
// persona per la stessa compagnia danno lo stesso avviso: se una viene
// respinta e rifatta, il campanello suona di nuovo (il create fallisce se la
// riga c'e' gia', e non e' un errore da gridare — e' il doppione che non
// vogliamo).
// ─────────────────────────────────────────────────────────────────────────────

exports.avvisaRichiestaClub = onDocumentCreated(
  "compagnie_admin_requests/{reqId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const r = snap.data() || {};

    // Solo le richieste in attesa: una gia' approvata non ha niente da chiedere.
    if (r.stato && r.stato !== "pending") return;

    let adminUid = "";
    try {
      const a = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      adminUid = a.uid;
    } catch (err) {
      console.error("richiesta club " + event.params.reqId +
                    ": nessun account per " + ADMIN_EMAIL + ", avviso non mandato", err);
      return;
    }
    if (adminUid === r.richiedenteUid) return; // se la chiede lui, non si sveglia da solo

    const chi = r.richiedenteName || r.richiedenteEmail || "senza nome";
    const dettaglio = (r.richiedenteEmail && r.richiedenteEmail !== chi) ? r.richiedenteEmail : "";

    await admin.firestore()
      .collection("notifications").doc(adminUid).collection("items")
      .doc("club-" + event.params.reqId)   // una richiesta, una campanella
      .create({
        title: "Richiesta gestione compagnia",
        body: (r.codice || "?") + " \u2014 " + chi + (dettaglio ? " \u00B7 " + dettaglio : ""),
        read: false,
        apri: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      .catch(function (err) {
        console.error("avviso richiesta club non scritto per " + event.params.reqId, err);
      });
  }
);

exports.avvisaIscrizione = onDocumentCreated(
  "users/{uid}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const u = snap.data() || {};

    // Gia' attivo: non c'e' niente da approvare, quindi niente da svegliare.
    if (u.approved === true) return;

    let adminUid = "";
    try {
      const a = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      adminUid = a.uid;
    } catch (err) {
      console.error("iscrizione " + event.params.uid +
                    ": nessun account per " + ADMIN_EMAIL + ", avviso non mandato", err);
      return;
    }
    if (adminUid === event.params.uid) return; // il primo account e' il suo

    // Il nome migliore che c'e', e sotto quello che aggiunge qualcosa. Senza
    // il controllo sul doppione, chi si iscrive senza nome riceveva un avviso
    // che diceva due volte la stessa email: visto nel banco, non nel codice.
    const chi = u.nomeCognome || u.username || u.email || "senza nome";
    const dettaglio = [
      (u.username && u.username !== chi) ? "@" + u.username : "",
      (u.email && u.email !== chi) ? u.email : ""
    ].filter(Boolean).join(" \u00B7 ");

    await admin.firestore()
      .collection("notifications").doc(adminUid).collection("items")
      .doc("isc-" + event.params.uid)   // id fisso: un'iscrizione, una campanella
      .create({
        title: "Nuova iscrizione da approvare",
        body: chi + (dettaglio ? " \u2014 " + dettaglio : ""),
        read: false,
        apri: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      .catch(function (err) {
        console.error("avviso iscrizione non scritto per " + event.params.uid, err);
      });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 7) UN PERCORSO PROPOSTO — sveglia la compagnia e chi tiene l'app
// ─────────────────────────────────────────────────────────────────────────────

// Il nome che si legge in un avviso: quello che c'e', non un posto vuoto.
function chiHaProposto(p) {
  return p.createdByName || p.createdByEmail || "un arciere";
}

// Il testo dell'avviso lo scrive il server, quindi e' in italiano: lo leggono
// il referente della compagnia e chi tiene l'app, e per adesso sono italiani.
// Il giorno che non lo saranno, questa e' la riga da cambiare — insieme alle
// altre sei, che hanno lo stesso problema e non e' stato risolto per nessuna.
function rigaPercorso(p) {
  const piazzole = Number(p.piazzole) || 0;
  return (p.nome || "senza nome") +
         (piazzole ? " \u2014 " + piazzole + " piazzole" : "") +
         " \u00B7 " + chiHaProposto(p);
}

exports.avvisaPercorso = onDocumentCreated(
  "percorsi_campo/{percId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const p = snap.data() || {};

    // Un percorso gia' confermato lo ha scritto il referente o l'admin: non
    // c'e' niente da confermare, e nessuno da svegliare per farselo dire.
    if (p.stato !== "proposto") return;

    const codice = String(p.clubCode || "");
    if (!codice) return;

    const dbf = admin.firestore();
    const id = event.params.percId;

    // ── Chi risponde di questa compagnia, se c'e' ────────────────────────
    let referenteUid = "";
    let emailComp = "";
    try {
      const doc = await dbf.collection("compagnie_admin").doc(codice).get();
      if (doc.exists) {
        const d = doc.data() || {};
        referenteUid = d.adminUid || "";
        emailComp = String(d.emailComp || "").trim();
      }
    } catch (err) {
      console.error("percorso " + id + ": compagnie_admin/" + codice + " non letto", err);
    }

    let adminUid = "";
    try {
      const a = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      adminUid = a.uid;
    } catch (err) {
      console.error("percorso " + id + ": nessun account per " + ADMIN_EMAIL, err);
    }

    const riga = rigaPercorso(p);

    // ── L'avviso dentro l'app (e quindi la push, che scatta sul documento) ─
    // Al referente arriva con `apri:"club-space"`: il tocco che ha gia' fatto
    // per leggerlo lo porta dove si conferma. Un avviso che dice «c'e' una
    // cosa da fare» e non porta dove si fa e' meta' avviso.
    const scrivi = (uid, apri) =>
      dbf.collection("notifications").doc(uid).collection("items")
        .doc("perc-" + id)   // un percorso, una campanella
        .create({
          title: "Percorso da confermare",
          body: codice + " \u2014 " + riga,
          read: false,
          apri: apri,
          clubCode: codice,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
        .catch((err) => console.error("avviso percorso non scritto per " + uid, err));

    const lavori = [];
    if (referenteUid && referenteUid !== p.createdBy) lavori.push(scrivi(referenteUid, "club-space"));
    if (adminUid && adminUid !== p.createdBy && adminUid !== referenteUid) lavori.push(scrivi(adminUid, "admin"));

    // ── La posta ─────────────────────────────────────────────────────────
    // Gli indirizzi: chi tiene l'app sempre, la compagnia se ne ha lasciato
    // uno. Non si prende l'email pubblica della federazione perche' questa
    // funzione non ha l'elenco delle 663 compagnie, e farsela passare dal
    // telefono vorrebbe dire lasciar scegliere al telefono a chi scrivere.
    const a = [ADMIN_EMAIL];
    if (emailComp && emailComp.indexOf("@") > 0 && emailComp !== ADMIN_EMAIL) a.push(emailComp);

    const oggetto = "ArcTrail 3D \u2014 percorso da confermare (" + codice + ")";
    const corpo = [
      chiHaProposto(p) + " ha proposto un percorso per la compagnia " + codice + ".",
      "",
      "Percorso: " + (p.nome || "senza nome"),
      "Piazzole: " + (Number(p.piazzole) || "non indicate"),
      p.note ? ("Note: " + p.note) : "",
      "",
      "Il percorso NON compare agli altri arcieri finche' non lo confermate.",
      "Per confermarlo: aprite ArcTrail 3D, scheda Compagnie \u2192 Gestisci.",
      "",
      "Se il percorso non esiste, rifiutatelo: sparisce dall'elenco."
    ].filter(Boolean).join("\n");

    lavori.push(
      dbf.collection("mail").doc("perc-" + id).create({
        to: a,
        message: {
          subject: oggetto,
          text: corpo,
          html: "<pre style=\"font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif\">" +
                corpo.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</pre>"
        },
        clubCode: codice,
        percorsoId: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch((err) => console.error("posta percorso non messa in coda per " + id, err))
    );

    await Promise.all(lavori);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 8) LA COMPAGNIA NEL TOKEN
// Scatta a ogni scrittura su users/{uid}.
//
// PERCHE' ESISTE. (20/09/2026, audit SEC-09, seconda passata.) Un allenamento
// «solo club» deve poterlo ELENCARE chi e' di quella compagnia, e nessun
// altro. Una regola di Firestore puo' chiedere la compagnia al documento
// utente con `get()` — ma una regola che chiama `get()` NON restringe le
// query: protegge la lettura di un documento e lascia passare l'elenco.
// (Misurato sull'emulatore il 20/09: con una regola senza `get()` la stessa
// query viene rifiutata, con `get()` passa.)
//
// L'unica cosa che una regola puo' guardare su una query, senza leggere
// niente, e' il TOKEN di chi chiede. Quindi la compagnia va nel token, come
// `custom claim`, e la scrive qui il server: il client non puo' regalarsela.
//
// NON E' ATTIVA FINCHE' NON SI PUBBLICA, ed e' voluto: `firestore.rules` la
// guarda gia' (`elencaAllenamento`), e finche' il claim non c'e' i soci non
// vedono nell'elenco i «solo club» della loro compagnia. Una funzione in meno
// per qualche ora, non una porta aperta per sempre.
//
// IL TOKEN NON CAMBIA DA SOLO. Un claim nuovo entra nel token al rinnovo, che
// l'SDK fa circa ogni ora — oppure subito, se l'app chiede
// `getIdToken(true)`. `app.html` lo chiede all'accesso e quando la compagnia
// cambia: senza quella riga, cambiare compagnia si vedrebbe un'ora dopo.
//
// COSTA UNA SCRITTURA DI AUTH per ogni cambio di compagnia, non per ogni
// scrittura sull'utente: se la compagnia non e' cambiata, qui si esce subito.
// Senza quel controllo, ogni salvataggio del profilo — e ogni token push
// scritto a ogni apertura — rinnoverebbe i claim di tutti.
// ─────────────────────────────────────────────────────────────────────────────
exports.claimCompagnia = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const prima = event.data && event.data.before && event.data.before.exists
    ? (event.data.before.data() || {}) : {};
  const dopo = event.data && event.data.after && event.data.after.exists
    ? (event.data.after.data() || {}) : {};

  // Il codice compagnia e' una chiave di `compagnie-data.js`: lettere, cifre,
  // corta. Un valore che non ha quella forma non entra nel token — e non e'
  // una precauzione teorica: `users.compagnia` lo scrive il client.
  const grezza = typeof dopo.compagnia === "string" ? dopo.compagnia : "";
  const nuova = /^[A-Za-z0-9]{2,20}$/.test(grezza) ? grezza : "";

  /* ══ NON «SE E' CAMBIATA», MA «SE NON E' ANCORA APPLICATA» ════════════════
     (20/09/2026, corretto poche ore dopo averla scritta.) La prima stesura
     usciva subito se `prima.compagnia === dopo.compagnia`. Sembrava giusto —
     perche' rifare un lavoro gia' fatto? — ed era il difetto: il giorno della
     pubblicazione NESSUN iscritto ha il claim, e per nessuno di loro la
     compagnia sta per cambiare. Sarebbero rimasti tutti senza, per sempre,
     aspettando un cambio che non arriva.
     La domanda giusta non e' «e' cambiata», e' «quella nel token e' gia'
     questa?». La risposta sta in `claimApplicata`, che scrive SOLO il server:
     se manca, il claim va messo, e questo copre anche tutti quelli di prima.

     E NON SI AVVITA: la riga qui sotto riscrive `users/{uid}`, quindi questo
     trigger riparte una seconda volta — e la seconda volta `applicata` e'
     uguale a `nuova` e si esce alla prima riga. Due esecuzioni per cambio,
     non infinite. */
  const applicata = typeof dopo.claimApplicata === "string" ? dopo.claimApplicata : null;
  if (applicata === nuova) return;

  try {
    await admin.auth().setCustomUserClaims(uid, nuova ? { compagnia: nuova } : {});
    // `claimApplicata` dice COSA c'e' nel token, `claimAl` QUANDO ce l'abbiamo
    // messo: guardando un utente si capisce se il suo token e' gia' quello
    // nuovo senza aprire la console di Auth.
    await admin.firestore().collection("users").doc(uid).set({
      claimApplicata: nuova,
      claimAl: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // L'utente puo' essere stato cancellato fra la scrittura e questo trigger.
    // Non si riprova: al prossimo accesso l'app scrive di nuovo e si ripassa
    // di qui. Riprovare qui vorrebbe dire una coda da sorvegliare.
    console.error("claim compagnia per " + uid + ":", err && err.code ? err.code : err);
  }
});
