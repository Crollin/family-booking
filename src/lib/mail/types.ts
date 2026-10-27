export type MailProvider = 'smtp' | 'resend'

export type EmailProviderMode = 'auto' | 'smtp' | 'resend'

export interface MailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export interface MailSendResult {
  provider: MailProvider
  messageId?: string
}

export interface MailConfigStatus {
  smtp: {
    configured: boolean
    host?: string
  }
  resend: {
    configured: boolean
  }
  activeProvider: MailProvider | null
  emailProviderMode: EmailProviderMode
}
