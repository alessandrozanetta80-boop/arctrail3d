/* banco-vetrina.js — la vetrina in nove lingue, misurata invece che sperata.
 *
 * Le nove lingue non sono nove traduzioni: sono nove composizioni diverse.
 * Il tedesco e' piu' lungo dell'italiano di un buon terzo, il turco attacca
 * parole che altrove sono due. Guarda quattro cose che una traduzione rompe
 * senza dire niente:
 *
 *  1. L'H1 dell'eroe ha tre <br> messi a mano. Se una riga va a capo da sola
 *     diventano quattro e la composizione si rompe in silenzio.
 *  2. I due tasti dell'eroe stanno affiancati dentro una colonna stretta.
 *     Se la coppia non ci sta, il secondo scende sotto il primo.
 *  3. Nessuna stringa deve restare in italiano quando la lingua non e'
 *     l'italiano: una chiave dimenticata non da' errore, si vede e basta.
 *  4. Niente deve sporgere di lato: una parola lunga che non va a capo
 *     allarga la pagina e fa comparire lo scorrimento orizzontale.
 */
const { chromium } = require('playwright');
const path = require('path');

const fs = require('fs');

const FILE = process.argv[2] || 'index.html';

/* Finche' la vetrina e' un'anteprima puo' non esserci. Un banco che grida
   perche' manca un file non ancora nato insegna a ignorare i banchi. */
if (!fs.existsSync(FILE)) {
  console.log('\n  ' + FILE + '\n  \u2013 non c\'e\' ancora: salto.\n');
  process.exit(0);
}
/* LE COMPAGNIE DELLE SCHEDE D'ESEMPIO DEVONO ESISTERE. (25/08/2026.)
   Prima i nomi erano inventati; Alessandro ha chiesto quelli veri, e da quel
   momento la vetrina fa un'affermazione verificabile: «questa compagnia sta
   in ArcTrail». Un refuso nel nome o un codice sbagliato non rompono niente
   — la pagina resta bella — ma mandano una persona a cercare in app una
   compagnia che non trovera'. Si legge l'elenco vero e si confronta. */
