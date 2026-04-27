import { Project, ProjectDeviceType, ProjectDeviceSensor, ProjectDeviceFilters, ProjectDeviceFabricante } from '@/types'
import mobiliariData from './mobiliari.json'

type MobiliariRaw = {
  gis_id: number; tipus_de_mobiliari_urba: string; descripcio: string
  fabricant: string; nom_carrer: string; num_carrer: number
  latitude: number; longitude: number
}

export interface ProjectDevice {
  id: string
  name: string
  type: ProjectDeviceType
  sensor: ProjectDeviceSensor | null
  incident: boolean
  alert: boolean
  status: 'online' | 'offline'
  lastSeen: string
  model: string
  fabricante: ProjectDeviceFabricante
  address: string
  lng: number
  lat: number
}

function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const MODELS: Record<ProjectDeviceType, string[]> = {
  iluminacion: ['Philips LUM-240', 'Osram SmartLED-X1', 'Signify CitySense 3'],
  mobiliario:  ['UrbanBench V2', 'EcoSeat Pro', 'CityRest M-100'],
  jardineras:  ['GreenPlanter G-40', 'Hydro-Box Urban', 'BioPot S-12'],
}

const MODEL_FABRICANTE: Record<string, ProjectDeviceFabricante> = {
  'Philips LUM-240':    'Philips',
  'Osram SmartLED-X1':  'Osram',
  'Signify CitySense 3':'Signify',
  'UrbanBench V2':      'UrbanBench',
  'EcoSeat Pro':        'EcoSeat',
  'CityRest M-100':     'CityRest',
  'GreenPlanter G-40':  'GreenPlanter',
  'Hydro-Box Urban':    'Hydro-Box',
  'BioPot S-12':        'BioPot',
}

export const DEVICE_FABRICANTE_LABEL: Record<ProjectDeviceFabricante, string> = {
  // Sintéticos
  Philips:      'Philips',
  Osram:        'Osram',
  Signify:      'Signify',
  UrbanBench:   'UrbanBench',
  EcoSeat:      'EcoSeat',
  CityRest:     'CityRest',
  GreenPlanter: 'GreenPlanter',
  'Hydro-Box':  'Hydro-Box',
  BioPot:       'BioPot',
  // Mobiliario urbano real
  Ado:                              'Ado',
  Benito:                           'Benito',
  Breinco:                          'Breinco',
  Colomer:                          'Colomer',
  Contenur:                         'Contenur',
  DAE:                              'DAE',
  Escofet:                          'Escofet',
  'Fàbregas':                       'Fàbregas',
  'Hercal Eco-Concrete':            'Hercal Eco-Concrete',
  'Lamarc Inox':                    'Lamarc Inox',
  Magourban:                        'Magourban',
  Mein:                             'Mein',
  'Mobles 114':                     'Mobles 114',
  Moycosa:                          'Moycosa',
  Novatilu:                         'Novatilu',
  Salvi:                            'Salvi',
  'Santa Cole':                     'Santa Cole',
  Saura:                            'Saura',
  'Señalización y Diseños Urbanos': 'Señalización y Diseños Urbanos',
  Urbidermis:                       'Urbidermis',
  Varios:                           'Varios',
}

const STREETS = ['Carrer de Gràcia', 'Passeig de Sant Joan', 'Av. Diagonal', 'Ronda Sant Pere', 'Carrer Gran', 'Pl. de la Virreina', 'Carrer Verdi', 'Travessera de Dalt']
const LAST_SEEN_ONLINE  = ['Hace 1 min', 'Hace 4 min', 'Hace 12 min', 'Hace 38 min', 'Hace 2 h']
const LAST_SEEN_OFFLINE = ['Hace 3 h', 'Hace 8 h', 'Ayer', 'Hace 2 días', 'Hace 1 semana']

export const DEVICE_TYPE_LABEL: Record<ProjectDeviceType, string> = {
  iluminacion: 'Iluminación',
  mobiliario:  'Mobiliario',
  jardineras:  'Jardineras',
}

export const DEVICE_SENSOR_LABEL: Record<ProjectDeviceSensor, string> = {
  movimiento: 'Sensor de movimiento',
  x: 'Sensor X',
  y: 'Sensor Y',
}

const TYPE_PREFIX: Record<ProjectDeviceType, string> = { iluminacion: 'L', mobiliario: 'M', jardineras: 'J' }

export const EMPTY_DEVICE_FILTERS: ProjectDeviceFilters = { types: [], sensors: [], flags: [], fabricantes: [] }

