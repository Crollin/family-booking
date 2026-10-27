import { NextResponse } from 'next/server'
import { getServerSession, requireAdmin, updateUserRole } from '@/lib/auth-helpers'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase'
import { UserRole } from '@/types'
import { validateAndNormalizeRole } from '@/lib/role-helpers'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent créer des utilisateurs
    await requireAdmin(request)

    const { email, name, role } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    // Valider et normaliser le rôle (par défaut MEMBER si non fourni)
    let normalizedRole: UserRole
    try {
      normalizedRole = role ? validateAndNormalizeRole(role) : UserRole.MEMBER
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Rôle invalide' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    // Vérifier si l'utilisateur existe déjà dans la table users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Créer l'utilisateur dans auth.users avec un mot de passe temporaire
    // L'utilisateur devra définir son mot de passe via le lien d'invitation
    const { randomBytes } = await import('crypto')
    const tempPassword = randomBytes(32).toString('hex')

    const serviceRoleSupabase = createServiceRoleClient()
    const { data: authUser, error: createError } = await serviceRoleSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // L'utilisateur devra confirmer via le lien
      user_metadata: {
        name: name || null,
        role: normalizedRole,
      },
    })

    if (createError || !authUser.user) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: 'Une erreur est survenue lors de la création de l\'utilisateur' },
        { status: 500 }
      )
    }

    // Créer l'utilisateur dans public.users en utilisant la fonction upsert_user_from_auth
    const { error: upsertError } = await serviceRoleSupabase.rpc('upsert_user_from_auth', {
      p_id: authUser.user.id,
      p_email: authUser.user.email!,
      p_raw_user_meta: {
        name: name || null,
        role: normalizedRole,
      },
    })

    if (upsertError) {
      console.error('Erreur lors de la création de l\'utilisateur dans public.users:', upsertError)
      
      // Fallback: créer directement si la fonction RPC échoue
      const { error: insertError } = await serviceRoleSupabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: authUser.user.email!,
          name: name || null,
          role: normalizedRole,
        })

      if (insertError) {
        console.error('Error inserting user manually:', insertError)
        return NextResponse.json(
          { error: 'Une erreur est survenue lors de la création de l\'utilisateur' },
          { status: 500 }
        )
      }
    }

    // Récupérer l'utilisateur créé depuis la table users
    const { data: createdUser, error: fetchError } = await serviceRoleSupabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', authUser.user.id)
      .single()
    
    if (fetchError || !createdUser) {
      return NextResponse.json(
        { error: 'Une erreur est survenue lors de la création de l\'utilisateur' },
        { status: 500 }
      )
    }

    // Générer un lien de réinitialisation de mot de passe pour que l'utilisateur puisse définir son mot de passe
    const { data: inviteData, error: inviteError } = await serviceRoleSupabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (inviteError) {
      console.error('Error generating reset link:', inviteError)
      // On continue quand même, l'utilisateur pourra utiliser "mot de passe oublié"
    }

    // Récupérer l'utilisateur mis à jour depuis public.users
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', createdUser.id)
      .single()

    // Envoyer l'email avec le lien de définition de mot de passe
    const { sendPasswordSetupEmail } = await import('@/lib/email')
    
    try {
      const inviteLink = inviteData.properties?.action_link
      if (inviteLink) {
        // Extraire le token du lien
        const url = new URL(inviteLink)
        const token = url.searchParams.get('token_hash') || url.hash.split('=')[1]
        
        await sendPasswordSetupEmail(email, token || '', name)
      }
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError)
      // Ne pas supprimer l'utilisateur, mais retourner un avertissement
      return NextResponse.json(
        {
          message: 'Utilisateur créé mais erreur lors de l\'envoi de l\'email',
          user: user || {
            id: createdUser.id,
            email: createdUser.email,
            name: name || null,
            avatarUrl: null,
            role: normalizedRole,
          },
          warning: 'L\'email n\'a pas pu être envoyé. L\'utilisateur pourra utiliser « mot de passe oublié ».',
        },
        { status: 201 }
      )
    }

    return NextResponse.json({
      message: 'Utilisateur créé avec succès',
      user: user || {
        id: createdUser.id,
        email: createdUser.email,
        name: name || null,
        avatarUrl: null,
        role: normalizedRole,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création de l\'utilisateur' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent voir la liste des membres
    await requireAdmin(request)

    const supabase = await createServerSupabaseClient(request)

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        auto_approve_own_reservations,
        created_at,
        reservations:reservations(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Formater les données pour inclure le count des réservations
    const formattedUsers = users?.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url || null,
      role: user.role,
      autoApproveOwnReservations: Boolean(user.auto_approve_own_reservations),
      createdAt: user.created_at,
      _count: {
        reservations: Array.isArray(user.reservations) ? user.reservations.length : 0,
      },
    })) || []

    return NextResponse.json(formattedUsers)
  } catch (error: any) {
    console.error('Erreur lors de la récupération des membres:', error)
    
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent supprimer des membres
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // Ne pas permettre de se supprimer soi-même
    if (userId === session.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous supprimer vous-même' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer d'abord l'identité, puis le profil public pour déclencher
    // les cascades de clés étrangères (réservations, invitations, etc.).
    const serviceRoleSupabase = createServiceRoleClient()
    const { error: deleteError } = await serviceRoleSupabase.auth.admin.deleteUser(userId)

    // Une relance après une suppression Auth réussie doit encore pouvoir
    // nettoyer le profil public si la requête SQL précédente avait échoué.
    if (deleteError && deleteError.code !== 'user_not_found') {
      throw deleteError
    }

    const { error: profileDeleteError } = await serviceRoleSupabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      throw profileDeleteError
    }

    return NextResponse.json({ message: 'Membre supprimé avec succès' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression du membre:', error)
    
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent modifier les membres
    await requireAdmin(request)

    const { userId, role, autoApproveOwnReservations } = await request.json()

    if (!userId || (role === undefined && autoApproveOwnReservations === undefined)) {
      return NextResponse.json(
        { error: 'ID utilisateur et au moins un champ à modifier requis' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient(request)
    const serviceRoleSupabase = createServiceRoleClient()

    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, name, role, auto_approve_own_reservations')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    let nextRole = targetUser.role as UserRole
    let nextAutoApprove = Boolean(targetUser.auto_approve_own_reservations)

    if (role !== undefined) {
      let normalizedRole: UserRole
      try {
        normalizedRole = validateAndNormalizeRole(role)
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || 'Rôle invalide' },
          { status: 400 }
        )
      }

      // Ne pas permettre de changer son propre rôle
      if (userId === session.id) {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas modifier votre propre rôle' },
          { status: 400 }
        )
      }

      await updateUserRole(userId, normalizedRole)
      nextRole = normalizedRole

      // Démotion : le flag devient inerte — le remettre à false
      if (normalizedRole === UserRole.MEMBER) {
        const { error: resetError } = await serviceRoleSupabase
          .from('users')
          .update({ auto_approve_own_reservations: false })
          .eq('id', userId)

        if (resetError) {
          throw resetError
        }
        nextAutoApprove = false
      }
    }

    if (autoApproveOwnReservations !== undefined) {
      if (nextRole !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Cette option est réservée aux administrateurs' },
          { status: 400 }
        )
      }

      const enabled = Boolean(autoApproveOwnReservations)
      const { error: flagError } = await serviceRoleSupabase
        .from('users')
        .update({ auto_approve_own_reservations: enabled })
        .eq('id', userId)

      if (flagError) {
        throw flagError
      }
      nextAutoApprove = enabled
    }

    return NextResponse.json({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: nextRole,
      autoApproveOwnReservations: nextAutoApprove,
    })
  } catch (error: any) {
    console.error('Erreur lors de la modification du membre:', error)
    
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    )
  }
}
