import type { MessageAttachment } from './conversations'

export type AttachmentContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

export type UploadedAttachment = MessageAttachment

export interface CreateAttachmentUploadResponse {
  attachment: { id: string }
  uploadUrl: string
  expiresInSeconds: number
}

export interface NotificationPreference {
  emailEnabled: boolean
  updatedAt: string | null
}
