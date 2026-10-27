import { parseChecklistText, splitAccessCodes } from '@/lib/checklist-format'

export type AccessInfoRow = {
  /** Libellé sans le code (ex. "Digicode entrée"). */
  label: string
  /** Codes détectés dans la ligne. */
  codes: string[]
  /** Ligne d'origine. */
  raw: string
}

/**
 * Transforme un bloc Accès (puces / lignes) en lignes scannables :
 * libellé + codes mis en avant.
 */
export function parseAccessInfoRows(content: string): AccessInfoRow[] {
  const { title, items } = parseChecklistText(content)
  const lines = [
    ...(title ? [title] : []),
    ...items,
  ].filter(Boolean)

  return lines.map((raw) => {
    const segments = splitAccessCodes(raw)
    const codes = segments.filter((s) => s.type === 'code').map((s) => s.value)
    const label = segments
      .filter((s) => s.type === 'text')
      .map((s) => s.value)
      .join('')
      .replace(/\s*[:=\-]\s*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    return {
      label: label || (codes.length > 0 ? 'Code' : raw),
      codes,
      raw,
    }
  })
}
