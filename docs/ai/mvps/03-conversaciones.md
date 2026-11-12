# MVP 03 — Conversaciones y mensajes persistentes

## Resultado

Usuarios autenticados pueden crear una conversación privada, invitar a una persona y enviar/consultar mensajes persistidos.

## Pasos

1. Migrar `conversations`, `conversation_members` y `messages` con UUIDs, índices y claves foráneas.
2. Definir DTOs y esquemas compartidos en `packages/contracts`.
3. Implementar crear conversación, listar conversaciones, añadir participante, listar mensajes y enviar mensaje.
4. Aplicar autorización de pertenencia en cada ruta.
5. Implementar paginación por cursor para mensajes.

## Criterios de aceptación

- Nadie puede leer ni escribir una conversación ajena.
- Un mensaje se guarda con autor, conversación, contenido y timestamp UTC.
- La lista de mensajes es estable y paginable.
- El borrado de un usuario no deja filas huérfanas.

## Pruebas

- Repositorios y restricciones de base de datos.
- API de conversación para participante/no participante.
- Paginación, contenido inválido y conversación inexistente.
