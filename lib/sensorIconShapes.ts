/**
 * Formas de iconos para sensores/dispositivos en el mapa.
 * Cada `svg` contiene los elementos SVG internos para un viewBox de 28×28.
 * El fondo (rect blanco con borde de color) lo añade MapView.
 */
export interface IconShape {
  id:    string
  label: string
  svg:   string
}

export const ICON_SHAPES: IconShape[] = [
  {
    id: 'pin', label: 'Pin',
    svg: `<path d="M14 3C10 3 7 6 7 10C7 15.5 14 24 14 24C14 24 21 15.5 21 10C21 6 18 3 14 3Z" fill="#333"/><circle cx="14" cy="10" r="3" fill="white"/>`,
  },
  {
    id: 'circle', label: 'Círculo',
    svg: `<circle cx="14" cy="14" r="8" fill="#333"/>`,
  },
  {
    id: 'diamond', label: 'Rombo',
    svg: `<path d="M14 4L23 14L14 24L5 14Z" fill="#333"/>`,
  },
  {
    id: 'star', label: 'Estrella',
    svg: `<path d="M14 3.5L16.2 10.5H23.5L17.7 14.8L19.9 21.8L14 17.5L8.1 21.8L10.3 14.8L4.5 10.5H11.8Z" fill="#333"/>`,
  },
  {
    id: 'trash', label: 'Contenedor',
    svg: `<rect x="9" y="10" width="10" height="13" rx="1.5" fill="#333"/><rect x="7" y="7.5" width="14" height="2.5" rx="1" fill="#333"/><rect x="11.5" y="5" width="5" height="2.5" rx="1" fill="#333"/><rect x="11.5" y="12.5" width="1.5" height="7" rx="0.75" fill="white"/><rect x="15" y="12.5" width="1.5" height="7" rx="0.75" fill="white"/>`,
  },
  {
    id: 'tree', label: 'Árbol',
    svg: `<path d="M14 3L22 18H6Z" fill="#388E3C"/><path d="M14 9L20 21H8Z" fill="#2E7D32"/><rect x="12" y="20" width="4" height="5" rx="1" fill="#795548"/>`,
  },
  {
    id: 'semaforo', label: 'Semáforo',
    svg: `<rect x="10" y="3" width="8" height="22" rx="3" fill="#333"/><circle cx="14" cy="8" r="2" fill="#EF5350"/><circle cx="14" cy="14" r="2" fill="#FFC107"/><circle cx="14" cy="20" r="2" fill="#4CAF50"/>`,
  },
  {
    id: 'bolt', label: 'Eléctrico',
    svg: `<path d="M16 3L8 15H14L12 25L20 13H14Z" fill="#333"/>`,
  },
  {
    id: 'drop', label: 'Agua',
    svg: `<path d="M14 4C14 4 7 13 7 17.5C7 21.1 10.1 24 14 24C17.9 24 21 21.1 21 17.5C21 13 14 4 14 4Z" fill="#333"/>`,
  },
  {
    id: 'building', label: 'Edificio',
    svg: `<rect x="7" y="10" width="14" height="15" rx="1" fill="#333"/><rect x="10" y="4" width="8" height="7" rx="1" fill="#555"/><rect x="9" y="17" width="3.5" height="8" rx="0.5" fill="white"/><rect x="15.5" y="17" width="3.5" height="8" rx="0.5" fill="white"/>`,
  },
  {
    id: 'person', label: 'Persona',
    svg: `<circle cx="14" cy="7.5" r="3.5" fill="#333"/><path d="M7 24C7 19.03 10.13 15 14 15C17.87 15 21 19.03 21 24Z" fill="#333"/>`,
  },
  {
    id: 'car', label: 'Vehículo',
    svg: `<rect x="3" y="14" width="22" height="8" rx="2" fill="#333"/><path d="M7 14L9.5 8.5H18.5L21 14Z" fill="#555"/><circle cx="8.5" cy="22" r="2.5" fill="#666"/><circle cx="19.5" cy="22" r="2.5" fill="#666"/>`,
  },
]

/** Mapa id → svg para lookups O(1) */
export const ICON_SHAPE_MAP: Record<string, string> = Object.fromEntries(
  ICON_SHAPES.map(s => [s.id, s.svg])
)

/** ID por defecto para nuevos tipos personalizados */
export const DEFAULT_ICON_SHAPE = 'pin'
