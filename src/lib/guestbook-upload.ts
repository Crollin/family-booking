/**
 * Utilitaires pour l'upload de photos vers Supabase Storage pour le livre d'or
 */

import { createClientSupabaseClient } from './supabase-client'
import { MAX_MEDIA_FILE_SIZE, MAX_MEDIA_FILE_SIZE_LABEL } from './upload-limits'

export interface UploadedPhoto {
  storagePath: string
  url: string
  fileName: string
  size: number
  type: string
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * Valide un fichier avant l'upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${file.type}. Types autorisés: jpeg, jpg, png, webp`,
    }
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${file.name}. Taille maximum: ${MAX_MEDIA_FILE_SIZE_LABEL}`,
    }
  }

  return { valid: true }
}

/**
 * Upload un fichier vers Supabase Storage via l'API
 */
export async function uploadPhoto(file: File): Promise<UploadedPhoto> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const formData = new FormData()
  formData.append('files', file)

  const response = await fetch('/api/guestbook/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erreur lors de l\'upload')
  }

  const data = await response.json()
  if (!data.photos || data.photos.length === 0) {
    throw new Error('Aucune photo uploadée')
  }

  return data.photos[0]
}

/**
 * Upload plusieurs fichiers
 */
export async function uploadPhotos(files: File[]): Promise<UploadedPhoto[]> {
  if (files.length === 0) {
    return []
  }

  if (files.length > 10) {
    throw new Error('Maximum 10 fichiers autorisés')
  }

  // Valider tous les fichiers d'abord
  for (const file of files) {
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
  }

  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await fetch('/api/guestbook/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erreur lors de l\'upload')
  }

  const data = await response.json()
  return data.photos || []
}

/**
 * Supprime une photo du storage
 */
export async function deletePhoto(storagePath: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const fileName = storagePath.split('/').pop()

  if (!fileName) {
    throw new Error('Chemin de stockage invalide')
  }

  const { error } = await supabase.storage
    .from('guestbook-photos')
    .remove([fileName])

  if (error) {
    throw new Error(`Erreur lors de la suppression: ${error.message}`)
  }
}

/**
 * Redimensionne une image côté client (optionnel, pour réduire la taille)
 */
export function resizeImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculer les nouvelles dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width
            width = maxWidth
          } else {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Impossible de créer le blob'))
              return
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          },
          file.type,
          quality
        )
      }
      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
    reader.readAsDataURL(file)
  })
}
