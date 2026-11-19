import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './session'

const user = { id: 'user-1', email: 'ada@example.test', displayName: 'Ada' }

afterEach(() => vi.unstubAllGlobals())

describe('session store', () => {
  it('restores the authenticated user from the HTTP-only cookie session', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ user }), { status: 200 })))
    const session = useSessionStore()

    await session.restore()

    expect(session.user).toEqual(user)
    expect(session.authenticated).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'include' }))
  })

  it('clears an expired session after a 401 response', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })))
    const session = useSessionStore()
    session.user = user

    await session.restore()

    expect(session.user).toBeNull()
    expect(session.authenticated).toBe(false)
    expect(session.initialized).toBe(true)
  })

  it('allows logout and clears the local session', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const session = useSessionStore()
    session.user = user

    await session.logout()

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(session.user).toBeNull()
  })

  it('keeps the session when logout fails due to a network error', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    const session = useSessionStore()
    session.user = user

    await expect(session.logout()).rejects.toThrow('No se pudo conectar con el servidor.')
    expect(session.user).toEqual(user)
  })
})
