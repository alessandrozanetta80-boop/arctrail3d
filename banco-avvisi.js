/* Banco degli avvisi — `node banco-avvisi.js`
   Prova la Cloud Function `avvisaRicerche` di index.js. Niente Firebase: né
   installato né finto a metà. I quattro moduli che index.js chiede vengono
   sostituiti prima che il file venga caricato, e il trigger che registra
   viene preso e chiamato a mano.

   PERCHE' ESISTE. Fino al 17/08 di questo pezzo non guardava niente: le regole
   di market_favs erano state "rilette a mano", ed e' scritto nelle note del
   mercatino che un banco che non e' stato eseguito e' un'opinione ben scritta.
   Qui pero' non c'e' solo una regola: c'e' una DECISIONE presa a ogni annuncio
   pubblicato — chi viene avvisato e chi no — e sbagliarla si vede solo dal
   telefono di qualcun altro.

   LA PROVA PIU' IMPORTANTE E' L'ULTIMA: che `combacia` (server) e `matchQ`
   (marketplace.html) rispondano la stessa cosa. Sono due copie della stessa
   domanda in due file diversi, ed e' la trappola che questo progetto ha gia'
   pagato quattro volte. Qui le due funzioni vengono ESTRATTE dai file veri e
   messe una contro l'altra: se un giorno una delle due impara un campo in piu'
   e l'altra no, il banco lo dice il giorno stesso. */

const Module = require('module');
const fs = require('fs');
const path = require('path');

// ── i moduli che index.js si aspetta ────────────────────────────────────────
const trigger = {};                 // percorso -> funzione registrata
let ADMIN_ESISTE = true;            // c'e' un account per ADMIN_EMAIL?
let AVVISI_ESISTENTI = {};          // avvisi gia' nati, per provare il `create`
let ROMPI_CREATE = false;           // per provare un guaio che NON e' «esiste gia'`
let scritte = [];                   // notifiche nate durante una prova
let DATI = {};                      // il finto database

function docFinto(raccolta, id) {
  const d = (DATI[raccolta] || {})[id];
  return {
    id: id,
    exists: !!d,
    data: function () { return d || {}; },
    get: function (k) { return d ? d[k] : undefined; }
  };
}

const finto = {
  'firebase-functions/v2/firestore': {
    onDocumentCreated: function (percorso, fn) { trigger[percorso] = fn; return fn; }
  },
  'firebase-functions/v2/https': {
    onCall: function (_o, fn) { return fn; },
    HttpsError: class extends Error { constructor(c, m) { super(m); this.code = c; } }
  },
  'firebase-functions/v2': { setGlobalOptions: function () {} },
  'firebase-admin': {
    initializeApp: function () {},
    messaging: function () { return { send: function () { return Promise.resolve(); } }; },
    /* Dal 18/08 due funzioni cercano chi tiene l'app per email invece di
       leggerne l'uid da un documento. Il banco deve saper rispondere, e anche
       saper NON rispondere: se l'account non esiste, l'avviso non deve partire
       e la funzione non deve rompersi. */
    auth: function () {
      return {
        getUserByEmail: function (mail) {
          if (!ADMIN_ESISTE) return Promise.reject(new Error('user-not-found'));
          return Promise.resolve({ uid: 'admin-uid', email: mail });
        }
      };
    },
    firestore: Object.assign(function () {
      return {
        collection: function (nome) {
          return {
            get: function () {
              const tutti = Object.keys(DATI[nome] || {}).map(function (id) { return docFinto(nome, id); });
              return Promise.resolve({
                size: tutti.length,
                forEach: function (f) { tutti.forEach(f); }
              });
            },
            doc: function (id) {
              return {
                get: function () { return Promise.resolve(docFinto(nome, id)); },
                update: function () { return Promise.resolve(); },
                collection: function (sotto) {
                  return {
                    add: function (v) { scritte.push({ a: id, sotto: sotto, doc: v }); return Promise.resolve({}); },
                    /* `create` fallisce se il documento c'e' gia': e' cosi' che
                       avvisaSegnalazione distingue la prima segnalazione di un
                       annuncio dalle successive. Il finto deve comportarsi
                       uguale, o la prova non prova niente. */
                    doc: function (idAvviso) {
                      return {
                        /* `get` serve da quando la funzione guarda se l'avviso
                           c'e' gia' e se e' stato letto: un avviso letto e' una
                           storia chiusa, e va rifatto per tornare a suonare. */
                        get: function () {
                          var v = AVVISI_ESISTENTI[idAvviso];
                          return Promise.resolve({ exists: !!v, data: function () { return v || {}; } });
                        },
                        create: function (v) {
                          if (ROMPI_CREATE) {
                            var g = new Error('qualcosa di diverso');
                            g.code = 7;   // PERMISSION_DENIED, non ALREADY_EXISTS
                            return Promise.reject(g);
                          }
                          if (AVVISI_ESISTENTI[idAvviso]) {
                            /* Firestore non tira un Error qualunque: tira un
                               errore col codice 6. Il finto deve dire la stessa
                               cosa, o il banco non puo' accorgersi se la
                               funzione distingue «esiste gia'» dagli altri
                               guai — che e' proprio il difetto del 19/08. */
                            var e = new Error('ALREADY_EXISTS');
                            e.code = 6;
                            return Promise.reject(e);
                          }
                          AVVISI_ESISTENTI[idAvviso] = v;
                          scritte.push({ a: id, sotto: sotto, id: idAvviso, doc: v, come: 'create' });
                          return Promise.resolve({});
                        },
                        update: function (v) {
                          scritte.push({ a: id, sotto: sotto, id: idAvviso, doc: v, come: 'update' });
                          return Promise.resolve();
                        },
                        delete: function () {
                          delete AVVISI_ESISTENTI[idAvviso];
                          scritte.push({ a: id, sotto: sotto, id: idAvviso, come: 'delete' });
                          return Promise.resolve();
                        }
                      };
                    }
                  };
                }
              };
            }
          };
        },
        runTransaction: function () { return Promise.resolve(); }
      };
    }, {
      FieldValue: {
        serverTimestamp: function () { return '@ora'; },
        delete: function () { return '@cancella'; },
        increment: function (n) { return '@piu' + n; }
      }
    })
  }
};

