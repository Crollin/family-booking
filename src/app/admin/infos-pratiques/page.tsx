'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Save, Plus, Trash2, GripVertical, Home, Info, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type ChecklistItem = {
  order: number
  icon: string
  text: string
}

type TabType = 'opening' | 'closing' | 'info'

type Contact = {
  type: string
  label: string
  phone: string
}

type TrashScheduleItem = {
  type: string
  days: string[]
}

type CustomInfoItem = {
  id: string
  title: string
  content: string
  icon?: string
  order: number
}

const AVAILABLE_ICONS = [
  { value: 'key', label: 'Clé' },
  { value: 'droplet', label: 'Eau' },
  { value: 'thermometer', label: 'Chauffe-eau' },
  { value: 'lightbulb', label: 'Électricité' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'home', label: 'Maison' },
  { value: 'lock', label: 'Serrure' },
  { value: 'power', label: 'Alimentation' },
  { value: 'shield', label: 'Sécurité' },
  { value: 'check-circle', label: 'Vérification' },
]

export default function InfosPratiquesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('opening')
  const [openingChecklist, setOpeningChecklist] = useState<ChecklistItem[]>([])
  const [closingChecklist, setClosingChecklist] = useState<ChecklistItem[]>([])
  const [generalInfo, setGeneralInfo] = useState('')
  const [address, setAddress] = useState<string>('')
  const [wifiNetwork, setWifiNetwork] = useState<string>('')
  const [wifiPassword, setWifiPassword] = useState<string>('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [trashSchedule, setTrashSchedule] = useState<TrashScheduleItem[]>([])
  const [apartmentRules, setApartmentRules] = useState<string[]>([])
  const [customInfoItems, setCustomInfoItems] = useState<CustomInfoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchPropertyInfo = useCallback(async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/property-info')
      if (response.ok) {
        const data = await response.json()
        setOpeningChecklist(
          data.openingChecklist ? JSON.parse(JSON.stringify(data.openingChecklist)) : []
        )
        setClosingChecklist(
          data.closingChecklist ? JSON.parse(JSON.stringify(data.closingChecklist)) : []
        )
        setGeneralInfo(data.generalInfo || '')
        setAddress(data.address || '')
        setWifiNetwork(data.wifiNetwork || '')
        setWifiPassword(data.wifiPassword || '')
        setContacts(Array.isArray(data.contacts) ? data.contacts : [])
        setTrashSchedule(Array.isArray(data.trashSchedule) ? data.trashSchedule : [])
        setApartmentRules(Array.isArray(data.apartmentRules) ? data.apartmentRules : [])
        setCustomInfoItems(Array.isArray(data.customInfoItems) ? data.customInfoItems : [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos pratiques:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les informations pratiques',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPropertyInfo()
  }, [fetchPropertyInfo])

  const getCurrentChecklist = () => {
    return activeTab === 'opening' ? openingChecklist : closingChecklist
  }

  const setCurrentChecklist = (checklist: ChecklistItem[]) => {
    if (activeTab === 'opening') {
      setOpeningChecklist(checklist)
    } else {
      setClosingChecklist(checklist)
    }
  }

  const addChecklistItem = () => {
    const current = getCurrentChecklist()
    const newOrder = current.length > 0 ? Math.max(...current.map((item) => item.order)) + 1 : 1
    const newItem: ChecklistItem = {
      order: newOrder,
      icon: 'home',
      text: '',
    }
    setCurrentChecklist([...current, newItem])
  }

  const removeChecklistItem = (index: number) => {
    const current = getCurrentChecklist()
    const newChecklist = current.filter((_, i) => i !== index)
    // Réordonner les items
    const reordered = newChecklist.map((item, i) => ({ ...item, order: i + 1 }))
    setCurrentChecklist(reordered)
  }

  const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: string | number) => {
    const current = getCurrentChecklist()
    const updated = [...current]
    updated[index] = { ...updated[index], [field]: value }
    setCurrentChecklist(updated)
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const current = getCurrentChecklist()
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === current.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...current]
    const temp = updated[index].order
    updated[index].order = updated[newIndex].order
    updated[newIndex].order = temp
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setCurrentChecklist(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { apiPut } = await import('@/lib/api-client')
      const response = await apiPut('/api/property-info', {
        openingChecklist: openingChecklist.length > 0 ? openingChecklist : null,
        closingChecklist: closingChecklist.length > 0 ? closingChecklist : null,
        generalInfo: generalInfo || null,
        address: address || null,
        wifiNetwork: wifiNetwork || null,
        wifiPassword: wifiPassword || null,
        contacts: contacts.length > 0 ? contacts : [],
        trashSchedule: trashSchedule.length > 0 ? trashSchedule : [],
        apartmentRules: apartmentRules.length > 0 ? apartmentRules : [],
        customInfoItems: customInfoItems.length > 0 ? customInfoItems : [],
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Les informations pratiques ont été mises à jour avec succès',
        })
        // Rafraîchir la session côté serveur pour maintenir l'affichage admin
        router.refresh()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder les informations pratiques',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      key: '🔑',
      droplet: '💧',
      thermometer: '🌡️',
      lightbulb: '💡',
      wifi: '📶',
      home: '🏠',
      lock: '🔒',
      power: '⚡',
      shield: '🛡️',
      'check-circle': '✅',
    }
    return iconMap[iconName] || '🏠'
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Infos pratiques</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="icon" title="Retour au menu admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold mb-2">Infos pratiques</h1>
          <p className="text-muted-foreground">
            Gérez les checklists d&apos;ouverture, de fermeture et les informations générales
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Onglets */}
        <div className="flex space-x-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('opening')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'opening'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="inline mr-2 h-4 w-4" />
            Ouverture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('closing')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'closing'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="inline mr-2 h-4 w-4" />
            Fermeture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info className="inline mr-2 h-4 w-4" />
            Infos
          </button>
        </div>

        {/* Contenu des onglets */}
        {(activeTab === 'opening' || activeTab === 'closing') && (
          <Card>
            <CardHeader>
              <CardTitle>
                Checklist d&apos;{activeTab === 'opening' ? 'ouverture' : 'fermeture'}
              </CardTitle>
              <CardDescription>
                Ajoutez les étapes à suivre dans l&apos;ordre pour{' '}
                {activeTab === 'opening' ? 'ouvrir' : 'fermer'} l&apos;appartement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getCurrentChecklist().map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card"
                >
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                      {item.order}
                    </div>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === getCurrentChecklist().length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <GripVertical className="h-4 w-4 rotate-180" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icône</Label>
                        <Select
                          value={item.icon}
                          onValueChange={(value) => updateChecklistItem(index, 'icon', value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              <span className="mr-2">{getIconComponent(item.icon)}</span>
                              {AVAILABLE_ICONS.find((i) => i.value === item.icon)?.label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ICONS.map((icon) => (
                              <SelectItem key={icon.value} value={icon.value}>
                                <span className="mr-2">{getIconComponent(icon.value)}</span>
                                {icon.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Texte de l&apos;étape</Label>
                        <Input
                          value={item.text}
                          onChange={(e) => updateChecklistItem(index, 'text', e.target.value)}
                          placeholder="Description de l'étape..."
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChecklistItem(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addChecklistItem}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une étape
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Adresse */}
            <Card>
              <CardHeader>
                <CardTitle>Adresse</CardTitle>
                <CardDescription>
                  Adresse complète de l&apos;appartement. Vous pouvez utiliser des virgules, points-virgules ou retours à la ligne pour séparer les différentes parties.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Rue de la Famille&#10;75001 Paris&#10;France"
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* WiFi */}
            <Card>
              <CardHeader>
                <CardTitle>WiFi</CardTitle>
                <CardDescription>Informations de connexion WiFi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wifiNetwork">Réseau</Label>
                  <Input
                    id="wifiNetwork"
                    value={wifiNetwork}
                    onChange={(e) => setWifiNetwork(e.target.value)}
                    placeholder="Appart_Famille"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifiPassword">Mot de passe</Label>
                  <Input
                    id="wifiPassword"
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="FamilleAppart2024"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contacts utiles */}
            <Card>
              <CardHeader>
                <CardTitle>Contacts utiles</CardTitle>
                <CardDescription>Liste des contacts importants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Input
                          value={contact.type}
                          onChange={(e) => {
                            const updated = [...contacts]
                            updated[index].type = e.target.value
                            setContacts(updated)
                          }}
                          placeholder="Gardien, Urgences plomberie, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={contact.label}
                          onChange={(e) => {
                            const updated = [...contacts]
                            updated[index].label = e.target.value
                            setContacts(updated)
                          }}
                          placeholder="Gardien"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => {
                            const updated = [...contacts]
                            updated[index].phone = e.target.value
                            setContacts(updated)
                          }}
                          placeholder="06 12 34 56 78"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setContacts(contacts.filter((_, i) => i !== index))
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setContacts([...contacts, { type: '', label: '', phone: '' }])
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un contact
                </Button>
              </CardContent>
            </Card>

            {/* Poubelles */}
            <Card>
              <CardHeader>
                <CardTitle>Poubelles</CardTitle>
                <CardDescription>Horaires de collecte des poubelles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trashSchedule.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Input
                          value={item.type}
                          onChange={(e) => {
                            const updated = [...trashSchedule]
                            updated[index].type = e.target.value
                            setTrashSchedule(updated)
                          }}
                          placeholder="Ordures ménagères, Tri sélectif, Verre"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Jours (séparés par des virgules)</Label>
                        <Input
                          value={item.days.join(', ')}
                          onChange={(e) => {
                            const updated = [...trashSchedule]
                            updated[index].days = e.target.value
                              .split(',')
                              .map((d) => d.trim())
                              .filter((d) => d)
                            setTrashSchedule(updated)
                          }}
                          placeholder="mardi, vendredi"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTrashSchedule(trashSchedule.filter((_, i) => i !== index))
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTrashSchedule([...trashSchedule, { type: '', days: [] }])
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un horaire
                </Button>
              </CardContent>
            </Card>

            {/* Règles de l'appartement */}
            <Card>
              <CardHeader>
                <CardTitle>Règles de l&apos;appartement</CardTitle>
                <CardDescription>Liste des règles à respecter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apartmentRules.map((rule, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <Textarea
                      value={rule}
                      onChange={(e) => {
                        const updated = [...apartmentRules]
                        updated[index] = e.target.value
                        setApartmentRules(updated)
                      }}
                      placeholder="Respecter le calme après 22h"
                      rows={2}
                      className="flex-1 resize-none"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setApartmentRules(apartmentRules.filter((_, i) => i !== index))
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setApartmentRules([...apartmentRules, ''])
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une règle
                </Button>
              </CardContent>
            </Card>

            {/* Items personnalisés */}
            <Card>
              <CardHeader>
                <CardTitle>Items personnalisés</CardTitle>
                <CardDescription>
                  Ajoutez des informations personnalisées qui apparaîtront dans l&apos;onglet Infos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customInfoItems
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => {
                    const sortedIndex = customInfoItems
                      .sort((a, b) => a.order - b.order)
                      .findIndex((i) => i.id === item.id)
                    return (
                      <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                        <div className="flex flex-col gap-1 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (sortedIndex === 0) return
                              const sorted = [...customInfoItems].sort((a, b) => a.order - b.order)
                              const temp = sorted[sortedIndex].order
                              sorted[sortedIndex].order = sorted[sortedIndex - 1].order
                              sorted[sortedIndex - 1].order = temp
                              setCustomInfoItems(sorted)
                            }}
                            disabled={sortedIndex === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                            {item.order}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const sorted = [...customInfoItems].sort((a, b) => a.order - b.order)
                              if (sortedIndex === sorted.length - 1) return
                              const temp = sorted[sortedIndex].order
                              sorted[sortedIndex].order = sorted[sortedIndex + 1].order
                              sorted[sortedIndex + 1].order = temp
                              setCustomInfoItems(sorted)
                            }}
                            disabled={sortedIndex === customInfoItems.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4 rotate-180" />
                          </button>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Titre</Label>
                              <Input
                                value={item.title}
                                onChange={(e) => {
                                  const updated = [...customInfoItems]
                                  const itemIndex = updated.findIndex((i) => i.id === item.id)
                                  if (itemIndex !== -1) {
                                    updated[itemIndex] = { ...updated[itemIndex], title: e.target.value }
                                    setCustomInfoItems(updated)
                                  }
                                }}
                                placeholder="Titre de l'item"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Icône (optionnel)</Label>
                              <Select
                                value={item.icon || 'none'}
                                onValueChange={(value) => {
                                  const updated = [...customInfoItems]
                                  const itemIndex = updated.findIndex((i) => i.id === item.id)
                                  if (itemIndex !== -1) {
                                    updated[itemIndex] = { ...updated[itemIndex], icon: value === 'none' ? undefined : value }
                                    setCustomInfoItems(updated)
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue>
                                    {item.icon && item.icon !== 'none' ? (
                                      <>
                                        <span className="mr-2">{getIconComponent(item.icon)}</span>
                                        {AVAILABLE_ICONS.find((i) => i.value === item.icon)?.label}
                                      </>
                                    ) : (
                                      'Aucune icône'
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Aucune icône</SelectItem>
                                  {AVAILABLE_ICONS.map((icon) => (
                                    <SelectItem key={icon.value} value={icon.value}>
                                      <span className="mr-2">{getIconComponent(icon.value)}</span>
                                      {icon.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Contenu</Label>
                            <Textarea
                              value={item.content}
                              onChange={(e) => {
                                const updated = [...customInfoItems]
                                const itemIndex = updated.findIndex((i) => i.id === item.id)
                                if (itemIndex !== -1) {
                                  updated[itemIndex] = { ...updated[itemIndex], content: e.target.value }
                                  setCustomInfoItems(updated)
                                }
                              }}
                              placeholder="Contenu de l'item (peut contenir plusieurs lignes)"
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = customInfoItems.filter((i) => i.id !== item.id)
                            // Réordonner les items restants
                            const reordered = updated
                              .sort((a, b) => a.order - b.order)
                              .map((i, idx) => ({ ...i, order: idx + 1 }))
                            setCustomInfoItems(reordered)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newOrder =
                      customInfoItems.length > 0
                        ? Math.max(...customInfoItems.map((item) => item.order)) + 1
                        : 1
                    const newItem: CustomInfoItem = {
                      id: crypto.randomUUID(),
                      title: '',
                      content: '',
                      order: newOrder,
                    }
                    setCustomInfoItems([...customInfoItems, newItem])
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un item personnalisé
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="mr-2">Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
