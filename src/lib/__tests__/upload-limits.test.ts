import { describe, expect, it } from 'vitest'
import { validateFile } from '@/lib/guestbook-upload'
import { MAX_MEDIA_FILE_SIZE } from '@/lib/upload-limits'

function fakeImage(size: number) {
  return { name: 'photo.jpg', type: 'image/jpeg', size } as File
}

describe('limite upload média', () => {
  it('accepte un fichier juste sous 20 Mo', () => {
    expect(validateFile(fakeImage(MAX_MEDIA_FILE_SIZE)).valid).toBe(true)
  })

  it('refuse un fichier au-dessus de 20 Mo', () => {
    const result = validateFile(fakeImage(MAX_MEDIA_FILE_SIZE + 1))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/20 Mo/)
  })
})
