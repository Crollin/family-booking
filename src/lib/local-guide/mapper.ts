import type { LocalGuideEntry, LocalGuideCategory, LocalGuideSeason } from '@/types'

const VALID_SEASONS: LocalGuideSeason[] = ['hiver', 'ete']

export type LocalGuideRow = {
  id: string
  category: string
  name: string
  description: string | null
  image_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  access_instructions: string | null
  tags: string[]
  seasons?: string[] | null
  created_at: string
  updated_at: string
}

export function parseSeasons(raw: unknown, category?: string): LocalGuideSeason[] {
  if (category && category !== 'activite') {
    return []
  }
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (s): s is LocalGuideSeason => typeof s === 'string' && VALID_SEASONS.includes(s as LocalGuideSeason)
  )
}

export function mapRowToEntry(row: LocalGuideRow): LocalGuideEntry {
  return {
    id: row.id,
    category: row.category as LocalGuideCategory,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    accessInstructions: row.access_instructions,
    tags: row.tags ?? [],
    seasons: parseSeasons(row.seasons, row.category),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function entryMatchesSeasonFilter(
  entry: LocalGuideEntry,
  season: LocalGuideSeason | null
): boolean {
  if (!season || entry.category !== 'activite') {
    return true
  }
  if (entry.seasons.length === 0) {
    return true
  }
  return entry.seasons.includes(season)
}
