-- =============================================================================
-- family-booking — schéma applicatif complet
-- =============================================================================
-- Ce fichier décrit l'état final de la base. Il est appliqué automatiquement par
-- Postgres à la création du volume de données (docker-entrypoint-initdb.d).
-- Il n'y a pas de migrations incrémentales : pour repartir de zéro,
-- `docker compose down -v` puis `docker compose up -d`.
--
-- Les objets liés au stockage de fichiers (buckets, politiques sur
-- storage.objects) vivent dans 04-storage.sql : le schéma `storage` n'existe
-- qu'une fois que le service Storage a migré sa propre structure.
-- =============================================================================

-- Les scripts d'initialisation tournent en superutilisateur. On bascule sur
-- `postgres` pour que les objets — en particulier les fonctions SECURITY DEFINER —
-- appartiennent au même rôle non superutilisateur que sur Supabase hébergé.
SET ROLE postgres;

-- Exclusion de plages sur un type non natif (voir la contrainte anti-chevauchement).
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE public.reservation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE public.local_guide_category AS ENUM ('restaurant', 'activite', 'service', 'commerce');
CREATE TYPE public.local_guide_season AS ENUM ('hiver', 'ete');

GRANT ALL ON TYPE public.user_role TO anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role public.user_role DEFAULT 'MEMBER'::public.user_role NOT NULL,
    auto_approve_own_reservations boolean DEFAULT false NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

COMMENT ON COLUMN public.users.auto_approve_own_reservations IS
  'When true, ADMIN own reservation creates are APPROVED; default false = PENDING';

CREATE INDEX idx_users_email ON public.users USING btree (email);


CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    invited_by uuid NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT invitations_pkey PRIMARY KEY (id),
    CONSTRAINT invitations_token_key UNIQUE (token),
    CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);
CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status public.reservation_status DEFAULT 'PENDING'::public.reservation_status NOT NULL,
    guests integer NOT NULL,
    comment text,
    admin_comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (id),
    CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

-- Deux séjours approuvés ne peuvent pas se chevaucher, même en cas d'approbations
-- concurrentes : la garantie est portée par la base, pas par le code applicatif.
ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_approved_no_overlap
    EXCLUDE USING gist (tstzrange(start_date, end_date, '[]'::text) WITH &&)
    WHERE ((status = 'APPROVED'::public.reservation_status));

CREATE INDEX idx_reservations_user_id ON public.reservations USING btree (user_id);
CREATE INDEX idx_reservations_start_date ON public.reservations USING btree (start_date);
CREATE INDEX idx_reservations_end_date ON public.reservations USING btree (end_date);
CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);


CREATE TABLE public.property_info (
    id text DEFAULT 'singleton'::text NOT NULL,
    opening_time text,
    closing_time text,
    practical_info text,
    opening_checklist jsonb,
    closing_checklist jsonb,
    general_info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address text,
    wifi_network text,
    wifi_password text,
    contacts jsonb DEFAULT '[]'::jsonb,
    trash_schedule jsonb DEFAULT '[]'::jsonb,
    apartment_rules jsonb DEFAULT '[]'::jsonb,
    custom_info_items jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT property_info_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN public.property_info.contacts IS
  'Array of contacts: [{"type": string, "label": string, "phone": string}]';
COMMENT ON COLUMN public.property_info.trash_schedule IS
  'Array of trash schedules: [{"type": string, "days": string[]}]';
COMMENT ON COLUMN public.property_info.apartment_rules IS
  'Array of rules: string[]';
COMMENT ON COLUMN public.property_info.custom_info_items IS
  'Array of custom info items: [{"id": string, "title": string, "content": string, "icon"?: string, "order": number}]';


CREATE TABLE public.failed_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    email text,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.failed_login_attempts IS
  'Table pour tracker les tentatives de connexion échouées afin de détecter les attaques par force brute';
COMMENT ON COLUMN public.failed_login_attempts.ip_address IS 'Adresse IP de la tentative';
COMMENT ON COLUMN public.failed_login_attempts.email IS 'Email utilisé dans la tentative (peut être NULL)';
COMMENT ON COLUMN public.failed_login_attempts.attempted_at IS 'Date et heure de la tentative';
COMMENT ON COLUMN public.failed_login_attempts.user_agent IS 'User-Agent du navigateur';

CREATE INDEX idx_failed_login_attempts_ip_address ON public.failed_login_attempts USING btree (ip_address);
CREATE INDEX idx_failed_login_attempts_attempted_at ON public.failed_login_attempts USING btree (attempted_at);
CREATE INDEX idx_failed_login_attempts_email ON public.failed_login_attempts USING btree (email) WHERE (email IS NOT NULL);


CREATE TABLE public.guestbook_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reservation_id uuid,
    message text NOT NULL,
    photos text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guestbook_entries_pkey PRIMARY KEY (id),
    CONSTRAINT guestbook_entries_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT guestbook_entries_reservation_id_fkey FOREIGN KEY (reservation_id)
        REFERENCES public.reservations(id) ON DELETE SET NULL
);

