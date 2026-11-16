import { z } from 'zod';

export const realtimeCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('presence.heartbeat') }),
  z.object({ type: z.literal('typing.started') }),
  z.object({ type: z.literal('typing.stopped') }),
]);

export type RealtimeCommand = z.infer<typeof realtimeCommandSchema>;

export const parseRealtimeCommand = (payload: unknown): RealtimeCommand | null => {
  if (typeof payload !== 'string') return null;
  try {
    return realtimeCommandSchema.parse(JSON.parse(payload));
  } catch {
    return null;
  }
};
