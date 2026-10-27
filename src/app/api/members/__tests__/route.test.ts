import { readFileSync } from 'fs'
import { join } from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireAdmin: vi.fn(),
  updateUserRole: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getServerSession: mocks.getServerSession,
  requireAdmin: mocks.requireAdmin,
  updateUserRole: mocks.updateUserRole,
}))

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { DELETE, PUT } from '../route'

const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')

function setupDelete({
  authError = null,
  profileError = null,
}: {
  authError?: { code?: string; message: string } | null
  profileError?: { message: string } | null
} = {}) {
  const deleteUser = vi.fn().mockResolvedValue({ error: authError })
  const deleteProfileById = vi.fn().mockResolvedValue({ error: profileError })
  const deleteProfile = vi.fn().mockReturnValue({ eq: deleteProfileById })
  const serviceRoleFrom = vi.fn().mockReturnValue({ delete: deleteProfile })
  const findUser = vi.fn().mockResolvedValue({
    data: { id: 'member-id' },
    error: null,
  })
  const filterUser = vi.fn().mockReturnValue({ single: findUser })
  const selectUser = vi.fn().mockReturnValue({ eq: filterUser })
  const serverFrom = vi.fn().mockReturnValue({ select: selectUser })

  mocks.getServerSession.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' })
  mocks.requireAdmin.mockResolvedValue(undefined)
  mocks.createServerSupabaseClient.mockResolvedValue({ from: serverFrom })
  mocks.createServiceRoleClient.mockReturnValue({
    auth: { admin: { deleteUser } },
    from: serviceRoleFrom,
  })

  return { deleteUser, deleteProfileById, serviceRoleFrom }
}

describe('members route auth.admin client usage', () => {
  it('does not call auth.admin on the anon SSR client', () => {
    expect(routeSource).not.toMatch(/\bsupabase\.auth\.admin\./)
  })

  it('uses service role client for createUser and deleteUser', () => {
    expect(routeSource).toMatch(
      /serviceRoleSupabase\.auth\.admin\.createUser/
    )
    expect(routeSource).toMatch(
      /serviceRoleSupabase\.auth\.admin\.deleteUser/
    )
  })

  it('keeps anon SSR client for RLS-protected DB reads', () => {
    expect(routeSource).toMatch(/\bsupabase\s*=\s*await createServerSupabaseClient/)
    expect(routeSource).toMatch(/\bsupabase\s*\n\s*\.from\('users'\)/)
  })
})

describe('POST /api/members invitation email failure', () => {
  it('does not put action_link into the JSON warning string', () => {
    expect(routeSource).not.toMatch(/warning:.*action_link/)
    expect(routeSource).toMatch(/mot de passe oublié/)
  })
})

describe('DELETE /api/members', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the public profile after deleting the auth user', async () => {
    const { deleteUser, deleteProfileById } = setupDelete()

    const response = await DELETE(
      new Request('http://localhost/api/members?userId=member-id')
    )

    expect(response.status).toBe(200)
    expect(deleteUser).toHaveBeenCalledWith('member-id')
    expect(deleteProfileById).toHaveBeenCalledWith('id', 'member-id')
    expect(deleteUser.mock.invocationCallOrder[0]).toBeLessThan(
      deleteProfileById.mock.invocationCallOrder[0]
    )
  })

  it('finishes deleting the profile when the auth user is already gone', async () => {
    const { deleteProfileById } = setupDelete({
      authError: { code: 'user_not_found', message: 'User not found' },
    })

    const response = await DELETE(
      new Request('http://localhost/api/members?userId=member-id')
    )

    expect(response.status).toBe(200)
    expect(deleteProfileById).toHaveBeenCalledWith('id', 'member-id')
  })

  it('keeps the public profile when auth deletion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { serviceRoleFrom } = setupDelete({
      authError: { code: 'unexpected_failure', message: 'Auth unavailable' },
    })

    const response = await DELETE(
      new Request('http://localhost/api/members?userId=member-id')
    )

    expect(response.status).toBe(500)
    expect(serviceRoleFrom).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('does not report success when public profile deletion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupDelete({ profileError: { message: 'Database unavailable' } })

    const response = await DELETE(
      new Request('http://localhost/api/members?userId=member-id')
    )

    expect(response.status).toBe(500)
    consoleError.mockRestore()
  })
})

