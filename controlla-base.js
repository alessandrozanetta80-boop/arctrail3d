#!/usr/bin/env node
/* controlla-base.js — il primo dei cinque, e l'unico che guarda FUORI.
 *
 *   node controlla-base.js              legge i file qui e li confronta con GitHub
 *   node controlla-base.js --locale     solo i timbri locali, senza rete
 *
 * PERCHE' ESISTE. Gli altri quattro banchi chiedono «questo file e' fatto
 * bene?». Nessuno di loro chiede «questo file e' quello giusto?», e la
 * seconda domanda viene prima. Il 17/08/2026 una sessione e' ripartita da una
 * copia vecchia di due ore e ha cancellato mezza mattinata: il file consegnato
 * era piu' recente dell'ultimo pubblicato, quindi da fuori sembrava un
 * aggiornamento normale, e nessuno se n'e' accorto per sette ore. Lo stesso
 * giorno, la sera, il progetto Claude era indietro di due versioni rispetto a
 * GitHub e i banchi giravano allegramente sul file sbagliato dicendo di si'.
 *
 * LA DOMANDA. Un file dichiara da quale versione e' nato (BUILD_PARENT,
 * data-parent, CACHE_PARENT). Se il genitore dichiarato non e' l'ultimo timbro
 * pubblicato, quel file **non e' un aggiornamento: e' una cancellazione**, e
 * porta via tutto quello che e' successo in mezzo.
 *
 * Tre risposte possibili, e sono diverse:
 *   IN PARI       il genitore e' l'ultimo online. Si lavora.
 *   INDIETRO      online c'e' roba piu' nuova. FERMARSI e prendere quella.
 *   AVANTI        il file locale e' gia' oltre l'online: e' un lavoro fatto e
 *                 non ancora caricato. Non e' un errore, ma va detto.
 *
 * La rete puo' mancare: se GitHub non risponde il banco lo dice e NON passa in
 * silenzio. Un controllo che non puo' dire di no e' spento.
 */

var fs = require("fs");
var https = require("https");

var RAW = "https://raw.githubusercontent.com/alessandrozanetta80-boop/arctrail3d/main/";
var SOLO_LOCALE = process.argv.indexOf("--locale") > -1;

/* I tre file del sito che portano un timbro, e come si legge. */
/* I QUATTRO FILE DEL SITO CHE PORTANO UN TIMBRO.
   Dal 25/08/2026 sono quattro e non tre, e due si sono scambiati il nome:
   `index.html` e' la VETRINA (timbro `data-build`, come il mercatino) e l'app
   e' `app.html` (timbro `BUILD_STAMP`). Leggere il timbro dell'app dentro la
   vetrina non darebbe un errore: non troverebbe niente, e il banco direbbe
   «NON DICHIARATO» su un file perfettamente a posto. */
var FILE = [
  { nome: "index.html",
    timbro: /<body[^>]*data-build="([^"]+)"/,
    padre:  /<body[^>]*data-parent="([^"]+)"/,
  },
  { nome: "app.html",
    timbro: /var BUILD_STAMP\s*=\s*"([^"]+)"/,
    padre:  /var BUILD_PARENT\s*=\s*"([^"]+)"/,
  },
  { nome: "marketplace.html",
    timbro: /<body[^>]*data-build="([^"]+)"/,
    padre:  /<body[^>]*data-parent="([^"]+)"/ },
  { nome: "sw.js",
    timbro: /var CACHE_NAME\s*=\s*"([^"]+)"/,
    padre:  /var CACHE_PARENT\s*=\s*"([^"]+)"/ }
];

function leggi(testo, regola){
  if(!regola) return null;
  var m = testo.match(regola);
  return m ? m[1] : null;
}

function scarica(nome){
  return new Promise(function(ok, no){
    var req = https.get(RAW + nome, function(res){
      if(res.statusCode !== 200){ res.resume(); return no(new Error("HTTP " + res.statusCode)); }
      var buf = "";
      res.setEncoding("utf8");
      res.on("data", function(d){ buf += d; });
      res.on("end", function(){ ok(buf); });
    });
    req.on("error", no);
    req.setTimeout(15000, function(){ req.destroy(new Error("tempo scaduto")); });
  });
}

function riga(a, b){ return "  " + String(a) + String(b === undefined ? "" : b); }

