import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { passwordSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
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

    const supabase = createServiceRoleClient()

    // Vérifier le token et récupérer l'utilisateur
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    })

    if (verifyError || !verifyData.user) {
      // Si le token n'est pas un token OTP, essayer avec updateUser
      // Cela peut être un token de réinitialisation de mot de passe
      try {
        // Extraire l'email du token si possible, sinon on doit utiliser une autre méthode
        // Pour l'instant, on retourne une erreur générique
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 400 }
        )
      } catch (error) {
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      verifyData.user.id,
      {
        password,
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Une erreur est survenue lors de la mise à jour du mot de passe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Mot de passe défini avec succès',
    })
  } catch (error: any) {
    console.error('Erreur lors de la définition du mot de passe:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la définition du mot de passe' },
      { status: 500 }
    )
  }
}
