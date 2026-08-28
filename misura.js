/* misura.js — legge i colori VERI che il browser calcola per i pezzi toccati,
 * nei tre temi, e ne stampa il contrasto. Va lanciato dentro SITO/.
 *   node misura.js <file.html>
 *
 * ATTENZIONE AL FORMATO. Chromium serializza un `color-mix()` come
 * `color(srgb 0.905 0.952 0.870)` — valori da 0 a 1, non da 0 a 255. Leggerli
 * con la stessa regola di `rgb(...)` da numeri quasi neri, e quindi contrasti
 * inventati: e' esattamente l'errore che questo file ha fatto al primo giro.
 */
var fs = require("fs");
var path = require("path");
var os = require("os");
var url = require("url");
var { chromium } = require("playwright");

var FILE = process.argv[2] || "app.html";
var D = path.join(os.tmpdir(), "arctrail-misura");
if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, "index.html"),
  require("./copia-dev.js").accendiDev(fs.readFileSync(FILE, "utf8")));
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
  if (fs.existsSync(x)) fs.copyFileSync(x, path.join(D, x));
});

/* [nome, html da montare, selettore del fondo, selettore della scritta] */
var PEZZI = [
  ["fin-record (record personale)", "<div class='fin-record'>record</div>", ".fin-record", ".fin-record"],
  ["attr-pred (predefinito)", "<span class='attr-pred'>predefinito</span>", ".attr-pred", ".attr-pred"],
  ["pp-tondo (iniziali)", "<div class='pp-tondo'>AZ</div>", ".pp-tondo", ".pp-tondo"],
  ["reg-sotto (l'ultima volta)", "<div class='card reg-sotto'>ultima volta</div>", ".reg-sotto", ".reg-sotto"],
  ["diario-nota (la nota)", "<div class='diario-nota'>nota</div>", ".diario-nota", ".diario-nota"],
  ["resume ritrovato", "<div class='resume-banner ritrovato'>ritrovato</div>", ".resume-banner", ".resume-banner"],
  ["campo-scheda / allena", "<div class='campo-scheda'><div class='cp-info-row allena'>si allena</div></div>", ".campo-scheda", ".allena"],
  ["campo-scheda / link", "<div class='campo-scheda'><div class='cp-info-row'><a href='#'>340</a></div></div>", ".campo-scheda", ".campo-scheda a"],
  ["campo-scheda / testo", "<div class='campo-scheda'><div class='cp-info-row chi'>A.S.D.</div></div>", ".campo-scheda", ".chi"],
  ["riga campo / icona", "<div class='comp-riga'><span class='mini'>i</span></div>", ".card", ".comp-riga .mini"]
];

function lum(rgb) {
  var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function cr(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

var TEMI = [["light", "chiaro"], ["dark", "scuro"], ["sole", "sole"]];

(async function () {
  var browser = await chromium.launch();
  var brutti = 0;
  for (var i = 0; i < TEMI.length; i++) {
    var tema = TEMI[i][0], nome = TEMI[i][1];
    var ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    var page = await ctx.newPage();
    await page.goto(url.pathToFileURL(path.join(D, "index.html")).href);
    await page.waitForTimeout(1000);
    var out = await page.evaluate(function (args) {
      document.body.className = "theme-" + args.tema;
      var host = document.createElement("div");
      host.className = "card";
      host.style.position = "fixed"; host.style.top = "0"; host.style.left = "0";
      document.body.appendChild(host);
      function rgb(s) {
        var t = String(s);
        var m = t.match(/[\d.]+/g);
        if (!m) return null;
        var q = /^color\(/.test(t) ? 255 : 1;   // color(srgb 0..1) contro rgb(0..255)
        return [Math.round(+m[0] * q), Math.round(+m[1] * q), Math.round(+m[2] * q)];
      }
      function opaco(s) {
        var m = String(s).match(/[\d.]+/g);
        return !!m && (m.length < 4 || +m[3] > 0.99);
      }
      function fondoVero(el) {
        var n = el;
        while (n && n !== document.documentElement) {
          var b = getComputedStyle(n).backgroundColor;
          if (opaco(b)) return rgb(b);
          n = n.parentElement;
        }
        return [255, 255, 255];
      }
      return args.pezzi.map(function (p) {
        host.innerHTML = p[1];
        var f = host.querySelector(p[2]) || host;
        var s = host.querySelector(p[3]) || f;
        return { nome: p[0], fondo: fondoVero(f), scritta: rgb(getComputedStyle(s).color) };
      });
    }, { tema: tema, pezzi: PEZZI });
    console.log("\n  == TEMA " + nome.toUpperCase() + " ==");
    out.forEach(function (r) {
      var v = cr(r.scritta, r.fondo);
      var segno = v >= 4.5 ? "ok " : "NO ";
      if (v < 4.5) brutti++;
      console.log("   " + segno + r.nome.padEnd(32) + v.toFixed(2).padStart(6) +
        "   scritta rgb(" + r.scritta.join(",") + ") su rgb(" + r.fondo.join(",") + ")");
    });
    await ctx.close();
  }
  await browser.close();
  console.log("\n  " + (brutti ? brutti + " COPPIE SOTTO 4,5" : "tutte le coppie sopra 4,5") + "\n");
})();
