import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, Modal, SuccessAlert } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { listApiKeys, rotateApiKey, type RotateKeyResult } from '@/lib/config'
import type { Environment } from '@/lib/env'

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-ok/10 text-ok'
  if (status === 'REVOKED') return 'bg-neutral/10 text-neutral'
  return 'bg-warn/10 text-warn'
}

export default function ApiKeys() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canRotate = session!.role === 'owner' || session!.role === 'developer'

  const q = useQuery({ queryKey: ['api-keys'], queryFn: () => listApiKeys(token) })

  const [revealed, setRevealed] = useState<RotateKeyResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const rotate = useMutation({
    mutationFn: (env: Environment) => rotateApiKey(token, env.toLowerCase() as Lowercase<Environment>),
    onSuccess: async (data) => {
      setErr(null)
      setRevealed(data)
      setCopied(false)
      await qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  async function copyKey() {
    if (!revealed) return
    await navigator.clipboard.writeText(revealed.api_key)
    setCopied(true)
  }

  const keys = q.data ?? []
  const scoped = keys.filter((k) => k.environment === environment)

  return (
    <AppShell title="API keys">
      <Card className="mb-5 p-5">
        <h2 className="text-base font-bold text-ink">Keys de emision</h2>
        <p className="mt-1 text-sm text-muted">
          El ambiente lo determina el prefijo (<code className="text-ink">sk_test_</code> /{' '}
          <code className="text-ink">sk_prod_</code>). La key completa se muestra una sola vez al rotar.
          El toggle TEST/PROD filtra la lista.
        </p>
        {canRotate && (
          <div className="mt-4">
            <Button
              loading={rotate.isPending}
              onClick={() => {
                if (
                  confirm(
                    `¿Rotar la API key de ${environment}? La key anterior quedara REVOKED y dejara de funcionar.`,
                  )
                ) {
                  rotate.mutate(environment)
                }
              }}
            >
              Rotar key {environment}
            </Button>
          </div>
        )}
        {err && (
          <div className="mt-3">
            <Alert>{err}</Alert>
          </div>
        )}
      </Card>

      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Ambiente</th>
              <th className="px-4 py-3 font-semibold">Prefijo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Creada</th>
            </tr>
          </thead>
          <tbody>
            {scoped.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No hay keys para {environment}
                </td>
              </tr>
            ) : (
              scoped.map((k) => (
                <tr key={`${k.environment}-${k.prefix}-${k.created_at}`} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{k.environment}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
                  <td className="px-4 py-3">
                    <Badge className={statusClass(k.status)}>{k.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{k.created_at ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!revealed}
        onClose={() => setRevealed(null)}
        title="Nueva API key (copiala ahora)"
      >
        {revealed && (
          <>
            <SuccessAlert>
              Esta es la unica vez que veras la key completa. Guardala en un gestor de secretos.
            </SuccessAlert>
            <div className="mt-4 rounded-xl border border-line bg-cream-soft p-4 font-mono text-sm break-all">
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
