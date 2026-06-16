# Tibidabo — City Operating System (wireframe)

Wireframe interactivo de un sistema de gestión de espacio urbano y mobiliario de
Barcelona: mapa con sensores y proyectos, capas geoespaciales (ráster de
temperatura/vegetación, arbolado, GeoPackage), filtros, KPIs y una serie
temporal LST navegable en el tiempo.

Construido con **Next.js 14 + React 18 + TypeScript + Tailwind CSS** y
**Mapbox GL** para el mapa.

## Requisitos

- Node.js 18+ y npm
- Un **token de Mapbox** ([cuenta gratuita en mapbox.com](https://account.mapbox.com/))

## Instalación

```bash
git clone https://github.com/sanzdecastro/wireframe-tb.git
cd wireframe-tb
npm install
```

Crea un archivo `.env` en la raíz con tu token de Mapbox:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.tu_token_aqui
```

> Sin este token el mapa no se renderiza.

## Arrancar en desarrollo

```bash
npm run dev
```

Abre **http://localhost:3000**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Linter (ESLint) |
| `npm run gen:lst` | Regenera el manifiesto de la serie temporal LST |

`gen:lst` se ejecuta automáticamente antes de `dev` y `build`.

## Estructura del proyecto

```
app/            App Router de Next.js (page.tsx concentra el estado de la app)
components/      Navbar/KPIs (layout), paneles laterales (panels), mapa (map), UI compartida (ui)
lib/             Datos semilla + pipelines de importación (CSV, GeoPackage) y adaptadores de capas
scripts/         gen-lst-manifest.mjs — genera la serie temporal LST
types/           Tipos TypeScript del dominio
public/          Assets: ráster .tif, .geojson, frames LST, wasm de sql.js
```

## Documentación técnica

El funcionamiento interno (modelo de datos, sistema de capas, pipelines de
importación GeoPackage/GeoTIFF/CSV y series temporales) está documentado en
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Capas LST (serie temporal)

Las imágenes de temperatura superficial (LST) viven en `public/lst/` como
GeoTIFF con la fecha en el nombre:

```
Barcelona_LST_2024-07-18.tif
```

Para añadir una fecha nueva basta con soltar el `.tif` en esa carpeta: el
script `gen:lst` (que corre solo antes de `dev`/`build`) la incorpora al
manifiesto sin tocar código.

## Colaborar

El proyecto usa flujo de ramas + Pull Request:

```bash
git checkout -b mi-feature
# trabajar, commitear...
git push -u origin mi-feature
```

Luego abre un Pull Request en GitHub hacia `main`.

> Si trabajas con Claude Code, lee también [`CLAUDE.md`](CLAUDE.md): contiene las
> convenciones y reglas del proyecto que Claude carga automáticamente.
