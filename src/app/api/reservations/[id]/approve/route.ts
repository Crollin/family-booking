import { NextResponse } from 'next/server'
import { getServerSession, requireAdmin } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { decideReservation, getReservationById } from '@/db/reservations'
import { getPropertyInfoSingleton } from '@/db/property-info'
import { mapReservationRpcError } from '@/db/errors'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent approuver/refuser
    await requireAdmin(request)

    const { action, adminComment } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    let reservation: Awaited<ReturnType<typeof getReservationById>>
    try {
      reservation = await getReservationById(supabase, id)
    } catch {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      )
    }

    if (!reservation) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      )
    }

    let updatedReservation
    try {
      updatedReservation = await decideReservation(supabase, {
        id,
        action: action as 'approve' | 'reject',
        adminComment: adminComment || null,
      })
    } catch (e: any) {
      const mapped = mapReservationRpcError(e)
      if (mapped.status !== 500) {
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw e
    }

    // Envoyer l'email de notification
    const { sendReservationApproved, sendReservationRejected } = await import('@/lib/email')
    const user = reservation.user as { email: string; name: string | null } | null

    try {
      if (user?.email) {
        if (action === 'approve') {
          const propertyInfo = await getPropertyInfoSingleton(supabase)

          await sendReservationApproved(
            user.email,
            user.name || user.email,
            new Date(reservation.start_date),
            new Date(reservation.end_date),
            (propertyInfo as any) || undefined
          )
        } else {
          await sendReservationRejected(
            user.email,
            user.name || user.email,
            new Date(reservation.start_date),
            new Date(reservation.end_date),
            adminComment || undefined
          )
        }
      }
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError)
    }

    return NextResponse.json(updatedReservation)
  } catch (error: any) {
    console.error('Erreur lors de l\'approbation/refus de la réservation:', error)
    
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
