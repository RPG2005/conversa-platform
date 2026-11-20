import type { AttachmentContentType, CreateAttachmentUploadResponse, UploadedAttachment } from '../contracts/attachments'
import type { MessageAttachment } from '../contracts/conversations'
import { request } from './http'

const maxAttachmentSize = 10 * 1024 * 1024
const allowedTypes: Record<string, AttachmentContentType> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'application/pdf': 'application/pdf',
}
const extensionTypes: Record<string, AttachmentContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

export const getAttachmentContentType = (file: File): AttachmentContentType => {
  const detectedType = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const contentType = detectedType ? allowedTypes[detectedType] : extensionTypes[extension]
  if (!contentType) throw new Error('Tipo no permitido. Usa una imagen JPEG, PNG, WebP o un PDF.')
  if (file.size <= 0 || file.size > maxAttachmentSize) throw new Error('El archivo debe ocupar entre 1 byte y 10 MB.')
  return contentType
}

export const requestAttachmentUpload = async (conversationId: string, file: File, contentType: AttachmentContentType) => {
  const response = await request<CreateAttachmentUploadResponse>(`/conversations/${conversationId}/attachments/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType, size: file.size }),
  })
  return response
}

export const putAttachmentBinary = async (uploadUrl: string, file: File, contentType: AttachmentContentType) => {
  let response: Response
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      credentials: 'omit',
    })
  } catch {
    throw new Error('No se pudo subir el archivo al almacenamiento. Puedes volver a intentarlo.')
  }
  if (!response.ok) throw new Error('El almacenamiento rechazó el archivo. Puedes volver a intentarlo.')
}

export const completeAttachmentUpload = async (conversationId: string, attachmentId: string) => {
  const response = await request<{ attachment: UploadedAttachment & { objectKey?: string } }>(
    `/conversations/${conversationId}/attachments/${attachmentId}/complete`,
    { method: 'POST' },
  )
  const { id, originalName, contentType, size, createdAt } = response.attachment
  return { id, originalName, contentType, size, createdAt } satisfies MessageAttachment
}

export const uploadAttachment = async (conversationId: string, file: File): Promise<UploadedAttachment> => {
  const contentType = getAttachmentContentType(file)
  const created = await requestAttachmentUpload(conversationId, file, contentType)
  await putAttachmentBinary(created.uploadUrl, file, contentType)
  return completeAttachmentUpload(conversationId, created.attachment.id)
}

export const downloadAttachment = async (conversationId: string, attachmentId: string) => {
  const { downloadUrl } = await request<{ downloadUrl: string }>(
    `/conversations/${conversationId}/attachments/${attachmentId}/download-url`,
  )
  let response: Response
  try {
    response = await fetch(downloadUrl, { credentials: 'omit' })
  } catch {
    throw new Error('No se pudo descargar el archivo. Inténtalo de nuevo.')
  }
  if (!response.ok) throw new Error('El almacenamiento no pudo entregar el archivo. Inténtalo de nuevo.')
  return response.blob()
}
