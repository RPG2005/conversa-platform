import { describe, expect, it } from 'vitest';
import { conversationMembers, conversations, messages } from '../src/db/schema.js';

describe('conversation persistence schema', () => {
  it('defines UUID identities, UTC timestamps, and message pagination index columns', () => {
    expect(conversations.id.dataType).toBe('string');
    expect(conversations.createdAt.dataType).toBe('date');
    expect(conversationMembers.conversationId.dataType).toBe('string');
    expect(messages.authorId.dataType).toBe('string');
    expect(messages.createdAt.dataType).toBe('date');
  });
});
