/**
 * Detecta automáticamente un esquema de color para capas GPKG.
 *
 * Modos:
 *   'categorical' – propiedad con 2-30 valores distintos → match expression
 *   'gradient'    – propiedad numérica continua           → interpolate expression
 *
 * Prioridad:
 *   1. Ordinal semántico de strings  (baix/moderat/alt → azul/amarillo/rojo)
 *   2. Ordinal numérico              (secuencia 1..N)
 *   3. Categórico genérico
 *   4. Gradiente semántico           (NDVI, temperatura, ruido, cota…)
 *   5. Gradiente genérico            (cualquier numérico continuo)
 */

// Inline type to avoid circular webpack module factory issues
type GpkgColorScheme = {
  property:    string
  type:        'categorical' | 'gradient'
  categories?: Record<string, string>
  isNumeric?:  boolean
  stops?:      Array<[number, string]>
}

// ── Escala divergente ordinal ─────────────────────────────────────────────────
const ORDINAL_SCALE = ['#2166ac', '#74add1', '#fee090', '#f46d43', '#d73027']

const ORDINAL_VOCAB: [RegExp, number][] = [
  [/^(molt\s+bai[xg]a?|muy\s+baj[ao]|very\s+low|tr[eè]s\s+bas)$/i,      0],
  [/^(bai[xg]a?|baj[ao]|low|bas)$/i,                                     1],
  [/^(moderat[ao]?|moderado|moderate|mig|medio|media|medium|mitj[aà])$/i, 2],
  [/^(alt[ao]?|high|élevé)$/i,                                            3],
  [/^(molt\s+alt[ao]?|muy\s+alt[ao]|very\s+high|tr[eè]s\s+haut)$/i,      4],
]
function ordinalLevel(val: string): number | null {
  const v = val.trim().toLowerCase()
  for (const [re, level] of ORDINAL_VOCAB) if (re.test(v)) return level
  return null
}

// ── Paleta categórica ─────────────────────────────────────────────────────────
const PALETTE = [
  '#e91e63','#2196f3','#ff9800','#4caf50','#9c27b0',
  '#00bcd4','#ff5722','#607d8b','#795548','#3f51b5',
  '#f44336','#8bc34a','#ffc107','#009688','#673ab7',
  '#03a9f4','#cddc39','#e040fb','#00e676','#ff6d00',
  '#76ff03','#18ffff','#ffab40','#ea80fc','#b9f6ca',
  '#ffe57f','#84ffff','#ccff90','#ffd180','#ff9e80',
]

// ── Nombres prioritarios categóricos ─────────────────────────────────────────
const CAT_PROPS = [
  'confort','confort_termic','categoria_confort',
  'categoria','tipus','tipus_zona','tipus_element','tipus_paviment',
  'classificacio','classe','clase','codi_tipus',
  'descripcio','descripcion',
  'nivell','nivel','grau','grado',
  'type','category','zone_type',
  'estat','estado',
  'nom_tipus','nom_tipo','nom_clas','nom_classe','nom_subc','nom_subclas',
  'codi_clas','codi_classe',
  'coberta','covertype','landuse','land_use',
  'zona','districte','barri','district',
  'especie','species',
]

// ── Gradientes semánticos (nombre de columna → stops [valor, color]) ─────────
type Stops = Array<[number, string]>

const SEMANTIC_GRADIENTS: Array<{ pattern: RegExp; stops: (min: number, max: number) => Stops }> = [
  // NDVI / vegetación (verde)
  {
    pattern: /ndvi|vegetaci[oó]|greenness/i,
    stops: (min, max) => {
      const lo = Math.min(min, -0.1)
      const hi = Math.max(max,  0.5)
      return [
        [lo,   '#8B4513'],  // marrón — sin vegetación
        [-0.1, '#d4c9a0'],  // beige  — suelo desnudo
        [0.1,  '#d4e157'],  // amarillo-verde
        [0.4,  '#66bb6a'],  // verde
        [hi,   '#1b5e20'],  // verde oscuro — vegetación densa
      ]
    },
  },
  // Temperatura / confort térmico (frío → calor)
  {
    pattern: /temp|confort|heat|calor|thermal/i,
    stops: (min, max) => [
      [min,  '#313695'],
      [min + (max-min)*0.25, '#74add1'],
      [min + (max-min)*0.5,  '#fee090'],
      [min + (max-min)*0.75, '#f46d43'],
      [max,  '#a50026'],
    ],
  },
  // Ruido / soroll (verde=silencio → rojo=ruido)
  {
    pattern: /soroll|ruido|noise|db|decibel|leq|lden/i,
    stops: (min, max) => [
      [min,  '#1a9641'],
      [min + (max-min)*0.33, '#a6d96a'],
      [min + (max-min)*0.5,  '#ffffbf'],
      [min + (max-min)*0.67, '#fdae61'],
      [max,  '#d7191c'],
    ],
  },
  // Elevación / cota (azul=bajo → marrón → blanco=alto)
  {
    pattern: /elev|cota|alti|height|height_m|z$/i,
    stops: (min, max) => [
      [min,  '#313695'],
      [min + (max-min)*0.25, '#74c476'],
      [min + (max-min)*0.5,  '#d4b483'],
      [min + (max-min)*0.75, '#a67c52'],
      [max,  '#f7f7f7'],
    ],
  },
  // Densidad / intensidad genérica (blanco → azul oscuro)
  {
    pattern: /dens|count|num|total|suma|sum/i,
    stops: (min, max) => [
      [min, '#f7fbff'],
      [min + (max-min)*0.5, '#6baed6'],
      [max, '#08306b'],
    ],
  },
]

// ── API pública ───────────────────────────────────────────────────────────────

