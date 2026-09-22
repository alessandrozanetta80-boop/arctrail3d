/* firebase-finto.js — un Firebase in memoria, per far girare l'app VERA.
 *
 * PERCHE' ESISTE. (19/09/2026, risanamento post-audit.) Tutti i banchi con
 * browser giravano in DEV_MODE, e DEV_MODE spegne ogni ramo che parla col
 * database: `riallineaStorico`, `cloudGiroRef`, `salvaAttrezzi`... Cioe'
 * proprio i percorsi dove l'audit ha trovato i difetti peggiori (i dati di un
 * account che finiscono nel cloud di un altro) non li provava nessuno.
 *
 * Questo modulo NON accende DEV_MODE. Mette nella pagina un `window.firebase`
 * finto prima che l'app parta — app, auth, firestore, messaging, functions — e
 * le librerie vere di gstatic non arrivano (il banco chiude la rete). L'app
 * crede di parlare con Firebase e segue il suo percorso di produzione.
 *
 * Cosa sa fare il database finto: raccolte e sottoraccolte, doc/get/set
 * (anche merge)/update/delete/add, where/orderBy/limit (where e orderBy
 * vengono applicati davvero, in modo semplice), onSnapshot, batch,
 * FieldValue.serverTimestamp/delete/arrayUnion/arrayRemove/increment,
 * waitForPendingWrites, terminate, clearPersistence. Ogni scrittura finisce
 * anche in `window.__scritture` ({op, path, data}): e' li' che i banchi
 * guardano cosa l'app ha mandato al cloud.
 *
 * USO (da un banco playwright):
 *   var F = require("./firebase-finto.js");
 *   var html = F.copiaProduzione(fs.readFileSync("app.html","utf8"), { gancio: "..." });
 *   await ctx.route(/^https?:\/\//, r => r.abort());
 *   await ctx.addInitScript(F.scriptIniziale({ utente:{uid,email}, dati:{ "users": {uid:{...}} } }));
 */

