import { describe, expect, it, vi } from 'vitest'
import * as attachmentApi from '../services/attachments'
import { useAttachmentUpload } from './useAttachmentUpload'

describe('attachment upload composable', () => {
  it('uploads a supported PDF and keeps only public attachment metadata', async () => {
    const upload = vi.spyOn(attachmentApi, 'uploadAttachment').mockResolvedValue({
      id: 'attachment-1', originalName: 'sample.pdf', contentType: 'application/pdf', size: 4, createdAt: '2026-01-01T00:00:00.000Z',
    })
    const composable = useAttachmentUpload()
    const file = new File(['data'], 'sample.pdf', { type: 'application/pdf' })
    expect(composable.selectFiles([file])).toBe(true)

    const staged = await composable.uploadSelected('conversation-1')

    expect(upload).toHaveBeenCalledWith('conversation-1', file)
    expect(staged?.[0].attachment).toEqual({
      id: 'attachment-1', originalName: 'sample.pdf', contentType: 'application/pdf', size: 4, createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(JSON.stringify(composable.stagedAttachments.value)).not.toContain('uploadUrl')
  })

  it('rejects unsupported files before making an upload request', () => {
    const upload = vi.spyOn(attachmentApi, 'uploadAttachment')
    const composable = useAttachmentUpload()

    expect(composable.selectFiles([new File(['text'], 'notes.txt', { type: 'text/plain' })])).toBe(false)
    expect(composable.error.value).toContain('Tipo no permitido')
    expect(upload).not.toHaveBeenCalled()
  })

  it('keeps the selected file and explains network errors for retry', async () => {
    vi.spyOn(attachmentApi, 'uploadAttachment').mockRejectedValue(new Error('No se pudo conectar con el servidor.'))
    const composable = useAttachmentUpload()
    const file = new File(['data'], 'sample.pdf', { type: 'application/pdf' })
    composable.selectFiles([file])

    await expect(composable.uploadSelected('conversation-1')).rejects.toThrow('No se pudo conectar')

    expect(composable.selectedFiles.value).toEqual([file])
    expect(composable.error.value).toContain('No se pudo conectar')
  })
})
