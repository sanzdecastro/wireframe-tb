# CLAUDE.md

Contexto operativo para Claude Code. La descripción general del proyecto y los
pasos de instalación están en el [README](README.md); el detalle técnico
profundo (modelo de datos, sistema de capas, pipelines de importación) está en
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Aquí van las reglas y convenciones
para trabajar en el código.

## Qué es

Tibidabo — wireframe interactivo de un "City Operating System" para gestión de
espacio urbano y mobiliario de Barcelona mediante datos, sensores y capas
geoespaciales. Es una single-page app: prácticamente todo el estado vive en
[`app/page.tsx`](app/page.tsx) y se reparte a los paneles por props.

## Stack

- **Next.js 14.2** (App Router) + **React 18** + **TypeScript** (modo `strict`)
- **Tailwind CSS 3**
- **Mapbox GL JS 2.15** para el mapa
- **geotiff.js** (ráster LST/NDVI/NDBI/UTFVI), **proj4** (reproyección),
  **sql.js** (lectura de GeoPackage en el browser, wasm)

## Comandos

```bash
npm run dev      # arranca en http://localhost:3000 (ejecuta gen:lst antes vía predev)
npm run build    # build de producción (ejecuta gen:lst antes vía prebuild)
npm run start    # sirve el build
npm run lint     # ESLint (next lint)
npm run gen:lst  # regenera public/lst_timeseries.json desde public/lst/*.tif
```

No hay framework de tests configurado.

## Variables de entorno

`.env` (gitignored) debe contener:

```
NEXT_PUBLIC_MAPBOX_TOKEN=<token de Mapbox>
```

Sin token, el mapa no carga. Se lee en [`lib/data.ts`](lib/data.ts) como
`MAPBOX_TOKEN`.

## Estructura

- `app/` — App Router. `page.tsx` es el componente raíz con todo el estado;
  `layout.tsx`, `globals.css`.
- `components/`
  - `layout/` — Navbar, KpiBar
  - `panels/` — paneles laterales (Layers, Projects, Zone, Device, KPI, filtros…)
  - `map/` — MapView (Mapbox), MapControls, TimeSlider (scrubber temporal LST)
  - `ui/` — iconos y átomos compartidos (`@/components/ui`)
- `lib/`
  - `data.ts` — datos semilla (KPIs, proyectos, sensores) y `MAPBOX_TOKEN`
  - `csvImport/` — pipeline CSV → `Sensor[]` (parser/validator/transformer)
  - `gpkgImport/` — importación de GeoPackage (wkb, reproject, colorize, tileServer)
  - `layerAdapters/` — adaptadores de capas (geotiff, geojson, color ramps, registro de valores ráster)
  - `*.json` — datasets de mobiliario y dispositivos
- `scripts/gen-lst-manifest.mjs` — genera el manifiesto de la serie temporal LST
- `types/index.ts` — **fuente única de tipos** del dominio (KPI, Sensor, Project, capas…)
- `public/` — assets servidos: `.tif` ráster, `.geojson`, `lst/` (frames LST), `sql-wasm.wasm`

## Convenciones

- **Alias de imports:** `@/*` apunta a la raíz (ej. `@/types`, `@/lib/data`,
  `@/components/ui`). Úsalo en vez de rutas relativas largas.
- **Tipos:** define/extiende los tipos de dominio en `types/index.ts`, no los
  dupliques localmente.
- **Componentes de cliente:** llevan `'use client'` arriba (casi todos, por el mapa y el estado).
- **Estado central:** el estado de la app está en `app/page.tsx` y baja por
  props; los paneles son en su mayoría presentacionales.
- **Idioma:** la UI y los comentarios están en español/catalán; mantén ese idioma.
- **Serie temporal LST:** la capa LST es un único layer cuyo frame visible cambia
  con el `TimeSlider`. Para añadir fechas, suelta un `.tif` con la fecha en el
  nombre (`Barcelona_LST_YYYY-MM-DD.tif`) en `public/lst/` y se recoge solo al
  ejecutar `gen:lst` (corre automático en `predev`/`prebuild`). No hace falta tocar código.

## Modelo de datos (resumen)

Tipos del dominio en [`types/index.ts`](types/index.ts); datos semilla en
[`lib/data.ts`](lib/data.ts). Detalle completo en
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- **`Sensor`** — punto del mapa global (banco/luminaria/jardinera o importado por
  CSV). `lng/lat`, `type: 'ok'|'err'`, `kind`, `layerId?`.
- **`ProjectDevice`** — dispositivo dentro del polígono de un proyecto (modo
  *proyectos*); generado en [`lib/projectDevices.ts`](lib/projectDevices.ts). Es
  distinto de `Sensor`.
- **`Project`** — proyecto urbano con polígono (`coords`), taxonomía, distrito y categorías.
- **`GpkgFeatureLayer`** — **tipo central de capa**. Formato común para TODAS las
  capas dinámicas (GeoJSON, GeoPackage y GeoTIFF) para que MapView tenga un único
  renderer. `geometryType: point|linestring|polygon|mixed|raster`; opcional
  `colorScheme` (categorical/gradient), `imageUrl` (ráster overlay), `frames` (serie temporal).
- **`KPI`**, **`MapLayer`**, y los tres conjuntos de filtros (`ProjectFilters`,
  `ProjectDeviceFilters`, `SensorFilters`).

## Sistema de capas (resumen)

- Tres orígenes, un solo tipo de salida (`GpkgFeatureLayer`):
  - **GeoJSON/GeoPackage vectorial** → source `geojson`.
  - **GeoPackage ráster** → tiles servidos vía `transformRequest` desde
    `tileUrlRegistry` ([`lib/gpkgImport/`](lib/gpkgImport/), usa `sql.js` WASM + WKB + proj4).
  - **GeoTIFF** → overlay `image` coloreado en cliente con geotiff.js
    ([`lib/layerAdapters/geotiffAdapter.ts`](lib/layerAdapters/geotiffAdapter.ts)).
- Valores ráster crudos viven **fuera de React** en
  [`rasterValueRegistry`](lib/layerAdapters/rasterValueRegistry.ts) (Map por
  `layerId`), para hover (`sampleRasterAt`) y estadísticas de zona (`aggregateRasterInPolygon`).
- **Serie temporal LST**: un único layer con `frames`/`currentFrameIndex` que el
  `TimeSlider` intercambia; MapView hace cross-dissolve por rAF; todos los frames
  comparten escala de color (dominio global calculado por `gen:lst`).

## Cosas a no tocar

- `public/lst_timeseries.json` está **generado** — edita `public/lst/` + corre `gen:lst`, no el JSON a mano.
- `.next/`, `node_modules/`, `tsconfig.tsbuildinfo` — artefactos, no se versionan.
- `sql.js` usa `fs`/`path` solo en Node; en el browser están deshabilitados vía
  `webpack.resolve.fallback` en `next.config.js` (no lo quites).
