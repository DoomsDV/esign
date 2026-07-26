import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, Menu, Modal, SuccessAlert } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { listApiKeys, rotateApiKey, type RotateKeyResult } from '@/lib/config'
import type { Environment } from '@/lib/env'
import { cn } from '@/lib/cn'

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-ok/10 text-ok'
  if (status === 'REVOKED') return 'bg-neutral/10 text-neutral'
  return 'bg-warn/10 text-warn'
}

/** Fecha legible para DX: "25 jul 2026, 21:53 h". */
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
      <path
        d="M5 15V5a2 2 0 0 1 2-2h10"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

  const keys = q.data ?? []
  const scoped = keys.filter((k) => k.environment === environment)

  return (
    <AppShell title="API keys">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Keys de emisión</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              El ambiente lo determina el prefijo (<code className="text-ink">sk_test_</code> /{' '}
              <code className="text-ink">sk_prod_</code>). La key completa se muestra una sola vez al
              rotar. El toggle TEST/PROD filtra la lista. Rotar invalida la key ACTIVE anterior.
            </p>
          </div>
          {canRotate && (
            <Button
              className="shrink-0 self-start"
              variant={isProd ? 'success' : 'primary'}
              onClick={() => {
                setErr(null)
                setConfirmOpen(true)
              }}
            >
              <RotateIcon />
              Rotar key {environment}
            </Button>
          )}
        </div>

        {err && (
          <div className="px-6 pb-4">
            <Alert>{err}</Alert>
          </div>
        )}

        <div className="border-t border-line">
          {q.isLoading && <p className="p-6 text-sm text-muted">Cargando…</p>}
          {q.error && (
            <div className="p-6">
              <Alert>{(q.error as Error).message}</Alert>
            </div>
          )}

          {!q.isLoading && !q.error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-3 pl-6 pr-4 font-semibold">Ambiente</th>
                    <th className="px-4 py-3 font-semibold">Prefijo</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Creada</th>
                    <th className="py-3 pl-4 pr-6 font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoped.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted">
                        No hay keys para {environment}
                      </td>
                    </tr>
                  ) : (
                    scoped.map((k) => {
                      const revoked = k.status === 'REVOKED'
                      return (
                        <tr
                          key={`${k.environment}-${k.prefix}-${k.created_at}`}
                          className={cn(
                            'border-b border-line align-middle transition-colors last:border-0 hover:bg-cream-soft',
                            revoked && 'text-muted',
                          )}
                        >
                          <td className="py-3 pl-6 pr-4 align-middle font-medium text-ink">{k.environment}</td>
                          <td className="px-4 py-3 align-middle font-mono text-xs text-ink">
                            {k.prefix}
                            <span className="text-muted">…</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <Badge className={statusClass(k.status)}>{k.status}</Badge>
                          </td>
                          <td className="px-4 py-3 align-middle text-muted">
                            <span title={k.created_at ?? undefined}>{formatFechaKey(k.created_at)}</span>
                          </td>
                          <td className="py-3 pl-4 pr-6 align-middle text-right">
                            <div className="flex justify-end">
                              <Menu
                                items={[
                                  {
                                    label:
                                      copiedPrefix === k.prefix ? 'Copiado' : 'Copiar prefijo',
                                    onClick: () => copyPrefix(k.prefix),
                                    icon: <CopyIcon />,
                                  },
                                  ...(canRotate
                                    ? [
                                        {
                                          label: `Rotar key ${k.environment}`,
                                          onClick: () => {
                                            setErr(null)
                                            setConfirmOpen(true)
                                          },
                                          icon: <RotateIcon />,
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => !rotate.isPending && setConfirmOpen(false)}
        title={`Rotar key ${environment}`}
      >
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            isProd
              ? 'border-ok/30 bg-ok/5 text-ok-strong'
              : 'border-warn/30 bg-warn/5 text-warn',
          )}
        >
          {isProd ? (
            <>
              Estás en <strong>PRODUCCIÓN</strong>. La key <code>sk_prod_</code> ACTIVE actual quedará{' '}
              <strong>REVOKED</strong> y las integraciones que la usen dejarán de autenticarse.
            </>
          ) : (
            <>
              La key <code>sk_test_</code> ACTIVE actual quedará <strong>REVOKED</strong> y dejará de
              funcionar. La nueva key se mostrará una sola vez.
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          Actualizá el secreto en tus integraciones al guardar la key nueva; la anterior dejará de
          funcionar de inmediato.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={rotate.isPending}
            onClick={() => setConfirmOpen(false)}
          >
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

      <Modal
        open={!!revealed}
        onClose={() => setRevealed(null)}
        title="Nueva API key (Cópiala ahora)"
      >
        {revealed && (
          <>
            <SuccessAlert>
              Esta es la única vez que verás la key completa. Guárdala en un gestor de secretos.
            </SuccessAlert>
            <div className="mt-4 rounded-xl border border-line bg-white p-4 font-mono text-sm break-all">
              {revealed.api_key}
            </div>
            <p className="mt-2 text-xs text-muted">
              Ambiente {revealed.environment} · prefijo {revealed.prefix}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={copyKey}>
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
