import type { GpkgFeatureLayer } from '@/types'
// Static import — avoids nested dynamic-import chunk which causes
// "Cannot read properties of undefined (reading 'call')" in webpack 5 / Next.js.
import initSqlJs from 'sql.js'
import { parseGpkgGeometry } from './wkb'
import { buildTransform, reprojectGeometry } from './reproject'
import { detectColorScheme } from './colorize'
import { registerRasterTiles } from './tileServer'

export type { GpkgFeatureLayer }

// Paleta de colores auto-asignada por capa
const LAYER_COLORS = [
  '#e91e63', '#2196f3', '#ff9800', '#4caf50', '#9c27b0',
  '#00bcd4', '#ff5722', '#607d8b', '#795548', '#3f51b5',
]

export interface GpkgParseResult {
  layers:    GpkgFeatureLayer[]
  errors:    string[]
  durationMs: number
}

// ── Singleton de sql.js ───────────────────────────────────────────────────────
// Cacheamos la instancia SQL (carga WASM una sola vez) y el WASM binary.
let _sqlJsPromise: Promise<any> | null = null

async function getSqlJs(): Promise<any> {
  if (!_sqlJsPromise) {
    _sqlJsPromise = fetch('/sql-wasm.wasm')
      .then(r => {
        if (!r.ok) throw new Error(`WASM no encontrado (${r.status}): /sql-wasm.wasm`)
        return r.arrayBuffer()
      })
      .then(wasmBinary => initSqlJs({ wasmBinary }))
      .catch(err => {
        _sqlJsPromise = null
        throw err
      })
  }
  return _sqlJsPromise
}

// ── Parser principal ──────────────────────────────────────────────────────────

