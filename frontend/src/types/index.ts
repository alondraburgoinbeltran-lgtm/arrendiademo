// ─── Propiedades ───────────────────────────────────────────────
export type PropertyType = 'casa' | 'departamento' | 'bodega'

export interface Property {
  id: number
  type: PropertyType
  name: string
  number: string | null
  tenant_name: string | null
  tenant_phone: string | null
  monthly_rent: number
  payment_day: number | null
  requires_invoice: 0 | 1
  start_date: string | null
  active: 0 | 1
  created_at: string
}

export interface PropertyForm {
  type: PropertyType
  name: string
  number?: string
  tenant_name?: string
  tenant_phone?: string
  monthly_rent: number
  payment_day?: number
  requires_invoice: boolean
  start_date?: string
  active: boolean
}

// ─── Cobranza ──────────────────────────────────────────────────
export type RentStatus = 'pending' | 'paid'
export type BankAccount = 'bbva' | 'banorte'
export type PaymentMethod = 'efectivo' | 'transferencia'

export interface Rent {
  id: number
  property_id: number
  property_name?: string        // join
  property_number?: string | null // join
  property_address?: string | null // join
  tenant_name?: string          // join
  month: number
  year: number
  amount: number
  status: RentStatus
  paid_at: string | null
  bank_account: BankAccount | null
  payment_method: PaymentMethod | null
  bank_reference: string | null
  comment: string | null
  receipt_url: string | null
  maintenance: number
  services_amount: number
  other_charges: number
  created_at: string
}

export interface RentPaymentForm {
  paid_at: string
  bank_account?: BankAccount | null
  payment_method: PaymentMethod
  bank_reference?: string | null
  comment?: string | null
  receipt_url?: string | null
  maintenance?: number
  services_amount?: number
  other_charges?: number
}

// ─── Contratos ─────────────────────────────────────────────────
export interface Contract {
  id: number
  property_id: number
  property_name?: string        // join
  tenant_name: string
  tenant_phone: string | null
  start_date: string
  end_date: string
  duration_months: number
  pdf_url: string | null
  created_at: string
}

export interface ContractForm {
  property_id: number
  tenant_name: string
  tenant_phone?: string
  start_date: string
  end_date: string
  pdf_url?: string
}

// ─── Servicios ─────────────────────────────────────────────────
export type ServiceType = 'luz' | 'agua' | 'internet' | 'gas' | 'otro'

export interface Service {
  id: number
  property_id: number
  property_name?: string        // join
  service_type: ServiceType
  paid_at: string
  amount: number
  comment: string | null
  created_at: string
}

export interface ServiceForm {
  property_id: number
  service_type: ServiceType
  paid_at: string
  amount: number
  comment?: string
}

export interface ContractAlert {
  id: number
  property_name: string
  property_number: string | null
  tenant_name: string
  end_date: string
  days_remaining: number
}

// ─── Calendario ────────────────────────────────────────────────
export type EventType = 'rent' | 'contract' | 'service' | 'invoice' | 'other'
export type EventStatus = 'pending' | 'done'

export interface CalendarEvent {
  id: string
  ref_id: number
  ref_type: 'rent' | 'invoice' | 'contract' | 'reminder'
  type: 'rent' | 'invoice' | 'contract' | 'reminder'
  title: string
  date: string
  status: 'pending' | 'done'
  amount?: number
  days_remaining?: number
  frequency?: string
  property_name?: string
  property_number?: string | null
}

// ─── Reportes ──────────────────────────────────────────────────
export interface MonthlyIncome {
  month: number
  year: number
  total: number
  bbva: number
  banorte: number
}

export interface PropertyIncome {
  property_id: number
  property_name: string
  total: number
  months_paid: number
}

// ─── Auth ──────────────────────────────────────────────────────
export interface LoginForm {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
}

// ─── API responses ─────────────────────────────────────────────
export interface ApiList<T> {
  data: T[]
  total?: number
}

export interface ApiItem<T> {
  data: T
}

export interface ApiMessage {
  message: string
}

// Extensión para dashboard con nuevos campos
export interface DashboardData {
  rents_paid: number
  rents_pending: number
  total_expected: number
  total_collected: number
  total_pending: number
  services_total: number
  services_pendientes: number
  bbva_total: number
  banorte_total: number
  quincena1_total: number
  quincena2_total: number
  utilidad: number
  excedentes_pendientes: ExcedenteLuz[]
  contracts_expiring: ContractAlert[]
  invoices_pending: { id: number; property_name: string; property_number: string | null }[]
  pending_1_5: any[]
  pending_15_20: any[]
  paid_1_5: any[]
  paid_15_20: any[]
  expenses_total: number
  expenses_pendientes: number
}

export interface ExcedenteLuz {
  id: number
  property_name: string
  property_number: string | null
  amount: number
  excedente: number
  paid_at: string
}

// ─── Gastos ────────────────────────────────────────────────────
export interface Expense {
  id: number
  type: string
  amount: number
  is_recurring: 0 | 1
  month: number
  year: number
  status: 'pending' | 'paid'
  created_at: string
}

export interface ExpenseForm {
  type: string
  amount: number
  is_recurring: boolean
  month: number
  year: number
  status: 'pending' | 'paid'
}

export interface Note {
  id: number
  content: string
  created_at: string
  updated_at: string
}

export interface ReminderForm {
  title: string
  reminder_date: string
  frequency?: string
  property_id?: number
}

export interface CalendarData {
  events: CalendarEvent[]
  notes: Note[]
}

