#!/usr/bin/env node
/* banco-ritorno.js — il ritorno canonico, e le due cose che non devono tornare.
 *
 *   node banco-ritorno.js [app.html]
 *
 * NASCE IL 30/08/2026, dalla rifinitura da computer. Protegge tre decisioni:
 *
 *  1. IL RITORNO E' UNO SOLO E PARLA CON LA FRECCIA. Sulle sottopagine del
 *     profilo c'era l'omino col «\u2190 Profilo» accanto — due persone in fila,
 *     la pastiglia «A» e il ritorno, per due mestieri diversi. Adesso il
 *     ritorno e' la freccia e la parola da computer, la sola freccia da
 *     telefono. Se l'omino torna sul tasto del ritorno, qui si vede.
 *  2. L'EDITOR DELL'ATTREZZATURA VIVE IN UN POSTO SOLO. Le Impostazioni
 *     hanno una porta che ci manda, non una seconda copia dei campi: due
 *     moduli per lo stesso dato finiscono sempre per non essere d'accordo.
 *  3. «AMMINISTRAZIONE», NON PIU' «APPROVAZIONI». Il pannello e' da tempo
 *     piu' largo delle approvazioni: l'etichetta ha raggiunto il contenuto,
 *     in nove lingue. Le chiavi interne (`adminTab`, schermata `admin`)
 *     restano com'erano, apposta: il cambio e' di parola, non di percorso.
 *
 * LIMITE DICHIARATO: lo Spazio compagnia non si naviga da qui — vuole i
 * codici del referente da Firestore, che questo banco non ha. Il suo ritorno
 * e' pero' lo STESSO tasto (nasce in `header()`, un posto solo): provarlo su
 * Attrezzatura e Impostazioni prova il componente, non le due pagine.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var src = fs.readFileSync(FILE, "utf8");

var ok = 0, ko = 0;
function prova(n, c, extra){ if(c){ ok++; console.log("  \u2713 " + n); } else { ko++; console.log("  \u2717 " + n + (extra ? "  \u2014 " + extra : "")); } }

/* ── Le prove sul sorgente: il pattern vecchio e le nove etichette ─────── */
console.log("\n  IL SORGENTE NON HA PIU' IL PATTERN VECCHIO");
prova("il ritorno non porta il segno della scheda (pieno:doveTorna sparito)",
      src.indexOf("pieno:doveTorna") < 0);
prova("il ritorno dichiara la freccia", /id:"menu", freccia:true/.test(src));

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
   trovato sabotando: la stringa esiste in SETTE punti del file, e la prova
   che ne cercava una qualunque diceva di si' anche con la porta del
   pannello spalancata.) */
prova("il pannello resta solo dell'admin (la serratura sta SULLA porta)",
      /currentUser\.email === ADMIN_EMAIL\)\{\nvar adminBtn/.test(src));
prova("le chiavi interne non sono state toccate: adminTab e la schermata admin esistono",
      /adminTab = "accessi"/.test(src) && /case "admin": app\.appendChild\(adminScreen\(\)\)/.test(src));

/* ── Le prove sullo schermo ────────────────────────────────────────────── */
var D = fs.mkdtempSync(path.join(os.tmpdir(), "ritorno-"));
fs.writeFileSync(path.join(D, "index.html"),
  src.replace("var DEV_MODE = false;", "var DEV_MODE = true;"));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function(x){
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});
var STATO = { screen:"menu", tab:"profilo", pendingArchers:[], lang:"it", country:"it",
  federation:"fiarc", theme:"light", profileSkipped:false,
  profile:{ nomeCognome:"Alessandro Zanetta", username:"alez", compagnia:"01VERB", compagniaNome:"Arcieri del Verbano" } };

