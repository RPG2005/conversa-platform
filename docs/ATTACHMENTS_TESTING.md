# Pruebas de adjuntos locales

## Preparación

1. Reconstruye la API: `docker compose --profile app up -d --build api`.
2. En Postman, ejecuta el flujo de registro, creación de conversación y conexión de Ada.
3. Ejecuta **Create attachment upload URL**. Debe devolver `201`, un `attachment.id` y `uploadUrl`.

## Carga válida

Envía un `PUT` a `{{attachment_upload_url}}` con un archivo PDF de menos de 10 MB y el encabezado `Content-Type: application/pdf`. La respuesta esperada de SeaweedFS es `200` o `204`.

Después ejecuta **Complete attachment upload**. La API consulta SeaweedFS y debe responder `200` con `attachment.status: "uploaded"`. Si el archivo real tiene otro MIME o tamaño distinto al declarado, responde `409` y no queda validado.

## Descarga privada

Ejecuta **Get attachment download URL** después de completar la carga. Un miembro de la conversación recibe `downloadUrl` y `expiresInSeconds: 300`; la colección guarda la URL en `attachment_download_url`.

Abre una petición temporal `GET {{attachment_download_url}}`, sin cookie ni encabezado de autorización. Debe descargar el archivo. Antes de completar la carga, sin sesión o con un usuario ajeno, la API debe responder `404` o `401` y no revelar una URL firmada.

## Rechazos obligatorios

- Cambia `contentType` a `text/plain`: la API debe responder `400` y no crear una clave S3.
- Usa `size: 10485761`: la API debe responder `400`.
- Repite la petición con la cookie de Mallory, que no pertenece a la conversación: debe responder `404`.
- Elimina la cookie: debe responder `401`.

## Inspección

Comprueba metadatos en PostgreSQL:

```sql
SELECT id, conversation_id, original_name, content_type, size, status, created_at
FROM attachments
ORDER BY created_at DESC;
```

Nunca pegues URLs firmadas, cookies o valores de `.env` en tickets o commits.
