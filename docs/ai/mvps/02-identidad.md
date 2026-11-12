# MVP 02 — Identidad y sesiones

## Resultado

Una persona puede registrarse, iniciar sesión, cerrar sesión y consultar su perfil mediante una sesión segura.

## Pasos

1. Crear modelo y migración de `users` con email único, nombre, hash de contraseña y auditoría.
2. Implementar hashing de contraseña con algoritmo resistente y parámetros configurables.
3. Implementar registro, login, logout y `GET /me`.
4. Establecer tokens de sesión de corta duración y renovación o cookies HTTP-only según la decisión documentada.
5. Configurar Mailpit para flujos futuros de verificación/restablecimiento.
6. Aplicar rate limiting a registro y login usando Redis.

## Criterios de aceptación

- No se almacenan contraseñas en texto claro.
- Email duplicado devuelve un conflicto sin revelar información innecesaria.
- Una ruta privada rechaza token inválido, expirado o ausente.
- Logout invalida la sesión correspondiente.

## Pruebas

- Hashing y validación de credenciales.
- Registro, login, perfil y logout mediante integración HTTP.
- 400, 401, 409 y 429.
- Verificación de cookies/headers de seguridad elegidos.
