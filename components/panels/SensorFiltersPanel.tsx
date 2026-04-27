'use client'

import { Sensor, SensorFilters } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'
import { SENSOR_FABRICANTES } from '@/lib/data'

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

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
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
      <span className="text-xs text-neutral-700">{label}</span>
    </label>
  )
}

interface SensorFiltersPanelProps {
  open: boolean
  filters: SensorFilters
  onChange: (f: SensorFilters) => void
  onClose: () => void
}

const KIND_LABELS: Record<Sensor['kind'], string> = {
  banco:     'Banco / Mobiliario',
  luminaria: 'Luminaria',
  jardinera: 'Jardinera',
}

const STATUS_LABELS: Record<Sensor['type'], string> = {
  ok:  'Activo',
  err: 'Alerta',
}

export function SensorFiltersPanel({ open, filters, onChange, onClose }: SensorFiltersPanelProps) {
  const active = countActiveSensorFilters(filters)

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
        <p className="text-[11px] text-neutral-400 mt-0.5">Filtra los sensores visibles en el mapa</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Tipo de dispositivo</div>
          <div className="flex flex-col">
            {(Object.keys(KIND_LABELS) as Sensor['kind'][]).map(k => (
              <Checkbox
                key={k}
                label={KIND_LABELS[k]}
                checked={filters.kinds.includes(k)}
                onChange={() => onChange({ ...filters, kinds: toggle(filters.kinds, k) })}
              />
            ))}
          </div>
        </div>

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

        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Fabricante</div>
          <div className="flex flex-col">
            {SENSOR_FABRICANTES.map(fab => (
              <Checkbox
                key={fab}
                label={fab}
                checked={filters.fabricantes.includes(fab)}
                onChange={() => onChange({ ...filters, fabricantes: toggle(filters.fabricantes, fab) })}
              />
            ))}
          </div>
        </div>
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
