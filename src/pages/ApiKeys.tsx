import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Menu, Modal, PageHeader, SuccessAlert, panelClass } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { listApiKeys, rotateApiKey, type ApiKeyMeta, type RotateKeyResult } from '@/lib/config'
import type { Environment } from '@/lib/env'
import { cn } from '@/lib/cn'

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-ok/10 text-ok-strong'
  if (status === 'REVOKED') return 'bg-neutral/10 text-neutral'
  return 'bg-warn/10 text-warn'
}

function formatKeyStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Activa'
    case 'REVOKED':
      return 'Revocada'
    default:
      return status
  }
}

function formatFechaKey(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const base = d
    .toLocaleString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\./g, '')
  return `${base} h`
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" className="stroke-current" strokeWidth="1.8" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="15" r="4" className="stroke-current" strokeWidth="1.8" />
      <path
        d="m11.5 12.5 8.5-8.5M16 4l4 4M19 7l-3 3"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function KeyRow({
  keyMeta,
  canRotate,
  copiedPrefix,
  onCopyPrefix,
  onRotate,
}: {
  keyMeta: ApiKeyMeta
  canRotate: boolean
  copiedPrefix: string | null
  onCopyPrefix: (prefix: string) => void
  onRotate: () => void
}) {
  const revoked = keyMeta.status === 'REVOKED'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line/50 px-5 py-4 last:border-0 sm:px-6',
        revoked && 'opacity-75',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            revoked ? 'bg-neutral/10 text-neutral' : 'bg-brand-100 text-brand-700',
          )}
        >
          <KeyIcon />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold tabular-nums text-ink">
            {keyMeta.prefix}
            <span className="text-muted">…</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Creada {formatFechaKey(keyMeta.created_at)}
            {keyMeta.label ? ` · ${keyMeta.label}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge className={statusClass(keyMeta.status)}>{formatKeyStatus(keyMeta.status)}</Badge>
        <Menu
          items={[
            {
              label: copiedPrefix === keyMeta.prefix ? 'Copiado' : 'Copiar prefijo',
              onClick: () => onCopyPrefix(keyMeta.prefix),
              icon: <CopyIcon />,
            },
            ...(canRotate
              ? [
                  {
                    label: `Rotar key ${keyMeta.environment}`,
                    onClick: onRotate,
                    icon: <RotateIcon />,
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  )
}

const API_KEYS_TIP =
  'Claves para integrar tu backend con etick. El prefijo define el ambiente SIFEN (sk_test_ homologación, sk_prod_ producción). La key completa solo se muestra una vez al rotar; la anterior queda revocada de inmediato.'

export default function ApiKeys() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canRotate = session!.role === 'owner' || session!.role === 'developer'
  const isProd = environment === 'PROD'

  const q = useQuery({ queryKey: ['api-keys'], queryFn: () => listApiKeys(token) })

  const [revealed, setRevealed] = useState<RotateKeyResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null)

  const rotate = useMutation({
    mutationFn: (env: Environment) => rotateApiKey(token, env.toLowerCase() as Lowercase<Environment>),
    onSuccess: async (data) => {
      setErr(null)
      setConfirmOpen(false)
      setRevealed(data)
      setCopied(false)
      await qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (e: Error) => {
      setConfirmOpen(false)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  async function copyKey() {
    if (!revealed) return
    await navigator.clipboard.writeText(revealed.api_key)
    setCopied(true)
  }

  async function copyPrefix(prefix: string) {
    await navigator.clipboard.writeText(prefix)
    setCopiedPrefix(prefix)
    window.setTimeout(() => setCopiedPrefix((cur) => (cur === prefix ? null : cur)), 1600)
  }

  function openRotateConfirm() {
    setErr(null)
    setConfirmOpen(true)
  }

  const keys = q.data ?? []
  const scoped = keys.filter((k) => k.environment === environment)
  const activeKey = scoped.find((k) => k.status === 'ACTIVE')

  return (
    <AppShell title="API keys">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <PageHeader
          compactOnMobile
          title="Keys de emisión"
          description={API_KEYS_TIP}
          action={
            canRotate ? (
              <Button
                variant={isProd ? 'success' : 'primary'}
                className="gap-1.5 max-sm:w-full"
                onClick={openRotateConfirm}
              >
                <RotateIcon />
                Rotar key {environment}
              </Button>
            ) : undefined
          }
        />

        {err && <Alert>{err}</Alert>}

        <p className="text-xs text-muted sm:hidden">
          Ambiente: <strong className="text-ink">{environment}</strong>{' '}
          <span className="font-mono">({isProd ? 'sk_prod_' : 'sk_test_'})</span>
        </p>

        <div className={cn(panelClass, 'hidden px-5 py-4 sm:block sm:px-6')}>
          <p className="text-sm leading-relaxed text-muted">
            Ambiente actual: <strong className="text-ink">{environment}</strong> (
            {isProd ? 'sk_prod_' : 'sk_test_'}). El prefijo define el ambiente SIFEN. Al rotar, la key
            activa anterior pasa a revocada de inmediato.
          </p>
        </div>

        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {!q.isLoading && !q.error && scoped.length === 0 && (
          <div className={cn(panelClass, 'px-6 py-12 text-center')}>
            <p className="text-base font-semibold text-ink">No hay keys en {environment}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Generá la primera key de emisión para conectar tu sistema vía API.
            </p>
            {canRotate && (
              <Button className="mt-6 gap-1.5" variant={isProd ? 'success' : 'primary'} onClick={openRotateConfirm}>
                <RotateIcon />
                Crear key {environment}
              </Button>
            )}
          </div>
        )}

        {!q.isLoading && !q.error && scoped.length > 0 && (
          <div className={cn(panelClass, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line/60 px-5 py-3.5 sm:px-6">
              <p className="text-sm font-semibold text-ink">
                {scoped.length} key{scoped.length === 1 ? '' : 's'} en {environment}
              </p>
              {activeKey && (
                <span className="text-xs text-muted">
                  Activa: <span className="font-mono text-ink">{activeKey.prefix}…</span>
                </span>
              )}
            </div>
            {scoped.map((k) => (
              <KeyRow
                key={`${k.environment}-${k.prefix}-${k.created_at}`}
                keyMeta={k}
                canRotate={canRotate}
                copiedPrefix={copiedPrefix}
                onCopyPrefix={copyPrefix}
                onRotate={openRotateConfirm}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !rotate.isPending && setConfirmOpen(false)}
        title={`Rotar key ${environment}`}
      >
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            isProd ? 'border-ok/30 bg-ok/5 text-ok-strong' : 'border-warn/30 bg-warn/5 text-warn',
          )}
        >
          {isProd ? (
            <>
              Estás en <strong>producción</strong>. La key <code>sk_prod_</code> activa quedará{' '}
              <strong>revocada</strong> y las integraciones que la usen dejarán de autenticarse.
            </>
          ) : (
            <>
              La key <code>sk_test_</code> activa quedará <strong>revocada</strong>. La nueva key se
              mostrará una sola vez.
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          Actualizá el secreto en tus integraciones al guardar la key nueva; la anterior dejará de
          funcionar de inmediato.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={rotate.isPending} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant={isProd ? 'success' : 'primary'}
            loading={rotate.isPending}
            onClick={() => rotate.mutate(environment)}
          >
            Confirmar rotación
          </Button>
        </div>
      </Modal>

      <Modal open={!!revealed} onClose={() => setRevealed(null)} title="Nueva API key — cópiala ahora">
        {revealed && (
          <>
            <SuccessAlert>
              Esta es la única vez que verás la key completa. Guardala en un gestor de secretos.
            </SuccessAlert>
            <div className="mt-4 rounded-xl border border-line bg-cream-soft/50 p-4 font-mono text-sm break-all text-ink">
              {revealed.api_key}
            </div>
            <p className="mt-2 text-xs text-muted">
              Ambiente {revealed.environment} · prefijo {revealed.prefix}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={copyKey} className="gap-1.5">
                <CopyIcon />
                {copied ? 'Copiada' : 'Copiar'}
              </Button>
              <Button onClick={() => setRevealed(null)}>Listo</Button>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  )
}
