import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Property, PropertyForm, ApiList, ApiItem } from '@/types'

const QUERY_KEY = ['properties']

export function useProperties() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<ApiList<Property>>('/properties'),
    select: (res) => res.data,
  })
}

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PropertyForm) =>
      api.post<ApiItem<Property>>('/properties', {
        ...data,
        requires_invoice: data.requires_invoice ? 1 : 0,
        active: data.active ? 1 : 0,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PropertyForm> }) =>
      api.put<ApiItem<Property>>(`/properties/${id}`, {
        ...data,
        requires_invoice: data.requires_invoice ? 1 : 0,
        active: data.active ? 1 : 0,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/properties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useToggleProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.put<ApiItem<Property>>(`/properties/${id}`, { active: active ? 1 : 0 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
