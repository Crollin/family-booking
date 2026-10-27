import { describe, expect, it } from 'vitest'
import { assertNoError, mapReservationRpcError } from '@/db/errors'

describe('assertNoError', () => {
  it('throws when error is present', () => {
    expect(() => assertNoError({ message: 'boom', code: '42501' } as any)).toThrow('boom')
  })

  it('no-ops when null', () => {
    expect(() => assertNoError(null)).not.toThrow()
  })
})

describe('mapReservationRpcError', () => {
  it('maps OVERLAP to 400 french message', () => {
    expect(mapReservationRpcError({ message: 'OVERLAP' })).toEqual({
      status: 400,
      message: 'Ces dates chevauchent avec une réservation déjà confirmée',
    })
  })

  it('maps exclusion_violation to overlap message', () => {
    expect(mapReservationRpcError({ code: '23P01', message: 'conflict' })).toEqual({
      status: 400,
      message: 'Ces dates chevauchent avec une réservation déjà confirmée',
    })
  })

  it('maps FORBIDDEN to 403', () => {
    expect(mapReservationRpcError({ message: 'FORBIDDEN' }).status).toBe(403)
  })

  it('maps NOT_FOUND to 404', () => {
    expect(mapReservationRpcError({ message: 'NOT_FOUND' }).status).toBe(404)
  })
})
