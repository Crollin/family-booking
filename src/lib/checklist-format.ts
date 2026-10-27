export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }

export type ParsedChecklistText = {
  title: string | null
  items: string[]
}

const BULLET_SPLIT = /\s*[●•]\s*/
const DASH_LIST_SPLIT = /\s+-\s+/
const ACCESS_CODE_PATTERN =
  /(\d{4,6}[A-Za-z]?|[A-Z]{1,2}\d{3,5}[A-Za-z]?)/g

/**
 * Découpe le texte libre d'une étape en titre optionnel + lignes détaillées.
 * Compatible avec le contenu existant (puces ●, tirets, retours ligne).
 */
export function parseChecklistText(text: string): ParsedChecklistText {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (!trimmed) {
    return { title: null, items: [] }
  }

  if (BULLET_SPLIT.test(trimmed)) {
    const segments = trimmed.split(BULLET_SPLIT).map((part) => part.trim()).filter(Boolean)
    return splitTitleFromItems(segments)
  }

  const newlineItems = trimmed
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)

  if (newlineItems.length > 1) {
    return splitTitleFromItems(newlineItems)
  }

  if (DASH_LIST_SPLIT.test(trimmed)) {
    const dashItems = trimmed.split(DASH_LIST_SPLIT).map((part) => part.trim()).filter(Boolean)
    if (dashItems.length > 1) {
      return splitTitleFromItems(dashItems)
    }
  }

  return { title: null, items: [trimmed] }
}

function splitTitleFromItems(segments: string[]): ParsedChecklistText {
  if (segments.length <= 1) {
    return { title: null, items: segments }
  }

  const [first, ...rest] = segments
  const looksLikeTitle = first.length <= 55 && !ACCESS_CODE_PATTERN.test(first)

  if (looksLikeTitle) {
    return { title: first, items: rest }
  }

  return { title: null, items: segments }
}

/** Met en évidence les codes d'accès (chiffres, combinaisons alphanumériques). */
export function splitAccessCodes(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0
  const matches = Array.from(text.matchAll(ACCESS_CODE_PATTERN))

  for (const match of matches) {
    const index = match.index ?? 0
    const value = match[0]

    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    segments.push({ type: 'code', value })
    lastIndex = index + value.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}
