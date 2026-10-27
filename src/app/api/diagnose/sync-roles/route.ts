import { NextResponse } from 'next/server'
import { requireAdmin, syncAdminRoles } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin(request)

    // Synchroniser les rôles
    const result = await syncAdminRoles()

    return NextResponse.json({
      success: true,
      message: `${result.synced} utilisateur(s) synchronisé(s) sur ${result.total}`,
      ...result,
    })
  } catch (error: any) {
    console.error('Erreur lors de la synchronisation des rôles:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la synchronisation', details: error.message },
      { status: 500 }
    )
  }
}

