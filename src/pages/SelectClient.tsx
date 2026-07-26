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
      title="Elegí tu negocio"
      subtitle="Tenés acceso a varios negocios. Seleccioná uno para continuar."
      altText="¿No es tu cuenta?"
      altHref="/login"
      altLabel="Cambiar de usuario"
      panelQuote="Un mismo usuario puede operar varios RUC. El aislamiento por negocio protege tus documentos y credenciales."
      panelAuthor="esign"
      panelRole="Multi-tenant"
    >
      <div className="flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        {state.clients.map((c) => (
          <button
            key={c.client_id}
            type="button"
            onClick={() => choose(c)}
            className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <span>
              <span className="block font-semibold text-ink">{c.business_name}</span>
              <span className="block text-xs text-muted">RUC {c.ruc}</span>
            </span>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-medium capitalize text-muted">
              {c.role}
            </span>
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}
