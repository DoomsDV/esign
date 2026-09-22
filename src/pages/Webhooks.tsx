import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, IconSave, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { getWebhook, rotateWebhookSecret, upsertWebhook } from '@/lib/webhooks'

const PAGE_TIP =
  'Cuando una factura queda aprobada y la documentación está lista, enviamos una notificación HTTP POST firmada (HMAC) a la URL que configures. Tu sistema recibe el evento y decide qué hacer (guardar archivos, enviar correos, etc.).'

function validateHttpsUrl(value: string): string | null {
  const v = value.trim()
  if (!v) return 'La URL es obligatoria si el webhook está activo.'
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:') return 'Solo se permite HTTPS.'
  } catch {
    return 'URL inválida.'
  }
  return null
}

export default function Webhooks() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const canEdit = session!.role === 'owner'
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['webhook', environment],
    queryFn: () => getWebhook(token, environment),
  })

  const [url, setUrl] = useState('')
  const [active, setActive] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  useEffect(() => {
    setMsg(null)
    setErr(null)
    setNewSecret(null)
  }, [environment])

  useEffect(() => {
    if (!q.data) {
      setUrl('')
      setActive(false)
      return
    }
    setUrl(q.data.url ?? '')
    setActive(q.data.is_active === 1)
  }, [q.data])

  const save = useMutation({
    mutationFn: () => upsertWebhook(token, environment, { url, is_active: active }),
    onSuccess: async () => {
      setErr(null)
      setMsg('Webhook guardado.')
      await qc.invalidateQueries({ queryKey: ['webhook', environment] })
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const rotate = useMutation({
    mutationFn: () => rotateWebhookSecret(token, environment),
    onSuccess: async (data) => {
      setErr(null)
      setNewSecret(data.secret)
      setMsg('Nuevo secret generado. Copialo ahora: no se volverá a mostrar.')
      await qc.invalidateQueries({ queryKey: ['webhook', environment] })
    },
    onError: (e: Error) => {
      setMsg(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  const urlError = active && url.trim() ? validateHttpsUrl(url) : active ? validateHttpsUrl(url) : null
  const canSave = canEdit && (!active || (!urlError && url.trim().length > 0))

  return (
    <AppShell title="Webhook">
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        <div className="hidden items-end justify-between gap-3 sm:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Integraciones</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
              Entrega de facturas ({environment})
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{PAGE_TIP}</p>
          </div>
          {canEdit && (
            <Button
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={!canSave}
              className="h-10 shrink-0 gap-1.5"
            >
              <IconSave />
              Guardar
            </Button>
          )}
        </div>

        {msg && <SuccessAlert>{msg}</SuccessAlert>}
        {err && <Alert>{err}</Alert>}

        {newSecret && (
          <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Secret (una sola vez)</p>
            <p className="mt-1 break-all font-mono text-sm text-amber-950 dark:text-amber-50">{newSecret}</p>
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
              Guardalo en tu servidor y usalo para verificar la firma de cada notificación.
            </p>
          </div>
        )}

        <section className="rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              disabled={!canEdit || save.isPending}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 rounded border-muted/40"
            />
            <span className="text-sm font-medium text-ink">Webhook activo para {environment}</span>
          </label>

          <div className="mt-4 space-y-3">
            <TextField
              label="URL del webhook (HTTPS)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!canEdit || save.isPending}
              placeholder="https://mi-sistema.com/api/webhook"
              hint={urlError ?? 'Evento invoice.ready con firma HMAC en cada entrega.'}
              className={cn(urlError && 'border-red-300')}
            />

            {q.data?.has_secret ? (
              <p className="text-xs text-muted">Hay un secret configurado (no se muestra por seguridad).</p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Todavía no hay secret. Generá uno antes de activar en producción.
              </p>
            )}

            {canEdit && (
              <Button
                variant="secondary"
                loading={rotate.isPending}
                onClick={() => rotate.mutate()}
                className="h-9"
              >
                Rotar secret
              </Button>
            )}
          </div>
        </section>

        {canEdit && (
          <div className="sm:hidden">
            <Button
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={!canSave}
              className="h-11 w-full gap-1.5"
            >
              <IconSave />
              Guardar webhook
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
