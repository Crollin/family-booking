import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserRole } from '@/types'
import { MAX_MEDIA_FILE_SIZE, MAX_MEDIA_FILE_SIZE_LABEL } from '@/lib/upload-limits'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const BUCKET = 'local-guide-images'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé (jpeg, png, webp uniquement)' },
        { status: 400 }
      )
    }
    if (file.size > MAX_MEDIA_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_MEDIA_FILE_SIZE_LABEL})` },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = ['jpeg', 'jpg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`
    const filePath = `uploads/${fileName}`

    const supabase = await createServerSupabaseClient(request)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload local-guide image:', uploadError)
      return NextResponse.json(
        { error: 'Échec de l\'upload' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error: unknown) {
    console.error('POST /api/local-guide/upload:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
