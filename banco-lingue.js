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
var app = fs.readFileSync(process.argv[2] || "index.html", "utf8");

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
