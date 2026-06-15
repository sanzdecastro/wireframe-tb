/**
 * Registro de rampas de color para rásters.
 *
 * Cada rampa es una lista de anchors [t, [r,g,b]] con t ∈ [0,1]. Se usan tanto
 * para pintar el ráster en el canvas (`rampRGB`) como para generar la leyenda
 * de gradiente (`rampStops`). Todas son progresivas (claro↔oscuro) para que el
 * mapa siga siendo legible.
 */

export type RampName = 'viridis' | 'inferno' | 'ndvi' | 'magma' | 'reds'

type Anchor = [number, [number, number, number]]

const RAMPS: Record<RampName, Anchor[]> = {
  // Perceptualmente uniforme, estándar en teledetección (default).
  viridis: [
    [0.0,  [68,  1,   84]],
    [0.25, [59,  82,  139]],
    [0.5,  [33,  145, 140]],
    [0.75, [94,  201, 98]],
    [1.0,  [253, 231, 37]],
  ],
  // Calor: morado oscuro → rojo → amarillo. Para temperatura superficial (LST).
  inferno: [
    [0.0,  [0,   0,   4]],
    [0.25, [66,  10,  104]],
    [0.5,  [147, 38,  103]],
    [0.75, [221, 81,  58]],
    [1.0,  [252, 255, 164]],
  ],
  // Vegetación: marrón → tan → amarillo pálido → verde. Para NDVI.
  ndvi: [
    [0.0,  [155, 74,  27]],
    [0.3,  [205, 170, 110]],
    [0.5,  [247, 247, 182]],
    [0.7,  [140, 198, 63]],
    [1.0,  [26,  110, 26]],
  ],
  // Negro → magenta → crema. Para superficie construida (NDBI), contrasta con NDVI.
  magma: [
    [0.0,  [0,   0,   4]],
    [0.25, [59,  15,  112]],
    [0.5,  [140, 41,  129]],
    [0.75, [222, 73,  104]],
    [1.0,  [252, 253, 191]],
  ],
  // Claro → rojo intenso. Para nivel de estrés térmico (UTFVI).
  reds: [
    [0.0,  [255, 245, 240]],
    [0.25, [252, 187, 161]],
    [0.5,  [251, 106, 74]],
    [0.75, [222, 45,  38]],
    [1.0,  [153, 0,   13]],
  ],
}

/** Color RGB de la rampa `name` para t ∈ [0,1] (interpolación lineal). */
export function rampRGB(name: RampName, t: number): [number, number, number] {
  const anchors = RAMPS[name] ?? RAMPS.viridis
  const x = Math.max(0, Math.min(1, t))
  for (let i = 1; i < anchors.length; i++) {
    const [t1, c1] = anchors[i]
    if (x <= t1) {
      const [t0, c0] = anchors[i - 1]
      const f = (x - t0) / (t1 - t0 || 1)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ]
    }
  }
  return anchors[anchors.length - 1][1]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * Genera stops [valor, hex] para una leyenda de gradiente con la rampa `name`,
 * mapeada al rango real [min, max].
 */
export function rampStops(
  name: RampName,
  min:  number,
  max:  number,
  n = 5,
): Array<[number, string]> {
  const stops: Array<[number, string]> = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    stops.push([min + (max - min) * t, toHex(rampRGB(name, t))])
  }
  return stops
}
