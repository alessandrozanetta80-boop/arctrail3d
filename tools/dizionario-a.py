# -*- coding: utf-8 -*-
# Dizionario del Marketplace — parte 1 di 2.
# Ordine dei valori: it, en, fr, de, tr, ru, es, sv, nl  (come LANG_ORDER in index.html)
D = {}

# ── testata, sezioni, generali ──────────────────────────────────────────────
D["app_back"]      = ["App","App","App","App","Uygulama","Прил.","App","App","App"]
D["back_title"]    = ["Torna ad ArcTrail 3D","Back to ArcTrail 3D","Retour à ArcTrail 3D","Zurück zu ArcTrail 3D","ArcTrail 3D'ye dön","Вернуться в ArcTrail 3D","Volver a ArcTrail 3D","Tillbaka till ArcTrail 3D","Terug naar ArcTrail 3D"]
D["nav_market"]    = ["Marketplace","Marketplace","Marché","Marktplatz","Pazar","Барахолка","Mercado","Marknad","Markt"]
D["nav_fav"]       = ["Preferiti","Saved","Favoris","Favoriten","Favoriler","Избранное","Favoritos","Sparade","Favorieten"]
D["nav_my"]        = ["I miei annunci","My listings","Mes annonces","Meine Anzeigen","İlanlarım","Мои объявления","Mis anuncios","Mina annonser","Mijn advertenties"]
D["nav_my_short"]  = ["Miei annunci","My listings","Mes annonces","Meine Anzeigen","İlanlarım","Мои","Mis anuncios","Mina annonser","Mijn adv."]
D["nav_msg"]       = ["Messaggi","Messages","Messages","Nachrichten","Mesajlar","Сообщения","Mensajes","Meddelanden","Berichten"]
D["exit"]          = ["Esci","Sign out","Se déconnecter","Abmelden","Çıkış","Выйти","Salir","Logga ut","Uitloggen"]
D["exit_title"]    = ["Esci dal Marketplace","Sign out of the Marketplace","Quitter le marché","Marktplatz verlassen","Pazardan çık","Выйти из барахолки","Salir del mercado","Lämna marknaden","Markt verlaten"]
D["avatar_title"]  = ["Il tuo profilo e le ricerche salvate","Your profile and saved searches","Ton profil et tes recherches","Dein Profil und deine Suchen","Profilin ve kayıtlı aramaların","Ваш профиль и сохранённые запросы","Tu perfil y tus búsquedas","Din profil och dina sökningar","Je profiel en bewaarde zoekopdrachten"]
D["cancel"]        = ["Annulla","Cancel","Annuler","Abbrechen","Vazgeç","Отмена","Cancelar","Avbryt","Annuleren"]
D["close"]         = ["Chiudi","Close","Fermer","Schließen","Kapat","Закрыть","Cerrar","Stäng","Sluiten"]
D["back"]          = ["Indietro","Back","Retour","Zurück","Geri","Назад","Atrás","Tillbaka","Terug"]
D["more_actions"]  = ["Altre azioni","More","Plus","Mehr","Diğer","Ещё","Más","Mer","Meer"]
D["loading"]       = ["Caricamento…","Loading…","Chargement…","Wird geladen…","Yükleniyor…","Загрузка…","Cargando…","Laddar…","Laden…"]
D["retry"]         = ["Riprova","Try again","Réessayer","Erneut versuchen","Tekrar dene","Повторить","Reintentar","Försök igen","Opnieuw"]
D["error_with"]    = ["Errore ({code}): {msg}","Error ({code}): {msg}","Erreur ({code}) : {msg}","Fehler ({code}): {msg}","Hata ({code}): {msg}","Ошибка ({code}): {msg}","Error ({code}): {msg}","Fel ({code}): {msg}","Fout ({code}): {msg}"]
D["error_short"]   = ["Errore: {msg}","Error: {msg}","Erreur : {msg}","Fehler: {msg}","Hata: {msg}","Ошибка: {msg}","Error: {msg}","Fel: {msg}","Fout: {msg}"]

