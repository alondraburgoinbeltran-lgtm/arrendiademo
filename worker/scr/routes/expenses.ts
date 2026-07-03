import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

// GET /expenses?month=&year=
app.get('/', async (c) => {
  const now   = new Date()
  const month = Number(c.req.query('month')) || now.getMonth() + 1
  const year  = Number(c.req.query('year'))  || now.getFullYear()

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM expenses WHERE month = ? AND year = ? ORDER BY created_at DESC
  `).bind(month, year).all()

  return c.json({ data: results })
})

// POST /expenses
app.post('/', async (c) => {
  const body = await c.req.json()
  const { type, amount, is_recurring, month, year, status } = body

  const { meta } = await c.env.DB.prepare(`
    INSERT INTO expenses (type, amount, is_recurring, month, year, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(type, amount, is_recurring ? 1 : 0, month, year, status ?? 'pending').run()

  return c.json({ data: { id: meta.last_row_id, type, amount, is_recurring, month, year, status } }, 201)
})

// PUT /expenses/:id
app.put('/:id', async (c) => {
  const id   = Number(c.req.param('id'))
  const body = await c.req.json()
  const { type, amount, is_recurring, month, year, status } = body

  await c.env.DB.prepare(`
    UPDATE expenses SET type=?, amount=?, is_recurring=?, month=?, year=?, status=? WHERE id=?
  `).bind(type, amount, is_recurring ? 1 : 0, month, year, status, id).run()

  return c.json({ data: { id, type, amount, is_recurring, month, year, status } })
})

// DELETE /expenses/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run()
  return c.json({ message: 'Eliminado' })
})

export default app
