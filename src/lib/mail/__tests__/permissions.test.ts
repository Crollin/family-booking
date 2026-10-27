import { afterEach, describe, expect, it } from 'vitest'
import { canTriggerEmailTest, getPlatformOwnerEmails } from '@/lib/mail/permissions'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('mail permissions', () => {
  it('allows any admin when allowlist is empty', () => {
    delete process.env.PLATFORM_OWNER_EMAILS
    expect(canTriggerEmailTest('admin@example.com')).toBe(true)
  })

  it('restricts tests to allowlisted emails', () => {
    process.env.PLATFORM_OWNER_EMAILS = 'owner@example.com, other@example.com'
    expect(getPlatformOwnerEmails()).toEqual(['owner@example.com', 'other@example.com'])
    expect(canTriggerEmailTest('owner@example.com')).toBe(true)
    expect(canTriggerEmailTest('admin@example.com')).toBe(false)
  })
})
