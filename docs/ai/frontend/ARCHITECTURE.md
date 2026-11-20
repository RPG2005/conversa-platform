# Arquitectura del cliente

```text
src/
  contracts/      DTOs de API y WebSocket
  services/       Clientes HTTP/WebSocket y captura segura de errores
  stores/         Sesión y conversaciones
  composables/    Lógica reutilizable de vista
  components/     Componentes visuales sin acceso directo a red
  views/          Rutas y composición de pantalla
```

El cliente HTTP usa `credentials: 'include'`, normaliza errores de API y no persiste secretos. El store de sesión es la fuente de verdad para el usuario actual. El store de conversaciones mantiene mensajes por conversación y cursores opacos.

Las vistas no construyen URLs de API ni manipulan WebSocket directamente; delegan en servicios y stores. La respuesta de adjuntos solo conserva metadatos públicos y solicita una URL de descarga bajo demanda.

El manejador global de errores registra solo el nombre permitido de la clase de error, su origen y la hora. Nunca registra mensajes, stacks, contenido de mensajes, cookies ni URLs completas. Los E2E usan contextos de navegador aislados y desactivan capturas, vídeos y trazas.
