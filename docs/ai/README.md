# Desarrollo asistido por IA

Este directorio convierte el objetivo del producto en entregas MVP pequeñas. Un agente debe seleccionar una sola ficha, ejecutarla por completo y validarla antes de pasar a la siguiente.

## Secuencia

| MVP | Resultado | Estado inicial |
| --- | --- | --- |
| [MVP 01](mvps/01-api-base.md) | API con healthcheck, configuración y migraciones | Pendiente |
| [MVP 02](mvps/02-identidad.md) | Registro, login y sesiones seguras | Pendiente |
| [MVP 03](mvps/03-conversaciones.md) | Conversaciones privadas y mensajes persistentes | Pendiente |
| [MVP 04](mvps/04-tiempo-real.md) | Mensajes, presencia y escritura en tiempo real | Pendiente |
| [MVP 05](mvps/05-archivos-y-notificaciones.md) | Adjuntos S3 y notificaciones de desarrollo | Pendiente |
| [MVP 06](mvps/06-cliente-y-operacion.md) | Cliente integrado, observabilidad y CI | Pendiente |

## Uso

1. Lee `AGENTS.md` y la ficha del MVP seleccionado.
2. Realiza solo los pasos de esa ficha.
3. Ejecuta todas las pruebas de su sección de validación.
4. Registra decisiones relevantes en `DECISIONS.md`.
5. Actualiza el estado de la tabla únicamente cuando los criterios estén verificados.

Consulta [la matriz de pruebas](TESTING.md) para los casos transversales.
