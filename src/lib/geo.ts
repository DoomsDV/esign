// Catálogo geográfico SIFEN (Código de Referencia Geográfica SET).
// Fuente: documentacion oficial XLSX convertida a JSON.
import catalog from '@/data/geo-py.json'

export interface GeoItem {
  cod: number
  desc: string
}

export interface DistritoItem extends GeoItem {
  dep: number
}

export interface CiudadItem extends GeoItem {
  dis: number
}

export const DEPARTAMENTOS = catalog.departamentos as GeoItem[]
export const DISTRITOS = catalog.distritos as DistritoItem[]
export const CIUDADES = catalog.ciudades as CiudadItem[]

const depByCod = new Map(DEPARTAMENTOS.map((d) => [d.cod, d]))
const disByCod = new Map(DISTRITOS.map((d) => [d.cod, d]))
const ciuByCod = new Map(CIUDADES.map((c) => [c.cod, c]))

export function findDepartamento(cod: number): GeoItem | undefined {
  return depByCod.get(cod)
}

export function findDistrito(cod: number): DistritoItem | undefined {
  return disByCod.get(cod)
}

export function findCiudad(cod: number): CiudadItem | undefined {
  return ciuByCod.get(cod)
}

export function distritosByDepartamento(depCod: number): DistritoItem[] {
  return DISTRITOS.filter((d) => d.dep === depCod)
}

export function ciudadesByDistrito(disCod: number): CiudadItem[] {
  return CIUDADES.filter((c) => c.dis === disCod)
}

/** Title Case legible para UI (el valor enviado a SIFEN sigue siendo el del catálogo). */
export function geoLabel(desc: string): string {
  if (!desc) return ''
  return desc
    .toLowerCase()
    .replace(/(^|[\s\-/,.°()]+)([a-záéíóúüñ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
