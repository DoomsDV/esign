// Cliente HTTP del panel. Todas las respuestas del backend usan el envelope estandar
// { success, data, error, meta }. apiFetch lo desenvuelve y lanza ApiError si success=false.
import { ORDS_BASE } from './env'

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
  meta?: { page: number; pageSize: number; total: number }
}

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export interface FetchOptions {
  method?: string
  body?: unknown
  token?: string | null
  /** Base URL (default ORDS). Para endpoints de Go pasar GO_BASE. */
  base?: string
  /** Prefijo del modulo (default /api/v1). */
  prefix?: string
  /** query params */
  query?: Record<string, string | number | undefined | null>
}

function buildQuery(query?: FetchOptions['query']): string {
  if (!query) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    // Se envian tambien los vacios: los handlers ORDS referencian los binds (:estado, :tipo)
    // y si faltan dan ORDS-25001. En Oracle '' se interpreta como NULL (no filtra).
    if (v !== undefined && v !== null) usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<ApiEnvelope<T>> {
  const base = opts.base ?? ORDS_BASE
  const prefix = opts.prefix ?? '/api/v1'
  const url = `${base}${prefix}${path}${buildQuery(opts.query)}`

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    })
  } catch (e) {
    throw new ApiError('NETWORK', `No se pudo conectar con el servidor: ${(e as Error).message}`, 0)
  }

  let env: ApiEnvelope<T>
  try {
    env = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError('INVALID_RESPONSE', `Respuesta no válida (HTTP ${res.status})`, res.status)
  }

  if (!env.success) {
    throw new ApiError(env.error?.code ?? 'ERROR', env.error?.message ?? 'Error desconocido', res.status)
  }
  return env
}

/** Helper que devuelve solo data (o lanza si viene null). */
export async function apiData<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const env = await apiFetch<T>(path, opts)
  if (env.data == null) {
    throw new ApiError('NO_DATA', 'La respuesta no contiene datos', 200)
  }
  return env.data
}
