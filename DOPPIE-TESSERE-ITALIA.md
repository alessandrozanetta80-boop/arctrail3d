# Societa' italiane con due tessere

*Rigenerato da `node trova-doppie.js --scrivi`. Non si corregge a mano:
si rilancia, cosi' non puo' invecchiare in silenzio.*

**40 societa'** su 147 FIARC risultano anche nel registro FITARCO.
Di queste, **29** si reggono su un recapito condiviso (email, telefono o sito):
quelle sono sicure. Le altre 11 si reggono solo sul nome, e il nome
da solo non basta — in Italia esistono due «Arcieri del Lago» che sono due
societa' diverse. **Le righe `nome` vanno guardate una per una prima di
farne qualcosa.**

A schermo non si vedono doppie: `compagniaVisibile()` mostra solo il lato
della federazione scelta. Questa lista serve per il giorno in cui «la mia
compagnia» smettera' di dipendere dalla tessera.

| FIARC | FITARCO | per cosa | nome FIARC | nome FITARCO |
|---|---|---|---|---|
| `09ARCA` | `FT09098` | email | A.S.D. Arcadia Arcieri Casentino | ASD Arcadia Arcieri Casentino |
| `08BIZA` | `FT08003` | sito | A.S.D. Arcieri Bizantini Ravenna | A.S.D. Arcieri Bizantini Ravenna |
| `04HOOD` | `FT04067` | telefono | A.S.D. Arcieri Cesano Boscone | A.S.D. Arcieri Cesano Boscone |
| `15CAME` | `FT16098` | nome | A.S.D. Arcieri dei Peuceti | A.S.D. Arcieri dei Peuceti |
| `04ARCE` | `FT04170` | email | A.S.D. Arcieri del Cerro | A.S.D. Arcieri del Cerro |
| `03FINA` | `FT03029` | email | A.S.D. Arcieri del Finale | A.S.D. Arcieri del Finale |
| `06MARE` | `FT14022` | nome | A.S.D. Arcieri del Mare | A.S.D. Arcieri del Mare |
| `09ELBA` | `FT14022` | nome | A.S.D. Arcieri del Mare | A.S.D. Arcieri del Mare |
| `08RENO` | `FT08116` | email | A.S.D. Arcieri del Reno | A.S.D. Arcieri del Reno |
| `04AIRO` | `FT04060` | nome | A.S.D. Arcieri dell'Airone | A.S.D. Arcieri dell'Airone |
| `09SUVE` | `FT09097` | email | A.S.D. Arcieri dell'Aquila Nera | A.S.D. Arcieri Storici dell'Aquila Nera |
| `04ASAI` | `FT04154` | email | A.S.D. Arcieri dell'Insubria | ASD Arcieri dell'Insubria |
| `04BUBU` | `FT04129` | telefono | A.S.D. Arcieri dell'Isola Bergamasca Orobici | Arcieri dell'Isola Bergamasca Orobici A.S.D. |
| `08RUPE` | `FT08089` | email | A.S.D. Arcieri della Rupe | A.S.D. Arcieri della Rupe |
| `04SELV` | `FT04168` | email | A.S.D. Arcieri della Selva | A.S.D. Arcieri della Selva |
| `09DUCK` | `FT09082` | email | A.S.D. Arcieri di Avalon | ASD Arcieri di Avalon |
| `01MASA` | `FT01031` | sito | A.S.D. Arcieri di Brà | A.S.D. Arcieri di Bra - Arclub I Falchi |
| `09EOLO` | `FT09096` | email | A.S.D. Arcieri di Poggio al Vento | A.S.D. Arcieri di Poggio al Vento |
| `04OWLS` | `FT04173` | email | A.S.D. Arcieri Gufi del Brembo | A.S.D. Arcieri Gufi del Brembo |
| `12ROMA` | `FT12180` | telefono | A.S.D. Arcieri Tradizionali | A.S.D. Arcieri Tradizionali |
| `06ACBV` | `FT06063` | email | A.S.D. Arco Club Bolzano Vicentino | A.S.D. Arco Club Bolzano Vicentino |
| `12WOOD` | `FT12178` | email | A.S.D. Compagnia Arcieri del Bosco | A.S.D. Arcieri del Bosco Cave |
| `01DAHU` | `FT01100` | email | A.S.D. Compagnia Arcieri del Dahu | A.S.D. COMPAGNIA ARCIERI DEL DAHU |
| `04SOLE` | `FT04038` | nome | A.S.D. Compagnia Arcieri del Sole | A.S.D. Compagnia Arcieri del Sole |
| `09ROSE` | `FT09085` | nome | A.S.D. Compagnia Arcieri delle Sei Rose | A.S.D. Compagnia Arcieri delle Sei Rose |
| `09WOLF` | `FT09091` | email | A.S.D. Compagnia Arcieri Lupi di Sesto Fiorentino | A.S.D. Compagnia Arcieri Lupi di Sesto Fiorentino |
| `04ARCH` | `FT04093` | email | A.S.D. Compagnia d'Archi | A.S.D. Compagnia d'Archi |
| `08TECH` | `FT08110` | email | A.S.D. Hunter Archery Team | A.S.D. Hunter Archery Team |
| `04YDRA` | `FT04174` | nome | A.S.D. Hydra Compagnia Arcieri Bascapè | A.S.D. Hydra Compagnia Arcieri Bascapè |
| `03TIGU` | `FT03033` | email | A.S.D. Le Frecce di S. Margherita | A.S.D. le Frecce di Santa Margherita |
| `09BOTA` | `FT09090` | email | Arcieri Borgo Tantola | Compagnia Arcieri Borgo Tantola A.S.D. |
| `03TRIS` | `FT01005` | nome | Arcieri del Gufo | A.S.D. Arcieri Del Gufo |
| `09ATON` | `FT04038` | nome | Arcieri del Sole | A.S.D. Compagnia Arcieri del Sole |
| `12FOCS` | `FT12162` | email | Arcieri della Volpe Bianca | A.S.D. Arcieri della Volpe Bianca |
| `12LUPI` | `FT12012` | sito | Arcieri Lupa Capitolina | A.S.D. Arcieri Lupa Capitolina |
| `09OASI` | `FT06088` | nome | Compagnia Arcieri del Drago | A.S.D. Compagnia Arcieri del Drago |
| `12FALC` | `FT12070` | nome | Compagnia Arcieri del Falco | A.S.D. Arcieri del Falco |
| `07HAWK` | `FT07023` | telefono | Il Falcone Arco Club | A.S.D. il Falcone - Arco Club |
| `12HILL` | `FT12154` | sito | Scuola di Tiro Tradizionale Howard Hill | ASD Scuola di Tiro Tradizionale H.Hill |
| `04WOLF` | `FT04135` | telefono | Team Archery Venegono | Team Archery Venegono A.S.D. |
