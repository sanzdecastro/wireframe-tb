/**
 * Rampa de color Viridis (perceptualmente uniforme, estándar en teledetección).
 * Se usa tanto para pintar el ráster en el canvas como para la leyenda.
 */

// Puntos de control de Viridis en [t, [r, g, b]] con t ∈ [0, 1]
const VIRIDIS_ANCHORS: Array<[number, [number, number, number]]> = [
  [0.0,  [68,  1,   84]],   // #440154
  [0.25, [59,  82,  139]],  // #3b528b
  [0.5,  [33,  145, 140]],  // #21918c
  [0.75, [94,  201, 98]],   // #5ec962
  [1.0,  [253, 231, 37]],   // #fde725
]

/** Devuelve el color RGB de Viridis para t ∈ [0, 1] (interpolación lineal). */
export function viridisRGB(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t))
  for (let i = 1; i < VIRIDIS_ANCHORS.length; i++) {
    const [t1, c1] = VIRIDIS_ANCHORS[i]
    if (x <= t1) {
      const [t0, c0] = VIRIDIS_ANCHORS[i - 1]
      const f = (x - t0) / (t1 - t0 || 1)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ]
    }
  }
  return VIRIDIS_ANCHORS[VIRIDIS_ANCHORS.length - 1][1]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * Genera stops [valor, hex] para una leyenda de gradiente Viridis
 * mapeada al rango real [min, max].
 */
export function viridisStops(min: number, max: number, n = 5): Array<[number, string]> {
  const stops: Array<[number, string]> = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    stops.push([min + (max - min) * t, toHex(viridisRGB(t))])
  }
  return stops
}
