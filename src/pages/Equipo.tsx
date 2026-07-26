import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Button, Card, SuccessAlert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { createInvitation, type InviteResult } from '@/lib/config'

export default function Equipo() {
  const { session } = useAuth()
  const token = session!.accessToken
  const canInvite = session!.role === 'owner'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'developer' | 'analyst' | 'owner'>('developer')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const invite = useMutation({
    mutationFn: () => createInvitation(token, email.trim(), role),
    onSuccess: (data) => {
      setErr(null)
      setResult(data)
      setEmail('')
    },
    onError: (e: Error) => {
      setResult(null)
      setErr(e instanceof ApiError ? e.message : e.message)
    },
  })

  return (
    <AppShell title="Equipo">
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <h2 className="text-base font-bold text-ink">Invitar miembro</h2>
          <p className="mt-1 text-sm text-muted">
            Crea una invitacion PENDING con token. El envio de correo y la aceptacion quedan para una
            fase posterior.
          </p>

          {!canInvite ? (
            <div className="mt-4">
              <Alert>Solo el owner puede invitar.</Alert>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@empresa.com"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink">Rol</label>
                  <select
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                  >
                    <option value="developer">developer</option>
                    <option value="analyst">analyst</option>
                    <option value="owner">owner</option>
                  </select>
                </div>
              </div>
              {err && (
                <div className="mt-4">
                  <Alert>{err}</Alert>
                </div>
              )}
              {result && (
                <div className="mt-4 space-y-2">
                  <SuccessAlert>Invitacion creada ({result.status ?? 'PENDING'}).</SuccessAlert>
                  {result.token && (
                    <div className="rounded-xl border border-line bg-cream-soft p-3 font-mono text-xs break-all">
                      token: {result.token}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <Button
                  loading={invite.isPending}
                  onClick={() => invite.mutate()}
                  disabled={!email.includes('@')}
                >
                  Crear invitacion
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
