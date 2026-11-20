import type { Redis } from 'ioredis'
import type { WebSocket } from 'ws'
import { describe, expect, it, vi } from 'vitest'
import { createRealtimeGateway } from './gateway.js'

describe('realtime gateway presence', () => {
  it('publishes presence on subscription and refreshes its expiry on heartbeat', async () => {
    const publisher = {
      publish: vi.fn().mockResolvedValue(1),
      scan: vi.fn().mockResolvedValue(['0', []]),
      ttl: vi.fn().mockResolvedValue(45),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as Redis
    const subscriber = {
      on: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(1),
      unsubscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    } as unknown as Redis
    const gateway = createRealtimeGateway(publisher, subscriber)
    const socket = { OPEN: 1, readyState: 1, send: vi.fn() } as unknown as WebSocket

    const unsubscribe = await gateway.subscribe('conversation-1', 'user-1', 'connection-1', socket)
    await gateway.handleCommand('conversation-1', 'user-1', 'connection-1', { type: 'presence.heartbeat' })

    const publishedEvents = vi.mocked(publisher.publish).mock.calls.map(([, payload]) => JSON.parse(String(payload)))
    expect(publishedEvents).toHaveLength(2)
    expect(publishedEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'presence.changed', conversationId: 'conversation-1', userId: 'user-1', online: true }),
    ]))
    expect(publishedEvents.every((event) => typeof event.expiresAt === 'string')).toBe(true)

    await unsubscribe()
    await gateway.close()
  })

  it('sends the joining socket a snapshot of other online members', async () => {
    const publisher = {
      publish: vi.fn().mockResolvedValue(1),
      scan: vi.fn()
        .mockResolvedValueOnce(['0', ['chat:presence:connection:conversation-1:user-2:connection-2']])
        .mockResolvedValueOnce(['0', []]),
      ttl: vi.fn().mockResolvedValue(20),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as Redis
    const subscriber = {
      on: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(1),
      unsubscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    } as unknown as Redis
    const gateway = createRealtimeGateway(publisher, subscriber)
    const socket = { OPEN: 1, readyState: 1, send: vi.fn() } as unknown as WebSocket

    const unsubscribe = await gateway.subscribe('conversation-1', 'user-1', 'connection-1', socket)

    expect(vi.mocked(socket.send)).toHaveBeenCalledWith(expect.stringContaining('"userId":"user-2"'))
    expect(JSON.parse(String(vi.mocked(socket.send).mock.calls[0][0]))).toEqual(expect.objectContaining({
      type: 'presence.changed', conversationId: 'conversation-1', userId: 'user-2', online: true,
    }))
    await unsubscribe()
    await gateway.close()
  })
})
