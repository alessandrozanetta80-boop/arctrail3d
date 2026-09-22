/* banco-finestra.js — la finestra di deploy: nessuno resta fuori.
 *
 *   sh tests/lancia-finestra.sh
 *
 * PERCHE' ESISTE. (20/09/2026.) Una pubblicazione non e' un istante: e' una
 * finestra. Il sito, le Cloud Functions e le regole di Firestore si pubblicano
 * in tre momenti diversi, e in mezzo — per ore, e per i telefoni che non hanno
 * ancora aggiornato la cassa del service worker, per giorni — convivono due
 * versioni dell'app con una sola versione delle regole.
 *
 * Quindi le combinazioni da far funzionare sono QUATTRO, non una:
 *
 *     app di ieri  + regole di ieri   <- e' l'oggi, non si tocca
 *     app di ieri  + regole di oggi   <- chi non ha ancora aggiornato   (PARTE 1)
 *     app di oggi  + regole di ieri   <- chi aggiorna prima che le regole
 *                                        siano in console               (PARTE 2)
 *     app di oggi  + regole di oggi   <- il dopo                        (PARTE 3)
 *
 * COSA PROVA. Non i pulsanti: le SCRITTURE. Ogni caso qui sotto e' un
 * documento nella forma esatta in cui una delle due app lo manda — la forma
 * dell'app di ieri e' letta da `git show main:app.html`, quella di oggi da
 * `app.html`. Se una scrittura che l'app fa davvero viene rifiutata, qui si
 * vede; in produzione si vedrebbe come un messaggio che sparisce, una
 * segnalazione che non parte, o le push che smettono — tutti in silenzio,
 * perche' quelle catene finiscono in un `catch` muto.
 *
 * LE REGOLE DI IERI SI PRENDONO DA GIT, non da una copia: una copia invecchia
 * il giorno dopo ed e' la stessa trappola dei conti ricopiati nei diari.
 */
const { initializeTestEnvironment, assertFails, assertSucceeds } =
  require('@firebase/rules-unit-testing');
const fs = require('fs');
const { execSync } = require('child_process');

const PROGETTO = 'arctrail3d-prova';
const REGOLE_OGGI = process.env.REGOLE || 'firestore.rules';
// Le regole ONLINE. Fino al gate 1 erano quelle di `main`. Dal 22/09/2026
// `main` porta anche il firestore.rules nuovo, che NON e' pubblicato (solo
// il sito lo e'): le regole online restano quelle del 18/09, cioe' di
// `1cd0652` (il ritorno allo stato del 18/09). Quando le regole nuove vanno
// online (gate 2/3), questa riga torna `main`. L'app di ieri resta `main`.
// DUE COSE DISTINTE, dette per nome: le regole DEL RAMO (REGOLE_OGGI, il file
// qui accanto) e le regole LIVE (REGOLE_LIVE, un commit preciso). Il banco
// non deduce mai le regole live da `main`. `BASE` resta come vecchio nome.
const REGOLE_LIVE = process.env.REGOLE_LIVE || process.env.BASE || '1cd0652';
const BASE = REGOLE_LIVE;

const A  = { uid:'utenteA', email:'a@esempio.it', email_verified:true };
const B  = { uid:'utenteB', email:'b@esempio.it', email_verified:true };

let env, fatti = 0, guai = [];

async function prova(nome, fn){
  fatti++;
  try { await fn(); console.log('  ✓ ' + nome); }
  catch (e) { guai.push(nome + '  — ' + (e.message||e)); console.log('  ✗ ' + nome); }
}
function db(u){
  var uid = u.uid, token = {};
  for (var k in u) if (k !== 'uid') token[k] = u[k];
  return env.authenticatedContext(uid, token).firestore();
}
async function scena(fn){ await env.withSecurityRulesDisabled(async ctx => fn(ctx.firestore())); }

/* La scena di partenza, uguale per tutte e tre le parti: due iscritti attivi,
   una compagnia di cui A e' referente, una chat gia' nata. */
