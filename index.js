// ArcTrail 3D — Cloud Functions
// Versione 2026-08-17-push-dove-porta
// Nata da 2026-08-17-dove-porta
//
// Tre funzioni, con tre compiti diversi:
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
  const dest = destPulito(d.dest, uid);
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
  const doc = {
    title: title,
    body: body,
    read: false,
    fromUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (dest) doc.dest = dest;
  await db.collection("notifications").doc(toUid).collection("items").add(doc);

  return { ok: true };
});

// DOVE PORTA LA NOTIFICA, ripulito.
// L'app scrive `dest` dentro il documento e il centro notifiche ci si
// aggancia: toccare l'avviso apre la cosa che l'ha fatto nascere invece di
// lasciarla cercare. Qui si decide cosa e' lecito scriverci.
//
// DUE FORME SOLE, e non una in piu'. Un campo libero che dice all'app dove
// andare e' una superficie d'attacco: si accetta un elenco chiuso, tutto il
// resto diventa `null` e la notifica arriva senza tasto — cioe' come prima.
//
// E PER LA CHAT L'UID LO METTE IL SERVER. Se lo scegliesse chi manda,
// chiunque potrebbe recapitare un avviso che dice «apri la conversazione con
// X» puntando a un altro: e' esattamente la porta che si e' chiusa mettendo
// `fromUid` qui dentro invece che sul telefono. Il valore dichiarato dal
// client si butta via senza guardarlo.
function destPulito(d, mittente) {
  // Il tetto sta DENTRO la regola che lo usa: e' l'unico posto che lo
  // guarda, e cosi' il banco puo' prendersi la funzione da sola.
  const MAX_ID = 128;
  if (!d || typeof d !== "object") return null;
  if (d.k === "dm") return { k: "dm", uid: mittente };
  if (d.k === "annuncio") {
    const id = typeof d.id === "string" ? d.id.trim().slice(0, MAX_ID) : "";
    return id ? { k: "annuncio", id: id } : null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DA `dest` A UN INDIRIZZO — cioe' dove porta l'avviso che compare in cima
// allo schermo ad app chiusa.
//
// PERCHE' ESISTE (17/08/2026, notte). Dentro l'app il tasto che porta alla
// chat o all'annuncio c'era gia'. Fuori no: toccare la striscia in cima allo
// schermo apriva l'app e basta, sulla pagina iniziale. E il service worker
// sapeva GIA' fare la cosa giusta — `notificationclick` legge `dati.link` e se
// c'e' ci naviga invece di limitarsi a portare avanti la finestra. Solo che
// nessuno glielo mandava, quel link.
//
// *Meta' del lavoro fatta e dalla parte sbagliata* e' lo stesso identico
// difetto trovato stamattina al contrario: allora il server scriveva `dest` e
// nessuno lo leggeva, qui c'e' chi legge e nessuno scrive. **Non e' una
// coincidenza: e' la forma che prende un lavoro interrotto a meta'**, e in
// tutti e due i casi e' rimasto cosi' per giorni senza che si vedesse niente
// di rotto. Un pezzo che non c'e' non da' errore: da' silenzio.
//
// LE FORME SONO LE STESSE DI destPulito, E NON PER PIGRIZIA. Se qui nascesse
// un terzo caso, esisterebbe un avviso che dentro l'app porta da una parte e
// da fuori da un'altra. `dest` ha gia' un solo posto in cui si decide cosa e'
// lecito: questa funzione traduce, non giudica.
//
// L'INDIRIZZO E' ASSOLUTO perche' `clients.openWindow` puo' partire senza
// nessuna finestra aperta, e in quel caso non c'e' niente rispetto a cui un
// indirizzo relativo abbia senso.
const SITO = "https://arctrail3d.com";

function linkDaDest(dest) {
  if (!dest || typeof dest !== "object") return SITO;
  if (dest.k === "annuncio" && dest.id) {
    return SITO + "/marketplace.html?annuncio=" + encodeURIComponent(dest.id);
  }
  // Per la chat non c'e' ancora un indirizzo che apra la conversazione: l'app
  // e' una pagina sola e la schermata non si sceglie da fuori. Si apre la
  // pagina iniziale, come prima, e il tasto nel centro notifiche resta la
  // strada buona. DICHIARATO qui perche' non sembri una dimenticanza: il
  // giorno che l'app sapra' aprirsi su una chat, questa riga e' il posto.
  return SITO;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) PUSH ANCHE AD APP CHIUSA
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
      // Dove porta questo avviso. `d.dest` e' stato ripulito da destPulito
      // prima di finire nel documento, quindi qui non serve controllarlo di
      // nuovo: si traduce e basta.
      const dove = linkDaDest(d.dest);
      await admin.messaging().send({
        token: token,
        notification: {
          title: d.title || "ArcTrail 3D",
          body: d.body || "",
        },
        // `link` sta in `data` perche' e' li' che lo cerca il service worker:
        // in `notificationclick` legge `event.notification.data.link`. Il
        // campo `fcmOptions.link` qui sotto serve all'altro caso — quando la
        // striscia la disegna l'SDK di Firebase invece del nostro codice.
        // Sono due strade che portano allo stesso posto, e devono portare
        // allo STESSO posto: percio' e' la stessa variabile, non due valori
        // scritti a mano che un giorno divergono.
        data: { tag: tag, link: dove },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: tag,
          },
          fcmOptions: { link: dove },
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
        // `adId` c'era gia' e il centro notifiche lo legge ancora, per le
        // notifiche scritte prima di oggi. `dest` e' la strada nuova, uguale
        // per tutti i tipi di avviso: due letture diverse per la stessa cosa
        // divergono sempre, quindi la vecchia resta solo come ripiego.
        dest: { k: "annuncio", id: adId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(function (err) { console.error("avviso non scritto per", c.uid, err); });
    }
  }
);
