/* banco-regole.js — le regole Firestore, provate invece che sperate.
 *
 * NON GIRA CON GLI ALTRI BANCHI, e non e' una dimenticanza: vuole
 * l'emulatore Firestore, cioe' Java e un download da Google. Sta fuori da
 * `controlla-tutto.sh` perche' un banco che non parte in meta' degli ambienti
 * insegna a ignorare le uscite rosse.
 *
 * COME SI LANCIA (una volta sola, la prima):
 *     npm install --no-audit --no-fund @firebase/rules-unit-testing firebase-tools
 *
 * POI, ogni volta:
 *     npx firebase emulators:exec --only firestore "node banco-regole.js"
 *
 * Serve un `firebase.json` accanto, con dentro almeno:
 *     { "firestore": { "rules": "firestore.rules" },
 *       "emulators": { "firestore": { "port": 8080 } } }
 *
 * COSA PROVA, e perche' proprio questo: ogni caso qui sotto e' un gesto che
 * un client Firebase modificato puo' TENTARE. Non si provano i pulsanti — i
 * pulsanti li prova il telefono — si prova cosa succede a chi il pulsante non
 * lo preme e scrive diritto sul database.
 */
const { initializeTestEnvironment, assertFails, assertSucceeds } =
  require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROGETTO = 'arctrail3d-prova';
const REGOLE = 'firestore.rules';

/* Chi sono le persone di questa storia.
   `email_verified` e' un pezzo del token, non del documento utente: e' il
   punto di tutta la prima sezione. */
const A  = { uid:'utenteA', email:'a@esempio.it', email_verified:true  };
const B  = { uid:'utenteB', email:'b@esempio.it', email_verified:true  };
const C  = { uid:'utenteC', email:'c@esempio.it', email_verified:true  };
const NV = { uid:'utenteNV',email:'nv@esempio.it',email_verified:false };
const AD = { uid:'admin',   email:'alessandro.zanetta80@gmail.com', email_verified:true };

let env, fatti = 0, guai = [];

async function prova(nome, fn){
  fatti++;
  try { await fn(); console.log('  \u2713 ' + nome); }
  catch (e) { guai.push(nome + '  \u2014 ' + (e.message||e)); console.log('  \u2717 ' + nome); }
}
/* L'UID NON VA DENTRO IL TOKEN. (28/08/2026, primo giro vero.)
   Qui c'era `env.authenticatedContext(u.uid, u)`: il secondo argomento sono
   le PRETESE del token, e passargli l'oggetto intero ci infilava dentro anche
   `uid`. `createMockUserToken` lo rifiuta — vuole `sub`, e `sub` glielo mette
   gia' `authenticatedContext` dal primo argomento.
   Tutte e 68 le prove sono cadute qui, prima di interrogare Firestore: non
   hanno detto niente sulle regole, hanno detto che questo file non era mai
   stato eseguito. */
function db(u){
  var uid = u.uid, token = {};
  for (var k in u) if (k !== 'uid') token[k] = u[k];
  return env.authenticatedContext(uid, token).firestore();
}

/* Lo stato di partenza si scrive SENZA regole: preparare la scena passando
   dalle regole significa provare due cose insieme e non sapere quale ha
   ceduto. */
async function scena(fn){ await env.withSecurityRulesDisabled(async ctx => fn(ctx.firestore())); }

