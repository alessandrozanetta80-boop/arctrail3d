#!/usr/bin/env node
/* BOZZA — banco-safe-area.js: la testata e la tacca del telefono.
   Va copiata in tests/ dopo aver creato il ramo fix/s26-safe-area-2026-09-17.

     node tests/banco-safe-area.js [app.html]

   PERCHE' ESISTE. Su un telefono con la tacca, installata come app, la fascia
   in cima si vedeva piu' alta di quanto deve, e SALTAVA appena si scorreva.
   La causa non e' il telefono: `header.top` e' `position:sticky; top:0` e
   chiede `env(safe-area-inset-top)` DUE VOLTE — una nel `margin-top` e una
   nel `padding-top`. Ferma in cima la barra parte all'inset e se lo somma
   dentro; appena si attacca il margine smette di contare e il riempimento
   resta, quindi l'altezza cambia da sola. Da browser l'inset vale 0 e non si
   vede niente: per questo il difetto sembra «di Samsung» e non lo e'.

   DUE PROVE, E SERVONO TUTTE E DUE.
   1) STATICA, sul foglio di stile: lo stesso inset non deve comparire come
      margine E come riempimento sulla stessa testata. E' quella che impedisce
      che il difetto torni, ed e' l'unica che puo' girare sempre.
   2) MISURATA, nel browser: `env()` non si puo' impostare da fuori — nessun
      banco puo' fingere una tacca vera. Si inietta un foglio che riscrive
      QUELLE DUE proprieta' con una misura nota, e si guarda la geometria:
      l'altezza della barra non deve cambiare fra fermo e attaccato, e il suo
      bordo superiore attaccato deve stare a 0.

   NON e' un banco Samsung: non guarda lo user agent, non ha media query di
   modello, e misura una regola che vale per qualunque telefono con la tacca.
   NON tocca l'app: lavora su una copia in una cartella temporanea. */

var fs = require("fs");
var path = require("path");
var os = require("os");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");

