# Reglas del frontend

Estas reglas complementan el `AGENTS.md` de la raíz; sus restricciones de seguridad, Git y calidad siguen siendo obligatorias.

## Stack y estructura

- Usa Vue 3, TypeScript, Vite, Vue Router y Pinia.
- Separa vistas, componentes, composables, stores, servicios HTTP y tipos.
- Mantén las llamadas HTTP y WebSocket fuera de componentes visuales.
- No dupliques contratos del backend sin documentar el motivo; centralízalos en `src/contracts/` hasta que exista `packages/contracts`.

## Sesión y red

- La sesión se autentica con cookies HTTP-only: usa `credentials: 'include'` en las llamadas HTTP y nunca guardes tokens en `localStorage`.
- Trata `401` como sesión expirada: limpia el estado local y redirige a acceso.
- El WebSocket usa la cookie de sesión del navegador; no envíes secretos en mensajes ni en URL.
- Al reconectar, sincroniza mediante el cursor de mensajes antes de confiar en eventos nuevos.

## Experiencia y accesibilidad

- Cada pantalla visible debe contemplar carga, vacío, error y reintento.
- Usa etiquetas, foco visible, navegación por teclado y mensajes de estado accesibles.
- Muestra las fechas en hora local; los datos intercambiados con API permanecen en ISO UTC.
- No muestres URL firmadas ni claves internas de adjuntos.

## Validación

- Añade pruebas unitarias para composables, stores y componentes con lógica.
- Antes de cerrar una entrega, ejecuta `npm run test:unit`, `npm run lint` y `npm run build` desde `apps/frontend`.
