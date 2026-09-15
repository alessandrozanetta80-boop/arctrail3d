/* banco-firme.js — il banco per il ridisegno mirato.
 *
 * dipingiPista() rifa' una regione solo se la sua FIRMA e' cambiata. Se una
 * firma resta uguale mentre il contenuto e' cambiato, lo schermo mente: mostra
 * il turno di prima, o il punteggio di prima, e nessuno se ne accorge finche'
 * non e' troppo tardi. Questo banco fa la domanda 288 volte:
 *
 *   dopo ogni tocco, la firma di ogni regione e' cambiata SE E SOLO SE il
 *   contenuto di quella regione e' cambiato?
 *
 * Le funzioni di stato sono quelle vere, estratte da index.html. Le firme sono
 * quelle vere, estratte dalle stesse righe. Quello che il banco NON prova e' la
 * resa: per quella serve un telefono.
 */

var fs = require("fs");
var FILE = process.argv[2] || "app.html";
var sorgente = fs.readFileSync(FILE, "utf8");

/* ── estrazione: le funzioni vere, prese dal file ─────────────────────────── */
function estrai(nome){
  var i = sorgente.indexOf("function " + nome + "(");
  if(i < 0) throw new Error("manca " + nome);
  var liv = 0, dentro = false;
  for(var j = i; j < sorgente.length; j++){
    if(sorgente[j] === "{"){ liv++; dentro = true; }
    else if(sorgente[j] === "}"){ liv--; if(dentro && liv === 0) return sorgente.slice(i, j+1); }
  }
  throw new Error("non chiusa: " + nome);
}

/* Le funzioni si estraggono dal nome; gli elenchi dichiarati con var, come la
   tabella delle divisioni, dalla graffa che apre a quella che chiude. */
function estraiVar(nome){
  var i = sorgente.indexOf("var " + nome + " = {");
  if(i < 0) throw new Error("manca " + nome);
  var liv = 0, dentro = false;
  for(var j = i; j < sorgente.length; j++){
    if(sorgente[j] === "{"){ liv++; dentro = true; }
    else if(sorgente[j] === "}"){ liv--; if(dentro && liv === 0) return sorgente.slice(i, j+1) + ";"; }
  }
  throw new Error("non chiuso: " + nome);
}

/* ── il mondo attorno: solo quello che le funzioni vere toccano ──────────── */
var state, salvati = 0, ridisegniInteri = 0, mirati = 0;
function save(){ salvati++; }
function render(){ ridisegniInteri++; }
// Il banco prova lo STATO, non il DOM: qui dipingiPista() dice sempre di si',
// cosi' registerShot segue il ramo mirato e le firme si confrontano su quello.
function dipingiPista(){ mirati++; return true; }
function syncShotToSession(){}
function unsyncShotFromSession(){}
// La copia del giro sul cloud non c'entra con le firme: qui e' una sagoma.
// CHE ESISTA DAVVERO, e che parta a ogni piazzola, lo guarda
// banco-giro-sicuro.js — questo banco non se ne accorgerebbe mai.
function salvaGiroSulCloud(){}
function cancellaGiroSulCloud(){}
function closeSharedSession(){}
function ensureRotationBase(){ state.rotBase = state.rotBase || state.archers.map(function(a){ return a.id; }); }
function orderForTarget(n){
  // rotazione FIARC: a ogni piazzola la testa passa al successivo
  var base = state.rotBase.slice(), k = (n-1) % base.length;
  var ids = base.slice(k).concat(base.slice(0,k));
  return ids.map(function(id){ return state.tuttiArcieri.filter(function(a){ return a.id===id; })[0]; });
}
var GAME_MODES = {
  percorso: { key:"percorso", arrowsPerTarget:3, zones:[
    {key:"superspot",labelKey:"zone_superspot",cls:"superspot"},
    {key:"spot",labelKey:"zone_spot",cls:"spot"},
    {key:"sagoma",labelKey:"zone_sagoma",cls:"sagoma"}],
    // il punteggio della freccia dipende da QUALE freccia e': la tastiera cambia
    scoring:{ 1:{superspot:20,spot:18,sagoma:16}, 2:{superspot:14,spot:12,sagoma:10}, 3:{superspot:8,spot:6,sagoma:4} } }
};
function effectiveMode(){ return GAME_MODES[state.mode]; }
function t(k){ return k; }

/* ── le misure: funzioni vere, archivio finto, orologio pilotato ─────────── */
var deposito = {};
var localStorage = {
  getItem:function(k){ return deposito[k] === undefined ? null : deposito[k]; },
  setItem:function(k,v){ deposito[k] = String(v); },
  removeItem:function(k){ delete deposito[k]; }
};
var orologio = 1000000;
Date.now = function(){ return orologio; };
function avanza(ms){ orologio += ms; }

eval(estrai("misureLeggi"));
eval(estrai("misura"));
eval(estrai("misuraTocco"));
eval(estrai("mediana"));
var MISURE_KEY = "banco", MISURE_MAX = 300, ultimoTocco = null;

