# Automatización de pruebas HTTP

Los scripts ejecutan la colección local con Postman CLI y generan un `run_id` único para evitar colisiones entre usuarios de prueba.

## Requisitos

1. Arranca la API: `docker compose --profile app up -d --build api`.
2. Instala Postman CLI y verifica `postman --version`.
3. No copies cookies, URLs firmadas ni `.env` en informes.

## PowerShell

```powershell
.\scripts\test-api.ps1 -Suite core
.\scripts\test-api.ps1 -Suite attachments
.\scripts\test-api.ps1 -Suite all
```

## Linux

```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh core
./scripts/test-api.sh attachments
./scripts/test-api.sh all
```

Define una contraseña local distinta en Linux con `TEST_PASSWORD`; debe tener al menos 12 caracteres.

## Suites

- `core`: salud, identidad, conversación, autorización, mensajes, paginación, sincronización y preferencias.
- `attachments`: prepara una conversación y prueba el flujo de adjuntos con un PDF temporal de 1024 bytes, eliminado al terminar.
- `all`: ejecuta ambos conjuntos.

WebSocket, presencia, escritura y verificación visual de Mailpit siguen siendo manuales. Consulta [NOTIFICATIONS_TESTING.md](NOTIFICATIONS_TESTING.md) y las descripciones de las peticiones WebSocket.
