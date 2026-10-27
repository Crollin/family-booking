import { sendMail } from './send'
import type { MailSendResult } from './types'
import { getSiteName } from '../site-branding'

export async function sendTestEmail(to: string): Promise<MailSendResult> {
  const siteName = getSiteName()
  const timestamp = new Date().toISOString()

  return sendMail({
    to,
    subject: `Test email — ${siteName}`,
    html: `
      <p style="margin:0 0 12px 0;">Bonjour,</p>
      <p style="margin:0 0 12px 0;">Ceci est un email de test envoyé depuis l'administration ${siteName}.</p>
      <p style="margin:0; color:#4B5563; font-size:14px;">Horodatage : ${timestamp}</p>
    `,
    text: `Email de test ${siteName} — ${timestamp}`,
  })
}