CREATE INDEX idx_guestbook_entries_user_id ON public.guestbook_entries USING btree (user_id);
CREATE INDEX idx_guestbook_entries_reservation_id ON public.guestbook_entries USING btree (reservation_id);
CREATE INDEX idx_guestbook_entries_created_at ON public.guestbook_entries USING btree (created_at DESC);


CREATE TABLE public.guestbook_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_id uuid NOT NULL,
    storage_path text NOT NULL,
    url text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guestbook_photos_pkey PRIMARY KEY (id),
    CONSTRAINT guestbook_photos_entry_id_fkey FOREIGN KEY (entry_id)
        REFERENCES public.guestbook_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_guestbook_photos_entry_id ON public.guestbook_photos USING btree (entry_id);
CREATE INDEX idx_guestbook_photos_order ON public.guestbook_photos USING btree (entry_id, "order");


CREATE TABLE public.local_guide_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.local_guide_category NOT NULL,
    name text NOT NULL,
    description text,
    phone text,
    email text,
    address text,
    website text,
    access_instructions text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    seasons public.local_guide_season[] DEFAULT '{}'::public.local_guide_season[] NOT NULL,
    CONSTRAINT local_guide_entries_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_local_guide_entries_category ON public.local_guide_entries USING btree (category);
CREATE INDEX idx_local_guide_entries_tags ON public.local_guide_entries USING gin (tags);
CREATE INDEX idx_local_guide_entries_seasons ON public.local_guide_entries USING gin (seasons);


-- -----------------------------------------------------------------------------
-- Fonctions utilitaires
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- Synchronisation auth.users <-> public.users
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'MEMBER'::public.user_role
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(
      NULLIF(EXCLUDED.role::text, '')::public.user_role,
      public.users.role
    ),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    name = COALESCE(NEW.raw_user_meta_data->>'name', public.users.name),
    role = COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      public.users.role
    ),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_role_from_auth_metadata() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  role_from_metadata public.user_role;
