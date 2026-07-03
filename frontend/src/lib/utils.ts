import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Combina clases Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatea moneda MXN
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formatea fecha legible
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

// Formatea mes/año
export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Nombre corto del mes
export function shortMonth(month: number): string {
  const date = new Date(2024, month - 1, 1)
  return new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date)
}

// Calcula meses entre dos fechas ISO
export function diffInMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end   = new Date(endDate)
  return (end.getFullYear() - start.getFullYear()) * 12 +
         (end.getMonth() - start.getMonth())
}

// Días hasta una fecha futura
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + 'T00:00:00')
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Mes y año actuales
export function currentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

// Número de quincena del día
export function getQuincena(day: number): 1 | 2 {
  return day <= 15 ? 1 : 2
}

// Capitaliza primera letra
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
