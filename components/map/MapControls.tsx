'use client'

import { MapMode } from '@/types'

interface MapControlsProps {
  mode: MapMode
  drawMode: boolean
  onModeChange: (mode: MapMode) => void
  onDrawToggle: () => void
  onLayersOpen: () => void
  onFiltersOpen: () => void
  activeSensorFilterCount?: number
  isochroneMode?: boolean
  onIsochroneToggle?: () => void
}

export function MapControls({ mode, drawMode, onModeChange, onDrawToggle, onLayersOpen, onFiltersOpen, activeSensorFilterCount = 0, isochroneMode = false, onIsochroneToggle }: MapControlsProps) {
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
              <path d="M1 11.5l7 3 7-3"/>
              <path d="M1 8l7 3 7-3"/>
              <path d="M1 4.5l7-3 7 3-7 3-7-3z"/>
            </svg>
            Mostrar capas
          </button>
          <div className="w-px h-4 bg-black/12 mx-0.5" />
          <button
            onClick={onFiltersOpen}
            title="Filtros"
            className="relative w-fit h-7 px-3 gap-2 text-xs border-none rounded flex items-center justify-center cursor-pointer transition-colors bg-transparent text-neutral-500 hover:bg-black/[0.05]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M4 8h8M6 12h4"/>
            </svg>
            Filtros
            {activeSensorFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center">
                {activeSensorFilterCount}
              </span>
            )}
          </button>
          <div className="w-px h-4 bg-black/12 mx-0.5" />
          <button
            onClick={onIsochroneToggle}
            title="Área a pie en 15 min"
            className={`w-fit h-7 px-3 gap-2 text-xs border-none rounded flex items-center justify-center cursor-pointer transition-colors ${
              isochroneMode ? 'bg-violet-600 text-white' : 'bg-transparent text-neutral-500 hover:bg-black/[0.05]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="6" r="2.2"/>
              <path d="M8 8.5c-3 0-5 1.5-5 3.5h10c0-2-2-3.5-5-3.5z"/>
              <path d="M13 3a5.5 5.5 0 010 6M3 3a5.5 5.5 0 000 6" opacity=".5"/>
            </svg>
            15 min a pie
          </button>
        </div>
      )}

      {/* Draw mode hint */}
      {drawMode && (
        <div className="bg-white border border-black/12 rounded px-3 py-1.5 text-[11px] text-neutral-500 shadow-sm pointer-events-none">
          Haz clic para definir el área · Doble clic para cerrar
        </div>
      )}

      {/* Isochrone mode hint */}
      {isochroneMode && !drawMode && (
        <div className="bg-violet-600 text-white rounded px-3 py-1.5 text-[11px] shadow-sm pointer-events-none">
          Haz clic en el mapa para calcular el área a 15 min a pie
        </div>
      )}
    </div>
  )
}