eval(estrai("targetArrowCount"));
eval(estrai("advanceToNextTarget"));
eval(estrai("registerShot"));
eval(estrai("undoLastShot"));

/* ── le firme, copiate dalle stesse righe del file ───────────────────────── */
function contesto(){
  var mode = effectiveMode();
  var n = state.pendingArrows.length + 1;
  return { mode:mode, currentArcher:state.archers[state.archerIndex], arrowNumber:n,
           totArrows:targetArrowCount(mode), totalTargets:state.format,
           pct:Math.round(((state.target-1)/state.format)*100),
           pts:mode.scoring[n] || mode.scoring[mode.arrowsPerTarget] || mode.scoring[1] };
}
function firme(){
  var c = contesto(), f = {};
  f.testa = state.target+"/"+c.totalTargets+"|"+c.pct+"|"+state.target+"_"+state.archerIndex;
  var solo = state.archers.length <= 1;
  var s = solo+"|"+state.target+"|"+c.currentArcher.name+"|"+c.arrowNumber+"/"+c.totArrows+"|"+state.pendingArrows.join(",");
  state.archers.forEach(function(a,i){
    var ent = (state.scores[a.id]||[])[state.target-1];
    var stato = ent ? "fatto" : (i===state.archerIndex ? "ora" : "attesa");
    var testo = ent ? ent.total
      : (stato==="ora" && state.pendingArrows.length) ? state.pendingArrows.reduce(function(x,y){return x+y;},0)
      : "\u2013";
    s += "|"+a.id+":"+stato+":"+testo;
  });
  f.scena = s;
  // L'andamento ha una regione sua: lo spazio che avanza. Stava nella scena,
  // ma la scena e' la regione che cede e cedendo nascondeva il nome.
  f.spazio = c.currentArcher.id + "|"
    + (state.scores[c.currentArcher.id]||[]).map(function(e){ return e.total; }).join(",");
  var i2 = state.lastShotInfo;
  f.striscia = i2 ? [i2.name,i2.score,i2.unit,i2.n,i2.target,state.target].join("|") : null;
  // due firme, come nel file: la forma non cambia quasi mai, i numeri si'
  var voci = c.mode.zones.map(function(z){ return {cls:z.cls,lbl:z.labelKey,pts:c.pts[z.key]}; });
  voci.push({cls:"zero",lbl:"zero_label",pts:0});
  var righe = voci.length<=3 ? [voci] : voci.length===4 ? [voci.slice(0,2),voci.slice(2)] : [voci.slice(0,3),voci.slice(3)];
  f.tastiera = righe.map(function(r){ return r.length; }).join(",")
             + "|" + voci.map(function(v){ return v.cls+":"+v.lbl; }).join("|");
  f.numeri = voci.map(function(v){ return v.pts; }).join(",");
  return f;
}
// Il contenuto vero della regione, indipendente dalla firma: se due contenuti
// diversi producono la stessa firma, la firma e' bugiarda.
function contenuti(){
  var c = contesto(), k = {};
  k.testa = JSON.stringify([state.target, c.totalTargets, c.pct, state.archerIndex]);
  // Il numero della piazzola fa parte del contenuto della scena SEMPRE, non
  // solo quando si vede: da solo e' il protagonista, in gruppo e' la chiave
  // con cui si leggono i turni. Se sta nel contenuto deve stare nella firma.
  k.scena = JSON.stringify([state.target,
    c.currentArcher.name, c.arrowNumber, c.totArrows, state.pendingArrows,
    state.archers.map(function(a,i){
      var ent=(state.scores[a.id]||[])[state.target-1];
      return [a.id, ent?"fatto":(i===state.archerIndex?"ora":"attesa"), ent?ent.total:null];
    })]);
  k.spazio = JSON.stringify([c.currentArcher.id,
    (state.scores[c.currentArcher.id]||[]).map(function(e){ return e.total; })]);
  k.striscia = JSON.stringify(state.lastShotInfo ? [state.lastShotInfo, state.target] : null);
  k.tastiera = JSON.stringify(c.mode.zones.map(function(z){ return z.cls; }));
  k.numeri = JSON.stringify(c.mode.zones.map(function(z){ return c.pts[z.key]; }));
  return k;
}

/* ── la partita ──────────────────────────────────────────────────────────── */
function apri(nArcieri, nPiazzole){
  misura("giriIniziati"); ultimoTocco = null;
  var arcieri = [];
  for(var i=0;i<nArcieri;i++) arcieri.push({ id:"a"+i, name:"Arciere "+i });
  state = { screen:"round", mode:"percorso", format:nPiazzole, target:1, archerIndex:0,
            archers:arcieri.slice(), tuttiArcieri:arcieri.slice(), scores:{},
            pendingArrows:[], arrowIndex:0, lastShotInfo:null, awaitingStep:null, panel:null };
  arcieri.forEach(function(a){ state.scores[a.id] = []; });
  ensureRotationBase();
}

