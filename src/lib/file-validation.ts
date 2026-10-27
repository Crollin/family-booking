const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Détecte le type MIME via magic bytes (pas via Content-Type client).
 */
export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 3) return null

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  if (buffer.length < 12) return null

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  // WebP (RIFF....WEBP)
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null
}

export const ALLOWED_IMAGE_MIMES = Object.keys(MIME_TO_EXT)
