'use client'

import { useState } from 'react'
import { MapLayer } from '@/types'
import { DEFAULT_LAYERS } from '@/lib/data'
import { SidePanel, CloseIcon, Toggle } from '@/components/ui'

interface LayersPanelProps {
  open: boolean
  heatmapVisible: boolean
  onClose: () => void
  onHeatmapToggle: () => void
}

type Step = 'list' | 'add'
type VizType = 'heatmap' | 'puntos' | 'líneas'

const TYPE_STYLES: Record<VizType, string> = {
  heatmap: 'bg-orange-50 text-orange-700',
  puntos:  'bg-blue-50 text-blue-700',
  líneas:  'bg-green-50 text-green-700',
}

function TypeBadge({ type }: { type: VizType }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${TYPE_STYLES[type]}`}>
      {type}
    </span>
  )
}

function BackChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
      <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

const VIZ_TYPES: VizType[] = ['puntos', 'líneas', 'heatmap']
const CONTEXTS = ['Ciudad', 'Distrito', 'Barrio', 'Zona de proyecto']

export function LayersPanel({ open, heatmapVisible, onClose, onHeatmapToggle }: LayersPanelProps) {
  const [step, setStep]           = useState<Step>('list')
  const [activeTab, setActiveTab] = useState<'sistema' | 'externas'>('sistema')
  const [layers, setLayers]       = useState<MapLayer[]>(DEFAULT_LAYERS)

  // Add layer form state
  const [addName, setAddName]         = useState('')
  const [addDesc, setAddDesc]         = useState('')
  const [addViz, setAddViz]           = useState<VizType>('puntos')
  const [addContext, setAddContext]   = useState(CONTEXTS[0])
  const [addFile, setAddFile]         = useState<string | null>(null)

  if (!open && step !== 'list') setStep('list')

  const toggleLayer = (id: string) => {
    if (id === 'afluencia') onHeatmapToggle()
    setLayers(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l))
  }

  // Sync afluencia with external heatmapVisible
  const visibleLayers = layers.map(l =>
    l.id === 'afluencia' ? { ...l, active: heatmapVisible } : l
  )

  const handleAddLayer = () => {
    if (!addName.trim()) return
    const newLayer: MapLayer = {
      id: `custom_${Date.now()}`,
      label: addName.trim(),
      type: addViz,
      tab: 'externas',
      active: true,
      source: addFile ?? undefined,
    }
    setLayers(prev => [...prev, newLayer])
    setAddName(''); setAddDesc(''); setAddFile(null); setAddViz('puntos'); setAddContext(CONTEXTS[0])
    setActiveTab('externas')
    setStep('list')
  }

  const visibleByTab = visibleLayers.filter(l => l.tab === activeTab)

  // ── STEP: list ──────────────────────────────────────────────────────────────
  if (step === 'list') return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-medium text-black/90 leading-tight">Capas</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Activa y gestiona las capas del mapa</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <div className="flex mt-3 bg-neutral-100 rounded-lg p-0.5 gap-0.5">
          {(['sistema', 'externas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md cursor-pointer border-none transition-colors ${
                activeTab === t ? 'bg-white text-neutral-900 shadow-sm' : 'bg-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === 'sistema' ? 'Sistema' : 'Externas'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleByTab.map(layer => (
          <div key={layer.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium text-neutral-900 truncate">{layer.label}</span>
                <TypeBadge type={layer.type} />
              </div>
              {layer.source && (
                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  {layer.source}
                </span>
              )}
            </div>
            <Toggle on={layer.active} onToggle={() => toggleLayer(layer.id)} />
          </div>
        ))}

        {visibleByTab.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-neutral-300">
            <p className="text-xs">Sin capas externas todavía</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex-shrink-0">
        <button
          onClick={() => setStep('add')}
          className="w-full h-9 rounded-md text-sm font-medium cursor-pointer bg-transparent border border-black/15 text-neutral-600 hover:bg-neutral-50 flex items-center justify-center gap-2 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Añadir más capas
        </button>
      </div>
    </SidePanel>
  )

  // ── STEP: add ───────────────────────────────────────────────────────────────
  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setStep('list')}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <BackChevron /> Capas
          </button>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Añadir capa</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">Importa datos geoespaciales al mapa</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Nombre de la capa</label>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="Ej. Zonas de alta densidad"
            className="w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-300"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Descripción</label>
          <textarea
            value={addDesc}
            onChange={e => setAddDesc(e.target.value)}
            placeholder="Descripción breve de los datos"
            rows={2}
            className="w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-300 resize-none"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Archivo de datos</label>
          <label className="flex flex-col items-center justify-center gap-2 w-full border border-dashed border-black/20 rounded-lg py-6 cursor-pointer hover:bg-neutral-50 transition-colors">
            <UploadIcon />
            {addFile ? (
              <span className="text-xs font-medium text-neutral-700">{addFile}</span>
            ) : (
              <>
                <span className="text-xs text-neutral-500">Arrastra o selecciona un archivo</span>
                <span className="text-[10px] text-neutral-300">.geojson · .json · .csv</span>
              </>
            )}
            <input
              type="file"
              accept=".geojson,.json,.csv"
              className="hidden"
              onChange={e => setAddFile(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </div>

        {/* Viz type */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Tipo de visualización</label>
          <div className="flex gap-2">
            {VIZ_TYPES.map(v => (
              <button
                key={v}
                onClick={() => setAddViz(v)}
                className={`flex-1 py-2 rounded-md text-xs font-medium border cursor-pointer transition-colors capitalize ${
                  addViz === v ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-black/15 hover:bg-neutral-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Contexto de los datos</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTS.map(c => (
              <button
                key={c}
                onClick={() => setAddContext(c)}
                className={`text-xs px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                  addContext === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-black/15 hover:bg-neutral-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex-shrink-0">
        <button
          onClick={handleAddLayer}
          disabled={!addName.trim()}
          className="w-full h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          Añadir capa →
        </button>
      </div>
    </SidePanel>
  )
}