var errori = [];
function controlla(prima, dopo, etichetta){
  ["testa","scena","spazio","striscia","tastiera","numeri"].forEach(function(r){
    var firmaCambiata    = prima.f[r] !== dopo.f[r];
    var contenutoCambiato= prima.k[r] !== dopo.k[r];
    if(contenutoCambiato && !firmaCambiata){
      errori.push("MUTA  " + etichetta + " · " + r + ": il contenuto e' cambiato e la firma no (lo schermo mostrerebbe il vecchio)");
    }
    if(firmaCambiata && !contenutoCambiato){
      errori.push("SPRECO " + etichetta + " · " + r + ": firma cambiata a contenuto uguale (ridisegno inutile)");
    }
  });
}
function scatta(){ return { f:firme(), k:contenuti() }; }

/* Il confronto fra due istanti consecutivi non basta, e il banco se n'e'
   accorto tardi: togliendo state.target dalla firma della scena il banco
   diceva ancora di si', perche' fra un tocco e il successivo cambiava sempre
   ANCHE il numero della freccia, che mascherava il buco.
   La domanda giusta e' piu' forte e non dipende dall'ordine: DUE CONTENUTI
   DIVERSI POSSONO AVERE LA STESSA FIRMA? Se succede, prima o poi capitera'
   anche fra due istanti consecutivi, e quel giorno lo schermo mentira'. */
var dizionario = { testa:{}, scena:{}, spazio:{}, striscia:{}, tastiera:{}, numeri:{} };
function registra(sc, dove){
  Object.keys(dizionario).forEach(function(r){
    var f = sc.f[r]; if(f === null || f === undefined) return;
    var visto = dizionario[r][f];
    if(visto === undefined){ dizionario[r][f] = { k:sc.k[r], dove:dove }; return; }
    if(visto.k !== sc.k[r]){
      errori.push("COLLISIONE " + r + ": stessa firma per due contenuti diversi ("
        + visto.dove + " e " + dove + ")");
    }
  });
}

/* ── prova 1: percorso intero, 24 piazzole in quattro ────────────────────── */
apri(4, 24);
var tocchi = 0, tastieraRifatta = 0, scenaRifatta = 0, numeriRiscritti = 0;
var punteggi = [20,18,16,14,12,10,8,6,4,0];
while(state.screen === "round" && tocchi < 500){
  if(state.awaitingStep){ state.awaitingStep = null; advanceToNextTarget(); continue; }
  var prima = scatta();
  // fra due frecce dello stesso arciere passa poco; fra un arciere e l'altro
  // passa il tempo di un tiro vero, che non deve entrare nella mediana.
  avanza(state.pendingArrows.length ? 2000 : 45000);
  registerShot(punteggi[tocchi % punteggi.length]);
  tocchi++;
  if(state.screen !== "round") break;
  if(state.awaitingStep) continue;           // sosta di fine giro: schermata diversa
  var dopo = scatta();
  controlla(prima, dopo, "tocco "+tocchi);
  registra(dopo, "tocco "+tocchi);
  if(prima.f.tastiera !== dopo.f.tastiera) tastieraRifatta++;
  if(prima.f.numeri !== dopo.f.numeri) numeriRiscritti++;
  if(prima.f.scena !== dopo.f.scena) scenaRifatta++;
}

console.log("\n  PERCORSO INTERO — 24 piazzole × 4 arcieri × 3 frecce");
console.log("  tocchi                    " + tocchi + (tocchi === 288 ? "  (esatti)" : "  ← attesi 288"));
console.log("  scena rifatta             " + scenaRifatta + " volte");
console.log("  tastiera RIFATTA          " + tastieraRifatta + " volte  (nodi distrutti)");
console.log("  sole cifre riscritte      " + numeriRiscritti + " volte  (nodi vivi)");
console.log("  tastiera intatta          " + (tocchi - tastieraRifatta - numeriRiscritti) + " volte");
if(tocchi !== 288) errori.push("il percorso non si e' chiuso in 288 tocchi");

/* ── le quattro misure, dopo il percorso intero ──────────────────────────── */
var m = misureLeggi();
console.log("\n  LE QUATTRO MISURE");
console.log("  giri finiti / iniziati    " + m.giriFiniti + " / " + m.giriIniziati);
console.log("  annulli                   " + m.annulli);
console.log("  classifiche aperte        " + m.classifiche);
console.log("  intervalli raccolti       " + m.intervalli.length + "  (attesi 192 = 24 x 4 x 2)");
console.log("  mediana                   " + mediana(m.intervalli) + " s  (attesa 2)");
if(m.giriFiniti !== 1) errori.push("il giro chiuso non e' stato contato una volta sola");
if(m.intervalli.length !== 192) errori.push("intervalli: attesi 192, trovati " + m.intervalli.length);
if(mediana(m.intervalli) !== 2) errori.push("la mediana ha raccolto anche le attese fra un arciere e l'altro");
if(m.annulli !== 0) errori.push("annulli contati senza che nessuno abbia annullato");

