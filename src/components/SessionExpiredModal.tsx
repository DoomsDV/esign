import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'

/** Modal bloqueante cuando el JWT venció o fue rechazado (401). */
export function SessionExpiredModal() {
  const { sessionExpired, acknowledgeSessionExpired } = useAuth()
  const navigate = useNavigate()

  if (!sessionExpired) return null

  function goLogin() {
    acknowledgeSessionExpired()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="modal-backdrop-enter absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div
        className="modal-sheet-enter relative z-10 w-full max-w-none rounded-t-2xl bg-white px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6 sm:pb-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <h2 id="session-expired-title" className="text-lg font-bold text-ink">
          Sesión finalizada
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tu sesión expiró o ya no es válida. Para seguir usando el panel, iniciá sesión de nuevo.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={goLogin}>Iniciar sesión</Button>
        </div>
      </div>
    </div>
  )
}
