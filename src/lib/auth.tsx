// Contexto de autenticacion del panel (patron Stripe: persona -> negocios).
// Flujo: login (email/pass) devuelve la lista de negocios -> select-client emite el JWT.
// El JWT + datos de sesion se persisten en localStorage. Incluye el toggle global TEST/PROD.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { apiData, isTokenExpired, setUnauthorizedHandler } from './api'
import type { Environment } from './env'

export interface ClientMembership {
  client_id: number
  business_name: string
  ruc: string
  role: 'owner' | 'developer' | 'analyst'
}

export interface Session {
  accessToken: string
  refreshToken: string
  userId: number
  clientId: number
  businessName: string
  role: ClientMembership['role']
}

interface LoginResult {
  user_id: number
  clients: ClientMembership[]
}

interface RegisterInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  business_name: string
  ruc: string
  dv?: number
}

interface AuthContextValue {
  session: Session | null
  environment: Environment
  setEnvironment: (env: Environment) => void
  login: (email: string, password: string) => Promise<LoginResult>
  selectClient: (userId: number, client: ClientMembership) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  /** True cuando una API autenticada respondió 401. */
  sessionExpired: boolean
  /** Limpia sesión y cierra el modal de sesión vencida. */
  acknowledgeSessionExpired: () => void
}

const SESSION_KEY = 'esign.session'
const ENV_KEY = 'esign.environment'

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [sessionExpired, setSessionExpired] = useState(false)
  const expiredRef = useRef(false)
  const [environment, setEnvState] = useState<Environment>(
    () => (localStorage.getItem(ENV_KEY) as Environment) || 'TEST',
  )

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session])

  // Registra handler 401: marca expirada sin borrar sesión (evita redirect inmediato).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (expiredRef.current) return
      expiredRef.current = true
      setSessionExpired(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Si al cargar el panel el access token ya venció, mostrar el modal sin esperar
  // a que falle una request.
  useEffect(() => {
    if (session && isTokenExpired(session.accessToken) && !expiredRef.current) {
      expiredRef.current = true
      setSessionExpired(true)
    }
  }, [session])

  const setEnvironment = useCallback((env: Environment) => {
    setEnvState(env)
    localStorage.setItem(ENV_KEY, env)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    return apiData<LoginResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  }, [])

  const selectClient = useCallback(async (userId: number, client: ClientMembership) => {
    const data = await apiData<{
      access_token: string
      refresh_token: string
      client_id: number
      role: ClientMembership['role']
    }>('/auth/select-client', {
      method: 'POST',
      body: { user_id: userId, client_id: client.client_id },
    })
    expiredRef.current = false
    setSessionExpired(false)
    setSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId,
      clientId: data.client_id,
      businessName: client.business_name,
      role: data.role,
    })
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    await apiData('/auth/register', { method: 'POST', body: input })
  }, [])

  const logout = useCallback(() => {
    expiredRef.current = false
    setSessionExpired(false)
    setSession(null)
  }, [])

  const acknowledgeSessionExpired = useCallback(() => {
    expiredRef.current = false
    setSessionExpired(false)
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      environment,
      setEnvironment,
      login,
      selectClient,
      register,
      logout,
      sessionExpired,
      acknowledgeSessionExpired,
    }),
    [
      session,
      environment,
      setEnvironment,
      login,
      selectClient,
      register,
      logout,
      sessionExpired,
      acknowledgeSessionExpired,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
