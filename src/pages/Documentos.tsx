import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { Alert, Badge, Button, Modal, Select } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import {
  decodeEntities,
  downloadXml,
  estadoMeta,
  formatFecha,
  formatMoneda,
  getDocument,
  listDocuments,
  requestRetry,
  tipoDeLabel,
  type DocumentListItem,
} from '@/lib/documents'

const ESTADOS = ['APROBADO', 'RECHAZADO', 'FIRMADO', 'ENVIADO', 'CANCELADO']
const TIPOS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Factura' },
  { value: '5', label: 'Nota de credito' },
  { value: '6', label: 'Nota de debito' },
  { value: '4', label: 'Autofactura' },
  { value: '7', label: 'Nota de remision' },
]
const PAGE_SIZE = 15

function EstadoBadge({ estado }: { estado: string }) {
  const m = estadoMeta(estado)
  return (
    <Badge className={m.className}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  )
}

export default function Documentos() {
  const { session, environment } = useAuth()
  const token = session!.accessToken
  const queryClient = useQueryClient()

  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['documents', environment, estado, tipo, page],
    queryFn: () =>
      listDocuments(token, {
        environment,
        estado: estado || undefined,
        tipo: tipo ? Number(tipo) : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE))

  function resetTo(setter: (v: string) => void, v: string) {
    setter(v)
    setPage(1)
  }

  return (
    <AppShell title="Documentos">
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Select label="Estado" value={estado} onChange={(e) => resetTo(setEstado, e.target.value)}>
          <option value="">Todos</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {estadoMeta(s).label}
            </option>
          ))}
        </Select>
        <Select label="Tipo" value={tipo} onChange={(e) => resetTo(setTipo, e.target.value)}>
          <option value="">Todos</option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <div className="ml-auto text-sm text-muted">
          {listQuery.data ? `${listQuery.data.total} documento(s) · ${environment}` : ''}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Nro</th>
              <th className="px-4 py-3 font-semibold">Receptor</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Cargando...
                </td>
              </tr>
            )}
            {listQuery.isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <Alert>
                    {listQuery.error instanceof ApiError
                      ? listQuery.error.message
                      : 'No se pudieron cargar los documentos.'}
                  </Alert>
                </td>
              </tr>
            )}
            {listQuery.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No hay documentos para este filtro.
                </td>
              </tr>
            )}
            {listQuery.data?.items.map((doc: DocumentListItem) => (
              <tr
                key={doc.cdc}
                className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-cream-soft"
                onClick={() => setSelected(doc.cdc)}
              >
                <td className="px-4 py-3 text-muted">{formatFecha(doc.fecha_emision)}</td>
                <td className="px-4 py-3">{tipoDeLabel(doc.tipo_de)}</td>
                <td className="px-4 py-3 font-mono text-xs">{doc.num_documento}</td>
                <td className="px-4 py-3">{doc.receptor_nombre || 'Sin nombre'}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={doc.estado} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoneda(doc.total_operacion, doc.moneda)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-brand-600">Ver</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted">
            {page} / {totalPages}
          </span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      <DocumentDetailModal
        cdc={selected}
        token={token}
        onClose={() => setSelected(null)}
        onRetried={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />
    </AppShell>
  )
}

function DocumentDetailModal({
  cdc,
  token,
  onClose,
  onRetried,
}: {
  cdc: string | null
  token: string
  onClose: () => void
  onRetried: () => void
}) {
  const detailQuery = useQuery({
    queryKey: ['document', cdc],
    queryFn: () => getDocument(token, cdc!),
    enabled: !!cdc,
  })

  const retryMutation = useMutation({
    mutationFn: () => requestRetry(token, cdc!),
    onSuccess: onRetried,
  })

  const doc = detailQuery.data

  return (
    <Modal open={!!cdc} onClose={onClose} title="Detalle del documento">
      {detailQuery.isLoading && <p className="text-muted">Cargando...</p>}
      {detailQuery.isError && (
        <Alert>
          {detailQuery.error instanceof ApiError ? detailQuery.error.message : 'No se pudo cargar el detalle.'}
        </Alert>
      )}
      {doc && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <EstadoBadge estado={doc.estado} />
            <span className="text-sm text-muted">{tipoDeLabel(doc.tipo_de)}</span>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="CDC" value={doc.cdc} mono />
            <Field label="Numero" value={doc.num_documento} />
            <Field label="Establecimiento / Punto" value={`${doc.establecimiento} - ${doc.punto_expedicion}`} />
            <Field label="Emitido" value={formatFecha(doc.fecha_emision)} />
            <Field label="Receptor" value={doc.receptor_nombre || 'Sin nombre'} />
            <Field label="Documento receptor" value={doc.receptor_doc || '—'} />
            <Field label="Total" value={formatMoneda(doc.total_operacion, doc.moneda)} />
            <Field label="Protocolo (dProtAut)" value={doc.prot_aut || '—'} />
            <Field label="Codigo SIFEN (dCodRes)" value={doc.cod_res || '—'} />
            <Field label="Ambiente" value={doc.environment} />
          </dl>

          {doc.mensaje_res && (
            <div className="rounded-xl border border-line bg-cream-soft px-4 py-3 text-sm">
              <span className="font-semibold text-ink">Mensaje SIFEN: </span>
              <span className="text-muted">{decodeEntities(doc.mensaje_res)}</span>
            </div>
          )}

          {retryMutation.isError && (
            <Alert>
              {retryMutation.error instanceof ApiError
                ? retryMutation.error.message
                : 'No se pudo marcar para reenvio.'}
            </Alert>
          )}
          {retryMutation.isSuccess && (
            <div className="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok">
              Documento marcado para reenvio. El servicio lo reintentara automaticamente.
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" onClick={() => downloadXml(token, doc.cdc)}>
              Descargar XML
            </Button>
            {doc.estado === 'FIRMADO' && (
              <Button loading={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
                Reenviar a SIFEN
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 break-all text-sm text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
