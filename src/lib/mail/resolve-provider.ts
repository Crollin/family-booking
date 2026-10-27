import type { EmailProviderMode, MailConfigStatus, MailProvider } from './types'

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim())
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export function getEmailProviderMode(): EmailProviderMode {
  const mode = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  if (mode === 'smtp' || mode === 'resend' || mode === 'auto') {
    return mode
  }
  return 'auto'
}

export function getMailConfigStatus(): MailConfigStatus {
  const smtpConfigured = isSmtpConfigured()
  const resendConfigured = isResendConfigured()
  const mode = getEmailProviderMode()

  let activeProvider: MailProvider | null = null
  if (mode === 'smtp' && smtpConfigured) {
    activeProvider = 'smtp'
  } else if (mode === 'resend' && resendConfigured) {
    activeProvider = 'resend'
  } else if (mode === 'auto') {
    if (smtpConfigured) {
      activeProvider = 'smtp'
    } else if (resendConfigured) {
      activeProvider = 'resend'
    }
  }

  return {
    smtp: {
      configured: smtpConfigured,
      host: smtpConfigured ? process.env.SMTP_HOST : undefined,
    },
    resend: {
      configured: resendConfigured,
    },
    activeProvider,
    emailProviderMode: mode,
  }
}

export function getPrimaryProviders(): MailProvider[] {
  const mode = getEmailProviderMode()

  if (mode === 'smtp') {
    return isSmtpConfigured() ? ['smtp'] : isResendConfigured() ? ['resend'] : []
  }

  if (mode === 'resend') {
    return isResendConfigured() ? ['resend'] : isSmtpConfigured() ? ['smtp'] : []
  }

  const providers: MailProvider[] = []
  if (isSmtpConfigured()) {
    providers.push('smtp')
  }
  if (isResendConfigured()) {
    providers.push('resend')
  }
  return providers
}
