import { describe, expect, it } from 'vitest'
import { mapReservationRow } from '@/db/mappers'
import { ReservationStatus } from '@/types'

describe('mapReservationRow', () => {
  it('maps snake_case row to domain reservation', () => {
    const result = mapReservationRow({
      id: 'r1',
      user_id: 'u1',
      start_date: '2026-08-01T00:00:00.000Z',
      end_date: '2026-08-05T00:00:00.000Z',
      status: 'APPROVED',
      guests: 4,
      comment: null,
      admin_comment: null,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
    }, { includeEmail: false })

    expect(result).toMatchObject({
      id: 'r1',
      userId: 'u1',
      status: ReservationStatus.APPROVED,
      guests: 4,
    })
    expect(result.startDate).toBeInstanceOf(Date)
    expect(result.user?.email).toBeUndefined()
  })
})
