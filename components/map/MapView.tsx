'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MAPBOX_TOKEN, SENSORS, MAP_CENTER, MAP_ZOOM, AFLUENCIA_DATA } from '@/lib/data'
import { Project, MapMode } from '@/types'

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

interface MapViewProps {
  drawMode: boolean
  mapMode: MapMode
  projects: Project[]
  pendingCoords: number[][]
  selectedProjectId: string | null
  onZoneComplete: (coords: number[][]) => void
  onProjectClick: (project: Project) => void
  heatmapVisible?: boolean
}

export function MapView({ drawMode, mapMode, projects, pendingCoords, selectedProjectId, onZoneComplete, onProjectClick, heatmapVisible = false }: MapViewProps) {
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
  const projectsRef = useRef(projects)
  onProjectClickRef.current = onProjectClick
  projectsRef.current = projects
  drawModeRef.current = drawMode
  mapModeRef.current = mapMode

  const updateDrawLine = useCallback((map: any, coords: number[][], closed = false) => {
    const geojson: any = {
      type: 'Feature',
      geometry: closed
        ? { type: 'Polygon', coordinates: [coords] }
        : { type: 'LineString', coordinates: coords },
    }
    if (!map.getSource('draw-source')) {
      map.addSource('draw-source', { type: 'geojson', data: geojson })
      if (!closed) {
        map.addLayer({ id: 'draw-line', type: 'line', source: 'draw-source', paint: { 'line-color': '#0070f3', 'line-width': 2, 'line-dasharray': [4, 3] } })
      }
    } else {
      map.getSource('draw-source').setData(geojson)
      if (closed) {
        if (map.getLayer('draw-line')) map.removeLayer('draw-line')
        if (!map.getLayer('draw-fill')) {
          map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-source', paint: { 'fill-color': '#0070f3', 'fill-opacity': 0.1 } })
        }
      }
    }
  }, [])

  const renderProjectZone = useCallback((map: any, mapboxgl: any, p: Project) => {
    if (!p.coords || p.coords.length < 3) return
    const sourceId = `proj-${p.id}`
    if (map.getSource(sourceId)) return
    const coords = [...p.coords, p.coords[0]]
    map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } } })
    map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId, layout: { visibility: 'none' }, paint: { 'fill-color': '#0070f3', 'fill-opacity': 0.18 } })
    map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId, layout: { visibility: 'none' }, paint: { 'line-color': '#0070f3', 'line-width': 2 } })
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

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxglRef.current = mapboxgl

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
      
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        attributionControl: false,
      })
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
      map.addControl(new mapboxgl.AttributionControl({ compact: true }))

      map.on('load', async () => {
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

        const svgIcon = (shape: string, border: string) =>
          `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
            <rect width="28" height="28" rx="5" fill="white" stroke="${border}" stroke-width="1.5"/>
            ${shape}
          </svg>`

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

        const loadSvg = (id: string, svg: string) => new Promise<void>(resolve => {
          const img = new Image(28, 28)
          img.onload = () => { map.addImage(id, img); resolve() }
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        })

        await Promise.all(
          (['banco', 'luminaria', 'jardinera'] as const).flatMap(kind => [
            loadSvg(`${kind}-ok`,  svgIcon(shapes[kind], '#00a63e')),
            loadSvg(`${kind}-err`, svgIcon(shapes[kind], '#dd0000')),
          ])
        )

        map.addSource('sensors', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: SENSORS.map(s => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
              properties: { type: s.type, kind: s.kind, label: s.label },
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
            'icon-image': ['concat', ['get', 'kind'], '-', ['get', 'type']],
            'icon-allow-overlap': true,
            'icon-size': 1,
          },
        })

        map.on('click', 'sensors-icons', (e: any) => {
          if (!e.features?.length) return
          const { label, kind, type } = e.features[0].properties
          const [lng, lat] = e.features[0].geometry.coordinates
          new mapboxgl.Popup({ offset: 14, closeButton: false })
            .setLngLat([lng, lat])
            .setHTML(`<div style="font-size:12px;font-family:-apple-system,sans-serif;color:#111;">${label}<br><span style="font-size:10px;color:#888;">${kind} · ${type === 'ok' ? 'Online' : 'Alerta'}</span></div>`)
            .addTo(map)
        })
        map.on('mouseenter', 'sensors-icons', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'sensors-icons', () => { map.getCanvas().style.cursor = '' })

        projectsRef.current.forEach(p => renderProjectZone(map, mapboxgl, p))
      })

      map.on('click', (e: any) => {
        if (!drawModeRef.current) return
        const c = [e.lngLat.lng, e.lngLat.lat]
        drawCoordsRef.current.push(c)
        const dot = document.createElement('div')
        dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#0070f3;border:2px solid white;box-shadow:0 0 0 2px rgba(0,112,243,0.3);pointer-events:none;'
        drawMarkersRef.current.push(new mapboxgl.Marker({ element: dot }).setLngLat(c as [number, number]).addTo(map))
        if (drawCoordsRef.current.length >= 2) {
          updateDrawLine(map, drawCoordsRef.current)
        }
      })

      map.on('dblclick', (e: any) => {
        if (!drawModeRef.current || drawCoordsRef.current.length < 3) return
        e.preventDefault()
        const closed = [...drawCoordsRef.current, drawCoordsRef.current[0]]
        updateDrawLine(map, closed, true)
        const savedCoords = [...drawCoordsRef.current]
        // Solo eliminar los marcadores (puntos) — el polígono permanece visible
        drawMarkersRef.current.forEach(m => m.remove())
        drawMarkersRef.current = []
        drawCoordsRef.current = []
        onZoneComplete(savedCoords)
      })

      mapRef.current = map
    })
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

  // Cursor on draw mode change
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getCanvas().style.cursor = drawMode ? 'crosshair' : ''
  }, [drawMode])

  // Ocultar/mostrar sensors según modo y proyecto seleccionado
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const toggle = () => {
      const v = mapMode === 'explorar' || (mapMode === 'proyectos' && selectedProjectId) ? 'visible' : 'none'
      if (map.getLayer('sensors-dots'))  map.setLayoutProperty('sensors-dots',  'visibility', v)
      if (map.getLayer('sensors-icons')) map.setLayoutProperty('sensors-icons', 'visibility', v)
    }
    if (map.isStyleLoaded()) toggle()
    else map.once('load', toggle)
  }, [mapMode, selectedProjectId])

  // Filtrar sensores al polígono del proyecto seleccionado
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('sensors') as any
    if (!source) return

    const p = selectedProjectId ? projects.find(pr => pr.id === selectedProjectId) : null
    const features = (p?.coords && p.coords.length >= 3)
      ? SENSORS
          .filter(s => pointInPolygon([s.lng, s.lat], p.coords!))
          .map(s => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
            properties: { type: s.type, kind: s.kind, label: s.label },
          }))
      : SENSORS.map(s => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: { type: s.type, kind: s.kind, label: s.label },
        }))

    source.setData({ type: 'FeatureCollection', features })
  }, [selectedProjectId, projects])

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

  return <div ref={containerRef} className="absolute inset-0" />
}
