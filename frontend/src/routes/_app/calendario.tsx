import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2,
  Pencil, FileText, Home, RefreshCw, Receipt, StickyNote, Bell,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useCalendar, useCreateReminder, useMarkReminderDone,
  useDeleteReminder, useCreateNote, useUpdateNote, useDeleteNote,
} from '@/hooks/useCalendar'
import { useProperties } from '@/hooks/useProperties'
import { formatCurrency, currentMonthYear, formatMonthYear } from '@/lib/utils'
import type { CalendarEvent, Note, ReminderForm } from '@/types'

export const Route = createFileRoute('/_app/calendario')({
  component: CalendarioPage,
})

const FREQ_OPTIONS = [
  { value: '',   label: 'Sin repetición' },
  { value: '1m', label: 'Cada mes' },
  { value: '3m', label: 'Cada 3 meses' },
  { value: '6m', label: 'Cada 6 meses' },
  { value: '1y', label: 'Cada año' },
]

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function CalendarioPage() {
  const now = currentMonthYear()
  const [month, setMonth] = useState(now.month)
  const [year, setYear]   = useState(now.year)
  const navigate = useNavigate()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [noteSheetOpen, setNoteSheetOpen] = useState(false)
  const [editNote, setEditNote]         = useState<Note | null>(null)
  const [noteContent, setNoteContent]   = useState('')
  const [confirmId, setConfirmId]       = useState<number | null>(null)
  const [form, setForm]                 = useState<ReminderForm>({
    title: '', reminder_date: '', frequency: '',
  })

  const { data, isLoading }    = useCalendar(month, year)
  const { data: properties = [] } = useProperties()
  const createReminder  = useCreateReminder()
  const markDone        = useMarkReminderDone()
  const deleteReminder  = useDeleteReminder()
  const createNote      = useCreateNote()
  const updateNote      = useUpdateNote()
  const deleteNote      = useDeleteNote()

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  async function handleCreateReminder() {
    if (!form.title || !form.reminder_date) return
    await createReminder.mutateAsync({
      ...form,
      frequency: form.frequency || undefined,
      property_id: form.property_id || undefined,
    })
    setSheetOpen(false)
    setForm({ title: '', reminder_date: '', frequency: '' })
  }

  async function handleSaveNote() {
    if (!noteContent.trim()) return
    if (editNote) {
      await updateNote.mutateAsync({ id: editNote.id, content: noteContent })
    } else {
      await createNote.mutateAsync(noteContent)
    }
    setNoteSheetOpen(false)
    setEditNote(null)
    setNoteContent('')
  }

  // Agrupar eventos por día
  const grouped = (data?.events ?? []).reduce((acc, ev) => {
    const d = ev.date
    if (!acc[d]) acc[d] = []
    acc[d].push(ev)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const sortedDays = Object.keys(grouped).sort()
  const todayStr   = new Date().toISOString().split('T')[0]

  return (
    <div>
      <PageHeader
        title="Calendario"
        subtitle={formatMonthYear(month, year)}
        action={
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10">
              <ChevronRight size={14} className="text-white" />
            </button>
            <button onClick={() => setSheetOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 ml-1">
              <Plus size={14} className="text-white" />
            </button>
          </div>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {isLoading && <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>}

        {/* Notas fijas */}
        {(data?.notes ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">Notas</p>
              <button onClick={() => { setEditNote(null); setNoteContent(''); setNoteSheetOpen(true) }}
                className="text-[10px] font-semibold text-[#C5A880] flex items-center gap-1">
                <Plus size={10} /> Nueva nota
              </button>
            </div>
            {data!.notes.map(n => (
              <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <StickyNote size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 flex-1 leading-relaxed">{n.content}</p>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditNote(n); setNoteContent(n.content); setNoteSheetOpen(true) }}
                    className="text-amber-400 hover:text-amber-600 p-0.5">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteNote.mutate(n.id)} className="text-amber-300 hover:text-red-500 p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón nueva nota si no hay ninguna */}
        {(data?.notes ?? []).length === 0 && !isLoading && (
          <button onClick={() => { setEditNote(null); setNoteContent(''); setNoteSheetOpen(true) }}
            className="flex items-center gap-2 bg-amber-50 border border-dashed border-amber-300 rounded-xl px-3 py-2.5 text-xs text-amber-600 font-medium">
            <StickyNote size={13} />
            Agregar nota fija
          </button>
        )}

        {/* Timeline */}
        {!isLoading && sortedDays.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Sin eventos este mes</div>
        )}

        {sortedDays.length > 0 && (
          <div className="flex flex-col gap-0">
            <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
              {MONTHS[month - 1]} {year}
            </p>
            {sortedDays.map(day => {
              const isToday = day === todayStr
              const d       = new Date(day + 'T12:00:00')
              const dd      = d.getDate()
              const dow     = ['dom','lun','mar','mié','jue','vie','sáb'][d.getDay()]
              return (
                <div key={day} className="flex gap-3 mb-3">
                  {/* Fecha */}
                  <div className="w-9 shrink-0 flex flex-col items-center pt-1">
                    <span className={`text-[15px] font-bold leading-none ${isToday ? 'text-[#C5A880]' : 'text-[#2C3E50]'}`}>{dd}</span>
                    <span className={`text-[9px] font-medium mt-0.5 ${isToday ? 'text-[#C5A880]' : 'text-gray-400'}`}>{dow}</span>
                  </div>
                  {/* Línea */}
                  <div className={`w-px self-stretch mt-1.5 ${isToday ? 'bg-[#C5A880]' : 'bg-[#E8E5DF]'}`} />
                  {/* Eventos */}
                  <div className="flex flex-col gap-2 flex-1 pb-1 pt-0.5">
                    {grouped[day].map(ev => (
                      <EventCard key={ev.id} event={ev}
                        onDone={() => markDone.mutate(ev.ref_id)}
                        onDelete={() => setConfirmId(ev.ref_id)}
                        onNavigate={() => {
                          if (ev.type === 'rent') navigate({ to: '/cobranza' })
                          if (ev.type === 'contract') navigate({ to: '/contratos' })
                          if (ev.type === 'invoice') navigate({ to: '/cobranza' })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sheet nuevo recordatorio */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Nuevo recordatorio">
        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Título</label>
            <input className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
              placeholder="Ej. Mantenimiento Aires..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Fecha</label>
            <input type="date" className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
              value={form.reminder_date}
              onChange={e => setForm(f => ({ ...f, reminder_date: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Frecuencia</label>
            <div className="flex flex-col gap-2">
              {FREQ_OPTIONS.map(opt => (
                <button key={opt.value}
                  onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border text-left transition-colors ${
                    form.frequency === opt.value
                      ? 'bg-[#2C3E50] border-[#2C3E50] text-white'
                      : 'bg-white border-[#E8E5DF] text-gray-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Propiedad (opcional)</label>
            <select className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880]"
              value={form.property_id ?? ''}
              onChange={e => setForm(f => ({ ...f, property_id: e.target.value ? Number(e.target.value) : undefined }))}>
              <option value="">Sin propiedad</option>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.number ? ` #${p.number}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateReminder}
            disabled={createReminder.isPending || !form.title || !form.reminder_date}
            className="bg-[#2C3E50] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">
            {createReminder.isPending ? 'Guardando...' : 'Agregar recordatorio'}
          </button>
        </div>
      </Sheet>

      {/* Sheet nota */}
      <Sheet open={noteSheetOpen} onClose={() => setNoteSheetOpen(false)} title={editNote ? 'Editar nota' : 'Nueva nota'}>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Contenido</label>
            <textarea
              className="border border-[#E8E5DF] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#C5A880] resize-none"
              rows={5}
              placeholder="Ej. Departamentos sin luz: Jazmin 1, 2, 3..."
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)} />
          </div>
          <button
            onClick={handleSaveNote}
            disabled={createNote.isPending || updateNote.isPending || !noteContent.trim()}
            className="bg-[#2C3E50] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform">
            {createNote.isPending || updateNote.isPending ? 'Guardando...' : editNote ? 'Guardar cambios' : 'Agregar nota'}
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar recordatorio"
        description="¿Seguro que quieres eliminar este recordatorio?"
        onConfirm={async () => {
          if (confirmId) await deleteReminder.mutateAsync(confirmId)
          setConfirmId(null)
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}

const EVENT_COLORS: Record<string, string> = {
  rent:     '#F59E0B',
  invoice:  '#3B82F6',
  contract: '#EF4444',
  reminder: '#8B5CF6',
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  rent:     <Home size={12} />,
  invoice:  <Receipt size={12} />,
  contract: <FileText size={12} />,
  reminder: <Bell size={12} />,
}

function EventCard({ event: ev, onDone, onDelete, onNavigate }: {
  event: CalendarEvent
  onDone: () => void
  onDelete: () => void
  onNavigate: () => void
}) {
  const color   = EVENT_COLORS[ev.type] ?? '#888'
  const isDone  = ev.status === 'done'
  const isManual = ev.ref_type === 'reminder'

  return (
    <div className={`bg-white border border-[#E8E5DF] rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${isDone ? 'opacity-60' : ''}`}
      style={{ borderLeft: `3px solid ${color}` }}>
      <div className="shrink-0" style={{ color }}>{EVENT_ICONS[ev.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold text-[#1A1A1A] truncate ${isDone ? 'line-through' : ''}`}>{ev.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {ev.amount && <span className="text-[10px] text-gray-400">{formatCurrency(ev.amount)}</span>}
          {ev.days_remaining !== undefined && (
            <span className="text-[10px] text-red-500 font-medium">{ev.days_remaining} días</span>
          )}
          {ev.frequency && (
            <span className="text-[10px] text-purple-500 flex items-center gap-0.5">
              <RefreshCw size={9} />{FREQ_OPTIONS.find(f => f.value === ev.frequency)?.label}
            </span>
          )}
          {isDone && <span className="text-[10px] text-green-600 font-medium">✓ Hecho</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!isDone && ev.type !== 'rent' && ev.type !== 'contract' && (
          <button onClick={onDone}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-green-50 text-green-600 border border-green-200">
            <Check size={11} />
          </button>
        )}
        {(ev.type === 'rent' || ev.type === 'contract' || ev.type === 'invoice') && (
          <button onClick={onNavigate}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 border border-[#E8E5DF] text-[10px] font-bold">
            →
          </button>
        )}
        {isManual && (
          <button onClick={onDelete}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 border border-[#E8E5DF]">
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}
