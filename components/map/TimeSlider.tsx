'use client'

import { useEffect, useRef, useState } from 'react'
import type { RasterFrame } from '@/types'

interface TimeSliderProps {
  frames:        RasterFrame[]
  index:         number
  onIndexChange: (index: number) => void
}

const PLAY_INTERVAL_MS = 1600

function formatDate(date: string | null): string {
  if (!date) return 'Sin fecha'
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Scrubber temporal para una capa raster con varios frames por fecha (LST).
 * Selecciona una fecha a la vez; el botón play recorre la serie en bucle.
 */
export function TimeSlider({ frames, index, onIndexChange }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false)
  const single = frames.length < 2

  // Refs para que el intervalo lea el índice/longitud actuales sin reiniciarse.
  const indexRef = useRef(index)
  indexRef.current = index
  const onChangeRef = useRef(onIndexChange)
  onChangeRef.current = onIndexChange

  useEffect(() => {
    if (!playing || single) return
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % frames.length
      onChangeRef.current(next)
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, single, frames.length])

  // Si solo queda un frame, no tiene sentido seguir reproduciendo.
  useEffect(() => { if (single && playing) setPlaying(false) }, [single, playing])

  const current = frames[index] ?? frames[0]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white border border-black/12 rounded-lg shadow-md px-3.5 py-2.5 flex items-center gap-3 w-[min(520px,calc(100%-2rem))]">
      <button
        type="button"
        onClick={() => setPlaying(p => !p)}
        disabled={single}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="w-8 h-8 rounded-md bg-black/[0.05] border-none flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-default"
      >
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor" className="text-neutral-700">
            <rect x="2" y="1.5" width="2.6" height="9" rx="0.6" />
            <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.6" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor" className="text-neutral-700">
            <path d="M3 1.8v8.4c0 .5.55.8.97.54l6.6-4.2a.64.64 0 0 0 0-1.08L3.97 1.26A.64.64 0 0 0 3 1.8Z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] leading-none">
          <span className="text-neutral-400">Temperatura superficial</span>
          <span className="font-medium text-neutral-700 tabular-nums">{formatDate(current?.date ?? null)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          step={1}
          value={index}
          disabled={single}
          onChange={e => { setPlaying(false); onIndexChange(Number(e.target.value)) }}
          className="w-full h-1 accent-orange-500 cursor-pointer disabled:cursor-default"
        />
        <div className="flex items-center justify-between text-[10px] text-neutral-400 leading-none tabular-nums">
          <span>{formatDate(frames[0]?.date ?? null)}</span>
          <span>{index + 1} / {frames.length}</span>
          <span>{formatDate(frames[frames.length - 1]?.date ?? null)}</span>
        </div>
      </div>
    </div>
  )
}
