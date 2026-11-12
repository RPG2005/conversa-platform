export interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface ConversationRepository {
  findUserIdByEmail: (email: string) => Promise<string | null>;
  createConversation: (creatorId: string, participantId: string) => Promise<Conversation>;
  listConversations: (userId: string) => Promise<Conversation[]>;
  isMember: (conversationId: string, userId: string) => Promise<boolean>;
  addMember: (conversationId: string, userId: string) => Promise<boolean>;
  createMessage: (input: { conversationId: string; authorId: string; content: string }) => Promise<Message>;
  listMessages: (input: { conversationId: string; limit: number; cursor?: { createdAt: string; id: string } }) => Promise<Message[]>;
}
