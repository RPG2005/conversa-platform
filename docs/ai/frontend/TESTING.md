# Pruebas del cliente

| Nivel | Cobertura mínima |
| --- | --- |
| Unitarias | Cliente HTTP, sesión, cursores, deduplicación y reconexión. |
| Componentes | Formularios, estados de carga/error/vacío, compositor y adjuntos. |
| E2E | Registro, login, conversación entre dos sesiones, mensaje y reconexión. |
| Accesibilidad | Teclado, foco, etiquetas y anuncios de error del acceso y chat. |

Las pruebas E2E usan el entorno Docker, usuarios con `run_id` único y no muestran cookies ni URLs firmadas en artefactos.