/* ── prova 2: 40 annulli di fila ─────────────────────────────────────────── */
deposito = {};
apri(4, 24);
for(var i=0;i<60;i++){ if(state.awaitingStep) break; registerShot(16); }
var annulli = 0;
for(var j=0;j<40;j++){
  if(state.awaitingStep){ state.awaitingStep = null; }
  var p2 = scatta();
  undoLastShot();
  var d2 = scatta();
  controlla(p2, d2, "annulla "+(j+1));
  annulli++;
}
console.log("\n  ANNULLI                   " + annulli + " di fila, nessuna firma muta");
if(misureLeggi().annulli !== 40) errori.push("annulli contati male: " + misureLeggi().annulli);

/* ── prova 4: il tetto degli intervalli non deve crescere all'infinito ───── */
deposito = {};
for(var q=0;q<500;q++) misura("intervalli", 1 + (q%5));
var tenuti = misureLeggi().intervalli.length;
console.log("  TETTO INTERVALLI          " + tenuti + " tenuti su 500 registrati");
if(tenuti !== 300) errori.push("il tetto degli intervalli non tiene: " + tenuti);

/* ── prova 3: modalita' a una freccia — la tastiera non cambia mai ───────── */
GAME_MODES.singola = { key:"singola", arrowsPerTarget:1,
  zones:GAME_MODES.percorso.zones, scoring:{ 1:{superspot:20,spot:18,sagoma:16} } };
deposito = {};
apri(3, 12); state.mode = "singola";
var firmaTast = firme().tastiera, cambiata = false, t3 = 0;
while(state.screen === "round" && t3 < 60){
  if(state.awaitingStep){ state.awaitingStep = null; advanceToNextTarget(); continue; }
  var p3 = scatta(); registerShot(18); t3++;
  if(state.screen !== "round" || state.awaitingStep) continue;
  var d3 = scatta(); controlla(p3, d3, "singola "+t3);
  if(firme().tastiera !== firmaTast) cambiata = true;
}
console.log("  UNA FRECCIA               " + t3 + " tocchi, tastiera rifatta: " + (cambiata ? "SI (sbagliato)" : "mai"));
if(cambiata) errori.push("in modalita' a una freccia la tastiera non deve cambiare mai");

/* ── prova 5: da solo — il protagonista della scena e' la piazzola ───────── */
deposito = {};
apri(1, 14);
var t5 = 0, cambiPiazzola = 0, piazzolaPrec = state.target;
while(state.screen === "round" && t5 < 60){
  if(state.awaitingStep){ state.awaitingStep = null; advanceToNextTarget(); continue; }
  var p5 = scatta();
  avanza(3000);
  registerShot(16); t5++;
  if(state.screen !== "round" || state.awaitingStep) continue;
  var d5 = scatta();
  controlla(p5, d5, "solo "+t5);
  registra(d5, "solo "+t5);
  if(state.target !== piazzolaPrec){
    // il caso che conta: cambia il bersaglio e NON cambia nient'altro, perche'
    // l'arciere e' sempre lo stesso e la fila dei turni non esiste
    if(p5.f.scena === d5.f.scena) errori.push("da solo, cambiata piazzola e firma della scena identica: il numero grande resterebbe fermo");
    cambiPiazzola++;
    piazzolaPrec = state.target;
  }
}
console.log("  DA SOLO                   " + t5 + " tocchi, " + cambiPiazzola + " cambi di piazzola, tutti visti");
console.log("  FIRME DISTINTE            scena " + Object.keys(dizionario.scena).length
  + " · testa " + Object.keys(dizionario.testa).length
  + " · striscia " + Object.keys(dizionario.striscia).length);

/* ── prova 6: correggere una piazzola gia' chiusa ────────────────────────
   Il caso vero: te ne accorgi camminando verso il bersaglio dopo. Torni
   indietro, rifai la piazzola con un punteggio diverso, e ti ritrovi
   esattamente dov'eri: stessa piazzola, stesso arciere, stessa freccia,
   stessa fila dei turni. TUTTO UGUALE TRANNE IL TOTALE. Se il totale non e'
   nella firma, la scena non si ridisegna e resta a schermo il totale vecchio.
   Il banco non aveva questa prova, e infatti non vedeva il buco. */
deposito = {};
apri(1, 14);
state.mode = "singola";                // una freccia per piazzola: il caso piu' secco
avanza(3000); registerShot(15);        // piazzola 1 chiusa con 15
avanza(3000); registerShot(10);        // siamo alla piazzola 2
var primaDellaCorrezione = scatta();
undoLastShot();                        // torna alla 2
undoLastShot();                        // torna dentro la 1
avanza(3000); registerShot(5);         // la 1 vale 5, non 15
avanza(3000); registerShot(10);        // di nuovo alla piazzola 2, tutto uguale
var dopoLaCorrezione = scatta();
var ugualeFuori = primaDellaCorrezione.f.testa === dopoLaCorrezione.f.testa;
var totaleCambiato = primaDellaCorrezione.k.spazio !== dopoLaCorrezione.k.spazio;
console.log("  CORREZIONE A RITROSO      stessa piazzola e stesso turno: " + (ugualeFuori ? "si" : "no")
  + " · totale cambiato: " + (totaleCambiato ? "si" : "no"));