function setupPut({
  targetRole = 'ADMIN',
  sessionId = 'admin-id',
}: {
  targetRole?: 'ADMIN' | 'MEMBER'
  sessionId?: string
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  const findTarget = vi.fn().mockResolvedValue({
    data: {
      id: 'target-id',
      email: 'target@example.com',
      name: 'Target',
      role: targetRole,
      auto_approve_own_reservations: false,
    },
    error: null,
  })
  const filterTarget = vi.fn().mockReturnValue({ single: findTarget })
  const selectTarget = vi.fn().mockReturnValue({ eq: filterTarget })
  const serverFrom = vi.fn().mockReturnValue({ select: selectTarget, update })

  const serviceUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const serviceUpdate = vi.fn().mockReturnValue({ eq: serviceUpdateEq })
  const serviceFrom = vi.fn().mockReturnValue({ update: serviceUpdate })

  mocks.getServerSession.mockResolvedValue({ id: sessionId, role: 'ADMIN' })
  mocks.requireAdmin.mockResolvedValue(undefined)
  mocks.updateUserRole.mockResolvedValue(undefined)
  mocks.createServerSupabaseClient.mockResolvedValue({ from: serverFrom })
  mocks.createServiceRoleClient.mockReturnValue({ from: serviceFrom })

  return {
    updateEq,
    update,
    serviceUpdate,
    serviceUpdateEq,
    serviceFrom,
    findTarget,
  }
}

describe('PUT /api/members auto-approve preference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows an admin to enable auto-approve on another admin', async () => {
    const { serviceUpdate, serviceUpdateEq } = setupPut({ targetRole: 'ADMIN' })

    const response = await PUT(
      new Request('http://localhost/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-id',
          autoApproveOwnReservations: true,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(serviceUpdate).toHaveBeenCalledWith({
      auto_approve_own_reservations: true,
    })
    expect(serviceUpdateEq).toHaveBeenCalledWith('id', 'target-id')
    const body = await response.json()
    expect(body.autoApproveOwnReservations).toBe(true)
  })

  it('rejects auto-approve updates on members', async () => {
    setupPut({ targetRole: 'MEMBER' })

    const response = await PUT(
      new Request('http://localhost/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-id',
          autoApproveOwnReservations: true,
        }),
      })
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/administrateurs/i)
  })

  it('returns 403 when the caller is not an admin', async () => {
    setupPut()
    mocks.requireAdmin.mockRejectedValue(new Error('Forbidden: Admin access required'))

    const response = await PUT(
      new Request('http://localhost/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-id',
          autoApproveOwnReservations: true,
        }),
      })
    )

    expect(response.status).toBe(403)
  })

  it('allows an admin to update their own auto-approve preference', async () => {
    const { serviceUpdateEq } = setupPut({
      targetRole: 'ADMIN',
      sessionId: 'target-id',
    })

    const response = await PUT(
      new Request('http://localhost/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-id',
          autoApproveOwnReservations: false,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(serviceUpdateEq).toHaveBeenCalledWith('id', 'target-id')
  })

  it('resets auto-approve when demoting an admin to member', async () => {
    const { serviceUpdate } = setupPut({ targetRole: 'ADMIN' })

    const response = await PUT(
      new Request('http://localhost/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-id',
          role: 'MEMBER',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.updateUserRole).toHaveBeenCalledWith('target-id', 'MEMBER')
    expect(serviceUpdate).toHaveBeenCalledWith({
      auto_approve_own_reservations: false,
    })
  })
})
