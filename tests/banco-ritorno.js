#!/usr/bin/env node
/* banco-ritorno.js — la porta unica del Profilo, e le cose che non devono
 * tornare.
 *
 *   node tests/banco-ritorno.js [app.html]
 *
 * NASCE IL 30/08/2026, dalla rifinitura da computer. RISCRITTO LO STESSO
 * GIORNO, dal brief dell'hub, e la riscrittura merita una riga: la prima
 * versione proteggeva «\u2190 Profilo» — cioe' la scelta che il brief
 * successivo ha cancellato. *Un banco che difende la versione di stamattina
 * diventa, il pomeriggio, il modo piu' efficace per impedire il lavoro
 * giusto.* Quelle prove non erano sbagliate: erano finite.
 *
 * Adesso protegge sette decisioni:
 *
 *  1. NELLE SOTTOPAGINE DEL PROFILO IL RITORNO NON C'E'. La pastiglia con
 *     l'iniziale e' l'unica porta verso il Profilo, e due controlli per lo
 *     stesso punto sono uno di troppo.
 *  2. E LA PASTIGLIA CI PORTA DAVVERO. Non basta `state.tab = "profilo"`:
 *     `render()` guarda `state.screen` per primo. Provata premendola sul
 *     serio da tutte e quattro le stanze.
 *  3. GLI ALTRI RITORNI NON SI TOCCANO. Dal dettaglio di un giro, e dalla
 *     stessa stanza aperta da un'altra scheda, la freccia c'e' ancora: la
 *     lista delle sottopagine e' nominativa apposta, e questa prova la
 *     tiene tale.
 *  4. LA HOMEPAGE DEL PROFILO NON E' UN CRUSCOTTO. Niente conti, primati,
 *     ultimi giri, assetto, «dove ho tirato»; niente «Modifica profilo».
 *  5. LE PORTE CI SONO TUTTE, E AMMINISTRAZIONE E' UNA DI LORO — con la sua
 *     serratura addosso, letta SULLA sua porta e non nel mazzo.
 *  6. L'EDITOR DELL'ATTREZZATURA VIVE IN UN POSTO SOLO. Le Impostazioni
 *     hanno una porta che ci manda, non una seconda copia dei campi.
 *  7. «AMMINISTRAZIONE», NON PIU' «APPROVAZIONI», in nove lingue. Le chiavi
 *     interne (`adminTab`, schermata `admin`) restano com'erano.
 *
 * IL LIMITE DEL MATTINO E' CHIUSO A META', E VALE LA PENA DIRE COME.
 * Lo Spazio compagnia e l'Amministrazione non si raggiungevano perche' le
 * loro porte vogliono Firestore. La prima idea e' stata seminare la stanza
 * in `state.screen` dentro localStorage, «come fa l'app riaprendosi».
 * *ERA FALSA, e il banco lo ha dimostrato subito: dodici prove rosse.* All'
 * avvio l'app scrive `state.screen = "menu"` e `state.tab = "home"` su
 * qualunque cosa trovi salvata — e' una decisione presa il 20/08 («riaprire
 * l'app = ripartire dalla home») e vale anche per noi. Uno stato seminato
 * non e' uno stato ripreso: si legge e si butta.
 * Quindi qui si NAVIGA A CLIC, come farebbe una persona. E siccome
 * Amministrazione da oggi e' una porta del Profilo invece che un tastino,
 * quella stanza adesso si raggiunge davvero — era irraggiungibile stamattina
 * e lo e' diventata proprio grazie al lavoro che questo banco protegge.
 *
 * COSA QUESTO BANCO ANCORA NON PUO' DIRE: niente sullo SPAZIO COMPAGNIA. La
 * sua porta compare solo a chi risulta referente, e risultarlo vuol dire
 * interrogare Firestore. Di quella stanza si prova solo che il suo nome sta
 * nella lista, leggendolo nel sorgente. Resta il buco piu' grosso di questo
 * banco, ed e' scritto qui perche' non lo si dimentichi.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");

var ok = 0, ko = 0;
function prova(n, c, extra){ if(c){ ok++; console.log("  \u2713 " + n); } else { ko++; console.log("  \u2717 " + n + (extra ? "  \u2014 " + extra : "")); } }
/* REQUISITO FUTURO, NON UN ROSSO. (16/09/2026.) Il punto 6 del brief del
   30/08 \u2014 \u00able Impostazioni hanno una porta che manda all'Attrezzatura\u00bb \u2014 non
   e' mai stato pubblicato: `attrBtn` esiste solo nell'app.html dello zip in
   archive/, non in quella online. Le prove restano scritte e si leggono a
   ogni giro, ma non fanno fallire la suite: un requisito mai realizzato non
   e' una regressione. Il giorno che la porta si fa, queste diventano verdi da
   sole. Vedi STATO.md. */
