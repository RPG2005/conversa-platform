# Tiempo real y reconexión

1. Tras conocer la sesión y seleccionar una conversación, abre `/ws/conversations/:id` en el mismo origen; en desarrollo Vite lo reenvía a la API. El navegador envía automáticamente la cookie HTTP-only.
2. Envía `presence.heartbeat` periódicamente mientras esté abierta.
3. Emite `typing.started` y `typing.stopped` desde el compositor; elimina indicadores al llegar `expiresAt`.
4. Al conectar o reconectar, solicita `GET /conversations/:id/messages?after=<syncCursor>&limit=50` antes de procesar eventos nuevos. La carga inicial proporciona el primer `syncCursor` del servidor.
5. Deduplica mensajes por `id` para cubrir solapamiento entre HTTP, sincronización y WebSocket.
6. Un cierre `1008` saca al usuario de la conversación y muestra un error comprensible; no reintenta indefinidamente.

No se considera un mensaje confirmado hasta que llegue la respuesta HTTP o el evento con identificador persistido.
