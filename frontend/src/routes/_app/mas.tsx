import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Wrench, CalendarDays, BarChart3, Receipt } from 'lucide-react'

export const Route = createFileRoute('/_app/mas')({
  component: MasPage,
})

const ITEMS = [
  { to: '/gastos',     label: 'Gastos',     sub: 'Registro de gastos fijos y no fijos', Icon: Receipt },
  { to: '/servicios',  label: 'Servicios',  sub: 'Luz, agua, internet y más',           Icon: Wrench },
  { to: '/calendario', label: 'Calendario', sub: 'Vista unificada de eventos',           Icon: CalendarDays },
  { to: '/reportes',   label: 'Reportes',   sub: 'Gráficas anuales y exportar Excel',   Icon: BarChart3 },
] as const

function MasPage() {
  return (
    <div>
      <PageHeader title="Más" />
      <div className="px-4 py-4 flex flex-col gap-2">
        {ITEMS.map(({ to, label, sub, Icon }) => (
          <Link key={to} to={to}
            className="bg-white border border-[#E8E5DF] rounded-xl px-4 py-3.5 flex items-center gap-4 active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-[#F5F2ED] flex items-center justify-center shrink-0">
              <Icon size={18} className="text-[#2C3E50]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
              <p className="text-[11px] text-gray-400">{sub}</p>
            </div>
            <span className="ml-auto text-gray-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
