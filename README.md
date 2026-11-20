# Conversa Platform

Plataforma de chat autenticada, persistente y multiusuario, con API, cliente web, tiempo real, adjuntos e infraestructura local.

## Servicios locales

| Servicio | Uso | Dirección local |
| --- | --- | --- |
| PostgreSQL | Usuarios, conversaciones y mensajes | `localhost:5432` |
| Redis | Presencia, rate limiting, colas y caché | `localhost:6379` |
| SeaweedFS | Adjuntos y avatares mediante API S3 | `http://localhost:8333` |
| Mailpit | Captura de correos de desarrollo | [Bandeja](http://localhost:8025) |
| API (perfil `app`) | Identidad, conversaciones, tiempo real, adjuntos y notificaciones | `http://localhost:3000` |
| Frontend (perfil `app`) | Cliente Vue con recarga en caliente | `http://localhost:5173` |

## Inicio rápido

Compose usa el proyecto `conversa-platform`. Los volúmenes locales conservan sus identificadores anteriores para reutilizar los datos existentes.

```powershell
Copy-Item .env.example .env
# Edita .env y usa contraseñas locales seguras.
@('chat-yes-no-upgrade_postgres_data', 'chat-yes-no-upgrade_redis_data', 'chat-yes-no-upgrade_object_storage_data', 'chat-yes-no-upgrade_frontend_node_modules') | ForEach-Object { docker volume create $_ | Out-Null }
docker compose up -d
docker compose ps
```

En Linux o macOS, crea los volúmenes persistentes antes de iniciar Compose:

```sh
for volume in chat-yes-no-upgrade_postgres_data chat-yes-no-upgrade_redis_data chat-yes-no-upgrade_object_storage_data chat-yes-no-upgrade_frontend_node_modules; do docker volume create "$volume" >/dev/null; done
```

Para compilar y levantar también la API:

```powershell
docker compose --profile app up -d --build
docker compose --profile app run --rm api npm run db:migrate
docker compose --profile app run --rm api npm run db:verify
```

Comprueba sus dependencias en [http://localhost:3000/health](http://localhost:3000/health).

Para detener el entorno:

```powershell
docker compose down
```

Para eliminar los contenedores y, de forma separada, los datos locales:

```powershell
docker compose down
docker volume rm chat-yes-no-upgrade_postgres_data chat-yes-no-upgrade_redis_data chat-yes-no-upgrade_object_storage_data chat-yes-no-upgrade_frontend_node_modules
```

El segundo comando elimina conversaciones, mensajes, caché y archivos almacenados localmente.

## Estructura

```text
apps/
  api/          # Backend HTTP base y futuras capacidades WebSocket
  frontend/     # Cliente Vue integrado con la API
packages/
  contracts/    # DTOs y esquemas compartidos
infra/
  postgres/     # Inicialización y migraciones locales
docs/           # Arquitectura, ADR y guías operativas
```

Consulta [la guía del entorno](docs/DEVELOPMENT_ENV.md) antes de añadir la API o el frontend.
