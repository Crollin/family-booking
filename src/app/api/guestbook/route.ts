import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { GuestbookEntry, GuestbookPhoto } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { notifyMembersOfNewGuestbookEntry } from '@/lib/email'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    // Récupérer tous les souvenirs avec les informations utilisateur et réservation
    const { data: entries, error } = await supabase
      .from('guestbook_entries')
      .select(`
        *,
        user:users!guestbook_entries_user_id_fkey(id, name, email, role, created_at),
        reservation:reservations!guestbook_entries_reservation_id_fkey(id, user_id, start_date, end_date, status)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Formater les données
    const formattedEntries: GuestbookEntry[] = entries?.map((e: any) => {
      const stayPeriod = e.reservation 
        ? format(new Date(e.reservation.start_date), "MMMM yyyy", { locale: fr })
        : null
      
      // Convertir les photos (strings) en objets GuestbookPhoto
      const formattedPhotos: GuestbookPhoto[] = e.photos && Array.isArray(e.photos)
        ? e.photos.map((photoUrl: string | any, index: number) => {
            // Si c'est déjà un objet, le retourner tel quel
            if (typeof photoUrl === 'object' && photoUrl !== null && photoUrl.url) {
              return {
                id: photoUrl.id || `photo-${e.id}-${index}`,
                entryId: e.id,
                url: photoUrl.url,
                storagePath: photoUrl.storagePath || '',
                order: photoUrl.order !== undefined ? photoUrl.order : index,
                createdAt: photoUrl.createdAt ? new Date(photoUrl.createdAt) : new Date(e.created_at),
              }
            }
            // Sinon, convertir la string en objet GuestbookPhoto
            return {
              id: `photo-${e.id}-${index}`,
              entryId: e.id,
              url: photoUrl,
              storagePath: '', // Non disponible depuis l'URL seule
              order: index,
              createdAt: new Date(e.created_at),
            }
          })
        : []

      return {
        id: e.id,
        userId: e.user_id,
        reservationId: e.reservation_id,
        message: e.message,
        stayPeriod,
        photos: formattedPhotos,
        createdAt: new Date(e.created_at),
        updatedAt: new Date(e.updated_at),
        user: e.user ? {
          id: e.user.id,
          name: e.user.name,
          email: e.user.email,
          avatarUrl: (e.user as any).avatar_url || null,
          role: e.user.role,
          emailVerified: null,
          createdAt: new Date(e.user.created_at || e.user.createdAt),
        } : undefined,
        reservation: e.reservation ? {
          id: e.reservation.id,
          userId: e.reservation.user_id || '',
          startDate: new Date(e.reservation.start_date),
          endDate: new Date(e.reservation.end_date),
          status: e.reservation.status,
          guests: 0,
          comment: null,
          adminComment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
      }
    }) || []

    return NextResponse.json(formattedEntries)
  } catch (error: any) {
    console.error('Erreur lors de la récupération des souvenirs:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { reservationId, message, photos } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le message est requis' },
        { status: 400 }
      )
    }

    if (photos && !Array.isArray(photos)) {
      return NextResponse.json(
        { error: 'Les photos doivent être un tableau' },
        { status: 400 }
      )
    }

    // Limiter à 10 photos (cohérent avec le formulaire)
    if (photos && photos.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 photos autorisées' },
        { status: 400 }
      )
    }

    // Convertir les photos en format attendu par la base de données
    // Les photos peuvent être soit des chaînes (URLs), soit des objets avec { url, storagePath, order }
    let photoUrls: string[] = []
    if (photos && photos.length > 0) {
      photoUrls = photos.map((photo: any) => {
        // Si c'est déjà une chaîne, l'utiliser directement
        if (typeof photo === 'string') {
          return photo
        }
        // Si c'est un objet, extraire l'URL
        if (photo && typeof photo === 'object' && photo.url) {
          return photo.url
        }
        return null
      }).filter((url: string | null): url is string => url !== null)
    }

    const supabase = await createServerSupabaseClient(request)

    // Vérifier que la réservation existe et appartient à l'utilisateur (si fournie)
    if (reservationId) {
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select('id, user_id')
        .eq('id', reservationId)
        .single()

      if (reservationError || !reservation) {
        return NextResponse.json(
          { error: 'Réservation introuvable' },
          { status: 404 }
        )
      }

      if (reservation.user_id !== session.id) {
        return NextResponse.json(
          { error: 'Vous ne pouvez ajouter un souvenir que pour vos propres réservations' },
          { status: 403 }
        )
      }
    }

    // Créer le souvenir
    const { data: entry, error: createError } = await supabase
      .from('guestbook_entries')
      .insert({
        user_id: session.id,
        reservation_id: reservationId || null,
        message: message.trim(),
        photos: photoUrls,
      })
      .select(`
        *,
        user:users!guestbook_entries_user_id_fkey(id, name, email, role, created_at),
        reservation:reservations!guestbook_entries_reservation_id_fkey(id, user_id, start_date, end_date, status)
      `)
      .single()

    if (createError) {
      throw createError
    }

    // Calculer stayPeriod si une réservation est associée
    const stayPeriod = entry.reservation 
      ? format(new Date(entry.reservation.start_date), "MMMM yyyy", { locale: fr })
      : null

    // Convertir les photos (strings) en objets GuestbookPhoto pour la réponse
    const formattedPhotos: GuestbookPhoto[] = entry.photos && Array.isArray(entry.photos)
      ? entry.photos.map((photoUrl: string | any, index: number) => {
          // Si c'est déjà un objet, le retourner tel quel
          if (typeof photoUrl === 'object' && photoUrl !== null && photoUrl.url) {
            return {
              id: photoUrl.id || `photo-${entry.id}-${index}`,
              entryId: entry.id,
              url: photoUrl.url,
              storagePath: photoUrl.storagePath || '',
              order: photoUrl.order !== undefined ? photoUrl.order : index,
              createdAt: photoUrl.createdAt ? new Date(photoUrl.createdAt) : new Date(entry.created_at),
            }
          }
          // Sinon, convertir la string en objet GuestbookPhoto
          return {
            id: `photo-${entry.id}-${index}`,
            entryId: entry.id,
            url: photoUrl,
            storagePath: '', // Non disponible depuis l'URL seule
            order: index,
            createdAt: new Date(entry.created_at),
          }
        })
      : []

    // Formater la réponse
    const formattedEntry = {
      id: entry.id,
      userId: entry.user_id,
      reservationId: entry.reservation_id,
      message: entry.message,
      stayPeriod,
      photos: formattedPhotos,
      createdAt: new Date(entry.created_at),
      updatedAt: new Date(entry.updated_at),
      user: entry.user ? ({
        id: entry.user.id,
        name: entry.user.name,
        email: entry.user.email,
        avatarUrl: (entry.user as any).avatar_url || null,
        role: entry.user.role as any,
        emailVerified: null,
        createdAt: new Date(entry.user.created_at),
      } as any) : undefined,
      reservation: entry.reservation ? ({
        id: entry.reservation.id,
        userId: entry.reservation.user_id || '',
        startDate: new Date(entry.reservation.start_date),
        endDate: new Date(entry.reservation.end_date),
        status: entry.reservation.status as any,
        guests: 0,
        comment: null,
        adminComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any) : undefined,
    }

    try {
      await notifyMembersOfNewGuestbookEntry({
        authorId: session.id,
        authorName: entry.user?.name || entry.user?.email || 'Un membre',
        message: entry.message,
        stayPeriod,
      })
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi des notifications livre d\'or:', emailError)
    }

    return NextResponse.json(formattedEntry as GuestbookEntry, { status: 201 })
  } catch (error: any) {
    console.error('Erreur lors de la création du souvenir:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création du souvenir' },
      { status: 500 }
    )
  }
}


