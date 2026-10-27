import { describe, expect, it, vi } from 'vitest'
import { createReservation } from '@/db/reservations'

describe('createReservation', () => {
  it('calls create_reservation rpc with ISO dates', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: 'r1',
        user_id: 'u1',
        start_date: '2026-08-10T00:00:00.000Z',
        end_date: '2026-08-12T00:00:00.000Z',
        status: 'PENDING',
        guests: 2,
        comment: null,
        admin_comment: null,
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
      },
      error: null,
    })
    const client = { rpc } as any

    const row = await createReservation(client, {
      userId: 'u1',
      start: new Date('2026-08-10T00:00:00.000Z'),
      end: new Date('2026-08-12T00:00:00.000Z'),
      guests: 2,
      comment: null,
      status: 'PENDING',
    })

    expect(rpc).toHaveBeenCalledWith('create_reservation', {
      p_user_id: 'u1',
      p_start: '2026-08-10T00:00:00.000Z',
      p_end: '2026-08-12T00:00:00.000Z',
      p_guests: 2,
      p_comment: null,
      p_status: 'PENDING',
    })
    expect(row.id).toBe('r1')
  })
})
