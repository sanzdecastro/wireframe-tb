'use client'

import { KPI } from '@/types'

export function ArrowUp({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 12 12" fill="none">
      <path d="M6 9V3M6 3l-3 3M6 3l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 12 12" fill="none">
      <path d="M6 3v6M6 9l-3-3M6 9l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function DragHandle() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
    </svg>
  )
}

export function KpiBadge({ trend, delta }: { trend: KPI['trend']; delta: string }) {
  const styles = {
    up:      'bg-green-50 text-green-800',
    down:    'bg-red-50 text-red-800',
    neutral: 'bg-neutral-100 text-neutral-500',
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${styles[trend]}`}>
      {trend === 'up' && <ArrowUp />}
      {trend === 'down' && <ArrowDown />}
      {delta}
    </span>
  )
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-150 border-none cursor-pointer ${on ? 'bg-neutral-900' : 'bg-neutral-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${on ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

export function SidePanel({
  open,
  children,
  className = '',
}: {
  open: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-black/10 flex flex-col z-30 transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'} ${className}`}
    >
      {children}
    </div>
  )
}