(async function(){
  var browser = await chromium.launch();

  async function apri(w, h){
    var ctx = await browser.newContext({ viewport:{ width:w, height:h } });
    var p = await ctx.newPage();
    var err = [];
    p.on("pageerror", function(e){ err.push(String(e.message)); });
    await p.addInitScript(function(st){
      localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st));
      localStorage.setItem("arctrail3d_welcome_v2", "1");
    }, STATO);
    await p.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
    await p.waitForTimeout(900);
    // al profilo dalla pastiglia con l'iniziale
    await p.evaluate(function(){
      var a = Array.prototype.slice.call(document.querySelectorAll("header .bar-btn"))
        .filter(function(x){ return x.textContent.trim() === "A"; })[0];
      if(a) a.click();
    });
    await p.waitForTimeout(500);
    return { ctx:ctx, p:p, err:err };
  }

  // Il tasto del ritorno: quello in testata il cui titolo comincia con la freccia.
  function leggiRitorno(p){
    return p.evaluate(function(){
      var tutti = Array.prototype.slice.call(document.querySelectorAll("header button"))
        .filter(function(x){ return (x.title || "").charAt(0) === "\u2190"; });
      if(tutti.length !== 1) return { quanti: tutti.length };
      var b = tutti[0];
      return { quanti: 1, title: b.title, testo: b.textContent.trim(),
               svgDentro: /<svg/i.test(b.innerHTML) };
    });
  }

  async function versoIlProfilo(p, comeSiApre){
    await p.evaluate(comeSiApre);
    await p.waitForTimeout(600);
  }
  var apriAttrezzatura = function(){
    var b = Array.prototype.slice.call(document.querySelectorAll(".menu-btn"))
      .filter(function(x){ return /Attrezzatura/i.test(x.textContent); })[0];
    if(b) b.click();
  };
  var apriImpostazioni = function(){
    var tutte = Array.prototype.slice.call(document.querySelectorAll(".menu-btn"))
      .filter(function(x){ return /Impostazioni/i.test(x.textContent); });
    if(tutte[0]) tutte[0].click();
  };

  /* ══ DA COMPUTER: freccia e parola, mai l'omino ═══════════════════════ */
  console.log("\n  DA COMPUTER IL RITORNO E' \u00ab\u2190 PROFILO\u00bb, SENZA NESSUN SEGNO DAVANTI");
  var a = await apri(1200, 900);
  await versoIlProfilo(a.p, apriAttrezzatura);
  var r = await leggiRitorno(a.p);
  prova("in Attrezzatura il ritorno c'e', ed e' uno solo", r.quanti === 1, "trovati " + r.quanti);
  if(r.quanti === 1){
    prova("dice \u00ab\u2190 Profilo\u00bb", r.testo === "\u2190 Profilo", "dice \u00ab" + r.testo + "\u00bb");
    prova("e non porta nessun disegno dentro", r.svgDentro === false);
  }
  // si preme, e si torna alla carta d'identita'
  await a.p.evaluate(function(){
    var b = Array.prototype.slice.call(document.querySelectorAll("header button"))
      .filter(function(x){ return (x.title || "").charAt(0) === "\u2190"; })[0];
    if(b) b.click();
  });
  await a.p.waitForTimeout(500);
  var tornato = await a.p.evaluate(function(){
    return !!document.querySelector('[class*="mp-"]');
  });
  prova("premuto, riporta alla carta del profilo", tornato === true);

  console.log("\n  IN IMPOSTAZIONI LO STESSO TASTO, E NESSUN SECONDO EDITOR");
  await versoIlProfilo(a.p, apriImpostazioni);
  var r2 = await leggiRitorno(a.p);
  prova("il ritorno e' lo stesso: uno, \u00ab\u2190 Profilo\u00bb, senza disegni",
        r2.quanti === 1 && r2.testo === "\u2190 Profilo" && r2.svgDentro === false,
        JSON.stringify(r2));
  var imp = await a.p.evaluate(function(){
    var campiAssetto = document.querySelectorAll('[id^="as_"]').length;
    var porte = Array.prototype.slice.call(document.querySelectorAll(".menu-btn"))
      .filter(function(x){ return /Attrezzatura/i.test(x.textContent); });
    return { campiAssetto: campiAssetto, porteAttr: porte.length };
  });
  prova("nessun campo dell'editor assetto (id as_*) vive qui", imp.campiAssetto === 0, "trovati " + imp.campiAssetto);
  prova("la porta verso Attrezzatura c'e', ed e' una", imp.porteAttr === 1, "trovate " + imp.porteAttr);
  await a.p.evaluate(function(){
    var b = Array.prototype.slice.call(document.querySelectorAll(".menu-btn"))
      .filter(function(x){ return /Attrezzatura/i.test(x.textContent); })[0];
    if(b) b.click();
  });
  await a.p.waitForTimeout(500);
  var doveFinisce = await a.p.evaluate(function(){
    return (JSON.parse(localStorage.getItem("arctrail3d_state_v3")) || {}).screen;
  });
  prova("e la porta apre la pagina Attrezzatura, non un modulo qui dentro",
        doveFinisce === "attrezzatura", "finisce su " + doveFinisce);

  console.log("\n  L'ETICHETTA NUOVA SI LEGGE, MA SOLO DALL'ADMIN");
  var senzaAdmin = await a.p.evaluate(function(){
    // qui non c'e' nessun currentUser: la voce non deve esserci affatto
    return Array.prototype.slice.call(document.querySelectorAll("button"))
      .filter(function(x){ return /Amministrazione|Approvazioni/.test(x.textContent); }).length;
  });
  prova("senza privilegi non compare nessuna voce, ne' nuova ne' vecchia", senzaAdmin === 0, "trovate " + senzaAdmin);
  prova("nessun errore in pagina", a.err.length === 0, a.err.slice(0,2).join(" | "));
  await a.ctx.close();

  /* ══ DA TELEFONO: la sola freccia, e mai due persone in fila ══════════ */
  console.log("\n  DA TELEFONO RESTA LA SOLA FRECCIA, ACCANTO ALLA \u00abA\u00bb");
  var b2 = await apri(390, 844);
  await versoIlProfilo(b2.p, apriAttrezzatura);
  var r3 = await leggiRitorno(b2.p);
  prova("il ritorno c'e', ed e' uno solo", r3.quanti === 1, "trovati " + r3.quanti);
  if(r3.quanti === 1){
    prova("mostra la freccia e nient'altro", r3.testo === "\u2190", "mostra \u00ab" + r3.testo + "\u00bb");
    prova("nessun omino nel tasto", r3.svgDentro === false);
  }
  prova("nessun errore in pagina", b2.err.length === 0, b2.err.slice(0,2).join(" | "));
  await b2.ctx.close();

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e.message); process.exit(1); });
