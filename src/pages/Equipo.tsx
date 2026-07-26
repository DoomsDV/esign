import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, SuccessAlert, TextField } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { createInvitation, type InviteResult } from '@/lib/config'

const ROLES: Array<{
  value: 'developer' | 'analyst' | 'owner'
  label: string
  desc: string
}> = [
  {
    value: 'developer',
    label: 'Developer',
    desc: 'Ve y rota API keys, emite documentos y consulta configuración.',
  },
  {
    value: 'analyst',
    label: 'Analyst',
    desc: 'Solo lectura de documentos. Sin acceso a certificado ni keys.',
  },
  {
    value: 'owner',
    label: 'Owner',
    desc: 'Acceso total: equipo, certificado, ambientes y facturación.',
  },
]

export default function Equipo() {
  const { session } = useAuth()
  const token = session!.accessToken
  const canInvite = session!.role === 'owner'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'developer' | 'analyst' | 'owner'>('developer')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const invite = useMutation({
    mutationFn: () => createInvitation(token, email.trim(), role),
    onSuccess: (data) => {
      setErr(null)
      setResult(data)
      setCopied(false)
      setEmail('')
    },
    onError: (e: Error) => {
      setResult(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  async function copyToken() {
    if (!result?.token) return
    await navigator.clipboard.writeText(result.token)
    setCopied(true)
  }

  return (
    <AppShell title="Equipo">
      <div className="flex w-full flex-col gap-8 bg-white lg:grid lg:grid-cols-2 lg:gap-10">
        <section className="min-w-0 lg:border-r lg:border-line/70 lg:pr-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Acceso</p>
          <h2 className="mt-1 text-base font-bold text-ink">Invitar miembro</h2>
          <p className="mt-1 text-sm text-muted">
            Generá una invitación PENDING con token. El envío de correo y la aceptación quedan para
            una fase posterior.
          </p>

          {!canInvite ? (
            <div className="mt-6">
              <Alert>Solo el owner puede invitar.</Alert>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@empresa.com"
                requiredMark
              />

              <div>
                <p className="mb-2 text-sm font-medium text-ink">
                  Rol <span className="text-danger">*</span>
                </p>
                <div className="grid gap-2">
                  {ROLES.map((r) => {
                    const active = role === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={cn(
                          'rounded-xl border px-4 py-3 text-left transition-colors',
                          active
                            ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-200'
                            : 'border-line hover:border-ink/25 hover:bg-cream',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{r.label}</span>
                          {active && (
                            <Badge className="bg-brand-100 text-brand-700">{r.value}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {err && <Alert>{err}</Alert>}

              <div className="flex justify-end pt-1">
                <Button
                  loading={invite.isPending}
                  onClick={() => invite.mutate()}
                  disabled={!email.includes('@')}
                >
                  Crear invitación
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 border-t border-line/70 pt-8 lg:border-t-0 lg:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Resultado</p>
          <h2 className="mt-1 text-base font-bold text-ink">Última invitación</h2>
          <p className="mt-1 text-sm text-muted">
            El token se muestra una vez. Compartilo por un canal seguro con el invitado.
          </p>

          {!result ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink">Sin invitaciones recientes</p>
              <p className="mt-1 text-sm text-muted">
                Cuando crees una, el token aparecerá acá para copiarlo.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <SuccessAlert>
                Invitación creada ({result.status ?? 'PENDING'})
                {result.email ? ` · ${result.email}` : ''}
              </SuccessAlert>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Rol</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{result.role ?? role}</p>
                </div>
                {result.expires_at && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Expira</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{result.expires_at}</p>
                  </div>
                )}
              </div>
              {result.token && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Token</p>
                    <button
                      type="button"
                      onClick={copyToken}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-600"
                    >
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <div className="rounded-xl border border-line bg-white px-4 py-3 font-mono text-xs break-all leading-relaxed text-ink">
                    {result.token}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
