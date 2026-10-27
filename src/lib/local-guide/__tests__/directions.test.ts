import { describe, expect, it } from 'vitest'
import { getPropertyCoords } from '@/lib/site-branding'
import {
  getDirectionsFromProperty,
  getMapsUrl,
} from '@/lib/local-guide/constants'

describe('getPropertyCoords (défaut)', () => {
  it('retourne 45 / 6 sans variables d’environnement', () => {
    const { lat, lng } = getPropertyCoords()
    expect(lat).toBe(45)
    expect(lng).toBe(6)
  })
})

describe('getDirectionsFromProperty', () => {
  it('ouvre Google Maps Directions depuis le logement', () => {
    const url = getDirectionsFromProperty('Parking du col, Village')
    const parsed = new URL(url)

    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/maps/dir/')
    expect(parsed.searchParams.get('api')).toBe('1')
    expect(parsed.searchParams.get('origin')).toBe(
      `${getPropertyCoords().lat},${getPropertyCoords().lng}`
    )
    expect(parsed.searchParams.get('destination')).toBe(
      'Parking du col, Village'
    )
    expect(parsed.searchParams.get('travelmode')).toBe('driving')
  })

  it('encode correctement la destination', () => {
    const url = getDirectionsFromProperty('Lac du Praz, Le Praz Village')
    expect(url).toContain(encodeURIComponent('Lac du Praz, Le Praz Village'))
  })
})

describe('getMapsUrl', () => {
  it('reste une recherche Maps (sans origin logement)', () => {
    const url = getMapsUrl('Village')
    expect(url).toContain('/maps/search/')
    expect(url).not.toContain('origin=')
  })
})
