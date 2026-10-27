import { parsePracticalAddress } from '@/lib/practical-info-format'

export const HARDCODED_APARTMENT_NUMBER = 'Appartement 402'

export type PracticalReminderFields = {
  addressLines: string[]
  exteriorAccess: string | null
  interiorAccess: string | null
  apartmentNumber: string
}

function findSectionContent(
  sections: { title: string; content: string }[],
  pattern: RegExp
): string | null {
  const match = sections.find((section) => pattern.test(section.title))
  if (!match?.content.trim()) return null
  return match.content.trim()
}

export function getPracticalReminderFields(
  address: string | null | undefined
): PracticalReminderFields {
  const { addressLines, sections } = parsePracticalAddress(address)

  return {
    addressLines,
    exteriorAccess: findSectionContent(sections, /extérieur/i),
    interiorAccess: findSectionContent(sections, /intérieur/i),
    apartmentNumber: HARDCODED_APARTMENT_NUMBER,
  }
}
