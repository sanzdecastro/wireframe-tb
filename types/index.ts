export interface KPI {
  id: string
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  delta: string
  on: boolean
}

export interface Sensor {
  lng: number
  lat: number
  type: 'ok' | 'err'
  label: string
  kind: 'banco' | 'luminaria' | 'jardinera'
}

export type ProjectTaxonomy = 'proyecto' | 'area-1' | 'area-2'
export type ProjectDistrict = 'ciutat-vella' | 'eixample' | 'gracia' | 'les-corts' | 'nou-barris' | 'sant-marti'
export type ProjectDeviceCategory = 'iluminacion' | 'arbolado' | 'mobiliario' | 'jardineras' | 'dispositivo-y' | 'dispositivo-z'
export type ProjectSensorCategory = 'calidad-aire' | 'sensor-x' | 'sensor-y' | 'sensor-z'

export interface Project {
  id: string
  name: string
  area: string
  status: 'active' | 'planned'
  devices: number
  desc: string
  coords?: number[][]
  taxonomy?: ProjectTaxonomy
  district?: ProjectDistrict
  deviceCategories?: ProjectDeviceCategory[]
  sensorCategories?: ProjectSensorCategory[]
}

export interface ProjectFilters {
  taxonomy: ProjectTaxonomy[]
  districts: ProjectDistrict[]
  devices: ProjectDeviceCategory[]
  sensors: ProjectSensorCategory[]
}

export interface KpiCatalogSource {
  id: string
  label: string
  desc: string
  source: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  delta: string
}

export interface KpiCatalogCategory {
  id: string
  label: string
  tab: 'sistema' | 'terceros'
  sources: KpiCatalogSource[]
}

export interface MapLayer {
  id: string
  label: string
  type: 'heatmap' | 'puntos' | 'líneas'
  source?: string
  tab: 'sistema' | 'externas'
  active: boolean
}

export type AppView = 'home' | 'map'
export type MapMode = 'explorar' | 'proyectos'
export type SidePanel = 'none' | 'kpi' | 'zone' | 'projects' | 'layers' | 'filters'
