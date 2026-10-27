import { createServerSupabaseClient, createServiceRoleClient } from './supabase'
import { UserRole } from '@/types'
import { validateAndNormalizeRole } from './role-helpers'

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
  role: UserRole
}

/**
 * Récupère la session utilisateur actuelle depuis Supabase.
 * Source de vérité du rôle : public.users uniquement.
 * Ne synchronise JAMAIS le rôle depuis user_metadata (élévation de privilèges).
 */
export async function getServerSession(request?: Request): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabaseClient(request)

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return null
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      // Bootstrap avec service role uniquement si la ligne public.users manque
      // (trigger auth manquant) — le rôle vient de metadata UNIQUEMENT à la création
      // et seulement si aucun autre admin n'existe encore pour ADMIN, sinon MEMBER.
      try {
        const serviceSupabase = createServiceRoleClient()
        const authName = (authUser.user_metadata?.name as string | undefined) || null
        const metaRole = authUser.user_metadata?.role as string | undefined

        const { count } = await serviceSupabase
          .from('users')
          .select('id', { count: 'exact', head: true })

        // Ne jamais créer un ADMIN depuis metadata si des users existent déjà
        let roleToInsert: UserRole = UserRole.MEMBER
        if ((count ?? 0) === 0 && metaRole === UserRole.ADMIN) {
          roleToInsert = UserRole.ADMIN
        } else if (metaRole === UserRole.MEMBER || metaRole === UserRole.ADMIN) {
          // Si des users existent, forcer MEMBER même si metadata dit ADMIN
          roleToInsert = UserRole.MEMBER
        }

        const { error: upsertError } = await serviceSupabase.rpc('upsert_user_from_auth', {
          p_id: authUser.id,
          p_email: authUser.email!,
          p_raw_user_meta: {
            name: authName,
            role: roleToInsert,
          },
        })

        if (!upsertError) {
          const { data: newUser } = await serviceSupabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', authUser.id)
            .single()

          if (newUser) {
            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              avatarUrl: authUser.user_metadata?.avatar_url || null,
              role: newUser.role as UserRole,
            }
          }
        }
      } catch (syncError) {
        console.error('Error bootstrapping user from auth:', syncError)
      }

      return null
    }

    // public.users.role est la seule source de vérité — jamais écrasé par metadata
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: authUser.user_metadata?.avatar_url || null,
      role: user.role as UserRole,
    }
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

export async function getRequiredServerSession(request?: Request): Promise<SessionUser> {
  const session = await getServerSession(request)

  if (!session) {
    throw new Error('Unauthenticated')
  }

  return session
}

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession()
  return session?.role === UserRole.ADMIN || false
}

export async function requireAdmin(request?: Request): Promise<SessionUser> {
  const session = await getRequiredServerSession(request)

  if (session.role !== UserRole.ADMIN) {
    throw new Error('Forbidden: Admin access required')
  }

  return session
}

export async function getUserById(userId: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function getUserByEmail(email: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('email', email)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Met à jour le rôle — écrit d'abord dans public.users (source de vérité),
 * puis aligne auth metadata pour affichage uniquement.
 */
export async function updateUserRole(userId: string, role: UserRole) {
  const normalizedRole = validateAndNormalizeRole(role)
  const supabase = createServiceRoleClient()

  const { error: dbError } = await supabase
    .from('users')
    .update({ role: normalizedRole })
    .eq('id', userId)

  if (dbError) {
    throw dbError
  }

  const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId)
  if (getUserError) {
    throw getUserError
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...authUser.user.user_metadata,
      role: normalizedRole,
    },
  })

  if (authError) {
    throw authError
  }
}

export async function syncAdminRoles() {
  const supabase = createServiceRoleClient()

  const { data: usersToSync, error: queryError } = await supabase.rpc(
    'get_users_needing_role_sync'
  )

  if (queryError) {
    throw queryError
  }

  if (!usersToSync || usersToSync.length === 0) {
    return { synced: 0, message: 'Aucun utilisateur à synchroniser' }
  }

  const results = []

  for (const user of usersToSync) {
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(
        user.user_id
      )

      if (getUserError) {
        results.push({ userId: user.user_id, success: false, error: getUserError.message })
        continue
      }

      // Aligner metadata → public.users (public reste la vérité)
      const updatedMetadata = {
        ...authUser.user.user_metadata,
        role: user.public_role,
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.user_id, {
        user_metadata: updatedMetadata,
      })

      if (updateError) {
        results.push({ userId: user.user_id, success: false, error: updateError.message })
      } else {
        results.push({ userId: user.user_id, success: true })
      }
    } catch (error: any) {
      results.push({ userId: user.user_id, success: false, error: error.message })
    }
  }

  const synced = results.filter((r) => r.success).length

  return {
    synced,
    total: usersToSync.length,
    results,
  }
}
