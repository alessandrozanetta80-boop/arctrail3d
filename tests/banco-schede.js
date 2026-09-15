#!/usr/bin/env node
/* Prova le sei schede del pannello admin. Il codice NON e' ricopiato: viene
   estratto da index.html, cosi' il banco non puo' dire di si' a una versione
   che nel file non c'e' piu'. */
var fs = require("fs");
var { JSDOM } = require("jsdom");

var src = fs.readFileSync("app.html", "utf8");
var a = src.indexOf('var adminTab = "accessi";');
var b = src.indexOf("function admBadge(k, n){");
if(a < 0 || b < 0) throw new Error("macchina delle schede non trovata");
var macchina = src.slice(a, src.indexOf("\n", b) + 1);

var dom = new JSDOM('<!doctype html><body></body>');
var document = dom.window.document;
function el(h){ var d = document.createElement("div"); d.innerHTML = String(h).trim(); return d.firstChild; }

var costruisci = new Function("el", macchina +
  '\nreturn { bar: admTabsBar, panels: admPanels, panel: admPanel, badge: admBadge,' +
  '  go: admGoTab, draw: admDrawTabs, wrap: wrap, tab: function(){ return adminTab; } };' +
  '\n}\nreturn { schermo: adminScreen, entraDa: function(k){ adminTab = k; } };')(el);

var ok = 0, ko = 0;
function prova(nome, cond){ if(cond){ ok++; console.log("  \u2713 " + nome); } else { ko++; console.log("  \u2717 " + nome); } }
function card(){ return el('<div class="card"></div>'); }

console.log("\n  LE SEI SCHEDE ESISTONO E UNA SOLA SI VEDE");
var s = costruisci.schermo();
// «Percorsi» e' entrata il 20/08 con i percorsi proposti dagli arcieri: le
// compagnie senza referente non hanno nessuno che confermi, e senza questa
// scheda le loro proposte resterebbero ferme per sempre.
var cinque = ["accessi","richieste","percorsi","sessioni","profili","errori"];
cinque.forEach(function(k){ s.panel(k, card()); });
s.draw();

prova("sei etichette nella striscia", s.bar.querySelectorAll(".adm-tab").length === 6);
prova("la striscia sta SOPRA i riquadri", s.wrap.firstChild === s.bar);
var visti = cinque.filter(function(k){ return !s.panels.querySelector("#adm-pan-" + k).hidden; });
prova("si vede un riquadro solo, ed e' Accessi", visti.length === 1 && visti[0] === "accessi");
prova("la prima etichetta e' accesa", s.bar.querySelectorAll(".adm-tab")[0].classList.contains("on"));
prova("l'ordine e' quello dei compiti, gli attrezzi in fondo",
  Array.prototype.map.call(s.bar.querySelectorAll(".adm-tab"), function(x){ return x.textContent.trim().split(" ")[0]; }).join(",")
  === "Accessi,Richieste,Percorsi,Sessioni,Profili,Errori");

console.log("\n  TOCCARE UN'ETICHETTA CAMBIA RIQUADRO");
s.bar.querySelectorAll(".adm-tab")[3].dispatchEvent(new dom.window.Event("click"));
visti = cinque.filter(function(k){ return !s.panels.querySelector("#adm-pan-" + k).hidden; });
prova("adesso si vede solo Sessioni", visti.length === 1 && visti[0] === "sessioni");
prova("l'etichetta accesa e' la quarta", s.bar.querySelectorAll(".adm-tab")[3].classList.contains("on"));
prova("le altre cinque sono spente", s.bar.querySelectorAll(".adm-tab.on").length === 1);

console.log("\n  IL NUMERO COMPARE SOLO QUANDO QUALCOSA ASPETTA");
prova("con zero non c'e' nessun pallino", s.bar.querySelectorAll(".adm-tab .n").length === 0);
s.badge("richieste", 3);
prova("con tre richieste il pallino dice 3", s.bar.querySelectorAll(".adm-tab")[1].querySelector(".n").textContent === "3");
prova("il pallino sta solo dove aspetta qualcosa", s.bar.querySelectorAll(".adm-tab .n").length === 1);
s.badge("richieste", 0);
prova("approvata l'ultima, il pallino sparisce", s.bar.querySelectorAll(".adm-tab .n").length === 0);
s.badge("accessi", 2);
prova("il numero non cambia la scheda aperta", s.tab() === "sessioni");

console.log("\n  LA SCHEDA SOPRAVVIVE AL RIDISEGNO DELLA SCHERMATA");
var s2 = costruisci.schermo();     // e' quello che fa render() dopo ogni gesto
cinque.forEach(function(k){ s2.panel(k, card()); });
s2.draw();
visti = cinque.filter(function(k){ return !s2.panels.querySelector("#adm-pan-" + k).hidden; });
prova("dopo render() si e' ancora su Sessioni", visti.length === 1 && visti[0] === "sessioni");

console.log("\n  L'AVVISO PORTA SULLA SCHEDA GIUSTA");
var m = src.match(/function admTabDaAvviso\(id\)\{\n([\s\S]*?)\n\}/);
prova("admTabDaAvviso c'e' nel file", !!m);
var quale = new Function("id", m[1]);
prova("club-BG01_abc \u2192 richieste", quale("club-BG01_abc") === "richieste");
prova("isc-abc \u2192 accessi",        quale("isc-abc") === "accessi");
prova("id mancante \u2192 accessi",    quale(undefined) === "accessi");

console.log("\n  E' FUORI DA destinazioneNotifica (o da fuori non si chiama)");
var iniD = src.indexOf("function destinazioneNotifica(n){");
var iniA = src.indexOf("function admTabDaAvviso(id){");
prova("dichiarata prima, non dentro", iniA > -1 && iniA < iniD);

console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
process.exit(ko ? 1 : 0);
