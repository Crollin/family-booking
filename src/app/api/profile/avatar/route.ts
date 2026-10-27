import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Valider le type MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type}. Types autorisés: jpeg, jpg, png, webp` },
        { status: 400 }
      )
    }

    // Valider la taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximum: 2MB` },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)
    const serviceRoleClient = createServiceRoleClient()

    // Récupérer l'utilisateur actuel pour obtenir l'ancien avatar
    const { data: authUser } = await serviceRoleClient.auth.admin.getUserById(session.id)
    const oldAvatarUrl = authUser?.user?.user_metadata?.avatar_url

    // Supprimer l'ancienne photo si elle existe
    if (oldAvatarUrl) {
      try {
        // Extraire le chemin de stockage de l'URL
        const urlParts = oldAvatarUrl.split('/')
        const storagePathIndex = urlParts.findIndex((part: string) => part === 'user-avatars')
        if (storagePathIndex !== -1 && storagePathIndex < urlParts.length - 1) {
          const storagePath = urlParts.slice(storagePathIndex + 1).join('/')
          await supabase.storage
            .from('user-avatars')
            .remove([storagePath])
        }
      } catch (error) {
        // Ignorer les erreurs de suppression (fichier peut ne plus exister)
        console.warn('Erreur lors de la suppression de l\'ancien avatar:', error)
      }
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `avatar.${fileExt}`
    const filePath = `${session.id}/${fileName}`

    // Convertir le File en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Remplacer si existe déjà
      })

    if (uploadError) {
      console.error('Erreur upload:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      )
    }

    // Générer une URL signée (valide 1 an)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('user-avatars')
      .createSignedUrl(filePath, 31536000) // 1 an en secondes

    if (urlError || !urlData) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération de l\'URL' },
        { status: 500 }
      )
    }

    // Mettre à jour les métadonnées utilisateur avec la nouvelle URL
    const { data: currentUser } = await serviceRoleClient.auth.admin.getUserById(session.id)
    const { error: updateError } = await serviceRoleClient.auth.admin.updateUserById(
      session.id,
      {
        user_metadata: {
          ...currentUser?.user?.user_metadata,
          avatar_url: urlData.signedUrl,
        },
      }
    )

    if (updateError) {
      console.error('Erreur mise à jour métadonnées:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des métadonnées' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      storagePath: filePath,
    })
  } catch (error: any) {
    console.error('Erreur lors de l\'upload:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'upload' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient(request)
    const serviceRoleClient = createServiceRoleClient()

    // Récupérer l'utilisateur actuel pour obtenir l'avatar
    const { data: authUser } = await serviceRoleClient.auth.admin.getUserById(session.id)
    const avatarUrl = authUser?.user?.user_metadata?.avatar_url

    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'Aucune photo de profil à supprimer' },
        { status: 404 }
      )
    }

    // Extraire le chemin de stockage de l'URL
    const urlParts = avatarUrl.split('/')
    const storagePathIndex = urlParts.findIndex((part: string) => part === 'user-avatars')
    
    if (storagePathIndex === -1 || storagePathIndex >= urlParts.length - 1) {
      return NextResponse.json(
        { error: 'Format d\'URL invalide' },
        { status: 400 }
      )
    }

    const storagePath = urlParts.slice(storagePathIndex + 1).join('/')

    // Supprimer le fichier du Storage
    const { error: deleteError } = await supabase.storage
      .from('user-avatars')
      .remove([storagePath])

    if (deleteError) {
      console.error('Erreur suppression:', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du fichier' },
        { status: 500 }
      )
    }

    // Mettre à jour les métadonnées utilisateur pour supprimer l'avatar_url
    const { data: currentUser } = await serviceRoleClient.auth.admin.getUserById(session.id)
    const updatedMetadata = { ...currentUser?.user?.user_metadata }
    delete updatedMetadata.avatar_url

    const { error: updateError } = await serviceRoleClient.auth.admin.updateUserById(
      session.id,
      {
        user_metadata: updatedMetadata,
      }
    )

    if (updateError) {
      console.error('Erreur mise à jour métadonnées:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des métadonnées' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression' },
      { status: 500 }
    )
  }
}
