import { KPI, Sensor, Project, KpiCatalogCategory, MapLayer } from '@/types'
import dispositivosGeoJson from './dispositivos_1000.json'

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
export const DEFAULT_KPIS: KPI[] = [
  { id: 'ocupacion', label: 'Ocupación',  value: '15%',   trend: 'up',   delta: '3.2%',  on: true  },
  { id: 'afluencia', label: 'Afluencia',  value: '43%',   trend: 'down', delta: '12.8%', on: true  },
  { id: 'cobertura', label: 'Cobertura',  value: '50%',   trend: 'up',   delta: '8.8%',  on: true  },
  { id: 'proyectos', label: 'Proyectos',  value: '23',    trend: 'up',   delta: '8.8%',  on: true  },
  
]

export const SENSORS: Sensor[] = dispositivosGeoJson.features.map(f => ({
  id:    f.properties.id,
  lng:   f.geometry.coordinates[0],
  lat:   f.geometry.coordinates[1],
  type:  f.properties.status === 'online' ? 'ok' : 'err' as Sensor['type'],
  kind:  (f.properties.kind ?? 'luminaria') as Sensor['kind'],
  label: f.properties.name,
}))

export const SENSORS_BY_ID: Record<string, { properties: typeof dispositivosGeoJson.features[0]['properties']; coordinates: [number, number] }> =
  Object.fromEntries(dispositivosGeoJson.features.map(f => [f.properties.id, { properties: f.properties, coordinates: f.geometry.coordinates as [number, number] }]))

export const TEMPERATURA_DATA: { lng: number; lat: number; temperatura: number }[] =
  dispositivosGeoJson.features.map(f => ({
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    temperatura: f.properties.temperatura,
  }))

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Optimización Gràcia Nord',
    area: 'Gràcia Nord',
    status: 'active',
    devices: 8,
    desc: 'Redistribución de mobiliario en zona saturada',
    coords: [
      [2.148, 41.399], [2.162, 41.397], [2.170, 41.401],
      [2.169, 41.411], [2.158, 41.414], [2.147, 41.409],
    ],
    taxonomy: 'proyecto',
    district: 'gracia',
    deviceCategories: ['iluminacion', 'mobiliario'],
    sensorCategories: ['calidad-aire'],
  },
  {
    id: 'p2',
    name: 'Revitalización El Clot',
    area: 'El Clot',
    status: 'planned',
    devices: 3,
    desc: 'Incremento de puntos de estancia',
    coords: [
      [2.183, 41.408], [2.198, 41.406], [2.207, 41.411],
      [2.204, 41.421], [2.191, 41.423], [2.182, 41.416],
    ],
    taxonomy: 'proyecto',
    district: 'sant-marti',
    deviceCategories: ['mobiliario', 'arbolado'],
    sensorCategories: ['sensor-x'],
  },
]

export const AI_HINTS = [
  '¿Qué ocurre en Barcelona hoy?',
  '¿En qué zonas instalar más sensores?',
  '¿Cómo incentivar el paso por Gràcia?',
  'Resumen de alertas activas',
]

export const MAP_CENTER: [number, number] = [2.1686, 41.3874]
export const MAP_ZOOM = 13.4

