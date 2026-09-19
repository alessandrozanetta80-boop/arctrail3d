#!/bin/sh
# controlla-tutto.sh — tutti i banchi, sui file veri.
#
#   sh tests/controlla-tutto.sh          # in parallelo, sei alla volta
#   PAR=1 sh tests/controlla-tutto.sh    # in fila, come prima (per capire un guasto)
#   PAR=5 sh tests/controlla-tutto.sh    # piu' larghi, su una macchina piu' grossa
#   ESTERNI=1 sh tests/controlla-tutto.sh  # anche le prove che vogliono la rete vera
#
# QUANTI SONO NON STA SCRITTO IN NESSUNA PROSA. Lo dice questo file, e basta:
#     grep -c '^banco ' tests/controlla-tutto.sh
# Un conto ricopiato in un diario invecchia il giorno che si aggiunge un
# banco, e poi mente per settimane. Il 26/08/2026 ce n'erano tre diversi in
# tre posti.
#
# I DUE CANCELLI RESTANO IN FILA, E PRIMA DI TUTTO.
# Il primo e' `controlla-base.js`, l'unico che guarda fuori: chiede se questi
# file sono QUELLI GIUSTI prima che gli altri chiedano se sono fatti bene. Il
# 17/08/2026 i banchi hanno girato su file vecchi e hanno detto di si' a tutto.
# Il secondo e' `controlla-sintassi.js`, nato da un guasto del 20/08/2026: una
# parentesi non chiusa spegneva l'app intera e i primi otto banchi dicevano
# tutti di si'. Un errore di grammatica non si nasconde: spegne tutto, e ogni
# prova legge lo spegnimento come un difetto suo.
# Se uno dei due dice no, qui ci si FERMA.
#
# ── PERCHE' IN PARALLELO (26/08/2026) ─────────────────────────────────────
# Misurato: i banchi con browser costavano ~4 minuti, e la macchina era quasi
# ferma. Non erano gli avvii di Chromium: era che quindici processi
# ASPETTAVANO in fila, uno alla volta. Ogni banco passa la maggior parte del
# tempo dentro `waitForTimeout`, cioe' a dormire mentre la pagina si posa.
# Sei che dormono insieme costano quanto uno. MISURATO il 26/08 su una
# macchina a un core: in fila ~290s, tre alla volta 186s, sei alla volta
# **154s**. Oltre sei non scende piu': li' il core e' pieno davvero.
# I banchi sono processi separati che non si toccano — cartelle temporanee
# diverse, porte diverse — quindi l'ordine fra loro non conta. **Conta
# l'ordine in cui si LEGGONO**, e quello resta identico: l'uscita di ognuno si
# tiene da parte e si stampa in fila alla fine, come prima.
# Se un banco fallisce in parallelo, rilancia prima solo quel banco; PAR=1
# solo quando serve l'intera suite affidabile (REGOLE-LAVORO regola 23).

# Dal 15/09/2026 i banchi stanno in tests/ e si lanciano dalla radice del
# repository: i file del sito (app.html, index.html...) si leggono da li'.
cd "$(dirname "$0")/.." || exit 1

PAR=${PAR:-6}
fallito=0
riga() { echo ""; echo "════════ $1 ════════"; }

# ── I DUE CANCELLI, IN FILA ───────────────────────────────────────────────
riga "controlla-base.js (e' questa la base giusta?)"
if ! node tests/controlla-base.js; then
  echo ""
  echo ">>> LA BASE E' SBAGLIATA. Gli altri non vengono lanciati:"
  echo ">>> su un file vecchio direbbero di si' e non servirebbe a niente."
  exit 1
fi

riga "controlla-sintassi.js (i copioni sono grammatica?)"
if ! node tests/controlla-sintassi.js app.html; then
  echo ""
  echo ">>> UN COPIONE NON SI COMPILA. Gli altri non vengono lanciati:"
  echo ">>> su un'app che non parte direbbero no tutti, e per il motivo sbagliato."
  exit 1
fi
node tests/controlla-sintassi.js marketplace.html || fallito=1
node tests/controlla-sintassi.js index.html || fallito=1

# ── GLI ALTRI, IN PARALLELO ───────────────────────────────────────────────
# `banco <titolo> <comando>` registra e basta. La riga comincia con `banco `
# perche' e' quella che si conta: vedi in cima.
D=$(mktemp -d)
n=0
banco() {
  n=$((n + 1))
  printf '%s\n' "$1" > "$D/$n.tit"
  printf '%s\n' "$2" > "$D/$n.cmd"
}
# `esterno` e' un banco che NON puo' girare qui: vuole la rete vera e Firebase
# vivo. Non e' un rosso di questa suite — e' una prova d'integrazione, e si
# lancia da una macchina con la rete: ESTERNI=1 sh tests/controlla-tutto.sh
# Resta scritto qui, e nominato a ogni giro, perche' un banco che non si
# nomina piu' e' un banco che nessuno rilancia.
esterno() {
  if [ "${ESTERNI:-0}" = "1" ]; then banco "$1" "$2"
  else echo "  ESTERNO, non eseguito (vuole rete vera): $1"; fi
}

