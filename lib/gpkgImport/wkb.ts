/**
 * Parsea blobs de geometría GPKG (cabecera GPKG + WKB) a objetos GeoJSON geometry.
 * Soporta WKB tipos 1-7 (Point → GeometryCollection) con coordenadas XY y XYZ.
 */

type Pos2 = [number, number]
type Pos3 = [number, number, number]
type Pos  = Pos2 | Pos3

export type WkbGeometry =
  | { type: 'Point';              coordinates: Pos }
  | { type: 'LineString';         coordinates: Pos[] }
  | { type: 'Polygon';            coordinates: Pos[][] }
  | { type: 'MultiPoint';         coordinates: Pos[] }
  | { type: 'MultiLineString';    coordinates: Pos[][] }
  | { type: 'MultiPolygon';       coordinates: Pos[][][] }
  | { type: 'GeometryCollection'; geometries: WkbGeometry[] }

// Bytes de envelope según envelope indicator (0–4)
const ENVELOPE_SIZES = [0, 32, 48, 48, 64]

// ── Punto de entrada principal ────────────────────────────────────────────────

export function parseGpkgGeometry(blob: Uint8Array): WkbGeometry | null {
  if (blob.length < 8 || blob[0] !== 0x47 || blob[1] !== 0x50) return null

  const flags            = blob[3]
  const envelopeInd      = (flags >> 1) & 0x07
  const isEmpty          = (flags >> 4) & 0x01
  if (isEmpty) return null

  const envelopeSize = ENVELOPE_SIZES[envelopeInd] ?? 0
  const wkbOffset    = 8 + envelopeSize

  const view = new DataView(blob.buffer, blob.byteOffset + wkbOffset, blob.byteLength - wkbOffset)
  return parseWkb(view, { pos: 0 }).geom
}

// ── Parser WKB recursivo ──────────────────────────────────────────────────────

interface Cursor { pos: number }

function parseWkb(view: DataView, cur: Cursor): { geom: WkbGeometry | null } {
  if (cur.pos + 5 > view.byteLength) return { geom: null }

  const le      = view.getUint8(cur.pos) === 1
  const rawType = view.getUint32(cur.pos + 1, le)
  const baseType = rawType > 1000 ? rawType % 1000 : rawType
  const hasZ     = (rawType >= 1001 && rawType <= 1007) || (rawType >= 3001 && rawType <= 3007)
  cur.pos += 5

  const readCoord = (): Pos => {
    const x = view.getFloat64(cur.pos, le); cur.pos += 8
    const y = view.getFloat64(cur.pos, le); cur.pos += 8
    if (hasZ) { const z = view.getFloat64(cur.pos, le); cur.pos += 8; return [x, y, z] }
    return [x, y]
  }

  const readPoints = (): Pos[] => {
    const n = view.getUint32(cur.pos, le); cur.pos += 4
    return Array.from({ length: n }, readCoord)
  }

  const readRings = (): Pos[][] => {
    const n = view.getUint32(cur.pos, le); cur.pos += 4
    return Array.from({ length: n }, readPoints)
  }

  switch (baseType) {
    case 1: return { geom: { type: 'Point',       coordinates: readCoord()  } }
    case 2: return { geom: { type: 'LineString',   coordinates: readPoints() } }
    case 3: return { geom: { type: 'Polygon',      coordinates: readRings()  } }

    case 4: { // MultiPoint
      const n = view.getUint32(cur.pos, le); cur.pos += 4
      const pts: Pos[] = []
      for (let i = 0; i < n; i++) {
        const sub = parseWkb(view, cur)
        if (sub.geom?.type === 'Point') pts.push(sub.geom.coordinates as Pos)
      }
      return { geom: { type: 'MultiPoint', coordinates: pts } }
    }
    case 5: { // MultiLineString
      const n = view.getUint32(cur.pos, le); cur.pos += 4
      const lines: Pos[][] = []
      for (let i = 0; i < n; i++) {
        const sub = parseWkb(view, cur)
        if (sub.geom?.type === 'LineString') lines.push(sub.geom.coordinates as Pos[])
      }
      return { geom: { type: 'MultiLineString', coordinates: lines } }
    }
    case 6: { // MultiPolygon
      const n = view.getUint32(cur.pos, le); cur.pos += 4
      const polys: Pos[][][] = []
      for (let i = 0; i < n; i++) {
        const sub = parseWkb(view, cur)
        if (sub.geom?.type === 'Polygon') polys.push(sub.geom.coordinates as Pos[][])
      }
      return { geom: { type: 'MultiPolygon', coordinates: polys } }
    }
    case 7: { // GeometryCollection
      const n = view.getUint32(cur.pos, le); cur.pos += 4
      const geoms: WkbGeometry[] = []
      for (let i = 0; i < n; i++) {
        const sub = parseWkb(view, cur)
        if (sub.geom) geoms.push(sub.geom)
      }
      return { geom: { type: 'GeometryCollection', geometries: geoms } }
    }
    default:
      return { geom: null }
  }
}
