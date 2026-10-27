import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertNoError } from '@/db/errors'
import { mapReservationRow } from '@/db/mappers'

type Client = SupabaseClient<Database>

export async function listReservations(client: Client) {
  const { data, error } = await client
    .from('reservations')
    .select(`
      id, user_id, start_date, end_date, status, guests, comment, admin_comment, created_at, updated_at,
      user:users!reservations_user_id_fkey(id, name, email)
    `)
    .order('start_date', { ascending: true })

  assertNoError(error)
  return (data || []).map((row) => mapReservationRow(row as any, { includeEmail: true }))
}

export async function createReservation(
  client: Client,
  input: {
    userId: string
    start: Date
    end: Date
    guests: number
    comment: string | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  }
) {
  const { data, error } = await client.rpc('create_reservation', {
    p_user_id: input.userId,
    p_start: input.start.toISOString(),
    p_end: input.end.toISOString(),
    p_guests: input.guests,
    p_comment: input.comment,
    p_status: input.status,
  })
  assertNoError(error)
  return data
}

export async function decideReservation(
  client: Client,
  input: { id: string; action: 'approve' | 'reject'; adminComment?: string | null }
) {
  const { data, error } = await client.rpc('decide_reservation', {
    p_id: input.id,
    p_action: input.action,
    p_admin_comment: input.adminComment ?? null,
  })
  assertNoError(error)
  return data
}

export async function updateReservation(
  client: Client,
  input: {
    id: string
    start: Date
    end: Date
    guests: number
    comment?: string | null
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null
    adminComment?: string | null
  }
) {
  const { data, error } = await client.rpc('update_reservation_dates', {
    p_id: input.id,
    p_start: input.start.toISOString(),
    p_end: input.end.toISOString(),
    p_guests: input.guests,
    p_comment: input.comment ?? null,
    p_status: input.status ?? null,
    p_admin_comment: input.adminComment ?? null,
  })
  assertNoError(error)
  return data
}

export async function getReservationById(client: Client, id: string) {
  const { data, error } = await client
    .from('reservations')
    .select(`
      id, user_id, start_date, end_date, status, guests, comment, admin_comment, created_at, updated_at,
      user:users!reservations_user_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single()
  assertNoError(error)
  return data
}
