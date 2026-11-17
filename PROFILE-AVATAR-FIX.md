# Correctif photo de profil — عمرتي حكايتي (v24)

## Étapes obligatoires

1. Ouvrir le même projet **Supabase** que l'application (config.js).
2. Dans **SQL Editor**, exécuter le contenu de `supabase/fix-profile-avatar.sql`. Le fichier est réexécutable, ne rend pas les photos publiques et ne modifie pas les photos existantes.
3. Ouvrir l'application à nouveau, faire un rafraîchissement et se connecter en tant que pèlerin avec un code d'Omra déjà activé.
4. Choisir une photo de profil. La version v24 la convertit en JPEG et la réduit automatiquement à 1200 px au maximum avant l'envoi. Certaines images HEIC exigent une conversion préalable en JPG si le navigateur ne les décode pas.
5. Vérifier que le visage apparaît après déconnexion/reconnexion et sur un autre téléphone. Le chemin est enregistré dans `omra_story_invites.avatar_path`, le fichier dans le bucket privé `wv-omra-private`.

La nouvelle interface donne un message plus clair si la fonction `omra_set_story_avatar` ou la colonne `avatar_path` est absente. Aucun secret Supabase Service Role ne doit être inséré côté navigateur.

**Important :** le correctif dans GitHub est déjà prêt, mais il n'est pas appliqué dans la base Supabase tant que le SQL n'a pas été exécuté dans le projet.
