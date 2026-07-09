import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { formatCurrency, formatDate, currentMonthYear, formatMonthYear } from '@/lib/utils'
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

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
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

  const fijos   = expenses.filter(e => e.is_recurring === 1)
  const noFijos = expenses.filter(e => e.is_recurring === 0)
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle={formatMonthYear(month, year)}
        action={
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronRight size={14} className="text-white" />
            </button>
            <button onClick={openNew} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 ml-1">
              <Plus size={14} className="text-white" />
            </button>
          </div>
        }
      />

      {/* Móvil — listas agrupadas */}
      <div className="px-4 py-4 flex flex-col gap-4 lg:hidden">
        {isLoading && (
          <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
        )}

        {!isLoading && expenses.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            Sin gastos registrados este mes
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
      <div className="hidden lg:block lg:px-8 xl:px-10 lg:py-6">
        <div className="lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto">
          {isLoading && <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>}
          {!isLoading && expenses.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400 bg-white border border-[#E8E5DF] rounded-2xl">
              Sin gastos registrados este mes
            </div>
          )}
          {!isLoading && expenses.length > 0 && (
            <ExpenseTable expenses={expenses}
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

function ExpenseTable({ expenses, onEdit, onDelete }: {
  expenses: Expense[]; onEdit: (e: Expense) => void; onDelete: (e: Expense) => void
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
              <td className="px-5 py-3.5 text-sm text-gray-600">{e.created_at ? formatDate(e.created_at) : '—'}</td>
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
