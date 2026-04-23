export interface DispositivoProperties {
  id: string
  name: string
  kind: string
  status: string
  sensor: string
  type: string
  incident: boolean
  alert: boolean
  lastSeen: string
  model: string
  address: string
}

declare const data: {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: DispositivoProperties
  }>
}

export default data
