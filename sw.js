// ArcTrail 3D - service worker
// Strategia: prova sempre prima la rete (cosi chi ha connessione vede sempre
// l'ultima versione pubblicata su GitHub), usa la cache solo come riserva
// quando manca la connessione. Nessun numero di versione da aggiornare a mano.

// --- Firebase Cloud Messaging: notifiche push anche ad app chiusa ---
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB9SoSHGEMnF-a1QP78hYF9r9E553wYNhY",
  authDomain: "arctrail3d.firebaseapp.com",
  projectId: "arctrail3d",
  messagingSenderId: "185889526349",
  appId: "1:185889526349:web:0af3b386332664387c8204"
});

try {
  var messaging = firebase.messaging();
  messaging.onBackgroundMessage(function(payload){
    var title = (payload.notification && payload.notification.title) || "ArcTrail 3D";
    var body = (payload.notification && payload.notification.body) || "";
    self.registration.showNotification(title, {
      body: body,
      icon: "icon-192.png",
      badge: "icon-192.png"
    });
  });
} catch (e) {
  // se il browser non supporta Messaging in service worker, l'app continua
  // a funzionare normalmente: solo le notifiche non arriveranno
}

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

// --- Cache offline, invariata ---
var CACHE_NAME = "arctrail3d-cache";

self.addEventListener("install", function(event){
  // Attiva subito il nuovo service worker, senza aspettare che tutte le
  // schede vecchie vengano chiuse.
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET"){ return; }

  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match("index.html");
      });
    })
  );
});
