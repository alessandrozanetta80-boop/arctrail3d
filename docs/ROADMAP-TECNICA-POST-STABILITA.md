# ROADMAP TECNICA — dopo la stabilità (17/09/2026)

**Questo file dice DOVE SI VA. `STATO.md` dice cos'è vero oggi: qui non si
ricopia, si rimanda.** Scritto alla fine dei tre merge di stabilità.

---

## 1. Stato stabilità

Tre lavori entrati in `main` in quest'ordine, ognuno con merge `--no-ff`:
banchi allineati → push in background → tacca del telefono. Poi il timbro,
in un commit suo, perché `app.html` sta in `APP_SHELL`.

Suite locale sullo stato pubblicato: **30 banchi, 29 verdi, 1 rosso, 2 in
attesa, 1 esterno**. I numeri di oggi li dà `STATO.md`; qui conta solo che il
rosso è `controlla-token` (C30), che è **atteso e documentato**, non una
regressione.

Chi rilancia i banchi: `PAR=1 sh tests/controlla-tutto.sh`, e
`ESTERNI=1` per aggiungere quello che vuole la rete vera.

---

## 2. Cosa non può dirlo nessun banco — serve un dispositivo vero

1. **Push ad app chiusa.** I banchi provano il payload del server, il disegno
   del service worker, il clic e la deduplica. NON possono provare che FCM
   consegni davvero, che il token non sia scaduto, né se l'SDK di quel telefono
   disegni da sé la notifica. **Serve un telefono, con l'app chiusa.**
2. **Prima però va pubblicata la funzione.** `index.js` è una Cloud Function:
   non si pubblica da GitHub. Finché non parte `bash ~/pubblica.sh` dal Cloud
   Shell, la correzione delle push è in `main` ma **non in produzione**.
3. **La tacca sul Samsung S26 Ultra.** Il banco simula l'inset riscrivendo due
   proprietà: `env()` non si può impostare da fuori. Da provare installata come
   app, in verticale, scorrendo: la prima riga a una tacca dal bordo e nessun
   salto quando la barra si attacca.
4. **`banco-porta`** — vedi §3.3.

---

## 3. Debiti tecnici rimasti

### 3.1 C30 — `controlla-token` rosso

**Cosa misura:** nove regole di stile su `app.html`, ognuna con un tetto in
`tests/tetto-token.json`. Dice no solo quando un numero **peggiora**: la
cricca si stringe, non si apre.

**Perché è rosso:** il tetto fu fissato quando il guardiano leggeva solo il
PRIMO blocco `<style>`; dal 27/08 (C13) li legge tutti. Misurato: contando il
solo primo blocco i numeri sono ancora **esattamente** quelli del tetto. Le
violazioni in più stanno nei tre blocchi di override finali
(`arctrail-tira-mockup-fedele-v1/v2`, `home-compatta-v2`), che sono fatti di
`!important` per mestiere.

**Non è un guardiano volutamente rosso: è debito tecnico** con una decisione
già presa in `STATO.md` — *il tetto non sale, è il blocco che va rifatto coi
token*.

**Per chiuderlo:** riscrivere quei tre blocchi con i token (`--t-*`, `--r-*`,
`--s-*`) al posto di `!important`, `clamp()` e misure a mano. **Rischio:**
alto e visivo — `clamp()` è tipografia fluida, sostituirla con gradini cambia
come si legge l'app su ogni larghezza. Va guardato, non contato: è lavoro di
disegno, non di pulizia. **Non toccarlo di sfuggita.**

### 3.2 Impostazioni → Attrezzatura (2 prove in attesa)

**Requisito storico:** punto 6 del brief del 30/08 — «l'editor dell'attrezzatura
vive in un posto solo: le Impostazioni hanno una porta che ci manda, non una
seconda copia dei campi».

**Cosa esiste oggi:** il principio regge — in `profile-edit` non c'è nessun
campo `as_*`, quindi nessun secondo editor. Ad Attrezzatura si arriva dalla
porta della homepage del Profilo.

**Cosa manca:** la scorciatoia dentro Impostazioni. `attrBtn` esiste **solo**
nell'`app.html` dello zip in `archive/`, mai pubblicato: online `t("attr_titolo")`
compare 3 volte e nessuna dentro le Impostazioni.

**Modifica minima, se un giorno si decide:** un `.menu-btn` nella scheda di
`profile-edit` che fa `state.assettoAperto = null; state.screen = "attrezzatura"`,
con etichetta `attr_titolo` e sottotitolo `attr_hint` — chiavi già tradotte in
nove lingue, nessuna stringa nuova. Le due prove in `banco-ritorno.js` sono già
scritte e diventano verdi da sole. **È una decisione di prodotto, non un bug.**

