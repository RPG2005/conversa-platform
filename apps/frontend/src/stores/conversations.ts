import { defineStore } from 'pinia'
import type { Conversation, Message } from '../contracts/conversations'
import type { PresenceState, RealtimeEvent, TypingState } from '../contracts/realtime'
import * as conversationsApi from '../services/conversations'

const byCreatedAt = (left: Message, right: Message) => {
  const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt)
  if (timeDifference) return timeDifference
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

const mergeMessages = (current: Message[], incoming: Message[]) => {
  const uniqueMessages = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) uniqueMessages.set(message.id, message)
  return [...uniqueMessages.values()].sort(byCreatedAt)
}

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    conversations: [] as Conversation[],
    messagesByConversation: {} as Record<string, Message[]>,
    nextCursorByConversation: {} as Record<string, string | null>,
    syncCursorByConversation: {} as Record<string, string | null>,
    presenceByConversation: {} as Record<string, Record<string, PresenceState>>,
    typingByConversation: {} as Record<string, Record<string, TypingState>>,
    loadedConversationIds: [] as string[],
    loadingConversations: false,
    loadingMessagesByConversation: {} as Record<string, boolean>,
    conversationsError: '',
    messageErrors: {} as Record<string, string>,
    realtimeError: '',
  }),
  getters: {
    messagesFor: (state) => (conversationId: string) => state.messagesByConversation[conversationId] ?? [],
    hasOlderMessages: (state) => (conversationId: string) => Boolean(state.nextCursorByConversation[conversationId]),
    presenceFor: (state) => (conversationId: string) => state.presenceByConversation[conversationId] ?? {},
    typingFor: (state) => (conversationId: string) => state.typingByConversation[conversationId] ?? {},
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
        this.messagesByConversation[conversationId] = mergeMessages(currentMessages, page.messages)
        this.nextCursorByConversation[conversationId] = page.nextCursor
        if (!older) this.syncCursorByConversation[conversationId] = page.syncCursor ?? null
        if (!this.loadedConversationIds.includes(conversationId)) this.loadedConversationIds.push(conversationId)
      } catch (error) {
        this.messageErrors[conversationId] = error instanceof Error ? error.message : 'No se pudieron cargar los mensajes.'
      } finally {
        this.loadingMessagesByConversation[conversationId] = false
      }
    },
    async sendMessage(conversationId: string, content: string, attachmentIds: string[] = []) {
      const response = await conversationsApi.createMessage(conversationId, content.trim(), attachmentIds)
      this.messagesByConversation[conversationId] = mergeMessages(this.messagesByConversation[conversationId] ?? [], [response.message])
      this.updateConversationActivity(conversationId, response.message.createdAt)
      return response.message
    },
    async syncMessages(conversationId: string) {
      let cursor = this.syncCursorByConversation[conversationId] ?? null
      if (!cursor) {
        const page = await conversationsApi.syncMessagesAfter(conversationId)
        this.messagesByConversation[conversationId] = mergeMessages(this.messagesByConversation[conversationId] ?? [], page.messages)
        this.syncCursorByConversation[conversationId] = page.syncCursor
        this.nextCursorByConversation[conversationId] = page.nextCursor ?? null
        if (!this.loadedConversationIds.includes(conversationId)) this.loadedConversationIds.push(conversationId)
        return
      }

      while (cursor) {
        const page = await conversationsApi.syncMessagesAfter(conversationId, cursor)
        this.messagesByConversation[conversationId] = mergeMessages(this.messagesByConversation[conversationId] ?? [], page.messages)
        this.syncCursorByConversation[conversationId] = page.syncCursor
        if (!page.nextAfterCursor || page.nextAfterCursor === cursor) break
        cursor = page.nextAfterCursor
      }
    },
    applyRealtimeEvent(event: RealtimeEvent) {
      if (event.type === 'message.created') {
        const message: Message = { ...event.message, conversationId: event.conversationId }
        this.messagesByConversation[event.conversationId] = mergeMessages(this.messagesByConversation[event.conversationId] ?? [], [message])
        this.updateConversationActivity(event.conversationId, message.createdAt)
        return
      }
      if (event.type === 'presence.changed') {
        const presence = { ...(this.presenceByConversation[event.conversationId] ?? {}) }
        if (event.online) presence[event.userId] = { online: true, expiresAt: event.expiresAt }
        else delete presence[event.userId]
        this.presenceByConversation[event.conversationId] = presence
        return
      }
      const typing = { ...(this.typingByConversation[event.conversationId] ?? {}) }
      if (event.active) typing[event.userId] = { active: true, expiresAt: event.expiresAt }
      else delete typing[event.userId]
      this.typingByConversation[event.conversationId] = typing
    },
    expireRealtimeState(conversationId: string, now = Date.now()) {
      const presence = { ...(this.presenceByConversation[conversationId] ?? {}) }
      for (const [userId, state] of Object.entries(presence)) {
        if (state.expiresAt && Date.parse(state.expiresAt) <= now) delete presence[userId]
      }
      this.presenceByConversation[conversationId] = presence
      const typing = { ...(this.typingByConversation[conversationId] ?? {}) }
      for (const [userId, state] of Object.entries(typing)) {
        if (state.expiresAt && Date.parse(state.expiresAt) <= now) delete typing[userId]
      }
      this.typingByConversation[conversationId] = typing
    },
    clearRealtimeError() {
      this.realtimeError = ''
    },
    clear() {
      this.conversations = []
      this.messagesByConversation = {}
      this.nextCursorByConversation = {}
      this.syncCursorByConversation = {}
      this.presenceByConversation = {}
      this.typingByConversation = {}
      this.loadedConversationIds = []
      this.loadingMessagesByConversation = {}
      this.messageErrors = {}
      this.conversationsError = ''
      this.realtimeError = ''
    },
    updateConversationActivity(conversationId: string, updatedAt: string) {
      this.conversations = this.conversations
        .map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt } : conversation)
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    },
  },
})
