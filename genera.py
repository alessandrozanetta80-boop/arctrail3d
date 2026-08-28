# -*- coding: utf-8 -*-
"""Genera il dizionario JS e controlla che sia sano.
   Le stesse domande che il guardiano fa a index.html:
     - ogni chiave esiste in tutte e nove le lingue?
     - i segnaposto {n} {v} {name} sono identici in tutte e nove?
     - ogni chiave chiesta dal markup e dal codice esiste davvero?
     - c'e' qualche chiave scritta e mai usata? (peso morto, si dice e basta)"""
import importlib.util, io, re, sys

LANGS = ["it","en","fr","de","tr","ru","es","sv","nl"]

def load(p, name):
    sp = importlib.util.spec_from_file_location(name, p)
    m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    return m.D

D = {}
for f, n in [("dizionario-a.py","a"), ("dizionario-b.py","b"), ("dizionario-c.py","c")]:
    part = load(f, n)
    dup = set(D) & set(part)
    if dup:
        print("CHIAVI DOPPIE fra i file:", sorted(dup)); sys.exit(1)
    D.update(part)

errori = []
for k, v in D.items():
    if len(v) != 9: errori.append("%s: %d valori invece di 9" % (k, len(v)))
    elif any(not str(x).strip() for x in v): errori.append("%s: un valore vuoto" % k)
for k, v in D.items():
    if len(v) != 9: continue
    base = sorted(set(re.findall(r"\{[a-zA-Z]+\}", v[0])))
    for i, x in enumerate(v):
        if sorted(set(re.findall(r"\{[a-zA-Z]+\}", x))) != base:
            errori.append("%s (%s): segnaposto diversi dall'italiano" % (k, LANGS[i]))

# le chiavi chieste dal markup e dal codice
chieste = set()
try:
    markup = io.open("markup.html", encoding="utf-8").read()
    for m in re.finditer(r'data-t[hpat]?="([a-zA-Z0-9_]+)"', markup): chieste.add(m.group(1))
except IOError: pass
try:
    codice = io.open("marketplace.html", encoding="utf-8").read()
    # Si legge DENTRO la chiamata, parentesi bilanciate: t("a") ma anche
    # t(x?"a":"b") e t("a",{n:f(x)}). Un elenco di "chiavi mai usate" pieno di
    # falsi allarmi viene ignorato la volta che ha ragione.
    # Le chiamate composte a mano — t("cat_"+k) — non si possono controllare
    # da fermo, e si riconoscono dal _ finale.
    for m in re.finditer(r'\bt\(', codice):
        i0 = m.end(); liv = 1; i = i0
        while i < len(codice) and liv:
            if codice[i] == '(': liv += 1
            elif codice[i] == ')': liv -= 1
            i += 1
        dentro = codice[i0:i-1]
        for mm in re.finditer(r'"([a-zA-Z0-9_]+)"', dentro):
            # una stringa a destra di == o != e' una CONDIZIONE, non una chiave:
            # t(a.mano==="dx"?"hand_dx_s":"hand_sx_s") ha una chiave sola per ramo.
            prima = dentro[:mm.start()].rstrip()
            if prima.endswith("=") or prima.endswith("!"): continue
            if not mm.group(1).endswith("_"): chieste.add(mm.group(1))
except IOError: pass

# Le parole che NON passano da t() perche' le scrive il server. Sono usate
# eccome — dalla Cloud Function `avvisaRicerche` — ma dentro marketplace.html
# non compaiono, quindi vanno dichiarate qui o l'elenco delle "mai usate" si
# riempie di falsi allarmi e smette di essere letto.
CHIAVI_SERVER = ["push_sav_title"]
chieste.update(CHIAVI_SERVER)

mute = sorted(c for c in chieste if c not in D)
if mute: errori.append("chiavi chieste e mai scritte: " + ", ".join(mute))

if errori:
    print("NON VA:")
    for e in errori: print("  -", e)
    sys.exit(1)

# le chiavi composte a mano — t("status_"+k) — non compaiono per intero da
# nessuna parte: se un prefisso e' chiesto cosi', tutta la famiglia e' usata.
prefissi = set()
try:
    for m in re.finditer(r'\bt\("([a-zA-Z0-9_]+_)"\s*\+', codice): prefissi.add(m.group(1))
except NameError: pass
fuori = sorted(k for k in D if k not in chieste and not any(k.startswith(x) for x in prefissi))
print("chiavi: %d · lingue: %d · nessun buco, nessun segnaposto perso" % (len(D), len(LANGS)))
if fuori:
    print("scritte e non ancora usate (%d): %s" % (len(fuori), ", ".join(fuori)))