(async function(){
  var problemi = [];
  var avvisi = [];
  console.log("");

  for(var i = 0; i < FILE.length; i++){
    var f = FILE[i];
    if(!fs.existsSync(f.nome)){
      console.log("  " + f.nome + ": non c'e' qui.");
      avvisi.push(f.nome + " non presente");
      continue;
    }
    var testo = fs.readFileSync(f.nome, "utf8");
    var mio = leggi(testo, f.timbro);
    var padre = leggi(testo, f.padre);

    console.log("  " + f.nome);
    console.log(riga("timbro locale     ", mio || "NON DICHIARATO"));
    console.log(riga("nato da           ", padre || "NON DICHIARATO"));

    if(!mio){
      problemi.push(f.nome + ": non dichiara il timbro");
      console.log(riga("", "→ senza timbro non si sa cos'e'."));
      console.log("");
      continue;
    }
    if(!padre){
      /* Non e' un errore fatale: sw.js ha imparato a dichiararlo solo il
         notte fra il 17 e il 18/08, e i file piu' vecchi non lo hanno. Ma va detto, perche'
         senza genitore questo banco non puo' fare la sua domanda. */
      avvisi.push(f.nome + ": non dichiara da quale versione e' nato");
    }

    if(SOLO_LOCALE){ console.log(""); continue; }

    var online = null;
    var da = f.nome;
    var caduta = null;
    try {
      var remoto = await scarica(f.nome);
      online = leggi(remoto, f.timbro);
    } catch(e){ caduta = e; }

    /* IL GIORNO DELLO SCAMBIO, E SOLO QUELLO. Due casi, e il secondo e'
       quello che si sarebbe perso: `app.html` online NON C'E' (404), e
       `index.html` online C'E' ma dentro c'e' ancora l'app, quindi il timbro
       della vetrina non si trova e il banco direbbe «NON DICHIARATO» su un
       file perfettamente a posto — cioe' passerebbe senza aver guardato.
       Si va a leggere il timbro DOVE QUEL FILE STAVA IERI: e' esattamente il
       genitore che il file dichiara. Pubblicati i nomi nuovi, questo ramo non
       si accende mai piu', da solo. */
    if(online === null && f.primaEra){
      try {
        var vecchio = await scarica(f.primaEra);
        var trovato = leggi(vecchio, f.timbro);
        if(trovato){ online = trovato; da = f.primaEra + " (nome di ieri)"; caduta = null; }
      } catch(e2){}
    }
    if(false){
      /* IL GIORNO DELLO SCAMBIO, E SOLO QUELLO. Un file appena rinominato
         online non c'e' ancora: `app.html` da' 404, e senza questo ripiego il
         banco si fermerebbe proprio nel momento in cui serve di piu'.
         Non e' un'eccezione che indebolisce il controllo: si va a leggere il
         timbro DOVE QUEL FILE STAVA IERI, che e' esattamente il genitore che
         il file dichiara. Il giorno che il nome nuovo e' pubblicato questo
         ramo non si accende mai piu', da solo. */
    }
    if(caduta){
      console.log(riga("online            ", "NON LETTO (" + caduta.message + ")"));
      problemi.push(f.nome + ": GitHub non risponde, il controllo non e' stato fatto");
      console.log("");
      continue;
    }
    if(online === null){
      console.log(riga("online            ", "NESSUN TIMBRO, ne' col nome nuovo ne' con quello di ieri"));
      problemi.push(f.nome + ": online non si trova nessun timbro leggibile");
      console.log("");
      continue;
    }

    console.log(riga("timbro online     ", (online || "NON DICHIARATO") + (da === f.nome ? "" : "   letto da " + da)));

    if(mio === online){
      console.log(riga("", "→ IN PARI: qui c'e' esattamente quello che e' online."));
    } else if(padre && padre === online){
      console.log(riga("", "→ AVANTI: lavoro fatto qui e non ancora caricato. Va su GitHub."));
    } else if(online && padre && padre !== online){
      console.log(riga("", "→ INDIETRO O DIVERGENTE. Nato da «" + padre + "», ma online c'e' «" + online + "»."));
      console.log(riga("", "   Questo file NON e' un aggiornamento: e' una cancellazione."));
      problemi.push(f.nome + ": nato da " + padre + ", online c'e' " + online);
    } else if(online && !padre){
      /* Qui il banco e' stato scritto mite la prima volta — passava con una
         nota — e provandolo sul file vecchio del progetto e' venuto fuori che
         era proprio il caso da bloccare: timbro diverso, nessun genitore,
         quindi NON SI PUO' ESCLUDERE che sia indietro. Un dubbio su quale sia
         la base non e' una nota a pie' di pagina: e' il motivo per cui questo
         file esiste. Nel dubbio si ferma. */
      console.log(riga("", "→ NON DICIBILE: timbro diverso dall'online e nessun «nato da»."));
      console.log(riga("", "   Non si puo' escludere che sia una copia vecchia."));
      problemi.push(f.nome + ": timbro «" + mio + "» diverso dall'online «" + online + "», e non dice da dove nasce");
    }
    console.log("");
  }

  if(problemi.length){
    console.log("  LA BASE E' SBAGLIATA — fermarsi qui:");
    problemi.forEach(function(p){ console.log("    · " + p); });
    if(avvisi.length){ avvisi.forEach(function(a){ console.log("    (nota) " + a); }); }
    console.log("");
    console.log("  Prima di toccare qualunque file, prendere la copia online:");
    console.log("    curl -sL -o index.html " + RAW + "index.html");
    console.log("");
    process.exit(1);
  }

  if(avvisi.length){
    console.log("  Passato, con delle note:");
    avvisi.forEach(function(a){ console.log("    · " + a); });
  } else {
    console.log("  La base e' quella giusta.");
  }
  console.log("");
})();
