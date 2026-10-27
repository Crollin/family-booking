import { getPrimaryProviders } from './resolve-provider'
import { sendViaResend } from './resend'
import { sendViaSmtp } from './smtp'
import type { MailPayload, MailSendResult } from './types'

const providerSenders = {
  smtp: sendViaSmtp,
  resend: sendViaResend,
} as const

export async function sendMail(payload: MailPayload): Promise<MailSendResult> {
  const providers = getPrimaryProviders()

  if (providers.length === 0) {
    throw new Error(
      'Aucun fournisseur email configuré. Définissez SMTP_HOST ou RESEND_API_KEY dans les variables d\'environnement.'
    )
  }

  const errors: string[] = []

  for (const provider of providers) {
    try {
      return await providerSenders[provider](payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${provider}: ${message}`)
      console.error(`[mail] Échec envoi via ${provider}:`, error)
    }
  }

  throw new Error(`Échec de l'envoi email: ${errors.join(' | ')}`)
}

export { getMailConfigStatus, getEmailProviderMode, isResendConfigured, isSmtpConfigured } from './resolve-provider'
export type { MailConfigStatus, MailPayload, MailProvider, MailSendResult } from './types'
