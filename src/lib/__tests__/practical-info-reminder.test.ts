import { describe, expect, it } from 'vitest'
import {
  getPracticalReminderFields,
  HARDCODED_APARTMENT_NUMBER,
} from '@/lib/practical-info-reminder'

describe('getPracticalReminderFields', () => {
  it('extrait adresse, accès extérieurs/intérieurs et fixe Appartement 402', () => {
    const raw = [
      'Résidence Exemple',
      '100 impasse des Darbollées',
      '73550 Les Allues',
      'Accès extérieurs',
      'Digicode entrée : 7355',
      'Accès intérieurs',
      'Ski room : 2026A',
    ].join('\n')

    const fields = getPracticalReminderFields(raw)

    expect(fields.addressLines).toEqual([
      'Résidence Exemple',
      '100 impasse des Darbollées',
      '73550 Les Allues',
    ])
    expect(fields.exteriorAccess).toContain('7355')
    expect(fields.interiorAccess).toContain('2026A')
    expect(fields.apartmentNumber).toBe('Appartement 402')
    expect(fields.apartmentNumber).toBe(HARDCODED_APARTMENT_NUMBER)
  })

  it('retourne null pour les accès absents et adresse vide si null', () => {
    const fields = getPracticalReminderFields(null)
    expect(fields.addressLines).toEqual([])
    expect(fields.exteriorAccess).toBeNull()
    expect(fields.interiorAccess).toBeNull()
    expect(fields.apartmentNumber).toBe('Appartement 402')
  })

  it('match les titres Accès extérieur / Accès intérieur (singulier)', () => {
    const raw = [
      'Adresse',
      'Accès extérieur',
      'Code 1111',
      'Accès intérieur',
      'Code 2222',
    ].join('\n')

    const fields = getPracticalReminderFields(raw)
    expect(fields.exteriorAccess).toContain('1111')
    expect(fields.interiorAccess).toContain('2222')
  })
})
