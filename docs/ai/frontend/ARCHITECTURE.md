# Arquitectura del cliente

```text
src/
  contracts/      DTOs de API y WebSocket
  services/       Cliente HTTP y conexión WebSocket
  stores/         Sesión y conversaciones
  composables/    Lógica reutilizable de vista
  components/     Componentes visuales sin acceso directo a red
  views/          Rutas y composición de pantalla
```

El cliente HTTP usa `credentials: 'include'`, normaliza errores de API y no persiste secretos. El store de sesión es la fuente de verdad para el usuario actual. El store de conversaciones mantiene mensajes por conversación y cursores opacos.

Las vistas no construyen URLs de API ni manipulan WebSocket directamente; delegan en servicios y stores. La respuesta de adjuntos solo conserva metadatos públicos y solicita una URL de descarga bajo demanda.
