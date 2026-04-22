'use client'

import { useState, useRef } from 'react'
import { KPI, KpiCatalogSource } from '@/types'
import { KPI_CATALOG } from '@/lib/data'
import { SidePanel, CloseIcon, DragHandle, KpiBadge, Toggle } from '@/components/ui'

interface KpiPanelProps {
  open: boolean
  kpis: KPI[]
  onClose: () => void
  onSave: (kpis: KPI[]) => void
}

type Step = 'list' | 'catalog' | 'config'

const CONTEXTS = ['Ciudad', 'Distrito', 'Barrio'] as const
const FREQS    = ['Tiempo real', '1h', '24h', '7d'] as const

function BackChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SegControl<T extends string>({ options, value, onChange }: { options: readonly T[], value: T, onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-xs px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
            value === opt
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-600 border-black/15 hover:bg-neutral-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function KpiPanel({ open, kpis, onClose, onSave }: KpiPanelProps) {
  const [draft, setDraft]               = useState<KPI[]>([])
  const [step, setStep]                 = useState<Step>('list')
  const [catalogTab, setCatalogTab]     = useState<'sistema' | 'terceros'>('sistema')
  const [expanded, setExpanded]         = useState<string[]>([])
  const [selected, setSelected]         = useState<KpiCatalogSource | null>(null)
  const [configName, setConfigName]     = useState('')
  const [configContext, setConfigContext] = useState<typeof CONTEXTS[number]>('Ciudad')
  const [configFreq, setConfigFreq]     = useState<typeof FREQS[number]>('Tiempo real')
  const dragSrc = useRef<number | null>(null)

  if (open && draft.length === 0 && kpis.length > 0) setDraft(kpis.map(k => ({ ...k })))
  if (!open && draft.length > 0) { setDraft([]); setStep('list'); setSelected(null) }

  const toggleKpi = (id: string) => {
    setDraft(prev => {
      const activeCount = prev.filter(k => k.on).length
      return prev.map(k => {
        if (k.id !== id) return k
        if (k.on && activeCount <= 1) return k
        return { ...k, on: !k.on }
      })
    })
  }

  const onDragStart = (i: number) => { dragSrc.current = i }
  const onDrop = (i: number) => {
    if (dragSrc.current === null || dragSrc.current === i) return
    const next = [...draft]
    const [moved] = next.splice(dragSrc.current, 1)
    next.splice(i, 0, moved)
    setDraft(next)
    dragSrc.current = null
  }

  const handleSave = () => { onSave(draft); setDraft([]); onClose() }
  const handleCancel = () => { setDraft([]); onClose() }

  const handleSelectSource = (src: KpiCatalogSource) => {
    setSelected(src)
    setConfigName(src.label)
    setConfigContext('Ciudad')
    setConfigFreq('Tiempo real')
    setStep('config')
  }

  const handleAddKpi = () => {
    if (!selected) return
    const newKpi: KPI = {
      id: `${selected.id}_${Date.now()}`,
      label: configContext !== 'Ciudad' ? `${configName} · ${configContext}` : configName,
      value: selected.value,
      trend: selected.trend,
      delta: selected.delta,
      on: true,
    }
    setDraft(prev => [...prev, newKpi])
    setStep('list')
    setSelected(null)
  }

  const toggleCat = (id: string) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  // ── STEP: list ──────────────────────────────────────────────────────────────
  if (step === 'list') return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-medium text-black/90 leading-tight">Selección KPIs</h2>
            <p className="text-[11px] text-neutral-400 mt-1">Ordena y activa los KPIs del panel superior</p>
          </div>
          <button onClick={handleCancel} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {draft.map((kpi, i) => (
          <div
            key={kpi.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(i)}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-100 cursor-grab active:opacity-40 hover:bg-black/[0.01]"
          >
            <div className="text-neutral-300 flex-shrink-0"><DragHandle /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm text-black/60 truncate">{kpi.label}</span>
                <KpiBadge trend={kpi.trend} delta={kpi.delta} />
              </div>
              <div className="text-2xl font-bold tracking-tight text-black/90 leading-none">{kpi.value}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Toggle on={kpi.on} onToggle={() => toggleKpi(kpi.id)} />
              <button
                onClick={() => setDraft(prev => prev.filter(k => k.id !== kpi.id))}
                className="w-6 h-6 flex items-center justify-center rounded text-neutral-300 hover:text-red-400 hover:bg-red-50 bg-transparent border-none cursor-pointer transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Add KPI button */}
        <button
          onClick={() => setStep('catalog')}
          className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm text-neutral-400 hover:bg-neutral-50 cursor-pointer border-none bg-transparent transition-colors"
        >
          <span className="w-5 h-5 rounded-full border border-dashed border-neutral-300 flex items-center justify-center flex-shrink-0">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span>Añadir KPI externo</span>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex gap-2 flex-shrink-0">
        <button onClick={handleCancel} className="flex-1 h-9 rounded-md text-sm font-medium cursor-pointer bg-transparent border border-black/20 text-neutral-600 hover:bg-black/[0.03]">
          Cancelar
        </button>
        <button onClick={handleSave} className="flex-1 h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85">
          Guardar
        </button>
      </div>
    </SidePanel>
  )

  // ── STEP: catalog ────────────────────────────────────────────────────────────
  if (step === 'catalog') return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setStep('list')}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <BackChevron /> KPIs
          </button>
          <button onClick={handleCancel} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Añadir KPI</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">Selecciona una métrica de fuentes externas</p>
        <div className="flex mt-3 bg-neutral-100 rounded-lg p-0.5 gap-0.5">
          {(['sistema', 'terceros'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setCatalogTab(t); setExpanded([]) }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md cursor-pointer border-none transition-colors capitalize ${
                catalogTab === t ? 'bg-white text-neutral-900 shadow-sm' : 'bg-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === 'sistema' ? 'Sistema' : 'Terceros'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {KPI_CATALOG.filter(cat => cat.tab === catalogTab).map(cat => (
          <div key={cat.id} className="border-b border-black/[0.05]">
            <button
              onClick={() => toggleCat(cat.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-transparent border-none cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{cat.label}</span>
              <svg
                width="12" height="12" viewBox="0 0 16 16" fill="none"
                className={`text-neutral-300 transition-transform ${expanded.includes(cat.id) ? 'rotate-180' : ''}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {expanded.includes(cat.id) && cat.sources.map(src => (
              <button
                key={src.id}
                onClick={() => handleSelectSource(src)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-neutral-50 transition-colors border-t border-black/[0.04]"
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-neutral-900">{src.label}</span>
                    <KpiBadge trend={src.trend} delta={src.delta} />
                  </div>
                  <div className="text-lg font-bold text-black/80 leading-none mb-1">{src.value}</div>
                  <p className="text-[11px] text-neutral-400 leading-snug mb-1">{src.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    {src.source}
                  </span>
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-neutral-300 flex-shrink-0 mt-1">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        ))}
      </div>
    </SidePanel>
  )

  // ── STEP: config ─────────────────────────────────────────────────────────────
  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setStep('catalog')}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <BackChevron /> Catálogo
          </button>
          <button onClick={handleCancel} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">{selected?.label}</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] text-neutral-400">{selected?.desc}</p>
        </div>
        {selected?.source && (
          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded mt-1.5">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            {selected.source}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Nombre</label>
          <input
            value={configName}
            onChange={e => setConfigName(e.target.value)}
            className="w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white"
          />
        </div>

        {/* Context */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Contexto</label>
          <SegControl options={CONTEXTS} value={configContext} onChange={setConfigContext} />
          <p className="text-[10px] text-neutral-400 mt-1.5">Ámbito geográfico al que aplica el KPI</p>
        </div>

        {/* Frequency */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Actualización</label>
          <SegControl options={FREQS} value={configFreq} onChange={setConfigFreq} />
          <p className="text-[10px] text-neutral-400 mt-1.5">Frecuencia de refresco de datos</p>
        </div>

        {/* Preview */}
        <div className="bg-neutral-50 border border-black/[0.07] rounded-lg px-4 py-3">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Vista previa</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-black/60">
              {configContext !== 'Ciudad' ? `${configName || selected?.label} · ${configContext}` : (configName || selected?.label)}
            </span>
            <KpiBadge trend={selected?.trend ?? 'neutral'} delta={selected?.delta ?? ''} />
          </div>
          <div className="text-2xl font-bold text-black/90 tracking-tight leading-none">{selected?.value}</div>
          <p className="text-[10px] text-neutral-400 mt-1.5">Actualización: {configFreq}</p>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex-shrink-0">
        <button
          onClick={handleAddKpi}
          className="w-full h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85"
        >
          Añadir KPI →
        </button>
      </div>
    </SidePanel>
  )
}
