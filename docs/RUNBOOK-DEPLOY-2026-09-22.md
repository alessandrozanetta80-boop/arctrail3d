# RUNBOOK — pubblicazione del ramo `fix/avvio-firebase-2026-09-21`

Preparato nella notte fra il 21 e il 22/09/2026. **Niente di questo è stato
eseguito.** La produzione è ancora il 18/09 (`7b0ffe9`), verificata file per file.

**Tre gate, una componente alla volta. Dopo ciascuno: STOP, telefono in mano,
conferma. Se un gate fallisce: rollback di QUEL gate, e nessun altro deploy.**
Mai due componenti nello stesso momento.

> **GATE 1 FATTO E SUPERATO (22/09/2026, 12:00).** Pubblicato il ramo
> `work/sicurezza-qualita-2026-09-22` (`main` = `5f4878d`): test verdi (suite 66 /
> 2869 / 0; e2e 18/18; claim 11/11), fast-forward, push **fatto a mano** da
> Alessandro (il controllo permessi di Claude Code blocca il push come deploy).
> Verifica tecnica verde: `controlla-base` IN PARI, file interni a 404, cassa
> `arctrail3d-v168`. **Test reali superati:** nessuna fascia «solo su questo
> telefono», giro salvato, chiusura e riapertura, giro ancora presente,
> sincronizzazione sul secondo dispositivo. **Functions e regole INVARIATE.**
> Il rollback del sito qui sotto resta valido, con `5f4878d` come stato attuale.
> Prossimo: gate 2 (Functions), solo su decisione esplicita.

**La cartella del progetto si chiama `ArcTrail 3D`** (dal 22/09; prima
`ArcTrail3D-Git`). Il nome ha uno spazio: nei comandi il percorso sta **sempre fra
virgolette**, come qui sotto.

Cosa contiene ogni componente, e perché l'ordine è questo, sta in
`STATO-RIPRESA.md`. In breve: **sito → Functions → regole**. Il sito nuovo
funziona con Functions e regole di oggi (provato: `sh tests/lancia-e2e.sh`, app del
ramo × regole del 18/09). Le regole nuove invece chiudono l'elenco allenamenti
all'app del 18/09 e vogliono il claim che mette la Function: vanno per ultime.

---

## Prima di tutto (5 minuti, dal portatile)

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
git status --short                       # deve essere vuoto
git fetch origin
git log --oneline -1 origin/main         # deve essere 1cd0652 (il revert del 20/09)
git worktree list                        # nessuna copia di lavoro avanzata
```

Se `origin/main` non è `1cd0652`, **fermarsi**: qualcuno ha pubblicato nel
frattempo, e questo runbook è scritto su quella base.

---

## GATE 1 — IL SITO

### Cosa cambia per chi usa l'app
L'app `2026-09-22-avvio-storico` (cassa `arctrail3d-v168`), la vetrina
`2026-09-19-risanamento`, `_config.yml` (i file interni spariscono dal sito).
Functions e regole restano quelle di oggi.

### Comando pronto

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
git checkout fix/avvio-firebase-2026-09-21
npm ci && (cd functions && npm ci)
sh tests/controlla-tutto.sh              # TUTTI PASSATI
sh tests/lancia-e2e.sh                   # 18 passate, 0 fallite
git checkout main
git pull --ff-only
git merge --ff-only fix/avvio-firebase-2026-09-21     # deve dire Fast-forward
git push origin main
```

`--ff-only` di proposito: il ramo contiene già `main` (merge `-s ours` del
22/09), quindi `main` avanza senza un solo commit nuovo. Se non passa, **fermarsi**.

### Verifica tecnica (GitHub Pages: 1–2 minuti, cache fino a 10)

```sh
node tests/controlla-base.js             # IN PARI su app, sw, index, marketplace
node tools/controlla-sito-pubblico.js    # interni 404, sito 200
curl -s https://arctrail3d.com/sw.js | grep 'CACHE_NAME ='    # arctrail3d-v168
```

### Test reali (col telefono — vedi i 6 test in fondo: 1, 2, 3, 4, 6)

### Rollback del sito (se fallisce il test 2 o il 3)

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
git checkout main
git read-tree -u --reset 1cd0652          # l'albero del 18/09, esattamente
git checkout fix/avvio-firebase-2026-09-21 -- _config.yml   # i file interni restano fuori
git commit -m "revert: si torna al sito del 18/09 (albero di 1cd0652, piu' _config.yml)"
git push origin main
node tests/controlla-base.js
```

Il telefono che ha preso `v168` torna a `v166` alla prima apertura con rete:
**provato** il 22/09 (`VECCHIO=bae26e8 NUOVO=7b0ffe9 node tests/banco-salto-versione.js`,
16/16 — il browser aggiorna il service worker quando il file cambia, qualunque sia
il numero). Il runbook del 20/09 diceva il contrario: era prudenza, non un fatto.

**STOP. Si va al gate 2 solo dopo la conferma dei test reali.**

---

## GATE 2 — LE FUNCTIONS

### Cosa cambia
Otto funzioni (`2026-09-22-push-argomento`): le push a **ogni** dispositivo,
messaggio solo `data`, `Urgency: high`, TTL un giorno; `claimCompagnia` (nuova) mette
la compagnia nel token. Le app già aggiornate e quelle di ieri funzionano uguale:
il vecchio `fcmToken` si legge ancora.

### Comando pronto

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
npx firebase login:list                   # l'account giusto
npx firebase functions:list --project arctrail3d > ~/functions-prima-gate2.txt
sh pubblica.sh                            # clona origin/main in ~/at3d-repo e pubblica da li'
```

