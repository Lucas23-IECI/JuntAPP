# Kit de marca JuntAPP

Identidad oficial: cuadrado azul marino redondeado, `J` blanca y acento cuadrado naranjo.

## Colores

- Azul marino: `#031636`
- Naranjo: `#FF6B00`
- Blanco: `#FFFFFF`

## SVG maestros

- `symbol-primary.svg`: isotipo principal con margen de seguridad.
- `app-icon.svg`: icono cuadrado para aplicaciones.
- `app-icon-maskable.svg`: icono seguro para máscaras Android/PWA.
- `favicon.svg`: favicon vectorial.
- `logo-horizontal.svg`: marca horizontal sobre fondo claro.
- `logo-horizontal-dark.svg`: marca horizontal sobre fondo oscuro.
- `logo-stacked.svg`: composición vertical.
- `wordmark.svg`: logotipo tipográfico sobre fondo claro.
- `wordmark-white.svg`: logotipo tipográfico sobre fondo oscuro.
- `symbol-monochrome-navy.svg`: versión monocromática azul.
- `symbol-monochrome-white.svg`: versión monocromática invertida.
- `safari-pinned-tab.svg`: versión para pestañas fijadas de Safari.

## Iconos raster

- `icons/chrome/`: 16, 32, 48 y 128 px.
- `icons/apple/`: 120, 152, 167 y 180 px.
- `icons/pwa/`: 72, 96, 128, 144, 152, 192, 384 y 512 px.
- `icons/pwa/maskable-*`: variantes maskable de 192 y 512 px.
- `icons/windows/`: mosaicos de 150 y 310 px.
- `icons/favicon-*`: favicon PNG de 16, 32 y 48 px.
- `favicon.ico`: favicon ICO multiresolución.

Todos los PNG e ICO se regeneran desde el SVG maestro ejecutando:

```bash
npm run brand:generate
```