BEGIN
  -- Extraire le rôle des métadonnées auth si présent
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      role_from_metadata := (NEW.raw_user_meta_data->>'role')::public.user_role;

      -- Mettre à jour public.users si le rôle a changé
      UPDATE public.users
      SET
        role = role_from_metadata,
        updated_at = NOW()
      WHERE id = NEW.id
        AND role != role_from_metadata;
    EXCEPTION WHEN OTHERS THEN
      -- Si le rôle n'est pas valide, ignorer
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_from_auth(p_id uuid, p_email text, p_raw_user_meta jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    p_id,
    p_email,
    COALESCE(p_raw_user_meta->>'name', NULL),
    COALESCE(
      NULLIF(p_raw_user_meta->>'role', '')::public.user_role,
      'MEMBER'::public.user_role
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(
      NULLIF(EXCLUDED.role::text, '')::public.user_role,
      public.users.role
    ),
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_users_needing_role_sync()
    RETURNS TABLE(user_id uuid, email text, public_role public.user_role, auth_role_metadata text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.role,
    COALESCE(au.raw_user_meta_data->>'role', 'NULL')::TEXT
  FROM public.users u
  INNER JOIN auth.users au ON u.id = au.id
  WHERE u.role = 'ADMIN'
    AND (au.raw_user_meta_data->>'role' IS NULL
         OR au.raw_user_meta_data->>'role' != 'ADMIN');
END;
$$;


-- -----------------------------------------------------------------------------
-- Premier administrateur et protection des rôles
-- -----------------------------------------------------------------------------

-- Le verrou consultatif sérialise les créations concurrentes, et la suppression
-- préalable absorbe la ligne que handle_new_user vient éventuellement d'insérer.
CREATE OR REPLACE FUNCTION public.try_create_first_admin(p_id uuid, p_email text, p_name text DEFAULT NULL::text)
    RETURNS public.users
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result public.users;
  existing_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(42);

  DELETE FROM public.users WHERE id = p_id;

  SELECT count(*) INTO existing_count FROM public.users;
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'FIRST_USER_EXISTS';
  END IF;

  INSERT INTO public.users (id, email, name, role)
  VALUES (p_id, p_email, p_name, 'ADMIN')
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if caller is service role (jwt role = service_role) or is_admin
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Role changes are restricted to administrators';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- Réservations : écritures passant par des fonctions SECURITY DEFINER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_reservation(
    p_user_id uuid,
    p_start timestamp with time zone,
    p_end timestamp with time zone,
    p_guests integer,
    p_comment text DEFAULT NULL::text,
    p_status public.reservation_status DEFAULT 'PENDING'::public.reservation_status
) RETURNS public.reservations
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.reservations;
  v_is_admin boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_is_admin := is_admin(v_caller);

  IF p_user_id <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND p_status <> 'PENDING' THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_admin AND p_start::date < CURRENT_DATE THEN
    RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = '22023';
  END IF;

  -- Serialize overlap checks for APPROVED writes
  IF p_status = 'APPROVED' THEN
    PERFORM 1
    FROM public.reservations
    WHERE status = 'APPROVED'
      AND start_date <= p_end
      AND end_date >= p_start
    FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM public.reservations
      WHERE status = 'APPROVED'
        AND start_date <= p_end
        AND end_date >= p_start
    ) THEN
      RAISE EXCEPTION 'OVERLAP' USING ERRCODE = '23P01';
    END IF;
  END IF;

  INSERT INTO public.reservations (user_id, start_date, end_date, guests, comment, status)
  VALUES (p_user_id, p_start, p_end, p_guests, p_comment, p_status)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_reservation(p_id uuid, p_action text, p_admin_comment text DEFAULT NULL::text)
    RETURNS public.reservations
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.reservations;
  v_new_status reservation_status;
BEGIN
  IF v_caller IS NULL OR NOT is_admin(v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'approve' THEN
    PERFORM 1
    FROM public.reservations
    WHERE status = 'APPROVED'
      AND id <> p_id
      AND start_date <= v_row.end_date
      AND end_date >= v_row.start_date
    FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM public.reservations
      WHERE status = 'APPROVED'
        AND id <> p_id
        AND start_date <= v_row.end_date
        AND end_date >= v_row.start_date
    ) THEN
      RAISE EXCEPTION 'OVERLAP' USING ERRCODE = '23P01';
    END IF;

    v_new_status := 'APPROVED';
  ELSE
    v_new_status := 'REJECTED';
  END IF;

  UPDATE public.reservations
  SET status = v_new_status,
      admin_comment = p_admin_comment
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reservation_dates(
    p_id uuid,
    p_start timestamp with time zone,
    p_end timestamp with time zone,
    p_guests integer,
    p_comment text DEFAULT NULL::text,
    p_status public.reservation_status DEFAULT NULL::public.reservation_status,
    p_admin_comment text DEFAULT NULL::text
) RETURNS public.reservations
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.reservations;
  v_is_admin boolean;
  v_next_status reservation_status;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_is_admin := is_admin(v_caller);

  SELECT * INTO v_row FROM public.reservations WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.user_id <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = '22023';
  END IF;

  v_next_status := COALESCE(p_status, v_row.status);

  IF NOT v_is_admin THEN
    IF v_next_status NOT IN ('PENDING', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = '22023';
    END IF;
    -- members cannot re-approve themselves
    IF v_row.status = 'APPROVED' AND v_next_status = 'APPROVED' THEN
      -- allowing date edit on own APPROVED only if still APPROVED requires admin in product today;
      -- members may cancel only
      NULL;
    END IF;
  END IF;

  IF v_next_status = 'APPROVED' THEN
    PERFORM 1
    FROM public.reservations
    WHERE status = 'APPROVED'
      AND id <> p_id
      AND start_date <= p_end
      AND end_date >= p_start
    FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM public.reservations
      WHERE status = 'APPROVED'
        AND id <> p_id
        AND start_date <= p_end
        AND end_date >= p_start
    ) THEN
      RAISE EXCEPTION 'OVERLAP' USING ERRCODE = '23P01';
    END IF;
  END IF;

  UPDATE public.reservations
  SET start_date = p_start,
      end_date = p_end,
      guests = p_guests,
      comment = COALESCE(p_comment, comment),
      status = v_next_status,
      admin_comment = CASE
        WHEN v_is_admin THEN COALESCE(p_admin_comment, admin_comment)
        ELSE admin_comment
      END
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


-- -----------------------------------------------------------------------------
-- Tentatives de connexion échouées
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(
    p_ip_address inet,
    p_email text DEFAULT NULL::text,
    p_user_agent text DEFAULT NULL::text
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.failed_login_attempts (ip_address, email, user_agent)
  VALUES (p_ip_address, p_email, p_user_agent)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_recent_failed_attempts_by_ip(p_ip_address inet, p_minutes integer DEFAULT 15)
    RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.failed_login_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > NOW() - (p_minutes || ' minutes')::INTERVAL;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_recent_failed_attempts_by_email(p_email text, p_minutes integer DEFAULT 15)
    RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.failed_login_attempts
  WHERE email = p_email
    AND attempted_at > NOW() - (p_minutes || ' minutes')::INTERVAL;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_failed_login_attempts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;


-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_info_updated_at BEFORE UPDATE ON public.property_info
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guestbook_entries_updated_at BEFORE UPDATE ON public.guestbook_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_local_guide_entries_updated_at BEFORE UPDATE ON public.local_guide_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

DROP TRIGGER IF EXISTS sync_role_from_auth_metadata_trigger ON auth.users;
CREATE TRIGGER sync_role_from_auth_metadata_trigger AFTER UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_auth_metadata();


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_guide_entries ENABLE ROW LEVEL SECURITY;

-- `(SELECT auth.uid())` plutôt que `auth.uid()` : le planificateur évalue alors
-- l'appel une seule fois par requête au lieu d'une fois par ligne.

-- users
CREATE POLICY "Users are viewable by authenticated users" ON public.users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can be inserted by service role" ON public.users
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Users can update own profile excluding role" ON public.users
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK (
      (SELECT auth.uid()) = id
      AND role = (SELECT u.role FROM public.users u WHERE u.id = (SELECT auth.uid()))
    );

CREATE POLICY "Admins can update any user" ON public.users
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin((SELECT auth.uid()))))
    WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));

