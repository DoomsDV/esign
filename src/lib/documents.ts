// Capa de datos de documentos: consume el panel ORDS (/api/v1/documents) y helpers de
// presentacion (estado, tipo de DE, moneda). El XML se descarga con fetch autenticado
// (el endpoint devuelve XML crudo, no el envelope JSON).
import { apiFetch, ApiError, refreshSession, isTokenExpired } from './api'
import { ORDS_BASE, type Environment } from './env'

export type DocEstado = 'BORRADOR' | 'FIRMADO' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO'

export interface DocumentListItem {
  cdc: string
  tipo_de: number
  environment: string
  num_documento: string
  estado: DocEstado
  cod_res: string | null
  prot_aut: string | null
  receptor_nombre: string | null
  moneda: string
  total_operacion: number | null
  fecha_emision: string | null
}

export interface DocumentDetail extends DocumentListItem {
  establecimiento: string
  punto_expedicion: string
  mensaje_res: string | null
  receptor_doc: string | null
}

export interface DocumentListParams {
  environment: Environment
  estado?: string
  tipo?: number
  page?: number
  pageSize?: number
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function listDocuments(token: string, params: DocumentListParams): Promise<Paged<DocumentListItem>> {
  // Listado por POST con filtros en el body (los query-params no ligan en esta instancia ORDS).
  const env = await apiFetch<DocumentListItem[]>('/documents/search', {
    token,
    method: 'POST',
    body: {
      environment: params.environment,
      estado: params.estado || null,
      tipo: params.tipo ?? null,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  })
  return {
    items: env.data ?? [],
    total: env.meta?.total ?? 0,
    page: env.meta?.page ?? 1,
    pageSize: env.meta?.pageSize ?? 20,
  }
}

export async function getDocument(token: string, cdc: string): Promise<DocumentDetail> {
  const env = await apiFetch<DocumentDetail>(`/documents/${cdc}`, { token })
  if (!env.data) throw new ApiError('NOT_FOUND', 'Documento inexistente', 404)
  return env.data
}

export async function requestRetry(token: string, cdc: string): Promise<void> {
  await apiFetch(`/documents/${cdc}/retry`, { token, method: 'POST' })
}

// downloadXml baja el XML firmado (endpoint devuelve application/xml crudo, con JWT).
export async function downloadXml(token: string, cdc: string): Promise<void> {
  let access = token
  if (isTokenExpired(access)) {
    const fresh = await refreshSession()
    if (!fresh) throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
    access = fresh
  }
  const res = await fetch(`${ORDS_BASE}/api/v1/documents/${cdc}/xml`, {
    headers: { Authorization: `Bearer ${access}`, Accept: 'application/xml' },
  })
  if (!res.ok) throw new ApiError('XML_ERROR', `No se pudo descargar el XML (HTTP ${res.status})`, res.status)
  const text = await res.text()
  const blob = new Blob([text], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cdc}.xml`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- Helpers de presentacion ---

export const TIPO_DE_LABEL: Record<number, string> = {
  1: 'Factura',
  4: 'Autofactura',
  5: 'Nota de crédito',
  6: 'Nota de débito',
  7: 'Nota de remisión',
}

export function tipoDeLabel(t: number): string {
  return TIPO_DE_LABEL[t] ?? `Tipo ${t}`
}

export interface EstadoMeta {
  label: string
  className: string
  dot: string
}

export const ESTADO_META: Record<DocEstado, EstadoMeta> = {
  APROBADO: { label: 'Aprobado', className: 'bg-ok/10 text-ok', dot: 'bg-ok' },
  RECHAZADO: { label: 'Rechazado', className: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  FIRMADO: { label: 'Firmado (pend. envío)', className: 'bg-warn/10 text-warn', dot: 'bg-warn' },
  ENVIADO: { label: 'Enviado', className: 'bg-brand-100 text-brand-700', dot: 'bg-brand-500' },
  CANCELADO: { label: 'Cancelado', className: 'bg-neutral/10 text-neutral', dot: 'bg-neutral' },
  BORRADOR: { label: 'Borrador', className: 'bg-neutral/10 text-neutral', dot: 'bg-neutral' },
}

export function estadoMeta(estado: string): EstadoMeta {
  return ESTADO_META[estado as DocEstado] ?? ESTADO_META.BORRADOR
}

export function formatMoneda(total: number | null, moneda: string): string {
  if (total == null) return '—'
  const isPYG = !moneda || moneda === 'PYG'
  const n = new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: isPYG ? 0 : 2,
    maximumFractionDigits: isPYG ? 0 : 2,
  }).format(total)
  return `${n} ${moneda || 'PYG'}`
}

// decodeEntities convierte entidades HTML (SIFEN devuelve p.ej. &#243;) a texto legible.
export function decodeEntities(s: string | null): string {
  if (!s) return ''
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}

export function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short' })
}
