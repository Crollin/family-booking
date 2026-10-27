export type ClaimedInvitation = {
  id: string
  email: string
  token: string
  expires_at: string
}

export type ClaimInvitationResult =
  | { ok: true; invitation: ClaimedInvitation }
  | { ok: false; error: 'used_or_expired' }

export async function claimInvitation(
  supabase: { from: (table: string) => any },
  args: { token: string; email: string }
): Promise<ClaimInvitationResult> {
  const { data, error } = await supabase
    .from('invitations')
    .update({ used: true })
    .eq('token', args.token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .eq('email', args.email)
    .select('id, email, token, expires_at')
    .single()

  if (error || !data) {
    return { ok: false, error: 'used_or_expired' }
  }
  return { ok: true, invitation: data as ClaimedInvitation }
}

export async function releaseInvitation(
  supabase: { from: (table: string) => any },
  invitationId: string
): Promise<void> {
  await supabase.from('invitations').update({ used: false }).eq('id', invitationId)
}