banco "controlla-token.js (il guardiano dello stile)" "node tests/controlla-token.js app.html"
banco "controlla-contrasto.js (il testo si legge sopra il suo fondo)" "node tests/controlla-contrasto.js app.html"
banco "banco-firme.js (ridisegno mirato)" "node tests/banco-firme.js app.html"
banco "prova-schermo.js (schermata iscritti, jsdom)" "node tests/prova-schermo.js app.html"
banco "mercatino: banco-avvisi.js + prova-schermo-market.js" "node tests/banco-avvisi.js && node tests/prova-schermo-market.js"
banco "banco-push.js (la push ad app chiusa: server, service worker, deduplica)" "node tests/banco-push.js"
banco "banco-functions-layout.js (il backend sta dove Firebase lo cerca)" "node tests/banco-functions-layout.js"
banco "banco-lingue.js (nove lingue e porte d'ingresso)" "node tests/banco-lingue.js app.html"
banco "banco-schede.js (le sei schede del pannello, jsdom)" "node tests/banco-schede.js"
banco "banco-avvio.js (i primi due secondi, jsdom)" "node tests/banco-avvio.js"
banco "banco-allenamenti.js (le tendine degli allenamenti, playwright)" "node tests/banco-allenamenti.js"
banco "banco-home.js (i quattro numeri della Home, playwright)" "node tests/banco-home.js"
banco "banco-compagnia.js (l'area compagnia a schede, playwright)" "node tests/banco-compagnia.js"
banco "banco-barra.js (la barra sta dentro lo schermo, playwright)" "node tests/banco-barra.js"
banco "banco-campi.js (la ricerca dei campi, playwright)" "node tests/banco-campi.js"
banco "banco-giro-sicuro.js (il giro in corso non muore col telefono)" "node tests/banco-giro-sicuro.js"
banco "banco-finale.js (la fine del giro non mente, playwright)" "node tests/banco-finale.js"
banco "banco-regolamenti.js (la scelta del tipo di gara, playwright)" "node tests/banco-regolamenti.js"
banco "banco-traguardi.js (i traguardi contano cose vere, playwright)" "node tests/banco-traguardi.js"
banco "banco-attrezzatura.js (l'assetto resta attaccato al giro)" "node tests/banco-attrezzatura.js"
banco "banco-profilo-pubblico.js (cosa si pubblica di se, e cosa no)" "node tests/banco-profilo-pubblico.js"
banco "banco-bordi.js (niente tocca il vetro, playwright)" "node tests/banco-bordi.js"
banco "banco-safe-area.js (la tacca del telefono si conta una volta sola)" "node tests/banco-safe-area.js app.html"
banco "banco-font-scale.js (i caratteri piu' grandi del telefono non rompono niente)" "node tests/banco-font-scale.js app.html"
banco "banco-chat.js (la chat dice quello che deve, e nient'altro)" "node tests/banco-chat.js app.html"
banco "controlla-tavolozza.js (app e mercatino, lo stesso colore)" "node tests/controlla-tavolozza.js"
banco "banco-ruoli-compagnia.js (chi vede cosa nello spazio compagnia)" "node tests/banco-ruoli-compagnia.js"
banco "banco-vetrina.js (la vetrina in nove lingue, playwright)" "node tests/banco-vetrina.js index.html"
banco "banco-vetrina-inglese.js (en internazionale, en-US, en-GB: l'inglese non e' un paese)" "node tests/banco-vetrina-inglese.js"
banco "banco-seo.js (le pagine pubbliche dicono a Google cose vere)" "node tests/banco-seo.js"
banco "banco-italia.js (FIARC, FITARCO e FIDASC per un arciere italiano, playwright)" "node tests/banco-italia.js"
banco "banco-italia-mobile.js (le schermate italiane stanno nel telefono, playwright)" "node tests/banco-italia-mobile.js"
banco "banco-italia-offline.js (l'app installata si apre e segna senza rete, playwright)" "node tests/banco-italia-offline.js"
esterno "banco-porta.js (la porta dell'app, nove lingue, playwright)" "node tests/banco-porta.js app.html"
banco "banco-ifaa.js (il bareme IFAA e i giri di ieri)" "node tests/banco-ifaa.js"
banco "banco-asa.js (il bareme ASA Pro/Am, sulle regole 2026)" "node tests/banco-asa.js"
banco "banco-ibo.js (il bareme IBO, sulle regole 2026)" "node tests/banco-ibo.js"
banco "banco-calendario.js (il calendario dice da chi viene il dato)" "node tests/banco-calendario.js app.html"
banco "banco-ritorno.js (il ritorno canonico e le cose che non tornano)" "node tests/banco-ritorno.js app.html"
banco "controlla-diari.js (i file di testo si possono ancora leggere)" "node tests/controlla-diari.js"
# Dal 19/09/2026 (risanamento post-audit). Le regole Firestore non giravano in
# nessun giro: adesso si, e se manca Java il banco dice no invece di saltare.
banco "banco-regole.js (le regole Firestore sull'emulatore: chi puo' scrivere cosa)" "sh tests/lancia-regole.sh"
banco "banco-xss.js (quello che scrive un altro non diventa codice sul mio telefono)" "node tests/banco-xss.js"
banco "banco-account.js (due persone, un telefono: i dati di A non vanno a B)" "node tests/banco-account.js"
banco "banco-sw-aggiornamento.js (una versione nuova non toglie l'app di mano, nemmeno a meta' giro)" "node tests/banco-sw-aggiornamento.js"
banco "controlla-cache.js (se cambia un file della shell, CACHE_NAME sale)" "node tests/controlla-cache.js"
banco "banco-giro-flusso.js (il giro si apre, si chiude e non si sdoppia)" "node tests/banco-giro-flusso.js"
banco "banco-push-app.js (le push viste dall'app: token per dispositivo, primo piano, tocco)" "node tests/banco-push-app.js"
banco "banco-pista-schermi.js (i tasti del punteggio stanno nello schermo: orizzontale, zoom, S26 Ultra)" "node tests/banco-pista-schermi.js"
banco "banco-recapiti.js (telefono, email e sito delle compagnie diventano link solo se lo sono)" "node tests/banco-recapiti.js"
banco "controlla-pwa.js (zoom, scuro forzato, icona iOS, manifest, foto pigre)" "node tests/controlla-pwa.js"
banco "controlla-pubblicazione.js (sul sito va il sito: diari, banchi, regole e archivio restano fuori)" "node tests/controlla-pubblicazione.js"
banco "banco-tiri.js (rimbalzi, tocchi voluti, annulla: 1, 2 e 4 arcieri)" "node tests/banco-tiri.js"
banco "banco-cronometro.js (lo schermo spento non ferma il conto)" "node tests/banco-cronometro.js"
banco "banco-esterni.js (Google Fonts o gstatic appesi: l'app parte lo stesso)" "node tests/banco-esterni.js"
banco "banco-accessibile.js (finestre dichiarate, fuoco che non scappa, bersagli da 44)" "node tests/banco-accessibile.js"
banco "banco-tastiera.js (con la tastiera aperta si arriva a scrivere e a mandare)" "node tests/banco-tastiera.js"
banco "banco-salto-versione.js (telefono fermo da settimane: si aggiorna e non perde i dati)" "node tests/banco-salto-versione.js"
banco "controlla-versioni.js (i sei timbri di versione dicono la verita' e si muovono insieme)" "node tests/controlla-versioni.js"
banco "banco-chiavi-compagnie.js (la chiave di una societa' non cambia mai sotto i piedi)" "node tests/banco-chiavi-compagnie.js"

