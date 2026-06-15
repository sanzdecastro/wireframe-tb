/**
 * Registro de valores crudos de rásters (a nivel de módulo, fuera de React)
 * para poder consultar el valor en un punto al hacer hover sobre el mapa.
 *
 * Espeja el patrón de `tileUrlRegistry` en gpkgImport/tileServer.ts: los datos
 * pesados (TypedArray de valores) viven aquí, indexados por `layerId`, en vez
 * de en el estado de React (evita re-renders y problemas de serialización).
 */

export interface RasterValues {
  data:   ArrayLike<number>                       // valores por píxel (row-major)
  width:  number
  height: number
  bounds: [number, number, number, number]        // WGS84 [minLng, minLat, maxLng, maxLat]
  nodata: number | null
}

const registry = new Map<string, RasterValues>()

export function registerRasterValues(layerId: string, values: RasterValues): void {
  registry.set(layerId, values)
}

export function getRasterValues(layerId: string): RasterValues | undefined {
  return registry.get(layerId)
}

export function unregisterRasterValues(layerId: string): void {
  registry.delete(layerId)
}

/**
 * Muestrea el valor del ráster en una coordenada WGS84.
 * Devuelve:
 *   - `number`     → valor en el píxel
 *   - `null`       → dentro de los bounds pero es nodata / no finito
 *   - `undefined`  → fuera de los bounds (o capa sin valores registrados)
 *
 * Muestreo aproximado: asume el ráster north-up sobre sus bounds WGS84
 * axis-aligned. A escala ciudad el error de reproyección es sub-píxel.
 */
export function sampleRasterAt(
  layerId: string,
  lng:     number,
  lat:     number,
): number | null | undefined {
  const v = registry.get(layerId)
  if (!v) return undefined

  const [minLng, minLat, maxLng, maxLat] = v.bounds
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return undefined

  const u = (lng - minLng) / (maxLng - minLng)        // 0 (oeste) → 1 (este)
  const t = (maxLat - lat) / (maxLat - minLat)        // 0 (norte) → 1 (sur)

  const px = Math.min(v.width  - 1, Math.max(0, Math.floor(u * v.width)))
  const py = Math.min(v.height - 1, Math.max(0, Math.floor(t * v.height)))

  const val = v.data[py * v.width + px]
  if (!Number.isFinite(val) || (v.nodata !== null && val === v.nodata)) return null
  return val
}

export interface RasterAggregate {
  mean:  number
  count: number   // nº de píxeles válidos dentro del polígono
  min:   number
  max:   number
}

/** Ray-casting: ¿está [lng, lat] dentro del polígono (array de [lng, lat])? */
function pointInPolygon(lng: number, lat: number, poly: number[][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Agrega los valores del ráster cuyos centros de píxel caen dentro de `polygon`.
 * Mismo supuesto que `sampleRasterAt`: ráster north-up sobre sus bounds WGS84.
 *
 * Devuelve `null` si no hay valores registrados o ningún píxel válido cae dentro
 * (p.ej. un área sobre el mar o fuera de los bounds del ráster).
 */
export function aggregateRasterInPolygon(
  layerId: string,
  polygon: number[][],
): RasterAggregate | null {
  const v = registry.get(layerId)
  if (!v || polygon.length < 3) return null

  const [minLng, minLat, maxLng, maxLat] = v.bounds

  // Bbox del polígono recortado a los bounds del ráster → región de píxeles a barrer
  let pMinLng = Infinity, pMinLat = Infinity, pMaxLng = -Infinity, pMaxLat = -Infinity
  for (const [lng, lat] of polygon) {
    if (lng < pMinLng) pMinLng = lng
    if (lng > pMaxLng) pMaxLng = lng
    if (lat < pMinLat) pMinLat = lat
    if (lat > pMaxLat) pMaxLat = lat
  }
  const clampLng0 = Math.max(minLng, pMinLng)
  const clampLng1 = Math.min(maxLng, pMaxLng)
  const clampLat0 = Math.max(minLat, pMinLat)
  const clampLat1 = Math.min(maxLat, pMaxLat)
  if (clampLng0 > clampLng1 || clampLat0 > clampLat1) return null   // sin solape

  const lngSpan = maxLng - minLng
  const latSpan = maxLat - minLat

  // Rango de índices de píxel que cubre el bbox solapado (u: oeste→este, t: norte→sur)
  const xStart = Math.max(0, Math.floor(((clampLng0 - minLng) / lngSpan) * v.width))
  const xEnd   = Math.min(v.width  - 1, Math.ceil(((clampLng1 - minLng) / lngSpan) * v.width))
  const yStart = Math.max(0, Math.floor(((maxLat - clampLat1) / latSpan) * v.height))
  const yEnd   = Math.min(v.height - 1, Math.ceil(((maxLat - clampLat0) / latSpan) * v.height))

  let sum = 0, count = 0, min = Infinity, max = -Infinity
  for (let py = yStart; py <= yEnd; py++) {
    const lat = maxLat - ((py + 0.5) / v.height) * latSpan   // centro del píxel
    for (let px = xStart; px <= xEnd; px++) {
      const val = v.data[py * v.width + px]
      if (!Number.isFinite(val) || (v.nodata !== null && val === v.nodata)) continue
      const lng = minLng + ((px + 0.5) / v.width) * lngSpan
      if (!pointInPolygon(lng, lat, polygon)) continue
      sum += val
      count++
      if (val < min) min = val
      if (val > max) max = val
    }
  }

  if (count === 0) return null
  return { mean: sum / count, count, min, max }
}