if(totaleCambiato && primaDellaCorrezione.f.spazio === dopoLaCorrezione.f.spazio){
  errori.push("MUTA correzione a ritroso · spazio: il totale e' cambiato e la firma no (resterebbe a schermo il totale vecchio)");
}


/* ══════════════════════════════════════════════════════════════════════════
   PROVA 7: L'IMPORTAZIONE LEGGE IL SENSO

   Questa non e' una firma, ma e' la stessa specie di bug: una funzione che
   sbaglia in silenzio e lascia credere che sia andato tutto bene. Un'
   importazione che perde tre nomi su cento non protesta - l'errore si scopre
   in gara, quando manca una persona - e la trappola DA SILVA non si vede
   rileggendo il codice, perche' li' la regola sembra giusta.
   Le funzioni sono quelle vere, estratte da index.html.
   ══════════════════════════════════════════════════════════════════════════ */
// L'elenco vero delle compagnie non serve al banco: ne bastano due, una che
// esiste e una che non esiste.
function compagniaNome(cod){ return cod === "01VERB" ? "A.S.D. Arcieri Finti" : null; }
// L'app possiede solo l'elenco FIARC: dove non ce l'ha, il codice non si
// giudica. Qui il banco lavora sempre su una gara FIARC, quindi il conteggio
// deve restare quello di prima — che e' proprio la cosa da verificare.
function haElencoCompagnie(fed){ return fed === "fiarc"; }
function pgFederazione(){ return "fiarc"; }
eval(estrai("sigleDi"));
eval(estrai("sigleDentro"));
eval(estrai("pgLeggiRiga"));
eval(estrai("pgIntestazioneSquadra"));
eval(estrai("pgImporta"));
eval(estrai("divisioneDi"));
eval(estrai("divisioniPer"));
var RE_TESSERA = /^[0-9]{4,}$/;
var RE_CODICE_COMPAGNIA = /^[0-9]{2}[A-Za-z]{4}$/;
/* La tabella e' quella VERA, non una copia scritta qui: una copia proverebbe
   se stessa. Se domani una sigla viene battuta male in index.html, le righe
   di prova qui sotto smettono di leggersi, ed e' esattamente quello che deve
   succedere - una sigla sbagliata e' un vincitore sbagliato. */
eval(estraiVar("DIVISIONI"));
var TAB = divisioniPer("fiarc");
if(!TAB) throw new Error("manca la tabella FIARC");
if(TAB.classi.length !== 9) errori.push("classi FIARC: attese 9, trovate " + TAB.classi.length);
if(TAB.categorie.length !== 8) errori.push("categorie FIARC: attese 8, trovate " + TAB.categorie.length);
if(divisioniPer("sweden") !== null) errori.push("una federazione senza tabella deve dare null, non i menu di un'altra");

var casi = [
  // la riga, e cosa deve venirne fuori
  ["Rossi",                          {cognome:"Rossi", nome:""}],
  ["Rossi, Mario",                   {cognome:"Rossi", nome:"Mario"}],
  // la trappola: DA e' Diversamente Abili ed e' l'inizio di DA SILVA
  ["DA SILVA, Joao",                 {cognome:"DA SILVA", nome:"Joao"}],
  ["DA SILVA",                       {cognome:"DA SILVA", nome:""}],
  // il caso secco, e il solo che tocchi davvero la guardia: il primo pezzo E'
  // la sigla, lettera per lettera. Senza la guardia questo cognome sparisce e
  // Joao diventa un Diversamente Abili senza cognome. Il banco non aveva
  // questa riga e approvava un file con la guardia tolta.
  ["DA, Joao",                       {cognome:"DA", nome:"Joao"}],
  ["CO, Ana, LB",                    {cognome:"CO", nome:"Ana", categoria:"LB"}],
  ["Natale \u00b7 Luca \u00b7 DA \u00b7 CO", {cognome:"Natale", nome:"Luca", classe:"DA", categoria:"CO"}],
  // l'ordine delle colonne non conta: e' la forma che parla
  ["Vallo, Marco, 12345, SEM, LB, 01VERB", {cognome:"Vallo", nome:"Marco", tessera:"12345", classe:"SEM", categoria:"LB", compagnia:"01VERB"}],
  ["01VERB; LB; 12345; SEM; Vallo; Marco", {cognome:"Vallo", nome:"Marco", tessera:"12345", classe:"SEM", categoria:"LB", compagnia:"01VERB"}],
  // un codice che non esiste resta nella riga: si corregge, non si indovina
  ["Bianchi, Ada, 99ZZZZ",           {cognome:"Bianchi", nome:"Ada", compagnia:"99ZZZZ"}],
  // tre cifre non sono una tessera: sono un numero di pettorale, un'eta', altro
  ["Conti, Ugo, 123",                {cognome:"Conti", nome:"Ugo", nomeCompleto:"Ugo 123"}],
  // una riga schiacciata dal PDF non diventa un cognome assurdo
  ["Natale Luca 12345 SEM LB",       null],
  ["Natale Luca SEM LB",             null]
];
var sbagli = 0;
casi.forEach(function(c){
  var p = pgLeggiRiga(c[0], TAB), atteso = c[1];
  function male(cosa){ sbagli++; errori.push("IMPORTAZIONE «" + c[0] + "»: " + cosa); }
  if(atteso === null){ if(p) male("doveva finire fra le righe da ricontrollare"); return; }
  if(!p){ male("non capita, e invece si capiva"); return; }
  if(p.cognome !== atteso.cognome) male("cognome «" + p.cognome + "» invece di «" + atteso.cognome + "»");
  var nomeAtteso = atteso.nomeCompleto || atteso.nome;
  if(p.nome !== nomeAtteso) male("nome «" + p.nome + "» invece di «" + nomeAtteso + "»");
  ["tessera","classe","categoria","compagnia"].forEach(function(k){
    if((p[k]||"") !== (atteso[k]||"")) male(k + " «" + (p[k]||"") + "» invece di «" + (atteso[k]||"") + "»");
  });
});

