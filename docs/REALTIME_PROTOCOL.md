# Protocolo de tiempo real

La conexión se abre mediante `GET /ws/conversations/:conversationId` y usa la cookie de sesión `chat_session`. Solo puede suscribirse un miembro de la conversación.

## Eventos de servidor

Todos los mensajes son JSON con `type` y `conversationId`.

| Tipo | Campos adicionales | Uso |
| --- | --- | --- |
| `message.created` | `message` | Mensaje ya persistido en PostgreSQL. |
| `presence.changed` | `userId`, `online`, `expiresAt` | Un usuario pasa a estar disponible o deja de estarlo. |
| `typing.changed` | `userId`, `active`, `expiresAt` | Un usuario empieza o deja de escribir. Si está activo, el cliente debe ocultarlo en `expiresAt` aunque no llegue otro evento. |

## Comandos del cliente

| Tipo | Frecuencia | Efecto |
| --- | --- | --- |
| `presence.heartbeat` | Cada 30 segundos como máximo | Renueva el TTL de presencia de 60 segundos y publica la nueva expiración para que los demás clientes mantengan el estado. |
| `typing.started` | Al iniciar la escritura | Activa el indicador durante 8 segundos. |
| `typing.stopped` | Al detener la escritura o enviar el mensaje | Elimina el indicador de inmediato. |

Los comandos inválidos se ignoran y no se reenvían a otros miembros.

## Reconexión

Al reconectar, el cliente conserva un cursor opaco formado por el último mensaje ya procesado y solicita:

```text
GET /conversations/:conversationId/messages?after=:cursor&limit=50
```

La respuesta entrega `messages` en orden cronológico y `syncCursor` con el último mensaje recibido. Si `nextAfterCursor` no es `null`, se repite la consulta usando ese valor hasta agotar las páginas. El cliente deduplica por `message.id` los mensajes recibidos por HTTP y WebSocket durante la reconexión.

La respuesta de una carga inicial (`GET /conversations/:id/messages?limit=50`) también incluye `syncCursor`, codificado a partir del mensaje más reciente, o `null` si todavía no hay mensajes. Así el cliente puede cerrar el intervalo entre la carga HTTP inicial y la suscripción WebSocket sin construir cursores en el navegador. Al suscribirse, el gateway envía al socket nuevo el estado en línea que ya conoce para los demás miembros; los heartbeats renuevan la expiración visible.
