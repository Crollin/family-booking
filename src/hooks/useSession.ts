'use client'

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { SessionUser } from '@/lib/auth-helpers'
import { UserRole } from '@/types'

const SESSION_TIMEOUT_MS = 8_000

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
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

export function useSession() {
  const [session, setSession] = useState<{ user: SessionUser | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClientSupabaseClient()

    const fetchUser = async (authUser: any): Promise<SessionUser | null> => {
      if (!authUser) return null

      const { data: user, error } = await withTimeout(
        supabase.from('users').select('id, email, name, role').eq('id', authUser.id).single(),
        SESSION_TIMEOUT_MS,
        'users lookup'
      )

      if (!error && user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: authUser.user_metadata?.avatar_url || null,
          role: user.role as UserRole,
        }
      }

      return null
    }

    const initializeSession = async () => {
      try {
        const {
          data: { session: authSession },
          error: sessionError,
        } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, 'getSession')

        if (sessionError || !authSession) {
          if (!cancelled) {
            setSession({ user: null })
            setLoading(false)
          }
          return
        }

        // getUser() contacte le serveur Auth — peut bloquer si URL injoignable
        let {
          data: { user: authUser },
          error: userError,
        } = await withTimeout(supabase.auth.getUser(), SESSION_TIMEOUT_MS, 'getUser')

        if (userError || !authUser) {
          // Ne pas refreshSession en boucle : échec → session nulle
          if (!cancelled) {
            setSession({ user: null })
            setLoading(false)
          }
          return
        }

        const user = await fetchUser(authUser)
        if (!cancelled) {
          setSession(user ? { user } : { user: null })
          setLoading(false)
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de la session:", error)
        if (!cancelled) {
          setSession({ user: null })
          setLoading(false)
        }
      }
    }

    initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      // Éviter le double fetch au montage (INITIAL_SESSION déjà couvert)
      if (event === 'INITIAL_SESSION') return

      try {
        const authUser = authSession?.user || null
        const user = authUser ? await fetchUser(authUser) : null
        if (!cancelled) {
          setSession(user ? { user } : { user: null })
          setLoading(false)
        }
      } catch (error) {
        console.error('Erreur onAuthStateChange:', error)
        if (!cancelled) {
          setSession({ user: null })
          setLoading(false)
        }
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { data: session, status: loading ? 'loading' : 'authenticated' }
}
