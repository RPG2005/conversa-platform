import { ref, type Ref } from 'vue'
import type { MessageAttachment } from '../contracts/conversations'
import { downloadAttachment as fetchAttachment } from '../services/attachments'

export const useAttachmentDownload = (conversationId: Ref<string>) => {
  const downloadingId = ref('')
  const errors = ref<Record<string, string>>({})

  const download = async (attachment: MessageAttachment) => {
    downloadingId.value = attachment.id
    errors.value = { ...errors.value, [attachment.id]: '' }
    try {
      const blob = await fetchAttachment(conversationId.value, attachment.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.originalName
      link.rel = 'noopener'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch (cause) {
      errors.value = {
        ...errors.value,
        [attachment.id]: cause instanceof Error ? cause.message : 'No se pudo descargar el archivo.',
      }
    } finally {
      downloadingId.value = ''
    }
  }

  return { downloadingId, errors, download }
}
