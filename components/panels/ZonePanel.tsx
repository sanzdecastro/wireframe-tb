'use client'

import { useState, useEffect } from 'react'
import { SidePanel, CloseIcon, KpiBadge } from '@/components/ui'
import { randomZoneKpis, randomZoneDevices } from '@/lib/utils'

interface ZonePanelProps {
  open: boolean
  onClose: () => void
  onCreateProject: (name: string) => void
}

export function ZonePanel({ open, onClose, onCreateProject }: ZonePanelProps) {
  const [name, setName] = useState('Área sin nombre')
  const [kpis, setKpis] = useState<ReturnType<typeof randomZoneKpis>>([])
  const [devices, setDevices] = useState<ReturnType<typeof randomZoneDevices>>([])

  useEffect(() => {
    if (open) {
      setName('Área sin nombre')
      setKpis(randomZoneKpis())
      setDevices(randomZoneDevices())
    }
  }, [open])

  const totalDevices = devices.reduce((a, b) => a + b.count, 0)

  return (
    <SidePanel open={open}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Mapa → Nueva área</p>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-medium text-black/90">Informe del área</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Análisis de la zona seleccionada</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.08]">
        <input
          className="flex-1 text-sm font-medium text-neutral-900 border-none bg-transparent outline-none placeholder:text-neutral-300"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del área"
        />
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-neutral-300 flex-shrink-0">
          <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* KPIs */}
        <div className="px-4 py-3 border-b border-black/[0.08]">
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-2.5">KPIs del área</p>
          <div className="grid grid-cols-2 gap-2">
            {kpis.map(k => (
              <div key={k.label} className="bg-neutral-50 border border-black/[0.07] rounded-md px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-black/55">
                  {k.label}
                  {k.delta && <KpiBadge trend={k.trend} delta={k.delta} />}
                </div>
                <div className="text-[22px] font-bold tracking-tight text-black/90 leading-none">{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-1">Dispositivos</p>
          <p className="text-[11px] text-neutral-500 mb-2.5">{totalDevices} dispositivos en el área</p>
          <div className="grid grid-cols-2 gap-1.5">
            {devices.map(d => (
              <div key={d.name} className={`rounded-md px-2.5 py-2 border ${d.status === 'err' ? 'border-red-100' : 'border-black/[0.07]'} bg-neutral-50`}>
                <div className="text-xs font-medium text-neutral-900 mb-0.5">{d.name}</div>
                <div className={`text-[11px] ${d.status === 'err' ? 'text-red-600' : 'text-neutral-400'}`}>
                  {d.count} uds{d.status === 'err' ? ' · Revisar' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-black/[0.08] flex gap-2 flex-shrink-0">
        <button onClick={onClose} className="flex-1 h-9 rounded-md text-sm font-medium cursor-pointer bg-transparent border border-black/20 text-neutral-600 hover:bg-black/[0.03]">
          Descartar
        </button>
        <button
          onClick={() => onCreateProject(name || 'Nueva área')}
          className="flex-1 h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85"
        >
          Crear proyecto →
        </button>
      </div>
    </SidePanel>
  )
}