async function preparaScena(){
  await env.clearFirestore();
  await scena(async d => {
    for (const u of [A,B]) await d.doc('users/'+u.uid).set({ email:u.email, approved:true, premium:false });
    await d.doc('compagnie_admin/01VERB').set({ adminUid:A.uid, clubCode:'01VERB' });
    await d.doc('direct_chats/'+[A.uid,B.uid].sort().join('__')).set({ members:[A.uid,B.uid].sort() });
    // La chat di un allenamento vuole che l'allenamento esista (`otExists`,
    // regola del 28/08): senza, il no e' della scena, non della finestra.
    await d.doc('open_trainings/ot1').set({ ownerUid:A.uid, ownerName:'anna', spots:3,
      campo:'Cerrione', datetime:Date.now() });
  });
}
async function conRegole(sorgente){
  if (env) await env.cleanup();
  env = await initializeTestEnvironment({
    projectId: PROGETTO,
    firestore: { rules: sorgente, host:'127.0.0.1', port:8080 }
  });
  await preparaScena();
}

const CHAT = [A.uid,B.uid].sort().join('__');

/* ══ LE SCRITTURE DELL'APP DI IERI ════════════════════════════════════════
   Forme prese da `git show main:app.html`. Le righe citate sono quelle del
   file online (timbro 2026-09-18-campi-fiarc).
   NOTA SUI TESTI LUNGHI: l'app di ieri NON ha `maxlength` sulle caselle della
   chat, della nota di compagnia e della segnalazione. Quindi manda quello che
   la persona ha scritto, lungo quanto le pare: se le regole nuove hanno un
   tetto basso, il messaggio sparisce. Per questo qui i testi lunghi ci sono. */
