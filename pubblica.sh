#!/bin/bash
# pubblica.sh — pubblica le Cloud Functions di ArcTrail 3D dal Cloud Shell.
#
#   bash ~/pubblica.sh
#
# PERCHE' ESISTE. La procedura era otto comandi da incollare uno alla volta, e
# ogni volta andava riscritta a mano in chat. Otto occasioni di saltare un
# passo: quello dimenticato piu' spesso e' `npm install`, e il deploy muore su
# «Couldn't find firebase-functions package» dopo aver fatto aspettare due
# minuti.
#
# COSA FA, in ordine:
#   1. prepara la cartella se non c'e' (la prima volta)
#   2. scarica index.js da GitHub
#   3. CONTROLLA che sia il file giusto, e si ferma se non lo e'
#   4. dice cosa e' cambiato dall'ultimo deploy
#   5. installa le dipendenze solo se servono
#   6. lancia il deploy
#
# COSA NON FA. Non risponde da solo alle domande di firebase. Il prompt che
# chiede conferma prima di CANCELLARE una funzione e' l'ultima rete: se un
# giorno il file scaricato fosse sbagliato, quella domanda e' l'unica cosa fra
# un errore e la perdita delle funzioni che oggi funzionano. Percio' niente
# `--force`, mai.

set -u
REPO="https://raw.githubusercontent.com/alessandrozanetta80-boop/arctrail3d/main"
CASA="$HOME/at3d"
FUNZ="$CASA/functions"

# Le funzioni che devono esserci. Se il file scaricato non le contiene tutte,
# non e' il file giusto e il deploy cancellerebbe quelle mancanti.
ATTESE="sendNotification pushNotifica avvisaRicerche avvisaSegnalazione avvisaIscrizione avvisaRichiestaClub avvisaPercorso"

rosso()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde()  { printf '\033[32m%s\033[0m\n' "$*"; }
giallo() { printf '\033[33m%s\033[0m\n' "$*"; }

echo ""
echo "══ ArcTrail 3D — pubblicazione funzioni ══"
echo ""

# ── 1. La cartella ──────────────────────────────────────────────────────────
mkdir -p "$FUNZ" || { rosso "Non riesco a creare $FUNZ"; exit 1; }
cd "$CASA" || exit 1

if [ ! -f firebase.json ]; then
  echo '{"functions":{"source":"functions"}}' > firebase.json
  echo "  creato firebase.json"
fi

if [ ! -f "$FUNZ/package.json" ]; then
  cat > "$FUNZ/package.json" <<'FINE'
{
  "name": "arctrail3d-functions",
  "main": "index.js",
  "engines": { "node": "20" },
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.1.0"
  },
  "private": true
}
FINE
  echo "  creato functions/package.json"
fi

# ── 2. Il codice ────────────────────────────────────────────────────────────
# Il file di ieri si tiene da parte: serve a dire cosa e' cambiato, e a
# rimettere le cose com'erano se il controllo va male.
[ -f "$FUNZ/index.js" ] && cp "$FUNZ/index.js" "$FUNZ/index.js.ieri"

echo "  scarico index.js da GitHub…"
if ! curl -fsSL -o "$FUNZ/index.js.nuovo" "$REPO/index.js"; then
  rosso "  GitHub non risponde. Niente e' stato toccato."
  exit 1
fi

# ── 3. E' il file giusto? ───────────────────────────────────────────────────
VERSIONE=$(grep -m1 -o 'Versione [0-9A-Za-z.-]*' "$FUNZ/index.js.nuovo" | sed 's/Versione //')
QUANTE=$(grep -c '^exports' "$FUNZ/index.js.nuovo")

echo ""
echo "  versione scaricata: ${VERSIONE:-NESSUNA}"
echo "  funzioni nel file:  $QUANTE"

MANCANTI=""
for f in $ATTESE; do
  grep -q "^exports\.$f" "$FUNZ/index.js.nuovo" || MANCANTI="$MANCANTI $f"
done

if [ -n "$MANCANTI" ]; then
  rosso ""
  rosso "  FERMO. Nel file scaricato mancano:$MANCANTI"
  rosso "  Non e' il file giusto — GitHub potrebbe non aver ancora servito"
  rosso "  l'ultima versione. Aspetta un minuto e rilancia."
  rosso "  Niente e' stato pubblicato e la cartella e' rimasta com'era."
  rm -f "$FUNZ/index.js.nuovo"
  exit 1
fi

# ── 4. Cosa cambia ──────────────────────────────────────────────────────────
if [ -f "$FUNZ/index.js.ieri" ] && cmp -s "$FUNZ/index.js.ieri" "$FUNZ/index.js.nuovo"; then
  giallo ""
  giallo "  Questo file e' IDENTICO all'ultimo pubblicato."
  giallo "  Se hai appena caricato su GitHub, potrebbe non essere ancora"
  giallo "  arrivato: aspetta un minuto e rilancia."
  printf "  Pubblicare lo stesso? [s/N] "
  read -r RISP
  case "$RISP" in
    s|S|si|Si|y|Y) ;;
    *) echo "  Va bene, non faccio niente."; rm -f "$FUNZ/index.js.nuovo"; exit 0 ;;
  esac
fi

mv "$FUNZ/index.js.nuovo" "$FUNZ/index.js"

# ── 5. Le dipendenze, solo se servono ───────────────────────────────────────
if [ ! -d "$FUNZ/node_modules/firebase-functions" ]; then
  echo ""
  echo "  installo le dipendenze (la prima volta ci mette un minuto)…"
  (cd "$FUNZ" && npm install --silent) || { rosso "  npm install non e' riuscito."; exit 1; }
  verde "  dipendenze pronte"
else
  echo "  dipendenze gia' a posto"
fi

# ── 6. Il deploy ────────────────────────────────────────────────────────────
echo ""
echo "══ deploy ══"
giallo "  Alla domanda «create» rispondi  y"
rosso  "  Se compare «delete» rispondi  N  e fermati: vorrebbe dire che sta"
rosso  "  guardando un file sbagliato e cancellerebbe funzioni che servono."
echo ""

cd "$CASA" || exit 1
if firebase deploy --only functions --project arctrail3d; then
  verde ""
  verde "══ pubblicato: ${VERSIONE:-?} ══"
  echo ""
  echo "  Un deploy e' fatto quando la funzione COMPARE NELL'ELENCO."
  echo "  Console Firebase → Functions: devono esserci $QUANTE funzioni,"
  echo "  tutte in europe-west1."
else
  rosso ""
  rosso "══ il deploy NON e' riuscito ══"
  echo ""
  echo "  Il codice scaricato e' comunque in $FUNZ/index.js."
  echo "  La versione di prima e' in $FUNZ/index.js.ieri."
  echo "  Copia l'errore per intero: la riga che conta di solito e' l'ultima."
  exit 1
fi
