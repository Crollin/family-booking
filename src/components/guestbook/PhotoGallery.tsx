'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type GalleryPhoto = {
  id?: string
  url: string
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[]
}

function cellClass(count: number, index: number) {
  if (count === 1) {
    return 'aspect-[4/3] sm:aspect-[16/10]'
  }
  if (count === 2) {
    return 'aspect-[4/3]'
  }
  if (count === 3) {
    return index === 0 ? 'row-span-2' : ''
  }
  if (count === 4) {
    return 'aspect-[4/3]'
  }
  if (index === 0) {
    return 'col-span-2 sm:col-span-2 aspect-[16/10]'
  }
  return 'aspect-square'
}

function gridClass(count: number) {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-2 grid-rows-2 auto-rows-fr'
  if (count === 4) return 'grid-cols-2'
  return 'grid-cols-2 sm:grid-cols-3'
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  const nextPhoto = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || photos.length < 2) return current
      return (current + 1) % photos.length
    })
  }, [photos.length])

  const prevPhoto = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || photos.length < 2) return current
      return (current - 1 + photos.length) % photos.length
    })
  }, [photos.length])

  useEffect(() => {
    if (selectedIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowRight') nextPhoto()
      if (event.key === 'ArrowLeft') prevPhoto()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [selectedIndex, closeLightbox, nextPhoto, prevPhoto])

  if (!photos || photos.length === 0) {
    return null
  }

  const count = photos.length
  const hasSlider = count > 1

  const lightbox =
    mounted && selectedIndex !== null
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/92 p-4 sm:p-8"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Visionneuse de photos"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return
              const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current
              touchStartX.current = null
              if (delta > 50) prevPhoto()
              if (delta < -50) nextPhoto()
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 text-background hover:bg-background/15 hover:text-background sm:right-5 sm:top-5"
              onClick={(event) => {
                event.stopPropagation()
                closeLightbox()
              }}
              aria-label="Fermer"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </Button>

            {hasSlider && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 text-background hover:bg-background/15 hover:text-background sm:left-4"
                onClick={(event) => {
                  event.stopPropagation()
                  prevPhoto()
                }}
                aria-label="Photo précédente"
              >
                <ChevronLeft className="h-8 w-8" strokeWidth={1.5} />
              </Button>
            )}

            <img
              src={photos[selectedIndex].url}
              alt={`Photo ${selectedIndex + 1} sur ${count}`}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />

            {hasSlider && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 text-background hover:bg-background/15 hover:text-background sm:right-4"
                onClick={(event) => {
                  event.stopPropagation()
                  nextPhoto()
                }}
                aria-label="Photo suivante"
              >
                <ChevronRight className="h-8 w-8" strokeWidth={1.5} />
              </Button>
            )}

            {hasSlider && (
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-background/80">
                {selectedIndex + 1} / {count}
              </p>
            )}
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        className={cn(
          'grid gap-1',
          gridClass(count),
          count === 3 && 'h-[min(28rem,70vw)]'
        )}
      >
        {photos.map((photo, index) => (
          <button
            key={photo.id ?? `${photo.url}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'relative h-full w-full cursor-zoom-in overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              cellClass(count, index)
            )}
            aria-label={`Ouvrir la photo ${index + 1} sur ${count}`}
          >
            <img
              src={photo.url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {lightbox}
    </>
  )
}
