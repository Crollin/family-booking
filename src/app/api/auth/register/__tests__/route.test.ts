import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')

describe('register invitation cleanup (source contracts)', () => {
  it('tracks claimed invitation and created Auth user for failure cleanup', () => {
    expect(routeSource).toMatch(/claimedInvitationId/)
    expect(routeSource).toMatch(/createdAuthUserId/)
    expect(routeSource).toMatch(/cleanupFailedRegistration/)
  })

  it('deletes Auth user then releases invitation in cleanupFailedRegistration', () => {
    const helperStart = routeSource.indexOf('async function cleanupFailedRegistration')
    const helperEnd = routeSource.indexOf('export async function POST')
    expect(helperStart).toBeGreaterThan(-1)
    expect(helperEnd).toBeGreaterThan(helperStart)
    const helper = routeSource.slice(helperStart, helperEnd)
    const deleteIdx = helper.indexOf('deleteUser')
    const releaseIdx = helper.indexOf('releaseInvitation')
    expect(deleteIdx).toBeGreaterThan(-1)
    expect(releaseIdx).toBeGreaterThan(deleteIdx)
  })

  it('releases invitation on createUser failure, public.users 500s, and outer catch', () => {
    expect(routeSource).toMatch(
      /if \(createError \|\| !createdUser\)[\s\S]*?cleanupFailedRegistration\((?:client|supabase), createdAuthUserId, claimedInvitationId\)/
    )
    expect(routeSource).toMatch(
      /if \(insertError\)[\s\S]*?cleanupFailedRegistration\((?:client|supabase), createdAuthUserId, claimedInvitationId\)/
    )
    expect(routeSource).toMatch(
      /if \(userError \|\| !user\)[\s\S]*?cleanupFailedRegistration\((?:client|supabase), createdAuthUserId, claimedInvitationId\)/
    )
    const catchIdx = routeSource.lastIndexOf('} catch (error')
    expect(catchIdx).toBeGreaterThan(-1)
    expect(routeSource.slice(catchIdx)).toMatch(
      /cleanupFailedRegistration\(supabase, createdAuthUserId, claimedInvitationId\)/
    )
  })
})
