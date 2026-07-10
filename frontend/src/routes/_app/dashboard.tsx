import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Home, Clock,
  TrendingUp, Wrench, FileText, AlertTriangle,
  Zap, TrendingDown,
  Receipt, ChevronDown, RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useMarcarExcedenteCobrado } from '@/hooks/useServices'
import { formatCurrency, formatDate, currentMonthYear } from '@/lib/utils'

const MESES = [
  { value: 1,  label: 'Enero' },
  { value: 2,  label: 'Febrero' },
  { value: 3,  label: 'Marzo' },
  { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Mayo' },
  { value: 6,  label: 'Junio' },
  { value: 7,  label: 'Julio' },
  { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

// Agrega más años aquí cuando se necesiten (ej. 2029, 2030, ...)
const ANIOS_DISPONIBLES = [2024, 2025, 2026, 2027, 2028]

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const navigate = useNavigate()
  const excedenteMutation = useMarcarExcedenteCobrado()
  const queryClient = useQueryClient()

  const { data, isLoading } = useDashboard(month, year)

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['dashboard', month, year] })
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen financiero y operativo"
        action={
          <div className="flex items-end gap-2 lg:gap-3">
            <HeaderSelect
              label="Mes"
              value={month}
              onChange={(v) => setMonth(v)}
              options={MESES}
            />
            <HeaderSelect
              label="Año"
              value={year}
              onChange={(v) => setYear(v)}
              options={ANIOS_DISPONIBLES.map(y => ({ value: y, label: String(y) }))}
            />
            <button
              onClick={handleRefresh}
              title="Actualizar"
              className="h-9 lg:h-10 w-9 lg:w-10 flex items-center justify-center rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors shrink-0"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto lg:px-8 xl:px-10 lg:py-6 lg:grid lg:grid-cols-4 lg:grid-flow-row-dense lg:gap-4 xl:gap-5 lg:items-start">
        {isLoading && <div className="py-16 text-center text-sm text-gray-400 lg:col-span-4">Cargando...</div>}

        {data && (
          <>
            {/* Línea 1 — Cobranza */}
            <div className="flex flex-col gap-1.5 lg:contents">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider lg:hidden">Cobranza</p>
              <div className="grid grid-cols-2 gap-3 lg:contents">
                <KpiCard label="Rentas cobradas" value={String(data.rents_paid)}
                  sub={formatCurrency(data.total_collected)}
                  color="green" icon={<Home size={16} />}
                  onClick={() => navigate({ to: '/cobranza' })} />
                <KpiCard label="Rentas pendientes" value={String(data.rents_pending)}
                  sub={formatCurrency(data.total_pending)}
                  color="amber" icon={<Clock size={16} />}
                  onClick={() => navigate({ to: '/cobranza' })} />
              </div>
              <KpiCardWide label="Ingreso esperado" value={formatCurrency(data.total_expected)}
                sub="total del mes" icon={<TrendingUp size={16} />} className="lg:col-span-4" />
            </div>

            {/* Línea 2 — Egresos */}
            <div className="flex flex-col gap-1.5 lg:contents">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider lg:hidden">Egresos</p>
              <div className="grid grid-cols-2 gap-3 lg:contents">
                <KpiCard label="Servicios pagados" value={formatCurrency(data.services_total)}
                  sub="este mes" color="gray" icon={<Wrench size={16} />}
                  onClick={() => navigate({ to: '/servicios' })} />
                <KpiCard label="Gastos pagados" value={formatCurrency(data.expenses_total)}
                  sub="este mes" color="purple" icon={<Receipt size={16} />}
                  onClick={() => navigate({ to: '/gastos' })} />
              </div>
            </div>

            {/* Línea 3 — Utilidad */}
            <div className={`border rounded-xl lg:rounded-2xl p-4 lg:p-6 flex items-center justify-between lg:col-span-4 transition-all duration-200 lg:hover:-translate-y-[1px] ${
              data.utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className={`w-9 h-9 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center ${
                  data.utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {data.utilidad >= 0
                    ? <TrendingUp size={18} className="text-green-700 lg:w-6 lg:h-6" />
                    : <TrendingDown size={18} className="text-red-700 lg:w-6 lg:h-6" />
                  }
                </div>
                <div>
                  <p className={`text-xs lg:text-base font-bold uppercase tracking-wide ${data.utilidad >= 0 ? 'text-green-800' : 'text-red-800'}`}>Utilidad del mes</p>
                  <p className="text-[10px] lg:text-sm text-gray-500 mt-0.5">Cobradas − Servicios − Gastos</p>
                </div>
              </div>
              <p className={`text-xl lg:text-4xl font-bold ${data.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.utilidad)}
              </p>
            </div>

            {/* Excedentes luz */}
            {data.excedentes_pendientes && data.excedentes_pendientes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl lg:rounded-2xl overflow-hidden lg:col-span-4">
                <div className="px-3 py-2.5 lg:px-5 lg:py-3.5 flex items-center gap-2 border-b border-amber-200">
                  <Zap size={14} className="text-amber-600" />
                  <span className="text-xs lg:text-sm font-bold text-amber-800">Excedente luz por cobrar</span>
                  <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {data.excedentes_pendientes.length}
                  </span>
                </div>
                <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3">
                {data.excedentes_pendientes.map(e => (
                  <div key={e.id} className="px-3 py-2.5 lg:px-5 lg:py-3 flex items-center justify-between border-b border-amber-100 last:border-0 bg-white">
                    <div>
                      <p className="text-xs lg:text-sm font-semibold text-[#1A1A1A]">
                        {e.property_name}{e.property_number ? ` #${e.property_number}` : ''}
                      </p>
                      <p className="text-[10px] lg:text-xs text-gray-400">
                        Recibo: {formatCurrency(e.amount)} · Excedente: <span className="text-amber-600 font-semibold">{formatCurrency(e.excedente)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => excedenteMutation.mutate(e.id)}
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

            {/* Cobros por periodo — detalle por propiedad, sin perder historial */}
            <div className="lg:col-span-2 lg:self-stretch">
              <CobrosPorPeriodoCard data={data} />
            </div>

            {/* Próximos eventos — panel exclusivo de escritorio, resume lo más urgente.
                Ocupa el lugar de Cuentas bancarias (quitada), junto a Cobros por periodo.
                lg:self-stretch iguala su altura a la de Cobros por periodo. */}
            {(data.contracts_expiring.length > 0 || data.pending_1_5.length > 0 || data.pending_15_20.length > 0) && (
              <div className="hidden lg:flex lg:flex-col lg:col-span-2 lg:self-stretch lg:max-h-[480px] bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 lg:px-5 lg:py-3.5 border-b border-[#E8E5DF] flex items-center justify-between shrink-0">
                  <p className="text-[15px] lg:text-lg font-bold text-[#1A1A1A]">Próximos eventos</p>
                  <button onClick={() => navigate({ to: '/calendario' })} className="text-xs lg:text-sm font-medium text-primary-500 hover:underline">Ver todos</button>
                </div>
                <div className="p-4 lg:p-5 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-1">
                    {data.contracts_expiring.slice(0, 3).map(c => (
                      <div key={`ce-${c.id}`} className="flex justify-between items-center py-2.5 border-b border-[#F0EDE7] last:border-0">
                        <div>
                          <p className="text-sm lg:text-[15px] font-medium text-[#1A1A1A]">{c.property_name}{c.property_number ? ` #${c.property_number}` : ''}</p>
                          <p className="text-xs lg:text-sm text-gray-400">Contrato vence · {c.tenant_name}</p>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0 ml-2">{c.days_remaining} días</span>
                      </div>
                    ))}
                    {[...data.pending_1_5, ...data.pending_15_20].slice(0, 3).map((r: any) => (
                      <div key={`pr-${r.id}`} className="flex justify-between items-center py-2.5 border-b border-[#F0EDE7] last:border-0">
                        <div>
                          <p className="text-sm lg:text-[15px] font-medium text-[#1A1A1A]">{r.property_name}{r.property_number ? ` #${r.property_number}` : ''}</p>
                          <p className="text-xs lg:text-sm text-gray-400">Pago de renta pendiente</p>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-amber-700 shrink-0 ml-2">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recordatorios */}
            {(data.contracts_expiring.length > 0 ||
              data.invoices_pending > 0 ||
              data.services_pendientes > 0) && (
              <Section title="Recordatorios" className="lg:col-span-2">
                <div className="flex flex-col gap-2">

                  {data.services_pendientes > 0 && (
                    <AlertCard color="amber" icon={<Wrench size={14} />}
                      title="Servicios sin pagar" count={data.services_pendientes}
                      onClick={() => navigate({ to: '/servicios' })}>
                      <p className="text-xs text-amber-700 py-1">
                        {data.services_pendientes} {data.services_pendientes === 1 ? 'servicio pendiente' : 'servicios pendientes'} de pagar
                      </p>
                    </AlertCard>
                  )}

                  {data.contracts_expiring.length > 0 && (
                    <AlertCard color="red" icon={<FileText size={14} />}
                      title="Contratos por vencer" count={data.contracts_expiring.length}
                      onClick={() => navigate({ to: '/contratos' })}>
                      {data.contracts_expiring.map(c => (
                        <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0">
                          <div>
                            <p className="text-xs font-medium text-red-800">
  {c.property_name}{c.property_number ? ` #${c.property_number}` : ''}
</p>
                            <p className="text-[10px] text-red-500">{c.tenant_name}</p>
                          </div>
                          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{c.days_remaining} días</span>
                        </div>
                      ))}
                    </AlertCard>
                  )}

                  {data.invoices_pending > 0 && (
                    <AlertCard color="blue" icon={<AlertTriangle size={14} />}
                      title="Facturas pendientes" count={data.invoices_pending}>
                      <p className="text-xs text-blue-700 py-1">
                        {data.invoices_pending} {data.invoices_pending === 1 ? 'propiedad requiere' : 'propiedades requieren'} factura este mes
                      </p>
                    </AlertCard>
                  )}
                </div>
              </Section>
            )}

            {data.contracts_expiring.length === 0 && data.invoices_pending === 0 &&
             data.pending_1_5.length === 0 && data.pending_15_20.length === 0 &&
             data.services_pendientes === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl lg:rounded-2xl px-4 py-3 lg:px-5 lg:py-4 flex items-center gap-3 lg:col-span-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <p className="text-sm lg:text-base text-green-700 font-medium">Sin pendientes este mes</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function HeaderSelect({ label, value, onChange, options }: {
  label: string
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] lg:text-[10px] font-semibold text-white/50 uppercase tracking-wider px-0.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 lg:h-10 w-[88px] lg:w-[130px] appearance-none bg-white/10 border border-white/15 rounded-lg pl-3 pr-8 text-xs lg:text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} className="text-[#1A1A1A]">{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70" />
      </div>
    </label>
  )
}

function KpiCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string; sub: string
  color: 'green' | 'amber' | 'blue' | 'gray' | 'purple'
  icon: React.ReactNode; onClick?: () => void
}) {
  const colors = { green: 'text-green-700 bg-green-50', amber: 'text-amber-700 bg-amber-50', blue: 'text-blue-700 bg-blue-50', gray: 'text-gray-600 bg-gray-100', purple: 'text-purple-700 bg-purple-50' }
  return (
    <button onClick={onClick} disabled={!onClick}
      className="bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl p-3.5 lg:p-5 text-left flex flex-col gap-2 lg:gap-3 active:scale-95 transition-transform disabled:active:scale-100 lg:transition-all lg:duration-200 lg:hover:-translate-y-[1px] lg:active:scale-100">
      <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[12px] lg:text-sm font-semibold text-[#1A1A1A]">{label}</p>
        <p className="text-[20px] lg:text-2xl font-bold text-[#1A1A1A] leading-tight mt-0.5">{value}</p>
        <p className="text-[11px] lg:text-sm font-bold text-[#1A1A1A] mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

function KpiCardWide({ label, value, sub, icon, className }: {
  label: string; value: string; sub: string; icon: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl p-4 lg:p-6 flex items-center justify-between transition-all duration-200 lg:hover:-translate-y-[1px] ${className ?? ''}`}>
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center text-blue-700 bg-blue-50 shrink-0">{icon}</div>
        <div>
          <p className="text-xs lg:text-base font-bold uppercase tracking-wide text-[#1A1A1A]">{label}</p>
          <p className="text-[10px] lg:text-sm text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
      <p className="text-xl lg:text-4xl font-bold text-[#1A1A1A]">{value}</p>
    </div>
  )
}

function CobrosPorPeriodoCard({ data }: { data: any }) {
  const [tab, setTab] = useState<'1_5' | '15_20'>('1_5')

  const paid    = tab === '1_5' ? data.paid_1_5    : data.paid_15_20
  const pending = tab === '1_5' ? data.pending_1_5 : data.pending_15_20

  const items = [
    ...paid.map((r: any) => ({ ...r, _status: 'paid' as const })),
    ...pending.map((r: any) => ({ ...r, _status: 'pending' as const })),
  ].sort((a: any, b: any) => (a.property_name || '').localeCompare(b.property_name || ''))

  const totalCobrado   = paid.reduce((s: number, r: any) => s + r.amount, 0)
  const totalPendiente = pending.reduce((s: number, r: any) => s + r.amount, 0)
  const totalEsperado  = totalCobrado + totalPendiente

  return (
    <div className="h-full lg:max-h-[480px] flex flex-col bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl overflow-hidden lg:transition-all lg:duration-200 lg:hover:-translate-y-[1px]">
      <div className="px-4 py-3 lg:px-5 lg:py-3.5 border-b border-[#E8E5DF] shrink-0">
        <p className="text-[15px] lg:text-lg font-bold text-[#1A1A1A]">
          Cobros por periodo <span className="text-gray-400 font-normal">(quincenas)</span>
        </p>
      </div>

      <div className="p-4 lg:p-5 flex-1 flex flex-col min-h-0">
        {/* Tabs */}
        <div className="flex gap-2 mb-3 shrink-0">
          <button
            onClick={() => setTab('1_5')}
            className={`flex-1 text-sm lg:text-base font-bold py-2 rounded-lg border transition-colors ${
              tab === '1_5' ? 'bg-primary-500 text-white border-primary-500' : 'border-[#E8E5DF] text-gray-500'
            }`}
          >
            Días 1–5
          </button>
          <button
            onClick={() => setTab('15_20')}
            className={`flex-1 text-sm lg:text-base font-bold py-2 rounded-lg border transition-colors ${
              tab === '15_20' ? 'bg-primary-500 text-white border-primary-500' : 'border-[#E8E5DF] text-gray-500'
            }`}
          >
            Días 15–20
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
          <div className="bg-[#FAFAF8] rounded-lg p-2">
            <p className="text-[10px] lg:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Esperado</p>
            <p className="text-sm lg:text-base font-bold text-[#1A1A1A] mt-0.5">{formatCurrency(totalEsperado)}</p>
          </div>
          <div className="bg-[#FAFAF8] rounded-lg p-2">
            <p className="text-[10px] lg:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Cobrado</p>
            <p className="text-sm lg:text-base font-bold text-green-700 mt-0.5">{formatCurrency(totalCobrado)}</p>
          </div>
          <div className="bg-[#FAFAF8] rounded-lg p-2">
            <p className="text-[10px] lg:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Pendiente</p>
            <p className="text-sm lg:text-base font-bold text-amber-700 mt-0.5">{formatCurrency(totalPendiente)}</p>
          </div>
          <div className="bg-[#FAFAF8] rounded-lg p-2">
            <p className="text-[10px] lg:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Propiedades</p>
            <p className="text-sm lg:text-base font-bold text-[#1A1A1A] mt-0.5">{items.length}</p>
          </div>
        </div>

        {/* Detalle por propiedad — nunca se elimina, solo cambia el estado.
            Lista con scroll propio para que la tarjeta no crezca sin límite
            si se agregan más propiedades. */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin propiedades en este periodo</p>
        ) : (
          <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {items.map((r: any) => (
              <div key={`${r._status}-${r.id}`} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#FAFAF8] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r._status === 'paid' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-semibold text-[#1A1A1A] truncate">
                    {r.property_name}{r.property_number ? ` #${r.property_number}` : ''}
                  </span>
                  <span className="text-sm text-gray-400 shrink-0">{formatCurrency(r.amount)}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  r._status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {r._status === 'paid' ? 'Cobrado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider lg:hidden">{title}</p>
      {children}
    </div>
  )
}

function AlertCard({ color, icon, title, count, children, onClick }: {
  color: 'red' | 'amber' | 'blue'; icon: React.ReactNode
  title: string; count: number; children: React.ReactNode; onClick?: () => void
}) {
  const s = {
    red:   { header: 'bg-red-50 border-red-200',    icon: 'bg-red-100 text-red-600',    title: 'text-red-800',   badge: 'bg-red-100 text-red-700' },
    amber: { header: 'bg-amber-50 border-amber-200', icon: 'bg-amber-100 text-amber-600', title: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
    blue:  { header: 'bg-blue-50 border-blue-200',   icon: 'bg-blue-100 text-blue-600',   title: 'text-blue-800',  badge: 'bg-blue-100 text-blue-700' },
  }[color]
  return (
    <div className={`border rounded-xl lg:rounded-2xl overflow-hidden ${s.header}`}>
      <button onClick={onClick} disabled={!onClick} className="w-full flex items-center justify-between px-3 py-2.5 lg:px-4 lg:py-3">
        <div className="flex items-center gap-2 lg:gap-2.5">
          <div className={`w-6 h-6 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center ${s.icon}`}>{icon}</div>
          <span className={`text-xs lg:text-sm font-semibold ${s.title}`}>{title}</span>
        </div>
        <span className={`text-[10px] lg:text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{count}</span>
      </button>
      <div className="px-3 pb-2.5 lg:px-4 lg:pb-3 bg-white border-t border-[#E8E5DF]">{children}</div>
    </div>
  )
}

