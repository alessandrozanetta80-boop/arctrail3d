#!/usr/bin/env node
/* controlla-token.js — il guardiano delle regole non negoziabili.
 *
 * Una regola applicata solo dalla memoria di chi scrive e' un bug con un
 * timer. Questo file e' il timer disinnescato: sei domande, una passata sul
 * file, uscita con codice 1 se qualcuna ha risposta.
 *
 *   node controlla-token.js [index.html]
 *   node controlla-token.js --fissa   registra i numeri di oggi come tetto
 *
 * Il tetto serve perche' il file parte gia' in violazione (618 style=, 141
 * misure fuori scala...). Senza tetto il controllo direbbe sempre "no" e
 * verrebbe spento entro una settimana. Con il tetto dice "no" solo quando
 * un numero PEGGIORA: la cricca si stringe, non si apre mai.
 */

var fs = require("fs");
var FILE = process.argv.filter(function(a){ return a.indexOf("-") !== 0; })[2] || "index.html";
/* Il tetto sta in `.tetto-token.json`, ma un file che comincia col punto si
   perde: non entra in uno zip, non si vede in un elenco, e chi lo copia da una
   macchina all'altra lo lascia indietro. Quando manca, il guardiano prendeva i
   numeri di oggi come tetto e diceva «niente e' peggiorato» **sempre**: un
   controllo che non puo' dire di no e' spento, e non lo sa nessuno.
   Adesso i due nomi valgono uguale, e se non c'e' ne' l'uno ne' l'altro il
   guardiano lo dice ad alta voce invece di passare in silenzio. */
var TETTI = [".tetto-token.json", "tetto-token.json"];
var TETTO = TETTI.filter(function(p){ return fs.existsSync(p); })[0] || TETTI[0];
var FISSA = process.argv.indexOf("--fissa") > -1;
var ELENCA = process.argv.indexOf("--elenca") > -1;

var righe = fs.readFileSync(FILE, "utf8").split("\n");

/* Una regola non deve scattare su un commento. Questo file di note e' pieno
   di frasi come «niente !important» e «era un #1d5fd1 scritto a mano»: se il
   controllo le contasse, punirebbe proprio chi ha spiegato la regola.
   `nude` e' il file senza commenti, riga per riga, allineato all'originale. */
