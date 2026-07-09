import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Zap, Droplets, Wifi, Flame, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useServices, useCreateService, useUpdateService, useDeleteService, useMarcarExcedenteCobrado } from '@/hooks/useServices'
import { useProperties } from '@/hooks/useProperties'
import { formatCurrency, formatDate, currentMonthYear, formatMonthYear } from '@/lib/utils'
import type { ServiceForm, ServiceType, Property } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export const Route = createFileRoute('/_app/servicios')({
  component: ServiciosPage,
})

const SERVICE_TYPES: { value: ServiceType; label: string; Icon: any; color: string; bg: string; chartColor: string }[] = [
  { value: 'luz',      label: 'Luz',      Icon: Zap,            color: 'text-blue-600',   bg: 'bg-blue-50',   chartColor: '#378ADD' },
  { value: 'agua',     label: 'Agua',     Icon: Droplets,       color: 'text-teal-600',   bg: 'bg-teal-50',   chartColor: '#1D9E75' },
  { value: 'internet', label: 'Internet', Icon: Wifi,           color: 'text-amber-600',  bg: 'bg-amber-50',  chartColor: '#BA7517' },
  { value: 'gas',      label: 'Gas',      Icon: Flame,          color: 'text-orange-600', bg: 'bg-orange-50', chartColor: '#D85A30' },
  { value: 'otro',     label: 'Otro',     Icon: MoreHorizontal, color: 'text-gray-600',   bg: 'bg-gray-100',  chartColor: '#888780' },
]

const EMPTY_FORM = {
  property_id:  0,
  service_type: 'luz' as ServiceType,
  paid_at:      new Date().toISOString().split('T')[0],
  amount:       0,
  status:       'pagado',
  comment:      '',
}

function ServiciosPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)

  const { data: services = [], isLoading } = useServices(month, year)
  const { data: properties = [] }          = useProperties()
  const createMutation    = useCreateService()
  const updateMutation    = useUpdateService()
  const deleteMutation    = useDeleteService()
  const excedenteMutation = useMarcarExcedenteCobrado()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalPagado    = useMemo(() => services.filter((s: any) => s.status === 'pagado').reduce((a: number, s: any) => a + s.amount, 0), [services])
  const totalPendiente = useMemo(() => services.filter((s: any) => s.status === 'pendiente').reduce((a: number, s: any) => a + s.amount, 0), [services])

  const chartData = useMemo(() => {
    const byType: Record<string, number> = {}
    services.forEach((s: any) => { byType[s.service_type] = (byType[s.service_type] ?? 0) + s.amount })
    return SERVICE_TYPES.map(t => ({ name: t.label, total: byType[t.value] ?? 0, color: t.chartColor })).filter(d => d.total > 0)
  }, [services])

  const excedentesPendientes = useMemo(() =>
    services.filter((s: any) => s.service_type === 'luz' && (s.excedente ?? 0) > 0 && s.excedente_status === 'pendiente')
  , [services])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, paid_at: new Date().toISOString().split('T')[0] })
    setSheetOpen(true)
  }

  function openEdit(sv: any) {
    setEditing(sv)
    setForm({
      property_id:  sv.property_id,
      service_type: sv.service_type,
      paid_at:      sv.paid_at,
      amount:       sv.amount,
      status:       sv.status ?? 'pagado',
      comment:      sv.comment ?? '',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form })
    } else {
      await createMutation.mutateAsync(form)
    }
    setSheetOpen(false)
  }

  async function handleDelete() {
    if (!confirmId) return
    await deleteMutation.mutateAsync(confirmId)
    setConfirmId(null)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader
        title="Servicios"
        subtitle={formatMonthYear(month, year)}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
                <ChevronLeft size={14} className="text-white" />
              </button>
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
                <ChevronRight size={14} className="text-white" />
              </button>
            </div>
            <button onClick={openCreate} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
              <Plus size={14} className="text-accent-DEFAULT" />
              <span className="text-accent-DEFAULT text-xs font-medium">Registrar</span>
            </button>
          </div>
        }
      />

      {services.length > 0 && (
        <div className="bg-primary-500 px-4 pb-3 lg:px-8 xl:px-10 lg:pb-5">
          <div className="grid grid-cols-2 gap-2 lg:gap-4 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto">
            <div className="bg-white/10 rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4">
              <p className="text-white/60 text-[10px] lg:text-sm">Pagado</p>
              <p className="text-white font-bold text-base lg:text-2xl">{formatCurrency(totalPagado)}</p>
            </div>
            <div className="bg-white/10 rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4">
              <p className="text-white/60 text-[10px] lg:text-sm">Pendiente de pago</p>
              <p className="text-amber-300 font-bold text-base lg:text-2xl">{formatCurrency(totalPendiente)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-3 lg:px-8 xl:px-10 lg:py-6 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto">

        {/* Excedentes luz pendientes */}
        {excedentesPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl lg:rounded-2xl overflow-hidden">
            <div className="px-3 py-2.5 lg:px-5 lg:py-3.5 flex items-center gap-2 border-b border-amber-200">
              <Zap size={14} className="text-amber-600" />
              <span className="text-xs lg:text-sm font-bold text-amber-800">Excedente luz por cobrar</span>
              <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{excedentesPendientes.length}</span>
            </div>
            <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3">
            {excedentesPendientes.map((s: any) => (
              <div key={s.id} className="px-3 py-2.5 lg:px-5 lg:py-3 flex items-center justify-between border-b border-amber-100 last:border-0 bg-white">
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-[#1A1A1A]">
                    {s.property_name}{(s as any).property_number ? ` #${(s as any).property_number}` : ''}
                  </p>
                  <p className="text-[10px] lg:text-xs text-gray-400">
                    Total: {formatCurrency(s.amount)} · Excedente: <span className="text-amber-600 font-semibold">{formatCurrency(s.excedente)}</span>
                  </p>
                </div>
                <button
                  onClick={() => excedenteMutation.mutate(s.id)}
                  disabled={excedenteMutation.isPending}
                  className="text-[10px] lg:text-xs font-semibold bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg active:scale-95 disabled:opacity-50 shrink-0 ml-2"
                >
                  Cobrado ✓
                </button>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Gráfica por tipo */}
        {chartData.length > 0 && (
          <div className="bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl p-4 lg:p-5">
            <p className="text-[11px] lg:text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">Por tipo de servicio</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Total']} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8E5DF' }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {isLoading && <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>}
        {!isLoading && services.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No hay servicios registrados este mes</div>
        )}

        {/* Móvil — tarjetas */}
        <div className="flex flex-col gap-3 lg:hidden">
          {services.map((sv: any) => (
            <ServiceCard key={sv.id} service={sv} onEdit={() => openEdit(sv)} onDelete={() => setConfirmId(sv.id)} />
          ))}
        </div>

        {/* Escritorio — tabla */}
        {!isLoading && services.length > 0 && (
          <div className="hidden lg:block">
            <ServiceTable services={services} onEdit={openEdit} onDelete={(sv: any) => setConfirmId(sv.id)} />
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? 'Editar servicio' : 'Registrar servicio'}>
        <ServiceFormComp
          form={form} onChange={setForm} properties={properties}
          onSubmit={handleSubmit} onCancel={() => setSheetOpen(false)}
          saving={isSaving}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar servicio"
        message="¿Eliminar este registro de servicio?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ServiceCard({ service: sv, onEdit, onDelete }: {
  service: any; onEdit: () => void; onDelete: () => void
}) {
  const stype = SERVICE_TYPES.find(t => t.value === sv.service_type) ?? SERVICE_TYPES[4]
  const { Icon, color, bg } = stype
  const isPagado = sv.status === 'pagado'
  const propName = sv.property_name
  const propNum  = sv.property_number

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={17} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-[#1A1A1A]">
            {stype.label} — {propName}{propNum ? ` #${propNum}` : ''}
          </p>
          {sv.excedente > 0 && sv.excedente_status === 'cobrado' && (
            <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Excedente cobrado</span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {formatDate(sv.paid_at)}{sv.comment ? ` · ${sv.comment}` : ''}
        </p>
        {sv.excedente > 0 && (
          <p className="text-[10px] text-amber-600 mt-0.5">Excedente: {formatCurrency(sv.excedente)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[14px] font-bold text-[#1A1A1A]">{formatCurrency(sv.amount)}</span>
        <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${isPagado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {isPagado ? 'Pagado' : 'Pendiente'}
        </span>
        <div className="flex gap-1">
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceTable({ services, onEdit, onDelete }: {
  services: any[]; onEdit: (sv: any) => void; onDelete: (sv: any) => void
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#E8E5DF] bg-[#FAF8F4]">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Servicio</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Propiedad</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Periodo</th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Monto</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Estado</th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.map((sv: any) => {
            const stype = SERVICE_TYPES.find(t => t.value === sv.service_type) ?? SERVICE_TYPES[4]
            const isPagado = sv.status === 'pagado'
            return (
              <tr key={sv.id} className="border-b border-[#F0EDE7] last:border-0 transition-colors hover:bg-[#FAF8F4]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stype.bg}`}>
                      <stype.Icon size={14} className={stype.color} />
                    </div>
                    <span className="text-sm font-medium text-[#1A1A1A]">{stype.label}</span>
                    {sv.excedente > 0 && (
                      <span className="text-[10px] text-amber-600 font-medium">+{formatCurrency(sv.excedente)} exc.</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{sv.property_name}{sv.property_number ? ` #${sv.property_number}` : ''}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(sv.paid_at)}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-[#1A1A1A] text-right">{formatCurrency(sv.amount)}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPagado ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                    {isPagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onEdit(sv)} title="Editar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-[1px]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(sv)} title="Eliminar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 hover:-translate-y-[1px]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ServiceFormComp({ form, onChange, properties, onSubmit, onCancel, saving }: {
  form: any; onChange: (f: any) => void; properties: Property[]
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; saving: boolean
}) {
  const esLuz      = form.service_type === 'luz'
  const excedente  = esLuz && form.amount > 1000 ? form.amount - 1000 : 0

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
      <div>
        <label className="label">Propiedad</label>
        <select className="input-base" value={form.property_id || ''}
          onChange={e => onChange({ ...form, property_id: Number(e.target.value) })} required>
          <option value="">Seleccionar propiedad...</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.number ? ` #${p.number}` : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Tipo de servicio</label>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => onChange({ ...form, service_type: t.value })}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                form.service_type === t.value ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-[#E8E5DF] text-gray-500'
              }`}
            >
              <t.Icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Monto ($)</label>
          <input className="input-base" type="number" placeholder="890" min={0}
            value={form.amount || ''}
            onChange={e => onChange({ ...form, amount: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="label">Fecha de pago</label>
          <input className="input-base" type="date"
            value={form.paid_at}
            onChange={e => onChange({ ...form, paid_at: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Aviso excedente */}
      {excedente > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Zap size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Excedente de luz: <span className="font-bold">{formatCurrency(excedente)}</span> — se registrará para cobrar al inquilino
          </p>
        </div>
      )}

      {/* Estado del servicio */}
      <div>
        <label className="label">Estado del pago</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pagado',    label: 'Ya lo pagué' },
            { value: 'pendiente', label: 'Pendiente' },
          ].map(s => (
            <button key={s.value} type="button"
              onClick={() => onChange({ ...form, status: s.value })}
              className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                form.status === s.value ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-[#E8E5DF] text-gray-500'
              }`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Comentario (opcional)</label>
        <input className="input-base" placeholder="Notas..."
          value={form.comment ?? ''}
          onChange={e => onChange({ ...form, comment: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
