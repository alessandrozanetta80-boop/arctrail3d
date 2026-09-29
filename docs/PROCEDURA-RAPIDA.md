# ArcTrail 3D — procedura rapida di lavoro

Questa procedura serve a evitare che un task piccolo diventi un audit infinito.
Vale per Claude e per ogni giro operativo su ArcTrail 3D.

## 1. Perimetro
- Un solo obiettivo per giro, scritto in una frase.
- Ogni task deve avere anche i NON OBIETTIVI.
- Un problema scoperto fuori perimetro va nel backlog: non si apre automaticamente.
- Vietati refactoring, pulizie o audit generali non richiesti dal task.

## 2. Tempo
- Task normale: obiettivo 20–30 minuti.
- Entro 20 minuti si deve essere nella fase di verifica.
- A 30 minuti, se non è chiuso, STOP: documentare il blocco invece di allargare il lavoro.
- Se un task stimato breve supera 60 minuti, fermare le modifiche e rivedere il metodo.

## 3. Test
- Durante lo sviluppo: solo test direttamente collegati alla modifica.
- Dopo una correzione: rilanciare il singolo banco interessato, non tutta la suite.
- Suite completa una sola volta a lavoro finito.
- Se la suite trova un errore non collegato al task, registrarlo separatamente e non inseguirlo nello stesso giro.
- Mai disabilitare o mascherare un test solo per far diventare verde la CI.

## 4. Fonti e ricerca esterna
- Cercare solo i dati necessari al task.
- Se una fonte ufficiale non fornisce un dato in tempi ragionevoli, usare “da confermare” e chiudere.
- Non trasformare una verifica puntuale in un audit completo delle fonti.

## 5. Chiusura
- Test mirati verdi.
- Una suite finale.
- Commit/push/deploy solo se previsti dal task.
- Verifica produzione essenziale.
- Aggiornamento stato/report e consegna.
- Fine: nessuna pulizia extra fuori perimetro.

## 6. CI
- La CI deve essere deterministica e significativa.
- I test browser sensibili al carico vanno eseguiti serialmente in CI, non esclusi.
- Un rosso della CI deve indicare un problema reale, non competizione fra più browser avviati in parallelo.
