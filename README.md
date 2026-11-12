# Chat Yes/No Upgrade

Base de desarrollo para evolucionar la aplicación a un chat autenticado, persistente y multiusuario.

## Servicios locales

| Servicio | Uso | Dirección local |
| --- | --- | --- |
| PostgreSQL | Usuarios, conversaciones y mensajes | `localhost:5432` |
| Redis | Presencia, rate limiting, colas y caché | `localhost:6379` |
| SeaweedFS | Adjuntos y avatares mediante API S3 | `http://localhost:8333` |
| Mailpit | Captura de correos de desarrollo | [Bandeja](http://localhost:8025) |

## Inicio rápido

```powershell
Copy-Item .env.example .env
# Edita .env y usa contraseñas locales seguras.
docker compose up -d
docker compose ps
```

Para detener el entorno:

```powershell
docker compose down
```

Para eliminar también los datos locales:

```powershell
docker compose down -v
```

> `down -v` elimina las conversaciones, mensajes, caché y archivos almacenados localmente.

## Estructura

```text
apps/
  api/          # Backend HTTP/WebSocket (pendiente de implementar)
  frontend/     # Cliente Vue (pendiente de migrar o crear)
packages/
  contracts/    # DTOs y esquemas compartidos
infra/
  postgres/     # Inicialización y migraciones locales
docs/           # Arquitectura, ADR y guías operativas
```

Consulta [la guía del entorno](docs/DEVELOPMENT_ENV.md) antes de añadir la API o el frontend.
