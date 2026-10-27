import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_COOKIE_NAME } from '../auth-cookie'

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({})),
  createServerClient: vi.fn(() => ({})),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mocks.createBrowserClient,
  createServerClient: mocks.createServerClient,
}))

const cookieStore = { getAll: () => [], set: () => {} }

vi.mock('next/headers', () => ({
  cookies: () => cookieStore,
  headers: () => new Headers(),
}))

describe('nom du cookie de session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.PUBLIC_URL = 'https://reservations.example.com'
    process.env.ANON_KEY = 'anon-key'
    process.env.SUPABASE_INTERNAL_URL = 'http://proxy'
  })

  /**
   * Sans nom explicite, supabase-js dérive le cookie de l'hôte : le navigateur
   * et le serveur, qui n'empruntent pas la même URL, en chercheraient deux
   * différents et la session ne serait jamais reconnue côté serveur.
   */
  it('est identique pour le client navigateur et le client serveur', async () => {
    const { createClientSupabaseClient } = await import('../supabase-client')
    const { createServerSupabaseClient } = await import('../supabase')

    // Le navigateur lit la configuration injectée dans le HTML par le serveur.
    vi.stubGlobal('document', {
      getElementById: () => ({
        textContent: JSON.stringify({
          supabaseUrl: 'https://reservations.example.com',
          supabaseAnonKey: 'anon-key',
          turnstileSiteKey: null,
        }),
      }),
    })
    vi.stubGlobal('window', { location: { origin: 'https://reservations.example.com' } })

    createClientSupabaseClient()
    await createServerSupabaseClient()

    vi.unstubAllGlobals()

    const browserOptions = mocks.createBrowserClient.mock.calls.at(-1)?.[2] as any
    const serverOptions = mocks.createServerClient.mock.calls.at(-1)?.[2] as any

    expect(browserOptions?.cookieOptions?.name).toBe(AUTH_COOKIE_NAME)
    expect(serverOptions?.cookieOptions?.name).toBe(AUTH_COOKIE_NAME)
  })

  it('ne dépend pas de l\'URL publique', () => {
    // Un changement de domaine ne doit pas invalider les sessions en cours.
    expect(AUTH_COOKIE_NAME).not.toMatch(/reservations|localhost|proxy/)
  })
})
