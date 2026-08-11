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

function KeyIconSmall({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="15" r="4" className="stroke-current" strokeWidth="1.7" />
      <path
        d="m11.5 12.5 8.5-8.5M16 4l4 4M19 7l-3 3"
        className="stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  const meta = [
    `Creada ${formatFechaKey(keyMeta.created_at)}`,
    keyMeta.label ?? null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={cn(panelClass, 'p-5 sm:p-6')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-muted/60">
            <KeyIconSmall />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Secret key</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{meta}</p>
          </div>
        </div>
        {canRotate && (
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
        )}
      </div>

      <div className="mt-5">
        <code className="block min-w-0 rounded-xl border border-line/80 bg-cream-soft/60 px-3.5 py-3 font-mono text-sm leading-none tracking-tight text-ink sm:text-[15px]">
          {maskKeyPrefix(keyMeta.prefix)}
        </code>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          La key completa solo se muestra al generar o rotar. Si la perdiste, rotá para obtener una nueva.
        </p>
      </div>

      <div className="mt-4">
        <Badge className={statusClass(keyMeta.status)}>{formatKeyStatus(keyMeta.status)}</Badge>
      </div>
    </article>
  )
}

function RevokedKeyRow({ keyMeta }: { keyMeta: ApiKeyMeta }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
      <div className="min-w-0">
        <p className="font-mono text-xs tabular-nums text-muted">{maskKeyPrefix(keyMeta.prefix)}</p>
        <p className="mt-0.5 text-xs text-muted/80">
          Revocada · {formatFechaKey(keyMeta.created_at)}
          {keyMeta.label ? ` · ${keyMeta.label}` : ''}
        </p>
      </div>
      <Badge className={statusClass(keyMeta.status)}>{formatKeyStatus(keyMeta.status)}</Badge>
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

  return (
    <AppShell title="API keys">
      <div className="dashboard-canvas -m-4 space-y-5 p-4 sm:-m-6 sm:space-y-6 sm:p-6">
        <PageHeader compactOnMobile title="Keys de emisión" description={API_KEYS_TIP} />

        {err && <Alert>{err}</Alert>}

        {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
        {q.error && <Alert>{(q.error as Error).message}</Alert>}

        {!q.isLoading && !q.error && scoped.length === 0 && (
          <div className={cn(panelClass, 'px-6 py-12 text-center')}>
            <p className="text-base font-semibold text-ink">Todavía no hay keys</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Generá tu primera secret key para conectar tu sistema vía API.
            </p>
            {canRotate && (
              <Button className="mt-6 gap-1.5" variant="secondary" onClick={openRotateConfirm}>
                <RotateIcon />
                Generar key
              </Button>
            )}
          </div>
        )}

        {!q.isLoading && !q.error && activeKey && (
          <ActiveKeyCard
            keyMeta={activeKey}
            canRotate={canRotate}
            onRotate={openRotateConfirm}
          />
        )}

        {!q.isLoading && !q.error && revokedKeys.length > 0 && (
          <div className={panelClass}>
            <p className="border-b border-line/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted sm:px-6">
              Revocadas
            </p>
            <div className="divide-y divide-line/40">
              {revokedKeys.map((k) => (
                <RevokedKeyRow key={`${k.environment}-${k.prefix}-${k.created_at}`} keyMeta={k} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !rotate.isPending && setConfirmOpen(false)}
        title="Rotar secret key"
      >
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            isProd ? 'border-ok/30 bg-ok/5 text-ok-strong' : 'border-warn/30 bg-warn/5 text-warn',
          )}
        >
          {isProd ? (
            <>
              Estás en <strong>producción</strong>. La key activa quedará <strong>revocada</strong> y las
              integraciones que la usen dejarán de autenticarse.
            </>
          ) : (
            <>
              La key activa quedará <strong>revocada</strong>. La nueva key se mostrará una sola vez.
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          Actualizá el secreto en tus integraciones al guardar la key nueva; la anterior dejará de funcionar
          de inmediato.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={rotate.isPending} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant={isProd ? 'danger' : 'primary'}
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
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <code className="block min-w-0 flex-1 rounded-xl border border-line bg-cream-soft/50 px-3.5 py-3 font-mono text-sm break-all text-ink">
                {revealed.api_key}
              </code>
              <Button variant={copied ? 'success-outline' : 'secondary'} onClick={copyKey} className="shrink-0 gap-1.5">
                <CopyIcon />
                {copied ? 'Copiada' : 'Copiar'}
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setRevealed(null)}>Listo</Button>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  )
}
