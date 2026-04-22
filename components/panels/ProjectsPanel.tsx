'use client'

import { Project } from '@/types'
import { SidePanel, CloseIcon } from '@/components/ui'

interface ProjectsPanelProps {
  open: boolean
  projects: Project[]
  selectedProject: Project | null
  onSelectProject: (project: Project | null) => void
  onClose: () => void
  onOpenFilters?: () => void
  activeFilterCount?: number
}

export function ProjectsPanel({ open, projects, selectedProject, onSelectProject, onClose, onOpenFilters, activeFilterCount = 0 }: ProjectsPanelProps) {
  if (selectedProject) {
    const hasCoords = !!selectedProject.coords?.length
    const deviceDensity = hasCoords
      ? (selectedProject.devices / Math.max(selectedProject.coords!.length, 1)).toFixed(1)
      : '—'

    const seed = selectedProject.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const weights = [0.30, 0.18, 0.22, 0.30]
    const names = ['Bancos', 'Papeleras', 'Luminarias', 'Sensores IoT']
    const rawCounts = weights.map((w, i) => Math.max(1, Math.round(selectedProject.devices * w) + ((seed + i * 7) % 3 - 1)))
    const diff = selectedProject.devices - rawCounts.reduce((a, b) => a + b, 0)
    rawCounts[3] = Math.max(1, rawCounts[3] + diff)
    const deviceTypes = names.map((name, i) => ({
      name,
      count: rawCounts[i],
      status: (seed + i) % 5 === 0 ? ('err' as const) : ('ok' as const),
    }))

    return (
      <SidePanel open={open}>
        <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onSelectProject(null)}
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
            selectedProject.status === 'active' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          }`}>
            {selectedProject.status === 'active' ? 'Activo' : 'Planificado'}
          </div>
          <h2 className="text-xl font-medium text-black/90 leading-tight">{selectedProject.name}</h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">{selectedProject.area}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Dispositivos', value: String(selectedProject.devices) },
              { label: 'Densidad',     value: `${deviceDensity} disp/nodo` },
              { label: 'Estado',       value: selectedProject.status === 'active' ? 'En servicio' : 'Pendiente' },
              { label: 'Cobertura',    value: hasCoords ? `${selectedProject.coords!.length} nodos` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-neutral-50 rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-neutral-400 mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-neutral-900">{value}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Resumen</div>
            <p className="text-sm text-neutral-700 leading-relaxed">{selectedProject.desc}</p>
          </div>

          {/* Device / sensor types */}
          <div>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Dispositivos y sensores</div>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map(d => (
                <div
                  key={d.name}
                  className={`rounded-md px-2.5 py-2 border ${d.status === 'err' ? 'bg-red-50 border-red-100' : 'bg-neutral-50 border-black/[0.05]'}`}
                >
                  <div className="text-xs font-medium text-neutral-900 mb-0.5">{d.name}</div>
                  <div className={`text-[11px] ${d.status === 'err' ? 'text-red-600' : 'text-neutral-400'}`}>
                    {d.count} uds{d.status === 'err' ? ' · Revisar' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SidePanel>
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
            {onOpenFilters && (
              <button
                onClick={onOpenFilters}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-black/10 bg-white text-neutral-700 cursor-pointer hover:bg-black/[0.03] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-neutral-900 text-white text-[10px] font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
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