function installa(opzioni) {
  var ORA = Date.now();
  var DATI = (opzioni && opzioni.dati) || {};
  window.__DATI = DATI;
  window.__scritture = [];
  window.__utente = (opzioni && opzioni.utente) || null;
  var ascoltatori = [];

  function chiudiPercorso(p) { return p.replace(/^\/+|\/+$/g, ""); }
  function raccolta(p) { if (!DATI[p]) DATI[p] = {}; return DATI[p]; }
  function copia(x) {
    if (x === null || typeof x !== "object") return x;
    if (x.__ts) return x;
    if (Array.isArray(x)) return x.map(copia);
    var o = {}; Object.keys(x).forEach(function (k) { o[k] = copia(x[k]); }); return o;
  }
  var DELETE = { __fv: "delete" };
  function marca() { var n = Date.now(); return { __ts: n, toMillis: function () { return n; }, toDate: function () { return new Date(n); }, seconds: Math.floor(n / 1000) }; }
  /* `update({"a.b": v})`: il percorso a punti tocca un campo dentro una mappa. */
  function puntato(out, k, v) {
    var parti = k.split("."), o = out;
    for (var i = 0; i < parti.length - 1; i++) { o[parti[i]] = o[parti[i]] || {}; o = o[parti[i]]; }
    var ultimo = parti[parti.length - 1];
    if (v && v.__fv === "delete") { delete o[ultimo]; return; }
    if (v && v.__fv === "ts") { o[ultimo] = marca(); return; }
    o[ultimo] = (v && typeof v === "object" && !Array.isArray(v) && !v.__ts) ? applica({}, v, false) : copia(v);
  }
  function applica(vecchio, nuovo, fondi) {
    var out = fondi && vecchio ? copia(vecchio) : {};
    Object.keys(nuovo || {}).forEach(function (k) {
      var v = nuovo[k];
      if (k.indexOf(".") > 0) return puntato(out, k, v);
      if (v && v.__fv === "delete") { delete out[k]; return; }
      if (v && v.__fv === "ts") { out[k] = marca(); return; }
      if (v && v.__fv === "union") { var a = (out[k] || []).slice(); v.v.forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); out[k] = a; return; }
      if (v && v.__fv === "remove") { out[k] = (out[k] || []).filter(function (x) { return v.v.indexOf(x) < 0; }); return; }
      if (v && v.__fv === "inc") { out[k] = (out[k] || 0) + v.v; return; }
      if (fondi && v && typeof v === "object" && !Array.isArray(v) && !v.__ts && out[k] && typeof out[k] === "object") {
        out[k] = applica(out[k], v, true); return;
      }
      out[k] = copia(v);
    });
    return out;
  }
  /* Gli ascoltatori si avvisano DOPO, e solo quelli della raccolta toccata:
     come Firestore vero. Avvisarli subito e tutti faceva girare in tondo un
     ascoltatore che a sua volta scrive (e bloccava la pagina). */
  var inCoda = false, raccolteToccate = {};
  function notifica(racc) {
    raccolteToccate[racc] = true;
    if (inCoda) return;
    inCoda = true;
    setTimeout(function () {
      var toccate = raccolteToccate; raccolteToccate = {}; inCoda = false;
      ascoltatori.slice().forEach(function (a) {
        if (!toccate[a.racc]) return;
        try { a.f(); } catch (e) {}
      });
    }, 0);
  }
  function scrivi(op, percorso, data) { window.__scritture.push({ op: op, path: percorso, data: copia(data) }); }

  function istantaneaDoc(racc, id) {
    var d = raccolta(racc)[id];
    return { id: id, exists: !!d, ref: refDoc(racc, id),
             data: function () { return d ? copia(d) : undefined; },
             get: function (k) { return d ? d[k] : undefined; } };
  }
  function refDoc(racc, id) {
    racc = chiudiPercorso(racc);
    var percorso = racc + "/" + id;
    return {
      id: id, path: percorso,
      get: function () {
        // `window.__getRotti = ["users/uid"]`: quel documento non si legge, come
        // offline senza copia in cache. (Per l'avvio a freddo senza rete.)
        if ((window.__getRotti || []).indexOf(percorso) >= 0) {
          return Promise.reject(Object.assign(new Error("unavailable"), { code: "unavailable" }));
        }
        return Promise.resolve(istantaneaDoc(racc, id));
      },
      /* Il server puo' dire no, o non rispondere. (22/09/2026)
         `__esitoScrittura(percorso, data)` → { rifiuta: "permission-denied" }
         oppure { trattieni: true } (la scrittura resta in coda finche' non si
         chiama `__rilascia()`, come senza rete). `__tentativi[percorso]` conta
         le chiamate, anche quelle non ancora arrivate. */
      set: function (data, opz) {
        var c = raccolta(racc);
        window.__tentativi = window.__tentativi || {};
        window.__tentativi[percorso] = (window.__tentativi[percorso] || 0) + 1;
        var esito = window.__esitoScrittura ? window.__esitoScrittura(percorso, data) : null;
        if (esito && esito.rifiuta) return Promise.reject(Object.assign(new Error(esito.rifiuta), { code: esito.rifiuta }));
        function fai() { c[id] = applica(c[id], data, !!(opz && opz.merge)); scrivi("set", percorso, data); notifica(racc); }
        if (esito && esito.trattieni) {
          return new Promise(function (res) { (window.__trattenute = window.__trattenute || []).push(function () { fai(); res(); }); });
        }
        fai(); return Promise.resolve();
      },
      update: function (data) {
        var c = raccolta(racc);
        if (!c[id]) return Promise.reject(Object.assign(new Error("not-found"), { code: "not-found" }));
        c[id] = applica(c[id], data, true);
        scrivi("update", percorso, data); notifica(racc); return Promise.resolve();
      },
      delete: function () { delete raccolta(racc)[id]; scrivi("delete", percorso, null); notifica(racc); return Promise.resolve(); },
      onSnapshot: function (cb) {
        var a = { racc: racc, f: function () { cb(istantaneaDoc(racc, id)); } };
        ascoltatori.push(a); setTimeout(a.f, 0);
        return function () { var i = ascoltatori.indexOf(a); if (i >= 0) ascoltatori.splice(i, 1); };
      },
      collection: function (n) { return interrogazione(percorso + "/" + n, []); }
    };
  }
  function interrogazione(racc, filtri) {
    racc = chiudiPercorso(racc);
    function righe() {
      var c = raccolta(racc);
      var arr = Object.keys(c).map(function (id) { return { id: id, d: c[id] }; });
      filtri.forEach(function (f) {
        if (f.t === "where") {
          arr = arr.filter(function (e) {
            /* `FieldPath.documentId()`: il filtro guarda l id, non un campo. (21/09/2026) */
            var v = f.campo === "__name__" ? e.id : e.d[f.campo];
            if (f.op === "==") return v === f.val;
            if (f.op === "array-contains") return Array.isArray(v) && v.indexOf(f.val) >= 0;
            if (f.op === "in") return f.val.indexOf(v) >= 0;
            if (f.op === ">") return v > f.val; if (f.op === ">=") return v >= f.val;
            if (f.op === "<") return v < f.val; if (f.op === "<=") return v <= f.val;
            return true;
          });
        } else if (f.t === "order") {
          arr.sort(function (a, b) {
            var x = a.d[f.campo], y = b.d[f.campo];
            if (x && x.__ts) x = x.__ts; if (y && y.__ts) y = y.__ts;
            var r = x < y ? -1 : x > y ? 1 : 0; return f.dir === "desc" ? -r : r;
          });
        } else if (f.t === "dopo") {
          /* `startAfter(valore)` sul campo dell ultimo orderBy, come Firestore:
             prima era un no-op, e un cursore sbagliato non si vedeva. (21/09/2026) */
          var ord = filtri.filter(function (g) { return g.t === "order"; }).pop();
          if (ord) arr = arr.filter(function (e) { var x = e.d[ord.campo]; if (x === undefined || x === null) return false;
            return ord.dir === "desc" ? x < f.val : x > f.val; });
        } else if (f.t === "limit") { arr = arr.slice(0, f.n); }
      });
      return arr;
    }
    function istantanea() {
      var docs = righe().map(function (e) { return istantaneaDoc(racc, e.id); });
      return { empty: !docs.length, size: docs.length, docs: docs,
               forEach: function (fn) { docs.forEach(fn); }, docChanges: function () { return []; },
               metadata: { hasPendingWrites: false, fromCache: false } };
    }
    function piu(f) { return interrogazione(racc, filtri.concat([f])); }
    return {
      where: function (campo, op, val) { return piu({ t: "where", campo: campo, op: op, val: val }); },
      orderBy: function (campo, dir) { return piu({ t: "order", campo: campo, dir: dir }); },
      limit: function (n) { return piu({ t: "limit", n: n }); },
      limitToLast: function (n) { return piu({ t: "limit", n: n }); },
      startAfter: function (v) { return piu({ t: "dopo", val: v }); },
      /* Ogni documento restituito da una domanda e' una lettura: `__letture[raccolta]`
         dice quanto costa aprire l'app, e `__rompi(raccolta, filtri)` fa fallire le
         domande che sceglie, come farebbe la rete. (21/09/2026) */
      get: function () {
        if (window.__rompi && window.__rompi(racc, filtri)) return Promise.reject(Object.assign(new Error("unavailable"), { code: "unavailable" }));
        var x = istantanea();
        window.__letture = window.__letture || {};
        window.__letture[racc] = (window.__letture[racc] || 0) + x.size;
        return Promise.resolve(x);
      },
      onSnapshot: function (cb) {
        var a = { racc: racc, f: function () { cb(istantanea()); } };
        ascoltatori.push(a); setTimeout(a.f, 0);
        return function () { var i = ascoltatori.indexOf(a); if (i >= 0) ascoltatori.splice(i, 1); };
      },
      doc: function (id) { return refDoc(racc, id || ("auto" + Math.random().toString(36).slice(2, 10))); },
      add: function (data) {
        var id = "auto" + Math.random().toString(36).slice(2, 10);
        return refDoc(racc, id).set(data).then(function () { return refDoc(racc, id); });
      }
    };
  }
  var db = {
    collection: function (n) { return interrogazione(n, []); },
    doc: function (p) { var i = p.lastIndexOf("/"); return refDoc(p.slice(0, i), p.slice(i + 1)); },
    batch: function () {
      var ops = [];
      return { set: function (r, d, o) { ops.push(function () { return r.set(d, o); }); },
               update: function (r, d) { ops.push(function () { return r.update(d); }); },
               delete: function (r) { ops.push(function () { return r.delete(); }); },
               commit: function () { return ops.reduce(function (p, f) { return p.then(f); }, Promise.resolve()); } };
    },
    runTransaction: function (fn) {
      var tx = { get: function (r) { return r.get(); }, set: function (r, d, o) { r.set(d, o); }, update: function (r, d) { r.update(d); }, delete: function (r) { r.delete(); } };
      return Promise.resolve().then(function () { return fn(tx); });
    },
    enablePersistence: function () { return Promise.resolve(); },
    waitForPendingWrites: function () { return Promise.resolve(); },
    terminate: function () { window.__terminato = true; return Promise.resolve(); },
    clearPersistence: function () { window.__cachePulita = true; return Promise.resolve(); }
  };

  var statoAuth = [];
  var auth = {
    get currentUser() { return window.__utente; },
    onAuthStateChanged: function (cb) { statoAuth.push(cb); setTimeout(function () { cb(window.__utente); }, 0); return function () {}; },
    isSignInWithEmailLink: function () { return false; },
    signOut: function () { window.__utente = null; window.__uscito = (window.__uscito || 0) + 1; return Promise.resolve(); },
    sendPasswordResetEmail: function () { return Promise.resolve(); },
    signInWithEmailAndPassword: function () { return Promise.reject(new Error("finto")); },
    createUserWithEmailAndPassword: function () { return Promise.reject(new Error("finto")); }
  };
  function utenteVero(u) {
    if (!u) return null;
    return Object.assign({ emailVerified: true, displayName: "",
      reload: function () { return Promise.resolve(); }, getIdToken: function () { return Promise.resolve("tok"); },
      sendEmailVerification: function () { return Promise.resolve(); },
      delete: function () { return Promise.resolve(); } }, u);
  }
  window.__utente = utenteVero(window.__utente);
  window.__entra = function (u) { window.__utente = utenteVero(u); statoAuth.forEach(function (cb) { cb(window.__utente); }); };

  var FieldValue = {
    serverTimestamp: function () { return { __fv: "ts" }; },
    delete: function () { return DELETE; },
    arrayUnion: function () { return { __fv: "union", v: [].slice.call(arguments) }; },
    arrayRemove: function () { return { __fv: "remove", v: [].slice.call(arguments) }; },
    increment: function (n) { return { __fv: "inc", v: n }; }
  };
  var firestoreFn = function () { return db; };
  firestoreFn.FieldValue = FieldValue;
  firestoreFn.FieldPath = { documentId: function () { return "__name__"; } };
  firestoreFn.Timestamp = { now: marca, fromMillis: function (n) { return { __ts: n, toMillis: function () { return n; } }; } };
  var authFn = function () { return auth; };
  authFn.EmailAuthProvider = { credential: function () { return {}; } };
  window.__messaggi = [];
  var messaging = {
    getToken: function () { return Promise.resolve(window.__tokenFinto || "token-finto-1"); },
    deleteToken: function () { window.__tokenCancellato = true; return Promise.resolve(true); },
    onMessage: function (cb) { window.__onMessage = cb; return function () {}; }
  };
  var functionsFn = function () { return { httpsCallable: function (nome) { return function (dati) { window.__chiamate = (window.__chiamate || []).concat([{ nome: nome, dati: dati }]); return Promise.resolve({ data: { ok: true } }); }; } }; };
  window.firebase = {
    initializeApp: function () { return { functions: functionsFn }; },
    app: function () { return { functions: functionsFn }; },
    auth: authFn, firestore: firestoreFn,
    messaging: Object.assign(function () { return messaging; }, { isSupported: function () { return true; } }),
    functions: functionsFn
  };
  window.__fakeDb = db;
  window.__rilascia = function () { var t = window.__trattenute || []; window.__trattenute = []; t.forEach(function (f) { f(); }); return t.length; };
}

function scriptIniziale(opzioni) {
  return "(" + installa.toString() + ")(" + JSON.stringify(opzioni || {}) + ");";
}

/* La copia di prova: produzione vera (DEV_MODE resta false), piu' un gancio
   facoltativo appena prima di `initAuthFlow();` per le funzioni interne. */
function copiaProduzione(html, opzioni) {
  if (html.indexOf("var DEV_MODE = false;") < 0) throw new Error("firebase-finto: DEV_MODE non e' false in questo file");
  var gancio = (opzioni && opzioni.gancio) || "";
  if (gancio) {
    if (html.indexOf("\ninitAuthFlow();") < 0) throw new Error("firebase-finto: punto di aggancio non trovato");
    html = html.replace("\ninitAuthFlow();", "\n" + gancio + "\ninitAuthFlow();");
  }
  return html;
}

module.exports = { scriptIniziale: scriptIniziale, copiaProduzione: copiaProduzione, installa: installa };