export const AFLUENCIA_DATA: { lng: number; lat: number; weight: number }[] = [
  // Ramblas / Barrio Gótico — máxima afluencia
  { lng: 2.1734, lat: 41.3807, weight: 1.0 },
  { lng: 2.1748, lat: 41.3798, weight: 0.95 },
  { lng: 2.1712, lat: 41.3821, weight: 0.9 },
  { lng: 2.1769, lat: 41.3815, weight: 0.85 },
  { lng: 2.1756, lat: 41.3832, weight: 0.8 },
  // Barceloneta
  { lng: 2.1921, lat: 41.3797, weight: 0.75 },
  { lng: 2.1898, lat: 41.3810, weight: 0.7 },
  { lng: 2.1942, lat: 41.3784, weight: 0.65 },
  // Passeig de Gràcia — alta afluencia
  { lng: 2.1654, lat: 41.3912, weight: 0.9 },
  { lng: 2.1647, lat: 41.3897, weight: 0.85 },
  { lng: 2.1661, lat: 41.3927, weight: 0.8 },
  { lng: 2.1658, lat: 41.3882, weight: 0.75 },
  // Sagrada Família
  { lng: 2.1744, lat: 41.4036, weight: 0.95 },
  { lng: 2.1732, lat: 41.4028, weight: 0.88 },
  { lng: 2.1758, lat: 41.4044, weight: 0.82 },
  { lng: 2.1720, lat: 41.4051, weight: 0.7 },
  // Gràcia
  { lng: 2.1567, lat: 41.4024, weight: 0.6 },
  { lng: 2.1588, lat: 41.4011, weight: 0.65 },
  { lng: 2.1543, lat: 41.4038, weight: 0.55 },
  { lng: 2.1612, lat: 41.4007, weight: 0.7 },
  { lng: 2.1574, lat: 41.3998, weight: 0.62 },
  // Eixample central
  { lng: 2.1631, lat: 41.3874, weight: 0.7 },
  { lng: 2.1645, lat: 41.3862, weight: 0.65 },
  { lng: 2.1618, lat: 41.3886, weight: 0.6 },
  { lng: 2.1672, lat: 41.3851, weight: 0.55 },
  { lng: 2.1589, lat: 41.3897, weight: 0.5 },
  { lng: 2.1700, lat: 41.3868, weight: 0.6 },
  // Arc de Triomf / Born
  { lng: 2.1823, lat: 41.3912, weight: 0.72 },
  { lng: 2.1845, lat: 41.3898, weight: 0.68 },
  { lng: 2.1802, lat: 41.3925, weight: 0.6 },
  // Pl. Catalunya
  { lng: 2.1700, lat: 41.3874, weight: 0.85 },
  { lng: 2.1688, lat: 41.3868, weight: 0.9 },
  // Zona universitaria / Les Corts
  { lng: 2.1178, lat: 41.3876, weight: 0.5 },
  { lng: 2.1201, lat: 41.3862, weight: 0.45 },
  // Sants
  { lng: 2.1398, lat: 41.3791, weight: 0.55 },
  { lng: 2.1423, lat: 41.3802, weight: 0.5 },
  // Poblenou
  { lng: 2.1978, lat: 41.3989, weight: 0.52 },
  { lng: 2.2012, lat: 41.3975, weight: 0.48 },
  // Diagonal / Eixample nord
  { lng: 2.1534, lat: 41.3951, weight: 0.58 },
  { lng: 2.1498, lat: 41.3938, weight: 0.52 },
  { lng: 2.1612, lat: 41.3943, weight: 0.62 },
]

