import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  Plus, Search,
  ToggleLeft, ToggleRight, Pencil, Trash2, History,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useToggleProperty,
} from '@/hooks/useProperties'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Property, PropertyForm, PropertyType } from '@/types'

export const Route = createFileRoute('/_app/propiedades')({
  component: PropiedadesPage,
})

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'bodega', label: 'Bodega' },
]

const EMPTY_FORM: PropertyForm = {
  type: 'casa',
  name: '',
  number: '',
  tenant_name: '',
  tenant_phone: '',
  monthly_rent: 0,
  payment_day: undefined,
  requires_invoice: false,
  start_date: '',
  active: true,
}

function PropiedadesPage() {
  const { data: properties = [], isLoading } = useProperties()
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()
  const deleteMutation = useDeleteProperty()
  const toggleMutation = useToggleProperty()

  const [search, setSearch]       = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState<Property | null>(null)
  const [form, setForm]           = useState<PropertyForm>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [historyProp, setHistoryProp] = useState<Property | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return properties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tenant_name ?? '').toLowerCase().includes(q)
    )
  }, [properties, search])

  const summary = useMemo(() => ({
    total:    properties.length,
    active:   properties.filter(p => p.active === 1).length,
    inactive: properties.filter(p => p.active === 0).length,
    rent:     properties.filter(p => p.active === 1).reduce((s, p) => s + p.monthly_rent, 0),
  }), [properties])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(p: Property) {
    setEditing(p)
    setForm({
      type:             p.type,
      name:             p.name,
      number:           p.number ?? '',
      tenant_name:      p.tenant_name ?? '',
      tenant_phone:     p.tenant_phone ?? '',
      monthly_rent:     p.monthly_rent,
      payment_day:      p.payment_day ?? undefined,
      requires_invoice: p.requires_invoice === 1,
      start_date:       p.start_date ?? '',
      active:           p.active === 1,
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

  async function handleToggle(p: Property) {
    await toggleMutation.mutateAsync({ id: p.id, active: p.active === 0 })
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader
        title="Propiedades"
        action={
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
            <Plus size={14} className="text-accent-DEFAULT" />
            <span className="text-accent-DEFAULT text-xs font-medium">Nueva</span>
          </button>
        }
      />

      <div className="bg-primary-500 px-4 pb-3 grid grid-cols-4 gap-2">
        {[
          { label: 'Total',     value: String(summary.total) },
          { label: 'Activas',   value: String(summary.active) },
          { label: 'Inactivas', value: String(summary.inactive) },
          { label: 'Renta',     value: formatCurrency(summary.rent) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/10 rounded-lg px-2 py-2 text-center">
            <p className="text-white text-sm font-semibold leading-tight">{value}</p>
            <p className="text-white/60 text-[9px] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-white border border-[#E8E5DF] rounded-xl px-3 py-2.5">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-[#1A1A1A] placeholder:text-gray-400"
            placeholder="Buscar propiedad o inquilino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 pb-6 flex flex-col gap-3">
        {isLoading && <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            {search ? 'Sin resultados' : 'No hay propiedades registradas aún'}
          </div>
        )}
        {filtered.map(p => (
          <PropertyCard
            key={p.id}
            property={p}
            onEdit={() => openEdit(p)}
            onDelete={() => setConfirmId(p.id)}
            onToggle={() => handleToggle(p)}
            onHistory={() => setHistoryProp(p)}
            toggling={toggleMutation.isPending}
          />
        ))}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? 'Editar propiedad' : 'Nueva propiedad'}>
        <PropForm form={form} onChange={setForm} onSubmit={handleSubmit} onCancel={() => setSheetOpen(false)} saving={isSaving} />
      </Sheet>

      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar propiedad"
        message="Se eliminará la propiedad y todos sus registros asociados."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleteMutation.isPending}
      />

      <Sheet open={historyProp !== null} onClose={() => setHistoryProp(null)} title={`Historial — ${historyProp?.name ?? ''}`}>
        <p className="text-sm text-gray-400 py-8 text-center">El historial estará disponible en Cobranza.</p>
      </Sheet>
    </div>
  )
}

function PropertyCard({ property: p, onEdit, onDelete, onToggle, onHistory, toggling }: {
  property: Property; onEdit: () => void; onDelete: () => void
  onToggle: () => void; onHistory: () => void; toggling: boolean
}) {
  const isActive = p.active === 1
  return (
    <div className={`bg-white border border-[#E8E5DF] rounded-xl p-4 flex flex-col gap-3 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[#1A1A1A]">{p.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
            {p.type}{p.number ? ` · #${p.number}` : ''}
          </p>
        </div>
        <span className={isActive ? 'badge-active' : 'badge-inactive'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
        <InfoItem label="Renta mensual" value={formatCurrency(p.monthly_rent)} />
        <InfoItem label="Día de pago"   value={p.payment_day ? `Día ${p.payment_day}` : '—'} />
        <InfoItem label="Factura"        value={p.requires_invoice === 1 ? 'Sí' : 'No'} />
        <InfoItem label="Desde"          value={p.start_date ? formatDate(p.start_date) : '—'} />
      </div>

      <div className="h-px bg-[#E8E5DF]" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {p.tenant_name ? (
            <>
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-semibold text-blue-600">
                  {p.tenant_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-700 truncate">{p.tenant_name}</p>
                {p.tenant_phone && <p className="text-[10px] text-gray-400 truncate">{p.tenant_phone}</p>}
              </div>
            </>
          ) : (
            <span className="text-xs text-gray-400">Sin inquilino</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ActionBtn onClick={onHistory} title="Historial"><History size={15} /></ActionBtn>
          <ActionBtn onClick={onEdit} title="Editar"><Pencil size={15} /></ActionBtn>
          <ActionBtn onClick={onToggle} title={isActive ? 'Desactivar' : 'Activar'} disabled={toggling}>
            {isActive ? <ToggleRight size={17} className="text-green-600" /> : <ToggleLeft size={17} className="text-gray-400" />}
          </ActionBtn>
          <ActionBtn onClick={onDelete} title="Eliminar" danger><Trash2 size={15} /></ActionBtn>
        </div>
      </div>
    </div>
  )
}

function PropForm({ form, onChange, onSubmit, onCancel, saving }: {
  form: PropertyForm; onChange: (f: PropertyForm) => void
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; saving: boolean
}) {
  function set(key: keyof PropertyForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.type === 'number' ? Number(e.target.value) : e.target.value
      onChange({ ...form, [key]: val })
    }
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
      <div>
        <label className="label">Tipo de propiedad</label>
        <select className="input-base" value={form.type} onChange={set('type')}>
          {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Nombre</label>
          <input className="input-base" placeholder="Casa Reforma" value={form.name} onChange={set('name')} required />
        </div>
        <div>
          <label className="label">Número</label>
          <input className="input-base" placeholder="14" value={form.number ?? ''} onChange={set('number')} />
        </div>
      </div>
      <div>
        <label className="label">Nombre del inquilino</label>
        <input className="input-base" placeholder="María García" value={form.tenant_name ?? ''} onChange={set('tenant_name')} />
      </div>
      <div>
        <label className="label">Teléfono</label>
        <input className="input-base" placeholder="664 123 4567" type="tel" value={form.tenant_phone ?? ''} onChange={set('tenant_phone')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Renta mensual ($)</label>
          <input className="input-base" type="number" placeholder="8500" min={0} value={form.monthly_rent || ''} onChange={set('monthly_rent')} required />
        </div>
        <div>
          <label className="label">Día de pago</label>
          <input className="input-base" type="number" placeholder="1" min={1} max={31} value={form.payment_day ?? ''} onChange={set('payment_day')} />
        </div>
      </div>
      <div>
        <label className="label">Fecha de ocupación</label>
        <input className="input-base" type="date" value={form.start_date ?? ''} onChange={set('start_date')} />
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" checked={form.requires_invoice} onChange={set('requires_invoice')} />
          <span className="text-sm text-[#1A1A1A]">Requiere factura</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" checked={form.active} onChange={set('active')} />
          <span className="text-sm text-[#1A1A1A]">Propiedad activa</span>
        </label>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-xs font-medium text-[#1A1A1A] mt-0.5">{value}</p>
    </div>
  )
}

function ActionBtn({ onClick, title, children, danger, disabled }: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] transition-colors disabled:opacity-40
        ${danger ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-400' : 'hover:bg-gray-50 text-gray-400'}`}>
      {children}
    </button>
  )
} 