const FONTE = path.join(path.dirname(path.resolve(FILE)), 'compagnie-data.js');
const VERE = (function(){
  if (!fs.existsSync(FONTE)) return null;
  const t = fs.readFileSync(FONTE, 'utf8');
  const m = {};
  for (const r of t.matchAll(/"([A-Z0-9]+)": \{ nome:"([^"]*)"/g)) m[r[1]] = r[2];
  return m;
})();

const LINGUE = ["it","en","fr","de","tr","ru","es","sv","nl"];
/* LE FEDERAZIONI SI LEGGONO DALL'APP, NON DA UNA COPIA. (27/08/2026, C14.)
   Qui c'era un elenco di sedici sigle scritto a mano — e il commento in
   `index.html` prometteva gia', datato 26/08, che questo banco le leggesse
   da `app.html`. La promessa era scritta e non e' mai stata mantenuta: nello
   stesso giro sono entrate DSB e SFF, NHB e' diventata KHSN e la Russia e'
   uscita dalle scelte. L'elenco a mano ha cominciato a gridare 248 volte a
   ogni giro, e un banco che grida sempre non lo legge piu' nessuno: era
   diventato rumore, cioe' spento.

   TRE TABELLE DELL'APP, E UNA REGOLA SOLA. Una sigla sta in vetrina se si
   puo' SCEGLIERE (`COUNTRY_FEDERATIONS`) e se l'app sa CONTARE con lei
   (`FEDERATIONS`, senza `senzaRegolamento`). Le due condizioni non sono la
   stessa cosa, e la prova e' FIDASC: c'e' come organizzazione, non ha
   barème, e resta fuori. *La vetrina promette punteggi, non nomi.* Chi e'
   `fuoriElenco` — la Russia — cade da sola, perche' fuori dalle scelte vuol
   dire fuori da `COUNTRY_FEDERATIONS` mentre il barème resta nel motore.

   Il giorno che FIDASC prendera' un barème entrera' in vetrina da sola, e
   il giorno che entrera' la federazione numero diciannove questo banco la
   chiedera' senza che nessuno lo riscriva. *Un elenco copiato invecchia il
   giorno dopo e non lo dice a nessuno.* */
const APP = path.join(path.dirname(path.resolve(FILE)), 'app.html');
const DALL_APP = (function(){
  if (!fs.existsSync(APP)) return null;
  const t = fs.readFileSync(APP, 'utf8');
  const motore = t.match(/var FEDERATIONS = \{([\s\S]*?)\n\};/);
  const paesi  = t.match(/var COUNTRY_FEDERATIONS = \{([\s\S]*?)\n\};/);
  const lingue = t.match(/var LANG_TO_COUNTRY = \{([^}]*)\}/);
  if (!motore || !paesi || !lingue) return null;
  /* chi non ha gare non ha un barème da promettere */
  const mute = new Set();
  for (const r of motore[1].matchAll(/^([a-z_]+):\s*\{(.*)\}/gm))
    if (/senzaRegolamento\s*:\s*true/.test(r[2])) mute.add(r[1]);
  const perPaese = {};
  for (const r of paesi[1].matchAll(/^([a-z]{2}):\s*\[(.*)\],?\s*$/gm)){
    const sigle = [];
    for (const f of r[2].matchAll(/\{code:"([^"]+)",\s*label:"([^"]+)"/g))
      if (!mute.has(f[1])) sigle.push(JSON.parse('"' + f[2] + '"'));
    perPaese[r[1]] = sigle;
  }
  const daLingua = {};
  for (const r of lingue[1].matchAll(/([a-z]{2}):"([a-z]{2})"/g)) daLingua[r[1]] = r[2];
  if (!Object.keys(perPaese).length) return null;
  return { perPaese: perPaese, daLingua: daLingua };
})();
/* Se l'app non si legge il banco NON salta: si ferma. Un controllo che non
   puo' dire di no e' spento, e spento in silenzio e' il modo peggiore. */
if (!DALL_APP) {
  console.log('\n  ' + FILE + '\n  \u2717 non riesco a leggere le federazioni da ' + APP +
              '\n    (servono FEDERATIONS, COUNTRY_FEDERATIONS e LANG_TO_COUNTRY)\n');
  process.exit(1);
}
/* TUTTE quelle che la vetrina deve nominare, e LE TUE per ogni lingua.
   Le tue in ordine alfabetico: la vetrina le mette in testa gia' ordinate,
   e un secondo ordine calcolato qui diverge al primo paese con tre. */
const FED_ATTESE = Object.keys(DALL_APP.perPaese)
  .reduce((a, p) => a.concat(DALL_APP.perPaese[p]), []);
const FED_MIE = LINGUE.reduce(function(a, l){
  const paese = DALL_APP.daLingua[l];
  a[l] = ((paese && DALL_APP.perPaese[paese]) || []).slice()
         .sort((x, y) => x.localeCompare(y, "en"));
  return a;
}, {});

/* Quattro larghezze, non due. Le due di mezzo sono quelle dove la testata si
 * stringe: in russo «ОТКРЫТЬ ПРИЛОЖЕНИЕ» e in tedesco «VERBÄNDE» chiedono
 * molto piu' spazio dell'italiano, e il punto in cui la barra cede non e' ne'
 * il telefono ne' il computer largo. */
const SCHERMI = [ {nome:"telefono", width:390,  height:844},
                  {nome:"tavoletta", width:768, height:1024},
                  {nome:"stretto",  width:1024, height:800},
                  {nome:"computer", width:1280, height:900} ];

(async () => {
  const browser = await chromium.launch();
  const guai = [];
  const url = 'file://' + path.resolve(FILE);

  /* PRIMA DI TUTTO: CHI HA L'APP INSTALLATA NON DEVE VEDERE LA VETRINA. (25/08/2026.)
     Dal giorno dello scambio la radice e' questa pagina, e chi ha installato
     l'app prima ha uno start_url che punta ancora qui: preme l'icona e trova
     una cartolina al posto del segnapunti. Il salto e' l'unica cosa fra lui e
     la porta sbagliata finche' il manifest nuovo non gli arriva.
     Sta in cima e non in fondo perche' se la vetrina saltasse via
     davvero, ogni prova qui sotto misurerebbe la pagina sbagliata — o si
     schianterebbe su un elemento che non c'e', stampando una pila invece di
     una frase.
     Playwright non sa fingere `display-mode: standalone`, quindi si prova
     quello che si puo': che la riga esista e che NON scatti in una scheda
     normale di browser — che e' la meta' pericolosa. Un salto che parte
     sempre porterebbe la vetrina a non vedersi mai piu'. */
  {
    const testo = fs.readFileSync(FILE, 'utf8');
    if (!/display-mode: standalone/.test(testo) || !/location\.replace\("app\.html/.test(testo))
      guai.push(`[installata] manca il salto verso l'app per chi apre dall'icona`);
    const page = await browser.newPage({ viewport:{width:390,height:844} });
    await page.goto(url);
    await page.waitForTimeout(700);
    const dove = await page.evaluate(() => window.location.pathname);
    if (!/index\.html$|\/$/.test(dove))
      guai.push(`[installata] in una scheda normale la vetrina e' saltata via, verso «${dove}»`);
    if (!/index\.html$|\/$/.test(dove)) {
      await page.close(); await browser.close();
      console.log('\n  ' + FILE + '\n  \u2717 ' + guai.length + ' cose non vanno:\n');
      for (const g of guai) console.log('    \u00b7 ' + g);
      console.log('');
      process.exit(1);
    }
    await page.close();
  }

  for (const schermo of SCHERMI) {
    const page = await browser.newPage({ viewport: { width: schermo.width, height: schermo.height } });
    const errori = [];
    page.on('pageerror', e => errori.push(String(e)));
    await page.goto(url);
    await page.waitForTimeout(900);
    if (errori.length) guai.push(`[${schermo.nome}] il copione si e' rotto: ${errori[0]}`);

    for (const l of LINGUE) {
      await page.selectOption('#sceltaLingua', l);
      await page.waitForTimeout(120);

      const m = await page.evaluate(() => {
        const h1 = document.querySelector('.eroe h1');
        const lh = parseFloat(getComputedStyle(h1).lineHeight);
        const tasti = document.querySelector('.eroe-tasti');
        const t = tasti.querySelectorAll('.tasto');
        const cime = new Set(Array.from(t).map(x => Math.round(x.getBoundingClientRect().top)));
        return {
          lang: document.documentElement.lang,
          righeH1: Math.round(h1.getBoundingClientRect().height / lh),
          fileTasti: cime.size,
          largoTasti: Math.round(tasti.getBoundingClientRect().width),
          coppia: Array.from(t).reduce((a, x) => a + Math.round(x.getBoundingClientRect().width), 0)
                  + (t.length - 1) * 12,
          tastiPieni: Array.from(t).every(x =>
            Math.round(x.getBoundingClientRect().width) >= Math.round(tasti.getBoundingClientRect().width) - 1),
          sporge: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
          testata: (function(){
            const w = document.querySelector('.testata .wrap');
            const box = w.getBoundingClientRect();
            const pezzi = [w.querySelector('.marchio'), w.querySelector('.menu'), w.querySelector('.destra')]
                          .filter(Boolean).map(e => ({ nome:e.className, r:e.getBoundingClientRect() }))
                          .filter(x => x.r.width > 0)
                          .sort((a,b) => a.r.left - b.r.left);
            let esce = 0, accavalla = null;
            for (let i = 0; i < pezzi.length; i++){
              esce = Math.max(esce, Math.round(box.left - pezzi[i].r.left),
                                    Math.round(pezzi[i].r.right - box.right));
              if (i + 1 < pezzi.length && pezzi[i].r.right > pezzi[i+1].r.left + 1)
                accavalla = pezzi[i].nome;
            }
            return { esce: Math.max(0, esce), accavalla };
          })(),
          testo: document.querySelector('.vetrina').innerText,
          fascia: (document.querySelector('[data-k="tre_reg_s"]')||{}).textContent || '',
          campi: (function(){
            const c = Array.from(document.querySelectorAll('#campi .scheda'));
            const tutte = Array.from(document.querySelectorAll('.scheda'));
            return { quante: c.length,
                     regioni: c.map(x => (x.querySelector('.spalla')||{}).textContent || ''),
                     compagnie: tutte.map(x => ({
                       nome: (x.querySelector('.nome')||{}).textContent || '',
                       righe: Array.from(x.querySelectorAll('.righe span')).map(y => y.textContent)
                     })),
                     km: document.querySelector('.vetrina').innerText.match(/\d+\s?km/i) };
          })(),
          fed: (function(){
            const n = Array.from(document.querySelectorAll('#fed span'));
            return { quante: n.length,
                     tutte: n.map(x => x.textContent),
                     prime: n.filter(x => x.classList.contains('mia')).map(x => x.textContent),
                     inTesta: n.slice(0, n.filter(x => x.classList.contains('mia')).length)
                               .every(x => x.classList.contains('mia')) };
          })()
        };
      });

      if (m.lang !== l) guai.push(`[${schermo.nome}/${l}] <html lang> dice «${m.lang}»`);

      // 1 — l'H1 dell'eroe: tre righe, sempre
      if (m.righeH1 !== 3)
        guai.push(`[${schermo.nome}/${l}] l'H1 dell'eroe fa ${m.righeH1} righe invece di 3`);

      // 2 — i tasti dell'eroe: o tutti in fila, o tutti impilati a piena
      // larghezza. Il misto — uno lungo, e sotto uno corto e storto — e'
      // l'unica cosa che non deve succedere, e non dipende da una soglia.
      if (m.fileTasti !== 1 && !m.tastiPieni)
        guai.push(`[${schermo.nome}/${l}] i tasti dell'eroe sono su ${m.fileTasti} file e di larghezza diversa: ` +
                  `la coppia chiede ${m.coppia}px e ce ne sono ${m.largoTasti}`);

      // 3 — niente italiano dove non deve essercene
      if (l !== 'it') {
        // innerText torna il testo GIA' trasformato dal foglio di stile: i
        // titoli sono in maiuscolo, e un confronto sensibile al caso non
        // trovava mai niente. Si confronta in minuscolo.
        const dentro = m.testo.toLowerCase();
        const spie = ["trova i campi 3d", "cinque cose", "segni il giro anche quando",
                      "chi tiene un campo", "vedi chi si allena", "cerchi per zona",
                      "bersagli", "allenamenti aperti", "miglior giro", "il tuo prossimo",
                      "organizza un allenamento", "scegli la tua federazione"];
        for (const spia of spie)
          if (dentro.includes(spia))
            guai.push(`[${schermo.nome}/${l}] e' rimasto dell'italiano: «${spia}»`);
      }

      // 4b — la testata: le sue parti non devono accavallarsi ne' uscire.
      // Una barra che si stringe non fa sporgere la pagina: si sovrappone e
      // basta, e l'unico modo di accorgersene e' misurare i rettangoli.
      if (m.testata.esce)
        guai.push(`[${schermo.nome}/${l}] la testata esce dal suo spazio di ${m.testata.esce}px`);
      if (m.testata.accavalla)
        guai.push(`[${schermo.nome}/${l}] nella testata «${m.testata.accavalla}» si sovrappone a quello dopo`);

      // 3b — le federazioni: quante ne offre l'app, quelle giuste, e le tue
      // davanti. Il numero non e' scritto qui: lo conta l'app (vedi in cima).
      // Nessuna delle due cose si vede guardando la pagina se non sai quali
      // federazioni l'app offre davvero: il 25/08/2026 l'elenco scritto a
      // mano ne prometteva tre che non ci sono (World Archery, IFAA, SCF) e
      // ne taceva tre che ci sono. Una vetrina che nomina una federazione
      // sbagliata non si rompe: fa scaricare l'app alla persona sbagliata.
      const ATTESE = FED_ATTESE, MIE = FED_MIE;
      if (m.fed.quante !== ATTESE.length)
        guai.push(`[${schermo.nome}/${l}] le federazioni sono ${m.fed.quante}, attese ${ATTESE.length}`);
      for (const f of m.fed.tutte)
        if (!ATTESE.includes(f))
          guai.push(`[${schermo.nome}/${l}] c'e' una federazione che l'app non offre: «${f}»`);
      for (const f of ATTESE)
        if (!m.fed.tutte.includes(f))
          guai.push(`[${schermo.nome}/${l}] manca una federazione che l'app offre: «${f}»`);
      // ...e in ordine alfabetico dentro i due gruppi, sempre lo stesso in
      // tutte e nove le lingue: l'ordine alfabetico che cambiasse col paese
      // non sarebbe piu' un ordine, sarebbe un secondo criterio nascosto.
      const ordinato = a => a.slice().sort((x,y) => x.localeCompare(y,"en")).join('|') === a.join('|');
      if (!ordinato(m.fed.tutte.slice(0, MIE[l].length)) ||
          !ordinato(m.fed.tutte.slice(MIE[l].length)))
        guai.push(`[${schermo.nome}/${l}] le federazioni non sono in ordine alfabetico: ` +
                  `«${m.fed.tutte.join(', ')}»`);
      if (m.fed.prime.join('|') !== MIE[l].join('|'))
        guai.push(`[${schermo.nome}/${l}] le federazioni segnate come tue sono ` +
                  `«${m.fed.prime.join(', ') || '\u2014'}», attese «${MIE[l].join(', ')}»`);
      else if (!m.fed.inTesta)
        guai.push(`[${schermo.nome}/${l}] le federazioni del tuo paese non sono in testa all'elenco`);

      // 3b-bis — la fascia in cima nomina LE TUE federazioni.
      // Era «FIARC, FITARCO e altri» tradotta in nove lingue: un tedesco
      // leggeva in tedesco che l'app conosce due federazioni italiane, e la
      // frase sembrava giusta perche' ERA tradotta. Una stringa tradotta bene
      // con dentro il contenuto sbagliato non la becca nessun banco di lingue.
      // Al massimo due: tre sigle in una riga da due parole non ci stanno, e
      // la fascia e' un titoletto, non l'elenco.
      for (const f of MIE[l].slice(0, 2))
        if (!m.fascia.includes(f))
          guai.push(`[${schermo.nome}/${l}] la fascia in cima non nomina «${f}»: «${m.fascia}»`);
      if (l !== 'it' && (m.fascia.includes('FIARC') || m.fascia.includes('FITARCO')))
        guai.push(`[${schermo.nome}/${l}] la fascia in cima nomina ancora le federazioni italiane: «${m.fascia}»`);

      // 3c-bis — ogni scheda nomina una compagnia che esiste davvero, col suo
      // codice. Il nome puo' essere accorciato della forma legale («A.S.D.»),
      // che nessuno legge e nessuna vetrina scrive: si controlla che quello
      // in pagina sia contenuto in quello dell'elenco.
      if (l === 'it' && VERE) {
        for (const c of m.campi.compagnie) {
          const cod = c.righe.find(x => /^[A-Z0-9]{5,7}$/.test(x));
          if (!cod) { guai.push(`[${schermo.nome}] la scheda «${c.nome}» non porta il codice della compagnia`); continue; }
          if (!VERE[cod]) { guai.push(`[${schermo.nome}] il codice «${cod}» non esiste in compagnie-data.js`); continue; }
          const atteso = VERE[cod].replace(/^(A\.S\.D\.|A\.P\.D\.|A\.S\.C\.D\.)\s*/i, '').toLowerCase();
          if (!atteso.includes(c.nome.toLowerCase()) && !c.nome.toLowerCase().includes(atteso))
            guai.push(`[${schermo.nome}] «${cod}» in elenco si chiama «${VERE[cod]}», in vetrina «${c.nome}»`);
        }
      }

      // 3c — i campi d'esempio vengono da regioni diverse, e nessuno dice
      // «18 km». Erano tre paesi della stessa provincia — la valle di chi ha
      // scritto la pagina — e la sezione sembrava l'app di un club solo.
      // La distanza in km e' un secondo difetto dello stesso pezzo: la
      // schermata Campi dell'app cerca per zona e non misura distanze.
      if (l === 'it') {
        if (m.campi.quante < 3)
          guai.push(`[${schermo.nome}] i campi d'esempio sono ${m.campi.quante}, attesi almeno 3`);
        const reg = new Set(m.campi.regioni.filter(Boolean));
        if (reg.size < 3)
          guai.push(`[${schermo.nome}] i campi d'esempio vengono da ${reg.size} regioni, attese almeno 3: ` +
                    `«${m.campi.regioni.join(', ')}»`);
        if (m.campi.km)
          guai.push(`[${schermo.nome}] c'e' ancora una distanza in km: «${m.campi.km[0]}» \u2014 ` +
                    `la schermata Campi dell'app cerca per zona, non misura distanze`);
      }

      // 4 — niente deve sporgere di lato
      if (m.sporge > 1)
        guai.push(`[${schermo.nome}/${l}] la pagina sporge di ${m.sporge}px: c'e' lo scorrimento laterale`);
    }
    await page.close();
  }

  // 5 — la lingua del telefono decide, e se non e' delle nove si cade sull'inglese
  for (const [locale, atteso] of [["de-DE","de"], ["ru-RU","ru"], ["ja-JP","en"], ["pt-BR","en"], ["sv-SE","sv"]]) {
    const page = await browser.newPage({ viewport:{width:1280,height:900}, locale });
    await page.goto(url);
    await page.waitForTimeout(700);
    const visto = await page.evaluate(() => document.documentElement.lang);
    if (visto !== atteso)
      guai.push(`[prima apertura] un telefono in ${locale} apre in «${visto}», atteso «${atteso}»`);
    await page.close();
  }

  // 6 — l'indirizzo comanda sulla lingua del telefono
  {
    const page = await browser.newPage({ viewport:{width:1280,height:900}, locale:'de-DE' });
    await page.goto(url + '?lang=fr');
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      // TUTTI i link che entrano nell'app, non il primo: toglierne uno il
      // marchio e' esattamente l'errore che non si vede.
      app: Array.from(document.querySelectorAll('a[data-app]')).map(a => a.getAttribute('href')),
      versoApp: document.querySelectorAll('a[href^="app.html"]').length
    }));
    if (r.lang !== 'fr') guai.push(`[indirizzo] ?lang=fr su un telefono tedesco apre in «${r.lang}»`);
    if (r.app.length !== 7)
      guai.push(`[indirizzo] i link verso l'app marcati sono ${r.app.length}, attesi 7`);
    for (const h of r.app)
      if (h !== 'app.html?lang=fr') guai.push(`[indirizzo] un link verso l'app non porta la lingua: «${h}»`);
    if (r.versoApp !== 7)
      guai.push(`[indirizzo] ${r.versoApp} link puntano all'app ma non tutti sono marcati data-app`);
    await page.close();
  }

  await browser.close();

  console.log('\n  ' + FILE);
  if (guai.length === 0) {
    console.log(`  \u2713 nove lingue \u00d7 quattro larghezze: l'eroe tiene le tre righe, i tasti non`);
    console.log(`    si spezzano storti, la testata non si accavalla, niente italiano fuori posto.`);
    console.log(`  \u2713 la prima apertura sceglie da sola, e cade sull'inglese quando non sa.\n`);
    // Il numero NON si scrive qui. Diceva «sedici» mentre erano diciassette,
    // ed era la stessa bugia dell'elenco che ha appena smesso di esistere.
    console.log(`  \u2713 ${FED_ATTESE.length} federazioni, quelle che l'app offre davvero, le tue in testa,`);
    console.log(`    il resto in ordine alfabetico, la fascia in cima nomina le tue,`);
    console.log(`    e i campi d'esempio vengono da tre regioni e sono compagnie vere.\n`);
    console.log(`  \u2713 chi apre dall'icona salta all'app, chi apre dal browser no.\n`);
    process.exit(0);
  }
  console.log(`  \u2717 ${guai.length} cose non vanno:\n`);
  for (const g of guai) console.log('    \u00b7 ' + g);
  console.log('');
  process.exit(1);
})();
