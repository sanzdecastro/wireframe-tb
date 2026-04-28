import { Sensor } from '@/types'
import { RawRow, ImportConfig } from './types'
import { resolveField } from './resolver'
import { normalizeKind, normalizeStatus, normalizeText, normalizeId, buildAddress } from './normalizers'

export function rowToSensor(
  row:    RawRow,
  rowNum: number,
  lat:    number,
  lon:    number,
  rawId:  string | null,
  config: ImportConfig,
): Sensor {
  const { columnMapping, idPrefix, defaultKind } = config

  const kind = normalizeKind(resolveField(row, columnMapping.kind), defaultKind)
  const rawName   = resolveField(row, columnMapping.name)
  const fabricant = normalizeText(resolveField(row, columnMapping.fabricante)) || undefined

  const address = buildAddress(
    resolveField(row, columnMapping.address),
    resolveField(row, columnMapping.street),
    resolveField(row, columnMapping.streetNumber),
  )

  const nameParts = [rawName, address].filter(Boolean)
  const label     = nameParts.length ? normalizeText(nameParts.join(' — ')) : `${kind} ${rowNum}`

  return {
    id:         normalizeId(rawId, idPrefix, rowNum),
    lng:        lon,
    lat:        lat,
    type:       normalizeStatus(resolveField(row, columnMapping.status)),
    kind,
    label,
    fabricante: fabricant,
  }
}
