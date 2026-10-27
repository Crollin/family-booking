export const DEFAULT_SITE_NAME = 'Family Lodge'
export const DEFAULT_SITE_TAGLINE = 'Réservations familiales partagées'

const trimmed = (v: string | undefined) => v?.trim() || ''

export function getSiteName(): string {
  return trimmed(process.env.SITE_NAME) || DEFAULT_SITE_NAME
}

export function getSiteTagline(): string {
  return trimmed(process.env.SITE_TAGLINE) || DEFAULT_SITE_TAGLINE
}

export function getPropertyCoords(): { lat: number; lng: number } {
  const lat = Number(process.env.PROPERTY_LAT)
  const lng = Number(process.env.PROPERTY_LNG)
  return {
    lat: Number.isFinite(lat) ? lat : 45,
    lng: Number.isFinite(lng) ? lng : 6,
  }
}
