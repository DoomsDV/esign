import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert } from '@/components/ui'
import { useAuth, type ClientMembership } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface LocationState {
  userId: number
  clients: ClientMembership[]
}

export default function SelectClient() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectClient } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const state = location.state as LocationState | null

  if (!state?.clients?.length) {
    return <Navigate to="/login" replace />
  }

  async function choose(client: ClientMembership) {
    setError(null)
    try {
      await selectClient(state!.userId, client)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo seleccionar el negocio.')
    }
  }

  return (
    <AuthLayout
      eyebrow="Negocios"
      title="Elegí tu negocio"
      pageTitle="Elegí tu negocio"
      subtitle="Tenés acceso a varios. Seleccioná uno para continuar."
      altText="¿No es tu cuenta?"
      altHref="/login"
      altLabel="Cambiar de usuario"
    >
      <div className="flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        {state.clients.map((c) => (
          <button key={c.client_id} type="button" onClick={() => choose(c)} className="auth-client-card">
            <span className="auth-client-card-inner">
              <span>
                <span className="auth-client-name">{c.business_name}</span>
                <span className="auth-client-meta">RUC {c.ruc}</span>
              </span>
              <span className="auth-client-role">{c.role}</span>
            </span>
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}
