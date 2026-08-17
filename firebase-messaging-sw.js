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
// ── E POI L'AVVISO E' ARRIVATO DOPPIO LO STESSO. (17/08/2026, seconda passata.)
//
// Togliere la copia da sw.js era giusto ma non bastava, perche' il secondo
// avviso non lo disegnava un secondo file: lo disegnava l'SDK, dentro questo.
// Nel sorgente vero del pacchetto @firebase/messaging, la funzione che riceve
// il push fa queste due cose UNA DOPO L'ALTRA:
//
//     se il messaggio ha un blocco "notification"  ->  la mostra LUI
//     poi, comunque                                ->  chiama onBackgroundMessage
//
// In fila, non in alternativa. Il server manda un blocco "notification":
// quindi l'SDK ne disegnava una, e la funzione qui sotto — che quel blocco lo
// legge per ricavarne titolo e testo — ne disegnava un'altra. Due avvisi
// identici. Nemmeno il tag poteva salvarci: quello dell'SDK non ce l'ha, e due
// avvisi si sostituiscono solo se hanno LO STESSO tag.
//
// La correzione e' la prima riga della funzione. Ed e' scritta in modo da non
// avere un ordine di pubblicazione: vale sia col server di oggi (che manda il
// blocco, e allora si tace perche' ha gia' mostrato l'SDK) sia con un server
// che un domani mandasse soli dati (e allora si mostra noi, col tag e tutto).
// Un ordine di pubblicazione e' una cosa che qualcuno, prima o poi, sbaglia.
messaging.onBackgroundMessage(function(payload){
  // Se il messaggio porta un blocco "notification", l'ha GIA' mostrata l'SDK
  // qui sopra. Disegnarla di nuovo vuol dire due avvisi per una notizia sola.
  if (payload && payload.notification) return;

  var d = (payload && payload.data) || {};
  var title = d.title || "ArcTrail 3D";
  var body = d.body || "";
  // L'etichetta e' l'id del documento che ha fatto nascere l'avviso: con lo
  // stesso tag il sistema SOSTITUISCE invece di impilare, quindi la stessa
  // notizia non puo' comparire due volte nemmeno se arriva da due strade.
  // Senza tag, ripiego sul titolo: meglio raggruppare per argomento che non
  // raggruppare affatto.
  var tag = d.tag || d.notifId || title;
  self.registration.showNotification(title, {
    body: body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: tag,
    renotify: false,
    data: { link: d.link || "/" }
  });
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
