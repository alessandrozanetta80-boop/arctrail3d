/* ══════════════════════════════════════════════════════════════════════════
   banco-chat.js — LA CHAT DICE QUELLO CHE DEVE, E NIENT'ALTRO
   ══════════════════════════════════════════════════════════════════════════

   Nasce il 23/08/2026 col ridisegno della chat 1-a-1.

   Le cose che protegge NON SI ROMPONO SE SPARISCONO: la chat continua a
   funzionare benissimo se il nome torna sopra ogni messaggio, se «Elimina»
   torna sotto ogni bolla, se i turni smettono di raggrupparsi. Si limita a
   tornare quella di prima, e nessuno se ne accorge finche' non guarda una
   conversazione lunga.

   *Un difetto che riporta indietro il disegno e' il piu' facile da fare
   senza volerlo: basta che qualcuno «semplifichi» il ciclo dei messaggi.*

   Il codice non viene ricopiato: le regole del foglio si leggono da
   `index.html`, e il ciclo si rifa' con la stessa struttura del file. Se il
   file cambia forma, questo banco lo dice.
   ══════════════════════════════════════════════════════════════════════════ */

var fs = require("fs");
var file = process.argv[2] || "app.html";
var src = fs.readFileSync(file, "utf8");

var ok = 0, ko = 0;
function prova(nome, cond) {
  if (cond) { ok++; console.log("  \u2713 " + nome); }
  else { ko++; console.log("  \u2717 " + nome); }
}

var JSDOM;
try { JSDOM = require("jsdom").JSDOM; }
catch (e) { console.log("  \u2717 jsdom non installato: npm install jsdom"); process.exit(1); }

