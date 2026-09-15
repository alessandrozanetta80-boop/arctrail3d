/* ══════════════════════════════════════════════════════════════════════════
   controlla-tavolozza.js — L'APP E IL MERCATINO HANNO LO STESSO COLORE
   ══════════════════════════════════════════════════════════════════════════

   Nasce il 23/08/2026, da un difetto che aveva due giorni e che nessuno
   aveva visto.

   L'app ha cambiato verde il 21/08 e argilla il 22/08. Il mercatino no: qui
   il verde era ancora `#24602C`, uno scuro spento, e l'argilla `#E8722F`.
   **Due applicazioni con due tavolozze diverse, servite dallo stesso
   dominio.**

   E il difetto non e' solo che erano diverse. Sul verde nuovo l'inchiostro
   bianco dei pieni faceva **2,66:1** — si vede che c'e' una scritta e non si
   legge. Cioe' allineare il colore senza guardare chi ci sta sopra avrebbe
   rotto il mercatino invece di sistemarlo.

   PERCHE' NESSUNO SE N'ERA ACCORTO: non si guardano mai una accanto
   all'altra. Si esce dall'app, si entra nel mercatino, e in mezzo c'e' un
   caricamento che azzera il ricordo del colore di prima.

   *Un difetto che si vede solo mettendo due schermate affiancate non lo trova
   nessuno usando l'app: lo trova un confronto.* Questo banco e' quel
   confronto, fatto ogni volta invece che una volta ogni due mesi.

   NON confronta tutto: solo i PRIMITIVI, cioe' i colori veri. I ruoli
   possono e devono divergere — il mercatino ha componenti che l'app non ha,
   e viceversa. Quello che non puo' divergere e' il verde.
   ══════════════════════════════════════════════════════════════════════════ */

var fs = require("fs");

var ok = 0, ko = 0;
function si(m) { ok++; console.log("  \u2713 " + m); }
function no(m) { ko++; console.log("  \u2717 " + m); }

var app = fs.readFileSync("app.html", "utf8");
var mkt = fs.readFileSync("marketplace.html", "utf8");

/* Le famiglie che devono coincidere. `sand` NON e' nell'elenco: i neutri del
   mercatino hanno un gradino in piu' (`sand-250`, `sand-350`) che l'app non
   usa, e pretendere che siano identici farebbe fallire il banco per una
   differenza voluta. Si controllano solo i due che contano davvero. */
var FAMIGLIE = ["green", "clay", "gold"];

function primitivi(testo, fam) {
  var mappa = {};
  var r = new RegExp("--(" + fam + "-\\d+)\\s*:\\s*(#[0-9A-Fa-f]{6})", "g");
  var m;
  while ((m = r.exec(testo))) {
    /* Solo la PRIMA definizione: e' quella dei primitivi, in cima al file.
       Piu' sotto i temi ridefiniscono i ruoli, non i primitivi. */
    if (!mappa[m[1]]) mappa[m[1]] = m[2].toUpperCase();
  }
  return mappa;
}

console.log("\n  L'APP E IL MERCATINO HANNO LA STESSA TAVOLOZZA?\n");

FAMIGLIE.forEach(function (fam) {
  var a = primitivi(app, fam);
  var b = primitivi(mkt, fam);
  var diversi = [];
  var mancanti = [];
  Object.keys(a).forEach(function (k) {
    if (!b.hasOwnProperty(k)) { mancanti.push(k); return; }
    if (a[k] !== b[k]) diversi.push(k + ": app " + a[k] + " \u2260 mercatino " + b[k]);
  });
  if (diversi.length) {
    no(fam + ": " + diversi.length + " gradino/i diverso/i");
    diversi.forEach(function (d) { console.log("      " + d); });
    console.log("      \u2192 i valori si copiano DALL'APP, che e' dove si decide.");
  } else if (!Object.keys(b).length) {
    no(fam + ": il mercatino non ha questa famiglia");
  } else {
    si(fam + ": " + Object.keys(a).length + " gradini, tutti uguali" +
       (mancanti.length ? " (" + mancanti.length + " non usato/i nel mercatino)" : ""));
  }
});

