import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="flex h-dvh bg-[#FDFBF7]">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Padding bottom para bottom nav en mobile */}
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  )
}
