/**
 * Adaptador GeoJSON / JSON → GpkgFeatureLayer
 *
 * Soporta:
 *   - FeatureCollection estándar
 *   - Feature individual (se envuelve automáticamente)
 *
 * El adaptador auto-detecta el tipo de geometría, inspecciona
 * las propiedades disponibles y sugiere la mejor para colorear.
 */

import type { GpkgFeatureLayer, GpkgColorScheme } from '@/types'
import { detectColorScheme } from '@/lib/gpkgImport/colorize'
import type { LayerAdapter, AdapterPreview, AdapterBuildOptions } from './types'

// ── Helpers internos ──────────────────────────────────────────────────────────

function detectGeometryType(features: any[]): GpkgFeatureLayer['geometryType'] {
  const types = new Set<string>()
  for (const f of features) {
    const raw = (f.geometry?.type ?? '').toLowerCase()
    if (raw === 'point' || raw === 'multipoint') types.add('point')
    else if (raw === 'linestring' || raw === 'multilinestring') types.add('linestring')
    else if (raw === 'polygon' || raw === 'multipolygon') types.add('polygon')
  }
  if (types.size === 0) return 'point'
  if (types.size > 1)   return 'mixed'
  return Array.from(types)[0] as GpkgFeatureLayer['geometryType']
}

function getAvailableProps(features: any[]): Record<string, 'string' | 'number'> {
  const props: Record<string, 'string' | 'number'> = {}
  // Scan first 200 features to discover all property names
  for (const f of features.slice(0, 200)) {
    for (const [k, v] of Object.entries(f.properties ?? {})) {
      if (v === null || v === undefined) continue
      if (!props[k]) props[k] = typeof v === 'number' ? 'number' : 'string'
    }
  }
  return props
}

function buildColorSchemeForProp(
  features: any[],
  prop: string,
): GpkgColorScheme | undefined {
  // Narrow detectColorScheme to operate only on the chosen property
  const synth = features.map((f: any) => ({
    ...f,
    properties: { [prop]: f.properties?.[prop] ?? null },
  }))
  return detectColorScheme(synth) ?? undefined
}

function fallbackColor(scheme: GpkgColorScheme | undefined): string {
  if (!scheme) return '#2196f3'
  if (scheme.type === 'categorical' && scheme.categories) {
    return Object.values(scheme.categories)[0] ?? '#2196f3'
  }
  if (scheme.type === 'gradient' && scheme.stops?.length) {
    return scheme.stops[0][1]
  }
  return '#2196f3'
}

// ── Adaptador ─────────────────────────────────────────────────────────────────

export const geojsonAdapter: LayerAdapter = {
  sourceType: 'geojson',

  canHandle(file: File): boolean {
    const name = file.name.toLowerCase()
    return name.endsWith('.geojson') || name.endsWith('.json')
  },

  async preview(file: File): Promise<AdapterPreview> {
    const text = await file.text()

    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('El archivo no es un JSON válido')
    }

    let features: any[]
    if (parsed.type === 'FeatureCollection') {
      features = parsed.features ?? []
    } else if (parsed.type === 'Feature') {
      features = [parsed]
    } else {
      throw new Error(
        'Formato GeoJSON no reconocido — se esperaba FeatureCollection o Feature'
      )
    }

    if (features.length === 0) {
      throw new Error('El archivo GeoJSON no contiene ninguna feature')
    }

    const geometryType   = detectGeometryType(features)
    const availableProps = getAvailableProps(features)
    const scheme         = detectColorScheme(features)

    return {
      sourceType:   'geojson',
      featureCount: features.length,
      geometryType,
      availableProps,
      suggestedProp: scheme?.property ?? null,
      features,
    }
  },

  build(preview: AdapterPreview, options: AdapterBuildOptions): GpkgFeatureLayer {
    const { label, colorProp } = options
    const id = `geojson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const geojson = { type: 'FeatureCollection', features: preview.features }

    const colorScheme = colorProp
      ? buildColorSchemeForProp(preview.features as any[], colorProp)
      : undefined

    return {
      id,
      label,
      tableName:    'geojson',
      geojson,
      geometryType: preview.geometryType,
      color:        fallbackColor(colorScheme),
      active:       true,
      opacity:      80,
      colorScheme,
    }
  },
}
