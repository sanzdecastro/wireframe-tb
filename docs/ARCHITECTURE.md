# Arquitectura — Tibidabo

Documento técnico del funcionamiento interno: modelo de datos, sistema de capas
y flujos de importación. Para el arranque rápido ve al [README](../README.md);
para las convenciones de código, a [CLAUDE.md](../CLAUDE.md).

---

## 1. Visión general

App de una sola página. **El estado global vive en [`app/page.tsx`](../app/page.tsx)**
(~700 líneas) y se reparte por props a tres familias de componentes:

```
app/page.tsx  ── estado central (view, mapMode, panel, capas, filtros, selección)
   │
   ├─ components/layout/   Navbar, KpiBar          (cabecera)
   ├─ components/panels/    paneles laterales        (controles, leen y mutan estado)
   └─ components/map/MapView.tsx  (Mapbox)           (renderiza todo lo geográfico)
```

- `AppView` = `'home' | 'map'` — pantalla activa.
- `MapMode` = `'explorar' | 'proyectos'` — modo del mapa.
- `SidePanel` = `'none' | 'kpi' | 'zone' | 'projects' | 'layers' | 'filters' | 'device-filters' | 'device' | 'sensor-filters'` — panel lateral abierto (uno a la vez).

Los paneles son en su mayoría **presentacionales**: reciben datos + callbacks y
no guardan estado propio salvo UI local. La fuente de verdad es `page.tsx`.

---

## 2. Modelo de datos

Todos los tipos del dominio viven en [`types/index.ts`](../types/index.ts).
Los datos semilla (mock) están en [`lib/data.ts`](../lib/data.ts) y derivados de
JSON reales en `lib/mobiliari.json` y `lib/dispositivos_1000.json`.

### Entidades principales

| Tipo | Qué representa | Notas |
|---|---|---|
| `KPI` | Tarjeta de indicador (Ocupación, Afluencia…) | `value`, `trend`, `delta`, `on` |
| `Sensor` | Punto en el mapa (banco, luminaria, jardinera, o importado) | `lng/lat`, `type: 'ok'\|'err'`, `kind`, `layerId?` |
| `Project` | Proyecto urbano con polígono | `coords?`, `taxonomy`, `district`, categorías de device/sensor |
| `ProjectDevice` | Dispositivo dentro del polígono de un proyecto | generado en `lib/projectDevices.ts` |
| `GpkgFeatureLayer` | **Capa de mapa** (vectorial o ráster) | tipo central del sistema de capas, ver §3 |
| `MapLayer` | Toggle de capa "de sistema" (heatmap/puntos/líneas) | capas predefinidas, no importadas |

### `Sensor` vs `ProjectDevice`

Son dos conceptos distintos:

- **`Sensor`**: puntos en el mapa global (modo *explorar*). Vienen de `lib/data.ts`
  (mobiliario real + dispositivos sintéticos) o de **importación CSV**. El `kind`
  determina el icono (`lib/sensorIconShapes.ts`). `layerId` marca de qué capa CSV
  proceden (undefined = sensores base).
- **`ProjectDevice`**: dispositivos generados dentro del polígono de un proyecto
  (modo *proyectos*). Tienen estado `online/offline`, `incident`, `alert`,
  `fabricante`, etc. Se generan con `generateProjectDevices(project)` y se filtran
  con `applyDeviceFilters`.

### Filtros (tres conjuntos independientes)

- `ProjectFilters` — filtra proyectos (taxonomía, distrito, categorías).
- `ProjectDeviceFilters` — filtra devices dentro de un proyecto (tipo, sensor, flags, fabricante).
- `SensorFilters` — filtra sensores del mapa (kind, status, fabricante).

Cada panel de filtros exporta su `EMPTY_*`, un `countActive*` y a veces un `apply*`.

---

## 3. Sistema de capas

El tipo central es **`GpkgFeatureLayer`**. A pesar del nombre, es el formato común
para **todas** las capas dinámicas, vengan de GeoPackage, GeoJSON o GeoTIFF. Así
[`MapView`](../components/map/MapView.tsx) tiene un único renderer.

```ts
interface GpkgFeatureLayer {
  id, label, tableName
  geojson: object                  // FeatureCollection (vacío si es ráster)
  geometryType: 'point' | 'linestring' | 'polygon' | 'mixed' | 'raster'
  color: string                    // fallback cuando no hay colorScheme
  active: boolean
  opacity: number                  // 0–100
  colorScheme?: GpkgColorScheme    // categórico o gradiente
  // Solo ráster:
  tileBounds?, tileZoomRange?      // ráster por tiles (GPKG)
  imageUrl?                        // ráster como overlay de imagen (GeoTIFF)
  valueLabel?, valueUnit?          // lectura de valor en hover ("Temperatura", "°C")
  dataUrl?                         // carga diferida de GeoJSON pesado
  frames?, currentFrameIndex?      // serie temporal de rásters
}
```