// Il resoconto: quanti iscritti, quanti con divisione, tessera, compagnia.
// Il codice inventato non si fa contare fra le compagnie buone.
var testo = "Squadra 1\nVallo, Marco, 12345, SEM, LB, 01VERB\nDA SILVA, Joao\n\n"
          + "Squadra 2\nBianchi, Ada, 99ZZZZ\nNatale Luca 12345 SEM LB\n";
var esito = pgImporta(testo, TAB);
console.log("\n  IMPORTAZIONE             " + casi.length + " righe di prova, "
  + (sbagli ? sbagli + " lette male" : "tutte lette bene"));
console.log("  RESOCONTO                " + esito.conti.iscritti + " iscritti \u00b7 "
  + esito.conti.divisione + " con divisione \u00b7 " + esito.conti.tessera + " con tessera \u00b7 "
  + esito.conti.compagnia + " con compagnia \u00b7 " + esito.conti.dubbie.length + " da ricontrollare");
if(esito.conti.iscritti !== 3) errori.push("importazione: attesi 3 iscritti, trovati " + esito.conti.iscritti);
if(esito.squadre.length !== 2) errori.push("importazione: attese 2 squadre, trovate " + esito.squadre.length);
if(esito.conti.divisione !== 1) errori.push("importazione: attesa 1 divisione completa, trovate " + esito.conti.divisione);
if(esito.conti.compagnia !== 1) errori.push("importazione: il codice inventato e' stato contato come compagnia vera");
if(esito.conti.dubbie.length !== 1) errori.push("importazione: la riga schiacciata doveva finire fra quelle da ricontrollare");

// La coppia, e chi non ce l'ha intera
var coppia = divisioneDi({classe:"SEM", categoria:"LB"}, TAB);
var meta   = divisioneDi({classe:"SEM"}, TAB);
console.log("  DIVISIONE                " + coppia.classe + "\u00b7" + coppia.categoria
  + " completa \u00b7 mezza coppia \u2192 " + meta.classe + " (ospite: " + meta.ospite + ")");
if(coppia.ospite) errori.push("una coppia completa non e' Ospite");
if(!meta.ospite || meta.classe !== "OSP") errori.push("mezza coppia deve diventare Ospite, sigla OSP");

/* ── LA CONSEGNA ───────────────────────────────────────────────────────────
   Consegnare e' un atto: succede una volta sola, e dopo la scheda non si
   corregge piu'. Sono due frasi facili da scrivere nelle note e facili da
   perdere nel codice, quindi qui si chiedono al codice vero.

   Le domande, in ordine di gravita' se la risposta e' sbagliata:
     1. si puo' consegnare una scheda che nessuno ha visto?      (deve dire no)
     2. dopo la consegna si puo' ancora firmare, o togliere?     (deve dire no)
     3. consegnando due volte, l'ora della consegna cambia?      (deve restare)
     4. fra i firmatari finisce anche chi non ha firmato?        (deve mancare)
     5. in allenamento la scheda esiste?                         (deve sparire)  */