# ── quanto tempo fa ─────────────────────────────────────────────────────────
D["ago_now"] = ["ora","now","à l’instant","gerade eben","şimdi","только что","ahora","nyss","zojuist"]
D["ago_min"] = ["{n}min fa","{n}min ago","il y a {n}min","vor {n}Min.","{n}dk önce","{n} мин назад","hace {n}min","{n}min sedan","{n}min geleden"]
D["ago_h"]   = ["{n}h fa","{n}h ago","il y a {n}h","vor {n}Std.","{n}sa önce","{n} ч назад","hace {n}h","{n}tim sedan","{n}u geleden"]
D["ago_d"]   = ["{n}g fa","{n}d ago","il y a {n}j","vor {n}T.","{n}g önce","{n} дн назад","hace {n}d","{n}d sedan","{n}d geleden"]
D["ago_mo"]  = ["{n}mesi fa","{n}mo ago","il y a {n}mois","vor {n}Mon.","{n}ay önce","{n} мес назад","hace {n}mes","{n}mån sedan","{n}mnd geleden"]

# ── accesso ─────────────────────────────────────────────────────────────────
D["auth_sub"]      = ["Usa le credenziali dell’app per entrare nel Marketplace BETA.","Use your app credentials to enter the BETA Marketplace.","Utilise tes identifiants de l’app pour entrer dans le marché BETA.","Melde dich mit deinen App-Zugangsdaten am BETA-Marktplatz an.","BETA Pazar’a girmek için uygulama bilgilerini kullan.","Войдите в БЕТА-барахолку с логином от приложения.","Usa tus credenciales de la app para entrar en el mercado BETA.","Använd appens inloggning för att komma in i BETA-marknaden.","Gebruik je app-inloggegevens voor de BETA-markt."]
D["email"]         = ["Email","Email","E-mail","E-Mail","E-posta","Эл. почта","Email","E-post","E-mail"]
D["password"]      = ["Password","Password","Mot de passe","Passwort","Parola","Пароль","Contraseña","Lösenord","Wachtwoord"]
D["login"]         = ["Accedi","Sign in","Se connecter","Anmelden","Giriş yap","Войти","Entrar","Logga in","Inloggen"]
D["err_empty"]     = ["Email e password obbligatorie.","Email and password are required.","E-mail et mot de passe obligatoires.","E-Mail und Passwort sind erforderlich.","E-posta ve parola zorunlu.","Введите почту и пароль.","Email y contraseña son obligatorios.","E-post och lösenord krävs.","E-mail en wachtwoord zijn verplicht."]
D["err_bad_login"] = ["Credenziali non valide.","Wrong email or password.","Identifiants invalides.","Zugangsdaten stimmen nicht.","Bilgiler hatalı.","Неверные данные.","Credenciales incorrectas.","Fel uppgifter.","Onjuiste gegevens."]
D["err_too_many"]  = ["Troppi tentativi, riprova tra poco.","Too many attempts, try again shortly.","Trop d’essais, réessaie dans un moment.","Zu viele Versuche, gleich nochmal.","Çok fazla deneme, birazdan tekrar dene.","Слишком много попыток, попробуйте позже.","Demasiados intentos, prueba en un rato.","För många försök, testa strax igen.","Te veel pogingen, probeer straks opnieuw."]
D["den_title"]     = ["Accesso non attivo","Account not active","Accès non actif","Zugang nicht aktiv","Erişim aktif değil","Доступ не активен","Acceso no activo","Kontot är inte aktivt","Toegang niet actief"]
D["den_body"]      = ["Il tuo account non risulta attivo. Se ti sei appena registrato, conferma prima l’email dal messaggio che ti è arrivato. Se il problema resta, scrivi a","Your account is not active yet. If you have just signed up, confirm your email from the message you received. If the problem persists, write to","Ton compte n’est pas actif. Si tu viens de t’inscrire, confirme d’abord ton e-mail. Si le problème persiste, écris à","Dein Konto ist noch nicht aktiv. Wenn du dich gerade registriert hast, bestätige zuerst deine E-Mail. Bleibt das Problem, schreib an","Hesabın aktif değil. Yeni kaydolduysan önce e-postanı onayla. Sorun sürerse şuraya yaz:","Ваш аккаунт не активен. Если вы только что зарегистрировались, подтвердите почту. Если проблема остаётся, напишите на","Tu cuenta no está activa. Si acabas de registrarte, confirma antes tu email. Si el problema sigue, escribe a","Ditt konto är inte aktivt. Har du precis registrerat dig, bekräfta e-posten först. Kvarstår problemet, skriv till","Je account is nog niet actief. Net aangemeld? Bevestig eerst je e-mail. Blijft het probleem, mail naar"]
D["back_to_app"]   = ["Torna all’app","Back to the app","Retour à l’app","Zurück zur App","Uygulamaya dön","Вернуться в приложение","Volver a la app","Tillbaka till appen","Terug naar de app"]

