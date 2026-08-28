#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
genera-presentazione.py — riscrive l'elenco delle federazioni in
`presentazione.html` leggendolo da `app.html`.

NATO IL 28/08/2026, E IN RITARDO. Il commento dentro `presentazione.html`
diceva gia' «lo riscrive `genera-presentazione.py`», ma quel file non e' mai
esistito: l'elenco si scriveva a mano sotto un cartello che vietava di
scriverlo a mano. Un cartello che mente e' peggio di nessun cartello, e nel
frattempo la Svezia e' rimasta a «SFF» dopo che l'app diceva gia' SFSF.

COSA RESTA FUORI, E PERCHE'
- `garaModes: []` — la federazione c'e' ma non ha nessuna gara implementata
  (FIDASC). Dichiararla supportata sarebbe promettere un punteggio che l'app
  non sa fare.
- `fuoriElenco: true` — tolta dalle scelte ma ancora dentro al motore, per
  non far cadere altrove chi ce l'ha nel profilo (Russia).

Uso:  python3 genera-presentazione.py
"""

import io
import re
import sys

APP = "app.html"
PAG = "presentazione.html"

APRE = "<!-- \u2550\u2550 ELENCO GENERATO DA app.html"
CHIUDE = "<!-- \u2550\u2550 FINE DELL'ELENCO GENERATO"

PAESI = [
    ("it", "Italia"), ("fr", "Francia"), ("ch", "Svizzera"), ("at", "Austria"),
    ("de", "Germania"), ("uk", "Regno Unito"), ("tr", "Turchia"),
    ("es", "Spagna"), ("nl", "Paesi Bassi"), ("se", "Svezia"),
]


def leggi_app():
    """Estrae FEDERATIONS e COUNTRY_FEDERATIONS senza eseguire tutto app.html."""
    s = io.open(APP, encoding="utf-8").read()

    def blocco(inizio, fine):
        a = s.index(inizio)
        b = s.index(fine, a)
        return s[a:b]

    feds = {}
    # `garaModes: [...]` e i due flag. Si legge riga per riga: una regex sola
    # su tutto il blocco inciamperebbe nei commenti, che qui sono lunghi.
    for riga in blocco("var FEDERATIONS = {", "\n};").split("\n"):
        m = re.match(r"\s*([a-z_]+):\s*\{(.*)\},?\s*$", riga)
        if not m:
            continue
        chiave, corpo = m.group(1), m.group(2)
        gm = re.search(r"garaModes:\s*\[([^\]]*)\]", corpo)
        feds[chiave] = {
            "gare": bool(gm and gm.group(1).strip()),
            "fuori": "fuoriElenco:true" in corpo.replace(" ", ""),
        }

    paesi = {}
    for riga in blocco("var COUNTRY_FEDERATIONS = {", "\n};").split("\n"):
        m = re.match(r"\s*([a-z]{2}):\s*\[(.*)\]\s*,?\s*$", riga)
        if not m:
            continue
        voci = re.findall(r'code:"([^"]+)",\s*label:"([^"]+)"', m.group(2))
        paesi[m.group(1)] = [(c, l.encode().decode("unicode_escape")
                              if "\\u" in l else l) for c, l in voci]
    return feds, paesi


def costruisci(feds, paesi):
    righe = []
    for codice, nome in PAESI:
        voci = paesi.get(codice, [])
        sigle = [lab for cod, lab in voci
                 if feds.get(cod, {}).get("gare") and not feds.get(cod, {}).get("fuori")]
        if not sigle:
            continue
        righe.append("    <li><strong>%s</strong> \u2014 %s</li>"
                     % (nome, " \u00b7 ".join(sigle)))
    return righe


def main():
    feds, paesi = leggi_app()
    righe = costruisci(feds, paesi)
    if not righe:
        print("nessuna federazione trovata: non riscrivo niente")
        return 1

    s = io.open(PAG, encoding="utf-8").read()
    a = s.index(APRE)
    b = s.index(CHIUDE, a)
    fine = s.index("-->", b) + 3

    testa = s[a:s.index("-->", a) + 3]
    # L'ELENCO DENTRO UN <ul>. Fino al 28/08 i <li> stavano nudi nel
    # documento, senza contenitore: il browser li disegnava lo stesso, ma un
    # lettore di schermo non sapeva di essere in un elenco ne' quanto fosse
    # lungo. Il <ul> lo apre e lo chiude il generatore, cosi' non si puo' piu'
    # perdere per strada.
    nuovo = testa + "\n  <ul>\n" + "\n".join(righe) + "\n  </ul>\n  " + s[b:fine]

    if s[a:fine] == nuovo:
        print("elenco gia' aggiornato: nessuna modifica")
        return 0

    io.open(PAG, "w", encoding="utf-8").write(s[:a] + nuovo + s[fine:])
    print("elenco riscritto: %d paesi" % len(righe))
    for r in righe:
        print("  " + re.sub(r"<[^>]+>", "", r).strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
