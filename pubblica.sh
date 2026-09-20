#!/bin/bash
#
# pubblica.sh — pubblica le Cloud Functions di ArcTrail 3D dal Cloud Shell.
#
#   bash ~/pubblica.sh                 # tutte e sette
#   bash ~/pubblica.sh pushNotifica    # una sola
#
# COSA E' CAMBIATO IL 17/09/2026, E PERCHE' CONTA.
#
# Fino a oggi questo script si costruiva una cartella Functions al volo:
# scaricava il solo `index.js` da raw.githubusercontent e scriveva lui il
# `package.json`. Funzionava, ma voleva dire che **la struttura vera del
# deploy non stava nel repository**: stava qui dentro, in venti righe di
# script. Due logiche di pubblicazione che possono divergere sono una di
# troppo, e quella che diverge in silenzio e' sempre quella che non si
# guarda.
#
# Dal 17/09 il repository E' un progetto Firebase canonico: `firebase.json`
# dichiara `functions/`, che contiene `index.js`, `package.json` e il suo
# lockfile. Quindi qui non si costruisce piu' niente: si prende il
# repository e si pubblica quello. **Il codice che si vede su GitHub e' il
# codice che Firebase pubblica.**
#
# E si puo' pubblicare UNA funzione sola. Prima no: era tutto o niente, e
# per correggere una riga in `pushNotifica` si ridistribuivano anche le
# altre sei, identiche.
#
# COSA NON FA. Non risponde da solo alle domande di firebase. Il prompt che
# chiede conferma prima di CANCELLARE una funzione e' l'ultima rete: se un
# giorno il codice fosse sbagliato, quella domanda e' l'unica cosa fra un
# errore e la perdita delle funzioni che oggi funzionano. Percio' niente
# `--force`, mai.

set -u

RAMO="main"
REPO_GIT="https://github.com/alessandrozanetta80-boop/arctrail3d.git"
CASA="$HOME/at3d-repo"
SOLO="${1:-}"          # nome di una funzione, oppure vuoto per tutte

# Le funzioni che devono esserci. Se il file non le contiene tutte, non e' il
# file giusto e il deploy cancellerebbe quelle mancanti.
# `claimCompagnia` e' entrata il 20/09/2026: mette la compagnia nel token come
# custom claim, perche' una regola di Firestore che chiama `get()` non
# restringe le query. Finche' non e' pubblicata, i soci non vedono nell'elenco
# gli allenamenti «solo club» della loro compagnia.
ATTESE="sendNotification pushNotifica avvisaRicerche avvisaSegnalazione avvisaIscrizione avvisaRichiestaClub avvisaPercorso claimCompagnia"

rosso()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde()  { printf '\033[32m%s\033[0m\n' "$*"; }
giallo() { printf '\033[33m%s\033[0m\n' "$*"; }

echo ""
echo "══ ArcTrail 3D — pubblicazione funzioni ══"
echo ""

# ── 1. Il repository, alla revisione che sta su GitHub ──────────────────────
# Si clona o si aggiorna: in tutti e due i casi si finisce sulla stessa
# revisione che chiunque puo' leggere online. `reset --hard` sul ramo remoto
# perche' qui non si lavora: si pubblica soltanto.
if [ -d "$CASA/.git" ]; then
  echo "  aggiorno $CASA…"
  git -C "$CASA" fetch --depth 1 origin "$RAMO" || { rosso "  GitHub non risponde. Niente e' stato toccato."; exit 1; }
  git -C "$CASA" reset --hard "origin/$RAMO" >/dev/null || exit 1
else
  echo "  clono il repository in $CASA…"
  git clone --depth 1 --branch "$RAMO" "$REPO_GIT" "$CASA" || { rosso "  clone non riuscito."; exit 1; }
fi

cd "$CASA" || exit 1
REVISIONE=$(git rev-parse --short HEAD)
echo "  revisione: $REVISIONE"

# ── 2. E' davvero un progetto Functions? ────────────────────────────────────
if [ ! -f firebase.json ] || ! grep -q '"functions"' firebase.json; then
  rosso "  firebase.json non dichiara nessuna sorgente functions. FERMO."
  exit 1
fi
if [ ! -f functions/index.js ] || [ ! -f functions/package.json ]; then
  rosso "  manca functions/index.js o functions/package.json. FERMO."
  exit 1
fi

# ── 3. E' il file giusto? ───────────────────────────────────────────────────
VERSIONE=$(grep -m1 -o 'Versione [0-9A-Za-z.-]*' functions/index.js | sed 's/Versione //')
QUANTE=$(grep -c '^exports' functions/index.js)

echo ""
echo "  versione dichiarata: ${VERSIONE:-NESSUNA}"
echo "  funzioni nel file:   $QUANTE"

MANCANTI=""
for f in $ATTESE; do
  grep -q "^exports\.$f" functions/index.js || MANCANTI="$MANCANTI $f"
done

if [ -n "$MANCANTI" ]; then
  rosso ""
  rosso "  FERMO. Nel repository mancano:$MANCANTI"
  rosso "  Non e' il codice giusto — GitHub potrebbe non aver ancora servito"
  rosso "  l'ultima versione. Aspetta un minuto e rilancia."
  rosso "  Niente e' stato pubblicato."
  exit 1
fi

if [ -n "$SOLO" ]; then
  if ! grep -q "^exports\.$SOLO" functions/index.js; then
    rosso "  FERMO: «$SOLO» non e' una funzione di questo file."
    exit 1
  fi
fi

# ── 4. Le dipendenze, solo se servono ───────────────────────────────────────
if [ ! -d functions/node_modules/firebase-functions ]; then
  echo ""
  echo "  installo le dipendenze (la prima volta ci mette un minuto)…"
  (cd functions && npm install --silent) || { rosso "  npm install non e' riuscito."; exit 1; }
  verde "  dipendenze pronte"
else
  echo "  dipendenze gia' a posto"
fi

# ── 5. Il deploy ────────────────────────────────────────────────────────────
if [ -n "$SOLO" ]; then
  BERSAGLIO="functions:$SOLO"
  echo ""
  echo "══ deploy della sola «$SOLO» ══"
else
  BERSAGLIO="functions"
  echo ""
  echo "══ deploy di tutte e sette ══"
fi

giallo "  Alla domanda «create» rispondi  y"
rosso  "  Se compare «delete» rispondi  N  e fermati: vorrebbe dire che sta"
rosso  "  guardando un codice sbagliato e cancellerebbe funzioni che servono."
echo ""

if firebase deploy --only "$BERSAGLIO" --project arctrail3d; then
  verde ""
  verde "══ pubblicato: ${VERSIONE:-?} · revisione $REVISIONE ══"
  echo ""
  echo "  Un deploy e' fatto quando la funzione COMPARE NELL'ELENCO."
  echo "  Console Firebase → Functions: devono esserci $QUANTE funzioni,"
  echo "  tutte in europe-west1."
else
  rosso ""
  rosso "══ il deploy NON e' riuscito ══"
  echo ""
  echo "  Il codice sta in $CASA/functions/index.js, alla revisione $REVISIONE."
  echo "  Copia l'errore per intero: la riga che conta di solito e' l'ultima."
  exit 1
fi