echo ""
echo "  ($n banchi, $PAR alla volta — PAR=1 li rimette in fila)"

i=1
attivi=0
while [ $i -le $n ]; do
  # Ogni banco scrive nel SUO file: due che stampano insieme sulla stessa
  # uscita si intrecciano riga per riga, ed e' illeggibile.
  ( sh -c "$(cat "$D/$i.cmd")" > "$D/$i.out" 2>&1; echo $? > "$D/$i.esito" ) &
  attivi=$((attivi + 1))
  if [ $attivi -ge $PAR ]; then wait; attivi=0; fi
  i=$((i + 1))
done
wait

# ── SI LEGGONO IN FILA, NELL'ORDINE DI SEMPRE ─────────────────────────────
# Si contano anche le PROVE, non solo i banchi: «53 verdi» non dice quanto
# e' stato davvero controllato, e un banco che non conta niente (perche' ha
# saltato tutto) da' lo stesso verde di uno che ha fatto cento prove. Quelli
# senza conto vengono elencati a parte: si guardano a mano. (20/09/2026)
i=1
prove=0
cadute=0
muti=""
while [ $i -le $n ]; do
  tit="$(cat "$D/$i.tit")"
  riga "$i/$n — $tit"
  cat "$D/$i.out"
  [ "$(cat "$D/$i.esito" 2>/dev/null)" = "0" ] || fallito=1
  conto="$(grep -o '[0-9][0-9]* passate, [0-9][0-9]* fallite' "$D/$i.out" | tail -1)"
  if [ -n "$conto" ]; then
    prove=$((prove + $(echo "$conto" | cut -d' ' -f1) + $(echo "$conto" | cut -d' ' -f3)))
    cadute=$((cadute + $(echo "$conto" | cut -d' ' -f3)))
  else
    muti="$muti
      $i/$n $tit"
  fi
  if grep -qi "saltat" "$D/$i.out"; then muti="$muti
      $i/$n $tit (dice di aver saltato qualcosa)"; fi
  i=$((i + 1))
done
rm -rf "$D"

echo ""
echo "  $n banchi, $prove prove contate, $cadute cadute."
if [ -n "$muti" ]; then
  echo "  Banchi che non hanno contato le prove (da leggere a mano):$muti"
fi
if [ $fallito -eq 0 ]; then echo "TUTTI PASSATI."; else echo "ALMENO UNO HA DETTO NO — leggere sopra."; fi
exit $fallito
