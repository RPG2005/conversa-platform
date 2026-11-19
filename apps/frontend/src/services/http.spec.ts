import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('sends cookies and returns JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 })))
    await expect(request<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health', expect.objectContaining({ credentials: 'include' }))
  })

  it('normalizes API and network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })))
    await expect(request('/auth/me')).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(request('/health')).rejects.toMatchObject({ status: 0 })
  })
})
