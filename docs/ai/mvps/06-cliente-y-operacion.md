# MVP 06 — Cliente integrado y operación

## Resultado

Un cliente Vue consume autenticación, conversaciones y tiempo real, con calidad de entrega automatizada.

## Pasos

1. Crear o migrar el cliente a `apps/frontend`.
2. Implementar sesión, lista de conversaciones y vista de mensajes.
3. Conectar cliente HTTP y WebSocket con estados de carga, vacío, error y reconexión.
4. Integrar adjuntos y preferencias de notificación cuando estén disponibles.
5. Añadir trazabilidad de errores y eventos de producto sin datos sensibles.
6. Crear CI para tests, lint, tipos y build de todos los workspaces.

## Criterios de aceptación

- El flujo registro → conversación → mensaje en tiempo real funciona entre dos sesiones.
- Los errores de API son comprensibles y recuperables.
- Navegación por teclado y etiquetas accesibles cubren el flujo principal.
- CI bloquea cambios con validaciones fallidas.

## Pruebas

- Componentes y composables del cliente.
- E2E del flujo principal con dos usuarios.
- Pruebas de accesibilidad del flujo de autenticación y chat.
- Pipeline de CI ejecutado en un cambio de prueba.
