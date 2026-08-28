/* banco-porta.js — la porta dell'app, in nove lingue e su due larghezze.
 *
 * NASCE IL 25/08/2026, dopo lo scambio della radice. Questa schermata sta in
 * mezzo fra la vetrina e l'app, e le cose che protegge NON SI ROMPONO se
 * tornano indietro: la pagina resta bella, e torna solo quella di prima.
 *
 *  1. Le due righe che dicono dove sei devono esserci, in tutte le lingue.
 *     Erano scritte per `setupScreen()` e li' non si vedono quasi mai
 *     (`if(!state.lang)`): se qualcuno le toglie di qui, tornano morte.
 *  2. Un riquadro pieno solo, e uno di bordo. Tre tasti uguali non hanno un
 *     ordine, ed e' il difetto da cui questa schermata e' partita.
 *  3. «Indietro» PORTA DAVVERO ALLA VETRINA. Fino al 26/08 questa riga si
 *     accontentava di cercare un pezzo di sorgente con un'espressione
 *     regolare: ha detto di si' per due giorni su un tasto che sullo
 *     schermo non faceva niente, perche' la vetrina rispediva indietro chi
 *     ci arrivava. Un banco che guarda il codice non puo' vedere una cosa
 *     che succede fra due pagine. Adesso serve i due file su un server
 *     vero, preme, e guarda dove si e' finiti — anche dopo una ricarica.
 *  5. E c'e' anche quando l'app e' aperta dall'icona: la' dentro e' l'unica
 *     porta verso la vetrina, e prima spariva proprio li'.
 *  4. Il tedesco e' un terzo piu' lungo dell'italiano: la coppia di tasti
 *     deve stare in riga o scendere INTERA, mai storta.
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const FILE = process.argv[2] || 'app.html';
const LINGUE = ["it","en","fr","de","tr","ru","es","sv","nl"];
const SCHERMI = [{nome:"telefono",width:390,height:844},{nome:"computer",width:1200,height:900}];
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'porta-'));
fs.writeFileSync(path.join(D,'app.html'),
  fs.readFileSync(FILE,'utf8').replace('var DEV_MODE = false;','var DEV_MODE = true;'));
['compagnie-data.js','logo.webp','logo.jpg','index.html'].forEach(x=>{
  const p = path.join(path.dirname(path.resolve(FILE)), x);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(D,x));
});
/* SU UN SERVER, NON SU `file://`. Il viaggio da provare passa per un
   indirizzo con un `?` dentro, e su `file://` una query non si comporta
   come sul sito: si proverebbe una cosa vicina a quella che interessa. */
const MIME = {'.html':'text/html','.js':'text/javascript','.json':'application/json',
              '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
const server = http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const f = path.join(D, u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'text/plain'});
  res.end(fs.readFileSync(f));
});
const PORTA_TCP = 8731;
const BASE = 'http://127.0.0.1:' + PORTA_TCP;
const STATO_BASE = { screen:"menu", tab:"tira", pendingArchers:[], country:"it",
  federation:"fiarc", theme:"light", profileSkipped:false, profile:null };
/* `display-mode: standalone` non si puo' chiedere a playwright: si mette una
   finta davanti a matchMedia, che e' esattamente cio' che l'app interroga. */
