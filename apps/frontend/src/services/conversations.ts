import type { Conversation, Message, MessagePage } from '../contracts/conversations'
import { request } from './http'

export const listConversations = async () =>
  request<{ conversations: Conversation[] }>('/conversations')

export const createConversation = async (participantEmail: string) =>
  request<{ conversation: Conversation }>('/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantEmail }),
  })

export const listMessages = async (conversationId: string, cursor?: string) => {
  const params = new URLSearchParams({ limit: '20' })
  if (cursor) params.set('cursor', cursor)
  return request<MessagePage>(`/conversations/${conversationId}/messages?${params.toString()}`)
}

export const createMessage = async (conversationId: string, content: string) =>
  request<{ message: Message }>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
