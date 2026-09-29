# ArcTrail 3D — procedura sicura di lavoro

Scopo: un task breve non deve mai trasformarsi in ore di test, retry o audit.
ChatGPT controlla Claude; Claude esegue. Se il lavoro non avanza, si ferma e si segnala.

## 1. Un task = un perimetro
- Un solo obiettivo per giro, scritto in una frase.
- Il task deve dichiarare anche i NON OBIETTIVI.
- Problemi laterali: backlog, non apertura automatica di un nuovo lavoro.
- Vietati refactoring, pulizie e audit generali non richiesti.

## 2. Claude parte solo supervisionato
- Per i task autonomi usare `_AUTOMAZIONE/claude-supervisor.ps1`.
- Limite standard: 30 minuti. Eccezioni solo se deliberate prima.
- Il supervisore scrive heartbeat e stato in `_AUTOMAZIONE/runtime/`.
- A timeout uccide Claude e tutti i processi figli: niente lavori fantasma.
- Non avviare un secondo Claude sullo stesso progetto mentre il primo è RUNNING.

## 3. Controllo tempi
- Entro 20 minuti: modifica finita o verifica mirata in corso.
- A 30 minuti: STOP automatico, non «proviamo ancora».
- Oltre 60 minuti un task breve è un problema di processo: non si continua.
- ChatGPT controlla almeno ogni ora i task attivi e avvisa Alessandro se sono bloccati.

## 4. Test per rischio
- **Rischio A — contenuti/dati/UI locale:** test mirati + sintassi/versione/cache se toccate. Pubblicazione possibile senza aspettare la suite completa.
- **Rischio B — punteggi, salvataggi, service worker, flussi core:** test mirati + banchi core pertinenti; CI completa in background.
- **Rischio C — Firestore, Functions, auth, migrazioni/dati:** suite completa ed emulatori verdi prima del deploy.
- La suite completa non va usata come debugger: serve come rete finale, non durante lo sviluppo.

## 5. Suite completa
- Una sola suite completa locale per volta: il runner rifiuta i duplicati.
- Ogni banco ha timeout automatico; un test appeso non può tenere il PC per ore.
- In CI i banchi girano con parallelismo controllato e timeout globale.
- Un nuovo push cancella la CI vecchia ancora in corso: non si accumulano run inutili.
- Per rischio A/B non si resta fermi a guardare la CI: si interviene solo se segnala un problema reale.

## 6. Chiusura standard
- Test mirati verdi.
- `git diff --check` e controllo file modificati.
- Commit/push/deploy solo se previsti dal task.
- Verifica produzione essenziale.
- Stato/report minimo e consegna solo se necessari.
- Task chiuso: nessuna pulizia extra fuori perimetro.

## 7. Allarme operativo
Eseguire `_AUTOMAZIONE/controllo-lavori.ps1` per verificare Claude oltre limite, heartbeat fermo, suite duplicate e CI ArcTrail oltre 20 minuti o appena fallita.
Un ALERT ferma l'espansione del task: prima si risolve il blocco, poi si riparte.