function scrittureDiIeri(){
  return [
    ['registrazione: crea il proprio users/{uid}  (15074)', () =>
      db(B).doc('users/'+B.uid).set({ email:B.email, approved:true, createdAt:new Date(),
        nomeCognome:'Bruno Bianchi', username:'bruno', federazioni:[{code:'fiarc',tessera:'F1'}],
        arco:'ricurvo', privacy:true }, { merge:true })],
    ['registra il token push nel campo di prima  (16596)', () =>
      db(A).doc('users/'+A.uid).update({ fcmToken:'t'.repeat(180) })],
    ['allinea il profilo pubblico  (5886 publicProfileData)', () =>
      db(A).doc('public_profiles/'+A.uid).set({ username:'anna', nomeCognome:'Anna Rossi',
        compagnia:'01VERB', compagniaNome:'A.S.D. Arcieri del VCO & Valgrande', arco:'longbow',
        bio:'b'.repeat(160), numeri:{ giri:12, piazzole:288, campi:3 }, updatedAt:new Date() },
        { merge:true })],
    ['registra un errore  (5781 errContext + 5794 logError)', () =>
      db(A).collection('errors').add({ uid:A.uid, msg:'m'.repeat(300), stack:'s'.repeat(700),
        dove:'pista', screen:'round', build:'2026-09-18-campi-fiarc', lang:'it',
        ua:'u'.repeat(180), online:true, at:Date.now() })],
    ['apre una chat privata  (26112)', () =>
      db(A).doc('direct_chats/'+CHAT).set({ members:[A.uid,B.uid].sort(),
        memberNames:{ [A.uid]:'anna', [B.uid]:'bruno' }, lastText:'ciao',
        lastSenderUid:A.uid, lastAt:new Date() }, { merge:true })],
    ['manda un messaggio lungo, che la casella di ieri non taglia  (26133)', () =>
      db(A).collection('direct_chats/'+CHAT+'/messages').add({ senderUid:A.uid,
        senderName:'anna', text:'x'.repeat(3000), createdAt:new Date() })],
    /* LA FORMA E' QUELLA VERA, compresi i cinque campi che la regola
       dell'elenco legge direttamente. L'app di ieri li scrive gia' tutti e
       cinque — nascono insieme alla funzione — quindi la `create` nuova non
       la taglia fuori. Se il banco ne scrivesse meno proverebbe un documento
       che nessuna app ha mai mandato. */
    ['pubblica un allenamento aperto  (26674)', () =>
      db(A).collection('open_trainings').add({ ownerUid:A.uid, ownerName:'anna',
        spots:3, campo:'Cerrione', datetime:Date.now(), createdAt:new Date(),
        visibility:'all', clubCode:'01VERB', invitedUids:[], participantUids:[],
        participants:[], status:'active' })],
    ['scrive nella chat dell\'allenamento  (24373)', () =>
      db(A).collection('open_trainings/ot1/messages').add({ senderUid:A.uid,
        senderName:'anna', text:'arrivo alle 9', createdAt:new Date() })],
    ['manda una segnalazione lunga sul campo  (24185)', () =>
      db(A).collection('field_reports').add({ reporterUid:A.uid, reporterName:'anna',
        field:'Cerrione', clubCode:'01VERB', type:'sagoma', piazzola:12,
        description:'d'.repeat(6000), federation:'fiarc', country:'it',
        status:'open', createdAt:new Date() })],
    ['salva un percorso di Prepara gara  (18004)', () =>
      db(A).collection('percorsi').add({ createdBy:A.uid, createdByName:'anna',
        nome:'Fornasona', piazzole:24, createdAt:new Date() })],
    ['propone un percorso a una compagnia  (20013/20019)', () =>
      db(A).collection('percorsi_campo').add({ createdBy:A.uid, clubCode:'01VERB',
        stato:'proposto', nome:'n'.repeat(80), note:'o'.repeat(300), piazzole:24,
        createdAt:new Date() })],
    ['il referente salva la scheda della compagnia, note comprese', () =>
      db(A).doc('compagnie_admin/01VERB').update({ referente:'Anna Rossi',
        emailComp:'info@arcierivco.it', tel:'3473761506 (contattare via mail, ore 18-20)',
        sito:'www.arcierivco.it', indirizzo:'Via A. Alberti, Vignone (VB)',
        note:'z'.repeat(6000) })],
    ['chiede di gestire una compagnia  (16065)', () =>
      db(B).collection('compagnie_admin_requests').add({ richiedenteUid:B.uid,
        richiedenteEmail:B.email, richiedenteName:'Bruno Bianchi',
        clubCode:'01VERB', createdAt:new Date() })],
    ['salva la copia del giro aperto', () =>
      db(A).doc('users/'+A.uid+'/giro_aperto/corrente').set({ giro:'{}', piazzola:12, piazzole:24 })],
    ['salva il giro finito, SENZA roundId (l\'app di ieri non ce l\'ha)', () =>
      db(A).doc('users/'+A.uid+'/storico/20260918120000000').set({ date:new Date().toISOString(),
        deleted:false, sessionType:'3d', format:24, modeKey:'round3d', modeLabel:'Round 3D',
        scoringVersion:null, campo:'Cerrione', durata:180, results:[] })]
  ];
}

/* ══ LE SCRITTURE DELL'APP DI OGGI ═══════════════════════════════════════ */
function scrittureDiOggi(){
  return [
    ['registra il token push nel campo di prima (il ripiego)', () =>
      db(A).doc('users/'+A.uid).update({ fcmToken:'t'.repeat(180) })],
    ['salva il giro finito CON roundId e interrotto', () =>
      db(A).doc('users/'+A.uid+'/storico/20260920120000000').set({ date:new Date().toISOString(),
        deleted:false, sessionType:'3d', format:24, modeKey:'round3d', modeLabel:'Round 3D',
        scoringVersion:null, campo:'Cerrione', durata:180,
        roundId:'g' + 'a'.repeat(40), interrotto:true, results:[] })],
    ['salva la copia del giro aperto con rev e deviceId', () =>
      db(A).doc('users/'+A.uid+'/giro_aperto/corrente').set({ giro:'{}', roundId:'g'+'a'.repeat(40),
        rev:3, deviceId:'d'+'b'.repeat(24), stato:'aperto', piazzola:12, piazzole:24 })],
    ['allinea il profilo pubblico', () =>
      db(A).doc('public_profiles/'+A.uid).set({ username:'anna', nomeCognome:'Anna Rossi',
        compagnia:'01VERB', compagniaNome:'A.S.D. Arcieri del VCO & Valgrande', arco:'longbow',
        bio:'b'.repeat(160), numeri:{ giri:12, piazzole:288, campi:3 }, updatedAt:new Date() },
        { merge:true })],
    ['manda un messaggio nel limite della casella di oggi (2000)', () =>
      db(A).collection('direct_chats/'+CHAT+'/messages').add({ senderUid:A.uid,
        senderName:'anna', text:'x'.repeat(2000), createdAt:new Date() })]
  ];
}

