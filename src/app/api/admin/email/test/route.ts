import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { canTriggerEmailTest } from '@/lib/mail/permissions'
import { sendTestEmail } from '@/lib/mail/test-email'
import { createRateLimitResponse, rateLimitByEmail } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request)

    if (!canTriggerEmailTest(session.email)) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à envoyer des emails de test' },
        { status: 403 }
      )
    }

    const rateLimit = rateLimitByEmail(session.email, 15 * 60 * 1000, 3)
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit)
    }

    let body: { to?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const recipient = body.to?.trim() || session.email

    const result = await sendTestEmail(recipient)

    return NextResponse.json({
      message: 'Email de test envoyé avec succès',
      to: recipient,
      provider: result.provider,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'

    if (message === 'Unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    console.error('[admin/email/test]', error)
    return NextResponse.json(
      {
        error: 'Échec de l\'envoi de l\'email de test',
        message,
      },
      { status: 500 }
    )
  }
}
