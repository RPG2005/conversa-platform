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
| `presence.heartbeat` | Cada 30 segundos como máximo | Renueva el TTL de presencia de 60 segundos. |
| `typing.started` | Al iniciar la escritura | Activa el indicador durante 8 segundos. |
| `typing.stopped` | Al detener la escritura o enviar el mensaje | Elimina el indicador de inmediato. |

Los comandos inválidos se ignoran y no se reenvían a otros miembros.