var pend = 0;
function attesa(n, c, extra){ if(c){ ok++; console.log("  \u2713 " + n); } else { pend++; console.log("  \u23f3 FUTURO (mai pubblicato): " + n + (extra ? "  \u2014 " + extra : "")); } }

/* ── Le prove sul sorgente ─────────────────────────────────────────────── */
console.log("\n  IL SORGENTE NON HA PIU' I PATTERN VECCHI");
prova("il ritorno non porta il segno della scheda (pieno:doveTorna sparito)",
      src.indexOf("pieno:doveTorna") < 0);
/* La lista e' nominativa, e la prova la legge nome per nome: se un giorno
   diventasse «tutto quello che non e' il menu», sparirebbe la freccia anche
   da notifiche e messaggi, che sono uscite e non stanze del Profilo. */
var lista = src.slice(src.indexOf("var SOTTOPAGINE_PROFILO = {"));
lista = lista.slice(0, lista.indexOf("};") + 2);
prova("la lista delle sottopagine del Profilo c'e'",
      lista.length > 20 && lista.length < 400, "lunga " + lista.length);
["attrezzatura","profile-edit","club-space","admin","blocked-users"].forEach(function(k){
  prova("copre \u00ab" + k + "\u00bb", lista.indexOf('"' + k + '"') >= 0);
});
prova("e non copre le uscite (notifiche, messaggi, chat)",
      lista.indexOf("notifiche") < 0 && lista.indexOf("messaggi") < 0 && lista.indexOf("dm-chat") < 0);
prova("il ritorno si spegne SOLO dentro la scheda profilo",
      /\(state\.tab === "profilo"\) && \(SOTTOPAGINE_PROFILO\[state\.screen\] === 1\)/.test(src));
prova("la pastiglia riporta anche la schermata, non solo la scheda",
      /state\.tab = "profilo";\nif\(duranteGiro\)\{ homeOverride = true; \}\nelse \{ state\.screen = "menu"; \}/.test(src));

console.log("\n  \u00abAMMINISTRAZIONE\u00bb IN NOVE LINGUE, E \u00abAPPROVAZIONI\u00bb DA NESSUNA PARTE");
var attese = ["Amministrazione","Administration","Verwaltung","Y\\u00f6netim",
              "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
              "Administraci\\u00f3n","Beheer"];
