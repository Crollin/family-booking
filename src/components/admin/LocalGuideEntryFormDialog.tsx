'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { apiPost, apiPut } from '@/lib/api-client'
import type { LocalGuideEntry, LocalGuideCategory, LocalGuideSeason } from '@/types'
import { CATEGORY_OPTIONS, SEASON_OPTIONS } from '@/lib/local-guide/constants'
import { MAX_MEDIA_FILE_SIZE_LABEL } from '@/lib/upload-limits'
import { Loader2, Trash2 } from 'lucide-react'

interface LocalGuideEntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: LocalGuideEntry | null
  onSuccess: () => void
}

const emptyForm = {
  category: 'restaurant' as LocalGuideCategory,
  name: '',
  description: '',
  imageUrl: '' as string,
  phone: '',
  email: '',
  address: '',
  website: '',
  accessInstructions: '',
  tags: '',
  seasons: [] as LocalGuideSeason[],
}

export function LocalGuideEntryFormDialog({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: LocalGuideEntryFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const isEdit = !!entry

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/local-guide/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur upload')
      }
      const { url } = await response.json()
      setForm((f) => ({ ...f, imageUrl: url }))
      toast({ title: 'Image ajoutée', description: 'L\'image sera enregistrée avec l\'entrée.' })
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible d\'ajouter l\'image',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingImage(false)
      e.target.value = ''
    }
  }

  useEffect(() => {
    if (entry) {
      setForm({
        category: entry.category,
        name: entry.name,
        description: entry.description ?? '',
        imageUrl: entry.imageUrl ?? '',
        phone: entry.phone ?? '',
        email: entry.email ?? '',
        address: entry.address ?? '',
        website: entry.website ?? '',
        accessInstructions: entry.accessInstructions ?? '',
        tags: entry.tags?.join(', ') ?? '',
        seasons: entry.seasons ?? [],
      })
    } else {
      setForm(emptyForm)
    }
    setValidationError(null)
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!form.name.trim()) {
      setValidationError('Veuillez renseigner le nom.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image_url: form.imageUrl.trim() || null,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        website: form.website.trim() || undefined,
        access_instructions: form.accessInstructions.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        seasons: form.category === 'activite' ? form.seasons : [],
      }

      if (isEdit) {
        const response = await apiPut(`/api/local-guide/${entry.id}`, payload)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erreur lors de la mise à jour')
        }
        toast({
          title: 'Entrée mise à jour',
          description: 'Le point d\'intérêt a été modifié.',
        })
      } else {
        const response = await apiPost('/api/local-guide', payload)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erreur lors de l\'ajout')
        }
        toast({
          title: 'Entrée ajoutée',
          description: 'Le point d\'intérêt a été ajouté.',
        })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier une entrée' : 'Ajouter une entrée'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="category">
              Catégorie <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  category: v as LocalGuideCategory,
                  seasons: v === 'activite' ? f.seasons : [],
                }))
              }
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nom du lieu"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          {form.category === 'activite' && (
            <div className="space-y-2">
              <Label>Saisons</Label>
              <p className="text-xs text-muted-foreground">
                Laisser vide pour afficher toute l&apos;année.
              </p>
              <div className="flex flex-wrap gap-4">
                {SEASON_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className="inline-flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.seasons.includes(value)}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          seasons: e.target.checked
                            ? [...f.seasons, value]
                            : f.seasons.filter((s) => s !== value),
                        }))
                      }}
                      className="rounded border-input"
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description du lieu..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Image (optionnel)</Label>
            {form.imageUrl ? (
              <div className="space-y-2">
                <img
                  src={form.imageUrl}
                  alt="Aperçu"
                  className="rounded-md border object-cover max-h-40 w-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer l&apos;image
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isUploadingImage}
                  className="max-w-xs"
                />
                {isUploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                <span className="text-xs text-muted-foreground">Max {MAX_MEDIA_FILE_SIZE_LABEL}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="04 XX XX XX XX"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse / Localisation</Label>
            <Input
              id="address"
              placeholder="Adresse ou localisation"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://..."
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessInstructions">Instructions d&apos;accès</Label>
            <Textarea
              id="accessInstructions"
              placeholder="Comment s'y rendre en ski, en voiture..."
              value={form.accessInstructions}
              onChange={(e) => setForm((f) => ({ ...f, accessInstructions: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
            <Input
              id="tags"
              placeholder="terrasse, vue panoramique, accessible ski"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                'Enregistrer'
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