export function countActiveDeviceFilters(f: ProjectDeviceFilters) {
  return f.types.length + f.sensors.length + f.flags.length + f.fabricantes.length
}

function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function realMobiliariInPolygon(poly: number[][], rng: () => number): ProjectDevice[] {
  return (mobiliariData as MobiliariRaw[])
    .filter(d => d.latitude && d.longitude && pointInPolygon([d.longitude, d.latitude], poly))
    .map(d => {
      const status: 'online' | 'offline' = rng() < 0.85 ? 'online' : 'offline'
      const lastSeen = (status === 'online' ? LAST_SEEN_ONLINE : LAST_SEEN_OFFLINE)[Math.floor(rng() * 5) % (status === 'online' ? LAST_SEEN_ONLINE.length : LAST_SEEN_OFFLINE.length)]
      const fabricante = (d.fabricant || 'Varios') as ProjectDeviceFabricante
      return {
        id:        `mob-${d.gis_id}`,
        name:      d.descripcio ? `${d.tipus_de_mobiliari_urba} — ${d.descripcio}` : d.tipus_de_mobiliari_urba,
        type:      'mobiliario' as ProjectDeviceType,
        sensor:    null,
        incident:  rng() < 0.1,
        alert:     rng() < 0.05,
        status,
        lastSeen,
        model:     d.descripcio || d.tipus_de_mobiliari_urba,
        fabricante,
        address:   `${d.nom_carrer}, ${d.num_carrer}`,
        lng:       d.longitude,
        lat:       d.latitude,
      }
    })
}

export function generateProjectDevices(project: Project): ProjectDevice[] {
  const seed = project.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rnd = seededRng(seed)
  const types: ProjectDeviceType[] = ['iluminacion', 'mobiliario', 'jardineras']
  const sensors: (ProjectDeviceSensor | null)[] = ['movimiento', 'x', 'y', null, null]
  const poly = project.coords ?? null
  let bbox: [number, number, number, number] | null = null
  if (poly && poly.length >= 3) {
    const lngs = poly.map(c => c[0]); const lats = poly.map(c => c[1])
    bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
  }

  const pickPosition = (): [number, number] => {
    if (!poly || !bbox) return [2.1686, 41.3874]
    for (let k = 0; k < 80; k++) {
      const lng = bbox[0] + rnd() * (bbox[2] - bbox[0])
      const lat = bbox[1] + rnd() * (bbox[3] - bbox[1])
      if (pointInPolygon([lng, lat], poly)) return [lng, lat]
    }
    return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
  }

  const synthetic = Array.from({ length: project.devices }, (_, i) => {
    const type = types[Math.floor(rnd() * types.length)]
    const sensor = sensors[Math.floor(rnd() * sensors.length)]
    const incident = rnd() < 0.22
    const alert = rnd() < 0.15
    const status: 'online' | 'offline' = rnd() < 0.85 ? 'online' : 'offline'
    const lastSeenPool = status === 'online' ? LAST_SEEN_ONLINE : LAST_SEEN_OFFLINE
    const lastSeen = lastSeenPool[Math.floor(rnd() * lastSeenPool.length)]
    const modelPool = MODELS[type]
    const model = modelPool[Math.floor(rnd() * modelPool.length)]
    const fabricante = MODEL_FABRICANTE[model]
    const street = STREETS[Math.floor(rnd() * STREETS.length)]
    const streetNum = Math.floor(rnd() * 180) + 1
    const address = `${street}, ${streetNum}`
    const num = String(i + 1).padStart(3, '0')
    const [lng, lat] = pickPosition()
    return {
      id: `${project.id}-${i}`,
      name: `${DEVICE_TYPE_LABEL[type]} ${TYPE_PREFIX[type]}-${num}`,
      type, sensor, incident, alert, status, lastSeen, model, fabricante, address, lng, lat,
    }
  })

  const real = poly ? realMobiliariInPolygon(poly, rnd) : []
  return [...synthetic, ...real]
}

export function applyDeviceFilters(devices: ProjectDevice[], f: ProjectDeviceFilters): ProjectDevice[] {
  return devices.filter(d => {
    if (f.types.length        && !f.types.includes(d.type))              return false
    if (f.sensors.length      && (!d.sensor || !f.sensors.includes(d.sensor))) return false
    if (f.fabricantes.length  && !f.fabricantes.includes(d.fabricante))  return false
    if (f.flags.includes('incident') && !d.incident) return false
    if (f.flags.includes('alert')    && !d.alert)    return false
    return true
  })
}
