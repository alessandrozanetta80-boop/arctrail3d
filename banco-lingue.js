/* banco-lingue.js — 19/08/2026
 *
 *   node banco-lingue.js
 *
 * PERCHE' ESISTE. Il 19/08 sono usciti tre difetti che nessuno dei cinque
 * banchi poteva vedere, e sono tutti la stessa famiglia: **frasi che l'app dice
 * in italiano a chi ha scelto un'altra lingua**, e **porte d'ingresso montate
 * nell'ordine sbagliato**. Il guardiano dei token guarda lo stile,
 * `prova-schermo` monta una schermata, `banco-firme` conta i ridisegni:
 * nessuno di loro chiede *«questa frase esiste in tutte e nove le lingue?»*.
 *
 * Un difetto di lingua non rompe niente. Non c'e' errore, non c'e' schermo
 * bianco: c'e' un turco che legge «Accesso in attesa di approvazione» e non
 * sa cosa gli e' stato detto. E' esattamente il tipo di guasto che si scopre
 * solo quando qualcuno si lamenta — cioe' tardi, e solo se si lamenta.
 *
 * Uscita 0 = tutto a posto. Uscita 1 = almeno una prova ha detto no.
 */
var fs = require("fs");

var LINGUE = ["it","en","fr","de","tr","ru","es","sv","nl"];
var errori = [];
function ok(riga){ console.log("  \u2713 " + riga); }
function no(riga){ console.log("  \u2717 " + riga); errori.push(riga); }

/* ══ 1. Le chiavi ci sono in tutte e nove le lingue ═══════════════════════
   Il dizionario e' un oggetto per lingua. Una chiave aggiunta a mano in otto
   lingue su nove non da' nessun errore: `t()` restituisce la chiave stessa e
   l'utente legge «pend_title». Qui si contano le occorrenze a inizio riga:
   devono essere nove esatte, ne' otto ne' dieci. */
var app = fs.readFileSync(process.argv[2] || "app.html", "utf8");

var DA_CONTROLLARE = [
  "pend_title","pend_body","pend_note","pend_recheck",
  "login_bad_email","login_need_email_first","login_bad_credentials","login_reset_error",
  "verify_title","verify_body","verify_done_btn","verify_resend_btn","logout_word"
];
console.log("\n  CHIAVI IN NOVE LINGUE");
DA_CONTROLLARE.forEach(function(k){
  var n = (app.match(new RegExp("^" + k + ": ", "gm")) || []).length;
  if(n === LINGUE.length) ok(k + "  \u00d7" + n);
  else no(k + " compare " + n + " volte invece di " + LINGUE.length);
});

/* ══ 1-bis. Le chiavi del MERCATINO, che ha un dizionario suo ═════════════
   `marketplace.html` e' un altro programma con un altro dizionario, e scrive
   le voci senza spazio dopo i due punti (`chiave:"valore"`). Il conteggio
   qui sopra, che cerca `chiave: `, su questo file non trova niente e direbbe
   di si' per assenza di prove — il modo piu' silenzioso in cui un banco
   sbaglia. Percio' il file si legge a parte, con la sua forma. */
var mkt = "";
try{ mkt = fs.readFileSync("marketplace.html", "utf8"); }catch(e){ mkt = ""; }
var DA_CONTROLLARE_MKT = ["den_title","den_body","den_beta_body"];
console.log("");
console.log("  CHIAVI DEL MERCATINO IN NOVE LINGUE");
if(!mkt){
  no("marketplace.html non si legge da qui: nessun controllo fatto");
} else {
  DA_CONTROLLARE_MKT.forEach(function(k){
    var n = (mkt.match(new RegExp("^" + k + ':"', "gm")) || []).length;
    if(n === LINGUE.length) ok(k + "  ×" + n);
    else no(k + " compare " + n + " volte invece di " + LINGUE.length);
  });
}

/* ══ 2. Niente italiano fisso nelle schermate d'ingresso ══════════════════
   Le tre schermate che si vedono PRIMA di entrare — login, conferma email,
   attesa di approvazione — sono le uniche che un utente straniero vede di
   sicuro, e sono state per mesi le uniche scritte in italiano dentro il
   codice. Se una di queste frasi torna, e' tornato il difetto. */
console.log("\n  ITALIANO FISSO NELLE PORTE D'INGRESSO");
/* SI GUARDA IL CODICE, NON I DIZIONARI. Le stesse frasi devono esistere in
   italiano — sono il dizionario `it`, ed e' giusto che ci siano. Il difetto e'
   quando stanno DENTRO il codice che costruisce la schermata, dove nessuna
   scelta di lingua le puo' raggiungere. Percio' si tolgono prima le righe che
   sono, per forma, voci di dizionario: `chiave: "valore"`.
   Un banco che cercasse la frase in tutto il file direbbe sempre di no, e un
   banco che dice sempre di no si smette di guardarlo. */
