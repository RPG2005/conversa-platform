import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RealtimeEvent } from '../contracts/realtime'
import { ConversationRealtimeClient, type RealtimeCallbacks, type SocketFactory } from './realtime'

class FakeSocket {
  readyState = 0
  sent: string[] = []
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send(payload: string) { this.sent.push(payload) }
  close(code = 1000) {
    this.readyState = 3
    this.onclose?.({ code } as CloseEvent)
  }
  open() {
    this.readyState = 1
    this.onopen?.({} as Event)
  }
  receive(event: RealtimeEvent) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent)
  }
}

const createCallbacks = (overrides: Partial<RealtimeCallbacks> = {}): RealtimeCallbacks => ({
  onEvent: vi.fn(),
  onStatus: vi.fn(),
  onSync: vi.fn().mockResolvedValue(undefined),
  onSyncError: vi.fn(),
  onForbidden: vi.fn(),
  ...overrides,
})

afterEach(() => vi.useRealTimers())

describe('conversation realtime client', () => {
  it('uses the same-origin WebSocket, synchronizes before applying queued events, and heartbeats', async () => {
    const socket = new FakeSocket()
    const factory = vi.fn(() => socket as unknown as WebSocket)
    const onEvent = vi.fn()
    const callbacks = createCallbacks({ onEvent })
    const client = new ConversationRealtimeClient('chat-1', callbacks, factory as unknown as SocketFactory)
    client.start()

    expect(factory).toHaveBeenCalledWith(`${window.location.origin.replace('http', 'ws')}/ws/conversations/chat-1`)
    socket.open()
    const event: RealtimeEvent = {
      type: 'message.created',
      conversationId: 'chat-1',
      message: { id: 'message-1', authorId: 'user-1', content: 'hello', attachments: [], createdAt: '2026-01-01T10:00:00.000Z' },
    }
    socket.receive(event)
    expect(onEvent).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(callbacks.onStatus).toHaveBeenCalledWith('connected'))
    expect(onEvent).toHaveBeenCalledWith(event)
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'presence.heartbeat' })

    client.stop()
  })

  it('reconnects with backoff and stops retrying after a 1008 policy close', async () => {
    vi.useFakeTimers()
    const sockets: FakeSocket[] = []
    const factory = vi.fn(() => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as WebSocket
    })
    const callbacks = createCallbacks()
    const client = new ConversationRealtimeClient('chat-1', callbacks, factory as unknown as SocketFactory)
    client.start()
    sockets[0].close(1006)
    await vi.advanceTimersByTimeAsync(500)
    expect(sockets).toHaveLength(2)
    sockets[1].open()
    await vi.advanceTimersByTimeAsync(0)
    sockets[1].close(1008)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(factory).toHaveBeenCalledTimes(2)
    expect(callbacks.onForbidden).toHaveBeenCalledOnce()
    expect(callbacks.onStatus).toHaveBeenLastCalledWith('forbidden')
    client.stop()
  })
})
