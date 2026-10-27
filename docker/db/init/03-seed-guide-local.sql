-- =============================================================================
-- family-booking — données d'exemple du guide local (fictives)
-- =============================================================================
-- Fiches de démonstration : remplacez-les par vos adresses et contacts réels.
-- Rejouable : chaque entrée est ignorée si le couple (category, name) existe déjà.

SET ROLE postgres;

INSERT INTO public.local_guide_entries (
  category, name, description, phone, email, address, website,
  access_instructions, tags, seasons
)
SELECT
  v.category::local_guide_category,
  v.name,
  v.description,
  v.phone,
  v.email,
  v.address,
  v.website,
  v.access_instructions,
  v.tags,
  v.seasons
FROM (
  VALUES
    (
      'restaurant'::text,
      'Exemple — Restaurant de la vallée',
      $d$Fiche d'exemple. Remplacez-la par vos adresses locales.$d$,
      NULL::text,
      'contact@exemple.local'::text,
      '1 place Exemple, 00000 Exemple'::text,
      'https://example.com'::text,
      $a$Accès : depuis le logement, suivre la route principale (exemple).$a$,
      ARRAY['exemple', 'restaurant']::text[],
      ARRAY['ete', 'hiver']::local_guide_season[]
    ),
    (
      'activite'::text,
      'Exemple — Sentier famille du lac',
      $d$Balade d'exemple pour illustrer une fiche activité. Durée et niveau à adapter à votre secteur.$d$,
      NULL::text,
      'info@exemple.local'::text,
      'Départ parking Exemple, 00000 Exemple'::text,
      'https://example.com/activite'::text,
      $a$Départ : parking signalé « Exemple ». Prévoir eau et chaussures adaptées.$a$,
      ARRAY['exemple', 'randonnee', 'famille', 'ete']::text[],
      ARRAY['ete']::local_guide_season[]
    ),
    (
      'commerce'::text,
      'Exemple — Épicerie du village',
      $d$Commerce d'exemple (courses, pain, produits locaux). Horaires et coordonnées à personnaliser.$d$,
      '+33 0 00 00 00 00'::text,
      'boutique@exemple.local'::text,
      '12 rue Exemple, 00000 Exemple'::text,
      'https://example.com/epicerie'::text,
      $a$En voiture : 5 min depuis le logement. Navette locale possible en saison (exemple).$a$,
      ARRAY['exemple', 'courses', 'alimentation']::text[],
      ARRAY['ete', 'hiver']::local_guide_season[]
    )
) AS v(
  category, name, description, phone, email, address, website,
  access_instructions, tags, seasons
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.local_guide_entries e
  WHERE e.category = v.category::local_guide_category
    AND e.name = v.name
);

-- Activities seeded earlier via REST (before seasons column) get the été season.
UPDATE public.local_guide_entries
SET seasons = ARRAY['ete']::local_guide_season[],
    updated_at = NOW()
WHERE category = 'activite'
  AND 'ete' = ANY (tags)
  AND (seasons = '{}' OR seasons IS NULL);

RESET ROLE;
