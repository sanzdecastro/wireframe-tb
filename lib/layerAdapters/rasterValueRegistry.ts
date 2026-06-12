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
