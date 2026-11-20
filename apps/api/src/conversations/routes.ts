import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSession } from '../auth/routes.js';
import type { AuthRepository } from '../auth/types.js';
import type { ConversationRepository, Message } from './types.js';
import type { RealtimeGateway } from '../realtime/gateway.js';
import type { AttachmentStorage } from '../storage/service.js';
import type { NotificationQueue } from '../notifications/queue.js';

const idSchema = z.uuid();
const createConversationSchema = z.object({ participantEmail: z.email().max(320).transform((email) => email.toLowerCase()) });
const addMemberSchema = z.object({ email: z.email().max(320).transform((email) => email.toLowerCase()) });
const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4_000),
  attachmentIds: z.array(z.uuid()).max(10).default([]),
});
const listMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  after: z.string().optional(),
});
const createAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z.number().int().positive().max(10 * 1024 * 1024),
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
  attachments: message.attachments.map((attachment) => ({
    id: attachment.id,
    originalName: attachment.originalName,
    contentType: attachment.contentType,
    size: attachment.size,
    createdAt: attachment.createdAt.toISOString(),
  })),
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
  attachmentStorage?: AttachmentStorage,
  notificationQueue?: NotificationQueue,
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

    let message: Message;
    try {
      message = await conversationRepository.createMessage({
        conversationId: conversationId.data, authorId: user.id, content: parsed.data.content, attachmentIds: parsed.data.attachmentIds,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid message attachments') {
        return reply.code(409).send({ error: 'Invalid message attachments' });
      }
      throw error;
    }
    if (realtimeGateway) {
      await realtimeGateway.publish({
        type: 'message.created',
        conversationId: conversationId.data,
        message: {
          id: message.id, authorId: message.authorId, content: message.content,
          attachments: toMessageDto(message).attachments,
          createdAt: message.createdAt.toISOString(),
        },
      });
    }
    if (notificationQueue) {
      try {
        await notificationQueue.enqueue({
          eventId: `message.created:${message.id}`,
          conversationId: message.conversationId,
          messageId: message.id,
          authorId: message.authorId,
          createdAt: message.createdAt.toISOString(),
        });
      } catch (error) {
        request.log.error(error, 'Unable to enqueue notification');
      }
    }
    return reply.code(201).send({ message: toMessageDto(message) });
  });

  if (attachmentStorage) {
    app.post('/conversations/:conversationId/attachments/upload-url', async (request, reply) => {
      const user = await requireSession(request, reply, authRepository);
      if (!user || 'statusCode' in user) return;
      const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
      const parsed = createAttachmentSchema.safeParse(request.body);
      if (!conversationId.success || !parsed.success) return reply.code(400).send({ error: 'Invalid attachment data' });
      if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });
      const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `conversations/${conversationId.data}/${crypto.randomUUID()}-${safeName}`;
      const attachment = await conversationRepository.createAttachment({
        conversationId: conversationId.data, uploaderId: user.id, objectKey, originalName: parsed.data.fileName,
        contentType: parsed.data.contentType, size: parsed.data.size,
      });
      const uploadUrl = await attachmentStorage.createUploadUrl(objectKey, parsed.data.contentType);
      return reply.code(201).send({ attachment: { ...attachment, createdAt: attachment.createdAt.toISOString() }, uploadUrl, expiresInSeconds: 300 });
    });

    app.post('/conversations/:conversationId/attachments/:attachmentId/complete', async (request, reply) => {
      const user = await requireSession(request, reply, authRepository);
      if (!user || 'statusCode' in user) return;
      const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
      const attachmentId = idSchema.safeParse((request.params as { attachmentId?: string }).attachmentId);
      if (!conversationId.success || !attachmentId.success) return reply.code(400).send({ error: 'Invalid attachment id' });
      if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });
      const attachment = await conversationRepository.findAttachment(attachmentId.data, conversationId.data, user.id);
      if (!attachment) return reply.code(404).send({ error: 'Attachment not found' });
      if (attachment.status === 'uploaded') return reply.send({ attachment: { ...attachment, createdAt: attachment.createdAt.toISOString() } });
      try {
        const object = await attachmentStorage.inspectObject(attachment.objectKey);
        if (object.size !== attachment.size || object.contentType !== attachment.contentType) {
          return reply.code(409).send({ error: 'Uploaded file does not match attachment metadata' });
        }
      } catch {
        return reply.code(409).send({ error: 'Uploaded file was not found' });
      }
      const completed = await conversationRepository.markAttachmentUploaded(attachment.id);
      return reply.send({ attachment: { ...completed, createdAt: completed.createdAt.toISOString() } });
    });

    app.get('/conversations/:conversationId/attachments/:attachmentId/download-url', async (request, reply) => {
      const user = await requireSession(request, reply, authRepository);
      if (!user || 'statusCode' in user) return;
      const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
      const attachmentId = idSchema.safeParse((request.params as { attachmentId?: string }).attachmentId);
      if (!conversationId.success || !attachmentId.success) return reply.code(400).send({ error: 'Invalid attachment id' });
      if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });
      const attachment = await conversationRepository.findUploadedAttachment(attachmentId.data, conversationId.data);
      if (!attachment) return reply.code(404).send({ error: 'Attachment not found' });
      return reply.send({ downloadUrl: await attachmentStorage.createDownloadUrl(attachment.objectKey), expiresInSeconds: 300 });
    });
  }

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    const user = await requireSession(request, reply, authRepository);
    if (!user || 'statusCode' in user) return;
    const conversationId = idSchema.safeParse((request.params as { conversationId?: string }).conversationId);
    const query = listMessagesSchema.safeParse(request.query);
    if (!conversationId.success || !query.success) return reply.code(400).send({ error: 'Invalid message query' });
    if (query.data.cursor && query.data.after) return reply.code(400).send({ error: 'Use either cursor or after' });
    if (!(await requireConversationMember(conversationId.data, user.id, conversationRepository))) return reply.code(404).send({ error: 'Conversation not found' });

    const cursor = query.data.cursor ? decodeCursor(query.data.cursor) : undefined;
    const after = query.data.after ? decodeCursor(query.data.after) : undefined;
    if (query.data.cursor && !cursor) return reply.code(400).send({ error: 'Invalid message cursor' });
    if (query.data.after && !after) return reply.code(400).send({ error: 'Invalid message cursor' });
    if (after) {
      const messages = await conversationRepository.listMessagesAfter({
        conversationId: conversationId.data,
        limit: query.data.limit,
        cursor: after,
      });
      const lastMessage = messages.at(-1);
      return reply.send({
        messages: messages.map(toMessageDto),
        syncCursor: lastMessage ? encodeCursor(lastMessage) : query.data.after ?? null,
        nextAfterCursor: messages.length === query.data.limit && lastMessage ? encodeCursor(lastMessage) : null,
      });
    }
    const messages = await conversationRepository.listMessages({
      conversationId: conversationId.data,
      limit: query.data.limit,
      cursor: cursor ?? undefined,
    });
    return reply.send({
      messages: messages.map(toMessageDto),
      nextCursor: messages.length === query.data.limit ? encodeCursor(messages[messages.length - 1]) : null,
      syncCursor: messages.length ? encodeCursor(messages[0]) : null,
    });
  });
};
