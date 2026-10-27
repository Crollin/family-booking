import { timingSafeEqual } from 'crypto'

/**
 * Valide le Bearer token des routes cron.
 * Fail-closed : secret manquant ou mismatch → false.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.trim().length < 8) {
    console.error('[cron] CRON_SECRET manquant ou trop court')
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  const expected = Buffer.from(secret)
  const received = Buffer.from(token)

  if (expected.length !== received.length) {
    return false
  }

  try {
    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
