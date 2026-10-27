import { afterEach, describe, expect, it } from 'vitest'
import { getPropertyCoords, getSiteName, getSiteTagline } from '../site-branding'

const keys = ['SITE_NAME', 'SITE_TAGLINE', 'PROPERTY_LAT', 'PROPERTY_LNG'] as const

afterEach(() => {
  for (const k of keys) delete process.env[k]
})

describe('site-branding', () => {
  it('utilise les défauts Family Lodge', () => {
    expect(getSiteName()).toBe('Family Lodge')
    expect(getSiteTagline()).toMatch(/familiales/i)
    expect(getPropertyCoords()).toEqual({ lat: 45, lng: 6 })
  })

  it('lit les variables d’environnement', () => {
    process.env.SITE_NAME = 'Chalet Test'
    process.env.SITE_TAGLINE = 'Tagline test'
    process.env.PROPERTY_LAT = '46.5'
    process.env.PROPERTY_LNG = '7.1'
    expect(getSiteName()).toBe('Chalet Test')
    expect(getSiteTagline()).toBe('Tagline test')
    expect(getPropertyCoords()).toEqual({ lat: 46.5, lng: 7.1 })
  })
})
