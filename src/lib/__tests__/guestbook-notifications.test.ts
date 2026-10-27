import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock('@/lib/mail/send', () => ({
  sendMail: mocks.sendMail,
}))

import { notifyMembersOfNewGuestbookEntry } from '@/lib/email'

function mockMembers(
  members: Array<{ id: string; email: string | null; name: string | null }> | null,
  error: { message: string } | null = null
) {
  const neq = vi.fn().mockResolvedValue({ data: members, error })
  const select = vi.fn().mockReturnValue({ neq })
  const from = vi.fn().mockReturnValue({ select })
  mocks.createServiceRoleClient.mockReturnValue({ from })
  return { from, select, neq }
}

describe('notifyMembersOfNewGuestbookEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendMail.mockResolvedValue({ provider: 'smtp', messageId: 'msg' })
  })

  it('envoie un e-mail à chaque membre sauf l’auteur', async () => {
    const { neq } = mockMembers([
      { id: 'member-1', email: 'alice@example.com', name: 'Alice' },
      { id: 'member-2', email: 'bob@example.com', name: null },
    ])

    await notifyMembersOfNewGuestbookEntry({
      authorId: 'author-id',
      authorName: 'Claire',
      message: 'Un super séjour !',
      stayPeriod: 'janvier 2026',
    })

    expect(neq).toHaveBeenCalledWith('id', 'author-id')
    expect(mocks.sendMail).toHaveBeenCalledTimes(2)
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        subject: "Nouveau souvenir partagé - Livre d'Or Family Lodge",
      })
    )
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@example.com',
      })
    )
  })

  it('ignore les membres sans e-mail', async () => {
    mockMembers([
      { id: 'member-1', email: 'alice@example.com', name: 'Alice' },
      { id: 'member-2', email: null, name: 'Sans mail' },
      { id: 'member-3', email: '', name: 'Vide' },
    ])

    await notifyMembersOfNewGuestbookEntry({
      authorId: 'author-id',
      authorName: 'Claire',
      message: 'Hello',
    })

    expect(mocks.sendMail).toHaveBeenCalledTimes(1)
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com' })
    )
  })

  it('continue si un envoi échoue', async () => {
    mockMembers([
      { id: 'member-1', email: 'alice@example.com', name: 'Alice' },
      { id: 'member-2', email: 'bob@example.com', name: 'Bob' },
    ])
    mocks.sendMail
      .mockRejectedValueOnce(new Error('SMTP down'))
      .mockResolvedValueOnce({ provider: 'smtp', messageId: 'msg' })

    await expect(
      notifyMembersOfNewGuestbookEntry({
        authorId: 'author-id',
        authorName: 'Claire',
        message: 'Hello',
      })
    ).resolves.toBeUndefined()

    expect(mocks.sendMail).toHaveBeenCalledTimes(2)
  })

  it('remonte une erreur si la liste des membres est inaccessible', async () => {
    mockMembers(null, { message: 'permission denied' })

    await expect(
      notifyMembersOfNewGuestbookEntry({
        authorId: 'author-id',
        authorName: 'Claire',
        message: 'Hello',
      })
    ).rejects.toThrow(/Impossible de charger les membres/)

    expect(mocks.sendMail).not.toHaveBeenCalled()
  })
})
