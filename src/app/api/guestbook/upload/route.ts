import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  ALLOWED_IMAGE_MIMES,
  detectImageMime,
  extensionForMime,
} from '@/lib/file-validation'
import { MAX_MEDIA_FILE_SIZE, MAX_MEDIA_FILE_SIZE_LABEL } from '@/lib/upload-limits'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const formData = await request.formData()
    const fileInput = formData.get('file') as File | null
    const filesInput = formData.getAll('files') as File[]

    const files: File[] = []
    if (fileInput) files.push(fileInput)
    if (filesInput.length > 0) files.push(...filesInput)

    if (files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 fichiers autorisés' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient(request)
    const uploadedPhotos = []
    const errors: string[] = []

    for (const file of files) {
      if (file.size > MAX_MEDIA_FILE_SIZE) {
        errors.push(`${file.name}: fichier trop volumineux (max ${MAX_MEDIA_FILE_SIZE_LABEL})`)
        continue
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const detectedMime = detectImageMime(buffer)

      if (!detectedMime || !ALLOWED_IMAGE_MIMES.includes(detectedMime)) {
        errors.push(`${file.name}: type de fichier non autorisé`)
        continue
      }

      const fileExt = extensionForMime(detectedMime)
      if (!fileExt) {
        errors.push(`${file.name}: extension invalide`)
        continue
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${session.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('guestbook-photos')
        .upload(filePath, buffer, {
          contentType: detectedMime,
          upsert: false,
        })

      if (uploadError) {
        console.error('Erreur upload:', uploadError)
        errors.push(`${file.name}: échec upload`)
        continue
      }

      const { data: urlData } = await supabase.storage
        .from('guestbook-photos')
        .createSignedUrl(filePath, 31536000)

      if (!urlData) {
        errors.push(`${file.name}: URL signée indisponible`)
        continue
      }

      uploadedPhotos.push({
        storagePath: filePath,
        url: urlData.signedUrl,
      })
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier uploadé', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ photos: uploadedPhotos, errors })
  } catch (error: any) {
    console.error('Erreur upload guestbook:', error?.message || error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
