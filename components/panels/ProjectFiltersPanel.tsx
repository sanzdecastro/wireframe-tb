'use client'

import { ProjectFilters, ProjectTaxonomy, ProjectDistrict, ProjectDeviceCategory, ProjectSensorCategory } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'

interface ProjectFiltersPanelProps {
  open: boolean
  filters: ProjectFilters
  onChange: (filters: ProjectFilters) => void
  onClose: () => void
}

const TAXONOMY: { id: ProjectTaxonomy; label: string }[] = [
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'area-1',   label: 'Área de análisis 1' },
  { id: 'area-2',   label: 'Área de análisis 2' },
]

const DISTRICTS: { id: ProjectDistrict; label: string }[] = [
  { id: 'ciutat-vella', label: 'Ciutat Vella' },
  { id: 'eixample',     label: 'Eixample' },
  { id: 'gracia',       label: 'Gràcia' },
  { id: 'les-corts',    label: 'Les Corts' },
  { id: 'nou-barris',   label: 'Nou Barris' },
  { id: 'sant-marti',   label: 'Sant Martí' },
]

const DEVICES: { id: ProjectDeviceCategory; label: string }[] = [
  { id: 'iluminacion',   label: 'Iluminación' },
  { id: 'arbolado',      label: 'Arbolado' },
  { id: 'mobiliario',    label: 'Mobiliario' },
  { id: 'jardineras',    label: 'Jardineras' },
  { id: 'dispositivo-y', label: 'Dispositivo Y' },
  { id: 'dispositivo-z', label: 'Dispositivo Z' },
]

const SENSORS: { id: ProjectSensorCategory; label: string }[] = [
  { id: 'calidad-aire', label: 'Calidad del aire' },
  { id: 'sensor-x',     label: 'Sensor X' },
  { id: 'sensor-y',     label: 'Sensor Y' },
  { id: 'sensor-z',     label: 'Sensor Z' },
]

export const EMPTY_FILTERS: ProjectFilters = {
  taxonomy: [],
  districts: [],
  devices: [],
  sensors: [],
}

export function countActiveFilters(f: ProjectFilters) {
  return f.taxonomy.length + f.districts.length + f.devices.length + f.sensors.length
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
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

function Section<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: { id: T; label: string }[]
  selected: T[]
  onToggle: (id: T) => void
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">{title}</div>
      <div className="flex flex-col">
        {options.map(o => (
          <Checkbox
            key={o.id}
            label={o.label}
            checked={selected.includes(o.id)}
            onChange={() => onToggle(o.id)}
          />
        ))}
      </div>
    </div>
  )
}

export function ProjectFiltersPanel({ open, filters, onChange, onClose }: ProjectFiltersPanelProps) {
  const reset = () => onChange(EMPTY_FILTERS)
  const active = countActiveFilters(filters)

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
            Proyectos
          </button>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Filtros</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">Filtros para la vista de proyectos</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <Section title='Taxonomía de "Proyecto"' options={TAXONOMY}  selected={filters.taxonomy}  onToggle={id => onChange({ ...filters, taxonomy:  toggle(filters.taxonomy,  id) })} />
        <Section title='Distrito'                 options={DISTRICTS} selected={filters.districts} onToggle={id => onChange({ ...filters, districts: toggle(filters.districts, id) })} />
        <Section title='Proyecto incluye'         options={DEVICES}   selected={filters.devices}   onToggle={id => onChange({ ...filters, devices:   toggle(filters.devices,   id) })} />
        <Section title='Proyecto incluye sensor'  options={SENSORS}   selected={filters.sensors}   onToggle={id => onChange({ ...filters, sensors:   toggle(filters.sensors,   id) })} />
        <button className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 self-start bg-transparent border-none cursor-pointer p-0">
          Más filtros
        </button>
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex items-center justify-between gap-2 flex-shrink-0">
        <button
          onClick={reset}
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
