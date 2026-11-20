import { defineStore } from 'pinia'
import type { Conversation, Message } from '../contracts/conversations'
import * as conversationsApi from '../services/conversations'

const byCreatedAt = (left: Message, right: Message) => {
  const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt)
  if (timeDifference) return timeDifference
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    conversations: [] as Conversation[],
    messagesByConversation: {} as Record<string, Message[]>,
    nextCursorByConversation: {} as Record<string, string | null>,
    loadedConversationIds: [] as string[],
    loadingConversations: false,
    loadingMessagesByConversation: {} as Record<string, boolean>,
    conversationsError: '',
    messageErrors: {} as Record<string, string>,
  }),
  getters: {
    messagesFor: (state) => (conversationId: string) => state.messagesByConversation[conversationId] ?? [],
    hasOlderMessages: (state) => (conversationId: string) => Boolean(state.nextCursorByConversation[conversationId]),
  },
  actions: {
    async loadConversations() {
      this.loadingConversations = true
      this.conversationsError = ''
      try {
        const response = await conversationsApi.listConversations()
        this.conversations = response.conversations
      } catch (error) {
        this.conversationsError = error instanceof Error ? error.message : 'No se pudieron cargar las conversaciones.'
      } finally {
        this.loadingConversations = false
      }
    },
    async createConversation(participantEmail: string) {
      const response = await conversationsApi.createConversation(participantEmail.trim())
      this.conversations = [response.conversation, ...this.conversations.filter(({ id }) => id !== response.conversation.id)]
      return response.conversation
    },
    async loadMessages(conversationId: string, older = false) {
      if (this.loadingMessagesByConversation[conversationId]) return
      if (!older && this.loadedConversationIds.includes(conversationId)) return
      const cursor = older ? this.nextCursorByConversation[conversationId] : undefined
      if (older && !cursor) return

      this.loadingMessagesByConversation[conversationId] = true
      this.messageErrors[conversationId] = ''
      try {
        const page = await conversationsApi.listMessages(conversationId, cursor ?? undefined)
        const currentMessages = this.messagesByConversation[conversationId] ?? []
        const uniqueMessages = new Map(currentMessages.map((message) => [message.id, message]))
        for (const message of page.messages) uniqueMessages.set(message.id, message)
        this.messagesByConversation[conversationId] = [...uniqueMessages.values()].sort(byCreatedAt)
        this.nextCursorByConversation[conversationId] = page.nextCursor
        if (!this.loadedConversationIds.includes(conversationId)) this.loadedConversationIds.push(conversationId)
      } catch (error) {
        this.messageErrors[conversationId] = error instanceof Error ? error.message : 'No se pudieron cargar los mensajes.'
      } finally {
        this.loadingMessagesByConversation[conversationId] = false
      }
    },
    async sendMessage(conversationId: string, content: string) {
      const response = await conversationsApi.createMessage(conversationId, content.trim())
      const messages = this.messagesByConversation[conversationId] ?? []
      if (!messages.some(({ id }) => id === response.message.id)) {
        this.messagesByConversation[conversationId] = [...messages, response.message].sort(byCreatedAt)
      }
      return response.message
    },
  },
})
