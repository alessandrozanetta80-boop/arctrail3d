// ArcTrail 3D — questo file NON e' piu' un service worker a se'.
//
// (17/08/2026, quarta passata.) Per una mattina intera il progetto ha creduto
// che le push le gestisse questo file, «perche' e' quello che Firebase cerca
// per nome». Non era vero, e il prezzo e' stato mezz'ora senza nessuna push:
// il blocco e' stato tolto da sw.js, e il push e' rimasto senza nessuno che lo
// ascolta — mentre le notifiche DENTRO l'app continuavano ad arrivare, il che
// rendeva il guasto quasi invisibile.
//
// PERCHE'. I due file, registrati senza indicare un ambito, prendono LO STESSO
// ambito: la radice. Due registrazioni sullo stesso ambito non convivono. E
//     navigator.serviceWorker.getRegistration("firebase-messaging-sw.js")
// non risponde «il file con quel nome»: risponde con la registrazione il cui
// AMBITO CONTIENE quell'indirizzo — e l'ambito di sw.js e' la radice, quindi
// contiene tutto. Il token del dispositivo finisce agganciato a sw.js.
//
// La cura non e' indovinare quale dei due vince: e' farli comportare uguale.
// Questo file adesso E' sw.js. Non e' stato cancellato perche' una copia
// vecchia di index.html, ferma nella cache di qualcuno, potrebbe ancora
// chiederlo per nome: se non lo trovasse, su quel telefono le notifiche
// smetterebbero e basta.
//
// Un nome solo per file vale anche quando i file sono due: allora uno dei due
// deve ESSERE l'altro.
//
// Una riga sola, di proposito: qui non deve nascere niente di nuovo.
importScripts("./sw.js");
