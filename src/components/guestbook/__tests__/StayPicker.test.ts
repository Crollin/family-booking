import { describe, expect, it } from 'vitest'
import { differenceInCalendarDays } from 'date-fns'
import { getDateRangeLabel, getStayTiming, getStayTitle, getTimingLabel } from '../StayPicker'

describe('StayPicker helpers', () => {
  it('détecte un séjour passé, en cours et à venir', () => {
    const now = new Date('2026-06-15T12:00:00')
    expect(
      getStayTiming(new Date('2026-01-05'), new Date('2026-01-30'), now)
    ).toBe('past')
    expect(
      getStayTiming(new Date('2026-06-10'), new Date('2026-06-20'), now)
    ).toBe('current')
    expect(
      getStayTiming(new Date('2026-08-01'), new Date('2026-08-10'), now)
    ).toBe('upcoming')
  })

  it('formate le titre et la plage de dates', () => {
    expect(getStayTitle(new Date('2026-01-05'), new Date('2026-01-30'))).toBe('janvier 2026')
    expect(getDateRangeLabel(new Date('2026-01-05'), new Date('2026-01-30'))).toBe(
      '5 janv. au 30 janv. 2026'
    )
  })

  it('affiche un libellé relatif lisible', () => {
    const now = new Date('2026-06-15T12:00:00')
    expect(
      getTimingLabel('past', new Date('2026-01-05'), new Date('2026-01-30'), now)
    ).toMatch(/Il y a/)
    expect(
      getTimingLabel('current', new Date('2026-06-10'), new Date('2026-06-20'), now)
    ).toBe('En cours')
  })

  it('calcule le nombre de nuits', () => {
    expect(
      Math.max(
        1,
        differenceInCalendarDays(new Date('2026-01-30'), new Date('2026-01-05'))
      )
    ).toBe(25)
  })
})
