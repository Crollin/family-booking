/**
 * Validation Cloudflare Turnstile côté serveur
 * Valide le token CAPTCHA avec l'API Cloudflare
 */

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Valide un token Turnstile avec l'API Cloudflare
 * @param token Le token Turnstile à valider
 * @param remoteip L'adresse IP du client (optionnel)
 * @returns true si le token est valide, false sinon
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string
): Promise<{ valid: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()

  // Le CAPTCHA est facultatif. Sans clé secrète, aucun widget n'est présenté au
  // visiteur : il n'y a pas de jeton à vérifier, et exiger le contraire
  // rendrait toute création de compte impossible. Les formulaires restent
  // protégés par la limitation du nombre de tentatives (voir rate-limit.ts).
  if (!secretKey) {
    return { valid: true }
  }

  // Si aucun token n'est fourni, refuser
  if (!token) {
    return { valid: false, error: 'Token Turnstile manquant' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteip) {
      formData.append('remoteip', remoteip)
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    )

    if (!response.ok) {
      console.error('Erreur lors de la vérification Turnstile:', response.statusText)
      return { valid: false, error: 'Erreur lors de la vérification du CAPTCHA' }
    }

    const data: TurnstileVerifyResponse = await response.json()

    if (!data.success) {
      const errorCodes = data['error-codes'] || []
      console.warn('Token Turnstile invalide:', errorCodes)
      return {
        valid: false,
        error: `CAPTCHA invalide: ${errorCodes.join(', ')}`,
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Erreur lors de la vérification Turnstile:', error)
    return { valid: false, error: 'Erreur lors de la vérification du CAPTCHA' }
  }
}

// Note: getClientIP est exporté depuis rate-limit.ts pour éviter la duplication

