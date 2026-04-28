import { RawRow } from './types'

export interface ParseResult {
  headers: string[]
  rows:    RawRow[]
}

export function parseCsv(raw: string): ParseResult {
  const delimiter = detectDelimiter(raw)
  const lines     = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nonEmpty  = lines.filter(l => l.trim().length > 0)

  if (nonEmpty.length < 2) throw new Error('CSV vacío o sin filas de datos')

  const headers = parseLine(nonEmpty[0], delimiter).map(h => h.trim().toLowerCase())

  const rows: RawRow[] = []
  for (let i = 1; i < nonEmpty.length; i++) {
    const values = parseLine(nonEmpty[i], delimiter)
    const row: RawRow = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim() })
    rows.push(row)
  }

  return { headers, rows }
}

function detectDelimiter(raw: string): string {
  const first = raw.split('\n')[0] ?? ''
  const commas     = (first.match(/,/g)  ?? []).length
  const semicolons = (first.match(/;/g)  ?? []).length
  const tabs       = (first.match(/\t/g) ?? []).length
  if (tabs > commas && tabs > semicolons) return '\t'
  return semicolons > commas ? ';' : ','
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current  = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
