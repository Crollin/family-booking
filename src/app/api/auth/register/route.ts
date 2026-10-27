import { NextResponse } from 'next/server'
import { createServiceRoleClient, healthCheck, retryWithBackoff, validateSupabaseEnv } from '@/lib/supabase'
import { UserRole } from '@/types'
import { validateAndNormalizeRole } from '@/lib/role-helpers'
import { getFriendlyErrorMessage } from '@/lib/supabase-diagnostics'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { rateLimitByIP, rateLimitByEmail, getClientIP, createRateLimitResponse } from '@/lib/rate-limit'
import { passwordSchema } from '@/lib/validation'
import { getSupabaseServerUrl } from '@/lib/runtime-env'
import { claimInvitation, releaseInvitation } from '@/lib/claim-invitation'

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

async function cleanupFailedRegistration(
  supabase: ServiceRoleClient,
  createdAuthUserId?: string,
  claimedInvitationId?: string
): Promise<void> {
  if (createdAuthUserId) {
    await supabase.auth.admin.deleteUser(createdAuthUserId)
  }
  if (claimedInvitationId) {
    await releaseInvitation(supabase, claimedInvitationId)
  }
}

export async function POST(request: Request) {
  let claimedInvitationId: string | undefined
  let createdAuthUserId: string | undefined
  let supabase: ServiceRoleClient | undefined

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

    // Rate limiting par IP
    const clientIP = getClientIP(request)
    const ipRateLimit = rateLimitByIP(clientIP, 15 * 60 * 1000, 5) // 5 tentatives par 15 minutes
    if (!ipRateLimit.allowed) {
      return createRateLimitResponse(ipRateLimit)
    }

    const { name, email, password, token, turnstileToken } = await request.json()

    // Rate limiting par email
    const emailRateLimit = rateLimitByEmail(email, 15 * 60 * 1000, 3) // 3 tentatives par 15 minutes par email
    if (!emailRateLimit.allowed) {
      return createRateLimitResponse(emailRateLimit)
    }

    if (!name || !email || !password || !token) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis (nom, email, mot de passe, token)' },
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

    const passwordValidation = passwordSchema.safeParse(password)
    if (!passwordValidation.success) {
      return NextResponse.json(
        { error: passwordValidation.error.issues[0].message },
        { status: 400 }
      )
    }

    // Valider Turnstile si configuré
    if (process.env.TURNSTILE_SECRET_KEY) {
      const clientIP = getClientIP(request)
      const turnstileValidation = await verifyTurnstileToken(turnstileToken, clientIP)
      
      if (!turnstileValidation.valid) {
        return NextResponse.json(
          { error: turnstileValidation.error || 'Vérification de sécurité échouée' },
          { status: 400 }
        )
      }
    }

    const client = createServiceRoleClient()
    supabase = client
    
    // Vérifier la santé de Supabase avant toute opération
    const health = await healthCheck(client)
    
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

    const claim = await claimInvitation(client, { token, email })
    if (!claim.ok) {
      return NextResponse.json(
        { error: 'Invitation invalide, expirée ou déjà utilisée' },
        { status: 400 }
      )
    }
    claimedInvitationId = claim.invitation.id

    // Vérifier si l'utilisateur existe déjà dans la table users avec retry
    const { data: existingUser } = await retryWithBackoff(async () => {
      return await client
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
    })

    if (existingUser) {
      await cleanupFailedRegistration(client, createdAuthUserId, claimedInvitationId)
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Valider et normaliser le rôle MEMBER avant création
    const memberRole = validateAndNormalizeRole(UserRole.MEMBER)
    
    // Créer l'utilisateur dans Supabase Auth avec le mot de passe fourni avec retry
    let authUser: any
    let createError: any = null
    
    try {
      const result = await retryWithBackoff(async () => {
        const createResult = await client.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name,
            role: memberRole,
          },
        })
        
        if (createResult.error) {
          throw createResult.error
        }
        
        return createResult
      })
      
      authUser = result
    } catch (error: any) {
      createError = error
    }

    // Extraire l'utilisateur créé (le SDK peut renvoyer data.user ou user directement)
    const createdUser = authUser?.data?.user || authUser?.user
    if (createdUser) {
      createdAuthUserId = createdUser.id
    }

    if (createError || !createdUser) {
      console.error('Error creating user:', createError)
      await cleanupFailedRegistration(client, createdAuthUserId, claimedInvitationId)

      // Gérer les erreurs spécifiques
      if (createError?.message?.includes('already registered') || createError?.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 400 }
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

    // Le trigger handle_new_user devrait créer automatiquement l'utilisateur dans public.users
    // Attendre un peu pour que le trigger s'exécute
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Vérifier si l'utilisateur existe déjà dans public.users (créé par le trigger)
    const { data: triggerCreatedUser } = await client
      .from('users')
      .select('id, role')
      .eq('id', createdUser.id)
      .single()
    
    if (!triggerCreatedUser) {
      // Le trigger n'a pas fonctionné, créer manuellement
      console.log('Trigger n\'a pas créé l\'utilisateur, création manuelle...')
      const { error: upsertError } = await client.rpc('upsert_user_from_auth', {
        p_id: createdUser.id,
        p_email: createdUser.email!,
        p_raw_user_meta: {
          name,
          role: memberRole,
        },
      })
      
      if (upsertError) {
        console.error('Erreur lors de la création de l\'utilisateur dans public.users:', upsertError)
        
        // Fallback: créer directement si la fonction RPC échoue
        const { error: insertError } = await client
          .from('users')
          .insert({
            id: createdUser.id,
            email: createdUser.email!,
            name,
            role: memberRole,
          })
        
        if (insertError) {
          console.error('Error inserting user manually:', insertError)
          await cleanupFailedRegistration(client, createdAuthUserId, claimedInvitationId)
          return NextResponse.json(
            { error: 'Une erreur est survenue lors de la création du compte' },
            { status: 500 }
          )
        }
      }
    } else if (triggerCreatedUser.role !== memberRole) {
      // L'utilisateur existe mais avec le mauvais rôle, corriger
      console.log(`Correction du rôle: ${triggerCreatedUser.role} -> ${memberRole}`)
      const { error: updateError } = await client
        .from('users')
        .update({ role: memberRole })
        .eq('id', createdUser.id)
      
      if (updateError) {
        console.error('Erreur lors de la correction du rôle:', updateError)
      }
    }

    // Vérifier que l'utilisateur a été créé dans public.users
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, email, name')
      .eq('id', createdUser.id)
      .single()

    if (userError || !user) {
      console.error('Error fetching created user:', userError)
      await cleanupFailedRegistration(client, createdAuthUserId, claimedInvitationId)
      return NextResponse.json(
        { error: 'L\'utilisateur a été créé dans auth mais pas dans public.users.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Compte créé avec succès',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name,
        avatarUrl: null,
      },
    })
  } catch (error: any) {
    if (supabase) {
      await cleanupFailedRegistration(supabase, createdAuthUserId, claimedInvitationId)
    }
    console.error('Erreur lors de l\'inscription:', error)
    const errorMessage = getFriendlyErrorMessage(error)
    
    // Détecter les erreurs de connexion
    const isConnectionError = 
      errorMessage.includes('fetch failed') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('Impossible de se connecter')
    
    return NextResponse.json(
      { 
        error: isConnectionError ? 'Impossible de se connecter à Supabase' : 'Une erreur est survenue lors de l\'inscription',
        message: errorMessage,
        supabaseUrl: getSupabaseServerUrl(),
      },
      { status: isConnectionError ? 503 : 500 }
    )
  }
}
