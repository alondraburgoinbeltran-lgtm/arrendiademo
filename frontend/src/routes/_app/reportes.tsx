import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_app/reportes')({
  component: () => (
    <div>
      <PageHeader title="reportes" />
      <div className="p-4">
        <div className="card p-8 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm text-gray-400">reportes — próximamente</p>
        </div>
      </div>
    </div>
  ),
})
