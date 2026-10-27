import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstileToken } from '../turnstile'

describe('verifyTurnstileToken', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('laisse passer quand le CAPTCHA n\'est pas configuré', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'production'

    // Sans clé secrète, aucun widget n'est affiché : exiger un jeton
    // empêcherait toute création de compte sur une installation par défaut.
    await expect(verifyTurnstileToken(null)).resolves.toEqual({ valid: true })
  })

  it('traite une clé vide comme une absence de configuration', async () => {
    process.env.TURNSTILE_SECRET_KEY = '   '

    await expect(verifyTurnstileToken(null)).resolves.toEqual({ valid: true })
  })

  it('exige un jeton dès que le CAPTCHA est configuré', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    const result = await verifyTurnstileToken(null)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/manquant/i)
  })

  it('refuse un jeton rejeté par Cloudflare', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      })
    )

    const result = await verifyTurnstileToken('jeton-invalide')

    expect(result.valid).toBe(false)
    consoleWarn.mockRestore()
  })

  it('accepte un jeton validé par Cloudflare', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    )

    await expect(verifyTurnstileToken('jeton-valide')).resolves.toEqual({ valid: true })
  })
})
