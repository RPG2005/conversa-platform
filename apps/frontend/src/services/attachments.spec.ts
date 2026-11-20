import { afterEach, describe, expect, it, vi } from 'vitest'
import * as http from './http'
import { uploadAttachment } from './attachments'

afterEach(() => vi.unstubAllGlobals())

describe('attachment service', () => {
  it('creates, uploads and completes without returning the signed URL or object key', async () => {
    const request = vi.spyOn(http, 'request')
      .mockResolvedValueOnce({ attachment: { id: 'attachment-1' }, uploadUrl: 'http://storage/signed-secret', expiresInSeconds: 300 })
      .mockResolvedValueOnce({ attachment: {
        id: 'attachment-1', originalName: 'sample.pdf', contentType: 'application/pdf', size: 4,
        createdAt: '2026-01-01T00:00:00.000Z', objectKey: 'private/key', status: 'uploaded',
      } })
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['data'], 'sample.pdf', { type: 'application/pdf' })

    const attachment = await uploadAttachment('conversation-1', file)

    expect(fetchMock).toHaveBeenCalledWith('http://storage/signed-secret', expect.objectContaining({
      method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/pdf' }, body: file,
    }))
    expect(attachment).toEqual({
      id: 'attachment-1', originalName: 'sample.pdf', contentType: 'application/pdf', size: 4,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(JSON.stringify(attachment)).not.toContain('signed-secret')
    expect(JSON.stringify(attachment)).not.toContain('private/key')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('rejects unsupported types and oversized files before requesting a URL', async () => {
    const request = vi.spyOn(http, 'request')
    const textFile = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const oversizedPdf = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' })

    await expect(uploadAttachment('conversation-1', textFile)).rejects.toThrow('Tipo no permitido')
    await expect(uploadAttachment('conversation-1', oversizedPdf)).rejects.toThrow('10 MB')
    expect(request).not.toHaveBeenCalled()
  })

  it('does not expose the signed URL when the storage request fails', async () => {
    vi.spyOn(http, 'request').mockResolvedValueOnce({
      attachment: { id: 'attachment-1' }, uploadUrl: 'http://storage/signed-secret', expiresInSeconds: 300,
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('CORS error')))
    const file = new File(['data'], 'sample.pdf', { type: 'application/pdf' })

    await expect(uploadAttachment('conversation-1', file)).rejects.toThrow('No se pudo subir el archivo')
  })
})
