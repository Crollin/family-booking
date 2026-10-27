#!/usr/bin/env bash
# =============================================================================
# Génère des secrets propres à votre installation et les écrit dans .env
# =============================================================================
#
#   ./scripts/generate-secrets.sh
#
# Remplace dans .env : POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY,
# SECRET_KEY_BASE, CRON_SECRET. Les autres lignes ne sont pas touchées.
#
# ANON_KEY et SERVICE_ROLE_KEY sont des jetons JWT signés avec JWT_SECRET : ils
# doivent donc être régénérés ensemble. Changer ces valeurs sur une installation
# déjà en service déconnecte tous les utilisateurs (leurs sessions ne sont plus
# vérifiables) mais ne touche pas aux données.
#
# Seul `openssl` est requis.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

command -v openssl >/dev/null 2>&1 || {
  echo "Erreur : openssl est requis." >&2
  exit 1
}

if [ ! -f .env ]; then
  echo "Erreur : .env introuvable. Lancez d'abord : cp .env.example .env" >&2
  exit 1
fi

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# Un JWT HS256 dont la charge utile ne contient que le rôle Postgres endossé.
jwt() {
  local role="$1" secret="$2" iat exp header payload signature
  iat=$(date +%s)
  exp=$((iat + 10 * 365 * 24 * 3600))
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$iat" "$exp" | b64url)
  signature=$(printf '%s.%s' "$header" "$payload" \
    | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$signature"
}

# `set_env` remplace la ligne si la clé existe, l'ajoute sinon. Les valeurs
# générées ici sont en base64url ou en hexadécimal, donc sans caractère à
# échapper pour sed.
set_env() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed "s|^${key}=.*|${key}=${value}|" .env > .env.tmp && mv .env.tmp .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
SECRET_KEY_BASE=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)

set_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_env JWT_SECRET "$JWT_SECRET"
set_env ANON_KEY "$(jwt anon "$JWT_SECRET")"
set_env SERVICE_ROLE_KEY "$(jwt service_role "$JWT_SECRET")"
set_env SECRET_KEY_BASE "$SECRET_KEY_BASE"
set_env CRON_SECRET "$CRON_SECRET"

cat <<'EOF'
Secrets générés dans .env.

Si la pile tournait déjà avec l'ancien mot de passe Postgres, le volume de
données conserve l'ancien : repartez d'une base vierge avec

    docker compose down -v && docker compose up -d
EOF
