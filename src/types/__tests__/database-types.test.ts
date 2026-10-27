import { describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

describe('Database types', () => {
  it('resolves @/types/database module', async () => {
    // import type is erased at runtime — force module resolution for RED/GREEN
    const mod = await import('@/types/database')
    expect(mod).toBeDefined()
  })

  it('exposes reservations status union', () => {
    type Status = Database['public']['Tables']['reservations']['Row']['status']
    const sample: Status = 'APPROVED'
    expect(sample).toBe('APPROVED')
  })

  it('names local_guide_entries not places', () => {
    type Entry = Database['public']['Tables']['local_guide_entries']['Row']
    const id: Entry['id'] = '00000000-0000-0000-0000-000000000000'
    expect(id).toHaveLength(36)
  })
})