(async () => {
  if (!fs.existsSync(REGOLE_OGGI)) { console.log('\n  manca ' + REGOLE_OGGI + '\n'); process.exit(1); }
  const oggi = fs.readFileSync(REGOLE_OGGI, 'utf8');
  let ieri;
  try {
    ieri = execSync('git show ' + BASE + ':firestore.rules', { encoding:'utf8', maxBuffer: 20*1024*1024 });
  } catch (e) {
    console.log('\n  ✗ non riesco a leggere le regole di ' + BASE + ' da git: ' + (e.message||e));
    console.log('    (in CI serve la storia intera: actions/checkout con fetch-depth: 0)\n');
    process.exit(1);
  }
  console.log('\n  regole del ramo: ' + REGOLE_OGGI + '   ·   regole live: ' + REGOLE_LIVE + ':firestore.rules');
  if (ieri.replace(/\r\n/g, '\n') === oggi.replace(/\r\n/g, '\n')) {
    console.log('  ✗ le regole live e quelle del ramo sono IDENTICHE: REGOLE_LIVE non punta alle regole pubblicate' +
                ' (o il ramo non cambia le regole, e allora questo banco non ha niente da confrontare)\n');
    process.exit(1);
  }

  /* ── PARTE 1 ──────────────────────────────────────────────────────────
     L'app che sta nei telefoni, contro le regole che stiamo per pubblicare.
     TUTTE devono passare: qui un no non e' una difesa, e' un guasto che
     arriva addosso a chi non ha fatto niente. */
  console.log('\n  APP DI IERI  +  REGOLE DI OGGI   (chi non ha ancora aggiornato)\n');
  await conRegole(oggi);
  for (const [nome, fn] of scrittureDiIeri()) {
    await prova(nome, () => assertSucceeds(fn()));
  }

  /* ── QUELLO CHE L'APP DI IERI PERDE, DETTO PRIMA ────────────────────────
     (20/09/2026, SEC-09.) `compagnie_admin` conteneva insieme due cose: chi
     gestisce una compagnia (serve a tutti) e i dati del referente — nome,
     telefono, indirizzo, note private (non servono a nessun altro). Le regole
     non sanno nascondere un campo, quindi il documento si chiude al suo
     referente e i due dati pubblici passano da `compagnie_contatto`.
     L'APP DI IERI NON SA CHE ESISTE. Durante la finestra, chi non ha ancora
     aggiornato, aprendo la pagina di una compagnia gestita, vedra' «chiedi di
     gestire» invece di «gestita da»; e una segnalazione di campo non trovera'
     l'email del club. Non si perde niente e non si rompe niente: si perde una
     riga di informazione, per qualche ora.
     LA SCELTA E' DICHIARATA, e la si e' fatta in questo verso perche'
     l'alternativa — lasciare la scheda leggibile finche' tutti aggiornano —
     vuol dire lasciare il telefono di casa di una persona leggibile da
     chiunque abbia un account, per un tempo che non decide nessuno. */
  await prova("la scheda del referente NON si legge piu' dall'app di ieri (previsto)", () =>
    assertFails(db(B).doc('compagnie_admin/01VERB').get()));
  /* E L'ELENCO DEGLI ALLENAMENTI SI SPEGNE, ED E' LA PERDITA PIU' VISIBILE.
     (20/09/2026.) L'app di ieri chiede `status == "active"` e basta. Firestore
     autorizza una query solo se la regola e' implicata dai FILTRI: quel filtro
     non dice niente sulla visibilita', quindi la query viene rifiutata intera
     e l'elenco resta vuoto finche' il telefono non aggiorna.
     Si e' scelto questo, e non e' una sfumatura: l'alternativa era lasciare che
     un annuncio «solo per i soci» lo leggesse chiunque finche' l'ultimo
     telefono non aggiorna — cioe' non chiuderlo. La compatibilita' di FORMATO
     si mantiene sempre (i documenti vecchi si leggono tutti); quella di
     SICUREZZA non esiste.
     CONSEGUENZA PRATICA SULL'ORDINE: conviene pubblicare il SITO per primo e
     le regole dopo, cosi' la maggior parte dei telefoni ha gia' l'app nuova
     quando l'elenco comincia a filtrare. */
  await prova("l'elenco allenamenti dell'app di ieri si spegne (previsto)", () =>
    assertFails(db(B).collection('open_trainings').where('status','==','active').limit(50).get()));
  await prova("mentre le tre domande senza claim dell'app di oggi passano", async () => {
    const col = db(B).collection('open_trainings');
    await assertSucceeds(col.where('visibility','==','all').limit(50).get());
    await assertSucceeds(col.where('invitedUids','array-contains',B.uid).limit(50).get());
    await assertSucceeds(col.where('ownerUid','==',B.uid).limit(50).get());
  });
  await prova('ma il suo referente la legge ancora', () =>
    assertSucceeds(db(A).doc('compagnie_admin/01VERB').get()));

  /* ── PARTE 2 ──────────────────────────────────────────────────────────
     L'app nuova contro le regole ancora vecchie: succede a chiunque apra
     l'app fra la pubblicazione del sito e quella delle regole. */
  console.log('\n  APP DI OGGI  +  REGOLE DI IERI   (sito pubblicato, regole non ancora)\n');
  await conRegole(ieri);
  for (const [nome, fn] of scrittureDiOggi()) {
    await prova(nome, () => assertSucceeds(fn()));
  }
  /* IL DOCUMENTO DEL DISPOSITIVO NON PASSA, ED E' PREVISTO: la raccolta
     `devices` esiste solo nelle regole nuove. Il punto e' che l'app NON deve
     dipenderne — `scriviTokenPush` manda le due scritture in parallelo e si
     accontenta di una, e il server (`pushNotifica` 2026-09-20) legge sia i
     dispositivi sia il vecchio `fcmToken`. Quindi le push arrivano lo stesso.
     Si dichiara qui, invece di scoprirlo in produzione. */
  await prova('il documento del dispositivo NON passa (previsto: regole di ieri)', () =>
    assertFails(db(A).doc('users/'+A.uid+'/devices/d1').set({ token:'t', platform:'android', enabled:true })));

  /* ── PARTE 3 ─────────────────────────────────────────────────────────── */
  console.log('\n  APP DI OGGI  +  REGOLE DI OGGI   (il dopo)\n');
  await conRegole(oggi);
  for (const [nome, fn] of scrittureDiOggi()) {
    await prova(nome, () => assertSucceeds(fn()));
  }
  await prova('e adesso passa anche il documento del dispositivo', () =>
    assertSucceeds(db(A).doc('users/'+A.uid+'/devices/d1').set({ token:'t'.repeat(180),
      platform:'android', language:'it', enabled:true, createdAt:new Date(), updatedAt:new Date() })));

  await env.cleanup();
  console.log('\n  ' + (fatti - guai.length) + '/' + fatti + ' passate.');
  if (guai.length) { guai.forEach(g => console.log('    · ' + g)); process.exit(1); }
  console.log('  Nessuna delle due app resta fuori durante la finestra.\n');
})().catch(e => { console.error(e); process.exit(1); });
