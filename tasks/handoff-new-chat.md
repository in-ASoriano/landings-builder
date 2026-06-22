# Contexto para nuevo chat - landing-builder

Estamos trabajando en `C:\Users\andreu.soriano_sklum\Desktop\landing-builder`.

## Reglas importantes
- Usuario trabaja con Git Bash, no CMD.
- Aplicar Ponytail/full: cambios pequeños, reutilizar antes de crear, no sobreingenieria.
- Antes de tocar código: revisar patrones existentes.
- Mantener BEM/Sass anidado limpio.
- No tocar ni revertir cambios no relacionados.
- Si hay corrección del usuario, actualizar `tasks/lessons.md`.
- Al completar tareas, añadir revisión en `tasks/todo.md`.

## Estado general
La app es un editor de landings Angular con API local Node.
Comandos usados:
- `npm.cmd run build`
- `npm run api`
- Angular dev server en `http://localhost:4200`
- API en `http://localhost:4301`

El build compila OK, pero mantiene warning de budget Angular existente.

## Cambios hechos hasta ahora

### README / comandos
- `README.md` se reescribió con comandos claros para Git Bash.
- Se documentó cómo levantar API, frontend y validar build.

### Editor visual
- Añadidas acciones rápidas para añadir/quitar textos.
- Añadidas acciones rápidas para añadir/quitar imagen, video, link y backgroundcolor.
- Botones de acciones rápidas cambiados a iconos.
- Ajustados padding/gap de botones para que respiren mejor.
- Añadido borrado de campos de texto.
- Añadido `Ctrl + Z` / `Cmd + Z` para deshacer cambios.
- Draft en memoria para no tener que recargar tras crear campos.

### JSON / valores null
- Al quitar campos editables, deben quedarse como `null` cuando no haya contenido.
- Esto aplica a textos, media responsive, `ecom_link` y otros roots editables.
- Si se vacía un campo de imagen/video/poster, no debe quedar objeto vacío ni ruta borrada a medias: debe acabar en `null` si ya no tiene contenido real.

### ecom_link
- Si no existe `ecom_link` y se añade category/product/link, se crea el bloque completo.
- Si se quita, queda `"ecom_link": null`.
- Se quitaron iconos sueltos poco útiles dentro de `ecom_link`.
- Se dejó una acción clara para añadir/quitar link.

### Variables CSS
- Las sugerencias/autocomplete de variables CSS se extendieron también a sección y `groupBanner`, como ya pasaba en banners.
- Placeholders ajustados según scope.

### Preview / scrolls
- Se probaron cambios para mejorar preview/dock/scrolls.
- El usuario no quedó convencido y se revirtieron.
- No insistir con esa solución; si se retoma, ir paso a paso y validar visualmente antes.

### Landing 4041 architecture living
- Se trabajó la animación `.animation-text` para loop continuo.
- Se ajustó espaciado entre textos y `/`.
- Se quitó `cement` del primer texto porque ya no lo quieren.

### Rollback importante
- Se intentó unificar imagen/video en un bloque visual único siguiendo el JSON.
- Rompió la carga/plantilla y el usuario pidió revertir.
- Se revirtió SOLO ese cambio.
- Ahora imagen/video vuelven a mostrarse como campos separados.
- No quedan referencias a `media-responsive` ni métodos `mediaResponsive...`.
- Build validado OK tras el rollback.

## Archivos relevantes modificados
- `README.md`
- `angular.json`
- `server.mjs`
- `src/app/app.html`
- `src/app/app.ts`
- `src/app/core/services/landing-api.service.ts`
- `src/app/features/preview/landing-preview/landing-preview.ts`
- `src/app/features/section-editor/section-editor/section-editor.html`
- `src/app/features/section-editor/section-editor/section-editor.scss`
- `src/app/features/section-editor/section-editor/section-editor.ts`
- `tasks/lessons.md`
- `tasks/todo.md`

## Archivos temporales/logs que aparecen sucios
Hay archivos no importantes generados por pruebas:
- `chrome-check.png`
- `chrome-check-wait.png`
- `chrome-debug-profile/`
- `api.log`
- `ng.log`
- `ng.err`

No limpiarlos sin preguntar si el usuario no lo pide.

## Última validación conocida
- `npm.cmd run build`: OK.
- Warning: bundle initial excede budget, ya existente.
- `http://localhost:4200`: respondió 200.

## Recomendación para continuar
Antes de tocar nada en el nuevo chat:
1. Ejecutar `git status --short`.
2. Revisar `tasks/lessons.md`.
3. Revisar cambios actuales en `section-editor.ts/html/scss`.
4. Si se toca UI visual, hacer cambios mínimos y compilar antes de avanzar.