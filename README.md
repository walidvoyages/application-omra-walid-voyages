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
