import { Resend } from 'resend'
import type { MailPayload, MailSendResult } from './types'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY non configurée')
    }
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

function getResendFromAddress(): string {
  const from = process.env.RESEND_FROM?.trim()
  if (!from) {
    throw new Error('RESEND_FROM non configurée')
  }
  return from
}

export async function sendViaResend(payload: MailPayload): Promise<MailSendResult> {
  const { data, error } = await getResendClient().emails.send({
    from: getResendFromAddress(),
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })

  if (error) {
    throw new Error(error.message || 'Erreur Resend lors de l\'envoi')
  }

  return {
    provider: 'resend',
    messageId: data?.id,
  }
}
