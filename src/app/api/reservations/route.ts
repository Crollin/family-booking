import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ReservationStatus, UserRole } from '@/types'
import { reservationCreateSchema } from '@/lib/validation'
import { createReservation, listReservations } from '@/db/reservations'
import { mapReservationRpcError } from '@/db/errors'
import { mapReservationRow } from '@/db/mappers'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient(request)
    const isAdmin = session.role === UserRole.ADMIN
    const reservations = await listReservations(supabase)

    const payload = reservations.map((r) => ({
      id: r.id,
      userId: r.userId,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      status: r.status,
      guests: r.guests,
      comment: r.comment,
      adminComment: r.adminComment,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user
        ? {
            id: r.user.id,
            name: r.user.name,
            email: isAdmin ? r.user.email : undefined,
            avatarUrl: r.user.avatarUrl,
          }
        : null,
    }))

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('Erreur lors de la récupération des réservations:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = reservationCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, guests, comment, userId } = parsed.data

    const targetUserId = userId || session.id
    if (userId && session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Client session — le RPC create_reservation vérifie is_admin pour les résas tiers
    const supabase = await createServerSupabaseClient(request)

    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, auto_approve_own_reservations')
      .eq('id', targetUserId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: "La date de départ doit être après la date d'arrivée" },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (start < today && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas réserver dans le passé' },
        { status: 400 }
      )
    }

    const isAdmin = session.role === UserRole.ADMIN
    const isOwnBooking = targetUserId === session.id

    let status = ReservationStatus.PENDING
    if (isAdmin && !isOwnBooking) {
      status = ReservationStatus.APPROVED
    } else if (isAdmin && isOwnBooking) {
      status = targetUser.auto_approve_own_reservations
        ? ReservationStatus.APPROVED
        : ReservationStatus.PENDING
    }
    try {
      const row = await createReservation(supabase, {
        userId: targetUserId,
        start,
        end,
        guests,
        comment: comment || null,
        status,
      })

      const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`*, user:users!reservations_user_id_fkey(id, name, email)`)
        .eq('id', row.id)
        .single()

      if (error) throw error

      const mapped = mapReservationRow(reservation as any, { includeEmail: true })

      try {
        const { sendReservationConfirmation, sendNewReservationNotification } = await import(
          '@/lib/email'
        )
        await sendReservationConfirmation(
          targetUser.email,
          targetUser.name || 'Membre',
          start,
          end
        )
        if (status === ReservationStatus.PENDING) {
          const { data: admins } = await supabase.from('users').select('email').eq('role', UserRole.ADMIN)
          for (const admin of admins || []) {
            if (!admin.email) continue
            await sendNewReservationNotification(
              admin.email,
              targetUser.name || 'Membre',
              start,
              end
            )
          }
        }
      } catch (emailError) {
        console.error('Erreur envoi email création réservation:', emailError)
      }

      return NextResponse.json(
        {
          ...mapped,
          startDate: mapped.startDate.toISOString(),
          endDate: mapped.endDate.toISOString(),
          createdAt: mapped.createdAt.toISOString(),
          updatedAt: mapped.updatedAt.toISOString(),
          user: mapped.user
            ? {
                id: mapped.user.id,
                name: mapped.user.name,
                email: mapped.user.email,
              }
            : null,
        },
        { status: 201 }
      )
    } catch (e: any) {
      const mapped = mapReservationRpcError(e)
      if (mapped.status !== 500) {
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw e
    }
  } catch (error: any) {
    console.error('Erreur création réservation:', error?.message || error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
