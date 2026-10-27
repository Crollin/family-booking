import { describe, expect, it, vi } from 'vitest'
import { claimInvitation, releaseInvitation } from '@/lib/claim-invitation'

describe('claimInvitation', () => {
  it('returns invitation when update claims a row', async () => {
    const row = { id: 'inv-1', email: 'a@b.co', token: 'tok', expires_at: '2099-01-01' }
    const builder: any = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      select: vi.fn(() => builder),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    const client = { from: vi.fn(() => builder) }
    const result = await claimInvitation(client as any, { token: 'tok', email: 'a@b.co' })
    expect(result).toEqual({ ok: true, invitation: row })
    expect(builder.update).toHaveBeenCalledWith({ used: true })
  })

  it('returns used_or_expired when no row claimed', async () => {
    const builder: any = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      select: vi.fn(() => builder),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    const client = { from: vi.fn(() => builder) }
    const result = await claimInvitation(client as any, { token: 'tok', email: 'a@b.co' })
    expect(result).toEqual({ ok: false, error: 'used_or_expired' })
  })
})

describe('releaseInvitation', () => {
  it('sets used false for the invitation id', async () => {
    const builder: any = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
    }
    const client = { from: vi.fn(() => builder) }
    await releaseInvitation(client as any, 'inv-1')
    expect(client.from).toHaveBeenCalledWith('invitations')
    expect(builder.update).toHaveBeenCalledWith({ used: false })
    expect(builder.eq).toHaveBeenCalledWith('id', 'inv-1')
  })
})
