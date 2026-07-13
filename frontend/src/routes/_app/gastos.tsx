import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw,
  Wallet, CheckCircle2, Clock, Search, Tag, ShieldCheck, ChevronDown, FilterX,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeaderSelect } from '@/components/ui/HeaderSelect'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { formatCurrency, formatDate, currentMonthYear, formatMonthYear } from '@/lib/utils'
import { MESES, ANIOS_DISPONIBLES } from '@/lib/dateOptions'
import type { Expense, ExpenseForm } from '@/types'

export const Route = createFileRoute('/_app/gastos')({
  component: ExpensesPage,
}) 

const EMPTY_FORM: ExpenseForm = {
  type: '', amount: 0, is_recurring: false,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  status: 'pending',
}

function ExpensesPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState<Expense | null>(null)
  const [form, setForm]           = useState<ExpenseForm>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const { data: expenses = [], isLoading } = useExpenses(month, year)
  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()

  const [conceptoFilter, setConceptoFilter]   = useState('todos')
  const [categoriaFilter, setCategoriaFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter]       = useState('todos')

  const conceptosDisponibles = useMemo(() =>
    Array.from(new Set(expenses.map(e => e.type))).sort()
  , [expenses])

  const filtered = useMemo(() => expenses.filter(e => {
    if (conceptoFilter !== 'todos' && e.type !== conceptoFilter) return false
    if (categoriaFilter === 'fijo' && e.is_recurring !== 1) return false
    if (categoriaFilter === 'no_fijo' && e.is_recurring !== 0) return false
    if (estadoFilter !== 'todos' && e.status !== estadoFilter) return false
    return true
  }), [expenses, conceptoFilter, categoriaFilter, estadoFilter])

  const hasActiveFilters = conceptoFilter !== 'todos' || categoriaFilter !== 'todos' || estadoFilter !== 'todos'

  function clearFilters() {
    setConceptoFilter('todos')
    setCategoriaFilter('todos')
    setEstadoFilter('todos')
  }

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, month, year })
    setSheetOpen(true)
  }

  function openEdit(e: Expense) {
    setEditing(e)
    setForm({
      type: e.type, amount: e.amount,
      is_recurring: e.is_recurring === 1,
      month: e.month, year: e.year, status: e.status,
    })
    setSheetOpen(true)
  }

  async function handleSubmit() {
    if (!form.type || !form.amount) return
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, form })
    } else {
      await createMutation.mutateAsync(form)
    }
    setSheetOpen(false)
  }

  const fijos   = filtered.filter(e => e.is_recurring === 1)
  const noFijos = filtered.filter(e => e.is_recurring === 0)
  const totalGastos = filtered.reduce((s, e) => s + e.amount, 0)
  const totalPagado    = filtered.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0)
  const totalPendiente = filtered.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const pctPagado    = totalGastos > 0 ? Math.round((totalPagado / totalGastos) * 100) : 0
  const pctPendiente = totalGastos > 0 ? Math.round((totalPendiente / totalGastos) * 100) : 0
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle={formatMonthYear(month, year)}
        action={
          <div className="flex items-end flex-wrap justify-end gap-2 lg:gap-3">
            <HeaderSelect label="Mes" value={month} onChange={setMonth} options={MESES} />
            <HeaderSelect
              label="Año"
              value={year}
              onChange={setYear}
              options={ANIOS_DISPONIBLES.map(y => ({ value: y, label: String(y) }))}
            />
            <button onClick={openNew} className="h-9 lg:h-10 w-9 lg:w-10 flex items-center justify-center rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors shrink-0">
              <Plus size={16} className="text-white" />
            </button>
          </div>
        }
      />

      {/* KPIs + filtros — visibles en todos los tamaños */}
      <div className="px-4 py-4 lg:px-8 xl:px-10 lg:py-6">
        <div className="lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto flex flex-col gap-3 lg:gap-5">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <KpiCard icon={<Wallet size={22} />} iconBg="bg-blue-50" iconColor="text-blue-600"
              label="Total gastado" value={formatCurrency(totalGastos)}
              caption={`${filtered.length} ${filtered.length === 1 ? 'gasto' : 'gastos'}`} />
            <KpiCard icon={<CheckCircle2 size={22} />} iconBg="bg-green-50" iconColor="text-green-600"
              label="Pagado" value={formatCurrency(totalPagado)}
              caption={`${pctPagado}% del total`} />
            <KpiCard icon={<Clock size={22} />} iconBg="bg-amber-50" iconColor="text-amber-500"
              label="Pendiente" value={formatCurrency(totalPendiente)}
              caption={`${pctPendiente}% del total`} />
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:gap-3 lg:flex-wrap">
            <FilterSelect label="Concepto" icon={<Search size={15} />} value={conceptoFilter} onChange={setConceptoFilter}
              options={[
                { value: 'todos', label: 'Todos los conceptos' },
                ...conceptosDisponibles.map(c => ({ value: c, label: c })),
              ]} />
            <FilterSelect label="Categoría" icon={<Tag size={15} />} value={categoriaFilter} onChange={setCategoriaFilter}
              options={[
                { value: 'todos', label: 'Todas las categorías' },
                { value: 'fijo', label: 'Fijo' },
                { value: 'no_fijo', label: 'No fijo' },
              ]} />
            <FilterSelect label="Estado" icon={<ShieldCheck size={15} />} value={estadoFilter} onChange={setEstadoFilter}
              options={[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'paid', label: 'Pagado' },
                { value: 'pending', label: 'Pendiente' },
              ]} />
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full lg:w-auto h-11 lg:h-12 flex items-center justify-center lg:justify-start gap-2 border border-[#E8E5DF] rounded-xl px-4 text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors shrink-0"
            >
              <FilterX size={16} />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Móvil — listas agrupadas */}
      <div className="px-4 pb-4 flex flex-col gap-4 lg:hidden">
        {isLoading && (
          <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
        )}

        {!isLoading && expenses.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            Sin gastos registrados este mes
          </div>
        )}

        {!isLoading && expenses.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Sin resultados para estos filtros
          </div>
        )}

        {fijos.length > 0 && (
          <Section title="Gastos fijos" icon={<RefreshCw size={13} />}>
            {fijos.map(e => (
              <ExpenseRow key={e.id} expense={e}
                onEdit={() => openEdit(e)}
                onDelete={() => setConfirmId(e.id)} />
            ))}
          </Section>
        )}

        {noFijos.length > 0 && (
          <Section title="Gastos no fijos" icon={<Trash2 size={13} />}>
            {noFijos.map(e => (
              <ExpenseRow key={e.id} expense={e}
                onEdit={() => openEdit(e)}
                onDelete={() => setConfirmId(e.id)} />
            ))}
          </Section>
        )}
      </div>

      {/* Escritorio — tabla */}
      <div className="hidden lg:block lg:px-8 xl:px-10 lg:pb-6">
        <div className="lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto">
          {isLoading && <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>}
          {!isLoading && expenses.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">
              Sin gastos registrados este mes
            </div>
          )}
          {!isLoading && expenses.length > 0 && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">
              Sin resultados para estos filtros
            </div>
          )}
          {!isLoading && filtered.length > 0 && (
            <ExpenseTable expenses={filtered} total={totalGastos}
              onEdit={openEdit}
              onDelete={e => setConfirmId(e.id)}
            />
          )}
        </div>
      </div>


      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      >
        <div className="flex flex-col gap-4 px-4 pb-6">

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Tipo de gasto</label>
            <input
              className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
              placeholder="Ej. Mantenimiento, Limpieza..."
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Monto</label>
            <input
              type="number"
              className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
              placeholder="0.00"
              value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Mes y año</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
                ].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number"
                className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'paid'] as const).map(s => (
                <button key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    form.status === s
                      ? s === 'paid'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-[#E8E5DF] text-gray-400'
                  }`}>
                  {s === 'paid' ? 'Pagado' : 'Pendiente'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}
            className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${
              form.is_recurring ? 'bg-blue-50 border-blue-300' : 'bg-white border-[#E8E5DF]'
            }`}
          >
            <RefreshCw size={16} className={form.is_recurring ? 'text-blue-600' : 'text-gray-400'} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${form.is_recurring ? 'text-blue-700' : 'text-gray-600'}`}>
                Gasto fijo (recurrente)
              </p>
              <p className="text-[10px] text-gray-400">Se agrega automáticamente cada mes</p>
            </div>
            <div className={`ml-auto w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
              form.is_recurring ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'
            }`}>
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isPending || !form.type || !form.amount}
            className="bg-[#2C3E50] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar gasto'}
          </button>

        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar gasto"
        description="¿Seguro que quieres eliminar este gasto?"
        onConfirm={async () => {
          if (confirmId) await deleteMutation.mutateAsync(confirmId)
          setConfirmId(null)
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

function KpiCard({ icon, iconBg, iconColor, label, value, caption }: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  label: string; value: string; caption: string
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl lg:rounded-2xl p-2.5 lg:p-6 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 transition-all duration-200 lg:hover:-translate-y-[1px]">
      <div className={`w-8 h-8 lg:w-14 lg:h-14 rounded-lg lg:rounded-2xl flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 lg:[&>svg]:w-[22px] lg:[&>svg]:h-[22px] ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 w-full">
        <p className="text-[10px] lg:text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className="text-sm lg:text-[28px] font-bold text-[#1A1A1A] leading-tight mt-0.5 truncate">{value}</p>
        <p className="text-[9px] lg:text-xs text-gray-400 mt-0.5 truncate">{caption}</p>
      </div>
    </div>
  )
}

