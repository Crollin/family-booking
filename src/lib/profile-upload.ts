/**
 * Utilitaires pour l'upload de photos de profil vers Supabase Storage
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface AvatarUploadResponse {
  url: string
  storagePath: string
}

/**
 * Valide un fichier avant l'upload
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${file.type}. Types autorisés: jpeg, jpg, png, webp`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${file.name}. Taille maximum: 2MB`,
    }
  }

  return { valid: true }
}

/**
 * Upload une photo de profil
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erreur lors de l\'upload')
  }

  const data = await response.json()
  return data
}

/**
 * Supprime la photo de profil
 */
export async function deleteAvatar(): Promise<void> {
  const response = await fetch('/api/profile/avatar', {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erreur lors de la suppression')
  }
}
