import { afterEach, describe, expect, it } from 'vitest'
import {
  getEmailProviderMode,
  getMailConfigStatus,
  getPrimaryProviders,
  isResendConfigured,
  isSmtpConfigured,
} from '@/lib/mail/resolve-provider'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('mail resolve-provider', () => {
  it('detects smtp configuration', () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    expect(isSmtpConfigured()).toBe(true)
  })

  it('detects resend configuration', () => {
    process.env.RESEND_API_KEY = 're_test'
    expect(isResendConfigured()).toBe(true)
  })

  it('defaults email provider mode to auto', () => {
    delete process.env.EMAIL_PROVIDER
    expect(getEmailProviderMode()).toBe('auto')
  })

  it('prefers smtp in auto mode when both configured', () => {
    process.env.EMAIL_PROVIDER = 'auto'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.RESEND_API_KEY = 're_test'

    expect(getPrimaryProviders()).toEqual(['smtp', 'resend'])
    expect(getMailConfigStatus().activeProvider).toBe('smtp')
  })

  it('uses resend when smtp is missing in auto mode', () => {
    process.env.EMAIL_PROVIDER = 'auto'
    delete process.env.SMTP_HOST
    process.env.RESEND_API_KEY = 're_test'

    expect(getPrimaryProviders()).toEqual(['resend'])
    expect(getMailConfigStatus().activeProvider).toBe('resend')
  })

  it('forces resend provider when EMAIL_PROVIDER=resend', () => {
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 're_test'
    process.env.SMTP_HOST = 'smtp.example.com'

    expect(getPrimaryProviders()).toEqual(['resend'])
    expect(getMailConfigStatus().activeProvider).toBe('resend')
  })
})
