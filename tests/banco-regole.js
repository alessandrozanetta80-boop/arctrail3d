/* banco-regole.js — le regole Firestore, provate invece che sperate.
 *
 * DAL 19/09/2026 GIRA CON GLI ALTRI BANCHI, tramite `tests/lancia-regole.sh`.
 * Prima stava fuori da `controlla-tutto.sh` perche' vuole l'emulatore
 * Firestore (Java e un download da Google), e il risultato era che le regole
 * erano l'unica cosa che nessun giro provava. Se l'emulatore non parte, il
 * lanciatore dice NO e dice perche'.
 *
 * DIPENDENZE: sono in package.json (devDependencies, versioni fisse):
 * `@firebase/rules-unit-testing` 5.0.2, `firebase` 12.19.0, `firebase-tools`
 * 13.35.1 (l'ultima che accetta Java 17). Basta `npm install`.
 *
 * COME SI LANCIA DA SOLO:
 *     sh tests/lancia-regole.sh
 *     REGOLE=altre.rules sh tests/lancia-regole.sh   # sabotaggio
 *
 * Si lancia dalla radice del repository, dove sta `firebase.json`, con dentro almeno:
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
// REGOLE=percorso permette il sabotaggio: stesso banco, regole di un'altra versione.
const REGOLE = process.env.REGOLE || 'firestore.rules';

/* Chi sono le persone di questa storia.
   `email_verified` e' un pezzo del token, non del documento utente: e' il
   punto di tutta la prima sezione. */
const A  = { uid:'utenteA', email:'a@esempio.it', email_verified:true  };
const B  = { uid:'utenteB', email:'b@esempio.it', email_verified:true  };
const C  = { uid:'utenteC', email:'c@esempio.it', email_verified:true  };
const NV = { uid:'utenteNV',email:'nv@esempio.it',email_verified:false };
const AD = { uid:'admin',   email:'alessandro.zanetta80@gmail.com', email_verified:true };

/* LA FORMA VERA DI UN ALLENAMENTO, come la scrive `app.html`. (20/09/2026.)
   Dal 20/09 la `create` pretende i cinque campi che la regola dell'ELENCO
   legge senza rete di protezione: se a un documento ne manca uno, quella
   regola va in errore e l'elenco si spegne per tutti. I banchi creavano
   allenamenti scarni — piu' comodi da scrivere, e diversi da quelli veri —
   quindi non avrebbero mai visto il problema. Qui si parte dalla forma vera e
   si cambia solo quello che la prova vuole cambiare. */