-- invitations
CREATE POLICY "Invitations are viewable by admins" ON public.invitations
    FOR SELECT TO authenticated USING ((SELECT public.is_admin((SELECT auth.uid()))));

CREATE POLICY "Invitations can be created by admins" ON public.invitations
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));

CREATE POLICY "Invitations can be updated by admins" ON public.invitations
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin((SELECT auth.uid()))))
    WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));

-- reservations
CREATE POLICY "Reservations visible for calendar owners and admins" ON public.reservations
    FOR SELECT TO authenticated
    USING (
      status = 'APPROVED'::public.reservation_status
      OR user_id = (SELECT auth.uid())
      OR (SELECT public.is_admin((SELECT auth.uid())))
    );

CREATE POLICY "Reservations can be created by authenticated users" ON public.reservations
    FOR INSERT TO authenticated
    WITH CHECK (
      ((SELECT auth.uid()) = user_id AND status = 'PENDING'::public.reservation_status)
      OR (SELECT public.is_admin((SELECT auth.uid())))
    );

CREATE POLICY "Reservations can be updated by owner or admins" ON public.reservations
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin((SELECT auth.uid()))))
    WITH CHECK (
      (SELECT public.is_admin((SELECT auth.uid())))
      OR (
        user_id = (SELECT auth.uid())
        AND status = ANY (ARRAY['PENDING'::public.reservation_status, 'CANCELLED'::public.reservation_status])
      )
    );

