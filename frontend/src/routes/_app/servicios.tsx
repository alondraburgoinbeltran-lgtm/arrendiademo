import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Pencil, Trash2, Eye, Zap, Droplets, Wifi, Flame, MoreHorizontal, Search, ListFilter, AlertCircle, FileText, Home } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeaderSelect } from '@/components/ui/HeaderSelect'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useServices, useCreateService, useUpdateService, useDeleteService, useMarcarExcedenteCobrado } from '@/hooks/useServices'
import { useProperties } from '@/hooks/useProperties'
import { formatCurrency, formatDate, currentMonthYear } from '@/lib/utils'
import { MESES, ANIOS_DISPONIBLES } from '@/lib/dateOptions'
import type { ServiceForm, ServiceType, Property } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export const Route = createFileRoute('/_app/servicios')({
  component: ServiciosPage,
})

// Iconos y colores originales — sin tocar
const SERVICE_TYPES: { value: ServiceType; label: string; Icon: any; color: string; bg: string; chartColor: string }[] = [
  { value: 'luz',      label: 'Luz',      Icon: Zap,            color: 'text-blue-600',   bg: 'bg-blue-50',   chartColor: '#378ADD' },
  { value: 'agua',     label: 'Agua',     Icon: Droplets,       color: 'text-teal-600',   bg: 'bg-teal-50',   chartColor: '#1D9E75' },
  { value: 'internet', label: 'Internet', Icon: Wifi,           color: 'text-amber-600',  bg: 'bg-amber-50',  chartColor: '#BA7517' },
  { value: 'gas',      label: 'Gas',      Icon: Flame,          color: 'text-orange-600', bg: 'bg-orange-50', chartColor: '#D85A30' },
  { value: 'otro',     label: 'Otro',     Icon: MoreHorizontal, color: 'text-gray-600',   bg: 'bg-gray-100',  chartColor: '#888780' },
]

const PROPERTY_BAR_COLORS = ['#0F2A4A', '#2F5FD1', '#14B8A6', '#F5A623', '#8B5CF6', '#9CA3AF']
const MES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const FREQUENCY_OPTIONS: { value: string; label: string; months: number }[] = [
  { value: 'mensual',    label: 'Mensual',    months: 1 },
  { value: 'bimestral',  label: 'Bimestral',  months: 2 },
  { value: 'trimestral', label: 'Trimestral', months: 3 },
  { value: 'semestral',  label: 'Semestral',  months: 6 },
  { value: 'anual',      label: 'Anual',      months: 12 },
]

function getPeriodLabel(periodMonth: number, periodYear: number, frequency: string): string {
  if (!periodMonth || !periodYear) return '—'
  const months = FREQUENCY_OPTIONS.find(f => f.value === frequency)?.months ?? 1
  const startMonth = periodMonth - 1
  const startYear  = periodYear
  if (months === 1) {
    const lastDay = new Date(startYear, startMonth + 1, 0).getDate()
    return `1 – ${lastDay} ${MES_ABREV[startMonth]} ${startYear}`
  }
  const endIndex = startMonth + months - 1
  const endMonth = endIndex % 12
  const endYear  = startYear + Math.floor(endIndex / 12)
  return `${MES_ABREV[startMonth]} – ${MES_ABREV[endMonth]} ${endYear}`
}

const EMPTY_FORM = {
  property_id:  0,
  service_type: 'luz' as ServiceType,
  paid_at:      new Date().toISOString().split('T')[0],
  amount:       0,
  status:       'pagado',
  frequency:    'mensual',
  period_month: new Date().getMonth() + 1,
  period_year:  new Date().getFullYear(),
  comment:      '',
}

