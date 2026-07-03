import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

const propertySchema = z.object({
  type:             z.enum(['casa', 'departamento', 'bodega']),
  name:             z.string().min(1),
  number:           z.string().optional().nullable(),
  tenant_name:      z.string().optional().nullable(),
  tenant_phone:     z.string().optional().nullable(),
  monthly_rent:     z.number().min(0),
  payment_day:      z.number().int().min(1).max(31).optional().nullable(),
  requires_invoice: z.number().int().min(0).max(1).default(0),
  start_date:       z.string().optional().nullable(),
  active:           z.number().int().min(0).max(1).default(1),
})

// GET /properties
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM properties ORDER BY active DESC, name ASC'
  ).all()
  return c.json({ data: results })
})

// GET /properties/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(id).first()

  if (!row) return c.json({ message: 'Propiedad no encontrada' }, 404)
  return c.json({ data: row })
})

// POST /properties
app.post('/', zValidator('json', propertySchema), async (c) => {
  const data = c.req.valid('json')
  const result = await c.env.DB.prepare(`
    INSERT INTO properties
      (type, name, number, tenant_name, tenant_phone, monthly_rent,
       payment_day, requires_invoice, start_date, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.type, data.name, data.number ?? null,
    data.tenant_name ?? null, data.tenant_phone ?? null,
    data.monthly_rent, data.payment_day ?? null,
    data.requires_invoice, data.start_date ?? null, data.active
  ).run()

  const newRow = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(result.meta.last_row_id).first()

  // Generar renta del mes actual para la propiedad recién creada
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO rents (property_id, month, year, amount, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).bind(result.meta.last_row_id, month, year, data.monthly_rent).run()

  return c.json({ data: newRow }, 201)
})

// PUT /properties/:id
app.put('/:id', zValidator('json', propertySchema.partial()), async (c) => {
  const id   = Number(c.req.param('id'))
  const data = c.req.valid('json')

  const existing = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(id).first()
  if (!existing) return c.json({ message: 'Propiedad no encontrada' }, 404)

  const merged = { ...existing, ...data }

  await c.env.DB.prepare(`
    UPDATE properties SET
      type = ?, name = ?, number = ?, tenant_name = ?, tenant_phone = ?,
      monthly_rent = ?, payment_day = ?, requires_invoice = ?,
      start_date = ?, active = ?
    WHERE id = ?
  `).bind(
    merged.type, merged.name, merged.number,
    merged.tenant_name, merged.tenant_phone, merged.monthly_rent,
    merged.payment_day, merged.requires_invoice, merged.start_date,
    merged.active, id
  ).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(id).first()
  return c.json({ data: updated })
})

// DELETE /properties/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare(
    'SELECT id FROM properties WHERE id = ?'
  ).bind(id).first()
  if (!existing) return c.json({ message: 'Propiedad no encontrada' }, 404)

  await c.env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

export default app
