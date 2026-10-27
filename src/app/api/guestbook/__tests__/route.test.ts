import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync(join(__dirname, '../route.ts'), 'utf8')

describe('POST /api/guestbook', () => {
  it('notifie les membres après création d’un souvenir', () => {
    expect(routeSource).toMatch(/notifyMembersOfNewGuestbookEntry/)
    expect(routeSource).toMatch(/authorId:\s*session\.id/)
  })

  it('ne bloque pas la publication si l’e-mail échoue', () => {
    expect(routeSource).toMatch(/catch \(emailError\)/)
    expect(routeSource).toMatch(/notifications livre d/)
    expect(routeSource).toMatch(/return NextResponse\.json\(formattedEntry/)
  })

  it('autorise plusieurs souvenirs pour une même réservation', () => {
    expect(routeSource).not.toMatch(/Un souvenir existe déjà pour cette réservation/)
    expect(routeSource).not.toMatch(/existingEntry/)
  })
})
