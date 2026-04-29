'use client'

import { useState, useRef, useEffect } from 'react'
import { MapLayer, Sensor, GpkgFeatureLayer } from '@/types'
import { DEFAULT_LAYERS } from '@/lib/data'
import { SidePanel, CloseIcon, Toggle } from '@/components/ui'
import { importCsv, ImportResult } from '@/lib/csvImport'
import { inferKindFromName } from '@/lib/csvImport/normalizers'
import { ICON_SHAPES, DEFAULT_ICON_SHAPE } from '@/lib/sensorIconShapes'
import { SENSORS } from '@/lib/data'

/**
 * Lee un archivo de texto detectando automáticamente el encoding por el BOM:
 *   - UTF-16 LE (FF FE) → decodifica con 'utf-16le'
 *   - UTF-16 BE (FE FF) → decodifica con 'utf-16be'
 *   - UTF-8 con BOM (EF BB BF) → decodifica con 'utf-8' quitando el BOM
 *   - Sin BOM → 'utf-8' estándar
 */
async function readFileAsText(file: File): Promise<string> {
  const buf   = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)

  // UTF-16 LE: BOM = FF FE
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf)
  }
  // UTF-16 BE: BOM = FE FF
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buf)
  }
  // UTF-8 con BOM: EF BB BF (quitar BOM antes de devolver)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buf.slice(3))
  }
  // Sin BOM: UTF-8 estándar
  return new TextDecoder('utf-8').decode(buf)
}

const BASE_KINDS = ['banco', 'luminaria', 'jardinera'] as const
const KIND_LABELS: Record<string, string> = {
  banco:     'Banco',
  luminaria: 'Luminaria',
  jardinera: 'Jardinera',
}

interface LayersPanelProps {
  open: boolean
  sensorsVisible: boolean
  heatmapVisible: boolean
  temperaturaVisible: boolean
  cyclingLayerVisible: boolean
  onClose: () => void
  onSensorsToggle: () => void
  onHeatmapToggle: () => void
  onTemperaturaToggle: () => void
  onCyclingLayerToggle: () => void
  importedSensors:     Sensor[]
  onSensorsImport:     (layerId: string, sensors: Sensor[], result: ImportResult, kindIcon?: { kind: string; shapeId: string }) => void
  onCustomLayerToggle:  (id: string, active: boolean) => void
  onLayerOpacityChange: (id: string, opacity: number) => void
  gpkgLayers:           GpkgFeatureLayer[]
  onGpkgImport:         (layers: GpkgFeatureLayer[]) => void
  onGpkgLayerToggle:    (id: string) => void
  onGpkgLayerOpacity:   (id: string, opacity: number) => void
}

type Step    = 'list' | 'add' | 'result'
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

// IDs de capas del sistema que tienen su propio callback de toggle
const SYSTEM_LAYER_IDS = new Set([
  'sensores', 'afluencia', 'temperatura', 'zonas',
  'zonificacion', 'bus', 'bici', 'comercios',
])