var codice = app.split("\n").filter(function(r){
  return !/^[A-Za-z_][A-Za-z_0-9]*: "/.test(r);
}).join("\n");
var VIETATE = [
  "Accesso in attesa di approvazione",
  "deve ancora essere approvato",
  ">Ricontrolla<",
  ">Esci<",
  "Inserisci un'email valida",
  "Inserisci prima la tua email",
  "Email o password non corretti",
  "Non sono riuscito a inviare l'email"
];
VIETATE.forEach(function(f){
  if(codice.indexOf(f) < 0) ok("assente: \u00ab" + f + "\u00bb");
  else no("torna l'italiano fisso: \u00ab" + f + "\u00bb");
});

/* ══ 3. La conferma email viene prima dell'approvazione ═══════════════════
   Questo e' un test di regressione su UNA riga, e vale la pena spiegarne il
   motivo. La riga sbagliata era:
       if(authState === "ready" && needsEmailVerification(user))
   e quell'`=== "ready" &&` rendeva la schermata di conferma irraggiungibile
   per chi non era ancora approvato — cioe' per tutti i nuovi iscritti. Chi
   ci finiva dentro non aveva nessun modo di uscirne da solo.
   La domanda giusta non e' «la schermata esiste?» (esisteva) ma «si arriva
   fin li'?». Qui si guarda la condizione, non la schermata. */
console.log("\n  L'ORDINE DELLE DUE ATTESE");
if(app.indexOf('if(authState === "ready" && needsEmailVerification(user))') >= 0){
  no("la conferma email e' di nuovo subordinata all'approvazione: vicolo cieco");
} else if(app.indexOf('if(needsEmailVerification(user)){ authState = "verifyEmail"; }') >= 0){
  ok("conferma email prima, approvazione dopo");
} else {
  no("non trovo la riga che sceglie fra conferma e attesa: controllare a mano");
}

/* ══ 4. Il ritorno dopo il link dell'email ════════════════════════════════ */
console.log("\n  IL RITORNO AL LOGIN");
["auth.sendPasswordResetEmail(email, opt)",
 "auth.currentUser.sendEmailVerification(opt)",
 "result.user.sendEmailVerification(opt)"].forEach(function(c){
  if(app.indexOf(c) >= 0) ok("passa da conRitorno: " + c);
  else no("invio senza indirizzo di ritorno: " + c);
});

/* ══ 4-bis. Il ritorno si porta dietro la lingua ══════════════════════
   (20/08/2026.) Il link della verifica lo apre l'app della posta, in un
   browser dove `localStorage` e' vuoto. Se l'indirizzo di ritorno non porta
   niente, chi clicca ricomincia dal primo passo dell'impostazione, e la
   lingua l'aveva gia' scelta: solo, in un altro browser.
   Questa e' una prova di LINGUA quanto le altre di questo banco. Il difetto
   e' che l'app parla la lingua sbagliata a chi ne aveva scelta un'altra. */
console.log("");
console.log("  IL RITORNO SI PORTA DIETRO LA LINGUA");

function nelFile(pezzo, siTxt, noTxt){
  if(app.indexOf(pezzo) >= 0) ok(siTxt); else no(noTxt);
}
nelFile("da=email",
        "l'indirizzo di ritorno dice da dove si arriva",
        "l'indirizzo di ritorno non dice da dove si arriva");
nelFile('q += "&lang=" + encodeURIComponent(state.lang)',
        "e si porta dietro la lingua scelta",
        "l'indirizzo di ritorno non porta la lingua");
nelFile("function leggiRitornoEmail()",
        "e qualcuno la rilegge all'arrivo",
        "nessuno rilegge la lingua dall'indirizzo");
nelFile("window.history.replaceState({}, document.title, window.location.pathname)",
        "l'indirizzo si pulisce dopo",
        "l'indirizzo resta sporco: torna a ogni ricarica");

/* L'ordine delle porte. Chi arriva da un'email ha gia' un account: se il
   controllo cade DOPO la schermata di benvenuto, il primo tasto che vede e'
   «Registrati», cioe' rifare la cosa che ha appena finito di fare. */
var iEmail = app.indexOf('if(arrivaDaEmail && authState === "needLogin"){ app.appendChild(loginScreen()); return; }');
var iBenv  = app.indexOf("app.appendChild(welcomeScreen()); return;");
if(iEmail > -1 && iBenv > -1 && iEmail < iBenv) ok("chi arriva da un'email vede il login, non «Registrati»");
else no("la porta dell'email cade dopo la schermata di benvenuto");