function allenamento(extra){
  const d = { ownerUid:'utenteA', ownerName:'Anna', field:'Cerrione', spots:3,
              visibility:'all', clubCode:'01VERB', invitedUids:[], participantUids:[],
              participants:[], status:'active', datetime:Date.now() };
  Object.keys(extra || {}).forEach(k => { d[k] = extra[k]; });
  return d;
}

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
    assertSucceeds(db(A).doc('open_trainings/ot1').set(allenamento(
      { ownerUid:A.uid, participantUids:[A.uid], participants:[{uid:A.uid,name:'Anna'}] }))));

  await prova('apre una chat privata', () =>
    assertSucceeds(db(A).doc('direct_chats/utenteA__utenteB').set(
      { members:[A.uid, B.uid] })));

  await prova('pubblica un annuncio', () =>
    assertSucceeds(db(A).doc('market_listings/an1').set(
      { sellerUid:A.uid, title:'Arco', price:100 })));

  console.log('\n  ALLENAMENTO APERTO: A organizza, B si iscrive\n');

  // Anche la scena parte dalla forma vera: un documento scarno scritto con le
  // regole spente farebbe cadere la query dell'elenco piu' avanti, e il banco
  // direbbe no per colpa della scena, non delle regole.
  await scena(async d => d.doc('open_trainings/ot1').set(allenamento(
    { ownerUid:A.uid, titolo:'Domenica',
      participantUids:[A.uid], participants:[{uid:A.uid,name:'Anna'}] })));

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

  /* P0-1 DELL'AUDIT (19/09/2026): I CAMPI CHE SI VEDONO SUL TELEFONO DI UN ALTRO.
     Ognuno di questi finiva nell'HTML di chi guarda. Il carico e' sempre lo
     stesso: un <img> con onerror, cioe' codice eseguito da chi apre la lista.
     Accanto a ogni «no» c'e' il «si'» dello stesso gesto fatto dall'app vera,
     perche' una regola che rifiuta tutto passa questo banco e rompe l'app. */
  console.log('\n  P0-1: CAMPI CON UN TIPO (19/09)\n');
  const XSS = '<img src=x onerror=alert(1)>';

  await prova('allenamento con posti = testo NON si crea', () =>
    assertFails(db(A).doc('open_trainings/otX').set(allenamento(
      { ownerUid:A.uid, spots:XSS, participantUids:[A.uid] }))));
  await prova('allenamento con posti = 3 si crea (come fa l\'app)', () =>
    assertSucceeds(db(A).doc('open_trainings/otN').set(allenamento(
      { ownerUid:A.uid, spots:3, participantUids:[A.uid] }))));
  /* I CINQUE CAMPI SI PRETENDONO ALLA NASCITA. (20/09/2026.) La regola
     dell'ELENCO li legge direttamente — e' l'unica forma che controlla
     davvero — e un documento che ne manca uno la manda in errore, cioe'
     spegne l'elenco per TUTTI. Meglio rifiutare la nascita di quel documento
     che scoprirlo dall'elenco vuoto. */
  await prova('un allenamento senza `visibility` NON si crea', () => {
    const d = allenamento({ ownerUid:A.uid }); delete d.visibility;
    return assertFails(db(A).doc('open_trainings/otSenza').set(d));
  });
  await prova('e nemmeno uno senza `invitedUids`', () => {
    const d = allenamento({ ownerUid:A.uid }); delete d.invitedUids;
    return assertFails(db(A).doc('open_trainings/otSenza2').set(d));
  });

  await prova('l\'organizzatore NON trasforma i posti in testo dopo', () =>
    assertFails(db(A).doc('open_trainings/otN').update({ spots:XSS })));

  await prova('percorso proposto con piazzole = testo NON si crea', () =>
    assertFails(db(A).doc('percorsi_campo/pX').set(
      { createdBy:A.uid, clubCode:'01VERB', stato:'proposto', nome:'Alto', piazzole:XSS })));
  await prova('percorso proposto con piazzole = 24 si crea', () =>
    assertSucceeds(db(A).doc('percorsi_campo/pN').set(
      { createdBy:A.uid, clubCode:'01VERB', stato:'proposto', nome:'Alto', piazzole:24, note:'' })));
  await prova('il referente NON riscrive le piazzole come testo', () =>
    assertFails(db(A).doc('percorsi_campo/pN').update({ piazzole:XSS })));

  await prova('segnalazione con piazzola = testo NON si crea', () =>
    assertFails(db(A).collection('field_reports').add(
      { reporterUid:A.uid, clubCode:'01VERB', type:'target', piazzola:XSS, description:'x' })));
  await prova('segnalazione con piazzola = 7 si crea', () =>
    assertSucceeds(db(A).collection('field_reports').add(
      { reporterUid:A.uid, clubCode:'01VERB', type:'target', piazzola:7, description:'ramo' })));
  await prova('segnalazione senza piazzola (null) si crea', () =>
    assertSucceeds(db(A).collection('field_reports').add(
      { reporterUid:A.uid, clubCode:'01VERB', type:'other', piazzola:null, description:'ramo' })));

  await prova('profilo pubblico con numeri.giri = testo NON si scrive', () =>
    assertFails(db(A).doc('public_profiles/'+A.uid).set(
      { username:'anna', numeri:{ giri:XSS, piazzole:10, campi:1 } })));
  await prova('profilo pubblico con un campo estraneo dentro numeri NON si scrive', () =>
    assertFails(db(A).doc('public_profiles/'+A.uid).set(
      { username:'anna', numeri:{ giri:3, script:XSS } })));
  await prova('profilo pubblico con numeri veri si scrive', () =>
    assertSucceeds(db(A).doc('public_profiles/'+A.uid).set(
      { username:'anna', nomeCognome:'Anna Rossi', numeri:{ giri:3, piazzole:72, campi:2 } })));
  await prova('profilo pubblico con un nome di 500 caratteri NON si scrive', () =>
    assertFails(db(A).doc('public_profiles/'+A.uid).set(
      { username:'anna', nomeCognome:'x'.repeat(500) })));

  /* QUATTRO PORTE DELL'AUDIT (19/09/2026, seconda passata delle regole). */
  console.log('\n  CHAT PRIVATE: L\'ID E\' DEI DUE MEMBRI (SEC-07)\n');
  // Una coppia MAI usata prima: se il documento esistesse gia', il tentativo
  // diventerebbe un update e fallirebbe per un altro motivo (la prima versione
  // di questa prova passava cosi' anche sulle regole vecchie: era cieca).
  await prova('C NON crea la chat «utenteA__utenteZ» (di A con Z) mettendoci dentro se stesso', () =>
    assertFails(db(C).doc('direct_chats/utenteA__utenteZ').set(
      { members:[A.uid, C.uid], memberNames:{} })));
  await prova('C NON crea una chat con un id che non e\' la coppia dei membri', () =>
    assertFails(db(C).doc('direct_chats/qualsiasi').set(
      { members:[C.uid, A.uid].sort() })));
  await prova('A crea la chat con B come fa l\'app ([a,b].sort().join("__"))', () =>
    assertSucceeds(db(A).doc('direct_chats/' + [A.uid, B.uid].sort().join('__')).set(
      { members:[A.uid, B.uid].sort() })));

  console.log('\n  PREPARA GARA: LE BOZZE SONO DI CHI LE FA (SEC-09)\n');
  await scena(async d => d.doc('percorsi/bozzaA').set(
    { createdBy:A.uid, nome:'Gara di A', iscritti:[{ cognome:'Rossi', tessera:'FI-123' }] }));
  await prova('B NON legge la bozza di A (tessere di atleti terzi)', () =>
    assertFails(db(B).doc('percorsi/bozzaA').get()));
  await prova('A legge la propria bozza', () =>
    assertSucceeds(db(A).doc('percorsi/bozzaA').get()));
  await prova('A elenca le proprie bozze (la query dell\'app)', () =>
    assertSucceeds(db(A).collection('percorsi').where('createdBy', '==', A.uid).get()));

  console.log('\n  GESTIRE UNA COMPAGNIA: IL NOME NON SI SCEGLIE (SEC-13)\n');
  await prova('A NON chiede la gestione con l\'email di un altro', () =>
    assertFails(db(A).doc('compagnie_admin_requests/02XXXX_' + A.uid).set(
      { codice:'02XXXX', richiedenteUid:A.uid, richiedenteEmail:'presidente@compagnia.it', richiedenteName:'Il Presidente', stato:'pending' })));
  await prova('A chiede la gestione con la sua email', () =>
    assertSucceeds(db(A).doc('compagnie_admin_requests/02XXXX_' + A.uid).set(
      { codice:'02XXXX', richiedenteUid:A.uid, richiedenteEmail:A.email, richiedenteName:'Anna', stato:'pending' })));

  console.log('\n  SOSPENSIONE (SEC-08)\n');
  const S = { uid:'utenteS', email:'s@esempio.it', email_verified:true };
  await scena(async d => {
    await d.doc('users/' + S.uid).set({ approved:false });
    await d.doc('sospesi/' + S.uid).set({ da:'admin' });
  });
  await prova('il sospeso NON apre un allenamento', () =>
    assertFails(db(S).doc('open_trainings/otS').set(allenamento({ ownerUid:S.uid, spots:2, participantUids:[S.uid] }))));
  await prova('il sospeso NON apre una chat', () =>
    assertFails(db(S).doc('direct_chats/' + [S.uid, A.uid].sort().join('__')).set({ members:[S.uid, A.uid].sort() })));
  await prova('il sospeso NON si ricrea approvato (cancella e ricrea users/{uid})', async () => {
    await assertSucceeds(db(S).doc('users/' + S.uid).delete());
    await assertFails(db(S).doc('users/' + S.uid).set({ email:S.email, approved:true }));
  });
  await prova('il sospeso NON si toglie il segno da solo', () =>
    assertFails(db(S).doc('sospesi/' + S.uid).delete()));
  await prova('l\'admin sospende e riammette', async () => {
    await assertSucceeds(db(AD).doc('sospesi/utenteX').set({ da:AD.uid }));
    await assertSucceeds(db(AD).doc('sospesi/utenteX').delete());
  });
  await prova('chi NON e\' sospeso apre ancora un allenamento', () =>
    assertSucceeds(db(B).doc('open_trainings/otB').set(allenamento({ ownerUid:B.uid, spots:2, participantUids:[B.uid] }))));

  console.log('\n  I DISPOSITIVI (users/{uid}/devices) — fase 16\n');
  await prova('A scrive il documento del suo telefono', () =>
    assertSucceeds(db(A).doc('users/'+A.uid+'/devices/dTelefono').set(
      { token:'tok-1', platform:'android', language:'it', enabled:true, createdAt:new Date(), updatedAt:new Date(), lastSeen:new Date() })));
  await prova('B NON legge i dispositivi di A (dove riceve le push)', () =>
    assertFails(db(B).doc('users/'+A.uid+'/devices/dTelefono').get()));
  await prova('B NON scrive un dispositivo nell\'account di A', () =>
    assertFails(db(B).doc('users/'+A.uid+'/devices/dSuo').set({ token:'tok-b', enabled:true })));
  await prova('una piattaforma inventata NON si scrive (niente impronte)', () =>
    assertFails(db(A).doc('users/'+A.uid+'/devices/dStrano').set(
      { token:'tok-2', platform:'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit', enabled:true })));
  await prova('un campo in piu\' NON si scrive', () =>
    assertFails(db(A).doc('users/'+A.uid+'/devices/dExtra').set({ token:'tok-3', imei:'123456789' })));
  await prova('A spegne il suo dispositivo', () =>
    assertSucceeds(db(A).doc('users/'+A.uid+'/devices/dTelefono').set({ enabled:false }, { merge:true })));

  console.log('\n  LIMITI: MESSAGGI, ERRORI, SCHEDA COMPAGNIA — fase 4\n');
  await scena(async d => {
    await d.doc('direct_chats/'+[A.uid,B.uid].sort().join('__')).set({ members:[A.uid,B.uid].sort() });
  });
  const chat = [A.uid,B.uid].sort().join('__');
  await prova('un messaggio normale passa', () =>
    assertSucceeds(db(A).collection('direct_chats/'+chat+'/messages').add(
      { senderUid:A.uid, senderName:'Anna', text:'ci vediamo alla 12', createdAt:new Date() })));
  /* IL TETTO E' IL SOFFITTO DELL'ABUSO, NON IL LIMITE DI PRODOTTO.
     (20/09/2026, finestra di deploy.) Il 19/09 qui c'era «3000 caratteri NON
     passa», con il tetto a 2000 come la casella dell'app. Ma la casella si
     ferma a 2000 solo DA QUESTA VERSIONE: l'app che sta nei telefoni manda
     quello che uno ha scritto. Con il tetto a 2000, il giorno in cui si
     pubblicano le regole, un messaggio lungo scritto da un'app non ancora
     aggiornata sparisce in silenzio. Adesso il tetto e' 8000: quello che una
     persona vera scrive passa, il deposito da un megabyte no. */
  await prova("un messaggio lungo dell'app di ieri (3000) passa ancora", () =>
    assertSucceeds(db(A).collection('direct_chats/'+chat+'/messages').add(
      { senderUid:A.uid, senderName:'Anna', text:'x'.repeat(3000), createdAt:new Date() })));
  await prova('un messaggio da 9000 caratteri NON passa', () =>
    assertFails(db(A).collection('direct_chats/'+chat+'/messages').add(
      { senderUid:A.uid, senderName:'Anna', text:'x'.repeat(9000), createdAt:new Date() })));
  await prova('un errore normale si registra', () =>
    assertSucceeds(db(NV).collection('errors').add({ uid:NV.uid, msg:'crash', dove:'pista', at:Date.now() })));
  await prova('un errore con uno stack da 5000 caratteri NON si registra', () =>
    assertFails(db(NV).collection('errors').add({ uid:NV.uid, msg:'crash', stack:'y'.repeat(5000), at:Date.now() })));
  await prova('il referente scrive i dati della compagnia', () =>
    assertSucceeds(db(A).doc('compagnie_admin/01VERB').update({ referente:'Anna Rossi', tel:'347 1234567', note:'chiave al bar' })));
  await prova("una nota lunga dell'app di ieri (6000) passa ancora", () =>
    assertSucceeds(db(A).doc('compagnie_admin/01VERB').update({ note:'z'.repeat(6000) })));
  await prova('ma non una nota da 30.000 caratteri', () =>
    assertFails(db(A).doc('compagnie_admin/01VERB').update({ note:'z'.repeat(30000) })));
  await prova("ne' un telefono con una nota dentro, se supera il soffitto", () =>
    assertFails(db(A).doc('compagnie_admin/01VERB').update({ tel:'3'.repeat(200) })));

  /* ══ SEC-09: I DATI PRIVATI NON LI LEGGE CHIUNQUE ═══════════════════════
     (20/09/2026.) Tre raccolte che l'audit aveva messo insieme sotto SEC-09.
     `percorsi` era gia' stato chiuso il 19/09; queste sono le altre tre. */
  console.log('\n  SEC-09: LA SCHEDA DEL REFERENTE, I PERCORSI, IL PUNTO\n');
  await scena(async d => {
    await d.doc('compagnie_admin/01VERB').set({ adminUid: A.uid, clubCode: '01VERB',
      referente: 'Anna Rossi', tel: '347 1234567', indirizzo: 'Via A. Alberti', note: 'chiave al bar',
      emailComp: 'info@arcierivco.it' });
    await d.doc('compagnie_contatto/01VERB').set({ adminUid: A.uid, emailComp: 'info@arcierivco.it' });
    await d.doc('percorsi_campo/confermato1').set({ clubCode:'01VERB', stato:'confermato', nome:'Fornasona', createdBy: C.uid });
    await d.doc('percorsi_campo/proposto1').set({ clubCode:'01VERB', stato:'proposto', nome:'Nuovo', createdBy: C.uid, createdByName:'Carla' });
    await d.doc('open_trainings/otAperto').set({ ownerUid: A.uid, visibility:'all', clubCode:'01VERB', participantUids:[], invitedUids:[] });
    await d.doc('open_trainings/otAperto/dove/punto').set({ lat: 45.9, lng: 8.5 });
    await d.doc('open_trainings/otClub').set({ ownerUid: A.uid, visibility:'club', clubCode:'01VERB', participantUids:[C.uid], invitedUids:[] });
    await d.doc('open_trainings/otClub/dove/punto').set({ lat: 45.9, lng: 8.5 });
  });

  await prova('il referente legge la propria scheda di compagnia', () =>
    assertSucceeds(db(A).doc('compagnie_admin/01VERB').get()));
  await prova('B NON legge telefono, indirizzo e note di una compagnia altrui', () =>
    assertFails(db(B).doc('compagnie_admin/01VERB').get()));
  await prova('nemmeno un utente non verificato', () =>
    assertFails(db(NV).doc('compagnie_admin/01VERB').get()));
  await prova('il referente ritrova le sue compagnie (where adminUid == io)', () =>
    assertSucceeds(db(A).collection('compagnie_admin').where('adminUid','==',A.uid).get()));
  await prova("ma B NON puo' elencarle tutte", () =>
    assertFails(db(B).collection('compagnie_admin').get()));

  await prova('il contatto pubblico lo legge chiunque abbia un account', () =>
    assertSucceeds(db(B).doc('compagnie_contatto/01VERB').get()));
  await prova('e lo scrive il referente di quella compagnia', () =>
    assertSucceeds(db(A).doc('compagnie_contatto/01VERB').set({ adminUid:A.uid, emailComp:'nuova@club.it', aggiornatoIl: Date.now() })));
  await prova('ma non un altro iscritto', () =>
    assertFails(db(B).doc('compagnie_contatto/01VERB').set({ adminUid:B.uid })));
  await prova("e non ci si puo' infilare un telefono (hasOnly)", () =>
    assertFails(db(A).doc('compagnie_contatto/01VERB').set({ adminUid:A.uid, tel:'347 1234567' })));

  await prova('un percorso CONFERMATO lo legge chiunque: ci si va a tirare', () =>
    assertSucceeds(db(B).doc('percorsi_campo/confermato1').get()));
  await prova('una PROPOSTA altrui no', () =>
    assertFails(db(B).doc('percorsi_campo/proposto1').get()));
  await prova('la propria proposta si', () =>
    assertSucceeds(db(C).doc('percorsi_campo/proposto1').get()));
  await prova('e il referente della compagnia la legge (deve valutarla)', () =>
    assertSucceeds(db(A).doc('percorsi_campo/proposto1').get()));
  await prova('la query dei confermati passa', () =>
    assertSucceeds(db(B).collection('percorsi_campo').where('clubCode','==','01VERB').where('stato','==','confermato').get()));
  await prova('la query che chiede TUTTO il campo viene rifiutata intera', () =>
    assertFails(db(B).collection('percorsi_campo').where('clubCode','==','01VERB').get()));

  await prova('il punto di un allenamento aperto a tutti si legge', () =>
    assertSucceeds(db(B).doc('open_trainings/otAperto/dove/punto').get()));
  await prova('quello di un allenamento «solo club» no', () =>
    assertFails(db(B).doc('open_trainings/otClub/dove/punto').get()));
  await prova("ma chi e' iscritto lo legge (ci deve andare)", () =>
    assertSucceeds(db(C).doc('open_trainings/otClub/dove/punto').get()));
  await prova("e l'organizzatore anche", () =>
    assertSucceeds(db(A).doc('open_trainings/otClub/dove/punto').get()));
  await prova("un estraneo NON puo' spostare il punto di un allenamento altrui", () =>
    assertFails(db(B).doc('open_trainings/otClub/dove/punto').set({ lat:0, lng:0 })));
  await prova("l'organizzatore si", () =>
    assertSucceeds(db(A).doc('open_trainings/otClub/dove/punto').set({ lat:46, lng:8 })));

  /* ══ LA VISIBILITA' «SOLO CLUB» E' UNA PORTA, NON UNA TENDA ═════════════
     (20/09/2026, seconda passata su SEC-09.) Fino a stamattina la regola
     diceva `read: if signedIn()` e il filtro stava in `app.html`: bastava un
     client diverso per leggere tutto. Qui si chiede al database, che e'
     l'unico posto dove la risposta vale anche per chi l'app non la usa.
     E si chiede anche la cosa che nessuno chiede mai: che il FORMATO VECCHIO
     non sia una scorciatoia. */
  console.log('\n  ALLENAMENTI: CHI VEDE COSA (SEC-09, lato server)\n');
  await scena(async d => {
    await d.doc('users/'+A.uid).set({ email:A.email, approved:true, compagnia:'01VERB' }, { merge:true });
    await d.doc('users/'+B.uid).set({ email:B.email, approved:true, compagnia:'09ALTRA' }, { merge:true });
    await d.doc('users/'+C.uid).set({ email:C.email, approved:true }, { merge:true });
    await d.doc('open_trainings/otTutti').set({ ownerUid:A.uid, visibility:'all', clubCode:'01VERB',
      status:'active', participantUids:[], invitedUids:[] });
    await d.doc('open_trainings/otSoloClub').set({ ownerUid:A.uid, visibility:'club', clubCode:'01VERB',
      status:'active', participantUids:[], invitedUids:[] });
    await d.doc('open_trainings/otSoloClubInvito').set({ ownerUid:A.uid, visibility:'club', clubCode:'01VERB',
      status:'active', participantUids:[], invitedUids:[C.uid] });
    await d.doc('open_trainings/otSoloClubIscritto').set({ ownerUid:A.uid, visibility:'club', clubCode:'01VERB',
      status:'active', participantUids:[C.uid], invitedUids:[] });
    /* IL FORMATO VECCHIO: lat/lng ancora DENTRO il documento, come li scriveva
       l'app fino a stamattina. Se la porta fosse solo sul sottodocumento, qui
       ci sarebbe la scorciatoia. */
    await d.doc('open_trainings/otVecchioSoloClub').set({ ownerUid:A.uid, visibility:'club',
      clubCode:'01VERB', status:'active', participantUids:[], invitedUids:[], lat:45.9, lng:8.5 });
    await d.doc('open_trainings/otSoloClub/dove/punto').set({ lat:45.9, lng:8.5 });
  });

  await prova('un allenamento aperto a tutti lo vede chiunque', () =>
    assertSucceeds(db(B).doc('open_trainings/otTutti').get()));
  await prova("un «solo club» lo vede chi e' della compagnia", () =>
    assertSucceeds(db(A).doc('open_trainings/otSoloClub').get()));
  await prova("NON lo vede chi e' di un'altra compagnia", () =>
    assertFails(db(B).doc('open_trainings/otSoloClub').get()));
  await prova('NON lo vede chi non ha compagnia', () =>
    assertFails(db(C).doc('open_trainings/otSoloClub').get()));
  await prova("ma lo vede chi e' stato invitato", () =>
    assertSucceeds(db(C).doc('open_trainings/otSoloClubInvito').get()));
  await prova("e chi si e' iscritto", () =>
    assertSucceeds(db(C).doc('open_trainings/otSoloClubIscritto').get()));

  /* IL FORMATO VECCHIO NON E' UNA SCORCIATOIA. Le coordinate stanno adesso in
     un sottodocumento, ma i documenti scritti prima ce le hanno ancora
     dentro: se la porta fosse solo sul sottodocumento, basterebbe leggere il
     documento vecchio. Non basta, perche' la porta e' sul documento. */
  await prova('un documento VECCHIO con lat/lng dentro non si legge lo stesso', () =>
    assertFails(db(B).doc('open_trainings/otVecchioSoloClub').get()));

  /* LE QUATTRO DOMANDE DELL'APP, una per una: devono passare tutte, se no
     l'elenco sparisce — e sparirebbe per TUTTI, non solo per chi non deve
     vedere. */
  await prova('query 1: gli allenamenti aperti a tutti', () =>
    assertSucceeds(db(B).collection('open_trainings').where('visibility','==','all').limit(50).get()));
  /* ══ QUI SI VEDE COME FIRESTORE AUTORIZZA DAVVERO UNA QUERY ══════════════
     (20/09/2026, misurato.) Non valuta la regola documento per documento: la
     autorizza solo se la condizione e' IMPLICATA DAI FILTRI della query.
     Percio' `where('clubCode','==','01VERB')` passa solo se la regola puo'
     dedurre dal filtro che chi chiede ha diritto — cioe' se `01VERB` e' la
     compagnia scritta nel SUO TOKEN. Non basta essere il proprietario di
     tutti i documenti che tornerebbero: il proprietario A, senza claim, viene
     rifiutato lo stesso (provato).
     E' la ragione per cui serve `claimCompagnia`, ed e' anche la ragione per
     cui questa prova sta qui in due versioni: la stessa domanda, prima e dopo
     che il token porti la compagnia. */
  await prova("query 2 SENZA il claim: rifiutata (la funzione non e' ancora pubblicata)", () =>
    assertFails(db(A).collection('open_trainings').where('clubCode','==','01VERB').limit(50).get()));
  const ACLAIM = { uid:'utenteA', email:'a@esempio.it', email_verified:true, compagnia:'01VERB' };
  await prova('query 2 CON il claim: passa', () =>
    assertSucceeds(db(ACLAIM).collection('open_trainings').where('clubCode','==','01VERB').limit(50).get()));
  await prova("ma il claim di un'altra compagnia non apre questa", () =>
    assertFails(db({ uid:'utenteB', email:'b@esempio.it', email_verified:true, compagnia:'09ALTRA' })
      .collection('open_trainings').where('clubCode','==','01VERB').limit(50).get()));
  await prova('query 3: quelli a cui sono invitato', () =>
    assertSucceeds(db(C).collection('open_trainings').where('invitedUids','array-contains',C.uid).limit(50).get()));
  await prova('query 4: i miei', () =>
    assertSucceeds(db(A).collection('open_trainings').where('ownerUid','==',A.uid).limit(50).get()));
  /* E LA DOMANDA DELL'APP DI IERI — «dammi tutti gli attivi» — viene rifiutata
     INTERA. E' la conseguenza dichiarata: il suo elenco resta vuoto finche'
     non si aggiorna. Meglio un elenco vuoto per qualche ora che un annuncio
     «solo per i soci» leggibile da chiunque per sempre. */
  await prova("la query dell'app di ieri (tutti gli attivi) viene RIFIUTATA", () =>
    assertFails(db(B).collection('open_trainings').where('status','==','active').limit(50).get()));
  await prova('e quella di B sulla compagnia di un ALTRO club viene rifiutata', () =>
    assertFails(db(B).collection('open_trainings').where('clubCode','==','01VERB').limit(50).get()));

  await prova('il punto di un «solo club» non lo legge un estraneo', () =>
    assertFails(db(B).doc('open_trainings/otSoloClub/dove/punto').get()));
  await prova('un estraneo NON scrive il punto di un allenamento che non esiste', () =>
    assertFails(db(B).doc('open_trainings/otInventato/dove/punto').set({ lat:0, lng:0 })));
  await prova("e nemmeno il punto dell'allenamento di un altro", () =>
    assertFails(db(B).doc('open_trainings/otTutti/dove/punto').set({ lat:0, lng:0 })));
  await prova("l'organizzatore lo scrive", () =>
    assertSucceeds(db(A).doc('open_trainings/otTutti/dove/punto').set({ lat:46, lng:8 })));

  /* ══ IL GIRO NUOVO, SULL'EMULATORE VERO ═════════════════════════════════
     (20/09/2026.) Dal 20/09 un giro porta `roundId`, `interrotto`,
     `federation`/`division`/`eventId`, l'uid di CHI HA TIRATO (anche se non e'
     il telefono che segna) e le ZONE di ogni freccia. Sono dati nuovi in un
     documento che finora nessuna prova aveva mai scritto nella sua forma
     intera contro le regole vere.
     Le due domande che contano sono sempre le stesse: entra? e lo legge solo
     chi deve? Lo storico e' della persona e di nessun altro — nemmeno
     dell'admin. */
  console.log('\n  IL GIRO: uid di chi ha tirato, zone delle frecce\n');
  const GIRO = {
    date: new Date().toISOString(), deleted:false, sessionType:'3d', format:24,
    modeKey:'round3d', modeLabel:'Round 3D', scoringVersion:'fiarc-rt-2023',
    campo:'Cerrione', durata:180, roundId:'g' + 'a'.repeat(40), interrotto:false,
    federation:'fiarc', division:null, eventId:null,
    results:[{ name:'anna', total:420, isSelf:true, ownerUid:'utenteA',
               perTarget:[20,18], arrows:[{v:[20]},{v:[18]}],
               zones:[{v:['superspot']},{v:['spot']}] },
             { name:'bruno', total:400, isSelf:false, ownerUid:'utenteB',
               perTarget:[20,16], arrows:[{v:[20]},{v:[16]}],
               zones:[{v:['superspot']},{v:['sagoma']}] }]
  };
  await prova('il giro nuovo entra nello storico del suo proprietario', () =>
    assertSucceeds(db(A).doc('users/'+A.uid+'/storico/20260920120000000').set(GIRO)));
  await prova("B NON legge il giro di A, anche se dentro c'e' il suo uid", () =>
    assertFails(db(B).doc('users/'+A.uid+'/storico/20260920120000000').get()));
  await prova("e nemmeno l'admin: lo storico non lo legge nessun altro", () =>
    assertFails(db(AD).doc('users/'+A.uid+'/storico/20260920120000000').get()));
  await prova("B NON puo' scrivere un giro nello storico di A", () =>
    assertFails(db(B).doc('users/'+A.uid+'/storico/20260920130000000').set(GIRO)));
  await prova('A rilegge il proprio giro con le zone dentro', async () => {
    const d = await db(A).doc('users/'+A.uid+'/storico/20260920120000000').get();
    if (!d.exists) throw new Error("il giro non c'e'");
    const r = d.data().results;
    if (r[1].ownerUid !== 'utenteB') throw new Error("manca l'uid del secondo arciere");
    if (r[0].zones[0].v[0] !== 'superspot') throw new Error('manca la zona della prima freccia');
  });

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
