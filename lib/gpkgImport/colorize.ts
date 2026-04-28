/**
 * Detecta automáticamente un esquema de color para capas GPKG.
 *
 * Modos de asignación (por orden de prioridad):
 *   1. Ordinal semántico de strings  → bajo/medio/alto → azul/amarillo/rojo
 *   2. Ordinal numérico              → secuencia 1..N  → azul/amarillo/rojo
 *   3. Categórico (fallback)         → paleta de 20 colores
 */

// ── Escala divergente: muy-bajo → azul, medio → amarillo, muy-alto → rojo ────
const ORDINAL_SCALE = ['#2166ac', '#74add1', '#fee090', '#f46d43', '#d73027']

// Vocabulario ordinal por nivel (0=muy bajo … 4=muy alto)
const ORDINAL_VOCAB: [RegExp, number][] = [
  [/^(molt\s+bai[xg]a?|muy\s+baj[ao]|very\s+low|tr[eè]s\s+bas)$/i,   0],
  [/^(bai[xg]a?|baj[ao]|low|bas)$/i,                                  1],
  [/^(moderat[ao]?|moderado|moderate|mig|medio|media|medium|mitj[aà])$/i, 2],
  [/^(alt[ao]?|high|élevé)$/i,                                         3],
  [/^(molt\s+alt[ao]?|muy\s+alt[ao]|very\s+high|tr[eè]s\s+haut)$/i,   4],
]

function ordinalLevel(val: string): number | null {
  const v = val.trim().toLowerCase()
  for (const [re, level] of ORDINAL_VOCAB) {
    if (re.test(v)) return level
  }
  return null
}

// ── Paleta categórica (fallback) ──────────────────────────────────────────────
const PALETTE = [
  '#e91e63', '#2196f3', '#ff9800', '#4caf50', '#9c27b0',
  '#00bcd4', '#ff5722', '#607d8b', '#795548', '#3f51b5',
  '#f44336', '#8bc34a', '#ffc107', '#009688', '#673ab7',
  '#03a9f4', '#cddc39', '#e040fb', '#00e676', '#ff6d00',
]

// ── Nombres de columna prioritarios ──────────────────────────────────────────
const PRIORITY_PROPS = [
  'confort', 'confort_termic', 'categoria_confort',
  'categoria', 'tipus', 'tipus_zona', 'tipus_element', 'tipus_paviment',
  'classificacio', 'classe', 'clase', 'codi_tipus',
  'descripcio', 'descripcion',
  'nivell', 'nivel', 'grau', 'grado',
  'type', 'category', 'zone_type',
  'estat', 'estado',
  'nom_tipus', 'nom_tipo',
  'zona', 'districte', 'barri',
]

export interface ColorScheme {
  property:   string
  categories: Record<string, string>  // clave string → color hex
  isNumeric:  boolean                 // true si los valores originales son números
}

// ─────────────────────────────────────────────────────────────────────────────

export function detectColorScheme(features: object[]): ColorScheme | null {
  if (!features.length) return null

  // 1. Recopilar valores únicos por propiedad
  //    Separamos en dos pistas: string y number, para conservar el tipo original
  const strValues: Record<string, Set<string>> = {}
  const numValues: Record<string, Set<number>> = {}

  for (const feat of features as any[]) {
    const props = feat.properties ?? {}
    for (const [key, val] of Object.entries(props)) {
      if (val === null || val === undefined || val === '') continue
      if (typeof val === 'number' && isFinite(val)) {
        if (!numValues[key]) numValues[key] = new Set()
        numValues[key].add(val)
      } else {
        const s = String(val).trim()
        if (!s) continue
        if (!strValues[key]) strValues[key] = new Set()
        strValues[key].add(s)
      }
    }
  }

  const isGoodStr = (k: string) => strValues[k]?.size >= 2 && strValues[k].size <= 20
  const isGoodNum = (k: string) => numValues[k]?.size >= 2 && numValues[k].size <= 20

  // 2. Buscar la mejor columna: nombres prioritarios primero
  let bestKey:     string | null = null
  let bestIsNum    = false

  for (const p of PRIORITY_PROPS) {
    // Comprobación exacta
    if (isGoodStr(p)) { bestKey = p; bestIsNum = false; break }
    if (isGoodNum(p)) { bestKey = p; bestIsNum = true;  break }
    // Insensible a mayúsculas
    const foundStr = Object.keys(strValues).find(k => k.toLowerCase() === p.toLowerCase())
    if (foundStr && isGoodStr(foundStr)) { bestKey = foundStr; bestIsNum = false; break }
    const foundNum = Object.keys(numValues).find(k => k.toLowerCase() === p.toLowerCase())
    if (foundNum && isGoodNum(foundNum)) { bestKey = foundNum; bestIsNum = true;  break }
  }

  // Fallback: cualquier columna válida (menos valores primero)
  if (!bestKey) {
    const strCandidates = Object.keys(strValues).filter(isGoodStr)
      .sort((a, b) => strValues[a].size - strValues[b].size)
    const numCandidates = Object.keys(numValues).filter(isGoodNum)
      .sort((a, b) => numValues[a].size - numValues[b].size)

    if (strCandidates.length) { bestKey = strCandidates[0]; bestIsNum = false }
    else if (numCandidates.length) { bestKey = numCandidates[0]; bestIsNum = true }
  }

  if (!bestKey) return null

  // 3. Construir el mapa de colores según el tipo y contenido
  let categories: Record<string, string>

  if (bestIsNum) {
    const nums = Array.from(numValues[bestKey]).sort((a, b) => a - b)
    categories = buildNumericOrdinalColors(nums)
  } else {
    const vals = Array.from(strValues[bestKey])
    categories = buildOrdinalColors(vals) ?? buildCategoricalColors(vals)
  }

  return { property: bestKey, categories, isNumeric: bestIsNum }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Valores numéricos ordenados → escala ordinal (min=azul, max=rojo). */
function buildNumericOrdinalColors(nums: number[]): Record<string, string> {
  const n = nums.length
  const categories: Record<string, string> = {}
  nums.forEach((v, i) => {
    const colorIdx = n === 1 ? 2 : Math.round((i / (n - 1)) * (ORDINAL_SCALE.length - 1))
    categories[String(v)] = ORDINAL_SCALE[colorIdx]
  })
  return categories
}

/**
 * Si TODOS los valores tienen nivel ordinal reconocido, asigna la escala divergente.
 * Si alguno es desconocido, devuelve null.
 */
function buildOrdinalColors(values: string[]): Record<string, string> | null {
  const leveled: Array<{ val: string; level: number }> = []
  for (const v of values) {
    const l = ordinalLevel(v)
    if (l === null) return null
    leveled.push({ val: v, level: l })
  }
  const uniqueLevels = Array.from(new Set(leveled.map(x => x.level))).sort((a, b) => a - b)
  const n = uniqueLevels.length
  const categories: Record<string, string> = {}
  for (const { val, level } of leveled) {
    const rank = uniqueLevels.indexOf(level)
    const colorIdx = n === 1 ? 2 : Math.round((rank / (n - 1)) * (ORDINAL_SCALE.length - 1))
    categories[val] = ORDINAL_SCALE[colorIdx]
  }
  return categories
}

/** Paleta categórica por orden alfabético. */
function buildCategoricalColors(values: string[]): Record<string, string> {
  const sorted = [...values].sort((a, b) => a.localeCompare(b, 'ca'))
  const categories: Record<string, string> = {}
  sorted.forEach((v, i) => { categories[v] = PALETTE[i % PALETTE.length] })
  return categories
}
