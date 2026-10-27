import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { detectImageMime, extensionForMime } from '@/lib/file-validation'
import { passwordSchema, registerSchema, reservationCreateSchema } from '@/lib/validation'
import { getCached, setCache } from '@/lib/server-cache'

describe('cron-auth', () => {
  it('rejects missing secret', () => {
    delete process.env.CRON_SECRET
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer anything' },
    })
    expect(isAuthorizedCronRequest(req)).toBe(false)
  })

  it('accepts matching bearer', () => {
    process.env.CRON_SECRET = 'super-secret-key'
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer super-secret-key' },
    })
    expect(isAuthorizedCronRequest(req)).toBe(true)
  })

  it('rejects mismatch', () => {
    process.env.CRON_SECRET = 'super-secret-key'
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer wrong-secret-xx' },
    })
    expect(isAuthorizedCronRequest(req)).toBe(false)
  })
})

describe('file-validation', () => {
  it('detects jpeg magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(detectImageMime(buf)).toBe('image/jpeg')
    expect(extensionForMime('image/jpeg')).toBe('jpg')
  })

  it('rejects unknown bytes', () => {
    expect(detectImageMime(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull()
  })
})

describe('validation schemas', () => {
  it('rejects passwords shorter than 12 characters', () => {
    const result = passwordSchema.safeParse('Short1!')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Mot de passe trop court (min. 12)')
    }
  })

  it('rejects passwords without required complexity', () => {
    const result = passwordSchema.safeParse('alllowercase12')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Au moins une majuscule')
    }
  })

  it('rejects passwords without symbols', () => {
    const result = passwordSchema.safeParse('Str0ngPassw0rd')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Au moins un symbole')
    }
  })

  it('accepts strong passwords', () => {
    expect(passwordSchema.safeParse('Str0ng!Passw0rd').success).toBe(true)
  })

  it('validates register schema password rules', () => {
    const weak = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'weak',
      token: 'valid-token-123',
    })
    expect(weak.success).toBe(false)
    if (!weak.success) {
      const passwordIssue = weak.error.issues.find((issue) => issue.path[0] === 'password')
      expect(passwordIssue?.message).toBe('Mot de passe trop court (min. 12)')
    }
  })

  it('validates reservation payload', () => {
    const ok = reservationCreateSchema.safeParse({
      startDate: '2026-08-01',
      endDate: '2026-08-08',
      guests: 4,
    })
    expect(ok.success).toBe(true)
  })
})

describe('server-cache', () => {
  it('stores and retrieves values', () => {
    setCache('k', { a: 1 }, 10_000)
    expect(getCached<{ a: number }>('k')).toEqual({ a: 1 })
  })
})
