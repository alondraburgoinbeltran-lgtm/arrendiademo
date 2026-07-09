import { createFileRoute } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_app/reportes')({
  component: () => (
    <div>
      <PageHeader title="Reportes" />
      <div className="p-4 lg:px-8 xl:px-10 lg:py-6">
        <div className="card p-8 lg:p-16 flex flex-col items-center justify-center text-center gap-2 lg:gap-4 lg:max-w-[1440px] xl:max-w-[1600px] lg:mx-auto lg:rounded-2xl lg:border lg:border-[#E8E5DF]">
          <div className="hidden lg:flex w-14 h-14 rounded-2xl bg-primary-50 items-center justify-center mb-2">
            <BarChart3 size={26} className="text-primary-500" />
          </div>
          <p className="text-sm lg:text-base text-gray-400">Reportes — próximamente</p>
          <p className="hidden lg:block text-sm text-gray-400 max-w-sm">
            Gráficas anuales de ingresos y exportación a Excel estarán disponibles aquí.
          </p>
          <button disabled className="hidden lg:inline-flex mt-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-xl px-5 py-2.5 opacity-70 cursor-default">
            Próximamente
          </button>
        </div>
      </div>
    </div>
  ),
