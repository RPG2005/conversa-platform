# MVP 01 — API base y esquema inicial

## Resultado

Un servicio API TypeScript ejecutable con configuración validada, healthcheck y migraciones de PostgreSQL.

## Pasos

1. Inicializar `apps/api` con TypeScript, framework HTTP y runner de pruebas.
2. Añadir carga de configuración que falle al arrancar si faltan `DATABASE_URL`, `REDIS_URL` o secretos requeridos.
3. Crear `GET /health` que compruebe API, PostgreSQL y Redis.
4. Configurar una herramienta de migraciones.
5. Añadir la primera migración con extensiones, tabla de usuarios y timestamps de auditoría.
6. Documentar cómo ejecutar API y migraciones con Docker activo.

## Criterios de aceptación

- La API no arranca con configuración incompleta.
- `GET /health` devuelve 200 solo si PostgreSQL y Redis están accesibles.
- Una base vacía puede aplicar las migraciones repetidamente sin cambios pendientes.
- El repositorio no contiene secretos.

## Pruebas

- Unitarias para validación de configuración.
- Integración para healthcheck con dependencias disponibles/no disponibles.
- Integración de migración en una base vacía.
- Lint, tipos y build.
