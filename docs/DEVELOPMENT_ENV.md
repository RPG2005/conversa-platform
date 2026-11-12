# Guía del entorno local

## Propósito de cada servicio

- **PostgreSQL** es la fuente de verdad: usuarios, conversaciones, miembros, mensajes y recibos de lectura.
- **Redis** guarda estado efímero, como presencia, indicadores de escritura, limitación de peticiones y trabajos en cola.
- **SeaweedFS** proporciona almacenamiento compatible con S3 para adjuntos y avatares; usa el bucket local `chat-media`.
- **Mailpit** intercepta el correo de verificación y recuperación de contraseña. No entrega correo real.

## Variables que usará el backend

```dotenv
DATABASE_URL=postgresql://chat_user:password@postgres:5432/chat_yes_no
REDIS_URL=redis://:password@redis:6379
S3_ENDPOINT=http://object-storage:8333
S3_BUCKET=chat-media
SMTP_HOST=mailpit
SMTP_PORT=1025
```

Los nombres de host anteriores funcionan entre contenedores. Desde el equipo anfitrión se usan `localhost` y los puertos definidos en `.env`.

## Próximos entregables técnicos

1. Crear `apps/api` con autenticación, migraciones y healthcheck.
2. Definir el paquete `packages/contracts` con DTOs y validación de esquemas.
3. Migrar o crear `apps/frontend` y conectarlo a la API.
4. Añadir un gateway WebSocket y persistencia de mensajes.
5. Añadir CI que ejecute tests, lint y build de cada aplicación.

## Operaciones útiles

```powershell
docker compose logs -f postgres
docker compose exec postgres psql -U chat_user -d chat_yes_no
docker compose exec redis redis-cli -a $env:REDIS_PASSWORD ping
```
