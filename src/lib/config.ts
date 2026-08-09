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

// --- Diseño del KuDE (branding: plantilla/color/logo/footer) ---

export type KudeTemplateId = 'minimalista' | 'corporativa'

export interface KudeConfig {
  template_id: KudeTemplateId
  color_primario: string
  logo_url: string | null
  notas_footer: string | null
}

export interface KudeConfigUpdate {
  template_id?: KudeTemplateId
  color_primario?: string
  notas_footer?: string
}

export async function getKudeConfig(token: string): Promise<KudeConfig> {
  return apiData<KudeConfig>('/kude-config', { token })
}

export async function upsertKudeConfig(token: string, body: KudeConfigUpdate): Promise<KudeConfig> {
  return apiData<KudeConfig>('/kude-config', { token, method: 'PUT', body })
}

export async function uploadKudeLogo(
  token: string,
  file: File,
): Promise<{ logo_url: string }> {
  const image_hex = await fileToHex(file)
  return apiData<{ logo_url: string }>('/kude-config/logo', {
    token,
    method: 'POST',
    body: { image_hex, mime_type: file.type || 'image/png' },
  })
}

/** Lee un File (imagen del logo) y lo convierte a hex (mismo formato que el resto
 * de blobs cifrados de la app; el paquete PL/SQL lo decodifica con HEXTORAW). */
export function fileToHex(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('no se pudo leer el archivo'))
        return
      }
      const bytes = new Uint8Array(result)
      let hex = ''
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0')
      }
      resolve(hex)
    }
    reader.onerror = () => reject(reader.error ?? new Error('error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}
