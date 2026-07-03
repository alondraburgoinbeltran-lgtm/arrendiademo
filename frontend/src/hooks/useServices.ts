import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Service, ServiceForm, ApiList, ApiItem } from '@/types'

const queryKey = (month?: number, year?: number) => ['services', month, year]

export function useServices(month?: number, year?: number) {
  return useQuery({
    queryKey: queryKey(month, year),
    queryFn: () => {
      const params = month && year ? `?month=${month}&year=${year}` : ''
      return api.get<ApiList<Service>>(`/services${params}`)
    },
    select: (res) => res.data,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ServiceForm) => api.post<ApiItem<Service>>('/services', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put<ApiItem<Service>>(`/services/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMarcarExcedenteCobrado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.put<ApiItem<Service>>(`/services/${id}`, { excedente_status: 'cobrado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