(async () => {
  if (!fs.existsSync(REGOLE)) { console.log('\n  manca ' + REGOLE + '\n'); process.exit(1); }
  env = await initializeTestEnvironment({
    projectId: PROGETTO,
    firestore: { rules: fs.readFileSync(REGOLE, 'utf8'), host:'127.0.0.1', port:8080 }
  });
  await env.clearFirestore();

  /* ── gli utenti esistono e sono attivi ─────────────────────────────── */
  /* NV NON STA QUI DENTRO, e non e' una dimenticanza. (28/08/2026, primo
     giro vero.) Prima c'era anche lui, e la prova «completa la registrazione»
     diventava un UPDATE su un documento che esisteva gia' con
     `betaTester:true`: cioe' un utente che si abbassa il flag da solo, che la
     regola rifiuta — giustamente. La prova diceva no per il motivo sbagliato,
     e il motivo sbagliato somigliava moltissimo a quello giusto.
     Chi si registra il documento non ce l'ha: se glielo diamo noi, la prova
     non prova piu' la registrazione. */
  await scena(async d => {
    for (const u of [A,B,C,AD])
      await d.doc('users/'+u.uid).set({ approved:true, betaTester:true, premium:false });
  });

  console.log('\n  ACCOUNT NON VERIFICATO\n');

  /* I CAMPI SONO QUELLI VERI, letti da `app.html` riga 15074: email,
     approved, createdAt, e i dati del profilo. `betaTester` e `premium` NON
     ci sono — l'app non li scrive mai, li accende solo l'admin. Un banco che
     scrive campi che l'app non scrive prova una registrazione che non esiste. */
  await prova('completa la registrazione: crea il proprio users/{uid}', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid).set(
      { email:NV.email, approved:true, createdAt:new Date(),
        nomeCognome:'Nuovo Iscritto', username:'nuovo', privacy:true, terms:true })));

  /* Questa l'ha trovata il giro di stanotte, per sbaglio: la prova sopra
     falliva perche' abbassava `betaTester`, e cosi' si e' visto che la
     regola regge anche nel verso opposto. Vale la pena chiederglielo
     apposta invece di scoprirlo di nuovo per caso. */
  await prova('NON puo\' regalarsi betaTester', () =>
    assertFails(db(NV).doc('users/'+NV.uid).update({ betaTester:true })));

  await prova('NON puo\' regalarsi premium', () =>
    assertFails(db(NV).doc('users/'+NV.uid).update({ premium:true })));

  await prova('NON puo\' nascere gia\' collaudatore', () =>
    assertFails(db(C).doc('users/utenteNuovo2').set(
      { email:'x@esempio.it', approved:true, betaTester:true })));

  await prova('legge il proprio documento utente', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid).get()));

  await prova('scrive nel proprio storico', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid+'/storico/g1').set({ tot: 210 })));

  await prova('tiene il giro in corso', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid+'/giro_aperto/corrente').set({ piazzola: 7 })));

  await prova('registra un errore', () =>
    assertSucceeds(db(NV).collection('errors').add(
      { uid:NV.uid, msg:'crash', at:Date.now() })));

  await prova('NON si pubblica nell\'elenco arcieri', () =>
    assertFails(db(NV).doc('public_profiles/'+NV.uid).set(
      { username:'nuovo', compagnia:'01VERB' })));

  await prova('NON apre un allenamento aperto', () =>
    assertFails(db(NV).collection('open_trainings').add(
      { ownerUid:NV.uid, date:'2026-09-01', field:'Vignone' })));

  await prova('NON apre una chat privata', () =>
    assertFails(db(NV).doc('direct_chats/utenteNV__utenteA').set(
      { members:[NV.uid, A.uid] })));

  await prova('NON segnala un percorso', () =>
    assertFails(db(NV).collection('field_reports').add(
      { reporterUid:NV.uid, clubCode:'01VERB', testo:'ramo caduto' })));

  await prova('NON chiede di gestire una compagnia', () =>
    assertFails(db(NV).collection('compagnie_admin_requests').add(
      { uid:NV.uid, codice:'01VERB' })));

  await prova('NON pubblica un annuncio', () =>
    assertFails(db(NV).collection('market_listings').add(
      { sellerUid:NV.uid, title:'Arco', price:100 })));

  console.log('\n  UTENTE VERIFICATO: l\'app funziona come prima\n');

  await prova('si pubblica nell\'elenco arcieri', () =>
    assertSucceeds(db(A).doc('public_profiles/'+A.uid).set(
      { username:'anna', compagnia:'01VERB' })));

  await prova('apre un allenamento', () =>
    assertSucceeds(db(A).doc('open_trainings/ot1').set(
      { ownerUid:A.uid, date:'2026-09-01', field:'Vignone',
        participantUids:[A.uid], participants:[{uid:A.uid,name:'Anna'}] })));

  await prova('apre una chat privata', () =>
    assertSucceeds(db(A).doc('direct_chats/utenteA__utenteB').set(
      { members:[A.uid, B.uid] })));

  await prova('pubblica un annuncio', () =>
    assertSucceeds(db(A).doc('market_listings/an1').set(
      { sellerUid:A.uid, title:'Arco', price:100 })));

  console.log('\n  ALLENAMENTO APERTO: A organizza, B si iscrive\n');

  await scena(async d => d.doc('open_trainings/ot1').set(
    { ownerUid:A.uid, date:'2026-09-01', field:'Vignone', titolo:'Domenica',
      participantUids:[A.uid], participants:[{uid:A.uid,name:'Anna'}] }));

  await prova('B iscrive SE STESSO', () =>
    assertSucceeds(db(B).doc('open_trainings/ot1').update(
      { participantUids:[A.uid,B.uid],
        participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'}],
        updatedAt: Date.now() })));

  await prova('B toglie SE STESSO', () =>
    assertSucceeds(db(B).doc('open_trainings/ot1').update(
      { participantUids:[A.uid], participants:[{uid:A.uid,name:'Anna'}],
        updatedAt: Date.now() })));

  await scena(async d => d.doc('open_trainings/ot1').update(
    { participantUids:[A.uid,B.uid,C.uid],
      participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'},{uid:C.uid,name:'Carla'}] }));

  await prova('B NON puo\' togliere C', () =>
    assertFails(db(B).doc('open_trainings/ot1').update(
      { participantUids:[A.uid,B.uid],
        participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'}],
        updatedAt: Date.now() })));

  await prova('B NON puo\' aggiungere un quarto', () =>
    assertFails(db(B).doc('open_trainings/ot1').update(
      { participantUids:[A.uid,B.uid,C.uid,'estraneo'],
        participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'},
                      {uid:C.uid,name:'Carla'},{uid:'estraneo',name:'X'}],
        updatedAt: Date.now() })));

  await prova('B NON puo\' svuotare gli elenchi', () =>
    assertFails(db(B).doc('open_trainings/ot1').update(
      { participantUids:[], participants:[], updatedAt: Date.now() })));

  await prova('B NON puo\' cambiare titolo, data, luogo', () =>
    assertFails(db(B).doc('open_trainings/ot1').update({ titolo:'Rubato', field:'Altrove' })));

  await prova('B NON puo\' prendersi l\'allenamento', () =>
    assertFails(db(B).doc('open_trainings/ot1').update({ ownerUid:B.uid })));

  await prova('A, che l\'ha aperto, cambia quello che vuole', () =>
    assertSucceeds(db(A).doc('open_trainings/ot1').update({ titolo:'Domenica mattina' })));

  /* IL LIMITE DICHIARATO, provato di proposito: qui la regola dice SI' e non
     dovrebbe. Sta scritto in fondo a firestore.rules, punto 1. Se un giorno
     `participants` diventa una mappa, questo caso deve girarsi in assertFails
     — ed e' il modo per accorgersene. */
  await prova('LIMITE NOTO: B riesce a cambiare il nome di C (mappe in un elenco)', () =>
    assertSucceeds(db(B).doc('open_trainings/ot1').update(
      { participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'},
                      {uid:C.uid,name:'Nome cambiato'}], updatedAt: Date.now() })));

  console.log('\n  SESSIONE CONDIVISA: A segna, B controfirma\n');

  await scena(async d => d.doc('sessions/s1').set(
    { ownerUid:A.uid, ownerName:'Anna', federation:'fiarc', mode:'round3d',
      doubleConfirm:true, v:2, shots:{}, confirms:{}, status:'active',
      participantUids:[A.uid,B.uid],
      participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'}],
      createdAt: new Date() }));

  await prova('A segna un tiro', () =>
    assertSucceeds(db(A).doc('sessions/s1').update(
      { 'shots.k1_x': { archerId:'1', total:11 }, updatedAt: new Date() })));

  await prova('B controfirma quel tiro', () =>
    assertSucceeds(db(B).doc('sessions/s1').update(
      { 'confirms.k1_x': { by:B.uid, at:Date.now() }, updatedAt: new Date() })));

  await prova('B NON puo\' scrivere un tiro', () =>
    assertFails(db(B).doc('sessions/s1').update(
      { 'shots.k2_y': { archerId:'2', total:11 }, updatedAt: new Date() })));

  await prova('B NON puo\' cambiare il regolamento del giro', () =>
    assertFails(db(B).doc('sessions/s1').update({ federation:'fitarco', mode:'fitarco3d' })));

  await prova('B NON puo\' spegnere la doppia conferma', () =>
    assertFails(db(B).doc('sessions/s1').update({ doubleConfirm:false })));

  await prova('B NON puo\' diventare owner', () =>
    assertFails(db(B).doc('sessions/s1').update({ ownerUid:B.uid })));

  await prova('B NON puo\' aggiungere C', () =>
    assertFails(db(B).doc('sessions/s1').update(
      { participantUids:[A.uid,B.uid,C.uid] })));

  await prova('B NON puo\' chiudere un giro appena aperto', () =>
    assertFails(db(B).doc('sessions/s1').update({ status:'closed', updatedAt:new Date() })));

  await prova('C estraneo NON legge la sessione', () =>
    assertFails(db(C).doc('sessions/s1').get()));

  await prova('C estraneo NON scrive nella sessione', () =>
    assertFails(db(C).doc('sessions/s1').update({ updatedAt:new Date() })));

  await prova('A chiude il proprio giro', () =>
    assertSucceeds(db(A).doc('sessions/s1').update({ status:'closed', updatedAt:new Date() })));

  /* La pulizia degli otto ore: la fa chi NON ha aperto la sessione, ma solo
     su un giro vecchio. Nove ore fa. */
  await scena(async d => d.doc('sessions/s2').set(
    { ownerUid:A.uid, v:2, shots:{}, confirms:{}, status:'active',
      participantUids:[A.uid,B.uid], participants:[],
      createdAt: new Date(Date.now() - 9*60*60*1000) }));

  await prova('B chiude un giro abbandonato da nove ore', () =>
    assertSucceeds(db(B).doc('sessions/s2').update({ status:'closed', updatedAt:new Date() })));

  console.log('\n  MERCATINO: A manda un messaggio a B\n');

  await scena(async d => {
    await d.doc('market_conversations/c1').set(
      { participants:[A.uid,B.uid], adId:'an1', adTitle:'Arco', adPrice:100 });
    await d.doc('market_conversations/c1/messages/m1').set(
      { type:'offer', amount:80, senderUid:A.uid, senderName:'Anna',
        status:'pending', createdAt:new Date() });
    await d.doc('market_conversations/c1/messages/m2').set(
      { type:'text', text:'ciao', senderUid:A.uid, createdAt:new Date() });
  });

  await prova('B legge il messaggio', () =>
    assertSucceeds(db(B).doc('market_conversations/c1/messages/m1').get()));

  await prova('B risponde all\'offerta (accetta)', () =>
    assertSucceeds(db(B).doc('market_conversations/c1/messages/m1').update({ status:'accepted' })));

  await prova('B NON puo\' cambiare il testo del messaggio di A', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/m2').update({ text:'truffa' })));

  await prova('B NON puo\' cambiare senderUid', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/m1').update({ senderUid:B.uid })));

  await prova('B NON puo\' cambiare la data', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/m1').update({ createdAt:new Date(0) })));

  await prova('B NON puo\' cambiare l\'importo dell\'offerta', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/m1').update({ amount:1 })));

  await prova('A NON puo\' modificare il proprio messaggio dopo l\'invio', () =>
    assertFails(db(A).doc('market_conversations/c1/messages/m2').update({ text:'corretto' })));

  await prova('A NON puo\' accettare la propria offerta', () =>
    assertFails(db(A).doc('market_conversations/c1/messages/m1').update({ status:'accepted' })));

  await prova('C NON legge i messaggi della trattativa', () =>
    assertFails(db(C).doc('market_conversations/c1/messages/m1').get()));

  await prova('C NON modifica i messaggi della trattativa', () =>
    assertFails(db(C).doc('market_conversations/c1/messages/m1').update({ status:'rejected' })));

  /* ── A UN'OFFERTA SI RISPONDE UNA VOLTA SOLA ───────────────────────────
     Lo stato di partenza NON e' inventato: `inviaOfferta()` e `inviaContro()`
     in `marketplace.html` creano il messaggio con `status:"pending"`, e i tre
     tasti compaiono con `m.status === "pending" && !isMe`.
     `countered` non riapre niente: chi rilancia marca `countered` il messaggio
     ricevuto e ne crea uno NUOVO `pending`. E' quello nuovo a ricevere la
     risposta — quindi da `countered` non parte nessuna transizione, e le due
     prove qui sotto devono fallire. */
  async function offerta(id, stato){
    await scena(async d => d.doc('market_conversations/c1/messages/'+id).set(
      { type:'offer', amount:80, senderUid:A.uid, senderName:'Anna',
        status:stato, createdAt:new Date() }));
  }

  console.log('\n  UN\'OFFERTA SI RISPONDE UNA VOLTA SOLA\n');

  await offerta('o1','pending');
  await prova('pending \u2192 accepted', () =>
    assertSucceeds(db(B).doc('market_conversations/c1/messages/o1').update({ status:'accepted' })));

  await offerta('o2','pending');
  await prova('pending \u2192 rejected', () =>
    assertSucceeds(db(B).doc('market_conversations/c1/messages/o2').update({ status:'rejected' })));

  await offerta('o3','pending');
  await prova('pending \u2192 countered', () =>
    assertSucceeds(db(B).doc('market_conversations/c1/messages/o3').update({ status:'countered' })));

  await offerta('o4','accepted');
  await prova('accepted \u2192 rejected: NO', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/o4').update({ status:'rejected' })));

  await offerta('o5','rejected');
  await prova('rejected \u2192 accepted: NO', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/o5').update({ status:'accepted' })));

  await offerta('o6','countered');
  await prova('countered \u2192 accepted: NO', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/o6').update({ status:'accepted' })));

  await offerta('o7','countered');
  await prova('countered \u2192 rejected: NO', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/o7').update({ status:'rejected' })));

  /* Il rilancio vero, come lo fa l'app: si marca `countered` quella ricevuta
     e se ne crea una nuova `pending`. Deve continuare a funzionare, altrimenti
     la stretta di sopra ha spento il rilancio invece di proteggerlo. */
  await offerta('o8','pending');
  await prova('il rilancio dell\'app: countered sulla vecchia, e una nuova pending', async () => {
    await assertSucceeds(db(B).doc('market_conversations/c1/messages/o8').update({ status:'countered' }));
    await assertSucceeds(db(B).collection('market_conversations/c1/messages').add(
      { type:'offer', amount:70, senderUid:B.uid, senderName:'Bruno',
        status:'pending', createdAt:new Date() }));
  });

  await offerta('o9','pending');
  await prova('nemmeno un valore inventato passa da pending', () =>
    assertFails(db(B).doc('market_conversations/c1/messages/o9').update({ status:'venduto' })));

  await prova('e A non puo\' riportare a pending la propria offerta risolta', () =>
    assertFails(db(A).doc('market_conversations/c1/messages/o4').update({ status:'pending' })));

  await prova('B NON puo\' cambiare i partecipanti alla trattativa', () =>
    assertFails(db(B).doc('market_conversations/c1').update({ participants:[B.uid,C.uid] })));

  console.log('\n  QUELLO CHE LA REVISIONE HA TROVATO ACCANTO\n');

  await scena(async d => d.doc('market_listings/an1').set(
    { sellerUid:A.uid, title:'Arco', price:100 }));

  await prova('A NON puo\' intestare il proprio annuncio a B', () =>
    assertFails(db(A).doc('market_listings/an1').update({ sellerUid:B.uid })));

  await scena(async d => {
    await d.doc('compagnie_admin/01VERB').set({ adminUid:A.uid });
    await d.doc('percorsi_campo/p1').set(
      { createdBy:B.uid, clubCode:'01VERB', stato:'confermato', nome:'Percorso alto' });
  });

  await prova('il referente corregge il percorso del proprio campo', () =>
    assertSucceeds(db(A).doc('percorsi_campo/p1').update({ nome:'Percorso alto, 24 piazzole' })));

  await prova('il referente NON puo\' spostarlo sotto un\'altra compagnia', () =>
    assertFails(db(A).doc('percorsi_campo/p1').update({ clubCode:'02ALTRA' })));

  await prova('il referente NON puo\' cambiare chi l\'ha proposto', () =>
    assertFails(db(A).doc('percorsi_campo/p1').update({ createdBy:A.uid })));

  await prova('C NON puo\' confermare un percorso che non e\' suo', () =>
    assertFails(db(C).doc('percorsi_campo/p1').update({ stato:'confermato' })));

  console.log('\n  PORTE CHE ORA CHIEDONO L\'EMAIL CONFERMATA (28/08, seconda passata)\n');

  /* sessions create: da signedIn() a verified().
     Il client reale (createSharedSession) nasce con owner + TUTTI gli invitati
     dentro participantUids: la prova positiva ha percio' piu' di un
     partecipante, altrimenti proverebbe una sessione che l'app non crea. */
  await prova('A verificato apre una sessione condivisa (owner + invitati)', () =>
    assertSucceeds(db(A).doc('sessions/s3').set(
      { ownerUid:A.uid, ownerName:'Anna', v:2, shots:{}, confirms:{}, status:'active',
        participantUids:[A.uid, B.uid],
        participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'}],
        createdAt:new Date() })));

  await prova('NV non verificato NON apre una sessione condivisa', () =>
    assertFails(db(NV).doc('sessions/sNV').set(
      { ownerUid:NV.uid, v:2, shots:{}, confirms:{}, status:'active',
        participantUids:[NV.uid], participants:[{uid:NV.uid,name:'NV'}],
        createdAt:new Date() })));

  /* LIMITE NOTO, riclassificato HIGH->MEDIO: un verificato PUO' nominare altri
     alla creazione (invito arbitrario/banner). Non e' un takeover — i tiri e
     il regolamento restano protetti dall'update. Se un giorno l'invito
     richiedera' consenso, questo caso si gira in assertFails. */
  await prova('LIMITE NOTO: A verificato iscrive altri alla creazione (invito arbitrario)', () =>
    assertSucceeds(db(A).doc('sessions/s3b').set(
      { ownerUid:A.uid, ownerName:'Anna', v:2, shots:{}, confirms:{}, status:'active',
        participantUids:[A.uid, B.uid, C.uid],
        participants:[{uid:A.uid,name:'Anna'},{uid:B.uid,name:'Bruno'},{uid:C.uid,name:'Carla'}],
        createdAt:new Date() })));

  /* percorsi_campo create: il ramo 'proposto' ora chiede verified().
     Il ramo admin/clubAdmin che crea 'confermato' NON e' toccato: le due prove
     in fondo lo confermano. compagnie_admin/01VERB.adminUid == A e' gia' in
     scena qui sopra, quindi A e' referente di 01VERB. */
  await prova('A verificato propone un percorso (proposto)', () =>
    assertSucceeds(db(A).doc('percorsi_campo/p2').set(
      { createdBy:A.uid, clubCode:'01VERB', stato:'proposto', nome:'Percorso basso' })));

  await prova('NV non verificato NON propone un percorso', () =>
    assertFails(db(NV).doc('percorsi_campo/pNV').set(
      { createdBy:NV.uid, clubCode:'01VERB', stato:'proposto', nome:'Percorso NV' })));

  await prova('il referente (clubAdmin) crea ancora un percorso confermato', () =>
    assertSucceeds(db(A).doc('percorsi_campo/p3').set(
      { createdBy:A.uid, clubCode:'01VERB', stato:'confermato', nome:'Percorso ufficiale' })));

  await prova('B verificato ma non referente NON crea un confermato', () =>
    assertFails(db(B).doc('percorsi_campo/pB').set(
      { createdBy:B.uid, clubCode:'01VERB', stato:'confermato', nome:'Furbata' })));

  /* sendNotification e' una CALLABLE, non una regola: il gate email_verified
     aggiunto in index.js NON e' provabile da qui — questo banco esercita solo
     le regole Firestore, e firebase.json non ha l'emulatore delle funzioni.
     Lo si prova con l'emulatore functions piu' un chiamante non verificato,
     che questo progetto non ha ancora. Dichiarato per non farlo credere
     coperto. */
  console.log('    (nota: il gate email_verified di sendNotification e\' una Cloud Function, non provabile in questo banco)');

  console.log('\n  LE PORTE CHE DEVONO RESTARE APERTE\n');

  await prova('chi non ha confermato l\'email si cancella dall\'elenco', () =>
    assertSucceeds(db(NV).doc('public_profiles/'+NV.uid).delete()));

  await prova('chi non ha confermato l\'email porta via il proprio storico', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid+'/storico/g1').delete()));

  await prova('chi non ha confermato l\'email cancella il proprio account', () =>
    assertSucceeds(db(NV).doc('users/'+NV.uid).delete()));

  await prova('il create delle notifiche resta chiuso a tutti', () =>
    assertFails(db(A).doc('notifications/'+B.uid+'/items/n1').set({ title:'finta' })));

  await prova('rate_limits resta chiuso anche in lettura', () =>
    assertFails(db(A).doc('rate_limits/'+A.uid).get()));

  await prova('la coda della posta non si legge', () =>
    assertFails(db(A).doc('mail/m1').get()));

  await env.cleanup();
  console.log('\n  ' + (fatti - guai.length) + '/' + fatti + ' passate.');
  if (guai.length) { guai.forEach(g => console.log('    \u00b7 ' + g)); process.exit(1); }
  console.log('  Le regole dicono di no dove devono.\n');
})().catch(e => { console.error(e); process.exit(1); });
