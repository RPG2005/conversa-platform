import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import type { AuthRepository } from '../auth/types.js';
import type { ConversationRepository, Message } from './types.js';
import type { RealtimeGateway } from '../realtime/gateway.js';

const idSchema = z.uuid();
const createConversationSchema = z.object({ participantEmail: z.email().max(320).transform((email) => email.toLowerCase()) });
const addMemberSchema = z.object({ email: z.email().max(320).transform((email) => email.toLowerCase()) });
const sendMessageSchema = z.object({ content: z.string().trim().min(1).max(4_000) });
const listMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const toConversationDto = (conversation: { id: string; createdAt: Date; updatedAt: Date }) => ({
  id: conversation.id,
  createdAt: conversation.createdAt.toISOString(),
  updatedAt: conversation.updatedAt.toISOString(),
});

const toMessageDto = (message: Message) => ({
  id: message.id,
  conversationId: message.conversationId,
  authorId: message.authorId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
});

const encodeCursor = (message: Message) => Buffer.from(JSON.stringify({ createdAt: message.createdAt.toISOString(), id: message.id })).toString('base64url');

const decodeCursor = (cursor: string) => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return z.object({ createdAt: z.iso.datetime(), id: z.uuid() }).parse(parsed);
  } catch {
    return null;
  }
};

const requireConversationMember = async (
  conversationId: string,
  userId: string,
  repository: ConversationRepository,
) => repository.isMember(conversationId, userId);

export const registerConversationRoutes = (
  app: FastifyInstance,
  authRepository: AuthRepository,
  conversationRepository: ConversationRepository,
  realtimeGateway?: RealtimeGateway,
) => {
  app.post('/conversations', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const parsed = createConversationSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.participantEmail === user.email) return reply.code(400).send({ error: 'Invalid conversation participant' });

    const participantId = await conversationRepository.findUserIdByEmail(parsed.data.participantEmail);
    if (!participantId) return reply.code(404).send({ error: 'Participant not found' });
    const conversation = await conversationRepository.createConversation(user.id, participantId);
    return reply.code(201).send({ conversation: toConversationDto(conversation) });
  });

  app.get('/conversations', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const conversations = await conversationRepository.listConversations(user.id);
    return reply.send({ conversations: conversations.map(toConversationDto) });
  });

  app.post('/conversations/:conversationId/members', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
    const parsed = addMemberSchema.safeParse(request.body);
    if (!conversationId.success || !parsed.success) return reply.code(400).send({ error: 'Invalid member data' });
    if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });

    const memberId = await conversationRepository.findUserIdByEmail(parsed.data.email);
    if (!memberId) return reply.code(404).send({ error: 'Participant not found' });
    if (!(await conversationRepository.addMember(conversationId.data, memberId))) return reply.code(409).send({ error: 'Participant already belongs to this conversation' });
    return reply.code(201).send();
  });

  app.post('/conversations/:conversationId/messages', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!conversationId.success || !parsed.success) return reply.code(400).send({ error: 'Invalid message data' });
    if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });

    const message = await conversationRepository.createMessage({ conversationId: conversationId.data, authorId: user.id, content: parsed.data.content });
    if (realtimeGateway) {
      await realtimeGateway.publish({
        type: 'message.created',
        conversationId: conversationId.data,
        message: { id: message.id, authorId: message.authorId, content: message.content, createdAt: message.createdAt.toISOString() },
      });
    }
    return reply.code(201).send({ message: toMessageDto(message) });
  });

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
    const query = listMessagesSchema.safeParse(request.query);
    if (!conversationId.success || !query.success) return reply.code(400).send({ error: 'Invalid message query' });
    if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });

    const cursor = query.data.cursor ? decodeCursor(query.data.cursor) : undefined;
    if (query.data.cursor && !cursor) return reply.code(400).send({ error: 'Invalid message cursor' });
    const messages = await conversationRepository.listMessages({
      conversationId: conversationId.data,
      limit: query.data.limit,
      cursor: cursor ?? undefined,
    });
    return reply.send({
      messages: messages.map(toMessageDto),
      nextCursor: messages.length === query.data.limit ? encodeCursor(messages[messages.length - 1]) : null,
    });
  });
};
