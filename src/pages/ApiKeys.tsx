import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Drawer, Menu, SuccessAlert } from '@/components/ui'
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

/** Máscara estilo Stripe: sk_test_••••••••••••••••ac41 */
function maskKeyPrefix(prefix: string): string {
  const match = prefix.match(/^(sk_(?:test|prod)_)(.+)$/i)
  if (!match) return prefix
  const [, head, tail] = match
  const suffix = tail.length >= 4 ? tail.slice(-4) : tail
  return `${head}${'•'.repeat(Math.max(12, 16 - suffix.length))}${suffix}`
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

function StatusChip({ status }: { status: string }) {
  const active = status.toUpperCase() === 'ACTIVE'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        statusClass(status),
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-ok' : 'bg-neutral')} />
      {formatKeyStatus(status)}
    </span>
  )
}

function ActiveKeyCard({
  keyMeta,
  canRotate,
  onRotate,
}: {
  keyMeta: ApiKeyMeta
  canRotate: boolean
  onRotate: () => void
}) {
  const meta = `Creada ${formatFechaKey(keyMeta.created_at)}`

  return (
    <article className="estab-card overflow-hidden rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Secret key</p>
        <div className="flex shrink-0 items-center gap-1">
          <StatusChip status={keyMeta.status} />
          {canRotate && (
            <div className="hidden sm:block">
              <Menu
                items={[
                  {
                    label: 'Rotar key',
                    onClick: onRotate,
                    icon: <RotateIcon />,
                    danger: true,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 break-all font-mono text-[1.35rem] font-semibold leading-[1.15] tracking-tight text-ink select-none sm:text-lg">
        {maskKeyPrefix(keyMeta.prefix)}
      </p>
      <p className="mt-2 text-[11px] text-muted">{meta}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        La key completa solo se muestra al generar o rotar. Si la perdiste, rotá para obtener una nueva.
      </p>
    </article>
  )
}

function RevokedKeyRow({ keyMeta }: { keyMeta: ApiKeyMeta }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="break-all font-mono text-xs tabular-nums text-ink">{maskKeyPrefix(keyMeta.prefix)}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {formatFechaKey(keyMeta.created_at)}
          {keyMeta.label ? ` · ${keyMeta.label}` : ''}
        </p>
      </div>
      <StatusChip status={keyMeta.status} />
    </div>
  )
}

const API_KEYS_TIP =
  'Claves para integrar tu backend con etick. El prefijo sk_test_ / sk_prod_ define el ambiente SIFEN. La key completa solo se muestra una vez al rotar; la anterior queda revocada de inmediato.'

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
  const confirmRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!confirmOpen) return
    confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [confirmOpen])

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

  function openRotateConfirm() {
    setErr(null)
    setConfirmOpen(true)
  }

  const keys = q.data ?? []
  const scoped = keys.filter((k) => k.environment === environment)
  const activeKey = scoped.find((k) => k.status === 'ACTIVE')
  const revokedKeys = scoped.filter((k) => k.status === 'REVOKED')

  const revealOpen = !!revealed
  const fabLabel = activeKey ? 'Rotar' : 'Generar'

  return (
    <AppShell title="API keys">
      <div className="dashboard-canvas space-y-4 sm:-m-6 sm:space-y-6 sm:p-6">
        {!q.isLoading && (
          <div className="hidden items-end justify-between gap-3 sm:flex">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Integración</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Keys de emisión</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{API_KEYS_TIP}</p>
            </div>
            {canRotate && (
              <Button
                variant={activeKey ? 'secondary' : 'primary'}
                onClick={openRotateConfirm}
                className="h-10 shrink-0 gap-1.5"
              >
                <RotateIcon />
                {activeKey ? 'Rotar key' : 'Generar key'}
              </Button>
            )}
          </div>
        )}

        {confirmOpen && (
          <div ref={confirmRef}>
            <Alert title={activeKey ? 'Rotar secret key' : 'Generar secret key'}>
              <p>
                {isProd ? (
                  <>
                    Estás en <strong>producción</strong>. La key activa quedará <strong>revocada</strong> y las
                    integraciones que la usen dejarán de autenticarse.
                  </>
                ) : activeKey ? (
                  <>
                    La key activa quedará <strong>revocada</strong>. La nueva key se mostrará una sola vez.
                  </>
                ) : (
                  <>La key completa se mostrará una sola vez. Guardala en un gestor de secretos.</>
                )}
              </p>
              {activeKey && (
                <p className="mt-1.5">
                  Actualizá el secreto en tus integraciones al guardar la key nueva; la anterior dejará de funcionar
                  de inmediato.
                </p>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" disabled={rotate.isPending} onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant={isProd ? 'danger' : 'primary'}
                  loading={rotate.isPending}
                  onClick={() => rotate.mutate(environment)}
                >
                  {activeKey ? 'Confirmar rotación' : 'Generar key'}
                </Button>
              </div>
            </Alert>
          </div>
        )}
        {err && <Alert>{err}</Alert>}
        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {!q.isLoading && !q.error && scoped.length === 0 && (
          <div className="rounded-[1.25rem] bg-surface px-5 py-10 text-center sm:px-6 sm:py-12">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Integración</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-ink">Todavía no hay keys</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Generá tu primera secret key para conectar tu sistema vía API.
            </p>
          </div>
        )}

        {!q.isLoading && !q.error && activeKey && (
          <ActiveKeyCard keyMeta={activeKey} canRotate={canRotate} onRotate={openRotateConfirm} />
        )}

        {!q.isLoading && !q.error && revokedKeys.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Revocadas</h3>
            <div className="overflow-hidden rounded-[1.25rem] bg-surface px-4 py-4 sm:px-6 sm:py-5">
              {revokedKeys.map((k) => (
                <RevokedKeyRow key={`${k.environment}-${k.prefix}-${k.created_at}`} keyMeta={k} />
              ))}
            </div>
          </section>
        )}
      </div>

      {canRotate &&
        !q.isLoading &&
        createPortal(
          <button
            type="button"
            onClick={openRotateConfirm}
            className={cn(
              'fixed right-4 z-[35] inline-flex h-12 items-center gap-2 rounded-full bg-brand-400 pr-5 pl-1.5 text-sm font-semibold text-ink md:hidden',
              'shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-ink)_22%,transparent)]',
              'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'active:scale-[0.96]',
              'bottom-[calc(5.35rem+env(safe-area-inset-bottom,0px))]',
              environment === 'PROD' && 'env-prod',
              revealOpen && 'pointer-events-none scale-95 opacity-0',
            )}
            aria-label={activeKey ? 'Rotar secret key' : 'Generar secret key'}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
              <RotateIcon />
            </span>
            {fabLabel}
          </button>,
          document.body,
        )}

      <Drawer
        open={!!revealed}
        onClose={() => setRevealed(null)}
        title="Nueva API key"
        keepMounted
        footer={
          <div className="flex justify-end gap-2">
            <Button variant={copied ? 'success-outline' : 'secondary'} onClick={copyKey} className="gap-1.5">
              <CopyIcon />
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
            <Button onClick={() => setRevealed(null)}>Listo</Button>
          </div>
        }
      >
        {revealed && (
          <>
            <SuccessAlert>
              Esta es la única vez que verás la key completa. Guardala en un gestor de secretos.
            </SuccessAlert>
            <p className="mt-4 break-all rounded-[1.05rem] bg-surface px-3.5 py-3 font-mono text-sm leading-snug text-ink">
              {revealed.api_key}
            </p>
          </>
        )}
      </Drawer>
    </AppShell>
  )
}
