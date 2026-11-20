# Registro de decisiones de IA

Registra decisiones que alteren contratos, infraestructura, seguridad o el orden de los MVPs.

| Fecha | Contexto | Decisión | Consecuencia |
| --- | --- | --- | --- |
| 2026-11-12 | Entorno local de objetos | Usar SeaweedFS con API S3 en lugar de MinIO | `S3_ENDPOINT` apunta a `object-storage:8333`. |
| 2026-11-12 | MVP 01 de API | Usar Fastify, `pg`, ioredis y Drizzle | API HTTP tipada, healthcheck inyectable y migraciones SQL reproducibles. |
| 2026-11-12 | MVP 02 de identidad | Usar sesiones opacas en cookie HTTP-only y hashes `scrypt` | El cliente no recibe tokens ni hashes persistibles; Redis limita login y registro. |
| 2026-11-12 | MVP 03 de conversaciones | Usar cursor opaco `(createdAt, id)` y devolver 404 para miembros no autorizados | La paginación es estable y las rutas no filtran la existencia de conversaciones privadas. |
| 2026-11-16 | MVP 04 de tiempo real | Usar eventos WebSocket validados y estado efímero en Redis: presencia por conexión (TTL 60 s) y escritura por usuario (TTL 8 s) | Un cliente renueva presencia con `presence.heartbeat`; la interfaz elimina estados de escritura con `expiresAt` aunque no reciba un evento de cierre. |
| 2026-11-16 | Reconexión de MVP 04 | Sincronizar mediante `GET /messages?after=<cursor>` en orden cronológico | El cliente conserva el cursor opaco del último mensaje confirmado y deduplica por identificador durante la transición entre HTTP y WebSocket. |
| 2026-11-18 | Notificaciones de MVP 05 | Usar Redis como cola con deduplicación por evento y Mailpit como único transporte en desarrollo | Los avisos se desacoplan del envío del mensaje, se omiten usuarios conectados y se reintentan como máximo tres veces. |
| 2026-11-18 | Preferencias de MVP 05 | Crear la preferencia de correo bajo demanda y usar `emailEnabled: true` si todavía no existe fila | Los usuarios existentes conservan notificaciones; cada usuario puede desactivarlas sin afectar a otros miembros. |
| 2026-11-19 | Inicio de MVP 06 | Conservar la documentación de backend como historial de MVP y añadir reglas y documentación locales para el frontend | El cliente tendrá un contrato y una guía propios sin romper enlaces ni mezclar detalles de Vue con la API. |
| 2026-11-19 | MVP 06.2 de frontend | Restaurar la sesión mediante `GET /auth/me` en la primera navegación y usar únicamente cookies HTTP-only para autenticar | La UI nunca persiste credenciales; una sesión ausente lleva a acceso y un fallo de red permite reintentar sin bloquear la navegación. |
| 2026-11-19 | MVP 06.3 de frontend | Mantener mensajes por conversación en orden ascendente `(createdAt, id)` y consumir páginas anteriores con el cursor opaco del API | El backend puede responder páginas en orden descendente; el cliente une por ID y ordena antes de mostrarlos para no duplicar mensajes al paginar o sincronizar en MVP 06.4. |
