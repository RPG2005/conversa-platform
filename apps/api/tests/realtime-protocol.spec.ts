import { describe, expect, it } from 'vitest';
import { parseRealtimeCommand } from '../src/realtime/protocol.js';

describe('realtime commands', () => {
  it('accepts the supported presence and typing commands', () => {
    expect(parseRealtimeCommand('{"type":"presence.heartbeat"}')).toEqual({ type: 'presence.heartbeat' });
    expect(parseRealtimeCommand('{"type":"typing.started"}')).toEqual({ type: 'typing.started' });
    expect(parseRealtimeCommand('{"type":"typing.stopped"}')).toEqual({ type: 'typing.stopped' });
  });

  it('rejects malformed and unsupported client events', () => {
    expect(parseRealtimeCommand('not-json')).toBeNull();
    expect(parseRealtimeCommand('{"type":"message.created"}')).toBeNull();
  });
});
