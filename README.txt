# Scape Book interactivo — Celeste García

Proyecto web estático para convertir el PDF en un libro interactivo.

## Páginas con retos detectadas

- PDF 17 — RETO 1 — código de los anillos — respuesta: 1618764
- PDF 21 — RETO 2 — coordenadas — respuesta: 24 y 48
- PDF 26 — RETO 3 — cables — respuesta: 342
- PDF 31 — RETO 4 — válvulas — respuesta: 245
- PDF 36 — RETO 5 — ruta de minas — respuesta: C

## Cómo probarlo

No abras `index.html` haciendo doble clic si el navegador bloquea la carga del PDF.
Usa un servidor local.

Si tienes Python:

    python -m http.server 8000

Luego entra a:

    http://localhost:8000

## Publicarlo

1. Crea un repositorio en GitHub.
2. Sube todo el contenido de esta carpeta.
3. En Vercel elige "Add New Project".
4. Importa el repositorio.
5. Framework Preset: Other.
6. Build Command: vacío.
7. Output Directory: vacío.
8. Deploy.

Vercel servirá el HTML, CSS, JavaScript y PDF como un sitio estático.

## Nota

Las coordenadas de los campos interactivos están configuradas como porcentajes para que sigan funcionando al cambiar el tamaño de la pantalla. Si quieres que los campos coincidan al píxel con el diseño, ajusta las posiciones x/y/w/h de cada reto en `script.js`.
