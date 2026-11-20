import type { Message } from './conversations'

export type RealtimeCommand =
  | { type: 'presence.heartbeat' }
  | { type: 'typing.started' }
  | { type: 'typing.stopped' }

export type RealtimeEvent =
  | { type: 'message.created'; conversationId: string; message: Omit<Message, 'conversationId'> }
  | { type: 'presence.changed'; conversationId: string; userId: string; online: boolean; expiresAt: string | null }
  | { type: 'typing.changed'; conversationId: string; userId: string; active: boolean; expiresAt: string | null }

export type RealtimeConnectionState = 'connecting' | 'syncing' | 'connected' | 'reconnecting' | 'forbidden' | 'closed'

export interface PresenceState {
  online: boolean
  expiresAt: string | null
}

export interface TypingState {
  active: boolean
  expiresAt: string | null
}