# ── ricerca, filtri, elenco ─────────────────────────────────────────────────
D["search_ph"]     = ["Cerca archi, frecce, accessori…","Search bows, arrows, gear…","Cherche arcs, flèches, accessoires…","Bögen, Pfeile, Zubehör suchen…","Yay, ok, aksesuar ara…","Луки, стрелы, снаряжение…","Busca arcos, flechas, accesorios…","Sök bågar, pilar, tillbehör…","Zoek bogen, pijlen, toebehoren…"]
D["search_al"]     = ["Cerca nel Marketplace","Search the Marketplace","Chercher sur le marché","Im Marktplatz suchen","Pazarda ara","Поиск по барахолке","Buscar en el mercado","Sök på marknaden","Zoek op de markt"]
D["filters"]       = ["Filtri","Filters","Filtres","Filter","Filtreler","Фильтры","Filtros","Filter","Filters"]
D["only_wanted"]   = ["Solo richieste","Wanted only","Recherches seules","Nur Gesuche","Sadece aranan","Только «ищу»","Solo búsquedas","Bara sökes","Alleen gezocht"]
D["new_listing"]   = ["Nuovo annuncio","New listing","Nouvelle annonce","Neue Anzeige","Yeni ilan","Новое объявление","Nuevo anuncio","Ny annons","Nieuwe advertentie"]
D["count_ads"]     = ["{n} annunci","{n} listings","{n} annonces","{n} Anzeigen","{n} ilan","Объявлений: {n}","{n} anuncios","{n} annonser","{n} advertenties"]
D["count_hidden"]  = ["{n} nascosti dai filtri","{n} hidden by filters","{n} masqués par les filtres","{n} von Filtern versteckt","{n} filtreyle gizli","скрыто фильтрами: {n}","{n} ocultos por los filtros","{n} dolda av filter","{n} verborgen door filters"]
D["clear_filters"] = ["Azzera filtri","Clear filters","Effacer les filtres","Filter zurücksetzen","Filtreleri temizle","Сбросить фильтры","Borrar filtros","Rensa filter","Filters wissen"]
D["reset"]         = ["Azzera","Reset","Effacer","Zurücksetzen","Temizle","Сбросить","Borrar","Rensa","Wissen"]
D["apply_filters"] = ["Applica filtri","Apply filters","Appliquer","Anwenden","Uygula","Применить","Aplicar","Använd","Toepassen"]
D["refresh"]       = ["Aggiorna","Refresh","Actualiser","Aktualisieren","Yenile","Обновить","Actualizar","Uppdatera","Vernieuwen"]
D["refreshed"]     = ["Lista aggiornata","List updated","Liste actualisée","Liste aktualisiert","Liste yenilendi","Список обновлён","Lista actualizada","Listan uppdaterad","Lijst bijgewerkt"]

