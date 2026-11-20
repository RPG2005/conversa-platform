import type { NotificationPreference } from '../contracts/attachments'
import { request } from './http'

export const getNotificationPreference = async () =>
  request<{ notification: NotificationPreference }>('/auth/notification-preferences')

export const updateNotificationPreference = async (emailEnabled: boolean) =>
  request<{ notification: NotificationPreference }>('/auth/notification-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailEnabled }),
  })
