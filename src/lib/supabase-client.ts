import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { readPublicConfig } from './public-config'
import { AUTH_COOKIE_NAME } from './auth-cookie'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Au prérendu, les composants clients sont rendus une fois côté serveur sans
// aucune configuration disponible. Le client construit alors n'émet aucune
// requête : ces valeurs ne servent qu'à satisfaire le constructeur.
const PRERENDER_URL = 'http://prerender.invalid'
const PRERENDER_KEY = 'prerender'

/**
 * Singleton — éviter plusieurs GoTrueClient (locks / boucles TOKEN_REFRESHED
 * qui figent Firefox après déploiement).
 */
export function createClientSupabaseClient() {
  if (browserClient) return browserClient

  const { supabaseUrl, supabaseAnonKey } = readPublicConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Volontairement non mémorisé : un serveur en fonctionnement doit
      // reconstruire le client dès que la configuration est présente.
      return createBrowserClient<Database>(PRERENDER_URL, PRERENDER_KEY)
    }
    throw new Error('Configuration Supabase absente : vérifiez PUBLIC_URL et ANON_KEY dans .env')
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
  })
  return browserClient
}
