import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserRole, GuestbookEntry, GuestbookPhoto } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

    const { message, photos, reservationId } = await request.json()
    const entryId = id

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

    // Vérifier que le souvenir existe et appartient à l'utilisateur
    const { data: existingEntry, error: fetchError } = await supabase
      .from('guestbook_entries')
      .select('user_id')
      .eq('id', entryId)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json(
        { error: 'Souvenir introuvable' },
        { status: 404 }
      )
    }

    if (existingEntry.user_id !== session.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez modifier que vos propres souvenirs' },
        { status: 403 }
      )
    }

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
          { error: 'Vous ne pouvez associer un souvenir qu\'à vos propres réservations' },
          { status: 403 }
        )
      }
    }

    // Mettre à jour le souvenir
    const { data: updatedEntry, error: updateError } = await supabase
      .from('guestbook_entries')
      .update({
        message: message.trim(),
        photos: photoUrls,
        reservation_id: reservationId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select(`
        *,
        user:users!guestbook_entries_user_id_fkey(id, name, email, role, created_at),
        reservation:reservations!guestbook_entries_reservation_id_fkey(id, user_id, start_date, end_date, status)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    // Calculer stayPeriod si une réservation est associée
    const stayPeriod = updatedEntry.reservation 
      ? format(new Date(updatedEntry.reservation.start_date), "MMMM yyyy", { locale: fr })
      : null

    // Convertir les photos (strings) en objets GuestbookPhoto pour la réponse
    const formattedPhotos: GuestbookPhoto[] = updatedEntry.photos && Array.isArray(updatedEntry.photos)
      ? updatedEntry.photos.map((photoUrl: string | any, index: number) => {
          // Si c'est déjà un objet, le retourner tel quel
          if (typeof photoUrl === 'object' && photoUrl !== null && photoUrl.url) {
            return {
              id: photoUrl.id || `photo-${updatedEntry.id}-${index}`,
              entryId: updatedEntry.id,
              url: photoUrl.url,
              storagePath: photoUrl.storagePath || '',
              order: photoUrl.order !== undefined ? photoUrl.order : index,
              createdAt: photoUrl.createdAt ? new Date(photoUrl.createdAt) : new Date(updatedEntry.created_at),
            }
          }
          // Sinon, convertir la string en objet GuestbookPhoto
          return {
            id: `photo-${updatedEntry.id}-${index}`,
            entryId: updatedEntry.id,
            url: photoUrl,
            storagePath: '', // Non disponible depuis l'URL seule
            order: index,
            createdAt: new Date(updatedEntry.created_at),
          }
        })
      : []

    // Formater la réponse
    const formattedEntry = {
      id: updatedEntry.id,
      userId: updatedEntry.user_id,
      reservationId: updatedEntry.reservation_id,
      message: updatedEntry.message,
      stayPeriod,
      photos: formattedPhotos,
      createdAt: new Date(updatedEntry.created_at),
      updatedAt: new Date(updatedEntry.updated_at),
      user: updatedEntry.user ? ({
        id: updatedEntry.user.id,
        name: updatedEntry.user.name,
        email: updatedEntry.user.email,
        avatarUrl: (updatedEntry.user as any).avatar_url || null,
        role: updatedEntry.user.role as any,
        emailVerified: null,
        createdAt: new Date(updatedEntry.user.created_at),
      } as any) : undefined,
      reservation: updatedEntry.reservation ? ({
        id: updatedEntry.reservation.id,
        userId: updatedEntry.reservation.user_id || '',
        startDate: new Date(updatedEntry.reservation.start_date),
        endDate: new Date(updatedEntry.reservation.end_date),
        status: updatedEntry.reservation.status as any,
        guests: 0,
        comment: null,
        adminComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any) : undefined,
    }

    return NextResponse.json(formattedEntry as GuestbookEntry)
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du souvenir:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la mise à jour du souvenir' },
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

    const entryId = id
    const supabase = await createServerSupabaseClient(request)

    // Vérifier que le souvenir existe
    const { data: existingEntry, error: fetchError } = await supabase
      .from('guestbook_entries')
      .select('user_id, photos')
      .eq('id', entryId)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json(
        { error: 'Souvenir introuvable' },
        { status: 404 }
      )
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (existingEntry.user_id !== session.id && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer ce souvenir' },
        { status: 403 }
      )
    }

    // Supprimer les photos du storage si elles existent
    if (existingEntry.photos && existingEntry.photos.length > 0) {
      const { createServiceRoleClient } = await import('@/lib/supabase')
      const serviceSupabase = createServiceRoleClient()
      
      for (const photoUrl of existingEntry.photos) {
        try {
          // Extraire le chemin du fichier depuis l'URL
          const urlParts = photoUrl.split('/')
          const fileName = urlParts[urlParts.length - 1]
          const userId = existingEntry.user_id
          const filePath = `${userId}/${fileName}`

          await serviceSupabase.storage
            .from('guestbook-photos')
            .remove([filePath])
        } catch (photoError) {
          console.error('Erreur lors de la suppression de la photo:', photoError)
          // Continuer même si la suppression de la photo échoue
        }
      }
    }

    // Supprimer le souvenir
    const { error: deleteError } = await supabase
      .from('guestbook_entries')
      .delete()
      .eq('id', entryId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: 'Souvenir supprimé avec succès' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression du souvenir:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression du souvenir' },
      { status: 500 }
    )
  }
}


