'use client'

import { MapMode } from '@/types'

interface MapControlsProps {
  mode: MapMode
  drawMode: boolean
  onModeChange: (mode: MapMode) => void
  onDrawToggle: () => void
  onLayersOpen: () => void
}

export function MapControls({ mode, drawMode, onModeChange, onDrawToggle, onLayersOpen }: MapControlsProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Mode toggle */}
      <div className="bg-white border border-black/15 rounded-lg flex p-0.5 gap-0.5 shadow-sm">
        {(['explorar', 'proyectos'] as MapMode[]).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`text-xs px-4 py-1.5 rounded-md border-none cursor-pointer transition-all ${
              mode === m
                ? 'bg-white text-neutral-900 font-medium shadow-sm'
                : 'bg-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Actions bar — only in explorar */}
      {mode === 'explorar' && (
        <div className="bg-white border  border-black/15 rounded-md flex items-center gap-0.5 p-1 shadow-sm">
          <button
            onClick={onDrawToggle}
            title="Dibujar área"
            className={`w-fit px-3 gap-2 text-xs h-7 border-none rounded flex items-center justify-center cursor-pointer transition-colors ${
              drawMode ? 'bg-neutral-900 text-white' : 'bg-transparent text-neutral-500 hover:bg-black/[0.05]'
            }`}
          >
            
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l3-1 8-8-2-2-8 8-1 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M11 3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Dibujar área
          </button>
          <div className="w-px h-4 bg-black/12 mx-0.5" />
          <button
            onClick={onLayersOpen}
            title="Capas"
            className="w-fit h-7 px-3 gap-2 text-xs border-none rounded flex items-center justify-center cursor-pointer transition-colors bg-transparent text-neutral-500 hover:bg-black/[0.05]"
          >
            
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-neutral-500">
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="14" cy="8" r="1.5" />
            </svg>
            Mostrar capas
          </button>
        </div>
      )}

      {/* Draw mode hint */}
      {drawMode && (
        <div className="bg-white border border-black/12 rounded px-3 py-1.5 text-[11px] text-neutral-500 shadow-sm pointer-events-none">
          Haz clic para definir el área · Doble clic para cerrar
        </div>
      )}
    </div>
  )
}