D["note_title"] = ["Marketplace in prova","Marketplace in testing","Marché en test","Marktplatz im Test","Pazar deneme aşamasında","Барахолка на пробу","Mercado en pruebas","Marknaden testas","Markt in proef"]
D["note_p1"] = ["Qui per ora si pubblicano solo annunci. Dentro l’app <b>non ci sono ancora</b> opzioni di pagamento: per il momento prezzo, pagamento e consegna li accordate per messaggio fra chi vende e chi compra.",
"For now this is listings only. There are <b>no payment options yet</b> inside the app: for the moment price, payment and delivery are agreed by message between buyer and seller.",
"Pour l’instant, seulement des annonces. Il n’y a <b>pas encore</b> de paiement dans l’app : prix, paiement et remise se conviennent par message entre vendeur et acheteur.",
"Vorerst nur Anzeigen. In der App gibt es <b>noch keine</b> Zahlungsmöglichkeiten: Preis, Zahlung und Übergabe klärt ihr vorerst per Nachricht.",
"Şimdilik sadece ilan var. Uygulamada <b>henüz</b> ödeme seçeneği yok: şimdilik fiyat, ödeme ve teslimi mesajla anlaşıyorsunuz.",
"Пока только объявления. В приложении <b>пока нет</b> оплаты: цену, оплату и передачу вы согласуете сообщениями.",
"Por ahora solo anuncios. Dentro de la app <b>todavía no hay</b> pagos: de momento precio, pago y entrega se acuerdan por mensaje.",
"Just nu bara annonser. Det finns <b>ännu ingen</b> betalning i appen: pris, betalning och överlämning kommer ni överens om via meddelande.",
"Voorlopig alleen advertenties. In de app is er <b>nog geen</b> betaling: prijs, betaling en levering spreken jullie per bericht af."]
# `note_p2` — i «Venditori Fondatori» — e' stata tolta il 17/08/2026, su
# richiesta: prometteva «condizioni agevolate sulle vendite se un domani il
# Marketplace avra' dei costi» a chi pubblicava nel primo periodo. Una promessa
# in nove lingue a gente che non si conosce ancora, su un listino che non
# esiste, e' un debito preso al buio: se un giorno arriva un costo, o la si
# mantiene senza sapere quanto pesa, o la si rimangia davanti a chi c'era.
# Tolta dalla sorgente e non solo dalla pagina, o `genera.py` la rimetterebbe.
D["note_ack"] = ["Ho capito: non mostrare più questo messaggio","Got it: don’t show this again","Compris : ne plus afficher","Verstanden: nicht mehr anzeigen","Anladım: bir daha gösterme","Понятно: больше не показывать","Entendido: no mostrar más","Uppfattat: visa inte igen","Begrepen: niet meer tonen"]

