# Landing Builder

Aplicacion local para montar landings `NNNN-slug.json` reutilizando secciones ya creadas.

## Requisitos

- Node.js instalado.
- npm instalado.
- Git Bash como terminal.

## Instalacion

Desde Git Bash, entra en la carpeta del proyecto:

```bash
cd /c/Users/andreu.soriano_sklum/Desktop/landing-builder
```

Instala dependencias si es la primera vez o si cambia `package-lock.json`:

```bash
npm install
```

## Rutas configuradas

Por defecto la app usa estas rutas:

- JSON landings: `C:\xampp\htdocs`
- TPL magazine SKL: `C:\Users\andreu.soriano_sklum\Desktop\Repos\custombannersbackup\SKL\cms01\magazine`

Si necesitas cambiarlas en Git Bash, usa `export` antes de arrancar la API:

```bash
export LANDING_ROOT='C:\xampp\htdocs'
export CUSTOM_BANNERS_ROOT='C:\Users\andreu.soriano_sklum\Desktop\Repos\custombannersbackup\SKL\cms01\magazine'
```

Tambien puedes usar rutas estilo Git Bash:

```bash
export LANDING_ROOT='/c/xampp/htdocs'
export CUSTOM_BANNERS_ROOT='/c/Users/andreu.soriano_sklum/Desktop/Repos/custombannersbackup/SKL/cms01/magazine'
```

## Arranque en local

Necesitas dos terminales de Git Bash abiertas en la carpeta del proyecto.

Terminal 1: API local en `http://localhost:4301`

```bash
cd /c/Users/andreu.soriano_sklum/Desktop/landing-builder
npm run api
```

Terminal 2: Angular en `http://localhost:4200`

```bash
cd /c/Users/andreu.soriano_sklum/Desktop/landing-builder
npm start
```

Abre la app en:

```text
http://localhost:4200
```

## Comandos utiles

Arrancar solo la API:

```bash
npm run api
```

Arrancar solo Angular con proxy a la API:

```bash
npm start
```

Compilar la app:

```bash
npm run build
```

Validar build y tests:

```bash
npm run check
```

Ejecutar solo tests unitarios:

```bash
npm test
```

Los tests actuales cubren la normalizacion a `null` al vaciar textos, media responsive y `ecom_link`.

Modo build en watch:

```bash
npm run watch
```

Si usas PowerShell y bloquea `npm.ps1`, ejecuta los comandos con `npm.cmd`, por ejemplo:

```powershell
npm.cmd run check
```

## Puertos

- Angular: `4200`
- API local: `4301`
- Proxy Angular: `/api` apunta a `http://localhost:4301`

Si un puerto esta ocupado, cierra el proceso que lo esta usando y vuelve a ejecutar los comandos.

## Validacion manual

Despues de `npm run check`, valida el flujo principal en `http://localhost:4200`:

1. Selecciona una landing existente y abre una seccion editable.
2. Anade y quita un texto desde las acciones rapidas; al quitarlo, revisa que el JSON deja el campo en `null`.
3. Anade y quita imagen/video o link; al quitarlo, revisa que `image_responsive`, `video_responsive` o `ecom_link` quedan en `null`.
4. Guarda la seccion y confirma que no aparece error visual ni error de API.
5. Recarga la landing y comprueba que el editor vuelve a cargar la seccion sin romper la preview.

## MVP actual

- Lista landings `NNNN-*.json` ordenadas por numero descendente.
- Permite seleccionar landing destino.
- Crea landings nuevas con el formato `NNNN-slug.json` y `sections: []`.
- Borra secciones concretas o el JSON completo de una landing con confirmacion previa.
- Busca componentes existentes por texto, ID, asset, clase o fichero.
- Muestra preview con la primera imagen encontrada.
- Copia una seccion existente al final de la landing destino.
- Permite editar el `config_extra.custom_properties.id` antes de copiar.
- Revisa el TPL esperado y muestra clases detectadas o faltantes.
- Permite editar campos visuales, textos traducidos, media y propiedades de layout desde el editor.