const caricaVero = Module._load;
Module._load = function (richiesto, padre, isMain) {
  if (Object.prototype.hasOwnProperty.call(finto, richiesto)) return finto[richiesto];
  return caricaVero.apply(this, arguments);
};
require(path.resolve(__dirname, 'index.js'));
Module._load = caricaVero;

const avvisa = trigger['market_listings/{adId}'];
const errori = [];
if (!avvisa) {
  console.log('NON VA:\n  - index.js non registra piu\' nessun trigger su market_listings/{adId}');
  process.exit(1);
}

// ── le prove ────────────────────────────────────────────────────────────────
const ARCO = {
  status: 'active', type: 'vendo', sellerUid: 'u1',
  title: 'Ricurvo Hoyt Satori 40lb', description: 'Tenuto benissimo, con flettenti Uukha.',
  marca: 'HOYT', location: 'Verbania (VB)', price: 680
};

async function prova(nome, dati, annuncio) {
  DATI = dati; scritte = [];
  await avvisa({ data: { data: function () { return annuncio; } }, params: { adId: 'a9' } });
  const righe = scritte.slice();
  console.log('  ' + nome + ': ' + (righe.length ? righe.map(function (r) { return r.a + ' «' + r.doc.title + '»'; }).join(' | ') : 'nessun avviso'));
  return righe;
}