### 3.1 Coloreado — `GpkgColorScheme`

Dos modos:

- **`categorical`**: `categories: Record<valor, colorHex>`. Una propiedad string
  (o numérica discreta) → un color por categoría.
- **`gradient`**: `stops: Array<[valor, colorHex]>` ordenados ascendente. Para
  propiedades numéricas continuas y para rásters.

### 3.2 Tipos de fuente y cómo se renderizan

| Origen | geometryType | Source Mapbox | Notas |
|---|---|---|---|
| **GeoJSON** vectorial | point/line/polygon | `geojson` | importado o `dataUrl` diferido |
| **GeoPackage** vectorial | point/line/polygon | `geojson` | parseado con sql.js + WKB (§4.1) |
| **GeoPackage** ráster | raster | `raster` (tiles) | tiles servidos vía `transformRequest` (§4.1) |
| **GeoTIFF** | raster | `image` (overlay) | coloreado en cliente con geotiff.js (§4.2) |

### 3.3 Lectura de valores ráster — `rasterValueRegistry`

[`lib/layerAdapters/rasterValueRegistry.ts`](../lib/layerAdapters/rasterValueRegistry.ts)

Los valores crudos por píxel de un ráster (un `TypedArray` pesado) **no** se
guardan en el estado de React (evita re-renders y problemas de serialización).
Viven en un `Map<layerId, RasterValues>` a nivel de módulo. Esto permite:

- `sampleRasterAt(layerId, lng, lat)` → valor en hover sobre el mapa.
  Devuelve `number` (valor), `null` (nodata/fuera de rango), `undefined` (fuera de bounds).
- `aggregateRasterInPolygon(layerId, polygon)` → media/min/max/count de los
  píxeles dentro de un polígono dibujado (lo usa `ZonePanel` para estadísticas de zona).

Supuesto: ráster *north-up* sobre sus `bounds` WGS84 axis-aligned. A escala
ciudad el error de reproyección es sub-píxel.

> Mismo patrón que `tileUrlRegistry` en `gpkgImport/tileServer.ts`: datos pesados
> fuera de React, indexados por `layerId`.

### 3.4 Series temporales (LST)

Un ráster con **varios frames por fecha** se modela con un único `GpkgFeatureLayer`
cuyo `frames: RasterFrame[]` y `currentFrameIndex` cambian con el `TimeSlider`
([`components/map/TimeSlider.tsx`](../components/map/TimeSlider.tsx)).

- El `id` del layer es estable; `imageUrl`, `tileBounds` y `rasterValueRegistry[id]`
  reflejan **siempre** el frame actual. Hover y estadísticas de zona consultan por
  `layer.id` sin enterarse de qué frame es.
- MapView hace **cross-dissolve** entre dos capas ráster apiladas (slots `a`/`b`)
  conduciendo las opacidades por `requestAnimationFrame` (no por el easing interno
  de Mapbox) para un fundido suave al cambiar de fecha.
- **Escala de color compartida**: todos los frames usan el mismo `colorDomain`
  (min/max global de la serie) para que los colores sean comparables en el tiempo
  (un julio caluroso se ve más caliente que un enero suave). Ese dominio lo calcula
  `scripts/gen-lst-manifest.mjs` (§5).

`RasterFrame = { file: string; date: string | null }` (fecha ISO o null).

---

## 4. Pipelines de importación

### 4.1 GeoPackage — `lib/gpkgImport/`

GeoPackage es un SQLite. Se lee **en el browser** con `sql.js` (WASM).

```
index.ts       orquesta: abre el .gpkg, recorre tablas, produce GpkgFeatureLayer[]
wkb.ts         parsea geometrías WKB (Well-Known Binary) → coordenadas
reproject.ts   buildTransform + reprojectGeometry (proj4) → WGS84
colorize.ts    detectColorScheme: auto-detecta categórico/gradiente por propiedad
tileServer.ts  registra tiles ráster como blob URLs en tileUrlRegistry
```

Detalles:
- `getSqlJs()` es un **singleton**: carga `/sql-wasm.wasm` una sola vez. `sql.js`
  se importa estáticamente a propósito (un dynamic import anidado rompe webpack 5).
- Tablas vectoriales → geometrías WKB reproyectadas a WGS84 → GeoJSON.
- Tablas ráster → tiles pre-extraídos como blob URLs (hasta `MAX_TILES = 3000`,
  zooms bajos primero para tener overviews). MapView los sirve a Mapbox vía
  `transformRequest`, devolviendo `EMPTY_TILE` (PNG transparente 1×1) para los 404.
  Clave del registro: `${layerId}/${z}/${x}/${y_xyz}` (y en convención XYZ).
- `detectColorScheme` asigna colores automáticamente; hay una paleta de 10 colores
  rotatorios por capa (`LAYER_COLORS`).

