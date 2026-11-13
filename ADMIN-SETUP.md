# Admin - Configuration

1. Créer un projet dans https://supabase.com
2. Exécuter le fichier `supabase/schema.sql` dans Supabase SQL Editor.
3. Dans Authentication > Users > Add user, créer l'email d'administration et un mot de passe fort (12+ caractères). Ne pas envoyer le mot de passe dans un chat.
4. Copier le User UID depuis Supabase Authentication. Dans SQL Editor, exécuter :

    insert into public.omra_admins (user_id) values ('REMPLACER_PAR_USER_UUID');

5. Dans Project Settings > API, récupérer **Project URL** et **Publishable key / anon key**. Les placer dans `config.js`. La clé doit être PUBLIQUE, jamais la clé service_role ou secret.
6. Désactiver l'inscription publique libre dans Supabase Authentication > Providers > Email, si disponible. Pour la récupération du mot de passe, configurer l'URL publique et `admin.html` dans Authentication > URL Configuration.
7. Publier GitHub Pages depuis main/(root), puis ouvrir `admin.html`.

Le dashboard permet ajouter, modifier, supprimer, publier/dépublier les voyages. Les programmes sont stockés dans PostgreSQL/Supabase. Les visiteurs ne peuvent lire que les voyages publiés ; les politiques RLS protègent l'écriture. Aucune sauvegarde locale ne remplace la base. Le site consulte les programmes à l'ouverture et à intervalles de 60 secondes. Tant que Supabase n'est pas configuré, le site public continue à utiliser les dates de démonstration de content.json (à confirmer avant réservation).

Tests nécessaires: vérifier qu'un visiteur anonyme ne peut pas modifier de programme ; qu'un utilisateur Supabase standard non-admin ne peut pas modifier ; que l'admin peut créer/modifier/supprimer ; que dépublier supprime bien la fiche de la page publique. Prévoir export/backup Supabase selon votre plan.
