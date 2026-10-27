import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getMailConfigStatus } from '@/lib/mail/send'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)

    const status = getMailConfigStatus()

    return NextResponse.json({
      ...status,
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

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
