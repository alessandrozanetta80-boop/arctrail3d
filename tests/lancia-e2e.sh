#!/bin/sh
# lancia-e2e.sh — e2e-emulatore.js dentro gli emulatori Auth + Firestore.
#
#   sh tests/lancia-e2e.sh
#   APP=percorso/app.html sh tests/lancia-e2e.sh    # sabotaggio
#
# NON sta nel giro completo: la prima volta scarica le librerie Firebase da
# gstatic, e vuole le porte 8080 e 9099 libere (le stesse di lancia-regole).
# Si lancia prima di ogni pubblicazione che tocca app, regole o accesso.
# (21/09/2026)
cd "$(dirname "$0")/.." || exit 1
if ! command -v java >/dev/null 2>&1; then echo "  ✗ Java non c'e' (serve >= 17)."; exit 1; fi
if [ ! -f node_modules/.bin/firebase ]; then echo "  ✗ firebase-tools non installato: npm install."; exit 1; fi
exec node_modules/.bin/firebase emulators:exec --only auth,firestore --project arctrail3d \
  --config tests/e2e-firebase.json "node tests/e2e-emulatore.js"
