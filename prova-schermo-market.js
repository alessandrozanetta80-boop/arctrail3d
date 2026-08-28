/* Prova a schermo del Marketplace.
   Non prova la rete: prova che la pagina si DISEGNA, nei tre temi e alle due
   larghezze, e che la scheda dell'annuncio dice davvero cos'e' l'oggetto.
   Firebase e' finto: qui non si guarda il database, si guarda lo schermo. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FINTI = [
  { id:'a1', type:'vendo', title:'Ricurvo Hoyt Satori 40lb + flettenti Uukha', category:'arco',
    marca:'HOYT', arcoTipo:'ricurvo', lb:40, draw:28, mano:'dx', condition:'ottimo',
    price:680, shipping:true, accOffers:true, location:'Verbania (VB)', photos:[],
    createdAt:new Date(Date.now()-3600e3), sellerUid:'u2', sellerName:'Marco B.', status:'active' },
  { id:'a2', type:'vendo', title:'12 frecce Easton X10 spine 500 tagliate 28"', category:'frecce',
    marca:'EASTON', frMat:'carbonio', spine:500, qty:12, condition:'buono',
    price:180, shipping:false, location:'Novara (NO)', photos:[],
    createdAt:new Date(Date.now()-86400e3*3), sellerUid:'u3', sellerName:'Anna R.', status:'active' },
  { id:'a3', type:'cerco', title:'Cerco longbow mancino, allungo 29', category:'arco',
    arcoTipo:'longbow', mano:'sx', draw:29, budget:400, location:'Domodossola (VB)', photos:[],
    createdAt:new Date(Date.now()-86400e3*9), sellerUid:'u4', sellerName:'Dino F.', status:'active' },
  { id:'a4', type:'vendo', title:'Sgancio Carter Evolution a pollice', category:'sganci',
    marca:'CARTER', sgTipo:'pressione', sgDita:'pollice', sgMat:'alluminio', mano:'dx',
    condition:'nuovo', price:209, shipping:true, accOffers:true, location:'Lugano', photos:[],
    createdAt:new Date(Date.now()-600e3), sellerUid:'u5', sellerName:'Ale Z.', status:'active' }
];

const FINTO_FIREBASE = `
(function(){
  function noop(){ return q; }
  /* La raccolta si ricorda: senza, un banco che chiede "questa scrittura dov'e'
     andata?" non ha modo di rispondere, e le ricerche salvate si provano
     proprio li' — che salgano su market_searches e non altrove. */
  var q = { where:noop, limit:noop, orderBy:noop,
            onSnapshot:function(cb){ if(typeof cb==='function' && window.__MSG) cb({docs:window.__MSG.map(function(m){return {id:m.id,data:function(){return m;}};})}); return function(){}; },
            get:function(){ var d=(window.__DOC||{})[q.__c];
                            /* Una raccolta puo' anche RISPONDERE, non solo ricevere: senza,
                               nessun banco puo' provare una schermata che legge un elenco.
                               \`__RIGHE[raccolta]\` e' quell'elenco, e \`__RIFIUTA\` fa
                               rispondere di no come farebbe una regola Firestore chiusa. */
                            if(window.__RIFIUTA===q.__c){ var er=new Error('Missing or insufficient permissions.'); er.code='permission-denied'; return Promise.reject(er); }
                            var righe=(window.__RIGHE||{})[q.__c];
                            if(righe) return Promise.resolve({
                              docs:righe.map(function(r){return {id:r.id,data:function(){return r;}};}),
                              empty:!righe.length, size:righe.length,
                              forEach:function(f){ righe.forEach(function(r){ f({id:r.id,data:function(){return r;}}); }); }
                            });
                            return Promise.resolve({docs:[],empty:true,size:0,forEach:function(){},exists:!!d,data:function(){return d||{};}}); },
            doc:function(){ return q; }, collection:function(n){ if(n) q.__c=n; return q; },
            add:function(v){ (window.__SCRITTO=window.__SCRITTO||[]).push(['add',v,q.__c]); return Promise.resolve({}); },
            update:function(v){ (window.__SCRITTO=window.__SCRITTO||[]).push(['update',v,q.__c]); return Promise.resolve(); },
            set:function(v){ (window.__SCRITTO=window.__SCRITTO||[]).push(['set',v,q.__c]);
                             if(window.__FALLISCI_SET===q.__c) return Promise.reject(new Error('permission-denied'));
                             return Promise.resolve(); },
            delete:function(){ return Promise.resolve(); } };
  window.firebase = {
    initializeApp:function(){},
    auth:function(){ return { onAuthStateChanged:function(){}, signInWithEmailAndPassword:function(){return Promise.resolve();}, signOut:function(){return Promise.resolve();} }; },
    firestore:function(){ var db=function(){}; db.collection=function(n){ return q.collection(n); }; return db; },
    storage:function(){ return { ref:function(){ return { put:function(){ return {on:function(){}}; } }; }, refFromURL:function(){ return {delete:function(){return Promise.resolve();}}; } }; }
  };
  window.firebase.firestore.FieldValue = { serverTimestamp:function(){return '@ora';}, delete:function(){return '@cancella';} };
})();
`;

(async () => {
  /* Il chromium del container Linux, se c'e'; altrimenti quello che playwright
     si porta dietro. Il percorso fisso valeva solo dentro /opt: fuori (Windows,
     o un container diverso) il banco moriva prima di aprire la pagina, e un
     banco che non parte non e' un banco che passa. */
  const CHROMIUM_CONTAINER = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(
    fs.existsSync(CHROMIUM_CONTAINER) ? { executablePath: CHROMIUM_CONTAINER } : {}
  );
  const file = 'file://' + path.resolve(__dirname, 'marketplace.html');
  const errori = [];
  let esito = 0;

  for (const [tema, larghezza, altezza, nome] of [
    ['light', 390, 844, 'telefono-chiara'],
    ['dark',  390, 844, 'telefono-scura'],
    ['sole',  390, 844, 'telefono-sole'],
    ['light', 1280, 900, 'computer-chiara'],
    ['dark',  1280, 900, 'computer-scura']
  ]) {
    const page = await browser.newPage({ viewport:{ width:larghezza, height:altezza } });
    page.on('pageerror', e => errori.push(nome + ': ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.addInitScript(t => { try{ localStorage.setItem('arctrail3d_state_v3', JSON.stringify({theme:t})); }catch(e){} }, tema);
    await page.goto(file, { waitUntil:'load' });

    await page.evaluate(ads => {
      window.cu = { uid:'u1', email:'io@esempio.it', displayName:'Io' };
      document.getElementById('uav').textContent = 'IO';
      document.body.classList.add('logged');
      showS('secMkt');
      allAds = ads;
      myFavs.add('a2');
      renderAds();
    }, FINTI);

    await page.screenshot({ path: `schermo-${nome}.png`, fullPage:true });

    // La domanda: la scheda dice cos'e' l'oggetto, o solo dove sta?
    const righe = await page.$$eval('.lspecs', n => n.map(x => x.textContent));
    const prezzi = await page.$$eval('.lprice', n => n.map(x => x.textContent));
    if (tema === 'light' && larghezza === 390) {
      console.log('  righe tecniche:');
      righe.forEach(r => console.log('    ' + r));
      console.log('  prezzi: ' + prezzi.join(' | '));
      // Un banco che si schianta funziona e non serve: qui si DICE cosa manca.
      if (righe.length !== 4) errori.push('le righe tecniche non sono 4 ma ' + righe.length);
      const tutte = righe.join(' | ');
      if (!tutte.includes('40 lb')) errori.push('il libraggio non compare sulla scheda');
      if (!tutte.includes('spine 500')) errori.push('lo spine non compare sulla scheda');
      if (!tutte.includes('sinistro')) errori.push('la mano non compare sulla scheda');
      if (prezzi.some(p => p.trim() === '€ 0')) errori.push('un "Cerco" stampa ancora € 0');
      if (!prezzi.some(p => p.includes('max'))) errori.push('il budget del "Cerco" non compare');
    }

    // Bersagli sotto i 44 pixel, che e' il pavimento dichiarato nelle note.
    const piccoli = await page.$$eval('button, [role="button"], a.tb-back', ns => ns
      .filter(n => n.offsetParent !== null)
      .map(n => { const r = n.getBoundingClientRect(); return { c: (n.className||'').toString().slice(0,40), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter(o => o.w > 0 && (o.h < 36 || o.w < 24)));
    if (piccoli.length) console.log('  bersagli piccoli (' + nome + '):', JSON.stringify(piccoli));

    // Il tema e' arrivato davvero fin qui?
    const cls = await page.evaluate(() => document.documentElement.className);
    const fondo = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--surface').trim());
    const barra = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').getAttribute('content'));
    console.log(`${nome}: html.${cls} · --surface ${fondo} · barra ${barra}`);
    if (cls !== 'theme-' + tema) errori.push(nome + ': il tema non e\' stato applicato');
    if (barra !== fondo) errori.push(nome + ': la barra del browser non segue il foglio di stile');

    await page.close();
  }

  // ── Seconda parte: tre cose che si vedono solo usando la pagina ──────────
  {
    const page = await browser.newPage({ viewport:{ width:390, height:844 } });
    page.on('pageerror', e => errori.push('parte 2: ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.goto(file, { waitUntil:'load' });
    await page.evaluate(ads => {
      window.cu = { uid:'u1', email:'io@esempio.it', displayName:'Io' };
      allAds = ads; showS('secMkt');
    }, FINTI);

    // 1) Il modulo di modifica si vede, aprendolo da "I miei annunci"?
    //    (Prima stava DIETRO la schermata a tutto schermo, e il tocco sembrava
    //     non fare niente. Nessun errore, nessuna traccia.)
    const modulo = await page.evaluate(() => {
      openFS('fsMyAds');
      openEditAd('a1');
      const b = document.getElementById('shForm').getBoundingClientRect();
      const y = Math.max(1, Math.min(innerHeight - 2, Math.round(b.top + 40)));
      const sopra = document.elementFromPoint(Math.round(b.left + b.width/2), y);
      return { visibile: !!(sopra && sopra.closest('#ovForm')),
               chi: sopra ? (sopra.id || sopra.className || sopra.tagName) : 'niente' };
    });
    console.log('modulo di modifica sopra la schermata: ' + modulo.visibile + ' (sopra: ' + modulo.chi + ')');
    if (!modulo.visibile) errori.push('il modulo di modifica resta dietro "I miei annunci": ci sta sopra ' + modulo.chi);
    await page.evaluate(() => { closeOv('ovForm'); closeFS('fsMyAds'); });

    // 2) Le ricerche salvate contano, e adesso BUSSANO: quelle accese devono
    //    salire su market_searches, perche' e' li' che la Cloud Function
    //    guarda. Una ricerca che resta sul telefono e' di nuovo "Avvisi
    //    attivi": la vecchia bugia, con un nome nuovo.
    const sav = await page.evaluate(async () => {
      savedS = [{ q:'hoyt', active:true, lastSeen: Date.now() - 7200e3 },
                { q:'easton', active:false, lastSeen: 0 }];
      renderAds();
      const badge = document.getElementById('savB');
      window.__SCRITTO = [];
      saveSavCloud();
      await new Promise(r => setTimeout(r, 60));
      const salita = (window.__SCRITTO||[]).find(x => x[2] === 'market_searches');
      openSavSearches();
      const testo = document.getElementById('savList').textContent;
      return { conto: badge.textContent, acceso: badge.classList.contains('show'),
               salita: salita ? salita[1] : null,
               prometteAvviso: /notifica|avviso/i.test(testo),
               diceCheNonNotifica: /non arriva ancora nessuna notifica/i.test(testo),
               promettevaAvvisi: /avvisi attivi/i.test(testo) };
    });
    console.log('campanella: ' + sav.conto + ' (visibile ' + sav.acceso + ')');
    console.log('sale su market_searches: ' + JSON.stringify(sav.salita && sav.salita.queries) + ' · lingua ' + (sav.salita && sav.salita.lang));
    // "hoyt" e' su un annuncio di un'ora fa -> 1. "easton" e' spenta -> 0.
    if (sav.conto !== '1' || !sav.acceso) errori.push('la campanella non conta i nuovi (dice "' + sav.conto + '")');
    if (!sav.salita) errori.push('le ricerche salvate non salgono su market_searches: nessun avviso puo\' partire');
    else {
      const qs = sav.salita.queries || [];
      if (qs.indexOf('hoyt') < 0) errori.push('la ricerca accesa non e\' finita nell\'elenco che sale');
      if (qs.indexOf('easton') >= 0) errori.push('una ricerca SPENTA sale lo stesso: l\'interruttore non spegne niente');
      if (!sav.salita.lang) errori.push('l\'elenco sale senza la lingua: la notifica arriverebbe in italiano a tutti');
    }
    if (!sav.prometteAvviso) errori.push('la schermata non dice piu\' che arriva un avviso');
    if (sav.diceCheNonNotifica) errori.push('c\'e\' ancora scritto che le notifiche non arrivano, e adesso arrivano');
    if (sav.promettevaAvvisi) errori.push('c\'e\' ancora scritto "Avvisi attivi", che non e\' vero');
    await page.evaluate(() => closeFS('fsSav'));

    // 2b) Le due frasi che si dicono solo quando si SA:
    //     — notifiche del telefono spente -> l'avviso resta dentro l'app;
    //     — elenco non salito -> l'avviso non parte affatto.
    //     E soprattutto: quando le notifiche sono accese, la prima NON si dice.
    const stati = await page.evaluate(async () => {
      const leggi = () => document.getElementById('savList').textContent;
      const attesa = () => new Promise(r => setTimeout(r, 80));

      window.__DOC = {};                       // users/{uid} senza fcmToken
      savCloud = null; pushOn = null;
      loadSav(); await attesa(); openSavSearches();
      const spente = leggi();

      window.__DOC = { users: { fcmToken: 'abc' } };
      savCloud = null; pushOn = null;
      loadSav(); await attesa(); openSavSearches();
      const accese = leggi();

      window.__FALLISCI_SET = 'market_searches';
      saveSavCloud(); await attesa(); openSavSearches();
      const rifiutato = leggi();
      window.__FALLISCI_SET = null;

      return { spente: /non sono accese/i.test(spente),
               acceseNonLoDice: !/non sono accese/i.test(accese),
               rifiutato: /solo su questo telefono/i.test(rifiutato) };
    });
    console.log('notifiche spente lo dice: ' + stati.spente + ' · accese tace: ' + stati.acceseNonLoDice + ' · elenco non salito lo dice: ' + stati.rifiutato);
    if (!stati.spente) errori.push('le notifiche del telefono sono spente e la schermata non lo dice');
    if (!stati.acceseNonLoDice) errori.push('le notifiche sono accese e la schermata dice lo stesso che sono spente');
    if (!stati.rifiutato) errori.push('l\'elenco non e\' salito e la schermata promette gli avvisi lo stesso');
    await page.evaluate(() => { closeFS('fsSav'); savedS = []; savCloud = null; pushOn = null; });

    // 3) Una recensione si puo' lasciare, e solo dopo un'offerta accettata.
    const rec = await page.evaluate(async () => {
      window.__MSG = [{ id:'m1', type:'offer', amount:600, senderUid:'u2', status:'accepted', createdAt:new Date() }];
      openMsgs();
      openChat('c1', { id:'c1', participants:['u1','u2'], participantNames:{u1:'Io',u2:'Marco B.'},
                       adId:'a1', adTitle:'Ricurvo Hoyt Satori 40lb', adPrice:680, adPhoto:'' });
      const tasto = Array.from(document.querySelectorAll('#chatBody button'))
        .find(b => /recensione/i.test(b.textContent));
      if (!tasto) return { tasto:false };
      tasto.click();
      await new Promise(r => setTimeout(r, 120));
      return { tasto:true, sheetAperto: document.getElementById('ovRev').classList.contains('open'),
               chi: document.getElementById('revSub').textContent };
    });
    console.log('recensione dalla chat: tasto ' + rec.tasto + ' · foglio ' + rec.sheetAperto + ' · "' + (rec.chi||'') + '"');
    if (!rec.tasto) errori.push('dopo un\'offerta accettata non c\'e\' modo di lasciare una recensione');
    else {
      if (!rec.sheetAperto) errori.push('il tasto della recensione non apre niente');
      if (!/Marco B\./.test(rec.chi || '')) errori.push('la recensione non punta all\'altra persona');
    }

    // La porta NON deve esserci su un'offerta ancora in attesa.
    const presto = await page.evaluate(() => {
      closeOv('ovRev');
      window.__MSG = [{ id:'m2', type:'offer', amount:600, senderUid:'u2', status:'pending', createdAt:new Date() }];
      openChat('c1', { id:'c1', participants:['u1','u2'], participantNames:{u1:'Io',u2:'Marco B.'}, adId:'a1', adTitle:'x', adPrice:1 });
      return Array.from(document.querySelectorAll('#chatBody button')).some(b => /recensione/i.test(b.textContent));
    });
    if (presto) errori.push('si puo\' recensire un\'offerta ancora in attesa: non e\' uno scambio, e\' un voto');
    console.log('recensione prima dell\'accordo: ' + (presto ? 'SI (sbagliato)' : 'no'));

    await page.close();
  }

  // ── Terza parte: le nove lingue ──────────────────────────────────────────
  // La domanda non e' "e' tradotto?" ma: la lingua dell'app arriva fin qui, e
  // NIENTE resta indietro in italiano? Una schermata mezza tradotta e' peggio
  // di una tutta italiana: sembra un errore di chi guarda.
  for (const [lang, attesa, vietata] of [
    ['sv', 'Ny annons', 'Nuovo annuncio'],
    ['nl', 'Nieuwe advertentie', 'Nuovo annuncio'],
    ['ru', 'Новое объявление', 'Nuovo annuncio'],
    ['tr', 'Yeni ilan', 'Nuovo annuncio']
  ]) {
    const page = await browser.newPage({ viewport:{ width:390, height:844 } });
    page.on('pageerror', e => errori.push(lang + ': ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.addInitScript(l => { try{ localStorage.setItem('arctrail3d_state_v3', JSON.stringify({lang:l})); }catch(e){} }, lang);
    await page.goto(file, { waitUntil:'load' });
    const r = await page.evaluate(ads => {
      window.cu = { uid:'u1', email:'io@esempio.it', displayName:'Io' };
      allAds = ads; showS('secMkt');
      document.getElementById('bnav').style.display = 'flex';
      renderAds();
      return { lingua: LANG, htmlLang: document.documentElement.getAttribute('lang'),
               testo: document.body.innerText, chiaviRotte: (document.body.innerText.match(/\b[a-z]+_[a-z_]+\b/g) || []) };
    }, FINTI);
    const ok = r.testo.indexOf(attesa) >= 0, resti = r.testo.indexOf(vietata) >= 0;
    console.log(lang + ': LANG=' + r.lingua + ' · html lang=' + r.htmlLang + ' · «' + attesa + '» ' + (ok ? 'c\'e\'' : 'MANCA'));
    if (r.lingua !== lang) errori.push(lang + ': la lingua dell\'app non arriva al mercatino');
    if (!ok) errori.push(lang + ': manca «' + attesa + '»');
    if (resti) errori.push(lang + ': e\' rimasto dell\'italiano a schermo («' + vietata + '»)');
    if (r.chiaviRotte.length) errori.push(lang + ': chiavi non tradotte a schermo: ' + r.chiaviRotte.slice(0,5).join(', '));
    if (lang === 'sv') await page.screenshot({ path:'schermo-svedese.png', fullPage:true });
    await page.close();
  }

  // ── Quarta parte: i difetti trovati nella revisione ──────────────────────
  {
    const page = await browser.newPage({ viewport:{ width:390, height:844 } });
    page.on('pageerror', e => errori.push('parte 4: ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.goto(file, { waitUntil:'load' });
    await page.evaluate(ads => {
      window.cu = { uid:'u1', email:'io@esempio.it', displayName:'Io' };
      allAds = ads; showS('secMkt'); renderAds();
    }, FINTI);

    // A) Sul profilo di un venditore CON recensioni gli annunci si aprono?
    //    (I listener venivano buttati via da un innerHTML += successivo.)
    const pro = await page.evaluate(async () => {
      revCache['u2'] = { list:[{fromName:'Anna', rating:5, text:'tutto bene', createdAt:new Date()}], count:1, avg:5 };
      openPro('u2', 'Marco B.');
      await new Promise(r => setTimeout(r, 80));
      const card = document.querySelector('#proAds .lcard');
      if (!card) return { scheda:false };
      card.click();
      await new Promise(r => setTimeout(r, 60));
      const aperto = document.getElementById('ovDet').classList.contains('open');
      closeOv('ovDet'); closeFS('fsPro');
      return { scheda:true, aperto:aperto, recensioni: !!document.querySelector('#proAds .review-card') };
    });
    console.log('profilo venditore: scheda ' + pro.scheda + ' · recensioni ' + pro.recensioni + ' · si apre ' + pro.aperto);
    if (!pro.scheda) errori.push('sul profilo del venditore non compare nessuna scheda');
    else if (!pro.recensioni) errori.push('sul profilo del venditore non compaiono le recensioni');
    else if (!pro.aperto) errori.push('sul profilo di un venditore CON recensioni gli annunci non si aprono');

    // B) Salvare una modifica NON rimette in vendita un annuncio venduto,
    //    e NON lascia attaccati i dati della categoria di prima.
    const salva = await page.evaluate(async () => {
      window.__SCRITTO = [];
      adCache['v1'] = { id:'v1', type:'vendo', title:'Arco venduto', category:'arco', marca:'HOYT',
                        arcoTipo:'compound', lb:60, draw:29, mano:'dx', condition:'ottimo',
                        price:900, status:'sold', photos:[], sellerUid:'u1' };
      openEditAd('v1');
      document.getElementById('fCat').value = 'frecce'; updCatS();   // da archi a frecce
      document.getElementById('btnSave').click();
      await new Promise(r => setTimeout(r, 120));
      const w = (window.__SCRITTO.find(x => x[0] === 'update') || [])[1] || {};
      closeOv('ovForm');
      return { chiavi:Object.keys(w), status:w.status, lb:w.lb, arcoTipo:w.arcoTipo, marca:w.marca };
    });
    console.log('salvataggio: status=' + salva.status + ' · lb=' + salva.lb + ' · arcoTipo=' + salva.arcoTipo);
    if (salva.status !== undefined) errori.push('salvare una modifica riscrive lo stato: un annuncio venduto torna in vendita');
    if (salva.lb !== '@cancella') errori.push('cambiando categoria il libraggio resta attaccato (lb=' + salva.lb + ')');
    if (salva.arcoTipo !== '@cancella') errori.push('cambiando categoria il tipo arco resta attaccato');

    // C) Un proprio annuncio venduto non entra nell'elenco pubblico.
    const pubblico = await page.evaluate(() => allAds.some(a => a.id === 'v1'));
    console.log('annuncio venduto nell\'elenco pubblico: ' + pubblico);
    if (pubblico) errori.push('un proprio annuncio venduto e\' finito nell\'elenco pubblico');

    // D) Chiudendo un pannello sopra un altro, il fondo resta bloccato.
    const fondo = await page.evaluate(() => {
      openFS('fsMyAds'); openOv('ovForm');
      const conDue = document.body.style.overflow;
      closeOv('ovForm');
      const conUno = document.body.style.overflow;   // fsMyAds e' ancora aperto
      closeFS('fsMyAds');
      const conZero = document.body.style.overflow;
      return { conDue, conUno, conZero };
    });
    console.log('fondo: due pannelli «' + fondo.conDue + '» · uno «' + fondo.conUno + '» · nessuno «' + fondo.conZero + '»');
    if (fondo.conUno !== 'hidden') errori.push('chiudendo un pannello il fondo si sblocca mentre sotto ce n\'e\' ancora uno aperto');
    if (fondo.conZero === 'hidden') errori.push('chiuso tutto, il fondo resta bloccato');

    // E) Uscendo si porta via i preferiti e le ricerche di chi esce.
    const uscita = await page.evaluate(async () => {
      myFavs.add('a1'); savedS = [{q:'hoyt',active:true,lastSeen:0}];
      doSignOut();
      await new Promise(r => setTimeout(r, 80));
      return { favs: myFavs.size, sav: savedS.length, cu: !!window.cu };
    });
    console.log('dopo l\'uscita: preferiti ' + uscita.favs + ' · ricerche ' + uscita.sav);
    if (uscita.favs || uscita.sav) errori.push('uscendo restano i preferiti o le ricerche salvate del precedente');

    await page.close();
  }

  /* ── LA BARRA DELLE ICONE: SI RAGGIUNGE SEMPRE? ──────────────────────────
     Non si chiede «che z-index ha», si chiede «un dito sull'icona la colpisce
     davvero». `elementFromPoint` risponde a quella domanda: se sopra c'e' una
     finestra, il dito prende la finestra e la barra e' decorativa.
     Le quattro voci sono sorelle: da qualunque sezione, un tocco solo. Il
     banco lo verifica arrivandoci DA DENTRO una sezione, che e' il caso che
     prima non funzionava. */
  for (const [larghezza, altezza, dove] of [[390, 844, 'telefono'], [1280, 900, 'computer']]) {
    const page = await browser.newPage({ viewport:{ width:larghezza, height:altezza } });
    page.on('pageerror', e => errori.push('barra-' + dove + ': ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.goto(file, { waitUntil:'load' });
    await page.evaluate(ads => {
      window.cu = { uid:'u1', email:'io@esempio.it', displayName:'Io' };
      document.body.classList.add('logged');
      showS('secMkt'); allAds = ads; renderAds();
    }, FINTI);

    const colpita = () => page.evaluate(() => {
      var b = document.getElementById('navMsg').getBoundingClientRect();
      if (b.width === 0) return 'la barra non si vede';
      var e = document.elementFromPoint(b.left + b.width/2, b.top + b.height/2);
      return (e && e.closest('#navMsg')) ? 'colpita' : 'coperta da ' + (e ? (e.id || e.className || e.tagName) : 'niente');
    });

    const aperto = () => page.evaluate(() =>
      ['fsMyAds','fsFavs','fsMsgs','fsPro','fsSav'].filter(function(x){
        return document.getElementById(x).classList.contains('open'); }));

    // A) A riposo la barra c'e', e non perche' qualcuno le ha scritto uno stile.
    const inLinea = await page.evaluate(() => document.getElementById('bnav').getAttribute('style') || '');
    if (inLinea.indexOf('display') > -1) errori.push(dove + ': la barra si accende con uno stile in linea, non da body.logged');
    console.log(dove + ' — a riposo: ' + await colpita());

    // B) Dentro una sezione la barra si raggiunge ancora.
    await page.evaluate(() => { document.getElementById('navFav').click(); });
    const dentro = await colpita();
    console.log(dove + ' — dentro Preferiti: ' + dentro + ' · aperte: ' + JSON.stringify(await aperto()));
    if (dentro !== 'colpita') errori.push(dove + ': dentro una sezione la barra non si tocca (' + dentro + ')');

    // C) Da una sezione all'altra con un tocco, e senza lasciare pile dietro.
    await page.evaluate(() => { document.getElementById('navMsg').click(); });
    const pila = await aperto();
    console.log(dove + ' — da Preferiti a Messaggi: aperte ' + JSON.stringify(pila));
    if (pila.length !== 1 || pila[0] !== 'fsMsgs') errori.push(dove + ': passando di sezione resta una pila ' + JSON.stringify(pila));

    // D) Nella conversazione: da telefono la barra si toglie (c'e' il campo di
    //    scrittura in fondo), da computer resta perche' vive nella testata.
    await page.evaluate(() => {
      openChat('c1', { participantNames:{ u1:'Io', u2:'Marco B.' }, adTitle:'Ricurvo', adPrice:680 });
    });
    const inChat = await page.evaluate(() => {
      var b = document.getElementById('navMsg').getBoundingClientRect();
      return b.width === 0 ? 'nascosta' : 'visibile';
    });
    console.log(dove + ' — in conversazione: barra ' + inChat);
    const atteso = (dove === 'telefono') ? 'nascosta' : 'visibile';
    if (inChat !== atteso) errori.push(dove + ': in chat la barra e\' ' + inChat + ', attesa ' + atteso);

    // E) Uscendo dalla conversazione la barra torna.
    await page.evaluate(() => { chiudiChat(); });
    const dopo = await colpita();
    console.log(dove + ' — usciti dalla conversazione: ' + dopo);
    if (dopo !== 'colpita') errori.push(dove + ': uscendo dalla chat la barra non torna (' + dopo + ')');

    await page.screenshot({ path: 'barra-' + dove + '.png' });
    await page.close();
  }

  /* ── LE SEGNALAZIONI ARRIVANO A DESTINAZIONE? ────────────────────────────
     Fino al 18/08 questa raccolta era scritta e mai letta. Il banco chiede le
     tre cose che rendono una segnalazione utile: che si veda, che si possa
     chiudere, e che se la regola Firestore non lascia leggere lo DICA invece
     di mostrare una pagina vuota. */
  {
    const page = await browser.newPage({ viewport:{ width:390, height:844 } });
    page.on('pageerror', e => errori.push('segnalazioni: ' + e.message));
    await page.route('**/*gstatic.com/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ status:200, contentType:'text/css', body:'' }));
    await page.addInitScript(FINTO_FIREBASE);
    await page.goto(file, { waitUntil:'load' });

    const ORA = new Date();
    await page.evaluate(ora => {
      window.__RIGHE = { market_reports: [
        { id:'r1', adId:'a1', reason:'spam', fromUid:'u9', adTitle:'Compound a 20 euro',
          adSellerName:'Tizio X', adPrice:20, adStatus:'active', stato:'aperta', createdAt:new Date(ora) },
        { id:'r2', adId:'a2', reason:'photo', fromUid:'u8', adTitle:'Frecce usate',
          adSellerName:'Caio Y', adPrice:50, adStatus:'sold', stato:'chiusa', createdAt:new Date(ora) }
      ] };
    }, ORA.toISOString());

    // A) Chi non tiene l'app non vede la voce nel menu.
    await page.evaluate(() => {
      window.cu = { uid:'u1', email:'qualcuno@esempio.it', displayName:'Uno' };
      document.body.classList.add('logged'); showS('secMkt');
      document.getElementById('uav').click();
    });
    await page.waitForTimeout(150);
    const vociUtente = await page.locator('#shActC .a-opt').allTextContents();
    console.log('menu di un utente qualsiasi: ' + JSON.stringify(vociUtente));
    if (vociUtente.some(v => v === 'Segnalazioni')) errori.push('un utente qualsiasi vede la voce Segnalazioni');

    // B) Chi tiene l'app la vede, e l'elenco si popola.
    await page.evaluate(() => {
      closeOv('ovAct');
      window.cu = { uid:'u1', email:'alessandro.zanetta80@gmail.com', displayName:'A' };
      openSegnalazioni();
    });
    await page.waitForTimeout(250);
    const vista = await page.evaluate(() => ({
      aperta: document.getElementById('fsRep').classList.contains('open'),
      titoli: [...document.querySelectorAll('#repList .saved-q')].map(x => x.textContent),
      motivo: (document.querySelector('#repList .saved-meta b') || {}).textContent || '',
      tastiChiudi: document.querySelectorAll('#repList [data-chiudi]').length
    }));
    console.log('segnalazioni: ' + JSON.stringify(vista.titoli) + ' · motivo «' + vista.motivo
      + '» · da chiudere ' + vista.tastiChiudi);
    if (!vista.aperta) errori.push('la finestra delle segnalazioni non si apre');
    if (vista.titoli.length !== 2) errori.push('l\'elenco segnalazioni non mostra le righe');
    if (vista.motivo !== 'spam o truffa') errori.push('il motivo resta un codice invece di una frase: ' + vista.motivo);
    if (vista.tastiChiudi !== 1) errori.push('il tasto «gestita» compare anche sulle chiuse, o manca sulle aperte');

    // C) Chiudere una segnalazione la scrive davvero.
    await page.evaluate(() => { window.__SCRITTO = []; });
    await page.locator('#repList [data-chiudi]').first().click();
    await page.waitForTimeout(250);
    const chiusura = await page.evaluate(() => (window.__SCRITTO||[]).find(x => x[0] === 'update') || []);
    console.log('chiusura scritta: ' + JSON.stringify(chiusura[1] || null) + ' su ' + (chiusura[2] || '-'));
    if (!chiusura[1] || chiusura[1].stato !== 'chiusa') errori.push('segnare come gestita non scrive lo stato');

    // D) Se la regola non lascia leggere, lo dice. Una pagina bianca sarebbe
    //    la stessa cosa di prima: silenzio.
    await page.evaluate(() => { window.__RIFIUTA = 'market_reports'; openSegnalazioni(); });
    await page.waitForTimeout(250);
    const muto = await page.evaluate(() => document.getElementById('repList').textContent);
    console.log('con la regola chiusa dice: «' + muto.replace(/\s+/g,' ').trim().slice(0,80) + '»');
    if (muto.indexOf('permission') === -1 && muto.indexOf('Non riesco') === -1)
      errori.push('regola chiusa: la schermata resta muta invece di dire perche\'');

    await page.close();
  }

  await browser.close();
  if (errori.length) { esito = 1; console.log('\nNON VA:'); errori.forEach(e => console.log('  - ' + e)); }
  else console.log('\nTutte le prove passate.');
  process.exit(esito);
})();
