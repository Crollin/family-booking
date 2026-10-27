/**
 * Système de rate limiting en mémoire
 * Pour usage familial, un système en mémoire suffit
 * Pour production à grande échelle, considérer Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Stockage en mémoire des tentatives
const rateLimitStore = new Map<string, RateLimitEntry>()

// Nettoyage automatique toutes les 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
setInterval(() => {
  const now = Date.now()
  // Utiliser forEach pour compatibilité ES5
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  })
}, CLEANUP_INTERVAL)

interface RateLimitOptions {
  windowMs: number // Fenêtre de temps en millisecondes
  maxRequests: number // Nombre maximum de requêtes
  identifier: string // Identifiant unique (IP, email, etc.)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number // Secondes avant de pouvoir réessayer
}

/**
 * Vérifie si une requête est autorisée selon les limites de taux
 * @param options Options de rate limiting
 * @returns Résultat de la vérification
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { windowMs, maxRequests, identifier } = options
  const now = Date.now()
  const key = identifier

  // Récupérer ou créer l'entrée
  let entry = rateLimitStore.get(key)

  // Si l'entrée existe et est expirée, la réinitialiser
  if (entry && entry.resetAt < now) {
    entry = undefined
    rateLimitStore.delete(key)
  }

  // Si pas d'entrée, créer une nouvelle
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier si la limite est dépassée
  const allowed = entry.count <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.count)
  const retryAfter = !allowed ? Math.ceil((entry.resetAt - now) / 1000) : undefined

  // Sauvegarder l'entrée
  rateLimitStore.set(key, entry)

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  }
}

/**
 * Rate limiting par IP
 * @param ip L'adresse IP
 * @param windowMs Fenêtre de temps en millisecondes (défaut: 15 minutes)
 * @param maxRequests Nombre maximum de requêtes (défaut: 5)
 */
export function rateLimitByIP(
  ip: string | undefined,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 5
): RateLimitResult {
  if (!ip) {
    // Si pas d'IP, autoriser (peut arriver en développement)
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs,
    }
  }

  return checkRateLimit({
    identifier: `ip:${ip}`,
    windowMs,
    maxRequests,
  })
}

/**
 * Rate limiting par email
 * @param email L'adresse email
 * @param windowMs Fenêtre de temps en millisecondes (défaut: 15 minutes)
 * @param maxRequests Nombre maximum de requêtes (défaut: 5)
 */
export function rateLimitByEmail(
  email: string | undefined,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 5
): RateLimitResult {
  if (!email) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs,
    }
  }

  return checkRateLimit({
    identifier: `email:${email.toLowerCase()}`,
    windowMs,
    maxRequests,
  })
}

/**
 * Extrait l'adresse IP depuis une requête Next.js
 * @param request La requête HTTP
 * @returns L'adresse IP ou undefined
 */
export function getClientIP(request: Request): string | undefined {
  // Essayer d'abord les headers proxy
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return undefined
}

/**
 * Crée une réponse HTTP pour un rate limit dépassé
 * @param result Résultat du rate limiting
 * @returns NextResponse avec les headers appropriés
 */
export function createRateLimitResponse(result: RateLimitResult) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', '5')
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString())
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return new Response(
    JSON.stringify({
      error: 'Trop de tentatives',
      message: `Trop de tentatives. Veuillez réessayer dans ${result.retryAfter} secondes.`,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers.entries()),
      },
    }
  )
}

