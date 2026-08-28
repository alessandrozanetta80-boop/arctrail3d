#!/usr/bin/env node
/* Fotografa il giro dell'app NAVIGANDO, come farebbe una persona.
 *
 * PERCHE' NON BASTA SEMINARE LO STATO. All'apertura l'app riscrive
 * `state.screen = "menu"` e `state.tab = "tira"` — e' la decisione «riaprire
 * l'app = ripartire dalla home», scritta apposta. Quindi qualunque schermata
 * si semini in localStorage viene buttata via: la prima versione di questo
 * giro ha fotografato NOVE VOLTE la stessa schermata senza accorgersene.
 *
 * IL LIMITE, dichiarato. Con DEV_MODE non c'e' nessun utente collegato:
 * la barra in fondo non compare e le schede Campi, Compagnie, Mercatino e
 * Profilo non sono raggiungibili. Si vede quello che si vede senza accesso.
 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright");

var DOVE = "C:/Users/azanetta/AppData/Local/Temp/claude/giro";
if (!fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });

var VERSIONI = [
  { nome: "prima", file: "C:/Users/azanetta/AppData/Local/Temp/claude/index-prima-linguaggio.html" },
  { nome: "dopo", file: "app.html" }
];

var STATO = {
  screen: "menu", tab: "tira", pendingArchers: [],
  lang: "it", country: "it", federation: "fiarc", theme: "light",
  profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
             compagniaNome: "A.S.D. Arcieri del Verbano", classe: "SM", arco: "longbow" },
  profileSkipped: false
};

/* I passi: dove si arriva cliccando, non seminando. */
var TAPPE = [
  { nome: "1-tira",     temi: ["light", "dark", "sole"], passi: [] },
  { nome: "2-diario",   temi: ["light"], passi: ["Il mio diario"] },
  { nome: "3-arcieri",  temi: ["light"], passi: ["Inizia Allenamento"] },
  { nome: "4-prepara",  temi: ["light"], passi: ["Inizia Allenamento", "Continua"] },
  { nome: "5-pista",    temi: ["light", "sole"], passi: ["Inizia Allenamento", "Continua", "Inizia percorso"] }
];

async function scatta(page, file) {
  var h = await page.evaluate(function () {
    return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight,
                    (document.getElementById("app") || {}).scrollHeight || 0);
  });
  await page.setViewportSize({ width: 390, height: Math.min(Math.max(h + 30, 680), 1500) });
  await page.waitForTimeout(220);
  await page.screenshot({ path: file, type: "jpeg", quality: 86 });
  return h;
}

(async function () {
  var browser = await chromium.launch();
  var esito = [];
  for (var q = 0; q < VERSIONI.length; q++) {
    var ver = VERSIONI[q];
    var TEMP = path.join(DOVE, "_" + ver.nome);
    if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });
    fs.writeFileSync(path.join(TEMP, "index.html"),
      fs.readFileSync(ver.file, "utf8").replace("var DEV_MODE = false;", "var DEV_MODE = true;"));
    ["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (x) {
      if (fs.existsSync(x)) fs.copyFileSync(x, path.join(TEMP, x));
    });
    console.log("\n  === " + ver.nome.toUpperCase() + " ===");
    for (var i = 0; i < TAPPE.length; i++) {
      var tp = TAPPE[i];
      for (var j = 0; j < tp.temi.length; j++) {
        var tema = tp.temi[j];
        var ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
        var st = Object.assign({}, STATO, { theme: tema });
        await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
          JSON.stringify(JSON.stringify(st)) +
          "); localStorage.setItem('arctrail3d_welcome_v2', '1'); }catch(e){}");
        var page = await ctx.newPage();
        var errori = [];
        page.on("pageerror", function (e) { errori.push(String(e.message)); });
        await page.goto("file:///" + path.join(TEMP, "index.html").replace(/\\/g, "/"));
        await page.waitForTimeout(1200);

        var guaio = null;
        for (var k = 0; k < tp.passi.length; k++) {
          var p = tp.passi[k];
          try {
            if (p === "@start") {
              await page.locator("button.btn-primary.btn-block").first().click({ timeout: 4000 });
            } else {
              await page.locator("button", { hasText: p }).first().click({ timeout: 4000 });
            }
            await page.waitForTimeout(700);
          } catch (e) { guaio = "non trovato: " + p; break; }
        }

        var suff = tp.temi.length > 1 ? "-" + tema : "";
        var h = await scatta(page, path.join(DOVE, ver.nome + "-" + tp.nome + suff + ".jpg"));
        var testa = await page.evaluate(function () {
          return (document.getElementById("app").innerText || "").slice(0, 46).replace(/\s+/g, " ");
        });
        console.log("    " + (tp.nome + suff).padEnd(24) + String(h).padStart(5) + "px  " +
          (guaio ? "\u2717 " + guaio : "\u00ab" + testa + "\u00bb") +
          (errori.length ? "  ERRORE: " + errori[0].slice(0, 40) : ""));
        esito.push({ v: ver.nome, s: tp.nome + suff, h: h, guaio: guaio });
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log("\n  ALTEZZE, prima \u2192 dopo");
  var per = {};
  esito.forEach(function (e) { (per[e.s] = per[e.s] || {})[e.v] = e.h; });
  Object.keys(per).forEach(function (k) {
    var a = per[k].prima, b = per[k].dopo;
    if (a && b) console.log("    " + k.padEnd(24) + String(a).padStart(5) + " \u2192 " + String(b).padStart(5) +
      "   " + (b < a ? "\u2212" : "+") + Math.abs(b - a) + "px");
  });
})();
