/* banco-campo-regole.js — MAPPA CAMPO: regole Firestore e Storage provate
 * sugli emulatori. (02/10/2026.)
 *
 *   sh tests/lancia-campo-regole.sh
 *
 * Porte proprie (Firestore 8086, Storage 9198, da `tests/campo-firebase.json`):
 * puo' girare nel giro completo accanto a `lancia-regole.sh` (8080) senza
 * pestargli i piedi.
 *
 * Come `banco-regole.js`: non si provano i pulsanti, si prova cosa succede a
 * chi scrive diritto sul database con un client modificato.
 */
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROGETTO = 'demo-arctrail3d-campo';
const U  = { uid: 'utente',  email: 'u@esempio.it',  email_verified: true };
const NV = { uid: 'nonver',  email: 'nv@esempio.it', email_verified: false };
const M  = { uid: 'manut',   email: 'm@esempio.it',  email_verified: true };
const CA = { uid: 'refer',   email: 'r@esempio.it',  email_verified: true };
const AD = { uid: 'admin',   email: 'alessandro.zanetta80@gmail.com', email_verified: true };
const AUTO = { uid: 'autodichiarato', email: 'x@esempio.it', email_verified: true };
const CODE = '01VERB';

let env, fatti = 0, guai = [];
async function prova(nome, fn) {
  fatti++;
  try { await fn(); console.log('  ✓ ' + nome); }
  catch (e) { guai.push(nome + '  — ' + (e.message || e)); console.log('  ✗ ' + nome); }
}
function ctx(u) { const t = {}; for (const k in u) if (k !== 'uid') t[k] = u[k]; return env.authenticatedContext(u.uid, t); }
function db(u) { return ctx(u).firestore(); }
function st(u) { return ctx(u).storage(); }
async function scena(fn) { await env.withSecurityRulesDisabled(async c => fn(c.firestore(), c.storage())); }

function rotta(id, extra) {
  return Object.assign({ id, companyCode: CODE, name: 'Percorso rosso', schemaVersion: 1, status: 'draft',
    createdBy: M.uid, createdAt: 1, updatedAt: 1, lengthM: 100, pointCount: 2, segmentCount: 1 }, extra || {});
}
function segm() { return { seq: 0, schemaVersion: 1, points: [{ lat: 45, lon: 8, t: 1, acc: 4, gh: 'u0jd' }], count: 1 }; }
function segn(id, uid, extra) {
  return Object.assign({ id, companyCode: CODE, category: 'pianta', note: 'abete', lat: 45.1, lon: 8.1, acc: 6,
    gh: 'u0j', status: 'open', reporterUid: uid, statusBy: uid, statusAt: 1, createdAt: 1, updatedAt: 1,
    photoPaths: [], routeId: null, schemaVersion: 1 }, extra || {});
}
async function creaRotta(u, id, extra) {
  const d = db(u), b = d.batch();
  b.set(d.doc('field_routes/' + id), rotta(id, Object.assign({ createdBy: u.uid }, extra || {})));
  b.set(d.doc('field_routes/' + id + '/segments/0000'), segm());
  return b.commit();
}
async function creaSegn(u, id, extra) {
  const d = db(u), b = d.batch();
  b.set(d.doc('field_issues/' + id), segn(id, u.uid, extra));
  b.set(d.doc('field_issues/' + id + '/history/0000-open'), { from: null, to: 'open', by: u.uid, at: 1 });
  return b.commit();
}
async function cambia(u, id, a, ora) {
  const d = db(u), b = d.batch();
  b.update(d.doc('field_issues/' + id), { status: a, statusBy: u.uid, statusAt: ora, updatedAt: ora });
  b.set(d.doc('field_issues/' + id + '/history/' + ora + '-' + a), { from: 'open', to: a, by: u.uid, at: ora });
  return b.commit();
}
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