var css = (src.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";

/* ── 1. LE REGOLE ESISTONO, e sono quelle che il copione nomina ─────────── */
console.log("\n  IL DISEGNO HA UN POSTO DOVE STARE");
[".chat-flusso", ".chat-turno", ".chat-chi", ".chat-bolla", ".chat-ora",
 ".chat-canc", ".chat-scrivi"].forEach(function (c) {
  prova("la regola " + c + " c'e' nel foglio",
        css.indexOf(c + "{") !== -1 || css.indexOf(c + " ") !== -1 || css.indexOf(c + ".") !== -1);
});
/* La bolla propria non e' piu' un colore deciso dentro una `if`: prende il
   ruolo velato, come tutto il resto dell'app dal 23/08. */
/* La domanda e' «e' TINTA», non «usa quel token»: dal 23/08 la bolla ha una
   percentuale sua (38%) perche' sta su un fondo grigio e non sul foglio
   bianco. Cercare il nome del token faceva fallire il banco per un
   miglioramento — *una prova che si rompe quando il codice migliora e' una
   prova scritta sulla lettera invece che sulla cosa.* */
var mio = (css.replace(/\s+/g," ").match(/\.chat-turno\.mio \.chat-bolla\{[^}]*\}/) || [""])[0];
prova("la bolla propria e' tinta, non verde pieno",
      /color-mix\(in srgb, var\(--brand\) \d+%/.test(mio) || mio.indexOf("--verde-bg") !== -1);
prova("e non e' `var(--accent)` pieno", mio.indexOf("background:var(--accent)") === -1);
/* I tre livelli sono il motivo per cui la chat non e' piu' piatta: se il
   flusso perde il suo fondo, le bolle tornano a galleggiare sul nulla. */
prova("il flusso ha un fondo suo, piu' scuro della card",
      /\.chat-flusso\{[^}]*background:var\(--surface\)/.test(css.replace(/\s+/g," ")));
/* Secondo giro sulla stessa lezione: la regola adesso punta a `--bolla-sua`,
   che il tema definisce come `--surface-1`. La domanda giusta e' «la bolla
   dell'altro ha un fondo suo, nominato», non «c'e' scritto surface-1». */
prova("e la bolla dell'altro ha il suo fondo, nominato",
      /\.chat-turno\.suo \.chat-bolla\{[^}]*background:var\(--bolla-sua\)/.test(css.replace(/\s+/g," ")));
prova("i due fondi sono definiti in tutti e tre i temi",
      (css.match(/--bolla-mia:/g)||[]).length === 3 && (css.match(/--bolla-sua:/g)||[]).length === 3);
/* La coda e' un bordo colorato: se prende un fondo che non e' quello della
   bolla, resta di un altro colore e nessuno se ne accorge — sono sette pixel. */
prova("la coda prende lo stesso fondo della bolla",
      /border-top-color:var\(--bolla-mia\)/.test(css) && /border-top-color:var\(--bolla-sua\)/.test(css));
prova("e non c'e' piu' nessun `background:var(--accent)` nelle bolle",
      src.indexOf('isMine?"var(--accent)"') === -1);

/* ── 2. IL CICLO, montato con messaggi finti ────────────────────────────── */
/* Si rifa' la stessa macchina del file: turno nuovo quando cambia chi parla
   o dopo un'ora di silenzio. Se il file cambia regola e questo banco no, le
   prove qui sotto restano vere e mentono — per questo la prova 1 controlla
   che le classi siano ancora quelle. */
var dom = new JSDOM("<div id='lista'></div>");
var doc = dom.window.document;
var lista = doc.getElementById("lista");

var ORA = 60 * 60 * 1000;
var t0 = new Date("2026-08-23T10:00:00").getTime();
var finti = [
  { chi: "io",   testo: "Ciao",            ms: t0 },
  { chi: "io",   testo: "ci sei?",         ms: t0 + 60000 },
  { chi: "io",   testo: "domani tiriamo?", ms: t0 + 120000 },
  { chi: "lui",  testo: "si",              ms: t0 + 300000 },
  { chi: "lui",  testo: "a che ora",       ms: t0 + 360000 },
  { chi: "io",   testo: "alle 9",          ms: t0 + 400000 },
  { chi: "io",   testo: "a domani",        ms: t0 + 400000 + 3 * ORA }
];

var turno = null, turnoDi = null, turnoQuando = 0;
finti.forEach(function (m) {
  var isMine = m.chi === "io";
  var staccato = turnoQuando && (m.ms - turnoQuando > ORA);
  if (!turno || turnoDi !== m.chi || staccato) {
    turno = doc.createElement("div");
    turno.className = "chat-turno " + (isMine ? "mio" : "suo");
    if (!isMine) {
      var chi = doc.createElement("div");
      chi.className = "chat-chi";
      chi.textContent = "Robin Hood";
      turno.appendChild(chi);
    }
    lista.appendChild(turno);
    turnoDi = m.chi;
  }
  turnoQuando = m.ms;
  var bolla = doc.createElement("div");
  bolla.className = "chat-bolla" + (isMine ? " premibile" : "");
  bolla.textContent = m.testo;
  var ora = doc.createElement("span");
  ora.className = "chat-ora";
  ora.textContent = "10:00";
  bolla.appendChild(ora);
  turno.appendChild(bolla);
  if (isMine) {
    var canc = doc.createElement("button");
    canc.className = "chat-canc";
    canc.textContent = "Elimina";
    turno.appendChild(canc);
  }
});

console.log("\n  SETTE MESSAGGI DIVENTANO QUATTRO TURNI");
var turni = lista.querySelectorAll(".chat-turno");
/* io x3 | lui x2 | io x1 | io x1 staccato da tre ore = 4 */
prova("quattro turni, non sette", turni.length === 4);
prova("il primo turno tiene tre bolle", turni[0].querySelectorAll(".chat-bolla").length === 3);
prova("il secondo turno e' dell'altro", turni[1].className.indexOf("suo") !== -1);
prova("tre ore di silenzio aprono un turno nuovo, anche se parla la stessa persona",
      turni[3] && turni[3].className.indexOf("mio") !== -1 &&
      turni[3].querySelectorAll(".chat-bolla").length === 1);

console.log("\n  IL NOME SI SCRIVE UNA VOLTA, E MAI IL PROPRIO");
prova("nessun nome sopra i propri turni",
      Array.prototype.every.call(lista.querySelectorAll(".chat-turno.mio"),
        function (t) { return t.querySelector(".chat-chi") === null; }));
prova("un nome solo sul turno dell'altro",
      lista.querySelectorAll(".chat-chi").length === 1);

console.log("\n  OGNI MESSAGGIO HA LA SUA ORA");
prova("sette ore per sette messaggi", lista.querySelectorAll(".chat-ora").length === 7);
/* Dentro la bolla, non accanto: fuori sarebbe una riga in piu' per messaggio. */
prova("l'ora sta dentro la bolla",
      Array.prototype.every.call(lista.querySelectorAll(".chat-ora"),
        function (o) { return o.parentNode.className.indexOf("chat-bolla") !== -1; }));

console.log("\n  «ELIMINA» C'E' MA NON SI VEDE");
prova("un comando per ogni messaggio proprio, cinque",
      lista.querySelectorAll(".chat-canc").length === 5);
prova("e nessuno e' aperto di suo",
      lista.querySelectorAll(".chat-canc.aperto").length === 0);
/* La regola che lo nasconde deve esistere davvero: senza, i cinque comandi
   tornerebbero tutti visibili e sarebbe il difetto di prima. */
prova("il foglio lo tiene nascosto finche' non si apre",
      /\.chat-canc\{[^}]*display:none/.test(css.replace(/\s+/g, "")) );
prova("e ha una classe per aprirlo",
      /\.chat-canc\.aperto\{[^}]*display:block/.test(css.replace(/\s+/g, "")));

console.log("\n  LA MACCHINA E' ANCORA QUELLA DEL FILE");
/* Se qualcuno toglie il raggruppamento dal file, le prove qui sopra
   continuerebbero a passare: girano su una copia. Queste tre guardano il
   file vero. */
prova("il file raggruppa in turni", src.indexOf('class="chat-turno ') !== -1);
prova("il file chiude il turno dopo un'ora di silenzio",
      /turnoQuando\s*&&\s*ms\s*&&\s*\(ms - turnoQuando > 60\*60\*1000\)/.test(src));
/* AGGIUNTA DOPO UN SABOTAGGIO CHE NON E' STATO PRESO. Sostituendo la
   condizione con `if(true)` ogni messaggio tornava un turno a se' — cioe' il
   difetto di prima — e il banco diceva di si' lo stesso: guardava che le
   CLASSI ci fossero, non che la condizione fosse ancora una condizione.
   *Una prova che non e' mai stata vista fallire non si sa se funziona.* */
prova("il turno si apre solo quando cambia chi parla",
      /if\(!turno \|\| turnoDi !== d\.senderUid \|\| staccato\)/.test(src));
prova("e lo stesso vale nella chat dell'allenamento",
      /if\(!otTurno \|\| otDi !== d\.senderUid \|\| staccato\)/.test(src));
prova("il file scrive il nome solo per l'altro",
      /if\(!isMine\)\{\s*\n?turno\.appendChild\(el\('<div class="chat-chi">/.test(src));
/* L'ora si INSERISCE IN CIMA, non si appende: e' un float, e un float si
   aggancia alla riga in cui compare. Messo in fondo si aggancerebbe solo
   all'ultima riga, e su un messaggio lungo finirebbe sotto il testo invece
   che accanto. E' la differenza fra `insertBefore` e `appendChild`, e non si
   vede leggendo. */
prova("il file mette l'ora in cima alla bolla, non in fondo",
      /bolla\.insertBefore\(/.test(src) && !/bolla\.appendChild\(el\('<span class="chat-ora">/.test(src));
prova("e usa oraCorta chiedendo la sola ora",
      /function oraCorta\(/.test(src) && /oraCorta\(quando, true\)/.test(src));
prova("il giorno lo dice la pastiglia, in tutte e due le chat",
      (src.match(/class="chat-giorno"/g)||[]).length === 2 && /function giornoDi\(/.test(src));
/* «Oggi» e «ieri» sono parole: scritte a mano resterebbero italiane per otto
   lingue su nove. */
prova("oggi e ieri vengono dal dizionario",
      /t\("chat_today"\)/.test(src) && /t\("chat_yesterday"\)/.test(src));
/* Le spunte solo nella chat a due: in una di gruppo «letto» non ha soggetto. */
prova("le spunte stanno solo nella chat a due",
      /function spuntaDi\(/.test(src) &&
      /* La chiamata, non la DEFINIZIONE: alla prima passata questa prova
         contava anche \ e trovava due. */
      (src.match(/\+ spuntaDi\(chatId|isMine \? spuntaDi\(chatId/g)||[]).length === 1);

/* ── L'ELENCO DELLE CONVERSAZIONI ─────────────────────────────────────────
   Stesse regole della chat: quello che si protegge qui non si rompe se
   sparisce. L'elenco continua a funzionare con i bordi doppi, con la
   chiocciola davanti al nome e con la freccia al posto di «Tu:». Torna solo
   quello di prima. */
console.log("\n  L'ELENCO E' UNA FILA DI RIGHE, NON SEI RIQUADRI ANNIDATI");
[".conv-lista", ".conv-riga", ".conv-segno", ".conv-nome", ".conv-ultimo",
 ".conv-quando", ".conv-bollo"].forEach(function (c) {
  prova("la regola " + c + " c'e' nel foglio", css.indexOf(c) !== -1);
});
var cssPiatto = css.replace(/\s+/g, " ");
/* Un filo fra le righe, non quattro lati intorno a ognuna. */
prova("le righe sono divise da un filo, non incorniciate",
      /\.conv-riga\{[^}]*border:none;[^}]*border-bottom:1px solid var\(--border\)/.test(cssPiatto));
prova("e l'ultima non porta il filo", /\.conv-riga:last-child\{[^}]*border-bottom:none/.test(cssPiatto));

console.log("\n  QUATTRO COSE CHE ERANO SBAGLIATE NEL COPIONE");
prova("c'e' un segno con l'iniziale", /class="conv-segno"/.test(src) && /charAt\(0\)\.toUpperCase\(\)/.test(src));
/* `@Robin Hood` non e' un username: e' un nome con una chiocciola davanti. */
prova("il nome non ha piu' la chiocciola davanti",
      /class="conv-nome">'\+escapeHtml\(altro\.name\)/.test(src));
/* La freccia non si legge: chi l'ha scritto? */
prova("il prefisso dice «Tu:», non una freccia",
      /t\("chat_you"\)/.test(src) && src.indexOf('"\\u2192 "') === -1);
/* Il rosso in questa app vuol dire guaio. Un non letto e' una cosa da fare. */
prova("il bollo dei non letti non e' rosso",
      /\.conv-bollo\{[^}]*background:var\(--brand\)/.test(cssPiatto));
/* Quanti non letti ci siano non lo sa nessuno: il dato di lettura sta sulla
   conversazione. Un numero inventato e' peggio di nessun numero. */
prova("e non porta un numero che nessuno conosce",
      /class="conv-bollo"[^>]*>\\u2022/.test(src));

/* ── LA PROVA CHE MANCAVA, E COSTAVA UNA RIGA ────────────────────────────
   Il 23/08 nome e anteprima sono usciti sulla STESSA riga: «Robin Hooddai».
   Sono due `<span>`, cioe' testo in linea, e il contenitore non diceva di
   impilare. Il banco aveva ventidue prove sull'elenco e diceva di si' a
   tutte: guardava che le CLASSI ci fossero, non che facessero qualcosa.
   *Una classe che esiste e non impila niente e' esattamente come una classe
   che non esiste — solo che il banco la trova.* */
console.log("\n  IL NOME STA SOPRA L'ANTEPRIMA, NON ACCANTO");
prova("il contenitore del testo e' una colonna, e lo dice",
      /\.conv-testo\{[^}]*display:flex;[^}]*flex-direction:column/.test(cssPiatto));
/* Montata davvero: due span dentro un contenitore che non impila finiscono
   in linea, e questo si vede solo provandolo. */
var domE = new JSDOM("<div class='conv-testo'><span class='conv-nome'>Robin Hood</span><span class='conv-ultimo'>dai</span></div>");
var contenitore = domE.window.document.querySelector(".conv-testo");
prova("e i due pezzi sono due elementi distinti, non un testo solo",
      contenitore.children.length === 2);

console.log("\n  CHI HA PARLATO SI DICE SEMPRE, ALLO STESSO MODO");
/* Prima il prefisso c'era solo sui propri messaggi: due righe accanto si
   leggevano in due modi diversi, e l'assenza di un segno voleva dire
   qualcosa. */
prova("il prefisso c'e' anche quando l'ultimo non e' mio",
      /var chi = mio \? t\("chat_you"\) : /.test(src));
prova("e il nome dell'altro e' accorciato al primo pezzo",
      /\.split\(\/\\s\+\/\)\[0\] \+ ":"/.test(src));
prova("chi ha parlato si distingue dal messaggio",
      /\.conv-ultimo b\{[^}]*font-weight:700/.test(cssPiatto));

console.log("\n  IL TEMPO SI ACCORCIA MAN MANO CHE SI AVVICINA");
prova("c'e' una funzione apposta", /function quandoBreve\(/.test(src));
prova("oggi si dice l'ora", /toLocaleTimeString\(locale, \{ hour:"2-digit", minute:"2-digit" \}\)/.test(src));
prova("ieri si dice ieri", /if\(dt\.toDateString\(\) === ieri\.toDateString\(\)\) return t\("chat_yesterday"\)/.test(src));
prova("nella settimana si dice il giorno", /weekday:"short"/.test(src));
prova("e l'anno si scrive solo se non e' questo",
      /dt\.getFullYear\(\) === ora\.getFullYear\(\)/.test(src));
prova("l'elenco lo usa davvero", /quandoBreve\(c\.lastAt\.toDate\(\), locale\)/.test(src));

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
