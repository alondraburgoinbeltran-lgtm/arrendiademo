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
    'sticky top-0 z-40 bg-primary-500 px-4 pb-4 lg:px-8 xl:px-10 lg:pt-6 lg:pb-6',
    className
  )}
  style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
>
      <div className="flex items-start justify-between gap-3 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto">
        <div>
          <h1 className="text-white text-[17px] font-medium leading-tight lg:text-2xl lg:font-semibold">{title}</h1>
          {subtitle && (
  <p className="text-white font-semibold text-sm mt-0.5 lg:text-base lg:font-normal lg:mt-1.5 lg:opacity-90">{subtitle}</p>
)}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
