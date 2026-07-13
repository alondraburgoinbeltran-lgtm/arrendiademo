import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Sheet } from '@/components/ui/Sheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useContracts, useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/useContracts'
import { useProperties } from '@/hooks/useProperties'
import { formatDate, diffInMonths, daysUntil } from '@/lib/utils'
import type { Contract, ContractForm, Property } from '@/types'

export const Route = createFileRoute('/_app/contratos')({
  component: ContratosPage,
})

type TabKey = 'vigentes' | 'por_vencer' | 'vencidos'

const EMPTY_FORM: ContractForm = {
  property_id:  0,
  tenant_name:  '',
  tenant_phone: '',
  start_date:   '',
  end_date:     '',
  pdf_url:      '',
}

function ContratosPage() {
  const { data: contracts = [], isLoading } = useContracts()
  const { data: properties = [] } = useProperties()
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract()
  const deleteMutation = useDeleteContract()

  const [tab, setTab]             = useState<TabKey>('vigentes')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState<Contract | null>(null)
  const [form, setForm]           = useState<ContractForm>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const categorized = useMemo(() => {
    const vigentes:   Contract[] = []
    const por_vencer: Contract[] = []
    const vencidos:   Contract[] = []
    contracts.forEach(c => {
      const days = daysUntil(c.end_date)
      if (days < 0) vencidos.push(c)
      else if (days <= 30) por_vencer.push(c)
      else vigentes.push(c)
    })
    return { vigentes, por_vencer, vencidos }
  }, [contracts])

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'vigentes',   label: 'Vigentes',   count: categorized.vigentes.length },
    { key: 'por_vencer', label: 'Por vencer', count: categorized.por_vencer.length },
    { key: 'vencidos',   label: 'Vencidos',   count: categorized.vencidos.length },
  ]

  const filtered = categorized[tab]

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(c: Contract) {
    setEditing(c)
    setForm({
      property_id:  c.property_id,
      tenant_name:  c.tenant_name,
      tenant_phone: c.tenant_phone ?? '',
      start_date:   c.start_date,
      end_date:     c.end_date,
      pdf_url:      c.pdf_url ?? '',
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
        title="CONTRATOS"
        action={
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
            <Plus size={14} className="text-white" />
            <span className="text-white text-xs font-medium">Nuevo</span>
          </button>
        }
      />

      <div className="flex bg-white border-b border-[#E8E5DF] lg:px-8 xl:px-10">
        <div className="flex flex-1 lg:flex-initial lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto lg:w-full">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 lg:flex-initial lg:px-6 py-2.5 lg:py-3.5 text-xs lg:text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-400'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3 lg:px-8 xl:px-10 lg:py-6 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 xl:gap-5 lg:items-start">
        {isLoading && <div className="py-12 text-center text-sm text-gray-400 lg:col-span-full">Cargando...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400 lg:col-span-full">No hay contratos en esta categoría</div>
        )}
        {filtered.map(c => (
          <ContractCard key={c.id} contract={c} onEdit={() => openEdit(c)} onDelete={() => setConfirmId(c.id)} />
        ))}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? 'Editar contrato' : 'Nuevo contrato'}>
        <ContractFormComp
          form={form} onChange={setForm}
          onSubmit={handleSubmit} onCancel={() => setSheetOpen(false)}
          saving={isSaving} properties={properties}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmId !== null}
        title="Eliminar contrato"
        message="¿Eliminar este contrato? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ContractCard({ contract: c, onEdit, onDelete }: {
  contract: Contract; onEdit: () => void; onDelete: () => void
}) {
  const days    = daysUntil(c.end_date)
  const expired = days < 0
  const soon    = days >= 0 && days <= 30
  const propName = (c as any).property_name
  const propType = (c as any).property_type

  return (
    <div className={`bg-white border rounded-xl lg:rounded-2xl p-4 lg:p-5 flex flex-col gap-3 lg:transition-all lg:duration-200 lg:hover:-translate-y-[1px] ${
      expired ? 'border-red-200' : soon ? 'border-amber-300' : 'border-[#E8E5DF]'
    }`}>
      {soon && !expired && (
        <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-700">Vence en {days} días — {formatDate(c.end_date)}</span>
        </div>
      )}
      {expired && (
        <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-red-600 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700">Vencido el {formatDate(c.end_date)}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[#1A1A1A]">{propName ?? `Propiedad #${c.property_id}`}</p>
          {propType && <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{propType}</p>}
        </div>
        <StatusBadge days={days} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="Inicio"      value={formatDate(c.start_date)} />
        <InfoItem label="Vencimiento" value={formatDate(c.end_date)} />
        <InfoItem label="Duración"    value={`${c.duration_months} meses`} />
        <InfoItem label="Teléfono"    value={c.tenant_phone ?? '—'} />
      </div>
      <div className="h-px bg-[#E8E5DF]" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-semibold text-blue-600">
              {c.tenant_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <p className="text-xs text-gray-700 truncate">{c.tenant_name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {c.pdf_url && (
            <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-blue-50 hover:text-blue-600">
              <ExternalLink size={14} />
            </a>
          )}
          <button onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-gray-50">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E8E5DF] text-gray-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ContractFormComp({ form, onChange, onSubmit, onCancel, saving, properties }: {
  form: ContractForm; onChange: (f: ContractForm) => void
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void
  saving: boolean; properties: Property[]
}) {
  const duration = form.start_date && form.end_date
    ? diffInMonths(form.start_date, form.end_date)
    : 0

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-4">
      <div>
        <label className="label">Propiedad</label>
        <select className="input-base" value={form.property_id || ''}
          onChange={e => {
            const id = Number(e.target.value)
            const selected = properties.find(p => p.id === id)
            onChange({
              ...form,
              property_id: id,
              // Autocompletar desde la propiedad seleccionada
              tenant_name:  selected?.tenant_name  ?? '',
              tenant_phone: selected?.tenant_phone ?? '',
              start_date:   selected?.start_date   ?? '',
            })
          }}
          required
        >
          <option value="">Seleccionar propiedad...</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.number ? ` #${p.number}` : ''}
            </option>
          ))}
        </select>
        {form.property_id > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">
            Inquilino, teléfono y fecha de inicio se autocompletaron desde la propiedad. Puedes editarlos si es necesario.
          </p>
        )}
      </div>
      <div>
        <label className="label">Nombre del inquilino</label>
        <input className="input-base" placeholder="María García"
          value={form.tenant_name}
          onChange={e => onChange({ ...form, tenant_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">Teléfono</label>
        <input className="input-base" placeholder="664 123 4567" type="tel"
          value={form.tenant_phone ?? ''}
          onChange={e => onChange({ ...form, tenant_phone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Fecha inicio</label>
          <input className="input-base" type="date"
            value={form.start_date}
            onChange={e => onChange({ ...form, start_date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Fecha fin</label>
          <input className="input-base" type="date"
            value={form.end_date}
            onChange={e => onChange({ ...form, end_date: e.target.value })}
            required
          />
        </div>
      </div>
      {duration > 0 && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
          Duración: {duration} {duration === 1 ? 'mes' : 'meses'} ({Math.floor(duration / 12) > 0 ? `${Math.floor(duration / 12)} año${Math.floor(duration / 12) > 1 ? 's' : ''} ` : ''}{duration % 12 > 0 ? `${duration % 12} mes${duration % 12 > 1 ? 'es' : ''}` : ''})
        </div>
      )}
      <div>
        <label className="label">Link del contrato PDF (opcional)</label>
        <input className="input-base" placeholder="https://drive.google.com/..."
          type="url"
          value={form.pdf_url ?? ''}
          onChange={e => onChange({ ...form, pdf_url: e.target.value })}
        />
        <p className="text-[10px] text-gray-400 mt-1">Pega el link de Google Drive u otro servicio</p>
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

function StatusBadge({ days }: { days: number }) {
  if (days < 0) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertTriangle size={9} /> Vencido
    </span>
  )
  if (days <= 30) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock size={9} /> Por vencer
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={9} /> Vigente
    </span>
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
