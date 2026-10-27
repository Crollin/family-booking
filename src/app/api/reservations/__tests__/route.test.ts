import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createReservation: vi.fn(),
  listReservations: vi.fn(),
  mapReservationRpcError: vi.fn(),
  mapReservationRow: vi.fn(),
  sendReservationConfirmation: vi.fn(),
  sendNewReservationNotification: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getServerSession: mocks.getServerSession,
}))

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/db/reservations', () => ({
  createReservation: mocks.createReservation,
  listReservations: mocks.listReservations,
}))

vi.mock('@/db/errors', () => ({
  mapReservationRpcError: mocks.mapReservationRpcError,
}))

vi.mock('@/db/mappers', () => ({
  mapReservationRow: mocks.mapReservationRow,
}))

vi.mock('@/lib/email', () => ({
  sendReservationConfirmation: mocks.sendReservationConfirmation,
  sendNewReservationNotification: mocks.sendNewReservationNotification,
}))

import { POST } from '../route'

const START = '2030-01-10T12:00:00.000Z'
const END = '2030-01-12T12:00:00.000Z'

const futureStart = '2030-06-10T12:00:00.000Z'
const futureEnd = '2030-06-15T12:00:00.000Z'
const ADMIN_ID = '11111111-1111-1111-1111-111111111111'
const MEMBER_ID = '22222222-2222-2222-2222-222222222222'

const memberSession = {
  id: 'user-1',
  role: 'MEMBER',
  email: 'm@example.com',
  name: 'Marie',
}

const createdReservation = {
  id: 'res-1',
  userId: 'user-1',
  startDate: new Date(START),
  endDate: new Date(END),
  status: 'PENDING',
  guests: 2,
  comment: null,
  adminComment: null,
  createdAt: new Date('2030-01-01T00:00:00.000Z'),
  updatedAt: new Date('2030-01-01T00:00:00.000Z'),
}

function reservationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    user_id: 'user-1',
    start_date: START,
    end_date: END,
    status: 'PENDING',
    guests: 2,
    comment: null,
    admin_comment: null,
    created_at: '2030-01-01T00:00:00.000Z',
    updated_at: '2030-01-01T00:00:00.000Z',
    user: { id: 'user-1', name: 'Marie', email: 'm@example.com' },
    ...overrides,
  }
}

function mapRowFromDb(row: ReturnType<typeof reservationRow>) {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: new Date(row.start_date as string),
    endDate: new Date(row.end_date as string),
    status: row.status,
    guests: row.guests,
    comment: row.comment,
    adminComment: row.admin_comment,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    user: row.user,
  }
}

function setupEmailSupabase({
  targetUser = {
    id: 'user-1',
    email: 'm@example.com',
    name: 'Marie',
    auto_approve_own_reservations: false,
  },
  admins = [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }, { email: null }],
  reservation = reservationRow(),
}: {
  targetUser?: {
    id: string
    email: string
    name: string | null
    auto_approve_own_reservations?: boolean
  } | null
  admins?: Array<{ email: string | null }>
  reservation?: ReturnType<typeof reservationRow>
} = {}) {
  const from = vi.fn((table: string) => {
    if (table === 'users') {
      const single = vi.fn().mockResolvedValue({
        data: targetUser,
        error: targetUser ? null : { message: 'not found' },
      })
      const eq = vi.fn((column: string) => {
        if (column === 'id') {
          return { single }
        }
        return Promise.resolve({ data: admins, error: null })
      })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    }

    if (table === 'reservations') {
      const single = vi.fn().mockResolvedValue({ data: reservation, error: null })
      const eq = vi.fn().mockReturnValue({ single })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    }

    throw new Error(`unexpected table: ${table}`)
  })

  mocks.createServerSupabaseClient.mockResolvedValue({ from })
  mocks.mapReservationRow.mockReturnValue(mapRowFromDb(reservation))
  return { from }
}

function postEmailRequest() {
  return new Request('http://localhost/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: START,
      endDate: END,
      guests: 2,
    }),
  })
}

