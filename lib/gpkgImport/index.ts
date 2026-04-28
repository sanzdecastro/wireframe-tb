import type { GpkgFeatureLayer } from '@/types'
import { parseGpkgGeometry } from './wkb'
import { buildTransform, reprojectGeometry } from './reproject'
import { detectColorScheme } from './colorize'

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

/**
 * Lee un archivo GPKG (ArrayBuffer) y devuelve las capas de features como GeoJSON.
 * Usa sql.js (SQLite WASM) — debe llamarse solo en el browser.
 */
export async function parseGpkgFile(
  buffer:    ArrayBuffer,
  namePrefix = '',
): Promise<GpkgParseResult> {
  const t0     = Date.now()
  const errors: string[] = []

  // Carga dinámica de sql.js — pasamos el WASM como ArrayBuffer para evitar
  // problemas de resolución de rutas (locateFile no funciona bien con Next.js)
  let SQL: any
  try {
    const [{ default: initSqlJs }, wasmBinary] = await Promise.all([
      import('sql.js'),
      fetch('/sql-wasm.wasm').then(r => {
        if (!r.ok) throw new Error(`WASM no encontrado (${r.status}): /sql-wasm.wasm`)
        return r.arrayBuffer()
      }),
    ])
    SQL = await initSqlJs({ wasmBinary })
  } catch (err) {
    throw new Error('No se pudo cargar el motor SQLite: ' + String(err))
  }

  const db = new SQL.Database(new Uint8Array(buffer))

  // Verificar que es un GPKG válido
  const hasContents = db.exec(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='gpkg_contents'`)
  if (!hasContents[0]?.values?.[0]?.[0]) {
    db.close()
    throw new Error('El archivo no es un GeoPackage válido (falta gpkg_contents)')
  }

  // Listar tablas de features
  const contentsRes = db.exec(`SELECT table_name FROM gpkg_contents WHERE data_type = 'features'`)
  let tableNames  = (contentsRes[0]?.values ?? []).map((r: any[]) => r[0] as string)

  if (tableNames.length === 0) {
    db.close()
    throw new Error('El GeoPackage no contiene tablas de features')
  }

  // Si hay más de una tabla, descartar las derivadas (centroides, vistas de puntos)
  // que se crean como tablas auxiliares en los GeoPackage del Open Data Barcelona.
  if (tableNames.length > 1) {
    const DERIVED_SUFFIXES = [
      '_punt', '_punts', '_punto', '_puntos',
      '_centroid', '_centroids', '_centroide', '_centroides',
      '_center', '_centre', '_centres',
    ]
    const isDerived = (name: string) => {
      const lo = name.toLowerCase()
      return DERIVED_SUFFIXES.some(sfx => lo.endsWith(sfx))
    }
    const primary = tableNames.filter((n: string) => !isDerived(n))
    // Solo filtrar si quedan tablas primarias; si todas son derivadas, usar todas
    if (primary.length > 0) tableNames = primary
  }

  const layers: GpkgFeatureLayer[] = []

  for (let ti = 0; ti < tableNames.length; ti++) {
    const tableName = tableNames[ti]

    // Columna de geometría y SRS de la tabla
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

    // Leer todas las filas
    let featuresRes: any[]
    try {
      featuresRes = db.exec(`SELECT * FROM "${tableName}" LIMIT 10000`)
    } catch {
      errors.push(`No se pudo leer la tabla "${tableName}"`)
      continue
    }

    const rows    = featuresRes[0]?.values ?? []
    const cols    = (featuresRes[0]?.columns ?? []) as string[]
    const geomIdx = cols.indexOf(geomCol)
    const propCols = cols.filter((_, i) => i !== geomIdx)

    const features: object[] = []
    const typesSeen = new Set<string>()

    for (const row of rows) {
      const blob = row[geomIdx]
      if (!(blob instanceof Uint8Array)) continue

      let geometry = parseGpkgGeometry(blob)
      if (!geometry) continue

      // Reprojectar a WGS84 si la capa no está ya en WGS84
      if (transform) geometry = reprojectGeometry(geometry, transform)

      typesSeen.add(geometry.type)

      const properties: Record<string, unknown> = {}
      for (const col of propCols) {
        const idx = cols.indexOf(col)
        if (idx === -1) continue
        const v = row[idx]
        // Normalizar strings: trim para que coincidan con los valores de colorize
        properties[col] = typeof v === 'string' ? v.trim() : v
      }

      features.push({ type: 'Feature', geometry, properties })
    }

    // Determinar tipo dominante
    const seenArr = Array.from(typesSeen)
    const pointSet = ['Point', 'MultiPoint']
    const lineSet  = ['LineString', 'MultiLineString']
    const polySet  = ['Polygon', 'MultiPolygon']
    let geomType: GpkgFeatureLayer['geometryType'] = 'mixed'
    if (seenArr.every(t => pointSet.includes(t))) geomType = 'point'
    else if (seenArr.every(t => lineSet.includes(t)))  geomType = 'linestring'
    else if (seenArr.every(t => polySet.includes(t)))  geomType = 'polygon'

    const colorScheme = detectColorScheme(features) ?? undefined

    layers.push({
      id:           `gpkg_${Date.now()}_${ti}`,
      label:        namePrefix ? `${namePrefix} · ${tableName}` : tableName,
      tableName,
      geojson:      { type: 'FeatureCollection', features },
      geometryType: geomType,
      color:        LAYER_COLORS[ti % LAYER_COLORS.length],
      active:       true,
      opacity:      100,
      colorScheme,
    })
  }

  db.close()
  return { layers, errors, durationMs: Date.now() - t0 }
}
