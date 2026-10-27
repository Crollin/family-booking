-- Aligne les mots de passe des rôles internes Supabase sur POSTGRES_PASSWORD et
-- prépare le schéma utilisé par le service Realtime.
--
-- Exécuté une seule fois, en superutilisateur, à la création du volume Postgres
-- (monté dans /docker-entrypoint-initdb.d/init-scripts/). Ces rôles sont réservés :
-- ils ne peuvent pas être modifiés après coup depuis le rôle « postgres ».

\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_admin WITH PASSWORD :'pgpass';

CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
