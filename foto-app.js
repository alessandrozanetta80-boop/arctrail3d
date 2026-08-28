#!/usr/bin/env node
/* foto-app.js — fotografa una schermata dell app vera, nei tre temi.
 *
 *   node foto-app.js [file.html] [cartella] [etichetta]
 *
 * PERCHE ESISTE. (20/08/2026.) Fino a oggi, per sapere che aspetto avesse
 * una schermata, si ricostruiva a memoria o si aspettava che Alessandro
 * mandasse uno screenshot. Ricostruire a memoria e la cosa che le note
 * vietano da sempre: si finisce a discutere di un disegno che nessuno ha
 * davanti.
 *
 * Questo prende index.html, ne fa una copia con DEV_MODE acceso — l
 * interruttore che c e gia nel file per provare senza Firebase — semina lo
 * stato in localStorage e scatta. Chiara, scura, sole.
 *
 * NON SOSTITUISCE IL TELEFONO VERO. Una foto dice lo stato, non la
 * percezione: niente sole in faccia, niente pollice, niente riflesso. Serve
 * a non discutere al buio, non a chiudere il punto zero.
 */var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright");

var SORGENTE = process.argv[2] || "app.html";
var DOVE = process.argv[3] || "C:/Users/azanetta/AppData/Local/Temp/claude/foto";
var ETICHETTA = process.argv[4] || "oggi";

if (!fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });

var TEMP = path.join(DOVE, "_app");
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

// La copia di prova la prepara copia-dev.js: DEV_MODE acceso E un utente
// finto collegato. Senza l utente la barra in fondo non si disegna, ed e il
// motivo per cui fino al 20/08 non compariva in nessuna foto.
var html = require("./copia-dev.js").accendiDev(fs.readFileSync(SORGENTE, "utf8"));
fs.writeFileSync(path.join(TEMP, "index.html"), html);
["compagnie-data.js", "logo.webp", "logo.jpg"].forEach(function (f) {
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(TEMP, f));
});

var STATO = {
  screen: "menu", tab: "tira", pendingArchers: [],
  lang: "it", country: "it", federation: "fiarc",
  theme: "light",
  profile: { nomeCognome: "Alessandro Zanetta", username: "alez", compagnia: "01VERB",
             compagniaNome: "A.S.D. Arcieri del Verbano", classe: "SM", arco: "longbow" },
  profileSkipped: false
};

// Tre temi sul telefono, piu uno da computer: da 760px in su la barra non e
// piu in fondo, entra nella testata (.tabbar-wide) — e quella e una seconda
// schermata, non la stessa piu larga.
var TEMI = [["light", "chiara", 390, 1100], ["dark", "scura", 390, 1100],
            ["sole", "sole", 390, 1100], ["light", "computer", 1280, 900]];

(async function () {
  var browser = await chromium.launch();
  for (var i = 0; i < TEMI.length; i++) {
    var tema = TEMI[i][0], nome = TEMI[i][1];
    var ctx = await browser.newContext({
      viewport: { width: TEMI[i][2], height: TEMI[i][3] },
      deviceScaleFactor: TEMI[i][2] > 800 ? 1 : 2
    });
    var stato = JSON.parse(JSON.stringify(STATO));
    stato.theme = tema;
    await ctx.addInitScript("try{ localStorage.setItem('arctrail3d_state_v3', " +
      JSON.stringify(JSON.stringify(stato)) + "); localStorage.setItem('arctrail3d_welcome_v2', '1'); }catch(e){}");
    var page = await ctx.newPage();
    var errori = [];
    page.on("pageerror", function (e) { errori.push(String(e.message)); });
    await page.goto("file:///" + path.join(TEMP, "index.html").replace(/\\/g, "/"));
    await page.waitForTimeout(1400);
    var visto = await page.evaluate(function () {
      var a = document.getElementById("app");
      return {
        vuoto: !a || a.innerHTML.trim() === "",
        classi: document.body.className,
        testo: (a ? a.innerText : "").slice(0, 140).replace(/\s+/g, " ")
      };
    });
    var file = path.join(DOVE, ETICHETTA + "-" + nome + ".png");
    await page.screenshot({ path: file, fullPage: true });
    console.log("  " + nome.padEnd(7) + " body=" + (visto.classi || "(niente)").padEnd(12) +
      (visto.vuoto ? "  APP VUOTA" : "  ok") +
      (errori.length ? "  ERRORI: " + errori[0].slice(0, 70) : ""));
    if (!visto.vuoto) console.log("            «" + visto.testo + "»");
    await ctx.close();
  }
  await browser.close();
  console.log("\n  foto in " + DOVE);
})();
