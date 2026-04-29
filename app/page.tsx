'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { KPI, Project, AppView, MapMode, SidePanel, ProjectFilters, ProjectDeviceFilters, SensorFilters, Sensor, GpkgFeatureLayer } from '@/types'
import { DEFAULT_KPIS, DEFAULT_PROJECTS, SENSORS, SENSORS_BY_ID } from '@/lib/data'

import { Navbar }         from '@/components/layout/Navbar'
import { KpiBadge }       from '@/components/ui'
import { MapView }        from '@/components/map/MapView'
import { MapControls }    from '@/components/map/MapControls'
import { KpiPanel }       from '@/components/panels/KpiPanel'
import { ZonePanel }      from '@/components/panels/ZonePanel'
import { ProjectsPanel }  from '@/components/panels/ProjectsPanel'
import { LayersPanel }    from '@/components/panels/LayersPanel'
import { ProjectFiltersPanel, EMPTY_FILTERS, countActiveFilters } from '@/components/panels/ProjectFiltersPanel'
import { ProjectDeviceFiltersPanel } from '@/components/panels/ProjectDeviceFiltersPanel'
import { SensorFiltersPanel, EMPTY_SENSOR_FILTERS, countActiveSensorFilters, applySensorFilters } from '@/components/panels/SensorFiltersPanel'
import { DevicePanel } from '@/components/panels/DevicePanel'
import { EMPTY_DEVICE_FILTERS, generateProjectDevices, applyDeviceFilters, ProjectDevice } from '@/lib/projectDevices'
import { ImportResult } from '@/lib/csvImport'

