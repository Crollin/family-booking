import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('login actions invitation-only', () => {
  it('does not export a public signup action', () => {
    const src = readFileSync(join(__dirname, '../actions.ts'), 'utf8')
    expect(src).not.toMatch(/export async function signup/)
  })
})

describe('supabase auth service config', () => {
  it('disables public signup', () => {
    const compose = readFileSync(join(process.cwd(), 'docker-compose.yml'), 'utf8')
    // Les comptes ne se créent que par invitation ou via le premier admin.
    expect(compose).toMatch(/GOTRUE_DISABLE_SIGNUP:\s*"true"/)
  })
})
