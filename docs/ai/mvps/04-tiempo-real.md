# MVP 04 — Tiempo real

## Resultado

Mensajes persistidos se comunican en tiempo real a los miembros autorizados, con presencia e indicador de escritura.

## Pasos

1. Añadir servidor WebSocket autenticado.
2. Autorizar la suscripción por conversación.
3. Persistir el mensaje por HTTP o evento de comando antes de emitirlo.
4. Publicar eventos mediante Redis para soportar varias instancias de API.
5. Añadir presencia e indicador de escritura con TTL en Redis.
6. Gestionar reconexión y sincronización desde cursor.

## Criterios de aceptación

- Solo los miembros reciben eventos de una conversación.
- Un mensaje no se emite si no se pudo persistir.
- Tras reconectar no aparecen duplicados ni huecos.
- Presencia y escritura expiran aunque un cliente se desconecte abruptamente.

## Pruebas

- Integración WebSocket con dos usuarios y una conversación privada.
- Rechazo de suscripción no autorizada.
- Reconexión, eventos duplicados, orden y expiración TTL.
