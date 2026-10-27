import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { ReservationStatus } from '@/types'
import { sendGuestbookInvitation } from '@/lib/email'
import { subDays } from 'date-fns'

// Cette route doit être appelée par un cron job quotidiennement
// Exemple avec Vercel : ajoutez dans vercel.json :
// {
//   "crons": [{
//     "path": "/api/cron/guestbook-invites",
//     "schedule": "0 9 * * *"
//   }]
// }

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Calculer la date d'il y a 1 jour (séjours terminés depuis 1 jour)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const oneDayAgo = subDays(today, 1)
    oneDayAgo.setHours(23, 59, 59, 999)

    // Trouver les réservations terminées depuis exactement 1 jour (status APPROVED)
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        *,
        user:users!reservations_user_id_fkey(email, name)
      `)
      .eq('status', ReservationStatus.APPROVED)
      .lte('end_date', oneDayAgo.toISOString())
      .gte('end_date', subDays(oneDayAgo, 1).toISOString())

    if (reservationsError) {
      throw reservationsError
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        message: 'Aucune réservation à traiter',
        sent: 0,
        total: 0,
      })
    }

    let sentCount = 0
    const errors: string[] = []
    const skipped: string[] = []

    for (const reservation of reservations) {
      try {
        // Inviter seulement si aucun souvenir n'est encore lié à ce séjour
        const { data: existingEntries, error: checkError } = await supabase
          .from('guestbook_entries')
          .select('id')
          .eq('reservation_id', reservation.id)
          .limit(1)

        if (checkError) {
          throw checkError
        }

        if (existingEntries && existingEntries.length > 0) {
          skipped.push(`Réservation ${reservation.id}: un souvenir existe déjà`)
          continue
        }

        // Envoyer l'email d'invitation
        await sendGuestbookInvitation(
          reservation.user.email,
          reservation.user.name || reservation.user.email,
          reservation.id,
          new Date(reservation.start_date),
          new Date(reservation.end_date)
        )
        sentCount++
      } catch (error: any) {
        errors.push(`Erreur pour la réservation ${reservation.id}: ${error.message}`)
        console.error(`Erreur lors de l'envoi de l'invitation pour la réservation ${reservation.id}:`, error)
      }
    }

    return NextResponse.json({
      message: 'Invitations envoyées',
      sent: sentCount,
      total: reservations.length,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi des invitations:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}


