'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface EmailStatus {
  smtp: { configured: boolean; host?: string }
  resend: { configured: boolean }
  activeProvider: 'smtp' | 'resend' | null
  emailProviderMode: 'auto' | 'smtp' | 'resend'
  timestamp?: string
}

export function EmailSystemTools() {
  const { toast } = useToast()
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/email/status')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de charger le statut email')
      }

      setStatus(data)
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const sendTestEmail = async () => {
    setIsSending(true)
    setLastResult(null)

    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Échec de l\'envoi')
      }

      const summary = `Envoyé via ${data.provider}${data.messageId ? ` (${data.messageId})` : ''} vers ${data.to}`
      setLastResult(summary)
      toast({
        title: 'Email de test envoyé',
        description: summary,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setLastResult(message)
      toast({
        title: 'Échec de l\'envoi',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const providerLabel =
    status?.activeProvider === 'smtp'
      ? 'SMTP'
      : status?.activeProvider === 'resend'
        ? 'Resend'
        : 'Aucun'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration email
          </CardTitle>
          <CardDescription className="mt-1">
            SMTP prioritaire, Resend en secours si SMTP est absent ou en échec
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !status ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du statut...
          </div>
        ) : status ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Provider actif</p>
              <Badge variant={status.activeProvider ? 'default' : 'destructive'} className="mt-2">
                {providerLabel}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="mt-2 font-medium">{status.emailProviderMode}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">SMTP</p>
              <p className="mt-2 font-medium">
                {status.smtp.configured ? status.smtp.host : 'Non configuré'}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Resend</p>
              <p className="mt-2 font-medium">
                {status.resend.configured ? 'Configuré' : 'Non configuré'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={sendTestEmail} disabled={isSending || !status?.activeProvider}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              'Envoyer un email de test'
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/diagnose" target="_blank" rel="noopener noreferrer">
              Diagnostic complet
            </Link>
          </Button>
        </div>

        {lastResult && (
          <p className="text-sm text-muted-foreground border rounded-lg p-3">{lastResult}</p>
        )}
      </CardContent>
    </Card>
  )
}