describe('POST /api/reservations emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getServerSession.mockResolvedValue(memberSession)
    mocks.createReservation.mockResolvedValue(createdReservation)
    mocks.sendReservationConfirmation.mockResolvedValue(undefined)
    mocks.sendNewReservationNotification.mockResolvedValue(undefined)
    setupEmailSupabase()
  })

  it('sends confirmation to member and notifies admins for PENDING', async () => {
    const response = await POST(postEmailRequest())

    expect(response.status).toBe(201)
    expect(mocks.sendReservationConfirmation).toHaveBeenCalledTimes(1)
    expect(mocks.sendReservationConfirmation).toHaveBeenCalledWith(
      'm@example.com',
      'Marie',
      new Date(START),
      new Date(END)
    )
    expect(mocks.sendNewReservationNotification).toHaveBeenCalledTimes(2)
    expect(mocks.sendNewReservationNotification).toHaveBeenCalledWith(
      'admin1@example.com',
      'Marie',
      new Date(START),
      new Date(END)
    )
    expect(mocks.sendNewReservationNotification).toHaveBeenCalledWith(
      'admin2@example.com',
      'Marie',
      new Date(START),
      new Date(END)
    )
  })

  it('still returns 201 if email sending throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendReservationConfirmation.mockRejectedValue(new Error('smtp down'))

    const response = await POST(postEmailRequest())

    expect(mocks.sendReservationConfirmation).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(201)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('sends confirmation but skips admin notifications for APPROVED', async () => {
    mocks.getServerSession.mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin1@example.com',
      name: 'Ada',
    })
    mocks.createReservation.mockResolvedValue({
      ...createdReservation,
      userId: 'admin-1',
      status: 'APPROVED',
    })
    const { from } = setupEmailSupabase({
      targetUser: {
        id: 'admin-1',
        email: 'admin1@example.com',
        name: 'Ada',
        auto_approve_own_reservations: true,
      },
      reservation: reservationRow({
        user_id: 'admin-1',
        status: 'APPROVED',
        user: { id: 'admin-1', name: 'Ada', email: 'admin1@example.com' },
      }),
    })

    const response = await POST(postEmailRequest())

    expect(response.status).toBe(201)
    expect(mocks.createReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'APPROVED' })
    )
    expect(mocks.sendReservationConfirmation).toHaveBeenCalledTimes(1)
    expect(mocks.sendReservationConfirmation).toHaveBeenCalledWith(
      'admin1@example.com',
      'Ada',
      new Date(START),
      new Date(END)
    )
    expect(mocks.sendNewReservationNotification).not.toHaveBeenCalled()
    const userSelects = from.mock.calls.filter(([table]) => table === 'users')
    expect(userSelects).toHaveLength(1)
  })
})

function setupPost({
  sessionId = ADMIN_ID,
  sessionRole = 'ADMIN',
  autoApprove = false,
  targetUserId,
}: {
  sessionId?: string
  sessionRole?: 'ADMIN' | 'MEMBER'
  autoApprove?: boolean
  targetUserId?: string
} = {}) {
  const resolvedTargetId = targetUserId || sessionId

  const reservation = {
    id: 'resa-1',
    user_id: resolvedTargetId,
    start_date: futureStart,
    end_date: futureEnd,
    status: 'PENDING',
    guests: 2,
    comment: null,
    admin_comment: null,
    created_at: futureStart,
    updated_at: futureStart,
    user: { id: resolvedTargetId, name: 'User', email: 'user@example.com' },
  }

  const reservationSingle = vi.fn().mockResolvedValue({
    data: reservation,
    error: null,
  })

  const userSingle = vi.fn().mockResolvedValue({
    data: {
      id: resolvedTargetId,
      email: 'user@example.com',
      name: 'User',
      auto_approve_own_reservations: autoApprove,
    },
    error: null,
  })

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      const eq = vi.fn((column: string) => {
        if (column === 'id') {
          return { single: userSingle }
        }
        // Admin fan-out for PENDING emails
        return Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null })
      })
      return { select: vi.fn().mockReturnValue({ eq }) }
    }

    if (table === 'reservations') {
      const eq = vi.fn().mockReturnValue({ single: reservationSingle })
      return { select: vi.fn().mockReturnValue({ eq }) }
    }

    throw new Error(`unexpected table: ${table}`)
  })

  mocks.getServerSession.mockResolvedValue({ id: sessionId, role: sessionRole })
  mocks.createServerSupabaseClient.mockResolvedValue({ from })
  mocks.createReservation.mockResolvedValue({ id: 'resa-1' })
  mocks.mapReservationRow.mockReturnValue({
    id: 'resa-1',
    userId: resolvedTargetId,
    startDate: new Date(futureStart),
    endDate: new Date(futureEnd),
    status: 'PENDING',
    guests: 2,
    comment: null,
    adminComment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: resolvedTargetId, name: 'User', email: 'user@example.com' },
  })
  mocks.sendReservationConfirmation.mockResolvedValue(undefined)
  mocks.sendNewReservationNotification.mockResolvedValue(undefined)

  return { from, createReservation: mocks.createReservation }
}

describe('POST /api/reservations status for admin own bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates PENDING for admin own booking when auto-approve is false', async () => {
    const { createReservation } = setupPost({ autoApprove: false })

    const response = await POST(
      new Request('http://localhost/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: futureStart,
          endDate: futureEnd,
          guests: 2,
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(createReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'PENDING' })
    )
  })

  it('creates APPROVED for admin own booking when auto-approve is true', async () => {
    const { createReservation } = setupPost({ autoApprove: true })

    const response = await POST(
      new Request('http://localhost/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: futureStart,
          endDate: futureEnd,
          guests: 2,
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(createReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'APPROVED' })
    )
  })

  it('creates APPROVED when admin books for a third party', async () => {
    const { createReservation } = setupPost({
      sessionId: ADMIN_ID,
      targetUserId: MEMBER_ID,
      autoApprove: false,
    })

    const response = await POST(
      new Request('http://localhost/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: futureStart,
          endDate: futureEnd,
          guests: 2,
          userId: MEMBER_ID,
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(createReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: MEMBER_ID,
        status: 'APPROVED',
      })
    )
  })

  it('creates PENDING for member bookings', async () => {
    const { createReservation } = setupPost({
      sessionId: MEMBER_ID,
      sessionRole: 'MEMBER',
      autoApprove: true,
    })

    const response = await POST(
      new Request('http://localhost/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: futureStart,
          endDate: futureEnd,
          guests: 2,
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(createReservation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'PENDING' })
    )
  })
})