/* ── L'INCHIOSTRO SUI PIENI ────────────────────────────────────────────────
   La parte che avrebbe rotto tutto. `--brand-ink` era `#FFFFFF` scritto a
   mano in tutti e tre i temi del mercatino: col verde vecchio, scuro,
   funzionava; sul verde prato fa 2,66:1.
   *Un valore fisso non lo raggiunge nessuna revisione della tavolozza — ed
   e' esattamente per questo che era scritto a mano.* */
function luminanza(hex) {
  var c = [1, 3, 5].map(function (i) {
    var v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrasto(a, b) {
  var l1 = luminanza(a), l2 = luminanza(b);
  var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

console.log("");
var bianchi = (mkt.match(/--brand-ink\s*:\s*#FFFFFF/gi) || []).length;
if (bianchi) {
  no("il mercatino ha " + bianchi + " inchiostro/i bianco/i scritto/i a mano sul verde");
  console.log("      \u2192 sul verde prato fa 2,66:1. Va preso da un token neutro scuro.");
} else {
  si("nessun inchiostro bianco scritto a mano sui pieni del mercatino");
}

/* Il conto vero, sul verde dei primitivi: se un giorno il verde torna scuro,
   l'inchiostro scuro diventera' sbagliato e questo lo dira'. */
var verde = (primitivi(app, "green")["green-800"]) || "#66B132";
var scuro = "#12160F";
var c = contrasto(verde, scuro);
if (c >= 4.5) si("inchiostro scuro sul verde pieno: " + c.toFixed(2) + ":1");
else no("inchiostro scuro sul verde pieno: " + c.toFixed(2) + ":1 \u2014 sotto 4,5, va ripensato");

/* ── I RUOLI CHE IL MERCATINO DEVE AVERE ───────────────────────────────────
   Non tutti: solo quelli che il 23/08 sono diventati il modo in cui l'app
   disegna un tasto. Se mancano, il mercatino torna ai pieni e la porta dopo
   sembra un'altra applicazione. */
console.log("");
["--primario-bg", "--acceso-bg", "--verde-bg", "--bolla-mia"].forEach(function (tok) {
  var n = (mkt.match(new RegExp(tok + "\\s*:", "g")) || []).length;
  if (n >= 3) si(tok + " definito in tutti e tre i temi");
  else no(tok + " definito " + n + " volte su 3");
});

/* ── LE PAROLE SONO NEL BLOCCO DELLA LORO LINGUA ───────────────────────────
   (23/08/2026, aggiunto dopo un errore commesso in questa stessa sessione.)
   Aggiungendo `chat_today` alle nove lingue del mercatino ho dato per
   scontato che l'ordine dei blocchi fosse quello dell'app. Non lo era: qui
   viene prima il turco e poi lo spagnolo. Risultato: **«Hoy» nel blocco
   turco e «Bugun» in quello spagnolo.**
   *Non da' nessun errore. Il file si compila, i banchi passano, e l'app
   parla spagnolo ai turchi finche' un turco non se ne lamenta.*
   Il controllo e' banale: la parola per «oggi» in italiano deve stare nel
   blocco italiano. Costa dieci righe e copre una classe intera di errori. */
console.log("");
var ATTESE = { it:"Oggi", en:"Today", de:"Heute", es:"Hoy", sv:"I dag", nl:"Vandaag" };
var righeM = mkt.split("\n");
var fuoriPosto = [];
righeM.forEach(function (riga, i) {
  var m = riga.match(/^chat_today\s*:\s*"([^"]*)"/);
  if (!m) return;
  for (var j = i; j >= Math.max(0, i - 500); j--) {
    var cap = righeM[j].trim();
    if (/^[a-z]{2}:\{$/.test(cap)) {
      var lang = cap.slice(0, 2);
      if (ATTESE[lang] && ATTESE[lang] !== m[1])
        fuoriPosto.push(lang + ": dovrebbe dire \"" + ATTESE[lang] + "\", dice \"" + m[1] + "\"");
      return;
    }
  }
});
if (fuoriPosto.length) {
  no("nel mercatino ci sono parole nel blocco della lingua sbagliata:");
  fuoriPosto.forEach(function (f) { console.log("      " + f); });
  console.log("      \u2192 l'ordine dei blocchi NON e' lo stesso dell'app.");
} else {
  si("le parole del mercatino stanno nel blocco della loro lingua");
}

/* ── LA BARRA E LO SVUOTA-MEMORIA ──────────────────────────────────────────
   (23/08/2026.) Cose che non si rompono se spariscono: la barra torna a
   dire «App», il cartellino BETA ricompare, il serif torna sui titoli. */
console.log("");
prova = si;  // alias per leggibilita' sotto
var cssM = mkt.replace(/\s+/g, " ");
if (/family=Fraunces/.test(mkt)) no("il mercatino carica ancora Fraunces");
else si("un carattere solo: Inter, come l'app");
if (/--font-display\s*:\s*"Inter"/.test(mkt)) si("i titoli usano il carattere dell'app");
else no("--font-display non e' Inter");
if (/class="beta-badge"/.test(mkt)) no("il cartellino BETA e' ancora nella barra");
else si("nessun cartellino BETA nella barra");
/* Il marchio e il nome vengono PRIMA del tasto di ritorno: la prima cosa che
   si legge in una testata deve dire dove sei. */
var iLogo = mkt.indexOf('class="tb-logo"');
var iBack = mkt.indexOf('class="tb-back"');
if (iLogo > 0 && iBack > 0 && iLogo < iBack) si("nella barra il marchio viene prima del tasto di ritorno");
else no("il tasto di ritorno viene prima del marchio");
if (/class="tb-logo-txt">Marketplace</.test(mkt)) si("il nome nella barra e' «Marketplace»");
else no("il nome nella barra non e' «Marketplace»");

console.log("");
if (/function svuotaMemoria\(/.test(mkt)) si("lo svuota-memoria c'e'");
else no("lo svuota-memoria non c'e'");
/* La riga che conta: NON deve toccare l'accesso. Un soccorso che butta
   fuori chi lo usa non e' un soccorso. */
if (/signOut|IndexedDB|indexedDB\.deleteDatabase|localStorage\.clear\(\)/.test(
      (mkt.match(/function svuotaMemoria\([\s\S]*?\n\}/) || [""])[0]))
  no("lo svuota-memoria tocca l'accesso o cancella tutto: non deve");
else si("non tocca l'accesso: cancella solo le chiavi del mercatino");
/* Due tocchi su due parole diverse al posto di una finestra di conferma. */
if (/t\("mem_confirm"\)/.test(mkt)) si("il secondo tocco e' su una parola diversa");
else no("manca la conferma a due tocchi");
["mem_title","mem_hint","mem_btn","mem_confirm","mem_doing","rep_list_title"].forEach(function (k) {
  var n = (mkt.match(new RegExp(k + "\\s*:", "g")) || []).length;
  if (n === 9) si(k + ": nove lingue");
  else no(k + ": " + n + " lingue su 9");
});

/* ── L'ARANCIONE, LA CASETTA, LA CHAT ─────────────────────────────────────
   (23/08/2026.) Tre cose che Alessandro ha visto guardando l'app e il
   mercatino uno dopo l'altro, e che nessun banco poteva vedere da solo
   perche' stanno in due file. */
console.log("");
if (/\.btn-crea\{[^}]*background:var\(--arancio-bg\)/.test(cssM)) si("il tasto nuovo annuncio e' tinto");
else no("il tasto nuovo annuncio e' ancora pieno");
/* L'arancione del tasto DEVE partire da `clay-400`, lo stesso gradino che usa
   l'app: `--clay-role` qui e' `clay-600`, cioe' un altro arancione. */
/* AGGIUNTA DOPO UN SABOTAGGIO NON PRESO. Sostituendo `--clay-400` con
   `--clay-role` — che qui e' `clay-600`, un altro arancione — il banco
   diceva di si': cercava una stringa in tutto il file, e quella stringa
   compare anche altrove. Adesso guarda DENTRO la definizione del ruolo, in
   tutti e tre i temi.
   *Una prova che cerca una parola nel file trova anche le parole che non
   c'entrano.* */
var arancioni = mkt.match(/--arancio-bg\s*:[^;]*/g) || [];
if (arancioni.length !== 3) no("--arancio-bg definito " + arancioni.length + " volte su 3");
else if (arancioni.every(function (r) { return /--clay-400/.test(r); }))
  si("e parte dallo stesso gradino dell'app (clay-400) in tutti e tre i temi");
else no("l'arancione del tasto non parte da clay-400: " +
        arancioni.filter(function (r) { return !/--clay-400/.test(r); }).join(" | "));
/* Ma la SCRITTA no: `clay-400` sul suo stesso velo fa 2,79:1, che e' il
   difetto B6 dell'app. Un difetto noto non si porta in un secondo file. */
if (/--arancio-fg:var\(--clay-500\)/.test(mkt)) si("la scritta e' un gradino piu' scura: 4,13:1, non 2,79");
else no("la scritta del tasto arancione ripete il difetto B6 dell'app");
/* La casetta e' l'icona dell'app, non un disegno somigliante. */
if (/M100,26 L180,96 L180,174 L20,174 L20,96 Z/.test(mkt)) si("la casetta e' `navhome`, la stessa dell'app");
else no("la casetta e' un disegno diverso da quello dell'app");
/* LA REGOLA E' CAMBIATA COL FONDO SOTTO. (25/08/2026.)
   Chiedeva quattro usi di `--acceso-bg`, contando anche la casetta e la
   lettera del profilo nella barra in alto. Era giusta finche' quella barra
   era di carta: la pastiglia verde velata e' fatta per staccarsi da un fondo
   chiaro. Da oggi la barra e' carbone in tutte e due le larghezze, e li' quel
   velo diventa una macchia chiara — *un token giusto nel posto sbagliato non
   smette di essere il token giusto: smette di essere nel posto giusto.*
   Quindi la prova si sdoppia: le pastiglie del foglio devono ancora usarlo,
   i due tasti della banda devono invece prendere il vetro dell'inchiostro
   della banda, come i tasti della testata dell'app. */
var quanti = (cssM.match(/background:var\(--acceso-bg\)/g) || []).length;
if (quanti >= 2) si("le pastiglie del foglio usano ancora `--acceso-bg` (" + quanti + ")");
else no("`--acceso-bg` e' sparito dalle pastiglie del foglio (" + quanti + " usi)");
var vetro = (cssM.match(/background:color-mix\(in srgb, ?var\(--chrome-ink\) 10%, ?transparent\)/g) || []).length;
if (vetro >= 2) si("casetta e lettera nella banda sono di vetro, come nella testata dell'app");
else no("casetta e lettera non prendono il vetro della banda (" + vetro + " usi)");
/* La chat: coda, raggio e tre livelli, non solo il colore. */
if (/--r-bolla:14px/.test(mkt)) si("il raggio della bolla e' un token, come nell'app");
else no("il raggio della bolla e' ancora un numero scritto nella regola");
if (/border-top-color:var\(--bolla-mia\)/.test(cssM) && /border-top-color:var\(--bolla-sua\)/.test(cssM))
  si("le bolle hanno la coda, e prende il fondo per nome");
else no("le bolle non hanno la coda");
if (/\.bub\.them\{[^}]*background:var\(--bolla-sua\)/.test(cssM)) si("la bolla dell'altro e' il livello piu' alto");
else no("la bolla dell'altro affonda nel flusso");

console.log("");
if (ko) console.log("  LE DUE TAVOLOZZE HANNO DIVERGIATO \u2014 leggere sopra.\n");
else    console.log("  L'app e il mercatino sono lo stesso colore.\n");
process.exit(ko ? 1 : 0);
