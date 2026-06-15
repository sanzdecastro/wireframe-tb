/**
 * Genera public/lst_timeseries.json a partir de los GeoTIFF de LST en
 * public/lst/.
 *
 * Automatización de fechas: cada imagen LST lleva su fecha ISO en el nombre,
 *   Barcelona_LST_2024-07-15.tif → date "2024-07-15"
 * Sueltas el .tif (con la fecha en el nombre) dentro de public/lst/ y, al
 * ejecutar este script (predev/prebuild), la fecha entra sola en el
 * manifiesto. Sin tocar código.
 *
 * Además, abre cada ráster con geotiff.js y calcula el min/max GLOBAL de toda
 * la serie (ignorando nodata) → `domain`. Ese dominio se usa en runtime para
 * colorear todos los frames con la MISMA escala, de modo que los colores sean
 * comparables a lo largo del tiempo (un julio caluroso se ve más caliente que
 * un enero suave, en vez de re-normalizar cada imagen por separado).
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fromArrayBuffer } from 'geotiff'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')
const LST_DIR    = join(PUBLIC_DIR, 'lst')   // carpeta dedicada a los frames LST
const OUT_FILE   = join(PUBLIC_DIR, 'lst_timeseries.json')

// Cualquier GeoTIFF dentro de public/lst/ cuenta como frame de la serie.
const LST_RE  = /\.tiff?$/i
const DATE_RE = /(\d{4}-\d{2}-\d{2})/

/** min/max de la banda 0 ignorando nodata; null si no hay valores válidos. */
async function rasterStats(path) {
  const buf  = await readFile(path)
  const ab   = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const tiff = await fromArrayBuffer(ab)
  const img  = await tiff.getImage()
  const band = (await img.readRasters({ interleave: false }))[0]
  const nd   = img.getGDALNoData()
  const nodata = typeof nd === 'number' ? nd : null

  let min = Infinity, max = -Infinity
  for (let i = 0; i < band.length; i++) {
    const v = band[i]
    if (!Number.isFinite(v) || (nodata !== null && v === nodata)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  return Number.isFinite(min) ? { min, max } : null
}

async function main() {
  let names = []
  try {
    names = (await readdir(LST_DIR)).filter(f => LST_RE.test(f))
  } catch {
    console.warn('[gen-lst-manifest] No existe la carpeta public/lst/ (créala y mete ahí los GeoTIFF de LST)')
  }
  if (names.length === 0) {
    console.warn('[gen-lst-manifest] No se encontró ningún .tif en public/lst/')
    await writeFile(OUT_FILE, JSON.stringify({ domain: null, frames: [] }, null, 2))
    return
  }

  const frames = []
  let gMin = Infinity, gMax = -Infinity

  for (const name of names) {
    const file = `lst/${name}`   // ruta relativa a public/, servida en runtime
    const date = (name.match(DATE_RE) ?? [])[1] ?? null
    let stats = null
    try {
      stats = await rasterStats(join(LST_DIR, name))
    } catch (err) {
      console.warn(`[gen-lst-manifest] No se pudieron leer estadísticas de ${name}:`, err.message)
    }
    if (stats) {
      if (stats.min < gMin) gMin = stats.min
      if (stats.max > gMax) gMax = stats.max
    }
    frames.push({ file, date })
  }

  // Orden cronológico ascendente; los sin fecha al final.
  frames.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    if (a.date) return -1
    if (b.date) return 1
    return a.file < b.file ? -1 : 1
  })

  const domain = Number.isFinite(gMin) ? [gMin, gMax] : null
  await writeFile(OUT_FILE, JSON.stringify({ domain, frames }, null, 2))
  console.log(
    `[gen-lst-manifest] ${frames.length} frame(s) → public/lst_timeseries.json` +
    (domain ? ` (dominio ${domain[0].toFixed(2)}…${domain[1].toFixed(2)})` : '')
  )
}

main().catch(err => { console.error(err); process.exit(1) })