D["empty_filtered_t"] = ["Nessun annuncio corrisponde ai filtri","No listing matches the filters","Aucune annonce ne correspond","Keine Anzeige passt zu den Filtern","Filtrelere uyan ilan yok","Ничего не подходит под фильтры","Ningún anuncio coincide","Ingen annons matchar filtren","Geen advertentie voldoet"]
D["empty_filtered_s"] = ["Ci sono <b>{n}</b> annunci pubblicati, ma i filtri attivi li nascondono tutti.<br>Premi <b>{clear}</b> qui sopra.",
"There are <b>{n}</b> listings, but the active filters hide them all.<br>Tap <b>{clear}</b> above.",
"Il y a <b>{n}</b> annonces, mais les filtres les cachent toutes.<br>Touche <b>{clear}</b> plus haut.",
"Es gibt <b>{n}</b> Anzeigen, aber die Filter verbergen alle.<br>Tippe oben auf <b>{clear}</b>.",
"<b>{n}</b> ilan var ama filtreler hepsini gizliyor.<br>Yukarıdan <b>{clear}</b>’a dokun.",
"Объявлений: <b>{n}</b>, но фильтры скрывают все.<br>Нажмите <b>{clear}</b> выше.",
"Hay <b>{n}</b> anuncios, pero los filtros los ocultan todos.<br>Pulsa <b>{clear}</b> arriba.",
"Det finns <b>{n}</b> annonser, men filtren döljer alla.<br>Tryck <b>{clear}</b> ovanför.",
"Er zijn <b>{n}</b> advertenties, maar de filters verbergen ze allemaal.<br>Tik hierboven op <b>{clear}</b>."]
D["empty_wanted_hint"] = ["Il filtro <b>{f}</b> è attivo: stai vedendo solo gli annunci di tipo «Cerco».",
"The <b>{f}</b> filter is on: you are only seeing “wanted” listings.",
"Le filtre <b>{f}</b> est actif : tu ne vois que les recherches.",
"Der Filter <b>{f}</b> ist an: du siehst nur Gesuche.",
"<b>{f}</b> filtresi açık: sadece aranan ilanları görüyorsun.",
"Включён фильтр <b>{f}</b>: видны только объявления «ищу».",
"El filtro <b>{f}</b> está activo: solo ves búsquedas.",
"Filtret <b>{f}</b> är på: du ser bara sökes-annonser.",
"Filter <b>{f}</b> staat aan: je ziet alleen gezocht-advertenties."]
D["empty_none_t"] = ["Nessun annuncio pubblicato","No listings yet","Aucune annonce","Noch keine Anzeigen","Henüz ilan yok","Пока нет объявлений","Ningún anuncio","Inga annonser ännu","Nog geen advertenties"]
D["empty_none_s"] = ["Il Marketplace è vuoto. Premi <b>{new}</b> per pubblicare il primo.<br><br>Se hai appena pubblicato e non lo vedi qui, lo trovi in <b>{my}</b> con il suo stato.",
"The Marketplace is empty. Tap <b>{new}</b> to post the first one.<br><br>If you have just posted and don’t see it here, it is under <b>{my}</b> with its status.",
"Le marché est vide. Touche <b>{new}</b> pour publier la première.<br><br>Si tu viens de publier et ne la vois pas, elle est dans <b>{my}</b> avec son état.",
"Der Marktplatz ist leer. Tippe <b>{new}</b> für die erste Anzeige.<br><br>Gerade inseriert und nicht zu sehen? Sie steht in <b>{my}</b> mit ihrem Status.",
"Pazar boş. İlkini vermek için <b>{new}</b>’e dokun.<br><br>Yeni verdiysen ve göremiyorsan, <b>{my}</b> içinde durumu ile birlikte.",
"Барахолка пуста. Нажмите <b>{new}</b>, чтобы опубликовать первое.<br><br>Если только что опубликовали и не видите — оно в <b>{my}</b> со своим статусом.",
"El mercado está vacío. Pulsa <b>{new}</b> para publicar el primero.<br><br>Si acabas de publicar y no lo ves, está en <b>{my}</b> con su estado.",
"Marknaden är tom. Tryck <b>{new}</b> för att lägga upp den första.<br><br>Har du just lagt upp och inte ser den, finns den i <b>{my}</b> med sin status.",
"De markt is leeg. Tik op <b>{new}</b> voor de eerste.<br><br>Net geplaatst en niet zichtbaar? Hij staat in <b>{my}</b> met zijn status."]
D["cap_note"] = ["Stai vedendo i {n} annunci più recenti. Ce ne sono altri: usa la ricerca o i filtri per trovarli.",
"You are seeing the {n} most recent listings. There are more: use search or filters.",
"Tu vois les {n} annonces les plus récentes. Il y en a d’autres : utilise la recherche ou les filtres.",
"Du siehst die {n} neuesten Anzeigen. Es gibt mehr: nutze Suche oder Filter.",
"En yeni {n} ilanı görüyorsun. Başkaları da var: arama veya filtre kullan.",
"Показаны {n} самых новых объявлений. Есть и другие: используйте поиск или фильтры.",
"Ves los {n} anuncios más recientes. Hay más: usa la búsqueda o los filtros.",
"Du ser de {n} senaste annonserna. Det finns fler: använd sök eller filter.",
"Je ziet de {n} nieuwste advertenties. Er zijn er meer: gebruik zoeken of filters."]