### 3.3 `banco-porta` — prova d'integrazione

**Perché vuole l'esterno:** `app.html` carica l'SDK Firebase da
`gstatic.com`. Dove non si arriva, su stato vergine l'app disegna
«Connessione non riuscita» — **ed è il comportamento giusto**: su un telefono
mai configurato non si finge un account.

**Come si esegue:** `ESTERNI=1 sh tests/controlla-tutto.sh` da una macchina con
rete vera. Il runner lo nomina a ogni giro e lo salta, così non si dimentica.

**Si può rendere riproducibile senza falsificare Firebase?** Solo in parte, e
non conviene: servire le cinque librerie da una copia locale proverebbe che
l'app parte con le librerie, non che parte **da Internet**, che è la cosa che
il banco difende. Meglio tenerlo esterno e dichiarato.

### 3.4 Minori

- **Commento obsoleto in `app.html` (~riga 4494):** descrive ancora
  `header.top` con `margin-top:env(safe-area-inset-top)`, tolto il 17/09. Non
  si corregge da solo perché toccare `app.html` obbliga al bump del timbro:
  **si sana alla prossima modifica vera di quel file.**
- **`banco-barra` è fragile alla memoria:** 45 contesti browser in un banco
  solo. Con poca RAM il sistema uccide la suite e quel banco sembra rosso.
  Da solo passa. Se dà fastidio: dividerlo per larghezza.
- **`banco-porta` occupa la porta TCP fissa 8731**: due suite insieme si danno
  fastidio.

---

## 4. ASA 3D — specifica, non implementazione

**Dove si innesta** (dal codice, non dalla memoria):

| Cosa | Dove |
|---|---|
| regolamenti | `GAME_MODES` in `app.html` — `{key, circuito, regolamento, arrowsPerTarget, formats, zones, radii, scoring:{freccia:{zona:punti}}}` |
| zone e bersaglio | `ZONES_*` + `RADII_*`, accanto a `GAME_MODES` |
| circuiti | `CIRCUITI` |
| federazioni | `FEDERATIONS` (`{circuiti, garaModes, trainingMode}`) **e** `PROFILE_FEDERATIONS` (`{code,label}`) — il guardiano fallisce se divergono |
| paesi | `COUNTRY_LIST`, `COUNTRY_FEDERATIONS` |
| traduzioni | `mode_<key>_label/_tag/_desc/_unit`, generate da `tools/genera.py` + `dizionario-*.py` — **mai a mano nell'HTML** |
| selettore | costruito dai `garaModes` della federazione scelta |
| salvataggio giro | `modeKey` + `scoringVersion` + `modeLabel` (`giroPerNuvola`) |
| storico | `arctrail3d_storico_v1`; record personali in `arctrail3d_lifetime_v1`, chiave `nome\|modoDelGiro(modeKey, scoringVersion)` |
| legacy | `modoDelGiro()` — **l'assenza del campo È l'informazione** |
| migrazioni | servono **solo** se cambia un barème già pubblicato (precedente: IFAA 28/08 → `ifaa_3d_v1`) |

