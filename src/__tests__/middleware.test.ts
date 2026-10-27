import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase', () => ({
  createMiddlewareClient: vi.fn(),
}))

import { middleware } from '@/middleware'
import { createMiddlewareClient } from '@/lib/supabase'

const mockCreateMiddlewareClient = vi.mocked(createMiddlewareClient)

function makeRequest(path: string) {
  return new NextRequest(new URL(path, 'http://localhost:3000'))
}

function mockSupabase(isAuthenticated: boolean, hasAppUser = isAuthenticated) {
  const response = NextResponse.next()
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: hasAppUser ? { role: 'MEMBER' } : null,
        }),
      })),
    })),
  }))

  mockCreateMiddlewareClient.mockResolvedValue({
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: isAuthenticated ? { id: 'user-1' } : null },
        }),
      },
      from,
    },
    response,
  } as unknown as Awaited<ReturnType<typeof createMiddlewareClient>>)
  return response
}

describe('middleware /register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BASIC_AUTH_ENABLED
  })

  it('passes through unauthenticated GET /register with token', async () => {
    const expectedResponse = mockSupabase(false)
    const request = makeRequest('/register?token=abc')

    const result = await middleware(request)

    expect(result?.status).not.toBe(307)
    expect(result?.status).not.toBe(302)
    expect(result).toBe(expectedResponse)
  })

  it('redirects authenticated GET /register to /dashboard', async () => {
    mockSupabase(true, true)
    const request = makeRequest('/register')

    const result = await middleware(request)

    expect(result?.status).toBe(307)
    expect(result?.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('does not redirect auth-only users without public.users row on /login', async () => {
    const expectedResponse = mockSupabase(true, false)
    const request = makeRequest('/login')

    const result = await middleware(request)

    expect(result?.status).not.toBe(307)
    expect(result).toBe(expectedResponse)
  })
})
