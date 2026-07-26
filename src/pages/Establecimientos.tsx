import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Card, Modal, SuccessAlert, TextField } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  listEstablecimientos,
  upsertEstablecimiento,
  upsertPunto,
  type Establecimiento,
  type EstablecimientoUpsert,
  type PuntoUpsert,
} from '@/lib/config'

const emptyEstab: EstablecimientoUpsert = {
  codigo: '',
  denominacion: '',
  direccion: '',
  num_casa: '0',
  dep: { cod: 0, desc: '' },
  dis: { cod: 0, desc: '' },
  ciu: { cod: 0, desc: '' },
  telefono: '',
  email: '',
}

export default function Establecimientos() {
  const { session } = useAuth()
  const token = session!.accessToken
  const qc = useQueryClient()
  const canEdit = session!.role === 'owner'

  const q = useQuery({
    queryKey: ['establecimientos'],
    queryFn: () => listEstablecimientos(token),
  })

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<EstablecimientoUpsert>(emptyEstab)
  const [puntoOpen, setPuntoOpen] = useState<Establecimiento | null>(null)
  const [punto, setPunto] = useState<PuntoUpsert>({ codigo: '', descripcion: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function openNew() {
    setForm(emptyEstab)
    setEditOpen(true)
    setErr(null)
  }

  function openEdit(e: Establecimiento) {
    setForm({
      codigo: e.codigo,
      denominacion: e.denominacion ?? '',
      direccion: e.direccion,
      num_casa: e.num_casa ?? '0',
      dep: e.dep,
      dis: e.dis ?? { cod: 0, desc: '' },
      ciu: e.ciu,
      telefono: e.telefono ?? '',
      email: e.email ?? '',
    })
    setEditOpen(true)
    setErr(null)
  }

  const saveEstab = useMutation({
    mutationFn: () =>
      upsertEstablecimiento(token, {
        ...form,
        dep: { cod: Number(form.dep.cod), desc: form.dep.desc },
        dis: form.dis?.cod ? { cod: Number(form.dis.cod), desc: form.dis.desc } : undefined,
        ciu: { cod: Number(form.ciu.cod), desc: form.ciu.desc },
      }),
    onSuccess: async () => {
      setMsg('Establecimiento guardado')
      setEditOpen(false)
      await qc.invalidateQueries({ queryKey: ['establecimientos'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  const savePunto = useMutation({
    mutationFn: () => upsertPunto(token, puntoOpen!.codigo, punto),
    onSuccess: async () => {
      setMsg('Punto de expedicion guardado')
      setPuntoOpen(null)
      setPunto({ codigo: '', descripcion: '' })
      await qc.invalidateQueries({ queryKey: ['establecimientos'] })
    },
    onError: (e: Error) => setErr(e instanceof ApiError ? e.message : e.message),
  })

  return (
    <AppShell
      title="Establecimientos"
      actions={
        canEdit ? (
          <Button onClick={openNew} variant="secondary">
            + Sucursal
          </Button>
        ) : undefined
      }
    >
      {msg && (
        <div className="mb-4">
          <SuccessAlert>{msg}</SuccessAlert>
        </div>
      )}
      {q.isLoading && <p className="text-sm text-muted">Cargando…</p>}
      {q.error && <Alert>{(q.error as Error).message}</Alert>}

      <div className="grid gap-4">
        {(q.data ?? []).map((e) => (
          <Card key={e.codigo} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink">
                    {e.codigo} · {e.denominacion || 'Sin denominacion'}
                  </h3>
                  <Badge className={e.is_active ? 'bg-ok/10 text-ok' : 'bg-neutral/10 text-neutral'}>
                    {e.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {e.direccion} {e.num_casa ? `N° ${e.num_casa}` : ''} · {e.ciu?.desc} / {e.dep?.desc}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Geo: dep {e.dep?.cod} · dis {e.dis?.cod ?? '—'} · ciu {e.ciu?.cod}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(e)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPuntoOpen(e)
                      setPunto({ codigo: '', descripcion: '' })
                      setErr(null)
                    }}
                  >
                    + Punto
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-cream-soft text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-semibold">Punto</th>
                    <th className="px-3 py-2 font-semibold">Descripcion</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(e.puntos ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-muted">
                        Sin puntos de expedicion
                      </td>
                    </tr>
                  ) : (
                    (e.puntos ?? []).map((p) => (
                      <tr key={p.codigo} className="border-b border-line last:border-0">
                        <td className="px-3 py-2 font-medium">{p.codigo}</td>
                        <td className="px-3 py-2">{p.descripcion || '—'}</td>
                        <td className="px-3 py-2">{p.is_active ? 'Activo' : 'Inactivo'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">
            Todavia no hay establecimientos. Crea la sucursal 001 con la geo registrada en el RUC/SET.
          </Card>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Establecimiento">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="001"
          />
          <TextField
            label="Denominacion"
            value={form.denominacion ?? ''}
            onChange={(e) => setForm({ ...form, denominacion: e.target.value })}
          />
          <TextField
            label="Direccion"
            className="sm:col-span-2"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
          <TextField
            label="N° casa"
            value={form.num_casa ?? '0'}
            onChange={(e) => setForm({ ...form, num_casa: e.target.value })}
          />
          <TextField
            label="Telefono"
            value={form.telefono ?? ''}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
          <TextField
            label="Dep cod"
            value={String(form.dep.cod || '')}
            onChange={(e) => setForm({ ...form, dep: { ...form.dep, cod: Number(e.target.value) || 0 } })}
          />
          <TextField
            label="Dep desc"
            value={form.dep.desc}
            onChange={(e) => setForm({ ...form, dep: { ...form.dep, desc: e.target.value } })}
          />
          <TextField
            label="Dis cod"
            value={String(form.dis?.cod || '')}
            onChange={(e) =>
              setForm({ ...form, dis: { cod: Number(e.target.value) || 0, desc: form.dis?.desc ?? '' } })
            }
          />
          <TextField
            label="Dis desc"
            value={form.dis?.desc ?? ''}
            onChange={(e) => setForm({ ...form, dis: { cod: form.dis?.cod ?? 0, desc: e.target.value } })}
          />
          <TextField
            label="Ciu cod"
            value={String(form.ciu.cod || '')}
            onChange={(e) => setForm({ ...form, ciu: { ...form.ciu, cod: Number(e.target.value) || 0 } })}
          />
          <TextField
            label="Ciu desc"
            value={form.ciu.desc}
            onChange={(e) => setForm({ ...form, ciu: { ...form.ciu, desc: e.target.value } })}
          />
        </div>
        {err && (
          <div className="mt-3">
            <Alert>{err}</Alert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            Cancelar
          </Button>
          <Button loading={saveEstab.isPending} onClick={() => saveEstab.mutate()}>
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!puntoOpen}
        onClose={() => setPuntoOpen(null)}
        title={`Punto · est. ${puntoOpen?.codigo ?? ''}`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Codigo"
            value={punto.codigo}
            onChange={(e) => setPunto({ ...punto, codigo: e.target.value })}
            placeholder="001"
          />
          <TextField
            label="Descripcion"
            value={punto.descripcion ?? ''}
            onChange={(e) => setPunto({ ...punto, descripcion: e.target.value })}
            placeholder="Caja 1"
          />
        </div>
        {err && (
          <div className="mt-3">
            <Alert>{err}</Alert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPuntoOpen(null)}>
            Cancelar
          </Button>
          <Button loading={savePunto.isPending} onClick={() => savePunto.mutate()}>
            Guardar punto
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