export const KPI_CATALOG: KpiCatalogCategory[] = [
  {
    id: 'movilidad',
    label: 'Movilidad',
    tab: 'sistema',
    sources: [
      { id: 'flujo_peatonal',  label: 'Flujo peatonal',      desc: 'Paso de personas por puntos de medición', source: 'Power BI',       value: '12.4K/h',   trend: 'up',      delta: '4.2%' },
      { id: 'trafico',         label: 'Tráfico rodado',       desc: 'Intensidad media diaria de vehículos',   source: 'OpenData BCN',   value: '8.320 veh', trend: 'down',    delta: '2.1%' },
      { id: 'bici',            label: 'Uso carril bici',      desc: 'Ciclistas por hora en red de carriles',  source: 'OpenData BCN',   value: '1.240/h',   trend: 'up',      delta: '8.7%' },
      { id: 'parking',         label: 'Ocupación parking',    desc: 'Porcentaje de plazas ocupadas',          source: 'Smart City API', value: '73%',        trend: 'neutral', delta: '0.3%' },
    ],
  },
  {
    id: 'medioambiente',
    label: 'Medioambiente',
    tab: 'sistema',
    sources: [
      { id: 'no2',         label: 'Calidad del aire (NO₂)', desc: 'Concentración de dióxido de nitrógeno',        source: 'AQICN',          value: '38 µg/m³',  trend: 'down',    delta: '3.5%' },
      { id: 'ruido',       label: 'Nivel de ruido',         desc: 'Decibelios medios en zona urbana',              source: 'IoT Sensors',    value: '62 dB',     trend: 'up',      delta: '1.2%' },
      { id: 'temperatura', label: 'Temperatura media',      desc: 'Temperatura ambiente en la ciudad',             source: 'OpenData BCN',   value: '21.4 °C',   trend: 'neutral', delta: '0.1%' },
      { id: 'co2',         label: 'Huella de CO₂',          desc: 'Emisiones equivalentes de dióxido de carbono',  source: 'Smart City API', value: '4.2 kt',    trend: 'down',    delta: '2.8%' },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios urbanos',
    tab: 'sistema',
    sources: [
      { id: 'luminarias',  label: 'Luminarias activas',     desc: 'Estado de la red de alumbrado público',   source: 'Smart City API', value: '98.2%',     trend: 'up',   delta: '0.8%' },
      { id: 'incidencias', label: 'Incidencias abiertas',   desc: 'Tickets sin resolver en tiempo real',     source: 'Smart City API', value: '147',       trend: 'down', delta: '5.3%' },
      { id: 'residuos',    label: 'Recogida de residuos',   desc: 'Eficiencia en rutas de recolección',      source: 'Smart City API', value: '94%',       trend: 'up',   delta: '2.0%' },
      { id: 'agua',        label: 'Consumo de agua',        desc: 'Litros per cápita en red municipal',      source: 'Smart City API', value: '186 L/hab', trend: 'down', delta: '1.6%' },
    ],
  },
  {
    id: 'economia',
    label: 'Economía local',
    tab: 'terceros',
    sources: [
      { id: 'comercio',    label: 'Afluencia comercial',    desc: 'Visitas a establecimientos por zona',     source: 'Power BI',         value: '43K/día', trend: 'up',   delta: '6.1%' },
      { id: 'hosteleria',  label: 'Ocupación hostelería',   desc: 'Índice de llenado en restauración',       source: 'Salesforce',       value: '81%',     trend: 'up',   delta: '3.3%' },
      { id: 'turismo',     label: 'Visitantes únicos',      desc: 'Turistas registrados en la ciudad',       source: 'Google Analytics', value: '28.6K',   trend: 'down', delta: '1.8%' },
      { id: 'empleo',      label: 'Tasa de actividad',      desc: 'Porcentaje de población activa laboral',  source: 'OpenData BCN',     value: '76.3%',   trend: 'up',   delta: '0.5%' },
    ],
  },
  {
    id: 'bi',
    label: 'Analítica & BI',
    tab: 'terceros',
    sources: [
      { id: 'bi_ventas',   label: 'Pipeline de ventas',     desc: 'Oportunidades abiertas en CRM',           source: 'Salesforce',  value: '€2.4M',    trend: 'up',   delta: '11.2%' },
      { id: 'bi_nps',      label: 'NPS ciudadano',          desc: 'Net Promoter Score en encuestas',         source: 'Power BI',    value: '67',       trend: 'up',   delta: '3.1%'  },
      { id: 'bi_sessions', label: 'Sesiones web',           desc: 'Visitas al portal municipal',             source: 'Google Analytics', value: '94K',  trend: 'up',   delta: '7.8%'  },
      { id: 'bi_opex',     label: 'OpEx operativo',         desc: 'Gasto operativo consolidado del mes',     source: 'SAP',         value: '€211K',    trend: 'down', delta: '2.3%'  },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Operaciones',
    tab: 'terceros',
    sources: [
      { id: 'crm_tickets',  label: 'Tickets resueltos',     desc: 'Incidencias cerradas en el período',      source: 'Salesforce',  value: '1.820',    trend: 'up',   delta: '5.4%'  },
      { id: 'crm_sla',      label: 'Cumplimiento SLA',      desc: 'Porcentaje de SLAs cumplidos a tiempo',   source: 'Salesforce',  value: '96.1%',    trend: 'up',   delta: '1.2%'  },
      { id: 'crm_mrr',      label: 'MRR',                   desc: 'Monthly Recurring Revenue agregado',      source: 'Power BI',    value: '€350K',    trend: 'up',   delta: '4.1%'  },
      { id: 'crm_capex',    label: 'CapEx proyectos',        desc: 'Capital expenditure en proyectos activos',source: 'SAP',         value: '€94K',     trend: 'up',   delta: '8.8%'  },
    ],
  },
]

export const DEFAULT_LAYERS: MapLayer[] = [
  { id: 'sensores',     label: 'Sensores IoT',         type: 'puntos',  tab: 'sistema',   active: true  },
  { id: 'afluencia',    label: 'Afluencia peatonal',   type: 'heatmap', tab: 'sistema',   active: false },
  { id: 'temperatura',  label: 'Temperatura',          type: 'heatmap', tab: 'sistema',   active: false },
  { id: 'zonas',        label: 'Áreas de proyecto',    type: 'líneas',  tab: 'sistema',   active: true  },
  { id: 'zonificacion', label: 'Zonificación urbana',  type: 'líneas',  tab: 'externas',  active: false, source: 'OpenData BCN' },
  { id: 'bus',          label: 'Paradas de bus',       type: 'puntos',  tab: 'externas',  active: false, source: 'TMB API'      },
  { id: 'bici',         label: 'Carriles bici',        type: 'líneas',  tab: 'externas',  active: false, source: 'OpenData BCN' },
  { id: 'comercios',    label: 'Comercios activos',    type: 'puntos',  tab: 'externas',  active: false, source: 'Salesforce'   },
]
