'use client'

import { Sensor, SensorFilters } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'

export const EMPTY_SENSOR_FILTERS: SensorFilters = { kinds: [], statuses: [], fabricantes: [] }

export function countActiveSensorFilters(f: SensorFilters) {
  return f.kinds.length + f.statuses.length + f.fabricantes.length
}

export function applySensorFilters(sensors: Sensor[], f: SensorFilters): Sensor[] {
  if (!f.kinds.length && !f.statuses.length && !f.fabricantes.length) return sensors
  return sensors.filter(s => {
    if (f.kinds.length       && !f.kinds.includes(s.kind))              return false
    if (f.statuses.length    && !f.statuses.includes(s.type))           return false
    if (f.fabricantes.length && !f.fabricantes.includes(s.fabricante ?? '')) return false
    return true
  })
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
}

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function Checkbox({
  checked, onChange, label, count,
}: {
  checked: boolean
  onChange: () => void
  label: string
  count?: number
}) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
      <span
        onClick={onChange}
        className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
          checked ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-black/25'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3 3 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-xs text-neutral-700 flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-neutral-400 tabular-nums">{count.toLocaleString()}</span>
      )}
    </label>
  )
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface FilterOption<T extends string> {
  value: T
  count: number
}

interface SensorFiltersPanelProps {
  open:         boolean
  filters:      SensorFilters
  kinds?:       FilterOption<Sensor['kind']>[]
  fabricantes?: FilterOption<string>[]
  onChange:     (f: SensorFilters) => void
  onClose:      () => void
}

// ── Labels estáticos ───────────────────────────────────────────────────────────

const KIND_LABELS: Record<Sensor['kind'], string> = {
  banco:     'Banco',
  luminaria: 'Luminaria',
  jardinera: 'Jardinera',
}

const STATUS_LABELS: Record<Sensor['type'], string> = {
  ok:  'Activo',
  err: 'Alerta',
}

// Fallback estático si no se pasan props dinámicas
const DEFAULT_KINDS: FilterOption<Sensor['kind']>[] = [
  { value: 'banco',     count: 0 },
  { value: 'luminaria', count: 0 },
  { value: 'jardinera', count: 0 },
]

// ── Componente ─────────────────────────────────────────────────────────────────

export function SensorFiltersPanel({
  open, filters, kinds, fabricantes, onChange, onClose,
}: SensorFiltersPanelProps) {
  const active   = countActiveSensorFilters(filters)
  const kindList = kinds       ?? DEFAULT_KINDS
  const fabList  = fabricantes ?? []

  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">Explorar</span>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Filtros</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {kindList.reduce((s, k) => s + k.count, 0).toLocaleString()} sensores disponibles
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Tipo de dispositivo — dinámico */}
        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
            Tipo de dispositivo
          </div>
          <div className="flex flex-col">
            {kindList.map(({ value, count }) => (
              <Checkbox
                key={value}
                label={KIND_LABELS[value] ?? value}
                count={count}
                checked={filters.kinds.includes(value)}
                onChange={() => onChange({ ...filters, kinds: toggle(filters.kinds, value) })}
              />
            ))}
          </div>
        </div>

        {/* Estado */}
        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Estado</div>
          <div className="flex flex-col">
            {(Object.keys(STATUS_LABELS) as Sensor['type'][]).map(s => (
              <Checkbox
                key={s}
                label={STATUS_LABELS[s]}
                checked={filters.statuses.includes(s)}
                onChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
              />
            ))}
          </div>
        </div>

        {/* Fabricante — dinámico */}
        {fabList.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
              Fabricante
              {fabricantes && (
                <span className="ml-1.5 text-[10px] font-normal normal-case">
                  ({fabList.length})
                </span>
              )}
            </div>
            <div className="flex flex-col">
              {fabList.map(({ value, count }) => (
                <Checkbox
                  key={value}
                  label={value}
                  count={count}
                  checked={filters.fabricantes.includes(value)}
                  onChange={() => onChange({ ...filters, fabricantes: toggle(filters.fabricantes, value) })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex items-center justify-between gap-2 flex-shrink-0">
        <button
          onClick={() => onChange(EMPTY_SENSOR_FILTERS)}
          disabled={active === 0}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-md border-none cursor-pointer transition-colors bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-md border-none cursor-pointer transition-opacity bg-neutral-900 text-white hover:opacity-85"
        >
          OK
        </button>
      </div>
    </SidePanel>
  )
}
