import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'
import { UserRole } from '@/types'

const AUTH_TIMEOUT_MS = 5_000

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`auth timed out after ${ms}ms`)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function checkBasicAuth(request: NextRequest): boolean {
  const basicAuthEnabled = process.env.BASIC_AUTH_ENABLED === 'true'

  if (!basicAuthEnabled) {
    return true
  }

  const basicAuthUser = process.env.BASIC_AUTH_USER
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD

  // Fail-closed in production when enabled without credentials
  if (!basicAuthUser || !basicAuthPassword) {
    if (process.env.NODE_ENV === 'production') {
      return false
    }
    return true
  }

  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  const base64Credentials = authHeader.substring(6)
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')

  return username === basicAuthUser && password === basicAuthPassword
}

export async function middleware(request: NextRequest) {
  const isBasicAuthValid = checkBasicAuth(request)

  if (!isBasicAuthValid) {
    return new NextResponse('Authentification requise', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${process.env.SITE_NAME?.trim() || 'Family Lodge'} - Accès privé"`,
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    })
  }

  // Skip session gate for cron (Bearer) and public auth APIs
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/cron') || path.startsWith('/api/health')) {
    return NextResponse.next()
  }

  const { supabase, response } = await createMiddlewareClient(request)

  let authUser: { id: string } | null = null
  let userRole: UserRole | undefined
  let hasAppUser = false

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS)
    authUser = user

    if (authUser?.id) {
      // Session applicative = auth Supabase + ligne public.users (évite boucle login/dashboard)
      const { data: dbUser } = await withTimeout(
        supabase.from('users').select('role').eq('id', authUser.id).single(),
        AUTH_TIMEOUT_MS
      )

      hasAppUser = !!dbUser
      userRole = dbUser?.role as UserRole | undefined
    }
  } catch (err) {
    // Supabase injoignable / lent : ne pas bloquer la réponse HTTP (Firefox freeze)
    console.error('[middleware] auth check failed:', err)
    authUser = null
    hasAppUser = false
  }

  const isFullyAuthenticated = !!authUser && hasAppUser

  if (path === '/') {
    if (isFullyAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (path.startsWith('/login')) {
    if (isFullyAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (path.startsWith('/register')) {
    if (isFullyAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (path.startsWith('/set-password') || path.startsWith('/api/auth')) {
    return response
  }

  if (!isFullyAuthenticated) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(redirectUrl)
  }

  if (path.startsWith('/admin')) {
    if (userRole !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  const securityHeaders = {
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  }

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
