// ---------- CONTINUITA' FRA UN DISEGNO E L'ALTRO ----------
// render() svuota #app e lo ricostruisce. E' semplice e non sbaglia mai lo
// stato, ma butta via tre cose che il browser teneva per noi: la posizione di
// scorrimento, il fuoco della tastiera e il punto in cui era il cursore.
// Qui le mettiamo da parte prima di svuotare e le rimettiamo dopo.
//
// Due livelli, di proposito:
//
//   AUTOMATICO - scorrimento, fuoco, cursore. Non possono fare danno: se al
//     ridisegno non ritroviamo il campo che aveva il fuoco, lasciamo perdere
//     in silenzio. Nessuna schermata va toccata perche' funzioni.
//
//   DICHIARATO - il testo non ancora inviato (data-keep) e i riquadri con
//     scorrimento proprio (data-scroll-key) si salvano solo se il markup lo
//     chiede. Indovinare qui vorrebbe dire far ricomparire un messaggio gia'
//     spedito: meglio chiedere che sbagliare.
//
// Tutto vive dentro render(). Le 152 chiamate a render() sparse per il file
// non cambiano di una virgola.

var keepScroll = {};   // chiave schermata -> scrollTop del documento
var keepInner  = {};   // data-scroll-key  -> scrollTop del riquadro, o "end"
var keepDraft  = {};   // data-keep        -> testo non ancora inviato
var keepFocus  = null; // il campo che aveva il fuoco al disegno precedente
var lastMoved  = false;

// La chiave dello scorrimento e' piu' fine di quella delle transizioni: due
// chat diverse sono la stessa schermata per il browser, ma non per chi legge.
// Se nasce un'altra schermata "di dettaglio", il suo identificativo va qui.
function scrollKey(){
var extra = state.dmUid || state.compagniaAttiva || "";
return String(state.screen)+"|"+String(state.tab)+"|"+String(authState)+"|"+String(extra);
}

// Firma di un campo. Se ha un id, quello. Altrimenti la sua posizione
// nell'albero: l'indice fra i fratelli, dal campo fino a #app. Fragile per
// definizione, e va bene cosi': se il disegno e' cambiato non ritroviamo il
// campo e non facciamo niente, invece di dare il fuoco a quello sbagliato.
function fieldPath(node){
if(node.id) return "#"+node.id;
var parts = [], n = node, s, i;
while(n && n.id !== "app" && n.parentNode){
i = 0; s = n;
while((s = s.previousElementSibling)) i++;
parts.push(i);
n = n.parentNode;
}
if(!n || n.id !== "app") return null;
return parts.reverse().join("-");
}

function fieldAt(path){
if(!path) return null;
if(path.charAt(0) === "#") return document.getElementById(path.slice(1));
var n = document.getElementById("app");
var idx = path.split("-");
for(var i=0; i<idx.length && n; i++){ n = n.children[Number(idx[i])]; }
return n || null;
}

function captureContinuity(){
var app = document.getElementById("app");
if(!app) return;

var doc = document.scrollingElement || document.documentElement;
keepScroll[scrollKey()] = doc.scrollTop;

// Riquadri con scorrimento proprio. "In fondo" si ricorda come tale: se
// intanto e' arrivato un messaggio, la chat deve restare in fondo, non
// tornare al pixel di prima.
var boxes = app.querySelectorAll("[data-scroll-key]");
for(var i=0; i<boxes.length; i++){
var b = boxes[i];
var atEnd = (b.scrollHeight - b.scrollTop - b.clientHeight) < 24;
keepInner[b.getAttribute("data-scroll-key")] = atEnd ? "end" : b.scrollTop;
}

var drafts = app.querySelectorAll("[data-keep]");
for(var j=0; j<drafts.length; j++){
keepDraft[drafts[j].getAttribute("data-keep")] = drafts[j].value;
}

keepFocus = null;
var a = document.activeElement;
if(a && app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){
var path = fieldPath(a);
if(path){
keepFocus = {
key: scrollKey(),
path: path,
tag: a.tagName,
type: a.getAttribute("type") || "",
hint: a.getAttribute("placeholder") || a.getAttribute("name") || "",
start: null,
end: null
};
// selectionStart non esiste su input number/email/date: non e' un errore.
try{ keepFocus.start = a.selectionStart; keepFocus.end = a.selectionEnd; }catch(e){}
}
}
}

function restoreContinuity(sameScreen){
var app = document.getElementById("app");
if(!app) return;

var boxes = app.querySelectorAll("[data-scroll-key]");
for(var i=0; i<boxes.length; i++){ restoreBox(boxes[i]); }

var drafts = app.querySelectorAll("[data-keep]");
for(var j=0; j<drafts.length; j++){
var d = drafts[j];
var v = keepDraft[d.getAttribute("data-keep")];
// Se la schermata ha gia' messo un valore suo, quello vince: lo stato
// salvato e' piu' autorevole di una bozza in memoria.
if(v && !d.value) d.value = v;
}

// Il fuoco torna solo su un ridisegno della stessa schermata. Cambiare
// schermata e trovarsi la tastiera aperta e' un dispetto, non un aiuto.
if(sameScreen && keepFocus && keepFocus.key === scrollKey()){
var f = fieldAt(keepFocus.path);
var same = f && f.tagName === keepFocus.tag
&& (f.getAttribute("type") || "") === keepFocus.type
&& (f.getAttribute("placeholder") || f.getAttribute("name") || "") === keepFocus.hint;
if(same && f !== document.activeElement){
try{ f.focus({ preventScroll:true }); }catch(e){ try{ f.focus(); }catch(e2){} }
if(keepFocus.start !== null && f.setSelectionRange){
try{ f.setSelectionRange(keepFocus.start, keepFocus.end); }catch(e3){}
}
}
}

applyScroll(keepScroll[scrollKey()] || 0);
}

// Rimettere un riquadro dove stava. Chiamabile anche da fuori: le chat si
// riempiono dopo, quando risponde Firestore, e a quel punto il riquadro e'
// ancora vuoto per noi.
function restoreBox(node){
if(!node) return;
var k = node.getAttribute("data-scroll-key");
var v = keepInner[k];
if(v === undefined) return;
node.scrollTop = (v === "end") ? node.scrollHeight : v;
}

// Sul desktop html ha scroll-behavior:smooth. Rimettere lo scorrimento dove
// stava non e' uno spostamento, e' un ripristino: deve essere istantaneo,
// altrimenti si vede la pagina "risalire" da sola dopo ogni ridisegno.
// Due passate: subito, e al fotogramma dopo, quando l'altezza e' definitiva.
function applyScroll(y){
var doc = document.scrollingElement || document.documentElement;
if(y === 0 && doc.scrollTop === 0) return;
var root = document.documentElement;
root.classList.add("no-smooth");
doc.scrollTop = y;
requestAnimationFrame(function(){
doc.scrollTop = y;
root.classList.remove("no-smooth");
});
}

// Questa navigazione riparte dall'alto: dimentica dove eravamo.
function forgetScroll(){ delete keepScroll[scrollKey()]; }

// Il testo e' stato spedito: la bozza non esiste piu'. Senza questa, il
// messaggio appena inviato tornerebbe nel campo al primo ridisegno.
function forgetDraft(k){ delete keepDraft[k]; }
