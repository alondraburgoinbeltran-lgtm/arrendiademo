import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

const LUZ_LIMITE = 1000

const serviceSchema = z.object({
  property_id:  z.number().int().positive(),
  service_type: z.enum(['luz', 'agua', 'internet', 'gas', 'otro']),
  paid_at:      z.string(),
  amount:       z.number().min(0),
  status:       z.enum(['pagado', 'pendiente']).default('pagado'),
  frequency:    z.enum(['mensual', 'bimestral', 'trimestral', 'semestral', 'anual']).default('mensual'),
  comment:      z.string().optional().nullable(),
})

const updateSchema = serviceSchema.partial().extend({
  excedente_status: z.enum(['pendiente', 'cobrado']).optional(),
})

// GET /services?month=&year=
app.get('/', async (c) => {
  const month = c.req.query('month')
  const year  = c.req.query('year')

  let query = `
    SELECT s.*, p.name AS property_name, p.number AS property_number
    FROM services s
    JOIN properties p ON p.id = s.property_id
  `
  const params: unknown[] = []

  if (month && year) {
    query += ` WHERE strftime('%m', s.paid_at) = ? AND strftime('%Y', s.paid_at) = ?`
    params.push(String(month).padStart(2, '0'), year)
  }
  query += ' ORDER BY s.paid_at DESC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ data: results })
})

// POST /services
app.post('/', zValidator('json', serviceSchema), async (c) => {
  const data = c.req.valid('json')

  // Calcular excedente si es luz
  const excedente = data.service_type === 'luz' && data.amount > LUZ_LIMITE
    ? data.amount - LUZ_LIMITE
    : 0

  const result = await c.env.DB.prepare(`
    INSERT INTO services
      (property_id, service_type, paid_at, amount, status, frequency, comment, excedente, excedente_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.property_id, data.service_type, data.paid_at,
    data.amount, data.status, data.frequency, data.comment ?? null,
    excedente, excedente > 0 ? 'pendiente' : 'cobrado'
  ).run()

  const newRow = await c.env.DB.prepare(
    'SELECT * FROM services WHERE id = ?'
  ).bind(result.meta.last_row_id).first()
  return c.json({ data: newRow }, 201)
})

// PUT /services/:id
app.put('/:id', zValidator('json', updateSchema), async (c) => {
  const id       = Number(c.req.param('id'))
  const data     = c.req.valid('json')
  const existing = await c.env.DB.prepare(
    'SELECT * FROM services WHERE id = ?'
  ).bind(id).first() as Record<string, unknown> | null

  if (!existing) return c.json({ message: 'Servicio no encontrado' }, 404)

  const merged = { ...existing, ...data }

  // Recalcular excedente si cambió el monto o tipo
  let excedente = merged.excedente as number
  if (data.amount !== undefined || data.service_type !== undefined) {
    excedente = merged.service_type === 'luz' && (merged.amount as number) > LUZ_LIMITE
      ? (merged.amount as number) - LUZ_LIMITE
      : 0
  }

  // Si se está marcando excedente_status explícitamente, respetar ese valor
  const excedenteStatus = data.excedente_status ?? (excedente > 0 ? merged.excedente_status : 'cobrado')

  await c.env.DB.prepare(`
    UPDATE services SET
      property_id = ?, service_type = ?, paid_at = ?, amount = ?,
      status = ?, frequency = ?, comment = ?, excedente = ?, excedente_status = ?
    WHERE id = ?
  `).bind(
    merged.property_id, merged.service_type, merged.paid_at, merged.amount,
    merged.status, merged.frequency ?? 'mensual', merged.comment, excedente, excedenteStatus, id
  ).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM services WHERE id = ?'
  ).bind(id).first()
  return c.json({ data: updated })
})

// DELETE /services/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

export default app
