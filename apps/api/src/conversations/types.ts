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
  attachments: MessageAttachment[];
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  status: string;
  createdAt: Date;
}

export interface ConversationRepository {
  findUserIdByEmail: (email: string) => Promise<string | null>;
  createConversation: (creatorId: string, participantId: string) => Promise<Conversation>;
  listConversations: (userId: string) => Promise<Conversation[]>;
  isMember: (conversationId: string, userId: string) => Promise<boolean>;
  addMember: (conversationId: string, userId: string) => Promise<boolean>;
  createMessage: (input: { conversationId: string; authorId: string; content: string; attachmentIds?: string[] }) => Promise<Message>;
  listMessages: (input: { conversationId: string; limit: number; cursor?: { createdAt: string; id: string } }) => Promise<Message[]>;
  listMessagesAfter: (input: { conversationId: string; limit: number; cursor: { createdAt: string; id: string } }) => Promise<Message[]>;
  createAttachment: (input: { conversationId: string; uploaderId: string; objectKey: string; originalName: string; contentType: string; size: number }) => Promise<Attachment>;
  findAttachment: (attachmentId: string, conversationId: string, uploaderId: string) => Promise<Attachment | null>;
  markAttachmentUploaded: (attachmentId: string) => Promise<Attachment>;
  findUploadedAttachment: (attachmentId: string, conversationId: string) => Promise<Attachment | null>;
}
