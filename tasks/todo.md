# Todo

## Revisión - 2026-06-19 - Rollback media responsive unificado
- Se ha revertido el bloque visual unificado de imagen/video.
- Se mantienen los campos separados del JSON y los cambios previos aceptados.
- Validación: `npm.cmd run build` correcto, con warning de budget existente.
## Revisión - 2026-06-22 - Handoff para nuevo chat
- Se ha creado `tasks/handoff-new-chat.md` con el contexto actual del proyecto.
- Incluye cambios hechos, rollback reciente, validaciones y recomendaciones para continuar.

## Revisión - 2026-06-22 - Lectura de handoff
- Se ha revisado `tasks/handoff-new-chat.md`, `tasks/lessons.md` y el estado actual del repo.
- No existe `AGENTS.md` en la raíz; se aplican las instrucciones pegadas en el chat.
- Validación: `npm.cmd run build` correcto, con warning de budget existente.

## Revisión - 2026-06-22 - AGENTS y gitignore local
- Se ha creado `AGENTS.md` en la raíz con las reglas operativas del proyecto.
- Se ha añadido una sección en `.gitignore` para logs, capturas `chrome-check*.png` y `chrome-debug-profile/`.
- Nota: `api.log`, `ng.log` y `ng.err` ya están trackeados; `.gitignore` no los oculta hasta que se saquen del índice.

## Revisión - 2026-06-22 - Logs fuera del índice
- Se ha ejecutado `git rm --cached` sobre `api.log`, `ng.log` y `ng.err`.
- Los archivos siguen existiendo en local, pero dejan de estar versionados.
- Se ha añadido `*.err` a `.gitignore` para cubrir `ng.err`.

## Revisión - 2026-06-22 - Tests mínimos de normalización a null
- Se ha añadido un target `test` con el builder unitario de Angular y runner Vitest.
- Se han añadido 3 specs para proteger que textos, media responsive y `ecom_link` vacíos acaban en `null`.
- Validación: `npm.cmd test` correcto, 3 tests pasan.
- Validación: `npm.cmd run build` correcto, con warning de budget existente.

## Revisión - 2026-06-22 - Comando check
- Se ha añadido `npm run check` para ejecutar build y tests en una sola validación.
- Validación: `npm.cmd run check` correcto; build OK y 3 tests pasan.
- Nota: se mantiene el warning de budget existente.

## Revisión - 2026-06-22 - README check y tests
- Se ha documentado `npm run check` como validación principal.
- Se ha aclarado que los tests cubren normalización a `null` y el uso de `npm.cmd` en PowerShell.
- Validación: `npm.cmd run check` correcto; build OK y 3 tests pasan.

## Revisión - 2026-06-22 - Auditoría npm
- Se ha ejecutado `npm.cmd audit` en modo lectura, sin aplicar fixes.
- Resultado total: 15 vulnerabilidades, 2 low, 3 moderate y 10 high.
- Resultado runtime con `npm.cmd audit --omit=dev`: 6 vulnerabilidades en Angular, 1 moderate y 5 high.
- Nota: `npm audit fix` está disponible para Angular, pero no se ha ejecutado para evitar cambios automáticos de dependencias.

## Revisión - 2026-06-22 - Fix de vulnerabilidades runtime
- Se ha ejecutado `npm.cmd audit fix` y se han actualizado dependencias Angular a versiones no vulnerables en runtime.
- Versiones principales: Angular runtime `21.2.17`, `@angular/compiler-cli` `21.2.17`, CLI/build `21.2.16`.
- Validación: `npm.cmd audit --omit=dev` correcto, 0 vulnerabilidades runtime.
- Validación: `npm.cmd run check` correcto; build OK y 3 tests pasan.
- Nota: `npm.cmd audit` total mantiene 7 vulnerabilidades en tooling (`@angular/build`/Vite/esbuild/undici/piscina/Babel) sin fix disponible no forzado.

## Revisión - 2026-06-22 - Checklist manual README
- Se ha añadido una sección de validación manual al `README.md`.
- El checklist cubre selección de landing, añadir/quitar texto, media, link, guardado y recarga.
- No se ha relanzado build porque el cambio es solo documentación.

## Revisión - 2026-06-22 - Tasks versionables
- Se ha revisado `tasks/` y solo contiene `todo.md`, `lessons.md` y `handoff-new-chat.md`.
- Se dejan esos tres archivos como documentación intencional del proyecto.
- No se ha relanzado build porque el cambio es solo documentación/organización.
