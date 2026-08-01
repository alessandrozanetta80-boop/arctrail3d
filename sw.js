// ArcTrail 3D - service worker
// Strategia: prova sempre prima la rete (cosi chi ha connessione vede sempre
// l'ultima versione pubblicata su GitHub), usa la cache solo come riserva
// quando manca la connessione. Nessun numero di versione da aggiornare a mano.

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