# ── scheda dell'annuncio ────────────────────────────────────────────────────
D["cond_nuovo"]  = ["Nuovo","New","Neuf","Neu","Yeni","Новое","Nuevo","Ny","Nieuw"]
D["cond_ottimo"] = ["Ottimo","Excellent","Excellent","Sehr gut","Çok iyi","Отличное","Excelente","Utmärkt","Uitstekend"]
D["cond_buono"]  = ["Buono","Good","Bon","Gut","İyi","Хорошее","Bueno","Bra","Goed"]
D["cond_usato"]  = ["Usato","Used","Usagé","Gebraucht","Kullanılmış","Б/у","Usado","Begagnad","Gebruikt"]
D["wanted"]      = ["CERCO","WANTED","RECHERCHE","GESUCHT","ARANIYOR","ИЩУ","BUSCO","SÖKES","GEZOCHT"]
D["wanted_pill"] = ["Cerco","Wanted","Recherche","Gesucht","Aranıyor","Ищу","Busco","Sökes","Gezocht"]
D["budget_max"]  = ["max {v}","up to {v}","max {v}","bis {v}","en fazla {v}","до {v}","hasta {v}","max {v}","max {v}"]
D["budget_open"] = ["Budget aperto","Open budget","Budget ouvert","Budget offen","Bütçe açık","Бюджет открыт","Presupuesto abierto","Öppen budget","Budget open"]
D["budget_max_l"]= ["Budget max: {v}","Budget up to {v}","Budget max : {v}","Budget bis {v}","En fazla bütçe: {v}","Бюджет до {v}","Presupuesto máx.: {v}","Budget max: {v}","Budget max: {v}"]
D["ships"]       = ["spedisce","ships","expédie","versendet","kargolar","отправляет","envía","skickar","verzendt"]
D["fav_al"]      = ["Metti fra i preferiti","Save to favourites","Mettre en favori","Zu Favoriten","Favorilere ekle","В избранное","Añadir a favoritos","Spara","Aan favorieten"]
D["status_active"]= ["Attivo","Active","Actif","Aktiv","Aktif","Активно","Activo","Aktiv","Actief"]
D["status_paused"]= ["In pausa","Paused","En pause","Pausiert","Duraklatıldı","На паузе","En pausa","Pausad","Gepauzeerd"]
D["status_sold"]  = ["Venduto","Sold","Vendu","Verkauft","Satıldı","Продано","Vendido","Såld","Verkocht"]

# ── categorie ───────────────────────────────────────────────────────────────
D["cat_arco"]           = ["Archi","Bows","Arcs","Bögen","Yaylar","Луки","Arcos","Bågar","Bogen"]
D["cat_frecce"]         = ["Frecce & componenti","Arrows & components","Flèches & composants","Pfeile & Komponenten","Oklar & parçalar","Стрелы и комплектующие","Flechas y componentes","Pilar & delar","Pijlen & onderdelen"]
D["cat_mirino"]         = ["Mirini & diottre","Sights & scopes","Viseurs & scopes","Visiere & Scopes","Nişangâh & skop","Прицелы и диоптры","Visores y miras","Sikten","Vizieren"]
D["cat_rest"]           = ["Bottoni, rest & clicker","Buttons, rests & clickers","Berger, repose-flèche & clicker","Buttons, Auflagen & Klicker","Buton, rest & klik","Кликеры, полочки, кнопки","Botones, reposaflechas y clicker","Knappar, pilhyllor & klicker","Buttons, rests & clickers"]
D["cat_stabilizzatori"] = ["Stabilizzazioni","Stabilisers","Stabilisation","Stabilisatoren","Denge çubukları","Стабилизаторы","Estabilizadores","Stabilisatorer","Stabilisatoren"]
D["cat_sganci"]         = ["Sganci meccanici","Releases","Décocheurs","Releases","Bırakıcılar","Релизы","Disparadores","Släpp","Releases"]
D["cat_faretra"]        = ["Faretre & cinture","Quivers & belts","Carquois & ceintures","Köcher & Gürtel","Sadak & kemer","Колчаны и ремни","Carcaj y cinturones","Koger & bälten","Kokers & riemen"]
D["cat_corda"]          = ["Corde, cavi & filati","Strings, cables & yarn","Cordes, câbles & fils","Sehnen, Kabel & Garn","Kiriş, kablo & iplik","Тетивы, тросы, нити","Cuerdas, cables e hilos","Strängar, kablar & garn","Pezen, kabels & garen"]
D["cat_protezioni"]     = ["Protezioni","Protection","Protections","Schutz","Koruyucular","Защита","Protecciones","Skydd","Bescherming"]
D["cat_borse"]          = ["Borse & valigie","Bags & cases","Sacs & valises","Taschen & Koffer","Çanta & valiz","Сумки и кейсы","Bolsas y maletas","Väskor & fodral","Tassen & koffers"]
D["cat_attrezzatura"]   = ["Attrezzatura & messa a punto","Tools & tuning","Outils & réglage","Werkzeug & Tuning","Alet & ayar","Инструменты и настройка","Herramientas y ajuste","Verktyg & trimning","Gereedschap & afstellen"]
D["cat_abbigliamento"]  = ["Abbigliamento","Clothing","Vêtements","Bekleidung","Giyim","Одежда","Ropa","Kläder","Kleding"]
D["cat_bersagli"]       = ["Bersagli 3D & campo","3D targets & range","Cibles 3D & parcours","3D-Ziele & Parcours","3D hedef & parkur","3D-мишени и площадка","Dianas 3D y campo","3D-mål & bana","3D-doelen & baan"]
D["cat_altro"]          = ["Altro","Other","Autre","Sonstiges","Diğer","Другое","Otro","Övrigt","Overig"]
D["cat_all"]            = ["Tutte","All","Toutes","Alle","Tümü","Все","Todas","Alla","Alle"]

