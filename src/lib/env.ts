// Configuración de bases de API leida de variables de entorno de Vite.
// ORDS: panel (auth, config, lectura de documentos). Go: emision + mediacion de secretos.
const trimSlash = (s: string) => s.replace(/\/+$/, '')

export const ORDS_BASE = trimSlash(import.meta.env.VITE_ORDS_BASE ?? '')
export const GO_BASE = trimSlash(import.meta.env.VITE_GO_BASE ?? '')

export type Environment = 'TEST' | 'PROD'
