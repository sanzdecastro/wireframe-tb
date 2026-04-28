/**
 * Utilidades de reproyección de coordenadas usando proj4.
 * Transforma cualquier geometría GeoJSON de un SRS fuente a WGS84 (EPSG:4326).
 */
import proj4 from 'proj4'
import type { WkbGeometry } from './wkb'

// Proj4 strings para SRS frecuentes en datos españoles/europeos
// (fallback si la definición WKT del GPKG está vacía o falla)
const KNOWN_SRS: Record<number, string> = {
  3857:  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +no_defs',
  25829: '+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  25830: '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  25831: '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  32629: '+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs',
  32630: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs',
  32631: '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs',
}

// SRS que son equivalentes a WGS84 y no necesitan reproyección
const WGS84_EQUIVALENT = new Set([0, 4326, 4258, 84])

type Transform = (xy: [number, number]) => [number, number]

/**
 * Construye una función de transformación desde `srsId`/`wktDefinition` → WGS84.
 * Devuelve `null` si ya es WGS84 o si no se puede crear la transformación.
 */
export function buildTransform(srsId: number, wktDefinition: string): Transform | null {
  if (WGS84_EQUIVALENT.has(srsId)) return null

  // 1. Intentar con la definición WKT del GPKG
  if (wktDefinition && wktDefinition !== 'undefined') {
    try {
      const from = proj4(wktDefinition)
      if (from) return (xy) => proj4(wktDefinition, 'WGS84', xy) as [number, number]
    } catch { /* ignorar, intentar con el id */ }
  }

  // 2. Fallback: proj4 string conocido por srsId
  const knownDef = KNOWN_SRS[srsId]
  if (knownDef) {
    return (xy) => proj4(knownDef, 'WGS84', xy) as [number, number]
  }

  // 3. Intentar con código EPSG directamente (proj4 puede tener el CRS registrado)
  try {
    const testPt = proj4(`EPSG:${srsId}`, 'WGS84', [0, 0])
    if (testPt) return (xy) => proj4(`EPSG:${srsId}`, 'WGS84', xy) as [number, number]
  } catch { /* no disponible */ }

  return null
}

// ── Aplicar transformación recursivamente a cualquier geometría ───────────────

function reprojectCoord(c: number[], t: Transform): number[] {
  const [x, y] = t([c[0], c[1]])
  return c.length === 3 ? [x, y, c[2]] : [x, y]
}

export function reprojectGeometry(geom: WkbGeometry, t: Transform): WkbGeometry {
  switch (geom.type) {
    case 'Point':
      return { ...geom, coordinates: reprojectCoord(geom.coordinates as number[], t) as any }

    case 'LineString':
    case 'MultiPoint':
      return { ...geom, coordinates: (geom.coordinates as number[][]).map(c => reprojectCoord(c, t)) as any }

    case 'Polygon':
    case 'MultiLineString':
      return {
        ...geom,
        coordinates: (geom.coordinates as number[][][]).map(
          ring => ring.map(c => reprojectCoord(c, t))
        ) as any,
      }

    case 'MultiPolygon':
      return {
        ...geom,
        coordinates: (geom.coordinates as number[][][][]).map(
          poly => poly.map(ring => ring.map(c => reprojectCoord(c, t)))
        ) as any,
      }

    case 'GeometryCollection':
      return { ...geom, geometries: geom.geometries.map(g => reprojectGeometry(g, t)) }

    default:
      return geom
  }
}
