'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Info } from 'lucide-react'

interface PropertyInfoData {
  openingTime: string | null
  closingTime: string | null
  practicalInfo: string | null
}

export function PropertyInfo() {
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfoData | null>(null)
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
        setPropertyInfo(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos pratiques:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Infos pratiques</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    )
  }

  if (!propertyInfo || (!propertyInfo.openingTime && !propertyInfo.closingTime && !propertyInfo.practicalInfo)) {
    return null
  }

  const formatTime = (time: string | null) => {
    if (!time) return null
    // Si le format est HH:mm, on l'affiche tel quel
    // Sinon on essaie de le formater
    return time
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Infos pratiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(propertyInfo.openingTime || propertyInfo.closingTime) && (
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Horaires</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                {propertyInfo.openingTime && (
                  <p>Ouverture : {formatTime(propertyInfo.openingTime)}</p>
                )}
                {propertyInfo.closingTime && (
                  <p>Fermeture : {formatTime(propertyInfo.closingTime)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {propertyInfo.practicalInfo && (
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Informations</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                {propertyInfo.practicalInfo}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


