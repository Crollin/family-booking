'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChecklistStepContent } from '@/components/infos-pratiques/ChecklistStepContent'
import { AddressInfoCard } from '@/components/infos-pratiques/AddressInfoCard'
import { AccessInfoCards } from '@/components/infos-pratiques/AccessInfoCards'
import { WifiInfoCard } from '@/components/infos-pratiques/WifiInfoCard'
import { ContactsInfoCard } from '@/components/infos-pratiques/ContactsInfoCard'
import { TrashInfoCard } from '@/components/infos-pratiques/TrashInfoCard'
import { CustomInfoCard } from '@/components/infos-pratiques/CustomInfoCard'
import { ApartmentRulesCard } from '@/components/infos-pratiques/ApartmentRulesCard'
import { InfoJumpNav } from '@/components/infos-pratiques/InfoJumpNav'
import { InfoGroup } from '@/components/infos-pratiques/InfoSectionCard'
import { parsePracticalAddress } from '@/lib/practical-info-format'
import { Home, Info, Lightbulb, Wifi, CheckCircle2, Key, Droplet, Thermometer, Lock, Power, Shield } from 'lucide-react'

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

export default function InfosPratiquesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('opening')
  const [openingChecklist, setOpeningChecklist] = useState<ChecklistItem[]>([])
  const [closingChecklist, setClosingChecklist] = useState<ChecklistItem[]>([])
  const [generalInfo, setGeneralInfo] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [wifiNetwork, setWifiNetwork] = useState<string | null>(null)
  const [wifiPassword, setWifiPassword] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [trashSchedule, setTrashSchedule] = useState<TrashScheduleItem[]>([])
  const [apartmentRules, setApartmentRules] = useState<string[]>([])
  const [customInfoItems, setCustomInfoItems] = useState<CustomInfoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPropertyInfo()
  }, [])

  const fetchPropertyInfo = async () => {
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
        setAddress(data.address || null)
        setWifiNetwork(data.wifiNetwork || null)
        setWifiPassword(data.wifiPassword || null)
        setContacts(Array.isArray(data.contacts) ? data.contacts : [])
        setTrashSchedule(Array.isArray(data.trashSchedule) ? data.trashSchedule : [])
        setApartmentRules(Array.isArray(data.apartmentRules) ? data.apartmentRules : [])
        setCustomInfoItems(Array.isArray(data.customInfoItems) ? data.customInfoItems : [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos pratiques:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getIconComponent = (iconName: string, size: 'sm' | 'md' = 'md') => {
    const iconProps = {
      className: size === 'sm' ? 'h-4 w-4 text-primary' : 'h-6 w-6 text-muted-foreground',
      strokeWidth: 1.5,
    }
    const iconMap: Record<string, React.ReactNode> = {
      key: <Key {...iconProps} />,
      droplet: <Droplet {...iconProps} />,
      thermometer: <Thermometer {...iconProps} />,
      lightbulb: <Lightbulb {...iconProps} />,
      wifi: <Wifi {...iconProps} />,
      home: <Home {...iconProps} />,
      lock: <Lock {...iconProps} />,
      power: <Power {...iconProps} />,
      shield: <Shield {...iconProps} />,
      'check-circle': <CheckCircle2 {...iconProps} />,
    }
    return iconMap[iconName] || <Home {...iconProps} />
  }

  const getCurrentChecklist = () => {
    return activeTab === 'opening' ? openingChecklist : closingChecklist
  }

  const hasAccessSections = parsePracticalAddress(address).sections.length > 0

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-border/70 bg-card px-5 py-5 sm:px-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Lightbulb className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Infos pratiques
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Tout ce qu&apos;il faut savoir pour votre séjour dans l&apos;appartement familial
        </p>
      </div>

      {/* Onglets */}
      <div className="flex space-x-1 border-b sm:space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('opening')}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'opening'
              ? 'border-b-2 border-primary bg-primary/5 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="h-4 w-4" strokeWidth={1.5} />
          Ouverture
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('closing')}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'closing'
              ? 'border-b-2 border-primary bg-primary/5 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="h-4 w-4" strokeWidth={1.5} />
          Fermeture
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            activeTab === 'info'
              ? 'border-b-2 border-primary bg-primary/5 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="h-4 w-4" strokeWidth={1.5} />
          Infos
        </button>
      </div>

      {/* Contenu des onglets */}
      {(activeTab === 'opening' || activeTab === 'closing') && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Home className="h-5 w-5 text-green-700 dark:text-green-300" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold">
                  Checklist {activeTab === 'opening' ? 'ouverture' : 'fermeture'}
                </h2>
              </div>
              <p className="text-muted-foreground">
                Suivez ces étapes dans l&apos;ordre pour{' '}
                {activeTab === 'opening' ? 'ouvrir' : 'fermer'} l&apos;appartement correctement :
              </p>
            </div>

            {getCurrentChecklist().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucune étape définie pour le moment.
              </p>
            ) : (
              <div className="space-y-0">
                {getCurrentChecklist()
                  .sort((a, b) => a.order - b.order)
                  .map((item, index, sortedItems) => (
                    <div key={index} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {item.order}
                        </div>
                        {index < sortedItems.length - 1 && (
                          <div
                            className="my-1 w-px flex-1 min-h-6 bg-border/70"
                            aria-hidden
                          />
                        )}
                      </div>

                      <div
                        className={`min-w-0 flex-1 pb-6 ${
                          index === sortedItems.length - 1 ? 'pb-0' : ''
                        }`}
                      >
                        <div className="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/35">
                          <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                              {getIconComponent(item.icon, 'sm')}
                            </div>
                            <ChecklistStepContent text={item.text} className="flex-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'info' && (
        <div className="space-y-8">
          <InfoJumpNav showAccess={hasAccessSections} />

          <InfoGroup id="essentiels" title="Essentiels">
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AddressInfoCard address={address} addressOnly />
              <WifiInfoCard network={wifiNetwork} password={wifiPassword} />
              <ContactsInfoCard contacts={contacts} />
            </div>
          </InfoGroup>

          <AccessInfoCards address={address} />

          <InfoGroup id="sur-place" title="Sur place">
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
              <TrashInfoCard schedule={trashSchedule} />
              {customInfoItems
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <CustomInfoCard key={item.id} item={item} />
                ))}
            </div>
          </InfoGroup>

          <InfoGroup id="regles" title="Règles">
            <ApartmentRulesCard rules={apartmentRules} />
          </InfoGroup>
        </div>
      )}
    </div>
  )
}