export function detectColorScheme(features: object[]): GpkgColorScheme | null {
  if (!features.length) return null

  const strVals: Record<string, Set<string>>  = {}
  const numVals: Record<string, Set<number>>  = {}
  const numStats: Record<string, { min: number; max: number; hasFloat: boolean }> = {}

  for (const feat of features as any[]) {
    const props = feat.properties ?? {}
    for (const [key, val] of Object.entries(props)) {
      if (val === null || val === undefined || val === '') continue
      if (typeof val === 'number' && isFinite(val)) {
        if (!numVals[key]) { numVals[key] = new Set(); numStats[key] = { min: val, max: val, hasFloat: false } }
        numVals[key].add(val)
        numStats[key].min = Math.min(numStats[key].min, val)
        numStats[key].max = Math.max(numStats[key].max, val)
        if (!Number.isInteger(val)) numStats[key].hasFloat = true
      } else {
        const s = String(val).trim()
        if (!s) continue
        if (!strVals[key]) strVals[key] = new Set()
        strVals[key].add(s)
      }
    }
  }

  // ── 1. Buscar propiedad categórica (2-30 valores) ─────────────────────────
  const isGoodStr = (k: string) => (strVals[k]?.size ?? 0) >= 2 && strVals[k].size <= 30
  const isGoodNum = (k: string) => (numVals[k]?.size ?? 0) >= 2 && numVals[k].size <= 20

  let catKey: string | null = null
  let catIsNum = false

  for (const p of CAT_PROPS) {
    if (isGoodStr(p)) { catKey = p; catIsNum = false; break }
    if (isGoodNum(p)) { catKey = p; catIsNum = true;  break }
    const fStr = Object.keys(strVals).find(k => k.toLowerCase() === p.toLowerCase())
    if (fStr && isGoodStr(fStr)) { catKey = fStr; catIsNum = false; break }
    const fNum = Object.keys(numVals).find(k => k.toLowerCase() === p.toLowerCase())
    if (fNum && isGoodNum(fNum)) { catKey = fNum; catIsNum = true;  break }
  }

  if (!catKey) {
    const sc = Object.keys(strVals).filter(isGoodStr).sort((a,b) => strVals[a].size - strVals[b].size)
    const nc = Object.keys(numVals).filter(isGoodNum).sort((a,b) => numVals[a].size - numVals[b].size)
    if (sc.length)      { catKey = sc[0]; catIsNum = false }
    else if (nc.length) { catKey = nc[0]; catIsNum = true  }
  }

  if (catKey) {
    const values = catIsNum
      ? Array.from(numVals[catKey]).map(String)
      : Array.from(strVals[catKey])

    const categories = catIsNum
      ? buildNumericOrdinalColors(Array.from(numVals[catKey]).sort((a,b) => a-b))
      : (buildOrdinalColors(values) ?? buildCategoricalColors(values))

    return { property: catKey, type: 'categorical', categories, isNumeric: catIsNum }
  }

  // ── 2. Buscar propiedad numérica continua para gradiente ──────────────────
  // Excluir IDs/fid y columnas con solo 1 valor único
  const SKIP = /^(fid|gid|objectid|id|ogc_fid)$/i

  // Primero probar nombres con semántica conocida
  for (const { pattern, stops } of SEMANTIC_GRADIENTS) {
    const key = Object.keys(numStats).find(k => !SKIP.test(k) && pattern.test(k))
    if (!key) continue
    const { min, max } = numStats[key]
    if (min === max) continue
    return { property: key, type: 'gradient', stops: stops(min, max) }
  }

  // Fallback: cualquier numérico continuo (tiene decimales o >20 valores únicos)
  const contKey = Object.keys(numStats).find(k =>
    !SKIP.test(k) && (numStats[k].hasFloat || (numVals[k]?.size ?? 0) > 20)
  )
  if (contKey) {
    const { min, max } = numStats[contKey]
    if (min !== max) {
      return {
        property: contKey,
        type:     'gradient',
        stops:    buildDefaultGradient(min, max),
      }
    }
  }

  return null
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function buildNumericOrdinalColors(nums: number[]): Record<string,string> {
  const n = nums.length
  const categories: Record<string,string> = {}
  nums.forEach((v, i) => {
    const idx = n === 1 ? 2 : Math.round((i/(n-1)) * (ORDINAL_SCALE.length-1))
    categories[String(v)] = ORDINAL_SCALE[idx]
  })
  return categories
}

function buildOrdinalColors(values: string[]): Record<string,string> | null {
  const leveled: Array<{val:string;level:number}> = []
  for (const v of values) {
    const l = ordinalLevel(v)
    if (l === null) return null
    leveled.push({ val: v, level: l })
  }
  const unique = Array.from(new Set(leveled.map(x => x.level))).sort((a,b) => a-b)
  const n = unique.length
  const categories: Record<string,string> = {}
  for (const { val, level } of leveled) {
    const rank = unique.indexOf(level)
    const idx  = n === 1 ? 2 : Math.round((rank/(n-1)) * (ORDINAL_SCALE.length-1))
    categories[val] = ORDINAL_SCALE[idx]
  }
  return categories
}

function buildCategoricalColors(values: string[]): Record<string,string> {
  const sorted = [...values].sort((a,b) => a.localeCompare(b, 'ca'))
  const categories: Record<string,string> = {}
  sorted.forEach((v, i) => { categories[v] = PALETTE[i % PALETTE.length] })
  return categories
}

function buildDefaultGradient(min: number, max: number): Stops {
  const mid = (min + max) / 2
  return [
    [min, '#2166ac'],
    [mid, '#f7f7f7'],
    [max, '#d73027'],
  ]
}
