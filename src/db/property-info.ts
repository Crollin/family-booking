import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertNoError } from '@/db/errors'

/** Shape expected by email templates (camelCase). */
export type PropertyInfoEmail = {
  openingTime?: string | null
  closingTime?: string | null
  practicalInfo?: string | null
}

export async function getPropertyInfoSingleton(
  client: SupabaseClient<Database>
): Promise<PropertyInfoEmail | undefined> {
  const { data, error } = await client
    .from('property_info')
    .select(
      'id, opening_time, closing_time, practical_info, opening_checklist, closing_checklist, general_info, created_at, updated_at'
    )
    .eq('id', 'singleton')
    .maybeSingle()

  assertNoError(error)
  if (!data) return undefined

  return {
    openingTime: data.opening_time,
    closingTime: data.closing_time,
    practicalInfo: data.practical_info,
  }
}
