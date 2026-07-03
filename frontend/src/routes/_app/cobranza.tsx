import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, RotateCcw, Trash2, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRents, usePayRent, useUnpayRent, useDeleteRent } from '@/hooks/useRents'
import { formatCurrency, formatDate, currentMonthYear, formatMonthYear } from '@/lib/utils'
import { generateReceiptPDF } from '@/components/ui/Receipt'
import type { Rent, RentPaymentForm, BankAccount, PaymentMethod } from '@/types'

export const Route = createFileRoute('/_app/cobranza')({
  component: CobranzaPage,
})

interface ExtendedPayForm extends RentPaymentForm {
  payment_method: PaymentMethod
  bank_reference?: string
  maintenance: number
  services_amount: number
  other_charges: number
}

function CobranzaPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const [tab, setTab]     = useState<'all' | 'pending' | 'paid'>('all')

  const { data: rents = [], isLoading } = useRents(month, year)
  const payMutation    = usePayRent()
  const unpayMutation  = useUnpayRent()
  const deleteMutation = useDeleteRent()

  const [sheetRent, setSheetRent]     = useState<Rent | null>(null)
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

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const summary = useMemo(() => {
    const paid    = rents.filter(r => r.status === 'paid')
    const pending = rents.filter(r => r.status === 'pending')
    const total   = rents.reduce((s, r) => s + r.amount, 0)
    const collected = paid.reduce((s, r) => s + r.amount, 0)
    return { paid: paid.length, pending: pending.length, total, collected, count: rents.length }
  }, [rents])

  const filtered = useMemo(() => {
    if (tab === 'paid')    return rents.filter(r => r.status === 'paid')
    if (tab === 'pending') return rents.filter(r => r.status === 'pending')
    return rents
  }, [rents, tab])

  function openPay(r: Rent) {
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

  const progress = summary.count > 0 ? Math.round((summary.paid / summary.count) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Cobranza"
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

      {/* Barra de progreso */}
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

      {/* Tabs */}
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

      {/* Lista */}
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

// ─── Tarjeta de renta ─────────────────────────────────────────

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
            className="flex-1 bg-primary-500 text-white text-xs font-medium rounded-lg py-2 active:scale-95 transition-transform">
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

function StatusChip({ status }: { status: string }) {
  if (status === 'paid') return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={10} /> Pagada
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Pendiente
    </span>
  )
}
