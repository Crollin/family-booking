import { describe, expect, it } from 'vitest'
import { parsePracticalAddress } from '@/lib/practical-info-format'

describe('parsePracticalAddress', () => {
  it('sépare adresse et sections Accès', () => {
    const raw = [
      'Résidence Exemple',
      'Appartement 402',
      '100 impasse des Darbollées',
      'Ville',
      '73550 Les Allues',
      'Accès extérieurs',
      'Le digicode 7355 concerne Montée A',
      'Accès intérieurs',
      'Code 2026A pour Ski room',
    ].join('\n')

    const parsed = parsePracticalAddress(raw)

    expect(parsed.addressLines).toEqual([
      'Résidence Exemple',
      'Appartement 402',
      '100 impasse des Darbollées',
      'Ville',
      '73550 Les Allues',
    ])
    expect(parsed.sections).toHaveLength(2)
    expect(parsed.sections[0].title).toBe('Accès extérieurs')
    expect(parsed.sections[0].content).toContain('7355')
    expect(parsed.sections[1].title).toBe('Accès intérieurs')
    expect(parsed.sections[1].content).toContain('2026A')
  })

  it('découpe une adresse en virgules avant Accès', () => {
    const parsed = parsePracticalAddress(
      'Résidence A, Appartement 1, 73550 Les Allues; Accès extérieurs Code 1234'
    )

    expect(parsed.addressLines[0]).toContain('Résidence A')
    expect(parsed.sections[0]?.title).toMatch(/Accès extérieurs/i)
  })
})
