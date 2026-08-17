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

// --- Firebase Cloud Messaging: STA DI NUOVO QUI, ED E' L'UNICO POSTO ---
//
// (17/08/2026, quarta passata. Le prime tre stanno in NOTE-DESIGN.md.)
//
// Stamattina questo blocco e' stato tolto da qui, con questa motivazione: «le
// push le gestisce solo firebase-messaging-sw.js, che e' il file che Firebase
// cerca per nome». La motivazione era sbagliata, e il prezzo e' stato che per
// mezz'ora le push non sono arrivate PIU' AFFATTO — mentre le notifiche dentro
// l'app continuavano ad arrivare, il che rendeva il guasto quasi invisibile.
//
// PERCHE'. I due file, registrati senza indicare un ambito, prendono LO STESSO
// ambito: la radice. Due registrazioni sullo stesso ambito non convivono — una
// sostituisce l'altra. E index.html chiede
//     navigator.serviceWorker.getRegistration("firebase-messaging-sw.js")
// che NON risponde «il file con quel nome»: risponde con la registrazione il
// cui AMBITO CONTIENE quell'indirizzo. L'ambito di sw.js e' la radice, quindi
// contiene tutto. Quindi risponde sw.js, e il token del dispositivo — cioe' la
// sottoscrizione a cui il push viene consegnato — e' agganciato a QUESTO file.
// Toglierlo da qui voleva dire lasciare il push senza nessuno che lo ascolta.
//
// LA CURA NON E' INDOVINARE QUALE DEI DUE VINCE. E' farli comportare uguale:
// firebase-messaging-sw.js adesso e' una riga sola che carica questo file.
// Qualunque dei due sia attivo, il telefono si comporta allo stesso modo.
// Un nome solo per file vale anche quando i file sono due: allora uno dei due
// deve ESSERE l'altro.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB9SoSHGEMnF-a1QP78hYF9r9E553wYNhY",
  authDomain: "arctrail3d.firebaseapp.com",
  projectId: "arctrail3d",
  messagingSenderId: "185889526349",
  appId: "1:185889526349:web:0af3b386332664387c8204"
});

// GUARDARE, NON ASSUMERE.
//
// Il difetto di partenza: ogni avviso arrivava DOPPIO. Nel sorgente del
// pacchetto @firebase/messaging, la funzione che riceve il push fa due cose
// una dopo l'altra — se il messaggio ha un blocco "notification" la mostra
// LUI, e poi chiama COMUNQUE onBackgroundMessage. In fila, non in
// alternativa.
//
// La cura ovvia era tacere quando quel blocco c'e'. Provata: ZERO avvisi.
// Perche' quella riga si FIDAVA di sapere cosa fa l'SDK, e su questo telefono
// l'SDK non disegnava niente. Aver letto il sorgente rende una certezza
// migliore, non una certezza: il sorgente dice cosa il codice INTENDE fare.
//
// Quindi adesso non si assume, si GUARDA: prima di disegnare si chiede al
// sistema quali avvisi ci sono gia' in cima allo schermo. Uno identico c'e' ->
// si tace. Non c'e' -> si disegna. Non puo' finire a due, e non puo' finire a
// zero: se il sistema non sa nemmeno rispondere alla domanda, si disegna e
// basta. Meglio il rischio di due che la certezza di zero.
try {
  var messaging = firebase.messaging();
  messaging.onBackgroundMessage(function(payload){
    var p = payload || {};
    var d = p.data || {};
    var n = p.notification || {};

    // I dati vengono prima: arrivano interi. Il blocco "notification" arriva
    // scremato, ma se e' l'unico che c'e' e' meglio di niente.
    var title = d.title || n.title || "ArcTrail 3D";
    var body  = d.body  || n.body  || "";
    // L'etichetta e' l'id del documento che ha fatto nascere l'avviso: con lo
    // stesso tag il sistema SOSTITUISCE invece di impilare, quindi la stessa
    // notizia non puo' comparire due volte nemmeno se arriva da due strade.
    var tag = d.tag || d.notifId || title;

    var opzioni = {
      body: body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: tag,
      renotify: false,
      data: { link: d.link || "/" }
    };

    function disegna(){ return self.registration.showNotification(title, opzioni); }

    if (!self.registration.getNotifications) return disegna();

    return self.registration.getNotifications().then(function(gia){
      for (var i = 0; i < gia.length; i++){
        if (gia[i].tag === tag) return;
        if (gia[i].title === title && (gia[i].body || "") === body) return;
      }
      return disegna();
    }).catch(function(){ return disegna(); });
  });
} catch(e) {}