(function(){
  eval(estraiVar("FEDERATIONS"));
  eval(estrai("piazzoleChiuse"));
  eval(estrai("schedaConsegnata"));
  eval(estrai("firmeScheda"));
  eval(estrai("consegnaPronta"));
  eval(estrai("firmaScheda"));
  eval(estrai("togliFirmaScheda"));
  eval(estrai("registraConsegna"));
  eval(estrai("giroDaGaraUfficiale"));
  eval(estrai("schedaVisibile"));

  function scheda(n, piazzoleFatte, formato){
    var arcieri = [], punteggi = {};
    for(var i=0;i<n;i++){
      var a = { id:"a"+i, name:"Arciere "+i };
      arcieri.push(a);
      punteggi[a.id] = [];
      for(var p=0;p<piazzoleFatte;p++) punteggi[a.id].push({ total:10, arrows:[10] });
    }
    return { archers:arcieri, scores:punteggi, format:formato, firme:{}, consegna:null,
             federation:"fiarc", mode:"percorso" };
  }

  // 1. Una firma sola, in un gruppo di quattro, non basta: manca chi ha visto.
  state = scheda(4, 24, 24);
  if(consegnaPronta()) errori.push("consegna: una scheda con zero firme risulta pronta");
  firmaScheda("a0");
  if(consegnaPronta()) errori.push("consegna: in gruppo basta la propria firma, e non deve bastare");
  if(registraConsegna() !== null) errori.push("consegna: e' passata senza le firme necessarie");
  firmaScheda("a1");
  if(!consegnaPronta()) errori.push("consegna: due firme in gruppo devono bastare");

  // Firmare due volte non conta due volte.
  if(firmaScheda("a1") !== false) errori.push("consegna: la stessa firma e' stata accettata due volte");
  if(firmeScheda() !== 2) errori.push("consegna: firme contate " + firmeScheda() + " invece di 2");

  // Togliere una firma riporta indietro anche la prontezza: non e' un
  // interruttore che accende e basta.
  togliFirmaScheda("a1");
  if(consegnaPronta()) errori.push("consegna: tolta una firma, la scheda resta pronta");
  firmaScheda("a1");

  var prima = registraConsegna();
  if(!prima) errori.push("consegna: non e' passata neanche con le firme in regola");
  var firmatari = (prima.firme||[]).map(function(f){ return f.name; }).join("+");

  // 2. Dopo la consegna la scheda e' chiusa, e lo e' in tutti i modi.
  if(firmaScheda("a2") !== false)      errori.push("consegna: si e' potuto firmare DOPO la consegna");
  if(togliFirmaScheda("a0") !== false) errori.push("consegna: si e' potuta togliere una firma DOPO la consegna");
  if(consegnaPronta())                 errori.push("consegna: una scheda gia' consegnata risulta ancora da consegnare");

  // 3. La seconda consegna e' la prima: un'ora che cambia e' un'ora che non
  //    dice piu' quando la scheda e' passata di mano.
  var poi = registraConsegna();
  // Un banco che si schianta esce con 1, quindi "funziona" — ma non dice
  // niente, e chi lo legge perde mezz'ora a capire cosa e' successo. La
  // guardia sta qui perche' il fallimento sia una frase, non una pila.
  if(!poi)                        errori.push("consegna: la seconda consegna non restituisce la prima");
  else if(poi.at !== prima.at)    errori.push("consegna: consegnando due volte, l'ora e' cambiata");
  else if(poi.firme.length !== 2) errori.push("consegna: fra i firmatari e' finito chi non ha firmato");

  // 4. Da soli la propria firma basta: non c'e' nessun altro a cui chiederla.
  state = scheda(1, 24, 24);
  if(consegnaPronta()) errori.push("consegna: da soli, zero firme risultano sufficienti");
  firmaScheda("a0");
  if(!consegnaPronta()) errori.push("consegna: da soli la propria firma deve bastare");

  // 5. Il giro interrotto: le piazzole chiuse sono quelle vere, non il formato.
  state = scheda(3, 14, 24);
  var chiuse = piazzoleChiuse();
  if(chiuse !== 14) errori.push("consegna: piazzole chiuse " + chiuse + " invece di 14");

  /* 6. LA SCHEDA NON SI FIRMA IN GARA LIBERA. (25/08/2026.)
     Prima qui si chiedeva il contrario — «in gara la scheda deve comparire» —
     e la prova passava, perche' bastava un MODO da gara. Ma quei modi sono
     esattamente quelli della Gara libera, dove la scheda non va da nessuna
     parte: la prova diceva di si' al difetto.

     *Diagnosi corretta, non cancellata:* non era sbagliata quando e' stata
     scritta, era incompleta. Il modo dice come si contano i punti, non se
     qualcuno riceve il foglio.

     Oggi la risposta e' no sempre, perche' nessun giro nasce ancora da una
     gara (STATO C1). Le tre prove qui sotto tengono in piedi tre cose
     diverse, e la terza e' quella che conta: **la macchina non e' stata
     tolta, e' rimasta dietro una funzione sola.** Il giorno che il giro sapra'
     da quale gara viene, si cambia quella riga e il resto riparte com'era. */
  state.mode = "percorso";
  var inGaraLibera = schedaVisibile();
  state.mode = FEDERATIONS.fiarc.trainingMode;
  var inAllenamento = schedaVisibile();
  if(inGaraLibera)   errori.push("consegna: in gara libera la scheda si firma ancora");
  if(inAllenamento)  errori.push("consegna: la scheda compare anche in allenamento");

  // E la macchina regge: accesa la gara vera, torna a distinguere il modo.
  giroDaGaraUfficiale = function(){ return true; };
  state.mode = "percorso";
  var inGaraVera = schedaVisibile();
  state.mode = FEDERATIONS.fiarc.trainingMode;
  var veraMaAllenamento = schedaVisibile();
  giroDaGaraUfficiale = function(){ return false; };
  if(!inGaraVera)      errori.push("consegna: riaccesa la gara vera, la scheda non torna");
  if(veraMaAllenamento)errori.push("consegna: con la gara vera accesa la scheda compare anche in allenamento");

  console.log("\n  CONSEGNA                 due firme su quattro \u2192 " + firmatari);
  console.log("  DOPO LA CONSEGNA         non si firma, non si toglie, non si riconsegna");
  console.log("  GIRO INTERROTTO          " + chiuse + " piazzole su 24 \u00b7 la scheda si consegna lo stesso");
  console.log("  GARA LIBERA              nessuna scheda da firmare, e nessuna in allenamento");
  console.log("  LA MACCHINA C'E' ANCORA  accesa la gara vera, la scheda torna solo nei modi da gara");
})();

