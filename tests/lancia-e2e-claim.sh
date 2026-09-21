#!/bin/sh
# lancia-e2e-claim.sh — e2e-claim.js dentro gli emulatori Auth + Firestore +
# Functions (la `claimCompagnia` vera, da functions/index.js).
#
#   sh tests/lancia-e2e-claim.sh
#
# Usa il firebase.json della radice (le Functions devono stare dentro la
# cartella del progetto). Vuole `npm ci` anche in functions/, le porte 8080,
# 9099 e 5001 libere, e la prima volta la rete per le librerie. NON sta nel
# giro completo. (21/09/2026)
cd "$(dirname "$0")/.." || exit 1
if ! command -v java >/dev/null 2>&1; then echo "  ✗ Java non c'e' (serve >= 17)."; exit 1; fi
if [ ! -d functions/node_modules ]; then echo "  ✗ manca functions/node_modules: (cd functions && npm ci)."; exit 1; fi
exec node_modules/.bin/firebase emulators:exec --only auth,firestore,functions --project demo-arctrail3d \
  "node tests/e2e-claim.js"
