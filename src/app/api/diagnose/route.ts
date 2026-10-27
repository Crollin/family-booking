import { NextResponse } from 'next/server'
import { createServiceRoleClient, healthCheck, validateSupabaseEnv } from '@/lib/supabase'
import { getServerSession } from '@/lib/auth-helpers'
import { UserRole } from '@/types'
import { diagnoseSupabase, getFriendlyErrorMessage } from '@/lib/supabase-diagnostics'
import { getMailConfigStatus } from '@/lib/mail/send'
import { getSupabaseServerUrl } from '@/lib/runtime-env'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent accéder au diagnostic
    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 }
      )
    }

    // Vérifier les variables d'environnement
    try {
      validateSupabaseEnv()
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Configuration Supabase manquante',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // Vérifier la santé de Supabase
    const health = await healthCheck(supabase)
    
    const report: any = {
      timestamp: new Date().toISOString(),
      user: {
        id: session.id,
        email: session.email,
        avatarUrl: session.avatarUrl || null,
        role: session.role,
      },
      connection: {
        healthy: health.healthy,
        error: health.error,
        url: getSupabaseServerUrl(),
      },
      checks: {},
      issues: [],
      recommendations: [],
    }

    report.checks.email = getMailConfigStatus()
    if (!report.checks.email.activeProvider) {
      report.issues.push('Aucun fournisseur email configuré (SMTP ou Resend)')
      report.recommendations.push('Configurer SMTP_HOST ou RESEND_API_KEY dans les variables d\'environnement')
    }

    // Si Supabase n'est pas accessible, retourner un rapport minimal
    if (!health.healthy) {
      report.issues.push(`Supabase n'est pas accessible: ${health.error}`)
      report.recommendations.push('Vérifiez que Supabase est démarré et accessible')
      report.recommendations.push('Vérifiez les variables d\'environnement PUBLIC_URL et SERVICE_ROLE_KEY')
      return NextResponse.json(report)
    }

    // Vérifier la synchronisation auth/users
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(50)

      if (error) {
        report.issues.push('Impossible de récupérer les utilisateurs')
      } else {
        const syncIssues: any[] = []
        
        for (const user of users || []) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
            
            if (!authUser?.user) {
              syncIssues.push({
                email: user.email,
                issue: 'Existe dans public.users mais pas dans auth.users',
              })
              continue
            }

            const authRole = authUser.user.user_metadata?.role
            if (user.role === 'ADMIN' && authRole !== 'ADMIN') {
              syncIssues.push({
                email: user.email,
                issue: `ADMIN dans public.users, ${authRole || 'NULL'} dans auth.users`,
                needsSync: true,
              })
            }
          } catch (err: any) {
            syncIssues.push({
              email: user.email,
              issue: `Erreur: ${err.message}`,
            })
          }
        }

        report.checks.userSync = {
          totalUsers: users?.length || 0,
          syncIssues: syncIssues.length,
          issues: syncIssues,
        }

        if (syncIssues.length > 0) {
          report.recommendations.push('Exécuter scripts/fix-admin-role-sync.js pour synchroniser les rôles')
        }
      }
    } catch (err: any) {
      report.issues.push(`Erreur lors de la vérification de synchronisation: ${err.message}`)
    }

    // Vérifier les fonctions SQL
    try {
      const functions = ['is_admin', 'upsert_user_from_auth', 'get_users_needing_role_sync']
      const functionStatus: any = {}

      for (const funcName of functions) {
        try {
          if (funcName === 'is_admin') {
            const { error } = await supabase.rpc('is_admin', {
              user_id: '00000000-0000-0000-0000-000000000000',
            })
            functionStatus[funcName] = error?.code === '42883' ? 'missing' : 'exists'
          } else if (funcName === 'get_users_needing_role_sync') {
            const { error } = await supabase.rpc('get_users_needing_role_sync')
            functionStatus[funcName] = error?.code === '42883' ? 'missing' : 'exists'
          } else {
            functionStatus[funcName] = 'checked'
          }
        } catch (err: any) {
          functionStatus[funcName] = `error: ${err.message}`
        }
      }

      report.checks.functions = functionStatus
    } catch (err: any) {
      report.issues.push(`Erreur lors de la vérification des fonctions: ${err.message}`)
    }

    // Vérifier les réservations
    try {
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, user_id, status')
        .limit(10)

      if (error) {
        report.issues.push(`Impossible d'accéder à la table reservations: ${getFriendlyErrorMessage(error)}`)
      } else {
        report.checks.reservations = {
          accessible: true,
          count: reservations?.length || 0,
        }
      }
    } catch (err: any) {
      report.issues.push(`Erreur lors de la vérification des réservations: ${getFriendlyErrorMessage(err)}`)
    }

    // Vérifier les tables principales
    try {
      const tables = ['users', 'invitations', 'reservations', 'property_info']
      const tableStatus: any = {}
      
      for (const tableName of tables) {
        try {
          const { error } = await supabase
            .from(tableName as any)
            .select('id')
            .limit(1)
          
          tableStatus[tableName] = error ? {
            accessible: false,
            error: getFriendlyErrorMessage(error)
          } : {
            accessible: true
          }
        } catch (err: any) {
          tableStatus[tableName] = {
            accessible: false,
            error: getFriendlyErrorMessage(err)
          }
        }
      }
      
      report.checks.tables = tableStatus
    } catch (err: any) {
      report.issues.push(`Erreur lors de la vérification des tables: ${getFriendlyErrorMessage(err)}`)
    }

    // Vérifier la session actuelle
    try {
      const { data: currentUser, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', session.id)
        .single()

      if (error) {
        report.issues.push(`Utilisateur actuel non trouvé dans public.users: ${error.message}`)
      } else {
        report.checks.currentUser = {
          existsInPublicUsers: true,
          role: currentUser.role,
          matchesSession: currentUser.role === session.role,
        }

        if (currentUser.role !== session.role) {
          report.issues.push('Le rôle dans la session ne correspond pas au rôle dans public.users')
        }
      }
    } catch (err: any) {
      report.issues.push(`Erreur lors de la vérification de l'utilisateur actuel: ${err.message}`)
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Erreur lors du diagnostic:', error)
    const errorMessage = getFriendlyErrorMessage(error)
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue lors du diagnostic',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

