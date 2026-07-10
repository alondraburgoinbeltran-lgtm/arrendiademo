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
        'hidden md:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-primary-500 to-primary-800 border-r border-primary-900/40 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56 lg:w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 lg:h-[72px] border-b border-white/10 px-4 lg:px-5 shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <img src="/logo.png" alt="Arrendia" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && (
          <span className="text-[15px] lg:text-base font-semibold text-white tracking-tight">
            Arrendia
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 lg:gap-1 p-2 lg:p-3 flex-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = path.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 lg:px-3.5 lg:py-2.5 text-sm transition-all duration-200 lg:hover:-translate-y-[1px]',
                isActive
                  ? 'bg-white/10 text-white font-medium lg:font-semibold'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-2 shrink-0 flex flex-col gap-0.5">

        <button
          onClick={handleRefresh}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white w-full transition-colors',
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
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-red-500/10 hover:text-red-300 w-full transition-colors',
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
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/5 w-full transition-colors',
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
     

