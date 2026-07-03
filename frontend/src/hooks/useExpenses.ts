import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Expense, ExpenseForm } from '@/types'

export function useExpenses(month: number, year: number) {
  return useQuery({
    queryKey: ['expenses', month, year],
    queryFn: () => api.get<{ data: Expense[] }>(`/expenses?month=${month}&year=${year}`),
    select: (res) => res.data,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: ExpenseForm) => api.post('/expenses', form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: ExpenseForm }) =>
      api.put(`/expenses/${id}`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
