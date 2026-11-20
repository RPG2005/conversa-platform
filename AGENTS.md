# Guía para agentes de IA

## Objetivo del repositorio

Construir Conversa, una plataforma de chat autenticada, persistente y multiusuario. El repositorio se llama `conversa-platform`; el entorno local proporciona PostgreSQL, Redis, almacenamiento compatible con S3 y Mailpit.

## Antes de modificar código

1. Lee `README.md`, `docs/DEVELOPMENT_ENV.md` y el MVP activo en `docs/ai/mvps/`.
2. Inspecciona el estado con `git status --short`; no sobrescribas cambios ajenos.
3. Define el alcance exacto de la fase y no implementes funcionalidades futuras por adelantado.
4. Nunca leas, muestres ni incluyas `.env` en commits, logs o respuestas.

## Arquitectura prevista

```text
apps/frontend/       Vue 3 + TypeScript
apps/api/            API HTTP/WebSocket + TypeScript
packages/contracts/  DTOs, esquemas de validación y tipos compartidos
infra/               Docker, inicialización de bases de datos y migraciones
docs/                Decisiones, operación y planes de IA
```

## Reglas de implementación

- Mantén módulos pequeños y separa presentación, dominio e infraestructura.
- Valida cualquier entrada externa en tiempo de ejecución; TypeScript no sustituye esa validación.
- Toda ruta autenticada debe comprobar identidad y pertenencia a la conversación.
- Usa UUIDs para entidades públicas y timestamps ISO en UTC.
- No expongas contraseñas, tokens ni claves S3 al frontend.
- Usa migraciones para cualquier cambio de esquema; no dependas de modificaciones manuales de la base de datos.
- Para tiempo real, persiste primero el mensaje y publícalo después mediante un evento.
- Incluye estados de carga, vacío y error en cualquier funcionalidad visible.

## Calidad obligatoria

Antes de cerrar una tarea, ejecuta los comandos aplicables:

```powershell
docker compose ps
# Cuando existan aplicaciones:
npm run test:unit
npm run lint
npm run build
```

Cada cambio debe incluir pruebas para éxito, error y autorización cuando corresponda. No declares una entrega terminada si las comprobaciones fallan o no se pudieron ejecutar; explica la limitación.

## Entregas MVP

Sigue el orden definido en `docs/ai/README.md`. Cada MVP es un cambio integrable por sí mismo y debe respetar los criterios de aceptación y las pruebas de su ficha.

## Entrega de resultados

- Resume archivos cambiados, comportamiento y comandos ejecutados.
- Indica cualquier decisión tomada que afecte a la siguiente fase en `docs/ai/DECISIONS.md`.
- No hagas commits, pushes, despliegues ni borrados de datos sin petición explícita.
