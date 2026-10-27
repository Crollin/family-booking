/**
 * Lecture de la configuration publique côté serveur, à l'exécution.
 *
 * Next.js remplace toute occurrence de `process.env.NEXT_PUBLIC_*` par sa valeur
 * au moment du build, y compris dans le code serveur. Ces variables ne peuvent
 * donc pas servir à configurer une image déjà construite : elles vaudraient la
 * chaîne vide. On lit à la place des noms sans préfixe, que Next.js laisse
 * intacts et qui sont donc résolus à chaque démarrage du conteneur.
 *
 * Les variantes `NEXT_PUBLIC_*` restent acceptées en repli, pour un déploiement
 * qui les fournirait au build (Vercel, `next start` local).
 */

const trimmed = (value: string | undefined) => value?.trim() || ''

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

/**
 * Adresse publique de l'application (liens e-mails, cookies, Site URL Auth).
 * En pile complète, elle coïncide avec l'origine Supabase (proxy unique).
 * En mode app seule, elle pointe vers Next ; Supabase a alors sa propre URL.
 */
export function getPublicUrl(): string {
  return stripTrailingSlash(
    trimmed(process.env.PUBLIC_URL) ||
      trimmed(process.env.NEXT_PUBLIC_SITE_URL) ||
      trimmed(process.env.NEXT_PUBLIC_SUPABASE_URL)
  )
}

/**
 * URL publique de l'API Supabase (Auth, REST, Realtime, Storage) pour le
 * navigateur. Défaut : même origine que `PUBLIC_URL` (pile Docker complète).
 * Avec un projet Supabase déjà existant : renseigner `SUPABASE_URL`.
 */
export function getSupabasePublicUrl(): string {
  return stripTrailingSlash(
    trimmed(process.env.SUPABASE_URL) ||
      trimmed(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
      getPublicUrl()
  )
}

/** Jeton du rôle public, transmis au navigateur. */
export function getAnonKey(): string {
  return trimmed(process.env.ANON_KEY) || trimmed(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/** Jeton du rôle privilégié, qui contourne le Row Level Security. */
export function getServiceRoleKey(): string {
  return trimmed(process.env.SERVICE_ROLE_KEY) || trimmed(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/** Clé publique Turnstile, `null` quand le CAPTCHA est désactivé. */
export function getTurnstileSiteKey(): string | null {
  return (
    trimmed(process.env.TURNSTILE_SITE_KEY) ||
    trimmed(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ||
    null
  )
}

/**
 * Adresse par laquelle le serveur joint Supabase. Priorité à
 * `SUPABASE_INTERNAL_URL` (réseau Docker / VPC), sinon l'URL publique Supabase.
 */
export function getSupabaseServerUrl(): string {
  return (
    stripTrailingSlash(trimmed(process.env.SUPABASE_INTERNAL_URL)) || getSupabasePublicUrl()
  )
}
