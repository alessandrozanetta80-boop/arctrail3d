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
//
// ── PRIMA CORREZIONE, E PERCHE' NON BASTAVA. (17/08, seconda passata.)
//
// Tolta la copia da sw.js, gli avvisi arrivavano doppi lo stesso. Nel sorgente
// del pacchetto @firebase/messaging la funzione che riceve il push fa due cose
// una dopo l'altra: se il messaggio ha un blocco "notification" la mostra LUI,
// e poi chiama COMUNQUE onBackgroundMessage. In fila, non in alternativa.
// Quindi il secondo avviso non lo disegnava un secondo file: lo disegnava
// l'SDK, dentro questo.
//
// ── SECONDA CORREZIONE, E LA LEZIONE VERA. (17/08, terza passata.)
//
// La cura era una riga: «se c'e' il blocco notification, taci — l'ha gia'
// mostrata l'SDK». Sul telefono di Alessandro il risultato e' stato ZERO
// avvisi. Cioe': quella riga si FIDAVA di sapere cosa fa l'SDK, e su quel
// telefono l'SDK non disegnava niente. Aver letto il sorgente rende una
// certezza migliore, non una certezza.
//
// Adesso non si assume: SI GUARDA. Prima di disegnare si chiede al sistema
// quali avvisi ci sono gia' in cima allo schermo. Se ce n'e' uno identico si
// tace, se non c'e' si disegna. Non puo' finire a due, e — questa e' la parte
// che mancava — NON PUO' FINIRE A ZERO.
//
// Regola, e vale oltre questo file: quando una decisione dipende da cosa ha
// fatto qualcun altro, la si prende guardando il risultato, non ricordando la
// regola. Un comportamento di libreria e' un'ipotesi anche quando e' scritto.
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
  // Senza tag, ripiego sul titolo: meglio raggruppare per argomento che non
  // raggruppare affatto.
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

  // Se il sistema non sa dire cosa c'e' gia' a schermo, si disegna e basta:
  // meglio il rischio di due che la certezza di zero.
  if (!self.registration.getNotifications) return disegna();

  return self.registration.getNotifications().then(function(gia){
    for (var i = 0; i < gia.length; i++){
      // Stessa etichetta, o stesso testo: e' la stessa notizia, gia' mostrata
      // da qualcun altro un istante fa. Non se ne aggiunge una seconda.
      if (gia[i].tag === tag) return;
      if (gia[i].title === title && (gia[i].body || "") === body) return;
    }
    return disegna();
  }).catch(function(){ return disegna(); });
});

self.addEventListener("notificationclick", function(event){
  // Nota: se l'avviso l'ha disegnato l'SDK, il suo gestore chiude l'evento
  // prima di arrivare qui. Questo vale per quelli disegnati sopra.
  var dati = event.notification.data || {};
  var dove = dati.link || "/";
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList){
      for (var i = 0; i < clientList.length; i++){
        var c = clientList[i];
        if ("focus" in c){
          // Una finestra c'e' gia': si porta davanti. Aprirne una seconda sullo
          // stesso sito e' il modo piu' rapido per far perdere il giro in corso.
          if (dove !== "/" && c.url.indexOf(dove) === -1 && "navigate" in c){
            return c.focus().then(function(cl){ return cl.navigate(dove).catch(function(){ return cl; }); });
          }
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(dove);
    })
  );
});
