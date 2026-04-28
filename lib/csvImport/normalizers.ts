import { Sensor } from '@/types'

function slug(v: string): string {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// ── kind ─────────────────────────────────────────────────────────────────────

const KIND_MAP: Record<string, string> = {
  banco: 'banco', bancos: 'banco', bench: 'banco', seat: 'banco', asiento: 'banco',
  'banco piedra': 'banco', 'bancos piedra': 'banco', 'banc': 'banco', 'bancs': 'banco',
  mobiliari: 'banco', mobiliario: 'banco',

  luminaria: 'luminaria', luminarias: 'luminaria',
  farola: 'luminaria', farolas: 'luminaria', 'farola led': 'luminaria',
  lamp: 'luminaria', streetlight: 'luminaria', lluminaria: 'luminaria', fanal: 'luminaria',
  iluminacion: 'luminaria', 'punt de llum': 'luminaria',

  jardinera: 'jardinera', jardineras: 'jardinera',
  planter: 'jardinera', maceta: 'jardinera', jardinere: 'jardinera',
  contenidor: 'jardinera', vegetacio: 'jardinera', vegetacion: 'jardinera',
}

/**
 * Normaliza el valor de kind de una fila CSV.
 * Si el valor no reconoce a un kind conocido, usa `defaultKind`.
 */
export function normalizeKind(value: string | null, defaultKind: string): string {
  if (!value) return defaultKind
  return KIND_MAP[slug(value)] ?? defaultKind
}

/**
 * Infiere el kind más probable a partir de un nombre libre (ej. nombre de capa).
 * Devuelve null si no hay coincidencia clara.
 */
export function inferKindFromName(name: string): string | null {
  const n = slug(name)
  if (/luminaria|farola|fanal|lamp|llum|luz|alumbrado|streetlight/.test(n)) return 'luminaria'
  if (/jardinera|planta|vegeta|flor|arbust|maceta|planter/.test(n))          return 'jardinera'
  if (/banco|bench|seat|asiento|mobiliari|mobiliario|banc/.test(n))          return 'banco'
  return null
}

// ── status ────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, Sensor['type']> = {
  activo: 'ok', active: 'ok', actiu: 'ok', online: 'ok', ok: 'ok',
  operativo: 'ok', funcionando: 'ok', si: 'ok',
  inactivo: 'err', inactive: 'err', inactiu: 'err', offline: 'err',
  averia: 'err', averia2: 'err', fallo: 'err', error: 'err', ko: 'err',
}

export function normalizeStatus(value: string | null): Sensor['type'] {
  if (!value) return 'ok'
  return STATUS_MAP[slug(value)] ?? 'ok'
}

// ── text ──────────────────────────────────────────────────────────────────────

export function normalizeText(value: string | null): string {
  return value ? value.trim().replace(/\s+/g, ' ') : ''
}

// ── id ────────────────────────────────────────────────────────────────────────

export function normalizeId(raw: string | null, prefix: string, rowIndex: number): string {
  if (!raw || raw.trim() === '') return `${prefix}ROW-${rowIndex}`
  return `${prefix}${raw.trim().replace(/[^a-zA-Z0-9_\-.]/g, '_')}`
}

// ── address ───────────────────────────────────────────────────────────────────

export function buildAddress(
  address:      string | null,
  street:       string | null,
  streetNumber: string | null,
): string {
  if (address) return normalizeText(address)
  if (street) return normalizeText(`${street}${streetNumber ? `, ${streetNumber}` : ''}`)
  return ''
}