const FINTA_ICONA = () => {
  const vero = window.matchMedia.bind(window);
  window.matchMedia = q => (/display-mode:\s*standalone/.test(q)
    ? { matches:true, media:q, addListener(){}, removeListener(){},
        addEventListener(){}, removeEventListener(){} }
    : vero(q));
};
const guai = [];
(async()=>{
  await new Promise(r=>server.listen(PORTA_TCP, '127.0.0.1', r));
  for (const s of SCHERMI) {
    for (const l of LINGUE) {
      const b = await chromium.launch();
      const p = await b.newPage({viewport:{width:s.width,height:s.height}});
      await p.addInitScript(st=>{ localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); },
        { screen:"menu", tab:"tira", pendingArchers:[], lang:l, country:"it",
          federation:"fiarc", theme:"light", profileSkipped:false, profile:null });
      await p.goto('file://'+path.join(D,'app.html'));
      await p.waitForTimeout(900);
      const m = await p.evaluate(()=>{
        const porta = document.querySelector('.porta');
        if (!porta) return null;
        const c = [...document.querySelectorAll('.porta .coppia .btn')];
        const cime = new Set(c.map(x=>Math.round(x.getBoundingClientRect().top)));
        return {
          occhiello: (porta.querySelector('.occhiello')||{}).textContent||'',
          titolo:    (porta.querySelector('h1')||{}).textContent||'',
          guida:     (porta.querySelector('.guida')||{}).textContent||'',
          coppia:    c.map(x=>x.className+'|'+x.textContent.trim()),
          file:      cime.size,
          larghi:    c.map(x=>Math.round(x.getBoundingClientRect().width)),
          sporge:    Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth)
        };
      });
      if (!m) { guai.push(`[${s.nome}/${l}] la porta non c'e' proprio`); await b.close(); continue; }
      if (!m.titolo.trim()) guai.push(`[${s.nome}/${l}] il titolo e' vuoto`);
      if (!m.guida.trim())  guai.push(`[${s.nome}/${l}] la riga che spiega e' vuota`);
      if (l !== 'it' && /segnapunti per il tiro/i.test(m.titolo))
        guai.push(`[${s.nome}/${l}] il titolo e' rimasto in italiano`);
      const pieni = m.coppia.filter(x=>/btn-argilla/.test(x));
      if (pieni.length !== 1)
        guai.push(`[${s.nome}/${l}] i tasti pieni sono ${pieni.length}, ne deve esserci uno solo`);
      if (m.coppia.length !== 2)
        guai.push(`[${s.nome}/${l}] nella coppia ci sono ${m.coppia.length} tasti invece di 2`);
      // o in riga, o scesi tutti e due: mai uno lungo e uno corto sotto
      if (m.file !== 1 && new Set(m.larghi).size !== 1)
        guai.push(`[${s.nome}/${l}] i due tasti sono su ${m.file} file e di larghezza diversa: ${m.larghi.join('/')}`);
      // I DUE TASTI SONO LARGHI UGUALI, e non «quasi». Con `flex-basis:auto`
      // erano diversi — piu' largo quello con la parola piu' lunga — e in
      // italiano la differenza era di pochi pixel, cioe' invisibile.
      // In russo era 231 contro 102.
      if (new Set(m.larghi).size !== 1)
        guai.push(`[${s.nome}/${l}] i due tasti sono larghi ${m.larghi.join(' e ')}, devono essere uguali`);
      if (m.sporge > 1)
        guai.push(`[${s.nome}/${l}] la pagina sporge di ${m.sporge}px`);
      await b.close();
    }
  }
  /* ══ SI PREME, E SI GUARDA DOVE SI FINISCE ══════════════════════════
     Tre scene, e la terza e' quella che il 26/08 mancava:
       a) dal browser        — deve aprirsi la vetrina
       b) dall'icona         — il tasto deve ESSERCI, e la vetrina RESTARE
       c) ricaricando        — deve restare anche dopo, se no il rimbalzo
                               torna con un passo in piu'
       d) sessione nuova dall'icona, senza `da=app` — deve saltare all'app,
          perche' chi ha installato prima del 25/08 parte dalla radice. */
  const vetrinaAperta = p => p.evaluate(()=>
    !!document.querySelector('[data-k=\"eroe_h1_a\"]') ||
    /vetrina|eroe/.test((document.body.className||'')));
  async function scena(nome, icona){
    const b = await chromium.launch();
    const ctx = await b.newContext({viewport:{width:390,height:844}});
    const p = await ctx.newPage();
    if (icona) await p.addInitScript(FINTA_ICONA);
    await p.addInitScript(st=>{ localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st)); },
      Object.assign({}, STATO_BASE, {lang:"it"}));
    await p.goto(BASE + '/app.html');
    await p.waitForTimeout(900);
    const tasto = p.locator('.porta .piede .btn').last();
    if (await tasto.count() === 0){
      guai.push(`[${nome}] il tasto per la vetrina non c'e' proprio`);
      await b.close(); return null;
    }
    const dove = await tasto.getAttribute('href');
    if (!dove) guai.push(`[${nome}] il tasto non e' un collegamento: senza href non si puo' tenere premuto per vedere dove va, e se il copione si ferma non porta da nessuna parte`);
    else {
      if (dove.charAt(0) === '/') guai.push(`[${nome}] il collegamento parte da una barra (${dove}): fuori da arctrail3d.com porta fuori dal sito`);
      if (dove.indexOf('da=app') < 0) guai.push(`[${nome}] il collegamento non porta da=app: la vetrina lo rispedira' indietro`);
      if (dove.indexOf('lang=it') < 0) guai.push(`[${nome}] il collegamento non si porta dietro la lingua`);
    }
    await tasto.click();
    await p.waitForTimeout(1800);
    if (!await vetrinaAperta(p))
      guai.push(`[${nome}] premuto il tasto non si e' finiti sulla vetrina: ${p.url()}`);
    await p.reload();
    await p.waitForTimeout(1500);
    if (!await vetrinaAperta(p))
      guai.push(`[${nome}] la vetrina non regge una ricarica: ${p.url()}`);
    await b.close();
    return true;
  }
  await scena('browser', false);
  await scena('icona', true);
  {
    const b = await chromium.launch();
    const p = await b.newPage({viewport:{width:390,height:844}});
    await p.addInitScript(FINTA_ICONA);
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(1600);
    if (p.url().indexOf('app.html') < 0)
      guai.push(`chi apre dall'icona senza da=app non salta piu' all'app: ${p.url()} — chi ha installato prima del 25/08 trova una cartolina al posto del segnapunti`);
    await b.close();
  }

  // e le cose che si vedono solo nel sorgente
  const src = fs.readFileSync(FILE,'utf8');
  /* C11 — UN ALFABETO SOLO. Il triangolo dell'avviso era un'emoji, che ogni
     telefono disegna a modo suo: stava accanto a una punta di freccia
     disegnata da noi, nella stessa schermata e a due centimetri di distanza. */
  if (/home_dev_title: "\\u26a0|home_dev_title: "\u26a0/.test(src))
    guai.push(`l'emoji del triangolo e' tornata dentro home_dev_title`);
  /* Si chiede il collegamento RELATIVO: una barra iniziale porta alla radice
     del dominio, quindi fuori dal sito ovunque il sito non stia sul dominio
     nudo — ed e' come il tasto si e' rotto il 25/08. */
  if (/state\.lang = null; save\(\); render\(\);[\s\S]{0,80}back_step/.test(src))
    guai.push(`«Indietro» e' tornato ad azzerare la lingua`);

  /* ══ IL MARCHIO IN CIMA E' LA PORTA CHE ALESSANDRO PREMEVA ═══════════════
     (26/08/2026.) Per un giorno intero il tasto «alla vetrina» e' stato
     cercato in tre punti sbagliati, perche' nessuno aveva chiesto QUALE
     tasto stesse premendo. Era il marchio: agganciato alla scheda Home il
     25/08, quando la home del sito e l'app erano la stessa pagina, e rimasto
     li' dopo che la radice e' diventata la vetrina. Premuto sulla Home non
     faceva niente — nessun errore, nessun segnale.
     Questo banco lo preme in tre scene. */
  {
    const scene = [['browser', false, 'home'], ['icona', true, 'home'], ['browser', false, 'campi']];
    const bm = await chromium.launch();
    for (const [nome, icona, tab] of scene) {
      const ctx = await bm.newContext({viewport:{width:390,height:844}});
      const p = await ctx.newPage();
      if (icona) await p.addInitScript(FINTA_ICONA);
      await p.addInitScript(st=>{ localStorage.setItem("arctrail3d_state_v3", JSON.stringify(st));
                                  localStorage.setItem("arctrail3d_welcome_v2","1"); },
        Object.assign({}, STATO_BASE, { lang:"it", tab:tab,
          profile:{ nomeCognome:"Alessandro Zanetta", username:"ale_01verb", compagnia:"01VERB" } }));
      await p.goto(BASE + '/app.html');
      await p.waitForTimeout(1200);
      const a = await p.evaluate(()=>{
        const x = document.querySelector('header.top a.brandblock');
        return x ? x.getAttribute('href') : null;
      });
      const dove = `[marchio/${nome}/${tab}]`;
      if (!a) { guai.push(`${dove} il marchio non e' un collegamento: premuto non fa niente`); await ctx.close(); continue; }
      if (a.indexOf('da=app') < 0) guai.push(`${dove} il marchio non porta da=app: la vetrina lo rispedira' indietro`);
      await p.evaluate(()=>document.querySelector('header.top a.brandblock').click());
      await p.waitForTimeout(2000);
      const sulla = await p.evaluate(()=>!!document.querySelector('[data-k="eroe_h1_a"]'));
      if (!sulla) guai.push(`${dove} premuto il marchio non si e' finiti sulla vetrina: ${p.url()}`);
      await ctx.close();
    }
    await bm.close();
  }
  server.close();

  console.log('\n  ' + FILE);
  if (!guai.length) {
    console.log("  \u2713 nove lingue \u00d7 due larghezze: le due righe ci sono, un tasto pieno");
    console.log("    e uno di bordo, la coppia non si spezza storta.");
    console.log("  \u2713 premuto davvero: dal browser e dall'icona si finisce sulla");
    console.log("    vetrina, ci si resta anche dopo una ricarica, e chi apre");
    console.log("    dall'icona senza da=app salta all'app come prima.\n");
    process.exit(0);
  }
  console.log(`  \u2717 ${guai.length} cose non vanno:\n`);
  for (const g of guai) console.log('    \u00b7 ' + g);
  console.log('');
  process.exit(1);
})();