function FilterSelect({ label, icon, value, onChange, options }: {
  label: string; icon: React.ReactNode
  value: string; onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full lg:flex-1 lg:min-w-[200px]">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-0.5">{label}</span>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-11 lg:h-12 bg-white border border-[#E8E5DF] rounded-xl pl-10 pr-9 text-sm font-medium text-[#1A1A1A] appearance-none cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">{title}</p>
      </div>
      <div className="bg-white border border-[#E8E5DF] rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function ExpenseTable({ expenses, total, onEdit, onDelete }: {
  expenses: Expense[]; total: number; onEdit: (e: Expense) => void; onDelete: (e: Expense) => void
}) {
  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#E8E5DF] bg-[#FAF8F4]">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Fecha</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Concepto</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Categoría</th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Monto</th>
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Estado</th>
            <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e.id} className="border-b border-[#F0EDE7] last:border-0 transition-colors hover:bg-[#FAF8F4]">
              <td className="px-5 py-3.5 text-sm text-gray-600">{e.created_at ? formatDate(e.created_at.slice(0, 10)) : '—'}</td>
              <td className="px-5 py-3.5 text-sm font-medium text-[#1A1A1A]">{e.type}</td>
              <td className="px-5 py-3.5 text-sm text-gray-600">{e.is_recurring === 1 ? 'Fijo' : 'No fijo'}</td>
              <td className="px-5 py-3.5 text-sm font-semibold text-[#1A1A1A] text-right">{formatCurrency(e.amount)}</td>
              <td className="px-5 py-3.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  e.status === 'paid' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
                }`}>
                  {e.status === 'paid' ? 'Pagado' : 'Pendiente'}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => onEdit(e)} title="Editar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-[1px]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(e)} title="Eliminar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 hover:-translate-y-[1px]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#E8E5DF] bg-[#FAF8F4]">
            <td colSpan={3} className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">Total</td>
            <td className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A] text-right">{formatCurrency(total)}</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ExpenseRow({ expense, onEdit, onDelete }: {
  expense: Expense; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE8] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          expense.status === 'paid' ? 'bg-green-500' : 'bg-amber-400'
        }`} />
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">{expense.type}</p>
          <p className="text-[10px] text-gray-400">
            {expense.status === 'paid' ? 'Pagado' : 'Pendiente'}
            {expense.is_recurring === 1 && ' · Fijo'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(expense.amount)}</span>
        <button onClick={onEdit} className="text-gray-400 hover:text-[#2C3E50] p-1">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
