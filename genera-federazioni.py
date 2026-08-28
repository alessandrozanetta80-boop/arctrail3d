# -*- coding: utf-8 -*-
"""
genera-federazioni.py — le pagine pubbliche dei regolamenti 3D.

RISCRITTO IL 28/08/2026, E IL MOTIVO E' UN ERRORE DI ARCHITETTURA.

La versione di stamattina faceva UNA PAGINA PER FEDERAZIONE: sedici file in
cui cambiava la sigla e restava identico tutto il resto, perche' dieci
federazioni applicano lo stesso regolamento World Archery e sette lo stesso
regolamento IFAA. Sono doorway pages: pagine che esistono per intercettare
una parola chiave e non per dire qualcosa che le altre non dicono. Google le
riconosce e le declassa, ed e' giusto che lo faccia.

**Una pagina per REGOLAMENTO, non per federazione.** Il regolamento si spiega
una volta sola, con la sua fonte e la sua versione; le federazioni diventano
sezioni con un'ancora, cosi' chi cerca «punteggio FITARCO 3D» atterra su
`world-archery-3d.html#fitarco` e trova il suo nome, la sua fonte nazionale e
il regolamento vero sopra, invece di una copia.

Quattro pagine, piu' l'indice:

  fiarc.html            — gia' online e approvata, NON la tocca questo file
  world-archery-3d.html — 24 bersagli, 2 frecce, 11/10/8/5 + 10 federazioni
  ifaa-3d.html          — Standard e Hunting Round + 7 federazioni
  nfas-3d.html          — Big Game Round, regolamento suo
  regolamenti-3d.html   — l'indice, per regolamento e per paese

I dati numerici vengono TUTTI da un regolamento letto davvero, non dal codice
dell'app. Vedi `seo-federazioni-report.md`.
"""

import io, os

# ══════════════════════════════════════════════════════════════════════════
#  LE FONTI — ognuna con versione e indirizzo
# ══════════════════════════════════════════════════════════════════════════

WA_B2 = ("World Archery \u2014 Book 2 (Events), versione 2026-03-13",
         "https://extranet.worldarchery.sport/documents/index.php/?doc=7618&inline=1")
WA_B4 = ("World Archery \u2014 Book 4 (Field and 3D Archery), versione 2026-03-13",
         "https://extranet.worldarchery.sport/documents/index.php/?doc=7620&inline=1")
IFAA_SRC = ("IFAA \u2014 Book of Rules 2021, rev. 04 aprile 2021 (Article V, E e F)",
            "https://www.ifaa-archery.org/documents/rule-book/book-of-rules/")
NFAS_SRC = ("NFAS \u2014 Shooting Handbook 2026",
            "https://nfas.net/wp-content/uploads/2026/05/NFASRuleBook2026.pdf")

# ══════════════════════════════════════════════════════════════════════════
#  LE FEDERAZIONI — dati, non pagine
#
#  `fonte` c'e' solo dove la federazione pubblica una pagina o un regolamento
#  PROPRIO che e' stato letto. Dove non c'e', la riga non finge: rimanda al
#  sito e basta. *Una fonte inventata per riempire una colonna e' peggio di
#  una colonna vuota.*
# ══════════════════════════════════════════════════════════════════════════

WA_FED = [
 dict(id="fitarco", sigla="FITARCO", paese="Italia",
      nome="Federazione Italiana di Tiro con l'Arco",
      sito="https://www.fitarco-italia.org",
      fonte=("Regolamento Tecnico di Tiro, Libro 2 e Libro 4, in vigore dal "
             "1\u00b0 gennaio 2026",
             "https://www.fitarco.it/documenti/carte-federali/regolamenti-tecnici-1"),
      nota=u"Il Libro 4 all'art.\u00a023.3.1 dice due frecce per sagoma; il "
           u"Libro 2 fissa le 24 sagome a distanze sconosciute. Gli 11 e i 10 "
           u"compaiono negli articoli sui pari merito, il 5 in quello sulle "
           u"frecce di rimbalzo."),
 dict(id="ffta", sigla="FFTA", paese="Francia",
      nome="F\u00e9d\u00e9ration Fran\u00e7aise de Tir \u00e0 l'Arc",
      sito="https://www.ffta.fr",
      fonte=("FFTA \u2014 Le tir 3D", "https://www.ffta.fr/pratiquer/"
             "disciplines-officielles-et-nouvelles-pratiques/le-tir-3d"),
      nota=u"La pagina ufficiale dichiara le 24 cibles e le quattro zone da "
           u"5, 8, 10 e 11 punti."),
 dict(id="swissarchery", sigla="SwissArchery", paese="Svizzera",
      nome="SwissArchery", sito="https://www.swissarchery.org", fonte=None,
      nota=u"Federazione svizzera affiliata a World Archery. In Svizzera "
           u"convive con la FAAS, che sta sul circuito IFAA: sono due gare "
           u"diverse."),
 dict(id="oebsv", sigla="\u00d6BSV", paese="Austria",
      nome="\u00d6sterreichischer Bogensportverband",
      sito="https://www.archeryaustria.net", fonte=None,
      nota=u"La Wettkampfordnung, al \u00a71.1, dichiara l'\u00d6BSV membro "
           u"di World Archery <strong>e</strong> di IFAA: in Austria "
           u"\u00abgara 3D\u00bb da solo non basta a dire che gara sia. "
           u"L'altro regolamento sta in <a href=\"/ifaa-3d.html#oebsv\">"
           u"IFAA 3D</a>."),
 dict(id="dsb", sigla="DSB", paese="Germania",
      nome="Deutscher Sch\u00fctzenbund", sito="https://www.dsb.de",
      fonte=("DSB \u2014 Wettkampfmodus WA 3D",
             "https://www.dsb.de/bogensport/sport/wettkampfformate/modus-3d"),
      nota=u"La pagina ufficiale dichiara <em>24 Passen \u00e0 2 Pfeile</em> e "
           u"descrive le quattro zone una per una. In Germania il DSB convive "
           u"col DFBV, che sta sul circuito IFAA."),
 dict(id="archerygb", sigla="Archery GB", paese="Regno Unito",
      nome="Archery GB", sito="https://www.archerygb.org", fonte=None,
      nota=u"Federazione britannica affiliata a World Archery. Nel Regno "
           u"Unito convivono tre regolamenti: questo, quello "
           u"<a href=\"/ifaa-3d.html\">IFAA</a> e quello "
           u"<a href=\"/nfas-3d.html\">NFAS</a>."),
 dict(id="tof", sigla="TOF", paese="Turchia",
      nome="T\u00fcrkiye Ok\u00e7uluk Federasyonu",
      sito="https://www.turkarchery.org", fonte=None,
      nota=u"Federazione turca affiliata a World Archery."),
 dict(id="rfeta", sigla="RFETA", paese="Spagna",
      nome="Real Federaci\u00f3n Espa\u00f1ola de Tiro con Arco",
      sito="https://www.rfeta.es", fonte=None,
      nota=u"Federazione spagnola affiliata a World Archery."),
 dict(id="khsn", sigla="KHSN", paese="Paesi Bassi",
      nome="Koninklijke Handboogsport Nederland",
      sito="https://www.handboogsport.nl",
      fonte=("KHSN \u2014 Over KHSN", "https://www.handboogsport.nl/over-khsn/"),
      nota=u"La pagina ufficiale dichiara l'adesione a World Archery "
           u"<strong>e</strong> alla International Field Archery Association. "
           u"L'altro regolamento sta in <a href=\"/ifaa-3d.html#khsn\">"
           u"IFAA 3D</a>."),
 dict(id="sbf", sigla="SBF", paese="Svezia",
      nome="Svenska B\u00e5gskytteförbundet", sito="https://www.bagskytte.se",
      fonte=("SBF \u2014 3D",
             "https://www.bagskytte.se/tavlingar--resultat/tavlingsgrenar/3d"),
      nota=u"La pagina ufficiale dichiara le due frecce per bersaglio, le "
           u"zone 11/10/8/5, il massimo di 22 punti per sagoma e le 24 "
           u"piazzole. In Svezia l'SBF convive con la "
           u"<a href=\"/ifaa-3d.html#sfsf\">SFSF</a>, che sta su IFAA."),
]

