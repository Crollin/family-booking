import { describe, expect, it } from 'vitest'
import { parseAccessInfoRows } from '@/lib/access-info-format'

describe('parseAccessInfoRows', () => {
  it('extrait libellé + code depuis des puces', () => {
    const rows = parseAccessInfoRows(
      'Interphones Digicode ● Digicode : 7355 ● Parking sous-sol code 1234'
    )

    expect(rows.length).toBeGreaterThanOrEqual(2)
    const digicode = rows.find((row) => row.codes.includes('7355'))
    expect(digicode?.codes).toEqual(['7355'])
    expect(digicode?.label.toLowerCase()).toContain('digicode')
  })

  it('conserve les lignes sans code comme notes', () => {
    const rows = parseAccessInfoRows('Badges Vigik fournis à l’entrée')
    expect(rows).toHaveLength(1)
    expect(rows[0].codes).toEqual([])
    expect(rows[0].label).toMatch(/Vigik/i)
  })
})
