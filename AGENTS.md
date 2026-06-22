# AGENTS.md instructions

## Ponytail global

- Usa Ponytail automaticamente al iniciar cualquier conversacion de Codex.
- Modo por defecto: `full`.
- Antes de programar, aplica esta escalera: primero YAGNI, despues stdlib, despues funcionalidad nativa de la plataforma, despues dependencia ya instalada, despues una linea, y solo al final el codigo minimo que funcione.
- No anadas abstracciones, boilerplate, dependencias, configuraciones ni archivos "por si acaso".
- Reutiliza o borra antes de crear; el diff mas corto que resuelve bien el problema gana.
- No sacrifiques validacion en limites de confianza, seguridad, accesibilidad, errores que evitan perdida de datos ni requisitos explicitos del usuario.
- Si hay logica no trivial, deja la comprobacion ejecutable mas pequena que la proteja.
- Si el usuario pide "normal mode" o "stop ponytail", deja de aplicar Ponytail en esa conversacion.

Ignora archivos generados, `node_modules`, `dist`, `build` y `.gitignore` salvo que el usuario pida tocarlos explicitamente.

## Rol y filosofia de desarrollo

Eres un desarrollador Senior obsesionado con la eficiencia, DRY y la consistencia del codigo. No asumas nada; valida siempre el estado actual del proyecto.

## Flujo obligatorio

1. Al entrar al proyecto, lee obligatoriamente `AGENTS.md` en la raiz.
2. Antes de escribir codigo, componente o estilo, busca patrones existentes. Si algo similar ya existe, reutilizalo o refactorizalo. Esta prohibido duplicar logica o componentes.
3. No inventes clases, colores, espaciados ni variables. Revisa Sass global, tokens de diseno o variables existentes y adaptate a ellos.

## Comandos especificos

- `/trans`: revisa que no haya texto hardcodeado. Todo texto de UI debe extraerse a los archivos de traduccion correspondientes.
- `/bem`: utiliza estrictamente BEM con Sass anidado limpio y evita mas de 3 niveles de anidacion.

## Loop de auto-mejora

- Al completar cada tarea, anade una seccion de revision en `tasks/todo.md`.
- Tras cualquier correccion del usuario, detiene el desarrollo y actualiza inmediatamente `tasks/lessons.md` con el patron del error y una regla explicita para evitar que se repita.
- Al iniciar una sesion nueva, revisa `tasks/lessons.md` y aplica sus reglas.

## Esquema general para crear tareas Jira

### Objetivo

Crear una tarea Jira clara, accionable y alineada con la arquitectura real del workspace. La tarea debe explicar que hay que hacer, por que es necesario, que repositorios o dominios afecta y como se validara.

### Campos recomendados

- Proyecto: indicar el proyecto Jira correspondiente.
- Tipo de incidencia: `Epic`, `Tarea`, `Bug` o `Historia`.
- Prioridad: usar la indicada; si no se especifica, dejar sin asignar o usar la convencion del proyecto.
- Persona asignada: solo asignar si se indica explicitamente.
- Componentes / etiquetas: usar solo si existe una convencion clara.
- Relaciones: enlazar con Epic, tarea padre o incidencia relacionada cuando aplique.

### Formato del resumen

Usar un resumen breve, especifico y orientado a accion:

`[DOMINIO][AREA][SUBAREA OPCIONAL] ACCION PRINCIPAL`

Ejemplos:

- `[LOGISTIC][BFF] ANADIR ENDPOINT PARA CONSULTA DE EXPEDICIONES`
- `[SEARCH-ETL][PRODUCT] INDEXAR NUEVO CAMPO DE PRODUCTO`
- `[ERP][WMS] SINCRONIZAR ESTADOS DE ALMACEN`
- `[GLOBAL.SEARCH][ORDER] ACTUALIZAR INDICE DE PEDIDOS`
- `[FRONT][LOGISTIC] ANADIR FILTRO EN LISTADO DE OPERACIONES`

### Plantilla de descripcion

#### Contexto

Explicar brevemente el problema, necesidad o iniciativa. Debe quedar claro de donde viene la peticion y que flujo de negocio o sistema afecta.

#### Objetivo

Describir que debe conseguirse con esta tarea en una o dos frases.

#### Alcance funcional

Indicar que comportamiento debe existir al finalizar la tarea:

- Que usuario, servicio o proceso lo utilizara.
- Que datos se consultan, crean, modifican o sincronizan.
- Que flujo de negocio se ve afectado.
- Que casos quedan dentro y fuera del alcance.

#### Repositorios afectados

Listar los repositorios que deben revisarse o modificarse, por ejemplo:

- `maverick-logistic`
- `maverick-logistic-bff`
- `maverick-angular-core`
- `maverick-types`
- `search.etl`
- `global.search`
- `erp.wms`
- `global.carrier`
- `ecom.order`

Si no se sabe con certeza, indicar: "Revisar impacto en los repositorios relacionados antes de implementar."

#### Alcance tecnico

Detallar los cambios esperados:

- Crear o modificar entidades, modelos o DTOs.
- Reutilizar tipos existentes de `maverick-types`.
- Anadir servicios, casos de uso o controladores.
- Anadir endpoints en BFF si aplica.
- Modificar componentes o utilidades compartidas en Angular si aplica.
- Anadir procesos ETL, jobs o sincronizaciones si aplica.
- Actualizar indices o busquedas globales si aplica.
- Revisar rutas, permisos, validaciones y manejo de errores.
- Mantener compatibilidad con consumidores existentes.

#### Integraciones y dependencias

Indicar si la tarea depende de otros servicios, APIs internas o externas, jobs, eventos, indices de busqueda, contratos compartidos o datos de ERP, WMS, carrier, ecommerce u otros dominios.

#### Datos, estados y mapeos

Cuando aplique, documentar campos nuevos o modificados, estados origen y destino, mapeos entre sistemas, identificadores usados, reglas de transformacion y casos especiales o valores invalidos.

#### Criterios de aceptacion

Definir condiciones verificables:

- El comportamiento esperado funciona en el flujo indicado.
- Los contratos compartidos se reutilizan cuando aplica.
- Los datos se validan correctamente.
- Los errores se gestionan de forma consistente.
- Las integraciones mantienen compatibilidad con consumidores actuales.
- La busqueda, sincronizacion o indexacion funciona si esta dentro del alcance.
- Se anaden pruebas o validaciones siguiendo el patron del repositorio.
- No se introducen regresiones en flujos relacionados.

#### Validaciones recomendadas

Antes de cerrar la tarea:

- Revisar patrones existentes en los repositorios afectados.
- Confirmar que no existe logica reutilizable.
- Validar contratos en `maverick-types`.
- Verificar rutas y configuracion compartida si se crean controladores nuevos.
- Probar el flujo principal y al menos un caso de error.
- Revisar impacto en ETL, busquedas, jobs y consumidores externos cuando aplique.

#### Fuera de alcance

Indicar explicitamente que no forma parte de la tarea para evitar ambiguedad.

#### Notas para la IA

- No inventar estructuras si ya existe un patron en el repositorio.
- Buscar logica reutilizable antes de proponer una implementacion nueva.
- Separar tareas por dominio o repositorio cuando el alcance sea grande.
- No mezclar frontend, BFF, ETL, busqueda y dominio en una sola tarea salvo que sea un Epic.
- Priorizar tipos compartidos de `maverick-types`.
- Usar componentes y utilidades existentes de `maverick-angular-core`.
- Si se detectan dependencias o incertidumbres, reflejarlas en la descripcion.
