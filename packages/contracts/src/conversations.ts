export interface CreateConversationInput {
  participantEmail: string;
}

export interface AddConversationMemberInput {
  email: string;
}

export interface SendMessageInput {
  content: string;
}

export interface ConversationDto {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface MessagePageDto {
  messages: MessageDto[];
  nextCursor: string | null;
}
