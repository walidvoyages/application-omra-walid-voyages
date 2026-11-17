-- Adds independent account avatars; run in the existing Supabase project.
ALTER TABLE public.omra_client_profiles ADD COLUMN IF NOT EXISTS avatar_path text;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
   WHERE conname='omra_client_profile_avatar_len'
     AND conrelid='public.omra_client_profiles'::regclass) THEN
  ALTER TABLE public.omra_client_profiles ADD CONSTRAINT omra_client_profile_avatar_len
    CHECK (avatar_path IS NULL OR length(avatar_path) BETWEEN 20 AND 350);
 END IF;
END $$;
INSERT INTO public.omra_client_profiles(user_id,avatar_path)
SELECT DISTINCT ON (linked_user_id) linked_user_id,avatar_path
 FROM public.omra_story_invites
 WHERE linked_user_id IS NOT NULL AND avatar_path IS NOT NULL AND revoked_at IS NULL
 ORDER BY linked_user_id,issued_at DESC
ON CONFLICT (user_id) DO UPDATE SET avatar_path=EXCLUDED.avatar_path
 WHERE public.omra_client_profiles.avatar_path IS NULL;
DROP POLICY IF EXISTS wv_omra_self_profile_insert ON storage.objects;
CREATE POLICY wv_omra_self_profile_insert ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
 bucket_id='wv-omra-private'
 AND split_part(name,'/',1)=(select auth.uid())::text
 AND split_part(name,'/',2)='profile'
 AND split_part(name,'/',3) ~ '^[0-9a-f-]{36}\.jpg$'
 AND array_length(storage.foldername(name),1)=2);
SELECT pg_catalog.pg_notify('pgrst','reload schema');
