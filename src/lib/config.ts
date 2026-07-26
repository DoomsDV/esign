// Capa de datos de configuracion del negocio (ORDS /api/v1, JWT).
// Empresa/emisor, establecimientos/puntos, API keys e invitaciones.
import { apiData, apiFetch } from './api'
import type { Environment } from './env'

export interface Geo {
  cod: number
  desc: string
}

export interface Actividad {
  cod: string
  desc: string
}

export interface Emisor {
  tipo_contribuyente: number | null
  tipo_regimen: string | null
  nombre_fantasia: string | null
}

export interface ClientProfile {
  client_id: number
  business_name: string
  ruc: string
  dv: number
  status: string
  emisor: Emisor | null
  actividades: Actividad[] | null
}

export interface EmisorUpsert {
  tipo_contribuyente: number
  tipo_regimen?: string
  nombre_fantasia?: string
  actividades?: Actividad[]
}

export interface PuntoExpedicion {
  codigo: string
  descripcion: string | null
  is_active: number
}

export interface Establecimiento {
  codigo: string
  denominacion: string | null
  direccion: string
  num_casa: string | null
  dep: Geo
  dis: Geo | null
  ciu: Geo
  telefono?: string | null
  email?: string | null
  is_active: number
  puntos: PuntoExpedicion[] | null
}

export interface EstablecimientoUpsert {
  codigo: string
  denominacion?: string
  direccion: string
  num_casa?: string
  dep: Geo
  dis?: Geo
  ciu: Geo
  telefono?: string
  email?: string
}

export interface PuntoUpsert {
  codigo: string
  descripcion?: string
  is_active?: number
}

export interface ApiKeyMeta {
  environment: string
  prefix: string
  status: string
  label: string | null
  created_at: string | null
}

export interface RotateKeyResult {
  environment: string
  api_key: string
  prefix: string
}

export interface InviteResult {
  status?: string
  token?: string
  email?: string
  role?: string
  expires_at?: string
}

export async function getClient(token: string): Promise<ClientProfile> {
  return apiData<ClientProfile>('/client', { token })
}

export async function upsertEmisor(token: string, body: EmisorUpsert): Promise<void> {
  await apiFetch('/client', { token, method: 'PUT', body })
}

export async function listEstablecimientos(token: string): Promise<Establecimiento[]> {
  const data = await apiData<Establecimiento[]>('/establecimientos', { token })
  return data ?? []
}

export async function upsertEstablecimiento(token: string, body: EstablecimientoUpsert): Promise<void> {
  await apiFetch('/establecimientos', { token, method: 'POST', body })
}

export async function upsertPunto(
  token: string,
  establecimientoCodigo: string,
  body: PuntoUpsert,
): Promise<void> {
  await apiFetch(`/establecimientos/${establecimientoCodigo}/puntos`, {
    token,
    method: 'POST',
    body,
  })
}

export async function listApiKeys(token: string): Promise<ApiKeyMeta[]> {
  const data = await apiData<{ keys: ApiKeyMeta[] }>('/api-keys', { token })
  return data.keys ?? []
}

export async function rotateApiKey(
  token: string,
  env: Lowercase<Environment>,
): Promise<RotateKeyResult> {
  return apiData<RotateKeyResult>(`/api-keys/${env}/rotate`, { token, method: 'POST' })
}

export async function createInvitation(
  token: string,
  email: string,
  role: 'owner' | 'developer' | 'analyst',
): Promise<InviteResult> {
  return apiData<InviteResult>('/invitations', {
    token,
    method: 'POST',
    body: { email, role },
  })
}
