import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Contract, ContractForm, ApiList, ApiItem } from '@/types'

const QUERY_KEY = ['contracts']

export function useContracts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<ApiList<Contract>>('/contracts'),
    select: (res) => res.data,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContractForm) => api.post<ApiItem<Contract>>('/contracts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContractForm> }) =>
      api.put<ApiItem<Contract>>(`/contracts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contracts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
