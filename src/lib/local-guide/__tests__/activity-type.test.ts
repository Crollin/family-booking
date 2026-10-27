import { describe, expect, it } from 'vitest'
import {
  entryMatchesActivityType,
  ACTIVITY_TYPE_OPTIONS,
} from '@/lib/local-guide/constants'

describe('entryMatchesActivityType', () => {
  it('accepte tout si le filtre est all', () => {
    expect(entryMatchesActivityType(['randonnee'], 'all')).toBe(true)
    expect(entryMatchesActivityType([], 'all')).toBe(true)
  })

  it('matche les randonnées via le tag randonnee', () => {
    expect(entryMatchesActivityType(['randonnee', 'facile', 'ete'], 'randonnee')).toBe(
      true
    )
    expect(entryMatchesActivityType(['velo', 'vtt'], 'randonnee')).toBe(false)
  })

  it('matche le vélo via plusieurs tags', () => {
    expect(entryMatchesActivityType(['bike-park'], 'velo')).toBe(true)
    expect(entryMatchesActivityType(['VAE'], 'velo')).toBe(true)
    expect(entryMatchesActivityType(['enfants'], 'velo')).toBe(false)
  })

  it('expose une option pour chaque type utile', () => {
    const values = ACTIVITY_TYPE_OPTIONS.map((o) => o.value)
    expect(values).toEqual([
      'randonnee',
      'velo',
      'enfants',
      'piscine',
      'aventure',
    ])
  })
})
