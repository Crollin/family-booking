export type PracticalAddressSection = {
  title: string
  content: string
}

export type ParsedPracticalAddress = {
  addressLines: string[]
  sections: PracticalAddressSection[]
}

const SECTION_HEADER = /^Accès\b.+/i

/**
 * Sépare l'adresse postale des blocs "Accès …" pour un affichage scannable.
 * Compatible avec virgules / points-virgules / retours ligne (saisie admin).
 */
export function parsePracticalAddress(raw: string | null | undefined): ParsedPracticalAddress {
  if (!raw?.trim()) {
    return { addressLines: [], sections: [] }
  }

  const normalized = raw.replace(/\r\n/g, '\n').trim()
  const chunks = splitIntoStructuralChunks(normalized)

  const addressLines: string[] = []
  const sections: PracticalAddressSection[] = []
  let currentSection: PracticalAddressSection | null = null

  for (const chunk of chunks) {
    if (SECTION_HEADER.test(chunk)) {
      if (currentSection) {
        sections.push(finalizeSection(currentSection))
      }
      currentSection = { title: chunk, content: '' }
      continue
    }

    if (currentSection) {
      currentSection.content = currentSection.content
        ? `${currentSection.content}\n${chunk}`
        : chunk
    } else {
      addressLines.push(...expandAddressLine(chunk))
    }
  }

  if (currentSection) {
    sections.push(finalizeSection(currentSection))
  }

  return {
    addressLines: addressLines.map((line) => line.trim()).filter(Boolean),
    sections,
  }
}

function splitIntoStructuralChunks(text: string): string[] {
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }

  // Texte sur une ligne : couper avant chaque titre "Accès …"
  const withSectionBreaks = text.split(/(?=Accès\b)/i).map((part) => part.trim()).filter(Boolean)
  if (withSectionBreaks.length > 1) {
    return withSectionBreaks.flatMap((part) => {
      if (SECTION_HEADER.test(part)) return [part]
      return part.split(/[;]\s*/).map((p) => p.trim()).filter(Boolean)
    })
  }

  return text.split(/[;]\s*/).map((part) => part.trim()).filter(Boolean)
}

/** Les lignes d'adresse courtes sont souvent séparées par des virgules. */
function expandAddressLine(chunk: string): string[] {
  if (chunk.length > 90 || !chunk.includes(',')) {
    return [chunk]
  }

  const parts = chunk.split(/,\s*/).map((part) => part.trim()).filter(Boolean)
  // Ne découper que si ça ressemble à une adresse (parties courtes)
  if (parts.length >= 2 && parts.every((part) => part.length <= 60)) {
    return parts
  }

  return [chunk]
}

function finalizeSection(section: PracticalAddressSection): PracticalAddressSection {
  return {
    title: section.title.trim(),
    content: section.content.trim(),
  }
}

export function getMapsQueryFromAddressLines(lines: string[]): string {
  return lines.join(', ')
}
