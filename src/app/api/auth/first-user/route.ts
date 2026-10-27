import { NextResponse } from 'next/server'
import { createServiceRoleClient, healthCheck, retryWithBackoff, validateSupabaseEnv } from '@/lib/supabase'
import { getFriendlyErrorMessage } from '@/lib/supabase-diagnostics'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { rateLimitByIP, rateLimitByEmail, getClientIP, createRateLimitResponse } from '@/lib/rate-limit'
import { firstUserSchema } from '@/lib/validation'
import { getSupabaseServerUrl } from '@/lib/runtime-env'

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

/**
 * Roll back a failed bootstrap attempt.
 * Delete public.users first; never call deleteUser while a blocking profile row remains.
 */
async function compensateBootstrapAuthUser(
  supabase: ServiceRoleClient,
  authUserId: string
): Promise<void> {
  const { error: profileError } = await supabase
    .from('users')
    .delete()
    .eq('id', authUserId)

  if (profileError) {
    console.error('Compensation bootstrap: échec suppression profil public.users', {
      authUserId,
      error: profileError,
    })
    throw new Error(
      `Compensation bootstrap incomplète: profil bloquant non supprimé (${profileError.message})`
    )
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
  if (authError) {
    console.error('Compensation bootstrap: échec deleteUser', {
      authUserId,
      error: authError,
    })
    throw new Error(
      `Compensation bootstrap incomplète: deleteUser a échoué (${authError.message})`
    )
  }
}

export async function GET() {
  try {
    // Vérifier les variables d'environnement
    try {
      validateSupabaseEnv()
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Configuration Supabase manquante',
          message: error.message,
        },
        { status: 500 }
      )
    }
    
    // Vérifier la santé de Supabase avant toute opération
    const supabase = createServiceRoleClient()
    const health = await healthCheck(supabase)
    
    if (!health.healthy) {
      console.error('Supabase n\'est pas accessible:', health.error)
      return NextResponse.json(
        { 
          error: 'Impossible de se connecter à Supabase',
          message: health.error || 'Vérifiez que Supabase est démarré et accessible.',
          supabaseUrl: getSupabaseServerUrl(),
        },
        { status: 503 }
      )
    }
    
    // Compter les utilisateurs avec retry en cas d'erreur temporaire
    const { count, error } = await retryWithBackoff(async () => {
      const result = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      if (result.error) {
        throw result.error
      }
      
      return result
    })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      isFirstUser: count === 0,
      userCount: count || 0,
    })
  } catch (error: any) {
    const errorMessage = getFriendlyErrorMessage(error)
    
    console.error('Erreur lors de la vérification du premier utilisateur:', {
      message: errorMessage,
      details: error?.toString(),
      hint: error?.hint || '',
      code: error?.code || '',
      supabaseUrl: getSupabaseServerUrl(),
    })
    
    // Détecter les erreurs de connexion
    const isConnectionError = 
      errorMessage.includes('fetch failed') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('Impossible de se connecter')
    
    return NextResponse.json(
      { 
        error: isConnectionError ? 'Impossible de se connecter à Supabase' : 'Une erreur est survenue',
        message: errorMessage,
        supabaseUrl: getSupabaseServerUrl(),
      },
      { status: isConnectionError ? 503 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Vérifier les variables d'environnement
    try {
      validateSupabaseEnv()
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Configuration Supabase manquante',
          message: error.message,
        },
        { status: 500 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Vérifier la santé de Supabase avant toute opération
    const health = await healthCheck(supabase)
    
    if (!health.healthy) {
      console.error('Supabase n\'est pas accessible:', health.error)
      return NextResponse.json(
        { 
          error: 'Impossible de se connecter à Supabase',
          message: health.error || 'Vérifiez que Supabase est démarré et accessible.',
          supabaseUrl: getSupabaseServerUrl(),
        },
        { status: 503 }
      )
    }
    
    // Rate limiting par IP
    const clientIP = getClientIP(request)
    const ipRateLimit = rateLimitByIP(clientIP, 15 * 60 * 1000, 3) // 3 tentatives par 15 minutes
    if (!ipRateLimit.allowed) {
      return createRateLimitResponse(ipRateLimit)
    }
    
    // Récupérer les données de la requête
    const { name, email, password, turnstileToken } = await request.json()
    
    // Rate limiting par email
    const emailRateLimit = rateLimitByEmail(email, 15 * 60 * 1000, 2) // 2 tentatives par 15 minutes par email
    if (!emailRateLimit.allowed) {
      return createRateLimitResponse(emailRateLimit)
    }
    
    // Validation des données
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis (nom, email, mot de passe)' },
        { status: 400 }
      )
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }
    
    // Validation du mot de passe (minimum 12 caractères avec complexité)
    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 12 caractères' },
        { status: 400 }
      )
    }
    
    // Validation de la complexité du mot de passe
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un symbole' },
        { status: 400 }
      )
    }

    const turnstileValidation = await verifyTurnstileToken(turnstileToken, clientIP)
    if (!turnstileValidation.valid) {
      return NextResponse.json(
        { error: turnstileValidation.error || 'Vérification de sécurité échouée' },
        { status: 400 }
      )
    }
    
    // Créer l'utilisateur auth avec retry.
    // Do NOT put ADMIN in user_metadata: handle_new_user would insert ADMIN outside the
    // advisory lock. Omit role so the trigger creates MEMBER; try_create_first_admin then
    // promotes to ADMIN under the lock.
    let authUser: any
    let createError: any = null
    
    try {
      const result = await retryWithBackoff(async () => {
        const createResult = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Confirmer l'email automatiquement pour le premier admin
          user_metadata: {
            name,
          },
        })
        
        if (createResult.error) {
          throw createResult.error
        }
        
        if (!createResult.data || !createResult.data.user) {
          throw new Error('La création de l\'utilisateur a échoué : aucune donnée retournée')
        }
        
        return createResult
      })
      
      authUser = result
    } catch (error: any) {
      createError = error
    }
    
    // Extraire l'utilisateur de la réponse (le SDK peut retourner data.user ou user directement)
    const createdUser = authUser?.data?.user || authUser?.user
    
    if (createError || !createdUser) {
      console.error('Erreur lors de la création de l\'utilisateur:', createError)
      
      // Gérer les erreurs spécifiques
      if (createError?.message?.includes('already registered') || createError?.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 400 }
        )
      }
      
      // Erreur de base de données - probablement problème avec les tables Auth
      if (createError?.message?.includes('Database error') || createError?.status === 500) {
        console.error('Erreur de base de données détectée. Vérifiez que les tables Auth sont créées.')
        return NextResponse.json(
          { 
            error: 'Erreur de base de données lors de la création du compte. Vérifiez que Supabase est correctement configuré et que les migrations Auth sont appliquées.',
            details: process.env.NODE_ENV === 'development' ? createError?.message : undefined
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Une erreur est survenue lors de la création du compte',
          message: getFriendlyErrorMessage(createError),
          details: process.env.NODE_ENV === 'development' ? createError?.message : undefined
        },
        { status: 500 }
      )
    }

    const authUserId = createdUser.id as string

    // RPC clears the trigger-created row for p_id under pg_advisory_xact_lock, then inserts ADMIN.
    const { data: adminRow, error: adminError } = await supabase.rpc('try_create_first_admin', {
      p_id: authUserId,
      p_email: email,
      p_name: name ?? null,
    })

    if (adminError) {
      await compensateBootstrapAuthUser(supabase, authUserId)
      if (adminError.message?.includes('FIRST_USER_EXISTS')) {
        return NextResponse.json({ error: 'Un compte existe déjà' }, { status: 409 })
      }
      throw adminError
    }

    if (!adminRow) {
      await compensateBootstrapAuthUser(supabase, authUserId)
      throw new Error('try_create_first_admin n\'a retourné aucune ligne')
    }

    return NextResponse.json({
      message: 'Compte administrateur créé avec succès',
      user: {
        id: adminRow.id,
        email: adminRow.email,
        name: adminRow.name ?? name,
        avatarUrl: null,
        role: adminRow.role,
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la création du premier utilisateur:', error)
    const errorMessage = getFriendlyErrorMessage(error)
    
    // Détecter les erreurs de connexion
    const isConnectionError = 
      errorMessage.includes('fetch failed') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('Impossible de se connecter')
    
    return NextResponse.json(
      { 
        error: isConnectionError ? 'Impossible de se connecter à Supabase' : 'Une erreur est survenue lors de la création du compte',
        message: errorMessage,
        supabaseUrl: getSupabaseServerUrl(),
      },
      { status: isConnectionError ? 503 : 500 }
    )
  }
}

