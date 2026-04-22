'use client'

import { KPI } from '@/types'
import { KpiBadge } from '@/components/ui'

interface KpiBarProps {
  kpis: KPI[]
  onExplore: () => void
  onOpenPanel: () => void
}

export function KpiBar({ kpis, onExplore, onOpenPanel }: KpiBarProps) {
  const active = kpis.filter(k => k.on)

  return (
    <div className="bg-white border-b border-black/[0.08] flex items-center flex-shrink-0">
      <div className="flex items-center flex-1 px-5">
        {active.map((kpi, i) => (
          <div
            key={kpi.id}
            className={`flex-1 flex flex-col gap-1.5 py-3.5 px-5 ${i === 0 ? 'pl-0' : ''} ${i < active.length - 1 ? 'border-r border-black/[0.08]' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-black/60">{kpi.label}</span>
              <KpiBadge trend={kpi.trend} delta={kpi.delta} />
            </div>
            <span className="text-3xl font-bold tracking-tight text-black/90 leading-none">{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pr-4 flex-shrink-0">
        <button
          onClick={onExplore}
          className="bg-neutral-900 text-white text-xs font-medium px-3 py-1.5 rounded cursor-pointer border-none hover:opacity-85 transition-opacity whitespace-nowrap"
        >
          Explorar
        </button>
        <button
          onClick={onOpenPanel}
          className="w-6 h-6 rounded bg-black/[0.05] border-none flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-neutral-500">
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="14" cy="8" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
