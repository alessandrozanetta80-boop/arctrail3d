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
 * TRACCIAMENTO SOLO CON L'APP APERTA (foreground). Dentro la TWA/PWA un
 * tracciamento affidabile a schermo spento non esiste: lo si dice a chi
 * registra, e si tiene lo schermo acceso con Screen Wake Lock se c'e'.
 */
(function (root) {
  "use strict";
  var G = root.CampoGeo;

  var TESTI = {
    it: {
      titolo: "Mappa campo", occhiello: "Manutenzione campo",
      compagnia: "Compagnia / campo", compagnia_ph: "Codice compagnia (es. 01VERB)",
      segnala: "Segnala problema", registra: "Registra percorso",
      foreground: "La registrazione funziona solo con l'app aperta e lo schermo acceso.",
      gps_chiedo: "Chiedo la posizione…", gps_negato: "Posizione negata: abilitala nelle impostazioni del browser.",
      gps_assente: "Questo dispositivo non dà la posizione.", gps_errore: "Posizione non disponibile, riprovo…",
      gps_acc: "Precisione", gps_scarsa: "precisione scarsa", punti: "punti", scartati: "scartati",
      pausa: "Pausa", riprendi: "Riprendi", termina: "Termina e salva", annulla: "Annulla registrazione",
      annulla_conf: "Buttare la traccia registrata? Non resta niente, né qui né sul cloud.",
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
      segnala: "Report a problem", registra: "Record route",
      foreground: "Recording only works with the app open and the screen on.",
      gps_chiedo: "Asking for location…", gps_negato: "Location denied: enable it in the browser settings.",
      gps_assente: "This device does not provide a location.", gps_errore: "Location unavailable, retrying…",
      gps_acc: "Accuracy", gps_scarsa: "poor accuracy", punti: "points", scartati: "discarded",
      pausa: "Pause", riprendi: "Resume", termina: "Finish and save", annulla: "Discard recording",
      annulla_conf: "Discard the recorded track? Nothing is kept, here or in the cloud.",
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
    vista: "mappa", dettaglio: null, raggiungi: false, wake: null, manut: null, msg: ""
  };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { S.msg = "storage pieno"; } },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var coda = G.creaCoda(store), reg = G.creaRegistratore(store);
  var nodi = {};

  function T(ctx, k) { var l = (ctx.lang === "it") ? "it" : "en"; return TESTI[l][k] || TESTI.it[k] || k; }
  function catNome(ctx, id) {
    var c = G.CATEGORIE.filter(function (x) { return x.id === id; })[0];
    return c ? (c.icona + " " + (ctx.lang === "it" ? c.it : CAT_EN[id])) : id;
  }
  function statoNome(ctx, s) { return ctx.lang === "it" ? G.STATI_IT[s] : STATI_EN[s]; }
  function metri(m) { return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(m < 10000 ? 2 : 1) + " km"; }
  function data(ts) { try { return new Date(ts).toLocaleString(); } catch (e) { return ""; } }

  /* ── GPS ── */
  function avviaGps(ctx, alFix) {
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
    if (document.visibilityState === "visible" && reg.stato() === "registra") wakeLock(true);
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
    if (nodi.reg && d) nodi.reg.textContent = (d.fase === "pausa" ? T(ctx, "in_pausa") : T(ctx, "registrando")) + " · " + d.punti.length + " " + T(ctx, "punti") + " · " + metri(G.lunghezza(d.punti)) + (d.scartati ? " · " + d.scartati + " " + T(ctx, "scartati") : "");
    if (nodi.pos) nodi.pos.textContent = S.pos ? (S.pos.lat.toFixed(6) + ", " + S.pos.lon.toFixed(6) + " (±" + Math.round(S.pos.acc) + " m)") : T(ctx, "attendi_pos");
    if (nodi.raggiungi && S.dettaglio && S.pos) {
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
    var tutti = punti.concat(traccia, S.segn.filter(function (s) { return s.status !== "resolved"; }), S.pos ? [S.pos] : []);
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
    S.segn.forEach(function (s) {
      var q = xy(s);
      h += '<g class="campo-mk campo-mk-' + s.status + '" data-id="' + ctx.escapeHtml(s.id) + '"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="9"/><text x="' + q[0] + '" y="' + (+q[1] + 4) + '" text-anchor="middle">' + (G.CATEGORIE.filter(function (x) { return x.id === s.category; })[0] || { icona: "?" }).icona + "</text></g>";
    });
    if (S.pos) { var q = xy(S.pos); h += '<circle class="campo-io" cx="' + q[0] + '" cy="' + q[1] + '" r="6"/>'; }
    h += '<line class="campo-scala" x1="12" y1="' + (H - 10) + '" x2="92" y2="' + (H - 10) + '"/><text class="campo-scala-t" x="96" y="' + (H - 6) + '">' + metri(mPer80) + "</text>";
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
    S.ultimoCtx = ctx;
    nodi = {};
    // Da quale tasto di Campi si arriva: «Mappa campo» o «Segnala problema».
    // Resta nello stato, cosi' vale anche dopo la scelta della compagnia.
    if (ctx.vista === "mappa" || ctx.vista === "segnala") { S.vista = ctx.vista; S.dettaglio = null; S.raggiungi = false; S.gpsDaPorta = ctx.vista === "segnala"; }
    var E = ctx.el, X = ctx.escapeHtml;
    var wrap = E('<div class="campo-mappa"></div>');
    var card = E('<div class="card"></div>');
    card.appendChild(E('<div class="sezione-occhiello">' + X(T(ctx, "occhiello")) + "</div>"));
    card.appendChild(E('<h2 class="sezione-titolo">' + X(T(ctx, "titolo")) + "</h2>"));
    wrap.appendChild(card);
    if (!ctx.user) { card.appendChild(E('<div class="nota">' + X(T(ctx, "serve_accesso")) + "</div>")); return wrap; }

    if (!S.code) S.code = ctx.clubCode || store.get("arctrail3d_campo_codice") || null;
    card.appendChild(E('<div class="campo-eti">' + X(T(ctx, "compagnia")) + "</div>"));
    var riga = E('<div class="campo-riga"></div>');
    var inp = E('<input class="input-field in-modulo" maxlength="12" autocapitalize="characters" placeholder="' + X(T(ctx, "compagnia_ph")) + '">');
    inp.value = S.code || "";
    var vai = E('<button type="button" class="btn btn-ghost">OK</button>');
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
    if (S.msg) { card.appendChild(E('<div class="fr-stato">' + X(S.msg) + "</div>")); S.msg = ""; }

    if (S.vista === "segnala" && !P.segnala) S.vista = "mappa";
    if (S.vista === "segnala") {
      wrap.appendChild(formSegnala(ctx, P));
      if (S.gpsDaPorta) { S.gpsDaPorta = false; avviaGps(ctx); }
      aggiornaGps(ctx); return wrap;
    }
    if (S.vista === "dettaglio" && S.dettaglio) { wrap.appendChild(schedaDettaglio(ctx, P)); aggiornaGps(ctx); return wrap; }

    // azioni
    var az = E('<div class="campo-azioni"></div>');
    if (P.segnala) {
      var bS = E('<button type="button" class="btn btn-primary btn-block">' + X(T(ctx, "segnala")) + "</button>");
      bS.addEventListener("click", function () { S.vista = "segnala"; avviaGps(ctx); ctx.render(); });
      az.appendChild(bS);
    } else card.appendChild(E('<div class="nota">' + X(T(ctx, "serve_verifica")) + "</div>"));
    var d = reg.dati();
    if (P.registra && !d) {
      var bR = E('<button type="button" class="btn btn-ghost btn-block">' + X(T(ctx, "registra")) + "</button>");
      bR.addEventListener("click", function () {
        reg.avvia({ id: G.nuovoId("r"), companyCode: S.code, name: "", ora: Date.now() });
        wakeLock(true); avviaGps(ctx); ctx.render();
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
    c.appendChild(E('<div class="nota">' + X(T(ctx, "foreground")) + " " + X(S.wake ? T(ctx, "wake_si") : (navigator.wakeLock ? "" : T(ctx, "wake_no"))) + "</div>"));
    nodi.reg = E('<div class="campo-reg-stato" aria-live="polite"></div>'); c.appendChild(nodi.reg);
    var nome = E('<input class="input-field in-modulo" maxlength="120" placeholder="' + X(T(ctx, "nome_percorso")) + '">');
    nome.value = d.name || "";
    nome.addEventListener("input", function () { var x = reg.dati(); if (x) { x.name = nome.value; store.set("arctrail3d_campo_traccia_v1", JSON.stringify(x)); } });
    c.appendChild(nome);
    var r = E('<div class="campo-riga"></div>');
    var bP = E('<button type="button" class="btn btn-ghost">' + X(d.fase === "pausa" ? T(ctx, "riprendi") : T(ctx, "pausa")) + "</button>");
    bP.addEventListener("click", function () { if (reg.stato() === "pausa") { reg.riprendi(); wakeLock(true); } else { reg.pausa(); wakeLock(false); } ctx.render(); });
    var bT = E('<button type="button" class="btn btn-primary">' + X(T(ctx, "termina")) + "</button>");
    bT.addEventListener("click", function () {
      var x = reg.dati();
      if (!x.punti.length) { reg.annulla(); wakeLock(false); ctx.render(); return; }
      var meta = G.metaPercorso({ id: x.id, companyCode: x.companyCode, name: (nome.value || "").trim() || ("Percorso " + new Date().toLocaleDateString()), uid: ctx.user.uid, createdAt: Date.now(), punti: x.punti });
      // In coda PRIMA di togliere la bozza: se il telefono muore qui in mezzo
      // la traccia c'e' ancora (al peggio due volte con lo stesso id: niente doppioni).
      coda.aggiungi({ id: "route-" + x.id, tipo: "route", dati: { meta: meta, segmenti: G.segmenta(x.punti) } });
      reg.termina(); wakeLock(false);
      S.puntiRotta[meta.id] = x.punti; S.rottaVista = meta.id;
      if (!S.rotte.some(function (q) { return q.id === meta.id; })) S.rotte.unshift(meta);
      S.msg = T(ctx, "salvato_locale");
      sincronizza(ctx); ctx.render();
    });
    var bA = E('<button type="button" class="btn btn-ghost campo-pericolo">' + X(T(ctx, "annulla")) + "</button>");
    bA.addEventListener("click", function () { if (confirm(T(ctx, "annulla_conf"))) { reg.annulla(); wakeLock(false); ctx.render(); } });
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
      var dist = S.pos ? " · " + metri(G.distanza(S.pos, s)) : "";
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
    var st = E('<div class="fr-stato"></div>'); c.appendChild(st);
    var bI = E('<button type="button" class="btn btn-primary btn-block stacco">' + X(T(ctx, "invia")) + "</button>");
    bI.addEventListener("click", function () {
      if (!S.pos) { st.textContent = T(ctx, "attendi_pos"); return; }
      bI.disabled = true;
      var f = foto.files && foto.files[0];
      (f ? riduciFoto(f) : Promise.resolve(null)).then(function (du) {
        var id = G.nuovoId("i"), ora = Date.now();
        var seg = G.nuovaSegnalazione({ id: id, companyCode: S.code, routeId: S.rottaVista || null, category: cat, note: nota.value.trim(), lat: S.pos.lat, lon: S.pos.lon, acc: S.pos.acc, uid: ctx.user.uid, createdAt: ora });
        coda.aggiungi({ id: "issue-" + id, tipo: "issue", dati: { seg: seg, foto: du ? [{ id: "f1", dataUrl: du }] : [] } });
        S.msg = T(ctx, "salvato_locale"); S.vista = "mappa";
        sincronizza(ctx); ctx.render();
      }).catch(function (e) { bI.disabled = false; st.textContent = T(ctx, "errore") + ": " + (e && e.message || e); });
    });
    c.appendChild(bI);
    var bC = E('<button type="button" class="btn btn-block btn-chiudi">' + X(T(ctx, "chiudi")) + "</button>");
    bC.addEventListener("click", function () { S.vista = "mappa"; ctx.render(); });
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
      if (v) c.appendChild(E('<div class="nota">' + X(T(ctx, "vicina")) + ": " + X(String(v.piazzola.n || v.piazzola.nome || "")) + " (" + metri(v.d) + ")</div>"));
    }
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

  root.CampoMappaUI = { schermo: schermo, _stato: S, _coda: coda, _reg: reg, sincronizza: sincronizza };
})(typeof self !== "undefined" ? self : this);
