'use client'

import { Project, ProjectDeviceFilters, ProjectDeviceType, ProjectDeviceSensor, ProjectDeviceFlag, ProjectDeviceFabricante } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'
import { DEVICE_TYPE_LABEL, DEVICE_SENSOR_LABEL, DEVICE_FABRICANTE_LABEL, EMPTY_DEVICE_FILTERS, countActiveDeviceFilters } from '@/lib/projectDevices'

interface ProjectDeviceFiltersPanelProps {
  open: boolean
  project: Project | null
  filters: ProjectDeviceFilters
  onChange: (filters: ProjectDeviceFilters) => void
  onClose: () => void
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

export function ProjectDeviceFiltersPanel({ open, project, filters, onChange, onClose }: ProjectDeviceFiltersPanelProps) {
  const active = countActiveDeviceFilters(filters)

  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {project?.name ?? 'Proyecto'}
          </button>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Filtros de dispositivos</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">Filtros para los dispositivos del proyecto</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Tipo de dispositivo</div>
          <div className="flex flex-col">
            {(Object.keys(DEVICE_TYPE_LABEL) as ProjectDeviceType[]).map(t => (
              <Checkbox
                key={t}
                label={DEVICE_TYPE_LABEL[t]}
                checked={filters.types.includes(t)}
                onChange={() => onChange({ ...filters, types: toggle(filters.types, t) })}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Incluye sensor</div>
          <div className="flex flex-col">
            {(Object.keys(DEVICE_SENSOR_LABEL) as ProjectDeviceSensor[]).map(s => (
              <Checkbox
                key={s}
                label={DEVICE_SENSOR_LABEL[s]}
                checked={filters.sensors.includes(s)}
                onChange={() => onChange({ ...filters, sensors: toggle(filters.sensors, s) })}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Fabricante</div>
          <div className="flex flex-col">
            {(Object.keys(DEVICE_FABRICANTE_LABEL) as ProjectDeviceFabricante[]).map(f => (
              <Checkbox
                key={f}
                label={DEVICE_FABRICANTE_LABEL[f]}
                checked={filters.fabricantes.includes(f)}
                onChange={() => onChange({ ...filters, fabricantes: toggle(filters.fabricantes, f) })}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Incidencias y alertas</div>
          <div className="flex flex-col">
            {([
              { id: 'incident' as ProjectDeviceFlag, label: 'Con incidencias' },
              { id: 'alert'    as ProjectDeviceFlag, label: 'Con alertas'     },
            ]).map(f => (
              <Checkbox
                key={f.id}
                label={f.label}
                checked={filters.flags.includes(f.id)}
                onChange={() => onChange({ ...filters, flags: toggle(filters.flags, f.id) })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex items-center justify-between gap-2 flex-shrink-0">
        <button
          onClick={() => onChange(EMPTY_DEVICE_FILTERS)}
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
