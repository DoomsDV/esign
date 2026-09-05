// Webhook de entrega invoice.ready (panel + rotación de secret vía API).
import { apiData, apiFetch } from './api'
import { GO_BASE, type Environment } from './env'

export interface WebhookConfig {
  url: string | null
  is_active: number
  has_secret: boolean
  key_version: number | null
}

export interface WebhookRotateResult {
  environment: string
  secret: string
}

export async function getWebhook(token: string, environment: Environment): Promise<WebhookConfig | null> {
  const env = await apiFetch<WebhookConfig>(`/webhooks/${environment.toLowerCase()}`, { token })
  return env.data ?? null
}

export async function upsertWebhook(
  token: string,
  environment: Environment,
  body: { url: string; is_active: boolean },
): Promise<WebhookConfig> {
  return apiData<WebhookConfig>(`/webhooks/${environment.toLowerCase()}`, {
    token,
    method: 'PUT',
    body: {
      url: body.url.trim(),
      is_active: body.is_active,
    },
  })
}

/** Genera y persiste un nuevo secret (se muestra una sola vez). */
export async function rotateWebhookSecret(
  token: string,
  environment: Environment,
): Promise<WebhookRotateResult> {
  const res = await apiFetch<WebhookRotateResult>('/panel/webhooks/rotate', {
    token,
    method: 'POST',
    body: { environment },
    base: GO_BASE,
    prefix: '/v1',
  })
  if (!res.data?.secret) {
    throw new Error('No se recibió el secret del servidor.')
  }
  return res.data
}
