'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiDelete } from '@/lib/api-client'
import type { LocalGuideEntry } from '@/types'
import { LocalGuideEntryFormDialog } from '@/components/admin/LocalGuideEntryFormDialog'
import {
  CATEGORY_LABELS,
  TAB_ACTIVE_STYLES,
  getSeasonDisplayLabel,
  NOT_PROVIDED,
  CATEGORY_ORDER,
  CATEGORY_PLURAL,
  CATEGORY_ICON_MAP,
  type FilterCategory,
} from '@/lib/local-guide/constants'
import { MapPin, Plus, Pencil, Trash2, Loader2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

export default function AdminGuideLocalPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<LocalGuideEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LocalGuideEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')

  const fetchEntries = useCallback(async () => {
    try {
      const response = await apiGet('/api/local-guide')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      } else {
        throw new Error('Erreur lors du chargement')
      }
    } catch (error) {
      console.error('Erreur lors du chargement du guide local:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les points d\'intérêt',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const filteredEntries = useMemo(() => {
    if (filterCategory === 'all') return entries
    return entries.filter((e) => e.category === filterCategory)
  }, [entries, filterCategory])

  const handleAdd = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const handleEdit = (entry: LocalGuideEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleDelete = async (entry: LocalGuideEntry) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer « ${entry.name} » ? Cette action est irréversible.`
      )
    ) {
      return
    }
    setDeletingId(entry.id)
    try {
      const response = await apiDelete(`/api/local-guide/${entry.id}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
      toast({
        title: 'Entrée supprimée',
        description: 'Le point d\'intérêt a été supprimé.',
      })
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de supprimer',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filterTabs: { value: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Tous', icon: <LayoutGrid className="h-4 w-4" /> },
    ...CATEGORY_ORDER.map((value) => {
      const Icon = CATEGORY_ICON_MAP[value]
      return {
        value,
        label: CATEGORY_PLURAL[value],
        icon: <Icon className="h-4 w-4" />,
      }
    }),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Guide local
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les points d&apos;intérêt (restaurants, activités, services, commerces).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/guide-local">
            <Button variant="outline" size="sm">
              Voir la page membre
            </Button>
          </Link>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une entrée
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrées du guide local</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterCategory(tab.value)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filterCategory === tab.value
                    ? TAB_ACTIVE_STYLES[tab.value]
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune entrée. Cliquez sur « Ajouter une entrée » pour en créer une.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Catégorie</th>
                    <th className="text-left py-3 px-2 font-medium">Nom</th>
                    <th className="text-left py-3 px-2 font-medium">Saisons</th>
                    <th className="text-left py-3 px-2 font-medium">Téléphone</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">{CATEGORY_LABELS[entry.category]}</td>
                      <td className="py-3 px-2 font-medium">{entry.name}</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {entry.category === 'activite' ? (
                          <Badge variant="outline" className="font-normal">
                            {getSeasonDisplayLabel(entry.seasons)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {entry.phone ?? NOT_PROVIDED}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            aria-label="Supprimer"
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <LocalGuideEntryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        onSuccess={fetchEntries}
      />
    </div>
  )
}
