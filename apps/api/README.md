# API de Conversa

API HTTP y WebSocket de Conversa para identidad, conversaciones privadas, mensajes, adjuntos y notificaciones.

## Configuración

```powershell
Copy-Item .env.example .env
```

Completa los valores de `DATABASE_URL`, `REDIS_URL` y `API_SECRET`. Para ejecutar desde el equipo anfitrión, usa `localhost` en las URL de PostgreSQL y Redis. Para ejecutar desde el contenedor de API, usa los nombres de servicio `postgres` y `redis`.

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

## Conversaciones

Todas las rutas requieren la cookie `chat_session` de una sesión autenticada.

| Ruta | Descripción |
| --- | --- |
| `POST /conversations` | Crea una conversación privada con `{ "participantEmail" }`. |
| `GET /conversations` | Lista solo las conversaciones de la persona autenticada. |
| `POST /conversations/:conversationId/members` | Añade un miembro mediante `{ "email" }`. |
| `POST /conversations/:conversationId/messages` | Persiste un mensaje mediante `{ "content" }`. |
| `GET /conversations/:conversationId/messages?limit=20&cursor=...` | Obtiene mensajes en orden descendente y cursor opaco. |

Las rutas de una conversación ajena devuelven `404`, para no revelar su existencia. El cursor de `messages` debe tratarse como opaco y reenviarse sin modificarlo.

## Validación integrada de MVP 03

```powershell
cd ../..
docker compose --profile app up -d --build api
docker compose --profile app run --rm api npm run db:migrate
docker compose --profile app run --rm api npm run db:verify
```

En Postman, registra dos cuentas y guarda cada cookie en su propia sesión. Con la sesión de la primera cuenta crea una conversación indicando el email de la segunda; después envía un mensaje y comprueba que la segunda cuenta puede listarlo. Una tercera cuenta debe recibir `404` al intentar acceder a esa conversación.
