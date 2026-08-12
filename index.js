// ArcTrail 3D — invio notifiche push anche ad app chiusa.
// Si attiva da solo quando l'app scrive un documento in
// notifications/{uid}/items/{itemId}: legge il token FCM dell'utente
// (salvato su users/{uid}.fcmToken quando attiva le notifiche) e manda la push.
// Niente altro da cambiare nell'app: continua a scrivere come prima.

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

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