/* ── LA FIRMA DELL'ELENCO NOTIFICHE ───────────────────────────────────────
   Il centro notifiche si ridisegnava solo quando cambiava il CONTEGGIO delle
   non lette. Cancellando una notifica gia' letta il conteggio non cambiava:
   la riga spariva dal database e restava sullo schermo. Il dato era giusto ed
   era lo schermo a mentire, che e' il difetto peggiore dei due.
   La domanda qui e' la stessa delle altre firme, e non e' «la firma cambia
   quando cambia il contenuto»: e' **due contenuti diversi possono mai
   produrre la stessa firma?** */
eval(estrai("firmaNotifiche"));

(function(){
  var errori0 = errori.length;

  var A = [{id:"a", read:false}, {id:"b", read:true}];

  // 1. Togliere una riga LETTA cambia la firma. E' il caso del 19/08: prima
  //    non cambiava niente e lo schermo restava indietro.
  if(firmaNotifiche(A) === firmaNotifiche([{id:"a", read:false}]))
    errori.push("notifiche: togliere una riga letta non cambia la firma");

  // 2. Togliere una riga NON letta cambia la firma.
  if(firmaNotifiche(A) === firmaNotifiche([{id:"b", read:true}]))
    errori.push("notifiche: togliere una riga non letta non cambia la firma");

  // 3. Leggerne una cambia la firma.
  if(firmaNotifiche(A) === firmaNotifiche([{id:"a", read:true}, {id:"b", read:true}]))
    errori.push("notifiche: segnare come letta non cambia la firma");

  // 4. Arrivarne una cambia la firma.
  if(firmaNotifiche(A) === firmaNotifiche(A.concat([{id:"c", read:false}])))
    errori.push("notifiche: una notifica nuova non cambia la firma");

  // 5. Cambiare ORDINE cambia la firma: l'elenco e' ordinato per data, e due
  //    ordini diversi sono due schermate diverse.
  if(firmaNotifiche(A) === firmaNotifiche([{id:"b", read:true}, {id:"a", read:false}]))
    errori.push("notifiche: invertire l'ordine non cambia la firma");

  // 6. LA COLLISIONE. Due elenchi diversi in cui un id finisce dove ne
  //    cominciava un altro: senza le lunghezze scritte dentro, "ab"+"c" e
  //    "a"+"bc" darebbero la stessa stringa e una cancellazione passerebbe
  //    inosservata. E' il difetto che questo controllo esiste per escludere.
  if(firmaNotifiche([{id:"ab", read:false}, {id:"c", read:false}]) ===
     firmaNotifiche([{id:"a", read:false}, {id:"bc", read:false}]))
    errori.push("notifiche: due elenchi diversi danno la STESSA firma (collisione)");

  // 7. Niente cambia, niente si ridisegna.
  if(firmaNotifiche(A) !== firmaNotifiche([{id:"a", read:false}, {id:"b", read:true}]))
    errori.push("notifiche: la firma cambia anche quando non cambia niente");

  console.log("\n  NOTIFICHE                sette domande sulla firma dell'elenco \u2192 "
    + (errori.length === errori0 ? "nessuna firma muta, nessuna collisione" : "PROBLEMI"));
})();

/* ── il verdetto ─────────────────────────────────────────────────────────── */
if(errori.length){
  console.log("\n  " + errori.length + " problemi:");
  errori.slice(0,20).forEach(function(e){ console.log("    " + e); });
  console.log("");
  process.exit(1);
}
console.log("\n  Nessuna firma muta e nessun ridisegno sprecato.\n");
process.exit(0);
