-- =============================================================================
-- family-booking — buckets de fichiers et politiques d'accès associées
-- =============================================================================
-- Appliqué par le service `storage-init` à chaque démarrage de la pile, et non
-- à l'initialisation de Postgres : le schéma `storage` est créé par le service
-- Storage lui-même, qui n'a pas encore démarré au moment de l'initdb.
--
-- Entièrement rejouable.
-- =============================================================================

-- Buckets publics en lecture : les images sont servies par des URL publiques.
-- L'écriture reste filtrée par les politiques ci-dessous.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('guestbook-photos',   'guestbook-photos',   true, 20971520,
   ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('local-guide-images', 'local-guide-images', true, 20971520,
   ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- -----------------------------------------------------------------------------
-- Livre d'or — bucket guestbook-photos
-- -----------------------------------------------------------------------------
-- Les fichiers sont rangés sous <user_id>/… : le premier segment du chemin sert
-- de preuve de propriété.

DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
CREATE POLICY "Public can view photos" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'guestbook-photos');

DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
CREATE POLICY "Authenticated users can view photos" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'guestbook-photos');

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'guestbook-photos'
      AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
CREATE POLICY "Users can update their own photos" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'guestbook-photos'
      AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'guestbook-photos'
      AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own photos or admins can delete any" ON storage.objects;
CREATE POLICY "Users can delete their own photos or admins can delete any" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'guestbook-photos'
      AND (
        (SELECT auth.uid())::text = (storage.foldername(name))[1]
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = (SELECT auth.uid()) AND users.role = 'ADMIN'
        )
      )
    );


-- -----------------------------------------------------------------------------
-- Guide local — bucket local-guide-images
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view local guide images" ON storage.objects;
CREATE POLICY "Public can view local guide images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'local-guide-images');

DROP POLICY IF EXISTS "Admins can upload local guide images" ON storage.objects;
CREATE POLICY "Admins can upload local guide images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'local-guide-images'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
      )
    );

DROP POLICY IF EXISTS "Admins can update local guide images" ON storage.objects;
CREATE POLICY "Admins can update local guide images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'local-guide-images'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
      )
    )
    WITH CHECK (
      bucket_id = 'local-guide-images'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
      )
    );

DROP POLICY IF EXISTS "Admins can delete local guide images" ON storage.objects;
CREATE POLICY "Admins can delete local guide images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'local-guide-images'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'ADMIN'
      )
    );
