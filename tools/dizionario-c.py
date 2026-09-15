# -*- coding: utf-8 -*-
# Dizionario del Marketplace — aggiunte (parte 3).
# Ordine dei valori: it, en, fr, de, tr, ru, es, sv, nl
D = {}

D["price_word"] = ["Prezzo","Price","Prix","Preis","Fiyat","Цена","Precio","Pris","Prijs"]
D["ship_any"]   = ["Qualsiasi","Any","Peu importe","Egal","Fark etmez","Любая","Cualquiera","Spelar ingen roll","Maakt niet uit"]
D["ship_only"]  = ["Spedisce","Ships","Expédie","Versendet","Kargolar","Отправляет","Envía","Skickar","Verzendt"]
D["fingers_3"]  = ["3 dita","3 fingers","3 doigts","3 Finger","3 parmak","3 пальца","3 dedos","3 fingrar","3 vingers"]
D["fingers_4"]  = ["4 dita","4 fingers","4 doigts","4 Finger","4 parmak","4 пальца","4 dedos","4 fingrar","4 vingers"]
D["confirm"]    = ["Conferma","Confirm","Confirmer","Bestätigen","Onayla","Подтвердить","Confirmar","Bekräfta","Bevestigen"]
D["fav_local_only"] = ["Questi preferiti stanno solo su questo telefono: non sono riuscito a salvarli sul tuo account.",
"These favourites are only on this phone: I could not save them to your account.",
"Ces favoris sont seulement sur ce téléphone : je n’ai pas pu les enregistrer sur ton compte.",
"Diese Favoriten liegen nur auf diesem Handy: Speichern im Konto hat nicht geklappt.",
"Bu favoriler sadece bu telefonda: hesabına kaydedemedim.",
"Это избранное только на этом телефоне: сохранить в аккаунт не удалось.",
"Estos favoritos están solo en este teléfono: no he podido guardarlos en tu cuenta.",
"De här sparade finns bara i den här telefonen: jag kunde inte spara dem till ditt konto.",
"Deze favorieten staan alleen op deze telefoon: opslaan bij je account lukte niet."]

# ── ricerche salvate: gli avvisi (17/08) ────────────────────────────────────
# `sav_note_off` si mostra SOLO quando si sa per certo che users/{uid}.fcmToken
# non c'e'. Se la lettura fallisce non si scrive niente: accusare qualcuno di
# avere le notifiche spente quando non lo sappiamo e' la stessa cosa
# dell'elenco parziale dei sodalizi — peggio che tacere.
D["sav_note_off"] = ["Le notifiche sul telefono non sono accese: per ora l’avviso ti aspetta dentro l’app. Si accendono dal profilo di ArcTrail 3D.",
"Phone notifications are off: for now the alert waits inside the app. You turn them on in your ArcTrail 3D profile.",
"Les notifications du téléphone sont éteintes : pour l’instant l’avis t’attend dans l’app. On les active depuis ton profil ArcTrail 3D.",
"Handy-Benachrichtigungen sind aus: vorerst wartet der Hinweis in der App. Einschalten kannst du sie im ArcTrail-3D-Profil.",
"Telefon bildirimleri kapalı: şimdilik uyarı uygulamanın içinde bekler. ArcTrail 3D profilinden açabilirsin.",
"Уведомления на телефоне выключены: пока сообщение ждёт внутри приложения. Включить их можно в профиле ArcTrail 3D.",
"Las notificaciones del teléfono están apagadas: por ahora el aviso te espera dentro de la app. Se encienden desde tu perfil de ArcTrail 3D.",
"Aviseringar på telefonen är avstängda: tills vidare väntar meddelandet inne i appen. Du slår på dem i din ArcTrail 3D-profil.",
"Meldingen op je telefoon staan uit: voorlopig wacht het bericht in de app. Je zet ze aan in je ArcTrail 3D-profiel."]

# Stessa promessa mancata dei preferiti, detta per le ricerche: se il documento
# non sale, l'avviso non parte — e chi ha acceso l'interruttore deve saperlo.
D["sav_local_only"] = ["Queste ricerche stanno solo su questo telefono: non sono riuscito a salvarle sul tuo account, quindi gli avvisi non partono.",
"These searches are only on this phone: I could not save them to your account, so no alerts will go out.",
"Ces recherches sont seulement sur ce téléphone : je n’ai pas pu les enregistrer sur ton compte, donc aucun avis ne partira.",
"Diese Suchen liegen nur auf diesem Handy: Speichern im Konto hat nicht geklappt, also gehen keine Hinweise raus.",
"Bu aramalar sadece bu telefonda: hesabına kaydedemedim, bu yüzden uyarı gitmez.",
"Эти запросы только на этом телефоне: сохранить их в аккаунт не удалось, поэтому уведомления не придут.",
"Estas búsquedas están solo en este teléfono: no he podido guardarlas en tu cuenta, así que no saldrá ningún aviso.",
"De här sökningarna finns bara i den här telefonen: jag kunde inte spara dem till ditt konto, så inga aviseringar går ut.",
"Deze zoekopdrachten staan alleen op deze telefoon: opslaan bij je account lukte niet, dus er gaan geen meldingen uit."]

# ── la frase che scrive il SERVER ───────────────────────────────────────────
# Questa chiave non passa da t(): la usa la Cloud Function `avvisaRicerche` per
# il titolo della notifica, nella lingua di chi la riceve. Sta qui perche' le
# nove lingue hanno UNA sola sorgente; genera.py la ricopia dentro index.js fra
# i due marcatori. Non si corregge li'.
D["push_sav_title"] = ["Nuovo annuncio per «{q}»",
"New listing for “{q}”",
"Nouvelle annonce pour « {q} »",
"Neue Anzeige für „{q}“",
"«{q}» için yeni ilan",
"Новое объявление по «{q}»",
"Nuevo anuncio para «{q}»",
"Ny annons för ”{q}”",
"Nieuwe advertentie voor ‘{q}’"]
