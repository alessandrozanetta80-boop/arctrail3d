#!/bin/sh
# controlla-tutto.sh — i dodici banchi, in ordine, sui file veri.
#
#   sh controlla-tutto.sh
#
# L'ORDINE NON E' CASUALE. Il primo e' `controlla-base.js`, ed e' l'unico che
# guarda fuori: chiede se questi file sono QUELLI GIUSTI, prima che gli altri
# quattro chiedano se sono fatti bene. Se la base e' sbagliata, gli altri
# cinque direbbero di si' su un file vecchio — che e' esattamente quello che
# e' successo il 17/08/2026, sera.
#
# Percio': se il primo dice no, questo script si FERMA. Non prosegue.
# Uscita 0 = tutti passati. Uscita 1 = almeno uno ha detto no.

fallito=0
riga() { echo ""; echo "════════ $1 ════════"; }

riga "1/12 — controlla-base.js (e' questa la base giusta?)"
if ! node controlla-base.js; then
  echo ""
  echo ">>> LA BASE E' SBAGLIATA. Gli altri cinque non vengono lanciati:"
  echo ">>> su un file vecchio direbbero di si' e non servirebbe a niente."
  exit 1
fi

# IL SECONDO E' NUOVO, ED E' NATO DA UN GUASTO DEL 20/08/2026. Una parentesi
# non chiusa spegneva l'app intera, e i primi otto banchi dicevano tutti di
# si': la base era in pari, i token a posto, jsdom contento. Il primo a
# accorgersene era il nono, che apre un browser — e lo diceva cosi': «il
# gancio del banco non c'e'».
# Un errore di grammatica non si nasconde: spegne tutto, e ogni prova legge
# lo spegnimento come un difetto suo. Percio' la domanda va fatta per prima,
# e costa venti millisecondi.
riga "2/12 — controlla-sintassi.js (i copioni sono grammatica?)"
if ! node controlla-sintassi.js index.html; then
  echo ""
  echo ">>> UN COPIONE NON SI COMPILA. Gli altri non vengono lanciati:"
  echo ">>> su un'app che non parte direbbero no tutti, e per il motivo sbagliato."
  exit 1
fi
node controlla-sintassi.js marketplace.html || fallito=1

riga "3/12 — controlla-token.js (il guardiano dello stile)"
node controlla-token.js index.html || fallito=1

riga "4/12 — banco-firme.js (ridisegno mirato)"
node banco-firme.js index.html || fallito=1

riga "5/12 — prova-schermo.js (schermata iscritti, jsdom)"
node prova-schermo.js index.html || fallito=1

riga "6/12 — mercatino: banco-avvisi.js + prova-schermo-market.js"
node banco-avvisi.js || fallito=1
node prova-schermo-market.js || fallito=1

# Il sesto e' l'unico che guarda le NOVE LINGUE e le due pagine legali: senza,
# una frase italiana dentro il codice o una chiave mancante in una lingua sola
# non le vede nessuno, perche' non rompono niente — si limitano a farsi
# leggere dalla persona sbagliata.
riga "7/12 — banco-lingue.js (nove lingue e porte d'ingresso)"
node banco-lingue.js index.html || fallito=1

# Il settimo estrae dal file la macchina delle cinque schede del pannello
# admin e la fa girare in jsdom. Non ricopia il codice: se la macchina nel
# file cambia, cambia anche quella provata. Nasce il 20/08/2026, e nasce da
# un errore vero: admTabDaAvviso era finita DENTRO destinazioneNotifica e
# veniva chiamata da fuori — il pannello si sarebbe aperto su un errore, e a
# leggere il codice non si vedeva.
riga "8/12 — banco-schede.js (le cinque schede del pannello, jsdom)"
node banco-schede.js || fallito=1

# L'ottavo guarda i primi due secondi: il tema messo prima della prima
# pennellata e il render() che non aspetta la rete. Due cure da poche righe
# che, se sparissero, non romperebbero niente — l'app tornerebbe solo a
# lampeggiare e a partire bianca, e non se ne accorgerebbe nessuno.
riga "9/12 — banco-avvio.js (i primi due secondi, jsdom)"
node banco-avvio.js || fallito=1

# Il nono monta la scheda degli allenamenti aperti con dei dati finti e guarda
# cosa esce: quando compaiono le tendine, cosa offrono, e soprattutto se
# quello che il filtro toglie viene DETTO. Un filtro sbagliato non da' nessun
# errore: mostra di meno, e chi guarda pensa che di meno ci sia.
riga "10/12 — banco-allenamenti.js (le tendine degli allenamenti, playwright)"
node banco-allenamenti.js || fallito=1

# Il decimo semina uno storico con le risposte gia' note e controlla i quattro
# numeri della Home. Un cruscotto e' la cosa piu' facile da riempire di numeri
# plausibili: se il calcolo sbaglia non protesta nessuno, si legge un numero e
# si crede. E controlla anche il caso vuoto: senza giri non deve comparire
# nessuna fascia di zeri.
riga "11/12 — banco-home.js (i quattro numeri della Home, playwright)"
node banco-home.js || fallito=1

# Il dodicesimo guarda l'area compagnia a schede e la riga dell'allenamento:
# le due cose ridisegnate il 20/08. Una riga che si apre e una scheda che
# resta scelta dopo il ridisegno sono comportamenti, non aspetto, e nessuno
# degli altri undici li guarda.
riga "12/12 — banco-compagnia.js (l'area compagnia a schede, playwright)"
node banco-compagnia.js || fallito=1

echo ""
if [ "$fallito" = "0" ]; then echo "TUTTI PASSATI."
else echo "ALMENO UNO HA DETTO NO — leggere sopra."; fi
exit $fallito
