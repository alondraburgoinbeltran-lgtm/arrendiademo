import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileText,
  MoreHorizontal,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/propiedades',  label: 'Propiedades',  Icon: Building2 },
  { to: '/cobranza',     label: 'Cobranza',     Icon: Wallet },
  { to: '/contratos',    label: 'Contratos',    Icon: FileText },
  { to: '/mas',          label: 'Más',          Icon: MoreHorizontal },
] as const

export function BottomNav() {
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8E5DF] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = path.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center flex-1 gap-0.5"
            >
              <Icon
                size={22}
                className={cn(
                  'transition-colors',
                  isActive ? 'text-primary-500' : 'text-gray-400'
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  'text-[9px] font-medium transition-colors',
                  isActive ? 'text-primary-500' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}

        <button
          onClick={handleRefresh}
          className="flex flex-col items-center justify-center flex-1 gap-0.5"
        >
          <RefreshCw size={22} className="text-gray-400" strokeWidth={1.5} />
          <span className="text-[9px] font-medium text-gray-400">Actualizar</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 gap-0.5"
        >
          <LogOut size={22} className="text-gray-400" strokeWidth={1.5} />
          <span className="text-[9px] font-medium text-gray-400">Salir</span>
        </button>
      </div>
    </nav>
  )
}
