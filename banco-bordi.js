#!/usr/bin/env node
/* banco-bordi.js — niente tocca il vetro, e tutto cade sulla stessa riga.
 *
 *   node banco-bordi.js [index.html]
 *
 * PERCHE ESISTE. (22/08/2026.) Questo difetto e stato segnalato da Alessandro
 * piu di una volta, curato piu di una volta, e piu di una volta e tornato. Il
 * motivo per cui tornava e che NESSUNO LO MISURAVA: si guardava una foto, si
 * cambiava un numero, e la foto dopo sembrava a posto. Ma il margine che si
 * vede non e un numero scritto da qualche parte — e il risultato di un
 * margine negativo, di un'imbottitura e di quale delle due regole vince, e le
 * tre cose stanno in punti lontani del foglio.
 *
 * IL GUASTO VERO, per chi legge fra un anno. Una regola del 20/08 toglieva il
 * riquadro attorno alle porte e scriveva `padding:0`. Una regola del 22/08,
 * ottocento righe piu sotto, dava alle stesse fasce il margine di pagina. La
 * prima e piu specifica, quindi vinceva — in silenzio. Risultato: nella
 * scheda Tira e nel profilo il titolo di sezione e le righe stavano a ZERO
 * pixel dal bordo dello schermo. Nessuna delle due regole era sbagliata da
 * sola, e a leggere il foglio non si vedeva.
 *
 * COSA MISURA. Apre tre schermate a quattro larghezze e guarda dove cade il
 * testo rispetto al guscio della pagina. Due domande, e sono diverse:
 *   1. nessuno sta sotto il margine minimo (il difetto segnalato);
 *   2. tutti cadono sullo STESSO margine — quello che esce dalle fasce e
 *      quello che non ne esce. Un margine giusto ma diverso da riga a riga fa
 *      sembrare la pagina montata da due persone.
 *
 * NON SOSTITUISCE L'OCCHIO: misura che ci sia aria, non che sia bella.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-banco-bordi");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

// Il margine atteso a ogni larghezza. Sono i tre valori di `--bordo`, e sono
// scritti qui apposta: se qualcuno li cambia nel foglio, questo banco deve
// dire di no finche' non li cambia anche qui. Un numero che si adatta da solo
// non protegge niente.
// `unaColonna` dice se a quella larghezza la pagina e' ancora una colonna
// sola. Da 900px in su non lo e' — le fasce si affiancano — e chiedere che
// tutto parta dallo stesso punto sarebbe chiedere che il layout a colonne non
// esista. Li' resta la domanda che conta: nessuno tocca il vetro.
var SCHERMI = [
  { w: 360, atteso: 16, unaColonna: true },
  { w: 412, atteso: 16, unaColonna: true },
  { w: 820, atteso: 24, unaColonna: true },
  { w: 1200, atteso: 32, unaColonna: false }
];
var SCHERMATE = ["home", "tira", "profilo"];

var ok = 0, ko = 0;
function prova(n, c, extra) {
  if (c) { ok++; console.log("  ✓ " + n); }
  else { ko++; console.log("  ✗ " + n + (extra ? "  — " + extra : "")); }
}

function stato() {
  return { screen: "menu", tab: "home", roundActive: false, pendingArchers: [],
    lang: "it", country: "it", federation: "fiarc", theme: "light",
    profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
               compagniaNome: "A.S.D. Arcieri del VCO & Valgrande", classe: "SM", arco: "longbow" },
    profileSkipped: false };
}

// Si misura rispetto al GUSCIO, non alla finestra: la barra di scorrimento
// del browser senza telefono ruberebbe quindici pixel a destra e farebbe
// sembrare storto quello che e' dritto.
function misura() {
  var gu = document.getElementById("app").getBoundingClientRect();
  var out = [];
  var visti = {};
  [".section-title", ".strato-eti", ".menu-btn", ".card > h2", "h1",
   ".home-saluto", ".btn.btn-block"].forEach(function (s) {
    Array.prototype.forEach.call(document.querySelectorAll("#app " + s), function (e) {
      // La barra in fondo e l'insegna non sono contenuto della pagina: la
      // prima e' larga quanto lo schermo di proposito, la seconda ha
      // un'impaginazione sua.
      if (e.closest(".tabbar-bottom") || e.closest("header.top")) return;
      var t = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
      if (!t || visti[t]) return; visti[t] = 1;
      var r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      out.push({ t: t, sx: Math.round(r.left - gu.left), dx: Math.round(gu.right - r.right) });
    });
  });
  return out;
}

async function apri(browser, w, schermata) {
  var ctx = await browser.newContext({ viewport: { width: w, height: 1200 } });
  await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
    JSON.stringify(JSON.stringify(stato())) + "); localStorage.setItem('arctrail3d_welcome_v2','1'); }catch(e){}");
  var page = await ctx.newPage();
  await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
  await page.waitForTimeout(900);
  // Ci si arriva come una persona: il tab si tocca, il profilo si apre dalla riga.
  await page.evaluate(function (s) {
    if (s === "profilo") {
      var b = Array.prototype.filter.call(document.querySelectorAll("#app button"),
        function (x) { return /profilo/i.test(x.textContent) ||
                             /profilo/i.test(x.getAttribute("aria-label") || ""); })[0];
      if (b) b.click(); return;
    }
    var eti = { home: "Home", tira: "Tira" }[s];
    var bar = document.querySelector(".tabbar-bottom") || document.querySelector("header.top");
    if (bar) {
      var v = Array.prototype.filter.call(bar.querySelectorAll("button"),
        function (x) { return x.textContent.trim() === eti; })[0];
      if (v) v.click();
    }
  }, schermata);
  await page.waitForTimeout(800);
  return { ctx: ctx, page: page };
}

(async function () {
  var browser = await chromium.launch();

  for (var i = 0; i < SCHERMI.length; i++) {
    var sc = SCHERMI[i];
    console.log("\n  A " + sc.w + " PIXEL IL MARGINE E' " + sc.atteso);
    for (var j = 0; j < SCHERMATE.length; j++) {
      var nome = SCHERMATE[j];
      var a = await apri(browser, sc.w, nome);
      var righe = await a.page.evaluate(misura);
      await a.ctx.close();

      if (!righe.length) { prova(nome + ": c'e' qualcosa da misurare", false, "niente in pagina"); continue; }

      // 1. NESSUNO TOCCA IL VETRO. E' il difetto segnalato: qui il numero che
      //    conta e' il minimo, non la media.
      var stretti = righe.filter(function (r) { return r.sx < sc.atteso || r.dx < sc.atteso; });
      prova(nome + ": nessuna riga sta sotto il margine",
        stretti.length === 0,
        stretti.length ? stretti.map(function (r) { return "«" + r.t + "» sx" + r.sx + " dx" + r.dx; }).join(" · ") : "");

      // 2. E CADONO TUTTI SULLA STESSA RIGA VERTICALE. Un margine giusto ma
      //    diverso da riga a riga e' il difetto di prima travestito.
      if (sc.unaColonna) {
        var sinistri = {};
        righe.forEach(function (r) { sinistri[r.sx] = (sinistri[r.sx] || 0) + 1; });
        var valori = Object.keys(sinistri).map(Number).sort(function (a, b) { return a - b; });
        prova(nome + ": partono tutte dallo stesso punto",
          valori.length === 1 && valori[0] === sc.atteso,
          valori.join(", "));
      } else {
        // A colonne la riga verticale non e' una sola. Si controlla che la
        // PRIMA colonna parta dal margine: se sfonda lei, sfonda la pagina.
        var minimo = Math.min.apply(null, righe.map(function (r) { return r.sx; }));
        prova(nome + ": la prima colonna parte dal margine",
          minimo === sc.atteso, minimo + "");
      }
    }
  }

  await browser.close();
  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})();
