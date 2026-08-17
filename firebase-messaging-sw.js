// ArcTrail 3D - service worker dedicato a Firebase Cloud Messaging
// Firebase cerca questo file con questo nome esatto in automatico per
// gestire le notifiche push quando l'app non e' in primo piano.
// Il service worker principale (sw.js) resta invariato e gestisce cache/aggiornamenti.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB9SoSHGEMnF-a1QP78hYF9r9E553wYNhY",
  authDomain: "arctrail3d.firebaseapp.com",
  projectId: "arctrail3d",
  messagingSenderId: "185889526349",
  appId: "1:185889526349:web:0af3b386332664387c8204"
});

var messaging = firebase.messaging();

// QUESTO E' L'UNICO POSTO DA CUI ESCE UNA PUSH. (17/08/2026.) Lo stesso blocco
// stava anche dentro sw.js, e per un giorno ogni avviso e' arrivato doppio sul
// telefono. Se un giorno serve toccarlo, si tocca qui e basta: sw.js fa la
// cache e non sa niente di notifiche.
messaging.onBackgroundMessage(function(payload){
  var title = (payload.notification && payload.notification.title) || "ArcTrail 3D";
  var body = (payload.notification && payload.notification.body) || "";
  // L'etichetta e' l'id del documento che ha fatto nascere l'avviso: con lo
  // stesso tag il sistema SOSTITUISCE invece di impilare, quindi la stessa
  // notizia non puo' comparire due volte nemmeno se arriva da due strade.
  // Senza tag, ripiego sul titolo: meglio raggruppare per argomento che non
  // raggruppare affatto.
  var tag = (payload.data && payload.data.tag) || title;
  self.registration.showNotification(title, {
    body: body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: tag,
    renotify: false
  });
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList){
      for (var i = 0; i < clientList.length; i++){
        if ("focus" in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
