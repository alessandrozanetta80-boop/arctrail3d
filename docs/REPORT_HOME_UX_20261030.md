# Home: allenamenti e dettagli punteggi — 30/10/2026

## Decisione e perimetro
Utente: arciere autenticato, Home web/mobile. Apre personalmente i dettagli punteggi o tutti i giri, consulta i propri dati e richiude i dettagli. Nessun destinatario esterno, nessuna modifica di risultati o autenticazione.
Conferma utente: prima sistemare la presentazione grafica, rinviare il ripensamento della media. Hero Pronto a tirare e CTA invariati. Nessun obiettivo, streak o giudizio automatico.

## Implementazione
- Titolo secondario I tuoi allenamenti; ultimo allenamento identificato dai modi esistenti freeFormat, con data, campo/tipo, punti, piazzole e frecce configurate quando presenti.
- Conteggi del periodo comprendono tutti gli allenamenti registrati, anche di lunghezza diversa; le gare restano nello storico e nei dettagli esistenti.
- Media, record e grafico nei dettagli espandibili. Formule e selezione del gruppo omogeneo identiche alla versione precedente. La preferenza apertura esistente viene conservata.
- Vedi tutti i giri apre la sezione Giri del diario.
- Nuove etichette nelle nove lingue supportate. Colori e tipografia del sistema esistente.
- Nessun risultato reale modificato o cancellato: anche il precedente giro di prova resta nello storico.

## Riferimenti UX già verificati nel giro precedente
Documentazione ufficiale ArcherySuccess https://archerysuccess.com/how-to-faq/score-a-field-round/ e Quiver https://www.quiver.coach/#scoring-title. Screenshot in UI_REVIEW/SEGNA_PUNTI_20261030/implementazione/benchmark-*.jpg. Riutilizzati principi di raggruppamento dei dati e azioni contestuali, senza copiare grafica. Questa modifica riguarda il riepilogo esistente, non un nuovo flusso operativo.

## Verifica
- banco-home: 17/17. Aggiornato per aprire i dettagli e scorrere il grafico prima di toccarlo.
- banco-home-periodi: 21/21, inclusi persistenza, offline, storico intatto, nessuna lettura cloud aggiuntiva.
- banco-home-ux-20261030: 320/384/1280 px, screenshot prima/dopo e dettagli; 3 allenamenti, 48 piazzole, dettagli invariati 210/2/220/24; link allo storico e assenza overflow.
- Sintassi, token (nessun peggioramento), contrasto 29/29, versioni 30/30, pubblicazione 37/37, impronta cache verificati.
- Screenshot da browser reale con dati demo isolati, NON dati reali e NON immagini generate: UI_REVIEW/HOME_20261030. Ispezione visiva 384 chiusa e 320 aperta.
- Nessuna nuova build Android: modifica web. Bundle Play precedente conservato. Nessuna prova fisica Android aggiuntiva in questo giro.

## Rilascio e ripristino
Build 2026-10-30-home-allenamenti-ux, cache v188. Base remota b6ffab93d5535ac952bc0136ed69d488a038aa0c.
Il ripristino deve riprendere app.html dalla base indicata, con NUOVO BUILD_STAMP/BUILD_PARENT e cache successiva: non abbassare la cache e non fare force-push. Nessuna migrazione dati da annullare.
Stato pubblicazione: da completare e verificare sul sito.
