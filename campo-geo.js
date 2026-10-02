/* campo-geo.js — MAPPA CAMPO e MANUTENZIONE CAMPO, la parte che non disegna.
 *
 * (02/10/2026, task GPS percorsi + segnalazioni.)
 *
 * PERCHE' UN FILE A PARTE. Le schermate in `app.html` chiamano operazioni di
 * dominio (`createRoute`, `createIssue`, `updateIssueStatus`, `listIssues`...)
 * e non toccano mai Firestore direttamente. Il giorno che si passa a
 * Supabase/PostGIS si riscrive `creaRepositoryFirestore`, non le schermate.
 * Le funzioni pure (geohash, distanze, segmenti, GeoJSON/GPX, coda, stati,
 * permessi) girano anche in Node: le prova `tests/banco-campo-geo.js`.
 *
 * COORDINATE: sempre WGS84 / EPSG:4326, gradi decimali, [lat, lon] nei nostri
 * oggetti, [lon, lat] SOLO dentro GeoJSON (come vuole lo standard).
 *
 * MAPPING FUTURO POSTGIS (documentato anche in docs/CAMPO-GPS.md):
 *   field_routes + segments  -> tabella routes, geometria LineString (4326)
 *                               = concatenazione dei punti dei segmenti per `seq`
 *   field_issues             -> tabella issues, geometria Point (4326)
 *   (area campo, futura)     -> Polygon (4326)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CampoGeo = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SCHEMA_VERSION = 1;
  // Un segmento ha al massimo questi punti: ~25 byte a punto in Firestore,
  // 200 punti stanno larghi sotto il MB del documento e una traccia di tre ore
  // a un punto ogni 10 m resta su poche decine di documenti.
  var PUNTI_PER_SEGMENTO = 200;
  // Soglie del filtro GPS. Un fix peggiore di 35 m in un bosco e' rumore.
  var SOGLIE = { accMax: 35, distMin: 5, tempoMin: 15000, accScarsa: 20 };

  var CATEGORIE = [
    { id: "pianta",     it: "Pianta caduta",                icona: "🌲" },
    { id: "sentiero",   it: "Sentiero / passaggio ostruito", icona: "🚧" },
    { id: "bersaglio",  it: "Bersaglio danneggiato",        icona: "🎯" },
    { id: "piazzola",   it: "Piazzola / picchetto",         icona: "📍" },
    { id: "segnaletica",it: "Segnaletica",                  icona: "🪧" },
    { id: "sicurezza",  it: "Sicurezza",                    icona: "⚠️" },
    { id: "altro",      it: "Altro",                        icona: "❓" }
  ];
  var STATI = ["open", "in_progress", "resolved"];
  var STATI_IT = { open: "Aperta", in_progress: "In lavorazione", resolved: "Risolta" };
  // Si puo' riaprire una segnalazione risolta (l'albero e' ricaduto), ma non
  // si "cambia" uno stato nello stesso stato: non lascerebbe storia utile.
  var TRANSIZIONI = {
    open: ["in_progress", "resolved"],
    in_progress: ["open", "resolved"],
    resolved: ["open"]
  };

  /* ───────────── coordinate ───────────── */
  function coordValide(lat, lon) {
    return typeof lat === "number" && typeof lon === "number"
      && isFinite(lat) && isFinite(lon)
      && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  var B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  function geohash(lat, lon, precisione) {
    if (!coordValide(lat, lon)) throw new Error("coordinate non valide");
    precisione = precisione || 9;
    var la = [-90, 90], lo = [-180, 180], h = "", bit = 0, ch = 0, pari = true;
    while (h.length < precisione) {
      var r = pari ? lo : la, v = pari ? lon : lat, m = (r[0] + r[1]) / 2;
      if (v >= m) { ch = (ch << 1) | 1; r[0] = m; } else { ch = ch << 1; r[1] = m; }
      pari = !pari;
      if (++bit === 5) { h += B32.charAt(ch); bit = 0; ch = 0; }
    }
    return h;
  }

  var R_TERRA = 6371008.8;
  function rad(g) { return g * Math.PI / 180; }
  function distanza(a, b) {
    var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_TERRA * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function direzione(a, b) {
    var y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
    var x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat))
      - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function cardinale(gradi) {
    return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(((gradi % 360) + 360) % 360 / 45) % 8];
  }
  function lunghezza(punti) {
    var t = 0;
    for (var i = 1; i < punti.length; i++) t += distanza(punti[i - 1], punti[i]);
    return t;
  }
  function bbox(punti) {
    if (!punti.length) return null;
    var b = { minLat: 90, minLon: 180, maxLat: -90, maxLon: -180 };
    punti.forEach(function (p) {
      if (p.lat < b.minLat) b.minLat = p.lat; if (p.lat > b.maxLat) b.maxLat = p.lat;
      if (p.lon < b.minLon) b.minLon = p.lon; if (p.lon > b.maxLon) b.maxLon = p.lon;
    });
    return b;
  }
  function centro(b) {
    return b ? { lat: (b.minLat + b.maxLat) / 2, lon: (b.minLon + b.maxLon) / 2 } : null;
  }

  /* Un fix del GPS diventa punto solo se e' abbastanza preciso e se si e'
     mossi abbastanza (o e' passato abbastanza tempo). Restituisce il motivo
     dello scarto, utile a mostrare «accuratezza scarsa» a chi registra. */
  function valutaFix(ultimo, fix, soglie) {
    soglie = soglie || SOGLIE;
    if (!fix || !coordValide(fix.lat, fix.lon)) return { ok: false, motivo: "invalido" };
    if (typeof fix.acc === "number" && fix.acc > soglie.accMax) return { ok: false, motivo: "accuratezza" };
    if (!ultimo) return { ok: true };
    var d = distanza(ultimo, fix), dt = (fix.t || 0) - (ultimo.t || 0);
    if (dt < 0) return { ok: false, motivo: "ordine" };
    if (d >= soglie.distMin && d >= Math.min(fix.acc || 0, soglie.accMax) / 2) return { ok: true };
    if (dt >= soglie.tempoMin && d >= 1) return { ok: true };
    return { ok: false, motivo: "fermo" };
  }

  function punto(fix) {
    return {
      lat: Math.round(fix.lat * 1e7) / 1e7,
      lon: Math.round(fix.lon * 1e7) / 1e7,
      t: fix.t,
      acc: typeof fix.acc === "number" ? Math.round(fix.acc * 10) / 10 : null,
      gh: geohash(fix.lat, fix.lon, 9)
    };
  }

  /* I segmenti si sovrappongono di un punto: l'ultimo di uno e' il primo del
     successivo. Cosi' ogni segmento si disegna da solo senza buchi, e la
     LineString si ricompone togliendo il doppione (vedi `ricomponi`). */
  function segmenta(punti, quanti) {
    quanti = quanti || PUNTI_PER_SEGMENTO;
    if (quanti < 2) throw new Error("segmento troppo piccolo");
    var out = [], i = 0, seq = 0;
    if (!punti.length) return out;
    while (true) {
      var fetta = punti.slice(i, i + quanti);
      out.push({
        seq: seq++, schemaVersion: SCHEMA_VERSION, points: fetta, count: fetta.length,
        lengthM: Math.round(lunghezza(fetta) * 10) / 10, bbox: bbox(fetta)
      });
      if (i + quanti >= punti.length) break;
      i += quanti - 1;
    }
    return out;
  }
  function ricomponi(segmenti) {
    var ord = segmenti.slice().sort(function (a, b) { return a.seq - b.seq; }), punti = [];
    ord.forEach(function (s, k) { punti = punti.concat(k === 0 ? s.points : s.points.slice(1)); });
    return punti;
  }

  function metaPercorso(o) {
    var b = bbox(o.punti);
    var segs = segmenta(o.punti);
    return {
      id: o.id, companyCode: o.companyCode, name: String(o.name || "").slice(0, 120),
      schemaVersion: SCHEMA_VERSION, status: "draft", createdBy: o.uid,
      createdAt: o.createdAt, updatedAt: o.createdAt,
      startedAt: o.punti.length ? o.punti[0].t : null,
      endedAt: o.punti.length ? o.punti[o.punti.length - 1].t : null,
      bbox: b, center: centro(b), lengthM: Math.round(lunghezza(o.punti)),
      pointCount: o.punti.length, segmentCount: segs.length
    };
  }

  /* ───────────── export standard ───────────── */
  function toGeoJSON(percorso, punti, segnalazioni) {
    var feat = [{
      type: "Feature",
      geometry: { type: "LineString", coordinates: punti.map(function (p) { return [p.lon, p.lat]; }) },
      properties: {
        id: percorso.id, name: percorso.name, companyCode: percorso.companyCode,
        status: percorso.status, lengthM: percorso.lengthM,
        times: punti.map(function (p) { return new Date(p.t).toISOString(); })
      }
    }];
    (segnalazioni || []).forEach(function (s) {
      feat.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: { id: s.id, category: s.category, status: s.status, note: s.note || "", accuracy: s.acc }
      });
    });
    return { type: "FeatureCollection", features: feat };
  }
  function xml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function toGPX(percorso, punti) {
    var r = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="ArcTrail 3D" xmlns="http://www.topografix.com/GPX/1/1">',
      "<trk><name>" + xml(percorso.name) + "</name><trkseg>"];
    punti.forEach(function (p) {
      r.push('<trkpt lat="' + p.lat + '" lon="' + p.lon + '"><time>' + new Date(p.t).toISOString()
        + "</time>" + (p.acc != null ? "<hdop>" + p.acc + "</hdop>" : "") + "</trkpt>");
    });
    r.push("</trkseg></trk></gpx>");
    return r.join("\n");
  }

  /* ───────────── segnalazioni: stati ───────────── */
  function transizioneValida(da, a) {
    return !!(TRANSIZIONI[da] && TRANSIZIONI[da].indexOf(a) >= 0);
  }
  function categoriaValida(c) {
    return CATEGORIE.some(function (x) { return x.id === c; });
  }
  function nuovaSegnalazione(o) {
    if (!coordValide(o.lat, o.lon)) throw new Error("posizione mancante");
    if (!categoriaValida(o.category)) throw new Error("categoria non valida");
    return {
      id: o.id, companyCode: o.companyCode, routeId: o.routeId || null,
      category: o.category, note: String(o.note || "").slice(0, 2000),
      lat: Math.round(o.lat * 1e7) / 1e7, lon: Math.round(o.lon * 1e7) / 1e7,
      acc: typeof o.acc === "number" ? Math.round(o.acc) : null,
      gh: geohash(o.lat, o.lon, 9), status: "open",
      reporterUid: o.uid, createdAt: o.createdAt, updatedAt: o.createdAt,
      statusBy: o.uid, statusAt: o.createdAt, photoPaths: o.photoPaths || [],
      schemaVersion: SCHEMA_VERSION
    };
  }
  function cambioStato(seg, a, uid, ora) {
    if (!transizioneValida(seg.status, a)) throw new Error("passaggio " + seg.status + " → " + a + " non ammesso");
    return {
      patch: { status: a, statusBy: uid, statusAt: ora, updatedAt: ora },
      storia: { from: seg.status, to: a, by: uid, at: ora }
    };
  }

  /* Piazzola piu' vicina: SOLO se i dati del campo hanno coordinate vere per
     le piazzole. Niente coordinate, niente associazione: non si inventa. */
  function piuVicina(pos, piazzole, entroM) {
    entroM = entroM || 60;
    var best = null;
    (piazzole || []).forEach(function (p) {
      if (!p || !coordValide(p.lat, p.lon)) return;
      var d = distanza(pos, p);
      if (d <= entroM && (!best || d < best.d)) best = { piazzola: p, d: d };
    });
    return best;
  }

  /* ───────────── permessi (solo per la UI: decide il server) ───────────── */
  function permessi(c) {
    c = c || {};
    var gestore = !!(c.isAdmin || c.isClubAdmin || c.isMaintainer);
    return {
      vedePubblicati: !!c.signedIn,
      segnala: !!(c.signedIn && c.verified),
      registra: gestore && !!c.verified,
      gestisce: gestore && !!c.verified,
      pubblica: gestore && !!c.verified,
      autorizzaManutentori: !!(c.isAdmin || c.isClubAdmin)
    };
  }

  /* ───────────── coda offline ─────────────
     `store` e' un oggetto { get(k), set(k, v), remove(k) } — localStorage o
     un finto nei banchi. Ogni operazione ha un id deciso dal client: lo
     stesso id e' l'id del documento, quindi ripetere un'operazione gia'
     riuscita a meta' sovrascrive invece di duplicare. Un'operazione esce
     dalla coda SOLO dopo il sì di Firestore (e di Storage, per le foto). */
  function creaCoda(store, chiave) {
    chiave = chiave || "arctrail3d_campo_coda_v1";
    function leggi() {
      try { var v = JSON.parse(store.get(chiave) || "[]"); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    }
    function scrivi(v) { store.set(chiave, JSON.stringify(v)); }
    var inCorso = null;
    return {
      aggiungi: function (op) {
        if (!op || !op.id || !op.tipo) throw new Error("operazione senza id o tipo");
        var v = leggi();
        if (v.some(function (x) { return x.id === op.id; })) return false;
        v.push({ id: op.id, tipo: op.tipo, dati: op.dati, tentativi: 0, errore: null });
        scrivi(v);
        return true;
      },
      elenco: leggi,
      quante: function () { return leggi().length; },
      togli: function (id) { scrivi(leggi().filter(function (x) { return x.id !== id; })); },
      /* esegui(op) -> Promise. Una alla volta, in ordine: un percorso prima
         delle segnalazioni che lo citano. Se una fallisce si va avanti con le
         altre (la rete puo' tornare a meta'); la fallita resta in coda. */
      svuota: function (esegui) {
        if (inCorso) return inCorso;
        var self = this, v = leggi(), fatte = 0, fallite = 0;
        inCorso = v.reduce(function (p, op) {
          return p.then(function () {
            return Promise.resolve().then(function () { return esegui(op); }).then(function () {
              self.togli(op.id); fatte++;
            }, function (err) {
              fallite++;
              var w = leggi();
              w.forEach(function (x) {
                if (x.id === op.id) { x.tentativi++; x.errore = String(err && (err.code || err.message) || err).slice(0, 200); }
              });
              scrivi(w);
            });
          });
        }, Promise.resolve()).then(function () {
          inCorso = null; return { fatte: fatte, fallite: fallite, restano: leggi().length };
        });
        return inCorso;
      }
    };
  }

  /* ───────────── registratore (foreground) ─────────────
     Tiene la traccia in memoria E nel telefono a ogni punto accettato: se la
     pagina si ricarica o il telefono la uccide, la bozza si riprende. */
  function creaRegistratore(store, chiave) {
    chiave = chiave || "arctrail3d_campo_traccia_v1";
    var st = null;
    try { st = JSON.parse(store.get(chiave) || "null"); } catch (e) { st = null; }
    function salva() { if (st) store.set(chiave, JSON.stringify(st)); else store.remove(chiave); }
    return {
      stato: function () { return st ? st.fase : "fermo"; },
      dati: function () { return st; },
      avvia: function (o) {
        if (st) throw new Error("registrazione gia' in corso");
        st = { id: o.id, companyCode: o.companyCode, name: o.name || "", fase: "registra",
               punti: [], scartati: 0, ultimoMotivo: null, avviatoIl: o.ora };
        salva(); return st;
      },
      pausa: function () { if (st && st.fase === "registra") { st.fase = "pausa"; salva(); } },
      riprendi: function () { if (st && st.fase === "pausa") { st.fase = "registra"; salva(); } },
      fix: function (f) {
        if (!st || st.fase !== "registra") return { ok: false, motivo: "non-registra" };
        var u = st.punti[st.punti.length - 1] || null, v = valutaFix(u, f);
        if (v.ok) st.punti.push(punto(f)); else { st.scartati++; st.ultimoMotivo = v.motivo; }
        salva(); return v;
      },
      termina: function () { var d = st; st = null; salva(); return d; },
      annulla: function () { st = null; salva(); }
    };
  }

  /* ───────────── repository Firestore ─────────────
     L'UNICO punto che conosce Firestore e Storage. Percorsi:
       field_routes/{routeId}                 metadati
       field_routes/{routeId}/segments/{seq}  segmenti (id = seq a 4 cifre)
       field_issues/{issueId}                 segnalazione
       field_issues/{issueId}/history/{id}    storico degli stati
       field_maintainers/{code}/members/{uid} manutentori autorizzati
     Storage: field_issues/{companyCode}/{issueId}/{photoId}.jpg (path, mai URL). */
  function idSeg(seq) { return ("000" + seq).slice(-4); }
  function creaRepositoryFirestore(db, storage) {
    function rC(id) { return db.collection("field_routes").doc(id); }
    function iC(id) { return db.collection("field_issues").doc(id); }
    var repo = {
      /* Percorso + tutti i segmenti in un batch solo: o c'e' tutto o niente.
         Lo stesso id riscrive lo stesso documento: niente doppioni. */
      createRoute: function (meta, segmenti) {
        if (segmenti.length > 400) return Promise.reject(new Error("percorso troppo lungo per un batch"));
        var b = db.batch();
        b.set(rC(meta.id), meta);
        segmenti.forEach(function (s) { b.set(rC(meta.id).collection("segments").doc(idSeg(s.seq)), s); });
        return b.commit();
      },
      appendRouteSegment: function (routeId, s) {
        return rC(routeId).collection("segments").doc(idSeg(s.seq)).set(s);
      },
      publishRoute: function (routeId, uid, ora) {
        return rC(routeId).update({ status: "published", publishedBy: uid, publishedAt: ora, updatedAt: ora });
      },
      unpublishRoute: function (routeId, ora) {
        return rC(routeId).update({ status: "draft", updatedAt: ora });
      },
      deleteRoute: function (routeId) {
        return rC(routeId).collection("segments").get().then(function (snap) {
          var b = db.batch();
          snap.forEach(function (d) { b.delete(d.ref); });
          b.delete(rC(routeId));
          return b.commit();
        });
      },
      /* Due query, come `percorsi_campo`: Firestore rifiuta INTERA una query
         che puo' toccare documenti vietati. */
      listRoutes: function (code, gestore) {
        var q = [db.collection("field_routes").where("companyCode", "==", code).where("status", "==", "published").get()];
        if (gestore) q.push(db.collection("field_routes").where("companyCode", "==", code).where("status", "==", "draft").get());
        return Promise.all(q).then(function (snaps) {
          var out = [];
          snaps.forEach(function (s) { s.forEach(function (d) { out.push(d.data()); }); });
          return out;
        });
      },
      getRoutePoints: function (routeId) {
        return rC(routeId).collection("segments").orderBy("seq").get().then(function (snap) {
          var segs = []; snap.forEach(function (d) { segs.push(d.data()); });
          return ricomponi(segs);
        });
      },
      /* Foto PRIMA, documento DOPO: se la foto non sale, la segnalazione
         resta in coda intera. Se sale la foto e cade il documento, al giro
         dopo la foto si riscrive allo stesso path (stesso id). */
      createIssue: function (seg, foto) {
        var caricate = (foto || []).map(function (f) {
          var path = "field_issues/" + seg.companyCode + "/" + seg.id + "/" + f.id + ".jpg";
          var ref = storage.ref(path);
          return ref.putString(f.dataUrl, "data_url", {
            contentType: "image/jpeg", customMetadata: { ownerUid: seg.reporterUid }
          }).then(function () { return path; }, function (err) {
            // Le regole non lasciano sovrascrivere: se il file c'e' gia' ed e'
            // nostro, e' il giro di prima che era riuscito a meta'.
            return ref.getMetadata().then(function (m) {
              if (m && m.customMetadata && m.customMetadata.ownerUid === seg.reporterUid) return path;
              throw err;
            }, function () { throw err; });
          });
        });
        return Promise.all(caricate).then(function (paths) {
          var d = Object.assign({}, seg, { photoPaths: paths });
          var b = db.batch();
          b.set(iC(seg.id), d);
          b.set(iC(seg.id).collection("history").doc("0000-open"),
            { from: null, to: "open", by: seg.reporterUid, at: seg.createdAt });
          return b.commit();
        });
      },
      updateIssueStatus: function (seg, a, uid, ora) {
        var c = cambioStato(seg, a, uid, ora), b = db.batch();
        b.update(iC(seg.id), c.patch);
        b.set(iC(seg.id).collection("history").doc(ora + "-" + a), c.storia);
        return b.commit().then(function () { return c; });
      },
      deleteIssue: function (seg) {
        var foto = (seg.photoPaths || []).map(function (p) {
          return storage.ref(p).delete().catch(function (e) { if (!e || e.code !== "storage/object-not-found") throw e; });
        });
        return Promise.all(foto).then(function () {
          return iC(seg.id).collection("history").get();
        }).then(function (snap) {
          var b = db.batch();
          snap.forEach(function (d) { b.delete(d.ref); });
          b.delete(iC(seg.id));
          return b.commit();
        });
      },
      listIssues: function (code) {
        return db.collection("field_issues").where("companyCode", "==", code).limit(300).get().then(function (s) {
          var out = []; s.forEach(function (d) { out.push(d.data()); }); return out;
        });
      },
      issueHistory: function (id) {
        return iC(id).collection("history").orderBy("at").get().then(function (s) {
          var out = []; s.forEach(function (d) { out.push(d.data()); }); return out;
        });
      },
      photoUrl: function (path) { return storage.ref(path).getDownloadURL(); },
      isMaintainer: function (code, uid) {
        return db.collection("field_maintainers").doc(code).collection("members").doc(uid).get()
          .then(function (d) { return d.exists && d.data().active === true; }, function () { return false; });
      },
      listMaintainers: function (code) {
        return db.collection("field_maintainers").doc(code).collection("members").get().then(function (s) {
          var out = []; s.forEach(function (d) { out.push(Object.assign({ uid: d.id }, d.data())); }); return out;
        });
      },
      grantMaintainer: function (code, uid, nome, chi, ora) {
        return db.collection("field_maintainers").doc(code).collection("members").doc(uid)
          .set({ active: true, name: String(nome || "").slice(0, 120), grantedBy: chi, grantedAt: ora });
      },
      revokeMaintainer: function (code, uid) {
        return db.collection("field_maintainers").doc(code).collection("members").doc(uid).delete();
      }
    };
    /* Esecutore della coda offline: traduce le operazioni salvate nel telefono
       nelle chiamate del repository. */
    repo.eseguiOperazione = function (op) {
      if (op.tipo === "route") return repo.createRoute(op.dati.meta, op.dati.segmenti);
      if (op.tipo === "issue") return repo.createIssue(op.dati.seg, op.dati.foto);
      return Promise.reject(new Error("tipo sconosciuto " + op.tipo));
    };
    return repo;
  }

  function nuovoId(prefisso) {
    var r = "";
    for (var i = 0; i < 12; i++) r += B32.charAt(Math.floor(Math.random() * 32));
    return (prefisso || "") + Date.now().toString(36) + r;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION, PUNTI_PER_SEGMENTO: PUNTI_PER_SEGMENTO, SOGLIE: SOGLIE,
    CATEGORIE: CATEGORIE, STATI: STATI, STATI_IT: STATI_IT,
    coordValide: coordValide, geohash: geohash, distanza: distanza, direzione: direzione,
    cardinale: cardinale, lunghezza: lunghezza, bbox: bbox, centro: centro,
    valutaFix: valutaFix, punto: punto, segmenta: segmenta, ricomponi: ricomponi,
    metaPercorso: metaPercorso, toGeoJSON: toGeoJSON, toGPX: toGPX,
    transizioneValida: transizioneValida, categoriaValida: categoriaValida,
    nuovaSegnalazione: nuovaSegnalazione, cambioStato: cambioStato, piuVicina: piuVicina,
    permessi: permessi, creaCoda: creaCoda, creaRegistratore: creaRegistratore,
    creaRepositoryFirestore: creaRepositoryFirestore, nuovoId: nuovoId, idSeg: idSeg
  };
});
