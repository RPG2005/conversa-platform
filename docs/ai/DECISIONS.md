# Registro de decisiones de IA

Registra decisiones que alteren contratos, infraestructura, seguridad o el orden de los MVPs.

| Fecha | Contexto | Decisión | Consecuencia |
| --- | --- | --- | --- |
| 2026-11-12 | Entorno local de objetos | Usar SeaweedFS con API S3 en lugar de MinIO | `S3_ENDPOINT` apunta a `object-storage:8333`. |
| 2026-11-12 | MVP 01 de API | Usar Fastify, `pg`, ioredis y Drizzle | API HTTP tipada, healthcheck inyectable y migraciones SQL reproducibles. |
| 2026-11-12 | MVP 02 de identidad | Usar sesiones opacas en cookie HTTP-only y hashes `scrypt` | El cliente no recibe tokens ni hashes persistibles; Redis limita login y registro. |
| 2026-11-12 | MVP 03 de conversaciones | Usar cursor opaco `(createdAt, id)` y devolver 404 para miembros no autorizados | La paginación es estable y las rutas no filtran la existencia de conversaciones privadas. |
