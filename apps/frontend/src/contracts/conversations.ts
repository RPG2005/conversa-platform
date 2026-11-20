export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
}

export interface MessageAttachment {
  id: string
  originalName: string
  contentType: string
  size: number
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  authorId: string
  content: string
  attachments: MessageAttachment[]
  createdAt: string
}

export interface MessagePage {
  messages: Message[]
  nextCursor: string | null
  syncCursor: string | null
}
