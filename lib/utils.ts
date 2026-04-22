import { KPI, Project, AppView, MapMode, SidePanel } from '@/types'
import { DEFAULT_KPIS, DEFAULT_PROJECTS } from './data'

// Utility: generate random zone KPIs
export function randomZoneKpis() {
  const occ = Math.round(30 + Math.random() * 60)
  const aflu = Math.round(20 + Math.random() * 70)
  const sens = Math.round(3 + Math.random() * 15)
  const cap = Math.round(20 + Math.random() * 150)
  return [
    { label: 'Ocupación', value: `${occ}%`,   trend: 'up'      as const, delta: `↑ ${Math.round(Math.random() * 10)}%` },
    { label: 'Afluencia', value: `${aflu}%`,  trend: 'down'    as const, delta: `↓ ${Math.round(Math.random() * 15)}%` },
    { label: 'Sensores',  value: `${sens}`,   trend: 'neutral' as const, delta: '' },
    { label: 'CapEx est.',value: `$${cap}k`,  trend: 'neutral' as const, delta: '' },
  ]
}

export function randomZoneDevices() {
  return [
    { name: 'Bancos',      count: Math.round(2 + Math.random() * 8), status: 'ok'  as const },
    { name: 'Papeleras',   count: Math.round(1 + Math.random() * 5), status: 'ok'  as const },
    { name: 'Luminarias',  count: Math.round(1 + Math.random() * 4), status: 'err' as const },
    { name: 'Sensores IoT',count: Math.round(2 + Math.random() * 6), status: 'ok'  as const },
  ]
}
