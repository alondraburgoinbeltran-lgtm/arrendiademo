import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header
  className={cn(
    'sticky top-0 z-40 bg-primary-500 px-4 pb-4',
    className
  )}
  style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white text-[17px] font-medium leading-tight">{title}</h1>
          {subtitle && (
  <p className="text-white font-semibold text-sm mt-0.5">{subtitle}</p>
)}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
