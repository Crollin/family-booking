import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { UserRole } from '@/types'
import type { LocalGuideEntry, LocalGuideCategory, LocalGuideSeason } from '@/types'
import { mapRowToEntry, parseSeasons, entryMatchesSeasonFilter } from '@/lib/local-guide/mapper'

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as LocalGuideCategory | null
    const search = searchParams.get('search')?.trim() || null
    const seasonParam = searchParams.get('season')
    const season =
      seasonParam === 'hiver' || seasonParam === 'ete'
        ? (seasonParam as LocalGuideSeason)
        : null

    const supabase = await createServerSupabaseClient(request)

    let query = supabase
      .from('local_guide_entries')
      .select('*')
      .order('name', { ascending: true })

    if (category && ['restaurant', 'activite', 'service', 'commerce'].includes(category)) {
      query = query.eq('category', category)
    }

    if (search) {
      const term = `%${search}%`
      query = query.or(`name.ilike.${term},description.ilike.${term}`)
    }

    const { data: rows, error } = await query

    if (error) throw error

    let entries: LocalGuideEntry[] = (rows ?? []).map((r) => mapRowToEntry(r as any))

    if (season) {
      entries = entries.filter((entry) => entryMatchesSeasonFilter(entry, season))
    }

    return NextResponse.json(entries)
  } catch (error: unknown) {
    console.error('GET /api/local-guide:', error)
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
    const { data: row, error } = await supabase
      .from('local_guide_entries')
      .insert({
        category,
        name: name.trim(),
        description: description?.trim() || null,
        image_url: imageUrlValue?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        website: website?.trim() || null,
        access_instructions: (access_instructions ?? accessInstructions)?.trim() || null,
        tags,
        seasons,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(mapRowToEntry(row as any), { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/local-guide:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
