'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { MAPBOX_TOKEN, SENSORS, MAP_CENTER, MAP_ZOOM, AFLUENCIA_DATA, TEMPERATURA_DATA } from '@/lib/data'
import { Project, MapMode, Sensor } from '@/types'
import { ICON_SHAPE_MAP } from '@/lib/sensorIconShapes'
import type { GpkgFeatureLayer } from '@/types'
import { tileUrlRegistry, EMPTY_TILE } from '@/lib/gpkgImport/tileServer'

// ── Helpers de iconos (sin dependencia del mapa, reutilizables) ───────────────

function buildSvgIcon(shape: string, borderColor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect width="28" height="28" rx="5" fill="white" stroke="${borderColor}" stroke-width="1.5"/>
    ${shape}
  </svg>`
}

function loadMapImage(map: any, id: string, svg: string): Promise<void> {
  return new Promise(resolve => {
    const img = new Image(28, 28)
    img.onload = () => { map.addImage(id, img); resolve() }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

function pointInPolygon(point: number[], polygon: number[][]): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export interface ProjectDeviceMarker {
  lng: number
  lat: number
  type: 'ok' | 'err'
  kind: 'banco' | 'luminaria' | 'jardinera'
  label: string
}

interface MapViewProps {
  drawMode: boolean
  mapMode: MapMode
  projects: Project[]
  pendingCoords: number[][]
  selectedProjectId: string | null
  onZoneComplete: (coords: number[][]) => void
  onProjectClick: (project: Project) => void
  onSensorClick?: (id: string) => void
  sensorsVisible?: boolean
  heatmapVisible?: boolean
  temperaturaVisible?: boolean
  cyclingLayerVisible?: boolean
  projectDeviceMarkers?: ProjectDeviceMarker[] | null
  filteredSensors?: Sensor[]
  customKindIcons?: Record<string, string>   // kind → shapeId
  layerOpacities?:  Record<string, number>   // panelLayerId → 0-100
  gpkgLayers?:      GpkgFeatureLayer[]
  isochroneMode?:   boolean
  isochroneMinutes?: number
}

export function MapView({ drawMode, mapMode, projects, pendingCoords, selectedProjectId, onZoneComplete, onProjectClick, onSensorClick, sensorsVisible = true, heatmapVisible = false, temperaturaVisible = false, cyclingLayerVisible = false, projectDeviceMarkers = null, filteredSensors, customKindIcons, layerOpacities, gpkgLayers, isochroneMode = false, isochroneMinutes = 15 }: MapViewProps) {
  const activeSensors = filteredSensors ?? SENSORS
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapboxglRef = useRef<any>(null)
  const mapLoadedRef = useRef(false)
  const zoneMarkersRef = useRef<Record<string, any>>({})
  const drawCoordsRef = useRef<number[][]>([])
  const drawMarkersRef = useRef<any[]>([])
  const drawModeRef = useRef(drawMode)
  const mapModeRef = useRef(mapMode)
  const onProjectClickRef = useRef(onProjectClick)
  const onSensorClickRef = useRef(onSensorClick)
  const projectsRef = useRef(projects)
  const isochroneModeRef = useRef(isochroneMode)
  const isochroneMinutesRef = useRef(isochroneMinutes)
  onProjectClickRef.current = onProjectClick
  onSensorClickRef.current = onSensorClick
  projectsRef.current = projects
  drawModeRef.current = drawMode
  mapModeRef.current = mapMode
  isochroneModeRef.current = isochroneMode
  isochroneMinutesRef.current = isochroneMinutes

  const updateDrawLine = useCallback((map: any, coords: number[][]) => {
    const hasArea = coords.length >= 3
    const geojson: any = {
      type: 'Feature',
      geometry: hasArea
        ? { type: 'Polygon', coordinates: [[...coords, coords[0]]] }
        : { type: 'LineString', coordinates: coords },
    }
    if (!map.getSource('draw-source')) {
      map.addSource('draw-source', { type: 'geojson', data: geojson })
      map.addLayer({
        id: 'draw-fill',
        type: 'fill',
        source: 'draw-source',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#0070f3', 'fill-opacity': 0.12 },
      })
      map.addLayer({
        id: 'draw-line',
        type: 'line',
        source: 'draw-source',
        paint: { 'line-color': '#0070f3', 'line-width': 2, 'line-opacity': 0.9 },
      })
    } else {
      map.getSource('draw-source').setData(geojson)
    }
  }, [])

  const renderProjectZone = useCallback((map: any, mapboxgl: any, p: Project) => {
    if (!p.coords || p.coords.length < 3) return
    const sourceId = `proj-${p.id}`
    if (map.getSource(sourceId)) return
    const coords = [...p.coords, p.coords[0]]
    map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } } })
    const beforeId = map.getLayer('sensors-dots') ? 'sensors-dots' : undefined
    map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId, layout: { visibility: 'none' }, paint: { 'fill-color': '#0070f3', 'fill-opacity': 0.18 } }, beforeId)
    map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId, layout: { visibility: 'none' }, paint: { 'line-color': '#0070f3', 'line-width': 2 } }, beforeId)
    const center = p.coords.reduce((a, c) => [a[0] + c[0] / p.coords!.length, a[1] + c[1] / p.coords!.length], [0, 0])
    const el = document.createElement('div')
    el.style.cssText = 'background:white;border:1.5px solid #0070f3;border-radius:5px;padding:4px 10px;font-size:11px;font-weight:600;color:#0070f3;white-space:nowrap;cursor:pointer;box-shadow:0 1px 4px rgba(0,112,243,0.15);display:none;'
    el.textContent = p.name
    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(center as [number, number]).addTo(map)
    zoneMarkersRef.current[p.id] = marker
    map.on('click', `${sourceId}-fill`, () => onProjectClickRef.current(p))
    map.on('mouseenter', `${sourceId}-fill`, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', `${sourceId}-fill`, () => { map.getCanvas().style.cursor = '' })
  }, [])

  const clearDraw = useCallback((map: any) => {
    drawMarkersRef.current.forEach(m => m.remove())
    drawMarkersRef.current = []
    drawCoordsRef.current = []
    if (map.getLayer('draw-line')) map.removeLayer('draw-line')
    if (map.getLayer('draw-fill')) map.removeLayer('draw-fill')
    if (map.getSource('draw-source')) map.removeSource('draw-source')
  }, [])


  const ensureCyclingLayer = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (!map.getSource('cycling-tiles')) {
      map.addSource('cycling-tiles', {
        type: 'raster',
        tiles: [
          'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
          'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
          'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
          'rendering <a href="https://cyclosm.org/">CyclOSM</a>',
      })
    }

    if (!map.getLayer('cycling-tiles-layer')) {
      const beforeId = map.getLayer('sensors-dots') ? 'sensors-dots' : undefined

      map.addLayer(
        {
          id: 'cycling-tiles-layer',
          type: 'raster',
          source: 'cycling-tiles',
          layout: {
            visibility: cyclingLayerVisible ? 'visible' : 'none',
          },
          paint: {
            'raster-opacity': 0.75,
          },
        },
        beforeId
      )
    } else {
      map.setLayoutProperty(
        'cycling-tiles-layer',
        'visibility',
        cyclingLayerVisible ? 'visible' : 'none'
      )
    }
  }, [cyclingLayerVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const syncCyclingLayer = () => {
      ensureCyclingLayer()
    }

    if (map.isStyleLoaded()) {
      syncCyclingLayer()
    } else {
      map.once('load', syncCyclingLayer)
      return () => map.off('load', syncCyclingLayer)
    }
  }, [ensureCyclingLayer])

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (destroyed || mapRef.current) return
      mapboxglRef.current = mapboxgl

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        attributionControl: false,
        trackResize: false,
        // Resolver tiles GPKG desde blob URLs pre-extraídas (compatible con mapbox-gl v2)
        transformRequest: (url: string) => {
          if (url.startsWith('gpkg://')) {
            const path    = url.replace('gpkg://', '')
            const blobUrl = tileUrlRegistry.get(path)
            return { url: blobUrl ?? EMPTY_TILE }
          }
          return { url }
        },
      })

      // ResizeObserver sobre el contenedor: detecta cualquier cambio de tamaño
      // (window resize, panel lateral, re-renders de React) y sincroniza el canvas.
      resizeObserver = new ResizeObserver(() => { map.resize() })
      resizeObserver.observe(containerRef.current!)
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
      map.addControl(new mapboxgl.AttributionControl({ compact: true }))

      map.on('load', async () => {
        // Sincronizar canvas con el tamaño real del contenedor una vez cargado el estilo.
        // El useEffect de init corre antes de que el layout flex esté estabilizado,
        // así que es aquí donde el resize inicial es seguro.
        map.resize()
        mapLoadedRef.current = true
        const makeSquare = (color: string) => {
          const c = document.createElement('canvas')
          c.width = 12; c.height = 12
          const ctx = c.getContext('2d')!
          ctx.fillStyle = color
          ctx.fillRect(0, 0, 12, 12)
          return ctx.getImageData(0, 0, 12, 12)
        }
        map.addImage('sq-ok',  makeSquare('#00a63e'), { pixelRatio: 2 })
        map.addImage('sq-err', makeSquare('#dd0000'), { pixelRatio: 2 })

        const shapes = {
          banco:     `<rect x="5" y="16" width="18" height="2.5" rx="1" fill="#333"/>
                      <rect x="5" y="11" width="18" height="2" rx="1" fill="#333"/>
                      <rect x="6" y="18.5" width="2" height="4" rx="1" fill="#333"/>
                      <rect x="20" y="18.5" width="2" height="4" rx="1" fill="#333"/>
                      <rect x="9" y="13" width="1.5" height="3" fill="#333"/>
                      <rect x="17.5" y="13" width="1.5" height="3" fill="#333"/>`,
          luminaria: `<rect x="12.5" y="13" width="3" height="11" rx="1" fill="#333"/>
                      <path d="M14 13 Q14 7 20 7" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                      <rect x="18" y="4.5" width="6" height="3.5" rx="1.5" fill="#FFC107"/>`,
          jardinera: `<rect x="4" y="19" width="20" height="6" rx="2" fill="#8B6350"/>
                      <circle cx="9" cy="17" r="3.5" fill="#4CAF50"/>
                      <circle cx="14" cy="14.5" r="5" fill="#388E3C"/>
                      <circle cx="19" cy="17" r="3.5" fill="#4CAF50"/>`,
        }

        await Promise.all(
          (['banco', 'luminaria', 'jardinera'] as const).flatMap(kind => [
            loadMapImage(map, `${kind}-ok`,  buildSvgIcon(shapes[kind], '#00a63e')),
            loadMapImage(map, `${kind}-err`, buildSvgIcon(shapes[kind], '#dd0000')),
          ])
        )

        map.addSource('sensors', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: SENSORS.map(s => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
              properties: { id: s.id, type: s.type, kind: s.kind, label: s.label, layerId: '' },
            })),
          },
        })

        map.addLayer({
          id: 'sensors-dots',
          type: 'symbol',
          source: 'sensors',
          maxzoom: 15,
          layout: {
            'icon-image': ['concat', 'sq-', ['get', 'type']],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        })

        map.addLayer({
          id: 'sensors-icons',
          type: 'symbol',
          source: 'sensors',
          minzoom: 15,
          layout: {
            'icon-image': [
              'coalesce',
              ['image', ['concat', ['get', 'kind'], '-', ['get', 'type']]],
              ['image', ['concat', 'sq-',            ['get', 'type']]],
            ],
            'icon-allow-overlap': true,
            'icon-size': 1,
          },
        })

        ensureCyclingLayer()

        const handleSensorFeatureClick = (e: any) => {
          if (!e.features?.length) return
          const { id } = e.features[0].properties
          onSensorClickRef.current?.(id)
        }
        map.on('click', 'sensors-icons', handleSensorFeatureClick)
        map.on('mouseenter', 'sensors-icons', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'sensors-icons', () => { map.getCanvas().style.cursor = '' })

        projectsRef.current.forEach(p => renderProjectZone(map, mapboxgl, p))
      })

      // Freehand drawing — mousedown → drag → mouseup
      let isDrawing = false
      let lastPixel: { x: number; y: number } | null = null

      map.on('mousedown', (e: any) => {
        if (!drawModeRef.current) return
        isDrawing = true
        lastPixel = { x: e.point.x, y: e.point.y }
        drawCoordsRef.current = [[e.lngLat.lng, e.lngLat.lat]]
        map.dragPan.disable()
      })

      map.on('mousemove', (e: any) => {
        if (!drawModeRef.current || !isDrawing) return
        if (lastPixel) {
          const dx = e.point.x - lastPixel.x
          const dy = e.point.y - lastPixel.y
          if (dx * dx + dy * dy < 64) return // menos de 8 px, ignorar
        }
        lastPixel = { x: e.point.x, y: e.point.y }
        drawCoordsRef.current.push([e.lngLat.lng, e.lngLat.lat])
        if (drawCoordsRef.current.length >= 2) updateDrawLine(map, drawCoordsRef.current)
      })

      const finishDraw = () => {
        if (!isDrawing) return
        isDrawing = false
        lastPixel = null
        map.dragPan.enable()
        const coords = drawCoordsRef.current
        if (coords.length < 3) { clearDraw(map); return }
        const saved = [...coords]
        drawCoordsRef.current = []
        updateDrawLine(map, saved) // redibuja el polígono cerrado final
        onZoneComplete(saved)
      }

      map.on('mouseup', finishDraw)
      // Si el cursor sale del canvas durante el dibujo, cerrar igualmente
      map.getCanvas().addEventListener('mouseleave', finishDraw)

      mapRef.current = map
    })
    return () => {
      destroyed = true
      resizeObserver?.disconnect()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        mapLoadedRef.current = false
      }
    }
  }, [updateDrawLine, onZoneComplete, renderProjectZone])

  // Cuando pendingCoords se vacía (proyecto creado o cancelado), limpiar el polígono dibujado
  useEffect(() => {
    if (pendingCoords.length > 0) return
    const map = mapRef.current
    if (!map) return
    clearDraw(map)
  }, [pendingCoords, clearDraw])

  // Heatmap nativo de Mapbox
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const addHeatmap = () => {
      if (heatmapVisible) {
        if (map.getLayer('afluencia-heat')) return
        if (!map.getSource('afluencia')) {
          map.addSource('afluencia', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: AFLUENCIA_DATA.map(d => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
                properties: { weight: d.weight },
              })),
            },
          })
        }
        map.addLayer({
          id: 'afluencia-heat',
          type: 'heatmap',
          source: 'afluencia',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
            'heatmap-intensity': 1.5,
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 15, 60],
            'heatmap-opacity': 0.82,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,0,0)',
              0.15, '#4575b4',
              0.35, '#74add1',
              0.55, '#fdae61',
              0.75, '#f46d43',
              1,   '#d73027',
            ],
          },
        })
      } else {
        if (map.getLayer('afluencia-heat')) map.removeLayer('afluencia-heat')
        if (map.getSource('afluencia')) map.removeSource('afluencia')
      }
    }

    if (map.isStyleLoaded()) {
      addHeatmap()
    } else {
      map.once('load', addHeatmap)
    }
  }, [heatmapVisible])

  // Heatmap temperatura
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const addTemperaturaHeatmap = () => {
      if (temperaturaVisible) {
        if (map.getLayer('temperatura-heat')) return
        if (!map.getSource('temperatura')) {
          map.addSource('temperatura', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: TEMPERATURA_DATA.map(d => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
                properties: { temperatura: d.temperatura },
              })),
            },
          })
        }
        const beforeId = map.getLayer('sensors-dots') ? 'sensors-dots' : undefined
        map.addLayer({
          id: 'temperatura-heat',
          type: 'heatmap',
          source: 'temperatura',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'temperatura'], 14, 0, 34, 1],
            'heatmap-intensity': 1.2,
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 25, 15, 50],
            'heatmap-opacity': 0.75,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,    'rgba(0,0,0,0)',
              0.15, '#313695',
              0.35, '#74add1',
              0.55, '#fee090',
              0.75, '#f46d43',
              1,    '#a50026',
            ],
          },
        }, beforeId)
      } else {
        if (map.getLayer('temperatura-heat')) map.removeLayer('temperatura-heat')
        if (map.getSource('temperatura')) map.removeSource('temperatura')
      }
    }

    if (map.isStyleLoaded()) {
      addTemperaturaHeatmap()
    } else {
      map.once('load', addTemperaturaHeatmap)
    }
  }, [temperaturaVisible])

  // Cursor + dragPan on draw mode change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = drawMode ? 'crosshair' : ''
    if (!drawMode) map.dragPan.enable() // restaurar si se canceló mid-draw
  }, [drawMode])

  // Ocultar/mostrar sensors según modo, proyecto seleccionado y toggle manual
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const toggle = () => {
      const modeOk = mapMode === 'explorar' || (mapMode === 'proyectos' && selectedProjectId)
      const v = modeOk && sensorsVisible ? 'visible' : 'none'
      if (map.getLayer('sensors-dots'))  map.setLayoutProperty('sensors-dots',  'visibility', v)
      if (map.getLayer('sensors-icons')) map.setLayoutProperty('sensors-icons', 'visibility', v)
    }
    if (map.isStyleLoaded()) toggle()
    else map.once('load', toggle)
  }, [mapMode, selectedProjectId, sensorsVisible])

  // Filtrar sensores al polígono del proyecto seleccionado (o usar device markers filtrados)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('sensors') as any
    if (!source) return

    const p = selectedProjectId ? projects.find(pr => pr.id === selectedProjectId) : null

    let features: any[]
    if (p && projectDeviceMarkers) {
      features = projectDeviceMarkers.map(m => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: { type: m.type, kind: m.kind, label: m.label },
      }))
    } else if (p?.coords && p.coords.length >= 3) {
      features = activeSensors
        .filter(s => pointInPolygon([s.lng, s.lat], p.coords!))
        .map(s => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: { id: s.id, type: s.type, kind: s.kind, label: s.label, layerId: s.layerId ?? '' },
        }))
    } else {
      features = activeSensors.map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { id: s.id, type: s.type, kind: s.kind, label: s.label, layerId: s.layerId ?? '' },
      }))
    }

    source.setData({ type: 'FeatureCollection', features })
  }, [selectedProjectId, projects, projectDeviceMarkers, activeSensors])

  // Ajustar viewport al proyecto seleccionado
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedProjectId) return
    const p = projects.find(pr => pr.id === selectedProjectId)
    if (!p?.coords || p.coords.length < 2) return
    const lngs = p.coords.map(c => c[0])
    const lats = p.coords.map(c => c[1])
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 120, maxZoom: 17, duration: 600 }
    )
  }, [selectedProjectId, projects])

  // Añadir zonas y aplicar visibilidad según modo (un solo efecto para garantizar orden)
  useEffect(() => {
    const map = mapRef.current
    const mapboxgl = mapboxglRef.current
    if (!map || !mapboxgl) return

    const applyZones = () => {
      const v = mapMode === 'proyectos' ? 'visible' : 'none'
      projects.forEach(p => {
        renderProjectZone(map, mapboxgl, p)
        const sourceId = `proj-${p.id}`
        if (map.getLayer(`${sourceId}-fill`)) map.setLayoutProperty(`${sourceId}-fill`, 'visibility', v)
        if (map.getLayer(`${sourceId}-line`)) map.setLayoutProperty(`${sourceId}-line`, 'visibility', v)
        const marker = zoneMarkersRef.current[p.id]
        if (marker) marker.getElement().style.display = v === 'visible' ? '' : 'none'
      })
    }

    if (mapLoadedRef.current) {
      applyZones()
    } else {
      map.once('load', applyZones)
      return () => map.off('load', applyZones)
    }
  }, [projects, mapMode, renderProjectZone])

  // ── Opacidad por capa ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current || !layerOpacities) return

    // Capas sistema con su propia capa Mapbox
    const SYSTEM_TARGETS: Record<string, Array<{ id: string; prop: string }>> = {
      afluencia:   [{ id: 'afluencia-heat',      prop: 'heatmap-opacity' }],
      temperatura: [{ id: 'temperatura-heat',    prop: 'heatmap-opacity' }],
      bici:        [{ id: 'cycling-tiles-layer', prop: 'raster-opacity'  }],
    }
    for (const [layerId, opacity] of Object.entries(layerOpacities)) {
      const targets = SYSTEM_TARGETS[layerId]
      if (!targets) continue
      for (const { id, prop } of targets) {
        if (map.getLayer(id)) map.setPaintProperty(id, prop, opacity / 100)
      }
    }

    // Sensores: expresión case para aplicar opacidad por layerId
    // Las capas custom tienen su propio valor; los sensores base usan la opacidad global de 'sensores'
    const baseOpacity = (layerOpacities['sensores'] ?? 100) / 100
    const customCases: any[] = []
    for (const [id, opacity] of Object.entries(layerOpacities)) {
      if (!id.startsWith('custom_')) continue
      customCases.push(['==', ['get', 'layerId'], id], opacity / 100)
    }
    const opacityExpr = customCases.length > 0
      ? ['case', ...customCases, baseOpacity]
      : baseOpacity

    if (map.getLayer('sensors-dots'))  map.setPaintProperty('sensors-dots',  'icon-opacity', opacityExpr)
    if (map.getLayer('sensors-icons')) map.setPaintProperty('sensors-icons', 'icon-opacity', opacityExpr)
  }, [layerOpacities])

  // ── Isócrona (área a pie en N minutos) ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const SRC  = 'isochrone-src'
    const FILL = 'isochrone-fill'
    const LINE = 'isochrone-line'
    const PIN  = 'isochrone-pin'

    // Limpiar capas/fuentes si se desactiva el modo
    if (!isochroneMode) {
      if (map.getLayer(FILL)) map.removeLayer(FILL)
      if (map.getLayer(LINE)) map.removeLayer(LINE)
      if (map.getSource(SRC))  map.removeSource(SRC)
      // Eliminar marcador de origen si existe
      const pinEl = document.getElementById('isochrone-pin-el')
      if (pinEl) pinEl.remove()
      return
    }

    // Cursor crosshair mientras el modo está activo
    map.getCanvas().style.cursor = 'crosshair'

    const handleClick = async (e: any) => {
      if (!isochroneModeRef.current) return
      const { lng, lat } = e.lngLat

      // Marcador visual del punto de origen
      const existing = document.getElementById('isochrone-pin-el')
      if (existing) existing.remove()
      const pinEl = document.createElement('div')
      pinEl.id = 'isochrone-pin-el'
      pinEl.style.cssText = `
        width:14px; height:14px; border-radius:50%;
        background:#7c3aed; border:2px solid white;
        box-shadow:0 0 0 3px rgba(124,58,237,0.35);
        cursor:crosshair;
      `
      new mapboxglRef.current.Marker({ element: pinEl })
        .setLngLat([lng, lat])
        .addTo(map)

      // Llamada a Mapbox Isochrone API
      const token   = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
      const minutes = isochroneMinutesRef.current
      const url     = `https://api.mapbox.com/isochrone/v1/mapbox/walking/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${token}`

      try {
        const res  = await fetch(url)
        if (!res.ok) throw new Error(`Isochrone API error: ${res.status}`)
        const data = await res.json()

        if (!mapRef.current) return   // desmontado durante el fetch

        // Actualizar o crear fuente GeoJSON
        if (map.getSource(SRC)) {
          ;(map.getSource(SRC) as any).setData(data)
        } else {
          map.addSource(SRC, { type: 'geojson', data })
          map.addLayer({
            id:     FILL,
            type:   'fill',
            source: SRC,
            paint:  {
              'fill-color':   '#7c3aed',
              'fill-opacity': 0.12,
            },
          })
          map.addLayer({
            id:     LINE,
            type:   'line',
            source: SRC,
            paint:  {
              'line-color':   '#7c3aed',
              'line-width':   2,
              'line-opacity': 0.7,
            },
          })
        }
      } catch (err) {
        console.error('[Isochrone]', err)
      }
    }

    map.on('click', handleClick)

    return () => {
      map.off('click', handleClick)
      map.getCanvas().style.cursor = ''
    }
  }, [isochroneMode])

  // ── Capas GeoPackage ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !gpkgLayers?.length) return

    const applyGpkgLayers = () => {
      for (const layer of gpkgLayers) {
        const opacity    = layer.opacity / 100
        const visibility = layer.active ? 'visible' : 'none'

        // ── Capa raster (tiles GPKG) ────────────────────────────────────────
        if (layer.geometryType === 'raster') {
          const srcId = `gpkg-raster-src-${layer.id}`
          const lyrId = `gpkg-raster-lyr-${layer.id}`

          if (!map.getSource(srcId)) {
            map.addSource(srcId, {
              type:     'raster',
              tiles:    [`gpkg://${layer.id}/{z}/{x}/{y}`],
              bounds:   layer.tileBounds,
              minzoom:  layer.tileZoomRange?.[0] ?? 0,
              maxzoom:  layer.tileZoomRange?.[1] ?? 18,
              tileSize: 256,
            } as any)
          }

          if (!map.getLayer(lyrId)) {
            map.addLayer({
              id:     lyrId,
              type:   'raster',
              source: srcId,
              paint:  { 'raster-opacity': opacity },
              layout: { visibility },
            })
          } else {
            map.setPaintProperty(lyrId, 'raster-opacity', opacity)
            map.setLayoutProperty(lyrId, 'visibility', visibility)
          }
          continue
        }

        // ── Capa vectorial (GeoJSON) ────────────────────────────────────────
        const srcId = `gpkg-src-${layer.id}`

        if (map.getSource(srcId)) {
          ;(map.getSource(srcId) as any).setData(layer.geojson)
        } else {
          map.addSource(srcId, { type: 'geojson', data: layer.geojson as any })
        }

        const addLayerIfMissing = (id: string, def: object) => {
          if (!map.getLayer(id)) map.addLayer(def as any)
        }

        const { geometryType: gt, color, colorScheme } = layer

        const colorExpr: any = !colorScheme
          ? color
          : colorScheme.type === 'gradient'
            ? [
                'interpolate', ['linear'], ['get', colorScheme.property],
                ...colorScheme.stops!.flatMap(([v, c]) => [v, c]),
              ]
            : [
                'match',
                ['get', colorScheme.property],
                ...Object.entries(colorScheme.categories!).flatMap(([k, v]) =>
                  [colorScheme.isNumeric ? Number(k) : k, v]
                ),
                color,
              ]

        if (gt === 'point' || gt === 'mixed') {
          const cId = `${layer.id}-circle`
          addLayerIfMissing(cId, {
            id: cId, type: 'circle', source: srcId,
            filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
            paint: { 'circle-radius': 5, 'circle-color': colorExpr, 'circle-opacity': opacity, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' },
            layout: { visibility },
          })
          if (map.getLayer(cId)) {
            map.setPaintProperty(cId, 'circle-color', colorExpr)
            map.setPaintProperty(cId, 'circle-opacity', opacity)
            map.setLayoutProperty(cId, 'visibility', visibility)
          }
        }

        if (gt === 'linestring' || gt === 'mixed') {
          const lId = `${layer.id}-line`
          addLayerIfMissing(lId, {
            id: lId, type: 'line', source: srcId,
            filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
            paint: { 'line-color': colorExpr, 'line-width': 2, 'line-opacity': opacity },
            layout: { visibility, 'line-join': 'round', 'line-cap': 'round' },
          })
          if (map.getLayer(lId)) {
            map.setPaintProperty(lId, 'line-color', colorExpr)
            map.setPaintProperty(lId, 'line-opacity', opacity)
            map.setLayoutProperty(lId, 'visibility', visibility)
          }
        }

        if (gt === 'polygon' || gt === 'mixed') {
          const fId = `${layer.id}-fill`
          const oId = `${layer.id}-fill-outline`
          addLayerIfMissing(fId, {
            id: fId, type: 'fill', source: srcId,
            filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
            paint: { 'fill-color': colorExpr, 'fill-opacity': opacity * 0.35 },
            layout: { visibility },
          })
          addLayerIfMissing(oId, {
            id: oId, type: 'line', source: srcId,
            filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
            paint: { 'line-color': colorExpr, 'line-width': 1.5, 'line-opacity': opacity },
            layout: { visibility },
          })
          if (map.getLayer(fId)) {
            map.setPaintProperty(fId, 'fill-color', colorExpr)
            map.setPaintProperty(fId, 'fill-opacity', opacity * 0.35)
            map.setLayoutProperty(fId, 'visibility', visibility)
          }
          if (map.getLayer(oId)) {
            map.setPaintProperty(oId, 'line-color', colorExpr)
            map.setPaintProperty(oId, 'line-opacity', opacity)
            map.setLayoutProperty(oId, 'visibility', visibility)
          }
        }
      }
    } // end applyGpkgLayers

    if (mapLoadedRef.current) {
      applyGpkgLayers()
    } else {
      map.once('load', applyGpkgLayers)
      return () => map.off('load', applyGpkgLayers)
    }
  }, [gpkgLayers])

  // ── Registrar iconos de tipos personalizados al importar ─────────────────────
  useEffect(() => {
    if (!customKindIcons || Object.keys(customKindIcons).length === 0) return
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    for (const [kind, shapeId] of Object.entries(customKindIcons)) {
      if (map.hasImage(`${kind}-ok`)) continue   // ya registrado
      const shape = ICON_SHAPE_MAP[shapeId]
      if (!shape) continue
      loadMapImage(map, `${kind}-ok`,  buildSvgIcon(shape, '#00a63e'))
      loadMapImage(map, `${kind}-err`, buildSvgIcon(shape, '#dd0000'))
    }
  }, [customKindIcons])

  // ── Leyenda para capas GPKG con esquema de color ─────────────────────────────
  const legendLayers = useMemo(
    () => (gpkgLayers ?? []).filter(l => l.active && l.colorScheme),
    [gpkgLayers],
  )

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />

      {legendLayers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: 12,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {legendLayers.map(layer => (
            <div
              key={layer.id}
              style={{
                background: 'rgba(255,255,255,0.93)',
                borderRadius: 8,
                boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
                padding: '8px 12px',
                minWidth: 160,
                maxWidth: 240,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 11, color: '#333', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {layer.label}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 6, opacity: 0.7 }}>
                {layer.colorScheme!.property}
              </div>

              {layer.colorScheme!.type === 'gradient' ? (
                /* ── Leyenda de gradiente ── */
                (() => {
                  const stops = layer.colorScheme!.stops!
                  const grad  = stops.map(([, c]) => c).join(', ')
                  const min   = stops[0][0]
                  const max   = stops[stops.length - 1][0]
                  const fmt   = (v: number) =>
                    Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)
                  return (
                    <div>
                      <div style={{
                        height: 10,
                        borderRadius: 4,
                        background: `linear-gradient(to right, ${grad})`,
                        border: '1px solid rgba(0,0,0,0.1)',
                        marginBottom: 3,
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9, color: '#555' }}>{fmt(min)}</span>
                        <span style={{ fontSize: 9, color: '#555' }}>{fmt(max)}</span>
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* ── Leyenda categórica ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {Object.entries(layer.colorScheme!.categories!).map(([val, col]) => (
                    <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 12, height: 12,
                        borderRadius: layer.geometryType === 'point' ? '50%' : 3,
                        background: col, flexShrink: 0,
                        border: '1px solid rgba(0,0,0,0.12)',
                      }} />
                      <span style={{ fontSize: 10, color: '#222', lineHeight: 1.3, wordBreak: 'break-word' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