self.addEventListener("notificationclick", function(event){
  // Se l'avviso l'ha disegnato l'SDK, il suo gestore chiude l'evento prima di
  // arrivare qui. Questo vale per quelli disegnati sopra.
  var dati = event.notification.data || {};
  var dove = dati.link || "/";
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:"window", includeUncontrolled:true }).then(function(list){
      for(var i=0;i<list.length;i++){
        var c = list[i];
        if("focus" in c){
          // Una finestra c'e' gia': si porta davanti. Aprirne una seconda sullo
          // stesso sito e' il modo piu' rapido per far perdere il giro in corso.
          if(dove !== "/" && c.url.indexOf(dove) === -1 && "navigate" in c){
            return c.focus().then(function(cl){ return cl.navigate(dove).catch(function(){ return cl; }); });
          }
          return c.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(dove);
    })
  );
});

// ─────────────────────────── CACHE ───────────────────────────
// v7 (17/08/2026 sera). Il numero non si alza per abitudine: si alza perche'
// cambiando nome, `activate` cancella tutte le cache vecchie. E stasera era
// l'unico modo di buttare via una copia di `index.html` rimasta bloccata su
// una versione di due ore prima — vedi il commento su fromNetwork.
// Il service worker nuovo il telefono se lo prende da solo, perche' il
// browser rilegge SEMPRE questo file dalla rete: e' l'unica cosa che non
// passa dalla cache, ed e' per questo che la cura sta qui e non altrove.
var CACHE_NAME = "arctrail3d-v7";
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
//
// MA LA RISPOSTA ARRIVATA TARDI SI TIENE LO STESSO, e prima non era cosi'.
// (Corretto il 17/08/2026 sera, dopo che un aggiornamento non arrivava sul
// telefono per quante volte lo si riaprisse.)
//
// Il difetto, e perche' non si vedeva. Scaduti i tre secondi si serviva la
// copia in cache — giusto — ma quando la rete rispondeva un attimo dopo, il
// `if(done) return` buttava via la risposta SENZA METTERLA IN CACHE. Quindi
// la copia salvata restava quella vecchia, e al lancio successivo succedeva
// esattamente la stessa cosa. Su una connessione lenta l'aggiornamento non
// arrivava PIU', mai: non era un ritardo, era un blocco definitivo.
//
// `index.html` pesa un megabyte. Tre secondi in campo, in 4G scarso, non
// bastano quasi mai: e' proprio il file piu' importante quello che non
// riusciva mai a vincere la corsa.
//
// Adesso la corsa decide solo COSA SI MOSTRA ADESSO. Chi arriva tardi non
// vince il giro in corso, ma aggiorna la copia: al lancio dopo si apre la
// versione nuova. Una cache che non si aggiorna mai non e' una cache, e'
// una fotografia.
function fromNetwork(request, cache, ms){
  return new Promise(function(resolve, reject){
    var done = false;
    var timer = setTimeout(function(){ if(!done){ done = true; reject(new Error("timeout")); } }, ms);
    fetch(request).then(function(response){
      clearTimeout(timer);
      // PRIMA di guardare chi ha vinto: se e' roba buona, si tiene.
      if(response && response.status === 200){ cache.put(request, response.clone()); }
      if(done) return;
      done = true;
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
