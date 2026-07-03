import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Rent, RentPaymentForm, ApiList, ApiItem } from '@/types'

const queryKey = (month: number, year: number) => ['rents', month, year]

export function useRents(month: number, year: number) {
  return useQuery({
    queryKey: queryKey(month, year),
    queryFn: () => api.get<ApiList<Rent>>(`/rents?month=${month}&year=${year}`),
    select: (res) => res.data,
  })
}

export function usePayRent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RentPaymentForm }) =>
      api.put<ApiItem<Rent>>(`/rents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rents'] }),
  })
}

export function useUnpayRent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.put<ApiItem<Rent>>(`/rents/${id}/unpay`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rents'] }),
  })
}

export function useDeleteRent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/rents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rents'] }),
  })
}
