# Pruebas Postman

## Contenido

- `collections/chat-yes-no-api/`: colección v3 de pruebas ordenadas para healthcheck, identidad y conversaciones.
- `environments/local.environment.yaml`: variables del entorno Docker local, sin secretos incluidos.

## Preparación

1. Importa la carpeta `postman/collections/chat-yes-no-api/` en Postman.
2. Importa y selecciona el entorno `postman/environments/local.environment.yaml`.
3. Configura `test_password` como secreto con una contraseña local de, al menos, 12 caracteres.
4. Confirma que la API está disponible en `http://localhost:3000/health`.

## Ejecución

Ejecuta las peticiones en el orden indicado, o utiliza el Collection Runner. La primera petición genera `run_id`; las peticiones posteriores usan emails únicos y almacenan en el entorno las cookies de Ada, Bob y Eve, el ID de conversación y el cursor.

Para repetir toda la colección, vacía `run_id`, `ada_session`, `bob_session`, `eve_session`, `conversation_id` y `next_cursor` del entorno. No copies valores de cookie a archivos versionados.

## Verificación de estructura

```powershell
postman collection lint postman/collections/chat-yes-no-api
```

La colección tiene aserciones para códigos HTTP, aislamiento de conversaciones, persistencia de mensajes y paginación.