// Un servicio pendiente se considera vencido si su fecha de pago ya pasó.
// Cálculo visual en el cliente — no modifica ningún dato.
function isVencido(sv: any): boolean {
  if (sv.status !== 'pendiente' || !sv.paid_at) return false
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return new Date(sv.paid_at) < todayMidnight
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

  const [sheetOpen, setSheetOpen]   = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [form, setForm]             = useState<any>(EMPTY_FORM)
  const [confirmId, setConfirmId]   = useState<number | null>(null)
  const [viewing, setViewing]       = useState<any>(null)

  const [search, setSearch]             = useState('')
  const [tipoFilter, setTipoFilter]     = useState<'todos' | ServiceType>('todos')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pagado' | 'pendiente' | 'vencido'>('todos')
  const [propFilter, setPropFilter]     = useState<string>('todos')

  const totalPagado    = useMemo(() => services.filter((s: any) => s.status === 'pagado').reduce((a: number, s: any) => a + s.amount, 0), [services])
  const totalPendiente = useMemo(() => services.filter((s: any) => s.status === 'pendiente').reduce((a: number, s: any) => a + s.amount, 0), [services])
  const propiedadesConServicio = useMemo(() => new Set(services.map((s: any) => s.property_id)).size, [services])

  const chartData = useMemo(() => {
    const byProp: Record<string, { name: string; total: number }> = {}
    services.forEach((s: any) => {
      const label = `${s.property_name}${s.property_number ? ` #${s.property_number}` : ''}`
      if (!byProp[label]) byProp[label] = { name: label, total: 0 }
      byProp[label].total += s.amount
    })
    const sorted = Object.values(byProp).sort((a, b) => b.total - a.total)
    const top = sorted.slice(0, 5)
    const restTotal = sorted.slice(5).reduce((s, p) => s + p.total, 0)
    const rows = top.map((p, i) => ({ ...p, color: PROPERTY_BAR_COLORS[i] }))
    if (restTotal > 0) rows.push({ name: 'Otros', total: restTotal, color: PROPERTY_BAR_COLORS[5] })
    return rows
  }, [services])

  const excedentesPendientes = useMemo(() =>
    services.filter((s: any) => s.service_type === 'luz' && (s.excedente ?? 0) > 0 && s.excedente_status === 'pendiente')
  , [services])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((sv: any) => {
      if (q) {
        const stype = SERVICE_TYPES.find(t => t.value === sv.service_type)
        const matches = (stype?.label ?? '').toLowerCase().includes(q) ||
                         (sv.property_name ?? '').toLowerCase().includes(q) ||
                         (sv.comment ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (tipoFilter !== 'todos' && sv.service_type !== tipoFilter) return false
      if (estadoFilter === 'vencido'   && !isVencido(sv)) return false
      if (estadoFilter === 'pagado'    && sv.status !== 'pagado') return false
      if (estadoFilter === 'pendiente' && sv.status !== 'pendiente') return false
      if (propFilter !== 'todos' && String(sv.property_id) !== propFilter) return false
      return true
    })
  }, [services, search, tipoFilter, estadoFilter, propFilter])

  const hasActiveFilters = search !== '' || tipoFilter !== 'todos' || estadoFilter !== 'todos' || propFilter !== 'todos'

  function clearFilters() {
    setSearch('')
    setTipoFilter('todos')
    setEstadoFilter('todos')
    setPropFilter('todos')
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, paid_at: new Date().toISOString().split('T')[0], period_month: month, period_year: year })
    setSheetOpen(true)
  }

  function openEdit(sv: any) {
    setViewing(null)
    setEditing(sv)
    setForm({
      property_id:  sv.property_id,
      service_type: sv.service_type,
      paid_at:      sv.paid_at,
      amount:       sv.amount,
      status:       sv.status ?? 'pagado',
      frequency:    sv.frequency ?? 'mensual',
      period_month: sv.period_month ?? new Date(sv.paid_at).getMonth() + 1,
      period_year:  sv.period_year  ?? new Date(sv.paid_at).getFullYear(),
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
  const monthLabel = MESES.find(m => m.value === month)?.label ?? ''
  const totalFiltrado = filtered.reduce((s: number, sv: any) => s + sv.amount, 0)

  return (
    <div>
      <PageHeader
        title="SERVICIOS"
        subtitle={`Resumen de servicios • ${monthLabel} ${year}`}
        action={
          <div className="flex items-end flex-wrap justify-end gap-2 lg:gap-3">
            <HeaderSelect label="Mes" value={month} onChange={setMonth} options={MESES} />
            <HeaderSelect
              label="Año"
              value={year}
              onChange={setYear}
              options={ANIOS_DISPONIBLES.map(y => ({ value: y, label: String(y) }))}
            />
            <button
              onClick={openCreate}
              className="h-9 lg:h-10 flex items-center gap-1.5 bg-accent-DEFAULT rounded-lg px-3 lg:px-4 hover:brightness-105 transition-all shrink-0"
            >
              <span className="text-white text-base leading-none font-bold">+</span>
              <span className="text-white text-xs lg:text-sm font-semibold whitespace-nowrap">Registrar servicio</span>
            </button>
          </div>
        }
      />

      {/* ══════════════════════════ DESKTOP ══════════════════════════ */}
      <div className="hidden lg:block px-8 xl:px-10 py-6">
        <div className="lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto flex flex-col gap-6">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard icon={<span className="text-lg font-bold">$</span>} iconBg="bg-green-50" iconColor="text-green-600"
              label="Pagado" value={formatCurrency(totalPagado)}
              caption={`${services.filter((s: any) => s.status === 'pagado').length} ${services.filter((s: any) => s.status === 'pagado').length === 1 ? 'servicio' : 'servicios'}`} />
            <KpiCard icon={<Zap size={18} />} iconBg="bg-orange-50" iconColor="text-orange-500"
              label="Pendiente" value={formatCurrency(totalPendiente)}
              caption={`${services.filter((s: any) => s.status === 'pendiente').length} ${services.filter((s: any) => s.status === 'pendiente').length === 1 ? 'servicio' : 'servicios'}`} />
            <KpiCard icon={<FileText size={18} />} iconBg="bg-blue-50" iconColor="text-blue-500"
              label="Servicios registrados" value={String(services.length)}
              caption="este mes" />
            <KpiCard icon={<Home size={18} />} iconBg="bg-purple-50" iconColor="text-purple-500"
              label="Propiedades con servicios" value={String(propiedadesConServicio)}
              caption="activas" />
          </div>

          {/* Excedentes luz pendientes */}
          {excedentesPendientes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-2 border-b border-amber-200">
                <Zap size={14} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Excedente luz por cobrar</span>
                <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{excedentesPendientes.length}</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3">
                {excedentesPendientes.map((s: any) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between border-b border-amber-100 last:border-0 bg-white">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {s.property_name}{(s as any).property_number ? ` #${(s as any).property_number}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">
                        Total: {formatCurrency(s.amount)} · Excedente: <span className="text-amber-600 font-semibold">{formatCurrency(s.excedente)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => excedenteMutation.mutate(s.id)}
                      disabled={excedenteMutation.isPending}
                      className="text-xs font-semibold bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg active:scale-95 disabled:opacity-50 shrink-0 ml-2"
                    >
                      Cobrado ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gasto por propiedad */}
          {chartData.length > 0 && (
            <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 lg:p-6">
              <p className="text-sm font-semibold text-gray-500 mb-4">Gasto por propiedad</p>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 38, 160)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 500 }}
                    axisLine={false} tickLine={false} width={140} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Total']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E5DF' }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    <LabelList dataKey="total" position="right" formatter={(v: number) => formatCurrency(v)}
                      style={{ fontSize: 12, fontWeight: 600, fill: '#4B5563' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 text-center mt-1">Monto en MXN</p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-end gap-2.5 overflow-x-auto">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">Buscar</span>
              <div className="h-10 flex items-center gap-2 bg-white border border-[#E8E5DF] rounded-lg px-3">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  className="flex-1 text-sm bg-transparent outline-none text-[#1A1A1A] placeholder:text-gray-400 min-w-0"
                  placeholder="Buscar servicio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <FilterSelect label="Tipo de servicio" value={tipoFilter} onChange={setTipoFilter}
              options={[{ value: 'todos', label: 'Todos' }, ...SERVICE_TYPES.map(t => ({ value: t.value, label: t.label }))]} />

            <FilterSelect label="Estado" value={estadoFilter} onChange={setEstadoFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'pagado', label: 'Pagado' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'vencido', label: 'Vencido' },
              ]} />

            <FilterSelect label="Propiedad" value={propFilter} onChange={setPropFilter}
              options={[
                { value: 'todos', label: 'Todas' },
                ...properties.map(p => ({ value: String(p.id), label: `${p.name}${p.number ? ` #${p.number}` : ''}` })),
              ]} />

            <FilterSelect label="Periodo" value="este_mes" onChange={() => {}}
              options={[{ value: 'este_mes', label: 'Este mes' }]} />

            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="h-10 flex items-center gap-1.5 border border-[#E8E5DF] rounded-lg px-3.5 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors shrink-0"
            >
              <ListFilter size={14} />
              Limpiar filtros
            </button>
          </div>

          {/* Tabla */}
          {isLoading && <div className="py-12 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">Cargando...</div>}
          {!isLoading && services.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">No hay servicios registrados este mes</div>
          )}
          {!isLoading && services.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">Sin resultados</div>
          )}
          {!isLoading && filtered.length > 0 && (
            <ServiceTable services={filtered} total={totalFiltrado}
              onView={setViewing} onEdit={openEdit} onDelete={(sv: any) => setConfirmId(sv.id)} />
          )}
        </div>
      </div>

      {/* ══════════════════════════ MOBILE (sin cambios de layout) ══════════════════════════ */}
      <div className="lg:hidden">
        {services.length > 0 && (
          <div className="bg-primary-500 px-4 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2.5">
                <p className="text-white/60 text-[10px]">Pagado</p>
                <p className="text-white font-bold text-base">{formatCurrency(totalPagado)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2.5">
                <p className="text-white/60 text-[10px]">Pendiente de pago</p>
                <p className="text-amber-300 font-bold text-base">{formatCurrency(totalPendiente)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3 flex flex-col gap-3">
          {excedentesPendientes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 flex items-center gap-2 border-b border-amber-200">
                <Zap size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800">Excedente luz por cobrar</span>
                <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{excedentesPendientes.length}</span>
              </div>
              {excedentesPendientes.map((s: any) => (
                <div key={s.id} className="px-3 py-2.5 flex items-center justify-between border-b border-amber-100 last:border-0 bg-white">
                  <div>
                    <p className="text-xs font-semibold text-[#1A1A1A]">
                      {s.property_name}{(s as any).property_number ? ` #${(s as any).property_number}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Total: {formatCurrency(s.amount)} · Excedente: <span className="text-amber-600 font-semibold">{formatCurrency(s.excedente)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => excedenteMutation.mutate(s.id)}
                    disabled={excedenteMutation.isPending}
                    className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg active:scale-95 disabled:opacity-50 shrink-0 ml-2"
                  >
                    Cobrado ✓
                  </button>
                </div>
              ))}
            </div>
          )}

          {chartData.length > 0 && (
            <div className="bg-white border border-[#E8E5DF] rounded-xl p-4">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider mb-3">Gasto por propiedad</p>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 30, 120)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4B5563' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Total']} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8E5DF' }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={12}>
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

          <div className="flex flex-col gap-3">
            {services.map((sv: any) => (
              <ServiceCard key={sv.id} service={sv} onEdit={() => openEdit(sv)} onDelete={() => setConfirmId(sv.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Sheet ver detalle */}
      <Sheet open={viewing !== null} onClose={() => setViewing(null)} title="Detalle del servicio">
        {viewing && (
          <ServiceDetail service={viewing} onEdit={() => openEdit(viewing)} />
        )}
      </Sheet>

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

// ─── KPI card (estilo Dashboard/Cobranza) ──────────────────────

function KpiCard({ icon, iconBg, iconColor, label, value, caption }: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  label: string; value: string; caption: string
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl p-4 lg:p-5 flex items-center gap-3 lg:gap-4 transition-all duration-200 hover:-translate-y-[1px]">
      <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs lg:text-sm text-gray-400 font-medium truncate">{label}</p>
        <p className="text-lg lg:text-2xl font-bold text-[#1A1A1A] leading-tight mt-0.5 truncate">{value}</p>
        <p className="text-[11px] lg:text-xs text-gray-400 mt-0.5 truncate">{caption}</p>
      </div>
    </div>
  )
}

// ─── Filtro desplegable (fondo claro) ──────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (value: any) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-[150px] bg-white border border-[#E8E5DF] rounded-lg px-3 text-sm font-medium text-[#1A1A1A] cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Tabla de servicios (escritorio) — header fijo, scroll solo en el cuerpo ──

function ServiceTable({ services, total, onView, onEdit, onDelete }: {
  services: any[]; total: number
  onView: (sv: any) => void; onEdit: (sv: any) => void; onDelete: (sv: any) => void
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
      <div className="max-h-[560px] overflow-y-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[19%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E8E5DF] bg-[#FAF8F4]">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Servicio</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Propiedad</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Periodo</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Monto</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Frecuencia</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Estado</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((sv: any) => {
              const stype = SERVICE_TYPES.find(t => t.value === sv.service_type) ?? SERVICE_TYPES[4]
              const vencido = isVencido(sv)
              const freq = sv.frequency ?? 'mensual'
              return (
                <tr key={sv.id} className="border-b border-[#F0EDE7] last:border-0 transition-colors hover:bg-[#FAF8F4]">
                  <td className="px-5 py-4 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stype.bg}`}>
                        <stype.Icon size={15} className={stype.color} />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A] truncate">{stype.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 text-left truncate">{sv.property_name}{sv.property_number ? ` #${sv.property_number}` : ''}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 text-left truncate">{getPeriodLabel(sv.period_month, sv.period_year, freq)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#1A1A1A] text-right">
                    {formatCurrency(sv.amount)}
                    {sv.excedente > 0 && <span className="block text-[10px] font-normal text-amber-600">+{formatCurrency(sv.excedente)} exc.</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 text-left">{FREQUENCY_OPTIONS.find(f => f.value === freq)?.label ?? 'Mensual'}</td>
                  <td className="px-5 py-4 text-left"><StatusChip status={sv.status} vencido={vencido} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => onView(sv)} title="Ver detalle"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-[1px]">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onEdit(sv)} title="Editar"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-[1px]">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(sv)} title="Eliminar"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 hover:-translate-y-[1px]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#E8E5DF] bg-[#FAF8F4]">
              <td colSpan={3} className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A] uppercase tracking-wide text-left">Total</td>
              <td className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A] text-right">{formatCurrency(total)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Detalle de servicio (solo lectura) ────────────────────────

function ServiceDetail({ service: sv, onEdit }: { service: any; onEdit: () => void }) {
  const stype = SERVICE_TYPES.find(t => t.value === sv.service_type) ?? SERVICE_TYPES[4]
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stype.bg}`}>
          <stype.Icon size={20} className={stype.color} />
        </div>
        <div>
          <p className="text-base font-semibold text-[#1A1A1A]">{stype.label}</p>
          <p className="text-sm text-gray-400">{sv.property_name}{sv.property_number ? ` #${sv.property_number}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailItem label="Monto" value={formatCurrency(sv.amount)} />
        <DetailItem label="Fecha de pago" value={formatDate(sv.paid_at)} />
        <DetailItem label="Estado" value={sv.status === 'pagado' ? 'Pagado' : (isVencido(sv) ? 'Vencido' : 'Pendiente')} />
        <DetailItem label="Frecuencia" value={FREQUENCY_OPTIONS.find(f => f.value === (sv.frequency ?? 'mensual'))?.label ?? 'Mensual'} />
        <DetailItem label="Periodo" value={getPeriodLabel(sv.period_month, sv.period_year, sv.frequency ?? 'mensual')} />
      </div>

      {sv.excedente > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Zap size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Excedente de luz: <span className="font-bold">{formatCurrency(sv.excedente)}</span>
            {sv.excedente_status === 'cobrado' ? ' · Ya cobrado' : ' · Pendiente de cobrar'}
          </p>
        </div>
      )}

      {sv.comment && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Comentario</p>
          <p className="text-sm text-[#1A1A1A]">{sv.comment}</p>
        </div>
      )}

      <button onClick={onEdit} className="btn-primary mt-2">Editar servicio</button>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-[#1A1A1A] mt-0.5">{value}</p>
    </div>
  )
}

// ─── Tarjeta de servicio (móvil) ────────────────────────────────

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
        <StatusChip status={sv.status} vencido={isVencido(sv)} />
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

function StatusChip({ status, vencido }: { status: string; vencido?: boolean }) {
  if (status === 'pagado') return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-green-700 bg-green-50 w-fit">Pagado</span>
  )
  if (vencido) return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-red-700 bg-red-50 w-fit">
      <AlertCircle size={10} /> Vencido
    </span>
  )
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 w-fit">Pendiente</span>
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

      {/* Frecuencia */}
      <div>
        <label className="label">Frecuencia</label>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCY_OPTIONS.map(f => (
            <button key={f.value} type="button"
              onClick={() => onChange({ ...form, frequency: f.value })}
              className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                form.frequency === f.value ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-[#E8E5DF] text-gray-500'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Periodo — independiente de la fecha de pago (el recibo puede ser de otro mes) */}
      <div>
        <label className="label">Periodo (inicio)</label>
        <div className="grid grid-cols-2 gap-2">
          <select className="input-base" value={form.period_month}
            onChange={e => onChange({ ...form, period_month: Number(e.target.value) })}>
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="input-base" value={form.period_year}
            onChange={e => onChange({ ...form, period_year: Number(e.target.value) })}>
            {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Periodo del recibo: <span className="font-semibold text-[#1A1A1A]">{getPeriodLabel(form.period_month, form.period_year, form.frequency || 'mensual')}</span>
        </p>
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
