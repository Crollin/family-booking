import type { LocalGuideEntry, LocalGuideSeason } from '@/types'

/** Déc–Avr → hiver, Mai–Nov → été (station de montagne) */
export function detectCurrentSeason(date = new Date()): LocalGuideSeason {
  const month = date.getMonth() + 1
  if (month === 12 || month <= 4) {
    return 'hiver'
  }
  return 'ete'
}

export function activityMatchesSeason(
  entry: LocalGuideEntry,
  season: LocalGuideSeason
): boolean {
  if (entry.category !== 'activite') {
    return true
  }
  if (entry.seasons.length === 0) {
    return true
  }
  return entry.seasons.includes(season)
}

export function getInitialSeason(): LocalGuideSeason {
  if (typeof window === 'undefined') {
    return detectCurrentSeason()
  }
  const stored = window.localStorage.getItem('guide-local-season')
  if (stored === 'hiver' || stored === 'ete') {
    return stored
  }
  return detectCurrentSeason()
}
