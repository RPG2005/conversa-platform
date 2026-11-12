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