var nude = (function(){
  var dentro = false;
  return righe.map(function(r){
    var out = "", i = 0;
    while(i < r.length){
      if(dentro){
        var fine = r.indexOf("*/", i);
        if(fine === -1){ i = r.length; } else { dentro = false; i = fine + 2; }
      } else {
        var apre = r.indexOf("/*", i);
        var linea = r.indexOf("//", i);
        if(linea > -1 && (apre === -1 || linea < apre) && !/[:"'`]\s*$/.test(r.slice(0, linea))){ out += r.slice(i, linea); break; }
        if(apre === -1){ out += r.slice(i); break; }
        out += r.slice(i, apre); dentro = true; i = apre + 2;
      }
    }
    return out;
  });
})();

/* ── le tre regioni del file ──────────────────────────────────────────────
   Le stesse tre di cui parlano le note. Si trovano dai marcatori gia'
   scritti nel foglio di stile, non da numeri di riga: cosi' non scadono al
   primo inserimento. */
function trova(re, da){ for(var i=(da||0); i<righe.length; i++){ if(re.test(righe[i])) return i; } return -1; }

/* TUTTI i blocchi di stile, non il primo. (27/08/2026, C13.) Qui c'era
   `trova(/<style>/)`, che pigliava una riga sola e per giunta solo il tag
   nudo: i blocchi con un attributo — `<style id="home-compatta-v2">` — non
   li vedeva nemmeno. In `app.html` erano 246 righe di CSS su cui il guardiano
   NON guardava, e ha detto «niente e' peggiorato» mentre una scritta
   diventava illeggibile. *Un controllo che guarda un quarto del file dice una
   cosa vera su un quarto del file, e chi legge la prende per intera.* */
var zoneCss = (function(){
  var z = [], apre = -1;
  for(var i=0; i<righe.length; i++){
    if(apre < 0 && /<style\b[^>]*>/.test(righe[i])) apre = i;
    else if(apre >= 0 && /<\/style>/.test(righe[i])){ z.push([apre, i]); apre = -1; }
  }
  if(apre >= 0) z.push([apre, righe.length]);   // blocco non chiuso: si guarda lo stesso
  return z;
})();
var cssDa      = zoneCss.length ? zoneCss[0][0] : -1;
var cssA       = zoneCss.length ? zoneCss[0][1] : -1;
var primitiviDa= trova(/[\u2500\u2550]{3,}\s*STRATO 1/, cssDa);
var primitiviA = trova(/[\u2500\u2550]{3,}\s*STRATO 2/, primitiviDa);
var jsDa       = trova(/<script/, zoneCss.length ? zoneCss[zoneCss.length-1][1] : 0);

var inCss       = function(i){
  for(var k=0; k<zoneCss.length; k++) if(i > zoneCss[k][0] && i < zoneCss[k][1]) return true;
  return false;
};
var inPrimitivi = function(i){ return i > primitiviDa && i < primitiviA; };
/* Uno stile che stesse DOPO il primo copione resterebbe stile, non codice:
   la seconda condizione evita di contarlo due volte se un giorno succede. */
var inJs        = function(i){ return i > jsDa && !inCss(i); };

/* Le zone dove una regola e' sospesa di proposito: stampa e movimento
   ridotto. Si riconoscono dall'@media che le apre; valgono fino alla riga in
   cui le graffe tornano in pari. */
var esenti = {};
(function(){
  for(var i=0; i<righe.length; i++){
    if(!inCss(i)) continue;
    if(!/@media\s*(print|\(prefers-reduced-motion)/.test(nude[i])) continue;
    var liv = 0, j = i;
    do{
      esenti[j] = true;
      liv += (nude[j].match(/{/g)||[]).length - (nude[j].match(/}/g)||[]).length;
      j++;
    } while(j < righe.length && liv > 0);
    i = j - 1;
  }
})();

/* ── le sei domande ───────────────────────────────────────────────────────
   dove: quale regione guardare · cerca: cosa la viola · salvo: le eccezioni
   dichiarate, che restano dichiarate e non diventano abitudine. */
/* La scala vale per le SPAZIATURE. Il lookbehind serve a non far scattare la
   regola dentro `border-top:1px`: un filo da un pixel non e' una misura di
   spaziatura, ed e' giusto che sia 1 — portarlo a 4 per rispettare la scala
   sarebbe rispettare la lettera contro il disegno. Trovato il 15/08/2026,
   quando la regola ha protestato per una riga di separazione. */
var SCALA = /(?<![a-z-])(?:gap|margin|padding|top|right|bottom|left|inset)[a-z-]*\s*:\s*[^;{}]*?(?<!\d)(?:[13579]|1[013579]|2[0135679]|3[013456789]|[4-9]\d)px/;

var REGOLE = [
  { nome: "stile in linea dal JS",
    dove: inJs,
    cerca: /\bstyle=/,
    perche: "lo stile in linea vince sul foglio e si riprende solo a colpi di !important" },

  { nome: "esadecimale fuori dai primitivi",
    dove: function(i){ return (inCss(i) || inJs(i)) && !inPrimitivi(i); },
    cerca: /#[0-9a-fA-F]{3,8}\b/,
    salvo: /croce\(|impactMarker|id="|url\(#|&#|\bhref|#app\b|#[0-9a-fA-F]*[g-z]/,
    perche: "una tinta nuova si aggiunge ai primitivi, non dentro un componente" },

  { nome: "!important fuori da stampa e movimento ridotto",
    dove: function(i){ return inCss(i) && !esenti[i]; },
    cerca: /!important/,
    perche: "e' una vittoria per specificita', non per struttura" },

  { nome: "regola per tema (body.theme-)",
    dove: inCss,
    cerca: /body\.theme-[a-z]+\s+\S/,
    perche: "se un valore cambia col tema, quel valore e' un token" },

  { nome: "misura fuori dalla scala 4/8/12/16/24/32/48",
    dove: inCss,
    cerca: SCALA,
    perche: "se una misura non ci sta, si cambia il disegno" },

  { nome: "clamp() su un carattere",
    dove: inCss,
    cerca: /font-size\s*:\s*[^;{}]*clamp\(/,
    perche: "la misura del testo sta nella scala --t-*, non in una formula" },

  /* IL CARATTERE SCRITTO A MANO DENTRO UNO STILE IN LINEA.
     (20/08/2026.) Il 20/08 il conto era 239 misure a mano con TRENTA valori
     diversi, e i primi otto stavano tutti dentro due pixel e mezzo: 0.85,
     0.82, 0.80, 0.78, 0.75, 0.72, 0.70, 0.68. Nessuno vede la differenza fra
     0.78 e 0.80 — non erano decisioni, era rumore. Ma erano rumore CARO:
     finche' esistono, la tipografia dell'app non si puo' cambiare da un posto
     solo, e una revisione del disegno diventa duecento modifiche a mano.

     IL TETTO NON E' ZERO, E NON DEVE ESSERLO. Restano fuori di proposito:
     il copione di soccorso in cima al <body>, che disegna «si e' verificato
     un problema» proprio quando il foglio di stile potrebbe essere quello
     rotto — un token li' sarebbe una dipendenza da cio' che si e' appena
     rotto; e la bandierina della federazione, che e' a 1.15em cioe' *un po'
     piu' grande del testo che ha accanto*, e nessun gradino di scala lo sa
     dire. Il tetto serve a questo: non a pretendere zero, a non far risalire
     il numero. */
  { nome: "carattere a mano nello stile in linea",
    dove: inJs,
    cerca: /style="[^"]*font-size:\s*(?!var\()/,
    perche: "la misura del testo sta nella scala --t-*, o non si potra' piu' cambiare da un posto solo" },

  /* IL RAGGIO SCRITTO A MANO.
     (20/08/2026.) Erano 84 punti fra foglio e stile in linea, e coincidevano
     ESATTAMENTE con un token: 10px E' --r-sm, non ci assomiglia. Portarli
     dentro non ha spostato un pixel, e da adesso la forma degli angoli si
     cambia da un posto solo.

     IL TETTO NON E' ZERO, E BUONA PARTE NON DEVE ANDARCI. Restano fuori:
     `50%`, che non e' una misura su una scala ma una forma — vuol dire *un
     cerchio*, e resta vero anche se domani i token cambiano tutti; `0`, che
     vuol dire *squadrato*, idem; e il copione di soccorso, per la stessa
     ragione dei caratteri. Quello che invece e' debito vero sono i dodici
     valori che nessun gradino copre — 14px sei volte, e poi 3, 5, 6, 9, 15,
     18 una ciascuno. Sono gli unici che il tetto deve poter far scendere.

     *Il 18px e' il raggio del riquadro, cioe' la superficie piu' vista
     dell'app, e sta fuori dalla scala.* Non e' stato spostato di sfuggita:
     e' una decisione di disegno, e va presa guardando, non contando. */
  { nome: "raggio a mano",
    dove: function(i){ return inCss(i) || inJs(i); },
    cerca: /border-radius:\s*(?!var\()/,
    salvo: /border-radius:\s*(?:50%|0)\s*[;"'}]/,
    perche: "la forma degli angoli sta nella scala --r-*, o non si potra' piu' cambiare da un posto solo" },

  /* LA SPAZIATURA SCRITTA A MANO DENTRO UNO STILE IN LINEA.
     (20/08/2026.) Duecentotre punti sono passati ai token --s-* senza
     spostare un pixel: erano gia' 4, 8, 12, 16, 24, cioe' gia' sulla scala,
     solo scritti col numero invece che col nome.

     QUELLO CHE RESTA NON E' RUMORE, E' UN'ALTRA GRIGLIA. I valori piu'
     frequenti fra quelli rimasti sono 10 (87 volte), 6 (61), 14 (39) e 2
     (18): sono tutti i punti DI MEZZO fra i gradini. L'app e' stata
     costruita per mesi su una griglia da 2; la scala dichiarata e' da 4.
     Sceglierne una sposta duecento distanze di due pixel l'una, e non e'
     una cosa che si decide contando — si decide guardando.
     Il tetto quindi NON deve scendere a zero per forza: deve solo non
     risalire finche' quella decisione non e' presa. */
  { nome: "spaziatura a mano nello stile in linea",
    dove: inJs,
    cerca: /style="[^"]*(?:margin|padding|gap)[a-z-]*:\s*(?!var\(|0[;"]|auto)/,
    perche: "la distanza sta nella scala --s-*, o il ritmo non si potra' piu' cambiare da un posto solo" }
];

/* ── la passata ──────────────────────────────────────────────────────── */
var trovato = {}, dettaglio = {};
REGOLE.forEach(function(r){
  trovato[r.nome] = 0; dettaglio[r.nome] = [];
  for(var i=0; i<righe.length; i++){
    if(!r.dove(i)) continue;
    if(r.salvo && r.salvo.test(nude[i])) continue;
    var n = (nude[i].match(new RegExp(r.cerca.source, "g")) || []).length;
    if(!n && r.cerca.test(nude[i])) n = 1;
    if(n){ trovato[r.nome] += n; if(dettaglio[r.nome].length < (ELENCA ? 999 : 3)) dettaglio[r.nome].push((i+1)+": "+righe[i].trim().slice(0,88)); }
  }
});


/* ══════════════════════════════════════════════════════════════════════════
   LA SETTIMA DOMANDA: LE FUNZIONI CHIAMATE ESISTONO?

   Il 15/08/2026 e' stato pubblicato un file che chiamava pistaSpazio() senza
   che quella funzione esistesse: uno script di modifica si era interrotto a
   meta' e aveva scritto la chiamata ma non la definizione. `node --check`
   diceva OK — la sintassi era perfetta — e la schermata del percorso mostrava
   la sola testata, tutto il resto vuoto. Un ReferenceError a mezzo ridisegno
   non lascia niente a schermo e non lascia niente nemmeno nei log, se nessuno
   apre la console.

   Questa domanda non ha un tetto: non e' debito di stile, e' un file rotto.
   Qualunque numero sopra zero esce con 1.

   Come fa a non gridare al lupo: conosce i nomi dichiarati nel file (function
   X, var X = function), i parametri di ogni funzione (che sono chiamabili e
   non dichiarati altrove), e una lista di nomi del linguaggio e del browser.
   Le chiamate a metodo (qualcosa.metodo) non le guarda affatto. */
function funzioniFantasma(testo){
  var noti = {};
  var re;
  re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  var m; while((m = re.exec(testo))) noti[m[1]] = 1;
  re = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g;
  while((m = re.exec(testo))) noti[m[1]] = 1;
  // i parametri: chiamabili senza essere dichiarati
  re = /function\s*[A-Za-z_$\w$]*\s*\(([^)]*)\)/g;
  while((m = re.exec(testo))){
    m[1].split(",").forEach(function(pz){
      var n = pz.trim().replace(/[^\w$].*$/, "");
      if(n) noti[n] = 1;
    });
  }
  ["if","for","while","switch","catch","return","typeof","function","new","do",
   "else","in","of","case","delete","void","await","yield","throw",
   "parseInt","parseFloat","isNaN","isFinite","String","Number","Boolean","Array",
   "Object","Date","Math","JSON","RegExp","Error","Promise","Map","Set","Symbol",
   "setTimeout","setInterval","clearTimeout","clearInterval","requestAnimationFrame",
   "cancelAnimationFrame","fetch","alert","confirm","prompt","encodeURIComponent",
   "decodeURIComponent","btoa","atob","structuredClone","queueMicrotask",
   "document","window","navigator","localStorage","console","firebase","eval",
   "URL","Blob","FileReader","Intl","BigInt","Proxy","Reflect","WeakMap"
  ].forEach(function(n){ noti[n] = 1; });

  var visti = {}, fuori = [];
  var righe = testo.split("\n");
  for(var i=0; i<righe.length; i++){
    var rr = /(^|[^\w$.])([a-z_$][\w$]*)\s*\(/g, k;
    while((k = rr.exec(righe[i]))){
      var nome = k[2];
      if(noti[nome] || visti[nome]) continue;
      visti[nome] = 1;
      fuori.push({ nome:nome, riga:i+1 });
    }
  }
  return fuori;
}

var tetto = {}, tettoLetto = false;
try{ tetto = JSON.parse(fs.readFileSync(TETTO, "utf8")); tettoLetto = true; }catch(e){}

if(FISSA){
  fs.writeFileSync(TETTO, JSON.stringify(trovato, null, 2) + "\n");
  console.log("Tetto fissato su " + FILE + ":");
  REGOLE.forEach(function(r){ console.log("  " + String(trovato[r.nome]).padStart(4) + "  " + r.nome); });
  process.exit(0);
}

var peggiorate = 0, migliorate = 0;
console.log("\n  " + FILE + "\n");
if(!tettoLetto && !FISSA){
  console.log("  SENZA TETTO  " + TETTI.join(" / ") + " non trovato.");
  console.log("               Oggi diventa il tetto: questo giro non puo' dire di no.\n");
}
REGOLE.forEach(function(r){
  var ora = trovato[r.nome], prima = (r.nome in tetto) ? tetto[r.nome] : ora;
  var segno = ora > prima ? "PEGGIO" : (ora < prima ? "meglio" : "      ");
  if(ora > prima) peggiorate++;
  if(ora < prima) migliorate++;
  console.log("  " + segno + "  " + String(ora).padStart(4) + (ora === prima ? "      " : " (era " + prima + ")") + "  " + r.nome);
  if(ELENCA || ora > prima){
    console.log("          " + r.perche);
    dettaglio[r.nome].forEach(function(d){ console.log("          " + d); });
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   L'OTTAVA DOMANDA: LA CLASSE E' NOMINATA, MA LA REGOLA ESISTE?

   Il 16/08/2026 il diario dava per fatta una voce - "la riga dell'iscritto
   non e' piu' stile in linea, ora e' .iscritto-row" - e la classe era davvero
   scritta nel JS. Nel foglio di stile non c'era niente. Questo bug non si
   vede da fuori: l'elemento esce senza stile e sembra soltanto "un po'
   diverso", quindi nessuno lo segnala e il diario continua a dire che e'
   fatto. E' il modo piu' silenzioso che ha una nota di diventare falsa.
   Non ha un tetto: o la regola c'e', o la classe non serve a niente.
   ══════════════════════════════════════════════════════════════════════════ */
function classiUsateDalJs(){
  var js = nude.slice(jsDa).join("\n"), usate = {}, m, r;
  r = /class="([^"]*)"/g;
  while((m = r.exec(js))){
    /* IL FALSO POSITIVO DEL 23/08/2026, e perche' contava.
       Il guardiano segnalava una classe fantasma chiamata `key`. Non esiste:
       viene da qui.

         el('<button class="reg-riga'+(modeKey === key ? " on" : "")+'">')

       Il regex si ferma al primo apice doppio, cioe' a quello prima di ` on`,
       e cattura   reg-riga'+(modeKey === key
       Lo split sugli spazi da' quattro pezzi. `reg-riga'+(modeKey` perde tutto
       dall'apice in poi e diventa `reg-riga`, giusto. `===` contiene un `=` e
       viene scartato. Ma `key` arriva pulito, e passa.

       Una segnalazione falsa costa piu' di quanto sembri: insegna a leggere
       il guardiano di sfuggita. Il giorno che ne stampa una vera, quella riga
       ha gia' l'aria di essere l'ennesimo rumore. *Un controllo di cui ci si
       fida a meta' e' meta' spento.*

       La cura: quando dentro `class="..."` c'e' un apice singolo, si tiene
       SOLO il primo pezzo — quello e' il nome vero, il resto e' espressione. */
    var dentro = m[1];
    if(dentro.indexOf("'") !== -1) dentro = dentro.split("'")[0];
    dentro.split(/\s+/).forEach(function(c){
      c = c.trim();
      if(c && !/[+({\[?=:]/.test(c)) usate[c] = (usate[c]||0)+1;
    });
  }
  r = /classList\.(?:add|toggle|remove)\("([^"]+)"(\s*\+)?/g;
  while((m = r.exec(js))){
    if(m[2]) continue;                 // il nome continua: composto, non scritto
    usate[m[1]] = (usate[m[1]]||0)+1;
  }
  return usate;
}

function classiFantasma(){
  var definite = {}, m, r = /\.([a-zA-Z][\w-]*)/g;
  var css = nude.slice(0, jsDa).join("\n");
  while((m = r.exec(css))) definite[m[1]] = 1;
  var usate = classiUsateDalJs();
  return Object.keys(usate).filter(function(c){ return !definite[c]; }).sort()
    .map(function(c){ return c + " (" + usate[c] + "\u00d7)"; });
}

/* ══════════════════════════════════════════════════════════════════════════
   L'UNDICESIMA DOMANDA: LA CLASSE ESISTE, MA SOLO DA 900px IN SU?

   Il 20/08/2026 lo stesso errore e' stato fatto TRE VOLTE in un giorno.
   Il foglio ha una zona lunga dentro `@media (min-width:900px)` — la
   griglia dei comandi, il riquadro largo — e chi scrive li' dentro non se
   ne accorge: la regola sembra normale, ha il suo nome, e sul computer
   funziona benissimo.

   Sul telefono non fa NIENTE. E il guaio e' che non sembra rotta: un testo
   senza la sua regola non e' vuoto, e' solo un po' piu' grande. `.card-hint`
   e' stata cosi' per un giorno intero e nessuno l'ha vista.

   La domanda e' precisa: una classe che il copione NOMINA, che nel foglio
   ESISTE, ma che non esiste MAI di primo livello. Le classi che sono
   davvero solo per lo schermo largo si nominano dal foglio, non dal JS —
   quindi questa non le tocca.

   Non ha tetto: o e' zero, o c'e' una schermata che sul telefono e' nuda.
   ══════════════════════════════════════════════════════════════════════════ */
/* LE QUATTRO CHE SONO COSI' DI PROPOSITO, e il motivo accanto.
   Alla prima passata questa domanda ne ha trovate cinque: una era il bug
   vero (`.nota`), quattro erano classi il cui MESTIERE e' esistere solo in
   un contesto. Lasciarle protestare avrebbe spento la domanda entro sera —
   e' successo gia' con l'ottava, il 20/08 stesso.
   *Un'eccezione dichiarata resta un'eccezione; un'eccezione che grida
   diventa un motivo per non guardare piu'.*
   Chi ne aggiunge una nuova la scrive qui, col perche'. Se non sa scrivere
   il perche', probabilmente e' un errore. */
var SOLO_GRANDE_OK = {
  "narrow":      "stringe la colonna: da stringere c'e' solo dove c'e' spazio",
  "tabbar-wide": "la barra in cima esiste solo sullo schermo largo",
  "no-print":    "esiste solo sulla carta",
  "no-smooth":   "esiste solo quando il movimento e' ridotto"
};

function classiSoloDaGrande(){
  var top = {}, ovunque = {}, liv = 0;
  for(var i = 0; i < righe.length; i++){
    if(!inCss(i)){ continue; }
    var riga = nude[i], prima = liv, m, r = /\.([a-zA-Z][\w-]*)/g;
    while((m = r.exec(riga))){
      ovunque[m[1]] = 1;
      if(prima === 0) top[m[1]] = 1;
    }
    liv += (riga.match(/{/g)||[]).length - (riga.match(/}/g)||[]).length;
    if(liv < 0) liv = 0;
  }
  var usate = classiUsateDalJs();
  return Object.keys(usate).filter(function(c){
    return ovunque[c] && !top[c] && !SOLO_GRANDE_OK[c];
  }).sort();
}

/* ══════════════════════════════════════════════════════════════════════════
   LA NONA DOMANDA: OGNI FEDERAZIONE PUO' DIRE CHI E'?

   FEDERATIONS dice a quali formati di gara si gioca; PROFILE_FEDERATIONS dice
   di quali federazioni si puo' dichiarare la tessera. Sono due elenchi scritti
   a mano in due punti lontani del file, e il 16/08/2026 il secondo ne aveva
   cinque in meno del primo: turchi, russi, spagnoli, svedesi e olandesi
   potevano tirare la loro gara e non potevano scrivere il proprio numero di
   tessera. Nessuno se ne accorge da qui: bisogna essere svedesi.
   Quando entra la federazione numero diciassette, questa domanda lo dice.
   ══════════════════════════════════════════════════════════════════════════ */
function federazioniScoperte(){
  function codici(blocco){
    var out = [], m, r = /code\s*:\s*"([a-z]+)"/g;
    while((m = r.exec(blocco))) out.push(m[1]);
    return out;
  }
  var tutto = righe.join("\n");
  var a = tutto.match(/var FEDERATIONS\s*=\s*\{[\s\S]*?\n\};/);
  var b = tutto.match(/var PROFILE_FEDERATIONS\s*=\s*\[[\s\S]*?\n\];/);
  if(!a || !b) return [];
  var regole = (a[0].match(/^\s*([a-z]+)\s*:/gm)||[]).map(function(x){ return x.replace(/[\s:]/g,""); });
  var profilo = codici(b[0]);
  /* `fuoriElenco:true` NON E' UNA SVISTA, E' UNA FIRMA. (27/08/2026.)
     Una federazione puo' essere tolta di proposito dalle scelte tenendole il
     bareme: chi ce l'ha gia' nel profilo continua a contare col suo
     regolamento invece di cadere in silenzio su un altro. E' successo per la
     russia il 26/08 e per la turchia il 27/08.
     Questo banco le segnalava lo stesso, e un banco che grida su una cosa
     decisa apposta insegna a non ascoltarlo — cioe' smette di funzionare
     proprio il giorno che ne avresti bisogno. Adesso salta chi porta la firma
     e continua a gridare su chi non ce l'ha. */
  var fuori = {}, mf, rf = /^\s*([a-z][a-z0-9]*)\s*:\s*\{[^\n]*fuoriElenco\s*:\s*true/gm;
  while((mf = rf.exec(a[0]))) fuori[mf[1]] = true;
  return regole.filter(function(c){ return profilo.indexOf(c) === -1 && !fuori[c]; });
}

/* ══════════════════════════════════════════════════════════════════════════
   LA DECIMA DOMANDA: LA CHIAVE CHE SI CHIEDE ESISTE, E IN TUTTE E NOVE?

   t() ha due modi di cadere, e nessuno dei due si vede da qui.
   Il primo e' rumoroso: una chiave che non esiste in italiano finisce a
   schermo COM'E' SCRITTA - l'arciere legge "pg_div_ospite" al posto di
   "Ospite". Basta una lettera sbagliata in una chiamata, e chi scrive non se
   ne accorge se quella schermata non la apre.
   Il secondo e' silenzioso, ed e' peggio: una chiave che c'e' in italiano e
   manca in svedese cade sull'italiano. Lo schermo resta pieno, la frase e'
   giusta, ed e' nella lingua sbagliata. Se ne accorge uno svedese, in gara.
   Il 16/08/2026 sono entrate quattordici chiavi per nove lingue in un colpo:
   centoventisei voci a mano, il momento esatto in cui questa domanda serve.

   La prima ha uscita 1: e' testo rotto a schermo. La seconda avvisa e basta,
   perche' l'app resta usabile - ma resta usabile in italiano.
   ══════════════════════════════════════════════════════════════════════════ */
function chiaviMancanti(){
  var tutto = righe.join("\n");
  var da = tutto.indexOf("var STRINGS = {");
  if(da < 0) return null;
  var lingue = (tutto.match(/^([a-z]{2}): \{$/gm) || []).map(function(x){ return x.replace(/[^a-z]/g,""); });
  var inizio = {};
  lingue.forEach(function(l){ inizio[l] = tutto.indexOf("\n" + l + ": {", da); });
  lingue.sort(function(a,b){ return inizio[a] - inizio[b]; });
  // le stringhe dentro le stringhe: l'italiano e' pieno di "a voce:" e
  // "nota: ...", e senza toglierle ogni frase sembrerebbe una chiave.
  function spoglia(x){
    return x.replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
  }
  var chiavi = {};
  lingue.forEach(function(l, k){
    var d = tutto.indexOf("{", inizio[l]) + 1;
    var a = (k + 1 < lingue.length) ? inizio[lingue[k+1]] : tutto.indexOf("\n};", inizio[l]);
    var blocco = spoglia(tutto.slice(d, a)), set = {}, m;
    var r = /(?:^|[\s{,])([a-zA-Z][a-zA-Z0-9_]*)\s*:/gm;
    while((m = r.exec(blocco))) set[m[1]] = 1;
    chiavi[l] = set;
  });
  var base = Object.keys(chiavi[lingue[0]] || {});
  var buchi = [];
  lingue.slice(1).forEach(function(l){
    var man = base.filter(function(c){ return !chiavi[l][c]; });
    if(man.length) buchi.push({ lingua:l, chiavi:man });
  });
  // le chiamate: solo quelle scritte per intero. t("mode_"+key+"_label") si
  // compone a mano a mano e non si puo' controllare da fermo.
  var usate = {}, m2, r2 = /\bt\(\s*"([a-zA-Z0-9_]+)"/g;
  while((m2 = r2.exec(tutto))) if(!/_$/.test(m2[1])) usate[m2[1]] = 1;
  var mute = Object.keys(usate).filter(function(c){ return !chiavi[lingue[0]][c]; });
  return { lingue:lingue.length, base:base.length, buchi:buchi, mute:mute };
}

/* ══════════════════════════════════════════════════════════════════════════
   LA DECIMA DOMANDA: IL RITMO VERTICALE E' UNO SOLO?

   Il 20/08/2026 Alessandro ha guardato il fondo della schermata dove si tira
   e ha detto: «vuoti verticali che non seguono una scala unica». Aveva
   ragione, e il conto era 18 → 0 → 10 → 0: il riquadro staccava di 18, il
   tasto sfuso di zero perche' `margin:0 auto` azzera anche il verticale,
   l'azzeramento di 10 scritti in linea.

   Il numero di casa era gia' 16 — lo dicevano `.resume-banner` e
   `h2.section-title` — e 16 sta sulla scala dichiarata. Le altre misure no.

   Questa domanda tiene fermo quel numero nei quattro punti che decidono il
   ritmo di TUTTE le schermate. Non e' una regola generale sul 16: e' un
   elenco corto e dichiarato, perche' una regola che si applica dappertutto
   protesta dappertutto e viene spenta.
   ══════════════════════════════════════════════════════════════════════════ */
/* IL PASSO SI CHIEDE COL SUO NOME, NON COL SUO NUMERO.
   (20/08/2026, poche ore dopo aver scritto questa domanda.) La prima
   stesura cercava `margin-bottom:16px`. Poi le spaziature sono passate ai
   token e le tre regole hanno cominciato a dire `var(--s-4)`: la domanda ha
   protestato contro un MIGLIORAMENTO, e diceva «la regola non si trova
   piu'». Aveva ragione a protestare e torto su cosa.
   Adesso chiede il token, ed e' un controllo piu' forte: prima verificava
   che quattro punti dicessero lo stesso numero, adesso verifica che dicano
   lo stesso GRADINO — cioe' che restino agganciati alla scala anche il
   giorno in cui la scala cambia. Il numero e' ancora accettato, perche' un
   16px scritto a mano non e' sbagliato: e' solo scollegato. */
var RITMO = [
  ["il riquadro",          /\.card\{[^}]*margin-bottom:\s*([^;]+)/],
  ["la striscia del giro", /\.resume-banner\{[^}]*margin-bottom:\s*([^;]+)/],
  ["il titolo di sezione", /h2\.section-title\{[^}]*margin-bottom:\s*([^;]+)/],
  ["il tasto sfuso",       /\.menu-cols > \.btn\.btn-ghost\.btn-block\{[^}]*margin:0 auto ([^;]+)/]
];
var PASSO = ["var(--s-4)", "16px"];   // il gradino, e il numero che vale lo stesso
/* SI GUARDANO TUTTE, NON LA PRIMA.
   (20/08/2026, stesso giorno, terza correzione a questa domanda.) La prima
   stesura usava `match()` senza `g`, cioe' si fermava alla PRIMA `.card{`
   del foglio — e `.card` e' scritta in piu' punti: la regola base, quella
   della finestra larga, quella della stampa. Bastava che la prima fosse a
   posto perche' la domanda dicesse di si' su tutte le altre.
   *Un controllo che guarda il primo caso e conclude sul mucchio non e' un
   controllo: e' un campione di uno.* Adesso le conta tutte e nomina quale.
   Restano fuori le zone gia' esenti — stampa e movimento ridotto — dove una
   spaziatura diversa e' voluta. */
function ritmoRotto(){
  var tutto = righe.join("\n");
  var fuori = [];
  RITMO.forEach(function(v){
    var re = new RegExp(v[1].source, "g"), m, visti = 0;
    while((m = re.exec(tutto))){
      visti++;
      var d = m[1].trim();
      if(PASSO.indexOf(d) < 0) fuori.push(v[0] + " (" + visti + "\u00aa scrittura): " + d + " invece di var(--s-4)");
    }
    if(!visti) fuori.push(v[0] + ": la regola non si trova piu'");
  });
  return fuori;
}

var senzaRegola = classiFantasma();
if(senzaRegola.length){
  console.log("\n  SENZA REGOLA  " + senzaRegola.length + " classe/i nominata/e dal JS e mai definita/e:");
  console.log("                " + senzaRegola.join(", "));
  console.log("                L'elemento esce senza stile e nessuno lo segnala.");
}

var ritmo = ritmoRotto();
if(ritmo.length){
  console.log("\n  RITMO ROTTO   " + ritmo.length + " misura/e fuori dal passo verticale di casa (--s-4, cioe' 16px):");
  ritmo.forEach(function(r){ console.log("                · " + r); });
  console.log("                Il fondo pagina torna a respirare a caso.");
}

var soloGrande = classiSoloDaGrande();
if(soloGrande.length){
  console.log("\n  SOLO DA 900px   " + soloGrande.length + " classe/i nominata/e dal JS e definita/e SOLO dentro un @media:");
  console.log("                  " + soloGrande.join(", "));
  console.log("                  Sul telefono quella regola non esiste, e non sembra rotta:");
  console.log("                  il testo esce senza stile e sembra solo un po' piu' grande.");
  process.exit(1);
}

var scoperte = federazioniScoperte();
if(scoperte.length){
  console.log("\n  SENZA TESSERA  " + scoperte.join(", "));
  console.log("                 Hanno un formato di gara ma non sono in PROFILE_FEDERATIONS:");
  console.log("                 l'app offre loro la gara e nega loro l'iscritto.");
}

var chiavi = chiaviMancanti();
if(chiavi){
  if(chiavi.buchi.length){
    console.log("\n  SENZA TRADUZIONE  " + chiavi.buchi.length + " lingua/e con dei buchi (cadono sull'italiano):");
    chiavi.buchi.forEach(function(b){
      console.log("                    " + b.lingua + ": " + b.chiavi.slice(0,12).join(", ")
        + (b.chiavi.length > 12 ? " \u2026 e altre " + (b.chiavi.length - 12) : ""));
    });
    console.log("                    Lo schermo resta pieno, la frase e' giusta, la lingua no.");
  }
  if(chiavi.mute.length){
    console.log("\n  CHIAVE NUDA  " + chiavi.mute.length + " chiave/i chiesta/e a t() e mai scritta/e:");
    console.log("               " + chiavi.mute.join(", "));
    console.log("               Non c'e' niente da mostrare: a schermo finisce la chiave.");
    process.exit(1);
  }
}

// La settima domanda, senza tetto: o e' zero, o il file e' rotto.
// Sul file SENZA commenti e SENZA il contenuto delle stringhe: l'italiano e'
// pieno di parole seguite da una parentesi — "il timer si mette in pausa (non
// si perde niente)" — e un controllo che le conta come chiamate grida al lupo
// diciassette volte e viene spento il giorno stesso.
// E SENZA LE ESPRESSIONI REGOLARI. (25/08/2026.) Il banco gridava «ROTTO:
// mode_() chiamata e mai dichiarata» per colpa di /^mode_(.+)_label$/, che di
// funzioni non ne chiama nessuna: una regex letterale ha lo stesso disegno di
// una chiamata — nome, parentesi — e il banco leggeva la forma, non l'intento.
// *Un controllo che dice ROTTO quando non e' rotto niente e' un controllo che
// fra due giorni nessuno legge piu'.* Si spengono come le stringhe, e solo
// dove una regex puo' davvero cominciare: dopo `=`, `(`, `,`, `:`, `[`, un
// operatore o un a capo. Altrimenti si spegnerebbe anche una divisione.
var soloJs = nude.slice(jsDa).join("\n")
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, "``")
  .replace(/(^|[=(,:\[!&|?{};+\n]\s*)\/(?![*\/])(?:[^\/\\\n\[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[gimsuy]*/g, "$1/re/");
var fantasmi = funzioniFantasma(soloJs);
if(fantasmi.length){
  console.log("\n  ROTTO   " + fantasmi.length + " funzione/i chiamata/e e mai dichiarata/e:");
  fantasmi.forEach(function(f){ console.log("          riga " + (jsDa + f.riga) + ": " + f.nome + "()"); });
  console.log("          Un ReferenceError a mezzo ridisegno lascia la schermata vuota,");
  console.log("          e `node --check` non lo vede perche' la sintassi e' giusta.\n");
  process.exit(1);
}

/* ── la dodicesima domanda: le due liste di federazioni combaciano? ────────
   FEDERATIONS dice a quali formati di gara ha diritto una federazione;
   PROFILE_FEDERATIONS dice quali si possono scegliere nel profilo. Sono due
   elenchi scritti a mano in due punti lontani del file, e non c'e' niente che
   li tenga insieme. Se una federazione sta nel primo e non nel secondo,
   nessuno puo' sceglierla; se sta nel secondo e non nel primo, chi la sceglie
   trova un menu vuoto al posto delle gare. In tutti e due i casi **da qui non
   te ne accorgi: devi essere svedese**, e te ne accorgi in gara.
   Avvisa e basta — l'app resta usabile per tutti gli altri — ma lo dice ad
   alta voce, che e' esattamente quello che nessuna persona farebbe. */
(function(){
  var sorgente = righe.join("\n");
  var a = /var FEDERATIONS = \{([\s\S]*?)\n\};/.exec(sorgente);
  var b = /var PROFILE_FEDERATIONS = \[([\s\S]*?)\];/.exec(sorgente);
  if(!a || !b) return;
  var conGare = {}, m, re = /^([a-z][a-z0-9]*): \{/gm;
  while((m = re.exec(a[1]))) conGare[m[1]] = true;
  var nelProfilo = {}, re2 = /code\s*:\s*"([a-z0-9]+)"/g;
  while((m = re2.exec(b[1]))) nelProfilo[m[1]] = true;
  // Stessa firma, stessa regola: vedi `federazioniScoperte()` piu' su.
  var fuoriElenco = {}, mf, rf = /^([a-z][a-z0-9]*): \{[^\n]*fuoriElenco\s*:\s*true/gm;
  while((mf = rf.exec(a[1]))) fuoriElenco[mf[1]] = true;
  var senzaProfilo = Object.keys(conGare).filter(function(k){ return !nelProfilo[k] && !fuoriElenco[k]; });
  var senzaGare    = Object.keys(nelProfilo).filter(function(k){ return !conGare[k]; });
  if(!senzaProfilo.length && !senzaGare.length) return;
  console.log("\n  FEDERAZIONI SCOPERTE");
  senzaProfilo.forEach(function(k){ console.log("                    " + k + ": ha le gare, ma non si puo' scegliere nel profilo"); });
  senzaGare.forEach(function(k){    console.log("                    " + k + ": si puo' scegliere, ma non ha nessuna gara"); });
})();

if(peggiorate){
  console.log("\n  " + peggiorate + " regola/e peggiorata/e. La cricca si stringe, non si apre.\n");
  process.exit(1);
}
/* «Ricorda `--fissa`» era un promemoria, cioe' buona memoria: la cosa che
   questo file esiste apposta per non chiedere. Un terreno guadagnato e non
   registrato si puo' restituire in silenzio il giorno dopo, e il guardiano
   direbbe di si'. Quindi la cricca scatta da sola: se niente e' peggiorato e
   qualcosa e' migliorato, il tetto scende adesso. */
/* UNA REGOLA NUOVA SENZA TETTO NON PUO' DIRE DI NO.
   (20/08/2026, trovato aggiungendo la regola del carattere a mano.)
   Il tetto si scriveva SOLO quando qualcosa migliorava. Una regola aggiunta
   oggi non compare in `tetto-token.json`, quindi il confronto la legge come
   «prima = ora» a ogni giro: non protesta mai, nemmeno se il numero
   raddoppia. Restava li' a fare finta di guardare.
   *Un controllo che non puo' dire di no e' spento* — la stessa frase che
   `controlla-base.js` ha scritto per la rete. Quindi una regola senza tetto
   se lo prende al primo giro, e da quel momento vale come le altre. */
var senzaTetto = REGOLE.filter(function(r){ return !(r.nome in tetto); })
                       .map(function(r){ return r.nome; });

if(migliorate || senzaTetto.length){
  fs.writeFileSync(TETTO, JSON.stringify(trovato, null, 2) + "\n");
}
if(senzaTetto.length){
  console.log("\n  TETTO NUOVO   " + senzaTetto.length + " regola/e senza tetto, seminata/e adesso:");
  senzaTetto.forEach(function(n){ console.log("                " + String(trovato[n]).padStart(4) + "  " + n); });
  console.log("                Dal prossimo giro questa regola puo' dire di no.");
}
if(migliorate){
  console.log("\n  " + migliorate + " regola/e migliorata/e. Tetto sceso, e non risale.\n");
} else if(!senzaTetto.length){
  console.log("\n  Niente e' peggiorato.\n");
} else {
  console.log("");
}
process.exit(0);
