export interface KPI {
  id: string
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  delta: string
  on: boolean
}

export interface Sensor {
  id: string
  lng: number
  lat: number
  type: 'ok' | 'err'
  label: string
  kind: 'banco' | 'luminaria' | 'jardinera'
  fabricante?: string
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

export interface SensorFilters {
  kinds:       ('banco' | 'luminaria' | 'jardinera')[]
  statuses:    ('ok' | 'err')[]
  fabricantes: string[]
}

export type AppView = 'home' | 'map'
export type MapMode = 'explorar' | 'proyectos'
export type SidePanel = 'none' | 'kpi' | 'zone' | 'projects' | 'layers' | 'filters' | 'device-filters' | 'device' | 'sensor-filters'

export type ProjectDeviceType = 'iluminacion' | 'mobiliario' | 'jardineras'
export type ProjectDeviceSensor = 'movimiento' | 'x' | 'y'
export type ProjectDeviceFlag = 'incident' | 'alert'
export type ProjectDeviceFabricante =
  // Sintéticos (datos de prueba)
  | 'Philips' | 'Osram' | 'Signify' | 'UrbanBench' | 'EcoSeat' | 'CityRest' | 'GreenPlanter' | 'Hydro-Box' | 'BioPot'
  // Mobiliario urbano real (Barcelona Open Data)
  | 'Ado' | 'Benito' | 'Breinco' | 'Colomer' | 'Contenur' | 'DAE' | 'Escofet' | 'Fàbregas'
  | 'Hercal Eco-Concrete' | 'Lamarc Inox' | 'Magourban' | 'Mein' | 'Mobles 114' | 'Moycosa'
  | 'Novatilu' | 'Salvi' | 'Santa Cole' | 'Saura' | 'Señalización y Diseños Urbanos' | 'Urbidermis' | 'Varios'

export interface ProjectDeviceFilters {
  types:       ProjectDeviceType[]
  sensors:     ProjectDeviceSensor[]
  flags:       ProjectDeviceFlag[]
  fabricantes: ProjectDeviceFabricante[]
}