/* E adesso la si fa girare davvero, che e' l'unica prova che conta. */
var apreRit = app.indexOf("function leggiRitornoEmail(){");
var chiudeRit = app.indexOf("return da;", apreRit);
if(apreRit < 0 || chiudeRit < 0){ no("leggiRitornoEmail non si estrae dal file"); }
else {
  var corpoRit = app.slice(app.indexOf("{", apreRit) + 1, chiudeRit) + "return da;";
  var PAESI = {};
  LINGUE.forEach(function(l){ PAESI[l] = l; });
  var provaRit = function(indirizzo, langGiaQui){
    var stato = { lang: langGiaQui || undefined };
    var pulito = false;
    var finta = {
      location: { search: indirizzo, pathname: "/" },
      history: { replaceState: function(){ pulito = true; } }
    };
    var fn = new Function("URLSearchParams", "state", "save", "LANG_TO_COUNTRY", "window", "document", corpoRit);
    var da = fn(URLSearchParams, stato, function(){}, PAESI, finta, { title: "" });
    return { lang: stato.lang, da: da, pulito: pulito };
  };

  var r1 = provaRit("?da=email&lang=de");
  if(r1.lang === "de" && r1.da === true) ok("?da=email&lang=de: tedesco, e arriva da un'email");
  else no("?da=email&lang=de non e' stato letto (lang=" + r1.lang + ", da=" + r1.da + ")");

  var r2 = provaRit("?da=email&lang=de", "it");
  if(r2.lang === "it") ok("chi ha gia' scelto qui non si vede rigirare la lingua");
  else no("un indirizzo vecchio ha sovrascritto la lingua scelta");

  var r3 = provaRit("?da=email&lang=klingon");
  if(r3.lang === undefined) ok("una lingua che non esiste viene ignorata");
  else no("una lingua inventata e' entrata nello stato: " + r3.lang);

  var r4 = provaRit("");
  if(r4.da === false && r4.pulito === false) ok("senza parametri non si tocca niente");
  else no("senza parametri l'indirizzo viene toccato lo stesso");

  if(r1.pulito) ok("dopo la lettura l'indirizzo viene ripulito");
  else no("l'indirizzo non viene ripulito");
}

/* ══ 5. Le pagine legali scelgono la lingua ═══════════════════════════════
   Si montano davvero, con jsdom, e si guarda quale dei blocchi resta acceso.
   Il caso che conta e' il terzo: una lingua che NON c'e' (`nl`) deve cadere
   sull'inglese, non sull'italiano. E' l'unica regola che vale la pena
   provare, perche' e' l'unica che si puo' sbagliare senza accorgersene. */
console.log("\n  LE PAGINE LEGALI");
var JSDOM;
try{ JSDOM = require("jsdom").JSDOM; }
catch(e){ no("jsdom non installato: npm install jsdom"); JSDOM = null; }

if(JSDOM){
  var ATTESI = [["?lang=it","it"], ["?lang=en","en"], ["?lang=nl","en"], ["?lang=ru","en"]];
  ["privacy.html","termini.html"].forEach(function(f){
    var sorgente;
    try{ sorgente = fs.readFileSync(f, "utf8"); }
    catch(e){ no(f + " non si legge"); return; }
    ATTESI.forEach(function(caso){
      var d = new JSDOM(sorgente, { url: "https://arctrail3d.com/" + f + caso[0], runScripts: "dangerously" });
      var acc = Array.prototype.slice.call(d.window.document.querySelectorAll("[data-l]"))
        .filter(function(e){ return e.className === "on"; })
        .map(function(e){ return e.getAttribute("data-l"); });
      if(acc.length !== 1) no(f + " " + caso[0] + ": blocchi accesi " + acc.length + " invece di 1");
      else if(acc[0] !== caso[1]) no(f + " " + caso[0] + ": mostra " + acc[0] + ", atteso " + caso[1]);
      else ok(f + " " + caso[0] + " \u2192 " + acc[0]);
      d.window.close();
    });
    /* La fascia che dice quale testo prevale: se sparisce, la traduzione di
       cortesia diventa a tutti gli effetti il testo che vincola. */
    if(/class="prevale"/.test(sorgente)) ok(f + ": la fascia di prevalenza c'e'");
    else no(f + ": manca la fascia che dice che prevale l'italiano");
  });
}

console.log("");
if(errori.length === 0){ console.log("Tutte le prove passate.\n"); process.exit(0); }
console.log(errori.length + " prove hanno detto no.\n"); process.exit(1);
