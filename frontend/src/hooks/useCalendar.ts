import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CalendarData, ReminderForm } from '@/types'

export function useCalendar(month: number, year: number) {
  return useQuery({
    queryKey: ['calendar', month, year],
    queryFn: () => api.get<{ data: CalendarData }>(`/calendar?month=${month}&year=${year}`),
    select: (res) => res.data,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: ReminderForm) => api.post('/calendar/reminders', form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useMarkReminderDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.put(`/calendar/reminders/${id}/done`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/calendar/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => api.post('/calendar/notes', { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      api.put(`/calendar/notes/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/calendar/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  })
}