out = []
out.append('/* ══ LE NOVE LINGUE ══════════════════════════════════════════════════════')
out.append('   La lingua NON si sceglie qui: si eredita da quella dell\'app, come il tema.')
out.append('   Un mercatino che chiede una seconda volta in che lingua parli e\' un secondo')
out.append('   prodotto, non una pagina dello stesso.')
out.append('   Chi non trova la sua chiave in una lingua cade sull\'italiano: la frase resta')
out.append('   giusta, ed e\' nella lingua sbagliata — quindi il generatore controlla che')
out.append('   non succeda mai, prima di scrivere questo blocco.')
out.append('   GENERATO da dizionario-a/b/c.py con genera.py: non si corregge qui a mano. */')
out.append('var LANG_ORDER=' + repr(LANGS).replace("'", '"') + ';')
out.append('var LOCALE={it:"it-IT",en:"en-GB",fr:"fr-FR",de:"de-DE",tr:"tr-TR",ru:"ru-RU",es:"es-ES",sv:"sv-SE",nl:"nl-NL"};')
out.append('var S={')
for li, l in enumerate(LANGS):
    out.append(l + ':{')
    for k in sorted(D):
        s = D[k][li].replace("\\", "\\\\").replace('"', '\\"')
        out.append(k + ':"' + s + '",')
    out.append('},')
out.append('};')
io.open("dizionario.js", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("scritto dizionario.js")

# ── LE PAROLE DEL SERVER, RICOPIATE DENTRO index.js ─────────────────────────
# La Cloud Function `avvisaRicerche` scrive il titolo della notifica nella
# lingua di chi la riceve, quindi ha bisogno delle nove lingue anche lei — e un
# file dentro la cartella delle funzioni sarebbe un file in piu' da spedire al
# deploy: se manca, le funzioni non partono affatto. Quindi il blocco si scrive
# DENTRO index.js, fra due marcatori, e lo scrive questo generatore.
# E' la stessa regola del dizionario dentro marketplace.html: generato, non si
# corregge li'. Una correzione fatta a mano dentro index.js sparisce alla
# prossima passata, ed e' il modo piu' silenzioso di far divergere due file.
INIZIO = "// \u2550\u2550 INIZIO PAROLE GENERATE"
FINE   = "// \u2550\u2550 FINE PAROLE GENERATE"

righe = [INIZIO + " \u2014 da dizionario-c.py con genera.py: non correggere qui.",
         "// Le nove lingue hanno una sorgente sola. Per cambiare una di queste frasi",
         "// si cambia il .py e si rilancia genera.py.",
         "const PAROLE = {"]
for k in CHIAVI_SERVER:
    righe.append("  " + k + ": {")
    for li, l in enumerate(LANGS):
        s = D[k][li].replace("\\", "\\\\").replace('"', '\\"')
        righe.append('    ' + l + ': "' + s + '",')
    righe.append("  },")
righe.append("};")
righe.append(FINE)
blocco = "\n".join(righe)

candidati = ["index.js", "functions/index.js", "../functions/index.js"]
scritto = False
for c in candidati:
    try:
        testo = io.open(c, encoding="utf-8").read()
    except IOError:
        continue
    # Che sia PROPRIO il file delle funzioni, non un altro index.js qualsiasi.
    if "exports.pushNotifica" not in testo:
        continue
    if INIZIO not in testo or FINE not in testo:
        print("NON VA:")
        print("  - %s non ha piu' i marcatori delle parole generate." % c)
        print("    Rimettili (%s ... %s) o il server resta indietro di una lingua" % (INIZIO, FINE))
        print("    senza che nessuno se ne accorga.")
        sys.exit(1)
    a = testo.index(INIZIO)
    b = testo.index(FINE) + len(FINE)
    nuovo = testo[:a] + blocco + testo[b:]
    if nuovo != testo:
        io.open(c, "w", encoding="utf-8").write(nuovo)
        print("aggiornato %s (%d chiavi per il server)" % (c, len(CHIAVI_SERVER)))
    else:
        print("%s era gia' allineato" % c)
    scritto = True
    break
if not scritto:
    print("ATTENZIONE: index.js delle Cloud Functions non trovato qui accanto.")
    print("            Le parole del server NON sono state aggiornate. Rilancia")
    print("            genera.py dalla cartella che contiene anche le funzioni.")
