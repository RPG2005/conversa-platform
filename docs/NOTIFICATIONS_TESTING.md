# Pruebas de notificaciones locales

1. Reconstruye la API: `docker compose --profile app up -d --build api`.
2. Asegúrate de que Bob no tenga una conexión WebSocket abierta.
3. Con la sesión de Ada, envía un mensaje a la conversación compartida.
4. Espera hasta dos segundos y abre [Mailpit](http://localhost:8025). Debe aparecer un correo dirigido a Bob.
5. Conecta a Bob al WebSocket de la conversación y envía otro mensaje desde Ada. No debe llegar un correo adicional mientras Bob permanezca conectado.

Para inspeccionar trabajos pendientes sin revelar credenciales:

```powershell
docker compose exec redis redis-cli LLEN chat:notifications:pending
```

El worker intenta cada trabajo un máximo de tres veces. Las pruebas unitarias cubren entrega a desconectados y reintento ante fallo.
