import { cookies, headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { checkSupabaseHealthWithClient } from './supabase-diagnostics'
import { getAnonKey, getPublicUrl, getServiceRoleKey, getSupabaseServerUrl } from './runtime-env'
import { AUTH_COOKIE_NAME } from './auth-cookie'

export type { Database }

// Dans un réseau Docker, l'URL publique n'est pas résolvable depuis le
// conteneur : SUPABASE_INTERNAL_URL donne le chemin direct vers la passerelle.
const supabaseUrl = getSupabaseServerUrl()
const supabaseAnonKey = getAnonKey()
const supabaseServiceRoleKey = getServiceRoleKey()

function resolveCookieOptions(protocol?: string | null) {
  const isHttps = protocol === 'https:' || protocol === 'https'

  return {
    // Ne sert qu'à partager la session entre sous-domaines ; non renseigné, le
    // cookie reste attaché à l'hôte courant, ce qui convient partout ailleurs.
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    sameSite: 'lax' as const,
    secure: isHttps,
  }
}

/**
 * Client Supabase pour Route Handlers / Server Actions (cookies via @supabase/ssr)
 */
export async function createServerSupabaseClient(_request?: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configuration Supabase absente : renseignez PUBLIC_URL et ANON_KEY dans .env'
    )
  }

  // Next 14: sync; Next 15+: async — support both during upgrades
  const cookieStoreResult = cookies() as ReturnType<typeof cookies> | Promise<ReturnType<typeof cookies>>
  const cookieStore = await Promise.resolve(cookieStoreResult)
  const headersResult = headers() as ReturnType<typeof headers> | Promise<ReturnType<typeof headers>>
  const hdrs = await Promise.resolve(headersResult)
  const cookieOptions = resolveCookieOptions(hdrs.get('x-forwarded-proto'))

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, ...cookieOptions })
          })
        } catch {
          // Called from a Server Component — ignore if middleware refreshes sessions
        }
      },
    },
  })
}

export function createServiceRoleClient() {
  if (!supabaseUrl) {
    throw new Error("PUBLIC_URL n'est pas définie")
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SERVICE_ROLE_KEY n'est pas définie")
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Client middleware — refresh session cookies
 */
export async function createMiddlewareClient(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const cookieOptions = resolveCookieOptions(
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol
  )

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { ...options, ...cookieOptions })
        })
      },
    },
  })

  return { supabase, response }
}

export async function healthCheck(client?: ReturnType<typeof createServiceRoleClient>) {
  const supabase = client || createServiceRoleClient()
  return await checkSupabaseHealthWithClient(supabase)
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      const errorMessage = error?.message || ''
      if (
        !errorMessage.includes('fetch failed') &&
        !errorMessage.includes('ECONNREFUSED') &&
        !errorMessage.includes('Failed to connect') &&
        !errorMessage.includes('AbortError')
      ) {
        throw error
      }
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, initialDelay * Math.pow(2, attempt))
      )
    }
  }

  throw lastError
}

export function validateSupabaseEnv() {
  const missing: string[] = []
  if (!getPublicUrl()) missing.push('PUBLIC_URL')
  if (!getAnonKey()) missing.push('ANON_KEY')
  if (!getServiceRoleKey()) missing.push('SERVICE_ROLE_KEY')
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement Supabase manquantes: ${missing.join(', ')}`)
  }
}
