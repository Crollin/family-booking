import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  PUBLIC_CONFIG_ELEMENT_ID,
  getPublicConfig,
  parsePublicConfig,
  readPublicConfig,
  serializePublicConfig,
} from '../public-config'

const ORIGIN = 'https://chalet.example.com'

/** Simule un navigateur : une origine, et éventuellement la balise injectée. */
function givenBrowser(injectedConfig?: string) {
  vi.stubGlobal('window', { location: { origin: ORIGIN } })
  vi.stubGlobal('document', {
    getElementById: (id: string) =>
      id === PUBLIC_CONFIG_ELEMENT_ID && injectedConfig !== undefined
        ? { textContent: injectedConfig }
        : null,
  })
}

describe('public-config', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it('utilise l’identifiant DOM family-booking', () => {
    expect(PUBLIC_CONFIG_ELEMENT_ID).toBe('__family_booking_config__')
  })

  it('relit à l’identique une configuration sérialisée', () => {
    const config = {
      supabaseUrl: 'https://app.example.com',
      supabaseAnonKey: 'anon-key',
      turnstileSiteKey: null,
      siteName: 'Chalet Test',
      siteTagline: 'Tagline test',
    }
    givenBrowser(serializePublicConfig(config))

    expect(readPublicConfig()).toEqual(config)
  })

  it('échappe les chevrons pour ne pas refermer la balise script', () => {
    const serialized = serializePublicConfig({
      supabaseUrl: '</script><script>alert(1)</script>',
      supabaseAnonKey: 'anon-key',
      turnstileSiteKey: null,
      siteName: 'Family Lodge',
      siteTagline: 'Réservations familiales partagées',
    })

    expect(serialized).not.toContain('</script>')
    expect(JSON.parse(serialized).supabaseUrl).toBe('</script><script>alert(1)</script>')
  })

  it('retombe sur l’origine courante en l’absence de configuration injectée', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    givenBrowser()

    expect(readPublicConfig().supabaseUrl).toBe(ORIGIN)
    expect(readPublicConfig().siteName).toBe('Family Lodge')
  })

  it('ignore une configuration injectée illisible', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    givenBrowser('{ pas du JSON')

    expect(parsePublicConfig('{ pas du JSON')).toEqual({})
    expect(readPublicConfig().supabaseUrl).toBe(ORIGIN)
  })

  it('lit la configuration serveur depuis des noms sans préfixe NEXT_PUBLIC_', () => {
    // Next.js fige les `NEXT_PUBLIC_*` à la construction : s'en servir ici
    // renverrait la chaîne vide dans une image déjà bâtie.
    process.env.PUBLIC_URL = 'https://app.example.com'
    process.env.ANON_KEY = 'anon-key'
    delete process.env.TURNSTILE_SITE_KEY
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    expect(getPublicConfig()).toEqual({
      supabaseUrl: 'https://app.example.com',
      supabaseAnonKey: 'anon-key',
      turnstileSiteKey: null,
      siteName: 'Family Lodge',
      siteTagline: 'Réservations familiales partagées',
    })
  })

  it('inclut le branding depuis l’environnement serveur', () => {
    process.env.SITE_NAME = 'Chalet Test'
    process.env.SITE_TAGLINE = 'Tagline test'

    expect(getPublicConfig().siteName).toBe('Chalet Test')
    expect(getPublicConfig().siteTagline).toBe('Tagline test')
  })

  it('retire la barre oblique finale de PUBLIC_URL', () => {
    process.env.PUBLIC_URL = 'https://app.example.com/'
    process.env.ANON_KEY = 'anon-key'
    delete process.env.SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    expect(getPublicConfig().supabaseUrl).toBe('https://app.example.com')
  })

  it('utilise SUPABASE_URL quand elle diffère de PUBLIC_URL (mode app seule)', () => {
    process.env.PUBLIC_URL = 'https://reservations.example.com'
    process.env.SUPABASE_URL = 'https://abcdefgh.supabase.co'
    process.env.ANON_KEY = 'anon-key'
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    expect(getPublicConfig().supabaseUrl).toBe('https://abcdefgh.supabase.co')
  })
})
