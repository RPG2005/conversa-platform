# Matriz de pruebas

## Por cada MVP

- Pruebas unitarias de reglas de dominio y validadores.
- Pruebas de integración para repositorios, API y servicios Docker implicados.
- Pruebas de autorización: usuario autenticado, no autenticado y usuario sin pertenencia.
- Prueba de regresión del flujo feliz de la fase anterior.
- `lint`, comprobación de tipos y build.

## Casos transversales

| Área | Casos mínimos |
| --- | --- |
| Seguridad | Secretos ausentes, token inválido/expirado, acceso a recurso ajeno y rate limiting. |
| Persistencia | Migración desde base vacía, rollback comprobable y restricción de claves foráneas. |
| API | Datos válidos, payload inválido, error de dependencia, 401, 403, 404 y 429. |
| Tiempo real | Reconexión, duplicados, orden de eventos y destinatario no autorizado. |
| UI | Carga, vacío, error, teclado, foco visible y lector de pantalla. |
| Archivos | Tipo/tamaño inválido, acceso sin firma y objeto inexistente. |

## Comandos de control

```powershell
docker compose ps
docker compose logs --tail=100
# Añadir los comandos de cada workspace cuando se creen.
```