CREATE POLICY "Reservations can be deleted by owner or admins" ON public.reservations
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin((SELECT auth.uid()))));

-- property_info
CREATE POLICY "Property info is viewable by authenticated users" ON public.property_info
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Property info can be created by admins" ON public.property_info
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));

CREATE POLICY "Property info can be updated by admins" ON public.property_info
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin((SELECT auth.uid()))))
    WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));

-- failed_login_attempts
CREATE POLICY "Admins can view failed login attempts" ON public.failed_login_attempts
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'::public.user_role
    ));

CREATE POLICY "Service role can insert failed login attempts" ON public.failed_login_attempts
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can delete failed login attempts" ON public.failed_login_attempts
    FOR DELETE TO service_role USING (true);

-- guestbook_entries
CREATE POLICY "Guestbook entries are viewable by authenticated users" ON public.guestbook_entries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guestbook entries can be created by authenticated users" ON public.guestbook_entries
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Guestbook entries can be updated by owner" ON public.guestbook_entries
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Guestbook entries can be deleted by owner or admins" ON public.guestbook_entries
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR public.is_admin((SELECT auth.uid())));

-- guestbook_photos
CREATE POLICY "Guestbook photos are viewable by authenticated users" ON public.guestbook_photos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guestbook photos can be created by authenticated users" ON public.guestbook_photos
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.guestbook_entries
      WHERE guestbook_entries.id = guestbook_photos.entry_id
        AND guestbook_entries.user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Guestbook photos can be updated by owner" ON public.guestbook_photos
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.guestbook_entries
      WHERE guestbook_entries.id = guestbook_photos.entry_id
        AND guestbook_entries.user_id = (SELECT auth.uid())
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.guestbook_entries
      WHERE guestbook_entries.id = guestbook_photos.entry_id
        AND guestbook_entries.user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Guestbook photos can be deleted by owner or admins" ON public.guestbook_photos
    FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.guestbook_entries
      WHERE guestbook_entries.id = guestbook_photos.entry_id
        AND ((SELECT auth.uid()) = guestbook_entries.user_id
             OR public.is_admin((SELECT auth.uid())))
    ));

-- local_guide_entries
CREATE POLICY "Authenticated users can read local guide entries" ON public.local_guide_entries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert local guide entries" ON public.local_guide_entries
    FOR INSERT TO authenticated WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update local guide entries" ON public.local_guide_entries
    FOR UPDATE TO authenticated
    USING (public.is_admin((SELECT auth.uid())))
    WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete local guide entries" ON public.local_guide_entries
    FOR DELETE TO authenticated USING (public.is_admin((SELECT auth.uid())));


-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
-- RLS reste le garde-fou effectif : ces GRANT ouvrent seulement l'accès au niveau
-- SQL, chaque ligne restant filtrée par les politiques ci-dessus.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- GoTrue exécute les triggers de auth.users sous son propre rôle.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.sync_role_from_auth_metadata() TO supabase_auth_admin;

REVOKE ALL ON FUNCTION public.create_reservation(uuid, timestamptz, timestamptz, integer, text, public.reservation_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_reservation(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_reservation_dates(uuid, timestamptz, timestamptz, integer, text, public.reservation_status, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_create_first_admin(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, timestamptz, timestamptz, integer, text, public.reservation_status) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_reservation(uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_reservation_dates(uuid, timestamptz, timestamptz, integer, text, public.reservation_status, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.try_create_first_admin(uuid, text, text) TO anon, authenticated, service_role;

RESET ROLE;