Se compare un prompt di **cancellazione**, rispondere **N**: vorrebbe dire che sta
guardando il codice sbagliato. In produzione ci sono sette funzioni, nel file otto:
c'è solo da aggiungere.

### Verifica tecnica

```sh
npx firebase functions:list --project arctrail3d      # OTTO, tutte v2 europe-west1
npx firebase functions:log --only claimCompagnia --project arctrail3d | head -40
```

### Test reali: 5 (push ad app chiusa, due dispositivi) e, dopo aver aperto l'app,
in console Firestore `users/{il tuo uid}` deve avere `claimApplicata`.

### Rollback delle Functions

Come il 20/09 (commit `1cd0652`): le sette di prima, **per nome**, poi
`claimCompagnia` tolta a mano.

```sh
rm -rf /tmp/fn-1809 && mkdir /tmp/fn-1809
git -C "$HOME/Desktop/PROGETTI/ArcTrail 3D" archive 7b0ffe9 firebase.json .firebaserc functions | tar -x -C /tmp/fn-1809
cd /tmp/fn-1809/functions && npm ci && cd ..
npx firebase deploy --project arctrail3d --only \
  functions:sendNotification,functions:pushNotifica,functions:avvisaRicerche,functions:avvisaSegnalazione,functions:avvisaIscrizione,functions:avvisaRichiestaClub,functions:avvisaPercorso
npx firebase functions:delete claimCompagnia --region europe-west1 --project arctrail3d --force
npx firebase functions:list --project arctrail3d      # sette
```

Cosa resta indietro, ed è inerte: i claim nei token e `claimApplicata`/`claimAl`
nei documenti `users` (nessuno li legge se le regole sono quelle di oggi).

**STOP. Si va al gate 3 solo dopo la conferma, e non lo stesso giorno del gate 1:**
più telefoni hanno già l'app nuova, meno gente vede l'elenco allenamenti vuoto
(l'app del 18/09 con le regole nuove: elenco rifiutato — provato in matrice).

---

## GATE 3 — LE REGOLE DI FIRESTORE

### Cosa cambia
`2026-09-20-visibilita`: gli allenamenti «solo club» sono una porta vera, non un
filtro dell'app; il resto delle correzioni di sicurezza del 19–20/09.

### Comando pronto

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
git checkout main && git pull --ff-only
git show 7b0ffe9:firestore.rules > ~/regole-prima-gate3.rules      # la copia per tornare indietro
diff <(git show origin/main:firestore.rules) firestore.rules && echo "file = main"
npx firebase deploy --only firestore:rules --project arctrail3d
```

### Verifica tecnica
Console Firebase → Firestore → Regole: in cima `// Versione 2026-09-20-visibilita`.

### Test reali, in quest'ordine
1. su un telefono **aggiornato** l'elenco allenamenti **non è vuoto** (se lo è:
   rollback subito);
2. un account di **un'altra compagnia** non vede i «solo club»;
3. un **socio** li vede — se non li vede subito, chiudere e riaprire l'app una
   volta (limite dichiarato: due tentativi di rinnovo per sessione; provato in
   `sh tests/lancia-e2e-claim.sh`).

### Rollback delle regole (secondi, per tutti)

```sh
cd "$HOME/Desktop/PROGETTI/ArcTrail 3D"
cp ~/regole-prima-gate3.rules firestore.rules
npx firebase deploy --only firestore:rules --project arctrail3d
git checkout firestore.rules
```

**STOP.**

---

## I 6 TEST MANUALI (in ordine)

| # | cosa | dispositivi | gate |
|---|---|---|---|
| 1 | Apertura e accesso: l'app si apre con la rete, si arriva alla Home col proprio nome | telefono già usato | 1 |
| 2 | **Nessuna** fascia «Stai lavorando solo su questo telefono» | stesso | 1 — **CANCELLO** |
| 3 | Si tira un giro breve, si chiude: la schermata finale dice **salvato**; si chiude e si riapre l'app: il giro c'è; lo si ritrova sul **secondo dispositivo** (computer o altro telefono) | 2 dispositivi | 1 — **CANCELLO** |
| 4 | Diario → Giri: «Mostra altri giri» scorre tutto; con un account che ha più di 150 giri, «Carica i giri più vecchi» porta i più vecchi | telefono | 1 |
| 5 | Push ad app **completamente chiusa** (tolta dai recenti), telefono bloccato da qualche minuto: da un secondo account si manda un messaggio; arriva? il tocco apre la chat? E sul secondo dispositivo arriva anche lì? | 2 account, meglio 2 dispositivi | 2 |
| 6 | S26 Ultra: la testata in alto sta su **una riga**? Se no, annotare Impostazioni → Schermo → «Dimensione e stile carattere» e «Zoom schermo» | S26 Ultra | 1 |

Il 2 e il 3 sono il cancello: se uno dei due fallisce, rollback del sito e
**nessun altro deploy**.
