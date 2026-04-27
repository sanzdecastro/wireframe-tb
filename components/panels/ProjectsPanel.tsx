'use client'

import { useMemo } from 'react'
import { Project, ProjectDeviceFilters } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'
import {
  generateProjectDevices,
  applyDeviceFilters,
  DEVICE_TYPE_LABEL,
  DEVICE_SENSOR_LABEL,
  countActiveDeviceFilters,
} from '@/lib/projectDevices'

interface ProjectsPanelProps {
  open: boolean
  projects: Project[]
  selectedProject: Project | null
  onSelectProject: (project: Project | null) => void
  onClose: () => void
  onOpenFilters?: () => void
  activeFilterCount?: number
  deviceFilters?: ProjectDeviceFilters
  onOpenDeviceFilters?: () => void
  deviceOverrides?: Record<string, Partial<{ name: string }>>
  onSelectDevice?: (deviceId: string) => void
}

function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-black/10 bg-white text-neutral-700 cursor-pointer hover:bg-black/[0.03] transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Filtros
      {count > 0 && (
        <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-neutral-900 text-white text-[10px] font-medium">
          {count}
        </span>
      )}
    </button>
  )
}

function ProjectDetail({
  project,
  open,
  onBack,
  onClose,
  deviceFilters,
  onOpenDeviceFilters,
  deviceOverrides,
  onSelectDevice,
}: {
  project: Project
  open: boolean
  onBack: () => void
  onClose: () => void
  deviceFilters: ProjectDeviceFilters
  onOpenDeviceFilters?: () => void
  deviceOverrides?: Record<string, Partial<{ name: string }>>
  onSelectDevice?: (deviceId: string) => void
}) {
  const hasCoords = !!project.coords?.length
  const deviceDensity = hasCoords
    ? (project.devices / Math.max(project.coords!.length, 1)).toFixed(1)
    : '—'

  const devices = useMemo(() => {
    const base = generateProjectDevices(project)
    if (!deviceOverrides) return base
    return base.map(d => deviceOverrides[d.id] ? { ...d, ...deviceOverrides[d.id] } : d)
  }, [project, deviceOverrides])
  const filtered = useMemo(() => applyDeviceFilters(devices, deviceFilters), [devices, deviceFilters])
  const activeCount = countActiveDeviceFilters(deviceFilters)

  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
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
        <div className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm mb-1.5 ${
          project.status === 'active' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
        }`}>
          {project.status === 'active' ? 'Activo' : 'Planificado'}
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">{project.name}</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">{project.area}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Dispositivos', value: String(project.devices) },
            { label: 'Densidad',     value: `${deviceDensity} disp/nodo` },
            { label: 'Estado',       value: project.status === 'active' ? 'En servicio' : 'Pendiente' },
            { label: 'Cobertura',    value: hasCoords ? `${project.coords!.length} nodos` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-50 rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-neutral-400 mb-0.5">{label}</div>
              <div className="text-sm font-semibold text-neutral-900">{value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Resumen</div>
          <p className="text-sm text-neutral-700 leading-relaxed">{project.desc}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Dispositivos</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">{filtered.length}/{devices.length}</span>
            {onOpenDeviceFilters && <FiltersButton count={activeCount} onClick={onOpenDeviceFilters} />}
          </div>
        </div>

        <div className="flex flex-col divide-y divide-black/[0.05] border border-black/[0.05] rounded-lg overflow-hidden">
          {filtered.map(d => (
            <div
              key={d.id}
              onClick={onSelectDevice ? () => onSelectDevice(d.id) : undefined}
              className={`flex items-center gap-2 px-3 py-2 ${onSelectDevice ? 'cursor-pointer hover:bg-black/[0.02] transition-colors' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-neutral-900 truncate">{d.name}</div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {DEVICE_TYPE_LABEL[d.type]}{d.sensor ? ` · ${DEVICE_SENSOR_LABEL[d.sensor]}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.incident && (
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-800">Incidencia</span>
                )}
                {d.alert && (
                  <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700">Alerta</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-neutral-400 px-3 py-4 text-center">
              Sin dispositivos que coincidan con los filtros
            </div>
          )}
        </div>
      </div>
    </SidePanel>
  )
}

export function ProjectsPanel({
  open,
  projects,
  selectedProject,
  onSelectProject,
  onClose,
  onOpenFilters,
  activeFilterCount = 0,
  deviceFilters,
  onOpenDeviceFilters,
  deviceOverrides,
  onSelectDevice,
}: ProjectsPanelProps) {
  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        open={open}
        onBack={() => onSelectProject(null)}
        onClose={onClose}
        deviceFilters={deviceFilters ?? { types: [], sensors: [], flags: [], fabricantes: [] }}
        onOpenDeviceFilters={onOpenDeviceFilters}
        deviceOverrides={deviceOverrides}
        onSelectDevice={onSelectDevice}
      />
    )
  }

  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-black/90">Proyectos</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Barcelona · {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onOpenFilters && <FiltersButton count={activeFilterCount} onClick={onOpenFilters} />}
            <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onSelectProject(p)}
            className="flex items-start gap-2.5 px-4 py-3 border-b border-black/[0.05] cursor-pointer hover:bg-black/[0.015] transition-colors"
          >
            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${p.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <div className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm mb-1 ${
                p.status === 'active' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
              }`}>
                {p.status === 'active' ? 'Activo' : 'Planificado'}
              </div>
              <div className="text-[13px] font-medium text-neutral-900 leading-snug">{p.name}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                {p.desc} · {p.devices} dispositivos
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-neutral-300 flex-shrink-0 mt-1">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-neutral-300">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-xs mt-2">{activeFilterCount > 0 ? 'Sin resultados con los filtros activos' : 'Sin proyectos todavía'}</p>
          </div>
        )}
      </div>
    </SidePanel>
  )
}
