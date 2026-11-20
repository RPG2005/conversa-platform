import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConversationsStore } from './conversations'

const older = { id: '00000000-0000-4000-8000-000000000001', conversationId: 'chat-1', authorId: 'user-1', content: 'old', attachments: [], createdAt: '2026-01-01T10:00:00.000Z' }
const middle = { id: '00000000-0000-4000-8000-000000000002', conversationId: 'chat-1', authorId: 'user-2', content: 'middle', attachments: [], createdAt: '2026-01-01T10:01:00.000Z' }
const newer = { id: '00000000-0000-4000-8000-000000000003', conversationId: 'chat-1', authorId: 'user-1', content: 'new', attachments: [], createdAt: '2026-01-01T10:02:00.000Z' }

afterEach(() => vi.unstubAllGlobals())

describe('conversations store', () => {
  it('merges older pages without duplicates and keeps chronological order', async () => {
    setActivePinia(createPinia())
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [newer, middle], nextCursor: 'older-cursor' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [middle, older], nextCursor: null }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useConversationsStore()

    await store.loadMessages('chat-1')
    await store.loadMessages('chat-1', true)

    expect(store.messagesFor('chat-1').map(({ id }) => id)).toEqual([older.id, middle.id, newer.id])
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/conversations/chat-1/messages?limit=20&cursor=older-cursor',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(store.hasOlderMessages('chat-1')).toBe(false)
  })

  it('can retry a failed message page without losing the cursor state', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Temporary failure' }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [newer], nextCursor: null }), { status: 200 })))
    const store = useConversationsStore()

    await store.loadMessages('chat-1')
    expect(store.messageErrors['chat-1']).toBe('Temporary failure')
    await store.loadMessages('chat-1')

    expect(store.messageErrors['chat-1']).toBe('')
    expect(store.messagesFor('chat-1')).toEqual([newer])
  })

  it('adds a message only after the API confirms it', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: newer }), { status: 201 })))
    const store = useConversationsStore()

    await store.sendMessage('chat-1', ' new ')

    expect(fetch).toHaveBeenCalledWith('/api/conversations/chat-1/messages', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: 'new' }),
    }))
    expect(store.messagesFor('chat-1')).toEqual([newer])
  })

  it('does not add a message when the API rejects the send', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Temporary failure' }), { status: 503 })))
    const store = useConversationsStore()

    await expect(store.sendMessage('chat-1', 'hello')).rejects.toThrow('Temporary failure')
    expect(store.messagesFor('chat-1')).toEqual([])
  })
})
