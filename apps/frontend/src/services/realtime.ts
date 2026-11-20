import type { RealtimeCommand, RealtimeConnectionState, RealtimeEvent } from '../contracts/realtime'

const reconnectDelays = [500, 1_000, 2_000, 4_000, 8_000, 16_000, 30_000]
const heartbeatIntervalMs = 30_000
const connectionTimeoutMs = 15_000
const syncRetryMs = 5_000

export interface RealtimeCallbacks {
  onEvent: (event: RealtimeEvent) => void
  onStatus: (state: RealtimeConnectionState) => void
  onSync: () => Promise<void>
  onSyncError: (error: unknown) => void
  onForbidden: () => void
}

export type SocketFactory = (url: string) => WebSocket

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isRealtimeEvent = (value: unknown, conversationId: string): value is RealtimeEvent => {
  if (!isRecord(value) || value.conversationId !== conversationId || typeof value.type !== 'string') return false
  if (value.type === 'message.created') {
    return isRecord(value.message)
      && typeof value.message.id === 'string'
      && typeof value.message.authorId === 'string'
      && typeof value.message.content === 'string'
      && Array.isArray(value.message.attachments)
      && typeof value.message.createdAt === 'string'
  }
  if (value.type === 'presence.changed' || value.type === 'typing.changed') {
    const validExpiry = typeof value.expiresAt === 'string' || value.expiresAt === null
    if (value.type === 'presence.changed') return typeof value.userId === 'string' && typeof value.online === 'boolean' && validExpiry
    return typeof value.userId === 'string' && typeof value.active === 'boolean' && validExpiry
  }
  return false
}

export class ConversationRealtimeClient {
  private readonly conversationId: string
  private readonly callbacks: RealtimeCallbacks
  private readonly socketFactory: SocketFactory
  private socket: WebSocket | null = null
  private stopped = false
  private syncing = false
  private retryAttempt = 0
  private bufferedEvents: RealtimeEvent[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private syncRetryTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  private connectionTimer: ReturnType<typeof setTimeout> | undefined

  constructor(
    conversationId: string,
    callbacks: RealtimeCallbacks,
    socketFactory: SocketFactory = (url) => new WebSocket(url),
  ) {
    this.conversationId = conversationId
    this.callbacks = callbacks
    this.socketFactory = socketFactory
  }

  start() {
    if (this.stopped || this.socket) return
    this.connect()
  }

  send(command: RealtimeCommand) {
    if (!this.socket || this.socket.readyState !== 1) return false
    this.socket.send(JSON.stringify(command))
    return true
  }

  stop() {
    this.stopped = true
    this.clearTimers()
    this.bufferedEvents = []
    this.syncing = false
    const socket = this.socket
    this.socket = null
    if (socket && (socket.readyState === 0 || socket.readyState === 1)) socket.close(1000, 'Client left conversation')
    this.callbacks.onStatus('closed')
  }

  private connect() {
    if (this.stopped) return
    this.callbacks.onStatus(this.retryAttempt === 0 ? 'connecting' : 'reconnecting')
    const url = new URL(`/ws/conversations/${encodeURIComponent(this.conversationId)}`, window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    let socket: WebSocket
    try {
      socket = this.socketFactory(url.toString())
    } catch {
      this.retry()
      return
    }
    this.socket = socket
    this.connectionTimer = setTimeout(() => {
      if (this.socket === socket && socket.readyState === 0) socket.close()
    }, connectionTimeoutMs)

    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return
      this.clearConnectionTimer()
      this.startHeartbeat()
      this.syncing = true
      this.callbacks.onStatus('syncing')
      void this.synchronize(socket)
    }
    socket.onmessage = (event) => {
      if (this.socket !== socket || this.stopped) return
      let value: unknown
      try {
        value = JSON.parse(String(event.data)) as unknown
      } catch {
        return
      }
      if (!isRealtimeEvent(value, this.conversationId)) return
      if (this.syncing) this.bufferedEvents.push(value)
      else this.callbacks.onEvent(value)
    }
    socket.onclose = (event) => {
      if (this.socket !== socket || this.stopped) return
      this.clearTimers()
      this.socket = null
      this.syncing = false
      this.bufferedEvents = []
      if (event.code === 1008) {
        this.callbacks.onStatus('forbidden')
        this.callbacks.onForbidden()
        return
      }
      this.retry()
    }
    socket.onerror = () => {
      if (this.socket === socket && !this.stopped) this.callbacks.onStatus('reconnecting')
    }
  }

  private async synchronize(socket: WebSocket) {
    try {
      await this.callbacks.onSync()
      if (this.socket !== socket || this.stopped || socket.readyState !== 1) return
      this.retryAttempt = 0
      this.syncing = false
      this.callbacks.onStatus('connected')
      this.flushBufferedEvents()
    } catch (error) {
      if (this.socket !== socket || this.stopped || socket.readyState !== 1) return
      this.syncing = false
      this.callbacks.onSyncError(error)
      this.callbacks.onStatus('connected')
      this.flushBufferedEvents()
      this.syncRetryTimer = setTimeout(() => {
        if (this.socket === socket && socket.readyState === 1) void this.synchronize(socket)
      }, syncRetryMs)
    }
  }

  private flushBufferedEvents() {
    const events = this.bufferedEvents
    this.bufferedEvents = []
    for (const event of events) this.callbacks.onEvent(event)
  }

  private startHeartbeat() {
    this.clearHeartbeat()
    this.send({ type: 'presence.heartbeat' })
    this.heartbeatTimer = setInterval(() => this.send({ type: 'presence.heartbeat' }), heartbeatIntervalMs)
  }

  private retry() {
    if (this.stopped) return
    this.clearTimers()
    this.callbacks.onStatus('reconnecting')
    const delay = reconnectDelays[Math.min(this.retryAttempt, reconnectDelays.length - 1)]
    this.retryAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.connect()
    }, delay)
  }

  private clearConnectionTimer() {
    if (this.connectionTimer) clearTimeout(this.connectionTimer)
    this.connectionTimer = undefined
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = undefined
  }

  private clearTimers() {
    this.clearConnectionTimer()
    this.clearHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.syncRetryTimer) clearTimeout(this.syncRetryTimer)
    this.reconnectTimer = undefined
    this.syncRetryTimer = undefined
  }
}
