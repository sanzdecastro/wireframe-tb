'use client'

import { useEffect, useState } from 'react'
import { SidePanel, CloseIcon } from '@/components/ui'
import { ProjectDevice, DEVICE_TYPE_LABEL, DEVICE_SENSOR_LABEL } from '@/lib/projectDevices'

interface DevicePanelProps {
  open: boolean
  device: ProjectDevice | null
  projectName?: string
  onRename: (deviceId: string, name: string) => void
  onClose: () => void
  onBack: () => void
}

type Tab = 'alertas' | 'estado' | 'configuracion' | 'detalles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'alertas',       label: 'Alertas'       },
  { id: 'estado',        label: 'Estado'        },
  { id: 'configuracion', label: 'Configuración' },
  { id: 'detalles',      label: 'Detalles'      },
]

function sensorReadings(device: ProjectDevice) {
  const seed = device.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rnd = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280
  const base = [
    { label: 'Temperatura',  value: `${(18 + rnd(1) * 12).toFixed(1)} °C` },
    { label: 'Humedad',      value: `${Math.round(40 + rnd(2) * 40)} %`   },
    { label: 'Batería',      value: `${Math.round(40 + rnd(3) * 60)} %`   },
    { label: 'Señal',        value: `${Math.round(-90 + rnd(4) * 40)} dBm` },
  ]
  if (device.sensor === 'movimiento') base.push({ label: 'Eventos hoy', value: String(Math.round(rnd(5) * 240)) })
  if (device.sensor === 'x')          base.push({ label: 'Ruido',        value: `${Math.round(40 + rnd(5) * 30)} dB` })
  if (device.sensor === 'y')          base.push({ label: 'CO₂',          value: `${Math.round(400 + rnd(5) * 400)} ppm` })
  return base
}

function StatusBadge({ status }: { status: 'online' | 'offline' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
      status === 'online' ? 'bg-green-50 text-green-800' : 'bg-neutral-100 text-neutral-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-neutral-400'}`} />
      {status === 'online' ? 'Online' : 'Offline'}
    </span>
  )
}

export function DevicePanel({ open, device, projectName, onRename, onClose, onBack }: DevicePanelProps) {
  const [tab, setTab] = useState<Tab>('estado')
  const [name, setName] = useState(device?.name ?? '')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setName(device?.name ?? '')
    setEditing(false)
    setTab('estado')
  }, [device?.id])

  if (!device) {
    return <SidePanel open={open}><div /></SidePanel>
  }

  const commitRename = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== device.name) onRename(device.id, trimmed)
    else setName(device.name)
    setEditing(false)
  }

  return (
    <SidePanel open={open}>
      <div className="px-4 py-3.5 border-b border-black/[0.08] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-none transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {projectName ?? 'Proyecto'}
          </button>
          <button onClick={onClose} className="w-6 h-6 border-none bg-transparent cursor-pointer flex items-center justify-center rounded text-neutral-400 hover:bg-black/[0.05]">
            <CloseIcon />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-neutral-100 border border-black/[0.06] flex-shrink-0 flex items-center justify-center text-neutral-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={device.status} />
              <span className="text-[11px] text-neutral-400">· {device.lastSeen}</span>
            </div>
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(device.name); setEditing(false) } }}
                className="w-full text-lg font-medium text-black/90 leading-tight bg-transparent border-b border-neutral-300 focus:border-neutral-900 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                title="Renombrar"
                className="group text-left bg-transparent border-none p-0 cursor-text w-full flex items-center gap-1"
              >
                <span className="text-lg font-medium text-black/90 leading-tight truncate">{device.name}</span>
                <svg className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 14l3-1 8-8-2-2-8 8-1 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[11px]">
          <div><span className="text-neutral-400">Modelo</span> <span className="text-neutral-700">· {device.model}</span></div>
          <div><span className="text-neutral-400">Categoría</span> <span className="text-neutral-700">· {DEVICE_TYPE_LABEL[device.type]}</span></div>
          <div className="col-span-2"><span className="text-neutral-400">Dirección</span> <span className="text-neutral-700">· {device.address}</span></div>
        </div>
      </div>

      <div className="border-b border-black/[0.08] flex-shrink-0 px-2">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs px-3 py-2.5 border-none bg-transparent cursor-pointer transition-colors relative whitespace-nowrap ${
                tab === t.id ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-neutral-900 rounded-t" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'alertas' && (
          <div className="flex flex-col gap-2">
            {device.alert && (
              <div className="border border-red-100 bg-red-50 rounded-md px-3 py-2">
                <div className="text-xs font-medium text-red-700 mb-0.5">Alerta crítica</div>
                <div className="text-[11px] text-red-600/80">Lectura fuera de rango detectada hace 18 min</div>
              </div>
            )}
            {device.incident && (
              <div className="border border-amber-100 bg-amber-50 rounded-md px-3 py-2">
                <div className="text-xs font-medium text-amber-800 mb-0.5">Incidencia</div>
                <div className="text-[11px] text-amber-700/80">Mantenimiento preventivo pendiente</div>
              </div>
            )}
            {!device.alert && !device.incident && (
              <div className="text-xs text-neutral-400 text-center py-6">Sin alertas activas</div>
            )}
          </div>
        )}

        {tab === 'estado' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {sensorReadings(device).map(r => (
                <div key={r.label} className="bg-neutral-50 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-neutral-400 mb-0.5">{r.label}</div>
                  <div className="text-sm font-semibold text-neutral-900">{r.value}</div>
                </div>
              ))}
            </div>
            {device.sensor && (
              <div className="text-[11px] text-neutral-500">
                Sensor: <span className="text-neutral-800 font-medium">{DEVICE_SENSOR_LABEL[device.sensor]}</span>
              </div>
            )}
            {!device.sensor && (
              <div className="text-[11px] text-neutral-400">Dispositivo sin sensor adicional</div>
            )}
          </div>
        )}

        {tab === 'configuracion' && (
          <div className="flex flex-col gap-3">
            {[
              { label: 'Intervalo de reporte', value: '5 min' },
              { label: 'Modo de operación',    value: 'Automático' },
              { label: 'Firmware',             value: 'v3.2.1' },
              { label: 'Zona horaria',         value: 'Europe/Madrid' },
            ].map(c => (
              <div key={c.label} className="flex items-center justify-between text-xs border-b border-black/[0.05] pb-2">
                <span className="text-neutral-500">{c.label}</span>
                <span className="text-neutral-800 font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'detalles' && (
          <div className="flex flex-col gap-3 text-xs">
            {[
              { label: 'ID',              value: device.id },
              { label: 'Modelo',          value: device.model },
              { label: 'Categoría',       value: DEVICE_TYPE_LABEL[device.type] },
              { label: 'Sensor',          value: device.sensor ? DEVICE_SENSOR_LABEL[device.sensor] : '—' },
              { label: 'Dirección',       value: device.address },
              { label: 'Última conexión', value: device.lastSeen },
              { label: 'Estado',          value: device.status === 'online' ? 'Online' : 'Offline' },
            ].map(d => (
              <div key={d.label} className="flex items-start justify-between gap-4 border-b border-black/[0.05] pb-2">
                <span className="text-neutral-500 flex-shrink-0">{d.label}</span>
                <span className="text-neutral-800 font-medium text-right break-all">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidePanel>
  )
}