IFAA_FED = [
 dict(id="fftl", sigla="FFTL", paese="Francia",
      nome="F\u00e9d\u00e9ration Fran\u00e7aise de Tir Libre",
      sito="https://www.fftl.com", fonte=None,
      nota=u"Una delle federazioni francesi sul circuito IFAA. In Francia "
           u"convive con la <a href=\"/world-archery-3d.html#ffta\">FFTA</a>, "
           u"che sta su World Archery."),
 dict(id="faas", sigla="FAAS", paese="Svizzera",
      nome="Field Archery Association Switzerland",
      sito="https://www.archery-faas.ch", fonte=None,
      nota=u"Federazione svizzera sul circuito IFAA. Il suo 3D non \u00e8 "
           u"quello di <a href=\"/world-archery-3d.html#swissarchery\">"
           u"SwissArchery</a>: cambia il numero di piazzole, cambia la sagoma "
           u"e cambia il modo di contare."),
 dict(id="oebsv", sigla="\u00d6BSV", paese="Austria",
      nome="\u00d6sterreichischer Bogensportverband",
      sito="https://www.archeryaustria.net", fonte=None,
      nota=u"La Wettkampfordnung, al \u00a71.1, dichiara l'\u00d6BSV membro "
           u"sia di IFAA sia di World Archery. L'altro regolamento sta in "
           u"<a href=\"/world-archery-3d.html#oebsv\">World Archery 3D</a>."),
 dict(id="dfbv", sigla="DFBV", paese="Germania",
      nome="Deutscher Feldbogen Sportverband", sito="https://www.dfbv.de",
      fonte=None,
      nota=u"Federazione tedesca sul circuito IFAA. Il suo 3D \u00e8 un'altra "
           u"gara rispetto a quella del <a href=\"/world-archery-3d.html#dsb\">"
           u"DSB</a>, e i due punteggi non si confrontano."),
 dict(id="efaa", sigla="EFAA", paese="Regno Unito",
      nome="English Field Archery Association",
      sito="https://efaafieldarcher.com", fonte=None,
      nota=u"Federazione inglese sul circuito IFAA. Nel Regno Unito "
           u"convivono tre regolamenti \u2014 questo, "
           u"<a href=\"/world-archery-3d.html#archerygb\">Archery GB</a> e "
           u"<a href=\"/nfas-3d.html\">NFAS</a> \u2014 e sapere quale si sta "
           u"tirando \u00e8 la prima cosa."),
 dict(id="khsn", sigla="KHSN", paese="Paesi Bassi",
      nome="Koninklijke Handboogsport Nederland",
      sito="https://www.handboogsport.nl",
      fonte=("KHSN \u2014 Over KHSN", "https://www.handboogsport.nl/over-khsn/"),
      nota=u"La pagina ufficiale dichiara l'adesione alla International Field "
           u"Archery Association <strong>e</strong> a World Archery. L'altro "
           u"regolamento sta in <a href=\"/world-archery-3d.html#khsn\">"
           u"World Archery 3D</a>."),
 dict(id="sfsf", sigla="SFSF", paese="Svezia",
      nome="Svenska F\u00e4ltb\u00e5gskytte F\u00f6rbundet",
      sito="https://sfsf-archery.com", fonte=None,
      nota=u"Il membro IFAA svedese, che l'IFAA elenca con la sigla SFSF. Non "
           u"va confusa con l'<a href=\"/world-archery-3d.html#sbf\">SBF</a>: "
           u"sono due regolamenti diversi nello stesso paese."),
]

