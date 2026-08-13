// ArcTrail 3D — Cloud Functions
// Versione 2026-08-13-notifiche
//
// Due funzioni, con due compiti diversi:
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
      await admin.messaging().send({
        token: token,
        notification: {
          title: d.title || "ArcTrail 3D",
          body: d.body || "",
        },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
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
