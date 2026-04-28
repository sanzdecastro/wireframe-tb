import { Sensor } from '@/types'
import { ImportConfig, ImportResult } from './types'
import { DEFAULT_IMPORT_CONFIG, mergeConfig } from './config'
import { parseCsv } from './parser'
import { validateRow } from './validator'
import { rowToSensor } from './transformer'

export type { ImportResult } from './types'

export interface ImportCsvOptions {
  csvContent:      string
  existingSensors: Sensor[]
  defaultKind?:    string              // kind por defecto si el CSV no especifica
  configOverride?: Partial<ImportConfig>
  onProgress?:     (done: number, total: number) => void
  chunkSize?:      number
}

/**
 * Pipeline principal: CSV → Sensor[].
 * Procesa en chunks para no bloquear el hilo principal.
 */
export async function importCsv(options: ImportCsvOptions): Promise<ImportResult> {
  const t0     = Date.now()
  const config = mergeConfig(DEFAULT_IMPORT_CONFIG, {
    ...(options.configOverride ?? {}),
    ...(options.defaultKind ? { defaultKind: options.defaultKind } : {}),
  })
  const { csvContent, existingSensors, onProgress, chunkSize = 500 } = options

  // ── 1. Parsear ─────────────────────────────────────────────────────────────
  const { rows } = parseCsv(csvContent)
  const total    = rows.length

  // ── 2. Índice de IDs existentes → upsert O(1) ─────────────────────────────
  const existingIds = new Set(existingSensors.map(s => s.id))

  const sensors:  Sensor[]                               = []
  const errors:   ImportResult['errors']                 = []
  let   validRows = 0
  let   inserted  = 0

  // ── 3. Procesar en chunks ─────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    for (let j = 0; j < chunk.length; j++) {
      const rowNum     = i + j + 2   // base-1 + saltar header
      const row        = chunk[j]
      const validation = validateRow(row, rowNum, config)

      // Acumular todos los errores (incluyendo advertencias)
      errors.push(...validation.errors)

      if (!validation.valid) continue

      const sensor = rowToSensor(
        row, rowNum,
        validation.lat!, validation.lon!,
        validation.rawId, config,
      )

      sensors.push(sensor)
      validRows++
      if (!existingIds.has(sensor.id)) inserted++
    }

    onProgress?.(Math.min(i + chunkSize, total), total)
    await yieldToMain()
  }

  return {
    totalRows:   total,
    validRows,
    invalidRows: total - validRows,
    inserted,
    errors,
    durationMs:  Date.now() - t0,
    sensors,
  }
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}
