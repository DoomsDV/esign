// Mediacion de secretos via Go (plan: el navegador NUNCA cifra ni ve ESIGN_MASTER_KEY).
// Metadata del certificado se lee de ORDS; subida de P12/CSC va a /v1/panel/*.
import { apiData, apiFetch } from './api'
import { GO_BASE, type Environment } from './env'

/** Metadata expuesta al panel — sin subject_dn (PII; el API puede enviarlo pero no se persiste en cliente). */
export interface CertificateMeta {
  not_after: string | null
  status: string
  key_version?: number | null
}

export interface PanelCertificateUpload {
  p12_base64: string
  password: string
  subject_dn?: string
  not_after?: string
}

export interface PanelEnvironmentUpsert {
  environment: Environment
  num_timbrado: string
  fecha_inicio_vigencia: string
  id_csc: string
  csc: string
}

export async function getCertificateMeta(token: string): Promise<CertificateMeta> {
  const raw = await apiData<CertificateMeta & { subject_dn?: string | null }>('/certificate', { token })
  // Defensa en profundidad: no guardar DN en React Query aunque ORDS aún lo emita.
  const { subject_dn: _subjectDn, ...meta } = raw
  return meta
}

/** Sube el .p12 en claro (base64) a Go; Go cifra y persiste. */
export async function uploadCertificate(token: string, body: PanelCertificateUpload): Promise<void> {
  await apiFetch('/panel/certificate', {
    token,
    method: 'POST',
    body,
    base: GO_BASE,
    prefix: '/v1',
  })
}

/** Upsert de timbrado + CSC en claro a Go; Go cifra el CSC y persiste. */
export async function upsertEnvironment(token: string, body: PanelEnvironmentUpsert): Promise<void> {
  await apiFetch('/panel/environments', {
    token,
    method: 'PUT',
    body,
    base: GO_BASE,
    prefix: '/v1',
  })
}

/** Lee un File (.p12) y lo convierte a base64 (sin data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('no se pudo leer el archivo'))
        return
      }
      const bytes = new Uint8Array(result)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!)
      }
      resolve(btoa(binary))
    }
    reader.onerror = () => reject(reader.error ?? new Error('error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}
