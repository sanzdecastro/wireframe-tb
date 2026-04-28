import { RawRow, ImportConfig, ImportError } from './types'
import { resolveField, resolveNumericField } from './resolver'

export interface ValidationResult {
  valid:  boolean
  lat:    number | null
  lon:    number | null
  rawId:  string | null
  errors: ImportError[]
}

export function validateRow(
  row:    RawRow,
  rowNum: number,
  config: ImportConfig,
): ValidationResult {
  const { columnMapping, latRange, lonRange } = config
  const errors: ImportError[] = []

  // ── latitud ───────────────────────────────────────────────────────────────
  const lat = resolveNumericField(row, columnMapping.lat)
  if (lat === null) {
    errors.push({ row: rowNum, column: 'lat', reason: 'Latitud ausente o no numérica' })
  } else if (lat < latRange[0] || lat > latRange[1]) {
    errors.push({ row: rowNum, column: 'lat', reason: `Latitud fuera de rango: ${lat}` })
  }

  // ── longitud ──────────────────────────────────────────────────────────────
  const lon = resolveNumericField(row, columnMapping.lon)
  if (lon === null) {
    errors.push({ row: rowNum, column: 'lon', reason: 'Longitud ausente o no numérica' })
  } else if (lon < lonRange[0] || lon > lonRange[1]) {
    errors.push({ row: rowNum, column: 'lon', reason: `Longitud fuera de rango: ${lon}` })
  }

  // ── heurística: lat/lon invertidos (zona España) ─────────────────────────
  if (lat !== null && lon !== null) {
    if (lat > 30 && lat < 45 && lon > 30 && lon < 45) {
      errors.push({
        row: rowNum, column: 'lat/lon',
        reason: `Posible inversión lat/lon (lat=${lat.toFixed(4)}, lon=${lon.toFixed(4)})`,
      })
    }
  }

  // ── id (advertencia, no bloqueante) ───────────────────────────────────────
  const rawId = resolveField(row, columnMapping.id)

  // Bloqueante = errores que impiden construir el punto geográfico
  const blocking = errors.filter(e => e.column === 'lat' || e.column === 'lon')

  return { valid: blocking.length === 0, lat, lon, rawId, errors }
}
