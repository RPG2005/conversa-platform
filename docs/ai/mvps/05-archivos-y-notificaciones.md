# MVP 05 — Archivos y notificaciones

## Resultado

Los miembros pueden adjuntar archivos controlados y reciben una notificación de desarrollo si están desconectados.

## Pasos

1. Diseñar metadatos de adjunto y migración asociada a mensajes.
2. Generar URLs firmadas para carga/lectura mediante SeaweedFS S3.
3. Validar tamaño, tipo MIME y autorización antes de generar una URL.
4. Añadir cola de notificaciones con Redis.
5. Enviar correo de desarrollo a Mailpit para mensajes no leídos.
6. Implementar preferencias de notificación por usuario.

## Criterios de aceptación

- Los objetos privados no se pueden descargar sin URL firmada válida.
- Un archivo inválido no llega al almacenamiento.
- Una notificación no se duplica para el mismo evento.
- Los correos aparecen en Mailpit, nunca en un proveedor real durante desarrollo.

## Pruebas

- URLs firmadas, tamaños y tipos inválidos.
- Worker de cola exitoso y reintento tras fallo.
- Preferencias desactivadas y deduplicación.
