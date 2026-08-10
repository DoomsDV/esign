// Contexto de autenticacion del panel (patron Stripe: persona -> negocios).
// Flujo: login (email/pass) -> select-client emite JWT + refresh.
// El access se renueva en silencio con /auth/refresh; solo si el refresh falla
// se muestra el modal de sesión vencida.
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
import {
  apiData,
  isTokenExpired,
  isTokenNearExpiry,
  jwtExpSeconds,
  refreshSession,
  setAuthBridge,
} from './api'
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
  /** True cuando el refresh también falló (sesión realmente muerta). */
  sessionExpired: boolean
  /** Limpia sesión y cierra el modal de sesión vencida. */
  acknowledgeSessionExpired: () => void
}

const SESSION_KEY = 'esign.session'
const ENV_KEY = 'esign.environment'
/** Renovar el access ~90s antes de que venza. */
const REFRESH_SKEW_SEC = 90

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
  const sessionRef = useRef(session)
  sessionRef.current = session

  const [environment, setEnvState] = useState<Environment>(() => {
    const stored = localStorage.getItem(ENV_KEY)
    return stored === 'PROD' || stored === 'TEST' ? stored : 'TEST'
  })

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session])

  const markSessionDead = useCallback(() => {
    if (expiredRef.current) return
    expiredRef.current = true
    setSessionExpired(true)
  }, [])

  // Bridge para que apiFetch renueve tokens sin import circular.
  useEffect(() => {
    setAuthBridge({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      getRefreshToken: () => sessionRef.current?.refreshToken ?? null,
      applyTokens: (accessToken, refreshToken) => {
        expiredRef.current = false
        setSessionExpired(false)
        setSession((prev) =>
          prev ? { ...prev, accessToken, refreshToken } : null,
        )
      },
      markSessionDead,
    })
    return () => setAuthBridge(null)
  }, [markSessionDead])

  // Al montar / cambiar sesión: si el access ya venció, renovar en silencio.
  // Solo mostrar el modal si el refresh también falla.
  useEffect(() => {
    if (!session?.refreshToken) return
    if (!isTokenExpired(session.accessToken) && !isTokenNearExpiry(session.accessToken, REFRESH_SKEW_SEC)) {
      return
    }
    let cancelled = false
    void (async () => {
      const fresh = await refreshSession()
      if (cancelled) return
      if (!fresh) markSessionDead()
    })()
    return () => {
      cancelled = true
    }
  }, [session?.accessToken, session?.refreshToken, markSessionDead])

  // Timer proactivo: renovar ~90s antes del exp + al volver a la pestaña.
  useEffect(() => {
    if (!session?.accessToken || !session.refreshToken) return

    let timer: number | undefined

    const arm = (accessToken: string) => {
      if (timer != null) window.clearTimeout(timer)
      const exp = jwtExpSeconds(accessToken)
      if (exp == null) return
      const ms = exp * 1000 - Date.now() - REFRESH_SKEW_SEC * 1000
      const delay = Number.isFinite(ms) ? Math.max(3_000, Math.min(ms, 2_147_000_000)) : 60_000
      timer = window.setTimeout(() => {
        void refreshSession().then((fresh) => {
          if (!fresh) markSessionDead()
        })
      }, delay)
    }

    arm(session.accessToken)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const cur = sessionRef.current
      if (!cur?.accessToken) return
      if (isTokenExpired(cur.accessToken) || isTokenNearExpiry(cur.accessToken, REFRESH_SKEW_SEC)) {
        void refreshSession().then((fresh) => {
          if (!fresh) markSessionDead()
          else arm(fresh)
        })
      } else {
        arm(cur.accessToken)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      if (timer != null) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [session?.accessToken, session?.refreshToken, markSessionDead])

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
