import { Project, ProjectDeviceType, ProjectDeviceSensor, ProjectDeviceFilters } from '@/types'

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
  address: string
}

const MODELS: Record<ProjectDeviceType, string[]> = {
  iluminacion: ['Philips LUM-240', 'Osram SmartLED-X1', 'Signify CitySense 3'],
  mobiliario:  ['UrbanBench V2', 'EcoSeat Pro', 'CityRest M-100'],
  jardineras:  ['GreenPlanter G-40', 'Hydro-Box Urban', 'BioPot S-12'],
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

export const EMPTY_DEVICE_FILTERS: ProjectDeviceFilters = { types: [], sensors: [], flags: [] }

export function countActiveDeviceFilters(f: ProjectDeviceFilters) {
  return f.types.length + f.sensors.length + f.flags.length
}

function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function generateProjectDevices(project: Project): ProjectDevice[] {
  const seed = project.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rnd = seededRng(seed)
  const types: ProjectDeviceType[] = ['iluminacion', 'mobiliario', 'jardineras']
  const sensors: (ProjectDeviceSensor | null)[] = ['movimiento', 'x', 'y', null, null]
  return Array.from({ length: project.devices }, (_, i) => {
    const type = types[Math.floor(rnd() * types.length)]
    const sensor = sensors[Math.floor(rnd() * sensors.length)]
    const incident = rnd() < 0.22
    const alert = rnd() < 0.15
    const status: 'online' | 'offline' = rnd() < 0.85 ? 'online' : 'offline'
    const lastSeenPool = status === 'online' ? LAST_SEEN_ONLINE : LAST_SEEN_OFFLINE
    const lastSeen = lastSeenPool[Math.floor(rnd() * lastSeenPool.length)]
    const modelPool = MODELS[type]
    const model = modelPool[Math.floor(rnd() * modelPool.length)]
    const street = STREETS[Math.floor(rnd() * STREETS.length)]
    const streetNum = Math.floor(rnd() * 180) + 1
    const address = `${street}, ${streetNum}`
    const num = String(i + 1).padStart(3, '0')
    return {
      id: `${project.id}-${i}`,
      name: `${DEVICE_TYPE_LABEL[type]} ${TYPE_PREFIX[type]}-${num}`,
      type,
      sensor,
      incident,
      alert,
      status,
      lastSeen,
      model,
      address,
    }
  })
}

export function applyDeviceFilters(devices: ProjectDevice[], f: ProjectDeviceFilters): ProjectDevice[] {
  return devices.filter(d => {
    if (f.types.length   && !f.types.includes(d.type)) return false
    if (f.sensors.length && (!d.sensor || !f.sensors.includes(d.sensor))) return false
    if (f.flags.includes('incident') && !d.incident) return false
    if (f.flags.includes('alert')    && !d.alert)    return false
    return true
  })
}
