# Segna punti — implementazione 30 ottobre 2026

## Perimetro e autorizzazione
Alessandro ha approvato la proposta grafica di destra mantenendo l'arancione originale, poi autorizzato modifiche e pubblicazione web con ritorno alla versione precedente. Attore: arciere autenticato che registra per sé o per il gruppo dalla pagina Segna punti su smartphone. Lo stesso operatore apre, gestisce, corregge e conclude il giro; risultati e condivisioni seguono il flusso esistente. Nessun nuovo ruolo o destinatario. GPS resta in Campi. Nessuna modifica a regole Firebase, account, gare ufficiali o punteggi reali.

## Intervento
- Scena senza riquadro esterno, nome leggibile, caselle delle frecce con evidenza della corrente, gruppo in superficie secondaria.
- Ultimo tiro leggibile con annullamento adiacente. Spazio riservato anche prima del primo tiro per mantenere la tastiera stabile.
- Punteggi e colori originali, Sole/Classifica sotto la tastiera, Segnala problema e Termina giro nell'area scorrevole successiva. Doppia conferma di chiusura conservata.
- Configurazione arcieri/allenamento/gara: titoli meno decorativi, campi e selettori ampi, scelta frecce con button e aria-pressed.
- Confronti allenamenti distinti per frecce previste. Nuovi giri conservano la configurazione; vecchi giri la ricavano solo da serie uniformi. Dati incompleti non producono confronti inventati. Nessuna migrazione dei risultati.
- Versione app `2026-10-30-segna-punti-ux`; cache v187, derivata dalla v186 online.

## Benchmark
Guide ufficiali consultate prima della modifica:
- ArcherySuccess: https://archerysuccess.com/archery-plotting/ e https://archerysuccess.com/pdfs/ArcherySuccess%20-%20How%20to%20start%20or%20select%20a%20new%20round.pdf — correzione, separazione Score/Plot, ripresa dal diario. Utile la distinzione dei compiti; non importato il plotting.
- IANSEO ScoreKeeper, guida revisione 1.5: https://www.ianseo.net/Release/ISKQuickStartGuide-v1.5-ENG.pdf pagina 8 — freccia corrente evidenziata, pulsanti grandi colorati, annullamento ultimo valore. Utile la gerarchia; non importata la configurazione della rete di gara.
Fonti documentali, non prova delle versioni correnti delle due app. Lo strumento ha restituito il testo dei PDF ma ha fallito il recupero dei loro screenshot; nessuna immagine competitor dichiarata visionata. Il riferimento visivo operativo resta il mockup già approvato e gli screenshot reali ArcTrail. Nessun asset/codice proprietario incorporato, nessuna nuova dipendenza o licenza.

## Prove e stato
Screenshot reali Chromium isolato DEV_MODE in `UI_REVIEW/SEGNA_PUNTI_20261030/implementazione`, a 320/384/1280 px, con dati fittizi. Include giro, ultimo tiro, classifica, configurazione, testo 150%. Non è una prova fisica Android, guanti, pioggia o sole.
Test dedicato: `node tests/banco-ux-20261030.js`; finale: `node tests/banco-finale.js`; suite: `tests/controlla-tutto.sh`. Esiti conclusivi e pubblicazione da aggiungere dopo verifica.

## Ripristino
Base pubblicata verificata: `c839a627f77e506e2022fa0b12d64ea91e16baad`; app `2026-10-17-mappa-percorsi-gps-pages`, cache v186. Base locale prima del lavoro: `719a071aab3ccc71fe26915d41e70c189734526a`.
Ripristinare esclusivamente app.html dalla base pubblicata, dichiarando un NUOVO BUILD_STAMP con parent uguale alla release da ritirare. Mantenere sw.js corrente ma incrementare CACHE_NAME e CACHE_PARENT, poi `node tests/controlla-cache.js --scrivi`. Verificare sintassi, cache, base e browser; pubblicare come nuovo commit, senza reset/force push. Incrementare la cache evita che i telefoni conservino la versione ritirata. Non toccare localStorage, Firestore o storico: nessun ripristino dei dati è necessario. Registrare qui lo SHA della release effettiva.

## Lavori preesistenti preservati
Documenti PROCEDURA-RAPIDA, REGOLE-LAVORO, STATO-RIPRESA, STATO e test controlla-versioni erano già modificati; UI_REVIEW e ulteriori documenti/screenshots erano non tracciati. Non includerli automaticamente nel commit di rilascio. Pubblicare solo la modifica corrente sul ramo remoto, senza trasferire modifiche pregresse agli script Android/consegna.
