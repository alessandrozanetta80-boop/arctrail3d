/* banco-campo-geo.js — la parte di MAPPA CAMPO che non disegna. (02/10/2026.)
 *
 *   node tests/banco-campo-geo.js
 *
 * Geohash e coordinate, filtro dei fix, segmenti, lunghezza, GeoJSON/GPX,
 * coda offline (rete che cade a meta', niente doppioni), registratore che
 * sopravvive a una ricarica, stati delle segnalazioni, permessi della UI, e
 * il repository Firestore su un Firestore finto (cosa scrive, in che ordine).
 */
var G = require("../campo-geo.js");
var ok = 0, ko = 0;
function prova(nome, cond, info) {
  if (cond) { ok++; console.log("  ✓ " + nome); }
  else { ko++; console.log("  ✗ " + nome + (info !== undefined ? "  → " + JSON.stringify(info) : "")); }
}
function memoria() {
  var m = {};
  return { get: function (k) { return k in m ? m[k] : null; }, set: function (k, v) { m[k] = String(v); }, remove: function (k) { delete m[k]; }, _m: m };
}

(async function () {
  /* ── coordinate ── */
  prova("geohash noto (57.64911, 10.40744 → u4pruydqqvj)", G.geohash(57.64911, 10.40744, 11) === "u4pruydqqvj", G.geohash(57.64911, 10.40744, 11));
  prova("geohash noto (42.6, -5.6 → ezs42)", G.geohash(42.6, -5.6, 5) === "ezs42", G.geohash(42.6, -5.6, 5));
  var rotto = false; try { G.geohash(91, 0); } catch (e) { rotto = true; }
  prova("geohash rifiuta lat 91", rotto);
  prova("coordValide: NaN e stringhe no", !G.coordValide(NaN, 1) && !G.coordValide("45", 8) && G.coordValide(-90, 180));
  var d = G.distanza({ lat: 45, lon: 8 }, { lat: 45.001, lon: 8 });
  prova("distanza 0.001° di latitudine ≈ 111 m", Math.abs(d - 111.2) < 0.5, d);
  prova("direzione verso nord = 0°, verso est ≈ 90°",
    Math.round(G.direzione({ lat: 45, lon: 8 }, { lat: 45.01, lon: 8 })) === 0 &&
    Math.abs(G.direzione({ lat: 45, lon: 8 }, { lat: 45, lon: 8.01 }) - 90) < 0.1);
  prova("cardinale 350° = N, 135° = SE, 225° = SO", G.cardinale(350) === "N" && G.cardinale(135) === "SE" && G.cardinale(225) === "SO");

  /* ── filtro fix ── */
  var a = { lat: 45, lon: 8, t: 0, acc: 5 };
  prova("primo fix buono accettato", G.valutaFix(null, a).ok);
  prova("fix con accuratezza 80 m scartato", G.valutaFix(null, { lat: 45, lon: 8, t: 0, acc: 80 }).motivo === "accuratezza");
  prova("fermo sul posto dopo 2 s scartato", G.valutaFix(a, { lat: 45.00001, lon: 8, t: 2000, acc: 5 }).motivo === "fermo");
  prova("10 m dopo 3 s accettato", G.valutaFix(a, { lat: 45.00009, lon: 8, t: 3000, acc: 5 }).ok);
  prova("fix fuori ordine scartato", G.valutaFix({ lat: 45, lon: 8, t: 5000 }, { lat: 45.001, lon: 8, t: 1000, acc: 5 }).motivo === "ordine");

  /* ── segmenti ── */
  var punti = [];
  for (var i = 0; i < 451; i++) punti.push(G.punto({ lat: 45 + i * 0.0001, lon: 8, t: i * 5000, acc: 4 }));
  var segs = G.segmenta(punti, 200);
  prova("451 punti → 3 segmenti da ≤200 (sovrapposti di 1)", segs.length === 3 && segs.every(function (s) { return s.count <= 200; }), segs.map(function (s) { return s.count; }));
  prova("segmenti numerati 0,1,2 e versionati", segs.map(function (s) { return s.seq; }).join() === "0,1,2" && segs[0].schemaVersion === 1);
  var r = G.ricomponi(segs.slice().reverse());
  prova("ricomponi: stessi 451 punti, stesso ordine", r.length === 451 && r[0].t === 0 && r[450].t === 450 * 5000);
  var L = G.lunghezza(punti);
  prova("lunghezza ≈ 450 × 11.12 m", Math.abs(L - 5003.8) < 5, L);
  var Lseg = segs.reduce(function (t, s) { return t + s.lengthM; }, 0);
  prova("somma delle lunghezze dei segmenti = lunghezza totale", Math.abs(Lseg - L) < 1, [Lseg, L]);
  prova("ogni punto ha lat, lon, t, acc, geohash", punti.every(function (p) { return p.gh && p.gh.length === 9 && typeof p.acc === "number" && typeof p.t === "number"; }));
  prova("un percorso di 0 punti fa 0 segmenti", G.segmenta([]).length === 0);
  var meta = G.metaPercorso({ id: "r1", companyCode: "01VERB", name: "Percorso rosso", uid: "u1", createdAt: 1, punti: punti });
  prova("metadati: id, compagnia, nome, schema, draft, creatore, date, bbox, centro, lunghezza, conteggi",
    meta.id === "r1" && meta.companyCode === "01VERB" && meta.schemaVersion === 1 && meta.status === "draft" &&
    meta.createdBy === "u1" && meta.createdAt === 1 && meta.bbox && meta.center && meta.lengthM === Math.round(L) &&
    meta.pointCount === 451 && meta.segmentCount === 3, meta);
  prova("metadati serializzabili (JSON andata e ritorno identico)", JSON.stringify(JSON.parse(JSON.stringify(meta))) === JSON.stringify(meta));

  /* ── export ── */
  var gj = G.toGeoJSON(meta, punti, [{ id: "i1", lat: 45.01, lon: 8.001, category: "pianta", status: "open" }]);
  prova("GeoJSON: LineString [lon,lat] + Point", gj.type === "FeatureCollection" && gj.features[0].geometry.type === "LineString" &&
    gj.features[0].geometry.coordinates[0][0] === 8 && gj.features[0].geometry.coordinates[0][1] === 45 &&
    gj.features[1].geometry.type === "Point");
  var gpx = G.toGPX({ name: "A<b>&c" }, punti.slice(0, 2));
  prova("GPX 1.1 con trkpt e nome con escape", /<gpx version="1.1"/.test(gpx) && (gpx.match(/<trkpt /g) || []).length === 2 && /A&lt;b&gt;&amp;c/.test(gpx));

  /* ── segnalazioni ── */
  var s = G.nuovaSegnalazione({ id: "i1", companyCode: "01VERB", category: "pianta", note: "abete sul sentiero", lat: 45.1, lon: 8.1, acc: 7.6, uid: "u2", createdAt: 10 });
  prova("segnalazione nuova: aperta, geohash, accuratezza, data", s.status === "open" && s.gh.length === 9 && s.acc === 8 && s.createdAt === 10 && s.reporterUid === "u2");
  rotto = false; try { G.nuovaSegnalazione({ category: "pianta" }); } catch (e) { rotto = true; }
  prova("segnalazione senza posizione rifiutata", rotto);
  rotto = false; try { G.nuovaSegnalazione({ category: "ufo", lat: 45, lon: 8 }); } catch (e) { rotto = true; }
  prova("categoria inventata rifiutata", rotto);
  prova("7 categorie minime", ["pianta", "sentiero", "bersaglio", "piazzola", "segnaletica", "sicurezza", "altro"].every(G.categoriaValida));
  prova("transizioni: open→in_progress→resolved→open sì", G.transizioneValida("open", "in_progress") && G.transizioneValida("in_progress", "resolved") && G.transizioneValida("resolved", "open"));
  prova("transizioni: open→open e resolved→in_progress no", !G.transizioneValida("open", "open") && !G.transizioneValida("resolved", "in_progress"));
  var c = G.cambioStato(s, "in_progress", "m1", 20);
  prova("cambio stato: chi e quando nella storia", c.storia.from === "open" && c.storia.to === "in_progress" && c.storia.by === "m1" && c.storia.at === 20 && c.patch.statusBy === "m1");
  prova("piazzola vicina solo se ha coordinate vere",
    G.piuVicina({ lat: 45, lon: 8 }, [{ n: 1 }, { n: 2, lat: 45.0002, lon: 8 }]).piazzola.n === 2 &&
    G.piuVicina({ lat: 45, lon: 8 }, [{ n: 1 }]) === null &&
    G.piuVicina({ lat: 45, lon: 8 }, [{ n: 3, lat: 45.01, lon: 8 }]) === null);

  /* ── permessi UI ── */
  var pU = G.permessi({ signedIn: true, verified: true });
  var pM = G.permessi({ signedIn: true, verified: true, isMaintainer: true });
  var pC = G.permessi({ signedIn: true, verified: true, isClubAdmin: true });
  var pNV = G.permessi({ signedIn: true, verified: false, isMaintainer: true });
  prova("utente verificato: segnala, non registra né gestisce", pU.segnala && !pU.registra && !pU.gestisce && !pU.pubblica);
  prova("manutentore: registra e gestisce, non autorizza altri", pM.registra && pM.gestisce && !pM.autorizzaManutentori);
  prova("admin compagnia: autorizza manutentori", pC.autorizzaManutentori && pC.gestisce);
  prova("non verificato: niente segnalazione né gestione", !pNV.segnala && !pNV.gestisce);
  prova("solo users.compagnia non basta (nessun flag → nessuna gestione)", !G.permessi({ signedIn: true, verified: true, compagnia: "01VERB" }).gestisce);

  /* ── coda offline ── */
  var st = memoria(), q = G.creaCoda(st);
  prova("coda: aggiunge una volta, rifiuta lo stesso id", q.aggiungi({ id: "i1", tipo: "issue", dati: {} }) && !q.aggiungi({ id: "i1", tipo: "issue", dati: {} }) && q.quante() === 1);
  q.aggiungi({ id: "r1", tipo: "route", dati: {} });
  var rete = false, scritti = {};
  function esegui(op) { if (!rete) return Promise.reject({ code: "unavailable" }); scritti[op.id] = (scritti[op.id] || 0) + 1; return Promise.resolve(); }
  var e1 = await q.svuota(esegui);
  prova("senza rete: niente esce dalla coda, errore annotato", e1.restano === 2 && q.elenco()[0].tentativi === 1 && q.elenco()[0].errore === "unavailable", e1);
  var q2 = G.creaCoda(st);
  prova("la coda sopravvive a una ricarica (nuova istanza, stesso telefono)", q2.quante() === 2);
  rete = true;
  var e2 = await q2.svuota(esegui);
  prova("rete tornata: tutto scritto, coda vuota", e2.fatte === 2 && q2.quante() === 0, e2);
  await q2.svuota(esegui);
  prova("nessun doppione dopo un secondo svuota", scritti.i1 === 1 && scritti.r1 === 1, scritti);
  var q3 = G.creaCoda(memoria()), n = 0;
  q3.aggiungi({ id: "a", tipo: "issue" }); q3.aggiungi({ id: "b", tipo: "issue" });
  var e3 = await q3.svuota(function (op) { n++; return op.id === "a" ? Promise.reject(new Error("storage/retry-limit-exceeded")) : Promise.resolve(); });
  prova("una fallita non blocca le altre e resta in coda", n === 2 && q3.quante() === 1 && q3.elenco()[0].id === "a", e3);
  var p1 = q3.svuota(function () { return Promise.resolve(); }), p2 = q3.svuota(function () { return Promise.resolve(); });
  prova("due svuota contemporanei: una sola corsa", p1 === p2);
  await p1;

  /* ── registratore ── */
  var mem = memoria(), reg = G.creaRegistratore(mem);
  reg.avvia({ id: "r9", companyCode: "01VERB", name: "giro", ora: 0 });
  reg.fix({ lat: 45, lon: 8, t: 0, acc: 5 });
  reg.fix({ lat: 45.0002, lon: 8, t: 4000, acc: 5 });
  reg.pausa();
  prova("in pausa i fix non contano", reg.fix({ lat: 45.0004, lon: 8, t: 8000, acc: 5 }).motivo === "non-registra" && reg.dati().punti.length === 2);
  var reg2 = G.creaRegistratore(mem);
  prova("ricarica a meta': la bozza si riprende (in pausa, 2 punti)", reg2.stato() === "pausa" && reg2.dati().punti.length === 2);
  reg2.riprendi();
  prova("fix scadente contato come scartato", !reg2.fix({ lat: 45.0006, lon: 8, t: 9000, acc: 90 }).ok && reg2.dati().scartati === 1 && reg2.dati().ultimoMotivo === "accuratezza");
  reg2.annulla();
  prova("annulla: nessuna traccia resta nel telefono", G.creaRegistratore(mem).stato() === "fermo" && Object.keys(mem._m).length === 0);

  /* ── repository su Firestore finto ── */
  var log = [];
  function docRef(path) {
    return {
      path: path,
      collection: function (c) { return colRef(path + "/" + c); },
      set: function (d) { log.push(["set", path]); return Promise.resolve(); },
      update: function (d) { log.push(["update", path, d]); return Promise.resolve(); },
      delete: function () { log.push(["delete", path]); return Promise.resolve(); }
    };
  }
  function colRef(path) { return { doc: function (id) { return docRef(path + "/" + id); } }; }
  var dbF = {
    collection: function (c) { return colRef(c); },
    batch: function () {
      var ops = [];
      return {
        set: function (r) { ops.push(["set", r.path]); }, update: function (r, d) { ops.push(["update", r.path, d]); },
        delete: function (r) { ops.push(["delete", r.path]); },
        commit: function () { log.push(["batch", ops]); return Promise.resolve(); }
      };
    }
  };
  var caricati = [];
  var stF = { ref: function (p) { return { putString: function (u, f, m) { caricati.push([p, m.customMetadata.ownerUid]); log.push(["foto", p]); return Promise.resolve(); } }; } };
  var repo = G.creaRepositoryFirestore(dbF, stF);
  await repo.createRoute(meta, segs);
  var b = log[log.length - 1];
  prova("createRoute: un batch solo con percorso + 3 segmenti (id 0000..0002)",
    b[0] === "batch" && b[1].length === 4 && b[1][0][1] === "field_routes/r1" && b[1][3][1] === "field_routes/r1/segments/0002", b);
  log = [];
  await repo.createIssue(Object.assign({}, s, { photoPaths: [] }), [{ id: "f1", dataUrl: "data:image/jpeg;base64,AA==" }]);
  prova("createIssue: prima la foto, poi il batch (doc + storia)",
    log[0][0] === "foto" && log[0][1] === "field_issues/01VERB/i1/f1.jpg" && log[1][0] === "batch" &&
    log[1][1][0][1] === "field_issues/i1" && log[1][1][1][1] === "field_issues/i1/history/0000-open", log);
  prova("foto: proprietario nei metadati, path e non URL", caricati[0][1] === "u2");
  log = [];
  await repo.updateIssueStatus(s, "resolved", "m1", 99);
  prova("updateIssueStatus: stato + storia nello stesso batch", log[0][0] === "batch" && log[0][1][0][2].status === "resolved" && log[0][1][1][1] === "field_issues/i1/history/99-resolved", log);
  rotto = false; try { await repo.updateIssueStatus(s, "open", "m1", 1); } catch (e) { rotto = true; }
  prova("updateIssueStatus rifiuta un passaggio non ammesso prima di scrivere", rotto);
  log = [];
  var fall = false;
  var stRotto = { ref: function () { return { putString: function () { return Promise.reject({ code: "storage/unauthorized" }); },
    getMetadata: function () { return Promise.reject({ code: "storage/object-not-found" }); } }; } };
  try { await G.creaRepositoryFirestore(dbF, stRotto).createIssue(s, [{ id: "f", dataUrl: "x" }]); } catch (e) { fall = true; }
  prova("foto rifiutata: nessun documento scritto (non si dichiara sincronizzato)", fall && log.length === 0, log);

  console.log("\n  " + ok + " passate, " + ko + " fallite.\n");
  process.exit(ko ? 1 : 0);
})().catch(function (e) { console.log("  ✗ il banco si e' fermato: " + (e && e.stack || e)); process.exit(1); });
