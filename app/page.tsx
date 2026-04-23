'use client'

import { useState, useCallback, useMemo } from 'react'
import { KPI, Project, AppView, MapMode, SidePanel, ProjectFilters, ProjectDeviceFilters } from '@/types'
import { DEFAULT_KPIS, DEFAULT_PROJECTS } from '@/lib/data'

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
import { DevicePanel } from '@/components/panels/DevicePanel'
import { EMPTY_DEVICE_FILTERS, generateProjectDevices } from '@/lib/projectDevices'

export default function Home() {
  const [view, setView]           = useState<AppView>('home')
  const [mapMode, setMapMode]     = useState<MapMode>('explorar')
  const [panel, setPanel]         = useState<SidePanel>('none')
  const [kpis, setKpis]           = useState<KPI[]>(DEFAULT_KPIS)
  const [projects, setProjects]   = useState<Project[]>(DEFAULT_PROJECTS)
  const [drawMode, setDrawMode]             = useState(false)
  const [pendingCoords, setPendingCoords]   = useState<number[][]>([])
  const [heatmapVisible, setHeatmapVisible] = useState(false)
  const [cyclingLayerVisible, setCyclingLayerVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(EMPTY_FILTERS)
  const [deviceFilters, setDeviceFilters] = useState<ProjectDeviceFilters>(EMPTY_DEVICE_FILTERS)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [deviceNameOverrides, setDeviceNameOverrides] = useState<Record<string, string>>({})

  const deviceOverrides = useMemo(() => {
    const out: Record<string, { name: string }> = {}
    for (const [id, name] of Object.entries(deviceNameOverrides)) out[id] = { name }
    return out
  }, [deviceNameOverrides])

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

  const activeFilterCount = countActiveFilters(projectFilters)

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

  const handleSensorClick = useCallback((label: string, kind: string, sensorType: string, lng: number, lat: number) => {
    const containingProject = projects.find(p => {
      const [px, py] = [lng, lat]
      let inside = false
      for (let i = 0, j = p.coords.length - 1; i < p.coords.length; j = i++) {
        const [xi, yi] = p.coords[i]
        const [xj, yj] = p.coords[j]
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }) ?? projects[0]
    if (!containingProject) return
    const devices = generateProjectDevices(containingProject)
    if (!devices.length) return
    setSelectedProject(containingProject)
    setSelectedDeviceId(devices[0].id)
    setPanel('device')
  }, [projects])

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
              heatmapVisible={heatmapVisible}
              cyclingLayerVisible={cyclingLayerVisible}
            />

            <MapControls
              mode={mapMode}
              drawMode={drawMode}
              onModeChange={handleModeChange}
              onDrawToggle={handleDrawToggle}
              onLayersOpen={() => setPanel('layers')}
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
              device={selectedDevice}
              projectName={selectedProject?.name}
              onRename={(id, name) => setDeviceNameOverrides(prev => ({ ...prev, [id]: name }))}
              onClose={() => { setPanel('none'); setSelectedProject(null); setSelectedDeviceId(null); setDeviceFilters(EMPTY_DEVICE_FILTERS) }}
              onBack={() => { setPanel('projects'); setSelectedDeviceId(null) }}
            />
            <LayersPanel
              open={panel === 'layers'}
              heatmapVisible={heatmapVisible}
              cyclingLayerVisible={cyclingLayerVisible}
              onClose={() => setPanel('none')}
              onHeatmapToggle={() => setHeatmapVisible(v => !v)}
              onCyclingLayerToggle={onCyclingLayerToggle}
            />
        </div>
      )}

    </div>
  )
}
