import { ref } from 'vue'
import type { UploadedAttachment } from '../contracts/attachments'
import { getAttachmentContentType, uploadAttachment } from '../services/attachments'

export interface StagedAttachment {
  file: File
  attachment: UploadedAttachment
}

const maxAttachmentsPerMessage = 10
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}:${file.type}`

export const useAttachmentUpload = () => {
  const selectedFiles = ref<File[]>([])
  const stagedAttachments = ref<StagedAttachment[]>([])
  const uploading = ref(false)
  const progress = ref('')
  const error = ref('')

  const selectFiles = (files: FileList | File[]) => {
    error.value = ''
    const selected = Array.from(files)
    if (selected.length > maxAttachmentsPerMessage) {
      error.value = 'Puedes adjuntar como máximo 10 archivos a un mensaje.'
      return false
    }
    try {
      for (const file of selected) getAttachmentContentType(file)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'El archivo no es válido.'
      return false
    }
    if (stagedAttachments.value.length) {
      const selectedKeys = selected.map(fileKey)
      const stagedKeys = stagedAttachments.value.map(({ file }) => fileKey(file))
      if (selectedKeys.length !== stagedKeys.length || stagedKeys.some((key) => !selectedKeys.includes(key))) {
        error.value = 'Envía primero los adjuntos ya subidos antes de cambiar la selección.'
        return false
      }
    }
    selectedFiles.value = selected
    return true
  }

  const uploadSelected = async (conversationId: string) => {
    if (uploading.value) return
    uploading.value = true
    error.value = ''
    try {
      for (let index = 0; index < selectedFiles.value.length; index += 1) {
        const file = selectedFiles.value[index]
        if (stagedAttachments.value.some((staged) => fileKey(staged.file) === fileKey(file))) continue
        progress.value = `Subiendo archivo ${index + 1} de ${selectedFiles.value.length}: ${file.name}`
        const contentType = getAttachmentContentType(file)
        const attachment = await uploadAttachment(conversationId, file)
        stagedAttachments.value.push({ file, attachment: { ...attachment, contentType } })
      }
      progress.value = stagedAttachments.value.length ? 'Adjuntos preparados para enviar.' : ''
      return stagedAttachments.value
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No se pudo subir el adjunto.'
      throw cause
    } finally {
      uploading.value = false
    }
  }

  const clear = () => {
    selectedFiles.value = []
    stagedAttachments.value = []
    uploading.value = false
    progress.value = ''
    error.value = ''
  }

  return { selectedFiles, stagedAttachments, uploading, progress, error, selectFiles, uploadSelected, clear }
}
