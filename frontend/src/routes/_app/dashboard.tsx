import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Home, Clock,
  TrendingUp, Wrench, FileText, AlertTriangle,
  CalendarClock, Zap, TrendingDown,
  Receipt,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useMarcarExcedenteCobrado } from '@/hooks/useServices'
import { formatCurrency, formatDate, currentMonthYear, formatMonthYear } from '@/lib/utils'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const navigate = useNavigate()
  const excedenteMutation = useMarcarExcedenteCobrado()

  const { data, isLoading } = useDashboard(month, year)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={formatMonthYear(month, year)}
        action={
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronRight size={14} className="text-white" />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {isLoading && <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>}

        {data && (
          <>
            {/* Línea 1 — Cobranza */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">Cobranza</p>
              <div className="grid grid-cols-2 gap-3">
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
                sub="total del mes" icon={<TrendingUp size={16} />} />
            </div>

            {/* Línea 2 — Egresos */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">Egresos</p>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Servicios pagados" value={formatCurrency(data.services_total)}
                  sub="este mes" color="gray" icon={<Wrench size={16} />}
                  onClick={() => navigate({ to: '/servicios' })} />
                <KpiCard label="Gastos pagados" value={formatCurrency(data.expenses_total)}
                  sub="este mes" color="purple" icon={<Receipt size={16} />}
                  onClick={() => navigate({ to: '/gastos' })} />
              </div>
            </div>

            {/* Línea 3 — Utilidad */}
            <div className={`border rounded-xl p-4 flex items-center justify-between ${
              data.utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  data.utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {data.utilidad >= 0
                    ? <TrendingUp size={18} className="text-green-700" />
                    : <TrendingDown size={18} className="text-red-700" />
                  }
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${data.utilidad >= 0 ? 'text-green-800' : 'text-red-800'}`}>Utilidad del mes</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Cobradas − Servicios − Gastos</p>
                </div>
              </div>
              <p className={`text-xl font-bold ${data.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.utilidad)}
              </p>
            </div>

            {/* Excedentes luz */}
            {data.excedentes_pendientes && data.excedentes_pendientes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2.5 flex items-center gap-2 border-b border-amber-200">
                  <Zap size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">Excedente luz por cobrar</span>
                  <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {data.excedentes_pendientes.length}
                  </span>
                </div>
                {data.excedentes_pendientes.map(e => (
                  <div key={e.id} className="px-3 py-2.5 flex items-center justify-between border-b border-amber-100 last:border-0 bg-white">
                    <div>
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        {e.property_name}{e.property_number ? ` #${e.property_number}` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Recibo: {formatCurrency(e.amount)} · Excedente: <span className="text-amber-600 font-semibold">{formatCurrency(e.excedente)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => excedenteMutation.mutate(e.id)}
                      disabled={excedenteMutation.isPending}
                      className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg active:scale-95 disabled:opacity-50"
                    >
                      Cobrado ✓
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quincenas */}
            <Section title="Ingresos por quincena">
              <div className="grid grid-cols-2 gap-3">
                <QuincenaCard label="1a quincena" sub="Días 1–15" value={data.quincena1_total} />
                <QuincenaCard label="2a quincena" sub="Días 16–31" value={data.quincena2_total} />
              </div>
            </Section>

            {/* Cuentas bancarias */}
            <Section title="Por cuenta bancaria">
              <div className="grid grid-cols-2 gap-3">
                <BankCard bank="BBVA"    value={data.bbva_total}    color="#0066B3" />
                <BankCard bank="Banorte" value={data.banorte_total} color="#D4002A" />
              </div>
            </Section>

            {/* Recordatorios */}
            {(data.contracts_expiring.length > 0 ||
              data.invoices_pending > 0 ||
              data.pending_1_5.length > 0 ||
              data.pending_15_20.length > 0 ||
              data.services_pendientes > 0) && (
              <Section title="Recordatorios">
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

                  {data.pending_1_5.length > 0 && (
                    <AlertCard color="amber" icon={<CalendarClock size={14} />}
                      title="Pagos pendientes días 1–5" count={data.pending_1_5.length}
                      onClick={() => navigate({ to: '/cobranza' })}>
                      {data.pending_1_5.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-amber-100 last:border-0">
                          <p className="text-xs font-medium text-amber-800">
  {r.property_name}{r.property_number ? ` #${r.property_number}` : ''}
</p>
                          <span className="text-xs font-medium text-amber-700">{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                    </AlertCard>
                  )}

                  {data.pending_15_20.length > 0 && (
                    <AlertCard color="amber" icon={<CalendarClock size={14} />}
                      title="Pagos pendientes días 15–20" count={data.pending_15_20.length}
                      onClick={() => navigate({ to: '/cobranza' })}>
                      {data.pending_15_20.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-amber-100 last:border-0">
                          <p className="text-xs font-medium text-amber-800">
  {r.property_name}{r.property_number ? ` #${r.property_number}` : ''}
</p>
                          <span className="text-xs font-medium text-amber-700">{formatCurrency(r.amount)}</span>
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
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <p className="text-sm text-green-700 font-medium">Sin pendientes este mes</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
      className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 text-left flex flex-col gap-2 active:scale-95 transition-transform disabled:active:scale-100">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[12px] font-semibold text-[#1A1A1A]">{label}</p>
        <p className="text-[20px] font-bold text-[#1A1A1A] leading-tight mt-0.5">{value}</p>
        <p className="text-[11px] font-bold text-[#1A1A1A] mt-0.5">{sub}</p>
      </div>
    </button>
  )
}

function KpiCardWide({ label, value, sub, icon }: {
  label: string; value: string; sub: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-700 bg-blue-50 shrink-0">{icon}</div>
      <div>
        <p className="text-[12px] font-semibold text-[#1A1A1A]">{label}</p>
        <p className="text-[20px] font-bold text-[#1A1A1A] leading-tight">{value}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function QuincenaCard({ label, sub, value }: { label: string; sub: string; value: number }) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5">
      <p className="text-[12px] font-semibold text-[#1A1A1A]">{label}</p>
      <p className="text-[10px] text-gray-400 mb-1">{sub}</p>
      <p className="text-[16px] font-bold text-[#1A1A1A]">{formatCurrency(value)}</p>
    </div>
  )
}

function BankCard({ bank, value, color }: { bank: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
      <div>
        <p className="text-[11px] text-gray-400">{bank}</p>
        <p className="text-[14px] font-bold text-[#1A1A1A]">{formatCurrency(value)}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">{title}</p>
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
    <div className={`border rounded-xl overflow-hidden ${s.header}`}>
      <button onClick={onClick} disabled={!onClick} className="w-full flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${s.icon}`}>{icon}</div>
          <span className={`text-xs font-semibold ${s.title}`}>{title}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{count}</span>
      </button>
      <div className="px-3 pb-2.5 bg-white border-t border-[#E8E5DF]">{children}</div>
    </div>
  )
}
