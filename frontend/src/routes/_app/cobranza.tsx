import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle2, Clock, RotateCcw, Trash2, FileText,
  DollarSign, AlertCircle, Home, CalendarDays, Search,
  ListFilter,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeaderSelect } from '@/components/ui/HeaderSelect'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRents, usePayRent, useUnpayRent, useDeleteRent } from '@/hooks/useRents'
import { useProperties } from '@/hooks/useProperties'
import { formatCurrency, formatDate, currentMonthYear } from '@/lib/utils'
import { MESES, ANIOS_DISPONIBLES } from '@/lib/dateOptions'
import { generateReceiptPDF } from '@/components/ui/Receipt'
import type { Rent, RentPaymentForm, BankAccount, PaymentMethod } from '@/types'

export const Route = createFileRoute('/_app/cobranza')({
  component: CobranzaPage,
})

const MES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface ExtendedPayForm extends RentPaymentForm {
  payment_method: PaymentMethod
  bank_reference?: string
  maintenance: number
  services_amount: number
  other_charges: number
}

// Una renta pendiente se considera vencida si su día de pago ya pasó
// dentro del mes/año que se está viendo. No modifica ningún dato —
// es solo una clasificación visual calculada en el cliente.
function isVencido(r: Rent, month: number, year: number): boolean {
  if (r.status !== 'pending') return false
  const day = (r as any).payment_day
  if (!day) return false
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueDate = new Date(year, month - 1, day)
  return dueDate < todayMidnight
}

function CobranzaPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const [tab, setTab]     = useState<'all' | 'pending' | 'paid'>('all')

  const [search, setSearch]             = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pending' | 'paid' | 'vencido'>('todos')
  const [bancoFilter, setBancoFilter]   = useState<'todos' | BankAccount>('todos')
  const [diaFilter, setDiaFilter]       = useState<string>('todos')
  const [metodoFilter, setMetodoFilter] = useState<'todos' | PaymentMethod>('todos')

  const { data: rents = [], isLoading } = useRents(month, year)
  const { data: properties = [] } = useProperties()
  const payMutation    = usePayRent()
  const unpayMutation  = useUnpayRent()
  const deleteMutation = useDeleteRent()

  const [sheetRent, setSheetRent]     = useState<Rent | null>(null)
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [confirmRent, setConfirmRent] = useState<Rent | null>(null)
  const [payForm, setPayForm]         = useState<ExtendedPayForm>({
    paid_at:        new Date().toISOString().split('T')[0],
    bank_account:   'bbva',
    payment_method: 'transferencia',
    bank_reference: '',
    comment:        '',
    maintenance:    0,
    services_amount: 0,
    other_charges:  0,
  })

  const summary = useMemo(() => {
    const paid    = rents.filter(r => r.status === 'paid')
    const pending = rents.filter(r => r.status === 'pending')
    const vencidas = rents.filter(r => isVencido(r, month, year))
    const total   = rents.reduce((s, r) => s + r.amount, 0)
    const collected = paid.reduce((s, r) => s + r.amount, 0)
    const pendingAmount = pending.reduce((s, r) => s + r.amount, 0)
    const vencidoAmount = vencidas.reduce((s, r) => s + r.amount, 0)

    const upcoming = pending.filter(r => !isVencido(r, month, year) && (r as any).payment_day)
    let proximoCobro: { day: number; count: number } | null = null
    if (upcoming.length) {
      const minDay = Math.min(...upcoming.map(r => (r as any).payment_day))
      proximoCobro = { day: minDay, count: upcoming.filter(r => (r as any).payment_day === minDay).length }
    }

    return {
      paid: paid.length, pending: pending.length, total, collected,
      count: rents.length, pendingAmount,
      vencidoCount: vencidas.length, vencidoAmount,
      activeProperties: properties.filter(p => p.active === 1).length,
      proximoCobro,
    }
  }, [rents, properties, month, year])

  const diasDisponibles = useMemo(() => {
    const days = new Set<number>()
    rents.forEach(r => { if ((r as any).payment_day) days.add((r as any).payment_day) })
    return Array.from(days).sort((a, b) => a - b)
  }, [rents])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rents.filter(r => {
      if (tab === 'paid'    && r.status !== 'paid')    return false
      if (tab === 'pending' && r.status !== 'pending') return false

      if (q) {
        const matches = (r.property_name ?? '').toLowerCase().includes(q) ||
                         (r.tenant_name ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }

      if (estadoFilter === 'vencido' && !isVencido(r, month, year)) return false
      if (estadoFilter === 'pending' && r.status !== 'pending') return false
      if (estadoFilter === 'paid'    && r.status !== 'paid')    return false

      if (bancoFilter !== 'todos' && r.bank_account !== bancoFilter) return false
      if (metodoFilter !== 'todos' && r.payment_method !== metodoFilter) return false
      if (diaFilter !== 'todos' && String((r as any).payment_day ?? '') !== diaFilter) return false

      return true
    })
  }, [rents, tab, search, estadoFilter, bancoFilter, metodoFilter, diaFilter, month, year])

  const hasActiveFilters = search !== '' || estadoFilter !== 'todos' || bancoFilter !== 'todos' ||
    diaFilter !== 'todos' || metodoFilter !== 'todos' || tab !== 'all'

  function clearFilters() {
    setSearch('')
    setEstadoFilter('todos')
    setBancoFilter('todos')
    setDiaFilter('todos')
    setMetodoFilter('todos')
    setTab('all')
  }

  function openPay(r: Rent) {
    setPickerOpen(false)
    setSheetRent(r)
    setPayForm({
      paid_at:        new Date().toISOString().split('T')[0],
      bank_account:   'bbva',
      payment_method: 'transferencia',
      bank_reference: '',
      comment:        '',
      maintenance:    0,
      services_amount: 0,
      other_charges:  0,
    })
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!sheetRent) return
    const data: any = {
      paid_at:         payForm.paid_at,
      payment_method:  payForm.payment_method,
      bank_reference:  payForm.bank_reference || null,
      comment:         payForm.comment || null,
      maintenance:     payForm.maintenance,
      services_amount: payForm.services_amount,
      other_charges:   payForm.other_charges,
    }
    if (payForm.payment_method === 'transferencia') {
      data.bank_account = payForm.bank_account
    }
    await payMutation.mutateAsync({ id: sheetRent.id, data })
    setSheetRent(null)
  }

  async function handleDelete() {
    if (!confirmRent) return
    await deleteMutation.mutateAsync(confirmRent.id)
    setConfirmRent(null)
  }

  const progress = summary.total > 0 ? Math.round((summary.collected / summary.total) * 100) : 0
  const monthLabel = MESES.find(m => m.value === month)?.label ?? ''
  const pendingRentsForPicker = rents.filter(r => r.status === 'pending')

  return (
    <div>
      <PageHeader
        title="COBRANZA"
        subtitle={`Resumen de rentas • ${monthLabel} ${year}`}
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
              onClick={() => setPickerOpen(true)}
              className="h-9 lg:h-10 flex items-center gap-1.5 bg-accent-DEFAULT rounded-lg px-3 lg:px-4 hover:brightness-105 transition-all shrink-0"
            >
              <span className="text-white text-base leading-none font-bold">+</span>
              <span className="text-white text-xs lg:text-sm font-semibold whitespace-nowrap">Registrar pago</span>
            </button>
          </div>
        }
      />

      {/* ══════════════════════════ DESKTOP ══════════════════════════ */}
      <div className="hidden lg:block px-8 xl:px-10 py-6">
        <div className="lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto flex flex-col gap-6">

          {/* KPIs */}
          <div className="grid grid-cols-5 gap-4">
            <KpiCard icon={<DollarSign size={20} />} iconBg="bg-green-50" iconColor="text-green-600"
              label="Cobrado" value={formatCurrency(summary.collected)}
              caption={`${progress}% del total`} />
            <KpiCard icon={<Clock size={20} />} iconBg="bg-orange-50" iconColor="text-orange-500"
              label="Pendiente" value={formatCurrency(summary.pendingAmount)}
              caption={`${summary.pending} ${summary.pending === 1 ? 'renta' : 'rentas'}`} />
            <KpiCard icon={<AlertCircle size={20} />} iconBg="bg-red-50" iconColor="text-red-500"
              label="Vencido" value={formatCurrency(summary.vencidoAmount)}
              caption={`${summary.vencidoCount} ${summary.vencidoCount === 1 ? 'renta' : 'rentas'}`} />
            <KpiCard icon={<Home size={20} />} iconBg="bg-blue-50" iconColor="text-blue-500"
              label="Propiedades" value={String(summary.activeProperties)}
              caption="activas" />
            <KpiCard icon={<CalendarDays size={20} />} iconBg="bg-purple-50" iconColor="text-purple-500"
              label="Próximo cobro"
              value={summary.proximoCobro ? `${summary.proximoCobro.day} ${MES_ABREV[month - 1]}` : '—'}
              caption={summary.proximoCobro ? `${summary.proximoCobro.count} ${summary.proximoCobro.count === 1 ? 'renta' : 'rentas'}` : 'sin pendientes'} />
          </div>

          {/* Progreso de cobranza */}
          <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 lg:p-6">
            <p className="text-sm font-semibold text-gray-500 mb-3">Progreso de cobranza del mes</p>
            <div className="flex items-end justify-between mb-2.5">
              <p className="text-lg lg:text-xl font-bold text-[#1A1A1A]">
                {formatCurrency(summary.collected)}
                <span className="text-gray-400 font-normal text-sm lg:text-base"> de {formatCurrency(summary.total)} cobrados</span>
              </p>
              <p className="text-xl lg:text-2xl font-bold text-green-600 shrink-0">{progress}%</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(Math.max(progress, summary.total > 0 ? 2 : 0), 100)}%` }} />
              </div>
              <span className="text-xs lg:text-sm text-gray-400 shrink-0 whitespace-nowrap">
                Faltan {formatCurrency(Math.max(summary.total - summary.collected, 0))} por cobrar
              </span>
            </div>
          </div>

          {/* Tabs tipo chip */}
          <div className="flex gap-2">
            {([
              { key: 'all',     label: `Todas (${summary.count})` },
              { key: 'pending', label: `Pendientes (${summary.pending})` },
              { key: 'paid',    label: `Pagadas (${summary.paid})` },
            ] as { key: 'all' | 'pending' | 'paid'; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.key ? 'bg-primary-500 text-white' : 'bg-white border border-[#E8E5DF] text-gray-500 hover:bg-gray-50'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex items-end gap-2.5 overflow-x-auto">
            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">Buscar</span>
              <div className="h-10 flex items-center gap-2 bg-white border border-[#E8E5DF] rounded-lg px-3">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  className="flex-1 text-sm bg-transparent outline-none text-[#1A1A1A] placeholder:text-gray-400 min-w-0"
                  placeholder="Buscar propiedad o inquilino..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <FilterSelect label="Estado" value={estadoFilter} onChange={setEstadoFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'paid', label: 'Pagada' },
                { value: 'vencido', label: 'Vencida' },
              ]} />

            <FilterSelect label="Banco" value={bancoFilter} onChange={setBancoFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'bbva', label: 'BBVA' },
                { value: 'banorte', label: 'Banorte' },
              ]} />

            <FilterSelect label="Día de pago" value={diaFilter} onChange={setDiaFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                ...diasDisponibles.map(d => ({ value: String(d), label: `Día ${d}` })),
              ]} />

            <FilterSelect label="Método de pago" value={metodoFilter} onChange={setMetodoFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'transferencia', label: 'Transferencia' },
              ]} />

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
          {!isLoading && rents.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-3 bg-white border border-[#E8E5DF] rounded-2xl">
              <p className="text-sm text-gray-400">No hay rentas generadas este mes</p>
              <button
                onClick={async () => {
                  const token = sessionStorage.getItem('arrendia_token')
                  const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/dashboard/generate-rents?month=${month}&year=${year}`,
                    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
                  )
                  const data = await res.json()
                  alert(`${data.generated} rentas generadas`)
                }}
                className="btn-primary px-6"
              >
                Generar rentas de este mes
              </button>
            </div>
          )}
          {!isLoading && rents.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">Sin resultados</div>
          )}
          {!isLoading && filtered.length > 0 && (
            <RentTable rents={filtered} month={month} year={year}
              onPay={openPay}
              onUnpay={id => unpayMutation.mutateAsync(id)}
              onDelete={setConfirmRent}
            />
          )}
        </div>
      </div>

      {/* ══════════════════════════ MOBILE (sin cambios de layout) ══════════════════════════ */}
      <div className="lg:hidden">
        <div className="bg-primary-500 px-4 pb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/70">Progreso del mes</span>
            <span className="text-accent-DEFAULT font-medium">{summary.paid} de {summary.count} cobradas</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-accent-DEFAULT rounded-full transition-all" style={{ width: `${Math.max(progress, 3)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white text-xs font-medium">{formatCurrency(summary.collected)} cobrado</span>
            <span className="text-white/60 text-xs">falta {formatCurrency(summary.total - summary.collected)}</span>
          </div>
        </div>

        <div className="flex bg-white border-b border-[#E8E5DF]">
          {([
            { key: 'all',     label: `Todas (${summary.count})` },
            { key: 'pending', label: `Pendientes (${summary.pending})` },
            { key: 'paid',    label: `Pagadas (${summary.paid})` },
          ] as { key: 'all' | 'pending' | 'paid'; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-400'
              }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="px-4 py-3 flex flex-col gap-2.5">
          {isLoading && <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>}
          {!isLoading && rents.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400">No hay rentas generadas este mes</p>
              <button
                onClick={async () => {
                  const token = sessionStorage.getItem('arrendia_token')
                  const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/dashboard/generate-rents?month=${month}&year=${year}`,
                    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
                  )
                  const data = await res.json()
                  alert(`${data.generated} rentas generadas`)
                }}
                className="btn-primary px-6"
              >
                Generar rentas de este mes
              </button>
            </div>
          )}
          {!isLoading && rents.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">Sin resultados</div>
          )}
          {filtered.map(r => (
            <RentCard key={r.id} rent={r}
              onPay={() => openPay(r)}
              onUnpay={() => unpayMutation.mutateAsync(r.id)}
              onDelete={() => setConfirmRent(r)}
            />
          ))}
        </div>
      </div>

      {/* Sheet — elegir renta pendiente (botón "+ Registrar pago" del header) */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Selecciona una renta pendiente">
        <div className="flex flex-col gap-2 pb-4">
          {pendingRentsForPicker.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No hay rentas pendientes este mes</p>
          )}
          {pendingRentsForPicker.map(r => (
            <button key={r.id} onClick={() => openPay(r)}
              className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-[#E8E5DF] hover:bg-gray-50 hover:border-primary-500 transition-colors text-left">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                  {r.property_name}{r.property_number ? ` #${r.property_number}` : ''}
                </p>
                <p className="text-xs text-gray-400 truncate">{r.tenant_name ?? '—'}</p>
              </div>
              <span className="text-sm font-semibold text-[#1A1A1A] shrink-0">{formatCurrency(r.amount)}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Sheet registrar pago */}
      <Sheet open={sheetRent !== null} onClose={() => setSheetRent(null)} title="Registrar pago">
        {sheetRent && (
          <PayForm rent={sheetRent}
            form={payForm} onChange={setPayForm}
            onSubmit={handlePay} onCancel={() => setSheetRent(null)}
            saving={payMutation.isPending}
          />
        )}
      </Sheet>

      {/* Confirm eliminar */}
      <ConfirmDialog
        open={confirmRent !== null}
        title="Eliminar renta"
        message={`¿Eliminar la renta de ${confirmRent?.property_name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmRent(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── KPI card (estilo Dashboard) ───────────────────────────────

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

// ─── Tarjeta de renta (móvil) ───────────────────────────────────

function RentCard({ rent: r, onPay, onUnpay, onDelete }: {
  rent: Rent
  onPay: () => void; onUnpay: () => void; onDelete: () => void
}) {
  const isPaid = r.status === 'paid'
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const propNum  = r.property_number
  const propLabel = `${r.property_name}${propNum ? ` #${propNum}` : ''}`
  const payMethod = r.payment_method

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      setLogoBase64(canvas.toDataURL('image/png'))
    }
    img.src = `${window.location.origin}/logo.png`
  }, [])

  async function handleDownload() {
    setGenerating(true)
    try {
      generateReceiptPDF(r, logoBase64)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={`bg-white border border-[#E8E5DF] rounded-xl p-3.5 flex flex-col gap-2.5
      ${isPaid ? 'border-l-[3px] border-l-green-500' : 'border-l-[3px] border-l-amber-400'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[#1A1A1A]">{propLabel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{r.tenant_name ?? '—'}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[14px] font-semibold text-[#1A1A1A]">{formatCurrency(r.amount)}</span>
          <StatusChip status={r.status} />
        </div>
      </div>

      {isPaid && (
        <div className="bg-green-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-green-700">Pagado el {r.paid_at ? formatDate(r.paid_at) : '—'}</p>
            <p className="text-[10px] text-green-600 font-medium mt-0.5 capitalize">
              {payMethod ?? '—'}
              {payMethod === 'transferencia' && r.bank_account ? ` · ${r.bank_account.toUpperCase()}` : ''}
              {r.bank_reference ? ` · Ref: ${r.bank_reference}` : ''}
            </p>
          </div>
          {r.comment && <p className="text-[10px] text-green-600 max-w-[120px] text-right truncate">{r.comment}</p>}
        </div>
      )}

      <div className="flex gap-2">
        {!isPaid && (
          <button onClick={onPay}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg py-2 active:scale-95 transition-transform">
            <CheckCircle2 size={13} />
            Registrar pago
          </button>
        )}
        {isPaid && (
          <button onClick={handleDownload} disabled={generating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg py-2 border border-green-200 active:scale-95 transition-transform disabled:opacity-50">
            <FileText size={13} />
            {generating ? 'Generando...' : 'Descargar recibo PDF'}
          </button>
        )}
        {isPaid && (
          <button onClick={onUnpay} title="Revertir pago"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50">
            <RotateCcw size={14} />
          </button>
        )}
        <button onClick={onDelete} title="Eliminar"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Tabla de rentas (escritorio) — header fijo, scroll solo en el cuerpo ──

function RentTable({ rents, month, year, onPay, onUnpay, onDelete }: {
  rents: Rent[]; month: number; year: number
  onPay: (r: Rent) => void; onUnpay: (id: number) => void; onDelete: (r: Rent) => void
}) {
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      setLogoBase64(canvas.toDataURL('image/png'))
    }
    img.src = `${window.location.origin}/logo.png`
  }, [])

  async function handleDownload(r: Rent) {
    setDownloadingId(r.id)
    try {
      generateReceiptPDF(r, logoBase64)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
      <div className="max-h-[560px] overflow-y-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-[19%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E8E5DF] bg-[#FAF8F4]">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Propiedad</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Inquilino</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Día de pago</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Monto</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Estatus</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Método pago</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Cuenta</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rents.map(r => {
              const isPaid = r.status === 'paid'
              const vencido = isVencido(r, month, year)
              const propLabel = `${r.property_name}${r.property_number ? ` #${r.property_number}` : ''}`
              return (
                <tr key={r.id} className="border-b border-[#F0EDE7] last:border-0 transition-colors hover:bg-[#FAF8F4]">
                  <td className="px-5 py-4 text-sm font-medium text-[#1A1A1A] truncate">{propLabel}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 truncate">{r.tenant_name ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{(r as any).payment_day ? `Día ${(r as any).payment_day}` : '—'}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#1A1A1A] text-right">{formatCurrency(r.amount)}</td>
                  <td className="px-5 py-4"><StatusChip status={r.status} vencido={vencido} /></td>
                  <td className="px-5 py-4 text-sm text-gray-600 capitalize truncate">{isPaid ? (r.payment_method ?? '—') : '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 uppercase">{isPaid && r.payment_method === 'transferencia' ? (r.bank_account ?? '—') : '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isPaid && (
                        <button onClick={() => onPay(r)}
                          className="h-8 flex items-center gap-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg px-3 transition-all duration-200 hover:-translate-y-[1px]">
                          <CheckCircle2 size={13} />
                          Registrar pago
                        </button>
                      )}
                      {isPaid && (
                        <button onClick={() => handleDownload(r)} disabled={downloadingId === r.id}
                          className="h-8 flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg px-3 border border-green-200 transition-all duration-200 hover:-translate-y-[1px] disabled:opacity-50">
                          <FileText size={12} />
                          PDF
                        </button>
                      )}
                      {isPaid && (
                        <button onClick={() => onUnpay(r.id)} title="Revertir pago"
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-[1px]">
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button onClick={() => onDelete(r)} title="Eliminar"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 hover:-translate-y-[1px]">
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
    </div>
  )
}

// ─── Form de pago ─────────────────────────────────────────────

function PayForm({ rent: r, form, onChange, onSubmit, onCancel, saving }: {
  rent: Rent
  form: ExtendedPayForm; onChange: (f: ExtendedPayForm) => void
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; saving: boolean
}) {
  const propNum  = r.property_number
  const propLabel = `${r.property_name}${propNum ? ` #${propNum}` : ''}`

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
      {/* Info propiedad */}
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">{propLabel}</p>
        <p className="text-xs text-gray-500 mt-0.5">{r.tenant_name ?? '—'}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">Renta base: <span className="font-medium text-gray-600">{formatCurrency(r.amount)}</span></span>
        </div>
      </div>

      {/* Método de pago */}
      <div>
        <label className="label">Método de pago</label>
        <div className="grid grid-cols-2 gap-2">
          {(['efectivo', 'transferencia'] as PaymentMethod[]).map(m => (
            <button key={m} type="button"
              onClick={() => onChange({ ...form, payment_method: m })}
              className={`py-3 rounded-xl border text-sm font-medium transition-colors capitalize ${
                form.payment_method === m
                  ? 'border-primary-500 bg-primary-50 text-primary-500'
                  : 'border-[#E8E5DF] text-gray-500'
              }`}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* Banco — solo si es transferencia */}
      {form.payment_method === 'transferencia' && (
        <>
          <div>
            <label className="label">Cuenta receptora</label>
            <div className="grid grid-cols-2 gap-2">
              {(['bbva', 'banorte'] as BankAccount[]).map(bank => (
                <button key={bank} type="button"
                  onClick={() => onChange({ ...form, bank_account: bank })}
                  className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                    form.bank_account === bank
                      ? 'border-primary-500 bg-primary-50 text-primary-500'
                      : 'border-[#E8E5DF] text-gray-500'
                  }`}
                >{bank.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Referencia bancaria (opcional)</label>
            <input className="input-base" placeholder="Número de referencia o folio..."
              value={form.bank_reference ?? ''}
              onChange={e => onChange({ ...form, bank_reference: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Fecha */}
      <div>
        <label className="label">Fecha de pago</label>
        <input className="input-base" type="date"
          value={form.paid_at}
          onChange={e => onChange({ ...form, paid_at: e.target.value })}
          required
        />
      </div>

      {/* Cargos adicionales */}
      <div>
        <label className="label">Cargos adicionales</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 flex-shrink-0">Mantenimiento</span>
            <input className="input-base flex-1" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.maintenance || ''}
              onChange={e => onChange({ ...form, maintenance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 flex-shrink-0">Servicios</span>
            <input className="input-base flex-1" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.services_amount || ''}
              onChange={e => onChange({ ...form, services_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 flex-shrink-0">Otros cargos</span>
            <input className="input-base flex-1" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.other_charges || ''}
              onChange={e => onChange({ ...form, other_charges: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        {/* Total calculado */}
        {(form.maintenance > 0 || form.services_amount > 0 || form.other_charges > 0) && (
          <div className="mt-2 bg-primary-50 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-xs text-primary-600">Total a cobrar</span>
            <span className="text-sm font-semibold text-primary-500">
              {formatCurrency(r.amount + (form.maintenance || 0) + (form.services_amount || 0) + (form.other_charges || 0))}
            </span>
          </div>
        )}
      </div>

      {/* Comentario */}
      <div>
        <label className="label">Observaciones (opcional)</label>
        <input className="input-base" placeholder="Notas adicionales para el recibo..."
          value={form.comment ?? ''}
          onChange={e => onChange({ ...form, comment: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">
          {saving ? 'Guardando...' : 'Confirmar pago'}
        </button>
      </div>
    </form>
  )
}

function StatusChip({ status, vencido }: { status: string; vencido?: boolean }) {
  if (status === 'paid') return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
      <CheckCircle2 size={10} /> Pagada
    </span>
  )
  if (vencido) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full w-fit">
      <AlertCircle size={10} /> Vencida
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
      <Clock size={10} /> Pendiente
    </span>
  )
}