var trovate = (src.match(/menu_admin: "[^"]+"/g) || []);
prova("le voci menu_admin sono nove", trovate.length === 9, "trovate " + trovate.length);
attese.forEach(function(a){
  prova("c'e' \u00ab" + a.replace(/\\u00f6/,"\u00f6").replace(/\\u00f3/,"\u00f3") + "\u00bb",
        trovate.some(function(x){ return x.indexOf('"' + a + '"') >= 0; }));
});
prova("nessuna dice piu' Approvazioni/Approvals/Freigaben/Onaylar/\u2026",
      !trovate.some(function(x){ return /(Approvazioni|Approvals|Approbations|Freigaben|Onaylar|\u041e\u0434\u043e\u0431\u0440\u0435\u043d\u0438\u044f|Aprobaciones|Godk)/.test(x); }),
      trovate.join(" "));
/* LA SERRATURA VA LETTA SULLA SUA PORTA, NON NEL MAZZO. (30/08/2026,
   trovato sabotando al mattino: la stringa esiste in SETTE punti del file, e
   la prova che ne cercava una qualunque diceva di si' anche con la porta
   spalancata.) L'ancora e' cambiata insieme alla porta: il pannello non e'
   piu' un tastino dentro le Impostazioni, e' la sesta porta. */
prova("il pannello resta solo dell'admin (la serratura sta SULLA porta)",
      /currentUser\.email === ADMIN_EMAIL\)\{\nporta\("users"/.test(src));
prova("e nelle Impostazioni non e' rimasto un secondo ingresso al pannello",
      src.indexOf("var adminBtn") < 0);
prova("le chiavi interne non sono state toccate: adminTab e la schermata admin esistono",
      /adminTab = "accessi"/.test(src) && /case "admin": app\.appendChild\(adminScreen\(\)\)/.test(src));

console.log("\n  LA HOMEPAGE NON DISEGNA PIU' LE CINQUE SCHEDE, MA LE FUNZIONI CI SONO ANCORA");
/* La prova guarda la CHIAMATA, non la definizione: e' la differenza fra
   «non si vede piu'» e «non esiste piu'». Il brief chiedeva la prima —
   i dati non si cancellano — e le cinque funzioni sono la materia che il
   Diario dovra' adottare. */
["profiloContiCard","profiloPrimatiCard","profiloAttivitaCard","profiloSetupCard","profiloDoveCard"].forEach(function(f){
  var chiamate = (src.match(new RegExp("= " + f + "\\(\\)", "g")) || []).length;
  prova("la homepage non chiama piu' " + f, chiamate === 0, chiamate + " chiamate");
  prova("...ma " + f + " esiste ancora", src.indexOf("function " + f + "(") >= 0);
});
prova("il tasto \u00abModifica profilo\u00bb non si disegna piu'",
      src.indexOf('t("prof_edit_btn")') < 0);

/* ── Le prove sullo schermo ────────────────────────────────────────────── */
var D = fs.mkdtempSync(path.join(os.tmpdir(), "ritorno-"));
/* In DEV_MODE `currentUser` resta `null`, e tre porte su sei non si
   disegnerebbero: Persone bloccate, Spazio compagnia, Amministrazione. Si
   finge un utente — e' un trucco del banco, non dell'app. La prova che senza
   l'indirizzo giusto la porta del pannello sparisce si fa su una SECONDA
   copia, con un altro indirizzo: se si fingesse un utente solo, «la porta
   c'e'» e «la porta e' protetta» non sarebbero due prove diverse. */
function prepara(dir, email){
  var s = src.replace("var DEV_MODE = false;", "var DEV_MODE = true;");
  if(email) s = s.replace("var currentUser = null;",
    'var currentUser = { uid:"finto", email:"' + email + '" };');
  fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(path.join(dir, "index.html"), s);
  ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function(x){
    if (fs.existsSync(x)) fs.copyFileSync(x, path.join(dir, x));
  });
  return path.join(dir, "index.html");
}
var PAG_ADMIN  = prepara(path.join(D, "admin"),  "alessandro.zanetta80@gmail.com");
var PAG_UTENTE = prepara(path.join(D, "utente"), "quaquaraqua@example.com");

/* NIENTE `screen` NE' `tab` QUI DENTRO: l'app li riscrive all'avvio. Si parte
   sempre dalla Home, come chiunque apra l'app, e da li' si cammina. */
function stato(){
  return { screen:"menu", tab:"home", pendingArchers:[], lang:"it",
    country:"it", federation:"fiarc", theme:"light", profileSkipped:false,
    profile:{ nomeCognome:"Alessandro Zanetta", username:"alez", arco:"longbow",
              compagnia:"01VERB", compagniaNome:"Arcieri del Verbano" } };
}
function giro(d, tot){
  var per = []; for(var i=0;i<24;i++) per.push(15);
  return { date:d, modeLabel:"Percorso 24", modeKey:"fiarc_percorso", format:24,
           sessionType:"3d", scoringVersion:2, campo:"Fornasona, Cerrione",
           results:[{ name:"Alessandro Zanetta", isSelf:true, total:tot, perTarget:per }] };
}
/* CON UNO STORICO VERO. Senza, le cinque schede non si disegnerebbero
   comunque e le prove direbbero di si' per il motivo sbagliato: e' il
   difetto che il 30/08 ha reso cieca la prova sulla serratura. */
var STORIA = [giro("2026-08-20T09:00:00.000Z",342), giro("2026-08-13T09:00:00.000Z",318),
              giro("2026-08-06T09:00:00.000Z",305), giro("2026-07-30T09:00:00.000Z",291)];

(async function(){
  var browser = await chromium.launch();

  async function apri(pagina, w, h){
    var ctx = await browser.newContext({ viewport:{ width:w, height:h } });
    var p = await ctx.newPage();
    var err = [];
    p.on("pageerror", function(e){ err.push(String(e.message)); });
    await p.addInitScript(function(a){
      localStorage.setItem("arctrail3d_state_v3", JSON.stringify(a.st));
      localStorage.setItem("arctrail3d_welcome_v2", "1");
      localStorage.setItem("arctrail3d_storico_v1", JSON.stringify(a.hi));
    }, { st: stato(), hi: STORIA });
    await p.goto("file:///" + pagina.split(path.sep).join("/"));
    await p.waitForTimeout(1100);
    return { ctx:ctx, p:p, err:err };
  }

  // Il tasto del ritorno: quello in testata il cui titolo comincia con la freccia.
  function quantiRitorni(p){
    return p.evaluate(function(){
      return Array.prototype.slice.call(document.querySelectorAll("header button"))
        .filter(function(x){ return (x.title || "").charAt(0) === "\u2190"; }).length;
    });
  }
  async function premiPastiglia(p){
    var c = await p.evaluate(function(){
      var a = Array.prototype.slice.call(document.querySelectorAll("header .bar-btn"))
        .filter(function(x){ return x.textContent.trim() === "A"; })[0];
      if(!a) return false;
      a.click(); return true;
    });
    await p.waitForTimeout(700);
    return c;
  }
  async function premi(p, testo){
    var c = await p.evaluate(function(r){
      var re = new RegExp(r);
      var b = Array.prototype.slice.call(
        document.querySelectorAll("button, .menu-btn, .timeline-row, .riga-giro"))
        .filter(function(x){ return re.test(x.textContent); })[0];
      if(!b) return false;
      b.click(); return true;
    }, testo);
    await p.waitForTimeout(700);
    return c;
  }
  function doveSono(p){
    return p.evaluate(function(){
      var st = JSON.parse(localStorage.getItem("arctrail3d_state_v3")) || {};
      return { screen: st.screen, tab: st.tab,
               carta: !!document.querySelector(".mp-testa"),
               porte: Array.prototype.slice.call(document.querySelectorAll(".porte-profilo .menu-btn"))
                        .map(function(x){ return x.textContent; }) };
    });
  }

  /* ══ 1. LA HOMEPAGE: SEI PORTE, NIENTE CRUSCOTTO ══════════════════════ */
  console.log("\n  LA HOMEPAGE DEL PROFILO E' UN INGRESSO, NON UN CRUSCOTTO");
  var a = await apri(PAG_ADMIN, 1280, 900);
  prova("la pastiglia con l'iniziale c'e' gia' dalla Home", await premiPastiglia(a.p) === true);
  var vista = await a.p.evaluate(function(){
    var testo = (document.querySelector("#app") || document.body).textContent;
    return {
      porte: Array.prototype.slice.call(document.querySelectorAll(".porte-profilo .menu-btn"))
               .map(function(x){ return x.textContent; }),
      carta: !!document.querySelector(".mp-testa"),
      conti: document.querySelectorAll(".mp-conti").length,
      giri:  document.querySelectorAll(".mp-giro").length,
      punti: document.querySelectorAll(".mp-punti").length,
      modifica: /Modifica profilo/.test(testo),
      primato: /342/.test(testo),
      frecce: Array.prototype.slice.call(document.querySelectorAll("header button"))
                .filter(function(x){ return (x.title || "").charAt(0) === "\u2190"; }).length
    };
  });
  prova("la carta d'identita' c'e'", vista.carta === true);
  prova("non c'e' piu' la fascia dei conti (giri/piazzole/campi)", vista.conti === 0, vista.conti + " trovate");
  prova("non ci sono piu' gli ultimi giri", vista.giri === 0 && vista.punti === 0,
        vista.giri + " righe, " + vista.punti + " punteggi");
  prova("non c'e' piu' nessun primato in pagina (il 342 dello storico)", vista.primato === false);
  prova("non c'e' piu' il tasto \u00abModifica profilo\u00bb", vista.modifica === false);
  prova("le porte sono sei", vista.porte.length === 6, "sono " + vista.porte.length);
  ["Il mio diario","Attrezzatura","Impostazioni","Persone bloccate","Amministrazione"].forEach(function(nome){
    prova("la porta \u00ab" + nome + "\u00bb c'e' ancora",
          vista.porte.some(function(x){ return x.indexOf(nome) >= 0; }));
  });
  prova("e la porta della compagnia c'e', una sola delle due",
        vista.porte.filter(function(x){ return /Compagnie|Spazio compagnia/.test(x); }).length === 1);
  prova("sulla homepage del Profilo non c'e' nessuna freccia di ritorno", vista.frecce === 0,
        "trovate " + vista.frecce);

  /* ══ 2. LE TRE STANZE RAGGIUNGIBILI A CLIC ════════════════════════════ */
  var stanze = [["Attrezzatura","attrezzatura"], ["Impostazioni","profile-edit"],
                ["Amministrazione","admin"]];
  for(var i=0; i<stanze.length; i++){
    var nome = stanze[i][0], scr = stanze[i][1];
    console.log("\n  DA \u00ab" + nome.toUpperCase() + "\u00bb: NESSUNA FRECCIA, E LA PASTIGLIA APRE IL PROFILO");
    prova("la porta \u00ab" + nome + "\u00bb si apre", await premi(a.p, "^" + nome) === true);
    var dentro = await doveSono(a.p);
    prova("e porta davvero in \u00ab" + scr + "\u00bb", dentro.screen === scr, "siamo su " + dentro.screen);
    var n = await quantiRitorni(a.p);
    prova("qui non c'e' nessun tasto di ritorno", n === 0, "trovati " + n);
    await premiPastiglia(a.p);
    var d = await doveSono(a.p);
    /* LA PROVA CHE CONTA E' `carta`, NON `screen`. Prima di oggi la pastiglia
       scriveva gia' `tab:"profilo"` e lo stato salvato diceva la cosa giusta
       mentre lo schermo mostrava ancora l'Attrezzatura: chi avesse guardato
       solo `state` avrebbe detto che funzionava. Si guarda cosa c'e' scritto
       sul vetro. */
    prova("premuta, apre davvero la homepage del Profilo",
          d.screen === "menu" && d.tab === "profilo" && d.carta === true,
          JSON.stringify({ screen:d.screen, tab:d.tab, carta:d.carta }));
  }
/* GLI ERRORI DEL PANNELLO SONO DEL BANCO, NON DELL'APP. Entrando in
   Amministrazione la schermata interroga Firestore (`db.collection`), e qui
   `db` non esiste: DEV_MODE lo spegne, e l'utente admin e' finto. Sono due
   eccezioni previste e non riguardano il ritorno. *Ma non si spegne il
   controllo: si dichiara cosa si accetta e si continua a rifiutare tutto il
   resto* — se domani la testata cominciasse a lanciare, la prova lo direbbe. */
  var estranei = a.err.filter(function(m){ return !/reading 'collection'/.test(m); });
  prova("nessun errore in pagina, a parte Firestore assente nel pannello",
        estranei.length === 0, estranei.slice(0,2).join(" | "));
  prova("e gli errori del pannello sono solo quelli, non un guasto nuovo",
        a.err.length === estranei.length + a.err.filter(function(m){ return /reading 'collection'/.test(m); }).length);

  /* ══ 3. GLI ALTRI RITORNI GERARCHICI NON SONO STATI TOCCATI ═══════════ */
  console.log("\n  FUORI DALLE STANZE DEL PROFILO LA FRECCIA C'E' ANCORA");
  prova("dal Profilo si arriva al Diario", await premi(a.p, "^Il mio diario") === true);
  await premi(a.p, "^Giri$");
  prova("e si apre il dettaglio di un giro", await premi(a.p, "20/08/2026") === true);
  var dd = await doveSono(a.p);
  prova("siamo nel dettaglio del giro", dd.screen === "history-detail", "siamo su " + dd.screen);
  var nb = await quantiRitorni(a.p);
  prova("qui il ritorno c'e', ed e' uno solo", nb === 1, "trovati " + nb);
  await a.ctx.close();

  /* ══ 4. LA SERRATURA, E IL DOPPIONE CHE NON DEVE TORNARE ══════════════ */
  console.log("\n  IL PANNELLO RESTA DELL'ADMIN, E LE IMPOSTAZIONI NON HANNO UN SECONDO INGRESSO");
  var d1 = await apri(PAG_UTENTE, 1280, 900);
  await premiPastiglia(d1.p);
  var senza = await d1.p.evaluate(function(){
    return Array.prototype.slice.call(document.querySelectorAll("button"))
      .filter(function(x){ return /Amministrazione|Approvazioni/.test(x.textContent); }).length;
  });
  prova("a chi non e' admin la porta non compare affatto", senza === 0, "trovate " + senza);
  var cinque = await doveSono(d1.p);
  prova("e le sue porte sono cinque, non sei", cinque.porte.length === 5, "sono " + cinque.porte.length);
  await premi(d1.p, "^Impostazioni");
  var imp = await d1.p.evaluate(function(){
    return {
      campiAssetto: document.querySelectorAll('[id^="as_"]').length,
      porteAttr: Array.prototype.slice.call(document.querySelectorAll(".menu-btn"))
                   .filter(function(x){ return /Attrezzatura/i.test(x.textContent); }).length,
      admin: Array.prototype.slice.call(document.querySelectorAll("button"))
               .filter(function(x){ return /Amministrazione/.test(x.textContent); }).length
    };
  });
  prova("nessun campo dell'editor assetto (id as_*) vive nelle Impostazioni",
        imp.campiAssetto === 0, "trovati " + imp.campiAssetto);
  attesa("la porta verso Attrezzatura c'e', ed e' una", imp.porteAttr === 1, "trovate " + imp.porteAttr);
  prova("e il pannello non ha un secondo ingresso qui dentro", imp.admin === 0, "trovati " + imp.admin);
  await premi(d1.p, "Attrezzatura");
  var dove = await doveSono(d1.p);
  attesa("e la porta apre la pagina Attrezzatura, non un modulo qui dentro",
        dove.screen === "attrezzatura", "finisce su " + dove.screen);
  await d1.ctx.close();

  /* ══ 5. DA TELEFONO ═══════════════════════════════════════════════════ */
  console.log("\n  DA TELEFONO: SEI PORTE IMPILATE, E LA SOLA \u00abA\u00bb IN CIMA");
  var f1 = await apri(PAG_ADMIN, 390, 844);
  await premiPastiglia(f1.p);
  var df0 = await doveSono(f1.p);
  prova("le porte sono sei anche da telefono", df0.porte.length === 6, "sono " + df0.porte.length);
  await premi(f1.p, "^Attrezzatura");
  var nf = await quantiRitorni(f1.p);
  prova("in Attrezzatura nessun tasto di ritorno accanto alla pastiglia", nf === 0, "trovati " + nf);
  await premiPastiglia(f1.p);
  var df = await doveSono(f1.p);
  prova("la pastiglia apre il Profilo anche da telefono",
        df.screen === "menu" && df.carta === true, JSON.stringify(df.screen));
  prova("nessun errore in pagina", f1.err.length === 0, f1.err.slice(0,2).join(" | "));
  await f1.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite" +
    (pend ? ", " + pend + " in attesa (requisito del brief mai pubblicato)" : "") + ".\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e.message); process.exit(1); });
