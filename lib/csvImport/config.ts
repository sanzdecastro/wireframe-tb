import { ImportConfig } from './types'

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  sourceTag:   'csv_upload',
  idPrefix:    'CSV-',
  latRange:    [-90, 90],
  lonRange:    [-180, 180],
  defaultKind: 'banco',

  columnMapping: {
    id:           ['id', 'gis_id', 'objectid', 'codigo', 'codi', 'cod'],
    name:         ['name', 'nombre', 'nom', 'descripcio', 'descripcion', 'description', 'label'],
    kind:         ['kind', 'tipo', 'tipus', 'tipus_de_mobiliari_urba', 'categoria', 'type', 'asset_type'],
    lat:          ['lat', 'latitude', 'latitud', 'y', 'coord_y', 'latitud_y'],
    lon:          ['lon', 'lng', 'longitude', 'longitud', 'x', 'coord_x', 'longitud_x'],
    status:       ['status', 'estado', 'estat', 'activo', 'active', 'operativo'],
    model:        ['model', 'modelo', 'model_number', 'fabrication_model', 'tipus'],
    address:      ['address', 'direccion', 'adreca', 'full_address', 'adressa'],
    street:       ['nom_carrer', 'calle', 'carrer', 'street', 'via', 'nombre_via'],
    streetNumber: ['num_carrer', 'numero', 'number', 'portal', 'num'],
    fabricante:   ['fabricant', 'fabricante', 'manufacturer', 'marca', 'brand', 'proveedor'],
  },
}

export function mergeConfig(
  base: ImportConfig,
  overrides: Partial<ImportConfig>,
): ImportConfig {
  return {
    ...base,
    ...overrides,
    columnMapping: { ...base.columnMapping, ...(overrides.columnMapping ?? {}) },
  }
}
