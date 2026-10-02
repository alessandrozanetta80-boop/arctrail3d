#!/bin/sh
# lancia-campo-regole.sh — banco-campo-regole.js dentro gli emulatori
# Firestore + Storage, su porte proprie (8086, 9198, hub 4406, log 4506: tests/campo-firebase.json),
# cosi' nel giro completo non si scontra con lancia-regole.sh (8080).
# (02/10/2026, Mappa campo.)
cd "$(dirname "$0")/.." || exit 1
if ! command -v java >/dev/null 2>&1; then echo "  ✗ Java non c'e' (serve >= 17)."; exit 1; fi
if [ ! -f node_modules/.bin/firebase ]; then echo "  ✗ firebase-tools non installato: npm install."; exit 1; fi
# Le regole VERE le carica il banco (initializeTestEnvironment). L'emulatore
# Storage pero' non parte senza un file di regole nel suo config, e il config
# non puo' puntare fuori dalla sua cartella: gli si da' un segnaposto chiuso,
# creato qui e tolto alla fine.
printf '%s\n' "rules_version = '2';" "service firebase.storage { match /b/{bucket}/o { match /{a=**} { allow read, write: if false; } } }" > tests/.campo-avvio-storage.rules
npx --no-install firebase emulators:exec --only firestore,storage --project demo-arctrail3d-campo \
  --config tests/campo-firebase.json "node tests/banco-campo-regole.js" > "${TMPDIR:-/tmp}/arctrail-campo.$$" 2>&1
esito=$?
rm -f tests/.campo-avvio-storage.rules
grep -E "^  |passate|Error|errore" "${TMPDIR:-/tmp}/arctrail-campo.$$" | grep -v "@firebase/"
rm -f "${TMPDIR:-/tmp}/arctrail-campo.$$"
exit $esito
