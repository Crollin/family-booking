import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserRole } from '@/types'

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

    const body = await request.json()
    const { photos } = body

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: 'Les photos sont requises' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    // Vérifier que l'entrée existe et que l'utilisateur a les permissions
    const { data: entry, error: fetchError } = await supabase
      .from('guestbook_entries')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Entrée introuvable' },
        { status: 404 }
      )
    }

    // Vérifier les permissions : propriétaire ou admin
    if (entry.user_id !== session.id && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Insérer les photos
    const photosToInsert = photos.map((photo: any, index: number) => ({
      entry_id: id,
      storage_path: photo.storagePath,
      url: photo.url,
      order: photo.order || index,
    }))

    const { data: insertedPhotos, error: insertError } = await supabase
      .from('guestbook_photos')
      .insert(photosToInsert)
      .select()

    if (insertError) {
      throw insertError
    }

    // Formater la réponse
    const formattedPhotos = insertedPhotos.map((photo: any) => ({
      id: photo.id,
      entryId: photo.entry_id,
      storagePath: photo.storage_path,
      url: photo.url,
      order: photo.order,
      createdAt: photo.created_at,
    }))

    return NextResponse.json(formattedPhotos, { status: 201 })
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout des photos:', error)
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
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

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { error: 'L\'ID de la photo est requis' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    // Vérifier que la photo existe et que l'utilisateur a les permissions
    const { data: photo, error: photoError } = await supabase
      .from('guestbook_photos')
      .select(`
        *,
        entry:guestbook_entries!guestbook_photos_entry_id_fkey(user_id)
      `)
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: 'Photo introuvable' },
        { status: 404 }
      )
    }

    // Vérifier les permissions : propriétaire de l'entrée ou admin
    if (photo.entry.user_id !== session.id && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }

    // Supprimer la photo du storage
    try {
      const storage = supabase.storage.from('guestbook-photos')
      const fileName = photo.storage_path.split('/').pop()
      if (fileName) {
        await storage.remove([fileName])
      }
    } catch (storageError) {
      console.warn('Erreur lors de la suppression de la photo du storage:', storageError)
      // Continuer même si la suppression du storage échoue
    }

    // Supprimer la photo de la base de données
    const { error: deleteError } = await supabase
      .from('guestbook_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: 'Photo supprimée' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression de la photo:', error)
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