STILE = u"""<style>
/* Stessa famiglia di `presentazione.html` e `fiarc.html`: gli stessi sei
   colori, la stessa colonna da 760px, la stessa carta col picchetto a
   sinistra. Chi passa da una pagina all'altra deve restare nello stesso
   posto, non trovarsi in due siti che si somigliano. */
:root{
  --ink:#201D18; --teal:#455648; --amber:#C8551A;
  --paper:#F5F2ED; --card:#FFFFFF; --line:#E4E1DB; --muted:#71665E;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:16px; line-height:1.65;
}
header{background:var(--ink); color:#fff; padding:18px 20px}
.hwrap{max-width:760px; margin:0 auto; display:flex; align-items:center; gap:12px; flex-wrap:wrap}
.brand{font-weight:800; letter-spacing:.02em; font-size:17px}
.brand span{color:#AEBEB1}
.back{margin-left:auto; color:#fff; text-decoration:none; border:1px solid rgba(255,255,255,.35);
  padding:7px 13px; border-radius:999px; font-size:14px; font-weight:600}
.back:hover{background:rgba(255,255,255,.12)}
main{max-width:760px; margin:0 auto; padding:26px 20px 64px}
h1{font-size:26px; line-height:1.25; margin:0 0 14px; letter-spacing:-.01em}
h2{font-size:19px; margin:34px 0 10px; padding-top:20px; border-top:1px solid var(--line); letter-spacing:-.01em}
h3{font-size:16px; margin:22px 0 6px}
p,li{margin:0 0 12px}
ul{padding-left:20px}
a{color:var(--teal)}
:where(a,button,input,select,textarea,[tabindex]):focus-visible{
  outline:3px solid var(--amber); outline-offset:3px }
.lead{background:var(--card); border:1px solid var(--line); border-left:4px solid var(--teal);
  border-radius:12px; padding:16px 18px; margin:0 0 22px}
.lead p:last-child{margin:0}
.note{background:var(--card); border:1px solid var(--line); border-left:4px solid var(--amber);
  border-radius:12px; padding:14px 16px; margin:18px 0}
.note p:last-child{margin:0}
.cta{display:inline-block; background:var(--teal); color:#fff; text-decoration:none;
  font-weight:700; padding:13px 22px; border-radius:10px; margin:8px 0 4px}
.cta:hover{background:#334036}
/* LA TABELLA SUL TELEFONO. Invece di rimpicciolire il testo — che e' la cosa
   che si guarda al sole, in piedi — la tabella scorre di lato dentro il suo
   riquadro, e il resto della pagina resta fermo. */
.tw{overflow-x:auto; -webkit-overflow-scrolling:touch; margin:0 0 14px;
  border:1px solid var(--line); border-radius:12px; background:var(--card)}
table{border-collapse:collapse; width:100%; min-width:320px; font-size:15px}
caption{caption-side:top; text-align:left; padding:12px 14px 0; color:var(--muted); font-size:14px}
th,td{padding:10px 14px; text-align:right; border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left; font-weight:600}
thead th{font-size:13px; color:var(--muted); font-weight:600; letter-spacing:.02em}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
.fonte{color:var(--muted); font-size:15px}
/* LE SEZIONI PER FEDERAZIONE. Sono ancore, non pagine: chi arriva da un link
   con #fitarco deve capire in un colpo d'occhio di essere atterrato nel punto
   giusto, e il filo a sinistra glielo dice senza aggiungere una parola. */
.fed{border-left:3px solid var(--line); padding:2px 0 2px 16px; margin:22px 0}
.fed h3{margin:0 0 4px; font-size:16px}
.fed h3:target,.fed:target h3{color:var(--amber)}
.fed p{margin:0 0 6px}
.fed p:last-child{margin:0}
.paese{margin:26px 0 6px; font-size:16px; font-weight:700}
.elenco-fed{list-style:none; padding:0; margin:0 0 8px}
.elenco-fed li{margin:0 0 8px}
footer{border-top:1px solid var(--line); margin-top:44px; padding-top:18px; color:var(--muted); font-size:14px}
footer a{margin-right:16px}
@media (min-width:760px){ h1{font-size:32px} main{padding-top:34px} }
</style>"""

TESTATA = u"""<header>
  <div class="hwrap">
    <div class="brand">ArcTrail<span> 3D</span></div>
    <a class="back" href="/app.html">Apri l'app</a>
  </div>
</header>"""

PIEDE = u"""  <footer>
    <a href="/">ArcTrail 3D</a>
    <a href="/presentazione.html">Che cos'\u00e8 ArcTrail 3D</a>
    <a href="/regolamenti-3d.html">Tutti i regolamenti</a>
    <a href="/app.html">Apri l'app</a>
    <p>ArcTrail 3D \u2014 progetto indipendente, Italia \u2014 info@arctrail3d.com</p>
  </footer>"""


def testa(titolo, descr, url, og_titolo, og_descr):
    return u"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>%s</title>
<meta name="description" content="%s">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://arctrail3d.com/%s">
<link rel="icon" href="/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ArcTrail 3D">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:url" content="https://arctrail3d.com/%s">
<meta property="og:image" content="https://arctrail3d.com/logo.jpg">
%s
</head>
<body>

%s

