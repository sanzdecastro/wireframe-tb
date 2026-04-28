import { RawRow } from './types'

/** Devuelve el primer valor no vacío encontrado entre los candidatos */
export function resolveField(row: RawRow, candidates: string[]): string | null {
  for (const c of candidates) {
    const v = row[c.toLowerCase()]
    if (v !== undefined && v.trim() !== '') return v.trim()
  }
  return null
}

/** Igual que resolveField pero parsea el resultado como número.
 *  Soporta separadores decimales europeos (coma). */
export function resolveNumericField(row: RawRow, candidates: string[]): number | null {
  const raw = resolveField(row, candidates)
  if (raw === null) return null
  const num = parseFloat(raw.replace(',', '.'))
  return isNaN(num) ? null : num
}
