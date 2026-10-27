import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/mail/smtp', () => ({
  sendViaSmtp: vi.fn(),
}))

vi.mock('@/lib/mail/resend', () => ({
  sendViaResend: vi.fn(),
}))

import { sendViaResend } from '@/lib/mail/resend'
import { sendViaSmtp } from '@/lib/mail/smtp'
import { sendMail } from '@/lib/mail/send'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.clearAllMocks()
})

describe('sendMail fallback', () => {
  it('throws when no provider is configured', async () => {
    delete process.env.SMTP_HOST
    delete process.env.RESEND_API_KEY

    await expect(
      sendMail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })
    ).rejects.toThrow(/Aucun fournisseur email/)
  })

  it('falls back to resend when smtp fails', async () => {
    process.env.EMAIL_PROVIDER = 'auto'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.RESEND_API_KEY = 're_test'

    vi.mocked(sendViaSmtp).mockRejectedValue(new Error('SMTP down'))
    vi.mocked(sendViaResend).mockResolvedValue({ provider: 'resend', messageId: 'msg_1' })

    const result = await sendMail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })

    expect(sendViaSmtp).toHaveBeenCalledOnce()
    expect(sendViaResend).toHaveBeenCalledOnce()
    expect(result.provider).toBe('resend')
  })

  it('uses smtp when it succeeds', async () => {
    process.env.EMAIL_PROVIDER = 'auto'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.RESEND_API_KEY = 're_test'

    vi.mocked(sendViaSmtp).mockResolvedValue({ provider: 'smtp', messageId: 'smtp_1' })

    const result = await sendMail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })

    expect(sendViaSmtp).toHaveBeenCalledOnce()
    expect(sendViaResend).not.toHaveBeenCalled()
    expect(result.provider).toBe('smtp')
  })
})
