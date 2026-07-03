import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

function calcDurationMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end   = new Date(endDate)
  return (end.getFullYear() - start.getFullYear()) * 12 +
         (end.getMonth() - start.getMonth())
}

const contractSchema = z.object({
  property_id:  z.number().int().positive(),
  tenant_name:  z.string().min(1),
  tenant_phone: z.string().optional().nullable(),
  start_date:   z.string(),
  end_date:     z.string(),
  pdf_url:      z.string().optional().nullable(),
})

// GET /contracts
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, p.name AS property_name, p.type AS property_type
    FROM contracts c
    JOIN properties p ON p.id = c.property_id
    ORDER BY c.end_date ASC
  `).all()
  return c.json({ data: results })
})

// GET /contracts/:id
app.get('/:id', async (c) => {
  const id  = Number(c.req.param('id'))
  const row = await c.env.DB.prepare(`
    SELECT c.*, p.name AS property_name, p.type AS property_type
    FROM contracts c
    JOIN properties p ON p.id = c.property_id
    WHERE c.id = ?
  `).bind(id).first()
  if (!row) return c.json({ message: 'Contrato no encontrado' }, 404)
  return c.json({ data: row })
})

// POST /contracts
app.post('/', zValidator('json', contractSchema), async (c) => {
  const data     = c.req.valid('json')
  const duration = calcDurationMonths(data.start_date, data.end_date)

  const result = await c.env.DB.prepare(`
    INSERT INTO contracts
      (property_id, tenant_name, tenant_phone, start_date, end_date, duration_months, pdf_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.property_id, data.tenant_name, data.tenant_phone ?? null,
    data.start_date, data.end_date, duration, data.pdf_url ?? null
  ).run()

  const newRow = await c.env.DB.prepare(
    'SELECT * FROM contracts WHERE id = ?'
  ).bind(result.meta.last_row_id).first()
  return c.json({ data: newRow }, 201)
})

// PUT /contracts/:id
app.put('/:id', zValidator('json', contractSchema.partial()), async (c) => {
  const id       = Number(c.req.param('id'))
  const data     = c.req.valid('json')
  const existing = await c.env.DB.prepare(
    'SELECT * FROM contracts WHERE id = ?'
  ).bind(id).first() as Record<string, unknown> | null

  if (!existing) return c.json({ message: 'Contrato no encontrado' }, 404)

  const merged = { ...existing, ...data }
  const duration = calcDurationMonths(
    merged.start_date as string,
    merged.end_date as string
  )

  await c.env.DB.prepare(`
    UPDATE contracts SET
      property_id = ?, tenant_name = ?, tenant_phone = ?,
      start_date = ?, end_date = ?, duration_months = ?, pdf_url = ?
    WHERE id = ?
  `).bind(
    merged.property_id, merged.tenant_name, merged.tenant_phone,
    merged.start_date, merged.end_date, duration, merged.pdf_url, id
  ).run()

  const updated = await c.env.DB.prepare(
    'SELECT * FROM contracts WHERE id = ?'
  ).bind(id).first()
  return c.json({ data: updated })
})

// DELETE /contracts/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

export default app
