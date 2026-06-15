/**
 * Adaptador GeoTIFF (.tif / .tiff) → GpkgFeatureLayer (overlay de imagen)
 *
 * Usa geotiff.js como puente entre el GeoTIFF y Mapbox:
 *   1. Lee la banda de valores (float) + bounding box + CRS (GeoKeys).
 *   2. Calcula min/max ignorando el nodata.
 *   3. Reproyecta el bbox a WGS84 con proj4 (reutiliza buildTransform).
 *   4. Pinta cada píxel en un <canvas> con la rampa Viridis → blob URL (PNG).
 *   5. Devuelve un layer raster con `imageUrl` + `colorScheme` (gradiente)
 *      para que MapView lo pinte como source `image` y muestre leyenda.
 */

import type { GpkgFeatureLayer } from '@/types'
import { buildTransform } from '@/lib/gpkgImport/reproject'
import { viridisRGB, viridisStops } from './viridis'
import { registerRasterValues } from './rasterValueRegistry'
import type { LayerAdapter, AdapterPreview, AdapterBuildOptions, RasterPreview } from './types'

async function buildRasterPreview(buffer: ArrayBuffer): Promise<RasterPreview> {
  // Import dinámico: geotiff solo se carga en cliente y bajo demanda.
  const { fromArrayBuffer } = await import('geotiff')

  const tiff  = await fromArrayBuffer(buffer)
  const image = await tiff.getImage()

  const width  = image.getWidth()
  const height = image.getHeight()

  const rasters = await image.readRasters({ interleave: false })
  const band    = (rasters as unknown as Array<ArrayLike<number>>)[0]
  if (!band) throw new Error('El GeoTIFF no contiene ninguna banda legible')

  const nodataRaw = image.getGDALNoData()
  const nodata    = typeof nodataRaw === 'number' ? nodataRaw : null

  const isValid = (v: number) =>
    Number.isFinite(v) && (nodata === null || v !== nodata)

  // ── Estadísticas (min/max sobre valores válidos) ──────────────────────────
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < band.length; i++) {
    const v = band[i]
    if (!isValid(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('El GeoTIFF no contiene valores numéricos válidos')
  }
  if (min === max) max = min + 1   // evita división por cero al normalizar

  // ── Colorear el ráster en un canvas ───────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el contexto 2D del canvas')

  const imgData = ctx.createImageData(width, height)
  const px      = imgData.data
  const range   = max - min

  for (let i = 0; i < band.length; i++) {
    const v = band[i]
    const o = i * 4
    if (!isValid(v)) { px[o + 3] = 0; continue }   // nodata → transparente
    const [r, g, b] = viridisRGB((v - min) / range)
    px[o]     = r
    px[o + 1] = g
    px[o + 2] = b
    px[o + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/png')
  )
  const imageUrl = URL.createObjectURL(blob)

  // ── Reproyectar bbox a WGS84 ──────────────────────────────────────────────
  const [minX, minY, maxX, maxY] = image.getBoundingBox() as number[]
  const keys  = image.getGeoKeys() ?? {}
  const epsg  = keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey ?? 4326
  const tf    = buildTransform(epsg, '')   // null si ya es WGS84

  const corners: Array<[number, number]> = [
    [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY],
  ]
  const lngLat = corners.map(c => (tf ? tf(c) : c))
  const lngs   = lngLat.map(c => c[0])
  const lats   = lngLat.map(c => c[1])
  const bounds: [number, number, number, number] = [
    Math.min(...lngs), Math.min(...lats),
    Math.max(...lngs), Math.max(...lats),
  ]

  return {
    imageUrl,
    bounds,
    stats: { min, max },
    colorScheme: {
      property: 'valor',
      type:     'gradient',
      stops:    viridisStops(min, max),
    },
    data: band,
    width,
    height,
    nodata,
  }
}

export const geotiffAdapter: LayerAdapter = {
  sourceType: 'geotiff',

  canHandle(file: File): boolean {
    const name = file.name.toLowerCase()
    return name.endsWith('.tif') || name.endsWith('.tiff')
  },

  async preview(file: File): Promise<AdapterPreview> {
    const buffer = await file.arrayBuffer()
    const raster = await buildRasterPreview(buffer)
    return {
      sourceType:    'geotiff',
      featureCount:  0,
      geometryType:  'raster',
      availableProps: {},
      suggestedProp:  null,
      features:       [],
      raster,
    }
  },

  build(preview: AdapterPreview, options: AdapterBuildOptions): GpkgFeatureLayer {
    if (!preview.raster) throw new Error('Preview de GeoTIFF sin datos de ráster')
    const { imageUrl, bounds, colorScheme, data, width, height, nodata } = preview.raster
    const id = `geotiff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // Guardar valores crudos para consulta en hover
    registerRasterValues(id, { data, width, height, bounds, nodata })

    return {
      id,
      label:        options.label,
      tableName:    'geotiff',
      geojson:      { type: 'FeatureCollection', features: [] },
      geometryType: 'raster',
      color:        colorScheme.stops?.[0]?.[1] ?? '#21918c',
      active:       true,
      opacity:      80,
      colorScheme,
      tileBounds:   bounds,
      imageUrl,
      valueLabel:   options.valueLabel ?? 'Temperatura superficial',
      valueUnit:    options.valueUnit  ?? '°C',
    }
  },
}