var ok = 0, ko = 0;
function prova(n, c, extra){
  if(c){ ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

/* ══ 1. LA PROVA STATICA ═══════════════════════════════════════════════════
   Si leggono TUTTE le regole `header.top{...}` del foglio e si conta dove
   finisce `env(safe-area-inset-top)`. Non si guarda una riga sola: la testata
   e' scritta in piu' blocchi, ed e' proprio sommandoli che nasce il difetto. */
console.log("\n  LA TACCA SI CHIEDE UNA VOLTA SOLA");
var regole = [];
var re = /header\.top\s*\{([^}]*)\}/g, m;
while((m = re.exec(src))) regole.push(m[1]);
prova("le regole di header.top si trovano", regole.length > 0, regole.length + " trovate");

var tutte = regole.join("\n");
function quante(prop){
  var r = new RegExp(prop + "\\s*:[^;]*env\\(\\s*safe-area-inset-top", "g");
  return (tutte.match(r) || []).length;
}
var nelMargine = quante("margin-top");
var nelRiempimento = quante("padding-top");
prova("l'inset non sta contemporaneamente nel margine e nel riempimento",
      !(nelMargine > 0 && nelRiempimento > 0),
      "margin-top: " + nelMargine + " · padding-top: " + nelRiempimento);
prova("ma l'inset c'e' ancora: la barra di stato resta rispettata",
      (nelMargine + nelRiempimento) > 0);

/* La barra in fondo e' il contro-esempio buono: usa l'inset una volta sola.
   Se un giorno prendesse la stessa abitudine, questo lo dice. */
var giu = /\.tabbar-bottom\s*\{([^}]*)\}/.exec(src);
if(giu){
  var giuTesto = giu[1];
  var giuMar = (giuTesto.match(/margin-bottom\s*:[^;]*env\(\s*safe-area-inset-bottom/g) || []).length;
  var giuPad = (giuTesto.match(/padding-bottom\s*:[^;]*env\(\s*safe-area-inset-bottom/g) || []).length;
  prova("in fondo l'inset resta chiesto una volta sola", !(giuMar > 0 && giuPad > 0),
        "margin-bottom: " + giuMar + " · padding-bottom: " + giuPad);
}

/* ══ 2. LA PROVA MISURATA ══════════════════════════════════════════════════ */
var D = path.join(os.tmpdir(), "arctrail-banco-safe-area");
if(!fs.existsSync(D)) fs.mkdirSync(D, { recursive:true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(src));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function(x){
  if(fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

var TACCA = 47;   // quanto vale l'inset su un telefono con la tacca, in PWA
/* Si riscrivono SOLO le due proprieta' della testata, con la stessa forma che
   hanno nel foglio ma con una misura nota al posto di `env()`. Non si tocca
   nient'altro: se il foglio ne usa una sola, qui ne arriva una sola. */
function foglioFinto(conMargine, conRiempimento){
  return "header.top{" +
    (conMargine ? "margin-top:calc(var(--s-4) * -1 + " + TACCA + "px) !important;" : "") +
    (conRiempimento ? "padding-top:calc(var(--s-2) + " + TACCA + "px) !important;" : "") +
    "}";
}

function stato(){
  return { screen:"menu", tab:"home", pendingArchers:[], lang:"it", country:"it",
           federation:"fiarc", theme:"light", profileSkipped:false,
           profile:{ nomeCognome:"Alessandro Zanetta", username:"alez",
                     compagnia:"01VERB", compagniaNome:"Arcieri del Verbano" } };
}

(async function(){
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
  var p = await ctx.newPage();
  await p.addInitScript(function(st){
    localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st));
    localStorage.setItem("arctrail3d_welcome_v2", "1");
  }, stato());
  await p.goto("file:///" + path.join(D, "index.html").split(path.sep).join("/"));
  await p.waitForTimeout(900);

  // la tacca simulata com'e' scritta nel foglio DI OGGI
  await p.addStyleTag({ content: foglioFinto(nelMargine > 0, nelRiempimento > 0) });
  await p.waitForTimeout(200);

  function misura(){
    return p.evaluate(function(){
      var h = document.querySelector("header.top");
      if(!h) return null;
      var r = h.getBoundingClientRect();
      var s = getComputedStyle(h);
      var primo = h.firstElementChild ? h.firstElementChild.getBoundingClientRect() : null;
      return { alto: Math.round(r.height), cima: Math.round(r.top),
               contenuto: primo ? Math.round(primo.top) : null,
               margine: s.marginTop, riempimento: Math.round(parseFloat(s.paddingTop) || 0),
               posizione: s.position };
    });
  }

  /* SI MISURA DOVE COMINCIA IL CONTENUTO, NON QUANTO E' ALTA LA FASCIA.
     L'altezza non cambia mai fra ferma e attaccata — il riempimento sta dentro
     la scatola in tutti e due i casi — quindi misurarla non dimostrerebbe
     niente: passerebbe anche col difetto addosso. Il doppio conteggio si vede
     QUI: con la tacca simulata a TACCA px la prima riga scritta deve stare a
     TACCA + il riempimento di casa (--s-2, cioe' 8px). Se l'inset viene chiesto
     due volte — una nel margine e una nel riempimento — finisce a 2xTACCA + 8,
     cioe' una tacca intera piu' in basso di dove deve stare.
     E si guarda anche il SALTO: ferma, il margine la spinge giu' di una tacca;
     attaccata, `top:0` annulla il margine ma il riempimento resta. Se l'inset
     e' contato due volte il contenuto si sposta appena la barra si attacca, ed
     e' esattamente quello che si vede sul telefono. */
  console.log("\n  LA TACCA NON SI CONTA DUE VOLTE");
  var fermo = await misura();
  prova("la testata c'e' ed e' sticky", !!fermo && fermo.posizione === "sticky",
        fermo ? fermo.posizione : "assente");
  prova("ferma in cima non parte sopra lo schermo", !!fermo && fermo.cima >= 0,
        fermo ? "cima " + fermo.cima : "");
  /* IL CONFINE STA IN MEZZO, E NON E' UN NUMERO TONDO A CASO. Una tacca sola
     mette la prima riga a TACCA + 8 piu' l'aria della testata (~11px di suo):
     ~66. Due tacche la mettono a 2xTACCA + 8, cioe' ~113. Si prende il punto di
     mezzo: sopra quello l'inset e' stato contato due volte, sotto no. Un
     confine piu' stretto direbbe di no anche alla testata giusta; uno piu'
     largo direbbe di si' anche a quella sbagliata. */
  var CONFINE = Math.round(TACCA * 1.5) + 8;
  prova("il contenuto comincia UNA tacca sotto il bordo, non due",
        !!fermo && fermo.contenuto !== null && fermo.contenuto < CONFINE,
        fermo ? "prima riga a " + fermo.contenuto + "px (una tacca: ~" + (TACCA + 8) +
                ", due tacche: ~" + (2 * TACCA + 8) + ", confine " + CONFINE + ")" : "");

  await p.evaluate(function(){ window.scrollTo(0, 600); });
  await p.waitForTimeout(300);
  var attaccata = await misura();

  prova("attaccata, il bordo superiore sta a 0", !!attaccata && attaccata.cima === 0,
        attaccata ? "cima " + attaccata.cima : "");
  prova("il contenuto non salta quando la barra si attacca",
        !!fermo && !!attaccata && fermo.contenuto !== null && attaccata.contenuto !== null &&
        Math.abs(fermo.contenuto - attaccata.contenuto) <= 1,
        fermo && attaccata ? "prima riga a " + fermo.contenuto + "px, poi a " + attaccata.contenuto + "px" : "");

  /* La barra in fondo non deve essersi mossa: il fix sta in cima. */
  var sotto = await p.evaluate(function(){
    var b = document.querySelector(".tabbar-bottom");
    if(!b) return null;
    var r = b.getBoundingClientRect();
    return { basso: Math.round(window.innerHeight - r.bottom) };
  });
  if(sotto) prova("la barra in fondo resta appoggiata in basso", sotto.basso <= 1,
                  "distanza " + sotto.basso + "px");

  await ctx.close();
  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function(e){ console.error("  banco rotto:", e && e.message); process.exit(1); });