D["cat_protezioni_long"] = ["Protezioni (patelle, guantini, parabracci)","Protection (tabs, gloves, armguards)","Protections (palettes, gants, protège-bras)","Schutz (Tab, Handschuh, Armschutz)","Koruyucular (tab, eldiven, kol koruma)","Защита (напальчники, перчатки, краги)","Protecciones (dediles, guantes, brazales)","Skydd (tabb, handske, armskydd)","Bescherming (tabs, handschoenen, armbeschermers)"]
D["cat_borse_long"]      = ["Borse, zaini & valigie","Bags, backpacks & cases","Sacs, sacs à dos & valises","Taschen, Rucksäcke & Koffer","Çanta, sırt çantası & valiz","Сумки, рюкзаки, кейсы","Bolsas, mochilas y maletas","Väskor, ryggsäckar & fodral","Tassen, rugzakken & koffers"]
D["cat_abb_long"]        = ["Abbigliamento tecnico","Technical clothing","Vêtements techniques","Funktionsbekleidung","Teknik giyim","Техническая одежда","Ropa técnica","Funktionskläder","Technische kleding"]
D["cat_bers_long"]       = ["Bersagli 3D & accessori campo","3D targets & range gear","Cibles 3D & accessoires parcours","3D-Ziele & Parcours-Zubehör","3D hedef & parkur ekipmanı","3D-мишени и оснащение","Dianas 3D y accesorios de campo","3D-mål & banutrustning","3D-doelen & baanspullen"]

# ── tipo arco, sgancio, materiali, mano ─────────────────────────────────────
D["bow_compound"] = ["Compound","Compound","Poulies","Compound","Makaralı","Блочный","Compuesto","Compound","Compound"]
D["bow_ricurvo"]  = ["Ricurvo","Recurve","Classique","Recurve","Klasik","Классический","Recurvo","Recurve","Recurve"]
D["bow_ricurvo_l"]= ["Ricurvo / Olimpico","Recurve / Olympic","Classique / olympique","Recurve / Olympisch","Klasik / Olimpik","Классический / олимпийский","Recurvo / olímpico","Recurve / olympisk","Recurve / olympisch"]
D["bow_barebow"]  = ["Barebow","Barebow","Barebow","Blank","Çıplak yay","Голый лук","Barebow","Barebow","Barebow"]
D["bow_barebow_l"]= ["Barebow / Nudo","Barebow","Barebow / nu","Blankbogen","Barebow / çıplak","Барбоу (голый лук)","Barebow / desnudo","Barebow","Barebow / blank"]
D["bow_longbow"]  = ["Longbow","Longbow","Longbow","Langbogen","Uzun yay","Лонгбоу","Longbow","Långbåge","Longbow"]
D["bow_storico"]  = ["Storico","Historical","Historique","Historisch","Tarihî","Исторический","Histórico","Historisk","Historisch"]
D["bow_all"]      = ["Tutti","All","Tous","Alle","Tümü","Все","Todos","Alla","Alle"]

