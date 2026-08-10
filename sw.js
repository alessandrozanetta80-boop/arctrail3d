// ArcTrail 3D - service worker
// Strategia: network-first. Prova sempre la rete; usa la cache solo se
// offline. Così ogni aggiornamento pubblicato su GitHub è visibile
// al caricamento successivo, senza aspettare un secondo giro.

// --- Firebase Cloud Messaging ---
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
    var body  = (payload.notification && payload.notification.body)  || "";
    self.registration.showNotification(title, {
      body: body, icon: "icon-192.png", badge: "icon-192.png"
    });
  });
} catch(e) {}

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:"window", includeUncontrolled:true }).then(function(list){
      for(var i=0;i<list.length;i++){ if("focus" in list[i]) return list[i].focus(); }
      if(clients.openWindow) return clients.openWindow("/");
    })
  );
});

// --- Cache offline ---
var CACHE_NAME = "arctrail3d-v2";

self.addEventListener("install", function(event){
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Network-first: scarica dalla rete, salva in cache, restituisce.
// Se la rete fallisce, usa la cache. Se anche la cache manca, index.html.
// Non viene mai restituita una risposta non-2xx dalla rete.
self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;

  // Non intercettare richieste esterne (Firebase, CDN, ecc.)
  var url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return fetch(event.request).then(function(response){
        if(response && response.status === 200){
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(function(){
        return cache.match(event.request)
          .then(function(cached){ return cached || caches.match("index.html"); });
      });
    })
  );
});