### 4.2 GeoTIFF — `lib/layerAdapters/geotiffAdapter.ts`

Adaptador que convierte un `.tif/.tiff` en un layer ráster tipo overlay de imagen:

1. `geotiff.js` (import dinámico, solo cliente) lee la banda float + bbox + CRS.
2. Calcula min/max ignorando `nodata` (o usa `colorDomain` fijo si se pasa).
3. Reproyecta el bbox a WGS84 con `proj4` (reutiliza `buildTransform` de gpkgImport).
4. Pinta cada píxel en un `<canvas>` con una rampa de color → blob URL (PNG).
5. Registra los valores crudos en `rasterValueRegistry` para el hover.
6. Devuelve un `GpkgFeatureLayer` con `imageUrl` + `colorScheme` (gradiente).

**Rampas de color** — [`lib/layerAdapters/colorRamps.ts`](../lib/layerAdapters/colorRamps.ts).
Cada rampa es una lista de anchors `[t, [r,g,b]]` con `t ∈ [0,1]`:

| Rampa | Uso |
|---|---|
| `viridis` | Default, perceptualmente uniforme |
| `inferno` | Temperatura superficial (LST) |
| `ndvi` | Vegetación (marrón→verde) |
| `magma` | Superficie construida (NDBI) |
| `reds` | Estrés térmico (UTFVI) |

**Interfaz común de adaptadores** — [`lib/layerAdapters/types.ts`](../lib/layerAdapters/types.ts):
`LayerAdapter` define `canHandle(file)`, `preview(file, opts)` (rápido, sin construir)
y `build(preview, options)` (layer final). Output siempre `GpkgFeatureLayer` para
reutilizar el renderer. `index.ts` exporta `geojsonAdapter` y `geotiffAdapter`.

### 4.3 CSV → Sensores — `lib/csvImport/`

Pipeline `CSV (string) → Sensor[]`:

```
index.ts      importCsv(): orquesta parser → validator → transformer (por chunks)
parser.ts     CSV → RawRow[] (Record<string,string>)
config.ts     DEFAULT_IMPORT_CONFIG: mapeo flexible de columnas (alias) + rangos
validator.ts  valida cada fila (lat/lon en rango, etc.) → ImportError[]
transformer.ts rowToSensor: RawRow → Sensor
normalizers.ts normaliza valores (status, kind…)
resolver.ts   resuelve columnas reales contra los alias del mapping
```

`ColumnMapping` lista **alias** por campo (`lat: ['lat','latitude','latitud','y',
'geo_epgs_4326_lat',…]`), pensado para tragar datasets de Open Data Barcelona sin
configuración. `ImportResult` devuelve `{ totalRows, validRows, invalidRows,
inserted, errors, durationMs, sensors }`.

---

## 5. Serie temporal LST — `scripts/gen-lst-manifest.mjs`

Genera `public/lst_timeseries.json` (**archivo generado, no editar a mano**) a
partir de los GeoTIFF en `public/lst/`:

- Cada imagen lleva su fecha en el nombre: `Barcelona_LST_2024-07-15.tif` → `"2024-07-15"`.
- Suelta el `.tif` en `public/lst/` y la fecha entra sola en el manifiesto.
- Abre cada ráster con geotiff.js y calcula el **min/max global** de toda la serie
  (ignorando nodata) → `domain`, que se usa en runtime para colorear todos los
  frames con la misma escala (ver §3.4).
- Corre automáticamente en `predev` y `prebuild`; manual con `npm run gen:lst`.

---

## 6. Mapa — `components/map/MapView.tsx`

El componente más grande (~1200 líneas). Responsabilidades:

- Inicializa Mapbox (`MAPBOX_TOKEN`, `MAP_CENTER`, `MAP_ZOOM` de `lib/data.ts`).
- Iconos de sensor: SVG generado por `kind`+`type` (`buildSvgIcon` + `ICON_SHAPE_MAP`
  de `lib/sensorIconShapes.ts`), registrado con `map.addImage`.
- Dibujo de zonas: polígono interactivo (`drawMode`) → `onZoneComplete(coords)`.
- Capas de sistema: `sensors`, `afluencia` (heatmap), `temperatura`, `cycling-tiles`.
- Capas dinámicas (`gpkgLayers`): renderiza según `geometryType` (geojson / raster
  tiles / image overlay) y aplica `opacity` y `colorScheme`.
- `transformRequest`: intercepta peticiones de tiles para servir desde
  `tileUrlRegistry` (GPKG ráster).
- Cross-dissolve de series temporales (§3.4).
- Hover: muestrea `rasterValueRegistry` y reporta el valor (`valueLabel`/`valueUnit`).

`pointInPolygon` (ray-casting) aparece duplicado en MapView, projectDevices y
rasterValueRegistry — es intencionalmente local a cada módulo.
