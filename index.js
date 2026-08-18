// ArcTrail 3D — Cloud Functions
// Versione 2026-08-18-segnalazioni-e-iscrizioni
// Nata da: 2026-08-17-avvisi-doppi
//
// Cinque funzioni, con cinque compiti diversi:
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
// ORDINE DI APPLICAZIONE, da rispettare:
//   1) deploy di queste funzioni   (firebase deploy --only functions)
//   2) pubblicazione di index.html che chiama la callable
//   3) SOLO DOPO le nuove firestore.rules
// Al contrario, tutte le notifiche smettono di partire in silenzio.

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

// La regione deve combaciare con FUNCTIONS_REGION in index.html, altrimenti la
// chiamata parte verso us-central1 e torna "not-found".

const MAX_TITOLO = 120;
const MAX_TESTO = 500;
const LIMITE_AL_MINUTO = 40; // un invito ad allenamento ne manda uno per invitato

// ─────────────────────────────────────────────────────────────────────────────
// 1) SCRITTURA DELLA NOTIFICA — chiamata dall'app
// ─────────────────────────────────────────────────────────────────────────────
exports.sendNotification = onCall({ cors: true }, async (req) => {

  // Chi chiama deve essere autenticato. L'uid arriva dal token verificato dal
  // server, non da quello che dichiara il client: e' il punto chiave di tutto.
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Serve un accesso valido.");

  const d = req.data || {};
  const toUid = typeof d.toUid === "string" ? d.toUid.trim() : "";
  const title = typeof d.title === "string" ? d.title.trim().slice(0, MAX_TITOLO) : "";
  const body  = typeof d.body  === "string" ? d.body.trim().slice(0, MAX_TESTO)  : "";
  if (!toUid || !title) {
    throw new HttpsError("invalid-argument", "Servono toUid e title.");
  }

  const db = admin.firestore();

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
  await db.collection("notifications").doc(toUid).collection("items").add({
    title: title,
    body: body,
    read: false,
    fromUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

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

    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    const token = userSnap.exists ? userSnap.get("fcmToken") : null;
    if (!token) return; // l'utente non ha mai attivato le notifiche

    try {
      // L'ETICHETTA. Ogni avviso porta l'id del documento che l'ha fatto
      // nascere, e il service worker la passa a showNotification come `tag`.
      // Con lo stesso tag il sistema operativo SOSTITUISCE invece di impilare:
      // se per qualunque motivo la stessa notizia prendesse due strade — la
      // push vera e la copia locale che l'app mostra da se' quando e' aperta —
      // sullo schermo ne resta comunque UNA.
      // Scritta anche in `data` e non solo in `webpush.notification`, perche'
      // in `onBackgroundMessage` i campi di `notification` arrivano scremati
      // mentre `data` arriva sempre intero.
      const tag = event.params.itemId;
      await admin.messaging().send({
        token: token,
        notification: {
          title: d.title || "ArcTrail 3D",
          body: d.body || "",
        },
        data: { tag: tag },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: tag,
          },
          fcmOptions: { link: "https://arctrail3d.com" },
        },
      });
    } catch (err) {
      // Token scaduto o revocato (telefono cambiato, app disinstallata):
      // si cancella, altrimenti ogni notifica futura fallisce allo stesso modo.
      const code = err && err.errorInfo ? err.errorInfo.code : "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        await admin.firestore().collection("users").doc(uid)
          .update({ fcmToken: admin.firestore.FieldValue.delete() })
          .catch(() => {});
      } else {
        console.error("push fallita per", uid, err);
      }
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
    } catch (err) {
      // Esisteva: stesso annuncio, segnalazione successiva. Si aggiorna il
      // conteggio e NON si suona di nuovo.
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
