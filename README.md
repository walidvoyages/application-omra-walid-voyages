# رفيق العمرة — Walid Voyages

Application **Web mobile-first / PWA** en arabe RTL. Sur téléphone: apparence d'application installable. Sur ordinateur: aperçu vertical de téléphone. Aucun build ni paquet à installer : HTML, CSS et JavaScript.

## Fonctionnalités disponibles

- Accueil premium avec diaporama photo, fil d'actualités, raccourcis et programmes à venir.
- Programmes Omra filtrables, fiches détaillées et lien vers le site officiel (sans fausse disponibilité).
- Guide des rites (6 étapes) avec progression sauvegardée sur l'appareil, préparation et conditions.
- Tasbih électronique interactif, remise à zéro, choix du dhikr et comptage persistant.
- Horaires de prière des villes tunisiennes fournis par [AlAdhan](https://aladhan.com/prayer-times-api), accompagnés d'un avertissement de précision.
- 6 visites spirituelles en Mecque et à Médine, favoris locaux.
- Quiz de 6 questions avec score et corrigé.
- Installation PWA, cache hors ligne pour les écrans essentiels, navigation accessible.

## Mise en ligne (GitHub Pages)

1. Ouvrir **Settings > Pages** dans le dépôt.
2. Dans **Build and deployment**, choisir **Deploy from a branch**.
3. Sélectionner la branche **main** et le dossier **/(root)**, puis enregistrer.
4. L'application sera publiée sous le chemin \`/application-omra-walid-voyages/\` sur le domaine GitHub Pages du compte.

Le PWA nécessite HTTPS (fourni par GitHub Pages). Le bouton Installer dépend du navigateur : iPhone = Safari > Partager > Sur l'écran d'accueil; Android Chrome peut proposer son invitation d'installation.

## Mettre à jour les contenus sans modifier le code

Modifier **\`content.json\`** via GitHub :
- \`ticker\`: messages du bandeau défilant.
- \`slides\`: titres, descriptions et liens photo pour la rotation des images.
- \`programs\`: prochaines dates et détails \`id, title, start, end, airline, route, hotel, tag\`.
- \`bookingUrl\`: destination du bouton de contact (actuellement le site Walid Voyages).
- \`notice\`: message de vérification avant réservation.

Les nouvelles données sont chargées à l'ouverture et périodiquement. **Les dates préchargées sont indicatives**, inspirées du planning de travail de l'agence, et doivent être confirmées avant publication commerciale. Aucun prix ni place disponible n'est inventé.

## Avant publication officielle

- Valider les dates, compagnies, hôtels et coordonnées commerciales.
- Ajouter, si souhaité, un véritable CMS/API pour synchroniser automatiquement offres, images et nouvelles.
- Ajouter un service de push (backend + abonnement utilisateur + consentement); le bandeau actuel est mis à jour par JSON, **pas** une notification push du téléphone.
- Vérifier les exigences courantes de visa, de santé et les rites avec l'accompagnateur agréé.
- Vérifier les horaires de prière locaux : les résultats AlAdhan sont **estimés**, pas des horaires officiels de mosquée.
- Prévoir un visuel officiel/logo source et des PNG 192/512 si une compatibilité maximale des installations est souhaitée.

## Crédits photo

Photos externes utilisées dans le diaporama, licences et crédits disponibles sur les pages source:
- [Masjid al-Haram.JPG](https://commons.wikimedia.org/wiki/File:Masjid_al-Haram.JPG), Zainichi Gaikokujin, CC BY 3.0.
- [Al Masjid an Nabawi.jpg](https://commons.wikimedia.org/wiki/File:Al_Masjid_an_Nabawi.jpg), Aymanzaid2, CC BY-SA 4.0.
- [Masjid-Al-Nabawi Madinah.jpg](https://commons.wikimedia.org/wiki/File:Masjid-Al-Nabawi_Madinah.jpg), HUTA Group, CC BY-SA 4.0.

L'app affiche également les liens de crédit dans À propos. Les photos sont hébergées par Wikimedia Commons et nécessitent une connexion pour s'afficher au premier chargement.

## التذكيرات الإيمانية

أضفنا إشعارات **داخل التطبيق**: آيات مع السورة والآية، أذكار، وصلاة على النبي ﷺ. تظهر عند فتح التطبيق (بفاصل يمنع الإزعاج) وتستمر خلال استعماله باختيار كل 30/60/120 دقيقة، مع قائمة تاريخية وزر تعطيل. نظام الهدوء من 23:00 إلى 07:00 بحسب وقت الجهاز. المحتوى مخزّن محليًا ويعمل دون اتصال.

إشعارات الجهاز اختيارية وتتطلب إذن المستخدم ودعم المتصفح؛ في هذه النسخة هي best effort ما دام التطبيق نشطًا، **وليست Push notifications** ولا تُرسل بعد الإغلاق الكلّي. يحتاج الإرسال في الخلفية Backend + Web Push subscriptions + scheduling وإدارة الموافقة.

## Brand, travel & dhikr update
- La marque de l'application utilise le logo fourni de Walid Voyages (vignette web optimisée dans `omra-logo.webp`) et les couleurs W-wave officielles #49AAE3 / #B5D33F.
- Footer: 58 150 699 / 73 201 660 / https://www.walid-voyages.com.
- Azkar: catégories matin, soir, après la prière, voyage et divers.
- Le fil d'actualité privilégie la dernière Omra publiée selon la vraie date `published_at`, pas la date du départ; les dates ne sont pas inventées.
- Espace admin: horaires des rappels, horaires silence, délais avant voyage et rappel pendant le voyage. Exécuter `supabase/reminder-settings.sql` dans Supabase SQL Editor AVANT de sauvegarder la configuration.
- Les rappels voyageurs nécessitent que l'utilisateur choisisse explicitement un programme parmi les voyages publiés, sans créer de réservation.
- Tout rappel fonctionne en mode applicatif seulement (pas d'envoi Push garanti après fermeture).

## Bibliothèque d'adhkâr élargie

La bibliothèque locale (`adhkar-library.js`) contient 196 invocations dans 18 catégories. Interface avec recherche, favoris, suivi de lecture local (`localStorage`) et chargement progressif. Aucun compte Supabase ni base de données supplémentaire n'est nécessaire pour le contenu des invocations. Les textes sont des références à relire éditorialement avant de présenter comme collection religieuse vérifiée; pas de nombres de répétition automatiques sans source établie.

Pour ajouter des invocations à l'avenir, étendre le tableau `entries` et éventuellement `categories` dans `adhkar-library.js`, augmenter le numéro de version des scripts et du cache PWA.

## Comptes clients / عمرتي حكاية / ajout d'adhkâr

**Activation manuelle nécessaire:** ouvrir `supabase/story-and-adhkar.sql` dans Supabase SQL Editor et exécuter le fichier avec le rôle propriétaire du projet. Il ajoute les tables `omra_client_profiles`, `omra_story_invites`, `omra_story_stops`, `omra_adhkar_custom`, les fonctions d'invitation sécurisées et un bucket privé pour les photos (interface photo à développer plus tard). Les politiques RLS protègent les données par `auth.uid()`. Aucune nouvelle instance Supabase nécessaire.

**Administration:** depuis `admin.html`, ouvrir «حسابات المعتمرين وكود الرحلة», choisir une Omra publiée et un nom de client, créer un code unique, puis le transmettre au client en privé. Le code n'est visible qu'une seule fois et ne peut être utilisé que pour un seul compte, sauf réutilisation par le même compte. L'admin peut révoquer l'accès. Un lien email/mot de passe en lui-même ne prouve pas une réservation; la réservation est établie par l'invitation attribuée par l'agence.

**Application client:** menu «المزيد» → «عمرتي حكاية». Création/connexion par email et mot de passe (confirmation email selon configuration Supabase). Saisir le code, puis consulter le programme lié à ce compte, marquer les étapes visitées, ajouter des points et des notes sauvegardées dans Supabase. La première version ne télécharge pas encore les photos/vidéos ni les audios; ne pas demander de tels éléments avant l'activation de leur interface dédiée.

**Adhkâr:** menu Admin «إضافة أذكار للتطبيق» avec saisie d'une catégorie, titre, texte, source et statut brouillon/publié. Seuls les contenus approuvés/publiés sont disponibles publiquement. La collection initiale reste intégrée localement (196 entrées) et fonctionne hors ligne; les nouveaux éléments créés via Admin sont synchronisés en ligne.

## Client login UI update (v16)

`story-auth.css` provides isolated modern login/signup/reset-password styles for the customer-facing My Omra Story page. `story.js` separates login, signup, recovery, and resend email confirmation; users may need to confirm their email depending on Supabase Auth settings. `index.html` loads the new stylesheet, and the service worker uses network-first fetching of local CSS and JS to prevent stale UI. The optional `supabase/story-and-adhkar.sql` migration must be run separately to enable customer invitations and saved journeys. A created email/password account does not automatically link to an Omra booking: the agency issues a private code through its admin.
