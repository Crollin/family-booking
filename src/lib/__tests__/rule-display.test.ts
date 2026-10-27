import { describe, expect, it } from 'vitest'
import { formatRuleForDisplay } from '@/lib/rule-display'

describe('formatRuleForDisplay', () => {
  it('remet en casse phrase un bloc tout en majuscules', () => {
    const formatted = formatRuleForDisplay(
      'REMETTRE LES CLEFS DANS LA BOITE A CLEFS A LA FIN DU SEJOUR.'
    )
    expect(formatted.body).toMatch(/^Remettre/)
    expect(formatted.body).not.toMatch(/REMETTRE/)
  })

  it('extrait un titre si la règle est longue', () => {
    const formatted = formatRuleForDisplay(
      'Pas de chaussures à l’intérieur. Merci de les laisser dans l’entrée pour préserver les sols et éviter les taches.'
    )
    expect(formatted.headline).toMatch(/chaussures/i)
    expect(formatted.body.length).toBeGreaterThan(10)
  })
})
