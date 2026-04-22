'use client'

import { useEffect, useState } from 'react'
import { AppView } from '@/types'
import { AI_HINTS } from '@/lib/data'

interface NavbarProps {
  view: AppView
  mapMode?: string
  onHome: () => void
}

export function Navbar({ view, mapMode, onHome }: NavbarProps) {
  const [hintIdx, setHintIdx] = useState(0)
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setHintVisible(false)
      setTimeout(() => {
        setHintIdx(i => (i + 1) % AI_HINTS.length)
        setHintVisible(true)
      }, 250)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const breadcrumbs = ['Barcelona']
  if (view === 'map') {
    breadcrumbs.push('Mapa')
    if (mapMode) breadcrumbs.push(mapMode === 'explorar' ? 'Explorar' : 'Proyectos')
  }

  return (
    <header className="h-12 bg-white border-b border-black/[0.08] flex items-center justify-between px-4 flex-shrink-0 z-50 relative">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={onHome}
          className="w-6 h-6 border border-black/55 rounded flex items-center justify-center cursor-pointer bg-transparent hover:bg-black/[0.04] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2 7l6-5 6 5v7H10v-4H6v4H2V7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </button>
        <nav className="flex items-center gap-1 text-xs text-neutral-400">
          {breadcrumbs.map((b, i) => (
            <span key={b} className="flex items-center gap-1">
              {i > 0 && <span className="text-neutral-300">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-neutral-900' : ''}>{b}</span>
            </span>
          ))}
        </nav>
      </div>

      {/* AI Bar */}
      <div className="h-10 bg-white border border-[#bac2ff] rounded-[24px] flex items-center gap-2.5 px-3 pl-4 w-[440px]">
        <span className="text-xs font-medium tracking-tight text-neutral-900 whitespace-nowrap">Tibidabo</span>
        <div className="w-px h-3.5 bg-black/15 flex-shrink-0" />
        <span
          className="flex-1 text-[11px] text-neutral-400 whitespace-nowrap overflow-hidden text-ellipsis transition-opacity duration-200"
          style={{ opacity: hintVisible ? 1 : 0 }}
        >
          {AI_HINTS[hintIdx]}
        </span>
        <div className="flex gap-1">
          <button className="w-8 h-8 rounded-full border-none bg-transparent flex items-center justify-center cursor-pointer text-neutral-500 hover:bg-black/[0.04]">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 9a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="w-8 h-8 rounded-full border-none bg-black/[0.05] flex items-center justify-center cursor-pointer text-neutral-500 hover:bg-black/10">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2l11 6-11 6V2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right */}
      <div className="w-6 h-6 rounded bg-neutral-900 flex items-center justify-center cursor-pointer">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="white">
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M3 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </header>
  )
}
