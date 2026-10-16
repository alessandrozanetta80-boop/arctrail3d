/* campo-mappa.js — schermata MAPPA CAMPO / MANUTENZIONE CAMPO. (02/10/2026.)
 *
 * Disegna e basta: i dati passano da `CampoGeo` (campo-geo.js) e dal suo
 * repository. `app.html` chiama `CampoMappaUI.schermo(ctx)` con quello che
 * serve (el, escapeHtml, db, utente, codice compagnia, render...).
 *
 * LA MAPPA E' UN DISEGNO SVG, non una carta: percorso, segnalazioni e la tua
 * posizione in proiezione locale (metri), con la scala. Funziona senza rete
 * e senza librerie o chiavi nuove. Per la carta vera c'e' «Apri nel
 * navigatore» (Google Maps / app di sistema, in una scheda nuova: ArcTrail
 * resta aperta dov'era). Tile OSM e mappe offline: fuori da questa v1.
 *
 * Android: servizio GPS nativo con journal privato, importato via MessagePort
 * dall'origine verificata. Browser/PWA: foreground e Screen Wake Lock.
 */
(function (root) {
  "use strict";
  var G = root.CampoGeo, N = root.ArcTrailGpsNativo;
  function nativo() { return N && N.disponibile(); }
  var nativePoll = null, nativeBusy = false;
  async function importaGps(ctx, strict) {
    var d = reg.dati(), uid = S.uid;
    if (!d || !d.nativo || !nativo() || nativeBusy) return;
    nativeBusy = true;
    try {
      var b, oldPhase=reg.stato();
      do {
        b = await N.comando("read", uid, d.id, reg.dati().nativeCursor || 0);
        if (S.uid !== uid || !reg.dati() || reg.dati().id !== d.id) return;
        if (b.fase === "assente") { if (reg.stato() === "registra") reg.pausa(); return; }
        reg.importaNativo(b);
        if (b.punti.length) { S.pos = b.punti[b.punti.length - 1]; S.gpsMsg = ""; }
        if (b.errore) S.gpsMsg = b.errore;
      } while (b.altro);
      aggiornaGps(ctx);
      if (oldPhase !== reg.stato() && S.ultimoCtx === ctx) ctx.render();
    } catch (e) { S.gpsMsg = e.message; aggiornaGps(ctx); if(strict) throw e; }
    finally { nativeBusy = false; }
  }
  var recovering = false;
  async function recuperaNativo(ctx) {
    if (recovering || reg.dati() || !nativo() || !S.uid) return;
    recovering = true; var uid = S.uid;
    try {
      var b = await N.comando("recover", uid, "");
      if (uid !== S.uid || reg.dati() || !b.id) return;
      reg.avvia({id:b.id,companyCode:b.companyCode,name:b.name,ora:b.avviatoIl});
      reg.modalitaNativa(); S.code=b.companyCode;
      await importaGps(ctx); ctx.render();
    } catch(e) { S.gpsMsg=e.message; } finally { recovering=false; }
  }
  function seguiNativo(ctx) {
    if (!nativePoll) nativePoll = setInterval(function () { if (S.ultimoCtx) importaGps(S.ultimoCtx); }, 2000);
    if (reg.dati()) importaGps(ctx); else recuperaNativo(ctx);
  }
  async function pausaNativa(ctx) {
    var d = reg.dati(), uid = S.uid;
    if (!d || !d.nativo) return;
    function stesso() { if (S.uid !== uid || !reg.dati() || reg.dati().id !== d.id) throw new Error("Operazione annullata: account o percorso cambiato."); }
    await N.comando("pause", uid, d.id); stesso();
    // A read already in progress will finish before the next drain; never drop its tail.
    while (nativeBusy) await new Promise(function(r){setTimeout(r,25);});
    stesso(); await importaGps(ctx, true); stesso();
    reg.pausa();
  }
  root.addEventListener("arctrail-gps-ready", function () { if (S.ultimoCtx) { seguiNativo(S.ultimoCtx); S.ultimoCtx.render(); } });

  var TESTI = {
    it: {
      titolo: "Mappa campo", occhiello: "Manutenzione campo",
      compagnia: "Compagnia / campo", compagnia_ph: "Codice compagnia (es. 01VERB)",
      segnala: "Segnala problema sul campo", registra: "Registra percorso",
      piazzola: "Piazzola (facoltativa)", nessuna_pz: "—",
      foreground: "Tieni l’app aperta e lo schermo acceso mentre registri.",
      gps_chiedo: "Chiedo la posizione…", gps_negato: "Posizione negata: abilitala nelle impostazioni del browser.",
      gps_assente: "Questo dispositivo non dà la posizione.", gps_errore: "Posizione non disponibile, riprovo…",
      gps_acc: "Precisione", gps_scarsa: "precisione scarsa", punti: "punti", scartati: "scartati",
      pausa: "Pausa", riprendi: "Riprendi", termina: "Termina e salva", annulla: "Annulla registrazione",
      annulla_conf: "Buttare la traccia registrata? Non resta niente, né qui né sul cloud.",
      nome_richiesto: "Scrivi il nome del percorso, per esempio Verde.", senza_punti: "Nessun punto GPS valido: la bozza resta qui, non è ancora possibile salvare il percorso.",
      segna_piazzola: "Segna piazzola", numero_piazzola: "Numero piazzola", piazzole_segnate: "Piazzole segnate",
      piazzola_salvata: "Piazzola segnata", numero_errato: "Usa un numero intero da 1 a 200.",
      piazzola_doppia: "Questa piazzola è già segnata. Scegli un altro numero.",
      piazzola_gps: "Attendi una posizione GPS recente e precisa prima di segnare la piazzola.",
      rimuovi_piazzola: "Rimuovi piazzola", conferma_piazzola: "Rimuovere questa piazzola dalla bozza?",
      nome_percorso: "Nome del percorso", in_pausa: "In pausa", registrando: "Registrazione in corso",
      wake_si: "Schermo tenuto acceso", wake_no: "Tieni lo schermo acceso a mano",
      percorsi: "Percorsi", nessun_percorso: "Nessun percorso per questa compagnia.",
      bozza: "Bozza", pubblicato: "Pubblicato", mostra: "Mostra", pubblica: "Pubblica", ritira: "Torna bozza",
      elimina: "Elimina", elimina_conf: "Eliminare definitivamente questo elemento?",
      segnalazioni: "Segnalazioni", nessuna_segn: "Nessuna segnalazione.",
      categoria: "Categoria", nota: "Nota (facoltativa)", foto: "Foto (facoltativa)", invia: "Salva segnalazione",
      posizione: "Posizione", attendi_pos: "Aspetto una posizione GPS…",
      in_coda: "in attesa di rete", sincronizzato: "Tutto sincronizzato", sincronizza: "Sincronizza ora",
      salvato_locale: "Salvata nel telefono: partirà appena c'è rete.",
      distanza: "Distanza", direzione: "Direzione", raggiungi: "Raggiungi", ferma: "Ferma",
      navigatore: "Apri nel navigatore", stato: "Stato", storia: "Storico",
      vicina: "Piazzola più vicina", chiudi: "Chiudi",
      no_distanze: "Giro in corso: distanze e direzione nascoste (regolamento).",
      manutentori: "Manutentori autorizzati", aggiungi: "Autorizza", revoca: "Revoca",
      uid_ph: "ID utente ArcTrail", nessun_manut: "Nessun manutentore autorizzato.",
      serve_accesso: "Accedi per usare la mappa del campo.", serve_verifica: "Conferma l'email per segnalare.",
      scegli_compagnia: "Scegli la compagnia del campo.", errore: "Operazione non riuscita",
      mappa_vuota: "Niente da disegnare: registra un percorso o fai una segnalazione.",
      scala: "scala"
    },
    en: {
      titolo: "Course map", occhiello: "Course maintenance",
      compagnia: "Club / course", compagnia_ph: "Club code (e.g. 01VERB)",
      segnala: "Report a problem on the course", registra: "Record route",
      piazzola: "Target / stake (optional)", nessuna_pz: "—",
      foreground: "Recording only works with the app open and the screen on.",
      gps_chiedo: "Asking for location…", gps_negato: "Location denied: enable it in the browser settings.",
      gps_assente: "This device does not provide a location.", gps_errore: "Location unavailable, retrying…",
      gps_acc: "Accuracy", gps_scarsa: "poor accuracy", punti: "points", scartati: "discarded",
      pausa: "Pause", riprendi: "Resume", termina: "Finish and save", annulla: "Discard recording",
      annulla_conf: "Discard the recorded track? Nothing is kept, here or in the cloud.",
      nome_richiesto: "Enter the route name before recording.", senza_punti: "No valid GPS points yet. The draft is kept; the route cannot be saved yet.",
      segna_piazzola: "Mark shooting station", numero_piazzola: "Station number", piazzole_segnate: "Marked stations",
      piazzola_salvata: "Station marked", numero_errato: "Use a whole number from 1 to 200.",
      piazzola_doppia: "This station is already marked. Choose another number.",
      piazzola_gps: "Wait for a recent, accurate GPS position before marking the station.",
      rimuovi_piazzola: "Remove station", conferma_piazzola: "Remove this station from the draft?",
      nome_percorso: "Route name", in_pausa: "Paused", registrando: "Recording",
      wake_si: "Screen kept on", wake_no: "Keep the screen on manually",
      percorsi: "Routes", nessun_percorso: "No routes for this club.",
      bozza: "Draft", pubblicato: "Published", mostra: "Show", pubblica: "Publish", ritira: "Back to draft",
      elimina: "Delete", elimina_conf: "Delete this item permanently?",
      segnalazioni: "Reports", nessuna_segn: "No reports.",
      categoria: "Category", nota: "Note (optional)", foto: "Photo (optional)", invia: "Save report",
      posizione: "Position", attendi_pos: "Waiting for a GPS position…",
      in_coda: "waiting for network", sincronizzato: "Everything synced", sincronizza: "Sync now",
      salvato_locale: "Saved on this phone: it will be sent when online.",
      distanza: "Distance", direzione: "Direction", raggiungi: "Go there", ferma: "Stop",
      navigatore: "Open in navigator", stato: "Status", storia: "History",
      vicina: "Nearest stake", chiudi: "Close",
      no_distanze: "Round in progress: distances and direction hidden (rules).",
      manutentori: "Authorised maintainers", aggiungi: "Authorise", revoca: "Revoke",
      uid_ph: "ArcTrail user ID", nessun_manut: "No authorised maintainers.",
      serve_accesso: "Sign in to use the course map.", serve_verifica: "Confirm your email to report.",
      scegli_compagnia: "Choose the club of the course.", errore: "Operation failed",
      mappa_vuota: "Nothing to draw: record a route or report a problem.",
      scala: "scale"
    }
  };
  var CAT_EN = { pianta: "Fallen tree", sentiero: "Path / passage blocked", bersaglio: "Damaged target",
    piazzola: "Stake / shooting post", segnaletica: "Signage", sicurezza: "Safety", altro: "Other" };
  var STATI_EN = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

  /* stato del modulo: vive finche' vive la pagina */
  var S = {
    code: null, perm: null, permCode: null, rotte: [], segn: [], caricatoCode: null,
    puntiRotta: {}, rottaVista: null, pos: null, gpsMsg: "", watchId: null,
    vista: "mappa", dettaglio: null, raggiungi: false, wake: null, manut: null, msg: "",
    piazzola: null, sceltaEsplicita: false
  };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { localStorage.setItem(k, v); },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  /* LA CODA E IL TRACCIATO HANNO UN PROPRIETARIO. (08/10/2026.)
     Prima una sola coda e un solo tracciato per telefono: chi entrava dopo
     vedeva (e provava a inviare) segnalazioni e percorsi non ancora partiti di
     chi era uscito. Adesso le chiavi portano l'uid: ognuno vede solo i suoi.
     Quello che non e' partito NON si cancella: resta sul telefono, invisibile
     agli altri, e parte quando il suo proprietario rientra. Senza utente: nulla. */
  var CHIAVE_CODA = "arctrail3d_campo_coda_v1", CHIAVE_TRACCIA = "arctrail3d_campo_traccia_v1";
  var nessuno = { get: function () { return null; }, set: function () {}, remove: function () {} };
  var coda = G.creaCoda(nessuno), reg = G.creaRegistratore(nessuno), chiaveTraccia = null;
  var nodi = {};
  function perUtente(ctx) {
    var uid = (ctx && ctx.user && ctx.user.uid) || null;
    if (S.uid === uid && chiaveTraccia !== null) return;
    lascia(true);
    S.uid = uid; S.ultimoCtx = null; S.code = null; S.perm = null; S.permCode = null; S.rotte = []; S.segn = [];
    S.caricatoCode = null; S.puntiRotta = {}; S.rottaVista = null; S.pos = null; S.dettaglio = null; S.manut = null;
    if (!uid) { coda = G.creaCoda(nessuno); reg = G.creaRegistratore(nessuno); chiaveTraccia = null; return; }
    coda = G.creaCoda(store, CHIAVE_CODA + ":" + uid);
    chiaveTraccia = CHIAVE_TRACCIA + ":" + uid;
    reg = G.creaRegistratore(store, chiaveTraccia);
    // Coda di prima (chiave senza uid): ogni operazione porta l'uid di chi l'ha
    // fatta, quindi torna solo al suo autore. Le altre restano dove sono.
    var vecchie = G.creaCoda(store, CHIAVE_CODA).elenco();
    if (vecchie.length) {
      var resto = vecchie.filter(function (o) {
        var d = o.dati || {}, chi = o.tipo === "issue" ? (d.seg || {}).reporterUid : (d.meta || {}).createdBy;
        if (chi === uid) { coda.aggiungi(o); return false; }
        return true;
      });
      if (resto.length) store.set(CHIAVE_CODA, JSON.stringify(resto)); else store.remove(CHIAVE_CODA);
    }
  }
  /* Uscire dalla mappa (indietro, barra in basso, altra schermata): il GPS si
     spegne, una registrazione in corso va in pausa (resta salvata), il wake
     lock si rilascia. Lo chiama app.html a ogni render fuori da `campo-mappa`. */
  function lascia(account) {
    var d = reg.dati();
    if (d && d.nativo && !account) { wakeLock(false); S.raggiungi = false; return; }
    if (d && d.nativo && nativo()) N.comando("pause", S.uid, d.id).catch(function(){});
    if (nativePoll) clearInterval(nativePoll); nativePoll = null;
    fermaGps();
    if (reg.stato() === "registra") reg.pausa();
    wakeLock(false);
    S.raggiungi = false;
  }

  function T(ctx, k) { var l = (ctx.lang === "it") ? "it" : "en"; return TESTI[l][k] || TESTI.it[k] || k; }
  function catNome(ctx, id) {
    var c = G.CATEGORIE.filter(function (x) { return x.id === id; })[0];
    return c ? (c.icona + " " + (ctx.lang === "it" ? c.it : CAT_EN[id])) : id;
  }
  function statoNome(ctx, s) { return ctx.lang === "it" ? G.STATI_IT[s] : STATI_EN[s]; }
  /* NIENTE DISTANZE DURANTE IL GIRO. (08/10/2026.) Nel tiro 3D la distanza del
     bersaglio non si misura: con un giro aperto la mappa non mostra metri, scala,
     direzione, «Raggiungi» ne' il navigatore (una segnalazione sul bersaglio
     diventerebbe un telemetro). Fuori dal giro la manutenzione resta com'era. */
  function senzaDistanze(ctx) { return !!(ctx && ctx.giroInCorso); }
  function metri(m) { return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(m < 10000 ? 2 : 1) + " km"; }
  function data(ts) { try { return new Date(ts).toLocaleString(); } catch (e) { return ""; } }

  /* ── GPS ── */
  function avviaGps(ctx, alFix) {
    if (reg.dati() && reg.dati().nativo) { fermaGps(); if (nativo()) seguiNativo(ctx); else S.gpsMsg = "Riapri il percorso nell’app Android aggiornata: la traccia nativa resta nel telefono."; return; }
    if (S.watchId != null) return;
    if (!navigator.geolocation) { S.gpsMsg = T(ctx, "gps_assente"); aggiornaGps(ctx); return; }
    S.gpsMsg = T(ctx, "gps_chiedo"); aggiornaGps(ctx);
    S.watchId = navigator.geolocation.watchPosition(function (p) {
      S.pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp || Date.now() };
      S.gpsMsg = "";
      if (reg.stato() === "registra") reg.fix(S.pos);
      if (alFix) alFix();
      aggiornaGps(ctx);
    }, function (e) {
      S.gpsMsg = e && e.code === 1 ? T(ctx, "gps_negato") : T(ctx, "gps_errore");
      if (e && e.code === 1) fermaGps();
      aggiornaGps(ctx);
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }
  function fermaGps() {
    if (S.watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(S.watchId);
    S.watchId = null;
  }
  function wakeLock(on) {
    if (on && !S.wake && navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request("screen").then(function (w) { S.wake = w; w.addEventListener && w.addEventListener("release", function () { S.wake = null; }); }, function () { S.wake = null; });
    } else if (!on && S.wake) { try { S.wake.release(); } catch (e) {} S.wake = null; }
  }
  // Il wake lock cade quando la pagina si nasconde: lo si riprende al ritorno.
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && reg.dati() && reg.dati().nativo && S.ultimoCtx) importaGps(S.ultimoCtx);
    else if (document.visibilityState === "visible" && reg.stato() === "registra") wakeLock(true);
  });

  /* Aggiorna solo i pezzi che cambiano col GPS: niente ridisegno intero a
     ogni fix (il resto della schermata non si muove sotto il dito). */
  function aggiornaGps(ctx) {
    if (nodi.gps) {
      var s = S.gpsMsg;
      if (!s && S.pos) s = T(ctx, "gps_acc") + " ±" + Math.round(S.pos.acc) + " m" + (S.pos.acc > G.SOGLIE.accScarsa ? " — " + T(ctx, "gps_scarsa") : "");
      nodi.gps.textContent = s || "";
      nodi.gps.classList.toggle("campo-gps-male", !!S.gpsMsg || (S.pos && S.pos.acc > G.SOGLIE.accScarsa));
    }
    var d = reg.dati();
    if (nodi.reg && d) nodi.reg.textContent = (d.fase === "pausa" ? T(ctx, "in_pausa") : T(ctx, "registrando")) + " · " + d.punti.length + " " + T(ctx, "punti") + (senzaDistanze(ctx) ? "" : " · " + metri(G.lunghezza(d.punti))) + (d.scartati ? " · " + d.scartati + " " + T(ctx, "scartati") : "");
    if (nodi.segnaPiazzola) nodi.segnaPiazzola.disabled = !d || d.fase !== "registra" || (S.watchId == null && !(d && d.nativo && nativo())) || !!S.gpsMsg ||
      !S.pos || !Number.isFinite(S.pos.acc) || S.pos.acc > G.SOGLIE.accMax || Date.now() - S.pos.t > 30000;
    if (nodi.pos) nodi.pos.textContent = S.pos ? (S.pos.lat.toFixed(6) + ", " + S.pos.lon.toFixed(6) + " (±" + Math.round(S.pos.acc) + " m)") : T(ctx, "attendi_pos");
    if (nodi.raggiungi && S.dettaglio && S.pos && !senzaDistanze(ctx)) {
      var dist = G.distanza(S.pos, S.dettaglio), dir = G.direzione(S.pos, S.dettaglio);
      nodi.raggiungi.textContent = T(ctx, "distanza") + " " + metri(dist) + " · " + T(ctx, "direzione") + " " + Math.round(dir) + "° " + G.cardinale(dir);
      if (nodi.freccia) nodi.freccia.style.transform = "rotate(" + Math.round(dir) + "deg)";
    }
    if (nodi.mappa) disegnaMappa(ctx, nodi.mappa);
  }

  /* ── mappa SVG ── */
  function disegnaMappa(ctx, box) {
    var punti = (S.rottaVista && S.puntiRotta[S.rottaVista]) || [];
    var d = reg.dati();
    var traccia = d ? d.punti : [];
    var rotta = S.rotte.filter(function (r) { return r.id === S.rottaVista; })[0];
    var piazzole = d ? (d.piazzole || []) : ((rotta && rotta.piazzole) || []);
    var tutti = punti.concat(traccia, piazzole, S.segn.filter(function (s) { return s.status !== "resolved"; }), S.pos ? [S.pos] : []);
    if (!tutti.length) { box.innerHTML = '<div class="campo-mappa-vuota">' + ctx.escapeHtml(T(ctx, "mappa_vuota")) + "</div>"; return; }
    var b = G.bbox(tutti), c = G.centro(b), k = Math.cos(c.lat * Math.PI / 180);
    var W = 360, H = 260, pad = 18;
    var spanX = Math.max((b.maxLon - b.minLon) * k, 0.0003), spanY = Math.max(b.maxLat - b.minLat, 0.0003);
    var sc = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    function xy(p) { return [(W / 2 + (p.lon - c.lon) * k * sc).toFixed(1), (H / 2 - (p.lat - c.lat) * sc).toFixed(1)]; }
    function linea(ps, cls) { return ps.length > 1 ? '<polyline class="' + cls + '" points="' + ps.map(function (p) { return xy(p).join(","); }).join(" ") + '"/>' : ""; }
    // scala: quanti metri sono 80 px
    var mPer80 = 80 / sc * 111320;
    var h = '<svg viewBox="0 0 ' + W + " " + H + '" class="campo-svg" role="img" aria-label="' + ctx.escapeHtml(T(ctx, "titolo")) + '">';
    h += linea(punti, "campo-linea") + linea(traccia, "campo-traccia");
    piazzole.forEach(function (p) {
      var q = xy(p);
      h += '<g class="campo-piazzola"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="12"/><text x="' + q[0] + '" y="' + (+q[1] + 4) + '" text-anchor="middle">' + ctx.escapeHtml(String(p.n)) + '</text></g>';
    });
    S.segn.forEach(function (s) {
      var q = xy(s);
      h += '<g class="campo-mk campo-mk-' + s.status + '" data-id="' + ctx.escapeHtml(s.id) + '"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="9"/><text x="' + q[0] + '" y="' + (+q[1] + 4) + '" text-anchor="middle">' + (G.CATEGORIE.filter(function (x) { return x.id === s.category; })[0] || { icona: "?" }).icona + "</text></g>";
    });
    if (S.pos) { var q = xy(S.pos); h += '<circle class="campo-io" cx="' + q[0] + '" cy="' + q[1] + '" r="6"/>'; }
    if (!senzaDistanze(ctx)) h += '<line class="campo-scala" x1="12" y1="' + (H - 10) + '" x2="92" y2="' + (H - 10) + '"/><text class="campo-scala-t" x="96" y="' + (H - 6) + '">' + metri(mPer80) + "</text>";
    h += '<text class="campo-nord" x="' + (W - 14) + '" y="16" text-anchor="middle">N↑</text></svg>';
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll(".campo-mk"), function (g) {
      g.addEventListener("click", function () { apriDettaglio(ctx, g.getAttribute("data-id")); });
    });
  }

  /* ── dati ── */
  function repo(ctx) { return ctx.db ? G.creaRepositoryFirestore(ctx.db, ctx.storage ? ctx.storage() : null) : null; }
  function carica(ctx) {
    var r = repo(ctx);
    if (!r || !S.code) return;
    S.caricatoCode = S.code;
    var code = S.code;
    calcolaPermessi(ctx, code).then(function () {
      return Promise.all([r.listRoutes(code, S.perm.gestisce), r.listIssues(code)]);
    }).then(function (v) {
      if (S.code !== code) return;
      S.rotte = v[0]; S.segn = v[1];
      store.set("arctrail3d_campo_cache_" + code, JSON.stringify({ rotte: S.rotte, segn: S.segn }));
      ctx.render();
    }).catch(function (e) { S.msg = T(ctx, "errore") + ": " + (e && (e.code || e.message)); ctx.render(); });
  }
  function daCache(code) {
    try { var c = JSON.parse(store.get("arctrail3d_campo_cache_" + code) || "null"); if (c) { S.rotte = c.rotte || []; S.segn = c.segn || []; } } catch (e) {}
  }
  function calcolaPermessi(ctx, code) {
    var u = ctx.user, base = { signedIn: !!u, verified: !!(u && u.emailVerified), isAdmin: !!ctx.isAdmin };
    if (!u || !ctx.db) { S.perm = G.permessi(base); return Promise.resolve(); }
    var r = repo(ctx);
    return Promise.all([
      r.isMaintainer(code, u.uid),
      ctx.db.collection("compagnie_contatto").doc(code).get().then(function (d) { return d.exists && d.data().adminUid === u.uid; }, function () { return false; })
    ]).then(function (v) {
      base.isMaintainer = v[0]; base.isClubAdmin = v[1];
      S.perm = G.permessi(base); S.permCode = code;
    });
  }
  function sincronizza(ctx) {
    var r = repo(ctx);
    if (!r || !coda.quante()) return Promise.resolve();
    var serveStorage = coda.elenco().some(function (o) { return o.tipo === "issue" && o.dati.foto && o.dati.foto.length; });
    return (serveStorage && ctx.caricaStorage ? ctx.caricaStorage() : Promise.resolve(true)).then(function () {
      return coda.svuota(repo(ctx).eseguiOperazione);
    }).then(function (e) {
      if (e && e.fatte) carica(ctx);
      ctx.render();
    });
  }
  if (typeof window !== "undefined") window.addEventListener("online", function () { if (S.ultimoCtx) sincronizza(S.ultimoCtx); });

  /* Foto: ridotta a 1600 px JPEG prima di metterla in coda (sta nel telefono
     finche' Storage non dice sì). */
  function riduciFoto(file) {
    return new Promise(function (ok, ko) {
      var fr = new FileReader();
      fr.onerror = ko;
      fr.onload = function () {
        var img = new Image();
        img.onerror = ko;
        img.onload = function () {
          var m = 1600, w = img.width, h = img.height, f = Math.min(1, m / Math.max(w, h));
          var cv = document.createElement("canvas"); cv.width = Math.round(w * f); cv.height = Math.round(h * f);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          ok(cv.toDataURL("image/jpeg", 0.8));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function scarica(nome, tipo, testo) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([testo], { type: tipo }));
    a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function puntiDi(ctx, id) {
    if (S.puntiRotta[id]) return Promise.resolve(S.puntiRotta[id]);
    return repo(ctx).getRoutePoints(id).then(function (p) { S.puntiRotta[id] = p; return p; });
  }

  function apriDettaglio(ctx, id) {
    S.dettaglio = S.segn.filter(function (s) { return s.id === id; })[0] || null;
    S.vista = "dettaglio"; S.raggiungi = false; ctx.render();
  }

  /* ── schermata ── */
  function schermo(ctx) {
    perUtente(ctx);
    S.ultimoCtx = ctx;
    if (nativo()) seguiNativo(ctx);
    nodi = {};
    // Da quale tasto di Campi si arriva: «Mappa campo» o «Segnala problema».
    // Resta nello stato, cosi' vale anche dopo la scelta della compagnia.
    if (ctx.vista === "mappa" || ctx.vista === "segnala") {
      S.vista = ctx.vista; S.dettaglio = null; S.raggiungi = false; S.gpsDaPorta = ctx.vista === "segnala";
      S.piazzola = ctx.piazzola || null;
      // Contesto dal giro o dalla scheda compagnia: `codice` stringa = quel campo;
      // `codice` null = campo non certo, si sceglie a mano (niente compagnia del
      // profilo al suo posto); assente = comportamento di sempre.
      S.sceltaEsplicita = ctx.codice === null;
      if (ctx.codice !== undefined && (ctx.codice || null) !== S.code) {
        S.code = ctx.codice || null; S.perm = null; S.rotte = []; S.segn = []; S.puntiRotta = {}; S.rottaVista = null; S.caricatoCode = null;
      }
    }
    var E = ctx.el, X = ctx.escapeHtml;
    var wrap = E('<div class="campo-mappa"></div>');
    var bozzaAttiva = reg.dati();
    if (bozzaAttiva && bozzaAttiva.companyCode !== S.code) { S.code = bozzaAttiva.companyCode; S.perm = null; S.caricatoCode = null; }
    var card = E('<div class="card' + (bozzaAttiva ? ' campo-testata-registra' : '') + '"></div>');
    card.appendChild(E('<div class="sezione-occhiello">' + X(T(ctx, "occhiello")) + "</div>"));
    card.appendChild(E('<h2 class="sezione-titolo">' + X(T(ctx, S.vista === "segnala" ? "segnala" : "titolo")) + "</h2>"));
    wrap.appendChild(card);
    if (!ctx.user) { card.appendChild(E('<div class="nota">' + X(T(ctx, "serve_accesso")) + "</div>")); return wrap; }

    if (!S.code && !S.sceltaEsplicita) S.code = ctx.clubCode || store.get("arctrail3d_campo_codice") || null;
    card.appendChild(E('<div class="campo-eti">' + X(T(ctx, "compagnia")) + "</div>"));
    var riga = E('<div class="campo-riga"></div>');
    var inp = E('<input type="text" class="input-field in-riga" maxlength="12" autocapitalize="characters" placeholder="' + X(T(ctx, "compagnia_ph")) + '">');
    inp.value = S.code || "";
    inp.disabled = !!bozzaAttiva;
    var vai = E('<button type="button" class="btn btn-ghost">OK</button>');
    vai.disabled = !!bozzaAttiva;
    vai.addEventListener("click", function () {
      var v = inp.value.trim().toUpperCase();
      S.code = v || null; S.perm = null; S.rotte = []; S.segn = []; S.puntiRotta = {}; S.rottaVista = null; S.caricatoCode = null;
      if (v) { store.set("arctrail3d_campo_codice", v); daCache(v); }
      ctx.render();
    });
    riga.appendChild(inp); riga.appendChild(vai); card.appendChild(riga);
    var nomeC = S.code && ctx.nomeCompagnia ? ctx.nomeCompagnia(S.code) : "";
    if (nomeC) card.appendChild(E('<div class="nota">' + X(nomeC) + "</div>"));
    if (!S.code) { card.appendChild(E('<div class="nota">' + X(T(ctx, "scegli_compagnia")) + "</div>")); return wrap; }
    if (S.caricatoCode !== S.code) { daCache(S.code); carica(ctx); }
    var P = S.perm || G.permessi({ signedIn: true, verified: !!ctx.user.emailVerified, isAdmin: !!ctx.isAdmin });

    // coda e GPS
    var nq = coda.quante();
    var sync = E('<div class="campo-sync' + (nq ? " campo-sync-attesa" : "") + '"></div>');
    sync.textContent = nq ? (nq + " " + T(ctx, "in_coda")) : T(ctx, "sincronizzato");
    if (nq) { var sb = E('<button type="button" class="btn btn-ghost campo-mini">' + X(T(ctx, "sincronizza")) + "</button>"); sb.addEventListener("click", function () { sincronizza(ctx); }); sync.appendChild(sb); }
    card.appendChild(sync);
    nodi.gps = E('<div class="campo-gps" aria-live="polite"></div>'); card.appendChild(nodi.gps);
    if (S.msg) { card.appendChild(E('<div class="' + (S.msgBuono ? 'nota campo-esito-ok' : 'fr-stato') + '" role="status">' + X(S.msg) + "</div>")); S.msg = ""; S.msgBuono = false; }

    if (S.vista === "segnala" && !P.segnala) { S.vista = "mappa"; card.appendChild(E('<div class="nota">' + X(T(ctx, "serve_verifica")) + "</div>")); }
    if (S.vista === "segnala") {
      wrap.appendChild(formSegnala(ctx, P));
      if (S.gpsDaPorta) { S.gpsDaPorta = false; avviaGps(ctx); }
      aggiornaGps(ctx); return wrap;
    }
    if (S.vista === "dettaglio" && S.dettaglio) { wrap.appendChild(schedaDettaglio(ctx, P)); aggiornaGps(ctx); return wrap; }

    // azioni. (02/10/2026, giro _09.) Niente piu' «Segnala problema» qui dentro:
    // la segnalazione ha le sue porte (Campi, scheda compagnia, giro in corso).
    // La mappa mostra e gestisce le segnalazioni esistenti.
    var az = E('<div class="campo-azioni"></div>');
    var d = reg.dati();
    if (P.registra && !d) {
      var nomeNuovo = E('<input type="text" class="input-field in-modulo" data-campo-nome-nuovo maxlength="120" placeholder="' + X(T(ctx, "nome_percorso")) + '">');
      nomeNuovo.setAttribute("aria-label", T(ctx, "nome_percorso"));
      az.appendChild(nomeNuovo);
      var erroreNome = E('<div class="nota" role="alert"></div>'); az.appendChild(erroreNome);
      var bR = E('<button type="button" class="btn btn-primary btn-block">' + X(T(ctx, "registra")) + "</button>");
      bR.addEventListener("click", function () {
        if (!nomeNuovo.value.trim()) { erroreNome.textContent = T(ctx, "nome_richiesto"); nomeNuovo.focus(); return; }
        if (N && N.richiedeNativo && !nativo()) { erroreNome.textContent = "GPS Android non collegato: attendi il collegamento o aggiorna l’app. La registrazione non è partita."; return; }
        reg.avvia({ id: G.nuovoId("r"), companyCode: S.code, name: nomeNuovo.value.trim(), ora: Date.now() });
        if (nativo()) { reg.modalitaNativa(); N.avvia(reg.dati(), S.uid); seguiNativo(ctx); }
        else { wakeLock(true); avviaGps(ctx); }
        ctx.render();
      });
      az.appendChild(bR);
    }
    wrap.appendChild(az);
    if (d) wrap.appendChild(pannelloRegistra(ctx));

    // mappa
    var mc = E('<div class="card campo-mappa-card"></div>');
    nodi.mappa = E('<div class="campo-mappa-box"></div>');
    mc.appendChild(nodi.mappa);
    wrap.appendChild(mc);

    wrap.appendChild(elencoRotte(ctx, P));
    wrap.appendChild(elencoSegn(ctx));
    if (P.autorizzaManutentori) wrap.appendChild(pannelloManut(ctx));
    aggiornaGps(ctx);
    if (S.pos || d) avviaGps(ctx);
    if (nq && navigator.onLine !== false) setTimeout(function () { sincronizza(ctx); }, 0);
    return wrap;
  }

  function pannelloRegistra(ctx) {
    var E = ctx.el, X = ctx.escapeHtml, d = reg.dati();
    var c = E('<div class="card campo-reg"></div>');
    c.appendChild(E('<div class="nota">' + X(d.nativo ? (ctx.lang === "it" ? "La traccia continua anche a schermo spento. Per fermarla: Pausa o Ferma GPS nella notifica." : "Recording continues with the screen off. Stop it with Pause or Stop GPS in the notification.") : T(ctx, "foreground")) + " " + X(d.nativo ? "" : S.wake ? T(ctx, "wake_si") : (navigator.wakeLock ? "" : T(ctx, "wake_no"))) + "</div>"));
    nodi.reg = E('<div class="campo-reg-stato" aria-live="polite"></div>'); c.appendChild(nodi.reg);
    var nome = E('<input type="text" class="input-field in-modulo" maxlength="120" placeholder="' + X(T(ctx, "nome_percorso")) + '">');
    nome.value = d.name || "";
    nome.addEventListener("input", function () { var x = reg.dati(); if (x && chiaveTraccia) { x.name = nome.value; store.set(chiaveTraccia, JSON.stringify(x)); } });
    c.appendChild(nome);
    var stazioni = d.piazzole || [];
    var numero = E('<input type="number" class="input-field in-modulo" min="1" max="200" step="1" inputmode="numeric" data-campo-numero-piazzola>');
    numero.value = stazioni.reduce(function (n, p) { return Math.max(n, p.n + 1); }, 1);
    numero.setAttribute("aria-label", T(ctx, "numero_piazzola"));
    var segna = E('<button type="button" class="btn btn-primary btn-block" data-campo-segna-piazzola></button>');
    function etichetta() { segna.textContent = T(ctx, "segna_piazzola") + " " + numero.value; }
    numero.addEventListener("input", etichetta); etichetta();
    segna.addEventListener("click", function () {
      try {
        var v = reg.segnaPiazzola(Number(numero.value), S.pos, Date.now());
        S.msgBuono = v.ok;
        S.msg = v.ok ? T(ctx, "piazzola_salvata") + " " + v.piazzola.n : T(ctx, v.motivo === "duplicata" ? "piazzola_doppia" : v.motivo === "numero" ? "numero_errato" : "piazzola_gps");
      } catch (e) { S.msg = T(ctx, "errore"); }
      ctx.render();
    });
    nodi.segnaPiazzola = segna;
    c.appendChild(E('<label class="campo-eti">' + X(T(ctx, "numero_piazzola")) + '</label>'));
    var segnaRiga = E('<div class="campo-segna-riga"></div>');
    segnaRiga.appendChild(numero); segnaRiga.appendChild(segna); c.appendChild(segnaRiga);
    if (stazioni.length) {
      var elencoPiazzole = E('<details class="campo-piazzole"><summary>' + X(T(ctx, "piazzole_segnate")) + ' · ' + stazioni.length + '</summary></details>');
      c.appendChild(elencoPiazzole);
      stazioni.forEach(function (p) {
        var riga = E('<div class="campo-riga campo-piazzola-riga"><b>' + X(T(ctx, "segna_piazzola").replace(/^Segna /, "")) + ' ' + p.n + '</b></div>');
        var togli = E('<button type="button" class="btn btn-ghost campo-mini campo-pericolo">' + X(T(ctx, "rimuovi_piazzola")) + ' ' + p.n + '</button>');
        togli.addEventListener("click", function () { if (confirm(T(ctx, "conferma_piazzola"))) { reg.rimuoviPiazzola(p.n); ctx.render(); } });
        riga.appendChild(togli); elencoPiazzole.appendChild(riga);
      });
    }
    var r = E('<div class="campo-controlli-traccia"></div>');
    var bP = E('<button type="button" class="btn btn-ghost">' + X(d.fase === "pausa" ? T(ctx, "riprendi") : T(ctx, "pausa")) + "</button>");
    bP.addEventListener("click", async function () { if (reg.dati().nativo) { try { if (reg.stato() === "pausa") N.avvia(reg.dati(), S.uid); else await pausaNativa(ctx); } catch(e) { S.msg=e.message; } ctx.render(); return; } if (reg.stato() === "pausa") { reg.riprendi(); wakeLock(true); } else { reg.pausa(); wakeLock(false); } ctx.render(); });
    var bT = E('<button type="button" class="btn btn-primary">' + X(T(ctx, "termina")) + "</button>");
    bT.addEventListener("click", async function () {
      bT.disabled = true;
      var ownerAtStart = S.uid, routeAtStart = reg.dati().id;
      try {
      if (reg.dati().nativo) await pausaNativa(ctx);
      if (S.uid !== ownerAtStart || !reg.dati() || reg.dati().id !== routeAtStart) throw new Error("Operazione annullata: account o percorso cambiato.");
      var x = reg.dati();
      if (!x.punti.length) { S.msg = T(ctx, "senza_punti"); ctx.render(); return; }
      var meta = G.metaPercorso({ id: x.id, companyCode: x.companyCode, name: (nome.value || "").trim() || ("Percorso " + new Date().toLocaleDateString()), uid: ctx.user.uid, createdAt: Date.now(), punti: x.punti, piazzole: x.piazzole || [] });
      // In coda PRIMA di togliere la bozza: se il telefono muore qui in mezzo
      // la traccia c'e' ancora (al peggio due volte con lo stesso id: niente doppioni).
      coda.aggiungi({ id: "route-" + x.id, tipo: "route", dati: { meta: meta, segmenti: G.segmenta(x.punti) } });
      if (x.nativo) await N.comando("clear", S.uid, x.id);
      reg.termina(); wakeLock(false);
      S.puntiRotta[meta.id] = x.punti; S.rottaVista = meta.id;
      if (!S.rotte.some(function (q) { return q.id === meta.id; })) S.rotte.unshift(meta);
      S.msg = T(ctx, "salvato_locale");
      sincronizza(ctx); ctx.render();
      } catch(e) { S.msg=e.message; ctx.render(); } finally { bT.disabled=false; }
    });
    var bA = E('<button type="button" class="btn btn-ghost campo-pericolo">' + X(T(ctx, "annulla")) + "</button>");
    bA.addEventListener("click", async function () { if (confirm(T(ctx, "annulla_conf"))) { try { if(reg.dati().nativo) { await pausaNativa(ctx); await N.comando("clear",S.uid,reg.dati().id); } reg.annulla(); wakeLock(false); ctx.render(); } catch(e) { S.msg=e.message; ctx.render(); } } });
    r.appendChild(bP); r.appendChild(bT); c.appendChild(r); c.appendChild(bA);
    return c;
  }

  function elencoRotte(ctx, P) {
    var E = ctx.el, X = ctx.escapeHtml;
    var c = E('<div class="card"></div>');
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "percorsi")) + "</div>"));
    if (!S.rotte.length) c.appendChild(E('<div class="nota">' + X(T(ctx, "nessun_percorso")) + "</div>"));
    S.rotte.forEach(function (r) {
      var v = E('<div class="campo-voce"></div>');
      v.appendChild(E('<div class="campo-voce-t"><b>' + X(r.name) + "</b> · " + X(r.status === "published" ? T(ctx, "pubblicato") : T(ctx, "bozza")) + " · " + metri(r.lengthM || 0) + " · " + (r.pointCount || 0) + " " + X(T(ctx, "punti")) + "</div>"));
      if (r.piazzole && r.piazzole.length) v.appendChild(E('<div class="nota">' + X(T(ctx, "piazzole_segnate")) + ': ' + r.piazzole.map(function (p) { return X(String(p.n)); }).join(" · ") + '</div>'));
      var bt = E('<div class="campo-riga campo-bottoni"></div>');
      function tasto(k, fn, cls) { var b = E('<button type="button" class="btn btn-ghost campo-mini ' + (cls || "") + '">' + X(T(ctx, k) || k) + "</button>"); b.addEventListener("click", fn); bt.appendChild(b); }
      tasto("mostra", function () { puntiDi(ctx, r.id).then(function () { S.rottaVista = r.id; ctx.render(); }, function (e) { S.msg = T(ctx, "errore"); ctx.render(); }); });
      tasto("GeoJSON", function () { puntiDi(ctx, r.id).then(function (p) { scarica(r.id + ".geojson", "application/geo+json", JSON.stringify(G.toGeoJSON(r, p, S.segn), null, 1)); }); });
      tasto("GPX", function () { puntiDi(ctx, r.id).then(function (p) { scarica(r.id + ".gpx", "application/gpx+xml", G.toGPX(r, p)); }); });
      if (P.pubblica) {
        tasto(r.status === "published" ? "ritira" : "pubblica", function () {
          var rp = repo(ctx), ora = Date.now();
          (r.status === "published" ? rp.unpublishRoute(r.id, ora) : rp.publishRoute(r.id, ctx.user.uid, ora))
            .then(function () { carica(ctx); }, function (e) { S.msg = T(ctx, "errore") + ": " + (e.code || e.message); ctx.render(); });
        });
        tasto("elimina", function () {
          if (!confirm(T(ctx, "elimina_conf"))) return;
          repo(ctx).deleteRoute(r.id).then(function () { delete S.puntiRotta[r.id]; carica(ctx); }, function (e) { S.msg = T(ctx, "errore") + ": " + (e.code || e.message); ctx.render(); });
        }, "campo-pericolo");
      }
      v.appendChild(bt); c.appendChild(v);
    });
    return c;
  }

  function elencoSegn(ctx) {
    var E = ctx.el, X = ctx.escapeHtml;
    var c = E('<div class="card"></div>');
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "segnalazioni")) + "</div>"));
    var pend = coda.elenco().filter(function (o) { return o.tipo === "issue"; }).map(function (o) { return Object.assign({ _coda: true }, o.dati.seg); });
    var tutte = pend.concat(S.segn.filter(function (s) { return !pend.some(function (p) { return p.id === s.id; }); }));
    tutte.sort(function (a, b) { return (a.status === "resolved") - (b.status === "resolved") || b.createdAt - a.createdAt; });
    if (!tutte.length) c.appendChild(E('<div class="nota">' + X(T(ctx, "nessuna_segn")) + "</div>"));
    tutte.forEach(function (s) {
      var dist = S.pos && !senzaDistanze(ctx) ? " · " + metri(G.distanza(S.pos, s)) : "";
      var v = E('<button type="button" class="campo-voce campo-voce-btn campo-st-' + s.status + '"></button>');
      v.innerHTML = '<span class="campo-voce-t"><b>' + X(catNome(ctx, s.category)) + "</b> · " + X(statoNome(ctx, s.status)) + dist + "<br><small>" + X(data(s.createdAt)) + (s._coda ? " · " + X(T(ctx, "in_coda")) : "") + (s.note ? " · " + X(s.note.slice(0, 80)) : "") + "</small></span>";
      v.addEventListener("click", function () {
        if (s._coda) { S.dettaglio = s; S.vista = "dettaglio"; ctx.render(); } else apriDettaglio(ctx, s.id);
      });
      c.appendChild(v);
    });
    return c;
  }

  function formSegnala(ctx, P) {
    var E = ctx.el, X = ctx.escapeHtml;
    var c = E('<div class="card"></div>');
    c.appendChild(E('<h3 class="campo-sotto">' + X(T(ctx, "segnala")) + "</h3>"));
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "posizione")) + "</div>"));
    nodi.pos = E('<div class="campo-pos" aria-live="polite"></div>'); c.appendChild(nodi.pos);
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "categoria")) + "</div>"));
    var cat = "pianta", tipi = E('<div class="fr-tipi"></div>'), btn = {};
    G.CATEGORIE.forEach(function (k) {
      var b = E('<button type="button">' + X(catNome(ctx, k.id)) + "</button>");
      btn[k.id] = b; b.addEventListener("click", function () { cat = k.id; ref(); }); tipi.appendChild(b);
    });
    function ref() { Object.keys(btn).forEach(function (k) { btn[k].classList.toggle("on", k === cat); }); }
    ref(); c.appendChild(tipi);
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "nota")) + "</div>"));
    var nota = E('<textarea class="input-field in-modulo" rows="3" maxlength="2000"></textarea>'); c.appendChild(nota);
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "foto")) + "</div>"));
    var foto = E('<input type="file" accept="image/*" capture="environment" class="campo-file">'); c.appendChild(foto);
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "piazzola")) + "</div>"));
    var pz = E('<select class="input-field in-modulo corto" data-campo-piazzola="1"></select>');
    pz.appendChild(E('<option value="">' + X(T(ctx, "nessuna_pz")) + "</option>"));
    for (var n = 1; n <= 40; n++) pz.appendChild(E('<option value="' + n + '">' + n + "</option>"));
    if (S.piazzola) {
      if (S.piazzola > 40) pz.appendChild(E('<option value="' + S.piazzola + '">' + S.piazzola + "</option>"));
      pz.value = String(S.piazzola);
    }
    c.appendChild(pz);
    var st = E('<div class="fr-stato"></div>'); c.appendChild(st);
    // Aperta da un giro o da una scheda: chiudere/inviare riporta li' (ctx.alChiudi).
    function esci() { S.piazzola = null; S.sceltaEsplicita = false; if (!reg.dati()) fermaGps(); if (ctx.alChiudi) ctx.alChiudi(); else { S.vista = "mappa"; ctx.render(); } }
    var bI = E('<button type="button" class="btn btn-primary btn-block stacco">' + X(T(ctx, "invia")) + "</button>");
    bI.addEventListener("click", function () {
      if (!S.pos) { st.textContent = T(ctx, "attendi_pos"); return; }
      bI.disabled = true;
      var f = foto.files && foto.files[0];
      (f ? riduciFoto(f) : Promise.resolve(null)).then(function (du) {
        var id = G.nuovoId("i"), ora = Date.now();
        var seg = G.nuovaSegnalazione({ id: id, companyCode: S.code, routeId: S.rottaVista || null, piazzola: pz.value || null, category: cat, note: nota.value.trim(), lat: S.pos.lat, lon: S.pos.lon, acc: S.pos.acc, uid: ctx.user.uid, createdAt: ora });
        coda.aggiungi({ id: "issue-" + id, tipo: "issue", dati: { seg: seg, foto: du ? [{ id: "f1", dataUrl: du }] : [] } });
        if (ctx.dopoSegnala) { try { ctx.dopoSegnala(seg, catNome(ctx, cat)); } catch (e) {} }
        S.msg = T(ctx, "salvato_locale");
        sincronizza(ctx);
        if (ctx.alChiudi) esci(); else { S.vista = "mappa"; ctx.render(); }
      }).catch(function (e) { bI.disabled = false; st.textContent = T(ctx, "errore") + ": " + (e && e.message || e); });
    });
    c.appendChild(bI);
    var bC = E('<button type="button" class="btn btn-block btn-chiudi">' + X(T(ctx, "chiudi")) + "</button>");
    bC.addEventListener("click", esci);
    c.appendChild(bC);
    return c;
  }

  function schedaDettaglio(ctx, P) {
    var E = ctx.el, X = ctx.escapeHtml, s = S.dettaglio;
    var c = E('<div class="card campo-dettaglio"></div>');
    c.appendChild(E('<h3 class="campo-sotto">' + X(catNome(ctx, s.category)) + "</h3>"));
    c.appendChild(E('<div class="nota">' + X(statoNome(ctx, s.status)) + " · " + X(data(s.createdAt)) + " · ±" + (s.acc || "?") + " m" + (s._coda ? " · " + X(T(ctx, "in_coda")) : "") + "</div>"));
    if (s.note) c.appendChild(E('<p class="campo-nota">' + X(s.note) + "</p>"));
    (s.photoPaths || []).forEach(function (p) {
      var im = E('<img class="campo-foto" alt="">'); c.appendChild(im);
      (ctx.caricaStorage ? ctx.caricaStorage() : Promise.resolve(true)).then(function () { return repo(ctx).photoUrl(p); }).then(function (u) { im.src = u; }, function () { im.remove(); });
    });
    if (ctx.piazzoleDi) {
      var v = G.piuVicina(s, ctx.piazzoleDi(S.code));
      if (v) c.appendChild(E('<div class="nota">' + X(T(ctx, "vicina")) + ": " + X(String(v.piazzola.n || v.piazzola.nome || "")) + (senzaDistanze(ctx) ? "" : " (" + metri(v.d) + ")") + "</div>"));
    }
    if (senzaDistanze(ctx)) {
      S.raggiungi = false;
      c.appendChild(E('<div class="nota campo-no-distanze">' + X(T(ctx, "no_distanze")) + "</div>"));
    } else {
      var nav = E('<div class="campo-nav"><span class="campo-freccia" aria-hidden="true">↑</span><span class="campo-dist" aria-live="polite"></span></div>');
      nodi.freccia = nav.querySelector(".campo-freccia"); nodi.raggiungi = nav.querySelector(".campo-dist");
      c.appendChild(nav);
      var r = E('<div class="campo-riga"></div>');
      var bG = E('<button type="button" class="btn btn-ghost">' + X(T(ctx, S.raggiungi ? "ferma" : "raggiungi")) + "</button>");
      bG.addEventListener("click", function () { S.raggiungi = !S.raggiungi; if (S.raggiungi) avviaGps(ctx); else if (!reg.dati()) fermaGps(); ctx.render(); });
      r.appendChild(bG);
      // Scheda nuova: ArcTrail resta aperta su questa segnalazione.
      r.appendChild(E('<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + s.lat + "," + s.lon + '">' + X(T(ctx, "navigatore")) + "</a>"));
      c.appendChild(r);
    }
    if (P.gestisce && !s._coda) {
      c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "stato")) + "</div>"));
      var rs = E('<div class="campo-riga campo-bottoni"></div>');
      G.STATI.forEach(function (st) {
        if (!G.transizioneValida(s.status, st)) return;
        var b = E('<button type="button" class="btn btn-ghost campo-mini">' + X(statoNome(ctx, st)) + "</button>");
        b.addEventListener("click", function () {
          repo(ctx).updateIssueStatus(s, st, ctx.user.uid, Date.now()).then(function (cs) {
            Object.assign(s, cs.patch); carica(ctx); ctx.render();
          }, function (e) { S.msg = T(ctx, "errore") + ": " + (e.code || e.message); ctx.render(); });
        });
        rs.appendChild(b);
      });
      var bE = E('<button type="button" class="btn btn-ghost campo-mini campo-pericolo">' + X(T(ctx, "elimina")) + "</button>");
      bE.addEventListener("click", function () {
        if (!confirm(T(ctx, "elimina_conf"))) return;
        (ctx.caricaStorage ? ctx.caricaStorage() : Promise.resolve()).then(function () { return repo(ctx).deleteIssue(s); })
          .then(function () { S.vista = "mappa"; S.dettaglio = null; carica(ctx); }, function (e) { S.msg = T(ctx, "errore") + ": " + (e.code || e.message); ctx.render(); });
      });
      rs.appendChild(bE);
      c.appendChild(rs);
    }
    if (!s._coda) {
      var h = E('<div class="campo-storia"></div>'); c.appendChild(h);
      repo(ctx).issueHistory(s.id).then(function (v) {
        h.innerHTML = '<div class="campo-eti">' + X(T(ctx, "storia")) + "</div>" + v.map(function (x) {
          return "<div><small>" + X(data(x.at)) + " · " + X(statoNome(ctx, x.to)) + " · " + X(String(x.by).slice(0, 8)) + "</small></div>";
        }).join("");
      }, function () {});
    }
    var bC = E('<button type="button" class="btn btn-block btn-chiudi">' + X(T(ctx, "chiudi")) + "</button>");
    bC.addEventListener("click", function () { S.vista = "mappa"; S.dettaglio = null; S.raggiungi = false; if (!reg.dati()) fermaGps(); ctx.render(); });
    c.appendChild(bC);
    return c;
  }

  function pannelloManut(ctx) {
    var E = ctx.el, X = ctx.escapeHtml, r = repo(ctx);
    var c = E('<div class="card"></div>');
    c.appendChild(E('<div class="campo-eti">' + X(T(ctx, "manutentori")) + "</div>"));
    var lista = E("<div></div>"); c.appendChild(lista);
    function ridisegna() {
      lista.innerHTML = "";
      if (!S.manut || !S.manut.length) { lista.appendChild(E('<div class="nota">' + X(T(ctx, "nessun_manut")) + "</div>")); return; }
      S.manut.forEach(function (m) {
        var v = E('<div class="campo-voce campo-riga"><span class="campo-voce-t">' + X(m.name || m.uid) + (m.active ? "" : " (off)") + "</span></div>");
        var b = E('<button type="button" class="btn btn-ghost campo-mini campo-pericolo">' + X(T(ctx, "revoca")) + "</button>");
        b.addEventListener("click", function () { r.revokeMaintainer(S.code, m.uid).then(leggi, function (e) { S.msg = T(ctx, "errore"); ctx.render(); }); });
        v.appendChild(b); lista.appendChild(v);
      });
    }
    function leggi() { r.listMaintainers(S.code).then(function (v) { S.manut = v; ridisegna(); }, function () {}); }
    var riga = E('<div class="campo-riga"></div>');
    var inU = E('<input class="input-field in-modulo" maxlength="128" placeholder="' + X(T(ctx, "uid_ph")) + '">');
    var inN = E('<input class="input-field in-modulo" maxlength="120" placeholder="Nome">');
    var bA = E('<button type="button" class="btn btn-ghost">' + X(T(ctx, "aggiungi")) + "</button>");
    bA.addEventListener("click", function () {
      var u = inU.value.trim(); if (!u) return;
      r.grantMaintainer(S.code, u, inN.value.trim(), ctx.user.uid, Date.now()).then(leggi, function (e) { S.msg = T(ctx, "errore") + ": " + (e.code || e.message); ctx.render(); });
    });
    riga.appendChild(inU); riga.appendChild(inN); riga.appendChild(bA); c.appendChild(riga);
    ridisegna(); leggi();
    return c;
  }

  root.CampoMappaUI = { schermo: schermo, lascia: lascia, _stato: S, sincronizza: sincronizza };
  // Coda e registratore cambiano con l'utente: i banchi leggono sempre quelli attuali.
  Object.defineProperty(root.CampoMappaUI, "_coda", { get: function () { return coda; } });
  Object.defineProperty(root.CampoMappaUI, "_reg", { get: function () { return reg; } });
})(typeof self !== "undefined" ? self : this);
