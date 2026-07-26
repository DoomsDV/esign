// Clientes openapi-fetch tipados desde firmador/docs/openapi.yaml.
// ORDS: panel (JWT). Go: emision + mediacion de secretos (JWT del panel).
import createClient from 'openapi-fetch'
import type { paths } from './api-schema'
import { GO_BASE, ORDS_BASE } from './env'

export function createOrdsClient(token?: string | null) {
  return createClient<paths>({
    baseUrl: ORDS_BASE,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export function createGoClient(token?: string | null) {
  return createClient<paths>({
    baseUrl: GO_BASE,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
