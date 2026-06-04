# Landing Builder

Aplicación local para montar landings `NNNN-slug.json` reutilizando secciones ya creadas.

## Rutas configuradas

- JSON landings: `C:\xampp\htdocs`
- TPL magazine SKL: `C:\Users\andreu.soriano_sklum\Desktop\Repos\custombannersbackup\SKL\cms01\magazine`

Se pueden cambiar con variables de entorno:

```powershell
$env:LANDING_ROOT='C:\xampp\htdocs'
$env:CUSTOM_BANNERS_ROOT='C:\Users\andreu.soriano_sklum\Desktop\Repos\custombannersbackup\SKL\cms01\magazine'
```

## Arranque

Terminal 1:

```powershell
npm.cmd run api
```

Terminal 2:

```powershell
npm.cmd start
```

Abrir: http://localhost:4200

## MVP actual

- Lista landings `NNNN-*.json` ordenadas por número descendente.
- Permite seleccionar landing destino.
- Crea landings nuevas con el formato `NNNN-slug.json` y `sections: []`.
- Borra secciones concretas o el JSON completo de una landing con confirmación previa.
- Busca componentes existentes por texto, ID, asset, clase o fichero.
- Muestra preview con la primera imagen encontrada.
- Copia una sección existente al final de la landing destino.
- Permite editar el `config_extra.custom_properties.id` antes de copiar.
- Revisa el TPL esperado y muestra clases detectadas o faltantes.