export default function Home() {
  const [view, setView]           = useState<AppView>('home')
  const [mapMode, setMapMode]     = useState<MapMode>('explorar')
  const [panel, setPanel]         = useState<SidePanel>('none')
  const [kpis, setKpis]           = useState<KPI[]>(DEFAULT_KPIS)
  const [projects, setProjects]   = useState<Project[]>(DEFAULT_PROJECTS)
  const [drawMode, setDrawMode]             = useState(false)
  const [pendingCoords, setPendingCoords]   = useState<number[][]>([])
  const [sensorsVisible, setSensorsVisible] = useState(true)
  const [heatmapVisible, setHeatmapVisible] = useState(false)
  const [temperaturaVisible, setTemperaturaVisible] = useState(false)
  const [cyclingLayerVisible, setCyclingLayerVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(EMPTY_FILTERS)
  const [deviceFilters, setDeviceFilters] = useState<ProjectDeviceFilters>(EMPTY_DEVICE_FILTERS)
  const [sensorFilters, setSensorFilters] = useState<SensorFilters>(EMPTY_SENSOR_FILTERS)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedDirectDevice, setSelectedDirectDevice] = useState<ProjectDevice | null>(null)
  const [deviceNameOverrides, setDeviceNameOverrides] = useState<Record<string, string>>({})
  // Sensores por capa: key = layerId, value = array de sensores
  const [importedLayerSensors, setImportedLayerSensors] = useState<Record<string, Sensor[]>>({})
  // Capas con toggle desactivado
  const [inactiveLayerIds, setInactiveLayerIds] = useState<Set<string>>(new Set())
  // Iconos de tipos personalizados: kind → shapeId
  const [customKindIcons, setCustomKindIcons] = useState<Record<string, string>>({})
  // Capas GPKG importadas
  const [gpkgLayers, setGpkgLayers] = useState<GpkgFeatureLayer[]>([])
  // Opacidades por capa: layerId → 0-100
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({})
  // Isócrona
  const [isochroneMode, setIsochroneMode] = useState(false)

  // Ref estable para que handleSensorClick acceda a allSensors sin re-crearse
  const allSensorsRef = useRef<Sensor[]>(SENSORS)

  const deviceOverrides = useMemo(() => {
    const out: Record<string, { name: string }> = {}
    for (const [id, name] of Object.entries(deviceNameOverrides)) out[id] = { name }
    return out
  }, [deviceNameOverrides])

  const projectDeviceMarkers = useMemo(() => {
    if (!selectedProject) return null
    const kindMap = { iluminacion: 'luminaria', mobiliario: 'banco', jardineras: 'jardinera' } as const
    return applyDeviceFilters(generateProjectDevices(selectedProject), deviceFilters).map(d => ({
      lng: d.lng,
      lat: d.lat,
      type: (d.alert ? 'err' : 'ok') as 'ok' | 'err',
      kind: kindMap[d.type],
      label: d.name,
    }))
  }, [selectedProject, deviceFilters])

  const selectedDevice = useMemo(() => {
    if (!selectedProject || !selectedDeviceId) return null
    const d = generateProjectDevices(selectedProject).find(x => x.id === selectedDeviceId) ?? null
    if (d && deviceNameOverrides[d.id]) return { ...d, name: deviceNameOverrides[d.id] }
    return d
  }, [selectedProject, selectedDeviceId, deviceNameOverrides])

  const filteredProjects = useMemo(() => projects.filter(p => {
    if (projectFilters.taxonomy.length  && !projectFilters.taxonomy.includes(p.taxonomy  ?? 'proyecto')) return false
    if (projectFilters.districts.length && (!p.district || !projectFilters.districts.includes(p.district))) return false
    if (projectFilters.devices.length   && !projectFilters.devices.some(d => p.deviceCategories?.includes(d))) return false
    if (projectFilters.sensors.length   && !projectFilters.sensors.some(s => p.sensorCategories?.includes(s))) return false
    return true
  }), [projects, projectFilters])

  // Todos los sensores importados (activos + inactivos) — para dedup y customKinds en LayersPanel
  const allImportedSensors = useMemo(
    () => Object.values(importedLayerSensors).flat(),
    [importedLayerSensors],
  )

  // Solo sensores de capas activas — para el mapa y los filtros
  const activeImportedSensors = useMemo(
    () => Object.entries(importedLayerSensors)
      .filter(([id]) => !inactiveLayerIds.has(id))
      .flatMap(([, sensors]) => sensors),
    [importedLayerSensors, inactiveLayerIds],
  )

  // Sensores base + importados activos (sin duplicados por id)
  const allSensors = useMemo(() => {
    if (activeImportedSensors.length === 0) return SENSORS
    const baseIds = new Set(SENSORS.map(s => s.id))
    const novel   = activeImportedSensors.filter(s => !baseIds.has(s.id))
    return [...SENSORS, ...novel]
  }, [activeImportedSensors])

  // Mantener ref sincronizado para que handleSensorClick lo use sin deps
  useEffect(() => { allSensorsRef.current = allSensors }, [allSensors])

  // Opciones de filtro derivadas de los sensores reales disponibles
  const filterOptions = useMemo(() => {
    const kindCount:  Partial<Record<Sensor['kind'], number>> = {}
    const fabCount:   Record<string, number>                  = {}

    for (const s of allSensors) {
      kindCount[s.kind] = (kindCount[s.kind] ?? 0) + 1
      if (s.fabricante) fabCount[s.fabricante] = (fabCount[s.fabricante] ?? 0) + 1
    }

    // Los tipos base tienen orden fijo; los personalizados se añaden al final ordenados
    const BASE_ORDER = ['banco', 'luminaria', 'jardinera']
    const allKinds   = Object.keys(kindCount) as Sensor['kind'][]
    const sorted     = [
      ...BASE_ORDER.filter(k => kindCount[k]),
      ...allKinds.filter(k => !BASE_ORDER.includes(k)).sort(),
    ]
    const kinds = sorted.map(k => ({ value: k, count: kindCount[k]! }))

    const fabricantes = Object.entries(fabCount)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }))

    return { kinds, fabricantes }
  }, [allSensors])

  const handleSensorsImport = useCallback((
    layerId: string,
    sensors: Sensor[],
    _result: ImportResult,
    kindIcon?: { kind: string; shapeId: string },
  ) => {
    // Taggear cada sensor con el ID de su capa para el control de opacidad en el mapa
    const tagged = sensors.map(s => ({ ...s, layerId }))
    setImportedLayerSensors(prev => ({ ...prev, [layerId]: tagged }))
    if (kindIcon) {
      setCustomKindIcons(prev => ({ ...prev, [kindIcon.kind]: kindIcon.shapeId }))
    }
  }, [])

  const handleCustomLayerToggle = useCallback((id: string, active: boolean) => {
    setInactiveLayerIds(prev => {
      const next = new Set(prev)
      active ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleLayerOpacityChange = useCallback((id: string, opacity: number) => {
    setLayerOpacities(prev => ({ ...prev, [id]: opacity }))
  }, [])

  const handleGpkgImport = useCallback((layers: GpkgFeatureLayer[]) => {
    setGpkgLayers(prev => [...prev, ...layers])
  }, [])

  const handleGpkgLayerToggle = useCallback((id: string) => {
    setGpkgLayers(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l))
  }, [])

  const handleGpkgLayerOpacity = useCallback((id: string, opacity: number) => {
    setGpkgLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l))
  }, [])

  const activeFilterCount = countActiveFilters(projectFilters)
  const activeSensorFilterCount = countActiveSensorFilters(sensorFilters)
  const filteredSensors = useMemo(() => applySensorFilters(allSensors, sensorFilters), [allSensors, sensorFilters])

  const handleExplore = () => {
    setView('map')
    setMapMode('explorar')
    setPanel('none')
  }

  const handleHome = () => {
    setView('home')
    setMapMode('explorar')
    setPanel('none')
    setDrawMode(false)
  }

  const handleModeChange = (mode: MapMode) => {
    setMapMode(mode)
    setDrawMode(false)
    setSelectedProject(null)
    setPanel(mode === 'proyectos' ? 'projects' : 'none')
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setPanel('projects')
  }

  const handleDrawToggle = () => {
    if (drawMode) {
      setDrawMode(false)
    } else {
      setPendingCoords([])
      setPanel('none')
      setDrawMode(true)
    }
  }

  const handleZoneComplete = useCallback((coords: number[][]) => {
    setDrawMode(false)
    setPendingCoords(coords)
    setPanel('zone')
  }, [])

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name,
      area: name,
      status: 'planned',
      devices: Math.round(5 + Math.random() * 10),
      desc: 'Área creada desde el mapa',
      coords: pendingCoords,
    }
    setProjects(prev => [...prev, newProject])
    setPanel('projects')
    setMapMode('proyectos')
  }

  const handleCloseZone = () => {
    setPanel('none')
    setPendingCoords([])
  }

  const onCyclingLayerToggle = () => {
    setCyclingLayerVisible(v => !v)
  }

  const handleSensorClick = useCallback((id: string) => {
    const SENSOR_MAP: Record<string, 'movimiento' | 'x' | 'y' | null> = { movimiento: 'movimiento', x: 'x', y: 'y' }
    const KIND_TO_TYPE: Record<string, ProjectDevice['type']> = {
      luminaria: 'iluminacion', jardinera: 'jardineras', banco: 'mobiliario',
    }

    let device: ProjectDevice | null = null

    // ── Sensor en SENSORS_BY_ID (GeoJSON original) ────────────────────────
    const entry = SENSORS_BY_ID[id]
    if (entry) {
      const { properties: _props, coordinates } = entry
      const props = _props as Record<string, any>
      device = {
        id:         props.id,
        name:       props.name,
        type:       props.type as ProjectDevice['type'],
        sensor:     SENSOR_MAP[props.sensor] ?? null,
        incident:   props.incident ?? false,
        alert:      props.alert ?? false,
        status:     props.status === 'online' ? 'online' : 'offline',
        lastSeen:   props.lastSeen ?? '',
        model:      props.model ?? '',
        fabricante: (props.fabricante || props.fabricant || 'Varios') as ProjectDevice['fabricante'],
        address:    props.address ?? '',
        lng:        coordinates[0],
        lat:        coordinates[1],
      }
    }

    // ── Fallback: sensor importado vía CSV ────────────────────────────────
    if (!device) {
      const sensor = allSensorsRef.current.find(s => s.id === id)
      if (!sensor) return
      device = {
        id:         sensor.id,
        name:       sensor.label,
        type:       KIND_TO_TYPE[sensor.kind] ?? 'mobiliario',
        sensor:     null,
        incident:   false,
        alert:      sensor.type === 'err',
        status:     sensor.type === 'ok' ? 'online' : 'offline',
        lastSeen:   '',
        model:      '',
        fabricante: (sensor.fabricante ?? 'Varios') as ProjectDevice['fabricante'],
        address:    '',
        lng:        sensor.lng,
        lat:        sensor.lat,
      }
    }

    setSelectedDirectDevice(device)
    setSelectedProject(null)
    setSelectedDeviceId(null)
    setPanel('device')
  }, [])

  return (
    <div className="h-screen flex flex-col bg-neutral-100 overflow-hidden">
      <Navbar
        view={view}
        mapMode={mapMode}
        onHome={handleHome}
      />

      {/* HOME VIEW */}
      {view === 'home' && (
        <div className="flex-1 relative flex flex-col items-center justify-center bg-white gap-10 overflow-hidden">
          <div className="flex items-end gap-3">
            <div className="flex gap-px border border-black/[0.08] rounded-xl overflow-hidden shadow-sm">
              {kpis.filter(k => k.on).map((kpi, i, arr) => (
                <div
                  key={kpi.id}
                  className={`flex flex-col gap-2 px-8 py-6 bg-white ${i < arr.length - 1 ? 'border-r border-black/[0.08]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black/50">{kpi.label}</span>
                    <KpiBadge trend={kpi.trend} delta={kpi.delta} />
                  </div>
                  <span className="text-4xl font-bold tracking-tight text-black/90 leading-none">{kpi.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setPanel(panel === 'kpi' ? 'none' : 'kpi')}
              className="w-8 h-8 rounded-lg bg-black/[0.05] border-none flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-neutral-500">
                <circle cx="2" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="14" cy="8" r="1.5" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleExplore}
            className="bg-neutral-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer border-none hover:opacity-85 transition-opacity"
          >
            Explorar
          </button>
          <KpiPanel
            open={panel === 'kpi'}
            kpis={kpis}
            onClose={() => setPanel('none')}
            onSave={setKpis}
          />
        </div>
      )}

      {/* MAP VIEW */}
      {view === 'map' && (
        <div className="flex-1 relative overflow-hidden">
            <MapView
              drawMode={drawMode}
              mapMode={mapMode}
              projects={projects}
              pendingCoords={pendingCoords}
              selectedProjectId={selectedProject?.id ?? null}
              onZoneComplete={handleZoneComplete}
              onProjectClick={handleProjectClick}
              onSensorClick={handleSensorClick}
              sensorsVisible={sensorsVisible}
              heatmapVisible={heatmapVisible}
              temperaturaVisible={temperaturaVisible}
              cyclingLayerVisible={cyclingLayerVisible}
              projectDeviceMarkers={projectDeviceMarkers}
              filteredSensors={filteredSensors}
              customKindIcons={customKindIcons}
              layerOpacities={layerOpacities}
              gpkgLayers={gpkgLayers}
              isochroneMode={isochroneMode}
            />

            <MapControls
              mode={mapMode}
              drawMode={drawMode}
              onModeChange={handleModeChange}
              onDrawToggle={handleDrawToggle}
              onLayersOpen={() => setPanel('layers')}
              onFiltersOpen={() => setPanel('sensor-filters')}
              activeSensorFilterCount={mapMode === 'explorar' ? activeSensorFilterCount : 0}
              isochroneMode={isochroneMode}
              onIsochroneToggle={() => setIsochroneMode(v => !v)}
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
              {[
                { color: '#00a63e', label: 'Sensor activo' },
                { color: '#e00',    label: 'Alerta' },
              ].map(l => (
                <div key={l.label} className="bg-white border border-black/12 rounded-md flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-neutral-600 shadow-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Side panels */}
            <KpiPanel
              open={panel === 'kpi'}
              kpis={kpis}
              onClose={() => setPanel('none')}
              onSave={setKpis}
            />
            <ZonePanel
              open={panel === 'zone'}
              onClose={handleCloseZone}
              onCreateProject={handleCreateProject}
            />
            <ProjectsPanel
              open={panel === 'projects'}
              projects={filteredProjects}
              selectedProject={selectedProject}
              onSelectProject={(p) => {
                setSelectedProject(p)
                setSelectedDeviceId(null)
                if (p) handleProjectClick(p)
                else setDeviceFilters(EMPTY_DEVICE_FILTERS)
              }}
              onClose={() => { setPanel('none'); setSelectedProject(null); setDeviceFilters(EMPTY_DEVICE_FILTERS); setSelectedDeviceId(null) }}
              onOpenFilters={() => setPanel('filters')}
              activeFilterCount={activeFilterCount}
              deviceFilters={deviceFilters}
              onOpenDeviceFilters={() => setPanel('device-filters')}
              deviceOverrides={deviceOverrides}
              onSelectDevice={(id) => { setSelectedDeviceId(id); setPanel('device') }}
            />
            <ProjectFiltersPanel
              open={panel === 'filters'}
              filters={projectFilters}
              onChange={setProjectFilters}
              onClose={() => setPanel('projects')}
            />
            <ProjectDeviceFiltersPanel
              open={panel === 'device-filters'}
              project={selectedProject}
              filters={deviceFilters}
              onChange={setDeviceFilters}
              onClose={() => setPanel('projects')}
            />
            <DevicePanel
              open={panel === 'device'}
              device={selectedDirectDevice ?? selectedDevice}
              projectName={selectedProject?.name}
              onRename={(id, name) => setDeviceNameOverrides(prev => ({ ...prev, [id]: name }))}
              onClose={() => { setPanel('none'); setSelectedProject(null); setSelectedDeviceId(null); setSelectedDirectDevice(null); setDeviceFilters(EMPTY_DEVICE_FILTERS) }}
              onBack={() => { setPanel(selectedDirectDevice ? 'none' : 'projects'); setSelectedDeviceId(null); setSelectedDirectDevice(null) }}
            />
            <SensorFiltersPanel
              open={panel === 'sensor-filters'}
              filters={sensorFilters}
              kinds={filterOptions.kinds}
              fabricantes={filterOptions.fabricantes}
              onChange={setSensorFilters}
              onClose={() => setPanel('none')}
            />
            <LayersPanel
              open={panel === 'layers'}
              sensorsVisible={sensorsVisible}
              heatmapVisible={heatmapVisible}
              temperaturaVisible={temperaturaVisible}
              cyclingLayerVisible={cyclingLayerVisible}
              onClose={() => setPanel('none')}
              onSensorsToggle={() => setSensorsVisible(v => !v)}
              onHeatmapToggle={() => setHeatmapVisible(v => !v)}
              onTemperaturaToggle={() => setTemperaturaVisible(v => !v)}
              onCyclingLayerToggle={onCyclingLayerToggle}
              importedSensors={allImportedSensors}
              onSensorsImport={handleSensorsImport}
              onCustomLayerToggle={handleCustomLayerToggle}
              onLayerOpacityChange={handleLayerOpacityChange}
              gpkgLayers={gpkgLayers}
              onGpkgImport={handleGpkgImport}
              onGpkgLayerToggle={handleGpkgLayerToggle}
              onGpkgLayerOpacity={handleGpkgLayerOpacity}
            />
        </div>
      )}

    </div>
  )
}
