import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  healthCheck: vi.fn(),
  retryWithBackoff: vi.fn(),
  validateSupabaseEnv: vi.fn(),
  verifyTurnstileToken: vi.fn(),
  rateLimitByIP: vi.fn(),
  rateLimitByEmail: vi.fn(),
  getClientIP: vi.fn(),
  createRateLimitResponse: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
  healthCheck: mocks.healthCheck,
  retryWithBackoff: mocks.retryWithBackoff,
  validateSupabaseEnv: mocks.validateSupabaseEnv,
}))

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByIP: mocks.rateLimitByIP,
  rateLimitByEmail: mocks.rateLimitByEmail,
  getClientIP: mocks.getClientIP,
  createRateLimitResponse: mocks.createRateLimitResponse,
}))

vi.mock('@/lib/supabase-diagnostics', () => ({
  getFriendlyErrorMessage: (error: { message?: string } | null) =>
    error?.message || 'unknown',
}))

import { POST } from '../route'

const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')
const schemaSql = readFileSync(join(process.cwd(), 'docker/db/init/02-schema.sql'), 'utf8')

function setupPostClient({
  rpcError = null as { message: string } | null,
  adminRow = {
    id: 'auth-user-id',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN',
  } as Record<string, unknown> | null,
  profileDeleteError = null as { message: string } | null,
  deleteUserError = null as { message: string } | null,
} = {}) {
  const deleteUser = vi.fn().mockResolvedValue({ error: deleteUserError })
  const profileEq = vi.fn().mockResolvedValue({ error: profileDeleteError })
  const profileDelete = vi.fn().mockReturnValue({ eq: profileEq })
  const rpc = vi.fn().mockResolvedValue({ data: adminRow, error: rpcError })
  const createUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'auth-user-id', email: 'admin@example.com' } },
    error: null,
  })

  mocks.createServiceRoleClient.mockReturnValue({
    auth: { admin: { createUser, deleteUser } },
    from: vi.fn().mockReturnValue({ delete: profileDelete }),
    rpc,
  })

  mocks.retryWithBackoff.mockImplementation(async (fn: () => Promise<unknown>) => fn())

  return { createUser, deleteUser, profileEq, profileDelete, rpc }
}

describe('first-user bootstrap hardening (source contracts)', () => {
  it('does not pre-delete public.users before the RPC', () => {
    expect(routeSource).not.toMatch(/clearTriggerRow|nettoyage du profil déclenché/)
    expect(routeSource).toMatch(/compensateBootstrapAuthUser/)
    expect(routeSource).toMatch(/try_create_first_admin/)
  })

  it('omits ADMIN from createUser user_metadata', () => {
    expect(routeSource).not.toMatch(/role:\s*adminRole/)
    expect(routeSource).not.toMatch(/role:\s*UserRole\.ADMIN/)
    expect(routeSource).toMatch(/user_metadata:\s*\{\s*name,?/)
  })

  it('RPC deletes p_id under the advisory lock before counting', () => {
    expect(schemaSql).toMatch(/pg_advisory_xact_lock\(42\)/)
    expect(schemaSql).toMatch(/DELETE FROM public\.users WHERE id = p_id/)
    const deleteIdx = schemaSql.indexOf('DELETE FROM public.users WHERE id = p_id')
    const countIdx = schemaSql.indexOf('SELECT count(*) INTO existing_count')
    expect(deleteIdx).toBeGreaterThan(-1)
    expect(countIdx).toBeGreaterThan(deleteIdx)
  })
})

describe('POST /api/auth/first-user compensation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.validateSupabaseEnv.mockImplementation(() => {})
    mocks.healthCheck.mockResolvedValue({ healthy: true })
    mocks.getClientIP.mockReturnValue('127.0.0.1')
    mocks.rateLimitByIP.mockReturnValue({ allowed: true })
    mocks.rateLimitByEmail.mockReturnValue({ allowed: true })
    mocks.verifyTurnstileToken.mockResolvedValue({ valid: true })
    // @ts-expect-error test override
    process.env.NODE_ENV = 'development'
  })

  function validRequest() {
    return new Request('http://localhost/api/auth/first-user', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'SecurePass1!',
        turnstileToken: 'token',
      }),
    })
  }

  it('creates auth user without role metadata and promotes via RPC', async () => {
    const { createUser, rpc, deleteUser } = setupPostClient()

    const response = await POST(validRequest())

    expect(response.status).toBe(200)
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: { name: 'Admin' },
      })
    )
    expect(createUser.mock.calls[0][0].user_metadata).not.toHaveProperty('role')
    expect(rpc).toHaveBeenCalledWith('try_create_first_admin', {
      p_id: 'auth-user-id',
      p_email: 'admin@example.com',
      p_name: 'Admin',
    })
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('on RPC failure deletes profile before deleteUser and checks auth delete', async () => {
    const { deleteUser, profileEq } = setupPostClient({
      rpcError: { message: 'FIRST_USER_EXISTS' },
      adminRow: null,
    })

    const response = await POST(validRequest())

    expect(response.status).toBe(409)
    expect(profileEq).toHaveBeenCalledWith('id', 'auth-user-id')
    expect(deleteUser).toHaveBeenCalledWith('auth-user-id')
    expect(profileEq.mock.invocationCallOrder[0]).toBeLessThan(
      deleteUser.mock.invocationCallOrder[0]
    )
  })

  it('does not call deleteUser when compensating profile delete fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deleteUser } = setupPostClient({
      rpcError: { message: 'FIRST_USER_EXISTS' },
      adminRow: null,
      profileDeleteError: { message: 'profile locked' },
    })

    const response = await POST(validRequest())

    expect(response.status).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
    const body = await response.json()
    expect(body.message).toMatch(/profil bloquant/)
    consoleError.mockRestore()
  })

  it('surfaces deleteUser failure on compensate paths', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deleteUser } = setupPostClient({
      rpcError: { message: 'boom' },
      adminRow: null,
      deleteUserError: { message: 'auth down' },
    })

    const response = await POST(validRequest())

    expect(response.status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith('auth-user-id')
    const body = await response.json()
    expect(body.message).toMatch(/deleteUser a échoué/)
    consoleError.mockRestore()
  })
})
