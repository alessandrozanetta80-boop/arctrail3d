#!/bin/sh
# lancia-finestra.sh — banco-finestra.js dentro l'emulatore Firestore.
#
#   sh tests/lancia-finestra.sh
#   BASE=altroramo sh tests/lancia-finestra.sh   # contro un'altra versione online
#
# Stessa impalcatura di `lancia-regole.sh` (stesso emulatore, stesse
# dipendenze): quello chiede se le regole dicono di no a chi deve, questo
# chiede se dicono di si' a chi non ha ancora aggiornato l'app.
#
# Vuole la STORIA di git, non solo l'ultimo commit: le regole di ieri si
# leggono con `git show main:firestore.rules`. In CI: fetch-depth: 0.
cd "$(dirname "$0")/.." || exit 1

if ! command -v java >/dev/null 2>&1; then
  echo "  ✗ Java non c'e': l'emulatore Firestore non puo' partire (serve Java >= 17)."
  exit 1
fi
if [ ! -x node_modules/.bin/firebase ] && [ ! -f node_modules/.bin/firebase ]; then
  echo "  ✗ firebase-tools non installato: npm install (e' nelle devDependencies)."
  exit 1
fi

npx --no-install firebase emulators:exec --only firestore --project arctrail3d-prova \
  "node tests/banco-finestra.js" > "${TMPDIR:-/tmp}/arctrail-finestra.$$" 2>&1
esito=$?
grep -E "^  |passate|Error|errore" "${TMPDIR:-/tmp}/arctrail-finestra.$$" | grep -v "@firebase/firestore"
rm -f "${TMPDIR:-/tmp}/arctrail-finestra.$$"
exit $esito
