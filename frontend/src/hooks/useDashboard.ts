import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardData } from '@/types'

export function useDashboard(month: number, year: number) {
  return useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.get<{ data: DashboardData }>(`/dashboard?month=${month}&year=${year}`),
    select: (res) => res.data,
  })
}
