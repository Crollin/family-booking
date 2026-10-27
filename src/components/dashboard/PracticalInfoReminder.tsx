'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormattedAccessText } from '@/components/infos-pratiques/FormattedAccessText'
import { getPracticalReminderFields } from '@/lib/practical-info-reminder'

export function PracticalInfoReminder() {
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPropertyInfo()
  }, [])

  const fetchPropertyInfo = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/property-info')
      if (response.ok) {
        const data = await response.json()
        setAddress(data.address ?? null)
        setError(null)
      } else {
        setError('Infos d\'accès indisponibles')
      }
    } catch (err) {
      console.error('Erreur lors du chargement des infos d\'accès:', err)
      setError('Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const fields = getPracticalReminderFields(address)
  const addressText =
    fields.addressLines.length > 0
      ? fields.addressLines.join(', ')
      : 'Non renseignée'

  const ctaButton = (
    <Button variant="outline" className="w-full mt-4" asChild>
      <Link href="/infos-pratiques">Voir les infos pratiques</Link>
    </Button>
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" strokeWidth={1.5} />
            Accès rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-full" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" strokeWidth={1.5} />
          Accès rapide
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Adresse</p>
              <p className="text-foreground">{addressText}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Accès extérieurs</p>
              {fields.exteriorAccess ? (
                <FormattedAccessText text={fields.exteriorAccess} />
              ) : (
                <p className="text-muted-foreground italic">Non renseigné</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Accès intérieurs</p>
              {fields.interiorAccess ? (
                <FormattedAccessText text={fields.interiorAccess} />
              ) : (
                <p className="text-muted-foreground italic">Non renseigné</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Numéro appartement</p>
              <p className="font-medium text-foreground">{fields.apartmentNumber}</p>
            </div>
          </div>
        )}
        {ctaButton}
      </CardContent>
    </Card>
  )
}
