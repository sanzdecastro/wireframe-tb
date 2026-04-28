import { Sensor } from '@/types'

export interface ColumnMapping {
  id:           string[]
  name:         string[]
  kind:         string[]
  lat:          string[]
  lon:          string[]
  status:       string[]
  model:        string[]
  address:      string[]
  street:       string[]
  streetNumber: string[]
  fabricante:   string[]
}

export interface ImportConfig {
  columnMapping: ColumnMapping
  sourceTag:     string
  idPrefix:      string
  latRange:      [number, number]
  lonRange:      [number, number]
  /** Kind por defecto cuando la fila CSV no especifica ninguno o no es reconocido */
  defaultKind:   string
}

export interface ImportError {
  row:    number
  column: string
  reason: string
}

export interface ImportResult {
  totalRows:   number
  validRows:   number
  invalidRows: number
  inserted:    number
  errors:      ImportError[]
  durationMs:  number
  sensors:     Sensor[]
}

export type RawRow = Record<string, string>
