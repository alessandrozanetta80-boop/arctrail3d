#!/bin/sh
# lancia-regole.sh — banco-regole.js dentro l'emulatore Firestore.
#
#   sh tests/lancia-regole.sh
#   REGOLE=percorso/altre.rules sh tests/lancia-regole.sh   # sabotaggio
#
# DAL 19/09/2026 STA NEL GIRO COMPLETO. Prima restava fuori perche' vuole
# Java e un download da Google, e il risultato era che le regole — la cosa
# che protegge i dati di tutti — erano l'unica parte che nessun giro provava.
# Adesso, se l'emulatore non parte, il banco dice NO e dice perche': un banco
# che salta in silenzio e' un banco spento.
#
# firebase-tools e' fissato a 13.35.1 in package.json (devDependencies): la
# 14 in avanti vuole Java 21, e questa macchina ha Java 17. Si installa con
# `npm install` come gli altri banchi, niente di presente «per caso».
cd "$(dirname "$0")/.." || exit 1

if ! command -v java >/dev/null 2>&1; then
  echo "  ✗ Java non c'e': l'emulatore Firestore non puo' partire (serve Java >= 17)."
  exit 1
fi
if [ ! -x node_modules/.bin/firebase ] && [ ! -f node_modules/.bin/firebase ]; then
  echo "  ✗ firebase-tools non installato: npm install (e' nelle devDependencies)."
  exit 1
fi

# DUE BANCHI, UN EMULATORE SOLO. (20/09/2026.)
# `banco-finestra.js` vuole anche lui l'emulatore, e l'emulatore vuole la porta
# 8080 — una sola. Lanciati come due banchi separati, nel giro a sei alla volta
# partivano insieme e il secondo trovava la porta occupata: un rosso che non
# diceva niente sulle regole, diceva solo che due processi si erano pestati i
# piedi. (Successo davvero il 20/09, alla prima passata.)
# Stanno dentro la STESSA esecuzione: si avvia un emulatore invece di due (che
# e' anche la parte lenta) e la corsa non esiste piu'. Girano tutti e due anche
# se il primo dice no — se no un guasto nelle regole nasconderebbe la finestra.
# `emulators:exec` non passa il comando a una shell: la fila dei due banchi sta
# in `tests/regole-e-finestra.js`, che ha anche il perche' scritto dentro.
npx --no-install firebase emulators:exec --only firestore --project arctrail3d-prova \
  "node tests/regole-e-finestra.js" > "${TMPDIR:-/tmp}/arctrail-regole.$$" 2>&1
esito=$?
# L'emulatore parla molto: si tengono le righe del banco, non i suoi diari.
grep -E "^  |passate|Error|errore" "${TMPDIR:-/tmp}/arctrail-regole.$$" | grep -v "@firebase/firestore"
rm -f "${TMPDIR:-/tmp}/arctrail-regole.$$"
exit $esito
