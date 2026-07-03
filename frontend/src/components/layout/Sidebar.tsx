import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileText,
  Wrench,
  CalendarDays,
  BarChart3,
  Receipt,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/propiedades', label: 'Propiedades',  Icon: Building2 },
  { to: '/cobranza',    label: 'Cobranza',     Icon: Wallet },
  { to: '/contratos',   label: 'Contratos',    Icon: FileText },
  { to: '/gastos',      label: 'Gastos',       Icon: Receipt },
  { to: '/servicios',   label: 'Servicios',    Icon: Wrench },
  { to: '/calendario',  label: 'Calendario',   Icon: CalendarDays },
  { to: '/reportes',    label: 'Reportes',     Icon: BarChart3 },
] as const

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { location } = useRouterState()
  const path = location.pathname

  const qc = useQueryClient()
  function handleRefresh() {
    qc.invalidateQueries()
  }
  
  function handleLogout() {
    sessionStorage.removeItem('arrendia_token')
    window.location.href = '/login'
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-[#E8E5DF] transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-[#E8E5DF] px-4 shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <img src="/logo.png" alt="Arrendia" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && (
          <span className="text-[15px] font-semibold text-primary-500 tracking-tight">
            Arrendia
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = path.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-500 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E8E5DF] p-2 shrink-0 flex flex-col gap-0.5">

        <button
          onClick={handleRefresh}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Actualizar' : undefined}
        >
          <RefreshCw size={16} />
          {!collapsed && <span>Actualizar</span>}
        </button>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 w-full transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Colapsar</span></>
          }
        </button>
      </div>
    </aside>
  )
}
     