export async function parseGpkgFile(
  buffer:    ArrayBuffer,
  namePrefix = '',
): Promise<GpkgParseResult> {
  const t0     = Date.now()
  const errors: string[] = []

  let SQL: any
  try {
    SQL = await getSqlJs()
  } catch (err) {
    throw new Error('No se pudo cargar el motor SQLite: ' + String(err))
  }

  const db = new SQL.Database(new Uint8Array(buffer))

  // Verificar GPKG válido
  const hasContents = db.exec(
    `SELECT count(*) FROM sqlite_master WHERE type='table' AND name='gpkg_contents'`
  )
  if (!hasContents[0]?.values?.[0]?.[0]) {
    db.close()
    throw new Error('El archivo no es un GeoPackage válido (falta gpkg_contents)')
  }

  const layers: GpkgFeatureLayer[] = []
  let hasRasterLayers = false
  let layerIndex = 0

  // ── 1. Capas vectoriales (features) ────────────────────────────────────────
  const contentsRes = db.exec(
    `SELECT table_name FROM gpkg_contents WHERE data_type = 'features'`
  )
  let featureTableNames = (contentsRes[0]?.values ?? []).map((r: any[]) => r[0] as string)

  // Filtrar tablas derivadas (centroides, puntos auxiliares de Open Data Barcelona)
  if (featureTableNames.length > 1) {
    const DERIVED_SUFFIXES = [
      '_punt', '_punts', '_punto', '_puntos',
      '_centroid', '_centroids', '_centroide', '_centroides',
      '_center', '_centre', '_centres',
    ]
    const isDerived = (n: string) =>
      DERIVED_SUFFIXES.some(sfx => n.toLowerCase().endsWith(sfx))
    const primary = featureTableNames.filter((n: string) => !isDerived(n))
    if (primary.length > 0) featureTableNames = primary
  }

  for (const tableName of featureTableNames) {
    const geomColRes = db.exec(`
      SELECT gc.column_name, gc.srs_id, srs.definition
      FROM gpkg_geometry_columns gc
      LEFT JOIN gpkg_spatial_ref_sys srs ON srs.srs_id = gc.srs_id
      WHERE gc.table_name = '${tableName}'
    `)
    const geomCol   = (geomColRes[0]?.values?.[0]?.[0] as string) ?? 'geom'
    const srsId     = (geomColRes[0]?.values?.[0]?.[1] as number) ?? 4326
    const srsWkt    = (geomColRes[0]?.values?.[0]?.[2] as string) ?? ''
    const transform = buildTransform(srsId, srsWkt)

    let featuresRes: any[]
    try {
      featuresRes = db.exec(`SELECT * FROM "${tableName}" LIMIT 10000`)
    } catch {
      errors.push(`No se pudo leer la tabla "${tableName}"`)
      continue
    }

    const rows     = featuresRes[0]?.values ?? []
    const cols     = (featuresRes[0]?.columns ?? []) as string[]
    const geomIdx  = cols.indexOf(geomCol)
    const propCols = cols.filter((_, i) => i !== geomIdx)

    const features: object[] = []
    const typesSeen = new Set<string>()

    for (const row of rows) {
      const blob = row[geomIdx]
      if (!(blob instanceof Uint8Array)) continue
      let geometry = parseGpkgGeometry(blob)
      if (!geometry) continue
      if (transform) geometry = reprojectGeometry(geometry, transform)
      typesSeen.add(geometry.type)

      const properties: Record<string, unknown> = {}
      for (const col of propCols) {
        const idx = cols.indexOf(col)
        if (idx === -1) continue
        const v = row[idx]
        properties[col] = typeof v === 'string' ? v.trim() : v
      }
      features.push({ type: 'Feature', geometry, properties })
    }

    const seenArr = Array.from(typesSeen)
    const pointSet = ['Point', 'MultiPoint']
    const lineSet  = ['LineString', 'MultiLineString']
    const polySet  = ['Polygon', 'MultiPolygon']
    let geomType: GpkgFeatureLayer['geometryType'] = 'mixed'
    if (seenArr.every(t => pointSet.includes(t)))      geomType = 'point'
    else if (seenArr.every(t => lineSet.includes(t)))  geomType = 'linestring'
    else if (seenArr.every(t => polySet.includes(t)))  geomType = 'polygon'

    const colorScheme = detectColorScheme(features) ?? undefined
    const id = `gpkg_${Date.now()}_${layerIndex++}`

    layers.push({
      id,
      label:        namePrefix ? `${namePrefix} · ${tableName}` : tableName,
      tableName,
      geojson:      { type: 'FeatureCollection', features },
      geometryType: geomType,
      color:        LAYER_COLORS[layerIndex % LAYER_COLORS.length],
      active:       true,
      opacity:      100,
      colorScheme,
    })
  }

  // ── 2. Capas raster (tiles y 2d-gridded-coverage) ──────────────────────────
  const rasterRes = db.exec(
    `SELECT table_name FROM gpkg_contents
     WHERE data_type IN ('tiles', '2d-gridded-coverage')`
  )
  const rasterTableNames = (rasterRes[0]?.values ?? []).map((r: any[]) => r[0] as string)

  for (const tableName of rasterTableNames) {
    // Bounds y SRS de la tile matrix set
    const boundsRes = db.exec(`
      SELECT tms.min_x, tms.min_y, tms.max_x, tms.max_y, tms.srs_id, srs.definition
      FROM gpkg_tile_matrix_set tms
      LEFT JOIN gpkg_spatial_ref_sys srs ON srs.srs_id = tms.srs_id
      WHERE tms.table_name = '${tableName}'
    `)
    const bRow = boundsRes[0]?.values?.[0]
    if (!bRow) {
      errors.push(`Sin metadatos de bounds para la tabla raster "${tableName}"`)
      continue
    }
    const [rawMinX, rawMinY, rawMaxX, rawMaxY, bSrsId, bSrsWkt] = bRow as [number,number,number,number,number,string]

    // Reprojectar bounds a WGS84
    const bTransform = buildTransform(bSrsId ?? 4326, bSrsWkt ?? '')
    let tileBounds: [number, number, number, number]
    if (bTransform) {
      const [minLng, minLat] = bTransform([rawMinX, rawMinY])
      const [maxLng, maxLat] = bTransform([rawMaxX, rawMaxY])
      tileBounds = [minLng, minLat, maxLng, maxLat]
    } else {
      tileBounds = [rawMinX, rawMinY, rawMaxX, rawMaxY]
    }

    // Clamp a WGS84 válido por si la reproyección tiene NaN en los extremos
    tileBounds = [
      Math.max(-180, tileBounds[0]),
      Math.max(-90,  tileBounds[1]),
      Math.min(180,  tileBounds[2]),
      Math.min(90,   tileBounds[3]),
    ]

    // Rango de zoom disponible
    const zoomRes = db.exec(
      `SELECT MIN(zoom_level), MAX(zoom_level)
       FROM gpkg_tile_matrix WHERE table_name = '${tableName}'`
    )
    const zRow = zoomRes[0]?.values?.[0] ?? [0, 18]
    const tileZoomRange: [number, number] = [
      Math.max(0,  zRow[0] as number),
      Math.min(22, zRow[1] as number),
    ]

    // Pre-extraer tiles como blob URLs (no necesitamos mantener la DB abierta)
    const id        = `gpkg_${Date.now()}_${layerIndex++}`
    const tileCount = registerRasterTiles(id, db, tableName)
    if (tileCount === 0) {
      errors.push(`La tabla raster "${tableName}" no contiene tiles legibles`)
      continue
    }
    hasRasterLayers = true

    layers.push({
      id,
      label:        namePrefix ? `${namePrefix} · ${tableName}` : tableName,
      tableName,
      geojson:      { type: 'FeatureCollection', features: [] },
      geometryType: 'raster',
      color:        LAYER_COLORS[layerIndex % LAYER_COLORS.length],
      active:       true,
      opacity:      80,
      tileBounds,
      tileZoomRange,
    })
  }

  // Los tiles ya están en blob URLs → siempre cerrar la DB
  db.close()
  void hasRasterLayers  // flag ya no necesario, mantenemos para claridad

  if (layers.length === 0) {
    throw new Error(
      'El GeoPackage no contiene tablas reconocidas. ' +
      'Se soportan: features (vectorial) y tiles (raster).'
    )
  }

  return { layers, errors, durationMs: Date.now() - t0 }
}
