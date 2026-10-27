import { describe, expect, it } from 'vitest'
import { safeCallbackUrl } from '@/lib/safe-callback-url'

describe('safeCallbackUrl', () => {
  it('keeps relative app paths', () => {
    expect(safeCallbackUrl('/dashboard')).toBe('/dashboard')
    expect(safeCallbackUrl('/meteo')).toBe('/meteo')
    expect(safeCallbackUrl('/admin/reservations')).toBe('/admin/reservations')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeCallbackUrl('https://evil.example/phish')).toBe('/dashboard')
    expect(safeCallbackUrl('//evil.example')).toBe('/dashboard')
    expect(safeCallbackUrl('http://evil.example')).toBe('/dashboard')
  })

  it('rejects empty and non-path values', () => {
    expect(safeCallbackUrl('')).toBe('/dashboard')
    expect(safeCallbackUrl(null)).toBe('/dashboard')
    expect(safeCallbackUrl('dashboard')).toBe('/dashboard')
  })

  it('honors custom fallback', () => {
    expect(safeCallbackUrl('https://x', '/meteo')).toBe('/meteo')
  })
})
