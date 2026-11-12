# API de Chat Yes/No

API HTTP inicial de la plataforma. En el MVP 01 expone un healthcheck y prepara el esquema de usuarios.

## Configuración

```powershell
Copy-Item .env.example .env
```

Completa los valores de `DATABASE_URL`, `REDIS_URL` y `API_SECRET`. Para ejecutar desde el equipo anfitrión, usa `localhost` en las URL de PostgreSQL y Redis. Para ejecutar desde un futuro contenedor de API, usa los nombres de servicio `postgres` y `redis`.

Con el entorno raíz configurado, también puede iniciarse mediante Docker:

```powershell
cd ../..
docker compose --profile app up -d --build
docker compose --profile app run --rm api npm run db:migrate
docker compose --profile app run --rm api npm run db:verify
```

## Comandos

```powershell
npm install
npm run dev
npm run db:generate
npm run db:migrate
npm run db:verify
npm run test:unit
npm run lint
npm run type-check
npm run build
```

## Healthcheck

`GET /health` responde 200 cuando PostgreSQL y Redis están disponibles. Devuelve 503 e identifica la dependencia no disponible en cualquier otro caso.

```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

## Autenticación

| Ruta | Descripción |
| --- | --- |
| `POST /auth/register` | Crea una cuenta y establece una cookie de sesión HTTP-only. |
| `POST /auth/login` | Inicia sesión con email y contraseña. |
| `POST /auth/logout` | Invalida la sesión actual y borra su cookie. |
| `GET /auth/me` | Devuelve el perfil de la sesión actual; requiere cookie válida. |

Registro y login limitan las peticiones por IP mediante Redis. Las contraseñas se guardan como hashes `scrypt` con sal aleatoria y las sesiones guardan únicamente el hash SHA-256 del token opaco.

## Validación integrada de MVP 02

Después de crear la imagen de API, aplica la nueva migración y reinicia la API:

```powershell
cd ../..
docker compose --profile app run --rm api npm run db:migrate
docker compose --profile app up -d --build api
```

El siguiente ejemplo registra una cuenta y conserva la cookie localmente:

```powershell
$body = @{ email = 'ada@example.com'; displayName = 'Ada'; password = 'secure-password-123' } | ConvertTo-Json
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/register -ContentType 'application/json' -Body $body -WebSession $session
Invoke-RestMethod -Uri http://localhost:3000/auth/me -WebSession $session
```
