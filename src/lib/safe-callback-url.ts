const RELATIVE_PATH = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/\-]*$/

export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (typeof raw !== 'string') return fallback
  const value = raw.trim()
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (!RELATIVE_PATH.test(value)) return fallback
  return value
}