<main>
""" % (titolo, descr, url, og_titolo, og_descr, url, STILE, TESTATA)


def tabella(t):
    r = [u'  <div class="tw">', u"    <table>",
         u"      <caption>%s</caption>" % t["caption"],
         u"      <thead><tr>%s</tr></thead>" % u"".join(
             u'<th scope="col">%s</th>' % c for c in t["cols"]),
         u"      <tbody>"]
    for riga in t["rows"]:
        celle = u'<th scope="row">%s</th>' % riga[0]
        celle += u"".join(u"<td>%s</td>" % c for c in riga[1:])
        r.append(u"        <tr>%s</tr>" % celle)
    r += [u"      </tbody>", u"    </table>", u"  </div>"]
    return u"\n".join(r)




# ══════════════════════════════════════════════════════════════════════════
#  I PEZZI CHE SI RIPETONO
# ══════════════════════════════════════════════════════════════════════════

def cta(testo):
    return u'  <p><a class="cta" href="/app.html">%s</a></p>\n' % testo


def sezioni_fed(elenco, quale):
    """Le federazioni come SEZIONI ANCORATE, non come pagine.

    Il regolamento e' gia' stato spiegato sopra: qui si dice solo cosa
    aggiunge quella federazione — la sua fonte nazionale, se esiste, e con
    chi convive nel suo paese. *Ripetere il barème dieci volte sarebbe
    esattamente la pagina duplicata che questa riscrittura elimina.*
    """
    p = [u"  <h2>Federazioni %s supportate da ArcTrail 3D</h2>" % quale,
         u"  <p>Il regolamento \u00e8 quello descritto qui sopra, uno solo per "
         u"tutte. Quello che cambia da una federazione all'altra \u00e8 il "
         u"documento nazionale a cui fare riferimento in gara, e con quale "
         u"altro regolamento convive nello stesso paese.</p>"]
    for f in elenco:
        p.append(u'  <div class="fed" id="%s">' % f["id"])
        p.append(u"    <h3>%s \u2014 %s</h3>" % (f["sigla"], f["paese"]))
        p.append(u"    <p>%s</p>" % f["nome"])
        p.append(u"    <p>%s</p>" % f["nota"])
        if f["fonte"]:
            p.append(u'    <p class="fonte">Fonte nazionale verificata: '
                     u'<a href="%s" rel="nofollow noopener" target="_blank">%s'
                     u"</a>.</p>" % (f["fonte"][1], f["fonte"][0]))
        else:
            p.append(u'    <p class="fonte">Sito ufficiale: '
                     u'<a href="%s" rel="nofollow noopener" target="_blank">%s'
                     u"</a>. Un regolamento 3D nazionale separato non \u00e8 "
                     u"stato reperito: vale quello del circuito.</p>"
                     % (f["sito"], f["sito"].replace("https://", "")))
        p.append(u"  </div>")
    p.append(u"")
    return u"\n".join(p)


def fonti(voci):
    return u" ".join(u'<a href="%s" rel="nofollow noopener" target="_blank">%s'
                     u"</a>." % (u_, n) for n, u_ in voci)


def disclaimer(chi):
    return (u'  <div class="note">\n    <p><strong>ArcTrail 3D \u00e8 un '
            u"progetto indipendente e non \u00e8 un'app ufficiale %s.</strong>"
            u"</p>\n    <p>Durante una manifestazione ufficiale fanno sempre "
            u"fede il regolamento vigente, le disposizioni dell'organizzazione "
            u"e il cartellino ufficiale.</p>\n  </div>\n" % chi)


def coda_app(nome):
    return (u"  <h2>Un segnapunti che sa quale gara stai tirando</h2>\n"
            u"  <p>Sommare numeri lo fa chiunque. La parte che costa "
            u"attenzione, sul percorso, \u00e8 ricordarsi quale tabella vale "
            u"oggi: quante frecce spettano su questa piazzola, se la seconda "
            u"conta ancora, quanto vale una zona presa al secondo "
            u"tentativo.</p>\n"
            u"  <p>In ArcTrail 3D quella scelta si fa una volta sola, prima di "
            u"partire. L'app cambia da s\u00e9 il numero di frecce e il "
            u"barème previsto dal formato, e durante il giro funziona anche "
            u"senza connessione \u2014 che sul percorso \u00e8 la condizione "
            u"normale, non l'eccezione.</p>\n" + cta(u"Apri il segnapunti " + nome))


# ══════════════════════════════════════════════════════════════════════════
#  WORLD ARCHERY
# ══════════════════════════════════════════════════════════════════════════

def pagina_wa():
    url = "world-archery-3d.html"
    p = [testa(
        u"Punteggio World Archery 3D: 24 bersagli, 2 frecce e zone 11-10-8-5 "
        u"| ArcTrail 3D",
        u"Come si conta il punteggio nel 3D World Archery: 24 bersagli, due "
        u"frecce, zone 11, 10, 8 e 5. Le federazioni che lo applicano e le "
        u"fonti ufficiali.",
        url,
        u"Punteggio World Archery 3D: 24 bersagli, 2 frecce e zone 11-10-8-5",
        u"Il 3D Round World Archery spiegato una volta sola, con le "
        u"federazioni che lo applicano.")]

    p.append(u"  <h1>Punteggio World Archery 3D</h1>\n")
    p.append(u'  <div class="lead">\n'
             u"    <p>Il 3D Round di World Archery \u00e8 il formato "
             u"internazionale: 24 sagome a distanza sconosciuta, due frecce "
             u"per ognuna, quattro zone sul corpo dell'animale.</p>\n"
             u"    <p>Lo applicano dieci delle federazioni che ArcTrail 3D "
             u"conosce, in dieci paesi. Il regolamento \u00e8 lo stesso per "
             u"tutte: per questo sta scritto una volta sola, qui, e non "
             u"ripetuto dieci volte con una sigla diversa in cima.</p>\n"
             u"  </div>\n")
    p.append(cta(u"Segna un giro World Archery con ArcTrail 3D"))

    p.append(u"  <h2>Com'\u00e8 fatto il giro</h2>")
    p.append(u"  <p>Le distanze non sono scritte da nessuna parte, e "
             u"valutarle fa parte della gara. Il picchetto da cui si tira "
             u"dipende dalla divisione.</p>")
    p.append(u"  <ul>\n    <li>24 bersagli, numerati da 1 a 24</li>\n"
             u"    <li>2 frecce per bersaglio</li>\n"
             u"    <li>48 frecce complessive</li>\n"
             u"    <li>distanze non segnate</li>\n"
             u"    <li>si sommano i punti di tutte e due le frecce</li>\n"
             u"  </ul>")
    p.append(tabella({
        "caption": u"Le distanze, per picchetto e divisione",
        "cols": [u"Divisione", u"Picchetto", u"Minimo", u"Massimo"],
        "rows": [[u"Compound", u"rosso", u"5 m", u"45 m"],
                 [u"Arco nudo", u"blu", u"5 m", u"30 m"],
                 [u"Longbow", u"blu", u"5 m", u"30 m"],
                 [u"Tradizionale", u"blu", u"5 m", u"30 m"]],
    }))
    p.append(u"  <p>Nel 3D World Archery il ricurvo non ha una divisione: i "
             u"titoli mondiali sono per compound, arco nudo, longbow e "
             u"tradizionale.</p>\n")

    p.append(u"  <h2>Le quattro zone</h2>")
    p.append(u"  <p>La sagoma \u00e8 divisa in quattro zone di punteggio, e il "
             u"valore <strong>non cambia fra la prima e la seconda "
             u"freccia</strong>: due volte 11 fanno 22, che \u00e8 il massimo "
             u"su una piazzola.</p>")
    p.append(tabella({
        "caption": u"Punteggio per zona, uguale per entrambe le frecce",
        "cols": [u"Zona", u"Punti"],
        "rows": [[u"Cerchio interno al 10", u"11"],
                 [u"Cerchio dentro l'area vitale", u"10"],
                 [u"Area vitale fuori dal 10", u"8"],
                 [u"Resto del corpo", u"5"]],
    }))
    p.append(u"  <p>Il massimo teorico di un giro \u00e8 quindi "
             u"24 \u00d7 2 \u00d7 11 = <strong>528</strong>.</p>\n")

    p.append(u"  <h2>La regola della linea, e cosa non conta</h2>")
    p.append(u"  <ul>\n"
             u"    <li>una freccia che tocca la linea fra due zone prende il "
             u"<strong>valore pi\u00f9 alto</strong>;</li>\n"
             u"    <li>corno, zoccolo e le altre parti dichiarate fuori "
             u"punteggio non contano, e la freccia \u00e8 un <em>miss</em>;</li>\n"
             u"    <li>una freccia che passa attraverso una parte non a punto "
             u"ma tocca una zona valida prende il valore della zona che "
             u"tocca;</li>\n"
             u"    <li>una freccia di rimbalzo su cui il gruppo non trova un "
             u"accordo vale <strong>5</strong>;</li>\n"
             u"    <li>una freccia che scivola via dalla sagoma \u00e8 un "
             u"<em>miss</em>.</li>\n  </ul>\n")

    p.append(u"  <h2>I tempi</h2>")
    p.append(u"  <p>Nelle qualificazioni il limite \u00e8 di <strong>120 "
             u"secondi</strong>, e viene applicato quando un arciere o un "
             u"gruppo sta ritardando gli altri: non c'\u00e8 un cronometro su "
             u"ogni piazzola. Negli scontri diretti e nelle finali il limite "
             u"\u00e8 di 90 secondi per l'individuale, 120 per le squadre e "
             u"160 per le squadre miste.</p>\n")

    p.append(sezioni_fed(WA_FED, u"World Archery"))
    p.append(coda_app(u"World Archery"))

    p.append(u"  <h2>Fonte del regolamento</h2>")
    p.append(u'  <p class="fonte">I dati numerici di questa pagina sono presi '
             u"da: %s</p>" % fonti([WA_B2, WA_B4]))
    p.append(u'  <p class="fonte">In particolare: Book\u00a02 art.\u00a04.5.2.1 '
             u"per i 24 bersagli e le due frecce, art.\u00a04.5.2.3 per le "
             u"distanze, art.\u00a08.2.2.1 per le quattro zone e la regola "
             u"della linea; Book\u00a04 art.\u00a020.3.1 per le due frecce in "
             u"tutte le fasi, art.\u00a021.8 e 21.10 per i tempi, "
             u"art.\u00a022.2.1 per il rimbalzo.</p>\n")
    p.append(disclaimer(u"di World Archery n\u00e9 di alcuna federazione "
                        u"nazionale"))
    p.append(PIEDE)
    p.append(u"\n</main>\n\n</body>\n</html>\n")
    return u"\n".join(p)


# ══════════════════════════════════════════════════════════════════════════
#  IFAA
# ══════════════════════════════════════════════════════════════════════════

def pagina_ifaa():
    url = "ifaa-3d.html"
    p = [testa(
        u"Punteggio IFAA 3D: Standard e Hunting Round | ArcTrail 3D",
        u"I due round 3D del circuito IFAA: Standard (28 bersagli, 2 frecce, "
        u"10/8/5) e Hunting (28 bersagli, 1 freccia, 20/16/10). Fonte "
        u"ufficiale e federazioni che li applicano.",
        url,
        u"Punteggio IFAA 3D: Standard e Hunting Round",
        u"I due round 3D IFAA spiegati una volta sola, con le federazioni che "
        u"li applicano.")]

    p.append(u"  <h1>Punteggio IFAA 3D: Standard e Hunting Round</h1>\n")
    p.append(u'  <div class="lead">\n'
             u"    <p>Il circuito IFAA ha <strong>due</strong> round su sagome "
             u"3D, e non sono una la variante dell'altro: cambiano il numero "
             u"di posizioni di tiro, il numero di frecce e il valore di ogni "
             u"zona.</p>\n"
             u"    <p>Le sagome sono le stesse e le zone sono le stesse "
             u"\u2014 Kill, Vital, Wound \u2014 ma nello Standard ogni zona "
             u"vale la met\u00e0, perch\u00e9 le frecce sono due invece di "
             u"una. Il massimo del giro \u00e8 560 in tutti e due i casi: "
             u"stesso numero, per strade opposte.</p>\n  </div>\n")
    p.append(cta(u"Segna un giro IFAA con ArcTrail 3D"))

    p.append(u"  <h2>Il 3-D Standard Round</h2>")
    p.append(u"  <p>Le posizioni di tiro sono <strong>due</strong>, a distanze "
             u"diverse dalla stessa sagoma: si tira una freccia dalla prima e "
             u"una dalla seconda, e si sommano tutte e due. A differenza del "
             u"FIARC, qui l'ordine della freccia non cambia il punteggio.</p>")
    p.append(u"  <ul>\n    <li>28 bersagli \u2014 due unit\u00e0 da 14</li>\n"
             u"    <li>2 posizioni di tiro per bersaglio</li>\n"
             u"    <li>1 freccia da ciascuna posizione</li>\n"
             u"    <li>56 frecce complessive</li>\n"
             u"    <li>entrambe le frecce contano, e valgono uguale</li>\n"
             u"  </ul>")
    p.append(tabella({
        "caption": u"Punteggio per zona, uguale per entrambe le frecce",
        "cols": [u"Zona", u"Punti"],
        "rows": [[u"Kill", u"10"], [u"Vital", u"8"], [u"Wound", u"5"]],
    }))
    p.append(u"  <p>Massimo teorico del giro: 28 \u00d7 2 \u00d7 10 = "
             u"<strong>560</strong>.</p>\n")

    p.append(u"  <h2>Il 3-D Hunting Round</h2>")
    p.append(u"  <p>Qui il picchetto \u00e8 uno solo e la freccia \u00e8 una "
             u"sola. Per questo ogni zona vale il doppio dello Standard: la "
             u"piazzola si gioca in un colpo, senza seconda occasione.</p>")
    p.append(u"  <ul>\n    <li>28 bersagli \u2014 due unit\u00e0 da 14</li>\n"
             u"    <li>1 posizione di tiro</li>\n"
             u"    <li>1 freccia per bersaglio</li>\n"
             u"    <li>28 frecce complessive</li>\n  </ul>")
    p.append(tabella({
        "caption": u"Punteggio per zona, freccia unica",
        "cols": [u"Zona", u"Punti"],
        "rows": [[u"Kill", u"20"], [u"Vital", u"16"], [u"Wound", u"10"]],
    }))
    p.append(u"  <p>Massimo teorico del giro: 28 \u00d7 20 = "
             u"<strong>560</strong>.</p>\n")

    p.append(u"  <h2>Le tre zone, e dove passano</h2>")
    p.append(u"  <ul>\n"
             u"    <li><strong>Kill</strong> \u2014 il cerchio interno. Se la "
             u"sagoma ne ha pi\u00f9 di uno, contano come uno solo;</li>\n"
             u"    <li><strong>Vital</strong> \u2014 l'area attorno al "
             u"Kill;</li>\n"
             u"    <li><strong>Wound</strong> \u2014 il resto del corpo, fino "
             u"alla <em>hairline</em>.</li>\n  </ul>")
    p.append(u"  <p>Una freccia deve <strong>tagliare</strong> la linea per "
             u"prendere il valore pi\u00f9 alto: la linea appartiene alla zona "
             u"che vale meno. Frecce piantate nel basamento, nelle corna o "
             u"nei palchi non contano, e non se ne tira un'altra.</p>\n")

    p.append(sezioni_fed(IFAA_FED, u"IFAA"))
    p.append(coda_app(u"IFAA"))

    p.append(u"  <h2>Fonte del regolamento</h2>")
    p.append(u'  <p class="fonte">I dati numerici di questa pagina sono presi '
             u"da: %s</p>" % fonti([IFAA_SRC]))
    p.append(u'  <p class="fonte">In particolare l\'Article\u00a0V '
             u"sezione\u00a0E per il 3-D Hunting Round e sezione\u00a0F per il "
             u"3-D Standard Round, che rimanda alla E per le zone di "
             u"punteggio.</p>\n")
    p.append(disclaimer(u"dell'IFAA n\u00e9 di alcuna federazione nazionale"))
    p.append(PIEDE)
    p.append(u"\n</main>\n\n</body>\n</html>\n")
    return u"\n".join(p)


# ══════════════════════════════════════════════════════════════════════════
#  NFAS — regolamento suo, resta una pagina sua
# ══════════════════════════════════════════════════════════════════════════

def pagina_nfas():
    url = "nfas-3d.html"
    p = [testa(
        u"Punteggio NFAS 3D: il Big Game Round | ArcTrail 3D",
        u"Come si conta il punteggio nel Big Game Round NFAS: fino a tre "
        u"picchetti, una freccia da ciascuno, inner kill 24. Fonte ufficiale "
        u"e formato del giro.",
        url,
        u"Punteggio NFAS 3D: il Big Game Round",
        u"Il Big Game Round della NFAS, con il suo barème e la sua fonte.")]

    p.append(u"  <h1>Punteggio NFAS 3D: il Big Game Round</h1>\n")
    p.append(u'  <div class="lead">\n'
             u"    <p>La NFAS non sta n\u00e9 su World Archery n\u00e9 su "
             u"IFAA: ha un regolamento suo, e il suo formato principale "
             u"\u2014 il Big Game Round \u2014 non somiglia a nessuno degli "
             u"altri due.</p>\n"
             u"    <p>\u00c8 un formato a scendere: si parte dal picchetto "
             u"pi\u00f9 lontano e si avanza solo se si \u00e8 mancato. Appena "
             u"una freccia va a segno la piazzola \u00e8 chiusa.</p>\n"
             u"  </div>\n")
    p.append(cta(u"Segna un giro NFAS con ArcTrail 3D"))

    p.append(u"  <h2>Come si tira</h2>")
    p.append(u"  <ul>\n    <li>fino a tre picchetti, sempre pi\u00f9 "
             u"vicini</li>\n    <li>una freccia da ogni picchetto</li>\n"
             u"    <li>si smette appena una freccia va a segno</li>\n"
             u"    <li>tre aree: inner kill, kill e wound</li>\n  </ul>")
    p.append(u"  <p>L'<em>inner kill</em> vale soltanto sulla prima freccia: "
             u"dal secondo picchetto in poi conta come un kill normale.</p>")
    p.append(tabella({
        "caption": u"Punteggio per area e picchetto",
        "cols": [u"Area", u"1\u00b0 picchetto", u"2\u00b0", u"3\u00b0"],
        "rows": [[u"Inner kill", u"24", u"\u2014", u"\u2014"],
                 [u"Kill", u"20", u"14", u"8"],
                 [u"Wound", u"16", u"10", u"4"]],
    }))
    p.append(u"")

    p.append(u"  <h2>Quante piazzole \u00e8 un giro NFAS</h2>")
    p.append(u"  <p><strong>Il Big Game Round non fissa un numero totale di "
             u"bersagli.</strong> La sezione del regolamento NFAS dedicata al "
             u"Big Game stabilisce sagome, picchetti e punteggio, ma non "
             u"definisce un giro standard da 28 bersagli.</p>")
    p.append(u"  <p>NFAS spiega sul proprio sito che la maggior parte dei "
             u"percorsi comprende <strong>36 o 40 bersagli</strong>. ArcTrail "
             u"3D, nella versione attuale, offre per il Big Game un "
             u"<strong>preset da 28 bersagli</strong>: \u00e8 una scelta "
             u"dell'app, non una regola NFAS.</p>\n")

    p.append(u"  <h2>La sagoma</h2>")
    p.append(u"  <p>La zona alta pu\u00f2 essere divisa in un <em>inner "
             u"kill</em> e un <em>kill</em> esterno; il resto del corpo entro "
             u"la linea \u00e8 il <em>wound</em>. I campionati nazionali NFAS "
             u"e i campionati 3D usano l'inner kill, ma non tutti i percorsi "
             u"lo prevedono.</p>\n")

    p.append(coda_app(u"NFAS"))

    p.append(u"  <h2>Fonte del regolamento</h2>")
    p.append(u'  <p class="fonte">I dati numerici di questa pagina sono presi '
             u"da: %s</p>" % fonti([NFAS_SRC]))
    p.append(u'  <p class="fonte">Per il numero tipico di bersagli sui percorsi: '
             u'<a href="https://nfas.net/about-us/what-we-do" rel="nofollow noopener" '
             u'target="_blank">NFAS — What We Do</a>.</p>')
    p.append(u'  <p class="fonte">Il sito ufficiale della federazione: '
             u'<a href="https://nfas.net" rel="nofollow noopener" '
             u'target="_blank">National Field Archery Society</a>.</p>\n')
    p.append(disclaimer(u"NFAS"))
    p.append(PIEDE)
    p.append(u"\n</main>\n\n</body>\n</html>\n")
    return u"\n".join(p)


# ══════════════════════════════════════════════════════════════════════════
#  L'INDICE
# ══════════════════════════════════════════════════════════════════════════

# Dove manda ogni federazione. Le ancore portano al punto esatto della pagina
# del regolamento: chi cerca «punteggio FITARCO 3D» non deve leggere dieci
# sezioni per trovare la sua.
DESTINAZIONI = {
    "Italia": [("FIARC", ["/fiarc.html"]),
               ("FITARCO", ["/world-archery-3d.html#fitarco"])],
    "Francia": [("FFTA", ["/world-archery-3d.html#ffta"]),
                ("FFTL", ["/ifaa-3d.html#fftl"])],
    "Svizzera": [("SwissArchery", ["/world-archery-3d.html#swissarchery"]),
                 ("FAAS", ["/ifaa-3d.html#faas"])],
    "Austria": [("\u00d6BSV", ["/world-archery-3d.html#oebsv",
                               "/ifaa-3d.html#oebsv"])],
    "Germania": [("DSB", ["/world-archery-3d.html#dsb"]),
                 ("DFBV", ["/ifaa-3d.html#dfbv"])],
    "Regno Unito": [("Archery GB", ["/world-archery-3d.html#archerygb"]),
                    ("NFAS", ["/nfas-3d.html"]),
                    ("EFAA", ["/ifaa-3d.html#efaa"])],
    "Turchia": [("TOF", ["/world-archery-3d.html#tof"])],
    "Spagna": [("RFETA", ["/world-archery-3d.html#rfeta"])],
    "Paesi Bassi": [("KHSN", ["/world-archery-3d.html#khsn",
                              "/ifaa-3d.html#khsn"])],
    "Svezia": [("SBF", ["/world-archery-3d.html#sbf"]),
               ("SFSF", ["/ifaa-3d.html#sfsf"])],
}
ORDINE = ["Italia", "Francia", "Svizzera", "Austria", "Germania",
          "Regno Unito", "Turchia", "Spagna", "Paesi Bassi", "Svezia"]

NOMI = {"/fiarc.html": "FIARC",
        "/world-archery-3d.html": "World Archery",
        "/ifaa-3d.html": "IFAA",
        "/nfas-3d.html": "NFAS"}


def pagina_hub():
    url = "regolamenti-3d.html"
    p = [testa(
        u"Regolamenti e punteggi del tiro con l'arco 3D | ArcTrail 3D",
        u"I quattro regolamenti 3D supportati da ArcTrail 3D \u2014 FIARC, "
        u"World Archery, IFAA e NFAS \u2014 e le diciassette federazioni che "
        u"li applicano, paese per paese.",
        url,
        u"Regolamenti e punteggi del tiro con l'arco 3D",
        u"I quattro regolamenti 3D supportati da ArcTrail 3D, e le "
        u"federazioni che li applicano.")]

    p.append(u"  <h1>Regolamenti e punteggi del tiro con l'arco 3D</h1>\n")
    p.append(u'  <div class="lead">\n'
             u"    <p>Nel 3D lo stesso nome non vuol dire la stessa gara. "
             u"ArcTrail 3D raccoglie i regolamenti di pi\u00f9 federazioni e "
             u"circuiti, e fra l'uno e l'altro cambiano il numero di "
             u"piazzole, il numero di frecce, le zone della sagoma e il "
             u"valore di ogni zona.</p>\n"
             u"    <p>I regolamenti veri per\u00f2 sono <strong>quattro</strong>"
             u", non diciassette: la maggior parte delle federazioni ne "
             u"applica uno gi\u00e0 scritto da qualcun altro. Per questo qui "
             u"si parte dal regolamento, e la federazione dice solo quale dei "
             u"quattro cercare.</p>\n  </div>\n")
    p.append(cta(u"Apri ArcTrail 3D"))

    p.append(u"  <h2>I quattro regolamenti</h2>")
    for href, titolo, righe in [
        ("/fiarc.html", u"FIARC",
         u"Quattro formati diversi: Round 3D, Percorso, Tracciato e Battuta. "
         u"Il Tracciato conta soltanto la prima freccia che va a segno, la "
         u"Battuta ha 28 piazzole con tipi diversi di bersaglio."),
        ("/world-archery-3d.html", u"World Archery 3D",
         u"24 bersagli, due frecce, quattro zone da 11, 10, 8 e 5. Lo "
         u"applicano dieci federazioni in dieci paesi."),
        ("/ifaa-3d.html", u"IFAA 3D",
         u"Due round diversi: lo Standard con 28 bersagli, due frecce e "
         u"10/8/5, e l'Hunting con 28 bersagli, una freccia e 20/16/10."),
        ("/nfas-3d.html", u"NFAS Big Game",
         u"Fino a tre picchetti, una freccia da ciascuno finch\u00e9 non si "
         u"va a segno. Inner kill 24 sulla prima freccia soltanto."),
    ]:
        p.append(u'  <div class="fed">')
        p.append(u'    <h3><a href="%s">%s</a></h3>' % (href, titolo))
        p.append(u"    <p>%s</p>" % righe)
        p.append(u"  </div>")
    p.append(u"")

    p.append(u"  <h2>Le federazioni, paese per paese</h2>")
    p.append(u"  <p>Ogni federazione porta al regolamento che le compete. "
             u"Due di loro stanno su due circuiti insieme, e allora i "
             u"regolamenti sono due: \u00abgara 3D\u00bb da solo non basta a "
             u"dire che gara sia.</p>")
    for paese in ORDINE:
        p.append(u'  <p class="paese">%s</p>' % paese)
        righe = []
        for sigla, dests in DESTINAZIONI[paese]:
            voci = u" \u00b7 ".join(
                u'<a href="%s">%s</a>' % (d, NOMI[d.split("#")[0]])
                for d in dests)
            righe.append(u"    <li><strong>%s</strong> \u2014 %s</li>"
                         % (sigla, voci))
        p.append(u'  <ul class="elenco-fed">\n%s\n  </ul>'
                 % u"\n".join(righe))
    p.append(u"")

    p.append(u"  <h2>Perch\u00e9 il formato conta pi\u00f9 della federazione</h2>")
    p.append(u"  <p>Il regolamento non \u00e8 una propriet\u00e0 della "
             u"federazione: \u00e8 una propriet\u00e0 della gara. Una stessa "
             u"federazione pu\u00f2 stare su due circuiti e proporre due gare "
             u"che si chiamano tutte e due \u00ab3D\u00bb e non hanno lo "
             u"stesso punteggio \u2014 succede in Austria e nei Paesi "
             u"Bassi.</p>")
    p.append(u"  <p>Per questo ArcTrail 3D chiede il formato prima del giro e "
             u"non dopo: \u00e8 l'unica domanda che permette a tutte le altre "
             u"di avere una risposta giusta.</p>")
    p.append(cta(u"Apri il segnapunti"))

    p.append(u"  <h2>Fonte dei regolamenti</h2>")
    p.append(u'  <p class="fonte">Ogni pagina dichiara da quale regolamento '
             u"vengono i suoi numeri, con versione e data, e rimanda al testo "
             u"ufficiale. Dove una federazione non pubblica un regolamento 3D "
             u"nazionale separato, la pagina lo dice apertamente invece di "
             u"far finta di niente.</p>\n")
    p.append(disclaimer(u"di nessuna federazione"))
    p.append(PIEDE)
    p.append(u"\n</main>\n\n</body>\n</html>\n")
    return u"\n".join(p)


# ══════════════════════════════════════════════════════════════════════════

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nuove")
if not os.path.isdir(OUT):
    os.makedirs(OUT)

FATTE = [("world-archery-3d.html", pagina_wa),
         ("ifaa-3d.html", pagina_ifaa),
         ("nfas-3d.html", pagina_nfas),
         ("regolamenti-3d.html", pagina_hub)]

for nome, fn in FATTE:
    io.open(os.path.join(OUT, nome), "w", encoding="utf-8").write(fn())
    print("  %s" % nome)

print("\n%d pagine scritte in %s" % (len(FATTE), OUT))
print("fiarc.html non e' toccata da questo generatore: e' gia' online.")
