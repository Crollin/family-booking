export type FormattedRule = {
  headline: string | null
  body: string
}

/**
 * Rend une règle admin lisible : casse phrase si TOUT EN MAJUSCULES,
 * et extrait un court titre si le paragraphe est long.
 */
export function formatRuleForDisplay(rule: string): FormattedRule {
  let text = rule.replace(/\s+/g, ' ').trim()
  if (!text) {
    return { headline: null, body: '' }
  }

  if (isMostlyUppercase(text)) {
    text = toSentenceCase(text)
  }

  if (text.length > 110) {
    const match = text.match(/^(.{18,90}?[.!?])\s+(.+)$/)
    if (match) {
      return { headline: match[1], body: match[2] }
    }
  }

  return { headline: null, body: text }
}

function isMostlyUppercase(text: string): boolean {
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, '')
  if (letters.length < 12) return false
  const upper = (letters.match(/[A-ZÀ-Ÿ]/g) ?? []).length
  return upper / letters.length >= 0.65
}

function toSentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase('fr-FR')
  return lower.replace(/(^\s*[a-zà-ÿ])|([.!?]\s+[a-zà-ÿ])/g, (chunk) =>
    chunk.toLocaleUpperCase('fr-FR')
  )
}
