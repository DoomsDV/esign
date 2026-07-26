import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/AuthLayout'
import { Alert, Card } from '@/components/ui'
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
    <AuthLayout altText="No es tu cuenta?" altHref="/login" altLabel="Cambiar de usuario">
      <Card className="w-full max-w-md px-8 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-ink">Elegi tu negocio</h1>
          <p className="mt-2 text-sm text-muted">Tenes acceso a varios negocios. SeleccionA uno.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {error && <Alert>{error}</Alert>}
          {state.clients.map((c) => (
            <button
              key={c.client_id}
              onClick={() => choose(c)}
              className="flex items-center justify-between rounded-2xl border border-line bg-cream-soft px-4 py-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span>
                <span className="block font-semibold text-ink">{c.business_name}</span>
                <span className="block text-xs text-muted">RUC {c.ruc}</span>
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted capitalize">
                {c.role}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </AuthLayout>
  )
}
