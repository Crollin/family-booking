import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserRole } from '@/types'
import { mapRowToEntry, parseSeasons } from '@/lib/local-guide/mapper'

const BUCKET = 'local-guide-images'

function getStoragePathFromUrl(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/\/object\/public\/local-guide-images\/(.+)$/)
  const path = match?.[1]?.split('?')[0]
  return path ?? null
}

async function deleteImageFromBucketIfOurs(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  imageUrl: string | null
) {
  const path = getStoragePathFromUrl(imageUrl)
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .filter((t) => typeof t === 'string')
      .flatMap((t) => t.split(',').map((s) => s.trim()).filter(Boolean))
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    const body = await request.json()
    const {
      category,
      name,
      description,
      image_url,
      imageUrl,
      phone,
      email,
      address,
      website,
      access_instructions,
      accessInstructions,
      tags: rawTags,
      seasons: rawSeasons,
    } = body

    if (!category || !name?.trim()) {
      return NextResponse.json(
        { error: 'Catégorie et nom sont requis' },
        { status: 400 }
      )
    }

    const validCategories = ['restaurant', 'activite', 'service', 'commerce']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Catégorie invalide' },
        { status: 400 }
      )
    }

    const tags = parseTags(rawTags ?? [])
    const imageUrlValue = image_url ?? imageUrl
    const seasons = parseSeasons(rawSeasons, category)

    const supabase = await createServerSupabaseClient(request)
    const { data: existingRow } = await supabase
      .from('local_guide_entries')
      .select('image_url')
      .eq('id', id)
      .single()

    if (imageUrlValue === null || imageUrlValue === '') {
      if (existingRow?.image_url) {
        await deleteImageFromBucketIfOurs(supabase, existingRow.image_url)
      }
    }

    const { data: row, error } = await supabase
      .from('local_guide_entries')
      .update({
        category,
        name: name.trim(),
        description: description?.trim() || null,
        image_url: imageUrlValue !== undefined ? (imageUrlValue?.trim() || null) : undefined,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        website: website?.trim() || null,
        access_instructions: (access_instructions ?? accessInstructions)?.trim() || null,
        tags,
        seasons,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!row) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
    }
    return NextResponse.json(mapRowToEntry(row as any))
  } catch (error: unknown) {
    console.error('PUT /api/local-guide/[id]:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(_request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    const supabase = await createServerSupabaseClient(_request)
    const { data: row } = await supabase
      .from('local_guide_entries')
      .select('image_url')
      .eq('id', id)
      .single()
    if (row?.image_url) {
      await deleteImageFromBucketIfOurs(supabase, row.image_url)
    }
    const { error } = await supabase
      .from('local_guide_entries')
      .delete()
      .eq('id', id)

    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('DELETE /api/local-guide/[id]:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