D["rel_pressione"]   = ["A pressione","Trigger","À gâchette","Auslöser","Tetikli","Кнопочный","De gatillo","Avtryckare","Trekker"]
D["rel_pressione_l"] = ["A pressione (polso / pollice)","Trigger (wrist / thumb)","À gâchette (poignet / pouce)","Auslöser (Handgelenk / Daumen)","Tetikli (bilek / başparmak)","Кнопочный (кистевой / большой палец)","De gatillo (muñeca / pulgar)","Avtryckare (handled / tumme)","Trekker (pols / duim)"]
D["rel_rotazione"]   = ["A rotazione","Hinge","Rotatif","Hinge","Döner","Хинж","De bisagra","Hinge","Hinge"]
D["rel_rotazione_l"] = ["A rotazione (hinge / backtension)","Hinge / back tension","Rotatif (hinge / back tension)","Hinge / Back-Tension","Döner (hinge / back tension)","Хинж / бэктеншн","De bisagra (back tension)","Hinge / back tension","Hinge / back tension"]
D["rel_incremento"]  = ["A incremento","Resistance","À résistance","Resistance","Dirençli","Резистанс","De resistencia","Resistance","Resistance"]
D["rel_incremento_l"]= ["A incremento (resistance)","Resistance activated","À résistance","Resistance-Release","Dirençli (resistance)","Резистанс","De resistencia","Resistance","Resistance"]
D["rel_accessorio"]  = ["Accessorio","Accessory","Accessoire","Zubehör","Aksesuar","Аксессуар","Accesorio","Tillbehör","Toebehoren"]
D["rel_accessorio_l"]= ["Accessorio sgancio (cordino, D-loop, ricambi)","Release accessory (strap, D-loop, spares)","Accessoire décocheur (dragonne, D-loop, pièces)","Release-Zubehör (Schlaufe, D-Loop, Ersatz)","Bırakıcı aksesuarı (kayış, D-loop, yedek)","Аксессуар релиза (петля, D-loop, запчасти)","Accesorio de disparador (correa, D-loop)","Släpp-tillbehör (rem, D-loop, delar)","Release-toebehoren (band, D-loop)"]
D["rel_all"]         = ["Tutti","All","Tous","Alle","Tümü","Все","Todos","Alla","Alle"]

D["hand"]      = ["Mano","Hand","Main","Hand","El","Рука","Mano","Hand","Hand"]
D["hand_both"] = ["Entrambe","Both","Les deux","Beide","İkisi","Обе","Ambas","Båda","Beide"]
D["hand_dx"]   = ["Destra","Right","Droite","Rechts","Sağ","Правая","Derecha","Höger","Rechts"]
D["hand_sx"]   = ["Sinistra","Left","Gauche","Links","Sol","Левая","Izquierda","Vänster","Links"]
D["hand_dx_s"] = ["destro","right hand","droitier","rechts","sağ","правый","diestro","höger","rechts"]
D["hand_sx_s"] = ["sinistro","left hand","gaucher","links","sol","левый","zurdo","vänster","links"]

D["mat_carbonio"]  = ["Carbonio","Carbon","Carbone","Carbon","Karbon","Карбон","Carbono","Kol","Carbon"]
D["mat_alluminio"] = ["Alluminio","Aluminium","Aluminium","Aluminium","Alüminyum","Алюминий","Aluminio","Aluminium","Aluminium"]
D["mat_carballu"]  = ["Carb/Allum","Carbon/Alu","Carbone/alu","Carbon/Alu","Karbon/Alü","Карбон/алюм.","Carbono/alu","Kol/alu","Carbon/alu"]
D["mat_legno"]     = ["Legno","Wood","Bois","Holz","Ahşap","Дерево","Madera","Trä","Hout"]
D["mat_ottone"]    = ["Ottone","Brass","Laiton","Messing","Pirinç","Латунь","Latón","Mässing","Messing"]
D["mat_acciaio"]   = ["Acciaio","Steel","Acier","Stahl","Çelik","Сталь","Acero","Stål","Staal"]
D["mat_all"]       = ["Tutti","All","Tous","Alle","Tümü","Все","Todos","Alla","Alle"]
