/**
 * Registro de tiles raster extraídos de archivos GPKG.
 * Los tiles se pre-extraen como blob URLs al importar el archivo.
 * MapView los sirve a Mapbox a través de transformRequest.
 *
 * Clave del mapa: `${layerId}/${z}/${x}/${y_xyz}`
 * (y en convención XYZ, 0=arriba, que es lo que usa Mapbox)
 */

// Transparente 1×1 PNG para tiles no encontrados (evita errores 404 en Mapbox)
export const EMPTY_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// Máximo de tiles que pre-extraemos (ordenados por zoom ASC → tenemos primero los de overview)
const MAX_TILES = 3000

// Registro global: clave → blob URL
export const tileUrlRegistry = new Map<string, string>()

/** Detecta el MIME type mirando los primeros bytes (magic bytes). */
function mimeFromBytes(data: Uint8Array): string {
  if (data[0] === 0x89 && data[1] === 0x50) return 'image/png'
  if (data[0] === 0xFF && data[1] === 0xD8) return 'image/jpeg'
  if (data[0] === 0x47 && data[1] === 0x49) return 'image/gif'
  if (data[0] === 0x52 && data[1] === 0x49) return 'image/webp'
  return 'image/png'
}

/**
 * Lee todos los tiles (hasta MAX_TILES) de una tabla GPKG raster,
 * los convierte en blob URLs y los registra en tileUrlRegistry.
 * Los zoom levels bajos se procesan primero para garantizar los overviews.
 */
export function registerRasterTiles(
  layerId:   string,
  db:        any,         // sql.js Database
  tableName: string,
): number {
  let res: any[]
  try {
    res = db.exec(`
      SELECT zoom_level, tile_column, tile_row, tile_data
      FROM   "${tableName}"
      ORDER  BY zoom_level ASC
      LIMIT  ${MAX_TILES}
    `)
  } catch {
    return 0
  }

  const rows = res[0]?.values ?? []
  let count  = 0

  for (const [z, col, rowRaw, data] of rows as any[]) {
    if (!(data instanceof Uint8Array)) continue

    // GeoPackage usa TMS (y=0 abajo). Mapbox usa XYZ (y=0 arriba).
    // Conversión: y_xyz = (2^z - 1) - y_tms
    // Algunos generadores (no estándar) ya usan XYZ. Registramos AMBAS variantes.
    const yTms = rowRaw as number
    const yXyz = (1 << (z as number)) - 1 - yTms

    const mime = mimeFromBytes(data)
    // Copiar a un ArrayBuffer puro para evitar incompatibilidades con SharedArrayBuffer
    const buf  = new ArrayBuffer(data.byteLength)
    new Uint8Array(buf).set(data)
    const blob = new Blob([buf], { type: mime })
    const url  = URL.createObjectURL(blob)

    // Registrar con la y que Mapbox pedirá (XYZ)
    tileUrlRegistry.set(`${layerId}/${z}/${col}/${yXyz}`, url)
    // También la y raw, por si el GPKG ya estaba en XYZ
    if (yXyz !== yTms) {
      tileUrlRegistry.set(`${layerId}/${z}/${col}/${yTms}`, url)
    }

    count++
  }

  return count
}

/** Revoca todos los blob URLs de una capa (libera memoria). */
export function unregisterRasterTiles(layerId: string) {
  const prefix = `${layerId}/`
  for (const [key, url] of Array.from(tileUrlRegistry)) {
    if (key.startsWith(prefix)) {
      URL.revokeObjectURL(url)
      tileUrlRegistry.delete(key)
    }
  }
}
