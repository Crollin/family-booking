import { NextResponse } from 'next/server'
import { getServerSession, requireAdmin } from '@/lib/auth-helpers'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import { buildInvitationLink, sendInvitationEmail } from '@/lib/email'
import { getMailConfigStatus } from '@/lib/mail/send'

export async function POST(request: Request) {
  try {
    
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent inviter
    await requireAdmin(request)

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    const clientSupabase = createServiceRoleClient()

    // Vérifier si l'utilisateur existe déjà dans la table users
    const { data: existingUser } = await clientSupabase
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

    // Vérifier si une invitation existe déjà et n'est pas utilisée
    const { data: existingInvitation } = await clientSupabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    // Générer un token unique
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expire dans 7 jours

    // Créer ou régénérer l'invitation en attente
    let invitation = existingInvitation
    let createError = null

    if (existingInvitation) {
      const { data, error } = await clientSupabase
        .from('invitations')
        .update({
          token,
          invited_by: session.id,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingInvitation.id)
        .select()
        .single()

      invitation = data ?? null
      createError = error
    } else {
      const { data, error } = await clientSupabase
        .from('invitations')
        .insert({
          email,
          token,
          invited_by: session.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      invitation = data ?? null
      createError = error
    }

    if (createError || !invitation) {
      throw createError || new Error('Failed to create invitation')
    }

    // L'envoi d'e-mails est facultatif. Sans fournisseur, l'invitation reste
    // valable : l'administrateur transmet le lien lui-même.
    const emailConfigured = getMailConfigStatus().activeProvider !== null

    if (emailConfigured) {
      try {
        await sendInvitationEmail(email, token)
      } catch (emailError: any) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError)
        // Supprimer l'invitation si l'email n'a pas pu être envoyé
        await clientSupabase
          .from('invitations')
          .delete()
          .eq('id', invitation.id)

        return NextResponse.json(
          {
            error: 'Erreur lors de l\'envoi de l\'email d\'invitation',
            details: emailError?.message || emailError?.toString?.() || 'Unknown email error',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: emailConfigured
        ? 'Invitation envoyée avec succès'
        : 'Invitation créée. Transmettez le lien à la personne invitée.',
      emailSent: emailConfigured,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        ...(emailConfigured ? {} : { link: buildInvitationLink(token) }),
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'invitation:', error)
    
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Seuls les admins peuvent voir les invitations
    await requireAdmin(request)

    const clientSupabase = createServiceRoleClient()

    // Récupérer les invitations en attente (non utilisées et non expirées)
    const { data: invitations, error } = await clientSupabase
      .from('invitations')
      .select(`
        id,
        email,
        token,
        invited_by,
        used,
        created_at,
        expires_at,
        inviter:users!invitations_invited_by_fkey(
          id,
          email,
          name
        )
      `)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Formater les données
    const formattedInvitations = invitations?.map((invitation: any) => ({
      id: invitation.id,
      email: invitation.email,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
      inviter: invitation.inviter ? {
        id: invitation.inviter.id,
        email: invitation.inviter.email,
        name: invitation.inviter.name,
      } : null,
    })) || []

    return NextResponse.json(formattedInvitations)
  } catch (error: any) {
    console.error('Erreur lors de la récupération des invitations:', error)
    
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

    // Seuls les admins peuvent supprimer les invitations
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID d\'invitation requis' },
        { status: 400 }
      )
    }

    const clientSupabase = createServiceRoleClient()

    // Supprimer l'invitation
    const { error } = await clientSupabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Invitation supprimée avec succès' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'invitation:', error)
    
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

