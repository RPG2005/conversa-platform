# Pruebas del cliente

| Nivel | Cobertura mínima |
| --- | --- |
| Unitarias | Cliente HTTP, sesión, cursores, deduplicación y reconexión. |
| Componentes | Formularios, estados de carga/error/vacío, compositor y adjuntos. |
| E2E | Registro por teclado, conversación entre dos cuentas aisladas y mensaje en tiempo real. |
| Accesibilidad | axe-core analiza acceso y chat con WCAG 2.1 A/AA; se comprueba teclado en registro. |

Las pruebas E2E usan el entorno Docker, generan cuentas con identificadores únicos y no guardan trazas, capturas, vídeos, cookies ni URLs firmadas. El reporte de errores del navegador conserva solo clase de error, origen y hora; omite mensaje y stack.

## E2E local en Windows

Con la API y el frontend levantados por Docker (`http://localhost:3000` y `http://localhost:5173`):

```powershell
Push-Location apps/frontend
npm.cmd ci
npm.cmd run test:e2e:install
npm.cmd run test:e2e
Pop-Location
```

En Linux o macOS, sustituye `npm.cmd` por `npm`. La prueba crea dos usuarios y una conversación nuevos; sus datos permanecen en la base local.

El workflow `Quality gates` corre lint, pruebas unitarias y build de ambas aplicaciones, y ejecuta E2E/a11y con un stack Docker efímero en pull requests hacia `master` y en cada push a `master`.