export function LayersPanel({
  open, sensorsVisible, heatmapVisible, temperaturaVisible, cyclingLayerVisible,
  onClose, onSensorsToggle, onHeatmapToggle, onTemperaturaToggle, onCyclingLayerToggle,
  importedSensors, onSensorsImport, onCustomLayerToggle, onLayerOpacityChange,
  gpkgLayers, onGpkgImport, onGpkgLayerToggle, onGpkgLayerOpacity,
}: LayersPanelProps) {
  const [step, setStep]             = useState<Step>('list')
  const [activeTab, setActiveTab]   = useState<'sistema' | 'externas'>('sistema')
  const [layers, setLayers]         = useState<MapLayer[]>(DEFAULT_LAYERS)
  const [opacities, setOpacities]   = useState<Record<string, number>>({})

  // Form state
  const [addName, setAddName]         = useState('')
  const [addViz, setAddViz]   = useState<VizType>('puntos')
  const [addFile, setAddFile] = useState<File | null>(null)
  const [isCSV, setIsCSV]             = useState(false)
  const [addKind, setAddKind]             = useState<string>('banco')
  const [addCustomKind, setAddCustomKind] = useState('')
  const [addIconShape, setAddIconShape]   = useState<string>(DEFAULT_ICON_SHAPE)

  // Auto-infer kind from layer name
  useEffect(() => {
    const inferred = inferKindFromName(addName)
    if (inferred) setAddKind(inferred)
  }, [addName])

  // Custom kinds already present in imported sensors (beyond the 3 base kinds)
  const customKinds = Array.from(
    new Set(importedSensors.map(s => s.kind).filter(k => !(BASE_KINDS as readonly string[]).includes(k)))
  ).sort()

  // Import state
  const [importing, setImporting]         = useState(false)
  const [progress, setProgress]           = useState(0)
  const [lastResult, setLastResult]       = useState<ImportResult | null>(null)
  const [isGPKG, setIsGPKG]               = useState(false)
  const [gpkgError, setGpkgError]         = useState<string | null>(null)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  if (!open && step !== 'list') setStep('list')

  const toggleLayer = (id: string) => {
    if (id === 'sensores')    onSensorsToggle()
    if (id === 'afluencia')   onHeatmapToggle()
    if (id === 'temperatura') onTemperaturaToggle()
    if (id === 'bici')        onCyclingLayerToggle()
    setLayers(prev => prev.map(l => {
      if (l.id !== id) return l
      const newActive = !l.active
      if (!SYSTEM_LAYER_IDS.has(id)) onCustomLayerToggle(id, newActive)
      return { ...l, active: newActive }
    }))
  }

  const visibleLayers = layers.map(l => {
    if (l.id === 'sensores')    return { ...l, active: sensorsVisible }
    if (l.id === 'afluencia')   return { ...l, active: heatmapVisible }
    if (l.id === 'temperatura') return { ...l, active: temperaturaVisible }
    if (l.id === 'bici')        return { ...l, active: cyclingLayerVisible }
    return l
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setAddFile(file)
    const name = file?.name.toLowerCase() ?? ''
    setIsCSV(name.endsWith('.csv'))
    setIsGPKG(name.endsWith('.gpkg'))
    setGpkgError(null)
  }

  const handleAddLayer = async () => {
    if (!addName.trim()) return

    // Generar el ID de la capa aquí para poder asociar sensores y capa
    const layerId = `custom_${Date.now()}`

    // Si hay GPKG, importar con sql.js
    if (addFile && isGPKG) {
      setImporting(true)
      setGpkgError(null)
      try {
        const { parseGpkgFile } = await import('@/lib/gpkgImport')
        const buffer = await addFile.arrayBuffer()
        const result = await parseGpkgFile(buffer, addName.trim())
        // Taggear con el nombre de la capa padre
        const tagged = result.layers.map(l => ({ ...l, label: l.label }))
        onGpkgImport(tagged)
        // Las capas GPKG se muestran en el panel directamente desde la prop gpkgLayers,
        // NO hay que añadirlas también al estado local layers (evita duplicados).
        setActiveTab('externas')
        resetForm()
        setStep('list')
      } catch (err) {
        console.error('[GPKG import error]', err)
        if (err instanceof Error) console.error('[GPKG stack]', err.stack)
        setGpkgError(String(err))
      } finally {
        setImporting(false)
      }
      return
    }

    // Si hay CSV, lanzar el pipeline de importación
    if (addFile && isCSV) {
      setImporting(true)
      setProgress(0)
      const finalKind = addKind === '__nuevo__'
        ? (addCustomKind.trim().toLowerCase().replace(/\s+/g, '_') || 'banco')
        : addKind
      try {
        const text   = await readFileAsText(addFile)
        const result = await importCsv({
          csvContent:      text,
          existingSensors: [...SENSORS, ...importedSensors],
          defaultKind:     finalKind,
          onProgress:      (done, total) => setProgress(Math.round((done / total) * 100)),
        })
        setLastResult(result)
        const kindIcon = addKind === '__nuevo__'
          ? { kind: finalKind, shapeId: addIconShape }
          : undefined
        onSensorsImport(layerId, result.sensors, result, kindIcon)
        setStep('result')
      } catch (err) {
        console.error('[CSV Import]', err)
        setLastResult(null)
        setStep('result')
      } finally {
        setImporting(false)
      }
    }

    // Registrar la capa en la lista (con o sin CSV)
    const newLayer: MapLayer = {
      id:     layerId,
      label:  addName.trim(),
      type:   addViz,
      tab:    'externas',
      active: true,
      source: addFile?.name ?? undefined,
    }
    setLayers(prev => [...prev, newLayer])
    setActiveTab('externas')

    if (!isCSV) {
      // Para capas no-CSV ir directo a lista
      resetForm()
      setStep('list')
    }
  }

  const resetForm = () => {
    setAddName(''); setAddViz('puntos')
    setAddFile(null); setIsCSV(false); setIsGPKG(false); setProgress(0)
    setAddKind('banco'); setAddCustomKind(''); setAddIconShape(DEFAULT_ICON_SHAPE)
    setGpkgError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const visibleByTab = visibleLayers.filter(l => l.tab === activeTab)

  // ── STEP: result ────────────────────────────────────────────────────────────
  if (step === 'result') return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => { resetForm(); setStep('list') }}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <BackChevron /> Capas
          </button>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>
        <h2 className="text-xl font-medium text-black/90 leading-tight">Importación completada</h2>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {lastResult ? `${lastResult.durationMs}ms` : 'Error en la importación'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {lastResult ? (
          <>
            {/* Métricas principales */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total filas',    value: lastResult.totalRows.toLocaleString(),   color: 'text-neutral-900' },
                { label: 'Válidas',        value: lastResult.validRows.toLocaleString(),   color: 'text-green-700'   },
                { label: 'Con errores',    value: lastResult.invalidRows.toLocaleString(), color: lastResult.invalidRows > 0 ? 'text-red-600' : 'text-neutral-400' },
                { label: 'Nuevos sensores',value: lastResult.inserted.toLocaleString(),    color: 'text-blue-700'    },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-neutral-50 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-neutral-400 mb-0.5">{label}</div>
                  <div className={`text-sm font-semibold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Barra de éxito */}
            <div>
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>Tasa de éxito</span>
                <span>{lastResult.totalRows > 0 ? Math.round((lastResult.validRows / lastResult.totalRows) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${lastResult.totalRows > 0 ? (lastResult.validRows / lastResult.totalRows) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Lista de errores */}
            {lastResult.errors.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-2">
                  Errores y advertencias ({lastResult.errors.length})
                </div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {lastResult.errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] bg-red-50 rounded-md px-2.5 py-1.5">
                      <span className="text-red-400 font-medium flex-shrink-0">Fila {err.row}</span>
                      <span className="text-red-700">{err.reason}</span>
                    </div>
                  ))}
                  {lastResult.errors.length > 50 && (
                    <div className="text-[10px] text-neutral-400 text-center py-1">
                      … y {lastResult.errors.length - 50} más
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-neutral-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs">No se pudo importar el archivo</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex gap-2 flex-shrink-0">
        <button
          onClick={() => { resetForm(); setStep('list') }}
          className="flex-1 h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85 transition-opacity"
        >
          Ver capas
        </button>
      </div>
    </SidePanel>
  )

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
        {visibleByTab.map(layer => {
          const opacity = opacities[layer.id] ?? 100
          return (
            <div key={layer.id} className="px-4 py-3 border-b border-neutral-100">
              {/* Fila principal */}
              <div className="flex items-center gap-3">
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

              {/* Slider de opacidad (sólo si la capa está activa) */}
              {layer.active && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="range"
                    min={0} max={100} step={1}
                    value={opacity}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setOpacities(prev => ({ ...prev, [layer.id]: val }))
                      onLayerOpacityChange(layer.id, val)
                    }}
                    className="flex-1 h-1 accent-neutral-700 cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 w-7 text-right tabular-nums">{opacity}%</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Capas GPKG (sólo en tab externas) */}
        {activeTab === 'externas' && gpkgLayers.map(layer => (
          <div key={layer.id} className="px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: layer.color }}
                  />
                  <span className="text-[13px] font-medium text-neutral-900 truncate">{layer.label}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    gpkg
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400">
                {layer.geometryType === 'raster'
                  ? 'raster · tiles'
                  : `${layer.geometryType} · ${(layer.geojson as any).features?.length ?? 0} features`}
              </span>
              </div>
              <Toggle on={layer.active} onToggle={() => onGpkgLayerToggle(layer.id)} />
            </div>
            {layer.active && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="range"
                  min={0} max={100} step={1}
                  value={layer.opacity}
                  onChange={e => onGpkgLayerOpacity(layer.id, Number(e.target.value))}
                  className="flex-1 h-1 accent-neutral-700 cursor-pointer"
                />
                <span className="text-[10px] text-neutral-400 w-7 text-right tabular-nums">{layer.opacity}%</span>
              </div>
            )}
          </div>
        ))}

        {visibleByTab.length === 0 && gpkgLayers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-neutral-300">
            <p className="text-xs">Sin capas {activeTab === 'externas' ? 'externas' : ''} todavía</p>
          </div>
        )}

        {/* Resumen de sensores importados */}
        {importedSensors.length > 0 && activeTab === 'externas' && (
          <div className="mx-4 my-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-blue-500 flex-shrink-0">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="text-[11px] text-blue-700">
              {importedSensors.length.toLocaleString()} sensores importados de CSV activos en el mapa
            </span>
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
          Añadir capa
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
            onClick={() => { resetForm(); setStep('list') }}
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
        {/* Nombre */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
            Nombre de la capa
          </label>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="Ej. Mobiliario urbano importado"
            className="w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-300"
          />
        </div>

        {/* Archivo */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
            Archivo de datos
          </label>
          <label className="flex flex-col items-center justify-center gap-2 w-full border border-dashed border-black/20 rounded-lg py-6 cursor-pointer hover:bg-neutral-50 transition-colors">
            <UploadIcon />
            {addFile ? (
              <div className="text-center">
                <span className="text-xs font-medium text-neutral-700 block">{addFile.name}</span>
                {isCSV && (
                  <span className="text-[10px] text-blue-500 mt-0.5 block">
                    CSV detectado — se importarán sensores al mapa
                  </span>
                )}
                {isGPKG && (
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    GeoPackage detectado — se importarán capas vectoriales
                  </span>
                )}
              </div>
            ) : (
              <>
                <span className="text-xs text-neutral-500">Arrastra o selecciona un archivo</span>
                <span className="text-[10px] text-neutral-300">.geojson · .json · .csv · .gpkg</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.csv,.gpkg"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Tipo de dispositivo (sólo relevante en CSV, no en GPKG) */}
        {isCSV && !isGPKG && (
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
              Tipo de dispositivo
            </label>
            <p className="text-[10px] text-neutral-400 mb-2 -mt-1">
              Se aplica a filas sin tipo definido en el CSV
            </p>
            <select
              value={addKind}
              onChange={e => {
                const val = e.target.value
                setAddKind(val)
                if (val === '__nuevo__') setAddCustomKind(addName.trim())
              }}
              className="w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white appearance-none cursor-pointer"
            >
              {BASE_KINDS.map(k => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
              {customKinds.map(k => (
                <option key={k} value={k}>{k} (personalizado)</option>
              ))}
              <option value="__nuevo__">＋ Nuevo tipo…</option>
            </select>

            {addKind === '__nuevo__' && (
              <>
                <input
                  value={addCustomKind}
                  onChange={e => setAddCustomKind(e.target.value)}
                  placeholder="Ej. papelera, semaforo, fuente…"
                  className="mt-2 w-full text-sm text-neutral-900 border border-black/15 rounded-md px-3 py-2 outline-none focus:border-neutral-400 bg-white placeholder:text-neutral-300"
                  autoFocus
                />

                {/* Picker de icono */}
                <div className="mt-3">
                  <p className="text-[10px] text-neutral-400 mb-2">Icono en el mapa</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {ICON_SHAPES.map(shape => (
                      <button
                        key={shape.id}
                        type="button"
                        title={shape.label}
                        onClick={() => setAddIconShape(shape.id)}
                        className={`flex items-center justify-center rounded-md p-1 border transition-colors cursor-pointer ${
                          addIconShape === shape.id
                            ? 'border-neutral-900 bg-neutral-100'
                            : 'border-black/10 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="28" height="28" viewBox="0 0 28 28"
                          dangerouslySetInnerHTML={{
                            __html: `<rect width="28" height="28" rx="5" fill="white" stroke="${addIconShape === shape.id ? '#1a1a1a' : '#ccc'}" stroke-width="1.5"/>${shape.svg}`,
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tipo de visualización */}
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
            Tipo de visualización
          </label>
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

        {/* Error GPKG */}
        {gpkgError && (
          <div className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2.5 text-[11px] text-red-700">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3M8 10.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {gpkgError}
          </div>
        )}

        {/* Barra de progreso durante importación */}
        {importing && (
          <div>
            <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
              <span>Procesando CSV…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/[0.08] flex-shrink-0">
        <button
          onClick={handleAddLayer}
          disabled={!addName.trim() || importing}
          className="w-full h-9 rounded-md text-sm font-medium cursor-pointer bg-neutral-900 text-white border-none hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          {importing ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Importando…
            </>
          ) : (
            isCSV ? 'Importar CSV al mapa →' : isGPKG ? 'Importar GeoPackage →' : 'Añadir capa →'
          )}
        </button>
      </div>
    </SidePanel>
  )
}
