import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

// GET /dashboard?month=&year=
app.get('/', async (c) => {
  const now      = new Date()
  const month    = Number(c.req.query('month')) || now.getMonth() + 1
  const year     = Number(c.req.query('year'))  || now.getFullYear()
  const monthPad = String(month).padStart(2, '0')

  // Rentas del mes
  const { results: rents } = await c.env.DB.prepare(`
    SELECT r.*, p.name AS property_name, p.number AS property_number, p.payment_day
FROM rents r JOIN properties p ON p.id = r.property_id
    WHERE r.month = ? AND r.year = ?
  `).bind(month, year).all()

  const rentsPaid    = rents.filter((r: any) => r.status === 'paid')
  const rentsPending = rents.filter((r: any) => r.status === 'pending')
  const totalExpected  = rents.reduce((s: number, r: any) => s + (r.amount as number), 0)
const totalCollected = rentsPaid.reduce((s: number, r: any) => s + (r.amount as number), 0)
const totalPending   = rentsPending.reduce((s: number, r: any) => s + (r.amount as number), 0)
  const bbvaTotal    = rentsPaid.filter((r: any) => r.bank_account === 'bbva').reduce((s: number, r: any) => s + (r.amount as number), 0)
  const banorteTotal = rentsPaid.filter((r: any) => r.bank_account === 'banorte').reduce((s: number, r: any) => s + (r.amount as number), 0)
  const q1 = rentsPaid.filter((r: any) => (r.payment_day as number) <= 15).reduce((s: number, r: any) => s + (r.amount as number), 0)
  const q2 = rentsPaid.filter((r: any) => (r.payment_day as number) > 15).reduce((s: number, r: any) => s + (r.amount as number), 0)

  // Servicios del mes — solo pagados para totales
  const { results: services } = await c.env.DB.prepare(`
    SELECT s.*, p.name AS property_name, p.number AS property_number
    FROM services s JOIN properties p ON p.id = s.property_id
    WHERE strftime('%m', s.paid_at) = ? AND strftime('%Y', s.paid_at) = ?
  `).bind(monthPad, String(year)).all()

  const servicesPagados  = services.filter((s: any) => s.status === 'pagado')
  const servicesPendientes = services.filter((s: any) => s.status === 'pendiente')
  const servicesTotal    = servicesPagados.reduce((s: number, sv: any) => s + (sv.amount as number), 0)

  // Gastos del mes
  const { results: expenses } = await c.env.DB.prepare(`
    SELECT * FROM expenses WHERE month = ? AND year = ?
  `).bind(month, year).all()

  const expensesPagados    = expenses.filter((e: any) => e.status === 'paid')
  const expensesTotal      = expensesPagados.reduce((s: number, e: any) => s + (e.amount as number), 0)
  const expensesPendientes = expenses.filter((e: any) => e.status === 'pending').length

  // Utilidad = ingresos cobrados - servicios pagados - gastos pagados
  const utilidad = totalCollected - servicesTotal - expensesTotal

  // Excedentes de luz pendientes de cobrar
  const excedentesPendientes = services.filter((s: any) =>
    s.service_type === 'luz' && s.excedente > 0 && s.excedente_status === 'pendiente'
  ).map((s: any) => ({
    id:              s.id,
    property_name:   s.property_name,
    property_number: s.property_number,
    amount:          s.amount,
    excedente:       s.excedente,
    paid_at:         s.paid_at,
  }))

  // Contratos próximos a vencer
  const today = new Date().toISOString().split('T')[0]
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const { results: expiringContracts } = await c.env.DB.prepare(`
    SELECT c.id, p.name AS property_name, p.number AS property_number,
  c.tenant_name, c.end_date,
  CAST((julianday(c.end_date) - julianday('now')) AS INTEGER) AS days_remaining
FROM contracts c JOIN properties p ON p.id = c.property_id
    WHERE c.end_date BETWEEN ? AND ?
    ORDER BY c.end_date ASC
  `).bind(today, in30).all()

  // Facturas pendientes — independiente del estado de cobranza
  const { results: invoicesPendingList } = await c.env.DB.prepare(`
    SELECT p.id, p.name AS property_name, p.number AS property_number
    FROM properties p
    LEFT JOIN invoices i ON i.property_id = p.id AND i.month = ? AND i.year = ?
    WHERE p.requires_invoice = 1 AND p.active = 1 AND (i.status IS NULL OR i.status != 'done')
    ORDER BY p.name ASC
  `).bind(month, year).all()

  const pending_1_5   = rentsPending.filter((r: any) => (r.payment_day as number) >= 1  && (r.payment_day as number) <= 5)
  const pending_15_20 = rentsPending.filter((r: any) => (r.payment_day as number) >= 15 && (r.payment_day as number) <= 20)

  // Mismas ventanas, pero ya cobradas — para mostrar el detalle completo por propiedad
  // (cobrado + pendiente) sin eliminar nada del listado cuando cambia de estado
  const paid_1_5   = rentsPaid.filter((r: any) => (r.payment_day as number) >= 1  && (r.payment_day as number) <= 5)
  const paid_15_20 = rentsPaid.filter((r: any) => (r.payment_day as number) >= 15 && (r.payment_day as number) <= 20)

  return c.json({
    data: {
      rents_paid:            rentsPaid.length,
      rents_pending:         rentsPending.length,
      total_expected:        totalExpected,
      total_collected:       totalCollected,
      total_pending:         totalPending,
      services_total:        servicesTotal,
      services_pendientes:   servicesPendientes.length,
      expenses_total:        expensesTotal,
      expenses_pendientes:   expensesPendientes,
      bbva_total:            bbvaTotal,
      banorte_total:         banorteTotal,
      quincena1_total:       q1,
      quincena2_total:       q2,
      utilidad,
      excedentes_pendientes: excedentesPendientes,
      contracts_expiring:    expiringContracts,
      invoices_pending:      invoicesPendingList,
      pending_1_5,
      pending_15_20,
      paid_1_5,
      paid_15_20,
    }
  })
})

// POST /dashboard/generate-rents — genera rentas manualmente
app.post('/generate-rents', async (c) => {
  const now   = new Date()
  const month = Number(c.req.query('month')) || now.getMonth() + 1
  const year  = Number(c.req.query('year'))  || now.getFullYear()

  const { results: properties } = await c.env.DB.prepare(
    'SELECT id, monthly_rent FROM properties WHERE active = 1'
  ).all()

  if (!properties.length) return c.json({ message: 'No hay propiedades activas', generated: 0 })

  const stmt  = c.env.DB.prepare(`INSERT OR IGNORE INTO rents (property_id, month, year, amount, status) VALUES (?, ?, ?, ?, 'pending')`)
  const batch = properties.map((p: any) => stmt.bind(p.id, month, year, p.monthly_rent))
  await c.env.DB.batch(batch)

  return c.json({ message: 'Rentas generadas', generated: properties.length, month, year })
})

export default app
