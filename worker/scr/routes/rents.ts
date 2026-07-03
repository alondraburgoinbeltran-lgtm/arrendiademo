import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

const paymentSchema = z.object({
  paid_at:         z.string(),
  bank_account:    z.enum(['bbva', 'banorte']).optional().nullable(),
  payment_method:  z.enum(['efectivo', 'transferencia']),
  bank_reference:  z.string().optional().nullable(),
  comment:         z.string().optional().nullable(),
  receipt_url:     z.string().optional().nullable(),
  maintenance:     z.number().optional().nullable().default(0),
  services_amount: z.number().optional().nullable().default(0),
  other_charges:   z.number().optional().nullable().default(0),
})

// GET /rents?month=&year=
app.get('/', async (c) => {
  const month = Number(c.req.query('month')) || new Date().getMonth() + 1
  const year  = Number(c.req.query('year'))  || new Date().getFullYear()

  const { results } = await c.env.DB.prepare(`
    SELECT r.*, p.name AS property_name, p.number AS property_number,
           p.tenant_name, p.payment_day, p.address AS property_address
    FROM rents r
    JOIN properties p ON p.id = r.property_id
    WHERE r.month = ? AND r.year = ?
    ORDER BY p.payment_day ASC, p.name ASC
  `).bind(month, year).all()

  return c.json({ data: results })
})

// PUT /rents/:id — registrar pago
app.put('/:id', zValidator('json', paymentSchema), async (c) => {
  const id   = Number(c.req.param('id'))
  const data = c.req.valid('json')

  const existing = await c.env.DB.prepare(
    'SELECT * FROM rents WHERE id = ?'
  ).bind(id).first()
  if (!existing) return c.json({ message: 'Renta no encontrada' }, 404)

  await c.env.DB.prepare(`
    UPDATE rents SET
      status = 'paid',
      paid_at          = ?,
      bank_account     = ?,
      payment_method   = ?,
      bank_reference   = ?,
      comment          = ?,
      receipt_url      = ?,
      maintenance      = ?,
      services_amount  = ?,
      other_charges    = ?
    WHERE id = ?
  `).bind(
    data.paid_at,
    data.bank_account    ?? null,
    data.payment_method,
    data.bank_reference  ?? null,
    data.comment         ?? null,
    data.receipt_url     ?? null,
    data.maintenance     ?? 0,
    data.services_amount ?? 0,
    data.other_charges   ?? 0,
    id
  ).run()

  const updated = await c.env.DB.prepare(`
    SELECT r.*, p.name AS property_name, p.number AS property_number,
           p.tenant_name, p.address AS property_address
    FROM rents r JOIN properties p ON p.id = r.property_id
    WHERE r.id = ?
  `).bind(id).first()

  return c.json({ data: updated })
})

// PUT /rents/:id/unpay — deshacer pago
app.put('/:id/unpay', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(`
    UPDATE rents SET
      status = 'pending', paid_at = NULL,
      bank_account = NULL, payment_method = NULL,
      bank_reference = NULL, comment = NULL, receipt_url = NULL,
      maintenance = 0, services_amount = 0, other_charges = 0
    WHERE id = ?
  `).bind(id).run()
  return c.json({ message: 'Pago revertido' })
})

// DELETE /rents/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM rents WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

export default app