**Dati regolamentari:** `DA VERIFICARE SU FONTE UFFICIALE` — zone e punteggi
(12/10/8/5 e l'anello da 14?), numero di bersagli, frecce per bersaglio,
classi/divisioni, distanze. **Nel repository non esiste nessuna fonte ASA.**
Non sono stati verificati qui: niente accesso web in questa sessione.

*Il precedente vale come avvertimento: il 28/08 `ifaa_3d` portava il barème
dell'Animal Round — numeri veri, gara sbagliata. Un regolamento si copia dal
documento ufficiale, con anno e articolo, non dalla memoria.*

## 5. IBO 3D

Stessa mappa d'innesto della §4.

**Dati regolamentari:** `DA VERIFICARE SU FONTE UFFICIALE` — zone e punteggi
(11/10/8/5?), bersagli, frecce, classi. Nessuna fonte IBO nel repository.

## 4-5 bis — Checklist di implementazione (vale per entrambi)

1. voce in `GAME_MODES` con la sua tabella `scoring` e il suo `scoringVersion`
2. `ZONES_*`/`RADII_*` se le zone non esistono già
3. circuito in `CIRCUITI` se nuovo
4. federazione in `FEDERATIONS` **e** `PROFILE_FEDERATIONS`
5. paese in `COUNTRY_LIST` / `COUNTRY_FEDERATIONS`
6. quattro chiavi × 9 lingue **via `tools/genera.py`**
7. timbro: `BUILD_STAMP` + `CACHE_NAME` nella mossa che pubblica

**Test da scrivere PRIMA:**

- un banco sul barème sul modello di `tests/banco-ifaa.js`: numeri **scritti a
  mano dal regolamento**, massimo teorico, e modalità `--sabota` che pretende
  il rosso;
- `banco-regolamenti` deve continuare a dire di sì: righe = `garaModes`, nome a
  parole, «quante frecce e come si contano», una sola preselezionata col
  pannello del barème, tradotto;
- `controlla-token` incrocia già `FEDERATIONS` con `PROFILE_FEDERATIONS`;
- se si tocca un barème già pubblicato: prova che i giri vecchi **non cambiano
  punteggio** (modo `_v1` + `modoDelGiro`).

---

## 6. SEO internazionale

**Stato reale:** `canonical` su tutte le pagine pubbliche; `hreflang` solo su
`index.html` (9 lingue + `x-default`), `privacy` e `termini`; **le cinque
pagine dei regolamenti non hanno hreflang**; `marketplace.html` è `noindex`;
`sitemap.xml` elenca 10 URL **senza alternate**; `?lang=` è **solo lato
client**, quindi tutte le lingue vivono sullo stesso URL.

**Il problema tecnico vero:** una lingua senza URL proprio non si indicizza.
Oggi esiste una pagina sola per nove lingue.

**Struttura proposta, aderente al repository:**

- tenere `?lang=` come preferenza a runtime (non si rompe niente di indicizzato);
- dare un URL proprio alle pagine **che hanno contenuto proprio**: le cinque dei
  regolamenti e la presentazione → `/en/regolamenti-3d.html` ecc., **generate
  dallo stesso `tools/genera-federazioni.py`** che già le produce;
- hreflang reciproco completo + `x-default` sull'italiano, e alternate anche
  nella sitemap;
- `<html lang>` coerente per pagina.

**Un solo `en`, non `en-US` + `en-GB`,** finché il contenuto non differisce
davvero: due URL con lo stesso testo sono duplicazione, non copertura.

**USA — pagine che avrebbero contenuto distinto** (da creare solo quando ASA e
IBO esistono davvero nell'app, altrimenti sono promesse):
`3D archery scoring app` (intento: strumento), `ASA scoring` e `IBO scoring`
(intento: come si conta in quel circuito). **Niente doorway pages.**

**Non spostare** gli URL già indicizzati: `/`, `/app.html`, `/presentazione.html`,
le cinque dei regolamenti.

---

## 7. Profilo / ranking

**Oggi, dal codice:** `profile.federazioni` è **già** `[{code, tessera}]` —
più federazioni insieme con la loro tessera **funzionano adesso**
(`bloccoFederazioni`, `federazioniScelte`), e finiscono in `users/{uid}.federazioni`.

**Cosa manca davvero:** `classe` e `divisione` **non esistono nel profilo** —
vivono solo come dati d'iscrizione a una gara.

**Schema minimo retrocompatibile — si estende la voce che c'è già, nessuna
collezione nuova:**

```
federazioni: [{
  code, tessera,                 // esistono oggi
  categoria?, divisione?,        // per federazione, non globali
  idFederale?,                   // se la federazione ne pubblica uno
  ranking?: { valore?, posizione?, fonte, aggiornato }
}]
```

`fonte` distingue **dichiarato dall'arciere** da **importato** — senza, un
numero scritto a mano e uno ufficiale diventano indistinguibili. `aggiornato`
è la data: un ranking senza data invecchia in silenzio.

**Andamento per ruleset: non serve nessun campo nuovo.** Ogni giro porta già
`modeKey` e `scoringVersion`: si raggruppa sullo storico, come fa già
`arctrail3d_lifetime_v1`.

**Chi legge il profilo va guardato prima di toccarlo:** `public_profiles/{uid}`
espone di proposito solo nome mostrato e compagnia. Categoria e ranking sono
dati personali: decidere **prima** cosa è pubblico.

---

## 8. Ordine consigliato

1. **Pubblicare le Cloud Functions** (`bash ~/pubblica.sh`) e provare una push
   ad app chiusa su un telefono vero. Il codice è in `main` e non è in
   produzione: è l'unico lavoro già fatto che non sta servendo a nessuno.
2. **Provare la tacca sull'S26 installata.** Due minuti, e chiude il secondo
   lavoro di ieri.
3. **`ESTERNI=1` da una macchina con rete vera**, per chiudere `banco-porta`.
4. **ASA**, ma solo dopo aver messo sul tavolo il regolamento ufficiale con
   anno e articolo. Prima il banco del barème, poi i numeri.
5. **IBO**, con lo stesso metodo. Solo dopo, la SEO USA: pagine che raccontano
   un punteggio che l'app sa già calcolare.

**C30 e la scorciatoia Impostazioni → Attrezzatura restano decisioni tue:** non
sono blocchi, sono scelte.
