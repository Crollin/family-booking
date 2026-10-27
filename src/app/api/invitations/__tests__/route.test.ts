import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireAdmin: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  sendInvitationEmail: vi.fn(),
  buildInvitationLink: vi.fn(),
  getMailConfigStatus: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getServerSession: mocks.getServerSession,
  requireAdmin: mocks.requireAdmin,
}))

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock('@/lib/email', () => ({
  sendInvitationEmail: mocks.sendInvitationEmail,
  buildInvitationLink: mocks.buildInvitationLink,
}))

vi.mock('@/lib/mail/send', () => ({
  getMailConfigStatus: mocks.getMailConfigStatus,
}))

import { POST } from '../route'

/**
 * L'invitation traverse trois requêtes : recherche d'un utilisateur existant,
 * recherche d'une invitation en attente, puis insertion.
 */
function setupSupabase() {
  const deleteById = vi.fn().mockResolvedValue({ error: null })
  const deleteInvitation = vi.fn().mockReturnValue({ eq: deleteById })

  const insertSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'invitation-id',
      email: 'nouveau@example.com',
      expires_at: '2026-10-01T00:00:00.000Z',
    },
    error: null,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }
    }

    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            gt: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        }),
      }),
      insert,
      delete: deleteInvitation,
    }
  })

  mocks.getServerSession.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' })
  mocks.requireAdmin.mockResolvedValue(undefined)
  mocks.createServiceRoleClient.mockReturnValue({ from })
  mocks.buildInvitationLink.mockImplementation(
    (token: string) => `http://localhost:3000/register?token=${token}`
  )

  return { deleteById, insert }
}

function invite() {
  return POST(
    new Request('http://localhost/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nouveau@example.com' }),
    })
  )
}

describe('POST /api/invitations sans fournisseur e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conserve l\'invitation et renvoie le lien à transmettre', async () => {
    const { deleteById } = setupSupabase()
    mocks.getMailConfigStatus.mockReturnValue({ activeProvider: null })

    const response = await invite()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.emailSent).toBe(false)
    expect(body.invitation.link).toMatch(/\/register\?token=[0-9a-f]{64}$/)
    expect(mocks.sendInvitationEmail).not.toHaveBeenCalled()
    expect(deleteById).not.toHaveBeenCalled()
  })

  it('envoie l\'e-mail et masque le lien quand un fournisseur est configuré', async () => {
    setupSupabase()
    mocks.getMailConfigStatus.mockReturnValue({ activeProvider: 'smtp' })
    mocks.sendInvitationEmail.mockResolvedValue(undefined)

    const response = await invite()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.emailSent).toBe(true)
    expect(body.invitation.link).toBeUndefined()
    expect(mocks.sendInvitationEmail).toHaveBeenCalledWith(
      'nouveau@example.com',
      expect.stringMatching(/^[0-9a-f]{64}$/)
    )
  })

  it('supprime l\'invitation quand l\'envoi configuré échoue', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deleteById } = setupSupabase()
    mocks.getMailConfigStatus.mockReturnValue({ activeProvider: 'smtp' })
    mocks.sendInvitationEmail.mockRejectedValue(new Error('SMTP injoignable'))

    const response = await invite()

    expect(response.status).toBe(500)
    expect(deleteById).toHaveBeenCalledWith('id', 'invitation-id')
    consoleError.mockRestore()
  })
})
