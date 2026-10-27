/**
 * Configuration publique transmise du serveur au navigateur.
 *
 * Next.js remplace les `process.env.NEXT_PUBLIC_*` par leur valeur au moment du
 * build : une image Docker construite une fois serait donc figée sur l'URL et la
 * clé fournies ce jour-là. On sérialise plutôt ces valeurs dans le HTML rendu à
 * chaque requête, ce qui permet de déployer la même image sur n'importe quel
 * domaine en ne changeant que le fichier .env.
 */

import { getAnonKey, getSupabasePublicUrl, getTurnstileSiteKey } from './runtime-env'
import { getSiteName, getSiteTagline } from './site-branding'

export const PUBLIC_CONFIG_ELEMENT_ID = '__family_booking_config__'

export type PublicConfig = {
  supabaseUrl: string
  supabaseAnonKey: string
  turnstileSiteKey: string | null
  siteName: string
  siteTagline: string
}

/** Lit la configuration depuis l'environnement du processus serveur. */
export function getPublicConfig(): PublicConfig {
  return {
    supabaseUrl: getSupabasePublicUrl(),
    supabaseAnonKey: getAnonKey(),
    turnstileSiteKey: getTurnstileSiteKey(),
    siteName: getSiteName(),
    siteTagline: getSiteTagline(),
  }
}

/**
 * `</script>` dans une chaîne JSON refermerait la balise qui la contient : on
 * neutralise `<` avant injection.
 */
export function serializePublicConfig(config: PublicConfig): string {
  return JSON.stringify(config).replace(/</g, '\\u003c')
}

export function parsePublicConfig(raw: string | null | undefined): Partial<PublicConfig> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Configuration vue par le navigateur. Les valeurs injectées par le serveur
 * priment ; à défaut on retombe sur les variables figées au build, puis sur
 * l'origine courante — l'application et Supabase partageant la même origine.
 */
export function readPublicConfig(): PublicConfig {
  const injected =
    typeof document !== 'undefined'
      ? parsePublicConfig(document.getElementById(PUBLIC_CONFIG_ELEMENT_ID)?.textContent)
      : {}

  const supabaseUrl =
    injected.supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  return {
    supabaseUrl,
    supabaseAnonKey: injected.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    turnstileSiteKey:
      injected.turnstileSiteKey ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
    siteName: injected.siteName || 'Family Lodge',
    siteTagline: injected.siteTagline || 'Réservations familiales partagées',
  }
}
