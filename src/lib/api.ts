// Cliente HTTP del panel. Todas las respuestas del backend usan el envelope estandar
// { success, data, error, meta }. apiFetch lo desenvuelve y lanza ApiError si success=false.
// Renueva el access JWT en silencio via /auth/refresh cuando está por vencer o llega 401.
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
  /** Interno: ya se reintento tras un refresh. */
  _retried?: boolean
}

/** Bridge que AuthProvider registra para leer/actualizar tokens sin imports circulares. */
export interface AuthBridge {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  applyTokens: (accessToken: string, refreshToken: string) => void
  markSessionDead: () => void
}

let authBridge: AuthBridge | null = null
let refreshInFlight: Promise<string | null> | null = null

export function setAuthBridge(bridge: AuthBridge | null) {
  authBridge = bridge
}

/** Callback legacy (401 definitivo). Preferir AuthBridge.markSessionDead. */
type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

function notifySessionDead() {
  authBridge?.markSessionDead()
  unauthorizedHandler?.()
}

/** Lee el claim `exp` (epoch en segundos) de un JWT sin validar la firma. */
export function jwtExpSeconds(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { exp?: number }
    return typeof claims.exp === 'number' ? claims.exp : null
  } catch {
    return null
  }
}

/**
 * True si el access token JWT ya venció (con margen de 5s por clock skew).
 * El backend del panel no siempre traduce el JWT vencido a un 401 limpio
 * (puede responder 500), así que la detección proactiva vive en el cliente.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return false
  const exp = jwtExpSeconds(token)
  if (exp == null) return false
  return exp * 1000 <= Date.now() + 5000
}

/** True si el access token vence dentro de `withinSec` segundos. */
export function isTokenNearExpiry(
  token: string | null | undefined,
  withinSec = 90,
): boolean {
  if (!token) return false
  const exp = jwtExpSeconds(token)
  if (exp == null) return false
  return exp * 1000 <= Date.now() + withinSec * 1000
}

/**
 * Renueva el par access/refresh vía ORDS. Single-flight: N callers concurrentes
 * comparten la misma Promise. Devuelve el nuevo access token o null si falla.
 */
export async function refreshSession(): Promise<string | null> {
  if (!authBridge) return null
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = authBridge!.getRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${ORDS_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      let env: ApiEnvelope<{
        access_token: string
        refresh_token: string
        expires_in?: number
      }>
      try {
        env = (await res.json()) as typeof env
      } catch {
        return null
      }
      if (!env.success || !env.data?.access_token || !env.data.refresh_token) {
        return null
      }
      authBridge!.applyTokens(env.data.access_token, env.data.refresh_token)
      return env.data.access_token
    } catch {
      return null
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

async function resolveAuthToken(
  token: string | null | undefined,
  retried: boolean,
): Promise<string | null | undefined> {
  if (!token) return token
  if (!isTokenExpired(token)) return token
  if (retried) return null
  return refreshSession()
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
  const retried = Boolean(opts._retried)
  const hadToken = Boolean(opts.token)

  let token = opts.token
  if (hadToken) {
    const resolved = await resolveAuthToken(token, retried)
    if (!resolved) {
      notifySessionDead()
      throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
    }
    token = resolved
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    if (res.status === 401 && hadToken && !retried) {
      const fresh = await refreshSession()
      if (fresh) {
        return apiFetch<T>(path, { ...opts, token: fresh, _retried: true })
      }
      notifySessionDead()
      throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
    }
    if (res.status === 401) {
      notifySessionDead()
      throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
    }
    throw new ApiError('INVALID_RESPONSE', `Respuesta no válida (HTTP ${res.status})`, res.status)
  }

  const failedAuth =
    res.status === 401 ||
    (!env.success && (env.error?.code === 'UNAUTHORIZED' || res.status === 401))

  if (failedAuth && hadToken && !retried) {
    const fresh = await refreshSession()
    if (fresh) {
      return apiFetch<T>(path, { ...opts, token: fresh, _retried: true })
    }
    notifySessionDead()
    throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
  }

  if (!env.success) {
    const code = env.error?.code ?? (res.status === 401 ? 'UNAUTHORIZED' : 'ERROR')
    const message =
      env.error?.message ??
      (code === 'UNAUTHORIZED' ? 'Sesión finalizada. Volvé a iniciar sesión.' : 'Error desconocido')
    if (code === 'UNAUTHORIZED' || res.status === 401) notifySessionDead()
    throw new ApiError(code, message, res.status)
  }

  if (res.status === 401) {
    notifySessionDead()
    throw new ApiError('UNAUTHORIZED', 'Sesión finalizada. Volvé a iniciar sesión.', 401)
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
