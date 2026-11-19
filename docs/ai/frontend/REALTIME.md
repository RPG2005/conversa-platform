# Tiempo real y reconexión

1. Tras conocer la sesión y seleccionar una conversación, abre `ws://<api>/ws/conversations/:id`.
2. Envía `presence.heartbeat` periódicamente mientras esté abierta.
3. Emite `typing.started` y `typing.stopped` desde el compositor; elimina indicadores al llegar `expiresAt`.
4. Al reconectar, solicita `GET /messages?after=<syncCursor>` antes de procesar eventos nuevos.
5. Deduplica mensajes por `id` para cubrir solapamiento entre HTTP, sincronización y WebSocket.
6. Un cierre `1008` elimina la conversación activa de la vista y muestra un error comprensible; no reintenta indefinidamente.

No se considera un mensaje confirmado hasta que llegue la respuesta HTTP o el evento con identificador persistido.
