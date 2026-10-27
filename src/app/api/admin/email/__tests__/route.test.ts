import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const statusRoutePath = join(process.cwd(), 'src/app/api/admin/email/status/route.ts')
const testRoutePath = join(process.cwd(), 'src/app/api/admin/email/test/route.ts')

describe('admin email routes', () => {
  it('status route requires admin', () => {
    const source = readFileSync(statusRoutePath, 'utf8')
    expect(source).toMatch(/requireAdmin/)
    expect(source).toMatch(/getMailConfigStatus/)
  })

  it('test route requires admin and rate limiting', () => {
    const source = readFileSync(testRoutePath, 'utf8')
    expect(source).toMatch(/requireAdmin/)
    expect(source).toMatch(/rateLimitByEmail/)
    expect(source).toMatch(/canTriggerEmailTest/)
    expect(source).toMatch(/sendTestEmail/)
  })
})