(async () => {
  console.log('avvisi scritti da avvisaRicerche:');

  // 1. Chi aspettava «hoyt» viene avvisato, nella SUA lingua.
  let r = await prova('uno che aspettava', {
    market_searches: { u2: { queries: ['hoyt'], lang: 'sv' } },
    users: { u2: {} }
  }, ARCO);
  if (r.length !== 1) errori.push('chi aspettava «hoyt» non e\' stato avvisato');
  else {
    if (r[0].a !== 'u2') errori.push('l\'avviso e\' finito alla persona sbagliata');
    if (!/^Ny annons/.test(r[0].doc.title)) errori.push('la notifica non e\' nella lingua di chi la riceve (dice: ' + r[0].doc.title + ')');
    if (r[0].doc.body.indexOf('Verbania (VB)') < 0 || r[0].doc.body.indexOf('€ 680') < 0)
      errori.push('il corpo dell\'avviso non dice dov\'e\' e quanto costa (dice: ' + r[0].doc.body + ')');
    if (r[0].doc.adId !== 'a9') errori.push('l\'avviso non porta l\'id dell\'annuncio');
  }

  // 2. Il proprio annuncio non e' una notizia.
  r = await prova('il venditore stesso', {
    market_searches: { u1: { queries: ['hoyt'], lang: 'it' } },
    users: { u1: {} }
  }, ARCO);
  if (r.length) errori.push('il venditore riceve l\'avviso del proprio annuncio');

  // 3. Un annuncio che non nasce in vendita non si annuncia.
  r = await prova('annuncio non attivo', {
    market_searches: { u2: { queries: ['hoyt'], lang: 'it' } },
    users: { u2: {} }
  }, Object.assign({}, ARCO, { status: 'paused' }));
  if (r.length) errori.push('un annuncio non attivo fa partire gli avvisi lo stesso');

  // 4. Tre ricerche che combaciano sono la stessa notizia detta tre volte.
  r = await prova('tre ricerche di una persona sola', {
    market_searches: { u2: { queries: ['hoyt', 'ricurvo', 'satori'], lang: 'it' } },
    users: { u2: {} }
  }, ARCO);
  if (r.length !== 1) errori.push('la stessa persona riceve ' + r.length + ' avvisi per lo stesso annuncio');

  // 5. Un blocco che vale nelle chat e non negli avvisi non e' un blocco.
  r = await prova('chi ha bloccato il venditore', {
    market_searches: { u2: { queries: ['hoyt'], lang: 'it' } },
    users: { u2: { blockedUsers: { u1: true } } }
  }, ARCO);
  if (r.length) errori.push('un venditore bloccato riesce comunque ad arrivare con un avviso');

  // 6. Si guarda anche la descrizione e la marca, non solo il titolo.
  r = await prova('parola solo nella descrizione', {
    market_searches: { u2: { queries: ['uukha'], lang: 'it' } },
    users: { u2: {} }
  }, ARCO);
  if (r.length !== 1) errori.push('una parola che sta solo nella descrizione non fa scattare l\'avviso');

  // 7. Un «Cerco» non ha un prezzo da mettere nella notifica.
  r = await prova('un «Cerco»', {
    market_searches: { u2: { queries: ['longbow'], lang: 'it' } },
    users: { u2: {} }
  }, { status: 'active', type: 'cerco', sellerUid: 'u4', title: 'Cerco longbow mancino',
       description: '', location: 'Domodossola (VB)', budget: 400 });
  if (r.length !== 1) errori.push('un «Cerco» non avvisa nessuno');
  else if (/€/.test(r[0].doc.body)) errori.push('un «Cerco» stampa un prezzo nella notifica (dice: ' + r[0].doc.body + ')');

  // 8. Chi non aspettava niente non riceve niente.
  r = await prova('nessuna corrispondenza', {
    market_searches: { u2: { queries: ['compound'], lang: 'it' } },
    users: { u2: {} }
  }, ARCO);
  if (r.length) errori.push('parte un avviso a chi non stava cercando niente del genere');

  // ── 9. LE DUE COPIE DELLA STESSA DOMANDA ─────────────────────────────────
  // `combacia` in index.js e `matchQ` in marketplace.html rispondono alla
  // stessa domanda in due file diversi. Se divergono, uno riceve un avviso per
  // un annuncio che poi, entrando nel mercatino, non trova — e non ha modo di
  // capire perche'. Qui si estraggono dai file veri e si mettono una contro
  // l'altra.
  function estrai(file, nome) {
    const testo = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    const i = testo.indexOf('function ' + nome + '(');
    if (i < 0) return null;
    let liv = 0, j = testo.indexOf('{', i);
    for (let k = j; k < testo.length; k++) {
      if (testo[k] === '{') liv++;
      else if (testo[k] === '}') { liv--; if (!liv) { j = k; break; } }
    }
    return new Function('return (' + testo.slice(i, j + 1) + ')')();
  }
  const combacia = estrai('index.js', 'combacia');
  const matchQ = estrai('marketplace.html', 'matchQ');
  if (!combacia || !matchQ) {
    errori.push('non trovo piu\' combacia() in index.js o matchQ() in marketplace.html');
  } else {
    const casi = [
      [ARCO, 'hoyt'], [ARCO, 'HOYT'], [ARCO, ' hoyt '], [ARCO, 'satori 40'],
      [ARCO, 'uukha'], [ARCO, 'compound'], [ARCO, ''], [ARCO, '   '],
      [{ title: 'Faretra', marca: 'BEARPAW' }, 'bearpaw'],
      [{ title: 'Faretra', location: 'Verbania' }, 'verbania'],   // il posto NON e' una corrispondenza
      [{ title: 'Set frecce', description: 'spine 500' }, 'spine 500'],
      [{}, 'hoyt']
    ];
    const diverse = casi.filter(function (c) { return !!combacia(c[0], c[1]) !== !!matchQ(c[0], c[1]); });
    console.log('corrispondenza server/mercatino: ' + (casi.length - diverse.length) + '/' + casi.length + ' d\'accordo');
    diverse.forEach(function (c) {
      errori.push('server e mercatino non sono d\'accordo su «' + c[1] + '»: il conto sulla campanella e l\'avviso direbbero cose diverse');
    });
  }

  // ── LE SEGNALAZIONI SVEGLIANO CHI TIENE L'APP? ────────────────────────────
  {
    const segnala = trigger['market_reports/{repId}'];
    if (!segnala) {
      errori.push('index.js non registra nessun trigger su market_reports/{repId}');
    } else {
      console.log('\navvisi scritti da avvisaSegnalazione:');
      const chiama = async function (rep, repId) {
        DATI = {}; scritte = [];
        await segnala({ data: { data: function () { return rep; } }, params: { repId: repId || 'r1' } });
        return scritte.slice();
      };

      // 1. La prima segnalazione di un annuncio suona, e dice cosa e perche'.
      ADMIN_ESISTE = true; AVVISI_ESISTENTI = {};
      let r = await chiama({ adId:'a1', reason:'spam', adTitle:'Compound a 20 euro', fromUid:'u9' });
      console.log('  prima segnalazione: ' + (r.length ? r[0].come + ' \u00AB' + r[0].doc.body + '\u00BB su ' + r[0].a : 'niente'));
      if (!r.length) errori.push('la prima segnalazione non scrive nessun avviso');
      else {
        if (r[0].a !== 'admin-uid') errori.push('l\'avviso della segnalazione non va a chi tiene l\'app');
        if (r[0].doc.body.indexOf('Compound a 20 euro') === -1)
          errori.push('l\'avviso non dice QUALE annuncio e\' stato segnalato');
        if (r[0].doc.body.indexOf('spam o truffa') === -1)
          errori.push('il motivo resta un codice invece di una frase in italiano');
      }

      // 2. La seconda segnalazione dello STESSO annuncio non suona di nuovo:
      //    aggiorna e basta. Cinque campanelle per una notizia sola sono il
      //    modo piu' rapido per farsi spegnere le notifiche.
      r = await chiama({ adId:'a1', reason:'photo', adTitle:'Compound a 20 euro', fromUid:'u8' }, 'r2');
      console.log('  seconda sullo stesso annuncio: ' + (r.length ? r[0].come : 'niente'));
      if (!r.length || r[0].come !== 'update')
        errori.push('la seconda segnalazione dello stesso annuncio suona di nuovo invece di aggiornare');

      // 3. Un annuncio DIVERSO e' una notizia diversa, e suona.
      r = await chiama({ adId:'a2', reason:'forbidden', adTitle:'Roba vietata', fromUid:'u7' }, 'r3');
      console.log('  altro annuncio: ' + (r.length ? r[0].come : 'niente'));
      if (!r.length || r[0].come !== 'create')
        errori.push('la segnalazione di un altro annuncio non suona');

      // 3-bis. AVVISO GIA' LETTO = storia chiusa. Una segnalazione nuova su
      //    quell'annuncio deve tornare a SUONARE, non aggiornare in silenzio.
      //    E' il difetto per cui la push non arrivava mai: l'avviso restava li'
      //    letto, e da quel momento quell'annuncio era muto per sempre.
      AVVISI_ESISTENTI = { 'rep-a1': { read: true, title: 'Annuncio segnalato' } };
      r = await chiama({ adId:'a1', reason:'spam', adTitle:'Compound a 20 euro', fromUid:'u4' }, 'r6');
      console.log('  su un avviso GIA\' LETTO: ' + r.map(function (x) { return x.come; }).join(' poi ') || 'niente');
      if (!r.some(function (x) { return x.come === 'create'; }))
        errori.push('un avviso gia\' letto non torna a suonare: quell\'annuncio resta muto per sempre');

      // 3-ter. Un errore che NON e' «esiste gia'» non deve finire nel ramo
      //    silenzioso: li' la push non parte, e va detto invece che nascosto.
      AVVISI_ESISTENTI = {}; ROMPI_CREATE = true;
      r = await chiama({ adId:'a9', reason:'spam', adTitle:'Y', fromUid:'u3' }, 'r7');
      console.log('  con create rotto per altro motivo: ' + (r.length ? r.map(function(x){return x.come;}).join(',') : 'niente, e non finge'));
      if (r.some(function (x) { return x.come === 'update'; }))
        errori.push('un errore diverso da «esiste gia\'» finisce nel ramo silenzioso: la push non parte e nessuno lo sa');
      ROMPI_CREATE = false;

      // 4. Senza titolo salvato (segnalazioni vecchie) non si rompe.
      AVVISI_ESISTENTI = {};
      r = await chiama({ adId:'a3', reason:'price', fromUid:'u6' }, 'r4');
      console.log('  senza titolo salvato: ' + (r.length ? '\u00AB' + r[0].doc.body + '\u00BB' : 'niente'));
      if (!r.length) errori.push('una segnalazione senza titolo salvato non avvisa affatto');

      // 5. Se l'account admin non esiste, non parte niente e non si rompe.
      ADMIN_ESISTE = false; AVVISI_ESISTENTI = {};
      r = await chiama({ adId:'a4', reason:'spam', adTitle:'X', fromUid:'u5' }, 'r5');
      console.log('  senza account admin: ' + (r.length ? 'scrive lo stesso (male)' : 'niente, e non si rompe'));
      if (r.length) errori.push('senza account admin l\'avviso viene scritto a vuoto');
      ADMIN_ESISTE = true;
    }
  }

  // ── LE ISCRIZIONI IN ATTESA SVEGLIANO? ────────────────────────────────────
  {
    const iscr = trigger['users/{uid}'];
    if (!iscr) {
      errori.push('index.js non registra nessun trigger su users/{uid}');
    } else {
      console.log('\navvisi scritti da avvisaIscrizione:');
      const chiama = async function (u, uid) {
        DATI = {}; scritte = []; AVVISI_ESISTENTI = {};
        await iscr({ data: { data: function () { return u; } }, params: { uid: uid || 'u42' } });
        return scritte.slice();
      };

      // 1. Chi resta in attesa fa suonare la campanella, con un nome leggibile.
      let r = await chiama({ approved:false, nomeCognome:'Mario Rossi', username:'mrossi', email:'m@r.it' });
      console.log('  in attesa: ' + (r.length ? '\u00AB' + r[0].doc.body + '\u00BB' : 'niente'));
      if (!r.length) errori.push('un\'iscrizione in attesa non avvisa nessuno');
      else if (r[0].doc.body.indexOf('Mario Rossi') === -1)
        errori.push('l\'avviso dell\'iscrizione non dice chi si e\' iscritto');

      // 2. Un account gia' attivo non e' una notizia: se un giorno le
      //    registrazioni tornano aperte, questa smette di suonare da sola.
      r = await chiama({ approved:true, nomeCognome:'Gia Dentro', email:'g@d.it' });
      console.log('  gia\' attivo: ' + (r.length ? 'suona (male)' : 'niente, come deve'));
      if (r.length) errori.push('un account gia\' attivo fa suonare la campanella');

      // 3. Nemmeno un nome: si avvisa lo stesso, con quello che c'e'.
      r = await chiama({ approved:false, email:'anonimo@esempio.it' });
      console.log('  senza nome: ' + (r.length ? '\u00AB' + r[0].doc.body + '\u00BB' : 'niente'));
      if (!r.length) errori.push('un\'iscrizione senza nome non avvisa');

      // 4. Il primo account e' quello di chi tiene l'app: non si avvisa da solo.
      r = await chiama({ approved:false, email:'x@y.it' }, 'admin-uid');
      console.log('  l\'account di chi tiene l\'app: ' + (r.length ? 'si avvisa da solo (male)' : 'niente, come deve'));
      if (r.length) errori.push('chi tiene l\'app riceve un avviso per la propria iscrizione');
    }
  }

  if (errori.length) {
    console.log('\nNON VA:');
    errori.forEach(function (e) { console.log('  - ' + e); });
    process.exit(1);
  }
  console.log('\nTutte le prove passate.');
})();
