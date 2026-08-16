// ArcTrail 3D - service worker
//
// COSA E' CAMBIATO (16/08/2026) e perche'.
//
// 1) I CARATTERI ORA FUNZIONANO NEL BOSCO.
//    La versione precedente aveva questa riga:
//        if(url.origin !== self.location.origin) return;
//    cioe' "non intercettare niente che venga da fuori". Sembra prudente, ma
//    voleva dire che Outfit e Fraunces — che arrivano da fonts.gstatic.com —
//    non finivano MAI in cache. Senza campo l'app si presentava con il
//    carattere di sistema: nessuna delle scelte tipografiche fatte, proprio
//    nella situazione per cui l'app e' stata costruita.
//    Adesso c'e' un ELENCO di domini fidati (caratteri e librerie Firebase)
//    che vengono salvati e riusati. Tutto il resto — Firestore, login,
//    notifiche — passa liscio come prima: una risposta di Firestore in cache
//    sarebbe un dato vecchio spacciato per fresco, ed e' l'ultima cosa che
//    vogliamo su un'app di punteggi.
//
// 2) NIENTE PIU' ATTESA A VUOTO ALL'AVVIO.
//    "Network-first" senza limite di tempo, con una tacca di segnale che va e
//    viene, significa restare sulla schermata bianca finche' la richiesta non
//    scade da sola (a volte 30 secondi). Ora la rete ha 3 secondi: se non
//    risponde si parte dalla cache e si aggiorna al giro dopo. Sul percorso
//    l'app si apre subito, sempre.
//
// 3) LA PRIMA VOLTA SI SCARICA TUTTO.
//    Prima la cache si riempiva solo con quello che era gia' stato visitato.
//    Chi installava l'app a casa e la apriva la prima volta sul campo poteva
//    trovarsi senza pezzi. Ora all'installazione si scarica il necessario.

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

// ─────────────────────────── CACHE ───────────────────────────
var CACHE_NAME = "arctrail3d-v4";
var NET_TIMEOUT = 3000;

// Quello che serve per aprire l'app anche senza rete, al primo colpo.
var APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "logo.webp",
  "logo.jpg",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

// Domini esterni di cui teniamo copia: caratteri e librerie. NON i dati.
var CDN_OK = [
  "https://fonts.googleapis.com/",
  "https://fonts.gstatic.com/",
  "https://www.gstatic.com/firebasejs/"
];
function isCdn(url){
  for(var i=0;i<CDN_OK.length;i++){ if(url.indexOf(CDN_OK[i]) === 0) return true; }
  return false;
}

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // addAll() fallisce tutto se un solo file manca: qui ognuno per conto suo,
      // cosi' un'icona rinominata non impedisce l'installazione.
      return Promise.all(APP_SHELL.map(function(u){
        return cache.add(new Request(u, { cache: "reload" })).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
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

// Rete con tempo massimo: passato quello, si va di cache.
function fromNetwork(request, cache, ms){
  return new Promise(function(resolve, reject){
    var done = false;
    var timer = setTimeout(function(){ if(!done){ done = true; reject(new Error("timeout")); } }, ms);
    fetch(request).then(function(response){
      clearTimeout(timer);
      if(done) return;
      done = true;
      if(response && response.status === 200){ cache.put(request, response.clone()); }
      resolve(response);
    }).catch(function(err){
      clearTimeout(timer);
      if(!done){ done = true; reject(err); }
    });
  });
}

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  var url = event.request.url;
  var sameOrigin = (new URL(url).origin === self.location.origin);

  // Caratteri e librerie: PRIMA la cache. Non cambiano mai, e aspettare la
  // rete per un carattere vuol dire testo invisibile per mezzo secondo.
  if(!sameOrigin){
    if(!isCdn(url)) return;   // dati, login, notifiche: non si toccano
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache){
        return cache.match(event.request).then(function(hit){
          if(hit){
            // aggiornamento silenzioso per il prossimo avvio
            fetch(event.request).then(function(r){
              if(r && (r.status === 200 || r.type === "opaque")) cache.put(event.request, r.clone());
            }).catch(function(){});
            return hit;
          }
          return fetch(event.request).then(function(r){
            if(r && (r.status === 200 || r.type === "opaque")) cache.put(event.request, r.clone());
            return r;
          });
        });
      })
    );
    return;
  }

  // Roba nostra: prima la rete (cosi' gli aggiornamenti si vedono subito),
  // ma con il cronometro in mano.
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return fromNetwork(event.request, cache, NET_TIMEOUT).catch(function(){
        return cache.match(event.request).then(function(cached){
          return cached || caches.match("index.html") || caches.match("./");
        });
      });
    })
  );
});