(async () => {
  env = await initializeTestEnvironment({
    projectId: PROGETTO,
    firestore: { rules: fs.readFileSync(process.env.REGOLE || 'firestore.rules', 'utf8'), host: '127.0.0.1', port: 8086 },
    storage: { rules: fs.readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9198 }
  });
  await env.clearFirestore();
  await env.clearStorage();
  await scena(async d => {
    for (const u of [U, M, CA, AD, AUTO]) await d.doc('users/' + u.uid).set({ approved: true });
    // `users.compagnia` autodichiarata: NON deve dare la gestione.
    await d.doc('users/' + AUTO.uid).set({ approved: true, compagnia: CODE, clubCode: CODE });
    await d.doc('compagnie_admin/' + CODE).set({ adminUid: CA.uid });
  });

  console.log('\n  MANUTENTORI\n');
  await prova('il referente autorizza un manutentore', () =>
    assertSucceeds(db(CA).doc(`field_maintainers/${CODE}/members/${M.uid}`).set({ active: true, name: 'Mario', grantedBy: CA.uid, grantedAt: 1 })));
  await prova('un utente qualunque non si autorizza da solo', () =>
    assertFails(db(U).doc(`field_maintainers/${CODE}/members/${U.uid}`).set({ active: true, name: 'io', grantedBy: U.uid, grantedAt: 1 })));
  await prova('un manutentore non nomina altri manutentori', () =>
    assertFails(db(M).doc(`field_maintainers/${CODE}/members/${U.uid}`).set({ active: true, name: 'amico', grantedBy: M.uid, grantedAt: 1 })));
  await prova('il manutentore legge la propria scheda', () =>
    assertSucceeds(db(M).doc(`field_maintainers/${CODE}/members/${M.uid}`).get()));
  await prova('un altro utente non legge le schede dei manutentori', () =>
    assertFails(db(U).doc(`field_maintainers/${CODE}/members/${M.uid}`).get()));

  console.log('\n  PERCORSI\n');
  await prova('manutentore crea percorso bozza + segmento in un batch', () => assertSucceeds(creaRotta(M, 'r1')));
  await prova('utente normale non crea percorsi', () => assertFails(creaRotta(U, 'r2')));
  await prova('users.compagnia autodichiarata non basta per creare', () => assertFails(creaRotta(AUTO, 'r3')));
  await prova('non si nasce «published»', () => assertFails(creaRotta(M, 'r4', { status: 'published' })));
  await prova('bozza NON leggibile da un utente normale', () => assertFails(db(U).doc('field_routes/r1').get()));
  await prova('segmenti della bozza NON leggibili da un utente normale', () => assertFails(db(U).collection('field_routes/r1/segments').get()));
  await prova('la query dei pubblicati funziona per l\'utente normale', () =>
    assertSucceeds(db(U).collection('field_routes').where('companyCode', '==', CODE).where('status', '==', 'published').get()));
  await prova('la query delle bozze e\' rifiutata all\'utente normale', () =>
    assertFails(db(U).collection('field_routes').where('companyCode', '==', CODE).where('status', '==', 'draft').get()));
  await prova('utente normale non pubblica', () => assertFails(db(U).doc('field_routes/r1').update({ status: 'published' })));
  await prova('manutentore pubblica', () => assertSucceeds(db(M).doc('field_routes/r1').update({ status: 'published', publishedBy: M.uid, publishedAt: 2, updatedAt: 2 })));
  await prova('percorso pubblicato leggibile dall\'utente normale', () => assertSucceeds(db(U).doc('field_routes/r1').get()));
  await prova('segmenti del pubblicato leggibili', () => assertSucceeds(db(U).collection('field_routes/r1/segments').orderBy('seq').get()));
  await prova('nessuno sposta un percorso sotto un\'altra compagnia', () => assertFails(db(M).doc('field_routes/r1').update({ companyCode: '02ALTR' })));
  await prova('utente normale non scrive segmenti', () => assertFails(db(U).doc('field_routes/r1/segments/0001').set(segm())));
  await prova('segmento oltre 500 punti rifiutato', () => {
    const s = segm(); s.points = Array.from({ length: 501 }, (_, i) => ({ lat: 45, lon: 8, t: i }));
    return assertFails(db(M).doc('field_routes/r1/segments/0009').set(s));
  });

  console.log('\n  SEGNALAZIONI\n');
  await prova('utente verificato crea una segnalazione (aperta, con storia)', () => assertSucceeds(creaSegn(U, 'i1')));
  await prova('utente non verificato non segnala', () => assertFails(creaSegn(NV, 'i2')));
  await prova('non si segnala a nome di un altro', () => assertFails(db(U).doc('field_issues/i3').set(segn('i3', M.uid))));
  await prova('non si nasce «risolta»', () => assertFails(creaSegn(U, 'i4', { status: 'resolved' })));
  await prova('categoria inventata rifiutata', () => assertFails(creaSegn(U, 'i5', { category: 'ufo' })));
  await prova('coordinate fuori scala rifiutate', () => assertFails(creaSegn(U, 'i6', { lat: 95 })));
  await prova('segnalazioni leggibili dagli utenti', () => assertSucceeds(db(AUTO).collection('field_issues').where('companyCode', '==', CODE).get()));
  await prova('chi segnala NON cambia lo stato', () => assertFails(cambia(U, 'i1', 'resolved', 5)));
  await prova('chi segnala NON scrive la storia da solo', () =>
    assertFails(db(U).doc('field_issues/i1/history/9-resolved').set({ from: 'open', to: 'resolved', by: U.uid, at: 9 })));
  await prova('users.compagnia autodichiarata non gestisce', () => assertFails(cambia(AUTO, 'i1', 'in_progress', 6)));
  await prova('manutentore prende in carico (stato + storia)', () => assertSucceeds(cambia(M, 'i1', 'in_progress', 7)));
  await prova('storia con stato diverso da quello scritto: rifiutata', () => {
    const d = db(M), b = d.batch();
    b.update(d.doc('field_issues/i1'), { status: 'resolved', statusBy: M.uid, statusAt: 8, updatedAt: 8 });
    b.set(d.doc('field_issues/i1/history/8-x'), { from: 'in_progress', to: 'open', by: M.uid, at: 8 });
    return assertFails(b.commit());
  });
  await prova('storia a nome di un altro: rifiutata', () =>
    assertFails(db(M).doc('field_issues/i1/history/9-y').set({ from: 'x', to: 'in_progress', by: CA.uid, at: 9 })));
  await prova('la storia non si riscrive', () =>
    assertFails(db(M).doc('field_issues/i1/history/0000-open').set({ from: null, to: 'open', by: M.uid, at: 0 })));
  await prova('il gestore non cambia chi ha segnalato né dove', () =>
    assertFails(db(M).doc('field_issues/i1').update({ reporterUid: M.uid, statusBy: M.uid })));
  await prova('utente normale non cancella', () => assertFails(db(U).doc('field_issues/i1').delete()));

  console.log('\n  REVOCA, REFERENTE, ADMIN\n');
  await prova('il referente revoca il manutentore', () => assertSucceeds(db(CA).doc(`field_maintainers/${CODE}/members/${M.uid}`).delete()));
  await prova('dopo la revoca il manutentore non gestisce piu\'', () => assertFails(cambia(M, 'i1', 'resolved', 10)));
  await prova('dopo la revoca non legge piu\' le bozze', async () => {
    await scena(d => d.doc('field_routes/r9').set(rotta('r9')));
    await assertFails(db(M).doc('field_routes/r9').get());
  });
  await prova('manutentore disattivato (active:false) non gestisce', async () => {
    await scena(d => d.doc(`field_maintainers/${CODE}/members/${M.uid}`).set({ active: false, grantedBy: CA.uid }));
    await assertFails(cambia(M, 'i1', 'resolved', 11));
  });
  await prova('il referente della compagnia risolve', () => assertSucceeds(cambia(CA, 'i1', 'resolved', 12)));
  await prova('il referente di un\'altra compagnia no', async () => {
    await scena(d => d.doc('compagnie_admin/02ALTR').set({ adminUid: U.uid }));
    await assertFails(cambia(U, 'i1', 'open', 13));
  });
  await prova('l\'admin globale gestisce', () => assertSucceeds(cambia(AD, 'i1', 'open', 14)));
  await prova('l\'admin globale legge le bozze', () => assertSucceeds(db(AD).doc('field_routes/r9').get()));
  await prova('il referente cancella la segnalazione e la sua storia', async () => {
    const d = db(CA), snap = await d.collection('field_issues/i1/history').get(), b = d.batch();
    snap.forEach(x => b.delete(x.ref)); b.delete(d.doc('field_issues/i1'));
    await assertSucceeds(b.commit());
  });
  await prova('il referente cancella percorso e segmenti', async () => {
    const d = db(CA), b = d.batch();
    b.delete(d.doc('field_routes/r1/segments/0000')); b.delete(d.doc('field_routes/r1'));
    await assertSucceeds(b.commit());
  });

  console.log('\n  STORAGE (foto delle segnalazioni)\n');
  const P = `field_issues/${CODE}/i7/f1.jpg`;
  const metaU = { contentType: 'image/jpeg', customMetadata: { ownerUid: U.uid } };
  await prova('utente verificato carica una foto a proprio nome', () => assertSucceeds(st(U).ref(P).put(JPG, metaU)));
  await prova('non verificato non carica', () => assertFails(st(NV).ref(`field_issues/${CODE}/i8/f.jpg`).put(JPG, { contentType: 'image/jpeg', customMetadata: { ownerUid: NV.uid } })));
  await prova('solo immagini: un PDF e\' rifiutato', () =>
    assertFails(st(U).ref(`field_issues/${CODE}/i7/f2.pdf`).put(JPG, { contentType: 'application/pdf', customMetadata: { ownerUid: U.uid } })));
  await prova('oltre 5 MB rifiutata', () =>
    assertFails(st(U).ref(`field_issues/${CODE}/i7/f3.jpg`).put(new Uint8Array(5 * 1024 * 1024 + 1), metaU)));
  await prova('non si carica a nome di un altro', () =>
    assertFails(st(AUTO).ref(`field_issues/${CODE}/i7/f4.jpg`).put(JPG, metaU)));
  await prova('nessuno sovrascrive una foto esistente (nemmeno altri)', () =>
    assertFails(st(AUTO).ref(P).put(JPG, { contentType: 'image/jpeg', customMetadata: { ownerUid: AUTO.uid } })));
  await prova('le foto si leggono con un account', () => assertSucceeds(st(AUTO).ref(P).getMetadata()));
  await prova('un utente qualunque non cancella la foto altrui', () => assertFails(st(AUTO).ref(P).delete()));
  await prova('il referente della compagnia cancella la foto', () => assertSucceeds(st(CA).ref(P).delete()));
  await prova('chi l\'ha caricata la cancella', async () => {
    const q = `field_issues/${CODE}/i9/f.jpg`;
    await assertSucceeds(st(U).ref(q).put(JPG, metaU));
    await assertSucceeds(st(U).ref(q).delete());
  });
  await prova('un manutentore attivo cancella; revocato no', async () => {
    const q = `field_issues/${CODE}/i10/f.jpg`;
    await assertSucceeds(st(U).ref(q).put(JPG, metaU));
    await assertFails(st(M).ref(q).delete());
    await scena(d => d.doc(`field_maintainers/${CODE}/members/${M.uid}`).set({ active: true, grantedBy: CA.uid }));
    await assertSucceeds(st(M).ref(q).delete());
  });
  await prova('le foto del mercatino restano com\'erano (proprietario)', () =>
    assertSucceeds(st(U).ref(`market/${U.uid}/a.jpg`).put(JPG, { contentType: 'image/jpeg' })));

  await env.cleanup();
  if (guai.length) { console.log('\n  Cadute:'); guai.forEach(g => console.log('   - ' + g)); }
  console.log('\n  ' + (fatti - guai.length) + '/' + fatti + ' passate.');
  process.exit(guai.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
