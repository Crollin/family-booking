import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ReservationStatus, UserRole } from '@/types'
import { getReservationById, updateReservation } from '@/db/reservations'
import { getPropertyInfoSingleton } from '@/db/property-info'
import { mapReservationRpcError } from '@/db/errors'
import { mapReservationRow } from '@/db/mappers'

export async function PUT(
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

    const { startDate, endDate, guests, comment, userId, status } = await request.json()

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

    // Vérifier les permissions (propriétaire ou admin)
    if (reservation.user_id !== session.id && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Les membres ne peuvent modifier que les réservations en attente ou annulées
    // Les admins peuvent modifier toutes les réservations
    if (session.role !== UserRole.ADMIN && 
        reservation.status !== ReservationStatus.PENDING && 
        reservation.status !== ReservationStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Vous ne pouvez modifier que les réservations en attente ou annulées' },
        { status: 400 }
      )
    }

    // Si un userId est fourni, seul un admin peut l'utiliser
    const targetUserId = userId || reservation.user_id
    if (userId && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Vérifier que l'utilisateur cible existe si changé
    if (userId && userId !== reservation.user_id) {
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', targetUserId)
        .single()

      if (userError || !targetUser) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        )
      }
    }

    // Valider et préparer les dates
    const start = startDate ? new Date(startDate) : new Date(reservation.start_date)
    const end = endDate ? new Date(endDate) : new Date(reservation.end_date)

    // Validation des dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Dates invalides' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'La date de départ doit être après la date d\'arrivée' },
        { status: 400 }
      )
    }

    // Vérifier si les dates ont changé (pour notification email)
    const oldStartISO = new Date(reservation.start_date).toISOString()
    const oldEndISO = new Date(reservation.end_date).toISOString()
    const newStartISO = start.toISOString()
    const newEndISO = end.toISOString()
    
    const datesChanged = 
      (startDate && newStartISO !== oldStartISO) ||
      (endDate && newEndISO !== oldEndISO)

    // Déterminer le nouveau statut
    let newStatus = reservation.status as ReservationStatus
    if (session.role === UserRole.ADMIN && status) {
      // Les admins peuvent changer le statut
      newStatus = status as ReservationStatus
    } else if (session.role !== UserRole.ADMIN) {
      // Les membres remettent en attente si modifiée
      newStatus = ReservationStatus.PENDING
    }

    try {
      await updateReservation(supabase, {
        id,
        start,
        end,
        guests: guests ? parseInt(guests) : reservation.guests,
        comment: comment !== undefined ? comment : undefined,
        status: newStatus,
      })
    } catch (e: any) {
      const mapped = mapReservationRpcError(e)
      if (mapped.status !== 500) {
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw e
    }

    // Réaffectation membre (RPC update_reservation_dates ne gère pas user_id)
    if (userId && userId !== reservation.user_id) {
      const { error: reassignError } = await supabase
        .from('reservations')
        .update({ user_id: targetUserId })
        .eq('id', id)

      if (reassignError) {
        throw reassignError
      }
    }

    const updatedRow = await getReservationById(supabase, id)
    const mapped = mapReservationRow(updatedRow as any, { includeEmail: true })

    // Envoyer une notification si un admin a modifié les dates
    if (session.role === UserRole.ADMIN && datesChanged && mapped.user?.email) {
      try {
        const { sendReservationModifiedNotification } = await import('@/lib/email')
        
        let propertyInfo = undefined
        if (newStatus === ReservationStatus.APPROVED) {
          propertyInfo = (await getPropertyInfoSingleton(supabase)) || undefined
        }

        await sendReservationModifiedNotification(
          mapped.user.email,
          mapped.user.name || mapped.user.email,
          mapped.startDate,
          mapped.endDate,
          new Date(reservation.start_date),
          new Date(reservation.end_date),
          propertyInfo
        )
      } catch (emailError) {
        // Ne pas bloquer la modification si l'email échoue
        console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError)
      }
    }

    return NextResponse.json({
      id: mapped.id,
      userId: mapped.userId,
      startDate: mapped.startDate.toISOString(),
      endDate: mapped.endDate.toISOString(),
      status: mapped.status,
      guests: mapped.guests,
      comment: mapped.comment,
      adminComment: mapped.adminComment,
      createdAt: mapped.createdAt.toISOString(),
      updatedAt: mapped.updatedAt.toISOString(),
      user: mapped.user
        ? {
            id: mapped.user.id,
            name: mapped.user.name,
            email: mapped.user.email,
            avatarUrl: mapped.user.avatarUrl || null,
          }
        : null,
    })
  } catch (error: any) {
    console.error('Erreur lors de la modification de la réservation:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { hardDelete } = await request.json().catch(() => ({})) // Récupérer hardDelete si présent

    const supabase = await createServerSupabaseClient(request)

    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        user:users!reservations_user_id_fkey(email, name)
      `)
      .eq('id', id)
      .single()

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (reservation.user_id !== session.id && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Seuls les admins peuvent faire une suppression définitive
    const shouldHardDelete = hardDelete === true && session.role === UserRole.ADMIN

    if (shouldHardDelete) {
      // Suppression définitive
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      return NextResponse.json({ message: 'Réservation supprimée définitivement' })
    } else {
      // Marquer comme annulée (soft delete)
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: ReservationStatus.CANCELLED })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      // Envoyer notifications d'annulation
      const { 
        sendReservationCancellationConfirmation, 
        sendMemberCancellationNotification 
      } = await import('@/lib/email')
      
      // Si c'est un membre qui annule, envoyer confirmation au membre et notification aux admins
      if (reservation.user_id === session.id && session.role !== UserRole.ADMIN) {
        // Confirmation au membre
        try {
          await sendReservationCancellationConfirmation(
            reservation.user.email,
            reservation.user.name || reservation.user.email,
            new Date(reservation.start_date),
            new Date(reservation.end_date)
          )
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError)
        }

        // Notification aux admins
        const { data: admins } = await supabase
          .from('users')
          .select('email')
          .eq('role', UserRole.ADMIN)

        if (admins) {
          for (const admin of admins) {
            try {
              await sendMemberCancellationNotification(
                admin.email,
                reservation.user.name || reservation.user.email,
                new Date(reservation.start_date),
                new Date(reservation.end_date)
              )
            } catch (emailError) {
              console.error('Erreur lors de l\'envoi de l\'email aux admins:', emailError)
            }
          }
        }
      } else {
        // Si c'est un admin qui annule, envoyer seulement la confirmation au membre
        try {
          await sendReservationCancellationConfirmation(
            reservation.user.email,
            reservation.user.name || reservation.user.email,
            new Date(reservation.start_date),
            new Date(reservation.end_date)
          )
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email:', emailError)
        }
      }

      return NextResponse.json({ message: 'Réservation annulée' })
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'annulation/suppression de la réservation:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
