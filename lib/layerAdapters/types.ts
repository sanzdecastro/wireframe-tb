/**
 * Interfaz mínima del sistema de adaptadores para capas externas.
 * El output siempre es compatible con GpkgFeatureLayer para reutilizar
 * el renderer existente en MapView.
 */

import type { GpkgFeatureLayer, GpkgColorScheme } from '@/types'
import type { RampName } from './colorRamps'

export type AdapterSourceType = 'geojson' | 'csv' | 'gpkg' | 'geotiff'

export interface PreviewOptions {
  /** Rampa de color para rásters (geotiff). Default: 'viridis'. */
  colorRamp?: RampName
  /**
   * Dominio [min, max] fijo para normalizar la rampa de color y las paradas
   * de la leyenda. Cuando se pasa, NO se usa el min/max propio del archivo.
   * Imprescindible para series temporales: garantiza que todos los frames
   * compartan la misma escala y sean comparables a lo largo del tiempo.
   */
  colorDomain?: [number, number]
}

export interface AdapterPreview {
  /** Tipo de formato detectado */
  sourceType: AdapterSourceType
  /** Número de features parseadas */
  featureCount: number
  /** Tipo de geometría dominante */
  geometryType: GpkgFeatureLayer['geometryType']
  /** Propiedades disponibles para colorear (nombre → tipo) */
  availableProps: Record<string, 'string' | 'number'>
  /** Propiedad sugerida por auto-estilo (puede ser null si no hay candidata) */
  suggestedProp: string | null
  /** Datos listos para construir el layer final */
  features: object[]
  /** Solo para rásters (geotiff): datos del overlay ya procesado */
  raster?: RasterPreview
}

export interface RasterPreview {
  /** Blob URL del PNG coloreado generado en cliente */
  imageUrl:    string
  /** Bounds WGS84 [minLng, minLat, maxLng, maxLat] */
  bounds:      [number, number, number, number]
  /** Esquema de color (gradiente) ya construido a partir del rango real de valores */
  colorScheme: GpkgColorScheme
  /** Estadísticas de los valores del ráster */
  stats:       { min: number; max: number }
  /** Valores crudos por píxel (para consulta en hover) */
  data:        ArrayLike<number>
  width:       number
  height:      number
  nodata:      number | null
}

export interface AdapterBuildOptions {
  label:     string
  colorProp: string | null   // null = color plano
  /** Etiqueta del valor del ráster (p.ej. "Temperatura superficial", "NDVI") */
  valueLabel?: string
  /** Unidad del valor del ráster (p.ej. "°C"); vacío para índices adimensionales */
  valueUnit?:  string
}

export interface LayerAdapter {
  readonly sourceType: AdapterSourceType
  /** Detecta si el adaptador puede manejar este archivo */
  canHandle(file: File): boolean
  /** Parsea el archivo y devuelve un preview (rápido, sin construir el layer) */
  preview(file: File, opts?: PreviewOptions): Promise<AdapterPreview>
  /** Construye el GpkgFeatureLayer final a partir del preview */
  build(preview: AdapterPreview, options: AdapterBuildOptions): GpkgFeatureLayer
}
